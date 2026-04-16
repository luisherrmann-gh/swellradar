# SWELLRADAR.LX — Surf Forecast for Portugal

A real-time surf forecast web app for the Portuguese Atlantic coast. No frameworks, no build step — just vanilla JS, HTML, and CSS deployed on Vercel.

**Live:** [swellradar.vercel.app](https://swellradar.vercel.app)

---

## Features

### Landing page — 38 surf spots
Each spot card shows live conditions fetched directly from Open-Meteo:
- Current wave height range, period, and swell direction
- Wind speed, direction, and type label (Offshore / Onshore / Cross-off / Cross-on)
- Wind compass rose
- Condition badge: **EPIC / GOOD / FAIR / POOR / FLAT**
- **BEST NOW** star badge on the highest-scoring spot
- **FIRING** badge when waves ≥ 2.0m + period ≥ 12s + wind ≤ 15 km/h
- Crowd level badge (QUIET / MODERATE / BUSY / PACKED) — powered by live Roboflow crowd detection on cam frames
- Surfboard sticker on Carcavelos and Praia Pequena cards

### Forecast panel (opens on spot click)

| Section | Details |
|---|---|
| **Wave Hero** | Live wave height, condition badge, crowd badge |
| **Water Temp** | Sea surface temperature + wetsuit recommendation (e.g. `4/3`) |
| **Best Window** | Best 3-hour surf window today based on swell quality + wind score |
| **Stats Grid** | Period · Swell direction · Wind sea · Wind speed · Wind direction |
| **AI Daily Briefing** | Carcavelos only — Claude-generated forecast text, updated daily at 06:00 UTC via GitHub Actions |
| **Tides Chart** | Today's semi-diurnal tide curve with high/low timestamps and sunrise/sunset |
| **7-Day Timeline** | Hourly scrollable strip — wave height + wind per day |
| **Wave Height Chart** | 7-day Chart.js line chart |
| **Wind Speed Chart** | 7-day Chart.js bar chart |
| **Wind Flow Mini-Map** | Animated wind particle overlay on satellite map with time scrubber |
| **Weather** | Current temperature, feels like, rain chance, UV index, cloud cover |

### Map column — per-spot extras

| Tab | Available on |
|---|---|
| **MAP** | All spots |
| **LIVE CAM** | Spots with a BeachCam stream (Nazaré, Carcavelos, Supertubos, …) |
| **SARA'S CAM** | Praia Pequena only — local video clip |
| **PHOTOS** | Praia Pequena — swipeable photo gallery (4 photos) |
| **GUIDE** | Carcavelos + Praia Pequena — surf guide with ideal conditions, spot stats, hazards |

### Satellite map
- Leaflet.js with ESRI satellite tiles
- Animated wind particle system (canvas overlay)
- Click any of the 38 markers to load the forecast

---

## AI Daily Briefing — Carcavelos

A GitHub Actions workflow runs every day at **06:00 UTC**:
1. Fetches the day's marine + wind forecast from Open-Meteo
2. Calculates sunrise/sunset and filters to daylight hours
3. Sends a structured prompt to **Claude Haiku** (`claude-haiku-4-5-20251001`)
4. Writes the response to `forecast-text.json` and pushes it to the repo
5. Vercel picks up the new file on the next edge request

The `ANTHROPIC_API_KEY` is stored as a GitHub Actions secret and never exposed client-side.

---

## Crowd Detection

Carcavelos and other BeachCam spots display a live crowd badge. On load, the app:
1. Fetches the current cam frame
2. Sends it to the **Roboflow** inference API (publishable key, client-safe)
3. Maps the detected surfer count → QUIET / MODERATE / BUSY / PACKED

---

## Tech stack

| Layer | Technology |
|---|---|
| Map | [Leaflet.js](https://leafletjs.com) v1.9.4 + ESRI satellite tiles |
| Charts | [Chart.js](https://chartjs.org) 4.4.0 |
| Marine data | [Open-Meteo Marine API](https://open-meteo.com) (free, no key) |
| Weather data | [Open-Meteo Forecast API](https://open-meteo.com) (free, no key) |
| AI forecast | [Anthropic Claude Haiku](https://anthropic.com) via GitHub Actions |
| Crowd detection | [Roboflow](https://roboflow.com) inference API |
| Video streaming | [hls.js](https://github.com/video-dev/hls.js) for .m3u8 streams |
| Fonts | Plus Jakarta Sans (UI) · DM Mono (data/numbers) |
| Hosting | [Vercel](https://vercel.com) |
| Build | None — vanilla JS, no npm, no bundler |

---

## Project structure

```
SWELLRADAR/
├── index.html                   # app shell + layout
├── css/
│   └── styles.css               # all styles
├── js/
│   └── app.js                   # all client-side logic
├── scripts/
│   └── generate-forecast.js     # Node.js script run by GitHub Actions
├── .github/
│   └── workflows/
│       └── daily-forecast.yml   # cron job: daily AI briefing
├── forecast-text.json           # AI forecast output (auto-updated daily)
├── carca sticker.webp           # Carcavelos card decoration
└── Pequena Sticker.png          # Praia Pequena card decoration
```

---

## Condition badge logic

| Badge | Criteria |
|---|---|
| **FLAT** | Wave height < 0.3m |
| **POOR** | Very small or onshore-only conditions |
| **FAIR** | Rideable but not ideal |
| **GOOD** | Good size + favourable wind |
| **EPIC** | Pumping swell + offshore wind |

---

## Running locally

```bash
git clone https://github.com/luisherrmann-gh/swellradar.git
cd swellradar
open index.html   # macOS — or drag into any browser
```

No server required. All API calls go directly to Open-Meteo from the browser.

> The AI Daily Briefing only loads via Vercel (it fetches `forecast-text.json` via HTTP). On `file://` it will silently not render — this is expected.

---

## Data sources

| Data | Source |
|---|---|
| Waves, swell, sea surface temperature | `marine-api.open-meteo.com` |
| Wind speed, direction, gusts | `api.open-meteo.com` |
| Sunrise / sunset | `api.open-meteo.com` |
| Tides | Semi-diurnal harmonic model (M2 constituent, 12.42h period) — Open-Meteo has no tide endpoint |
| AI forecast text | Anthropic Claude Haiku via GitHub Actions |
| Crowd count | Roboflow object detection on live cam frames |

---

## Design system

| Token | Value |
|---|---|
| Primary | `#5E60CE` (blue-purple) |
| Highlight | `#80FFDB` (teal — borders, guide bars) |
| Marker | `#CC0000` (red — map pins only) |
| UI font | Plus Jakarta Sans |
| Data font | DM Mono |

Layout: map left 55% / forecast panel right 45%. Mobile: stacked, fully responsive.

---

## Credits

Built by [Luis Herrmann](https://github.com/luisherrmann-gh). Weather + marine data by [Open-Meteo](https://open-meteo.com) (open-source, no API key needed).
