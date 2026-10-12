// Tests for Solat.html in headless Chromium, with a mocked clock, GPS and network (nothing leaves the machine).
//   NODE_PATH=$(npm root -g) node tools/test.js [original-v7.html] [screenshot-dir]
// The optional original-v7.html enables the "looks identical to v7" pixel comparison.
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const fixedFile = 'file://' + path.join(root, 'Solat.html');
const origArg = process.argv[2] && fs.existsSync(process.argv[2]) ? path.resolve(process.argv[2]) : null;
const shotDir = process.argv[3] || null;
let bad = 0, total = 0; const MIRROR_HITS = []; let jakimMode = 'ok';
const check = (name, ok, detail) => { total++; if (!ok) bad++; console.log((ok ? '  ok    ' : '  FAIL  ') + name + (ok ? '' : '   -> ' + detail)); };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const NOW = '2026-10-12T05:10:00Z';   // 13:10 in Malaysia
const MON = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
// The real JAKIM SGR01 row for 12-Okt-2026 (from data pasted by the user). Its Zohor/Asar/Maghrib/Isyak differ from the app's own calculation by 1 min, so the tests can tell the two apart.
const REAL = { imsak: '05:41:00', fajr: '05:51:00', syuruk: '06:57:00', dhuhr: '13:03:00', asr: '16:17:00', maghrib: '19:03:00', isha: '20:12:00' };
const REAL_LIST = ['05:41', '05:51', '06:57', '13:03', '16:17', '19:03', '20:12'];        // Imsak..Isyak as shown in the list
const CALC_LIST = ['05:41', '05:51', '06:56', '13:02', '16:17', '19:04', '20:13'];        // the app's own calculation for Hulu Langat (3.10, 101.80) that day
function jakimBody(url, mode) {
  const zone = (/zone=([A-Z0-9]+)/.exec(url) || [])[1] || 'SGR01', period = (/period=(\w+)/.exec(url) || [])[1];
  const rows = []; const end = period === 'year' ? 12 : 10, start = period === 'year' ? 1 : 10;
  for (let m = start; m <= end; m++) for (let d = 1; d <= new Date(2026, m, 0).getDate(); d++) {
    const row = Object.assign({ hijri: '1448-01-01', date: String(d).padStart(2, '0') + '-' + MON[m - 1] + '-2026', day: 'Monday', dhuha: '07:22:00' }, REAL);
    if (mode === 'far') { row.fajr = '05:11:00'; row.imsak = '05:01:00'; }   // 40 minutes off
    rows.push(row);
  }
  return JSON.stringify({ prayerTime: rows, status: 'OK!', serverTime: '2026-10-12 16:45:13', periodType: period, lang: 'ms_my', zone: mode === 'wrongzone' ? 'SGR02' : zone, bearing: '291' });
}

