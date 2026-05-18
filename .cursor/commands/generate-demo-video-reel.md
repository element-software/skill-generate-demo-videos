# /generate-demo-video-reel

Generate or update a **portrait reel (1080×1920) MP4 demo video** optimised for Instagram, TikTok, and YouTube Shorts.

## Steps

1. **Understand the app/website**
   - Visit `baseUrl` (or ask the user for it).
   - Focus on the **most visually impactful, vertically-friendly** moments.
   - Short, punchy journeys work best for reels (< 60 seconds ideal).

2. **Create or update the spec**
   - Open (or create) `demo-video/specs/demo.spec.json`.
   - Follow the schema in `scripts/demo-video/types.ts` (`DemoSpecSchema`).
   - Set `reel.enabled: true`.
   - Configure `reel.safeArea` to keep captions away from platform UI chrome:
     ```json
     "safeArea": { "top": 180, "bottom": 220, "left": 80, "right": 80 }
     ```
   - Keep the journey **short and punchy** — 3–6 steps maximum.
   - Write large, easy-to-read captions (the renderer uses a larger font for reel mode automatically).
   - Prefer centred layouts and avoid relying on far-left or far-right content.

3. **Run capture (reel mode)**
   ```bash
   npm run demo:video:reel:capture
   ```
   This records at **1080×1920** natively in Playwright.

4. **Run render (reel mode)**
   ```bash
   npm run demo:video:reel:render
   ```

5. **Review the output**
   - Open `demo-video/output/{outputName}-reel.mp4`.
   - Preview on a mobile screen or use a vertical preview tool.
   - If content is clipped or captions overlap platform UI, adjust `reel.safeArea` in the spec.

## Full pipeline (capture + render in one command)
```bash
npm run demo:video:reel
```

## Output
`demo-video/output/{outputName}-reel.mp4`

## Reel-specific tips
- **Cropping**: The renderer uses `scale+pad` to fit 1080×1920. If you are recording a desktop app
  (landscape content) and want to show it in portrait, the content will be pillarboxed. You can
  customise the crop in `scripts/demo-video/render-demo-video.mjs` — search for "customise cropping".
- **Safe area**: Instagram/TikTok overlay UI at top (~180px) and bottom (~220px) — keep captions
  and important content within the safe area defined in `reel.safeArea`.
- **Font size**: Captions are automatically rendered at a larger size (56px vs 42px) in reel mode.
- **Music**: Short, energetic tracks work well. Set `fadeOutSeconds: 3` for a quick fade.

## Troubleshooting
- **FFmpeg not found** — install from https://ffmpeg.org/download.html
- **Content appears very small** — the app is designed for desktop; consider using a mobile viewport in the spec
- **Captions cut off** — increase `reel.safeArea.bottom` in the spec
- **Selector not found** — inspect the target page and update the selector in the spec
