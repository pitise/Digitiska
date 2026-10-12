// Builds dist/host/ (+ dist/Solat-host.zip when `zip` exists): the same Solat.html as index.html, with its manifest, service worker and icons.
// Upload that folder (or zip contents) to any static host: Cloudflare Pages "Direct Upload", Netlify Drop, etc. No git or database needed.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..'), out = path.join(root, 'dist', 'host');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'icons'), { recursive: true });
fs.copyFileSync(path.join(root, 'Solat.html'), path.join(out, 'index.html')); fs.chmodSync(path.join(out, 'index.html'), 0o644);
for (const f of ['manifest.webmanifest', 'sw.js']) fs.copyFileSync(path.join(root, f), path.join(out, f));
for (const f of ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png']) fs.copyFileSync(path.join(root, 'icons', f), path.join(out, 'icons', f));
console.log('wrote ' + out + ': ' + fs.readdirSync(out).join(', '));
try { fs.rmSync(path.join(root, 'dist', 'Solat-host.zip'), { force: true }); cp.execFileSync('zip', ['-qr', path.join(root, 'dist', 'Solat-host.zip'), '.'], { cwd: out }); console.log('wrote dist/Solat-host.zip'); }
catch (e) { try { cp.execFileSync('python3', ['-c', "import shutil,sys;shutil.make_archive(sys.argv[1],'zip',sys.argv[2])", path.join(root, 'dist', 'Solat-host'), out]); console.log('wrote dist/Solat-host.zip'); } catch (e2) { console.log('zip not created: ' + e2.message); } }