(async () => {
  const hostDir = path.join(root, 'dist', 'host');
  const srv = http.createServer((q, r) => { const p = path.join(hostDir, q.url === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(hostDir) || !fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
  const hostUrl = 'http://localhost:' + srv.address().port + '/';
  const browser = await chromium.launch();

  async function open(url, o = {}) {
    const ctx = await browser.newContext({ timezoneId: 'Asia/Kuala_Lumpur', locale: 'ms-MY', viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: o.touch !== false, isMobile: o.touch !== false,
      geolocation: o.grant ? { latitude: 3.10, longitude: 101.80 } : undefined, permissions: o.grant ? ['geolocation'] : [] });
    const net = { nominatim: [], ip: [], jakim: [], mirror: [], other: [] }, problems = [];
    await ctx.route(/^https?:\/\/(?!localhost)/, r => {
      const u = r.request().url(), cors = { 'access-control-allow-origin': '*' };
      if (/nominatim/.test(u)) { net.nominatim.push(u); const zoom = (/zoom=(\d+)/.exec(u) || [])[1]; const addr = (o.addressByZoom && o.addressByZoom[zoom]) || o.address; return r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(addr ? (/search/.test(u) ? [{ lat: '3.1', lon: '101.8', address: addr }] : { address: addr }) : (/search/.test(u) ? [] : { address: {} })) }); }
      if (/ipwho|ipapi|geojs/.test(u)) { net.ip.push(u); if (o.ipFail) return r.abort(); return r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, latitude: 6.1234, longitude: 102.2412, city: o.ipCity || 'Kota Bharu', region: 'Kelantan' }) }); }
      if (/waktusolat/.test(u)) { MIRROR_HITS.push(u); net.mirror.push(u); return r.abort(); }
      if (/e-solat\.gov\.my/.test(u)) {
        net.jakim.push(u.replace('https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&', ''));
        if (jakimMode === 'abort') return r.abort();
        if (jakimMode === 'year404' && /period=year/.test(u)) return r.fulfill({ status: 404, headers: cors, body: 'no' });
        return r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: jakimBody(u, jakimMode) });
      }
      net.other.push(u); return r.abort();
    });
    if (o.geoPlan) await ctx.addInitScript(plan => { window.__calls = []; const seq = plan.slice(); navigator.geolocation.getCurrentPosition = (ok, err, opts) => { window.__calls.push(opts); const st = seq.shift() || { err: 2 }; setTimeout(() => st.ok ? ok({ coords: { latitude: st.ok[0], longitude: st.ok[1] } }) : err({ code: st.err }), 0); }; }, o.geoPlan);
    const page = await ctx.newPage();
    page.on('pageerror', e => problems.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|ERR_INTERNET|net::/.test(m.text())) problems.push(m.text()); });
    await page.clock.install({ time: new Date(NOW) });
    if (o.frozen) await page.clock.setFixedTime(new Date(NOW));   // time stops, so screenshots of two builds are comparable
    await page.goto(url);
    await page.waitForFunction(() => document.getElementById('hero-count').textContent !== '--:--:--');
    await page.waitForTimeout(o.wait || 600);
    return { ctx, page, net, problems, t: id => page.locator('#' + id).textContent() };
  }

  console.log('A. Standalone file opened from disk (file://) - how you downloaded it');
  { const { ctx, page, problems, t } = await open(fixedFile, { grant: true, address: { town: 'Kajang', state: 'Selangor' } });
    check('phone/touch: page title is "Solat Times" and stays fixed (v7 rewrote it every second, which can become the shortcut name)', (await page.title()) === 'Solat Times', await page.title());
    check('home-screen titles: apple-mobile-web-app-title + application-name = Solat Times', await page.evaluate(() => document.querySelector('meta[name=apple-mobile-web-app-title]').content === 'Solat Times' && document.querySelector('meta[name=application-name]').content === 'Solat Times'));
    check('brand footnote "© 2026 Digitiska" shown below the source line', await page.evaluate(() => { const b = document.getElementById('brand'), s = document.getElementById('src'); return !!b && b.textContent === '© 2026 Digitiska' && b.getBoundingClientRect().top >= s.getBoundingClientRect().bottom && getComputedStyle(b).display !== 'none'; }));
    check('no data: manifest any more (the cause of the invalid start_url)', await page.evaluate(() => !/^data:/.test(document.querySelector('link[rel=manifest]').getAttribute('href'))));
    check('icons embedded (favicon + apple-touch-icon are the PrayerTimes icon, small)', await page.evaluate(() => ['icon', 'apple-touch-icon'].every(r => /^data:image\/png;base64,/.test(document.querySelector('link[rel="' + r + '"]').getAttribute('href')) && document.querySelector('link[rel="' + r + '"]').getAttribute('href').length < 8000)));
    check('in-app brand text unchanged: "Waktu Solat"', (await page.locator('.brand').textContent()) === 'Waktu Solat');
    check('hero shows a prayer (Zohor at 13:10)', (await t('hero-name')) === 'Zohor', await t('hero-name'));
    check('no script errors', problems.length === 0, problems.join(' | '));
    await ctx.close();
    const d = await open(fixedFile, { grant: true, touch: false });
    check('desktop (mouse): live countdown still shown in the tab title', /\d\d:\d\d:\d\d · Waktu Solat/.test(await d.page.title()), await d.page.title());
    await d.ctx.close(); }

  console.log('B. Hosted over HTTPS-like origin (http://localhost): installable manifest + offline');
  { const { ctx, page, problems } = await open(hostUrl, { grant: true });
    const cdp = await ctx.newCDPSession(page); const man = await cdp.send('Page.getAppManifest');
    check('manifest is a real file URL', /^http:\/\/localhost:\d+\/manifest\.webmanifest$/.test(man.url), man.url.slice(0, 60));
    check('manifest has NO parse errors (v7 had: start_url ignored)', man.errors.length === 0, JSON.stringify(man.errors.map(e => e.message)));
    const m = JSON.parse(man.data);
    check('name = Solat Times, short_name = Solat Times (fits a home-screen label: 11 characters)', m.name === 'Solat Times' && m.short_name === 'Solat Times', m.name + '/' + m.short_name);
    check('start_url resolves inside the site, display standalone', /\/$/.test(m.start_url) || m.start_url === './' || /localhost/.test(m.start_url), m.start_url + ' ' + m.display);
    const ic = await page.evaluate(async () => { const r = []; for (const s of ['icons/icon-192.png', 'icons/icon-512.png']) { const x = await fetch(s); const b = await x.blob(); const bm = await createImageBitmap(b); r.push(x.ok + ':' + bm.width + 'x' + bm.height); } return r; });
    check('icon files load: 192x192 and 512x512', ic.join() === 'true:192x192,true:512x512', ic.join());
    await page.evaluate(() => navigator.serviceWorker.ready); await page.reload(); await page.waitForFunction(() => navigator.serviceWorker.controller);
    check('service worker is controlling the page', true);
    await ctx.setOffline(true); await page.reload(); await page.waitForFunction(() => document.getElementById('hero-count').textContent !== '--:--:--');
    check('reloads fully while offline', (await page.locator('#hero-name').textContent()).trim().length > 1);
    check('no script errors', problems.length === 0, problems.join(' | '));
    await ctx.close(); }

  console.log('C. Location allowed: council name is NOT shown; coordinates sent out are rounded');
  { const { ctx, net, t } = await open(fixedFile, { grant: true, address: { suburb: 'Bandar Sri Permaisuri', city: 'Majlis Perbandaran Kajang', county: 'Hulu Langat', state: 'Selangor', country: 'Malaysia' } });
    check('label = "Hulu Langat, Selangor" (v7 showed the council)', (await t('loc-name')) === 'Hulu Langat, Selangor', await t('loc-name'));
    check('place lookup used 2-decimal position (about 1 km)', net.nominatim.length > 0 && net.nominatim.every(u => /lat=3\.10&lon=101\.80/.test(u)), net.nominatim.join(' '));
    check('timetable requested from JAKIM for zone SGR01 (whole year first; WLY01 first = the default place Kuala Lumpur before GPS answers)', net.jakim.includes('zone=SGR01&period=year'), net.jakim.join(' '));
    check('no internet-address lookup happened', net.ip.length === 0, net.ip.join(' '));
    check('no notice shown', await ctx.pages()[0].locator('#notice').isHidden());
    await ctx.close(); }

  console.log('D. Location DENIED: no silent internet lookup; clear message; approximate only on request');
  { const { ctx, page, net, t } = await open(fixedFile, { grant: false, address: { county: 'Kota Bharu', state: 'Kelantan' } });
    check('NO internet-address request without consent (v7 sent one immediately)', net.ip.length === 0, net.ip.join(' '));
    check('message explains denied + how to allow', /Lokasi tidak dibenarkan.*benarkan Lokasi/.test(await t('notice-text')), await t('notice-text'));
    check('action button = "Guna anggaran"', (await t('notice-action')) === 'Guna anggaran', await t('notice-action'));
    check('still shows the default place meanwhile', (await t('loc-name')) === 'Kuala Lumpur', await t('loc-name'));
    await page.click('#notice-action'); await page.waitForFunction(() => /Kota Bharu/.test(document.getElementById('loc-name').textContent), null, { timeout: 5000 }).catch(() => {});
    check('after tapping: approximate place "Kota Bharu, Kelantan"', (await t('loc-name')) === 'Kota Bharu, Kelantan', await t('loc-name'));
    check('only the first service was asked (ipwho.is)', net.ip.length === 1 && /ipwho/.test(net.ip[0]), net.ip.join(' '));
    check('approximate warning shown', /Lokasi anggaran internet/.test(await t('notice-text')), await t('notice-text'));
    check('approximate place Kota Bharu -> JAKIM zone KTN01', net.jakim.some(u => u === 'zone=KTN01&period=year'), net.jakim.join(' '));
    await page.reload(); await page.waitForFunction(() => document.getElementById('hero-count').textContent !== '--:--:--'); await page.waitForTimeout(600);
    check('after reload (GPS denied again): keeps the approximate place + warning, no new internet lookup', (await t('loc-name')) === 'Kota Bharu, Kelantan' && /Lokasi anggaran internet/.test(await t('notice-text')), await t('loc-name') + ' | ' + await t('notice-text'));
    await ctx.close(); }

  console.log('E. Approximate lookup fails / returns a council as the city');
  { const { ctx, page, t } = await open(fixedFile, { grant: false, ipFail: true });
    await page.click('#notice-action'); await page.waitForFunction(() => /gagal/.test(document.getElementById('notice-text').textContent), null, { timeout: 8000 }).catch(() => {});
    check('all lookups fail -> clear message, stays on default place', /Anggaran lokasi gagal/.test(await t('notice-text')) && (await t('loc-name')) === 'Kuala Lumpur', await t('notice-text') + ' | ' + await t('loc-name'));
    await ctx.close();
    const c2 = await open(fixedFile, { grant: false, ipCity: 'Majlis Perbandaran Kajang' });
    await c2.page.click('#notice-action'); await c2.page.waitForTimeout(1500);
    check('council returned as city is dropped from the label', !/Majlis/i.test(await c2.t('loc-name')), await c2.t('loc-name'));
    await c2.ctx.close(); }

  console.log('F. GPS retry logic (simulated phone: slow indoor GPS, weak signal)');
  { let r = await open(fixedFile, { grant: true, geoPlan: [{ err: 3 }, { ok: [3.1, 101.8] }], address: { county: 'Hulu Langat', state: 'Selangor' } });
    const calls = await r.page.evaluate(() => window.__calls);
    check('timeout on 1st try -> 2nd try with GPS accuracy succeeds', (await r.t('loc-name')) === 'Hulu Langat, Selangor' && calls.length === 2, (await r.t('loc-name')) + ' calls=' + calls.length);
    check('1st try = low power, 15 s, cached 5 min (v7: high accuracy, 12 s, no cache)', calls[0].enableHighAccuracy === false && calls[0].timeout === 15000 && calls[0].maximumAge === 300000, JSON.stringify(calls[0]));
    check('2nd try = high accuracy, 20 s', calls[1].enableHighAccuracy === true && calls[1].timeout === 20000, JSON.stringify(calls[1]));
    await r.ctx.close();
    r = await open(fixedFile, { grant: true, geoPlan: [{ err: 2 }, { err: 2 }] });
    check('unavailable twice -> "Lokasi tidak dapat dikesan" message + approximate button', /Lokasi tidak dapat dikesan/.test(await r.t('notice-text')) && (await r.t('notice-action')) === 'Guna anggaran', await r.t('notice-text'));
    await r.ctx.close();
    r = await open(fixedFile, { grant: true, geoPlan: [{ err: 1 }, { ok: [3.1, 101.8] }] });
    check('permission denied is final: no second attempt', (await r.page.evaluate(() => window.__calls.length)) === 1 && /tidak dibenarkan/.test(await r.t('notice-text')), '');
    await r.ctx.close(); }

  console.log('H. Timetable straight from JAKIM (mocked server; format copied from the real answer)');
  { jakimMode = 'ok'; MIRROR_HITS.length = 0;
    let r = await open(fixedFile, { grant: true, address: { county: 'Hulu Langat', state: 'Selangor' }, wait: 1500 });
    const times = async () => (await r.page.locator('#list .t').allTextContents());
    check('footer says JAKIM e-Solat and the zone', (await r.t('src')) === 'Waktu Solat · Jadual JAKIM e-Solat · Zon SGR01', await r.t('src'));
    check("list shows JAKIM's times, not the calculation (" + REAL_LIST.join(' ') + ')', (await times()).join() === REAL_LIST.join(), (await times()).join() + ' vs calc ' + CALC_LIST.join());
    check('requests go only to e-solat.gov.my for the timetable: zone code + period, nothing about the user', r.net.jakim.every(u => /^zone=(WLY01|SGR01)&period=(year|month)$/.test(u)) && r.net.jakim.includes('zone=SGR01&period=year'), r.net.jakim.join(' '));
    check('Zohor started 13:03 (JAKIM)', (await r.t('hero-start')) === '13:03', await r.t('hero-start'));
    if (shotDir) await r.page.screenshot({ path: path.join(shotDir, 'jakim-ok.png'), fullPage: true });
    jakimMode = 'abort'; await r.page.reload(); await r.page.waitForFunction(() => document.getElementById('hero-count').textContent !== '--:--:--'); await r.page.waitForTimeout(1500);
    check('after reload with JAKIM unreachable: cached JAKIM times still shown and labelled JAKIM', (await times()).join() === REAL_LIST.join() && /Jadual JAKIM e-Solat · Zon SGR01/.test(await r.t('src')), (await times()).join() + ' | ' + await r.t('src'));
    await r.ctx.close();

    jakimMode = 'year404'; r = await open(fixedFile, { grant: true, address: { county: 'Hulu Langat', state: 'Selangor' }, wait: 1800 });
    check('JAKIM refuses period=year -> app falls back to period=month (and stops trying year this session) and still shows JAKIM data', r.net.jakim.filter(u => /period=year/.test(u)).length === 1 && r.net.jakim.includes('zone=SGR01&period=month') && /Jadual JAKIM e-Solat/.test(await r.t('src')), r.net.jakim.join(' ') + ' | ' + await r.t('src'));
    await r.ctx.close();

    for (const [mode, why] of [['far', 'Subuh 40 min off the calculation (garbled/wrong data)'], ['wrongzone', 'answer is for a different zone than requested'], ['abort', 'JAKIM unreachable']]) {
      jakimMode = mode; r = await open(fixedFile, { grant: true, address: { county: 'Hulu Langat', state: 'Selangor' }, wait: 1500 });
      const tt = (await r.page.locator('#list .t').allTextContents()).join();
      check('rejected -> own calculation shown and labelled as such (' + why + ')', !/JAKIM e-Solat · Zon/.test(await r.t('src')) && /Kiraan pada peranti/.test(await r.t('src')) && tt === CALC_LIST.join(), await r.t('src') + ' | ' + tt);
      await r.ctx.close(); }
    jakimMode = 'ok';

    r = await open(fixedFile, { grant: true, address: { county: 'Kajang', state: 'Selangor' }, wait: 1200 });
    check('district not in JAKIM list -> NO guess: no request for any zone but the default place WLY01, footer asks to pick a district', r.net.jakim.every(u => u.startsWith('zone=WLY01')) && /pilih daerah untuk jadual JAKIM/.test(await r.t('src')), r.net.jakim.join(' ') + ' | ' + await r.t('src'));
    await r.ctx.close();

    r = await open(fixedFile, { grant: false, address: { county: 'Hulu Langat', state: 'Selangor' }, wait: 800 });
    await r.page.selectOption('#city', 'district:Selangor:Hulu Langat'); await r.page.waitForTimeout(1800);
    check('picking a district from the list -> its zone SGR01 straight away', r.net.jakim.some(u => u === 'zone=SGR01&period=year') && /Zon SGR01/.test(await r.t('src')), r.net.jakim.join(' ') + ' | ' + await r.t('src'));
    await r.page.selectOption('#city', 'Kuala Lumpur'); await r.page.waitForTimeout(1500);
    check('picking Kuala Lumpur -> zone WLY01', r.net.jakim.some(u => u === 'zone=WLY01&period=year') && /Zon WLY01/.test(await r.t('src')), r.net.jakim.join(' ') + ' | ' + await r.t('src'));
    await r.page.selectOption('#city', 'Singapura'); await r.page.waitForTimeout(1000);
    check('Singapore -> no JAKIM zone, calculation used', !/Zon /.test(await r.t('src')), await r.t('src'));
    await r.ctx.close();
    // REAL CASE from the user's phone: the first place lookup returns only "Bangi Lama" + state (no district field)
    r = await open(fixedFile, { grant: true, addressByZoom: { 12: { suburb: 'Bangi Lama', state: 'Selangor', country: 'Malaysia' }, 8: { county: 'Hulu Langat', state: 'Selangor', country: 'Malaysia' } }, wait: 3500 });
    const zooms = r.net.nominatim.map(u => (/zoom=(\d+)/.exec(u) || [])[1]);
    check('"Bangi Lama" case: 1st lookup has no district -> 2nd lookup at district level finds Hulu Langat -> zone SGR01', zooms.join() === '12,8' && /Jadual JAKIM e-Solat · Zon SGR01/.test(await r.t('src')), zooms.join() + ' | ' + await r.t('src'));
    check('place name still shows the local place: "Bangi Lama, Selangor"', (await r.t('loc-name')) === 'Bangi Lama, Selangor', await r.t('loc-name'));
    check('JAKIM times shown (' + REAL_LIST.join(' ') + ')', (await r.page.locator('#list .t').allTextContents()).join() === REAL_LIST.join(), (await r.page.locator('#list .t').allTextContents()).join());
    for (let i = 0; i < 5; i++) await r.page.click('#brand');
    const dtxt = await r.page.locator('#dbg').textContent();
    check('tapping the footnote 5 times shows the diagnostic (zone + what the place service answered)', await r.page.locator('#dbg').isVisible() && /"zone": "SGR01"/.test(dtxt) && /Bangi Lama/.test(dtxt) && /"zoom8"/.test(dtxt), dtxt.slice(0, 160));
    for (let i = 0; i < 5; i++) await r.page.click('#brand');
    check('5 more taps hide it again', !(await r.page.locator('#dbg').isVisible()));
    await r.ctx.close();

    r = await open(fixedFile, { grant: true, addressByZoom: { 12: { suburb: 'Bangi Lama', district: 'Hulu Langat', state: 'Selangor' } }, wait: 2000 });
    check('district under the key "district": found at once, no extra lookups', r.net.nominatim.length === 1 && /Zon SGR01/.test(await r.t('src')), r.net.nominatim.length + ' lookups | ' + await r.t('src'));
    await r.ctx.close();

    r = await open(fixedFile, { grant: true, addressByZoom: { 12: { suburb: 'Bangi Lama', state: 'Selangor' } }, wait: 4500 });
    const z3 = r.net.nominatim.map(u => (/zoom=(\d+)/.exec(u) || [])[1]);
    check('no lookup ever gives a district -> exactly 3 lookups (12, 8, 10), then the honest footer hint, no JAKIM request for a guessed zone', z3.join() === '12,8,10' && /pilih daerah untuk jadual JAKIM/.test(await r.t('src')) && r.net.jakim.every(u => u.startsWith('zone=WLY01')), z3.join() + ' | ' + await r.t('src') + ' | ' + r.net.jakim.join(' '));
    await r.ctx.close();
    check('api.waktusolat.app was never contacted in any scenario above', MIRROR_HITS.length === 0, MIRROR_HITS.join(' ')); }

  if (origArg) {
    console.log('G. Looks identical to your v7 (pixel comparison, same time, same place, no notice)');
    const addr = { county: 'Hulu Langat', state: 'Selangor' }, shots = {};
    const doms = {};
    for (const [k, url] of [['v7', 'file://' + origArg], ['v7b', 'file://' + origArg], ['fixed', fixedFile]]) { jakimMode = 'abort'; const r = await open(url, { grant: true, address: addr, wait: 1200, frozen: true }); jakimMode = 'ok'; doms[k] = await r.page.evaluate(() => document.querySelector('main').outerHTML); await r.page.evaluate(() => { const b = document.getElementById('brand'); if (b) b.style.display = 'none'; }); shots[k] = await r.page.screenshot({ fullPage: true }); await r.ctx.close(); }
    const styleOf = f => (/<style>([\s\S]*?)<\/style>/.exec(fs.readFileSync(f, 'utf8')) || [])[1];
    check('stylesheet is the same as your v7 plus only the footnote spacing and the hidden-diagnostic rule', styleOf(origArg) !== undefined && styleOf(origArg) === styleOf(path.join(root, 'Solat.html')).replace('\n#brand{margin-top:4px}', '').replace(/\n#dbg\{[^}]*\}/, ''), 'differs');
    check('page content (<main> markup) is identical to your v7 plus only the footnote and the hidden diagnostic element', doms.v7 === doms.fixed.replace(/\s*<footer id="brand">[^<]*<\/footer>/, '').replace(/\s*<pre id="dbg"[^>]*><\/pre>/, ''), 'differs');
    const p = await browser.newPage();
    const cmp = async (x, y) => p.evaluate(async ([a, b]) => { const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; }); const [u, v] = await Promise.all([load(a), load(b)]); if (u.width !== v.width || u.height !== v.height) return { size: false }; const g = i => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const t = c.getContext('2d'); t.drawImage(i, 0, 0); return t.getImageData(0, 0, i.width, i.height).data; }; const d1 = g(u), d2 = g(v); let n = 0, max = 0, big = 0; for (let k = 0; k < d1.length; k += 4) { const d = Math.max(Math.abs(d1[k] - d2[k]), Math.abs(d1[k + 1] - d2[k + 1]), Math.abs(d1[k + 2] - d2[k + 2])); if (d) { n++; max = Math.max(max, d); if (d > 4) big++; } } return { size: true, differing: n, maxDelta: max, over4: big }; }, [x.toString('base64'), y.toString('base64')]);
    const control = await cmp(shots.v7, shots.v7b), real = await cmp(shots.v7, shots.fixed); await p.close();
    console.log('        control (v7 against v7): ' + JSON.stringify(control) + '\n        v7 against fixed:        ' + JSON.stringify(real));
    check('screenshots: same size and no pixel differs by more than 4/255 (any smaller difference is rendering jitter on rounded corners)', real.size && real.over4 === 0, JSON.stringify(real));
    if (shotDir) { fs.writeFileSync(path.join(shotDir, 'v7.png'), shots.v7); fs.writeFileSync(path.join(shotDir, 'fixed.png'), shots.fixed); }
  }

  await browser.close(); srv.close();
  console.log('\n' + (bad ? bad + ' FAILED of ' + total : 'ALL ' + total + ' CHECKS PASSED')); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
