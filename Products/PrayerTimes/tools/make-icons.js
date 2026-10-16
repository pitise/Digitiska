// Renders icons/icon.svg to the PNG sizes the manifest needs.
// Needs Playwright with Chromium:  node tools/make-icons.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const dir = path.join(__dirname, '..', 'icons');
  const svg = fs.readFileSync(path.join(dir, 'icon.svg'), 'utf8');
  const browser = await chromium.launch();
  for (const [file, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent('<body style="margin:0">' + svg.replace('<svg ', `<svg width="${size}" height="${size}" `) + '</body>');
    await page.screenshot({ path: path.join(dir, file) });
    await page.close();
  }
  await browser.close();
})();
