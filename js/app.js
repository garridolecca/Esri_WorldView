// =====================================================
// ESRI WORLDVIEW — Main Application
// ArcGIS Maps SDK for JavaScript 5.0
// =====================================================

const [
  Map,
  SceneView,
  GraphicsLayer,
  Graphic,
  Point,
  Polyline,
  Polygon,
  SimpleMarkerSymbol,
  SimpleLineSymbol,
  SimpleFillSymbol,
  PointSymbol3D,
  IconSymbol3DLayer,
  LineSymbol3D,
  LineSymbol3DLayer,
  PolygonSymbol3D,
  FillSymbol3DLayer,
  TextSymbol,
  PopupTemplate,
  watchUtils
] = await $arcgis.import([
  "@arcgis/core/Map.js",
  "@arcgis/core/views/SceneView.js",
  "@arcgis/core/layers/GraphicsLayer.js",
  "@arcgis/core/Graphic.js",
  "@arcgis/core/geometry/Point.js",
  "@arcgis/core/geometry/Polyline.js",
  "@arcgis/core/geometry/Polygon.js",
  "@arcgis/core/symbols/SimpleMarkerSymbol.js",
  "@arcgis/core/symbols/SimpleLineSymbol.js",
  "@arcgis/core/symbols/SimpleFillSymbol.js",
  "@arcgis/core/symbols/PointSymbol3D.js",
  "@arcgis/core/symbols/IconSymbol3DLayer.js",
  "@arcgis/core/symbols/LineSymbol3D.js",
  "@arcgis/core/symbols/LineSymbol3DLayer.js",
  "@arcgis/core/symbols/PolygonSymbol3D.js",
  "@arcgis/core/symbols/FillSymbol3DLayer.js",
  "@arcgis/core/symbols/TextSymbol.js",
  "@arcgis/core/PopupTemplate.js",
  "@arcgis/core/core/reactiveUtils.js"
]);

// =====================================================
// CONFIGURATION
// =====================================================

const CONFIG = {
  TLE_URL: "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle",
  TLE_VISUAL_URL: "https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle",
  TLE_STATIONS_URL: "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle",
  OPENSKY_URL: "https://opensky-network.org/api/states/all",
  SAT_UPDATE_INTERVAL: 1000,
  AIRCRAFT_UPDATE_INTERVAL: 10000,
  MAX_SATELLITES: 200,
  MAX_AIRCRAFT: 500,
  ORBIT_POINTS: 200,
  FOOTPRINT_SEGMENTS: 36,
};

// =====================================================
// LAYERS
// =====================================================

const satelliteLayer = new GraphicsLayer({ title: "Satellites", elevationInfo: { mode: "absolute-height" } });
const orbitLayer = new GraphicsLayer({ title: "Orbits", elevationInfo: { mode: "absolute-height" } });
const footprintLayer = new GraphicsLayer({ title: "Footprints" });
const aircraftLayer = new GraphicsLayer({ title: "Aircraft", elevationInfo: { mode: "absolute-height" } });

// =====================================================
// MAP & VIEW
// =====================================================

const map = new Map({
  basemap: "satellite",
  ground: "world-elevation",
  layers: [footprintLayer, orbitLayer, satelliteLayer, aircraftLayer]
});

const view = new SceneView({
  container: "viewDiv",
  map: map,
  qualityProfile: "high",
  environment: {
    atmosphereEnabled: true,
    atmosphere: { quality: "high" },
    starsEnabled: true,
    lighting: {
      type: "virtual"
    }
  },
  camera: {
    position: { longitude: -10, latitude: 20, z: 25000000 },
    heading: 0,
    tilt: 0
  },
  ui: { components: [] },
  popup: { autoOpenEnabled: false }
});

// =====================================================
// SATELLITE.JS — Inline TLE propagation (SGP4)
// We load satellite.js from CDN dynamically
// =====================================================

let satelliteJs = null;
const satData = [];
let selectedSat = null;

