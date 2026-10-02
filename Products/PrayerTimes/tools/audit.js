// Static security audit. No dependencies.
//   node tools/audit.js                      audits the multi-file source AND dist/SalahTimes.html (if present)
//   node tools/audit.js path/to/file.html    audits just that single-file build
// Fails (exit 1) on any pattern that could exfiltrate data, run injected code, or load third-party code.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..');
const ALLOWED_HOSTS = ['nominatim.openstreetmap.org', 'ipwho.is'];   // the only third-party hosts (place name; opt-in approximate location)
const sha256hex = buf => crypto.createHash('sha256').update(buf).digest('hex');
const cspHash = text => "'sha256-" + crypto.createHash('sha256').update(text, 'utf8').digest('base64') + "'";
let failures = 0;
const fail = m => { failures++; console.log('  FAIL  ' + m); };
const pass = m => console.log('  ok    ' + m);

const FORBIDDEN_JS = [
  [/\beval\s*\(/, 'eval()'], [/\bnew\s+Function\b/, 'new Function'], [/\bFunction\s*\(/, 'Function()'],
  [/document\.write/, 'document.write'], [/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML/, 'HTML injection sink'],
  [/setTimeout\s*\(\s*['"`]|setInterval\s*\(\s*['"`]/, 'string timer'],
  [/importScripts|import\s*\(/, 'dynamic code import'], [/\bWebSocket\b|\bEventSource\b/, 'socket'],
  [/XMLHttpRequest|sendBeacon/, 'XHR / beacon'], [/btoa\s*\(/, 'btoa'],
  [/document\.cookie/, 'cookies'], [/indexedDB|openDatabase/, 'extra storage'],
  [/getUserMedia|clipboard|navigator\.(?:mediaDevices|bluetooth|usb|hid|serial)/, 'sensitive device API'],
  [/\\x[0-9a-f]{2}|\\u00[0-9a-f]{2}.*\\u00[0-9a-f]{2}/i, 'escaped-string obfuscation']
];
const ATOB_LIMIT = 1;   // app.js decodes the embedded azan sound once; any other use is suspicious

function auditCode(label, code, { allowAtob }) {
  const hits = FORBIDDEN_JS.filter(([re]) => re.test(code)).map(x => x[1]);
  const atobs = (code.match(/\batob\s*\(/g) || []).length;
  if (atobs > (allowAtob ? ATOB_LIMIT : 0)) hits.push('atob x' + atobs);
  hits.length ? fail(label + ': ' + hits.join(', ')) : pass(label + ' clean' + (atobs ? ' (atob x' + atobs + ': decodes the embedded azan sound)' : ''));
}
function auditUrls(label, text) {
  const urls = (text.match(/https?:\/\/[^\s'"`)<>;,]+/g) || []).filter(u => !/^https?:\/\/www\.w3\.org\/2000\/svg$/.test(u));
  if (!urls.length) pass(label + ': no external URLs');
  for (const u of urls) { const h = new URL(u).host; ALLOWED_HOSTS.includes(h) ? pass(label + ' -> ' + h + ' (allowed)') : fail(label + ' references ' + u); }
}
function auditHtmlCommon(html) {
  /\son[a-z]+\s*=/i.test(html) ? fail('inline event handler') : pass('no inline event handlers');
  /\sstyle\s*=/i.test(html) ? fail('inline style attribute') : pass('no inline style attributes');
  /<(iframe|object|embed|form|base)\b/i.test(html) ? fail('iframe/object/embed/form/base tag') : pass('no iframe/object/embed/form/base');
  /<link[^>]+href="https?:/i.test(html) ? fail('external <link>') : pass('no external stylesheets/fonts');
  /<script[^>]+src="https?:/i.test(html) ? fail('external <script>') : pass('no external scripts');
  const csp = (html.match(/Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
  csp ? pass('Content-Security-Policy present') : fail('Content-Security-Policy missing');
  for (const need of ["default-src 'none'", "base-uri 'none'", "form-action 'none'"]) csp.includes(need) ? pass(need) : fail('CSP missing ' + need);
  /unsafe-inline|unsafe-eval|unsafe-hashes/.test(csp) || /(^|[ ;])\*/.test(csp) ? fail('weakening keyword/wildcard in CSP') : pass('no unsafe-inline / unsafe-eval / wildcard');
  console.log('        connect-src: ' + ((csp.match(/connect-src ([^;]+)/) || [])[1] || '(none)'));
  return csp;
}

function auditSource() {
  console.log('=== MULTI-FILE SOURCE ===');
  const read = f => fs.readFileSync(path.join(root, f), 'utf8');
  console.log('1. Forbidden patterns in JavaScript');
  for (const f of ['prayer.js', 'place.js', 'app.js', 'sw.js']) auditCode(f, read(f), { allowAtob: f === 'app.js' });
  console.log('2. External URLs');
  for (const f of ['index.html', 'style.css', 'prayer.js', 'place.js', 'app.js', 'sw.js', 'manifest.webmanifest', 'icons/icon.svg']) auditUrls(f, read(f));
  console.log('3. fetch() targets');
  for (const f of ['app.js', 'sw.js']) for (const c of read(f).match(/fetch\s*\([^)]*\)/g) || []) console.log('        ' + f + ': ' + c.replace(/\s+/g, ' ').slice(0, 90));
  console.log('4. HTML and Content-Security-Policy');
  const html = read('index.html');
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  scripts.every(m => /src="[^":/]+\.js"/.test(m[1]) && m[2].trim() === '') ? pass(scripts.length + ' scripts, all local files, none inline') : fail('inline or external script');
  /<style/i.test(html) ? fail('inline <style>') : pass('no inline <style>');
  const csp = auditHtmlCommon(html);
  csp.includes("script-src 'self'") ? pass("script-src 'self'") : fail("script-src is not 'self'");
}

function auditStandalone(file) {
  console.log('=== SINGLE-FILE BUILD: ' + path.relative(process.cwd(), file) + ' ===');
  const buf = fs.readFileSync(file), html = buf.toString('utf8');
  console.log('1. Inline scripts are locked to the Content-Security-Policy by SHA-256');
  const csp = (html.match(/Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
  const scriptSrc = (csp.match(/script-src ([^;]+)/) || [])[1] || '', styleSrc = (csp.match(/style-src ([^;]+)/) || [])[1] || '';
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  let embedSeen = 0, codeSeen = 0;
  for (const m of scripts) {
    if (/\ssrc\s*=/.test(m[1])) { fail('script with src'); continue; }
    if (!scriptSrc.includes(cspHash(m[2]))) { fail('inline script not covered by a CSP hash'); continue; }
    if (/^window\.SALAH_EMBED=\{azan:"[A-Za-z0-9+\/=]*",azanType:"[a-z0-9\/+.-]*"\};$/.test(m[2])) { embedSeen++; pass('embed block: hash matches and content is exactly {azan: base64, azanType} (' + (m[2].length / 1024).toFixed(0) + ' KB)'); }
    else { codeSeen++; pass('code block: hash matches CSP'); auditCode('inline application code', m[2], { allowAtob: true }); }
  }
  embedSeen === 1 && codeSeen === 1 ? pass('exactly 1 embed block + 1 code block') : fail('unexpected script blocks (embed ' + embedSeen + ', code ' + codeSeen + ')');
  (scriptSrc.match(/'sha256-/g) || []).length === 2 ? pass('script-src lists only those 2 hashes') : fail('script-src has unexpected entries: ' + scriptSrc.replace(/'sha256-[^']+'/g, 'H'));
  const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)];
  styles.length === 1 && styleSrc.includes(cspHash(styles[0][1])) && (styleSrc.match(/'sha256-/g) || []).length === 1 ? pass('1 inline style, hash matches CSP') : fail('style block/hash mismatch');
  console.log('2. External URLs (embed block excluded)');
  const stripped = html.replace(/window\.SALAH_EMBED=\{azan:"[^"]*"/, 'window.SALAH_EMBED={azan:""');
  auditUrls('single file', stripped);
  console.log('3. HTML and Content-Security-Policy');
  auditHtmlCommon(html);
  const links = [...html.matchAll(/<link\b[^>]*href="([^"]*)"/g)].map(m => m[1]);
  links.every(h => h.startsWith('data:')) ? pass(links.length + ' <link> tags, all data: URIs (icons)') : fail('a <link> points outside the file');
  /connect-src https:\/\/nominatim\.openstreetmap\.org https:\/\/ipwho\.is(;|$)/.test(csp) ? pass('connect-src allows only the 2 listed hosts') : fail('connect-src is not exactly the 2 allowed hosts');
  console.log('4. SHA-256 of the shipped file (compare this after sharing to detect tampering)');
  console.log('        ' + sha256hex(buf) + '  ' + path.basename(file));
}

const target = process.argv[2];
if (target) auditStandalone(path.resolve(target));
else { auditSource(); const d = path.join(root, 'dist', 'SalahTimes.html'); if (fs.existsSync(d)) { console.log(''); auditStandalone(d); } else fail('dist/SalahTimes.html missing - run tools/build-standalone.js'); }
console.log(failures ? '\nAUDIT FAILED (' + failures + ')' : '\nAUDIT PASSED');
process.exit(failures ? 1 : 0);
