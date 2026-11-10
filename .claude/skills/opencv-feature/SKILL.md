---
name: opencv-feature
description: Use when writing GlowLab face analysis or image processing code with opencv.js and MediaPipe (quality check, face zones, skin metrics).
---

# OpenCV / Face Analysis

Lives in `src/renderer/src/cv/`. Runs locally in the renderer (no upload).

## Pipeline
1. Input: camera frame or uploaded photo → `cv.Mat`
2. **Quality Gate** (`qualityCheck.ts`) — stop here if it fails
3. Face landmarks (`faceZones.ts`) — MediaPipe Face Landmarker (`@mediapipe/tasks-vision`)
   → zones: forehead, T-zone, left/right cheek, under-eye
4. Metrics per zone (`skinMetrics.ts`):
   - oiliness/shine: share of bright highlight pixels (HSV V channel)
   - redness: LAB `a*` channel mean vs. reference zone
   - spots: blob detection count (normalized by zone area)
   - dark circles: under-eye brightness vs. cheek brightness
5. Combine with questionnaire (`skin_profile`) → score + confidence
6. Save to `face_scans` via IPC

## Quality Gate defaults (tune with tests)
| Check | Rule | Message |
|---|---|---|
| Resolution | min side < 480px | Upload a higher-quality photo |
| Blur | Laplacian variance < 100 | Photo is blurry, hold steady |
| Dark | mean gray < 60 | Too dark, use natural light |
| Bright | mean gray > 200 | Too bright, avoid direct light |
| Faces | 0 or > 1 | Exactly one face in frame |
| Face size | face box < 20% of image | Come closer |

## Rules
- opencv.js `Mat`s are NOT garbage-collected: call `.delete()` on every Mat (use try/finally).
- Load opencv.js once; wait until it is ready before use.
- Camera: ask permission, show live `QualityHint`, enable "Take photo" only when all checks pass.
- Normalize lighting before comparing scans over time; store `quality_score`.
- Wording: "observation", never "diagnosis". Always show `AiDisclaimer`.
