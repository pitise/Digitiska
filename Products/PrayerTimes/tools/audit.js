// Static security audit of the shipped files. No dependencies.  node tools/audit.js
// Fails (exit 1) on any pattern that could exfiltrate data, run injected code, or load third-party code.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..');
const SHIPPED = ['index.html', 'style.css', 'prayer.js', 'app.js', 'sw.js', 'manifest.webmanifest', 'icons/icon.svg'];
const ALLOWED_HOSTS = ['nominatim.openstreetmap.org'];          // the only third-party host
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
let failures = 0;
const fail = m => { failures++; console.log('  FAIL  ' + m); };
const pass = m => console.log('  ok    ' + m);

const FORBIDDEN_JS = [
  [/\beval\s*\(/, 'eval()'], [/\bnew\s+Function\b/, 'new Function'], [/\bFunction\s*\(/, 'Function()'],
  [/document\.write/, 'document.write'], [/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML/, 'HTML injection sink'],
  [/setTimeout\s*\(\s*['"`]|setInterval\s*\(\s*['"`]/, 'string timer'],
  [/importScripts|import\s*\(/, 'dynamic code import'], [/\bWebSocket\b|\bEventSource\b/, 'socket'],
  [/XMLHttpRequest|sendBeacon/, 'XHR / beacon'], [/atob\s*\(|btoa\s*\(/, 'base64 (obfuscation marker)'],
  [/document\.cookie/, 'cookies'], [/indexedDB|openDatabase/, 'extra storage'],
  [/getUserMedia|clipboard|navigator\.(?:mediaDevices|bluetooth|usb|hid|serial)/, 'sensitive device API'],
  [/\\x[0-9a-f]{2}|\\u00[0-9a-f]{2}.*\\u00[0-9a-f]{2}/i, 'escaped-string obfuscation']
];

console.log('1. Forbidden patterns in JavaScript');
for (const f of ['prayer.js', 'app.js', 'sw.js']) {
  const code = read(f);
  const hits = FORBIDDEN_JS.filter(([re]) => re.test(code)).map(x => x[1]);
  hits.length ? fail(f + ': ' + hits.join(', ')) : pass(f + ' clean');
}

console.log('2. Every external URL / host');
for (const f of SHIPPED) {
  const urls = (read(f).match(/https?:\/\/[^\s'"`)<>;,]+/g) || []).filter(u => !/^https?:\/\/www\.w3\.org\/2000\/svg$/.test(u));
  for (const u of urls) {
    const host = new URL(u).host;
    ALLOWED_HOSTS.includes(host) ? pass(f + ' -> ' + host + ' (allowed)') : fail(f + ' references ' + u);
  }
}

console.log('3. fetch() targets');
for (const f of ['app.js', 'sw.js']) {
  const code = read(f);
  const calls = code.match(/fetch\s*\([^)]*\)/g) || [];
  for (const c of calls) console.log('        ' + f + ': ' + c.replace(/\s+/g, ' ').slice(0, 90));
}

console.log('4. HTML: no inline script/style/handlers, no third-party tags');
const html = read('index.html');
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
scripts.every(m => /src="[^":/]+\.js"/.test(m[1]) && m[2].trim() === '') ? pass(scripts.length + ' scripts, all local files, none inline') : fail('inline or external script');
/\son[a-z]+\s*=/i.test(html) ? fail('inline event handler') : pass('no inline event handlers');
/\sstyle\s*=/i.test(html) || /<style/i.test(html) ? fail('inline style') : pass('no inline styles');
/<(iframe|object|embed|form|base)\b/i.test(html) ? fail('iframe/object/embed/form/base tag') : pass('no iframe/object/embed/form/base');
/<link[^>]+href="https?:/i.test(html) ? fail('external <link>') : pass('no external stylesheets/fonts');

console.log('5. Content-Security-Policy');
const csp = (html.match(/Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
csp ? pass('present') : fail('missing');
for (const need of ["default-src 'none'", "script-src 'self'", "base-uri 'none'", "form-action 'none'"]) csp.includes(need) ? pass(need) : fail('missing ' + need);
/unsafe-inline|unsafe-eval|\*/.test(csp.replace(/https:\/\/[^\s;]+/g, '')) ? fail('weakening keyword in CSP') : pass('no unsafe-inline / unsafe-eval / wildcard');
const conn = (csp.match(/connect-src ([^;]+)/) || [])[1] || '';
console.log('        connect-src: ' + conn);

console.log('6. Permissions the app can use');
const perms = { geolocation: /geolocation/, notifications: /Notification/, 'service worker': /serviceWorker/, localStorage: /localStorage/ };
for (const [k, re] of Object.entries(perms)) console.log('        ' + k + ': ' + (read('app.js').match(re) ? 'used' : 'not used'));

console.log('7. SHA-256 of every shipped file (for later tamper checks)');
for (const f of SHIPPED.concat(['icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'])) {
  console.log('        ' + crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex') + '  ' + f);
}
console.log(failures ? '\nAUDIT FAILED (' + failures + ')' : '\nAUDIT PASSED');
process.exit(failures ? 1 : 0);
