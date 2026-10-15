# Security checklist for Digitiska apps (15.Oct.2026)

What this protects against: someone taking over the account that publishes the app and replacing it with a malicious copy (the app updates itself on phones), or passing around an altered copy.

## Accounts (the real risk)
1. Cloudflare account (holds the domain and hosting): 2-step verification with a passkey or authenticator app, a password used nowhere else.
2. Registrar account, if different from Cloudflare: same, plus auto-renew and transfer lock. A lapsed domain can be bought by someone else.
3. If Firebase is still in use: its Google account has 2-step verification, and only you are listed under Project settings, Users and permissions.
4. Log out of hosting tools on computers you do not fully control.

## Every release
1. Run the browser tests (tools/test.js) and check the list of outside addresses in Settings, Keselamatan still matches the code.
2. Deploy.
3. Compare the live file with your copy: `curl -s https://solat.digitiska.com/ | sha256sum` against `sha256sum index.html`.
4. Keep a copy of each released zip (and the git history) so a clean version can be redeployed.

## App code rules
- No passwords, API keys or tokens in app code: anyone can read it.
- No third-party scripts, fonts, images or analytics. Every outside address is listed in Settings.
- Only share the official link, never the HTML file or the zip.

## When an app is retired
Delete its DNS record as well as its site. A leftover record can let someone else claim the subdomain (I have not verified how Cloudflare Pages handles this, so removing the record is the safe habit).

## What this does not cover
This is a checklist written by the app's builder, not an independent audit. It does not protect against a compromised Cloudflare account, a compromised phone, or an altered copy that someone else distributes.
