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
  PointSymbol3D,
  IconSymbol3DLayer,
  LineSymbol3D,
  LineSymbol3DLayer,
  PolygonSymbol3D,
  FillSymbol3DLayer
] = await $arcgis.import([
  "@arcgis/core/Map.js",
  "@arcgis/core/views/SceneView.js",
  "@arcgis/core/layers/GraphicsLayer.js",
  "@arcgis/core/Graphic.js",
  "@arcgis/core/geometry/Point.js",
  "@arcgis/core/geometry/Polyline.js",
  "@arcgis/core/geometry/Polygon.js",
  "@arcgis/core/symbols/PointSymbol3D.js",
  "@arcgis/core/symbols/IconSymbol3DLayer.js",
  "@arcgis/core/symbols/LineSymbol3D.js",
  "@arcgis/core/symbols/LineSymbol3DLayer.js",
  "@arcgis/core/symbols/PolygonSymbol3D.js",
  "@arcgis/core/symbols/FillSymbol3DLayer.js"
]);

// satellite.js loaded via <script> tag — available as window.satellite
const satelliteJs = window.satellite;
if (!satelliteJs) {
  console.error("[WorldView] satellite.js not loaded!");
}

// =====================================================
// CONFIGURATION
// =====================================================

const CONFIG = {
  TLE_STATIONS_URL: "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle",
  TLE_VISUAL_URL: "https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle",
  TLE_SCIENCE_URL: "https://celestrak.org/NORAD/elements/gp.php?GROUP=science&FORMAT=tle",
  OPENSKY_URL: "https://opensky-network.org/api/states/all",
  SAT_UPDATE_INTERVAL: 2000,
  AIRCRAFT_UPDATE_INTERVAL: 15000,
  MAX_SATELLITES: 250,
  MAX_AIRCRAFT: 600,
  ORBIT_POINTS: 180,
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
    lighting: { type: "virtual" }
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
// TLE PARSING & ORBIT PROPAGATION
// =====================================================

const satData = [];
let selectedSat = null;

function parseTLEs(tleText) {
  const lines = tleText.trim().split("\n").map(l => l.trim()).filter(l => l.length > 0);
  const sats = [];
  for (let i = 0; i < lines.length - 2; i += 3) {
    if (lines[i + 1]?.startsWith("1 ") && lines[i + 2]?.startsWith("2 ")) {
      sats.push({
        name: lines[i].replace(/^0 /, "").trim(),
        tle1: lines[i + 1],
        tle2: lines[i + 2]
      });
    }
  }
  return sats;
}

function propagateSatellite(satrec, date) {
  try {
    const gmst = satelliteJs.gstime(date);
    const posVel = satelliteJs.propagate(satrec, date);
    if (!posVel.position || typeof posVel.position.x !== "number") return null;
    const geo = satelliteJs.eciToGeodetic(posVel.position, gmst);
    const lat = satelliteJs.degreesLat(geo.latitude);
    const lon = satelliteJs.degreesLong(geo.longitude);
    if (isNaN(lat) || isNaN(lon)) return null;
    return {
      latitude: lat,
      longitude: lon,
      altitude: geo.height * 1000, // km to meters
      velocity: Math.sqrt(
        posVel.velocity.x ** 2 +
        posVel.velocity.y ** 2 +
        posVel.velocity.z ** 2
      )
    };
  } catch {
    return null;
  }
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
  const Re = 6371;
  const halfAngle = Math.acos(Re / (Re + altKm)) * (180 / Math.PI);
  const ring = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    const dlat = halfAngle * Math.cos(angle);
    const cosLat = Math.cos(lat * Math.PI / 180);
    const dlon = cosLat > 0.01 ? halfAngle * Math.sin(angle) / cosLat : 0;
    ring.push([lon + dlon, lat + dlat]);
  }
  return ring;
}

// =====================================================
// SYMBOLS
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
    size: 14,
    material: { color: [255, 176, 0, 1] },
    outline: { color: [255, 176, 0, 0.5], size: 3 }
  })]
});

const orbitSymbol = new LineSymbol3D({
  symbolLayers: [new LineSymbol3DLayer({
    material: { color: [0, 255, 65, 0.3] },
    size: 1
  })]
});

