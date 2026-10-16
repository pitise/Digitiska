# Solat (fixed v7)

Your Lovable export `solat_v7.html`, with the home-screen install, location and timetable-source problems fixed. Look and layout are unchanged: a pixel comparison of the main screen against the original (same time, same place) is identical. Fixed on 12.Oct.2026.

## Timetable: directly from JAKIM (updated 12.Oct.2026)
- The app reads the monthly/yearly timetable straight from JAKIM e-Solat (`www.e-solat.gov.my`, `esolatApi/takwimsolat`) for your zone. **`api.waktusolat.app` is no longer used.** Only the zone code (for example `SGR01`) and the period are sent to JAKIM.
- Verified: a JAKIM answer pasted by the user (zone SGR01, Okt 2026) has the exact format the app reads, and a page opened as a local file **can** read it (user ran `tools/jakim-test.html`: "OK ... 31 days"). The calculation on the device is within 1-2 minutes of JAKIM on the 7 sample days I compared.
- Your position is matched to a JAKIM zone by district name (Nominatim gives the district; or you pick a district in the list). A built-in table of the 58 zones is used for that. **That table comes from a community guide (github.com/acfatah/jakim-esolat-api, MIT, last updated 30.May.2020), not from JAKIM, and may be out of date.** A place that does not match a listed district (for example Kajang, Kulai) gets **no zone**: the app then calculates on the device and says "pilih daerah untuk jadual JAKIM" in the footer. It never guesses a zone.
- Every day taken from JAKIM must pass checks: status OK, the zone in the answer equals the zone asked for, times in order, and within 20 minutes of the app's own calculation. Otherwise that day is calculated on the device and the footer says so. The footer says "Jadual JAKIM e-Solat · Zon X" only when the numbers really are JAKIM's.
- JAKIM data is cached on the device (up to 45 days back), so it still works offline. It asks for the whole year first (one request); if JAKIM refuses `period=year` it uses the current month, which means the first day of next month is calculated until then.
- **Not verified:** `period=year` against the real server (only `period=month` was seen); that a page served from a normal https address can read JAKIM (only a local file was tested; if JAKIM allows all sites this works, otherwise the app falls back to calculation); real Nominatim district names for every place; JAKIM's terms of use (the community guide says the copyright is JAKIM's and the address may change without notice). The JAKIM data in the browser tests is mocked, using the real 12.Okt.2026 row.

## Zone matching fix (12.Oct.2026)
Found on a real phone: at "Bangi Lama, Selangor" the footer said "Kiraan pada peranti ... pilih daerah", i.e. no JAKIM zone was matched, so the app calculated (1-2 min off JAKIM). Cause: the matcher only looked at a fixed list of address fields and made one place lookup. Now it matches against every value of the address, and if the first lookup gives no zone it asks again at district level (zoom 8, then 10, one request per 1.1 s). Tested with mocked answers shaped like the reported case. **Not verified against the real place service**: whether its district-level answer for Bangi Lama contains "Hulu Langat" is unknown.
Hidden diagnostic: tap the "© 2026 Digitiska" line 5 times to show the rounded position (about 1 km), the zone, and what the place service answered; 5 more taps hide it. If a place still gets no zone, choose its district in the Lokasi list.

## Menu and Qibla compass (15.Oct.2026)
- The header has one three-bar button. Tapping it opens the three icons in a column: compass (Arah Kiblat), gear (Settings: azan, Zon JAKIM, privacy) and refresh (location). It closes when you tap an icon, tap elsewhere, or press Escape. This also stops the date wrapping onto two lines.
- **Arah Kiblat** is a live compass with a fixed fallback, and the screen always says which one you are looking at:
  - **Langsung** (green pulsing dot, solid ring, gold phone marker at the top, "Arah telefon: N°"): the dial turns with the phone; the arrow turns green and it says "Menghadap kiblat ✓" within 3 degrees of the Qibla.
  - **Tetap** (hollow gold dot, dashed ring, no phone marker): no compass sensor answered within 2.5 s, so the dial stays still with north up, with the bearing number and instructions for using a compass app. If a sensor answers later, it switches to Langsung.
  - **Mencari sensor…** while it looks; on iPhone-style browsers "Menunggu kebenaran sensor" until the button is tapped.
