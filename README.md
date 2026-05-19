# Playwright Demo Video Generator

> Generate polished product demo videos and social reels using Playwright and FFmpeg.

[![Node.js ≥ 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen?logo=node.js)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Cursor skill](https://img.shields.io/badge/cursor-skill-purple?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0tMiAxNHYtNGwtNC00IDQtNHY0aDR2NGgtNHoiLz48L3N2Zz4=)](https://cursor.so)

---

## What this is

A **spec-driven, reusable Cursor skill** for generating polished product and website demo videos. You describe a scripted user journey in a simple JSON file; the tool records the browser session using [Playwright](https://playwright.dev) and post-processes the footage with [FFmpeg](https://ffmpeg.org) to produce broadcast-quality MP4 files.

Works with **any website or web app** — no hardcoded project references.

### Outputs

| Format | Resolution | Best for |
|--------|-----------|---------|
| 🖥️ Landscape | 1920 × 1080 | Website showcases, YouTube, product pages |
| 📱 Portrait reel | 1080 × 1920 | Instagram, TikTok, YouTube Shorts |

---

## Features

- ✅ **Real browser interaction recording** — Playwright records actual clicks, typing, scrolling
- ✅ **Scripted user journeys** — define every step in a readable JSON spec
- ✅ **Styled captions** — ASS subtitles burned into the video with custom colours and fonts
- ✅ **Logo overlay** — brand logo composited top-right
- ✅ **Background music** — MP3 with configurable volume and automatic fade-out
- ✅ **Landscape + portrait** — both formats from a single spec
- ✅ **Spec-driven workflow** — everything is in the JSON; scripts stay generic
- ✅ **Reusable for any app** — install into any project via the install script
- ✅ **Cursor skill compatible** — AI slash commands included for automated generation

---

## Requirements

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | ≥ 18 | ESM support required |
| **FFmpeg** | any recent | Must be on `PATH` — [download](https://ffmpeg.org/download.html) |
| **Playwright browsers** | — | Install via `npx playwright install chromium` |

---

## Installation

### Option A — Install into an existing project

Clone this repo and run the install script to copy the skill files into your target project:

```bash
git clone https://github.com/element-software/skill-generate-demo-videos
cd skill-generate-demo-videos
npm install
npm run skill:install ../my-project
```

The installer will:
- Copy `.cursor/`, `demo-video/`, and `scripts/demo-video/` into the target project
- Create any missing placeholder directories (with `.gitkeep` files)
- Merge the required npm scripts and dependencies into the target `package.json`
- Preserve any existing files — nothing is overwritten

After installing, run inside your target project:

```bash
npm install
npx playwright install chromium
```

### Option B — Use this repo directly

```bash
git clone https://github.com/element-software/skill-generate-demo-videos
cd skill-generate-demo-videos
npm install
npx playwright install chromium
ffmpeg -version   # ensure FFmpeg is on PATH
```

### Install global Cursor commands

Installs the slash commands into `~/.cursor/commands/` so they are available in **every** Cursor project:

```bash
npm run skill:install:global-commands
```

Restart Cursor after running this command.

---

## Usage

### 1. Create your spec

Copy the example spec and edit it for your project:

```bash
cp demo-video/specs/example.spec.json demo-video/specs/demo.spec.json
```

Edit `demo-video/specs/demo.spec.json` — see [Spec format](#spec-format) below.

### 2. Add optional assets

- **Logo**: place a PNG in `demo-video/assets/logos/` and reference it in the spec under `brand.logo`.
- **Music**: place an MP3 in `demo-video/assets/music/` and reference it in the spec under `music.file`.

Both assets are optional — the tool will warn and continue without them.

### Generate landscape video

```bash
npm run demo:video
```

### Generate portrait reel

```bash
npm run demo:video:reel
```

Output files are written to `demo-video/output/`.

---

## Cursor commands

After installing the global commands (`npm run skill:install:global-commands`), the following slash
commands are available inside Cursor:

| Command | Description |
|---------|-------------|
| `/generate-demo-video` | Read the app, write/update the spec, capture and render a **1920×1080 landscape** MP4 |
| `/generate-demo-video-reel` | Read the app, write/update the spec, capture and render a **1080×1920 portrait reel** MP4 |

The AI agent will:
1. Browse the target URL to understand the interface
2. Write or improve the spec with real selectors verified against the live DOM
3. Produce smooth, realistic interactions (human-speed typing, animated scrolling, natural pauses)
4. Run the full capture + render pipeline
5. Verify the output MP4 exists and report any issues

---

## All npm scripts

| Script | Description |
|--------|-------------|
| `npm run demo:video` | Capture + render landscape MP4 |
| `npm run demo:video:capture` | Playwright capture only (landscape) |
| `npm run demo:video:render` | FFmpeg render only (landscape) |
| `npm run demo:video:reel` | Capture + render portrait reel MP4 |
| `npm run demo:video:reel:capture` | Playwright capture only (reel) |
| `npm run demo:video:reel:render` | FFmpeg render only (reel) |
| `npm run skill:install` | Install this skill into another project |
| `npm run skill:install:global-commands` | Install Cursor commands globally |

---

## Spec format

The spec is a JSON file at `demo-video/specs/demo.spec.json`. Every project-specific detail lives here — the scripts themselves contain no hardcoded content.

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
      "durationAfterActionsMs": 1200,
      "actions": [
        { "type": "waitForLoad" },
        { "type": "scroll", "y": 700, "duration": 1200 }
      ]
    },
    {
      "title": "Show interaction",
      "caption": "Real clicks, typing, scrolling and transitions",
      "durationAfterActionsMs": 1000,
      "actions": [
        { "type": "click", "selector": "text=Get Started" },
        { "type": "fill", "selector": "input[name='email']", "value": "demo@example.com" },
        { "type": "wait", "ms": 800 }
      ]
    }
  ]
}
```

### Top-level fields

| Field | Type | Description |
|-------|------|-------------|
| `projectName` | string | Human-readable project name |
| `baseUrl` | string | Base URL of the app/website |
| `outputName` | string | Used as the output filename prefix |
| `brand` | object | Optional logo, colour, and background |
| `music` | object | Optional background music |
| `landscape` | object | Landscape output config |
| `reel` | object | Portrait reel output config |
| `journey` | array | Ordered list of journey steps |

### Journey step fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Step label (shown in logs) |
| `url` | string? | Relative URL to navigate to |
| `caption` | string? | Caption burned into the video |
| `durationAfterActionsMs` | number? | How long to hold the frame after actions complete (ms) |
| `actions` | array | List of Playwright actions |

### Supported action types

| Type | Required fields | Description |
|------|----------------|-------------|
| `waitForLoad` | — | Wait for the page `load` event |
| `navigate` | `url` | Navigate to a relative or absolute URL |
| `click` | `selector` | Click an element |
| `fill` | `selector`, `value` | Clear and fill an input field |
| `type` | `selector`, `value` | Type character-by-character (fires key events) |
| `hover` | `selector` | Move the mouse over an element |
| `scroll` | `y?`, `x?`, `duration?` | Smooth-scroll to a position (px) |
| `wait` | `ms` | Pause for N milliseconds |
| `press` | `key`, `selector?` | Press a keyboard key |

---

## Example workflow

```
1. Install skill into your project
   npm run skill:install ../my-project

2. Create your spec
   cp demo-video/specs/example.spec.json demo-video/specs/demo.spec.json
   # edit demo.spec.json for your app

3. (Optional) Add logo and music assets
   cp my-logo.png demo-video/assets/logos/logo.png
   cp background.mp3 demo-video/assets/music/soundtrack.mp3

4. Run the full pipeline
   npm run demo:video          # landscape
   npm run demo:video:reel     # portrait reel

5. Open your output files
   demo-video/output/example-demo-landscape.mp4
   demo-video/output/example-demo-reel.mp4
```

---

## Output files

| File | Description |
|------|-------------|
| `demo-video/output/{outputName}-landscape.mp4` | Final landscape video (H.264/AAC, web-optimised) |
| `demo-video/output/{outputName}-reel.mp4` | Final portrait reel video (H.264/AAC, web-optimised) |
| `demo-video/temp/*.webm` | Raw Playwright recordings (safe to delete after rendering) |
| `demo-video/temp/*.json` | Capture metadata (safe to delete after rendering) |

---

## Repository structure

```
skill-generate-demo-videos/
├── .cursor/
│   ├── commands/
│   │   ├── generate-demo-video.md          # /generate-demo-video slash command
│   │   └── generate-demo-video-reel.md     # /generate-demo-video-reel slash command
│   └── rules/
│       └── demo-video.mdc                  # Cursor agent rules for this skill
├── demo-video/
│   ├── assets/
│   │   ├── logos/                          # Place logo PNG files here
│   │   └── music/                          # Place background MP3 files here
│   ├── output/                             # Rendered MP4 files (git-ignored)
│   ├── specs/
│   │   └── example.spec.json              # Example spec to copy and edit
│   └── temp/                               # Raw recordings (git-ignored)
├── scripts/
│   ├── demo-video/
│   │   ├── capture-demo.ts                # Playwright capture script
│   │   ├── render-demo-video.mjs          # FFmpeg render script
│   │   ├── types.ts                       # Zod schema + TypeScript types
│   │   └── utils.ts                       # Shared utilities
│   ├── install-skill.mjs                  # Install skill into another project
│   └── install-global-cursor-commands.mjs # Install Cursor commands globally
├── package.json
├── playwright.config.ts
└── tsconfig.json
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
| Content very small in reel | App is desktop-only; consider customising crop in `render-demo-video.mjs` |
| Video not generated | Check console output — Zod and FFmpeg errors are printed in full |

---

## Future roadmap

- [ ] AI-generated user journeys from a URL + prompt
- [ ] Voiceover narration using text-to-speech
- [ ] Animated captions with entrance/exit transitions
- [ ] Auto zoom and pan (Ken Burns) on key elements
- [ ] Multi-scene transitions (fade, slide)
- [ ] Cursor / mouse pointer overlay via FFmpeg
- [ ] Intro / outro title card generation
- [ ] GitHub Actions workflow for automated rendering on push
- [ ] Video thumbnail extraction

---

## License

MIT © Element Software