async function loadSatelliteJs() {
  try {
    // Load satellite.js from CDN via dynamic import workaround
    const response = await fetch("https://unpkg.com/satellite.js@5.0.0/dist/satellite.min.js");
    const code = await response.text();
    const blob = new Blob([code + "\n;window.__satelliteJs = satellite;"], { type: "application/javascript" });
    const script = document.createElement("script");
    script.src = URL.createObjectURL(blob);
    document.head.appendChild(script);
    await new Promise(resolve => { script.onload = resolve; });
    satelliteJs = window.__satelliteJs || window.satellite;
    console.log("[WorldView] satellite.js loaded");
  } catch (e) {
    console.warn("[WorldView] Failed to load satellite.js:", e);
  }
}

// =====================================================
// TLE PARSING & ORBIT PROPAGATION
// =====================================================

function parseTLEs(tleText) {
  const lines = tleText.trim().split("\n").map(l => l.trim());
  const sats = [];
  for (let i = 0; i < lines.length - 2; i += 3) {
    if (lines[i + 1]?.startsWith("1 ") && lines[i + 2]?.startsWith("2 ")) {
      sats.push({
        name: lines[i].replace(/^0 /, ""),
        tle1: lines[i + 1],
        tle2: lines[i + 2]
      });
    }
  }
  return sats;
}

function propagateSatellite(satrec, date) {
  const gmst = satelliteJs.gstime(date);
  const posVel = satelliteJs.propagate(satrec, date);
  if (!posVel.position) return null;
  const geo = satelliteJs.eciToGeodetic(posVel.position, gmst);
  return {
    latitude: satelliteJs.degreesLat(geo.latitude),
    longitude: satelliteJs.degreesLong(geo.longitude),
    altitude: geo.height * 1000, // km to meters
    velocity: Math.sqrt(
      posVel.velocity.x ** 2 +
      posVel.velocity.y ** 2 +
      posVel.velocity.z ** 2
    )
  };
}

function computeOrbitPath(satrec, startDate, minutes, numPoints) {
  const path = [];
  for (let i = 0; i < numPoints; i++) {
    const t = new Date(startDate.getTime() + (i / numPoints) * minutes * 60000);
    const pos = propagateSatellite(satrec, t);
    if (pos) path.push(pos);
  }
  return path;
}

function computeFootprint(lat, lon, altKm, segments) {
  // Approximate ground footprint based on satellite altitude
  // Half-angle from satellite to Earth horizon: acos(Re / (Re + h))
  const Re = 6371; // Earth radius km
  const halfAngle = Math.acos(Re / (Re + altKm)) * (180 / Math.PI);
  const ring = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    const dlat = halfAngle * Math.cos(angle);
    const dlon = halfAngle * Math.sin(angle) / Math.cos(lat * Math.PI / 180);
    ring.push([lon + dlon, lat + dlat]);
  }
  return ring;
}

// =====================================================
// SATELLITE RENDERING
// =====================================================

const satSymbol = new PointSymbol3D({
  symbolLayers: [new IconSymbol3DLayer({
    resource: { primitive: "circle" },
    size: 8,
    material: { color: [0, 255, 65, 0.9] },
    outline: { color: [0, 255, 65, 0.4], size: 2 }
  })]
});

const satSymbolSelected = new PointSymbol3D({
  symbolLayers: [new IconSymbol3DLayer({
    resource: { primitive: "circle" },
    size: 12,
    material: { color: [255, 176, 0, 1] },
    outline: { color: [255, 176, 0, 0.5], size: 3 }
  })]
});

const orbitSymbol = new LineSymbol3D({
  symbolLayers: [new LineSymbol3DLayer({
    material: { color: [0, 255, 65, 0.25] },
    size: 1
  })]
});

const orbitSymbolSelected = new LineSymbol3D({
  symbolLayers: [new LineSymbol3DLayer({
    material: { color: [255, 176, 0, 0.5] },
    size: 1.5
  })]
});

const footprintSymbol = new PolygonSymbol3D({
  symbolLayers: [new FillSymbol3DLayer({
    material: { color: [0, 229, 255, 0.06] },
    outline: { color: [0, 229, 255, 0.3], size: 1 }
  })]
});

const footprintSymbolSelected = new PolygonSymbol3D({
  symbolLayers: [new FillSymbol3DLayer({
    material: { color: [255, 176, 0, 0.1] },
    outline: { color: [255, 176, 0, 0.5], size: 1.5 }
  })]
});

