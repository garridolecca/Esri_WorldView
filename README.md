# Esri WorldView — Satellite Intelligence Simulator

A browser-based global intelligence visualization built with the **ArcGIS Maps SDK for JavaScript 5.0**. Combines real-time satellite tracking, aircraft monitoring, seismic events, natural disasters, submarine cable infrastructure, and military installations on a 3D globe with a military-style HUD.

**[Live Demo](https://garridolecca.github.io/Esri_WorldView/)**

![ArcGIS JS SDK](https://img.shields.io/badge/ArcGIS_JS_SDK-5.0-blue) ![satellite.js](https://img.shields.io/badge/satellite.js-5.0-green) ![License](https://img.shields.io/badge/license-MIT-brightgreen)

---

## Features

### 7 Real-Time Data Feeds

| Layer | Source | Data | Update |
|-------|--------|------|--------|
| Satellites | [CelesTrak](https://celestrak.org/) + [satellite.js](https://github.com/shashwatak/satellite-js) | 200+ satellites with SGP4 orbital propagation | 2s |
| SpaceX Starlink | [CelesTrak](https://celestrak.org/) constellation | 200 Starlink LEO satellites with distinct blue symbology | 2s |
| Aircraft | [OpenSky Network](https://opensky-network.org/) | 500+ live ADS-B positions with callsign, altitude, speed | 15s |
| Earthquakes | [USGS](https://earthquake.usgs.gov/) | M2.5+ seismic events (last 24h), magnitude-scaled | 60s |
| Natural Events | [NASA EONET](https://eonet.gsfc.nasa.gov/) | Wildfires, volcanoes, storms, floods, icebergs | On load |
| Submarine Cables | [ArcGIS FeatureLayer](https://services.arcgis.com/nzS0F0zdNLvs7nc8/arcgis/rest/services/Submarine_Cables/FeatureServer) | 343 global undersea telecom cables + terminals | On load |
| Military Bases | [US DoD via ArcGIS](https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/MIRTA_Points_A_view/FeatureServer) | 737 US military installations, ranges, and training areas | On load |

### Interactive Intelligence HUD

- Real-time UTC clock, camera position (lat/lon/alt), heading, and tilt
- Per-layer tracking counters showing live data status
- Click any feature for detailed telemetry (satellite NORAD ID, earthquake magnitude/depth, cable owners, base names)
- Crosshair overlay with status indicator

### Render Modes

| Mode | Effect |
|------|--------|
| **Standard** | Default satellite imagery basemap |
| **NVG** | Night vision green phosphor simulation |
| **Thermal** | FLIR-style inverted thermal imaging |
| **CRT** | Retro CRT monitor with animated scanlines |

### Navigation

Quick-fly to **Globe**, **USA**, **Europe**, **Asia**, **Middle East**, and **Pacific** views with smooth camera transitions.

### Intro Tutorial

On-boarding modal explains all data feeds, controls, and render modes before launching the app.

---

## Tech Stack

- **ArcGIS Maps SDK for JavaScript 5.0** — 3D SceneView, GraphicsLayer, FeatureLayer, PointSymbol3D
- **satellite.js 5.0** — SGP4/SDP4 orbital propagation from TLE data
- **CelesTrak API** — Live TLE orbital elements (stations, visual, science groups)
- **OpenSky Network API** — Real-time ADS-B aircraft positions
- **USGS Earthquake API** — GeoJSON feed of seismic events
- **NASA EONET API** — Earth Observatory Natural Event Tracker
- **ArcGIS Living Atlas** — Submarine cables, military installations
- **Vanilla JS** — No frameworks, pure ES modules via CDN

---

## Getting Started

No build step required:

```bash
git clone https://github.com/garridolecca/Esri_WorldView.git
cd Esri_WorldView
npx serve .
```

Open `http://localhost:3000` in a modern browser (Chrome, Edge, Firefox).

> **Note:** No ArcGIS API key required. All data sources are public and CORS-enabled.

---

## Project Structure

```
Esri_WorldView/
├── index.html          # Entry point with intro modal and HUD markup
├── css/
│   └── styles.css      # HUD, intro modal, render modes, responsive layout
├── js/
│   └── app.js          # Core app: SceneView, 6 data loaders, HUD, events
├── README.md
└── .gitignore
```

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   index.html                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐ │
│  │  Intro   │  │  3D View │  │  HUD Overlay  │ │
│  │  Modal   │  │ (SceneV) │  │  (controls)   │ │
│  └──────────┘  └──────────┘  └───────────────┘ │
└──────────────────────┬──────────────────────────┘
                       │
              ┌────────┴────────┐
              │     app.js      │
              ├─────────────────┤
              │ ArcGIS SDK 5.0  │  ← $arcgis.import()
              │ satellite.js    │  ← <script> tag
              ├─────────────────┤
              │ Data Loaders:   │
              │  • Satellites   │  ← CelesTrak TLE → SGP4
              │  • Aircraft     │  ← OpenSky Network API
              │  • Earthquakes  │  ← USGS GeoJSON Feed
              │  • NASA Events  │  ← NASA EONET API
              │  • Cables       │  ← ArcGIS FeatureLayer
              │  • Military     │  ← ArcGIS FeatureLayer
              └─────────────────┘
```

---

## Inspired By

[WorldView by Bilawal Sidhu](https://www.spatialintelligence.ai/p/i-built-a-spy-satellite-simulator) — A spy satellite simulator using Google 3D Tiles. This project reimagines the concept using the ArcGIS ecosystem and open data APIs.

---

## License

MIT
