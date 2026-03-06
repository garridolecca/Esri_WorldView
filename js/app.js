// =====================================================
// ESRI WORLDVIEW — Main Application
// ArcGIS Maps SDK for JavaScript 5.0
// =====================================================


const [
  Map, SceneView, GraphicsLayer, FeatureLayer, SceneLayer, Graphic,
  Point, Polyline, Polygon,
  PointSymbol3D, IconSymbol3DLayer, ObjectSymbol3DLayer,
  LineSymbol3D, LineSymbol3DLayer, PathSymbol3DLayer,
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
  "@arcgis/core/symbols/ObjectSymbol3DLayer.js",
  "@arcgis/core/symbols/LineSymbol3D.js",
  "@arcgis/core/symbols/LineSymbol3DLayer.js",
  "@arcgis/core/symbols/PathSymbol3DLayer.js",
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
  TLE_STARLINK_URL: "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle",
  OPENSKY_URL: "https://opensky-network.org/api/states/all",
  USGS_QUAKE_URL: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",
  NASA_EONET_URL: "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=150",
  CABLES_URL: "https://services.arcgis.com/nzS0F0zdNLvs7nc8/arcgis/rest/services/Submarine_Cables/FeatureServer",
  MILITARY_URL: "https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/MIRTA_Points_A_view/FeatureServer/0",
  SAT_UPDATE_INTERVAL: 2000,
  AIRCRAFT_UPDATE_INTERVAL: 15000,
  QUAKE_UPDATE_INTERVAL: 60000,
  MAX_SATELLITES: 250,
  MAX_STARLINK: 800,
  MAX_AIRCRAFT: 600,
  ORBIT_POINTS: 180,
  FOOTPRINT_SEGMENTS: 36,
};

// =====================================================
// LAYERS
// =====================================================

const satelliteLayer = new GraphicsLayer({ title: "Satellites", elevationInfo: { mode: "absolute-height" } });
const orbitLayer = new GraphicsLayer({ title: "Orbits", elevationInfo: { mode: "absolute-height" } });
const footprintLayer = new GraphicsLayer({ title: "Footprints", visible: false });
const starlinkLayer = new GraphicsLayer({ title: "Starlink", elevationInfo: { mode: "absolute-height" } });
const starlinkOrbitLayer = new GraphicsLayer({ title: "Starlink Orbits", elevationInfo: { mode: "absolute-height" } });
const aircraftLayer = new GraphicsLayer({ title: "Aircraft", elevationInfo: { mode: "absolute-height" }, visible: false });
const earthquakeLayer = new GraphicsLayer({ title: "Earthquakes", visible: false });
const nasaEventLayer = new GraphicsLayer({ title: "NASA Events", visible: false });
const cctvLayer = new GraphicsLayer({ title: "CCTV Cameras" });
const urbanPOILayer = new GraphicsLayer({ title: "Urban POIs" });
const viewshedLayer = new GraphicsLayer({ title: "Camera Viewshed" });

