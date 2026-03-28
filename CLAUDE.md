Never start a server. Never use preview_start. Always edit index.html directly.

This project is a single-file surf forecast web app called SWELLRADAR.LX.
File: index.html (embedded CSS + JS, no frameworks, no build step).

TECH STACK:
- Leaflet.js with ESRI satellite map tiles
- Open-Meteo Marine API (free, no API key)
- Chart.js for charts
- No external frameworks, no npm, no build step

DESIGN SYSTEM:
- Primary: #7B2FBE (purple), Accent: #CC0000 (red, markers only)
- Fonts: Plus Jakarta Sans (UI), DM Mono (data/numbers)
- Layout: map left 55%, forecast panel right 45%
- Style: dark, minimal, data-dense

SPOTS: Nazaré, Peniche, Carcavelos

EXISTING FEATURES (never break these):
- Landing page: 3 spot cards with live conditions, condition badge, wind compass, wind type label
- Satellite map with animated wind particles
- Forecast panel: wave hero, stats grid (5 stats), tides chart, 7-day hourly timeline, wave height chart, wind speed chart, wind flow mini-map with scrubber
- Condition badge system: EPIC / GOOD / FAIR / POOR / FLAT
- Mobile responsive layout

CODING RULES:
- Surgical edits only — never rewrite sections not mentioned in the task
- Never change working functionality
- Never change IDs, class names, or JS function names unless explicitly asked
- All changes stay within index.html
- When editing Chart.js configs: only change specific properties mentioned

MOBILE FIXES NEEDED (current bugs):
- Stats grid must be 2 columns on mobile: use display:grid !important; grid-template-columns: repeat(2, minmax(0,1fr)) !important;
- Tides canvas: height must be set to 160px via JS after render: tideChartInst.resize() at 100ms, 350ms, 800ms
- Wind flow map: mapEl.style.height must be '160px' on mobile (window.innerWidth <= 768)
- Wind flow canvas PH must be 160 on mobile, not 200
- All wind flow elements need max-width:100% and box-sizing:border-box