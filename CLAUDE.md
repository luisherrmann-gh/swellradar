Never start a server. Never use preview_start. Always edit index.html directly.
This project is a single-file surf forecast web app called SWELLRADAR.LX.
File: index.html (embedded CSS + JS, no frameworks, no build step).

TECH STACK:
- Leaflet.js with ESRI satellite map tiles
- Open-Meteo Marine API (free, no API key)
- Chart.js for charts
- No external frameworks, no npm, no build step

DESIGN SYSTEM:
- Colors: green #006600, red #CC0000, dark bg #0a0a0a
- Fonts: Plus Jakarta Sans (headings/UI), DM Mono (data/numbers)
- Layout: map left 55%, forecast panel right 45%, split view
- Style: dark, minimal, data-dense — like Surfline meets Bloomberg Terminal

EXISTING FEATURES (do not break these):
- Clickable spot markers on satellite map (Nazaré + Peniche)
- Landing page with two spot cards showing current conditions + wind compass
- Forecast panel: wave height hero, conditions grid, tides chart, 7-day hourly timeline, wind speed chart, wind flow mini-map with animated particles
- Wind flow time scrubber (SAT → FRI)
- USE MY LOCATION button
- Live UTC clock in header
- Scroll-to-top on spot load (scrollTop = 0)

CODING RULES:
- Always make surgical edits — never rewrite sections that are not mentioned in the task
- Never change functionality that already works
- Never change IDs, class names, or JS function names unless explicitly asked
- All changes stay within the single index.html file
- When editing Chart.js configs: only change the specific properties mentioned, leave all others untouched