- Bearing: great-circle bearing from your place to the Kaaba (21.4225 N, 39.8262 E). Checked against widely quoted values (London about 119, New York about 58.5, Sydney about 277.5). For Selangor it gives about 292.5 degrees; JAKIM publishes 291 deg 7 min for zone SGR01, about 1.4 degrees less.
- **Not verified on a real phone**: the live compass was tested only with simulated sensor events. Unknown: whether the Galaxy A54 and the MatePad have a compass sensor, and how accurate they are. Android Chrome gives a compass reading only on a secure (https) page, so a file opened from storage will usually show the fixed mode. The reading assumes the phone is held flat and the screen is not rotated. Android readings are relative to magnetic north; I believe the difference from true north is small in Malaysia but have not verified it. iPhone support (permission button, webkitCompassHeading) is written but untested.
- The gear icon no longer shows an "azan off" slash (the Settings page covers more than azan now). Whether azan is on or off is only visible inside Settings.

## Zon JAKIM explanation (15.Oct.2026)
Settings (gear icon) has a section "Zon JAKIM": a live line with the identified zone and its districts, and an expandable "Bagaimana pengumpulan zon berfungsi?" (Bahasa Malaysia) explaining that JAKIM publishes one timetable per zone, what the two footer messages mean, why calculated times can differ by 1-2 minutes, and that the zone list is from a 2020 community guide, not an official JAKIM list.

