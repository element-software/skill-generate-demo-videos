# /generate-demo-video

Generate or update a **landscape (1920×1080) MP4 demo video** for the current project.

## Steps

1. **Understand the app/website**
   - Visit `baseUrl` (or ask the user for it).
   - Identify the key user journeys to showcase — sign-up, core feature, checkout, etc.
   - Note the most important UI elements and their selectors.

2. **Create or update the spec**
   - Open (or create) `demo-video/specs/demo.spec.json`.
   - Follow the schema in `scripts/demo-video/types.ts` (`DemoSpecSchema`).
   - Set `landscape.enabled: true` and `reel.enabled: false` (unless reel is also needed).
   - Write a `journey` array covering the most compelling user flow.
   - Use selectors verified against the live DOM (`data-testid`, ARIA labels, visible text).
   - Set appropriate `durationAfterActionsMs` (≥ 800 ms for any step with a visible caption).
   - Add a `caption` for each step that explains what the viewer is watching.
   - Reference brand assets if available (`demo-video/assets/logos/`, `demo-video/assets/music/`).

3. **Run capture**
   ```bash
   npm run demo:video:capture
   ```
   - Monitors console for warnings about missing selectors and adjusts the spec if needed.

4. **Run render**
   ```bash
   npm run demo:video:render
   ```

5. **Review the output**
   - Open `demo-video/output/{outputName}-landscape.mp4`.
   - If captions are mis-timed or selectors failed, update the spec and re-run from step 3.

## Full pipeline (capture + render in one command)
```bash
npm run demo:video
```

## Output
`demo-video/output/{outputName}-landscape.mp4`

## Troubleshooting
- **FFmpeg not found** — install from https://ffmpeg.org/download.html
- **Selector not found** — inspect the target page and update the selector in the spec
- **Spec validation error** — check the Zod error messages and fix the spec JSON
- **Blank/black video** — ensure the `baseUrl` is reachable and `waitForLoad` is included
