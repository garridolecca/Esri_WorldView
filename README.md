# Esri WorldView — Satellite Intelligence Simulator

A browser-based satellite intelligence simulator built with the **ArcGIS Maps SDK for JavaScript 5.0**. Track real satellites, visualize orbital paths, monitor live aircraft, and explore Earth through military-style HUD overlays.

**[Live Demo](https://garridolecca.github.io/Esri_WorldView/)**

![Esri WorldView](https://img.shields.io/badge/ArcGIS_JS_SDK-5.0-blue) ![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

### Real-Time Satellite Tracking
- Parses TLE (Two-Line Element) data from [CelesTrak](https://celestrak.org/) for 200+ active satellites
- Propagates satellite positions in real-time using SGP4 orbital mechanics via [satellite.js](https://github.com/shashwatak/satellite-js)
- Renders orbital paths and sensor ground footprints
- Click any satellite to view detailed telemetry (NORAD ID, coordinates, altitude, velocity)

### Live Aircraft Monitoring
- Polls the [OpenSky Network](https://opensky-network.org/) API for global flight data
- Displays up to 500 aircraft with callsign, altitude, speed, and heading

### Military-Style HUD
- Heads-up display with real-time camera coordinates, heading, and tilt
- Crosshair overlay with tracking counters
- Dark-themed control panels with layer toggles

### Render Modes
| Mode | Effect |
|------|--------|
| **Standard** | Default satellite imagery |
| **NVG** | Night vision green phosphor simulation |
| **Thermal** | FLIR-style inverted thermal imaging |
| **CRT** | Retro CRT monitor with scanlines |

### Navigation Presets
Quick-jump to Globe, USA, Europe, and Asia views with smooth camera transitions.

---

## Tech Stack

- **ArcGIS Maps SDK for JavaScript 5.0** — 3D SceneView, GraphicsLayer, PointSymbol3D
- **satellite.js 5.0** — SGP4/SDP4 orbital propagation
- **CelesTrak API** — Live TLE orbital elements
- **OpenSky Network API** — Real-time ADS-B aircraft data
- **Vanilla JS** — No frameworks, pure ES modules via CDN

---

## Getting Started

No build step required. Just serve the files:

```bash
# Clone the repo
git clone https://github.com/garridolecca/Esri_WorldView.git
cd Esri_WorldView

# Serve with any static server
npx serve .
# or
python -m http.server 8000
```

Open `http://localhost:8000` in a modern browser.

> **Note:** An ArcGIS API key is not required for the basemaps used in this project.

---

## Project Structure

```
Esri_WorldView/
├── index.html          # Main entry point
├── css/
│   └── styles.css      # HUD overlay and render mode styles
├── js/
│   └── app.js          # Core application (SceneView, satellites, aircraft, HUD)
├── README.md
└── .gitignore
```

---

## Data Sources

| Source | Data | Update Rate |
|--------|------|-------------|
| [CelesTrak](https://celestrak.org/) | Satellite TLE orbital elements | On load |
| [OpenSky Network](https://opensky-network.org/) | Live ADS-B aircraft positions | Every 10s |
| [satellite.js](https://github.com/shashwatak/satellite-js) | SGP4 orbital propagation | Every 1s |

---

## Inspired By

[WorldView by Bilawal Sidhu](https://www.spatialintelligence.ai/p/i-built-a-spy-satellite-simulator) — A spy satellite simulator using Google 3D Tiles. This project reimagines the concept using the ArcGIS ecosystem.

---

## License

MIT
