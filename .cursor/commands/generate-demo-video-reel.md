# /generate-demo-video-reel

Generate or update a **portrait reel (1080×1920) MP4 demo video** optimised for Instagram, TikTok,
and YouTube Shorts.

---

## Overview

This command drives an AI agent through the full reel video pipeline:

1. Reads (or creates) a spec file with `reel.enabled: true`.
2. Captures the journey at 1080×1920 using Playwright's `recordVideo` API.
3. Renders a polished vertical MP4 using FFmpeg with logo overlay, captions, and background music.

---

## Steps

### 1. Understand the app / website

- Visit `baseUrl` (or ask the user to supply it).
- Focus on the **most visually impactful, vertically-friendly** moments.
  - Avoid content that only makes sense at full desktop width.
  - Centre-aligned layouts, hero sections, and modal dialogs work well in portrait.
- Short, punchy journeys work best for reels — target **< 60 seconds** total.

### 2. Create or update the spec

- Open (or create) `demo-video/specs/demo.spec.json`.
- Base it on the schema in `scripts/demo-video/types.ts` (`DemoSpecSchema`).
- Set `reel.enabled: true`.
- Configure `reel.safeArea` to keep captions and key content away from platform UI chrome:

  ```json
  "safeArea": { "top": 180, "bottom": 220, "left": 80, "right": 80 }
  ```

- Keep the journey **short and punchy** — 3–6 steps maximum.
- Write large, easy-to-read captions:
  - Short sentences (≤ 8 words ideally).
  - Action-oriented and marketing-friendly ("Sign up in seconds", "See it in action").
  - The renderer automatically uses a larger font size (56px vs 42px) in reel mode.
- Prefer centred UI interactions — avoid content or buttons far to the left or right edges.
- **Realistic pacing** matters even more on reels — snappy but not robotic.
  - Use short natural pauses (300–600 ms) between clicks.
  - Use `{ "type": "scroll", "y": N, "duration": 800 }` for smooth scrolling.
  - Keep `durationAfterActionsMs` ≥ 800 ms so captions are readable on mobile screens.
- Choose **short, energetic** background music if available. Set `fadeOutSeconds: 3` for a quick fade.

### 3. Run capture (reel mode)

```bash
npm run demo:video:reel:capture
```

This records at **1080×1920** natively in Playwright.

- Monitor the console for warnings about missing selectors.
- If a selector is not found, inspect the live DOM and update the spec.

### 4. Run render (reel mode)

```bash
npm run demo:video:reel:render
```

### 5. Verify the output

- Open `demo-video/output/{outputName}-reel.mp4`.
- Preview on a **mobile device or vertical preview tool** — desktop playback will show black bars.
- Check:
  - Key content is within the safe area (not hidden behind platform UI chrome).
  - Captions are readable and not clipped at top or bottom.
  - No black frames or jarring cuts.
  - Logo and music are correct.
- If content is clipped or captions overlap UI chrome, adjust `reel.safeArea` in the spec and re-render.

---

## Full pipeline (capture + render in one command)

```bash
npm run demo:video:reel
```

---

## Output

```
demo-video/output/{outputName}-reel.mp4
```

---

## Reel-specific tips

- **Cropping**: The renderer uses `scale+pad` to fit 1080×1920. Desktop app content will be
  pillarboxed. Customise the crop in `scripts/demo-video/render-demo-video.mjs` — search for
  "customise cropping".
- **Safe area**: Instagram/TikTok overlay UI at top (~180 px) and bottom (~220 px). Keep captions
  and important actions within the safe area defined in `reel.safeArea`.
- **Font size**: Reel captions render at 56px automatically (vs 42px for landscape).
- **Music**: Energetic, upbeat tracks with a fast intro work best. Keep total duration ≤ 60 s.
- **Aspect ratio**: 9:16 is the target. Avoid wide horizontal scroll sequences — they look poor in
  portrait.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **FFmpeg not found** | Install from https://ffmpeg.org/download.html and add to `PATH` |
| **Content appears very small** | App is desktop-only; consider cropping in `render-demo-video.mjs` |
| **Captions cut off** | Increase `reel.safeArea.bottom` (or `.top`) in the spec |
| **Captions overlap platform UI** | Adjust `reel.safeArea` values — Instagram needs ≥ 220 px bottom |
| **Selector not found** | Inspect the target page in DevTools and update the selector in the spec |
| **Blank / black video** | Ensure `baseUrl` is reachable and `{ "type": "waitForLoad" }` is the first action |
| **Music cuts abruptly** | Set `music.fadeOutSeconds: 3` (or higher) in the spec |

