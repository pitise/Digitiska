# Solat (fixed v7)

Your Lovable export `solat_v7.html`, with the home-screen install and location problems fixed. Look and layout are unchanged: a pixel comparison of the main screen against the original (same time, same place) is identical. Fixed on 12.Oct.2026.

## Files
- `Solat.html` - the whole app in one file (40 KB, was 847 KB). Share this by WhatsApp or email. No server, no database, no git.
- `manifest.webmanifest`, `sw.js`, `icons/` - only needed to make the app installable (see below).
- `tools/` - `apply-fix.py` (the exact patch applied to v7), `make-host.js` (builds `dist/host/` and `dist/Solat-host.zip`), `test.js` (38 checks).

## Add to home screen: what is and is not possible
- **A downloaded file opened from the phone cannot be installed as an app by any browser.** The browser needs a real web address (HTTPS) to install from. From a file, "Add to home screen" gives at best a plain shortcut.
- **To get a real installed app:** upload the contents of `dist/host/` (or unzip `Solat-host.zip`) to any static web host, such as Cloudflare Pages "Direct Upload" or Netlify Drop, then open that link on the phone and use the browser menu, "Install app" / "Add to Home screen". No git or database is involved; it is just three small files and an icon folder. I have not tested any host. The file is named `index.html` there and everything is relative, so a sub-folder works too.
- What was wrong in v7: the manifest was pasted into the page as a `data:` link, which Chromium reports as `start_url ignored, URL is invalid`; there was no service worker; and the page rewrote its own title every second (for example "Zohor 03:06:59 - Waktu Solat"), which browsers can use as the shortcut name.
- Now: a real `manifest.webmanifest` (name and short name **Solat**, PrayerTimes icon 192/512 px plus maskable), a service worker for offline use, and the title stays **Solat** on phones. On desktop (mouse) the live countdown still shows in the tab title. The in-app heading still says "Waktu Solat".

## Location fixes
- GPS first, low-power mode (15 s, accepts a position up to 5 min old); only if that times out or is unavailable, a second try with high accuracy (20 s). v7 asked for high accuracy only, with a 12 s limit, which can time out indoors even when location is allowed.
- Permission denied is reported as such, with how to allow it, instead of silently guessing.
- **The internet-address guess is no longer automatic.** It runs only if the user taps "Guna anggaran". Before, any GPS failure sent the IP address to up to three services at once.
- Council names ("Majlis Perbandaran Kajang", "... City Council", "Dewan Bandaraya ...") are never shown; the district is preferred (Hulu Langat, Selangor).
- Positions sent to Nominatim and `api.waktusolat.app` are rounded to 2 decimals (about 1 km). Tradeoff: near a zone boundary the timetable zone could be the neighbouring one, which normally differs by a minute or two.

## Not verified
- Everything was tested in desktop Chromium with a mocked clock, GPS and network. **Not tested on a Galaxy A54, a MatePad, Samsung Internet or Huawei Browser.**
- The real `ipwho.is`, `ipapi.co`, `get.geojs.io`, Nominatim and `api.waktusolat.app` responses were not available from the build sandbox. The council filter is tested against a payload I constructed.
- Whether Chrome on Android lets a local file use location varies; that is why the denied/unavailable messages and the city list exist.

## Not changed (kept as in v7)
- No Content-Security-Policy; the azan audio is loaded from `islamcan.com`; place search uses the browser `prompt()` box; official timetable data comes from the third-party mirror `api.waktusolat.app`. Say if you want any of these changed.

## Rebuild and test
```
node tools/make-host.js
NODE_PATH=$(npm root -g) node tools/test.js path/to/solat_v7.html   # original optional: enables the "identical to v7" check
```