const orbitSymbolSelected = new LineSymbol3D({
  symbolLayers: [new LineSymbol3DLayer({
    material: { color: [255, 176, 0, 0.6] },
    size: 2
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

const aircraftSymbol = new PointSymbol3D({
  symbolLayers: [new IconSymbol3DLayer({
    resource: { primitive: "triangle" },
    size: 7,
    material: { color: [255, 176, 0, 0.8] },
    outline: { color: [255, 176, 0, 0.3], size: 1 }
  })]
});

// =====================================================
// EMBEDDED FALLBACK TLEs (fresh 2026 epoch)
// =====================================================

const FALLBACK_TLES = [
  { name: "ISS (ZARYA)", tle1: "1 25544U 98067A   26063.86671769  .00009014  00000+0  17477-3 0  9999", tle2: "2 25544  51.6315  96.2009 0008177 157.5272 202.6076 15.48447334555585" },
  { name: "CSS (TIANHE)", tle1: "1 48274U 21035A   26063.78776639  .00021476  00000+0  25733-3 0  9998", tle2: "2 48274  41.4657 237.9826 0006814 244.2570 115.7565 15.60402079276845" },
  { name: "CSS (WENTIAN)", tle1: "1 53239U 22085A   26063.78776639  .00021476  00000+0  25733-3 0  9991", tle2: "2 53239  41.4657 237.9826 0006814 244.2570 115.7565 15.60402079276505" },
  { name: "CSS (MENGTIAN)", tle1: "1 54216U 22143A   26063.78776639  .00021476  00000+0  25733-3 0  9992", tle2: "2 54216  41.4657 237.9826 0006814 244.2570 115.7565 15.60402079276477" },
  { name: "SHENZHOU-22", tle1: "1 66645U 25272A   26063.78776639  .00021476  00000+0  25733-3 0  9997", tle2: "2 66645  41.4657 237.9826 0006814 244.2570 115.7565 15.60402079268411" },
  { name: "SOYUZ-MS 28", tle1: "1 66664U 25275A   26063.86671769  .00009014  00000+0  17477-3 0  9998", tle2: "2 66664  51.6315  96.2009 0008177 157.5272 202.6076 15.48447334555583" },
  { name: "CREW DRAGON 12", tle1: "1 67796U 26031A   26063.86671769  .00009014  00000+0  17477-3 0  9996", tle2: "2 67796  51.6315  96.2009 0008177 157.5272 202.6076 15.48447334555490" },
  { name: "PROGRESS-MS 31", tle1: "1 64751U 25146A   26063.86671769  .00009014  00000+0  17477-3 0  9990", tle2: "2 64751  51.6315  96.2009 0008177 157.5272 202.6076 15.48447334555432" },
  { name: "TIANZHOU-9", tle1: "1 64786U 25149A   26063.78776639  .00021476  00000+0  25733-3 0  9994", tle2: "2 64786  41.4657 237.9826 0006814 244.2570 115.7565 15.60402079276481" },
  { name: "HTV-X1", tle1: "1 66174U 25241A   26063.86671769  .00009014  00000+0  17477-3 0  9997", tle2: "2 66174  51.6315  96.2009 0008177 157.5272 202.6076 15.48447334555466" },
  { name: "CYGNUS NG-23", tle1: "1 65616U 25208A   26063.86671769  .00009014  00000+0  17477-3 0  9990", tle2: "2 65616  51.6315  96.2009 0008177 157.5272 202.6076 15.48447334555556" },
  { name: "POISK", tle1: "1 36086U 09060A   26063.86671769  .00009014  00000+0  17477-3 0  9997", tle2: "2 36086  51.6315  96.2009 0008177 157.5272 202.6076 15.48447334555375" },
  { name: "ISS (NAUKA)", tle1: "1 49044U 21066A   26063.86671769  .00009014  00000+0  17477-3 0  9995", tle2: "2 49044  51.6315  96.2009 0008177 157.5272 202.6076 15.48447334555407" },
  { name: "PROGRESS-MS 32", tle1: "1 65586U 25204A   26063.86671769  .00009014  00000+0  17477-3 0  9992", tle2: "2 65586  51.6315  96.2009 0008177 157.5272 202.6076 15.48447334555529" },
  { name: "SZ-21 MODULE", tle1: "1 66515U 25246C   26063.53344538  .00046935  00000+0  41049-3 0  9991", tle2: "2 66515  41.4731 235.0908 0001435 286.9627  73.1057 15.68084352 17266" },
];

// =====================================================
// SATELLITE DATA LOADING
// =====================================================

async function fetchTLEs(url) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    return parseTLEs(text);
  } catch (e) {
    console.warn(`[WorldView] TLE fetch failed: ${url}`, e.message);
    return [];
  }
}

async function loadSatellites() {
  if (!satelliteJs) {
    console.error("[WorldView] Cannot load satellites - satellite.js unavailable");
    return;
  }

  logStatus("Fetching TLE data...");

  // Try fetching live TLE data from multiple groups in parallel
  const [stations, visual, science] = await Promise.all([
    fetchTLEs(CONFIG.TLE_STATIONS_URL),
    fetchTLEs(CONFIG.TLE_VISUAL_URL),
    fetchTLEs(CONFIG.TLE_SCIENCE_URL),
  ]);

  // Deduplicate by NORAD ID (from TLE line 2, chars 2-7)
  const seen = new Set();
  let allTles = [];
  for (const tle of [...stations, ...visual, ...science]) {
    const noradId = tle.tle2.substring(2, 7).trim();
    if (!seen.has(noradId)) {
      seen.add(noradId);
      allTles.push(tle);
    }
  }

  if (allTles.length === 0) {
    console.warn("[WorldView] No live TLE data — using embedded fallback");
    logStatus("Using fallback satellite data");
    allTles = FALLBACK_TLES;
  } else {
    logStatus(`Loaded ${allTles.length} TLEs from CelesTrak`);
  }

  // Limit and initialize satrecs
  const tles = allTles.slice(0, CONFIG.MAX_SATELLITES);
  satData.length = 0;

  for (const tle of tles) {
    try {
      const satrec = satelliteJs.twoline2satrec(tle.tle1, tle.tle2);
      // Validate by propagating to now
      const testPos = propagateSatellite(satrec, new Date());
      if (!testPos) continue;
      const noradId = tle.tle2.substring(2, 7).trim();
      satData.push({ name: tle.name, satrec, noradId });
    } catch {
      // Skip invalid TLEs
    }
  }

  console.log(`[WorldView] ${satData.length} satellites initialized`);
  logStatus(`Tracking ${satData.length} satellites`);
  updateSatellites();
}

// =====================================================
// SATELLITE RENDERING
// =====================================================

function updateSatellites() {
  if (!satelliteJs || satData.length === 0) return;

  const now = new Date();
  const satGraphics = [];
  const orbitGraphics = [];
  const fpGraphics = [];
  let count = 0;

  for (const sat of satData) {
    const pos = propagateSatellite(sat.satrec, now);
    if (!pos) continue;

    sat.currentPos = pos;
    count++;

    const isSelected = selectedSat && selectedSat.noradId === sat.noradId;

    // Satellite point
    satGraphics.push(new Graphic({
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
        vel: pos.velocity.toFixed(2)
      }
    }));

    // Orbit path — show for selected, or for all if <= 30 sats
    if (isSelected || satData.length <= 30) {
      const orbitPath = computeOrbitPath(sat.satrec, now, 90, CONFIG.ORBIT_POINTS);
      if (orbitPath.length > 1) {
        const segments = splitOrbitAtAntimeridian(orbitPath);
        for (const segment of segments) {
          orbitGraphics.push(new Graphic({
            geometry: new Polyline({
              paths: [segment.map(p => [p.longitude, p.latitude, p.altitude])]
            }),
            symbol: isSelected ? orbitSymbolSelected : orbitSymbol
          }));
        }
      }
    }

    // Footprint
    const altKm = pos.altitude / 1000;
    if (altKm > 100 && altKm < 50000) {
      const ring = computeFootprint(pos.latitude, pos.longitude, altKm, CONFIG.FOOTPRINT_SEGMENTS);
      fpGraphics.push(new Graphic({
        geometry: new Polygon({ rings: [ring] }),
        symbol: isSelected ? footprintSymbolSelected : footprintSymbol
      }));
    }
  }

  // Batch update layers
  satelliteLayer.removeAll();
  satelliteLayer.addMany(satGraphics);
  orbitLayer.removeAll();
  orbitLayer.addMany(orbitGraphics);
  footprintLayer.removeAll();
  footprintLayer.addMany(fpGraphics);

  document.getElementById("hud-sat-count").textContent = `SATELLITES: ${count}`;

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

async function loadAircraft() {
  try {
    const resp = await fetch(CONFIG.OPENSKY_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    const states = (data.states || []).slice(0, CONFIG.MAX_AIRCRAFT);
    const graphics = [];

    for (const s of states) {
      const callsign = (s[1] || "").trim();
      const lon = s[5];
      const lat = s[6];
      const alt = s[7] || s[13];
      const velocity = s[9];
      const heading = s[10];
      const onGround = s[8];

      if (lon == null || lat == null || onGround) continue;

      graphics.push(new Graphic({
        geometry: new Point({
          longitude: lon,
          latitude: lat,
          z: (alt || 10000)
        }),
        symbol: aircraftSymbol,
        attributes: {
          callsign: callsign || "N/A",
          altitude: alt ? `${Math.round(alt)}m` : "N/A",
          velocity: velocity ? `${Math.round(velocity)}m/s` : "N/A",
          heading: heading != null ? `${Math.round(heading)}°` : "N/A",
          origin: s[2] || "N/A"
        }
      }));
    }

    aircraftLayer.removeAll();
    aircraftLayer.addMany(graphics);
    document.getElementById("hud-aircraft-count").textContent = `AIRCRAFT: ${graphics.length}`;
    logStatus(`Tracking ${graphics.length} aircraft`);
    console.log(`[WorldView] Tracking ${graphics.length} aircraft`);
  } catch (e) {
    console.warn("[WorldView] Aircraft API failed:", e.message);
    // Generate simulated aircraft as fallback
    loadSimulatedAircraft();
  }
}

function loadSimulatedAircraft() {
  const graphics = [];
  // Generate realistic-looking aircraft along major air corridors
  const corridors = [
    // Transatlantic
    { latRange: [40, 55], lonRange: [-60, -10], count: 40, altRange: [9000, 12000] },
    // North America
    { latRange: [25, 50], lonRange: [-125, -70], count: 60, altRange: [8000, 12000] },
    // Europe
    { latRange: [35, 60], lonRange: [-10, 35], count: 50, altRange: [8000, 12000] },
    // Asia
    { latRange: [10, 45], lonRange: [70, 140], count: 50, altRange: [9000, 12000] },
    // Middle East
    { latRange: [15, 40], lonRange: [30, 60], count: 25, altRange: [9000, 11000] },
    // South America
    { latRange: [-35, 5], lonRange: [-75, -35], count: 20, altRange: [8000, 11000] },
    // Pacific
    { latRange: [15, 45], lonRange: [140, 180], count: 15, altRange: [10000, 12000] },
    // Africa
    { latRange: [-20, 20], lonRange: [10, 45], count: 15, altRange: [9000, 11000] },
    // Australia
    { latRange: [-40, -15], lonRange: [115, 155], count: 15, altRange: [9000, 11000] },
  ];

  const callsignPrefixes = ["UAL", "DAL", "AAL", "SWA", "BAW", "DLH", "AFR", "KLM", "SIA", "QFA", "ANA", "JAL", "CCA", "CSN", "CES", "ETH", "UAE", "QTR", "THY", "TAM"];

  let id = 1;
  for (const c of corridors) {
    for (let i = 0; i < c.count; i++) {
      const lat = c.latRange[0] + Math.random() * (c.latRange[1] - c.latRange[0]);
      const lon = c.lonRange[0] + Math.random() * (c.lonRange[1] - c.lonRange[0]);
      const alt = c.altRange[0] + Math.random() * (c.altRange[1] - c.altRange[0]);
      const prefix = callsignPrefixes[Math.floor(Math.random() * callsignPrefixes.length)];
      const callsign = `${prefix}${100 + Math.floor(Math.random() * 900)}`;

      graphics.push(new Graphic({
        geometry: new Point({ longitude: lon, latitude: lat, z: alt }),
        symbol: aircraftSymbol,
        attributes: {
          callsign,
          altitude: `${Math.round(alt)}m`,
          velocity: `${220 + Math.floor(Math.random() * 60)}m/s`,
          heading: `${Math.floor(Math.random() * 360)}°`,
          origin: "SIM"
        }
      }));
      id++;
    }
  }

  aircraftLayer.removeAll();
  aircraftLayer.addMany(graphics);
  document.getElementById("hud-aircraft-count").textContent = `AIRCRAFT: ${graphics.length} (SIM)`;
  logStatus(`Simulated ${graphics.length} aircraft (API offline)`);
  console.log(`[WorldView] Simulated ${graphics.length} aircraft (OpenSky offline)`);
}

// =====================================================
// HUD UPDATES
// =====================================================

function updateHUD() {
  const now = new Date();
  const utc = now.toISOString().replace("T", " ").substring(0, 19) + " UTC";
  document.getElementById("hud-clock").textContent = utc;

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

function logStatus(msg) {
  const el = document.getElementById("hud-status");
  if (el) el.textContent = msg;
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
    if (target) view.goTo(target, { duration: 2000, easing: "ease-in-out" });
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
      updateSatellites();
      view.goTo({
        target: result.graphic.geometry,
        heading: view.camera.heading,
        tilt: 45,
        zoom: 4
      }, { duration: 1500 });
    }
  } else if (selectedSat) {
    selectedSat = null;
    document.getElementById("sat-detail").classList.add("hidden");
    updateSatellites();
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
  logStatus("Initializing SceneView...");

  await view.when();
  console.log("[WorldView] SceneView ready");
  logStatus("SceneView ready");

  // Start HUD clock
  setInterval(updateHUD, 250);
  updateHUD();

  // Load satellites
  await loadSatellites();

  // Update satellite positions periodically
  setInterval(updateSatellites, CONFIG.SAT_UPDATE_INTERVAL);

  // Load aircraft
  await loadAircraft();
  setInterval(loadAircraft, CONFIG.AIRCRAFT_UPDATE_INTERVAL);

  logStatus("All systems operational");
  console.log("[WorldView] All systems operational");
}

init();
