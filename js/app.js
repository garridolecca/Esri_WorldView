// =====================================================
// ESRI WORLDVIEW — Main Application
// ArcGIS Maps SDK for JavaScript 5.0
// =====================================================

const [
  Map, SceneView, GraphicsLayer, FeatureLayer, SceneLayer, Graphic,
  Point, Polyline, Polygon,
  PointSymbol3D, IconSymbol3DLayer,
  LineSymbol3D, LineSymbol3DLayer,
  PolygonSymbol3D, FillSymbol3DLayer,
  SimpleRenderer, UniqueValueRenderer,
  SimpleLineSymbol, SimpleMarkerSymbol,
  Basemap
] = await $arcgis.import([
  "@arcgis/core/Map.js",
  "@arcgis/core/views/SceneView.js",
  "@arcgis/core/layers/GraphicsLayer.js",
  "@arcgis/core/layers/FeatureLayer.js",
  "@arcgis/core/layers/SceneLayer.js",
  "@arcgis/core/Graphic.js",
  "@arcgis/core/geometry/Point.js",
  "@arcgis/core/geometry/Polyline.js",
  "@arcgis/core/geometry/Polygon.js",
  "@arcgis/core/symbols/PointSymbol3D.js",
  "@arcgis/core/symbols/IconSymbol3DLayer.js",
  "@arcgis/core/symbols/LineSymbol3D.js",
  "@arcgis/core/symbols/LineSymbol3DLayer.js",
  "@arcgis/core/symbols/PolygonSymbol3D.js",
  "@arcgis/core/symbols/FillSymbol3DLayer.js",
  "@arcgis/core/renderers/SimpleRenderer.js",
  "@arcgis/core/renderers/UniqueValueRenderer.js",
  "@arcgis/core/symbols/SimpleLineSymbol.js",
  "@arcgis/core/symbols/SimpleMarkerSymbol.js",
  "@arcgis/core/Basemap.js"
]);

const satelliteJs = window.satellite;
if (!satelliteJs) console.error("[WorldView] satellite.js not loaded!");

// =====================================================
// CONFIG
// =====================================================

