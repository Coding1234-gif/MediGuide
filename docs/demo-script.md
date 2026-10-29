# Demo script (≈ 2:30)

**Setup:** deployed URL (or `npm run dev`), signed out, fresh demo account, browser at 1280 px with a phone frame ready.
Use only the fictional samples. Rehearse twice and time it.

| Time | On screen | Say |
|---|---|---|
| 0:00–0:20 | Landing page | "After a pharmacy visit you often leave with a dense label and a leaflet. Misreading 'three times a day for 7 days' is easy. MediGuide turns those instructions into reminders you can trust, and refuses when it shouldn't guess." |
| 0:20–0:45 | Symptoms → Sore throat + Fever → 2–7 days → No to safety questions → results | "First, health information. Fixed safety rules run before anything else. Then we show what NHS sources say, with links and review dates. We call these possibilities, not a diagnosis." *(Optional 5 s: answer "Yes" to breathing and show the emergency screen.)* |
| 0:45–1:20 | Scan → "Clear 7-day course" → review screen | "Now the core. I upload a fictional label. Every field is transcribed with the exact words it came from, shown next to the original. Here's 'THREE times a day' highlighted as evidence." |
| 1:20–1:50 | Confirm fields → attest → Confirm → switch tab to "As directed" sample (pre-loaded) | "I have to check every field myself before anything is saved. Compare a label that says 'as directed': MediGuide blocks scheduling and tells me to ask my pharmacist. It doesn't invent a frequency. The same happens for missing, contradictory or blurry instructions, and for a label that tries to give the AI instructions." |
| 1:50–2:15 | Back to clear sample → times → Preview → approve → Create → Dashboard → mark one done | "For clear instructions, I choose times that fit my day. A deterministic engine, with no AI involved, previews 21 reminders, handles time zones and daylight saving, and won't create duplicates. I approve, and they show up on my dashboard." |
| 2:15–2:30 | Architecture slide or README diagram | "AI reads, the user verifies, deterministic code schedules. We tested this with unit, integration, end-to-end and AI evaluation tests. Next: live notifications, multi-medicine labels, and pharmacist review." |

**Backup plan:** if live AI is slow or down, run with fixtures. The UI labels these as pre-written sample results; say so out loud.
**Do not** show real prescriptions or personal data.