async function loadSatellites() {
  if (!satelliteJs) return;

  // Try multiple TLE sources
  const urls = [CONFIG.TLE_STATIONS_URL, CONFIG.TLE_VISUAL_URL];
  let allTles = [];

  for (const url of urls) {
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        const text = await resp.text();
        allTles = allTles.concat(parseTLEs(text));
      }
    } catch (e) {
      console.warn("[WorldView] TLE fetch failed:", url, e);
    }
  }

  if (allTles.length === 0) {
    console.warn("[WorldView] No TLE data available, using demo data");
    allTles = getDemoSatellites();
  }

  // Limit satellites
  const tles = allTles.slice(0, CONFIG.MAX_SATELLITES);
  satData.length = 0;

  for (const tle of tles) {
    try {
      const satrec = satelliteJs.twoline2satrec(tle.tle1, tle.tle2);
      const noradId = tle.tle2.substring(2, 7).trim();
      satData.push({ name: tle.name, satrec, noradId, tle1: tle.tle1, tle2: tle.tle2 });
    } catch (e) {
      // Skip invalid TLEs
    }
  }

  console.log(`[WorldView] Loaded ${satData.length} satellites`);
  updateSatellites();
}

function getDemoSatellites() {
  // Fallback demo TLEs (ISS + a few others)
  return [
    {
      name: "ISS (ZARYA)",
      tle1: "1 25544U 98067A   24045.51749023  .00025432  00000+0  45046-3 0  9997",
      tle2: "2 25544  51.6415 270.5680 0004152 101.4553 346.0900 15.50060574439774"
    },
    {
      name: "STARLINK-1007",
      tle1: "1 44713U 19074A   24045.91667824  .00001264  00000+0  10003-3 0  9993",
      tle2: "2 44713  53.0556 171.5810 0001413  89.2200 270.8985 15.06378089237614"
    },
    {
      name: "HUBBLE",
      tle1: "1 20580U 90037B   24045.14585867  .00002113  00000+0  10835-3 0  9994",
      tle2: "2 20580  28.4698 133.7089 0002603  24.3577 335.7442 15.09438040433201"
    },
    {
      name: "TIANGONG",
      tle1: "1 48274U 21035A   24045.21750000  .00021897  00000+0  26093-3 0  9991",
      tle2: "2 48274  41.4720 315.2710 0005350 277.6550 168.0560 15.62017478161234"
    },
    {
      name: "NOAA 19",
      tle1: "1 33591U 09005A   24045.50000000  .00000060  00000+0  56400-4 0  9992",
      tle2: "2 33591  99.1640 47.4530 0014000  76.7800 283.5000 14.12460000791234"
    }
  ];
}

function updateSatellites() {
  if (!satelliteJs || satData.length === 0) return;

  const now = new Date();
  satelliteLayer.removeAll();
  orbitLayer.removeAll();
  footprintLayer.removeAll();

  let count = 0;

  for (const sat of satData) {
    const pos = propagateSatellite(sat.satrec, now);
    if (!pos) continue;

    sat.currentPos = pos;
    count++;

    const isSelected = selectedSat && selectedSat.noradId === sat.noradId;

    // Satellite point
    const satGraphic = new Graphic({
      geometry: new Point({
        longitude: pos.longitude,
        latitude: pos.latitude,
        z: pos.altitude
      }),
      symbol: isSelected ? satSymbolSelected : satSymbol,
      attributes: {
        name: sat.name,
        noradId: sat.noradId,
        lat: pos.latitude.toFixed(4),
        lon: pos.longitude.toFixed(4),
        alt: (pos.altitude / 1000).toFixed(1),
        vel: (pos.velocity).toFixed(2)
      }
    });
    satelliteLayer.add(satGraphic);

    // Orbit path — only show for selected or if few satellites
    if (isSelected || satData.length <= 20) {
      const orbitPath = computeOrbitPath(sat.satrec, now, 90, CONFIG.ORBIT_POINTS);
      if (orbitPath.length > 1) {
        // Split orbit at antimeridian crossings
        const segments = splitOrbitAtAntimeridian(orbitPath);
        for (const segment of segments) {
          const orbitGraphic = new Graphic({
            geometry: new Polyline({
              paths: [segment.map(p => [p.longitude, p.latitude, p.altitude])]
            }),
            symbol: isSelected ? orbitSymbolSelected : orbitSymbol
          });
          orbitLayer.add(orbitGraphic);
        }
      }
    }

    // Footprint
    const altKm = pos.altitude / 1000;
    if (altKm > 100) {
      const ring = computeFootprint(pos.latitude, pos.longitude, altKm, CONFIG.FOOTPRINT_SEGMENTS);
      const fpGraphic = new Graphic({
        geometry: new Polygon({ rings: [ring] }),
        symbol: isSelected ? footprintSymbolSelected : footprintSymbol
      });
      footprintLayer.add(fpGraphic);
    }
  }

  document.getElementById("hud-sat-count").textContent = `SATELLITES: ${count}`;

  // Update selected satellite detail
  if (selectedSat && selectedSat.currentPos) {
    updateSatDetail(selectedSat);
  }
}

