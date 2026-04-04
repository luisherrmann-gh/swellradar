    'use strict';

    /* ─── Clock ─────────────────────────────────────────────── */
    (function tick() {
      var n = new Date();
      var z = function(v) { return String(v).padStart(2, '0'); };
      document.getElementById('clock').textContent =
        z(n.getUTCHours()) + ':' + z(n.getUTCMinutes()) + ':' + z(n.getUTCSeconds()) + ' UTC';
      setTimeout(tick, 1000);
    })();

    /* ─── Status ────────────────────────────────────────────── */
    var sDotEl = document.getElementById('sDot');
    var sTxtEl = document.getElementById('sText');

    function setStatus(msg, state) {
      state = state || 'idle';
      sTxtEl.textContent = msg;
      sTxtEl.className   = state === 'error' ? 'err' : '';
      sDotEl.className   = 's-dot'
        + (state === 'loading' ? ' loading'
         : state === 'ok'      ? ' ok'
         : state === 'error'   ? ' error' : '');
    }

    /* ─── Helpers ───────────────────────────────────────────── */
    var COMPASS = ['N','NNE','NE','ENE','E','ESE','SE','SSE',
                   'S','SSW','SW','WSW','W','WNW','NW','NNW'];
    var toCompass = function(deg) {
      return deg == null ? '—' : COMPASS[Math.round(deg / 22.5) % 16];
    };
    var DAYS   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
    var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun',
                  'Jul','Aug','Sep','Oct','Nov','Dec'];

    /* ─── Count-up animation ────────────────────────────────── */
    function countUp(el, target, ms) {
      ms = ms || 950;
      var t0 = performance.now();
      (function frame(now) {
        var p    = Math.min((now - t0) / ms, 1);
        var ease = 1 - Math.pow(1 - p, 3);
        el.textContent = (ease * target).toFixed(1);
        if (p < 1) requestAnimationFrame(frame);
      })(t0);
    }

    /* ─── Map ───────────────────────────────────────────────── */
    var selLat = null, selLon = null, pinMarker = null;
    var selectedSpotName = null;
    var selScale = 1.0; /* nearshore scaling factor for current spot */

    delete L.Icon.Default.prototype._getIconUrl;

    var map = L.map('map', {
      center: [39.02, -9.35], zoom: 9, minZoom: 7,
      maxBounds: [[37.8, -10.6], [40.8, -8.0]],
      maxBoundsViscosity: 1.0, zoomControl: true,
    });

    var ESRI_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    var ESRI_ATTR  = 'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, USGS, USDA';

    L.tileLayer(ESRI_TILES, { attribution: ESRI_ATTR, maxZoom: 19 }).addTo(map);

    var SURF_SPOTS = [
      /* scale = nearshore factor: offshore model → actual rideable surf height */
      { name: 'Nazaré',           lat: 39.6080, lon: -9.0849, scale: 0.80, camUrl: 'https://video-auth1.iol.pt/beachcam/nazareparadonorte/playlist.m3u8' }, /* canyon amplifies — higher retention */
      { name: 'Almagreira',       lat: 39.3789, lon: -9.3148, scale: 0.55 },
      { name: 'Baleal',           lat: 39.3745, lon: -9.3392, scale: 0.55, camUrl: 'https://video-auth1.iol.pt/beachcam/bcbalealgeral/playlist.m3u8' },
      { name: 'Lagide',           lat: 39.3738, lon: -9.3360, scale: 0.55, camUrl: 'https://video-auth1.iol.pt/beachcam/lagide/playlist.m3u8' },
      { name: 'Cantinho da Baía', lat: 39.3701, lon: -9.3395, scale: 0.55 },
      { name: 'Middle',           lat: 39.3625, lon: -9.3507, scale: 0.55 },
      { name: 'Meio da Baía',     lat: 39.3618, lon: -9.3669, scale: 0.55 },
      { name: 'Molhe Leste',      lat: 39.3501, lon: -9.3678, scale: 0.55 },
      { name: 'Supertubos',       lat: 39.3443, lon: -9.3636, scale: 0.60, camUrl: 'https://video-auth1.iol.pt/beachcam/supertubos/playlist.m3u8' }, /* exposed reef — retains more energy */
      { name: 'Santa Cruz',       lat: 39.1340, lon: -9.3845, scale: 0.55, camUrl: 'https://video-auth1.iol.pt/beachcam/santacruz/playlist.m3u8' },
      { name: 'Praia das Amoeiras', lat: 39.1267, lon: -9.3894, scale: 0.50 },
      { name: 'Praia Azul',       lat: 39.1078, lon: -9.3977, scale: 0.50, camUrl: 'https://video-auth1.iol.pt/beachcam/bcpraiaazul/playlist.m3u8' },
      { name: 'São Lourenço',     lat: 39.0120, lon: -9.4218, scale: 0.55 },
      { name: 'Coxos',            lat: 39.0019, lon: -9.4275, scale: 0.60 }, /* deep-water reef */
      { name: 'Cave',             lat: 38.9970, lon: -9.4265, scale: 0.55 },
      { name: 'Ribeira D\'Ilhas', lat: 38.9878, lon: -9.4196, scale: 0.55, camUrl: 'https://video-auth1.iol.pt/beachcam/bcmafraribeira/playlist.m3u8' },
      { name: 'Reef',             lat: 38.9824, lon: -9.4223, scale: 0.55, camUrl: 'https://video-auth1.iol.pt/beachcam/ericeiraspots/playlist.m3u8' },
      { name: 'Pedra Branca',     lat: 38.9793, lon: -9.4228, scale: 0.55, camUrl: 'https://video-auth1.iol.pt/beachcam/ericeiraspots/playlist.m3u8' },
      { name: 'Matadouro',        lat: 38.9759, lon: -9.4202, scale: 0.50, camUrl: 'https://video-auth1.iol.pt/beachcam/matadouroskatepark/playlist.m3u8' },
      { name: 'Praia do Sul',     lat: 38.9592, lon: -9.4163, scale: 0.50, camUrl: 'https://video-auth1.iol.pt/beachcam/praiadosulericeira/playlist.m3u8' },
      { name: 'Foz do Lizandro',  lat: 38.9421, lon: -9.4161, scale: 0.50, camUrl: 'https://video-auth1.iol.pt/beachcam/fozdolizandro/playlist.m3u8' },
      { name: 'São Julião',       lat: 38.9320, lon: -9.4197, scale: 0.50, camUrl: 'https://video-auth1.iol.pt/beachcam/bcsaojuliao/playlist.m3u8' },
      { name: 'Praia Pequena',    lat: 38.8199, lon: -9.4741, scale: 0.50, camUrl: 'Devin Easter Egg Pequena.mov', camType: 'video' },
      { name: 'Praia Grande',     lat: 38.8131, lon: -9.4783, scale: 0.50 },
      { name: 'Praia do Guincho', lat: 38.7324, lon: -9.4726, scale: 0.50 },
      { name: 'São Pedro do Estoril', lat: 38.6936, lon: -9.3694, scale: 0.45 },
      { name: 'Carcavelos',         lat: 38.6796, lon: -9.3359, scale: 0.45, camUrl: 'https://video-auth1.iol.pt/beachcam/carcavelos/chunks.m3u8' },
      { name: 'Parede',           lat: 38.6857, lon: -9.3538, scale: 0.45 },
      { name: 'Praia de Torre',   lat: 38.6757, lon: -9.3230, scale: 0.45 },
      { name: 'Santo Amaro',      lat: 38.6848, lon: -9.3121, scale: 0.45 },
      { name: 'Paco de Arcos',    lat: 38.6905, lon: -9.2966, scale: 0.45 },
      { name: 'Praia de Caxias',  lat: 38.6987, lon: -9.2792, scale: 0.45 },
      { name: 'São João da Caparica', lat: 38.6562, lon: -9.2501, scale: 0.50 },
      { name: 'Costa da Caparica', lat: 38.6449, lon: -9.2419, scale: 0.50 },
      { name: 'Fonte da Telha',   lat: 38.5733, lon: -9.1969, scale: 0.50 },
      { name: 'Bicas',            lat: 38.4637, lon: -9.1929, scale: 0.50 },
      { name: 'Sesimbra',         lat: 38.4431, lon: -9.1052, scale: 0.45, camUrl: 'https://video-auth1.iol.pt/beachcam/sesimbra/playlist.m3u8' }, /* sheltered bay */
    ];

    var spotMarkers = [];
    SURF_SPOTS.forEach(function(spot, idx) {
      var spotIcon = L.divIcon({
        className: '',
        html: '<div class="spot-marker"><div class="spot-dot" id="mapDot' + idx + '"></div>'
            + '<div class="spot-label" id="mapLabel' + idx + '">' + spot.name.toUpperCase() + '</div></div>',
        iconSize: [80, 38], iconAnchor: [40, 7], popupAnchor: [0, -14],
      });
      var marker = L.marker([spot.lat, spot.lon], { icon: spotIcon, zIndexOffset: 200 }).addTo(map);
      marker.bindPopup('<strong>' + spot.name + '</strong><br><small style="opacity:0.7">Click to load forecast</small>',
        { closeButton: false, className: 'spot-popup', offset: [0, -14] });
      marker.on('mouseover', function() { marker.openPopup(); });
      marker.on('mouseout',  function() { marker.closePopup(); });
      marker.on('click', function(e) {
        L.DomEvent.stopPropagation(e);
        marker.closePopup();
        selectSpot(idx);
      });
      spotMarkers.push(marker);
    });

    var pinIcon = L.divIcon({
      className: '',
      html: '<div style="width:14px;height:14px;background:#CC0000;border:3px solid #fff;border-radius:50%;box-shadow:0 1px 6px rgba(0,102,0,0.6);"></div>',
      iconSize: [14, 14], iconAnchor: [7, 7],
    });

    /* ─── Spot selection ────────────────────────────────────── */
    function selectSpot(idx) {
      var spot = SURF_SPOTS[idx];
      /* If map-col is hidden (landing mode), make it visible first */
      var mapCol = document.querySelector('.map-col');
      if (mapCol.style.left === '-9999px' || mapCol.style.visibility === 'hidden') {
        mapCol.style.position = '';
        mapCol.style.left = '';
        mapCol.style.visibility = '';
        setTimeout(function() { map.invalidateSize(); }, 50);
      }
      map.flyTo([spot.lat, spot.lon], 14, { duration: 0.9 });
      placePin(spot.lat, spot.lon, spot.name);
      selScale = spot.scale != null ? spot.scale : 1.0;
      fetchForecast(spot.lat, spot.lon);
      /* Show cam toggle only for spots with a live cam */
      var toggle = document.getElementById('mapCamToggle');
      if (spot.camUrl) {
        toggle.style.display = 'flex';
      } else {
        toggle.style.display = 'none';
        switchMapCam('map');
      }
    }

    var _mapCamHls = null;
    function switchMapCam(mode) {
      var mapEl  = document.getElementById('map');
      var camEl  = document.getElementById('camView');
      var video  = document.getElementById('mapCamVideo');
      var errEl  = document.getElementById('mapCamError');
      var tabMap = document.getElementById('tabMap');
      var tabCam = document.getElementById('tabCam');
      if (mode === 'cam') {
        var selSpot = null;
        SURF_SPOTS.forEach(function(s) { if (s.name === selectedSpotName) selSpot = s; });
        if (!selSpot || !selSpot.camUrl) return;
        mapEl.style.display = 'none';
        camEl.style.display = 'block';
        errEl.style.display = 'none';
        video.style.display = 'block';
        tabMap.classList.remove('active');
        tabCam.classList.add('active');
        if (_mapCamHls) { _mapCamHls.destroy(); _mapCamHls = null; }
        /* Remove any existing easter egg image */
        var oldImg = camEl.querySelector('.cam-easter-img');
        if (oldImg) oldImg.remove();
        if (selSpot.camType === 'image') {
          video.style.display = 'none';
          var img = document.createElement('img');
          img.src = selSpot.camUrl;
          img.className = 'cam-easter-img';
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;object-position:top center;position:absolute;inset:0;';
          camEl.appendChild(img);
        } else if (selSpot.camType === 'video') {
          video.src = selSpot.camUrl;
          video.loop = true;
          video.style.display = 'block';
          video.play().catch(function() {});
        } else if (typeof Hls !== 'undefined' && Hls.isSupported()) {
          _mapCamHls = new Hls();
          _mapCamHls.loadSource(selSpot.camUrl);
          _mapCamHls.attachMedia(video);
          _mapCamHls.on(Hls.Events.ERROR, function(e, data) {
            if (data.fatal) { errEl.style.display = 'flex'; video.style.display = 'none'; }
          });
          video.play().catch(function() {});
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = selSpot.camUrl;
          video.play().catch(function() {});
        } else {
          errEl.style.display = 'flex'; video.style.display = 'none';
        }
      } else {
        camEl.style.display = 'none';
        mapEl.style.display = 'block';
        tabMap.classList.add('active');
        tabCam.classList.remove('active');
        video.pause(); video.src = '';
        if (_mapCamHls) { _mapCamHls.destroy(); _mapCamHls = null; }
        var oldImg2 = camEl.querySelector('.cam-easter-img');
        if (oldImg2) oldImg2.remove();
        setTimeout(function() { map.invalidateSize(); }, 50);
      }
    }

    var _camHls = null;
    function openCamModal(idx) {
      var spot = SURF_SPOTS[idx];
      if (!spot || !spot.camUrl) return;
      var modal = document.getElementById('camModal');
      var video = document.getElementById('camVideo');
      var errEl = document.getElementById('camError');
      var title = document.getElementById('camModalTitle');
      title.textContent = spot.name + ' — Live Cam';
      errEl.style.display = 'none';
      modal.style.display = 'flex';
      if (_camHls) { _camHls.destroy(); _camHls = null; }
      var oldModalImg = modal.querySelector('.cam-easter-img');
      if (oldModalImg) oldModalImg.remove();
      if (spot.camType === 'image') {
        video.style.display = 'none';
        var mImg = document.createElement('img');
        mImg.src = spot.camUrl;
        mImg.className = 'cam-easter-img';
        mImg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';
        modal.querySelector('[style*="padding-top:56.25%"]').appendChild(mImg);
      } else if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        _camHls = new Hls();
        _camHls.loadSource(spot.camUrl);
        _camHls.attachMedia(video);
        _camHls.on(Hls.Events.ERROR, function(e, data) {
          if (data.fatal) { errEl.style.display = 'flex'; video.style.display = 'none'; }
        });
        video.style.display = 'block';
        video.play().catch(function() {});
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = spot.camUrl;
        video.style.display = 'block';
        video.play().catch(function() {});
      } else {
        errEl.style.display = 'flex';
      }
    }
    function closeCamModal() {
      var modal = document.getElementById('camModal');
      var video = document.getElementById('camVideo');
      modal.style.display = 'none';
      video.pause(); video.src = ''; video.style.display = 'block';
      if (_camHls) { _camHls.destroy(); _camHls = null; }
      var oldModalImg2 = modal.querySelector('.cam-easter-img');
      if (oldModalImg2) oldModalImg2.remove();
    }
    document.getElementById('camModal').addEventListener('click', function(e) {
      if (e.target === this) closeCamModal();
    });

    function placePin(lat, lon, spotName) {
      selLat = lat; selLon = lon;
      selectedSpotName = spotName || (Math.abs(lat).toFixed(2) + '°' + (lat >= 0 ? 'N' : 'S'));
      if (pinMarker) pinMarker.remove();
      pinMarker = L.marker([lat, lon], { icon: pinIcon, zIndexOffset: 500 }).addTo(map);
      document.getElementById('mapCoordLabel').textContent = selectedSpotName;
      var sEl = document.getElementById('siteSpot');
      sEl.textContent = selectedSpotName;
      sEl.classList.remove('hidden');
    }


    /* ─── Go home ───────────────────────────────────────────── */
    var mapModeActive = false;
    function toggleMapMode() {
      var btn = document.getElementById('mapBtn');
      var layout = document.getElementById('pageLayout');
      if (mapModeActive) {
        /* Exit map mode → go back to landing */
        mapModeActive = false;
        btn.classList.remove('active');
        btn.textContent = 'Map';
        layout.classList.remove('map-mode');
        var mapCol = document.querySelector('.map-col');
        mapCol.style.position = 'fixed';
        mapCol.style.left = '-9999px';
        mapCol.style.visibility = 'hidden';
        goHome();
      } else {
        /* Enter map mode */
        mapModeActive = true;
        btn.classList.add('active');
        btn.textContent = 'Close';
        /* If cam view is active, restore map first so #map is visible */
        switchMapCam('map');
        /* Remove landing-mode so map-col CSS becomes visible, add map-mode */
        layout.classList.remove('landing-mode');
        document.body.classList.remove('landing-mode');
        layout.classList.add('map-mode');
        document.getElementById('statusBar').classList.add('hidden');
        document.getElementById('spotPicker').classList.add('hidden');
        document.getElementById('forecastSection').classList.add('hidden');
        document.getElementById('bottomSheet').classList.add('hidden');
        var mapCol = document.querySelector('.map-col');
        mapCol.removeAttribute('style');
        setTimeout(function() {
          map.invalidateSize();
          map.setView([39.02, -9.35], 9, { animate: false });
        }, 120);
      }
    }

    function goHome() {
      /* Stop particle animations */
      if (windFlowAnimId) { cancelAnimationFrame(windFlowAnimId); windFlowAnimId = null; }
      windMapToken++; /* invalidate any pending setTimeout in renderWindFlow */
      if (windMapInst) { windMapInst.remove(); windMapInst = null; }

      /* Reset cam state — switchMapCam('cam') hides #map and shows #camView with inline
         styles. goHome must undo this so map.flyTo() can run on a visible element. */
      var mapEl2  = document.getElementById('map');
      var camEl2  = document.getElementById('camView');
      var camVid2 = document.getElementById('mapCamVideo');
      if (mapEl2)  mapEl2.style.display  = '';
      if (camEl2)  camEl2.style.display  = '';
      if (camVid2) { camVid2.pause(); camVid2.src = ''; }
      if (_mapCamHls) { _mapCamHls.destroy(); _mapCamHls = null; }
      var eggImg = camEl2 && camEl2.querySelector('.cam-easter-img');
      if (eggImg) eggImg.remove();
      var tabMap2 = document.getElementById('tabMap');
      var tabCam2 = document.getElementById('tabCam');
      if (tabMap2) tabMap2.classList.add('active');
      if (tabCam2) tabCam2.classList.remove('active');
      var toggle2 = document.getElementById('mapCamToggle');
      if (toggle2) toggle2.style.display = 'none';

      /* Restore landing layout — remove map-mode first, then add landing-mode */
      var layout = document.getElementById('pageLayout');
      layout.classList.remove('map-mode');
      layout.classList.add('landing-mode');
      document.body.classList.remove('landing-mode');
      document.body.classList.add('landing-mode');
      mapModeActive = false;
      var btn = document.getElementById('mapBtn');
      if (btn) { btn.classList.remove('active'); btn.textContent = 'Map'; }
      var mapCol = document.getElementById('mapCol') || document.querySelector('.map-col');
      if (mapCol) mapCol.removeAttribute('style');
      setTimeout(function() { map.invalidateSize(); }, 80);

      /* Hide status bar, show picker, hide forecast */
      document.getElementById('statusBar').classList.add('hidden');
      document.getElementById('spotPicker').classList.remove('hidden');
      document.getElementById('forecastSection').classList.add('hidden');

      /* Reset mobile bottom sheet */
      document.getElementById('bottomSheet').classList.add('hidden');

      /* Reset header spot name */
      var sEl = document.getElementById('siteSpot');
      sEl.textContent = ''; sEl.classList.add('hidden');

      /* Reset map label & selection state */
      document.getElementById('mapCoordLabel').textContent = '';
      if (pinMarker) { pinMarker.remove(); pinMarker = null; }
      selLat = null; selLon = null; selectedSpotName = null;

      setStatus('Select a surf spot to load forecast.', 'idle');
      map.flyTo([39.02, -9.35], 9, { duration: 0.85 });
      filterSpots('ALL');

      var fc = document.getElementById('forecastCol');
      if (fc) fc.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /* ─── Fetch forecast ────────────────────────────────────── */
    var chartInst = null, windChartInst = null;
    var windFlowAnimId = null, tideChartInst = null;
    var windMapInst = null, windMapToken = 0;

    function fetchForecast(lat, lon) {
      /* Exit map mode if active */
      if (mapModeActive) {
        mapModeActive = false;
        var btn = document.getElementById('mapBtn');
        if (btn) { btn.classList.remove('active'); btn.textContent = 'Map'; }
        document.getElementById('pageLayout').classList.remove('map-mode');
      }
      /* Switch to forecast layout immediately */
      document.getElementById('pageLayout').classList.remove('landing-mode');
      document.body.classList.remove('landing-mode');
      setTimeout(function() { map.invalidateSize(); }, 80);

      /* Show status bar */
      document.getElementById('statusBar').classList.remove('hidden');
      setStatus('Fetching marine data…', 'loading');

      var marineUrl = 'https://marine-api.open-meteo.com/v1/marine'
        + '?latitude=' + lat + '&longitude=' + lon
        + '&hourly=wave_height,wave_period,wave_direction,wind_wave_height,swell_wave_height&forecast_days=7';
      var windUrl = 'https://api.open-meteo.com/v1/forecast'
        + '?latitude=' + lat + '&longitude=' + lon
        + '&hourly=windspeed_10m,winddirection_10m,windgusts_10m&forecast_days=7';

      Promise.all([
        fetch(marineUrl),
        fetch(windUrl).catch(function() { return null; }),
      ]).then(function(r) {
        if (!r[0].ok) throw new Error('Marine API HTTP ' + r[0].status);
        return Promise.all([
          r[0].json(),
          (r[1] && r[1].ok) ? r[1].json() : Promise.resolve(null),
        ]);
      }).then(function(p) {
        var data = p[0], windData = p[1];
        if (!data || !data.hourly || !data.hourly.time || !data.hourly.time.length)
          throw new Error('No marine data returned for this location.');
        var hasWaves = data.hourly.wave_height && data.hourly.wave_height.some(function(v) { return v != null; });
        if (!hasWaves) throw new Error('No wave data — try a coastal or open-ocean location.');

        /* Show forecast section (must be before canvas renders for correct clientWidth) */
        document.getElementById('spotPicker').classList.add('hidden');
        document.getElementById('forecastSection').classList.remove('hidden');
        var fc = document.getElementById('forecastCol');
        if (fc) fc.scrollTop = 0;

        updateHero(data, windData, lat, lon);
        renderTides(data);
        setTimeout(function() { if (tideChartInst) tideChartInst.resize(); }, 150);
        setTimeout(function() { if (tideChartInst) tideChartInst.resize(); }, 400);
        setTimeout(function() { if (tideChartInst) tideChartInst.resize(); }, 900);
        renderTimeline(data, windData);
        renderChart(data);
        renderWindChart(windData, data.hourly.time);
        renderWindFlow(windData);
        updateMapWindFromSpot(windData);
        updateMapSwellFromSpot(data);

        var latStr = Math.abs(lat).toFixed(2) + '° ' + (lat >= 0 ? 'N' : 'S');
        var lonStr = Math.abs(lon).toFixed(2) + '° ' + (lon >= 0 ? 'E' : 'W');
        setStatus('Forecast loaded · ' + latStr + ', ' + lonStr, 'ok');

        /* Scroll forecast panel back to top */
        var fc2 = document.getElementById('forecastCol');
        if (fc2) fc2.scrollTop = 0;
        window.scrollTo(0, 0);

      }).catch(function(err) {
        setStatus('Error: ' + err.message, 'error');
      });
    }

    /* ─── Update hero ────��──────────────────────────────────── */
    function updateHero(data, windData, lat, lon) {
      var now = Date.now();
      var ci = 0, minD = Infinity;
      data.hourly.time.forEach(function(t, i) {
        var d = Math.abs(new Date(t) - now);
        if (d < minD) { minD = d; ci = i; }
      });
      var sc     = selScale;
      var h      = ((data.hourly.wave_height       && data.hourly.wave_height[ci])    || 0) * sc;
      var p      =  data.hourly.wave_period       && data.hourly.wave_period[ci];
      var dir    =  data.hourly.wave_direction    && data.hourly.wave_direction[ci];
      var wh     =  data.hourly.wind_wave_height  && data.hourly.wind_wave_height[ci];
      var swellH =  data.hourly.swell_wave_height && data.hourly.swell_wave_height[ci];
      if (swellH != null) swellH = swellH * sc;

      /* Daily wave height range (today only, scaled) */
      var todayStr = new Date().toISOString().slice(0, 10);
      var todayHeights = [];
      (data.hourly.time || []).forEach(function(t, i) {
        if (t.slice(0, 10) === todayStr) {
          var v = data.hourly.wave_height && data.hourly.wave_height[i];
          if (v != null) todayHeights.push(v * sc);
        }
      });
      var waveMin = todayHeights.length ? Math.min.apply(null, todayHeights) : h;
      var waveMax = todayHeights.length ? Math.max.apply(null, todayHeights) : h;

      var waveNumEl = document.getElementById('waveNum');
      waveNumEl.textContent = waveMin.toFixed(1) + '–' + waveMax.toFixed(1);
      document.querySelector('.wave-unit').textContent = 'm';

      var swellPart = swellH != null ? ' · ' + swellH.toFixed(1) + 'm swell' : '';
      var swellSub = toCompass(dir) + ' swell · ' + (p != null ? p.toFixed(0) + 's period' : '—') + swellPart;
      document.getElementById('waveSub').textContent = swellSub;
      document.getElementById('statPeriod').textContent = p  != null ? p.toFixed(0)  + 's'  : '—';
      document.getElementById('statDir').textContent    = toCompass(dir);
      document.getElementById('statWind').textContent   = wh != null ? wh.toFixed(1) + 'm'  : '—';

      var ws = null, wd = null;
      if (windData && windData.hourly && windData.hourly.time && windData.hourly.time.length) {
        var wi = 0, minD2 = Infinity;
        windData.hourly.time.forEach(function(t, i) {
          var d = Math.abs(new Date(t) - now);
          if (d < minD2) { minD2 = d; wi = i; }
        });
        ws = windData.hourly.windspeed_10m    && windData.hourly.windspeed_10m[wi];
        wd = windData.hourly.winddirection_10m && windData.hourly.winddirection_10m[wi];
      }
      document.getElementById('statWindSpd').textContent = ws != null ? Math.round(ws) + ' km/h' : '—';
      document.getElementById('statWindDir').textContent = toCompass(wd);

      var heroBadge = document.getElementById('heroConditionBadge');
      if (heroBadge) {
        var heroLabel = getConditionLabel(h, p, wd, selectedSpotName);
        var heroColors = {
          'EPIC': { bg: '#7400B8', color: '#fff' },
          'GOOD': { bg: '#70E000', color: '#fff' },
          'FAIR': { bg: '#E85D04', color: '#fff' },
          'POOR': { bg: '#D00000', color: '#fff' },
          'FLAT': { bg: '#6A040F', color: 'rgba(255,255,255,0.7)' }
        };
        var hc = heroColors[heroLabel] || heroColors['FAIR'];
        heroBadge.textContent = heroLabel;
        heroBadge.style.backgroundColor = hc.bg;
        heroBadge.style.color = hc.color;
        heroBadge.classList.add('visible');
      }

      var latStr = Math.abs(lat).toFixed(4) + '° ' + (lat >= 0 ? 'N' : 'S');
      var lonStr = Math.abs(lon).toFixed(4) + '° ' + (lon >= 0 ? 'E' : 'W');
      document.getElementById('waveCoords').innerHTML = latStr + '<br>' + lonStr;

      document.getElementById('bsSpot').textContent = selectedSpotName || '';
      document.getElementById('bsWave').textContent = h.toFixed(1);
      document.getElementById('bsSub').textContent  = (p != null ? p.toFixed(0) + 's' : '—') + ' · ' + (ws != null ? Math.round(ws) + ' km/h wind' : '—');
      document.getElementById('bottomSheet').classList.remove('hidden');
    }

    /* ═══════════════════════════════════════════════════════════
       TIDES — Surfline-style raw canvas chart
    ═══════════════════════════════════════════════════════════ */
    function renderTides(data) {
      if (tideChartInst) { tideChartInst.destroy(); tideChartInst = null; }

      /* ── Synthetic semi-diurnal tides for Portuguese Atlantic coast ──
         Open-Meteo has no tide data, so we model tides using M2 harmonic
         constituent (period 12.42h). Phase shifts ~50 min/day.
         Portugal: MSL ~2.0m, spring amplitude ~1.4m (range ~0-3.4m)       */
      var now = new Date();
      var dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
      var phaseHr = (dayOfYear * 50 / 60) % 12.42; /* daily phase drift */
      var msl = 2.0, amp = 1.4;
      var todayHourly = [];
      for (var hr = 0; hr < 24; hr++) {
        var h = msl + amp * Math.cos(2 * Math.PI * (hr - phaseHr) / 12.42);
        todayHourly.push({ hr: hr, h: Math.max(0.1, parseFloat(h.toFixed(2)) ) });
      }

      /* ── Current tide (linear interpolation from hourly points) ── */
      var nowHr   = new Date().getHours() + new Date().getMinutes() / 60;
      var nowTide = todayHourly.length ? todayHourly[0].h : 0;
      for (var ni = 0; ni < todayHourly.length - 1; ni++) {
        if (nowHr >= todayHourly[ni].hr && nowHr <= todayHourly[ni + 1].hr) {
          var nf = (nowHr - todayHourly[ni].hr) / (todayHourly[ni + 1].hr - todayHourly[ni].hr);
          nowTide = todayHourly[ni].h + nf * (todayHourly[ni + 1].h - todayHourly[ni].h);
          break;
        }
      }

      /* ── Remove stale HTML overlays from previous approach ── */
      ['tidesLabelsOverlay', 'tidesNowOverlay'].forEach(function(id) {
        var el = document.getElementById(id); if (el) el.remove();
      });
      var ttEl  = document.getElementById('tidesTooltip');
      var dotEl = document.getElementById('tidesHoverDot');
      if (ttEl)  ttEl.style.display = 'none';
      if (dotEl) dotEl.style.display = 'none';

      var canvas = document.getElementById('tidesCanvas');
      if (!canvas) return;
      if (canvas._tidesMM) { canvas.removeEventListener('mousemove',  canvas._tidesMM); canvas._tidesMM = null; }
      if (canvas._tidesML) { canvas.removeEventListener('mouseleave', canvas._tidesML); canvas._tidesML = null; }

      var hrLabels = todayHourly.map(function(pt) { return pt.hr; });
      var hValues  = todayHourly.map(function(pt) { return pt.h;  });

      /* Mutable sun hours — captured by plugin closure, updated after fetch */
      var srHr = 7.0, ssHr = 20.0;

      function fmtHr(hr) {
        var hh = Math.floor(hr), mm = Math.round((hr - hh) * 60);
        var ap = hh < 12 ? 'am' : 'pm', h = hh % 12 || 12;
        return h + (mm ? ':' + (mm < 10 ? '0' : '') + mm : '') + ap;
      }

      tideChartInst = new Chart(canvas, {
        type: 'line',
        data: {
          labels: hrLabels,
          datasets: [{
            data: hValues,
            borderColor: '#5E60CE',
            borderWidth: 2,
            fill: true,
            backgroundColor: function(context) {
              var ch = context.chart, ca = ch.chartArea;
              if (!ca) return 'rgba(94,96,206,0.08)';
              var g = ch.ctx.createLinearGradient(0, ca.top, 0, ca.bottom);
              g.addColorStop(0, 'rgba(94,96,206,0.12)');
              g.addColorStop(1, 'rgba(94,96,206,0.03)');
              return g;
            },
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#ffffff',
            pointHoverBorderColor: '#5E60CE',
            pointHoverBorderWidth: 2,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          layout: { padding: { top: 36, bottom: 4 } },
          scales: {
            x: {
              type: 'linear',
              min: 0, max: 23,
              ticks: {
                stepSize: 3, autoSkip: false, maxRotation: 0,
                callback: function(val) {
                  var m = { 3:'3am', 6:'6am', 9:'9am', 12:'Noon', 15:'3pm', 18:'6pm', 21:'9pm' };
                  return m[val] !== undefined ? m[val] : '';
                },
                font: { family: '"DM Mono", monospace', size: 10 },
                color: '#999',
              },
              grid:   { display: false },
              border: { color: '#e8e8e8', width: 1 },
            },
            y: { display: false, grace: '60%' },
          },
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false },
          },
        },
        plugins: [
          {
            /* White background + night-zone shading */
            id: 'tideBackground',
            beforeDatasetsDraw: function(chart) {
              var ctx2 = chart.ctx, ca = chart.chartArea, xs = chart.scales.x;
              ctx2.save();
              ctx2.fillStyle = '#ffffff';
              ctx2.fillRect(0, 0, chart.width, chart.height);
              ctx2.fillStyle = 'rgba(0,0,0,0.05)';
              var srX = xs.getPixelForValue(srHr), ssX = xs.getPixelForValue(ssHr);
              if (srX > ca.left)  ctx2.fillRect(ca.left,              ca.top, Math.min(srX, ca.right) - ca.left,              ca.height);
              if (ssX < ca.right) ctx2.fillRect(Math.max(ssX, ca.left), ca.top, ca.right - Math.max(ssX, ca.left), ca.height);
              ctx2.restore();
            },
          },
          {
            /* NOW dashed line + pill */
            id: 'tideNowLine',
            afterDatasetsDraw: function(chart) {
              var ctx2 = chart.ctx, ca = chart.chartArea, xs = chart.scales.x;
              var nowX = xs.getPixelForValue(nowHr);
              if (nowX < ca.left || nowX > ca.right) return;
              ctx2.save();
              ctx2.setLineDash([4, 4]);
              ctx2.strokeStyle = 'rgba(94,96,206,0.5)'; ctx2.lineWidth = 1;
              ctx2.beginPath(); ctx2.moveTo(nowX, ca.top); ctx2.lineTo(nowX, ca.bottom); ctx2.stroke();
              ctx2.setLineDash([]);
              /* Pill */
              var txt = nowTide.toFixed(1) + 'm';
              ctx2.font = 'bold 9px "DM Mono", monospace';
              ctx2.textAlign = 'center';
              var tw = ctx2.measureText(txt).width, pw = tw + 14, ph = 16, r = 8;
              var bx = nowX - pw / 2, by = ca.top - ph - 6;
              ctx2.fillStyle = '#5E60CE';
              ctx2.beginPath();
              ctx2.moveTo(bx + r, by); ctx2.lineTo(bx + pw - r, by);
              ctx2.quadraticCurveTo(bx + pw, by,      bx + pw, by + r);
              ctx2.lineTo(bx + pw, by + ph - r);
              ctx2.quadraticCurveTo(bx + pw, by + ph, bx + pw - r, by + ph);
              ctx2.lineTo(bx + r,  by + ph);
              ctx2.quadraticCurveTo(bx, by + ph, bx, by + ph - r);
              ctx2.lineTo(bx, by + r);
              ctx2.quadraticCurveTo(bx, by, bx + r, by);
              ctx2.closePath(); ctx2.fill();
              ctx2.fillStyle = '#ffffff'; ctx2.textBaseline = 'middle';
              ctx2.fillText(txt, nowX, by + ph / 2);
              ctx2.font = '7px "DM Mono", monospace';
              ctx2.fillStyle = 'rgba(94,96,206,0.65)'; ctx2.textBaseline = 'bottom';
              ctx2.fillText('NOW', nowX, ca.top - 2);
              ctx2.restore();
            },
          },
          {
            /* High / low labels drawn directly on the chart canvas */
            id: 'tidePeakLabels',
            afterDraw: function(chart) {
              var ctx2     = chart.ctx;
              var chartData = chart.data.datasets[0].data;
              var xs = chart.scales.x, ys = chart.scales.y;
              ctx2.save();
              ctx2.textAlign = 'center';
              for (var i = 1; i < chartData.length - 1; i++) {
                var prev = chartData[i - 1], curr = chartData[i], next = chartData[i + 1];
                var isPeak   = curr > prev && curr > next;
                var isTrough = curr < prev && curr < next;
                if (!isPeak && !isTrough) continue;
                var px  = xs.getPixelForValue(chart.data.labels[i]);
                var py  = ys.getPixelForValue(curr);
                var tStr = fmtHr(chart.data.labels[i]);
                var hStr = curr.toFixed(1) + 'm';
                if (isPeak) {
                  /* time string (top line) — 10px #555 */
                  ctx2.font = '10px "DM Mono", monospace'; ctx2.fillStyle = '#555';
                  ctx2.textBaseline = 'bottom';
                  ctx2.fillText(tStr, px, py - 20 - 12);
                  /* height string 12px below (bottom line) — 11px #222 */
                  ctx2.font = '11px "DM Mono", monospace'; ctx2.fillStyle = '#222';
                  ctx2.fillText(hStr, px, py - 20);
                } else {
                  /* time string (top line) — 10px #555 */
                  ctx2.font = '10px "DM Mono", monospace'; ctx2.fillStyle = '#555';
                  ctx2.textBaseline = 'top';
                  ctx2.fillText(tStr, px, py + 20);
                  /* height string 12px below — 11px #222 */
                  ctx2.font = '11px "DM Mono", monospace'; ctx2.fillStyle = '#222';
                  ctx2.fillText(hStr, px, py + 32);
                }
              }
              ctx2.restore();
            },
          },
          {
            /* Interactive hover: vertical dashed line + interpolated tide pill */
            id: 'tideHoverLine',
            afterDraw: function(chart) {
              if (chart._hoverX == null) return;
              var ctx2 = chart.ctx, ca = chart.chartArea;
              var xs = chart.scales.x, ys = chart.scales.y;
              var hx = chart._hoverX;
              if (hx < ca.left || hx > ca.right) return;
              var dataVal = xs.getValueForPixel(hx);
              /* Interpolate tide height at cursor position */
              var labels = chart.data.labels;
              var vals   = chart.data.datasets[0].data;
              var tideH  = vals[0];
              for (var i = 0; i < labels.length - 1; i++) {
                if (dataVal >= labels[i] && dataVal <= labels[i + 1]) {
                  var frac = (dataVal - labels[i]) / (labels[i + 1] - labels[i]);
                  tideH = vals[i] + frac * (vals[i + 1] - vals[i]);
                  break;
                }
              }
              ctx2.save();
              /* Vertical dashed line */
              ctx2.setLineDash([4, 4]);
              ctx2.strokeStyle = 'rgba(180,120,240,0.75)';
              ctx2.lineWidth = 1;
              ctx2.beginPath();
              ctx2.moveTo(hx, ca.top);
              ctx2.lineTo(hx, ca.bottom);
              ctx2.stroke();
              ctx2.setLineDash([]);
              /* Dot on the curve */
              var dotY = ys.getPixelForValue(tideH);
              ctx2.beginPath();
              ctx2.arc(hx, dotY, 4, 0, Math.PI * 2);
              ctx2.fillStyle = '#ffffff';
              ctx2.fill();
              ctx2.strokeStyle = '#5E60CE';
              ctx2.lineWidth = 2;
              ctx2.stroke();
              /* Pill label: "3:30pm  1.8m" */
              var hh = Math.floor(dataVal), mm = Math.round((dataVal - hh) * 60);
              if (mm === 60) { hh += 1; mm = 0; }
              var ap = hh < 12 ? 'am' : 'pm', h12 = hh % 12 || 12;
              var timeStr = h12 + ':' + (mm < 10 ? '0' : '') + mm + ap;
              var txt = timeStr + '  ' + tideH.toFixed(1) + 'm';
              ctx2.font = 'bold 9px "DM Mono", monospace';
              ctx2.textAlign = 'center';
              var tw = ctx2.measureText(txt).width, pw = tw + 16, ph = 16, r = 8;
              var pillX = Math.max(ca.left + pw / 2, Math.min(ca.right - pw / 2, hx));
              var bx = pillX - pw / 2, by = ca.top - ph - 6;
              ctx2.fillStyle = 'rgba(40,12,70,0.9)';
              ctx2.beginPath();
              ctx2.moveTo(bx + r, by); ctx2.lineTo(bx + pw - r, by);
              ctx2.quadraticCurveTo(bx + pw, by,      bx + pw, by + r);
              ctx2.lineTo(bx + pw, by + ph - r);
              ctx2.quadraticCurveTo(bx + pw, by + ph, bx + pw - r, by + ph);
              ctx2.lineTo(bx + r,  by + ph);
              ctx2.quadraticCurveTo(bx, by + ph, bx, by + ph - r);
              ctx2.lineTo(bx, by + r);
              ctx2.quadraticCurveTo(bx, by, bx + r, by);
              ctx2.closePath(); ctx2.fill();
              ctx2.fillStyle = '#ffffff'; ctx2.textBaseline = 'middle';
              ctx2.fillText(txt, pillX, by + ph / 2);
              ctx2.restore();
            },
          },
        ],
      });

      /* ── Hover interaction: vertical line follows mouse ── */
      canvas._tidesMM = function(e) {
        var rect = canvas.getBoundingClientRect();
        tideChartInst._hoverX = e.clientX - rect.left;
        tideChartInst.update('none');
      };
      canvas._tidesML = function() {
        tideChartInst._hoverX = null;
        tideChartInst.update('none');
      };
      canvas.addEventListener('mousemove',  canvas._tidesMM);
      canvas.addEventListener('mouseleave', canvas._tidesML);

      /* ── Fetch real sun times; update chart night-zone shading ── */
      if (selLat !== null && selLon !== null) {
        var sunUrl = 'https://api.open-meteo.com/v1/forecast?latitude=' + selLat
          + '&longitude=' + selLon
          + '&daily=sunrise,sunset&timezone=auto&forecast_days=1';
        fetch(sunUrl).then(function(r) { return r.json(); }).then(function(d) {
          if (!d || !d.daily) return;
          var srStr = d.daily.sunrise && d.daily.sunrise[0];
          var ssStr = d.daily.sunset  && d.daily.sunset[0];
          function fmtSun(isoStr) {
            if (!isoStr) return '—';
            var dt = new Date(isoStr);
            var hh = dt.getHours(), mm = dt.getMinutes();
            var ap = hh < 12 ? 'am' : 'pm', h = hh % 12 || 12;
            return h + ':' + String(mm).padStart(2, '0') + ap;
          }
          function addMin(isoStr, mins) {
            if (!isoStr) return null;
            return new Date(new Date(isoStr).getTime() + mins * 60000).toISOString();
          }
          document.getElementById('sunFirstLight').textContent = fmtSun(addMin(srStr, -30));
          document.getElementById('sunRise').textContent       = fmtSun(srStr);
          document.getElementById('sunSet').textContent        = fmtSun(ssStr);
          document.getElementById('sunLastLight').textContent  = fmtSun(addMin(ssStr, 30));
          srHr = srStr ? new Date(srStr).getHours() + new Date(srStr).getMinutes() / 60 : 7;
          ssHr = ssStr ? new Date(ssStr).getHours() + new Date(ssStr).getMinutes() / 60 : 20;
          if (tideChartInst) tideChartInst.update();
        }).catch(function() {});
      }
    }

    /* ─── Timeline ──────────────────────────────────────────── */
    function renderTimeline(data, windData) {
      var scroll = document.getElementById('tlScroll');
      scroll.innerHTML = '';
      var times = data.hourly.time;
      var allH  = (data.hourly.wave_height || []).map(function(v) { return v != null ? v * selScale : v; });
      var validH = allH.filter(function(v) { return v != null; });
      var maxH  = Math.max(0.01, Math.max.apply(null, validH));
      var avgH  = validH.reduce(function(a, b) { return a + b; }, 0) / (validH.length || 1);
      var now   = Date.now();

      var windByTime = {};
      if (windData && windData.hourly && windData.hourly.time) {
        windData.hourly.time.forEach(function(t, i) {
          windByTime[t] = {
            ws: windData.hourly.windspeed_10m    && windData.hourly.windspeed_10m[i],
            wd: windData.hourly.winddirection_10m && windData.hourly.winddirection_10m[i],
          };
        });
      }

      var idxs = times.reduce(function(acc, t, i) {
        if (new Date(t).getUTCHours() % 3 === 0) acc.push(i);
        return acc;
      }, []);

      if (idxs.length > 0) {
        var a = new Date(times[idxs[0]]);
        var b = new Date(times[idxs[idxs.length - 1]]);
        document.getElementById('tlRange').textContent =
          MONTHS[a.getUTCMonth()] + ' ' + a.getUTCDate() + ' — ' +
          MONTHS[b.getUTCMonth()] + ' ' + b.getUTCDate();
      }

      var nowIdx = idxs[0], minDiff = Infinity;
      idxs.forEach(function(i) {
        var d = Math.abs(new Date(times[i]) - now);
        if (d < minDiff) { minDiff = d; nowIdx = i; }
      });

      var prevDay = -1, nowEl = null;
      idxs.forEach(function(idx, ci) {
        var d   = new Date(times[idx]);
        var h   = allH[idx];
        var p   = data.hourly.wave_period    && data.hourly.wave_period[idx];
        var dir = data.hourly.wave_direction && data.hourly.wave_direction[idx];
        var pct = ((h || 0) / maxH * 100).toFixed(0);
        var isNow = (idx === nowIdx);
        var dayChange = (d.getUTCDay() !== prevDay);
        prevDay = d.getUTCDay();
        var wEntry = windByTime[times[idx]] || {};
        var barClass = (h || 0) >= avgH * 1.3 ? 'high' : (h || 0) >= avgH * 0.7 ? 'med' : 'low';
        var el = document.createElement('div');
        el.className = 'tl-item' + (isNow ? ' now' : '') + (dayChange && ci > 0 ? ' day-start' : '');
        el.innerHTML =
          '<div class="tl-day">' + (dayChange ? DAYS[d.getUTCDay()] : '') + '</div>'
          + '<div class="tl-time">' + String(d.getUTCHours()).padStart(2,'0') + ':00</div>'
          + '<div class="tl-bar-wrap"><div class="tl-bar ' + barClass + '" style="height:' + pct + '%"></div></div>'
          + '<div class="tl-h">' + (h != null ? h.toFixed(1) : '—') + '<span class="tl-hunit">m</span></div>'
          + '<div class="tl-p">' + (p != null ? p.toFixed(0) + 's' : '—') + '</div>'
          + '<div class="tl-d">' + toCompass(dir) + '</div>'
          + '<div class="tl-ws">' + (wEntry.ws != null ? Math.round(wEntry.ws) + '<span class="tl-hunit">kph</span>' : '—') + '</div>'
          + '<div class="tl-wd">' + toCompass(wEntry.wd) + '</div>';
        scroll.appendChild(el);
        if (isNow) nowEl = el;
      });
      if (nowEl) setTimeout(function() {
        /* Scroll timeline strip horizontally to centre "now" — never touches forecastCol */
        var sc = nowEl.parentElement;
        if (sc) sc.scrollLeft = nowEl.offsetLeft - sc.clientWidth / 2 + nowEl.offsetWidth / 2;
      }, 220);
    }

    /* ─── Wave chart ────────────────────────────────────────── */
    /* ─── Shared hover plugin factory for line charts ────────── */
    function makeChartHoverPlugin(times, values, nowIdx, fmtVal) {
      return {
        id: 'chartHoverLine',
        afterDraw: function(chart) {
          var ctx2 = chart.ctx, ca = chart.chartArea;
          var xs = chart.scales.x, ys = chart.scales.y;

          /* ── Static NOW line ── */
          var nowX = xs.getPixelForValue(nowIdx);
          if (nowX >= ca.left && nowX <= ca.right) {
            ctx2.save();
            ctx2.setLineDash([4, 4]);
            ctx2.strokeStyle = 'rgba(94,96,206,0.45)';
            ctx2.lineWidth = 1;
            ctx2.beginPath(); ctx2.moveTo(nowX, ca.top); ctx2.lineTo(nowX, ca.bottom); ctx2.stroke();
            ctx2.setLineDash([]);
            var nowVal = values[nowIdx];
            if (nowVal != null) {
              var txt = fmtVal(nowVal);
              ctx2.font = 'bold 9px "DM Mono", monospace';
              ctx2.textAlign = 'center';
              var tw = ctx2.measureText(txt).width, pw = tw + 14, ph = 16, r = 8;
              var bx = nowX - pw / 2, by = ca.top - ph - 6;
              ctx2.fillStyle = '#5E60CE';
              ctx2.beginPath();
              ctx2.moveTo(bx+r,by); ctx2.lineTo(bx+pw-r,by);
              ctx2.quadraticCurveTo(bx+pw,by,bx+pw,by+r);
              ctx2.lineTo(bx+pw,by+ph-r);
              ctx2.quadraticCurveTo(bx+pw,by+ph,bx+pw-r,by+ph);
              ctx2.lineTo(bx+r,by+ph);
              ctx2.quadraticCurveTo(bx,by+ph,bx,by+ph-r);
              ctx2.lineTo(bx,by+r);
              ctx2.quadraticCurveTo(bx,by,bx+r,by); ctx2.closePath(); ctx2.fill();
              ctx2.fillStyle = '#fff'; ctx2.textBaseline = 'middle';
              ctx2.fillText(txt, nowX, by + ph / 2);
              ctx2.font = '7px "DM Mono", monospace';
              ctx2.fillStyle = 'rgba(94,96,206,0.65)'; ctx2.textBaseline = 'bottom';
              ctx2.fillText('NOW', nowX, ca.top - 2);
            }
            ctx2.restore();
          }

          /* ── Hover line ── */
          if (chart._hoverX == null) return;
          var hx = chart._hoverX;
          if (hx < ca.left || hx > ca.right) return;
          var hIdx = Math.round(xs.getValueForPixel(hx));
          hIdx = Math.max(0, Math.min(values.length - 1, hIdx));
          var hVal = values[hIdx];
          var hxSnapped = xs.getPixelForValue(hIdx);

          ctx2.save();
          ctx2.setLineDash([4, 4]);
          ctx2.strokeStyle = 'rgba(180,120,240,0.75)';
          ctx2.lineWidth = 1;
          ctx2.beginPath(); ctx2.moveTo(hxSnapped, ca.top); ctx2.lineTo(hxSnapped, ca.bottom); ctx2.stroke();
          ctx2.setLineDash([]);

          if (hVal != null) {
            var dotY = ys.getPixelForValue(hVal);
            ctx2.beginPath(); ctx2.arc(hxSnapped, dotY, 4, 0, Math.PI * 2);
            ctx2.fillStyle = '#fff'; ctx2.fill();
            ctx2.strokeStyle = '#5E60CE'; ctx2.lineWidth = 2; ctx2.stroke();

            var d = new Date(times[hIdx]);
            var z = function(v) { return String(v).padStart(2, '0'); };
            var timeStr = DAYS[d.getUTCDay()] + ' ' + z(d.getUTCHours()) + ':00';
            var ptxt = timeStr + '  ' + fmtVal(hVal);
            ctx2.font = 'bold 9px "DM Mono", monospace';
            ctx2.textAlign = 'center';
            var ptw = ctx2.measureText(ptxt).width, ppw = ptw + 16, pph = 16, prr = 8;
            var pillX = Math.max(ca.left + ppw / 2, Math.min(ca.right - ppw / 2, hxSnapped));
            var pbx = pillX - ppw / 2, pby = ca.top - pph - 6;
            ctx2.fillStyle = 'rgba(40,12,70,0.9)';
            ctx2.beginPath();
            ctx2.moveTo(pbx+prr,pby); ctx2.lineTo(pbx+ppw-prr,pby);
            ctx2.quadraticCurveTo(pbx+ppw,pby,pbx+ppw,pby+prr);
            ctx2.lineTo(pbx+ppw,pby+pph-prr);
            ctx2.quadraticCurveTo(pbx+ppw,pby+pph,pbx+ppw-prr,pby+pph);
            ctx2.lineTo(pbx+prr,pby+pph);
            ctx2.quadraticCurveTo(pbx,pby+pph,pbx,pby+pph-prr);
            ctx2.lineTo(pbx,pby+prr);
            ctx2.quadraticCurveTo(pbx,pby,pbx+prr,pby); ctx2.closePath(); ctx2.fill();
            ctx2.fillStyle = '#fff'; ctx2.textBaseline = 'middle';
            ctx2.fillText(ptxt, pillX, pby + pph / 2);
          }
          ctx2.restore();
        },
      };
    }

    function renderChart(data) {
      var times = data.hourly.time;
      var hData = (data.hourly.wave_height || []).map(function(v) { return v != null ? v * selScale : v; });
      var labels = times.map(function(t) {
        var d = new Date(t), h = d.getUTCHours();
        return h === 0 ? DAYS[d.getUTCDay()] : h === 12 ? '12' : '';
      });
      var ctx2 = document.getElementById('waveChart').getContext('2d');
      if (chartInst) { chartInst.destroy(); chartInst = null; }
      var grad = ctx2.createLinearGradient(0, 0, 0, 260);
      grad.addColorStop(0, 'rgba(94,96,206,0.22)'); grad.addColorStop(1, 'rgba(94,96,206,0)');
      /* ── Find NOW index ── */
      var nowMs2 = Date.now();
      var nowIdx2 = 0, minD2 = Infinity;
      times.forEach(function(t, i) { var d = Math.abs(new Date(t) - nowMs2); if (d < minD2) { minD2 = d; nowIdx2 = i; } });

      chartInst = new Chart(ctx2, {
        type: 'line',
        data: { labels: labels, datasets: [{ data: hData, borderColor: '#5E60CE', borderWidth: 2, backgroundColor: grad, fill: true, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: '#5E60CE', pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2, tension: 0.35, spanGaps: true }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          layout: { padding: { top: 52 } },
          interaction: { mode: 'index', intersect: false },
          animation: { duration: 700, easing: 'easeOutCubic' },
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: { x: { grid: { display: false }, border: { color: 'rgba(0,0,0,0.1)' }, ticks: { color: 'rgba(0,0,0,0.4)', font: { family: "'DM Mono', monospace", size: 10 }, maxRotation: 0, autoSkip: false } }, y: { grid: { color: 'rgba(0,0,0,0.06)', drawTicks: false }, border: { display: false }, ticks: { color: 'rgba(0,0,0,0.4)', font: { family: "'DM Mono', monospace", size: 10 }, callback: function(v) { return v.toFixed(1) + 'm'; } }, beginAtZero: true } },
        },
        plugins: [makeChartHoverPlugin(times, hData, nowIdx2, function(v) { return v.toFixed(2) + 'm'; })],
      });

      /* Attach hover listeners */
      var wCanvas = document.getElementById('waveChart');
      if (wCanvas._hoverMM) wCanvas.removeEventListener('mousemove', wCanvas._hoverMM);
      if (wCanvas._hoverML) wCanvas.removeEventListener('mouseleave', wCanvas._hoverML);
      wCanvas._hoverMM = function(e) { var r = wCanvas.getBoundingClientRect(); chartInst._hoverX = e.clientX - r.left; chartInst.update('none'); };
      wCanvas._hoverML = function() { chartInst._hoverX = null; chartInst.update('none'); };
      wCanvas.addEventListener('mousemove', wCanvas._hoverMM);
      wCanvas.addEventListener('mouseleave', wCanvas._hoverML);
    }

    /* ─── Wind speed chart ──────────────────────────────────── */
    function renderWindChart(windData) {
      var section = document.getElementById('windChartSection');
      if (!windData || !windData.hourly || !windData.hourly.time || !windData.hourly.time.length) { section.style.display = 'none'; return; }
      section.style.display = '';
      var wTimes = windData.hourly.time, wsData = windData.hourly.windspeed_10m || [], wgData = windData.hourly.windgusts_10m || [];
      var hasGusts = wgData.some(function(v) { return v != null; });
      var wLabels = wTimes.map(function(t) { var d = new Date(t), h = d.getUTCHours(); return h === 0 ? DAYS[d.getUTCDay()] : h === 12 ? '12' : ''; });
      var ctx2 = document.getElementById('windChart').getContext('2d');
      if (windChartInst) { windChartInst.destroy(); windChartInst = null; }
      var grad = ctx2.createLinearGradient(0, 0, 0, 260);
      grad.addColorStop(0, 'rgba(94,96,206,0.18)'); grad.addColorStop(1, 'rgba(94,96,206,0)');
      var datasets = [{ label: 'Wind Speed', data: wsData, borderColor: '#5E60CE', borderWidth: 2, backgroundColor: grad, fill: true, pointRadius: 0, pointHoverRadius: 4, pointHoverBackgroundColor: '#5E60CE', pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2, tension: 0.35, spanGaps: true, order: 2 }];
      if (hasGusts) datasets.push({ label: 'Gusts', data: wgData, borderColor: 'rgba(116,0,184,0.22)', borderWidth: 1.5, borderDash: [5, 4], backgroundColor: 'transparent', fill: false, pointRadius: 0, pointHoverRadius: 3, tension: 0.35, spanGaps: true, order: 1 });
      /* ── Find NOW index ── */
      var nowMsW = Date.now();
      var nowIdxW = 0, minDW = Infinity;
      wTimes.forEach(function(t, i) { var d = Math.abs(new Date(t) - nowMsW); if (d < minDW) { minDW = d; nowIdxW = i; } });

      windChartInst = new Chart(ctx2, {
        type: 'line',
        data: { labels: wLabels, datasets: datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          layout: { padding: { top: 52 } },
          interaction: { mode: 'index', intersect: false },
          animation: { duration: 700, easing: 'easeOutCubic' },
          plugins: { legend: { display: hasGusts, labels: { color: 'rgba(0,0,0,0.5)', font: { family: "'DM Mono', monospace", size: 10 }, boxWidth: 20, padding: 12 } }, tooltip: { enabled: false } },
          scales: { x: { grid: { display: false }, border: { color: 'rgba(0,0,0,0.1)' }, ticks: { color: 'rgba(0,0,0,0.4)', font: { family: "'DM Mono', monospace", size: 10 }, maxRotation: 0, autoSkip: false } }, y: { grid: { color: 'rgba(0,0,0,0.06)', drawTicks: false }, border: { display: false }, ticks: { color: 'rgba(0,0,0,0.4)', font: { family: "'DM Mono', monospace", size: 10 }, callback: function(v) { return v.toFixed(0) + ' kph'; } }, beginAtZero: true } },
        },
        plugins: [makeChartHoverPlugin(wTimes, wsData, nowIdxW, function(v) { return v.toFixed(1) + ' km/h'; })],
      });

      /* Attach hover listeners */
      var wndCanvas = document.getElementById('windChart');
      if (wndCanvas._hoverMM) wndCanvas.removeEventListener('mousemove', wndCanvas._hoverMM);
      if (wndCanvas._hoverML) wndCanvas.removeEventListener('mouseleave', wndCanvas._hoverML);
      wndCanvas._hoverMM = function(e) { var r = wndCanvas.getBoundingClientRect(); windChartInst._hoverX = e.clientX - r.left; windChartInst.update('none'); };
      wndCanvas._hoverML = function() { windChartInst._hoverX = null; windChartInst.update('none'); };
      wndCanvas.addEventListener('mousemove', wndCanvas._hoverMM);
      wndCanvas.addEventListener('mouseleave', wndCanvas._hoverML);
    }

    /* ══════════════════════════════════════════════════════════
       SHARED particle color — Windy.com style
       0-20 kph: green, 20-40: yellow, 40-60: orange, 60+: red/purple
    ══════════════════════════════════════════════════════════ */
    function windyColor(ws, alpha) {
      var r, g, b;
      if (ws < 20) {
        /* green */
        r = 0; g = 200; b = 0;
      } else if (ws < 40) {
        /* green → yellow */
        var u = (ws - 20) / 20;
        r = Math.round(0   + 255 * u);
        g = Math.round(200 + 55  * u);
        b = 0;
      } else if (ws < 60) {
        /* yellow → orange */
        var u2 = (ws - 40) / 20;
        r = 255;
        g = Math.round(255 - 145 * u2);
        b = 0;
      } else {
        /* orange → red → purple */
        var u3 = Math.min((ws - 60) / 40, 1);
        r = Math.round(255 - 100 * u3);
        g = 0;
        b = Math.round(100 * u3);
      }
      return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha.toFixed(2) + ')';
    }

    /* Swell line colour — height-based spectrum, returns {r,g,b} object */
    function swellColor(wh) {
      if (wh < 0.5)  return { r:100, g:120, b:160 };  /* muted steel     */
      if (wh < 1.0)  return { r:60,  g:90,  b:180 };  /* navy-blue       */
      if (wh < 1.5)  return { r:30,  g:60,  b:200 };  /* deep navy       */
      if (wh < 2.0)  return { r:20,  g:80,  b:220 };  /* navy-cobalt     */
      if (wh < 3.0)  return { r:40,  g:130, b:255 };  /* bright blue     */
      if (wh < 5.0)  return { r:255, g:160, b:0   };  /* orange (big)    */
      return               { r:220, g:0,   b:60  };   /* red (XXL)       */
    }

    /* Speed-band particle color used by both particle systems */
    function windParticleColor(ws, alpha) {
      if      (ws < 20) return 'rgba(0,200,100,'  + alpha.toFixed(2) + ')';
      else if (ws < 40) return 'rgba(255,200,0,'  + alpha.toFixed(2) + ')';
      else if (ws < 60) return 'rgba(255,100,0,'  + alpha.toFixed(2) + ')';
      else              return 'rgba(255,30,30,'   + alpha.toFixed(2) + ')';
    }
    /* Wind quality color — combines direction (windType) + speed
       Purple=epic, Teal=great, Green=good, Yellow=ok, Orange=bad, Red=poor, DarkRed=unsurfable
       windType: 'offshore'|'cross-off'|'cross'|'cross-on'|'onshore'
       ws: wind speed in kph */
    function windQualityColor(ws, windType, alpha) {
      var a = alpha.toFixed(2);
      /* Score matrix rows=windType, cols=speed band */
      /* speed bands: calm<10, mid 10-25, strong>25 */
      var calm   = ws < 10;
      var mid    = ws >= 10 && ws < 25;
      /* strong = ws >= 25 */
      if (windType === 'offshore') {
        if (calm) return 'rgba(123,47,190,'  + a + ')'; /* purple  */
        if (mid)  return 'rgba(0,210,200,'   + a + ')'; /* teal    */
        return          'rgba(0,180,80,'     + a + ')'; /* green   */
      }
      if (windType === 'cross-off') {
        if (calm) return 'rgba(0,210,200,'   + a + ')'; /* teal    */
        if (mid)  return 'rgba(0,180,80,'    + a + ')'; /* green   */
        return          'rgba(230,200,0,'    + a + ')'; /* yellow  */
      }
      if (windType === 'cross') {
        if (calm) return 'rgba(0,180,80,'    + a + ')'; /* green   */
        if (mid)  return 'rgba(230,200,0,'   + a + ')'; /* yellow  */
        return          'rgba(255,110,0,'    + a + ')'; /* orange  */
      }
      if (windType === 'cross-on') {
        if (calm) return 'rgba(230,200,0,'   + a + ')'; /* yellow  */
        if (mid)  return 'rgba(255,110,0,'   + a + ')'; /* orange  */
        return          'rgba(220,30,30,'    + a + ')'; /* red     */
      }
      /* onshore */
      if (calm) return   'rgba(255,110,0,'   + a + ')'; /* orange  */
      if (mid)  return   'rgba(220,30,30,'   + a + ')'; /* red     */
      return             'rgba(140,0,0,'     + a + ')'; /* darkred */
    }
    /* Global average wind quality color across all spots for main map */
    var mapWnd_qualityColor = 'rgba(0,180,80,'; /* default green, updated after spot fetch */

    /* ═══════════════════════════════════════════════════════════
       WIND FLOW — Leaflet map + particle canvas overlay (Windy-style)
    ═══════════════════════════════════════════════════════════ */
    function renderWindFlow(windData) {
      /* Cancel any running animation */
      if (windFlowAnimId) { cancelAnimationFrame(windFlowAnimId); windFlowAnimId = null; }
      windMapToken++;
      var myToken = windMapToken;
      if (windMapInst) { windMapInst.remove(); windMapInst = null; }

      var section = document.getElementById('windFlowSection');
      if (!windData || !windData.hourly || !windData.hourly.time || !windData.hourly.time.length) {
        section.style.display = 'none'; return;
      }
      section.style.display = '';

      var wTimes = windData.hourly.time;
      var wsArr  = windData.hourly.windspeed_10m    || [];
      var wdArr  = windData.hourly.winddirection_10m || [];

      /* ── Find current hour index ── */
      var nowMs = Date.now();
      var curHourIdx = 0, minD = Infinity;
      wTimes.forEach(function(t, i) {
        var d = Math.abs(new Date(t) - nowMs);
        if (d < minD) { minD = d; curHourIdx = i; }
      });

      /* ── Create Leaflet sub-map centered on selected spot ── */
      var mapEl = document.getElementById('wfMap');
      var isMob = window.innerWidth <= 768;
      mapEl.style.height = isMob ? '160px' : '200px';
      var spotLat = selLat || 39.3557, spotLon = selLon || -9.3814;
      windMapInst = L.map('wfMap', {
        center: [spotLat, spotLon], zoom: 14,
        zoomControl: false, scrollWheelZoom: false,
        dragging: false, touchZoom: false, doubleClickZoom: false,
        boxZoom: false, keyboard: false,
      });
      L.tileLayer(ESRI_TILES, { attribution: ESRI_ATTR, maxZoom: 19 }).addTo(windMapInst);
      setTimeout(function() { if (windMapInst) windMapInst.invalidateSize(); }, 300);
      setTimeout(function() { if (windMapInst) windMapInst.invalidateSize(); }, 700);

      /* ── Draw static time axis ── */
      var shell = document.getElementById('wfMapShell');
      var W  = Math.min(shell.clientWidth || window.innerWidth - 30, window.innerWidth - 30);
      var axCanvas = document.getElementById('windFlowAxis');
      var AH = 36;
      var dprAx = window.devicePixelRatio || 1;
      axCanvas.width        = W  * dprAx;
      axCanvas.height       = AH * dprAx;
      axCanvas.style.width  = W  + 'px';
      axCanvas.style.height = AH + 'px';
      var axCtx = axCanvas.getContext('2d');
      axCtx.scale(dprAx, dprAx);
      drawWindFlowAxis(axCtx, wTimes, W, AH);

      var wf_currentWs = 0, wf_dxUnit = 0, wf_dyUnit = 1, wf_baseSpd = 1.5;
      var wf_windType = 'cross'; /* updated per scrubber tick */
      function updateWindState(idx) {
        var ws = wsArr[idx] != null ? wsArr[idx] : 0;
        var wd = wdArr[idx] != null ? wdArr[idx] : 0;
        wf_currentWs = ws;
        wf_windType  = getWindType(wd, selectedSpotName || '');
        var rad = wd * Math.PI / 180;
        wf_dxUnit  = -Math.sin(rad);
        wf_dyUnit  =  Math.cos(rad);
        wf_baseSpd = Math.max(1.5, (ws / 60) * 5.0);
        var qualColor = windQualityColor(ws, wf_windType, 1.0);
        var compassDir = toCompass(wd);
        document.getElementById('wfMeta').textContent =
          compassDir + ' wind · ' + Math.round(ws) + ' km/h · spot view';
        /* Update frosted header bar */
        var hdrSpot = document.getElementById('wfSpotName');
        if (hdrSpot) hdrSpot.textContent = selectedSpotName || '—';
        var hdrSpd = document.getElementById('wfHeaderSpeed');
        if (hdrSpd) {
          hdrSpd.textContent = Math.round(ws) + ' km/h';
          hdrSpd.style.color = qualColor;
        }
        var hdrDir = document.getElementById('wfHeaderDir');
        if (hdrDir) hdrDir.textContent = compassDir;
        var t2 = new Date(wTimes[idx]);
        var lblEl = document.getElementById('wfScrubLabel');
        if (lblEl) {
          lblEl.textContent = DAYS[t2.getUTCDay()] + ' ' +
            String(t2.getUTCHours()).padStart(2, '0') + ':00';
          lblEl.style.color = qualColor;
        }
        /* Scrubber accent color matches quality */
        var scrubEl = document.getElementById('wfScrubber');
        if (scrubEl) scrubEl.style.accentColor = qualColor;
      }

      updateWindState(curHourIdx);

      /* ── Set up particle canvas (overlaid on map) ── */
      var canvas = document.getElementById('windFlowCanvas');
      var dpr = window.devicePixelRatio || 1;
      setTimeout(function() {
        PW = shell.clientWidth || window.innerWidth - 30;
      }, 350);
      var isMob2 = window.innerWidth <= 768;
      var PW  = Math.min(shell.clientWidth || window.innerWidth - 30, window.innerWidth - 30);
      var PH  = isMob2 ? 160 : 200;

      canvas.width        = PW * dpr;
      canvas.height       = PH * dpr;
      canvas.style.width  = PW + 'px';
      canvas.style.height = PH + 'px';

      var ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      /* Spawn particle */
      function spawnWF() {
        return {
          x: Math.random() * PW, y: Math.random() * PH,
          px: null, py: null,
          age: Math.floor(Math.random() * 90),
          maxAge: 90 + Math.floor(Math.random() * 130), /* longer trails */
        };
      }

      var mainArea = 760 * 700;
      var wfArea   = PW * PH;
      var N = Math.round(320 * (wfArea / mainArea));
      N = Math.max(100, Math.min(N, 320));
      var particles = [];
      for (var j = 0; j < N; j++) particles.push(spawnWF());

      function frame() {
        if (myToken !== windMapToken) return;
        var ws  = wf_currentWs;
        var dx  = wf_dxUnit;
        var dy  = wf_dyUnit;
        var spd = wf_baseSpd;
        /* destination-out fade: erases toward transparent so map tiles show through */
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(0, 0, PW, PH);
        ctx.globalCompositeOperation = 'source-over';
        particles.forEach(function(p, pi) {
          var life = 1 - Math.min(p.age / p.maxAge, 1);
          var alpha = 0.12 + life * 0.7;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          p.x += dx * spd;
          p.y += dy * spd;
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = windQualityColor(ws, wf_windType, alpha);
          ctx.lineWidth   = 1.0 + life * 0.6;
          ctx.lineCap     = 'round';
          ctx.stroke();
          p.age++;
          if (p.x < 0) p.x += PW; if (p.x > PW) p.x -= PW;
          if (p.y < 0) p.y += PH; if (p.y > PH) p.y -= PH;
          if (p.age >= p.maxAge) { particles[pi] = spawnWF(); }
        });

        /* ── Foam glow on wind flow mini-map ── */
        var wfFoamAlpha = 0.03 + 0.08 * Math.min((mapSwell_wh * mapSwell_period) / 28, 1.0);
        var wfTravelRad = mapSwell_travelDeg * Math.PI / 180;
        var wfDiag      = Math.sqrt(PW * PW + PH * PH) * 0.5;
        var wfFoamX     = PW / 2 + Math.sin(wfTravelRad) * wfDiag * 0.46;
        var wfFoamY     = PH / 2 - Math.cos(wfTravelRad) * wfDiag * 0.46;
        var wfGlow      = ctx.createRadialGradient(
          wfFoamX, wfFoamY, 0,
          wfFoamX, wfFoamY, wfDiag * 0.28
        );
        wfGlow.addColorStop(0,   'rgba(255,255,255,' + wfFoamAlpha + ')');
        wfGlow.addColorStop(0.5, 'rgba(255,255,255,' + (wfFoamAlpha * 0.35) + ')');
        wfGlow.addColorStop(1.0, 'rgba(255,255,255,0)');
        ctx.fillStyle = wfGlow;
        ctx.fillRect(0, 0, PW, PH);

        windFlowAnimId = requestAnimationFrame(frame);
      }

      windFlowAnimId = requestAnimationFrame(frame);

      /* ── Time scrubber ── */
      var scrubber = document.getElementById('wfScrubber');
      if (scrubber) {
        scrubber.max   = wTimes.length - 1;
        scrubber.value = curHourIdx;
        scrubber.oninput = function() {
          updateWindState(parseInt(scrubber.value, 10));
        };
      }
    }

    /* ─── Wind flow time axis (static) ─────────────────────── */
    function drawWindFlowAxis(axCtx, wTimes, W, AH) {
      var nHours = wTimes.length;
      axCtx.clearRect(0, 0, W, AH);

      axCtx.strokeStyle = 'rgba(0,102,0,0.15)';
      axCtx.lineWidth = 1;
      axCtx.beginPath();
      axCtx.moveTo(0, 0); axCtx.lineTo(W, 0);
      axCtx.stroke();

      var prevDay = -1;
      wTimes.forEach(function(t, i) {
        var d   = new Date(t);
        var day = d.getUTCDay();
        var x   = (i / nHours) * W;
        if (day !== prevDay) {
          if (prevDay !== -1) {
            axCtx.save();
            axCtx.strokeStyle = 'rgba(0,102,0,0.28)';
            axCtx.lineWidth = 1;
            axCtx.setLineDash([2, 3]);
            axCtx.beginPath();
            axCtx.moveTo(x, 0); axCtx.lineTo(x, AH * 0.55);
            axCtx.stroke();
            axCtx.setLineDash([]);
            axCtx.restore();
          }
          axCtx.save();
          axCtx.font = '500 8px "DM Mono", monospace';
          axCtx.fillStyle = 'rgba(0,0,0,0.42)';
          axCtx.textAlign = 'left';
          axCtx.fillText(DAYS[day], x + 3, AH * 0.62);
          axCtx.restore();
          prevDay = day;
        }
      });

      /* NOW marker */
      var nowTime = Date.now();
      var curIdx = 0, minD2 = Infinity;
      wTimes.forEach(function(t, i) {
        var d = Math.abs(new Date(t) - nowTime);
        if (d < minD2) { minD2 = d; curIdx = i; }
      });
      var cx = (curIdx / nHours) * W;
      axCtx.save();
      axCtx.strokeStyle = '#006600';
      axCtx.lineWidth = 1.5;
      axCtx.beginPath();
      axCtx.moveTo(cx, 0); axCtx.lineTo(cx, AH * 0.62);
      axCtx.stroke();
      axCtx.font = '700 7px "DM Mono", monospace';
      axCtx.fillStyle = '#006600';
      axCtx.textAlign = 'center';
      axCtx.fillText('NOW', cx, AH - 2);
      axCtx.restore();
    }

    /* ═══════════════════════════════════════════════════════════
       LANDING PAGE — pre-fetch current conditions for spot cards
    ═══════════════════════════════════════════════════════════ */
    var SPOT_FACING = {
      'Nazaré':               285,
      'Almagreira':           270,
      'Lagide':               260,
      'Baleal':               315,
      'Cantinho da Baía':     300,
      'Middle':               290,
      'Meio da Baía':         285,
      'Molhe Leste':          290,
      'Supertubos':           255,
      'Santa Cruz':           270,
      'Praia das Amoeiras':   270,
      'Praia Azul':           270,
      'São Lourenço':         285,
      'Coxos':                280,
      'Cave':                 275,
      'Ribeira D\'Ilhas':     285,
      'Reef':                 280,
      'Pedra Branca':         265,
      'Matadouro':            270,
      'Praia do Sul':         265,
      'Praia da Baleia':      270,
      'Foz do Lizandro':      270,
      'São Julião':           270,
      'Praia Pequena':        255,
      'Praia Grande':         260,
      'Praia do Guincho':     240,
      'São Pedro do Estoril': 225,
      'Parede':               215,
      'Praia de Torre':       210,
      'Santo Amaro':          205,
      'Paco de Arcos':        200,
      'Praia de Caxias':      200,
      'São João da Caparica': 195,
      'Costa da Caparica':    195,
      'Fonte da Telha':       195,
      'Bicas':                200,
      'Sesimbra':             210,
      'Carcavelos':           200
    };
    function getWindType(windDeg, spotName) {
      var facing = SPOT_FACING[spotName];
      if (facing == null || windDeg == null) return 'cross';
      var diff = ((windDeg - (facing + 180)) % 360 + 360) % 360;
      if (diff > 180) diff = 360 - diff;
      if (diff <= 30)  return 'offshore';
      if (diff <= 75)  return 'cross-off';
      if (diff <= 105) return 'cross';
      if (diff <= 150) return 'cross-on';
      return 'onshore';
    }
    function getConditionLabel(wh, period, windDeg, spotName) {
      if (wh == null || wh < 0.3) return 'FLAT';
      var score = 1;
      if      (wh >= 2.5 && period >= 14) score = 4;
      else if (wh >= 1.5 && period >= 12) score = 3;
      else if (wh >= 0.8 && period >= 9)  score = 2;
      var windMod = { 'offshore': 1, 'cross-off': 0, 'cross': 0, 'cross-on': -1, 'onshore': -2 };
      var mod = windMod[getWindType(windDeg, spotName)] || 0;
      var final = Math.min(4, Math.max(1, score + mod));
      return ['POOR', 'FAIR', 'GOOD', 'EPIC'][final - 1];
    }
    function labelToClass(label) {
      return { 'EPIC': 'quality-epic', 'GOOD': 'quality-good', 'FAIR': 'quality-fair', 'POOR': 'quality-poor', 'FLAT': 'quality-flat' }[label] || 'quality-loading';
    }

    function fetchSpotConditions() {
      SURF_SPOTS.forEach(function(spot, idx) {
        var mUrl = 'https://marine-api.open-meteo.com/v1/marine'
          + '?latitude=' + spot.lat + '&longitude=' + spot.lon
          + '&hourly=wave_height,wave_period,wave_direction,swell_wave_height&forecast_days=1';
        var wUrl = 'https://api.open-meteo.com/v1/forecast'
          + '?latitude=' + spot.lat + '&longitude=' + spot.lon
          + '&hourly=windspeed_10m,winddirection_10m&forecast_days=1';

        Promise.all([
          fetch(mUrl),
          fetch(wUrl).catch(function() { return null; }),
        ]).then(function(rs) {
          return Promise.all([
            rs[0].json(),
            rs[1] && rs[1].ok ? rs[1].json() : Promise.resolve(null),
          ]);
        }).then(function(ds) {
          var marine = ds[0], wind = ds[1];
          if (!marine || !marine.hourly || !marine.hourly.time) return;

          var nowMs = Date.now();
          var ci2 = 0, minD3 = Infinity;
          marine.hourly.time.forEach(function(t, i) {
            var d = Math.abs(new Date(t) - nowMs);
            if (d < minD3) { minD3 = d; ci2 = i; }
          });

          var sc2    = spot.scale != null ? spot.scale : 1.0;
          var wh     = marine.hourly.wave_height && marine.hourly.wave_height[ci2];
          if (wh != null) wh = wh * sc2;
          var period = marine.hourly.wave_period && marine.hourly.wave_period[ci2];
          var swellH = marine.hourly.swell_wave_height && marine.hourly.swell_wave_height[ci2];
          if (swellH != null) swellH = swellH * sc2;
          /* Today's wave height range */
          var todayStr2 = new Date().toISOString().slice(0, 10);
          var todayHts2 = [];
          (marine.hourly.time || []).forEach(function(t, i) {
            if (t.slice(0, 10) === todayStr2) {
              var v = marine.hourly.wave_height && marine.hourly.wave_height[i];
              if (v != null) todayHts2.push(v * sc2);
            }
          });
          var whMin2 = todayHts2.length ? Math.min.apply(null, todayHts2) : wh;
          var whMax2 = todayHts2.length ? Math.max.apply(null, todayHts2) : wh;
          var ws     = null, wd = null;

          if (wind && wind.hourly && wind.hourly.time) {
            var wi2 = 0, minD4 = Infinity;
            wind.hourly.time.forEach(function(t, i) {
              var d = Math.abs(new Date(t) - nowMs);
              if (d < minD4) { minD4 = d; wi2 = i; }
            });
            ws = wind.hourly.windspeed_10m    && wind.hourly.windspeed_10m[wi2];
            wd = wind.hourly.winddirection_10m && wind.hourly.winddirection_10m[wi2];
          }

          updateSpotCardConditions(idx, wh, period, ws, wd, swellH, whMin2, whMax2);

          /* Set swell state for map animation */
          var wd_swell = marine.hourly.wave_direction && marine.hourly.wave_direction[ci2];
          mapSwellResults[idx] = (wh != null) ? { wh: wh, per: period || 10, wd: wd_swell || 270 } : null;

          mapWindDone++;
          if (mapWindDone >= SURF_SPOTS.length) startMapWindParticles();
        }).catch(function() {
          mapWindDone++;
          if (mapWindDone >= SURF_SPOTS.length) startMapWindParticles();
        });
      });
    }

    function updateSpotCardConditions(idx, wh, period, ws, wd, swellH, whMin, whMax) {
      var qualEl    = document.getElementById('spQuality'    + idx);
      var condEl    = document.getElementById('spConditions' + idx);
      var fireEl    = document.getElementById('spFiring'     + idx);
      var bgNumEl   = document.getElementById('spBgNum'      + idx);
      var arrowEl   = document.getElementById('spWindArrow'  + idx);
      var wSpdEl    = document.getElementById('spWindSpd'    + idx);

      /* Background watermark number — show today's range if available */
      if (bgNumEl && wh != null) {
        var rangeStr = (whMin != null && whMax != null)
          ? whMin.toFixed(1) + '–' + whMax.toFixed(1)
          : wh.toFixed(1);
        bgNumEl.innerHTML = rangeStr + '<span class="bg-unit">m</span>';
      }

      /* Quality badge */
      if (qualEl) {
        var spotName = SURF_SPOTS[idx] ? SURF_SPOTS[idx].name : '';
        var label    = (wh != null) ? getConditionLabel(wh, period, wd, spotName) : '—';
        var qCls     = (wh != null) ? labelToClass(label) : 'quality-loading';
        qualEl.textContent = label;
        qualEl.className   = 'sp-quality-badge ' + qCls;
      }
      var windTypeEl = document.getElementById('spWindType' + idx);
      if (windTypeEl) {
        var spotName2  = SURF_SPOTS[idx] ? SURF_SPOTS[idx].name : '';
        windTypeEl.textContent = (wd != null) ? getWindType(wd, spotName2).toUpperCase() : '';
      }

      /* Wind label on card */
      var windEl = document.getElementById('spWind' + idx);
      if (windEl) {
        if (ws != null && wd != null) {
          var dirs = ['N','NE','E','SE','S','SW','W','NW'];
          var dirLabel = dirs[Math.round(wd / 45) % 8];
          windEl.innerHTML = '<span style="display:inline-block;transform:rotate(' + (wd + 180) + 'deg);line-height:1;">↑</span> ' + dirLabel + ' · ' + Math.round(ws) + ' km/h';
        } else {
          windEl.textContent = '';
        }
      }

      /* Conditions text */
      if (condEl) {
        if (wh != null) {
          var parts = [wh.toFixed(1) + 'm wave'];
          if (swellH != null) parts.push(swellH.toFixed(1) + 'm swell');
          if (period != null) parts.push(period.toFixed(0) + 's period');
          if (ws     != null) parts.push(Math.round(ws) + ' kph wind');
          condEl.innerHTML = parts.join(' · ') + '<small>current conditions</small>';
        } else {
          condEl.innerHTML = '<small>No data available</small>';
        }
      }

      /* FIRING badge: wh >= 2.0 AND period >= 12 AND wind <= 15 kph */
      if (fireEl) {
        var firing = (wh != null && wh >= 2.0) &&
                     (period != null && period >= 12) &&
                     (ws == null || ws <= 15);
        fireEl.style.display = firing ? 'inline-flex' : 'none';
      }

      /* Wind compass arrow — rotates to FROM direction, green arrow */
      if (arrowEl && wd != null) {
        var arrowColor = windyColor(ws || 0, 1.0);
        arrowEl.innerHTML =
          '<circle cx="12" cy="12" r="11" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>'
          + '<g transform="rotate(' + wd + ',12,12)">'
          + '<polygon points="12,2 9.5,14 12,11.5 14.5,14" fill="' + arrowColor + '"/>'
          + '<polygon points="12,22 9.5,10 12,12.5 14.5,10" fill="rgba(255,255,255,0.18)"/>'
          + '</g>';
      }
      if (wSpdEl && ws != null) {
        wSpdEl.textContent = Math.round(ws) + ' kph';
        wSpdEl.style.color = windyColor(ws, 0.9);
      }

      /* Store wind data for map particle canvas */
      mapWindResults[idx] = (ws != null && wd != null) ? { ws: ws, wd: wd } : null;
      /* Score for Best Right Now */
      var scoreMap4 = { 'EPIC': 4, 'GOOD': 3, 'FAIR': 2, 'POOR': 1, 'FLAT': 0 };
      var spotName4 = SURF_SPOTS[idx] ? SURF_SPOTS[idx].name : '';
      var label4    = (wh != null) ? getConditionLabel(wh, period, wd, spotName4) : 'FLAT';
      spotScores[idx] = scoreMap4[label4] || 0;
      updateBestCards();
    }

    /* ═══════════════════════════════════════════════════════════
       MAP WIND PARTICLE CANVAS
       Exact same particle system as the forecast wind flow panel.
       Wind state vars are module-level so they can be updated
       in-place without restarting the animation loop.
    ═══════════════════════════════════════════════════════════ */
    var mapWindAnimId  = null;
    var mapWindToken   = 0;
    var mapWindResults = new Array(37).fill(null);
    var mapWindDone    = 0;

    /* Fallback defaults: 270°, 10 kph — matches updateWindState() formula */
    var mapWnd_currentWs = 10;
    var mapWnd_dxUnit    = -Math.sin(270 * Math.PI / 180); /* = 1  */
    var mapWnd_dyUnit    =  Math.cos(270 * Math.PI / 180); /* = 0  */
    var mapWnd_baseSpd   = Math.max(1.5, (10 / 60) * 5.0); /* ≈1.5  */

    /* ── Swell canvas state ── */
    var mapSwellToken   = 0;
    var mapSwellAnimId  = null;
    var mapSwellResults = new Array(37).fill(null); /* { wh, per, wd } per spot */

    var mapSwell_wh        = 1.2;
    var mapSwell_period    = 10;
    var mapSwell_dxUnit    = 0.707;   /* default NW → SE */
    var mapSwell_dyUnit    = 0.707;
    var mapSwell_travelDeg = 270;

    /* OSM coastline via Overpass Mirror — CORS-friendly, high-res */
    var _osmCoast = null; /* null = not loaded yet, use COAST_POLY fallback */
    (function fetchOSMCoast() {
      var query = '[out:json][timeout:30];'
        + 'way["natural"="coastline"](37.8,-9.7,40.2,-8.5);'
        + 'out geom;';
      /* Try mirrors in order until one works */
      var mirrors = [
        'https://overpass-api.de/api/interpreter',
        'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
        'https://overpass.openstreetmap.ru/api/interpreter'
      ];
      function tryMirror(idx) {
        if (idx >= mirrors.length) {
          console.warn('[coast] all mirrors failed, using inline fallback');
          return;
        }
        fetch(mirrors[idx], {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(query)
        })
        .then(function(r) {
          var ct = r.headers.get('content-type') || '';
          if (!ct.includes('json')) throw new Error('not JSON: ' + ct);
          return r.json();
        })
        .then(function(d) {
          if (!d || !d.elements || !d.elements.length) throw new Error('empty');
          var ways = [];
          d.elements.forEach(function(el) {
            if (el.type === 'way' && el.geometry && el.geometry.length > 1) {
              ways.push(el.geometry.map(function(n) { return [n.lat, n.lon]; }));
            }
          });
          if (ways.length === 0) throw new Error('no ways');
          _osmCoast = ways;
          console.log('[coast] OSM loaded from', mirrors[idx], '—',
            ways.length, 'ways,',
            ways.reduce(function(s,w){return s+w.length;},0), 'pts');
        })
        .catch(function(e) {
          console.warn('[coast] mirror', idx, 'failed:', e.message, '— trying next');
          tryMirror(idx + 1);
        });
      }
      tryMirror(0);
    })();

    /* Portugal coastline — inline [lat, lng], N→S
       High detail: Nazaré bay, Peniche peninsula, Cabo da Roca,
       Cascais, Tejo mouth north+south banks, Setúbal peninsula.
       Polygon closed via east border → clip punches out land.    */
    /* Portugal Atlantic coastline — traced strictly N→S, no backtracking.
       Cabo da Roca at correct lon -9.50. Tejo estuary closed as land.
       Polygon closed via east anchor (-5.00) in the draw code → evenodd
       punches land out of the full-canvas rect.                         */
    var COAST_POLY = [
      /* North edge */
      [40.00,-8.88],[39.92,-8.88],[39.85,-8.89],
      /* Nazaré bay */
      [39.75,-8.90],[39.70,-8.92],[39.65,-8.94],[39.62,-8.96],
      /* São Martinho do Porto inlet */
      [39.55,-9.02],[39.52,-9.05],[39.50,-9.10],[39.48,-9.12],
      [39.47,-9.11],[39.46,-9.09],[39.44,-9.14],
      /* Approaching Peniche */
      [39.42,-9.18],[39.38,-9.22],[39.36,-9.26],
      /* Peniche peninsula — tip at -9.40, traced west then back SE */
      [39.37,-9.33],[39.36,-9.38],[39.35,-9.40],
      [39.33,-9.38],[39.30,-9.36],[39.26,-9.34],[39.22,-9.33],
      /* South side of Peniche back to mainland */
      [39.17,-9.34],[39.13,-9.36],[39.10,-9.38],
      /* Santa Cruz / Ericeira — heading south */
      [39.05,-9.39],[39.00,-9.42],[38.97,-9.43],
      [38.93,-9.43],[38.89,-9.43],[38.86,-9.43],[38.83,-9.43],
      /* Sintra coast heading west toward Cabo da Roca */
      [38.81,-9.44],[38.80,-9.46],[38.79,-9.48],
      /* Cabo da Roca — actual westernmost: 38.783N, 9.498W */
      [38.78,-9.50],
      /* SE from Cabo da Roca toward Cascais — no backtrack */
      [38.76,-9.49],[38.74,-9.47],[38.73,-9.47],
      [38.71,-9.45],[38.70,-9.42],
      /* Cascais → Estoril → Carcavelos → Parede */
      [38.69,-9.40],[38.69,-9.37],[38.69,-9.35],
      [38.69,-9.32],[38.69,-9.26],
      /* North bank of Tagus mouth */
      [38.69,-9.22],[38.68,-9.18],[38.67,-9.15],
      /* Cross to south bank (Tejo estuary treated as land) */
      [38.66,-9.22],
      /* Costa da Caparica heading south */
      [38.65,-9.23],[38.63,-9.24],[38.60,-9.23],
      [38.56,-9.21],[38.52,-9.17],[38.48,-9.13],
      [38.44,-9.10],[38.43,-9.08],
      /* Setúbal / Sesimbra */
      [38.40,-9.00],[38.38,-8.98],[38.35,-8.94],
      [38.28,-8.91],[38.22,-8.90],
      /* South limit */
      [38.10,-8.90]
    ];

    function initMapWindCanvas() {
      mapWindToken++;
      var myToken = mapWindToken;

      var pane = map.getPanes().overlayPane;
      if (!pane) { console.warn('[mapWind] overlayPane not found'); return; }

      var old = document.getElementById('mapWindCanvas');
      if (old && old.parentNode) old.parentNode.removeChild(old);

      var dpr  = window.devicePixelRatio || 1;
      var size = map.getSize();
      var PW   = size.x, PH = size.y;

      var canvas = document.createElement('canvas');
      canvas.id = 'mapWindCanvas';
      canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
      canvas.width        = PW * dpr;
      canvas.height       = PH * dpr;
      canvas.style.width  = PW + 'px';
      canvas.style.height = PH + 'px';
      pane.appendChild(canvas);
      console.log('[mapWind] canvas appended to overlayPane, size:', PW, 'x', PH);

      /* Keep canvas viewport-fixed by countering the pane's CSS transform */
      function resetPosition() {
        var s      = map.getSize();
        var offset = map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(canvas, offset);
        var needW = s.x * dpr, needH = s.y * dpr;
        if (canvas.width !== needW || canvas.height !== needH) {
          canvas.width        = needW;
          canvas.height       = needH;
          canvas.style.width  = s.x + 'px';
          canvas.style.height = s.y + 'px';
          PW = s.x; PH = s.y;
          console.log('[mapWind] canvas resized to', PW, 'x', PH);
        }
      }
      map.on('movestart move moveend viewreset', resetPosition);
      window.addEventListener('resize', function() { map.invalidateSize(); resetPosition(); });

      /* ── Particle spawn — identical to spawnWF() in renderWindFlow ── */
      function spawnMW() {
        return {
          x: Math.random() * PW, y: Math.random() * PH,
          px: null, py: null,
          age: Math.floor(Math.random() * 100),
          maxAge: 120 + Math.floor(Math.random() * 160),
        };
      }

      var isMobile = window.innerWidth <= 768;
      var N = isMobile ? 150 : 400, particles = [];
      for (var j = 0; j < N; j++) particles.push(spawnMW());
      console.log('[mapWind] spawned', N, 'particles');

      var ctx = canvas.getContext('2d');

      /* ── Frame loop — exact port of renderWindFlow's frame() ── */
      function frame() {
        if (myToken !== mapWindToken) return; /* stale loop — stop */
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        /* Fade trails via destination-out: erases canvas pixels toward transparent
           so the satellite map below stays visible at all times */
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(0, 0, PW, PH);
        ctx.globalCompositeOperation = 'source-over';
        particles.forEach(function(p, pi) {
          var life = 1 - Math.min(p.age / p.maxAge, 1);
          var alpha = 0.12 + life * 0.7;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          p.x += mapWnd_dxUnit * mapWnd_baseSpd;
          p.y += mapWnd_dyUnit * mapWnd_baseSpd;
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = mapWnd_qualityColor + alpha.toFixed(2) + ')';
          ctx.lineWidth   = 1.0 + life * 0.6;
          ctx.lineCap     = 'round';
          ctx.stroke();
          p.age++;
          if (p.x < 0) p.x += PW; if (p.x > PW) p.x -= PW;
          if (p.y < 0) p.y += PH; if (p.y > PH) p.y -= PH;
          if (p.age >= p.maxAge) { particles[pi] = spawnMW(); }
        });
        mapWindAnimId = requestAnimationFrame(frame);
      }

      if (mapWindAnimId) cancelAnimationFrame(mapWindAnimId);
      mapWindAnimId = requestAnimationFrame(frame);
      console.log('[mapWind] animation loop started with ws:', mapWnd_currentWs, 'kph');

      /* Init swell canvas immediately after wind canvas is ready */
      initMapSwellCanvas();
    }

    /* ── Set map wind state — mirrors updateWindState() exactly ── */
    function setMapWindState(ws, wd) {
      mapWnd_currentWs = ws;
      var rad          = wd * Math.PI / 180;
      mapWnd_dxUnit    = -Math.sin(rad);
      mapWnd_dyUnit    =  Math.cos(rad);
      mapWnd_baseSpd   = Math.max(1.5, (ws / 60) * 5.0);
      console.log('[mapWind] wind state updated — ws:', ws, 'wd:', wd, 'spd:', mapWnd_baseSpd.toFixed(2));
    }

    function setMapSwellState(wh, period, wd) {
      mapSwell_wh     = (wh     != null && wh     > 0) ? wh     : 1.0;
      mapSwell_period = (period != null && period > 0) ? period : 10;
      /* wd = direction swell comes FROM (met convention, e.g. 315 = NW).
         Swell travels TO the OPPOSITE direction: wd + 180.
         sin/cos give the correct x/y screen movement vector.
         Screen coords: x+ = right (east), y+ = down (south). */
      var travelDeg = (wd + 180) % 360;
      var rad = travelDeg * Math.PI / 180;
      mapSwell_dxUnit    =  Math.sin(rad);
      mapSwell_dyUnit    = -Math.cos(rad);
      mapSwell_travelDeg = travelDeg;
      console.log('[mapSwell] wd:', wd, 'travel:', travelDeg,
                  'dx:', mapSwell_dxUnit.toFixed(2),
                  'dy:', mapSwell_dyUnit.toFixed(2));
    }

    function updateMapSwellFromSpot(marineData) {
      if (!marineData || !marineData.hourly || !marineData.hourly.time) return;
      var nowMs = Date.now(), ci = 0, minD = Infinity;
      marineData.hourly.time.forEach(function(t, i) {
        var d = Math.abs(new Date(t) - nowMs);
        if (d < minD) { minD = d; ci = i; }
      });
      var wh  = (marineData.hourly.wave_height    && marineData.hourly.wave_height[ci])    || 1.0;
      var per = (marineData.hourly.wave_period     && marineData.hourly.wave_period[ci])     || 10;
      var wd  = (marineData.hourly.wave_direction  && marineData.hourly.wave_direction[ci])  || 270;
      setMapSwellState(wh, per, wd);
    }

    /* Called when a spot is clicked and forecast wind data loads */
    function updateMapWindFromSpot(windData) {
      if (!windData || !windData.hourly || !windData.hourly.time) return;
      var nowMs = Date.now();
      var ci = 0, minD = Infinity;
      windData.hourly.time.forEach(function(t, i) {
        var d = Math.abs(new Date(t) - nowMs);
        if (d < minD) { minD = d; ci = i; }
      });
      var ws = (windData.hourly.windspeed_10m    && windData.hourly.windspeed_10m[ci])    || 0;
      var wd = (windData.hourly.winddirection_10m && windData.hourly.winddirection_10m[ci]) || 0;
      setMapWindState(ws, wd);
      /* Sync main map quality color to clicked spot */
      var wt = getWindType(wd, selectedSpotName || '');
      mapWnd_qualityColor = windQualityColor(ws, wt, 1.0).replace(/,[^,]+\)$/, ',');
    }

    /* Called once all landing-page spot fetches complete — uses average of all spots */
    function startMapWindParticles() {
      var wsSum = 0, sinSum = 0, cosSum = 0, n = 0;
      mapWindResults.forEach(function(r) {
        if (r) { wsSum += r.ws; sinSum += Math.sin(r.wd * Math.PI / 180); cosSum += Math.cos(r.wd * Math.PI / 180); n++; }
      });
      if (n === 0) { console.log('[mapWind] no API data, keeping default wind'); return; }
      var avgWs = wsSum / n;
      var avgWd = Math.atan2(sinSum / n, cosSum / n) * 180 / Math.PI;
      if (avgWd < 0) avgWd += 360;
      setMapWindState(avgWs, avgWd);
      /* Compute average wind quality color across all spots */
      var qualScoreSum = 0, qn = 0;
      mapWindResults.forEach(function(r, idx) {
        if (!r) return;
        var spotName = SURF_SPOTS[idx] ? SURF_SPOTS[idx].name : '';
        var wt = getWindType(r.wd, spotName);
        var wtScore = { 'offshore':2, 'cross-off':1, 'cross':0, 'cross-on':-1, 'onshore':-2 }[wt] || 0;
        var wsScore = r.ws < 10 ? 1 : r.ws < 25 ? 0 : -1;
        qualScoreSum += wtScore + wsScore;
        qn++;
      });
      var avgQual = qn > 0 ? qualScoreSum / qn : 0;
      /* Map avg score to color base string */
      if      (avgQual >= 2.5)  mapWnd_qualityColor = 'rgba(123,47,190,';  /* purple  */
      else if (avgQual >= 1.5)  mapWnd_qualityColor = 'rgba(0,210,200,';   /* teal    */
      else if (avgQual >= 0.5)  mapWnd_qualityColor = 'rgba(0,180,80,';    /* green   */
      else if (avgQual >= -0.5) mapWnd_qualityColor = 'rgba(230,200,0,';   /* yellow  */
      else if (avgQual >= -1.5) mapWnd_qualityColor = 'rgba(255,110,0,';   /* orange  */
      else if (avgQual >= -2.5) mapWnd_qualityColor = 'rgba(220,30,30,';   /* red     */
      else                      mapWnd_qualityColor = 'rgba(140,0,0,';     /* darkred */

      /* Average swell state across all spots */
      var whSum = 0, perSum = 0, wdSinSum = 0, wdCosSum = 0, sn = 0;
      mapSwellResults.forEach(function(r) {
        if (r) {
          whSum += r.wh; perSum += r.per;
          wdSinSum += Math.sin(r.wd * Math.PI / 180);
          wdCosSum += Math.cos(r.wd * Math.PI / 180);
          sn++;
        }
      });
      if (sn > 0) {
        var avgWd = Math.atan2(wdSinSum / sn, wdCosSum / sn) * 180 / Math.PI;
        if (avgWd < 0) avgWd += 360;
        setMapSwellState(whSum / sn, perSum / sn, avgWd);
      }
    }

    /* ═════════════════════════════════════════��════════════════
       SWELL LINE CANVAS — crispy animated lines, ocean only
    ══════════════════════════════════════════════════════════ */
    function initMapSwellCanvas() {
      mapSwellToken++;
      var myToken = mapSwellToken;

      var pane = map.getPanes().overlayPane;
      if (!pane) return;

      var old = document.getElementById('mapSwellCanvas');
      if (old && old.parentNode) old.parentNode.removeChild(old);

      var dpr  = window.devicePixelRatio || 1;
      var size = map.getSize();
      var PW = size.x, PH = size.y;

      var canvas = document.createElement('canvas');
      canvas.id = 'mapSwellCanvas';
      canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
      canvas.width        = PW * dpr;
      canvas.height       = PH * dpr;
      canvas.style.width  = PW + 'px';
      canvas.style.height = PH + 'px';

      /* Insert BEFORE mapWindCanvas so swell renders under wind particles */
      var windCanvas = document.getElementById('mapWindCanvas');
      if (windCanvas && windCanvas.parentNode === pane) {
        pane.insertBefore(canvas, windCanvas);
      } else {
        pane.appendChild(canvas);
      }

      var mapDirty = false;
      function resetPosition() {
        var s      = map.getSize();
        var offset = map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(canvas, offset);
        var needW = s.x * dpr, needH = s.y * dpr;
        if (canvas.width !== needW || canvas.height !== needH) {
          canvas.width        = needW;
          canvas.height       = needH;
          canvas.style.width  = s.x + 'px';
          canvas.style.height = s.y + 'px';
          PW = s.x; PH = s.y;
        }
      }
      map.on('movestart',  function() { mapDirty = true;  resetPosition(); });
      map.on('move',       function() { resetPosition(); });
      map.on('moveend viewreset', function() {
        resetPosition();
        /* Small delay so Leaflet fully settles before clip recalculates */
        setTimeout(function() { mapDirty = false; }, 80);
      });
      window.addEventListener('resize', function() {
        map.invalidateSize(); resetPosition();
      });

      var swellOffset = 0;

      function frame() {
        if (myToken !== mapSwellToken) return;

        var dx = mapSwell_dxUnit;
        var dy = mapSwell_dyUnit;
        var px = -dy, py = dx;

        var wh     = mapSwell_wh;
        var period = mapSwell_period;
        var c      = swellColor(wh);

        /* ══ Fully continuous parameters — no categories ══
           All values scale smoothly with wh and period only.
           SPEED:   period 6s→0.52  12s→0.30  18s→0.09
           NFRONTS: period 6s→5     12s→7     20s→10   (more fronts = longer period)
           SPACING: period drives set spacing, wh tightens it slightly
           LW:      wh drives line weight, period adds subtle thickness
           WAMP:    wh drives curvature amplitude
           NPTS:    period drives curve resolution                     */
        var speed   = Math.max(0.15, 0.72 - (period - 6) * 0.0215);
        var nFronts = Math.round(Math.max(3, Math.min(period * 0.35 + 1.5, 8)));
        var spacing = Math.max(80, Math.min(period * 18 - wh * 6, 380));
        var lw      = Math.max(1.0, Math.min(wh * 1.6 + period * 0.08, 6.5));
        var wAmp    = Math.max(8, Math.min(wh * 28 + period * 1.4, 90));
        var nPts    = Math.round(Math.max(6, Math.min(period * 0.38 + 4, 12)));
        var diag = Math.sqrt(PW * PW + PH * PH);
        var cx = PW / 2, cy = PH / 2;
        var ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, PW, PH);
        swellOffset += speed;
        if (swellOffset >= spacing) swellOffset -= spacing;
        ctx.save();
        /* ── Ocean-only clip: skip during pan/zoom to avoid misalignment ── */
        if (mapDirty) {
          /* During movement: clip to full canvas (no coastline punch-out) */
          ctx.beginPath();
          ctx.rect(0, 0, PW, PH);
          ctx.clip();
        } else {
        /* ── Ocean-only clip: OSM coastline (fallback: COAST_POLY) ──
           _osmCoast = array of ways [[lat,lng],...]
           Each way drawn as open polyline, closed via east border.
           evenodd punches land out of full-canvas rect.             */
        ctx.beginPath();
        ctx.rect(0, 0, PW, PH);
        if (_osmCoast) {
          /* High-res OSM data — stitch connected ways into land polygon */
          _osmCoast.forEach(function(way) {
            if (way.length < 2) return;
            var p0 = map.latLngToContainerPoint(L.latLng(way[0][0], way[0][1]));
            ctx.moveTo(p0.x, p0.y);
            for (var wi = 1; wi < way.length; wi++) {
              var wp = map.latLngToContainerPoint(L.latLng(way[wi][0], way[wi][1]));
              ctx.lineTo(wp.x, wp.y);
            }
            /* Close each way via east border anchor */
            var waySE = map.latLngToContainerPoint(L.latLng(way[way.length-1][0], -5.00));
            var wayNE = map.latLngToContainerPoint(L.latLng(way[0][0], -5.00));
            ctx.lineTo(waySE.x, waySE.y);
            ctx.lineTo(wayNE.x, wayNE.y);
            ctx.closePath();
          });
        } else {
          /* Fallback: inline COAST_POLY until OSM loads */
          var cl0 = map.latLngToContainerPoint(L.latLng(COAST_POLY[0][0], COAST_POLY[0][1]));
          ctx.moveTo(cl0.x, cl0.y);
          for (var ci = 1; ci < COAST_POLY.length; ci++) {
            var cli = map.latLngToContainerPoint(L.latLng(COAST_POLY[ci][0], COAST_POLY[ci][1]));
            ctx.lineTo(cli.x, cli.y);
          }
          var ptSE = map.latLngToContainerPoint(L.latLng(38.10, -5.00));
          var ptNE = map.latLngToContainerPoint(L.latLng(40.00, -5.00));
          ctx.lineTo(ptSE.x, ptSE.y);
          ctx.lineTo(ptNE.x, ptNE.y);
          ctx.closePath();
        }
        ctx.clip('evenodd');
        } /* end !mapDirty clip block */
        for (var i = 0; i < nFronts; i++) {
          var dist = i * spacing - (nFronts * spacing / 2) + swellOffset;
          var ox = cx + dx * dist;
          var oy = cy + dy * dist;
          /* Strength variation: continuous, no style categories.
             High energy (wh>2.5 + period>14) → breaking pattern.
             Otherwise → alternating set rhythm.                   */
          var energy0 = Math.min((wh * period) / 28, 1.0);
          var frontStrength;
          if (wh > 2.5 && period > 14) {
            var t = i / nFronts;
            frontStrength = 0.3 + 0.7 * Math.pow(Math.sin(t * Math.PI), 1.5);
          } else {
            frontStrength = 0.4 + 0.6 * Math.abs(Math.sin(i * 1.05 + 0.3));
          }
          var pts = [];
          for (var k = 0; k <= nPts; k++) {
            var perpDist = -diag + (k / nPts) * diag * 2;
            var wobble = wAmp * (
              0.6 * Math.sin(i * 2.1 + k * 1.3) +
              0.4 * Math.sin(i * 3.8 + k * 0.7)
            );
            pts.push({
              x: ox + px * perpDist + dx * wobble,
              y: oy + py * perpDist + dy * wobble
            });
          }
          var path = new Path2D();
          path.moveTo(pts[0].x, pts[0].y);
          for (var k = 0; k < pts.length - 1; k++) {
            var mx = (pts[k].x + pts[k+1].x) / 2;
            var my = (pts[k].y + pts[k+1].y) / 2;
            path.quadraticCurveTo(pts[k].x, pts[k].y, mx, my);
          }
          path.lineTo(pts[pts.length-1].x, pts[pts.length-1].y);
          ctx.lineCap  = 'round';
          ctx.lineJoin = 'round';
          var energy = Math.min((wh * period) / 28, 1.0);
          var eBoost = 0.55 + 0.45 * energy;
          ctx.strokeStyle = 'rgba('+c.r+','+c.g+','+c.b+','+(0.09*frontStrength*eBoost)+')';
          ctx.lineWidth   = lw * 12;
          ctx.stroke(path);
          ctx.strokeStyle = 'rgba('+c.r+','+c.g+','+c.b+','+(0.38*frontStrength*eBoost)+')';
          ctx.lineWidth   = lw * 2.8;
          ctx.stroke(path);
          ctx.strokeStyle = 'rgba('+c.r+','+c.g+','+c.b+','+(0.72*frontStrength*eBoost)+')';
          ctx.lineWidth   = lw;
          ctx.stroke(path);
        }
        /* Fade mask: erases in travel direction — dynamic, follows travelDeg.
           Gradient starts at canvas center offset toward origin,
           ends past the coast edge in travel direction.              */
        ctx.globalCompositeOperation = 'destination-out';
        var fadeDeg = mapSwell_travelDeg !== undefined ? mapSwell_travelDeg : 270;
        var fadeRad = fadeDeg * Math.PI / 180;
        var diag2   = Math.sqrt(PW * PW + PH * PH) * 0.5;
        var cx2 = PW / 2, cy2 = PH / 2;
        var fx0 = cx2 - Math.sin(fadeRad) * diag2 * 0.25;
        var fy0 = cy2 + Math.cos(fadeRad) * diag2 * 0.25;
        var fx1 = cx2 + Math.sin(fadeRad) * diag2 * 0.90;
        var fy1 = cy2 - Math.cos(fadeRad) * diag2 * 0.90;
        var fadeGrad = ctx.createLinearGradient(fx0, fy0, fx1, fy1);
        fadeGrad.addColorStop(0,    'rgba(0,0,0,0)');
        fadeGrad.addColorStop(0.50, 'rgba(0,0,0,0.75)');
        fadeGrad.addColorStop(1.0,  'rgba(0,0,0,1)');
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(0, 0, PW, PH);
        ctx.globalCompositeOperation = 'source-over';
        /* ── Foam: static white glow at fade boundary ── */
        var foamRad2 = fadeDeg * Math.PI / 180;
        var foamDiag = Math.sqrt(PW * PW + PH * PH) * 0.5;
        var fcx = PW / 2, fcy = PH / 2;
        var foamEdgeX = fcx + Math.sin(foamRad2) * foamDiag * 0.48;
        var foamEdgeY = fcy - Math.cos(foamRad2) * foamDiag * 0.48;
        var foamGlowR = foamDiag * 0.22;
        var foamEnergy = Math.min((wh * period) / 28, 1.0);
        var foamAlpha  = 0.04 + 0.10 * foamEnergy;
        var foamGlow   = ctx.createRadialGradient(
          foamEdgeX, foamEdgeY, 0,
          foamEdgeX, foamEdgeY, foamGlowR
        );
        foamGlow.addColorStop(0,   'rgba(255,255,255,' + foamAlpha + ')');
        foamGlow.addColorStop(0.5, 'rgba(255,255,255,' + (foamAlpha * 0.4) + ')');
        foamGlow.addColorStop(1.0, 'rgba(255,255,255,0)');
        ctx.fillStyle = foamGlow;
        ctx.fillRect(0, 0, PW, PH);
        /* ── Foam: animated particle bursts ── */
        if (!canvas._foamParticles) canvas._foamParticles = [];
        var fp = canvas._foamParticles;
        /* Spawn rate scales with energy */
        var spawnCount = Math.floor(0.3 + foamEnergy * 1.8);
        for (var s = 0; s < spawnCount; s++) {
          var spread = foamDiag * 0.55;
          var perpX  = -Math.cos(foamRad2);
          var perpY  = -Math.sin(foamRad2);
          var spawnX = foamEdgeX + (Math.random() - 0.5) * spread * perpX * 2
                                 + (Math.random() - 0.5) * spread * Math.cos(foamRad2 + Math.PI/2) * 2;
          var spawnY = foamEdgeY + (Math.random() - 0.5) * spread * perpY * 2
                                 + (Math.random() - 0.5) * spread * Math.sin(foamRad2 + Math.PI/2) * 2;
          fp.push({
            x:    spawnX,
            y:    spawnY,
            vx:   (Math.random() - 0.5) * 0.6,
            vy:   (Math.random() - 0.5) * 0.6,
            life: 1.0,
            size: 1.0 + Math.random() * 2.5 * (0.5 + foamEnergy)
          });
        }
        /* Update + draw particles */
        for (var pi = fp.length - 1; pi >= 0; pi--) {
          var p = fp[pi];
          p.x   += p.vx;
          p.y   += p.vy;
          p.life -= 0.022 + Math.random() * 0.012;
          if (p.life <= 0) { fp.splice(pi, 1); continue; }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,' + (p.life * 0.55) + ')';
          ctx.fill();
        }
        /* Cap particle count */
        if (fp.length > 120) fp.splice(0, fp.length - 120);
        ctx.restore();
        mapSwellAnimId = requestAnimationFrame(frame);
      }

      if (mapSwellAnimId) cancelAnimationFrame(mapSwellAnimId);
      mapSwellAnimId = requestAnimationFrame(frame);
    }

    /* Start 500 ms after map init so Leaflet panes are fully ready */
    setTimeout(initMapWindCanvas, 500);

    /* ─── Wind update on map pan/zoom ───────────────────────── */
    (function() {
      var fetchTimer = null;

      function fetchWindForCenter() {
        var c   = map.getCenter();
        var lat = c.lat.toFixed(4);
        var lon = c.lng.toFixed(4);
        var url = 'https://api.open-meteo.com/v1/forecast'
          + '?latitude=' + lat + '&longitude=' + lon
          + '&hourly=windspeed_10m,winddirection_10m&forecast_days=1';

        fetch(url)
          .then(function(r) { return r.json(); })
          .then(function(d) {
            if (!d || !d.hourly || !d.hourly.time) return;
            var nowMs = Date.now(), ci = 0, minD = Infinity;
            d.hourly.time.forEach(function(t, i) {
              var diff = Math.abs(new Date(t) - nowMs);
              if (diff < minD) { minD = diff; ci = i; }
            });
            var ws = d.hourly.windspeed_10m[ci]     || 0;
            var wd = d.hourly.winddirection_10m[ci]  || 0;
            setMapWindState(ws, wd);
          })
          .catch(function() { /* fail silently */ });
      }

      /* Debounce: wait 400 ms after moveend before fetching */
      map.on('moveend', function() {
        if (fetchTimer) clearTimeout(fetchTimer);
        fetchTimer = setTimeout(fetchWindForCenter, 400);
      });
    })();

    /* ─── Init ──────────────────────────────────────────────── */
    fetchSpotConditions();
    /* ─── Region mapping ─── */
    var SPOT_REGION = {
      'Nazaré':               'NAZARÉ',
      'Almagreira':           'PENICHE',
      'Lagide':               'PENICHE',
      'Baleal':               'PENICHE',
      'Cantinho da Baía':     'PENICHE',
      'Middle':               'PENICHE',
      'Meio da Baía':         'PENICHE',
      'Molhe Leste':          'PENICHE',
      'Supertubos':           'PENICHE',
      'Santa Cruz':           'SANTA CRUZ',
      'Praia das Amoeiras':   'SANTA CRUZ',
      'Praia Azul':           'SANTA CRUZ',
      'São Lourenço':         'ERICEIRA',
      'Coxos':                'ERICEIRA',
      'Cave':                 'ERICEIRA',
      'Ribeira D\'Ilhas':     'ERICEIRA',
      'Reef':                 'ERICEIRA',
      'Pedra Branca':         'ERICEIRA',
      'Matadouro':            'ERICEIRA',
      'Praia do Sul':         'ERICEIRA',
      'Foz do Lizandro':      'ERICEIRA',
      'São Julião':           'ERICEIRA',
      'Praia Pequena':        'SINTRA',
      'Praia Grande':         'SINTRA',
      'Praia do Guincho':     'LISBON',
      'São Pedro do Estoril': 'LISBON',
      'Parede':               'LISBON',
      'Praia de Torre':       'LISBON',
      'Santo Amaro':          'LISBON',
      'Paco de Arcos':        'LISBON',
      'Praia de Caxias':      'LISBON',
      'Carcavelos':             'LISBON',
      'São João da Caparica': 'CAPARICA',
      'Costa da Caparica':    'CAPARICA',
      'Fonte da Telha':       'CAPARICA',
      'Bicas':                'CAPARICA',
      'Sesimbra':             'CAPARICA'
    };
    var activeFilter = 'ALL';
    var spotScores   = new Array(37).fill(-1); /* -1 = not yet loaded */
    function updateBestCards() {
      /* Find best idx per region AND globally */
      var regionBest = {};
      SURF_SPOTS.forEach(function(spot, idx) {
        if (spotScores[idx] < 0) return;
        var region = SPOT_REGION[spot.name] || 'OTHER';
        if (!regionBest[region] || spotScores[idx] > regionBest[region].score)
          regionBest[region] = { idx: idx, score: spotScores[idx] };
        if (!regionBest['ALL'] || spotScores[idx] > regionBest['ALL'].score)
          regionBest['ALL'] = { idx: idx, score: spotScores[idx] };
      });
      /* Clear previous best styling */
      document.querySelectorAll('.sp-card--best').forEach(function(c) {
        c.classList.remove('sp-card--best');
      });
      document.querySelectorAll('.sp-best-badge').forEach(function(b) { b.remove(); });
      /* Reset all map markers to default style */
      SURF_SPOTS.forEach(function(spot, idx) {
        var dot   = document.getElementById('mapDot'   + idx);
        var label = document.getElementById('mapLabel' + idx);
        if (dot)   dot.classList.remove('spot-dot--best');
        if (label) label.classList.remove('spot-label--best');
      });
      /* Apply gold marker to best per region */
      Object.keys(regionBest).forEach(function(region) {
        if (region === 'ALL') return;
        var rb = regionBest[region];
        if (!rb || rb.score <= 0) return;
        var dot   = document.getElementById('mapDot'   + rb.idx);
        var label = document.getElementById('mapLabel' + rb.idx);
        if (dot)   dot.classList.add('spot-dot--best');
        if (label) label.classList.add('spot-label--best');
      });
      var best = regionBest[activeFilter];
      if (!best || best.score <= 0) return;
      var card = document.querySelector('[data-spot-idx="' + best.idx + '"]');
      if (!card) return;
      /* Gold border */
      card.classList.add('sp-card--best');
      /* ★ BEST NOW badge — inserted first in badge group */
      var badgeGroup = card.querySelector('.sp-badge-group');
      if (badgeGroup) {
        var bb = document.createElement('span');
        bb.className   = 'sp-best-badge';
        bb.textContent = '★ BEST NOW';
        badgeGroup.insertBefore(bb, badgeGroup.firstChild);
      }
      /* Move best card to top of visible list */
      var container = document.getElementById('spCardsContainer');
      if (container && card.parentElement === container)
        container.insertBefore(card, container.firstChild);
    }
    var FILTER_BTN_MAP = {
      'ALL':        'filterAll',
      'NAZARÉ':     'filterNazare',
      'PENICHE':    'filterPeniche',
      'SANTA CRUZ': 'filterSantaCruz',
      'ERICEIRA':   'filterEriceira',
      'SINTRA':     'filterSintra',
      'LISBON':     'filterLisbon',
      'CAPARICA':   'filterCaparica'
    };
    function filterSpots(region) {
      activeFilter = region;
      document.querySelectorAll('.sp-filter-btn').forEach(function(b) {
        b.classList.remove('active');
      });
      var btn = document.getElementById(FILTER_BTN_MAP[region]);
      if (btn) btn.classList.add('active');
      SURF_SPOTS.forEach(function(spot, idx) {
        var card = document.querySelector('[data-spot-idx="' + idx + '"]');
        if (!card) return;
        card.style.display = (region === 'ALL' || SPOT_REGION[spot.name] === region) ? '' : 'none';
      });
      /* Sort visible cards North→South by latitude */
      var container = document.getElementById('spCardsContainer');
      if (container) {
        var cards = Array.prototype.slice.call(container.children);
        cards.sort(function(a, b) {
          var idxA = parseInt(a.getAttribute('data-spot-idx'), 10);
          var idxB = parseInt(b.getAttribute('data-spot-idx'), 10);
          var latA = SURF_SPOTS[idxA] ? SURF_SPOTS[idxA].lat : 0;
          var latB = SURF_SPOTS[idxB] ? SURF_SPOTS[idxB].lat : 0;
          return latB - latA; /* higher lat = further north = first */
        });
        cards.forEach(function(c) { container.appendChild(c); });
      }
      updateBestCards();
    }

    /* ─── Build landing page spot cards dynamically ─── */
    (function buildSpotCards() {
      var container = document.getElementById('spCardsContainer');
      if (!container) return;
      var gradients = [
        'linear-gradient(140deg, #5ecfb8 0%, #80FFDB 45%, #5ecfb8 100%)',
      ];
      SURF_SPOTS.forEach(function(spot, idx) {
        var grad = gradients[idx % gradients.length];
        var latStr = Math.abs(spot.lat).toFixed(4) + '° N · ' + Math.abs(spot.lon).toFixed(4) + '° W';
        var card = document.createElement('div');
        card.className = 'sp-card';
        card.style.background = grad;
        card.setAttribute('tabindex', '0');
        card.setAttribute('onclick', 'selectSpot(' + idx + ')');
        card.setAttribute('onkeydown', "if(event.key==='Enter')selectSpot(" + idx + ")");
        card.setAttribute('data-spot-idx', idx);
        card.innerHTML =
          '<div class="sp-card-bg-num" id="spBgNum' + idx + '">—</div>'
          + '<div class="sp-card-top"><div class="sp-badge-group">'
          + '<span class="firing-badge" id="spFiring' + idx + '">🔥 FIRING</span>'
          + '<span class="sp-quality-badge quality-loading" id="spQuality' + idx + '">—</span>'
          + '</div></div>'
          + '<div class="sp-name-wrap"><div class="sp-name">' + spot.name + '</div>'
          + '<div class="sp-coords">' + latStr + '</div></div>'
          + '<div class="sp-card-bottom">'
          + '<div class="sp-conditions" id="spConditions' + idx + '"><small>Fetching conditions…</small></div>'
          + '<div class="sp-wind" id="spWind' + idx + '"></div>'
          + '</div>'
          + '<span style="display:none" id="spWindType' + idx + '"></span>'
          + '<span style="display:none" id="spWindArrow' + idx + '"></span>'
          + '<span style="display:none" id="spWindSpd' + idx + '"></span>';
        container.appendChild(card);
      });
      /* Initial sort: North→South */
      var cards0 = Array.prototype.slice.call(container.children);
      cards0.sort(function(a, b) {
        var idxA = parseInt(a.getAttribute('data-spot-idx'), 10);
        var idxB = parseInt(b.getAttribute('data-spot-idx'), 10);
        return (SURF_SPOTS[idxB] ? SURF_SPOTS[idxB].lat : 0) - (SURF_SPOTS[idxA] ? SURF_SPOTS[idxA].lat : 0);
      });
      cards0.forEach(function(c) { container.appendChild(c); });
    })();

    /* ─── Spot Search ───────────────────────────────────────── */
    function toggleSearch() {
      var overlay = document.getElementById('searchOverlay');
      if (overlay.style.display === 'none') {
        overlay.style.display = 'block';
        var inp = document.getElementById('searchInput');
        inp.value = '';
        filterSearchResults('');
        setTimeout(function() { inp.focus(); }, 60);
      } else {
        closeSearch();
      }
    }

    function closeSearch() {
      document.getElementById('searchOverlay').style.display = 'none';
    }

    function filterSearchResults(query) {
      var list = document.getElementById('searchResults');
      var q = query.trim().toLowerCase();
      var matches = q === ''
        ? SURF_SPOTS.slice(0, 20)
        : SURF_SPOTS.filter(function(s) { return s.name.toLowerCase().indexOf(q) !== -1; });

      list.innerHTML = matches.length === 0
        ? '<div style="padding:0.7rem 1rem;font-family:\'DM Mono\',monospace;font-size:0.6rem;color:rgba(116,0,184,0.4);letter-spacing:0.08em;">No spots found</div>'
        : matches.map(function(s) {
            var idx = SURF_SPOTS.indexOf(s);
            var region = SPOT_REGION[s.name] || '';
            return '<div onclick="pickSearchSpot(' + idx + ')" style="display:flex;justify-content:space-between;align-items:center;padding:0.52rem 1rem;cursor:pointer;transition:background 0.1s;" onmouseover="this.style.background=\'rgba(94,96,206,0.07)\'" onmouseout="this.style.background=\'\'"><span style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:0.75rem;font-weight:700;color:#5E60CE;letter-spacing:0.04em;">' + s.name + '</span><span style="font-family:\'DM Mono\',monospace;font-size:0.55rem;color:rgba(94,96,206,0.5);letter-spacing:0.08em;">' + region + '</span></div>';
          }).join('');
    }

    function pickSearchSpot(idx) {
      closeSearch();
      selectSpot(idx);
    }

    /* Close search on Escape */
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeSearch();
    });

