# /generate-demo-video

Generate or update a **landscape (1920×1080) MP4 demo video** for the current project using Playwright
and FFmpeg.

---

## Overview

This command drives an AI agent through the full demo video pipeline:

1. Reads (or creates) a spec file that describes the target app, brand, and scripted user journey.
2. Captures the journey as a raw browser recording using Playwright.
3. Renders a polished MP4 using FFmpeg with logo overlay, captions, and background music.

---

## Steps

### 1. Understand the app / website

- Visit `baseUrl` (or ask the user to supply it).
- Explore the UI: identify the most compelling user journeys — onboarding, core feature, checkout, etc.
- Note important UI elements and confirm their selectors against the **live DOM**.
  - Prefer `data-testid` attributes, ARIA roles/labels, and visible text over fragile CSS class names.
  - Open DevTools and verify each selector returns exactly one element before using it.

### 2. Create or update the spec

- Open (or create) `demo-video/specs/demo.spec.json`.
- Base it on the schema in `scripts/demo-video/types.ts` (`DemoSpecSchema`).
- Set `landscape.enabled: true` and `reel.enabled: false` (unless reel output is also needed).
- Write a `journey` array covering the most compelling, visually clear user flow.
  - **Prefer realistic interactions** — natural pauses, smooth scrolling, human-speed typing.
  - **Avoid robotic timings** — no instant clicks with zero wait between steps.
  - Set `durationAfterActionsMs` ≥ 800 ms for any step with a visible caption so viewers can read it.
  - Keep the total journey under 2–3 minutes for best engagement.
- Add a `caption` for each step that clearly explains what the viewer is watching.
  - Write captions in sentence case, concise (< 10 words), marketing-friendly.
- Reference brand assets if available:
  - `demo-video/assets/logos/` — logo PNG (overlaid top-right)
  - `demo-video/assets/music/` — background MP3

### 3. Optimise pacing and selectors

- Re-read the spec top-to-bottom as if you are the viewer.
- Check that every `url` in a step is correct and the element pointed to by each `selector` exists.
- Add `{ "type": "waitForLoad" }` as the **first action** in any step that navigates to a new URL.
- Use `{ "type": "scroll", "y": N, "duration": 1200 }` for smooth animated scrolling instead of
  instant jumps — this looks far more polished on video.
- Use `{ "type": "wait", "ms": 800 }` to let UI animations settle before the next action.
- Avoid `{ "type": "wait", "ms": N }` with N > 3000 — prefer `waitForLoad` or selector-based waits
  where possible.

### 4. Run capture

```bash
npm run demo:video:capture
```

- Monitor the console for warnings about missing selectors.
- If a selector is not found, inspect the live DOM and update the spec.
- Re-run capture after fixing any selector issues.

### 5. Run render

```bash
npm run demo:video:render
```

### 6. Verify the output

- Open `demo-video/output/{outputName}-landscape.mp4`.
- Check:
  - Captions are readable and well-timed.
  - No black frames or sudden jumps.
  - Logo appears correctly.
  - Music fades out smoothly at the end.
- If anything needs adjustment, update the spec and re-run from step 4.

---

## Full pipeline (capture + render in one command)

```bash
npm run demo:video
```

---

## Output

```
demo-video/output/{outputName}-landscape.mp4
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **FFmpeg not found** | Install from https://ffmpeg.org/download.html and add to `PATH` |
| **Selector not found** | Inspect the target page in DevTools and update the selector in the spec |
| **Spec validation error** | Check the Zod error messages printed to the console and fix the spec JSON |
| **Blank / black video** | Ensure `baseUrl` is reachable and `{ "type": "waitForLoad" }` is the first action |
| **Captions mis-timed** | Increase `durationAfterActionsMs` for the affected step |
| **Music cuts abruptly** | Increase `music.fadeOutSeconds` in the spec |

