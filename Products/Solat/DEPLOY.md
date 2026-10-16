# Deploy Solat Times to Firebase Hosting (free plan, no git)

Everything below is done in YOUR Google account and on YOUR computer. Menu names on Google's site may differ slightly from what is written here.

## 1. Create the project (once)
1. Go to https://console.firebase.google.com and sign in. Tip: use a separate Google account for Digitiska, not your personal Gmail.
2. **Create a project**. For the name, use something neutral that does not contain your own name, for example `Solat Times`.
3. Under the name you will see the **Project ID** (for example `solat-times-a1b2c`). This becomes your public address `https://<project-id>.web.app`. If you want a different ID, edit it here before continuing. **Write it down.**
4. Google Analytics: you can turn it off (the app does not need it). Finish creating the project.
5. In the left menu choose **Build, then Hosting, then Get started** and click through until the page shows command-line steps (you do not need to run those). Do this only if step 8 later says a site does not exist.

## 2. Install the tools (once)
- Install **Node.js** (version 18 or newer; check with `node --version`) from https://nodejs.org .
- You do not need to install Firebase separately: the commands below use `npx`, which downloads it when needed.

## 3. Deploy
Open a terminal **inside this unzipped folder** (the one that contains `firebase.json` and the `public` folder), then run:

```
npx firebase-tools login
npx firebase-tools deploy --only hosting --project YOUR-PROJECT-ID
```

Replace `YOUR-PROJECT-ID` with the ID you wrote down. The first command opens your browser to sign in. When the second command finishes it prints **Hosting URL: https://YOUR-PROJECT-ID.web.app** . That is your link.

## 4. Install on the phone
Open the link in Chrome on the phone, tap the three-dot menu, then **Install app** (or **Add to Home screen**). The icon is the crescent and the name is **Solat Times**. Share the same link with anyone.

## Updating later
Replace `public/index.html` with the new file (and bump `CACHE` in `public/sw.js`), then run the deploy command again.

## If something goes wrong
- "Hosting site not found" or similar: do the last part of step 1.5, then run the deploy command again.
- "Permission denied" / wrong account: run `npx firebase-tools logout`, then `npx firebase-tools login` with the account that owns the project.
- Anything else: copy the full message and send it to Claude.
