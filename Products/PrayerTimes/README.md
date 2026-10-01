# Salah Times (Waktu Solat)

Installable prayer-times web app (PWA), JAKIM / Malaysia method. Rebuilt on 02.Oct.2026 (restyled and made shareable 02.Oct.2026) from two screenshots of the earlier Hercules version, because its source was not available. This is a re-creation of what the screenshots showed, not a copy of the original code.

## Share it: one single file
`dist/SalahTimes.html` is the whole app in one file (page, styles, code, icons, optional azan sound). Send it by WhatsApp, email, USB, anything. The recipient opens it in a browser.

- It needs nothing else: no install, no account, no server. Times are calculated on the device.
- Rebuild after any change: `node tools/build-standalone.js` (adds `audio/azan.mp3` automatically if it exists; `--azan file` picks another file; `--no-azan` forces none).
- Safe to inspect: every inline script/style is allowed in the Content-Security-Policy only by its SHA-256 hash, so nothing added later can run. `node tools/audit.js` verifies this and prints the file's SHA-256. If a recipient's copy has a different hash, it is not the file you sent.
- **Untested on real phones.** I ran it as a `file://` page in desktop Chromium only. Known/likely limits of any local HTML file:
  - Some phone browsers will not let a local file use GPS. Settings (bell icon) has a place list (Kuala Lumpur, Hulu Langat, Kajang, ... Kuching, Labuan; about 5 km accuracy) for that case.
  - On iPhone, an HTML attachment may only preview inside WhatsApp/Mail; it may need saving to Files and opening in Safari. I could not verify this.
  - A local file cannot be installed as an app or cached by a service worker. If you want the app icon on the home screen, host the folder over HTTPS (see below) and share that link instead; the link is also the most reliable way to share.
  - Alerts: the single file uses the page notification, which many phones refuse. The azan sound plays; the pop-up may not appear.
- **No azan sound is inside the current build** (none was provided). Put `azan.mp3` in `audio/`, run the build command, and the file carries the sound (about 4/3 of the mp3 size). Whatever audio you embed is not something this project's audit can vouch for.

## What it does
- Location at the top (device GPS; place name looked up once and remembered). The name is the district (for example Hulu Langat); local councils such as "Majlis Perbandaran ..." are never shown. If GPS is unavailable you can pick a place in Settings.
- The current prayer, how long until it ends, and the next prayer.
- All six times for today (Subuh, Syuruk, Zohor, Asar, Maghrib, Isyak) with the current one highlighted.
- Bell icon opens Settings (azan on/off, test button, place picker). Refresh icon re-reads GPS.
- Colours and card styling are sampled from the reference screenshots (flat shaded cards; the current prayer has a tinted card with a gold border).
- Installs to the home screen and opens full-screen like an app; works offline after the first visit.

No frameworks and no dependencies. The only build step is the optional single-file builder.

## Calculation
Done on the device (`prayer.js`), no network needed.
- Fajr 20 deg, Isha 18 deg, Asr Shafi'i, sunrise/sunset at 0.833 deg, rounded to the minute.
- Zohor +2 minutes.

**What was verified (02.Oct.2026):** at approximate Hulu Langat coordinates (3.10 N, 101.80 E; my estimate, the screenshot gave no coordinates) all six times equal the screenshot: 5:43, 7:00, 13:04, 16:13, 19:05, 20:14.

**Place name (not verified live):** the name comes from OpenStreetMap Nominatim. This sandbox could not reach it, so I could not see what it returns for your exact spot. The council filter is unit-tested (`tools/test-place.js`) against payloads I constructed, not real responses. If your location still shows the wrong name, send me a screenshot and your approximate area. Also, Nominatim may refuse requests that carry no referrer (such as a file opened from disk); the app then shows coordinates and you can use the place picker.

