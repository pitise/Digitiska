// Builds ONE self-contained file you can send by WhatsApp / email / USB:
//   node tools/build-standalone.js [--azan path/to/azan.mp3 | --no-azan] [--out path/SalahTimes.html]
// Everything (page, styles, scripts, icons, optional azan sound) is inlined. Each inline <script>/<style>
// is allowed in the Content-Security-Policy only by its SHA-256 hash, so no 'unsafe-inline' is needed.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..');
const arg = n => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : null; };
const out = path.resolve(arg('--out') || path.join(root, 'dist', 'SalahTimes.html'));
const defaultAzan = path.join(root, 'audio', 'azan.mp3');
const azanPath = process.argv.includes('--no-azan') ? null : arg('--azan') ? path.resolve(arg('--azan')) : (fs.existsSync(defaultAzan) ? defaultAzan : null);

const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const b64 = buf => Buffer.from(buf).toString('base64');
const hash = text => "'sha256-" + crypto.createHash('sha256').update(text, 'utf8').digest('base64') + "'";
const AUDIO_TYPES = { '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.aac': 'audio/aac' };

let html = read('index.html');
const styleText = '\n' + read('style.css');
const scriptText = '\n' + ['prayer.js', 'place.js', 'app.js'].map(read).join('\n');
const azan = azanPath ? fs.readFileSync(azanPath) : null;
const azanType = azanPath ? (AUDIO_TYPES[path.extname(azanPath).toLowerCase()] || 'audio/mpeg') : '';
const embedText = 'window.SALAH_EMBED={azan:"' + (azan ? b64(azan) : '') + '",azanType:"' + azanType + '"};';

for (const [name, text] of [['scripts', scriptText], ['embed', embedText]]) {
  if (/<\/script|<!--/i.test(text)) throw new Error(name + ' contains a sequence that would break out of an inline <script>');
}
if (/<\/style/i.test(styleText)) throw new Error('style contains </style');

const swap = (re, to, what) => { if (!re.test(html)) throw new Error('template changed, cannot find: ' + what); html = html.replace(re, () => to); };
swap(/<link rel="manifest"[^>]*>\n?/, '', 'manifest link');
swap(/<link rel="icon" href="icons\/icon\.svg"[^>]*>/, '<link rel="icon" href="data:image/svg+xml;base64,' + b64(fs.readFileSync(path.join(root, 'icons/icon.svg'))) + '" type="image/svg+xml">', 'icon link');
swap(/<link rel="apple-touch-icon"[^>]*>/, '<link rel="apple-touch-icon" href="data:image/png;base64,' + b64(fs.readFileSync(path.join(root, 'icons/apple-touch-icon.png'))) + '">', 'apple icon link');
swap(/<link rel="stylesheet" href="style\.css">/, '<style>' + styleText + '</style>', 'stylesheet link');
swap(/<script src="prayer\.js"><\/script>\n<script src="place\.js"><\/script>\n<script src="app\.js"><\/script>/,
  '<script>' + embedText + '</script>\n<script>' + scriptText + '</script>', 'script tags');

const csp = [
  "default-src 'none'",
  'script-src ' + hash(embedText) + ' ' + hash(scriptText),
  'style-src ' + hash(styleText),
  'img-src data:',
  'media-src blob:',
  'connect-src https://nominatim.openstreetmap.org',
  "base-uri 'none'",
  "form-action 'none'"
].join('; ');
swap(/<meta http-equiv="Content-Security-Policy" content="[^"]*">/, '<meta http-equiv="Content-Security-Policy" content="' + csp + '">', 'CSP meta');
html = html.replace('<title>', '<!-- Salah Times - single-file build. Source and checks: Products/PrayerTimes in the Digitiska repo. -->\n<title>');

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('wrote ' + out);
console.log('size: ' + (fs.statSync(out).size / 1024).toFixed(1) + ' KB' + (azan ? '  (includes azan sound ' + (azan.length / 1024).toFixed(0) + ' KB from ' + path.basename(azanPath) + ')' : '  (NO azan sound embedded)'));
console.log('sha256: ' + crypto.createHash('sha256').update(html).digest('hex'));