// ArcGIS FeatureLayers for submarine cables and military bases
const cableLayer = new FeatureLayer({
  url: CONFIG.CABLES_URL + "/2",
  title: "Submarine Cables",
  renderer: new SimpleRenderer({
    symbol: new SimpleLineSymbol({
      color: [0, 220, 255, 0.5],
      width: 1.5,
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
    symbol: new PointSymbol3D({
      symbolLayers: [new ObjectSymbol3DLayer({
        resource: { primitive: "cylinder" },
        material: { color: [0, 220, 255, 0.9] },
        emissive: { source: "color", strength: 1.0 },
        width: 12000,
        height: 25000,
        depth: 12000
      })]
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
      symbolLayers: [new ObjectSymbol3DLayer({
        resource: { primitive: "tetrahedron" },
        material: { color: [255, 60, 200, 0.9] },
        emissive: { source: "color", strength: 1.2 },
        width: 25000,
        height: 35000,
        depth: 25000
      })]
    })
  }),
  popupEnabled: false,
  visible: false
});

// =====================================================
// MAP & VIEW
// =====================================================

const map = new Map({
  basemap: "satellite",
  ground: "world-elevation",
  layers: [
    cableLayer, cableTerminalLayer,
    footprintLayer, orbitLayer, starlinkOrbitLayer,
    earthquakeLayer, nasaEventLayer,
    militaryLayer,
    cctvLayer, viewshedLayer, urbanPOILayer,
    satelliteLayer, starlinkLayer, aircraftLayer
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
    lighting: {
      type: "virtual",
      glow: { intensity: 0.6 }
    }
  },
  highlightOptions: {
    haloColor: [0, 255, 200, 1],
    haloOpacity: 0.9,
    color: [0, 255, 200, 0.3]
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
  visible: false,
  renderer: new SimpleRenderer({
    symbol: {
      type: "mesh-3d",
      symbolLayers: [{
        type: "fill",
        material: { color: [45, 50, 58, 0.9] },
        edges: {
          type: "solid",
          color: [70, 78, 90, 0.5],
          size: 0.5
        }
      }]
    }
  })
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

// Store layer visibility state before entering city view
let savedLayerVisibility = {};

function hideGlobalLayers() {
  const globalLayers = {
    satelliteLayer, orbitLayer, footprintLayer, starlinkLayer, starlinkOrbitLayer,
    aircraftLayer, earthquakeLayer, nasaEventLayer, cableLayer, cableTerminalLayer,
    militaryLayer, urbanPOILayer
  };
  savedLayerVisibility = {};
  for (const [name, layer] of Object.entries(globalLayers)) {
    savedLayerVisibility[name] = layer.visible;
    layer.visible = false;
  }
}

function restoreGlobalLayers() {
  const globalLayers = {
    satelliteLayer, orbitLayer, footprintLayer, starlinkLayer, starlinkOrbitLayer,
    aircraftLayer, earthquakeLayer, nasaEventLayer, cableLayer, cableTerminalLayer,
    militaryLayer, urbanPOILayer
  };
  for (const [name, layer] of Object.entries(globalLayers)) {
    layer.visible = savedLayerVisibility[name] ?? true;
  }
}

function flyToCity(lat, lon, name) {
  logStatus(`Flying to ${name}...`);
  console.log(`[WorldView] flyToCity: ${name} (${lat}, ${lon})`);

  // Hide all global layers, show only CCTV + 3D buildings
  hideGlobalLayers();
  hideCctvPopup();
  map.basemap = CITY_BASEMAP;
  buildingsLayer.visible = true;
  cctvLayer.visible = true;
  isCityView = true;
  updateCityViewIndicator();

  const cityCamera = {
    position: { longitude: lon, latitude: lat, z: CITY_VIEW_ALT },
    heading: 30,
    tilt: CITY_VIEW_TILT
  };

  // Set camera immediately as a guarantee, then try animated goTo on top
  try { view.camera = cityCamera; } catch (e) { /* ignore */ }

  view.goTo(cityCamera, { duration: 2500, easing: "ease-in-out" }).then(() => {
    console.log("[WorldView] flyToCity goTo animation completed");
  }).catch((e) => {
    console.warn("[WorldView] flyToCity goTo issue:", e.message);
  });

  logStatus(`Viewing ${name} — Loading city data...`);
  loadCityData(lat, lon);
}

function returnToGlobe() {
  logStatus("Returning to globe...");
  console.log("[WorldView] returnToGlobe");

  map.basemap = GLOBE_BASEMAP;
  buildingsLayer.visible = false;
  cctvLayer.removeAll();
  urbanPOILayer.removeAll();
  cctvLayer.visible = false;
  urbanPOILayer.visible = false;
  restoreGlobalLayers();
  isCityView = false;
  updateCityViewIndicator();
  hideCctvPopup();
  document.getElementById("hud-cctv-count").textContent = "CCTV: --";

  const globeCamera = {
    position: { longitude: -10, latitude: 20, z: 25000000 },
    heading: 0,
    tilt: 0
  };

  // Set camera immediately, then animate
  try { view.camera = globeCamera; } catch (e) { /* ignore */ }

  view.goTo(globeCamera, { duration: 2000, easing: "ease-in-out" }).then(() => {
    console.log("[WorldView] returnToGlobe goTo completed");
  }).catch((e) => {
    console.warn("[WorldView] returnToGlobe goTo issue:", e.message);
  });

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
      restoreGlobalLayers();
      isCityView = false;
      updateCityViewIndicator();
      hideCctvPopup();
      document.getElementById("hud-cctv-count").textContent = "CCTV: --";
        }
  }, 300);
}

// =====================================================
// CITY-LEVEL DATA: LIVE TRAFFIC CAMERAS (DOT APIs)
// =====================================================

// Live feed camera — bright green diamond with glow
const cctvSymbolLive = new PointSymbol3D({
  symbolLayers: [new IconSymbol3DLayer({
    resource: { primitive: "kite" },
    size: 16,
    material: { color: [0, 255, 100, 1] },
    outline: { color: [0, 255, 100, 0.8], size: 3 }
  })]
});

// Location-only camera — dim gray-red small dot
const cctvSymbolOffline = new PointSymbol3D({
  symbolLayers: [new IconSymbol3DLayer({
    resource: { primitive: "circle" },
    size: 5,
    material: { color: [180, 60, 60, 0.4] },
    outline: { color: [180, 60, 60, 0.15], size: 1 }
  })]
});


// Caltrans districts: { id: [lat, lon, radiusKm] }
const CALTRANS_DISTRICTS = {
  3: [38.58, -121.49, 150], 4: [37.77, -122.42, 100],
  5: [34.95, -120.43, 150], 6: [36.75, -119.77, 150],
  7: [34.05, -118.24, 100], 8: [33.95, -117.40, 100],
  10: [37.95, -121.29, 100], 11: [32.72, -117.16, 80],
  12: [33.75, -117.87, 60],
};

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findCaltransDistrict(lat, lon) {
  if (lon < -124 || lon > -114 || lat < 32 || lat > 42) return null;
  let best = null, bestDist = Infinity;
  for (const [d, [dlat, dlon, radius]] of Object.entries(CALTRANS_DISTRICTS)) {
    const dist = haversineKm(lat, lon, dlat, dlon);
    if (dist < radius && dist < bestDist) { best = d; bestDist = dist; }
  }
  return best;
}

async function loadCaltransCameras(lat, lon, district) {
  const url = `https://cwwp2.dot.ca.gov/data/d${district}/cctv/cctvStatusD${district.toString().padStart(2, "0")}.json`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const cams = json.data || json;
    const nearby = [];
    for (const item of cams) {
      const c = item.cctv || item;
      const loc = c.location || {};
      const clat = parseFloat(loc.latitude), clon = parseFloat(loc.longitude);
      if (!clat || !clon || c.inService !== "true") continue;
      const dist = haversineKm(lat, lon, clat, clon);
      if (dist > 30) continue;
      const img = c.imageData || {};
      nearby.push({
        name: loc.locationName || "DOT Camera",
        lat: clat, lon: clon,
        imageUrl: img?.static?.currentImageURL || "",
        streamUrl: img?.streamingVideoURL || "",
        direction: loc.direction || "", route: loc.route || "",
        operator: "Caltrans", dist
      });
    }
    return nearby.sort((a, b) => a.dist - b.dist);
  } catch (e) {
    console.warn(`[WorldView] Caltrans D${district} failed:`, e.message);
    return [];
  }
}

// Additional Caltrans districts for wider California coverage
async function loadAllCaltransCameras(lat, lon) {
  // Try all districts in parallel, merge results
  const districts = Object.keys(CALTRANS_DISTRICTS);
  const promises = districts.map(d => loadCaltransCameras(lat, lon, d));
  const results = await Promise.allSettled(promises);
  const all = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }
  return all.sort((a, b) => a.dist - b.dist);
}

