---
name: ui-ux
description: Use when building or changing any GlowLab screen or component — layout, MUI + SCSS styling, theme, dark mode, i18n, accessibility.
---

# GlowLab UI/UX

## Design direction (DRAFT — confirm with Alisher in Stage 4 before applying)
- Feel: clean, calm, "skincare lab" — soft, light, trustworthy, not flashy.
- Proposed tokens (SCSS variables + MUI theme):
  - Primary: soft rose `#C8798A` · Secondary: sage `#7FA38E`
  - Background light `#FAF7F5` / dark `#17161A` · Surface light `#FFFFFF` / dark `#222127`
  - Text light `#2B2730` / dark `#EDEAF0`
  - Status: OK `#3FA36B` · Soon `#E0A100` · Expired/Risk `#D64545`
  - Radius 12px · spacing scale 4/8/12/16/24/32
- Font: Inter (UI). Korean text falls back to system font.

## Layout
- Left sidebar navigation + top bar (page title, language, theme toggle).
- Content max width ~1200px. Cards for products and results.
- Min window ~1024×700; layout must not break when resized.

## Rules
- MUI components + theme; custom styles in SCSS modules. No inline style soup.
- Every user-facing string through i18n (`uz`, `ko`, `en`).
- Light + dark mode from the same tokens.
- Empty, loading, and error states for every list/page.
- Accessible: labels on inputs, alt text, visible focus, contrast ≥ 4.5:1 for text.
- AI result screens must include `AiDisclaimer`. Image screens must include `QualityHint`.

## Before building a screen
1. Show the component tree and states (empty/loading/error/success).
2. Wait for permission.
3. Build, then describe what to check in `yarn dev`.
4. Update `ai-docs/frontend.md`.
