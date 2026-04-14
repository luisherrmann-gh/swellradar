#!/usr/bin/env node
/**
 * Daily AI Forecast Generator — Carcavelos
 * Fetches Open-Meteo marine + wind data, sends to Claude, writes forecast-text.json
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const LAT = 38.6796;
const LON = -9.3359;

/* ── helpers ──────────────────────────────────────────────── */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function postJson(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname, path, method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(payload) }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/* ── sunrise/sunset (simple civil twilight approx) ───────── */
function getSunriseSunset(lat, lon, date) {
  // Approximate — good enough for surf scheduling
  const d = new Date(date);
  const doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  const B   = (360 / 365) * (doy - 81) * (Math.PI / 180);
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const latR = lat * (Math.PI / 180);
  const decl = 23.45 * Math.sin(B) * (Math.PI / 180);
  const ha   = Math.acos(-Math.tan(latR) * Math.tan(decl)) * (180 / Math.PI);
  const tz   = Math.round(lon / 15);
  const noon = 12 - (lon - tz * 15) / 15 - eot / 60;
  const rise = noon - ha / 15;
  const set  = noon + ha / 15;
  const fmt  = h => `${Math.floor(h).toString().padStart(2,'0')}:${Math.round((h % 1) * 60).toString().padStart(2,'0')}`;
  return { sunrise: fmt(rise + tz), sunset: fmt(set + tz), riseHour: Math.floor(rise + tz), setHour: Math.ceil(set + tz) };
}

/* ── main ─────────────────────────────────────────────────── */
async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('Missing ANTHROPIC_API_KEY'); process.exit(1); }

  const today = new Date().toISOString().split('T')[0];
  const { sunrise, sunset, riseHour, setHour } = getSunriseSunset(LAT, LON, today);

  console.log(`Fetching forecast for ${today} (daylight ${sunrise}–${sunset})...`);

  /* ── Open-Meteo Marine API ── */
  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${LAT}&longitude=${LON}`
    + `&hourly=wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction,wind_wave_height`
    + `&wind_speed_unit=kmh&timezone=Europe%2FLisbon&forecast_days=1`;

  /* ── Open-Meteo Weather API (wind) ── */
  const windUrl = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}`
    + `&hourly=windspeed_10m,winddirection_10m,temperature_2m`
    + `&wind_speed_unit=kmh&timezone=Europe%2FLisbon&forecast_days=1`;

  const [marine, wind] = await Promise.all([fetchJson(marineUrl), fetchJson(windUrl)]);

  /* ── filter to daylight hours ── */
  const hours = marine.hourly.time.map((t, i) => {
    const h = parseInt(t.split('T')[1]);
    if (h < riseHour || h > setHour) return null;
    const windDir = wind.hourly.winddirection_10m[i];
    const wdLabel = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
      [Math.round(windDir / 22.5) % 16];
    const swellDir = marine.hourly.swell_wave_direction[i];
    const sdLabel  = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
      [Math.round(swellDir / 22.5) % 16];
    return {
      time:          t.split('T')[1].slice(0,5),
      waveHeight:    marine.hourly.wave_height[i],
      wavePeriod:    marine.hourly.wave_period[i],
      swellHeight:   marine.hourly.swell_wave_height[i],
      swellPeriod:   marine.hourly.swell_wave_period[i],
      swellDir:      sdLabel,
      windSpeed:     wind.hourly.windspeed_10m[i],
      windDir:       wdLabel,
      temp:          wind.hourly.temperature_2m[i]
    };
  }).filter(Boolean);

  if (!hours.length) { console.error('No daylight hours found'); process.exit(1); }

  /* ── build data summary for prompt ── */
  const morning = hours.filter(h => parseInt(h.time) < 12);
  const afternoon = hours.filter(h => parseInt(h.time) >= 12);

  function summarise(slots) {
    if (!slots.length) return 'N/A';
    const avg = arr => (arr.reduce((a,b) => a+b, 0) / arr.length).toFixed(1);
    return `waves ${avg(slots.map(s=>s.waveHeight))}m, swell ${avg(slots.map(s=>s.swellHeight))}m @ ${avg(slots.map(s=>s.swellPeriod))}s from ${slots[0].swellDir}, wind ${avg(slots.map(s=>s.windSpeed))}km/h ${slots[0].windDir}`;
  }

  const dataBlock = [
    `Date: ${today}`,
    `Location: Carcavelos, Portugal (sand-bottom beach break, 15min from Lisbon)`,
    `Daylight: ${sunrise} – ${sunset}`,
    ``,
    `MORNING (${morning[0]?.time}–${morning[morning.length-1]?.time}): ${summarise(morning)}`,
    `AFTERNOON (${afternoon[0]?.time}–${afternoon[afternoon.length-1]?.time}): ${summarise(afternoon)}`,
    ``,
    `Hourly breakdown:`,
    ...hours.map(h => `  ${h.time}  waves ${h.waveHeight}m  swell ${h.swellHeight}m@${h.swellPeriod}s ${h.swellDir}  wind ${h.windSpeed}km/h ${h.windDir}  ${h.temp}°C`)
  ].join('\n');

  console.log('Data summary:\n', dataBlock);

  /* ── Claude prompt ── */
  const prompt = `You are a local surf forecaster writing the daily briefing for Carcavelos beach in Portugal.

Here is today's forecast data:

${dataBlock}

Write a surf forecast for today covering all daylight hours. Structure it like this:
- Start with a 1-sentence headline that captures the day's vibe
- Morning conditions and best window to surf (be specific about times)
- How conditions evolve through the day
- Afternoon outlook
- 2-3 practical tips for today (board choice, tide strategy, crowd avoidance, etc.)

Style: direct, knowledgeable, like a local friend who surfs Carcavelos regularly. No fluff. Use metres for wave height. Keep it to ~150 words total.`;

  console.log('Calling Claude API...');

  const response = await postJson('api.anthropic.com', '/v1/messages', {
    'Content-Type':      'application/json',
    'x-api-key':         apiKey,
    'anthropic-version': '2023-06-01'
  }, {
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages:   [{ role: 'user', content: prompt }]
  });

  if (response.error) { console.error('Claude error:', response.error); process.exit(1); }

  const text = response.content[0].text.trim();
  console.log('Generated text:\n', text);

  /* ── write output ── */
  const output = {
    date:      today,
    generated: new Date().toISOString(),
    spot:      'Carcavelos',
    sunrise,
    sunset,
    text
  };

  const outPath = path.join(__dirname, '..', 'forecast-text.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log('Written to forecast-text.json');
}

main().catch(err => { console.error(err); process.exit(1); });