**What was NOT verified:**
- The +2 min Zohor offset is inferred from that one data point. Without it Zohor was 13:02. I believe JAKIM adds a 2-minute precaution (ihtiyati) but did not confirm that against a JAKIM source.
- Only one date and one place were compared. JAKIM publishes per-zone tables, and a formula can differ from them by a minute or two on other days or places. **Check a few days against https://www.e-solat.gov.my before relying on it for Subuh/Maghrib.**
- The Hijri date uses the browser's Umm al-Qura calendar. It matched the screenshot on 02.Oct.2026, but Malaysia's official Hijri date can differ by a day in some months.

## Azan - what it can and cannot do
- Plays at Subuh, Zohor, Asar, Maghrib and Isyak (not Syuruk) when the switch is on.
- **Only while the app is open** (foreground, screen on). A web app cannot wake a closed or locked phone. Real background azan needs a native app or a push server; neither exists here.
- Browsers require one tap before they allow sound. Switching azan on (or pressing "Test azan") does that; after a restart, one tap anywhere re-arms it. If the browser blocks it, a banner asks you to tap.
- No azan recording is included. Add yours as `audio/azan.mp3` (see `audio/README.txt`).
- Not tested on a real iPhone/iPad or Android device. Only desktop Chromium (headless) was run.

## Install as an app (no App Store / Play Store)
It must be served over HTTPS (GPS, install and offline all require it). Easiest: GitHub Pages for this repo, then open the URL on your phone.
- iPhone/iPad (Safari): Share, Add to Home Screen.
- Android (Chrome): menu, Install app / Add to Home screen.

All paths are relative, so it works from a sub-folder such as `/Digitiska/Products/PrayerTimes/`.
Opening `index.html` by double-click still works for viewing, but without install/offline.

## Privacy and security
- No account, no ads, no analytics, no cookies, no third-party scripts, fonts or images.
- Strict Content-Security-Policy in `index.html`: scripts, styles, images and audio only from this app; the single outside host allowed is `nominatim.openstreetmap.org`.
- That host receives a position rounded to ~1 km (2 decimals) to turn coordinates into a place name. If it fails, the app shows coordinates. Nothing else leaves the device.
- Stored on the device only: last location, the azan on/off flag, a marker so the same azan does not repeat.
- `node tools/audit.js` checks every shipped file for dangerous patterns (eval, dynamic imports, sockets, XHR/beacon, HTML injection, obfuscation, inline script/handlers), lists every external URL, checks the CSP, and prints SHA-256 hashes. It passed on 02.Oct.2026.
- Limit of that check: it covers the code in this folder. It cannot vouch for the server you host it on or for a device that is already compromised.

## Tests
- `node tools/audit.js` - security audit (no dependencies).
- `node tools/test-place.js` - place-name selection (13 checks).
- `NODE_PATH=$(npm root -g) node tools/e2e.js [screenshot-dir]` - 61 checks in headless Chromium (`STANDALONE=1` runs 60 against the single file opened as `file://`) with mocked clock, GPS and timezone: reproduces the reference screenshot, every prayer window, midnight rollover, azan on/off, missing azan file, denied location, offline reload, no console/CSP errors. Notifications and the place-name service are stubbed in this test (headless Chromium reports notifications as denied; the sandbox could not reach the real service), so those two are exercised in code path only.
- `NODE_PATH=$(npm root -g) node tools/make-icons.js` - re-renders PNG icons from `icons/icon.svg`.

## Files
`index.html`, `style.css`, `app.js` (UI/azan/location), `prayer.js` (calculation), `place.js` (place names + place list), `sw.js` (offline cache + notification click), `manifest.webmanifest`, `icons/`, `audio/`, `dist/SalahTimes.html` (the shareable file; rebuild it after changing any source file).
After changing any file, bump `CACHE` in `sw.js` so installed copies update.

## Not done / ideas
- Per-prayer azan switches, other calculation methods, Qibla, Malay/English language switch.
- Official e-solat zone data (would need a network source and a check of its terms).
