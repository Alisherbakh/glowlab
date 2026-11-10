---
name: responsible-ai-check
description: Use when building or reviewing any GlowLab AI feature (label scan, classifier, face analysis, chatbot, compatibility) to check disclaimers, quality gates, confidence thresholds, validation, and privacy.
---

# Responsible AI Check

Review the feature against this checklist. Report each item as ✅ / ❌ with file + line, then propose fixes.

## Checklist
1. **Disclaimer** — `<AiDisclaimer />` visible with every AI result:
   "AI can make mistakes. Information only, not medical advice."
2. **Quality Gate (images)** — runs BEFORE analysis: resolution, blur (Laplacian variance), brightness
   (too dark / too bright), face count (face features: exactly 1), face size.
   Failure → no analysis + clear message asking to upload a better photo or retake with the camera.
3. **Confidence** — below threshold → "Not sure" (not a confident wrong answer). Top-3 shown when relevant.
4. **Validation** — all LLM JSON parsed with zod; invalid → safe error message, no crash.
5. **Privacy** — photos stay in `userData/photos/`; never uploaded except the specific image the user
   chooses to send to Gemini for label analysis (tell the user before sending). Face photos are never sent.
6. **Secrets** — API key only in main process; never in renderer, logs, or git.
7. **Wording** — "observation", never "diagnosis". No disease names as results. Suggest a dermatologist for concerns.
8. **No age estimation** from faces; age range only from the questionnaire.
9. **User control** — "This is wrong" feedback where predictions are shown; "Delete all data" exists in Settings.
10. **Fairness note** — color-based metrics (redness) tested on varied skin tones; limitation documented.
