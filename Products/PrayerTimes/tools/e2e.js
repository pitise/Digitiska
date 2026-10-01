// End-to-end test in headless Chromium: mocked clock, GPS, timezone and place-name service.
//   NODE_PATH=$(npm root -g) node tools/e2e.js [screenshot-dir]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const shotDir = process.argv[2] || null;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg' };

let results = [], serveAzan = false, expect404 = false;
const check = (name, ok, detail) => { results.push(ok); console.log((ok ? '  ok    ' : '  FAIL  ') + name + (ok ? '' : '   -> ' + detail)); };
const secs = s => { const m = s.match(/^(\d+):(\d\d):(\d\d)$/); return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : NaN; };
const wavBytes = () => { const n = 8000, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(8000, 24); b.writeUInt32LE(16000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40); return b; };

(async () => {
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/audio/azan.mp3') && serveAzan) { res.writeHead(200, { 'Content-Type': 'audio/wav' }); return res.end(wavBytes()); }
    const p = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  }).listen(0);
  const base = 'http://localhost:' + server.address().port + '/';
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const nominatimUrls = [];
  const problems = [];

  async function open(isoUtc, opts = {}) {
    const ctx = await browser.newContext({
      timezoneId: 'Asia/Kuala_Lumpur', locale: 'en-US', viewport: { width: 430, height: 932 },
      geolocation: opts.noGeo ? undefined : { latitude: 3.10, longitude: 101.80 },
      permissions: opts.noGeo ? ['notifications'] : ['geolocation', 'notifications'], serviceWorkers: 'allow'
    });
    await ctx.route('https://nominatim.openstreetmap.org/**', r => { nominatimUrls.push(r.request().url()); r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ address: { county: 'Hulu Langat', state: 'Selangor', country: 'Malaysia' } }) }); });
    serveAzan = !!opts.azanFile;
    /* Headless Chromium always reports Notification.permission as 'denied'; stub it to exercise the app's code path. */
    await ctx.addInitScript(() => {
      Object.defineProperty(Notification, 'permission', { get: () => 'granted' });
      ServiceWorkerRegistration.prototype.showNotification = function (t, o) { (window.__notes = window.__notes || []).push({ t: t, o: o }); return Promise.resolve(); };
    });
    const page = await ctx.newPage();
    page.on('pageerror', e => problems.push('pageerror: ' + e.message));
    page.on('console', m => { if ((m.type() === 'error' && !(expect404 && /404/.test(m.text()))) || /Content Security Policy/i.test(m.text())) problems.push(m.type() + ': ' + m.text()); });
    await page.clock.install({ time: new Date(isoUtc) });
    await page.goto(base);
    await page.waitForFunction(() => document.getElementById('hero-count').textContent !== '--:--:--');
    return { ctx, page };
  }
  const txt = (page, id) => page.locator('#' + id).textContent();

  console.log('A. Reproduce the reference screenshot: Fri 02.Oct.2026 01:10:57 (MYT), Hulu Langat');
  {
    const { ctx, page } = await open('2026-10-01T17:10:57Z');
    await page.waitForFunction(() => document.getElementById('loc-name').textContent.includes('Hulu Langat'));
    check('location label', (await txt(page, 'loc-name')) === 'Hulu Langat, Malaysia', await txt(page, 'loc-name'));
    check('place lookup sent rounded position (~1 km)', nominatimUrls.every(u => /lat=3\.10&lon=101\.80$/.test(u)) && nominatimUrls.length > 0, nominatimUrls.join(' '));
    check('date line', (await txt(page, 'date-main')) === 'Jumaat, 2 Oktober', await txt(page, 'date-main'));
    check('hijri line (reference showed "21 Rabiulakhir 1448 H")', (await txt(page, 'date-hijri')) === '21 Rabiulakhir 1448 H', await txt(page, 'date-hijri'));
    check('current prayer = Isyak', (await txt(page, 'hero-name')) === 'Isyak', await txt(page, 'hero-name'));
    check('Isyak started 20:14', (await txt(page, 'hero-start')) === '20:14', await txt(page, 'hero-start'));
    const left = secs(await txt(page, 'hero-count'));
    check('Ends in ~04:32:0x (reference showed 04:32:03)', Math.abs(left - (4 * 3600 + 32 * 60 + 3)) <= 4, left);
    const times = await page.locator('.row .time').allTextContents();
    check('list = 5:43, 7:00, 13:04, 16:13, 19:05, 20:14', times.join(',') === '5:43,7:00,13:04,16:13,19:05,20:14', times.join(','));
    check('only Isyak row marked NOW', (await page.locator('.row.is-now .name').allTextContents()).join() === 'Isyak');
    if (shotDir) await page.screenshot({ path: path.join(shotDir, 'A-isyak-0110.png'), fullPage: true });
    await ctx.close();
  }

  const scen = [
    ['B. 05:50 MYT -> Subuh',            '2026-10-01T21:50:00Z', 'Subuh',   'Ends in',  1 * 3600 + 10 * 60, 'Next prayer: Zohor at 13:04 (in 07:'],
    ['C. 07:30 MYT -> Syuruk',           '2026-10-01T23:30:00Z', 'Syuruk',  'Zohor in', 5 * 3600 + 34 * 60, 'No obligatory prayer now'],
    ['D. 13:10 MYT -> Zohor',            '2026-10-02T05:10:00Z', 'Zohor',   'Ends in',  3 * 3600 + 3 * 60,  'Next prayer: Asar at 16:13'],
    ['E. 17:00 MYT -> Asar',             '2026-10-02T09:00:00Z', 'Asar',    'Ends in',  2 * 3600 + 5 * 60,  'Next prayer: Maghrib at 19:05'],
    ['F. 19:30 MYT -> Maghrib',          '2026-10-02T11:30:00Z', 'Maghrib', 'Ends in',  44 * 60,            'Next prayer: Isyak at 20:14']
  ];
  for (const [title, iso, name, label, wantSec, nextStart] of scen) {
    console.log(title);
    const { ctx, page } = await open(iso);
    check('hero name', (await txt(page, 'hero-name')) === name, await txt(page, 'hero-name'));
    check('label', (await txt(page, 'hero-label')) === label, await txt(page, 'hero-label'));
    const left = secs(await txt(page, 'hero-count'));
    check('countdown within 4 s of ' + wantSec + 's', Math.abs(left - wantSec) <= 4, left);
    check('next-prayer line', (await txt(page, 'hero-next')).startsWith(nextStart), await txt(page, 'hero-next'));
    if (shotDir) await page.screenshot({ path: path.join(shotDir, title[0] + '-' + name.toLowerCase() + '.png'), fullPage: true });
    await ctx.close();
  }

  console.log('G. Midnight rollover (Isyak stays current; date and list flip at 00:00)');
  {
    const { ctx, page } = await open('2026-10-02T15:59:50Z');
    check('before midnight: Jumaat, 2 Oktober', (await txt(page, 'date-main')) === 'Jumaat, 2 Oktober', await txt(page, 'date-main'));
    await page.clock.runFor(15000);
    check('after midnight: Sabtu, 3 Oktober', (await txt(page, 'date-main')) === 'Sabtu, 3 Oktober', await txt(page, 'date-main'));
    check('still Isyak', (await txt(page, 'hero-name')) === 'Isyak', await txt(page, 'hero-name'));
    await ctx.close();
  }

  console.log('H. Azan ON: plays + notifies exactly once at Zohor; OFF: silent');
  {
    const { ctx, page } = await open('2026-10-02T05:03:50Z', { azanFile: true });   // 13:03:50 MYT, Zohor 13:04
    await page.click('#btn-settings');
    await page.locator('.switch').click();
    check('toggle persisted on', (await page.evaluate(() => localStorage.getItem('pt.azan'))) === 'true');
    check('bell not struck-through when on', !(await page.locator('#btn-settings').getAttribute('class')).includes('off'));
    await page.click('#settings-close');
    await page.clock.runFor(30000);
    await page.waitForFunction(() => { const a = document.getElementById('azan'); return !a.paused || a.ended || a.currentTime > 0; }, null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);
    const played = await page.evaluate(() => { const a = document.getElementById('azan'); return a.currentTime > 0 || !a.paused; });
    check('azan audio started at Zohor', played, JSON.stringify(await page.evaluate(() => ({ p: document.getElementById('azan').paused, t: document.getElementById('azan').currentTime, e: document.getElementById('azan').error && document.getElementById('azan').error.code, n: document.getElementById('notice-text').textContent }))));
    check('fired marker stored', /^"dhuhr@\d+"$/.test(await page.evaluate(() => localStorage.getItem('pt.fired')) || ''), await page.evaluate(() => localStorage.getItem('pt.fired')));
    await page.waitForFunction(() => (window.__notes || []).length > 0, null, { timeout: 5000 }).catch(() => {});
    const notes = await page.evaluate(() => (window.__notes || []).map(n => n.t));
    check('one notification "Waktu Zohor"', notes.length === 1 && notes[0] === 'Waktu Zohor', JSON.stringify(notes));
    await ctx.close();

    const off = await open('2026-10-02T05:03:50Z', { azanFile: true });
    await off.page.clock.runFor(30000);
    const silent = await off.page.evaluate(() => localStorage.getItem('pt.fired') === null && document.getElementById('azan').paused);
    check('azan OFF: nothing fired', silent);
    await off.ctx.close();

    expect404 = true;
    const miss = await open('2026-10-02T05:03:50Z');   // no azan file served
    await miss.page.click('#btn-settings');
    await miss.page.click('#azan-test');
    await miss.page.waitForSelector('#notice:not([hidden])');
    check('missing azan file -> clear message', /not found/.test(await txt(miss.page, 'notice-text')), await txt(miss.page, 'notice-text'));
    await miss.ctx.close();
    expect404 = false;
  }

  console.log('I. Location denied / unavailable');
  {
    const { ctx, page } = await open('2026-10-02T05:10:00Z', { noGeo: true });
    await page.waitForSelector('#notice:not([hidden])');
    check('falls back to Kuala Lumpur with a notice', (await txt(page, 'loc-name')).includes('Kuala Lumpur') && /Kuala Lumpur times/.test(await txt(page, 'notice-text')), await txt(page, 'notice-text'));
    check('still shows a prayer', (await txt(page, 'hero-name')) === 'Zohor', await txt(page, 'hero-name'));
    await ctx.close();
  }

  console.log('J. Installable + offline');
  {
    const { ctx, page } = await open('2026-10-02T05:10:00Z');
    const m = await page.evaluate(() => fetch('manifest.webmanifest').then(r => r.json()));
    check('manifest: standalone, start_url, 192+512 icons', m.display === 'standalone' && m.start_url === './' && m.icons.some(i => i.sizes === '192x192') && m.icons.some(i => i.sizes === '512x512'));
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); await page.waitForFunction(() => navigator.serviceWorker.controller);
    await ctx.setOffline(true);
    await page.reload();
    await page.waitForFunction(() => document.getElementById('hero-count').textContent !== '--:--:--');
    check('reloads fully while offline', (await txt(page, 'hero-name')) === 'Zohor', await txt(page, 'hero-name'));
    await ctx.close();
  }

  console.log('K. No console errors / CSP violations during the whole run');
  check('clean', problems.length === 0, problems.slice(0, 5).join(' | '));

  await browser.close(); server.close();
  const bad = results.filter(r => !r).length;
  console.log('\n' + (bad ? bad + ' FAILED of ' + results.length : 'ALL ' + results.length + ' CHECKS PASSED'));
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
