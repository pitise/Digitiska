# Hafazan App

Single-file, mobile-responsive HTML app for Zayn's Quran memorization homework (Term 1: Al-Fajr, Al-Ghashiyah, Al-A'la; Term 2: At-Tariq, Al-Buruj — per school assignment sheet, 26.Aug.2026).

## What it does
- Flashcard-style listen-and-repeat, in batches of 5 ayah, with cumulative chain-review (not isolated flashcards — after each new ayah it replays ayah 1..n together so he rehearses the transitions, not just each ayah alone).
- Back button within a batch; no progress penalty for going back.
- Transliteration toggle, hidden by default (pronunciation aid, not a crutch).
- Batch unlocks only after a parent taps "He recited it well" on the Recitation Check screen (parent must be physically present and listen — this was a deliberate choice over self-report, see caveat below).
- In-app-only reward system (stars per batch, planet badge per completed surah, tied to each surah's actual meaning — no extra screen time unlocked).
- Progress saved via localStorage (per browser/device — does not sync across devices).

## Data source
Arabic (Uthmani script), English translation (Saheeh International), transliteration, and audio (Mishary Alafasy, cdn.islamic.network) — all pulled from api.alquran.cloud and verified programmatically (ayah counts cross-checked: 30/26/19/17/22) before embedding directly in the HTML. Requires internet for audio playback and Google Fonts on first load; text/logic work offline.

## Known limitation to fix before relying on it long-term
There is no PIN or lock on the parent-confirm button — it's just a tap. Given Zayn's profile (rushes for rewards, flagged as can-be-cunning), he could tap it himself if handed the device unsupervised, defeating the point of the parent-confirm design. Options if this becomes a problem: add a 4-digit parent PIN, or a deliberate long-press instead of a tap.

## Not yet done
- No human (hafiz/teacher) proofread of the embedded Arabic diacritics — recommend one before he starts using it for actual memorization.
- Only these 5 surahs are wired in; adding more requires re-running the data-fetch step, not a parent-editable admin panel.
