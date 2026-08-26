# Hafazan App

Single-file, mobile-responsive HTML app for Zayn's Quran memorization homework (Term 1: Al-Fajr, Al-Ghashiyah, Al-A'la; Term 2: At-Tariq, Al-Buruj — per school assignment sheet, 26.Aug.2026).

## What it does
- Flashcard-style listen-and-repeat, in batches of 5 ayah, with cumulative chain-review (not isolated flashcards — after each new ayah it replays ayah 1..n together so he rehearses the transitions, not just each ayah alone).
- Back button within a batch; no progress penalty for going back.
- Transliteration toggle, hidden by default (pronunciation aid, not a crutch).
- Batch unlocks only after a parent taps "He recited it well" on the Recitation Check screen **and enters a 4-digit parent PIN** (set on first use, changeable anytime via the ⚙️ gear icon on the home screen). This closes the earlier gap where Zayn could tap the confirm button himself — the PIN is never shown on screen, so he'd need to know it, not just guess a UI element.
- In-app-only reward system (stars per batch, planet badge per completed surah, tied to each surah's actual meaning — no extra screen time unlocked).
- Progress saved via localStorage (per browser/device — does not sync across devices).

## Data source
Arabic (Uthmani script), English translation (Saheeh International), transliteration, and audio (Mishary Alafasy, cdn.islamic.network) — all pulled from api.alquran.cloud and verified programmatically (ayah counts cross-checked: 30/26/19/17/22) before embedding directly in the HTML. Bismillah is stripped from the displayed text of each surah's first ayah (shown separately from the ayah content) but is still heard, since it's part of the same audio clip. Requires internet for audio playback and Google Fonts on first load; text/logic work offline.

## Known limitation
The parent PIN is stored in this browser's localStorage, unencrypted — fine for a family device, not meant to withstand a technically determined attacker. If the PIN is ever forgotten, there's no recovery flow yet; clearing the site's local storage resets it (and also resets progress).

## Not yet done
- No human (hafiz/teacher) proofread of the embedded Arabic diacritics — recommend one before he starts using it for actual memorization.
- Only these 5 surahs are wired in; adding more requires re-running the data-fetch step, not a parent-editable admin panel.
