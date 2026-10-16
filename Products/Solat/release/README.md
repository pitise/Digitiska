# Ready-to-upload packages

`Solat-cloudflare-v10.zip` is the package for Cloudflare Pages Direct Upload (files at the top level of the zip: index.html, sw.js, manifest.webmanifest, _headers, icons/).

How to use it: download the zip (GitHub: open the file, then "Download raw file"), then in Cloudflare open Workers & Pages, project `solat`, create a new deployment (Production) and upload the zip. Steps and checks: ../DEPLOY-CLOUDFLARE.md.

Check after uploading: `curl -s https://solat.digitiska.com/ | sha256sum` must equal the sha256 of index.html inside the zip (v10: f0f9a6730894a481cd92b356c035c56e077108b42ed0afd16c4e7a0805368556).

Only download packages from this repository or from your own build (node tools/make-host.js). A zip passed around by other people may have been altered.
