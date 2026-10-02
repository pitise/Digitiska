(function () {
  'use strict';

  var PRAYERS = [
    { key: 'fajr',    ms: 'Subuh',   ar: 'الفجر',  azan: true },
    { key: 'sunrise', ms: 'Syuruk',  ar: 'الشروق', azan: false },
    { key: 'dhuhr',   ms: 'Zohor',   ar: 'الظهر',  azan: true },
    { key: 'asr',     ms: 'Asar',    ar: 'العصر',  azan: true },
    { key: 'maghrib', ms: 'Maghrib', ar: 'المغرب', azan: true },
    { key: 'isha',    ms: 'Isyak',   ar: 'العشاء', azan: true }
  ];
  var P = {};
  PRAYERS.forEach(function (p) { P[p.key] = p; });

  var DAYS = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
  var MONTHS = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
  var HIJRI = ['Muharram', 'Safar', 'Rabiulawal', 'Rabiulakhir', 'Jamadilawal', 'Jamadilakhir', 'Rejab', 'Syaaban', 'Ramadan', 'Syawal', 'Zulkaedah', 'Zulhijjah'];

  var DEFAULT_LOC = { lat: 3.139, lng: 101.687, name: 'Kuala Lumpur, Malaysia (default)' };
  var KEY = { loc: 'pt.loc', azan: 'pt.azan', fired: 'pt.fired' };
  var FIRE_WINDOW_MS = 90 * 1000;
  var AZAN_URL = 'audio/azan.mp3';
  var IP_URL = 'https://ipwho.is/';   /* internet-address location, used only when the user chooses it */
  var EMBED = window.SALAH_EMBED || null;

  function $(id) { return document.getElementById(id); }
  var el = {
    locName: $('loc-name'), dateMain: $('date-main'), dateHijri: $('date-hijri'),
    notice: $('notice'), noticeText: $('notice-text'), noticeAction: $('notice-action'),
    heroName: $('hero-name'), heroAr: $('hero-ar'), heroLabel: $('hero-label'),
    heroCount: $('hero-count'), heroStart: $('hero-start'), heroNext: $('hero-next'),
    list: $('list'), btnSettings: $('btn-settings'), btnRefresh: $('btn-refresh'),
    dialog: $('settings'), toggle: $('azan-toggle'), azanStatus: $('azan-status'),
    azanTest: $('azan-test'), close: $('settings-close'),
    installBlock: $('install-block'), installBtn: $('install-btn'), installHint: $('install-hint'),
    audio: $('azan'), locSelect: $('loc-select')
  };

  /* ---------- storage (every access guarded: it can throw in private mode) ---------- */
  function load(key) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* ignore */ }
  }

  /* ---------- state ---------- */
  var loc = (function () {
    var l = load(KEY.loc);
    if (l && isFinite(l.lat) && isFinite(l.lng) && Math.abs(l.lat) <= 90 && Math.abs(l.lng) <= 180) return l;
    return null;
  })();
  var azanOn = load(KEY.azan) === true;
  var cache = { key: '', tl: null };
  var renderedTimesKey = '';
  var renderedDay = '';
  var lastFixAt = 0;
  var rows = {};

  /* ---------- small helpers ---------- */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function hm(d) { return d.getHours() + ':' + pad(d.getMinutes()); }
  function hms(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000));
    return pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s % 3600 / 60)) + ':' + pad(s % 60);
  }
  function make(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  function here() { return loc || DEFAULT_LOC; }

  /* ---------- timeline: yesterday + today + tomorrow, sorted ---------- */
  function getTimeline(now) {
    var h = here();
    var key = now.getFullYear() + '-' + now.getMonth() + '-' + now.getDate() + '@' + h.lat.toFixed(3) + ',' + h.lng.toFixed(3);
    if (cache.key === key) return cache.tl;
    var tl = [];
    for (var off = -1; off <= 1; off++) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + off);
      var t = PrayerCalc.compute(d.getFullYear(), d.getMonth() + 1, d.getDate(), h.lat, h.lng, 'JAKIM');
      if (!t) { cache = { key: key, tl: null }; return null; }
      for (var i = 0; i < PRAYERS.length; i++) tl.push({ key: PRAYERS[i].key, time: t[PRAYERS[i].key], off: off });
    }
    tl.sort(function (a, b) { return a.time - b.time; });
    cache = { key: key, tl: tl };
    return tl;
  }

  /* ---------- rendering ---------- */
  function buildList() {
    PRAYERS.forEach(function (p) {
      var li = make('li', 'row');
      var names = make('div', 'names');
      names.appendChild(make('span', 'name', p.ms));
      var ar = make('span', 'ar', p.ar);
      ar.lang = 'ar';
      names.appendChild(ar);
      var right = make('div', 'right');
      var t = make('span', 'time');
      var tag = make('span', 'tag');
      right.appendChild(t);
      right.appendChild(tag);
      li.appendChild(make('span', 'dot'));
      li.appendChild(names);
      li.appendChild(right);
      el.list.appendChild(li);
      rows[p.key] = { li: li, time: t, tag: tag, cls: '', tagText: '' };
    });
  }

  function hijriText(now) {
    try {
      var parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(now);
      var o = {};
      parts.forEach(function (p) { o[p.type] = p.value; });
      var m = parseInt(o.month, 10);
      if (!(m >= 1 && m <= 12)) return '';
      return parseInt(o.day, 10) + ' ' + HIJRI[m - 1] + ' ' + parseInt(o.year, 10) + ' H';
    } catch (e) { return ''; }
  }

  function renderDay(now) {
    var key = now.getFullYear() + '-' + now.getMonth() + '-' + now.getDate();
    if (key === renderedDay) return;
    renderedDay = key;
    el.dateMain.textContent = DAYS[now.getDay()] + ', ' + now.getDate() + ' ' + MONTHS[now.getMonth()];
    el.dateHijri.textContent = hijriText(now);
  }

  function renderTimes(tl) {
    if (renderedTimesKey === cache.key) return;
    renderedTimesKey = cache.key;
    tl.forEach(function (e) { if (e.off === 0) rows[e.key].time.textContent = hm(e.time); });
  }

  function setRow(key, cls, tagText) {
    var r = rows[key];
    if (r.cls !== cls) { r.cls = cls; r.li.className = 'row' + (cls ? ' ' + cls : ''); }
    if (r.tagText !== tagText) { r.tagText = tagText; r.tag.textContent = tagText; }
  }

  function tick() {
    var now = new Date();
    var tl = getTimeline(now);
    renderDay(now);
    if (!tl) {
      showNotice('Prayer times cannot be calculated for this location.');
      return;
    }
    renderTimes(tl);

    var idx = -1;
    for (var i = 0; i < tl.length; i++) if (tl[i].time <= now) idx = i;
    if (idx < 0 || idx >= tl.length - 1) return;
    var cur = tl[idx], end = tl[idx + 1], next = null;
    for (var j = idx + 1; j < tl.length; j++) if (tl[j].key !== 'sunrise') { next = tl[j]; break; }

    el.heroName.textContent = P[cur.key].ms;
    el.heroAr.textContent = P[cur.key].ar;
    el.heroStart.textContent = hm(cur.time);
    el.heroCount.textContent = hms(end.time - now);
    if (cur.key === 'sunrise') {
      el.heroLabel.textContent = P[end.key].ms + ' in';
      el.heroNext.textContent = 'No obligatory prayer now';
    } else {
      el.heroLabel.textContent = 'Ends in';
      var line = 'Next prayer: ' + P[next.key].ms + ' at ' + hm(next.time);
      if (next.time.getTime() !== end.time.getTime()) line += ' (in ' + hms(next.time - now) + ')';
      el.heroNext.textContent = line;
    }

    PRAYERS.forEach(function (p) {
      var current = p.key === cur.key;
      setRow(p.key, current ? 'is-now' : '', current ? 'Now' : '');
    });

    if (azanOn) {
      for (var m = 0; m < tl.length; m++) {
        var age = now - tl[m].time;
        if (P[tl[m].key].azan && age >= 0 && age < FIRE_WINDOW_MS) fire(tl[m]);
      }
    }
  }

  /* ---------- notice banner ---------- */
  function showNotice(text, actionLabel, action) {
    el.noticeText.textContent = text;
    el.noticeAction.hidden = !actionLabel;
    el.noticeAction.textContent = actionLabel || '';
    el.noticeAction.onclick = action || null;
    el.notice.hidden = false;
  }
  function hideNotice() { el.notice.hidden = true; }

  /* ---------- location ---------- */
  function setLocLabel() {
    el.locName.textContent = loc ? (loc.name || 'Locating…') + (loc.source === 'ip' ? ' (approx.)' : '') : DEFAULT_LOC.name;
  }

  function distKm(a, b) {
    var R = 6371, r = Math.PI / 180;
    var dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  var lookupSeq = 0;
  function lookup(lat, lng) {
    var seq = ++lookupSeq;
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 8000);
    /* Position is rounded to 2 decimals (~1 km) before it leaves the device. */
    var url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=12&addressdetails=1&accept-language=ms,en' +
      '&lat=' + lat.toFixed(2) + '&lon=' + lng.toFixed(2);
    fetch(url, { signal: ctrl ? ctrl.signal : undefined, credentials: 'omit', referrerPolicy: 'origin' })
      .then(function (r) { if (!r.ok) throw new Error('lookup ' + r.status); return r.json(); })
      .then(function (data) {
        var name = PlaceInfo.placeName(data);
        if (seq !== lookupSeq || !loc || loc.manual || !name) return;
        loc.name = name;
        loc.named = true;
        save(KEY.loc, loc);
        setLocLabel();
      })
      .catch(function () { /* keep the coordinate label */ })
      .then(function () { clearTimeout(timer); });
  }

  function detect(force) {
    if (!force && loc && loc.manual) return;
    function done() { el.btnRefresh.classList.remove('spin'); el.btnRefresh.disabled = false; }
    if (!navigator.geolocation) {
      showNotice(loc ? 'This browser cannot update location. Showing the last known place.' : 'This browser has no location support. Showing Kuala Lumpur times. Choose your place in Settings (bell icon), or use an approximate location.', loc ? '' : 'Use approximate', loc ? null : locateByIp);
      return;
    }
    el.btnRefresh.classList.add('spin');
    el.btnRefresh.disabled = true;
    navigator.geolocation.getCurrentPosition(function (pos) {
      done();
      var next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      var moved = !loc || loc.manual || loc.source === 'ip' || distKm(loc, next) > 1;
      var keepName = !moved && loc.named && !loc.manual && loc.source !== 'ip';
      loc = {
        lat: next.lat, lng: next.lng,
        name: keepName ? loc.name : next.lat.toFixed(2) + '°, ' + next.lng.toFixed(2) + '°',
        named: keepName,
        manual: false,
        source: 'gps'
      };
      syncSelect();
      save(KEY.loc, loc);
      lastFixAt = Date.now();
      hideNotice();
      setLocLabel();
      tick();
      if (!loc.named || force) lookup(next.lat, next.lng);
    }, function (err) {
      done();
      var denied = err && err.code === 1;
      if (loc && loc.source === 'ip') showNotice(APPROX_NOTICE, 'Retry GPS', function () { detect(true); });
      else if (loc) showNotice('Could not update location. Showing the last known place.', 'Retry', function () { detect(true); });
      else if (denied) showNotice('Location is off, so Kuala Lumpur times are shown. Allow location for this site in your browser settings, choose your place in Settings (bell icon), or use an approximate location.', 'Use approximate', locateByIp);
      else showNotice('Could not get your location. Showing Kuala Lumpur times. Choose your place in Settings (bell icon), or use an approximate location.', 'Use approximate', locateByIp);
      syncSelect();
      setLocLabel();
    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: force ? 0 : 600000 });
  }

  /* ---------- approximate location from the internet address (only when the user chooses it) ---------- */
  var APPROX_NOTICE = 'Approximate location from your internet connection. On mobile data it can be far off. Choose your place in Settings (bell icon) for accurate times.';

  function locateByIp() {
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 8000);
    lookupSeq++;                                   /* cancel any pending name lookup */
    el.btnRefresh.classList.add('spin');
    fetch(IP_URL, { signal: ctrl ? ctrl.signal : undefined, credentials: 'omit', referrerPolicy: 'no-referrer' })
      .then(function (r) { if (!r.ok) throw new Error('lookup ' + r.status); return r.json(); })
      .then(function (data) {
        var found = PlaceInfo.parseIpLocation(data);
        if (!found) throw new Error('no position');
        loc = { lat: found.lat, lng: found.lng, name: found.name, named: true, manual: false, source: 'ip' };
        save(KEY.loc, loc);
        showNotice(APPROX_NOTICE, 'Retry GPS', function () { detect(true); });
        setLocLabel();
        syncSelect();
        tick();
      })
      .catch(function () {
        showNotice('Could not get an approximate location. Choose your place in Settings (bell icon).');
        syncSelect();
      })
      .then(function () { clearTimeout(timer); el.btnRefresh.classList.remove('spin'); });
  }

  /* ---------- manual place (when GPS is unavailable) ---------- */
  function buildPlaceSelect() {
    var o = make('option', '', 'Automatic (GPS)');
    o.value = 'gps';
    el.locSelect.appendChild(o);
    var ip = make('option', '', 'Approximate (internet connection)');
    ip.value = 'ip';
    el.locSelect.appendChild(ip);
    PlaceInfo.PLACES.forEach(function (p) {
      var opt = make('option', '', p.name);
      opt.value = p.id;
      el.locSelect.appendChild(opt);
    });
  }
  function syncSelect() {
    el.locSelect.value = loc && loc.manual ? loc.placeId : (loc && loc.source === 'ip' ? 'ip' : 'gps');
  }
  function onPlaceChosen() {
    var v = el.locSelect.value;
    if (v === 'gps') { detect(true); return; }
    if (v === 'ip') { locateByIp(); return; }
    var place = null;
    PlaceInfo.PLACES.forEach(function (p) { if (p.id === v) place = p; });
    if (!place) return;
    lookupSeq++;                                   /* cancel any pending name lookup */
    loc = { lat: place.lat, lng: place.lng, name: place.name + ', Malaysia', named: true, manual: true, placeId: place.id, source: 'manual' };
    save(KEY.loc, loc);
    hideNotice();
    setLocLabel();
    tick();
  }

  /* ---------- azan ---------- */
  var unlocked = false;
  var azanLoaded = null;
  var silentUrl = null;

  function silentWav() {
    if (silentUrl) return silentUrl;
    var n = 800, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    function str(o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); }
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    str(36, 'data'); v.setUint32(40, n * 2, true);
    silentUrl = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
    return silentUrl;
  }

  /* Browsers only allow audio after a user gesture: play a silent clip inside one. */
  function unlockAudio() {
    if (unlocked) return;
    el.audio.src = silentWav();
    var p = el.audio.play();
    azanLoaded = null;
    if (p && p.then) {
      p.then(function () {
        unlocked = true;
        if (el.audio.src === silentUrl) el.audio.pause();   /* never pause the real azan */
      }).catch(function () { /* still locked */ });
    }
  }

  /* Standalone build: the azan sound is embedded in the page as base64 (window.SALAH_EMBED). */
  function embeddedAzan() {
    var bin = atob(EMBED.azan), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: EMBED.azanType || 'audio/mpeg' });
  }

  function loadAzan() {
    if (azanLoaded) return azanLoaded;
    var source = EMBED
      ? (EMBED.azan ? Promise.resolve(embeddedAzan()) : Promise.reject(new Error('missing')))
      : fetch(AZAN_URL, { credentials: 'omit' }).then(function (r) { if (!r.ok) throw new Error('missing'); return r.blob(); });
    azanLoaded = source
      .then(function (b) { el.audio.src = URL.createObjectURL(b); })
      .catch(function (e) { azanLoaded = null; throw e; });
    return azanLoaded;
  }

  function playAzan() {
    return loadAzan().then(function () {
      el.audio.currentTime = 0;
      return el.audio.play();
    }).then(function () {
      unlocked = true;
      updateTestButton();
    }).catch(function (e) {
      if (e && e.name === 'NotAllowedError') {
        showNotice('The browser blocked the azan. Tap to allow sound.', 'Allow', function () { hideNotice(); playAzan(); });
      } else {
        showNotice(EMBED ? 'No azan sound is included in this copy of the app.' : 'Azan audio file not found. Add it as ' + AZAN_URL + ' (see README).');
      }
      updateTestButton();
    });
  }

  function stopAzan() { el.audio.pause(); el.audio.currentTime = 0; updateTestButton(); }

  function updateTestButton() {
    el.azanTest.textContent = (!el.audio.paused && !el.audio.ended && azanLoaded) ? 'Stop azan' : 'Test azan';
  }

  function notify(item) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    var title = 'Waktu ' + P[item.key].ms;
    var opts = { body: P[item.key].ms + ' · ' + hm(item.time) + ' · ' + here().name, icon: 'icons/icon-192.png', tag: 'prayer-time', silent: true };
    if (!EMBED && navigator.serviceWorker) {
      navigator.serviceWorker.ready.then(function (reg) { return reg.showNotification(title, opts); }).catch(function () { /* ignore */ });
    } else {
      /* Single-file build: no service worker exists, so use the page notification (desktop browsers; many phones refuse it). */
      try { new Notification(title, opts); } catch (e) { /* ignore */ }
    }
  }

  function fire(item) {
    var id = item.key + '@' + item.time.getTime();
    if (load(KEY.fired) === id) return;
    save(KEY.fired, id);
    playAzan();
    notify(item);
  }

  /* ---------- settings dialog ---------- */
  function renderAzanState() {
    el.toggle.checked = azanOn;
    el.btnSettings.classList.toggle('off', !azanOn);
    el.btnSettings.setAttribute('aria-label', 'Azan settings (azan is ' + (azanOn ? 'on' : 'off') + ')');
    var n = !('Notification' in window) ? 'not supported here' :
      Notification.permission === 'granted' ? 'allowed' :
      Notification.permission === 'denied' ? 'blocked in browser settings' : 'not asked yet';
    el.azanStatus.textContent = azanOn
      ? 'Azan is on. Alerts: ' + n + '.'
      : 'Azan is off.';
  }

  function standalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }

  function wireUi() {
    el.btnSettings.addEventListener('click', function () { renderAzanState(); syncSelect(); el.dialog.showModal(); });
    el.close.addEventListener('click', function () { el.dialog.close(); });
    el.dialog.addEventListener('click', function (e) { if (e.target === el.dialog) el.dialog.close(); });
    el.btnRefresh.addEventListener('click', function () { detect(true); });
    el.locSelect.addEventListener('change', onPlaceChosen);

    el.toggle.addEventListener('change', function () {
      azanOn = el.toggle.checked;
      save(KEY.azan, azanOn);
      if (azanOn) {
        unlockAudio();
        if ('Notification' in window && Notification.permission === 'default') {
          try {
            var r = Notification.requestPermission();
            if (r && r.then) r.then(renderAzanState);
          } catch (e) { /* ignore */ }
        }
      } else {
        stopAzan();
      }
      renderAzanState();
    });

    el.azanTest.addEventListener('click', function () {
      if (!el.audio.paused && azanLoaded) { stopAzan(); return; }
      unlockAudio();
      playAzan();
    });
    el.audio.addEventListener('ended', updateTestButton);
    el.audio.addEventListener('pause', updateTestButton);

    document.addEventListener('pointerdown', function once() {
      if (azanOn) unlockAudio();
      document.removeEventListener('pointerdown', once);
    });

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'visible') return;
      tick();
      if (Date.now() - lastFixAt > 15 * 60 * 1000) detect(false);
    });

    var deferred = null;
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferred = e;
      el.installBtn.hidden = false;
    });
    el.installBtn.addEventListener('click', function () {
      if (!deferred) return;
      deferred.prompt();
      deferred = null;
      el.installBtn.hidden = true;
    });
    window.addEventListener('appinstalled', function () { el.installBlock.hidden = true; });
    if (standalone()) el.installBlock.hidden = true;
  }

  /* ---------- start ---------- */
  buildList();
  buildPlaceSelect();
  wireUi();
  renderAzanState();
  syncSelect();
  setLocLabel();
  tick();
  setInterval(tick, 1000);
  detect(false);

  if (!EMBED && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(function () { /* app works without it */ });
  }
})();
