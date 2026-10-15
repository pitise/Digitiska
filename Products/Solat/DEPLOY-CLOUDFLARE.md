# Put Solat Times on solat.digitiska.com with Cloudflare Pages (no git, no terminal)

Written 15.Oct.2026. Cloudflare changes its dashboard often and I could not open it while writing this, so menu names may differ. If a step does not match what you see, stop and compare with Cloudflare's own help pages.

## What you upload
`Solat-cloudflare.zip`. The files sit at the top level of the zip (not inside a folder):
`index.html`, `sw.js`, `manifest.webmanifest`, `icons/`, and `_headers`.
`_headers` tells Cloudflare not to keep stale copies of the app and its service worker, and sets `nosniff` (same job as firebase.json).

## 1. Create the Pages project (once)
1. Sign in to Cloudflare (the account that holds digitiska.com). Turn on 2-step verification first if it is not on.
2. Find **Workers & Pages**, create a **Pages** project, and choose **Direct Upload** (upload files, no git).
3. Name the project `solat` (this also gives a free `solat.pages.dev` address).
4. Upload the zip (or drag the unzipped files). Deploy.
5. Open the `*.pages.dev` address it shows and check the app loads.

## 2. Attach the domain
1. In the project open **Custom domains**, then add `solat.digitiska.com`.
2. Because digitiska.com is already in the same Cloudflare account, Cloudflare should offer to create the DNS record for you. Accept it.
3. Wait until the status says active (the HTTPS certificate is issued automatically).
4. Open https://solat.digitiska.com

## 3. Keep these OFF (they change what is served)
- **Web Analytics / the one-click beacon for Pages**: it would add a tracking script to the page, which contradicts the Keselamatan text in the app.
- Any "optimize" feature that rewrites HTML or injects scripts (for example Rocket Loader, email obfuscation, auto minify if your plan still has it). Names change; if a setting says it modifies your pages, leave it off.

## 4. Check that what is live is what you uploaded
After every upload:
```
curl -s https://solat.digitiska.com/ | sha256sum
sha256sum index.html          # run inside the unzipped folder
```
The two lines must be identical. If they differ, something changed the page after you uploaded it (or you uploaded a different version). Do not share the link until you know why.

## 5. Updating later
Replace `index.html` (and bump `CACHE` in `sw.js`), zip the files again with `_headers`, and upload a new deployment in the same Pages project. Then repeat step 4.

## 6. Phones
The new address is a new app to the phone: settings (azan on/off, saved location) start empty. Install again from https://solat.digitiska.com. Keep the old Firebase address running until everyone has moved.