function splitOrbitAtAntimeridian(path) {
  const segments = [[]];
  for (let i = 0; i < path.length; i++) {
    segments[segments.length - 1].push(path[i]);
    if (i < path.length - 1) {
      const dlon = Math.abs(path[i + 1].longitude - path[i].longitude);
      if (dlon > 180) {
        segments.push([]);
      }
    }
  }
  return segments.filter(s => s.length > 1);
}

// =====================================================
// AIRCRAFT TRACKING
// =====================================================

const aircraftSymbol = new PointSymbol3D({
  symbolLayers: [new IconSymbol3DLayer({
    resource: { primitive: "triangle" },
    size: 7,
    material: { color: [255, 176, 0, 0.8] },
    outline: { color: [255, 176, 0, 0.3], size: 1 }
  })]
});

async function loadAircraft() {
  try {
    const resp = await fetch(CONFIG.OPENSKY_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    aircraftLayer.removeAll();
    const states = (data.states || []).slice(0, CONFIG.MAX_AIRCRAFT);

    let count = 0;
    for (const s of states) {
      const callsign = (s[1] || "").trim();
      const lon = s[5];
      const lat = s[6];
      const alt = s[7] || s[13]; // baro or geo altitude
      const velocity = s[9];
      const heading = s[10];
      const onGround = s[8];

      if (!lon || !lat || onGround) continue;

      const graphic = new Graphic({
        geometry: new Point({
          longitude: lon,
          latitude: lat,
          z: alt || 10000
        }),
        symbol: aircraftSymbol,
        attributes: {
          callsign: callsign || "N/A",
          altitude: alt ? `${Math.round(alt)}m` : "N/A",
          velocity: velocity ? `${Math.round(velocity)}m/s` : "N/A",
          heading: heading ? `${Math.round(heading)}deg` : "N/A",
          origin: s[2] || "N/A"
        }
      });
      aircraftLayer.add(graphic);
      count++;
    }

    document.getElementById("hud-aircraft-count").textContent = `AIRCRAFT: ${count}`;
    console.log(`[WorldView] Tracking ${count} aircraft`);
  } catch (e) {
    console.warn("[WorldView] Aircraft fetch failed (CORS or rate limit):", e.message);
    document.getElementById("hud-aircraft-count").textContent = "AIRCRAFT: OFFLINE";
  }
}

// =====================================================
// HUD UPDATES
// =====================================================

function updateHUD() {
  // Clock
  const now = new Date();
  const utc = now.toISOString().replace("T", " ").substring(0, 19) + " UTC";
  document.getElementById("hud-clock").textContent = utc;

  // Camera position
  if (view.camera) {
    const cam = view.camera;
    document.getElementById("hud-lat").textContent = `LAT: ${cam.position.latitude.toFixed(4)}`;
    document.getElementById("hud-lon").textContent = `LON: ${cam.position.longitude.toFixed(4)}`;
    document.getElementById("hud-alt").textContent = `ALT: ${formatAlt(cam.position.z)}`;
    document.getElementById("hud-heading").textContent = `HDG: ${cam.heading.toFixed(1)}°`;
    document.getElementById("hud-tilt").textContent = `TILT: ${cam.tilt.toFixed(1)}°`;
  }
}

function formatAlt(meters) {
  if (meters > 1000000) return `${(meters / 1000000).toFixed(1)}M km`;
  if (meters > 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function updateSatDetail(sat) {
  const panel = document.getElementById("sat-detail");
  panel.classList.remove("hidden");
  const p = sat.currentPos;
  document.getElementById("sat-detail-name").textContent = sat.name;
  document.getElementById("sat-detail-id").textContent = `NORAD: ${sat.noradId}`;
  document.getElementById("sat-detail-lat").textContent = `LAT: ${p.latitude.toFixed(4)}°`;
  document.getElementById("sat-detail-lon").textContent = `LON: ${p.longitude.toFixed(4)}°`;
  document.getElementById("sat-detail-alt").textContent = `ALT: ${(p.altitude / 1000).toFixed(1)} km`;
  document.getElementById("sat-detail-vel").textContent = `VEL: ${p.velocity.toFixed(2)} km/s`;
}

// =====================================================
// EVENT HANDLERS
// =====================================================

// Render mode buttons
document.querySelectorAll("[data-mode]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-mode]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.body.className = btn.dataset.mode === "normal" ? "" : `mode-${btn.dataset.mode}`;
  });
});

