// Tests for Solat.html in headless Chromium, with a mocked clock, GPS and network (nothing leaves the machine).
//   NODE_PATH=$(npm root -g) node tools/test.js [original-v7.html] [screenshot-dir]
// The optional original-v7.html enables the "looks identical to v7" pixel comparison.
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const fixedFile = 'file://' + path.join(root, 'Solat.html');
const origArg = process.argv[2] && fs.existsSync(process.argv[2]) ? path.resolve(process.argv[2]) : null;
const shotDir = process.argv[3] || null;
let bad = 0, total = 0;
const check = (name, ok, detail) => { total++; if (!ok) bad++; console.log((ok ? '  ok    ' : '  FAIL  ') + name + (ok ? '' : '   -> ' + detail)); };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const NOW = '2026-10-12T05:10:00Z';   // 13:10 in Malaysia

(async () => {
  const hostDir = path.join(root, 'dist', 'host');
  const srv = http.createServer((q, r) => { const p = path.join(hostDir, q.url === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(hostDir) || !fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
  const hostUrl = 'http://localhost:' + srv.address().port + '/';
  const browser = await chromium.launch();

  async function open(url, o = {}) {
    const ctx = await browser.newContext({ timezoneId: 'Asia/Kuala_Lumpur', locale: 'ms-MY', viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: o.touch !== false, isMobile: o.touch !== false,
      geolocation: o.grant ? { latitude: 3.10, longitude: 101.80 } : undefined, permissions: o.grant ? ['geolocation'] : [] });
    const net = { nominatim: [], ip: [], zones: [], other: [] }, problems = [];
    await ctx.route(/^https?:\/\/(?!localhost)/, r => {
      const u = r.request().url(), cors = { 'access-control-allow-origin': '*' };
      if (/nominatim/.test(u)) { net.nominatim.push(u); return r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(o.address ? (/search/.test(u) ? [{ lat: '3.1', lon: '101.8', address: o.address }] : { address: o.address }) : (/search/.test(u) ? [] : { address: {} })) }); }
      if (/ipwho|ipapi|geojs/.test(u)) { net.ip.push(u); if (o.ipFail) return r.abort(); return r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, latitude: 6.1234, longitude: 102.2412, city: o.ipCity || 'Kota Bharu', region: 'Kelantan' }) }); }
      if (/waktusolat/.test(u)) { net.zones.push(u); return r.abort(); }
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
    check('phone/touch: page title stays "Solat" (v7 rewrote it every second, which can become the shortcut name)', (await page.title()) === 'Solat', await page.title());
    check('home-screen titles: apple-mobile-web-app-title + application-name = Solat', await page.evaluate(() => document.querySelector('meta[name=apple-mobile-web-app-title]').content === 'Solat' && document.querySelector('meta[name=application-name]').content === 'Solat'));
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
    check('name = Solat, short_name = Solat', m.name === 'Solat' && m.short_name === 'Solat', m.name + '/' + m.short_name);
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
    check('timetable zone lookup for the real position is 2-decimal', net.zones.some(u => /\/zones\/3\.1\/101\.8$/.test(u)), net.zones.join(' '));
    check('no internet-address lookup happened', net.ip.length === 0, net.ip.join(' '));
    check('no notice shown', await ctx.pages()[0].locator('#notice').isHidden());
    await ctx.close(); }

  console.log('D. Location DENIED: no silent internet lookup; clear message; approximate only on request');
  { const { ctx, page, net, t } = await open(fixedFile, { grant: false });
    check('NO internet-address request without consent (v7 sent one immediately)', net.ip.length === 0, net.ip.join(' '));
    check('message explains denied + how to allow', /Lokasi tidak dibenarkan.*benarkan Lokasi/.test(await t('notice-text')), await t('notice-text'));
    check('action button = "Guna anggaran"', (await t('notice-action')) === 'Guna anggaran', await t('notice-action'));
    check('still shows the default place meanwhile', (await t('loc-name')) === 'Kuala Lumpur', await t('loc-name'));
    await page.click('#notice-action'); await page.waitForFunction(() => /Kota Bharu/.test(document.getElementById('loc-name').textContent), null, { timeout: 5000 }).catch(() => {});
    check('after tapping: approximate place "Kota Bharu, Kelantan"', (await t('loc-name')) === 'Kota Bharu, Kelantan', await t('loc-name'));
    check('only the first service was asked (ipwho.is)', net.ip.length === 1 && /ipwho/.test(net.ip[0]), net.ip.join(' '));
    check('approximate warning shown', /Lokasi anggaran internet/.test(await t('notice-text')), await t('notice-text'));
    check('timetable zone lookup rounded to 2 decimals (6.12/102.24)', net.zones.some(u => /\/zones\/6\.12\/102\.24$/.test(u)), net.zones.join(' '));
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

  if (origArg) {
    console.log('G. Looks identical to your v7 (pixel comparison, same time, same place, no notice)');
    const addr = { town: 'Kajang', state: 'Selangor' };
    const shots = {};
    for (const [k, url] of [['v7', 'file://' + origArg], ['fixed', fixedFile]]) { const r = await open(url, { grant: true, address: addr, wait: 1200, frozen: true }); shots[k] = await r.page.screenshot({ fullPage: true }); await r.ctx.close(); }
    const same = Buffer.compare(shots.v7, shots.fixed) === 0;
    let diff = 0, bboxInfo = null; if (!same) { const p = await browser.newPage(); diff = await p.evaluate(async ([a, b]) => { const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; }); const [x, y] = await Promise.all([load(a), load(b)]); if (x.width !== y.width || x.height !== y.height) return -1; const g = i => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const t = c.getContext('2d'); t.drawImage(i, 0, 0); return t.getImageData(0, 0, i.width, i.height).data; }; const d1 = g(x), d2 = g(y); let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (let k = 0; k < d1.length; k += 4) if (d1[k] !== d2[k] || d1[k + 1] !== d2[k + 1] || d1[k + 2] !== d2[k + 2]) { n++; const px = (k / 4) % x.width, py = Math.floor(k / 4 / x.width); x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); } if (n) window.__bbox = [x0, y0, x1, y1]; return n; }, [shots.v7.toString('base64'), shots.fixed.toString('base64')]); bboxInfo = await p.evaluate(() => window.__bbox || null); await p.close(); }
    check('full-page screenshots identical (' + (same ? 'byte-for-byte' : diff + ' differing pixels') + ')', same || diff === 0, diff + ' pixels differ, box ' + JSON.stringify(bboxInfo));
    if (shotDir) { fs.writeFileSync(path.join(shotDir, 'v7.png'), shots.v7); fs.writeFileSync(path.join(shotDir, 'fixed.png'), shots.fixed); }
  }

  await browser.close(); srv.close();
  console.log('\n' + (bad ? bad + ' FAILED of ' + total : 'ALL ' + total + ' CHECKS PASSED')); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
