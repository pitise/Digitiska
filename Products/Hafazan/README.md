# Hafazan App

Single-file, mobile-responsive HTML app for Quran memorization homework — general-purpose, no child's name in the UI, so it works for both Zayn and Adam.

Surahs currently loaded, in three groups on the home screen:
- **Term 1** (school-assigned): Al-Fajr, Al-Ghashiyah, Al-A'la.
- **Term 2** (school-assigned): At-Tariq, Al-Buruj.
- **More Surahs** (added 26.Aug.2026, not tied to a school term): An-Nas, Al-Falaq, Al-Ikhlas, Al-Kafirun, Ad-Duha.

## What it does
- Flashcard-style listen-and-repeat, in batches of 5 ayah, with cumulative chain-review (not isolated flashcards — after each new ayah it replays ayah 1..n together so he rehearses the transitions, not just each ayah alone).
- Back button within a batch; no progress penalty for going back.
- Transliteration toggle, hidden by default (pronunciation aid, not a crutch).
- Batch unlocks only after a parent taps "He recited it well" on the Recitation Check screen **and enters a 4-digit parent PIN** (set on first use, changeable anytime via the ⚙️ gear icon on the home screen). This closes the earlier gap where Zayn could tap the confirm button himself — the PIN is never shown on screen, so he'd need to know it, not just guess a UI element.
- In-app-only reward system (stars per batch, planet badge per completed surah, tied to each surah's actual meaning — no extra screen time unlocked).
- Progress saved via localStorage (per browser/device — does not sync across devices).
- Repeat button on each ayah in the regular 5-ayah batches: manual only (never auto-starts), replays the current ayah up to 9 times, and stops immediately if tapped again or if any other playback/nav button (Listen, chain-practice, Next, Back) is pressed. The "x/9" count updates live during playback.
- Surahs with more than one 5-ayah batch get a bonus final batch — "Full Surah 🏆" — for reciting along with the whole surah start to finish. Its Listen button auto-plays through every ayah in sequence, keeping the on-screen card in sync; pressing it again pauses, pressing again resumes from where it left off (no separate Repeat or chain-practice button here — the continuous Listen/Pause already covers that). Back/Next still work for manual control and both stop the auto-play. A parent can jump straight into this section early via the PIN, without finishing the regular batches first — tapping it while still locked prompts for the PIN instead of just opening it. Short surahs that only ever had one batch (Al-Ikhlas, Al-Falaq) skip this bonus batch, since that one batch already is the whole surah.

## Data source
Arabic (Uthmani script), English translation (Saheeh International), transliteration, and audio (Mishary Alafasy, cdn.islamic.network) — all pulled from api.alquran.cloud and verified programmatically (ayah counts cross-checked: 30/26/19/17/22) before embedding directly in the HTML. Bismillah is stripped from the displayed text of each surah's first ayah (shown separately from the ayah content) but is still heard, since it's part of the same audio clip. Requires internet for audio playback and Google Fonts on first load; text/logic work offline.

## Known limitation
The parent PIN is stored in this browser's localStorage, unencrypted — fine for a family device, not meant to withstand a technically determined attacker. If the PIN is ever forgotten, there's no recovery flow yet; clearing the site's local storage resets it (and also resets progress).

## Not yet done
- No human (hafiz/teacher) proofread of the embedded Arabic diacritics — recommend one before he starts using it for actual memorization.
- Only these 5 surahs are wired in; adding more requires re-running the data-fetch step, not a parent-editable admin panel.