// Layer toggles
document.getElementById("toggle-satellites").addEventListener("change", e => {
  satelliteLayer.visible = e.target.checked;
});
document.getElementById("toggle-orbits").addEventListener("change", e => {
  orbitLayer.visible = e.target.checked;
});
document.getElementById("toggle-footprints").addEventListener("change", e => {
  footprintLayer.visible = e.target.checked;
});
document.getElementById("toggle-aircraft").addEventListener("change", e => {
  aircraftLayer.visible = e.target.checked;
});

// Go-to buttons
const goToTargets = {
  globe: { position: { longitude: -10, latitude: 20, z: 25000000 }, heading: 0, tilt: 0 },
  usa: { position: { longitude: -98, latitude: 38, z: 8000000 }, heading: 0, tilt: 15 },
  europe: { position: { longitude: 10, latitude: 48, z: 6000000 }, heading: 0, tilt: 15 },
  asia: { position: { longitude: 105, latitude: 30, z: 8000000 }, heading: 0, tilt: 15 }
};

document.querySelectorAll(".goto-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = goToTargets[btn.dataset.target];
    if (target) {
      view.goTo(target, { duration: 2000, easing: "ease-in-out" });
    }
  });
});

// Click on satellite
view.on("click", async (event) => {
  const resp = await view.hitTest(event);
  const result = resp.results.find(r => r.graphic?.layer === satelliteLayer);
  if (result) {
    const attrs = result.graphic.attributes;
    selectedSat = satData.find(s => s.noradId === attrs.noradId) || null;
    if (selectedSat) {
      updateSatellites(); // Re-render with selection
      // Fly to satellite
      view.goTo({
        target: result.graphic.geometry,
        heading: view.camera.heading,
        tilt: 45,
        zoom: 4
      }, { duration: 1500 });
    }
  } else {
    // Clicked elsewhere — deselect
    if (selectedSat) {
      selectedSat = null;
      document.getElementById("sat-detail").classList.add("hidden");
      updateSatellites();
    }
  }
});

// Dismiss satellite detail
document.getElementById("sat-detail-close").addEventListener("click", () => {
  selectedSat = null;
  document.getElementById("sat-detail").classList.add("hidden");
  updateSatellites();
});

// =====================================================
// INITIALIZATION
// =====================================================

async function init() {
  console.log("[WorldView] Initializing...");

  await view.when();
  console.log("[WorldView] SceneView ready");

  // Start HUD clock
  setInterval(updateHUD, 250);
  updateHUD();

  // Load satellite.js and start tracking
  await loadSatelliteJs();
  await loadSatellites();

  // Update satellite positions every second
  setInterval(updateSatellites, CONFIG.SAT_UPDATE_INTERVAL);

  // Load aircraft
  loadAircraft();
  setInterval(loadAircraft, CONFIG.AIRCRAFT_UPDATE_INTERVAL);

  console.log("[WorldView] All systems operational");
}

init();