const CONFIG = {
  TLE_STATIONS_URL: "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle",
  TLE_VISUAL_URL: "https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle",
  TLE_SCIENCE_URL: "https://celestrak.org/NORAD/elements/gp.php?GROUP=science&FORMAT=tle",
  OPENSKY_URL: "https://opensky-network.org/api/states/all",
  USGS_QUAKE_URL: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",
  NASA_EONET_URL: "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=150",
  CABLES_URL: "https://services.arcgis.com/nzS0F0zdNLvs7nc8/arcgis/rest/services/Submarine_Cables/FeatureServer",
  MILITARY_URL: "https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/MIRTA_Points_A_view/FeatureServer/0",
  SAT_UPDATE_INTERVAL: 2000,
  AIRCRAFT_UPDATE_INTERVAL: 15000,
  QUAKE_UPDATE_INTERVAL: 60000,
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
const earthquakeLayer = new GraphicsLayer({ title: "Earthquakes" });
const nasaEventLayer = new GraphicsLayer({ title: "NASA Events" });
const cctvLayer = new GraphicsLayer({ title: "CCTV Cameras" });
const urbanPOILayer = new GraphicsLayer({ title: "Urban POIs" });

// ArcGIS FeatureLayers for submarine cables and military bases
const cableLayer = new FeatureLayer({
  url: CONFIG.CABLES_URL + "/2",
  title: "Submarine Cables",
  renderer: new SimpleRenderer({
    symbol: new SimpleLineSymbol({
      color: [0, 229, 255, 0.4],
      width: 1.2,
      style: "solid"
    })
  }),
  popupEnabled: false,
  visible: true
});

const cableTerminalLayer = new FeatureLayer({
  url: CONFIG.CABLES_URL + "/1",
  title: "Cable Terminals",
  renderer: new SimpleRenderer({
    symbol: new SimpleMarkerSymbol({
      color: [0, 229, 255, 0.7],
      size: 4,
      outline: { color: [0, 229, 255, 0.3], width: 1 }
    })
  }),
  popupEnabled: false,
  visible: true
});

const militaryLayer = new FeatureLayer({
  url: CONFIG.MILITARY_URL,
  title: "Military Installations",
  renderer: new SimpleRenderer({
    symbol: new PointSymbol3D({
      symbolLayers: [new IconSymbol3DLayer({
        resource: { primitive: "kite" },
        size: 6,
        material: { color: [255, 68, 204, 0.8] },
        outline: { color: [255, 68, 204, 0.3], size: 1 }
      })]
    })
  }),
  popupEnabled: false,
  visible: true
});

// =====================================================
// MAP & VIEW
// =====================================================

const map = new Map({
  basemap: "satellite",
  ground: "world-elevation",
  layers: [
    cableLayer, cableTerminalLayer,
    footprintLayer, orbitLayer,
    earthquakeLayer, nasaEventLayer,
    militaryLayer,
    cctvLayer, urbanPOILayer,
    satelliteLayer, aircraftLayer
  ]
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
// 3D BUILDINGS & CITY SEARCH
// =====================================================

const buildingsLayer = new SceneLayer({
  url: "https://basemaps3d.arcgis.com/arcgis/rest/services/OpenStreetMap3D_Buildings_v1/SceneServer",
  title: "3D Buildings",
  visible: false
});
map.add(buildingsLayer);

let isCityView = false;
const CITY_VIEW_ALT = 800;   // meters — street-level fly-in altitude
const CITY_VIEW_TILT = 70;   // degrees — tilted perspective for buildings
const GLOBE_BASEMAP = "satellite";
const CITY_BASEMAP = "dark-gray-vector";

// Geocode via Nominatim (OpenStreetMap — free, no API key)
async function geocodeCity(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`;
  try {
    const resp = await fetch(url, { headers: { "Accept-Language": "en" } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } catch (e) {
    console.warn("[WorldView] Geocode failed:", e.message);
    return [];
  }
}

async function flyToCity(lat, lon, name) {
  logStatus(`Flying to ${name}...`);
  console.log(`[WorldView] flyToCity: ${name} (${lat}, ${lon})`);

  // Show buildings and city layers
  buildingsLayer.visible = true;
  cctvLayer.visible = true;
  urbanPOILayer.visible = true;
  isCityView = true;
  updateCityViewIndicator();

  try {
    // Step 1: Zoom to region (fast approach)
    await view.goTo({
      position: { longitude: lon, latitude: lat, z: 50000 },
      heading: 0,
      tilt: 30
    }, { duration: 1500, easing: "ease-in-out" });

    // Step 2: Switch basemap after arriving near the city
    map.basemap = CITY_BASEMAP;

    // Step 3: Zoom to street level with tilt for 3D buildings
    await view.goTo({
      position: { longitude: lon, latitude: lat, z: CITY_VIEW_ALT },
      heading: 30,
      tilt: CITY_VIEW_TILT
    }, { duration: 2000, easing: "ease-in-out" });
    console.log("[WorldView] flyToCity: goTo completed");
  } catch (e) {
    console.warn("[WorldView] flyToCity goTo issue:", e.message);
    // Fallback: set camera and basemap directly
    map.basemap = CITY_BASEMAP;
    try {
      view.camera = {
        position: { longitude: lon, latitude: lat, z: CITY_VIEW_ALT },
        heading: 30,
        tilt: CITY_VIEW_TILT
      };
    } catch (e2) {
      console.warn("[WorldView] flyToCity camera fallback failed:", e2.message);
    }
  }

  logStatus(`Viewing ${name} — Loading city data...`);
  loadCityData(lat, lon);
}

async function returnToGlobe() {
  logStatus("Returning to globe...");
  console.log("[WorldView] returnToGlobe");

  map.basemap = GLOBE_BASEMAP;
  buildingsLayer.visible = false;
  cctvLayer.removeAll();
  urbanPOILayer.removeAll();
  cctvLayer.visible = false;
  urbanPOILayer.visible = false;
  isCityView = false;
  updateCityViewIndicator();
  document.getElementById("hud-cctv-count").textContent = "CCTV: --";
  document.getElementById("hud-poi-count").textContent = "URBAN POI: --";

  const globeCamera = {
    position: { longitude: -10, latitude: 20, z: 25000000 },
    heading: 0,
    tilt: 0
  };

  try {
    await view.goTo(globeCamera, { duration: 2500, easing: "ease-in-out" });
  } catch (e) {
    console.warn("[WorldView] returnToGlobe goTo issue:", e.message);
    try { view.camera = globeCamera; } catch (e2) { /* ignore */ }
  }

  logStatus("All systems operational");
}

function updateCityViewIndicator() {
  const btn = document.getElementById("btn-return-globe");
  if (btn) btn.classList.toggle("hidden", !isCityView);
}

// Watch camera altitude to auto-switch basemap
let basemapDebounce = null;
function watchCameraAltitude() {
  if (!view.camera) return;
  const alt = view.camera.position.z;

  clearTimeout(basemapDebounce);
  basemapDebounce = setTimeout(() => {
    if (alt < 50000 && !isCityView) {
      // Zoomed in close — switch to city basemap + buildings
      map.basemap = CITY_BASEMAP;
      buildingsLayer.visible = true;
      isCityView = true;
      updateCityViewIndicator();
    } else if (alt > 200000 && isCityView) {
      // Zoomed back out — return to satellite
      map.basemap = GLOBE_BASEMAP;
      buildingsLayer.visible = false;
      cctvLayer.removeAll();
      urbanPOILayer.removeAll();
      isCityView = false;
      updateCityViewIndicator();
      document.getElementById("hud-cctv-count").textContent = "CCTV: --";
      document.getElementById("hud-poi-count").textContent = "URBAN POI: --";
    }
  }, 300);
}

// =====================================================
// CITY-LEVEL DATA: CCTV + URBAN POIs (Overpass API)
// =====================================================

const cctvSymbol = new PointSymbol3D({
  symbolLayers: [new IconSymbol3DLayer({
    resource: { primitive: "square" },
    size: 6,
    material: { color: [255, 50, 50, 0.9] },
    outline: { color: [255, 50, 50, 0.4], size: 1 }
  })]
});

const fireStationSymbol = new PointSymbol3D({
  symbolLayers: [new IconSymbol3DLayer({
    resource: { primitive: "triangle" },
    size: 8,
    material: { color: [255, 100, 0, 0.9] },
    outline: { color: [255, 100, 0, 0.4], size: 1 }
  })]
});

const policeSymbol = new PointSymbol3D({
  symbolLayers: [new IconSymbol3DLayer({
    resource: { primitive: "kite" },
    size: 8,
    material: { color: [0, 120, 255, 0.9] },
    outline: { color: [0, 120, 255, 0.4], size: 1 }
  })]
});

const hospitalSymbol = new PointSymbol3D({
  symbolLayers: [new IconSymbol3DLayer({
    resource: { primitive: "cross" },
    size: 8,
    material: { color: [255, 255, 255, 0.9] },
    outline: { color: [255, 0, 0, 0.4], size: 1 }
  })]
});

const telecomSymbol = new PointSymbol3D({
  symbolLayers: [new IconSymbol3DLayer({
    resource: { primitive: "circle" },
    size: 5,
    material: { color: [0, 200, 255, 0.8] },
    outline: { color: [0, 200, 255, 0.3], size: 1 }
  })]
});

async function loadCityData(lat, lon) {
  cctvLayer.removeAll();
  urbanPOILayer.removeAll();

  const radius = 5000; // 5km radius around city center
  const overpassUrl = "https://overpass-api.de/api/interpreter";

  const query = `[out:json][timeout:15];
(
  node["man_made"="surveillance"](around:${radius},${lat},${lon});
  node["amenity"="police"](around:${radius},${lat},${lon});
  node["amenity"="fire_station"](around:${radius},${lat},${lon});
  node["amenity"="hospital"](around:${radius},${lat},${lon});
  node["man_made"="mast"]["tower:type"="communication"](around:${radius},${lat},${lon});
  node["telecom"="exchange"](around:${radius},${lat},${lon});
);
out body;`;

  try {
    const resp = await fetch(overpassUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(query)
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    let cctvCount = 0, poiCount = 0;

    for (const el of data.elements) {
      const tags = el.tags || {};
      const point = new Point({ longitude: el.lon, latitude: el.lat, z: 5 });

      if (tags["man_made"] === "surveillance") {
        cctvLayer.add(new Graphic({
          geometry: point,
          symbol: cctvSymbol,
          attributes: {
            type: "cctv",
            name: tags.description || tags.name || "CCTV Camera",
            operator: tags.operator || "Unknown",
            camera_type: tags["surveillance:type"] || tags["camera:type"] || "Unknown",
            mount: tags["surveillance:zone"] || "Unknown",
            lat: el.lat.toFixed(5),
            lon: el.lon.toFixed(5)
          }
        }));
        cctvCount++;
      } else {
        let symbol, typeName;
        if (tags.amenity === "police") {
          symbol = policeSymbol;
          typeName = "police";
        } else if (tags.amenity === "fire_station") {
          symbol = fireStationSymbol;
          typeName = "fire_station";
        } else if (tags.amenity === "hospital") {
          symbol = hospitalSymbol;
          typeName = "hospital";
        } else {
          symbol = telecomSymbol;
          typeName = "telecom";
        }

        urbanPOILayer.add(new Graphic({
          geometry: point,
          symbol: symbol,
          attributes: {
            type: typeName,
            name: tags.name || typeName.replace("_", " ").toUpperCase(),
            operator: tags.operator || "",
            lat: el.lat.toFixed(5),
            lon: el.lon.toFixed(5)
          }
        }));
        poiCount++;
      }
    }

    console.log(`[WorldView] City data: ${cctvCount} CCTV, ${poiCount} urban POIs`);
    document.getElementById("hud-cctv-count").textContent = `CCTV: ${cctvCount}`;
    document.getElementById("hud-poi-count").textContent = `URBAN POI: ${poiCount}`;
    logStatus(`Loaded ${cctvCount} CCTV cameras + ${poiCount} urban POIs`);
  } catch (e) {
    console.warn("[WorldView] City data load failed:", e.message);
    document.getElementById("hud-cctv-count").textContent = "CCTV: --";
    document.getElementById("hud-poi-count").textContent = "URBAN POI: --";
  }
}

// Search bar logic
function initSearchBar() {
  const input = document.getElementById("search-input");
  const results = document.getElementById("search-results");
  let debounceTimer = null;

  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const query = input.value.trim();
    if (query.length < 2) {
      results.classList.add("hidden");
      return;
    }
    debounceTimer = setTimeout(async () => {
      const places = await geocodeCity(query);
      if (places.length === 0) {
        results.innerHTML = '<div class="search-result-item">No results found</div>';
        results.classList.remove("hidden");
        return;
      }
      results.innerHTML = "";
      places.forEach((p, i) => {
        const display = p.display_name.length > 60
          ? p.display_name.substring(0, 57) + "..."
          : p.display_name;
        const type = p.type || p.class || "";
        const lat = parseFloat(p.lat);
        const lon = parseFloat(p.lon);
        const name = p.display_name.split(",")[0];

        const div = document.createElement("div");
        div.className = "search-result-item";
        div.dataset.lat = lat;
        div.dataset.lon = lon;
        div.dataset.name = name;
        div.innerHTML = `<span class="search-result-name">${display}</span>
          <span class="search-result-type">${type}</span>`;

        // Attach click handler directly to each item
        function selectCity(e) {
          e.stopPropagation();
          e.preventDefault();
          console.log(`[WorldView] Search selected: ${name} (${lat}, ${lon})`);
          input.value = name;
          results.classList.add("hidden");
          flyToCity(lat, lon, name);
        }

        div.addEventListener("mousedown", selectCity);
        div.addEventListener("click", selectCity);
        results.appendChild(div);
      });
      results.classList.remove("hidden");
    }, 400);
  });

  // Stop pointer events on search results from reaching SceneView
  for (const evt of ["mousedown", "pointerdown", "click", "touchstart"]) {
    results.addEventListener(evt, (e) => e.stopPropagation());
  }

  // Enter key — fly to first result
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const first = results.querySelector(".search-result-item[data-lat]");
      if (first) {
        const lat = parseFloat(first.dataset.lat);
        const lon = parseFloat(first.dataset.lon);
        const name = first.dataset.name;
        input.value = name;
        results.classList.add("hidden");
        flyToCity(lat, lon, name);
      }
    }
    if (e.key === "Escape") {
      results.classList.add("hidden");
      input.blur();
    }
  });

  // Close results on outside click
  document.addEventListener("mousedown", (e) => {
    if (!e.target.closest("#search-container")) {
      results.classList.add("hidden");
    }
  });

  // Return to globe button — use both click and mousedown for reliability
  const globeBtn = document.getElementById("btn-return-globe");
  if (globeBtn) {
    globeBtn.addEventListener("click", (e) => { e.stopPropagation(); returnToGlobe(); });
    globeBtn.addEventListener("mousedown", (e) => { e.stopPropagation(); });
  }
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
  symbolLayers: [new LineSymbol3DLayer({ material: { color: [0, 255, 65, 0.3] }, size: 1 })]
});

const orbitSymbolSelected = new LineSymbol3D({
  symbolLayers: [new LineSymbol3DLayer({ material: { color: [255, 176, 0, 0.6] }, size: 2 })]
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

function quakeSymbol(mag) {
  const size = Math.max(4, Math.min(20, mag * 3));
  const alpha = Math.min(1, 0.4 + mag * 0.1);
  return new PointSymbol3D({
    symbolLayers: [new IconSymbol3DLayer({
      resource: { primitive: "circle" },
      size: size,
      material: { color: [255, 51, 51, alpha] },
      outline: { color: [255, 51, 51, 0.3], size: 1 }
    })]
  });
}

function nasaEventSymbol(category) {
  const colors = {
    "Wildfires": [255, 102, 0, 0.9],
    "Volcanoes": [255, 0, 0, 0.9],
    "Severe Storms": [128, 128, 255, 0.9],
    "Sea and Lake Ice": [200, 230, 255, 0.9],
    "Floods": [0, 100, 255, 0.9],
    "Landslides": [139, 90, 43, 0.9],
    "default": [255, 165, 0, 0.9]
  };
  const color = colors[category] || colors["default"];
  return new PointSymbol3D({
    symbolLayers: [new IconSymbol3DLayer({
      resource: { primitive: "square" },
      size: 8,
      material: { color },
      outline: { color: [color[0], color[1], color[2], 0.4], size: 1.5 }
    })]
  });
}

// =====================================================
// SATELLITE PROPAGATION
// =====================================================

const satData = [];
let selectedFeature = null;

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
      latitude: lat, longitude: lon,
      altitude: geo.height * 1000,
      velocity: Math.sqrt(posVel.velocity.x ** 2 + posVel.velocity.y ** 2 + posVel.velocity.z ** 2)
    };
  } catch { return null; }
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

function splitOrbitAtAntimeridian(path) {
  const segments = [[]];
  for (let i = 0; i < path.length; i++) {
    segments[segments.length - 1].push(path[i]);
    if (i < path.length - 1 && Math.abs(path[i + 1].longitude - path[i].longitude) > 180) {
      segments.push([]);
    }
  }
  return segments.filter(s => s.length > 1);
}

// =====================================================
// FALLBACK TLEs
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
// DATA LOADERS
// =====================================================

async function fetchTLEs(url) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return parseTLEs(await resp.text());
  } catch (e) {
    console.warn(`[WorldView] TLE fetch failed: ${url}`, e.message);
    return [];
  }
}

async function loadSatellites() {
  if (!satelliteJs) return;
  setLoadingText("Fetching satellite TLE data...");

  const [stations, visual, science] = await Promise.all([
    fetchTLEs(CONFIG.TLE_STATIONS_URL),
    fetchTLEs(CONFIG.TLE_VISUAL_URL),
    fetchTLEs(CONFIG.TLE_SCIENCE_URL),
  ]);

  const seen = new Set();
  let allTles = [];
  for (const tle of [...stations, ...visual, ...science]) {
    const noradId = tle.tle2.substring(2, 7).trim();
    if (!seen.has(noradId)) { seen.add(noradId); allTles.push(tle); }
  }

  if (allTles.length === 0) {
    allTles = FALLBACK_TLES;
    logStatus("Using fallback satellite data");
  }

  const tles = allTles.slice(0, CONFIG.MAX_SATELLITES);
  satData.length = 0;
  const now = new Date();

  for (const tle of tles) {
    try {
      const satrec = satelliteJs.twoline2satrec(tle.tle1, tle.tle2);
      if (!propagateSatellite(satrec, now)) continue;
      const noradId = tle.tle2.substring(2, 7).trim();
      satData.push({ name: tle.name, satrec, noradId });
    } catch { /* skip */ }
  }

  console.log(`[WorldView] ${satData.length} satellites initialized`);
  updateSatellites();
}

function updateSatellites() {
  if (!satelliteJs || satData.length === 0) return;
  const now = new Date();
  const satGraphics = [], orbitGraphics = [], fpGraphics = [];
  let count = 0;

  for (const sat of satData) {
    const pos = propagateSatellite(sat.satrec, now);
    if (!pos) continue;
    sat.currentPos = pos;
    count++;

    const isSel = selectedFeature?.type === "satellite" && selectedFeature.id === sat.noradId;

    satGraphics.push(new Graphic({
      geometry: new Point({ longitude: pos.longitude, latitude: pos.latitude, z: pos.altitude }),
      symbol: isSel ? satSymbolSelected : satSymbol,
      attributes: { type: "satellite", name: sat.name, noradId: sat.noradId,
        lat: pos.latitude.toFixed(4), lon: pos.longitude.toFixed(4),
        alt: (pos.altitude / 1000).toFixed(1), vel: pos.velocity.toFixed(2) }
    }));

    if (isSel || satData.length <= 30) {
      const orbitPath = computeOrbitPath(sat.satrec, now, 90, CONFIG.ORBIT_POINTS);
      if (orbitPath.length > 1) {
        for (const seg of splitOrbitAtAntimeridian(orbitPath)) {
          orbitGraphics.push(new Graphic({
            geometry: new Polyline({ paths: [seg.map(p => [p.longitude, p.latitude, p.altitude])] }),
            symbol: isSel ? orbitSymbolSelected : orbitSymbol
          }));
        }
      }
    }

    const altKm = pos.altitude / 1000;
    if (altKm > 100 && altKm < 50000) {
      fpGraphics.push(new Graphic({
        geometry: new Polygon({ rings: [computeFootprint(pos.latitude, pos.longitude, altKm, CONFIG.FOOTPRINT_SEGMENTS)] }),
        symbol: isSel ? footprintSymbolSelected : footprintSymbol
      }));
    }
  }

  satelliteLayer.removeAll(); satelliteLayer.addMany(satGraphics);
  orbitLayer.removeAll(); orbitLayer.addMany(orbitGraphics);
  footprintLayer.removeAll(); footprintLayer.addMany(fpGraphics);
  document.getElementById("hud-sat-count").textContent = `SATELLITES: ${count}`;
}

// --- Aircraft ---

async function loadAircraft() {
  try {
    const resp = await fetch(CONFIG.OPENSKY_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const states = (data.states || []).slice(0, CONFIG.MAX_AIRCRAFT);
    const graphics = [];

    for (const s of states) {
      const lon = s[5], lat = s[6], alt = s[7] || s[13], onGround = s[8];
      if (lon == null || lat == null || onGround) continue;
      graphics.push(new Graphic({
        geometry: new Point({ longitude: lon, latitude: lat, z: alt || 10000 }),
        symbol: aircraftSymbol,
        attributes: { type: "aircraft", callsign: (s[1] || "").trim() || "N/A",
          altitude: alt ? `${Math.round(alt)}m` : "N/A",
          velocity: s[9] ? `${Math.round(s[9])}m/s` : "N/A",
          heading: s[10] != null ? `${Math.round(s[10])}°` : "N/A",
          origin: s[2] || "N/A" }
      }));
    }

    aircraftLayer.removeAll(); aircraftLayer.addMany(graphics);
    document.getElementById("hud-aircraft-count").textContent = `AIRCRAFT: ${graphics.length}`;
  } catch (e) {
    console.warn("[WorldView] Aircraft API failed:", e.message);
    loadSimulatedAircraft();
  }
}

function loadSimulatedAircraft() {
  const corridors = [
    { latRange: [40, 55], lonRange: [-60, -10], count: 40, altRange: [9000, 12000] },
    { latRange: [25, 50], lonRange: [-125, -70], count: 60, altRange: [8000, 12000] },
    { latRange: [35, 60], lonRange: [-10, 35], count: 50, altRange: [8000, 12000] },
    { latRange: [10, 45], lonRange: [70, 140], count: 50, altRange: [9000, 12000] },
    { latRange: [15, 40], lonRange: [30, 60], count: 25, altRange: [9000, 11000] },
    { latRange: [-35, 5], lonRange: [-75, -35], count: 20, altRange: [8000, 11000] },
    { latRange: [15, 45], lonRange: [140, 180], count: 15, altRange: [10000, 12000] },
    { latRange: [-20, 20], lonRange: [10, 45], count: 15, altRange: [9000, 11000] },
    { latRange: [-40, -15], lonRange: [115, 155], count: 15, altRange: [9000, 11000] },
  ];
  const prefixes = ["UAL","DAL","AAL","SWA","BAW","DLH","AFR","KLM","SIA","QFA","ANA","JAL","CCA","CSN","ETH","UAE","QTR","THY"];
  const graphics = [];

  for (const c of corridors) {
    for (let i = 0; i < c.count; i++) {
      const lat = c.latRange[0] + Math.random() * (c.latRange[1] - c.latRange[0]);
      const lon = c.lonRange[0] + Math.random() * (c.lonRange[1] - c.lonRange[0]);
      const alt = c.altRange[0] + Math.random() * (c.altRange[1] - c.altRange[0]);
      graphics.push(new Graphic({
        geometry: new Point({ longitude: lon, latitude: lat, z: alt }),
        symbol: aircraftSymbol,
        attributes: { type: "aircraft",
          callsign: `${prefixes[Math.floor(Math.random() * prefixes.length)]}${100 + Math.floor(Math.random() * 900)}`,
          altitude: `${Math.round(alt)}m`, velocity: `${220 + Math.floor(Math.random() * 60)}m/s`,
          heading: `${Math.floor(Math.random() * 360)}°`, origin: "SIM" }
      }));
    }
  }

  aircraftLayer.removeAll(); aircraftLayer.addMany(graphics);
  document.getElementById("hud-aircraft-count").textContent = `AIRCRAFT: ${graphics.length} (SIM)`;
}

// --- Earthquakes ---

async function loadEarthquakes() {
  try {
    const resp = await fetch(CONFIG.USGS_QUAKE_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const graphics = [];

    for (const f of data.features) {
      const [lon, lat, depth] = f.geometry.coordinates;
      const mag = f.properties.mag;
      const place = f.properties.place || "Unknown";
      const time = new Date(f.properties.time).toISOString().replace("T", " ").substring(0, 19);

      if (lon == null || lat == null || mag == null) continue;

      graphics.push(new Graphic({
        geometry: new Point({ longitude: lon, latitude: lat }),
        symbol: quakeSymbol(mag),
        attributes: { type: "earthquake", name: place, magnitude: mag.toFixed(1),
          depth: `${(depth || 0).toFixed(1)} km`, time, lat: lat.toFixed(4), lon: lon.toFixed(4) }
      }));
    }

    earthquakeLayer.removeAll(); earthquakeLayer.addMany(graphics);
    document.getElementById("hud-quake-count").textContent = `EARTHQUAKES: ${graphics.length}`;
    console.log(`[WorldView] ${graphics.length} earthquakes loaded`);
  } catch (e) {
    console.warn("[WorldView] Earthquake fetch failed:", e.message);
    document.getElementById("hud-quake-count").textContent = "EARTHQUAKES: OFFLINE";
  }
}

// --- NASA EONET Events ---

async function loadNasaEvents() {
  try {
    const resp = await fetch(CONFIG.NASA_EONET_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const graphics = [];

    for (const event of data.events) {
      const cat = event.categories?.[0]?.title || "Unknown";
      const geom = event.geometry?.[0];
      if (!geom || geom.type !== "Point") continue;

      const [lon, lat] = geom.coordinates;
      const date = geom.date ? new Date(geom.date).toISOString().replace("T", " ").substring(0, 19) : "N/A";
      const magVal = geom.magnitudeValue;
      const magUnit = geom.magnitudeUnit;

      graphics.push(new Graphic({
        geometry: new Point({ longitude: lon, latitude: lat }),
        symbol: nasaEventSymbol(cat),
        attributes: { type: "nasa_event", name: event.title, category: cat,
          date, magnitude: magVal ? `${magVal} ${magUnit || ""}` : "N/A",
          lat: lat.toFixed(4), lon: lon.toFixed(4) }
      }));
    }

    nasaEventLayer.removeAll(); nasaEventLayer.addMany(graphics);
    document.getElementById("hud-event-count").textContent = `NASA EVENTS: ${graphics.length}`;
    console.log(`[WorldView] ${graphics.length} NASA events loaded`);
  } catch (e) {
    console.warn("[WorldView] NASA EONET fetch failed:", e.message);
    document.getElementById("hud-event-count").textContent = "NASA EVENTS: OFFLINE";
  }
}

// --- ArcGIS FeatureLayer counts ---

async function updateFeatureLayerCounts() {
  try {
    const cableView = await cableLayer.queryFeatureCount();
    document.getElementById("hud-cable-count").textContent = `SUB CABLES: ${cableView}`;
  } catch {
    document.getElementById("hud-cable-count").textContent = "SUB CABLES: OFFLINE";
  }
  try {
    const baseView = await militaryLayer.queryFeatureCount();
    document.getElementById("hud-base-count").textContent = `MIL BASES: ${baseView}`;
  } catch {
    document.getElementById("hud-base-count").textContent = "MIL BASES: OFFLINE";
  }
}

// =====================================================
// HUD
// =====================================================

function updateHUD() {
  const now = new Date();
  document.getElementById("hud-clock").textContent =
    now.toISOString().replace("T", " ").substring(0, 19) + " UTC";

  if (view.camera) {
    const cam = view.camera;
    document.getElementById("hud-lat").textContent = `LAT: ${cam.position.latitude.toFixed(4)}`;
    document.getElementById("hud-lon").textContent = `LON: ${cam.position.longitude.toFixed(4)}`;
    document.getElementById("hud-alt").textContent = `ALT: ${formatAlt(cam.position.z)}`;
    document.getElementById("hud-heading").textContent = `HDG: ${cam.heading.toFixed(1)}°`;
    document.getElementById("hud-tilt").textContent = `TILT: ${cam.tilt.toFixed(1)}°`;
    watchCameraAltitude();
  }
}

function formatAlt(m) {
  if (m > 1e6) return `${(m / 1e6).toFixed(1)}M km`;
  if (m > 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

function logStatus(msg) {
  const el = document.getElementById("hud-status");
  if (el) el.textContent = msg;
}

function setLoadingText(msg) {
  const el = document.getElementById("loading-text");
  if (el) el.textContent = msg;
}

function setLoadingProgress(pct) {
  const el = document.getElementById("loading-bar");
  if (el) el.style.width = `${pct}%`;
}

// =====================================================
// FEATURE DETAIL PANEL
// =====================================================

function showFeatureDetail(attrs) {
  const panel = document.getElementById("feature-detail");
  const body = document.getElementById("feature-detail-body");
  const label = document.getElementById("feature-detail-label");
  panel.classList.remove("hidden");

  const typeLabels = {
    satellite: "SATELLITE TELEMETRY",
    aircraft: "AIRCRAFT TRACKING",
    earthquake: "SEISMIC EVENT",
    nasa_event: "NATURAL EVENT",
    military: "MILITARY INSTALLATION",
    cable: "SUBMARINE CABLE"
  };

  label.textContent = typeLabels[attrs.type] || "TARGET INFO";

  let html = `<div class="detail-name">${attrs.name || attrs.featureName || attrs.Name || "UNKNOWN"}</div>`;

  if (attrs.type === "satellite") {
    html += detailRow("NORAD", attrs.noradId);
    html += detailRow("LAT", `${attrs.lat}°`);
    html += detailRow("LON", `${attrs.lon}°`);
    html += detailRow("ALT", `${attrs.alt} km`);
    html += detailRow("VEL", `${attrs.vel} km/s`);
  } else if (attrs.type === "aircraft") {
    html += detailRow("CALLSIGN", attrs.callsign);
    html += detailRow("ALT", attrs.altitude);
    html += detailRow("SPEED", attrs.velocity);
    html += detailRow("HDG", attrs.heading);
    html += detailRow("ORIGIN", attrs.origin);
  } else if (attrs.type === "earthquake") {
    html += detailRow("MAG", `M${attrs.magnitude}`);
    html += detailRow("DEPTH", attrs.depth);
    html += detailRow("TIME", attrs.time);
    html += detailRow("LAT", `${attrs.lat}°`);
    html += detailRow("LON", `${attrs.lon}°`);
  } else if (attrs.type === "nasa_event") {
    html += detailRow("CATEGORY", attrs.category);
    html += detailRow("DATE", attrs.date);
    html += detailRow("MAGNITUDE", attrs.magnitude);
    html += detailRow("LAT", `${attrs.lat}°`);
    html += detailRow("LON", `${attrs.lon}°`);
  } else if (attrs.type === "cctv") {
    html += detailRow("OPERATOR", attrs.operator);
    html += detailRow("CAMERA TYPE", attrs.camera_type);
    html += detailRow("ZONE", attrs.mount);
    html += detailRow("LAT", `${attrs.lat}°`);
    html += detailRow("LON", `${attrs.lon}°`);
  } else if (["police", "fire_station", "hospital", "telecom"].includes(attrs.type)) {
    if (attrs.operator) html += detailRow("OPERATOR", attrs.operator);
    html += detailRow("LAT", `${attrs.lat}°`);
    html += detailRow("LON", `${attrs.lon}°`);
  } else {
    // Generic — show all attributes
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "type" || k === "OBJECTID" || k === "FID" || v === "na" || v == null) continue;
      html += detailRow(k.toUpperCase().replace(/_/g, " "), v);
    }
  }

  body.innerHTML = html;
}

function detailRow(label, value) {
  return `<div class="detail-row"><strong>${label}:</strong> ${value}</div>`;
}

function hideFeatureDetail() {
  document.getElementById("feature-detail").classList.add("hidden");
  selectedFeature = null;
}

// =====================================================
// EVENT HANDLERS
// =====================================================

// Render modes
document.querySelectorAll("[data-mode]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-mode]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.body.className = btn.dataset.mode === "normal" ? "" : `mode-${btn.dataset.mode}`;
  });
});

// Layer toggles
const layerMap = {
  "toggle-satellites": satelliteLayer,
  "toggle-orbits": orbitLayer,
  "toggle-footprints": footprintLayer,
  "toggle-aircraft": aircraftLayer,
  "toggle-earthquakes": earthquakeLayer,
  "toggle-events": nasaEventLayer,
  "toggle-cables": [cableLayer, cableTerminalLayer],
  "toggle-bases": militaryLayer,
  "toggle-cctv": cctvLayer,
  "toggle-urban": urbanPOILayer,
};

for (const [id, layers] of Object.entries(layerMap)) {
  document.getElementById(id)?.addEventListener("change", e => {
    if (Array.isArray(layers)) {
      layers.forEach(l => l.visible = e.target.checked);
    } else {
      layers.visible = e.target.checked;
    }
  });
}

// Go-to
const goToTargets = {
  globe: { position: { longitude: -10, latitude: 20, z: 25000000 }, heading: 0, tilt: 0 },
  usa: { position: { longitude: -98, latitude: 38, z: 5000000 }, heading: 0, tilt: 20 },
  europe: { position: { longitude: 10, latitude: 48, z: 5000000 }, heading: 0, tilt: 20 },
  asia: { position: { longitude: 105, latitude: 30, z: 6000000 }, heading: 0, tilt: 20 },
  mideast: { position: { longitude: 45, latitude: 28, z: 4000000 }, heading: 0, tilt: 25 },
  pacific: { position: { longitude: 170, latitude: 10, z: 8000000 }, heading: 0, tilt: 10 },
};

document.querySelectorAll(".goto-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = goToTargets[btn.dataset.target];
    if (target) view.goTo(target, { duration: 2000, easing: "ease-in-out" });
  });
});

// Click to select features
view.on("click", async (event) => {
  const resp = await view.hitTest(event);

  // Check GraphicsLayers first (satellites, aircraft, earthquakes, nasa events)
  for (const r of resp.results) {
    if (!r.graphic?.attributes) continue;
    const attrs = r.graphic.attributes;

    if (r.graphic.layer === satelliteLayer) {
      selectedFeature = { type: "satellite", id: attrs.noradId };
      showFeatureDetail(attrs);
      updateSatellites();
      return;
    }
    if (r.graphic.layer === aircraftLayer) {
      showFeatureDetail(attrs);
      return;
    }
    if (r.graphic.layer === earthquakeLayer) {
      showFeatureDetail(attrs);
      return;
    }
    if (r.graphic.layer === nasaEventLayer) {
      showFeatureDetail(attrs);
      return;
    }
    if (r.graphic.layer === cctvLayer) {
      showFeatureDetail(attrs);
      return;
    }
    if (r.graphic.layer === urbanPOILayer) {
      showFeatureDetail(attrs);
      return;
    }
  }

  // Check FeatureLayers (military, cables)
  for (const r of resp.results) {
    if (!r.graphic?.attributes) continue;
    const attrs = r.graphic.attributes;

    if (r.graphic.layer === militaryLayer) {
      showFeatureDetail({ ...attrs, type: "military", name: attrs.featureName });
      return;
    }
    if (r.graphic.layer === cableLayer || r.graphic.layer === cableTerminalLayer) {
      showFeatureDetail({ ...attrs, type: "cable", name: attrs.Name || attrs.name });
      return;
    }
  }

  // Nothing hit — deselect
  if (selectedFeature) {
    selectedFeature = null;
    updateSatellites();
  }
  hideFeatureDetail();
});

// Dismiss detail
document.getElementById("feature-detail-close").addEventListener("click", () => {
  if (selectedFeature?.type === "satellite") {
    selectedFeature = null;
    updateSatellites();
  }
  hideFeatureDetail();
});

// =====================================================
// INTRO MODAL
// =====================================================

document.getElementById("intro-launch").addEventListener("click", () => {
  const modal = document.getElementById("intro-modal");
  modal.classList.add("closing");
  setTimeout(() => {
    modal.style.display = "none";
    document.getElementById("hud-overlay").classList.remove("hidden");
  }, 600);
});

// =====================================================
// INITIALIZATION
// =====================================================

async function init() {
  console.log("[WorldView] Initializing...");

  // Start HUD clock and search bar
  setInterval(updateHUD, 250);
  updateHUD();
  initSearchBar();

  // Wait for view, but don't block data loading forever
  const viewReady = view.when().then(() => {
    console.log("[WorldView] SceneView ready");
  }).catch(e => {
    console.warn("[WorldView] SceneView init issue:", e.message);
  });

  // Load all data feeds in parallel (don't wait for view)
  setLoadingProgress(5);
  setLoadingText("Loading satellite data...");
  const satPromise = loadSatellites().then(() => { setLoadingProgress(25); });

  setLoadingText("Loading all data feeds...");
  const [, , , ,] = await Promise.allSettled([
    satPromise,
    loadAircraft().then(() => { setLoadingProgress(45); }),
    loadEarthquakes().then(() => { setLoadingProgress(60); }),
    loadNasaEvents().then(() => { setLoadingProgress(75); }),
  ]);

  setLoadingText("Loading infrastructure layers...");
  await updateFeatureLayerCounts();
  setLoadingProgress(90);

  // Wait for view to be ready (with timeout)
  await Promise.race([viewReady, new Promise(r => setTimeout(r, 10000))]);
  setLoadingProgress(100);

  // Hide loading overlay
  setTimeout(() => {
    const loadEl = document.getElementById("loading-overlay");
    if (loadEl) loadEl.classList.add("done");
  }, 500);

  // Set up periodic refreshes
  setInterval(updateSatellites, CONFIG.SAT_UPDATE_INTERVAL);
  setInterval(loadAircraft, CONFIG.AIRCRAFT_UPDATE_INTERVAL);
  setInterval(loadEarthquakes, CONFIG.QUAKE_UPDATE_INTERVAL);

  logStatus("All systems operational");
  console.log("[WorldView] All systems operational");
}

init();
