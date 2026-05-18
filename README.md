# skill-generate-demo-videos

A **spec-driven tool** that generates polished application and website demo videos using **Playwright** (browser recording) and **FFmpeg** (video compositing).

Outputs:
- 🖥️  **Landscape** `1920×1080` MP4 — for websites, product pages, and YouTube
- 📱 **Portrait reel** `1080×1920` MP4 — for Instagram, TikTok, and YouTube Shorts

---

## What it does

1. Reads a JSON **spec** that describes your project, brand, music, and scripted user journey.
2. Launches a headless Chromium browser via Playwright with **video recording enabled**.
3. Navigates through each journey step, executing actions: clicks, fills, scrolls, waits, etc.
4. Passes the raw WebM recording through FFmpeg to produce a polished MP4 with:
   - Correct resolution and encoding (H.264/AAC, `+faststart`)
   - Logo overlay (top-right corner)
   - Styled captions (ASS subtitles burned in)
   - Background music with volume control and fade-out

---

## Requirements

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | ≥ 18 | ESM support required |
| **FFmpeg** | any recent | Must be on `PATH` — [download](https://ffmpeg.org/download.html) |
| **Playwright browsers** | installed via `npx playwright install` | Chromium only |

---

## Installation

```bash
# 1. Clone the repo
git clone https://github.com/element-software/skill-generate-demo-videos.git
cd skill-generate-demo-videos

# 2. Install dependencies
npm install

# 3. Install Playwright's Chromium browser
npx playwright install chromium

# 4. Ensure FFmpeg is installed
ffmpeg -version
```

---

## Quick start

### 1. Create your spec

Copy the example and edit it for your project:

```bash
cp demo-video/specs/example.spec.json demo-video/specs/demo.spec.json
```

Edit `demo-video/specs/demo.spec.json` — see [Spec format](#spec-format) below.

### 2. Add optional assets

- **Logo**: place a PNG in `demo-video/assets/logos/` and reference it in the spec.
- **Music**: place an MP3 in `demo-video/assets/music/` and reference it in the spec.

### 3. Generate landscape video

```bash
npm run demo:video
```

### 4. Generate portrait reel

```bash
npm run demo:video:reel
```

Output files are written to `demo-video/output/`.

---

## NPM scripts

| Script | Description |
|--------|-------------|
| `npm run demo:video` | Capture + render landscape MP4 |
| `npm run demo:video:capture` | Playwright capture only (landscape) |
| `npm run demo:video:render` | FFmpeg render only (landscape) |
| `npm run demo:video:reel` | Capture + render portrait reel MP4 |
| `npm run demo:video:reel:capture` | Playwright capture only (reel) |
| `npm run demo:video:reel:render` | FFmpeg render only (reel) |

---

## Spec format

```json
{
  "projectName": "Example App",
  "baseUrl": "https://example.com",
  "outputName": "example-demo",
  "brand": {
    "logo": "demo-video/assets/logos/logo.png",
    "primaryColour": "#22d3ee",
    "background": "dark-gradient"
  },
  "music": {
    "file": "demo-video/assets/music/soundtrack.mp3",
    "startAt": 0,
    "volume": 0.75,
    "fadeOutSeconds": 4
  },
  "landscape": {
    "enabled": true,
    "width": 1920,
    "height": 1080
  },
  "reel": {
    "enabled": true,
    "width": 1080,
    "height": 1920,
    "safeArea": {
      "top": 180,
      "bottom": 220,
      "left": 80,
      "right": 80
    }
  },
  "journey": [
    {
      "title": "Open homepage",
      "url": "/",
      "caption": "A polished product demo generated with Playwright",
      "durationAfterActionsMs": 1000,
      "actions": [
        { "type": "waitForLoad" },
        { "type": "scroll", "y": 700, "duration": 1200 }
      ]
    },
    {
      "title": "Show interaction",
      "caption": "Real clicks, typing, scrolling and transitions",
      "actions": [
        { "type": "click", "selector": "text=Get Started" },
        { "type": "fill", "selector": "input[name='email']", "value": "demo@example.com" },
        { "type": "wait", "ms": 1000 }
      ]
    }
  ]
}
```

### Supported action types

| Type | Required fields | Description |
|------|----------------|-------------|
| `waitForLoad` | — | Wait for `load` event |
| `navigate` | `url` | Navigate to a URL |
| `click` | `selector` | Click an element |
| `fill` | `selector`, `value` | Clear and fill an input |
| `type` | `selector`, `value` | Type character-by-character (triggers key events) |
| `hover` | `selector` | Move the mouse over an element |
| `scroll` | `y?`, `x?`, `duration?` | Smooth-scroll to a position |
| `wait` | `ms` | Pause for N milliseconds |
| `press` | `key`, `selector?` | Press a keyboard key |

---

## Output paths

```
demo-video/output/{outputName}-landscape.mp4
demo-video/output/{outputName}-reel.mp4
```

Intermediate files (raw WebM + metadata JSON) are written to `demo-video/temp/` and can be safely deleted after rendering.

---

## Cursor usage

This repo ships with [Cursor](https://cursor.so) skill files so AI agents can generate videos automatically.

### Commands

| Command | Description |
|---------|-------------|
| `/generate-demo-video` | Create/update spec and render landscape video |
| `/generate-demo-video-reel` | Create/update spec and render portrait reel |

### Rules

The file `.cursor/rules/demo-video.mdc` is applied automatically when working in the `demo-video/` or `scripts/demo-video/` directories. It instructs the agent to:

- Read the target website before writing the spec
- Use Playwright video recording (not screenshots)
- Find robust selectors from the live DOM
- Produce both landscape and reel output when requested

---

## Using this skill in an existing repo

You can copy just the tool files into your own project:

```bash
# Required scripts
cp -r scripts/demo-video your-project/scripts/demo-video

# Required directories
mkdir -p your-project/demo-video/{specs,assets/{music,logos},output,temp}

# Optional: Cursor skill files
cp -r .cursor your-project/.cursor
```

Then add the npm scripts from `package.json` to your own `package.json`, and install the dependencies:

```bash
npm install playwright tsx zod
npx playwright install chromium
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `FFmpeg is not installed` | Install from https://ffmpeg.org/download.html and ensure it is on `PATH` |
| `Spec file not found` | Create `demo-video/specs/demo.spec.json` (copy from `example.spec.json`) |
| `Spec validation failed` | Check the Zod error output and fix the JSON spec |
| `Selector not found` warning | Inspect the target page and update the CSS/text selector in the spec |
| `Music file not found` | Add the MP3 to `demo-video/assets/music/` or remove `music` from spec |
| `Logo file not found` | Add the PNG to `demo-video/assets/logos/` or remove `brand.logo` from spec |
| Blank / black video | Ensure `baseUrl` is reachable and add `{ "type": "waitForLoad" }` as first action |
| Captions overlap platform UI (reel) | Increase `reel.safeArea.bottom` in the spec |
| Content very small in reel | The app is desktop-only; consider cropping in `render-demo-video.mjs` |

---

## Future ideas

- [ ] Cursor / mouse cursor overlay rendered via FFmpeg
- [ ] Per-step zoom/pan effects (Ken Burns)
- [ ] Intro/outro title card generation
- [ ] Multiple spec files in a single run
- [ ] Video thumbnail extraction
- [ ] GitHub Actions workflow for automated rendering on push

---

## License

MIT © Element Software