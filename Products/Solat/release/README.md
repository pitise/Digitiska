# Ready-to-upload packages

`Solat-cloudflare-v11.zip` is the package for Cloudflare Pages Direct Upload (files at the top level of the zip: index.html, sw.js, manifest.webmanifest, _headers, icons/).

How to use it: download the zip (GitHub: open the file, then "Download raw file"), then in Cloudflare open Workers & Pages, project `solat`, create a new deployment (Production) and upload the zip. Steps and checks: ../DEPLOY-CLOUDFLARE.md.

Check after uploading: `curl -s https://solat.digitiska.com/ | sha256sum` must equal the sha256 of index.html inside the zip (v11: 8dcbfa1efd6c50fa1b71f0524ce53e6dd7dd9a53f28d1ab56b63ff0685b70aa1).

Only download packages from this repository or from your own build (node tools/make-host.js). A zip passed around by other people may have been altered.