async function loadOverpassCameras(lat, lon) {
  const query = `[out:json][timeout:15];node["man_made"="surveillance"](around:5000,${lat},${lon});out body;`;
  try {
    const resp = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(query)
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return data.elements.map(el => {
      const tags = el.tags || {};
      return {
        name: tags.description || tags.name || "CCTV Camera",
        lat: el.lat, lon: el.lon,
        imageUrl: tags["contact:webcam"] || tags.url || tags.website || "",
        streamUrl: "", direction: tags["surveillance:zone"] || "",
        route: "", operator: tags.operator || "OSM"
      };
    });
  } catch (e) {
    console.warn("[WorldView] Overpass failed:", e.message);
    return [];
  }
}

async function loadCityData(lat, lon) {
  cctvLayer.removeAll();
  urbanPOILayer.removeAll();
  let cameras = [];

  // Try Caltrans (California)
  const district = findCaltransDistrict(lat, lon);
  if (district) {
    cameras = await loadCaltransCameras(lat, lon, district);
    console.log(`[WorldView] Caltrans D${district}: ${cameras.length} cameras`);
  }

  // Fallback: Overpass API (worldwide OSM surveillance cameras)
  if (cameras.length === 0) {
    cameras = await loadOverpassCameras(lat, lon);
    console.log(`[WorldView] Overpass: ${cameras.length} cameras`);
  }

  for (const cam of cameras) {
    const hasLiveFeed = !!(cam.imageUrl || cam.streamUrl);
    cctvLayer.add(new Graphic({
      geometry: new Point({ longitude: cam.lon, latitude: cam.lat, z: 5 }),
      symbol: hasLiveFeed ? cctvSymbolLive : cctvSymbolOffline,
      attributes: {
        type: "cctv",
        name: cam.name,
        operator: cam.operator || "Unknown",
        camera_type: cam.direction ? `Direction: ${cam.direction}` : "Traffic Camera",
        route: cam.route || "",
        imageUrl: cam.imageUrl || "",
        streamUrl: cam.streamUrl || "",
        lat: cam.lat.toFixed(6),
        lon: cam.lon.toFixed(6)
      }
    }));
  }

  document.getElementById("hud-cctv-count").textContent = `CAMERAS: ${cameras.length}`;
  logStatus(cameras.length > 0 ? `Loaded ${cameras.length} traffic cameras` : "No traffic cameras in this area");
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
// SYMBOLS — 3D Volumetric + Emissive (ArcGIS 5.0)
// =====================================================

// --- General Satellites: Green emissive spheres ---
const satSymbol = new PointSymbol3D({
  symbolLayers: [new ObjectSymbol3DLayer({
    resource: { primitive: "sphere" },
    material: { color: [0, 255, 120, 1] },
    emissive: { source: "color", strength: 1.5 },
    width: 80000,
    height: 80000,
    depth: 80000
  })]
});

const satSymbolSelected = new PointSymbol3D({
  symbolLayers: [new ObjectSymbol3DLayer({
    resource: { primitive: "diamond" },
    material: { color: [255, 220, 50, 1] },
    emissive: { source: "color", strength: 2.5 },
    width: 150000,
    height: 150000,
    depth: 150000
  })]
});

// --- General Satellite Orbits: Glowing green 3D tubes ---
const orbitSymbol = new LineSymbol3D({
  symbolLayers: [new PathSymbol3DLayer({
    profile: "circle",
    material: { color: [0, 255, 120, 0.35] },
    emissive: { source: "color", strength: 0.8 },
    width: 8000,
    height: 8000,
    cap: "round"
  })]
});

const orbitSymbolSelected = new LineSymbol3D({
  symbolLayers: [new PathSymbol3DLayer({
    profile: "circle",
    material: { color: [255, 220, 50, 0.8] },
    emissive: { source: "color", strength: 2.0 },
    width: 15000,
    height: 15000,
    cap: "round"
  })]
});

// --- SpaceX Starlink: White-hot emissive spheres with max glow ---
const starlinkSymbol = new PointSymbol3D({
  symbolLayers: [
    new ObjectSymbol3DLayer({
      resource: { primitive: "sphere" },
      material: { color: [255, 255, 255, 1] },
      emissive: { source: "color", strength: 4.0 },
      width: 50000,
      height: 50000,
      depth: 50000
    })
  ]
});

const starlinkSymbolSelected = new PointSymbol3D({
  symbolLayers: [
    new ObjectSymbol3DLayer({
      resource: { primitive: "diamond" },
      material: { color: [255, 255, 255, 1] },
      emissive: { source: "color", strength: 6.0 },
      width: 200000,
      height: 200000,
      depth: 200000
    })
  ]
});

// --- Starlink Orbits: Dual-layer thick neon blue tube + thin white core ---
const starlinkOrbitSymbol = new LineSymbol3D({
  symbolLayers: [new PathSymbol3DLayer({
    profile: "circle",
    material: { color: [100, 180, 255, 0.25] },
    emissive: { source: "color", strength: 1.5 },
    width: 8000,
    height: 8000,
    cap: "round"
  })]
});

const starlinkOrbitSymbolSelected = new LineSymbol3D({
  symbolLayers: [
    new PathSymbol3DLayer({
      profile: "circle",
      material: { color: [60, 160, 255, 0.7] },
      emissive: { source: "color", strength: 3.0 },
      width: 25000,
      height: 25000,
      cap: "round"
    }),
    new PathSymbol3DLayer({
      profile: "circle",
      material: { color: [255, 255, 255, 0.9] },
      emissive: { source: "color", strength: 5.0 },
      width: 8000,
      height: 8000,
      cap: "round"
    })
  ]
});

// --- Coverage Footprints ---
const footprintSymbol = new PolygonSymbol3D({
  symbolLayers: [new FillSymbol3DLayer({
    material: { color: [0, 255, 180, 0.05] },
    outline: { color: [0, 255, 180, 0.25], size: 1.2 }
  })]
});

const footprintSymbolSelected = new PolygonSymbol3D({
  symbolLayers: [new FillSymbol3DLayer({
    material: { color: [255, 220, 50, 0.08] },
    outline: { color: [255, 220, 50, 0.5], size: 1.5 }
  })]
});

// --- Aircraft: Amber emissive cones (directional) ---
const aircraftSymbol = new PointSymbol3D({
  symbolLayers: [new ObjectSymbol3DLayer({
    resource: { primitive: "cone" },
    material: { color: [255, 180, 30, 1] },
    emissive: { source: "color", strength: 1.2 },
    width: 40000,
    height: 60000,
    depth: 40000,
    heading: 0,
    tilt: -90
  })]
});

// --- Earthquakes: Red emissive spheres, magnitude-scaled ---
function quakeSymbol(mag) {
  const size = Math.max(30000, Math.min(200000, mag * 30000));
  const strength = Math.min(3, 0.8 + mag * 0.3);
  return new PointSymbol3D({
    symbolLayers: [new ObjectSymbol3DLayer({
      resource: { primitive: "sphere" },
      material: { color: [255, 50, 50, 1] },
      emissive: { source: "color", strength },
      width: size,
      height: size,
      depth: size
    })]
  });
}

// --- NASA Events: Category-colored emissive tetrahedrons ---
function nasaEventSymbol(category) {
  const colors = {
    "Wildfires": [255, 120, 20],
    "Volcanoes": [255, 30, 30],
    "Severe Storms": [140, 140, 255],
    "Sea and Lake Ice": [200, 240, 255],
    "Floods": [30, 120, 255],
    "Landslides": [180, 120, 60],
    "default": [255, 180, 40]
  };
  const color = colors[category] || colors["default"];
  return new PointSymbol3D({
    symbolLayers: [new ObjectSymbol3DLayer({
      resource: { primitive: "tetrahedron" },
      material: { color: [...color, 1] },
      emissive: { source: "color", strength: 1.5 },
      width: 60000,
      height: 80000,
      depth: 60000
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

// --- SpaceX Starlink ---

const starlinkData = [];

async function loadStarlink() {
  if (!satelliteJs) return;
  setLoadingText("Fetching Starlink constellation...");

  let tles = await fetchTLEs(CONFIG.TLE_STARLINK_URL);

  // If CelesTrak blocks starlink group, try to find STARLINK sats from existing feeds
  if (tles.length === 0) {
    // Fetch a broader set via the supplemental group
    const supp = await fetchTLEs("https://celestrak.org/NORAD/elements/gp.php?GROUP=last-30-days&FORMAT=tle");
    tles = supp.filter(t => t.name.toUpperCase().includes("STARLINK"));
    if (tles.length === 0) {
      console.log("[WorldView] Using fallback Starlink TLEs");
      tles = FALLBACK_STARLINK_TLES;
    }
  }

  // Sample evenly across the constellation for visual spread
  const step = Math.max(1, Math.floor(tles.length / CONFIG.MAX_STARLINK));
  const sampled = [];
  for (let i = 0; i < tles.length && sampled.length < CONFIG.MAX_STARLINK; i += step) {
    sampled.push(tles[i]);
  }

  starlinkData.length = 0;
  const now = new Date();

  for (const tle of sampled) {
    try {
      const satrec = satelliteJs.twoline2satrec(tle.tle1, tle.tle2);
      if (!propagateSatellite(satrec, now)) continue;
      const noradId = tle.tle2.substring(2, 7).trim();
      starlinkData.push({ name: tle.name, satrec, noradId });
    } catch { /* skip */ }
  }

  console.log(`[WorldView] ${starlinkData.length} Starlink satellites initialized (from ${tles.length} total)`);
  updateStarlink();
}

function updateStarlink() {
  if (!satelliteJs || starlinkData.length === 0) return;
  const now = new Date();
  const satGraphics = [], orbitGraphics = [];
  let count = 0;

  // Trail symbol — fading breadcrumbs behind each satellite
  const trailSymbols = [0.6, 0.35, 0.15].map(alpha => new PointSymbol3D({
    symbolLayers: [new ObjectSymbol3DLayer({
      resource: { primitive: "sphere" },
      material: { color: [180, 220, 255, alpha] },
      emissive: { source: "color", strength: alpha * 3 },
      width: 25000 * alpha,
      height: 25000 * alpha,
      depth: 25000 * alpha
    })]
  }));

  for (const sat of starlinkData) {
    const pos = propagateSatellite(sat.satrec, now);
    if (!pos) continue;
    sat.currentPos = pos;
    count++;

    const isSel = selectedFeature?.type === "starlink" && selectedFeature.id === sat.noradId;

    satGraphics.push(new Graphic({
      geometry: new Point({ longitude: pos.longitude, latitude: pos.latitude, z: pos.altitude }),
      symbol: isSel ? starlinkSymbolSelected : starlinkSymbol,
      attributes: { type: "starlink", name: sat.name, noradId: sat.noradId,
        lat: pos.latitude.toFixed(4), lon: pos.longitude.toFixed(4),
        alt: (pos.altitude / 1000).toFixed(1), vel: pos.velocity.toFixed(2) }
    }));

    // Motion trail — 3 fading breadcrumbs behind the satellite
    const trailOffsets = [-15, -35, -60]; // seconds in the past
    for (let t = 0; t < trailOffsets.length; t++) {
      const pastTime = new Date(now.getTime() + trailOffsets[t] * 1000);
      const pastPos = propagateSatellite(sat.satrec, pastTime);
      if (pastPos) {
        satGraphics.push(new Graphic({
          geometry: new Point({ longitude: pastPos.longitude, latitude: pastPos.latitude, z: pastPos.altitude }),
          symbol: trailSymbols[t]
        }));
      }
    }

    // Selected starlink: full orbit + ground track + coverage footprint
    if (isSel) {
      const orbitPath = computeOrbitPath(sat.satrec, now, 95, CONFIG.ORBIT_POINTS);
      if (orbitPath.length > 1) {
        // 3D orbital path (glowing tube)
        for (const seg of splitOrbitAtAntimeridian(orbitPath)) {
          orbitGraphics.push(new Graphic({
            geometry: new Polyline({ paths: [seg.map(p => [p.longitude, p.latitude, p.altitude])] }),
            symbol: starlinkOrbitSymbolSelected
          }));
        }
        // Ground track (dashed line projected on surface)
        for (const seg of splitOrbitAtAntimeridian(orbitPath)) {
          orbitGraphics.push(new Graphic({
            geometry: new Polyline({ paths: [seg.map(p => [p.longitude, p.latitude, 0])] }),
            symbol: new LineSymbol3D({
              symbolLayers: [new LineSymbol3DLayer({
                material: { color: [60, 160, 255, 0.4] },
                size: 2,
                pattern: { style: "dash" }
              })]
            })
          }));
        }
      }
      // Coverage footprint for selected starlink
      const altKm = pos.altitude / 1000;
      if (altKm > 100 && altKm < 2000) {
        orbitGraphics.push(new Graphic({
          geometry: new Polygon({ rings: [computeFootprint(pos.latitude, pos.longitude, altKm, CONFIG.FOOTPRINT_SEGMENTS)] }),
          symbol: new PolygonSymbol3D({
            symbolLayers: [new FillSymbol3DLayer({
              material: { color: [60, 160, 255, 0.08] },
              outline: { color: [100, 200, 255, 0.5], size: 1.5 }
            })]
          })
        }));
      }
    }
  }

  starlinkLayer.removeAll(); starlinkLayer.addMany(satGraphics);
  starlinkOrbitLayer.removeAll(); starlinkOrbitLayer.addMany(orbitGraphics);
  document.getElementById("hud-starlink-count").textContent = `STARLINK: ${count}`;
}

// Fallback Starlink TLEs — representative real-format entries across multiple orbital planes
const FALLBACK_STARLINK_TLES = [
  { name: "STARLINK-1007", tle1: "1 44713U 19074A   26063.50000000  .00001500  00000+0  10000-3 0  9991", tle2: "2 44713  53.0536  10.0000 0001897 267.0000  93.0000 15.05546100 10001" },
  { name: "STARLINK-1008", tle1: "1 44714U 19074B   26063.50000000  .00001500  00000+0  10000-3 0  9992", tle2: "2 44714  53.0536  30.0000 0001897 267.0000 120.0000 15.05546100 10002" },
  { name: "STARLINK-1013", tle1: "1 44719U 19074G   26063.50000000  .00001500  00000+0  10000-3 0  9993", tle2: "2 44719  53.0536  50.0000 0001897 267.0000 150.0000 15.05546100 10003" },
  { name: "STARLINK-1019", tle1: "1 44725U 19074M   26063.50000000  .00001500  00000+0  10000-3 0  9994", tle2: "2 44725  53.0536  70.0000 0001897 267.0000 180.0000 15.05546100 10004" },
  { name: "STARLINK-1038", tle1: "1 44744U 19074AF  26063.50000000  .00001500  00000+0  10000-3 0  9995", tle2: "2 44744  53.0536  90.0000 0001897 267.0000 210.0000 15.05546100 10005" },
  { name: "STARLINK-1051", tle1: "1 44757U 19074AS  26063.50000000  .00001500  00000+0  10000-3 0  9996", tle2: "2 44757  53.0536 110.0000 0001897 267.0000 240.0000 15.05546100 10006" },
  { name: "STARLINK-1060", tle1: "1 44766U 19074BB  26063.50000000  .00001500  00000+0  10000-3 0  9997", tle2: "2 44766  53.0536 130.0000 0001897 267.0000 270.0000 15.05546100 10007" },
  { name: "STARLINK-1070", tle1: "1 44776U 19074BL  26063.50000000  .00001500  00000+0  10000-3 0  9998", tle2: "2 44776  53.0536 150.0000 0001897 267.0000 300.0000 15.05546100 10008" },
  { name: "STARLINK-1078", tle1: "1 44784U 19074BT  26063.50000000  .00001500  00000+0  10000-3 0  9999", tle2: "2 44784  53.0536 170.0000 0001897 267.0000 330.0000 15.05546100 10009" },
  { name: "STARLINK-1090", tle1: "1 44796U 19074CF  26063.50000000  .00001500  00000+0  10000-3 0  9990", tle2: "2 44796  53.0536 190.0000 0001897 267.0000   0.0000 15.05546100 10010" },
  { name: "STARLINK-1100", tle1: "1 44806U 19074CP  26063.50000000  .00001500  00000+0  10000-3 0  9991", tle2: "2 44806  53.0536 210.0000 0001897 267.0000  30.0000 15.05546100 10011" },
  { name: "STARLINK-1110", tle1: "1 44816U 19074CZ  26063.50000000  .00001500  00000+0  10000-3 0  9992", tle2: "2 44816  53.0536 230.0000 0001897 267.0000  60.0000 15.05546100 10012" },
  { name: "STARLINK-1120", tle1: "1 44826U 19074DJ  26063.50000000  .00001500  00000+0  10000-3 0  9993", tle2: "2 44826  53.0536 250.0000 0001897 267.0000  90.0000 15.05546100 10013" },
  { name: "STARLINK-1130", tle1: "1 44836U 19074DT  26063.50000000  .00001500  00000+0  10000-3 0  9994", tle2: "2 44836  53.0536 270.0000 0001897 267.0000 120.0000 15.05546100 10014" },
  { name: "STARLINK-1140", tle1: "1 44846U 19074ED  26063.50000000  .00001500  00000+0  10000-3 0  9995", tle2: "2 44846  53.0536 290.0000 0001897 267.0000 150.0000 15.05546100 10015" },
  { name: "STARLINK-1150", tle1: "1 44856U 19074EN  26063.50000000  .00001500  00000+0  10000-3 0  9996", tle2: "2 44856  53.0536 310.0000 0001897 267.0000 180.0000 15.05546100 10016" },
  { name: "STARLINK-1160", tle1: "1 44866U 19074EX  26063.50000000  .00001500  00000+0  10000-3 0  9997", tle2: "2 44866  53.0536 330.0000 0001897 267.0000 210.0000 15.05546100 10017" },
  { name: "STARLINK-1170", tle1: "1 44876U 19074FH  26063.50000000  .00001500  00000+0  10000-3 0  9998", tle2: "2 44876  53.0536 350.0000 0001897 267.0000 240.0000 15.05546100 10018" },
];

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
    starlink: "SPACEX STARLINK",
    aircraft: "AIRCRAFT TRACKING",
    earthquake: "SEISMIC EVENT",
    nasa_event: "NATURAL EVENT",
    military: "MILITARY INSTALLATION",
    cable: "SUBMARINE CABLE"
  };

  label.textContent = typeLabels[attrs.type] || "TARGET INFO";

  let html = `<div class="detail-name">${attrs.name || attrs.featureName || attrs.Name || "UNKNOWN"}</div>`;

  if (attrs.type === "satellite" || attrs.type === "starlink") {
    html += detailRow("NORAD", attrs.noradId);
    html += detailRow("LAT", `${attrs.lat}°`);
    html += detailRow("LON", `${attrs.lon}°`);
    html += detailRow("ALT", `${attrs.alt} km`);
    html += detailRow("VEL", `${attrs.vel} km/s`);
    if (attrs.type === "starlink") {
      html += detailRow("CONSTELLATION", "STARLINK LEO");
      html += detailRow("ORBIT", "~550 km / 53°");
    }
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
    // CCTV uses its own popup — this shouldn't be reached
    html += detailRow("OPERATOR", attrs.operator);
    html += detailRow("CAMERA TYPE", attrs.camera_type);
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
// CCTV CAMERA FEED POPUP
// =====================================================

// =====================================================
// CAMERA VIEWSHED (3D cone visualization)
// =====================================================

function showViewshed(lat, lon, heading) {
  viewshedLayer.removeAll();

  const camLat = parseFloat(lat);
  const camLon = parseFloat(lon);
  const camZ = 10;  // camera mount height
  const topZ = 50;  // top of viewshed volume

  // Viewshed — 400m range, 80° FOV (realistic traffic cam)
  const fov = 80;
  const rangeDeg = 0.004;  // ~400m in degrees
  const segments = 30;
  const headingRad = (heading * Math.PI) / 180;
  const halfFov = (fov / 2) * Math.PI / 180;
  const cosLat = Math.cos(camLat * Math.PI / 180);

  const farPt = (angle, dist, z) => [
    camLon + dist * Math.sin(angle) / cosLat,
    camLat + dist * Math.cos(angle),
    z
  ];

  const leftAngle = headingRad - halfFov;
  const rightAngle = headingRad + halfFov;

  // Screen-space line symbols (always visible regardless of zoom)
  const edgeLine = new LineSymbol3D({
    symbolLayers: [new LineSymbol3DLayer({
      material: { color: [0, 255, 100, 0.8] },
      size: 3
    })]
  });
  const arcLine = new LineSymbol3D({
    symbolLayers: [new LineSymbol3DLayer({
      material: { color: [0, 255, 100, 0.5] },
      size: 2
    })]
  });
  const pillarLine = new LineSymbol3D({
    symbolLayers: [new LineSymbol3DLayer({
      material: { color: [0, 255, 100, 0.3] },
      size: 1.5
    })]
  });

  // ---- 1. Ground coverage polygon (visible green fill) ----
  const groundRing = [[camLon, camLat, 0]];
  for (let i = 0; i <= segments; i++) {
    const angle = headingRad - halfFov + (i / segments) * 2 * halfFov;
    groundRing.push(farPt(angle, rangeDeg, 0));
  }
  groundRing.push([camLon, camLat, 0]);

  viewshedLayer.add(new Graphic({
    geometry: new Polygon({ rings: [groundRing] }),
    symbol: new PolygonSymbol3D({
      symbolLayers: [new FillSymbol3DLayer({
        material: { color: [0, 255, 100, 0.25] },
        outline: { color: [0, 255, 100, 0.8], size: 2.5 }
      })]
    })
  }));

  // ---- 2. Upper viewshed plane ----
  const upperRing = [[camLon, camLat, topZ]];
  for (let i = 0; i <= segments; i++) {
    const angle = headingRad - halfFov + (i / segments) * 2 * halfFov;
    upperRing.push(farPt(angle, rangeDeg, topZ));
  }
  upperRing.push([camLon, camLat, topZ]);

  viewshedLayer.add(new Graphic({
    geometry: new Polygon({ rings: [upperRing] }),
    symbol: new PolygonSymbol3D({
      symbolLayers: [new FillSymbol3DLayer({
        material: { color: [0, 255, 100, 0.10] },
        outline: { color: [0, 255, 100, 0.4], size: 1.5 }
      })]
    })
  }));

  // ---- 3. Side edge rays from camera to far corners ----
  for (const angle of [leftAngle, rightAngle, headingRad]) {
    // Ground-level ray
    viewshedLayer.add(new Graphic({
      geometry: new Polyline({
        paths: [[[camLon, camLat, camZ], farPt(angle, rangeDeg, 0)]]
      }),
      symbol: edgeLine
    }));
    // Upper ray
    viewshedLayer.add(new Graphic({
      geometry: new Polyline({
        paths: [[[camLon, camLat, topZ], farPt(angle, rangeDeg, topZ)]]
      }),
      symbol: edgeLine
    }));
  }

  // ---- 4. Vertical pillars at far corners ----
  for (const angle of [leftAngle, rightAngle]) {
    viewshedLayer.add(new Graphic({
      geometry: new Polyline({
        paths: [[farPt(angle, rangeDeg, 0), farPt(angle, rangeDeg, topZ)]]
      }),
      symbol: pillarLine
    }));
  }

  // ---- 5. Arcs at far end (ground + upper) ----
  for (const z of [0, topZ]) {
    const arcPath = [];
    for (let i = 0; i <= segments; i++) {
      const angle = headingRad - halfFov + (i / segments) * 2 * halfFov;
      arcPath.push(farPt(angle, rangeDeg, z));
    }
    viewshedLayer.add(new Graphic({
      geometry: new Polyline({ paths: [arcPath] }),
      symbol: arcLine
    }));
  }

  // ---- 6. Side walls (triangular fill panels connecting ground to top) ----
  for (const angle of [leftAngle, rightAngle]) {
    const wallRing = [
      [camLon, camLat, camZ],
      farPt(angle, rangeDeg, 0),
      farPt(angle, rangeDeg, topZ),
      [camLon, camLat, topZ],
      [camLon, camLat, camZ]
    ];
    viewshedLayer.add(new Graphic({
      geometry: new Polygon({ rings: [wallRing] }),
      symbol: new PolygonSymbol3D({
        symbolLayers: [new FillSymbol3DLayer({
          material: { color: [0, 255, 100, 0.06] }
        })]
      })
    }));
  }

  // ---- 7. Camera position marker ----
  viewshedLayer.add(new Graphic({
    geometry: new Point({ longitude: camLon, latitude: camLat, z: camZ }),
    symbol: new PointSymbol3D({
      symbolLayers: [new IconSymbol3DLayer({
        resource: { primitive: "diamond" },
        size: 18,
        material: { color: [0, 255, 100, 1] },
        outline: { color: [255, 255, 255, 0.9], size: 3 }
      })]
    })
  }));
}

function hideViewshed() {
  viewshedLayer.removeAll();
}

function showCctvPopup(attrs) {
  const popup = document.getElementById("cctv-popup");
  const feed = document.getElementById("cctv-popup-feed");
  const info = document.getElementById("cctv-popup-info");
  const title = document.getElementById("cctv-popup-title");

  popup.classList.remove("hidden");
  const camName = (attrs.name || "UNKNOWN").toUpperCase();
  title.textContent = `LIVE FEED — ${camName.substring(0, 40)}`;

  const now = new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";
  const camId = `CAM-${attrs.lat.replace(".", "").substring(0, 4)}${attrs.lon.replace("-", "").replace(".", "").substring(0, 4)}`;
  const lat = attrs.lat;
  const lon = attrs.lon;

  if (attrs.imageUrl) {
    // Real DOT camera image — auto-refresh every 5 seconds
    const imgSrc = attrs.imageUrl + (attrs.imageUrl.includes("?") ? "&" : "?") + "t=" + Date.now();
    feed.innerHTML = `
      <div class="feed-rec">● LIVE</div>
      <div class="feed-cam-id">${camId}</div>
      <img id="cctv-live-img" src="${imgSrc}" alt="${camName}"
        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
      <div class="feed-status" style="display:none"><div>FEED TEMPORARILY UNAVAILABLE<br>${lat}°, ${lon}°</div></div>
      <div class="feed-timestamp">${now}</div>
    `;
    // Auto-refresh image every 5 seconds for live feel
    if (popup._refreshTimer) clearInterval(popup._refreshTimer);
    popup._refreshTimer = setInterval(() => {
      const img = document.getElementById("cctv-live-img");
      if (img && img.style.display !== "none") {
        img.src = attrs.imageUrl + (attrs.imageUrl.includes("?") ? "&" : "?") + "t=" + Date.now();
        const ts = feed.querySelector(".feed-timestamp");
        if (ts) ts.textContent = new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";
      }
    }, 5000);
  } else if (attrs.streamUrl) {
    // HLS video stream (m3u8) — show as link since HLS needs a player
    feed.innerHTML = `
      <div class="feed-rec">● STREAM</div>
      <div class="feed-cam-id">${camId}</div>
      <div class="feed-status">
        <div>
          LIVE VIDEO STREAM AVAILABLE<br>
          <a href="${attrs.streamUrl}" target="_blank" style="color: var(--hud-cyan); font-size: 11px; text-decoration: underline; word-break: break-all;">
            OPEN STREAM IN NEW TAB
          </a><br>
          <span style="color: var(--hud-green); font-size: 9px; margin-top: 8px; display: block;">
            FORMAT: HLS/M3U8 | PROTOCOL: RTSP
          </span>
        </div>
      </div>
      <div class="feed-timestamp">${now}</div>
    `;
  } else {
    // No feed available (OSM cameras)
    feed.innerHTML = `
      <div class="feed-rec" style="color: #666;">● OFFLINE</div>
      <div class="feed-cam-id">${camId}</div>
      <div class="feed-status">
        <div>
          NO PUBLIC FEED AVAILABLE<br>
          <span style="font-size: 9px; color: #666;">Camera mapped at ${lat}°, ${lon}°</span>
        </div>
      </div>
      <div class="feed-timestamp">${now}</div>
    `;
  }

  info.innerHTML = `
    ${detailRow("OPERATOR", attrs.operator)}
    ${detailRow("TYPE", attrs.camera_type)}
    ${attrs.route ? detailRow("ROUTE", attrs.route) : ""}
    ${detailRow("COORDS", `${lat}°, ${lon}°`)}
  `;

  // Show 3D viewshed cone at camera location
  // Use a random-ish heading based on coords (real heading not in data)
  const heading = ((parseFloat(lat) * 1000 + parseFloat(lon) * 1000) % 360 + 360) % 360;
  showViewshed(lat, lon, heading);
}

function hideCctvPopup() {
  const popup = document.getElementById("cctv-popup");
  if (popup) {
    popup.classList.add("hidden");
    if (popup._refreshTimer) { clearInterval(popup._refreshTimer); popup._refreshTimer = null; }
    const feed = document.getElementById("cctv-popup-feed");
    if (feed) feed.innerHTML = "";
  }
  hideViewshed();
}

// Close CCTV popup button
document.getElementById("cctv-popup-close")?.addEventListener("click", hideCctvPopup);

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
  "toggle-starlink": [starlinkLayer, starlinkOrbitLayer],
  "toggle-orbits": orbitLayer,
  "toggle-footprints": footprintLayer,
  "toggle-aircraft": aircraftLayer,
  "toggle-earthquakes": earthquakeLayer,
  "toggle-events": nasaEventLayer,
  "toggle-cables": [cableLayer, cableTerminalLayer],
  "toggle-bases": militaryLayer,
  "toggle-cctv": cctvLayer,
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
    if (r.graphic.layer === starlinkLayer) {
      selectedFeature = { type: "starlink", id: attrs.noradId };
      showFeatureDetail(attrs);
      updateStarlink();
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
      showCctvPopup(attrs);
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
  const satPromise = loadSatellites().then(() => { setLoadingProgress(20); });
  const starlinkPromise = loadStarlink().then(() => { setLoadingProgress(35); });

  setLoadingText("Loading all data feeds...");
  await Promise.allSettled([
    satPromise,
    starlinkPromise,
    loadAircraft().then(() => { setLoadingProgress(50); }),
    loadEarthquakes().then(() => { setLoadingProgress(65); }),
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
  setInterval(updateStarlink, CONFIG.SAT_UPDATE_INTERVAL);
  setInterval(loadAircraft, CONFIG.AIRCRAFT_UPDATE_INTERVAL);
  setInterval(loadEarthquakes, CONFIG.QUAKE_UPDATE_INTERVAL);

  logStatus("All systems operational");
  console.log("[WorldView] All systems operational");
}

init();
