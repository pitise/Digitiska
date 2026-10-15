# Put Solat Times on solat.digitiska.com with Cloudflare Pages (no git, no terminal)

Written 15.Oct.2026, updated 16.Oct.2026 after a real run (Direct Upload to Pages, custom domain solat.digitiska.com, hash and header checks passed). Cloudflare changes its dashboard often, so menu names may differ. If a step does not match what you see, stop and compare with Cloudflare's own help pages.

## What you upload
`Solat-cloudflare.zip`. The files sit at the top level of the zip (not inside a folder):
`index.html`, `sw.js`, `manifest.webmanifest`, `icons/`, and `_headers`.
`_headers` tells Cloudflare not to keep stale copies of the app and its service worker, and sets `nosniff` (same job as firebase.json).

## 1. Create the Pages project (once)
1. Sign in to Cloudflare (the account that holds digitiska.com). Turn on 2-step verification first if it is not on.
2. Open **Workers & Pages**, click **Create application**. The Pages upload is behind the small link at the bottom, "Need to use the legacy Pages workflow? **Continue to Pages**". Choose **Direct Upload** (upload files, no git).
3. Name the project `solat`. If the name is taken, Cloudflare adds letters (it became `solat-8ij.pages.dev` here).
4. Upload `Solat-cloudflare-v7.zip` (NOT the Firebase zip). Before you click Deploy, the file list must show `index.html`, `sw.js`, `manifest.webmanifest`, `_headers` and `icons` at the top level, with no `public` folder and no `firebase.json`. Deploy.
5. Open the `*.pages.dev` address it shows and run the checks in step 4 below against it.

## 2. Attach the domain
1. In the project open **Custom domains**, then add `solat.digitiska.com`.
2. Because digitiska.com is already in the same Cloudflare account, Cloudflare should offer to create the DNS record for you. Accept it.
3. Wait until the status says active (the HTTPS certificate is issued automatically).
4. Open https://solat.digitiska.com

## 2b. Browser Cache TTL (needed, found on the first run)
On the custom domain Cloudflare replaced the file's `no-cache` header with `max-age=14400` (4 hours, the default of the digitiska.com zone), which delays updates on phones.
Fix: open the domain `digitiska.com`, **Caching, Configuration, Browser Cache TTL**, choose **Respect Existing Headers**. This setting belongs to digitiska.com only (iska.my is a separate domain and is not affected).
Check: `curl -sI https://solat.digitiska.com/sw.js | grep -i cache-control` must say `no-cache`.

## 3. Keep these OFF (they change what is served)
- **Web Analytics / the one-click beacon for Pages**: it would add a tracking script to the page, which contradicts the Keselamatan text in the app.
- Any "optimize" feature that rewrites HTML or injects scripts (for example Rocket Loader, email obfuscation, auto minify if your plan still has it). Names change; if a setting says it modifies your pages, leave it off.

## 4. Check that what is live is what you uploaded
After every upload (use the *.pages.dev address too if you like):
```
curl -sI https://solat.digitiska.com/sw.js | grep -i -E "cache-control|content-type"
curl -s https://solat.digitiska.com/ | sha256sum
sha256sum index.html          # run inside the unzipped folder
```
The hash must equal `sha256sum index.html` (v7: `1a427292d4a488d472afdecbe568d364670eda9e2e98163acd0fffa943adf823`) and the header must say `no-cache`. If they differ, something changed the page after you uploaded it (or you uploaded a different version). Do not share the link until you know why.

## 5. Updating later
Replace `index.html` (and bump `CACHE` in `sw.js`), zip the files again with `_headers`, and upload a new deployment in the same Pages project. Then repeat step 4.

## 6. Phones
The new address is a new app to the phone: settings (azan on/off, saved location) start empty. Install again from https://solat.digitiska.com. Keep the old Firebase address running until everyone has moved.