## Name and footnote (updated 12.Oct.2026)
- Home-screen / bookmark name is **Solat Times** (manifest `name` and `short_name`, page title, `apple-mobile-web-app-title`, `application-name`). The in-app heading still reads "Waktu Solat". The link-preview title (`og:title`, shown when the link is shared in chat apps) is still "Waktu Solat".
- Footnote under the source line: "© 2026 Digitiska" (same wording as the earlier app's footer).
- "Salah Times" is the name of the older, superseded `Products/PrayerTimes` app, not of this one.

## Hosting on Firebase (free, no git) - added 12.Oct.2026
`dist/Solat-firebase.zip` (built by `node tools/make-host.js`) is a ready-to-deploy Firebase Hosting folder: `firebase.json` + `public/` + `DEPLOY.md` with the exact steps. Tested locally with Firebase's own hosting emulator (no login, no network): correct file types, no-cache on the page, manifest and service worker, manifest without errors, offline reload. **Not tested against the real Firebase service or with a real account.** Use a separate Google account and a neutral project name: the project name becomes the public address (`<project-id>.web.app`); the site itself contains no email address.

## Files
- `Solat.html` - the whole app in one file (40 KB, was 847 KB). Share this by WhatsApp or email. No server, no database, no git.
- `manifest.webmanifest`, `sw.js`, `icons/` - only needed to make the app installable (see below).
- `tools/` - `apply-fix.py`, `apply-jakim.py`, `apply-name-brand.py` and `apply-zonefix.py`, `apply-zoneinfo.py`, `apply-menu-qibla.py`, `apply-compass-letters.py`, `apply-compass-mode.py` (the exact patches applied to v7), `make-host.js` (builds `dist/host/` and `dist/Solat-host.zip`), `test.js` (96 browser checks), `test-qibla.js` (compass maths), `test-jakim.js` (zone matching and JAKIM-answer parser), `jakim-test.html` (one-click test: can a web page read JAKIM?).

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
- No Content-Security-Policy; the azan audio is loaded from `islamcan.com`; place search uses the browser `prompt()` box. Say if you want any of these changed. Other outside services still used: OpenStreetMap Nominatim (place names), and the opt-in internet-address lookup.

## Rebuild and test
```
node tools/make-host.js
node tools/test-jakim.js
NODE_PATH=$(npm root -g) node tools/test.js path/to/solat_v7.html   # original optional: enables the "identical to v7" checks
```

## Settings and Kiblat pages: larger text (15.Oct.2026)

Text on both pages is 50% larger (body 15 px to 22.5 px, small text 13 px to 19.5 px, buttons and the sound list 14 px to 21 px, titles 24 px to 34 px; the on/off switch is scaled the same). Not scaled: the big bearing number (already 44 px) and the compass drawing. The dialog is wider on a laptop (560 px instead of 420 px); on a phone it still fills the screen width and scrolls. The page title is now "Tetapan" with "Azan" as a section. Cache name is solat-v6. Patch: tools/apply-dialog-text-gear.py.

## Larger header icons, visible sensor button, safety note (15.Oct.2026)

- Header icons: buttons 38 px to 48 px, drawings 18 px to 26 px (on a 320 px wide screen the date now wraps to two lines; at 393 px it does not).
- "Benarkan sensor" is now the gold primary button and sits directly under the Langsung/Tetap badge (before, it was dark on dark and below the long text, off screen on a phone). It only appears when the browser offers a sensor-permission prompt (iPhone Safari style).
- Settings has a new "Keselamatan" section and one added sentence under Privasi. The statement "tiada spyware atau malware ditemui" rests on a reading and search of this file by the developer (hosts it contacts, no third-party script/font/image/iframe, no eval, no beacon); it is not an independent antivirus or security audit. The outgoing hosts listed in the app are exactly the ones found in the code: e-solat.gov.my, nominatim.openstreetmap.org, islamcan.com, and ipwho.is / ipapi.co / get.geojs.io (only on "Guna anggaran").
- Cache name is solat-v7. Patch: tools/apply-icons-sensor-privacy.py.

## Cloudflare Pages package (15.Oct.2026)

`node tools/make-host.js` now also writes `dist/Solat-cloudflare.zip` (host files + `_headers`, files at the zip root). Steps are in DEPLOY-CLOUDFLARE.md; the security checklist for all Digitiska apps is SECURITY.md. The app itself is unchanged (still solat-v7). Not yet verified: the live Cloudflare dashboard steps, the custom domain, and that Cloudflare serves the page byte for byte as uploaded (check with the hash comparison).

## Live on Cloudflare Pages (16.Oct.2026)

Solat is deployed with Pages Direct Upload (project `solat`, test address solat-8ij.pages.dev) and served at https://solat.digitiska.com. Checked from the owner's computer: the served page hash equals the v7 file (1a427292d4a488d472afdecbe568d364670eda9e2e98163acd0fffa943adf823), `sw.js` is served as JavaScript with `cache-control: no-cache` and `x-content-type-options: nosniff`. First run found the digitiska.com zone replacing `no-cache` with `max-age=14400`; fixed by setting Browser Cache TTL to Respect Existing Headers (see DEPLOY-CLOUDFLARE.md step 2b). Not yet tested on real phones: install from the new address, compass behaviour on the Samsung A54 and the Huawei MatePad. The Firebase site stays online until users have moved.

## Heading and official address (16.Oct.2026)

On request: the heading at the top of the app now reads "Solat Times" (was "Waktu Solat"), and the Keselamatan text ends "...pautan asal Digitiska sahaja: solat.digitiska.com". Still "Waktu Solat" (not requested): the footer line before the zone text, the desktop tab title countdown, and the share-link title (og:title). Cache name is solat-v8. Patch: tools/apply-heading-address.py. The pixel check against v7 now skips the top-left heading corner only; everything else is still compared.

## v8 live (16.Oct.2026)

Solat-cloudflare-v8 uploaded to the Pages project `solat` (Production). Checked from the owner's computer: page hash ef04c077928cc2eeebe5e08cadaf0ba10f46bc615cd45e13e0c1c6d0dc932ec0 (equals Solat.html in commit 964357a), `sw.js` cache-control no-cache, the new address text present. Phone check of the new heading still to be reported by the owner.

## v9 (16.Oct.2026)

On request: (1) leftover names changed to "Solat Times": footer line before the zone text, the laptop tab-title countdown, the share-link title. Not changed: the device notification title "Waktu Solat · <prayer>" shown when azan fires. (2) Compass permission wording: the yellow button reads "Aktifkan Kompas", the waiting badge "Kompas belum aktif", the line "Tekan “Aktifkan Kompas”, kemudian pilih Benarkan apabila diminta." This button only appears in browsers that offer a motion-permission prompt (iPhone style); the owner has no iPhone, so it was only tested with a simulated prompt. (3) Pinch zoom locked: viewport minimum-scale=1, maximum-scale=1, user-scalable=no, touch-action pan-x pan-y, text-size-adjust 100%. The viewport tag had never had a zoom lock (same as the original v7), so this is new behaviour. A simulated two-finger pinch in a mobile-emulated Chromium zoomed the old build to 2.2x and left the new build at 1x. Not verified: real Samsung/Huawei browsers, iPhone Safari (which may ignore a zoom lock). Locking zoom makes the app harder to use for people with poor eyesight. Cache name solat-v9. Patch: tools/apply-names-compass-zoom.py.
