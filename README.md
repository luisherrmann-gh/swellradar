# SWELLRADAR.LX — Surf Forecast for Portugal

A real-time surf forecast web app for the Portuguese Atlantic coast, built as a single HTML file with no frameworks and no build step.

**Live spots:** Nazaré · Peniche · Carcavelos

---

## What it does

### Landing page
Three spot cards show live conditions at a glance:
- Current wave height, period, and direction
- Wind speed, direction, and type label (Offshore / Onshore / Cross-shore)
- Wind compass rose
- Condition badge: **EPIC / GOOD / FAIR / POOR / FLAT**
- **FIRING** badge when waves ≥ 2.0m + period ≥ 12s + wind ≤ 15 kph

### Forecast panel (opens on spot click)
| Section | What you see |
|---|---|
| **Wave Hero** | Current wave height + condition badge |
| **Stats Grid** | Wave height, period, direction, wind speed, wind gusts |
| **Tides Chart** | Today's semi-diurnal tide curve (high/low with timestamps) |
| **7-Day Timeline** | Hourly scrollable strip — wave height + wind per day |
| **Wave Height Chart** | 7-day Chart.js line chart |
| **Wind Speed Chart** | 7-day Chart.js bar chart |
| **Wind Flow Mini-Map** | Animated wind particle overlay on satellite map with time scrubber |

### Satellite map
- Leaflet.js with ESRI satellite tiles
- Animated wind particle system (canvas overlay)
- Swell direction arrows per spot

---

## Tech stack

| Layer | Technology |
|---|---|
| Map | [Leaflet.js](https://leafletjs.com) v1.9.4 + ESRI satellite tiles |
| Charts | [Chart.js](https://chartjs.org) |
| Marine data | [Open-Meteo Marine API](https://open-meteo.com) (free, no API key) |
| Weather data | [Open-Meteo Forecast API](https://open-meteo.com) (free, no API key) |
| Fonts | Plus Jakarta Sans (UI) · DM Mono (data/numbers) |
| Build | None — single `index.html` file, vanilla JS, embedded CSS |

---

## Condition badge logic

| Badge | Criteria |
|---|---|
| **FLAT** | Wave height < 0.3m |
| **POOR** | Weak waves or poor wind |
| **FAIR** | Rideable but not ideal |
| **GOOD** | Good size + favourable wind |
| **EPIC** | Pumping swell + offshore wind |

---

## Project structure

```
SWELLRADAR/
└── index.html      # entire app — HTML + embedded CSS + vanilla JS
```

No `package.json`. No dependencies to install. Just open `index.html` in a browser.

---

## Running locally

```bash
git clone https://github.com/luisherrmann-gh/swellradar.git
cd swellradar
open index.html        # macOS
# or just drag index.html into your browser
```

No server required. All API calls go directly to Open-Meteo from the browser.

---

## Data sources

- **Waves & swell:** `marine-api.open-meteo.com` — wave height, period, direction, wind wave height
- **Wind:** `api.open-meteo.com` — wind speed, direction, gusts at 10m
- **Sun times:** `api.open-meteo.com` — sunrise/sunset for tide chart
- **Tides:** Computed via semi-diurnal harmonic model (M2 constituent, 12.42h period) calibrated for the Portuguese Atlantic coast. Open-Meteo does not provide tide data.

---

## Design system

| Token | Value |
|---|---|
| Primary | `#7B2FBE` (purple) |
| Accent | `#CC0000` (red, map markers only) |
| Background | `#f5f5f0` |
| UI font | Plus Jakarta Sans |
| Data font | DM Mono |

Layout: map left 55% / forecast panel right 45%. Mobile: stacked, fully responsive.

---

## Credits

Built by [Luis Herrmann](https://github.com/luisherrmann-gh). Weather data by [Open-Meteo](https://open-meteo.com) (open-source, no API key needed).