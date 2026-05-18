/**
 * capture-demo.ts
 *
 * Records a Playwright video of the scripted user journey defined in a JSON
 * spec file.  Produces a raw WebM video and a metadata JSON file that
 * render-demo-video.mjs consumes.
 *
 * Usage (via npm scripts):
 *   npm run demo:video:capture          # landscape, demo-video/specs/demo.spec.json
 *   npm run demo:video:reel:capture     # reel
 *   tsx scripts/demo-video/capture-demo.ts --mode=landscape --spec=path/to/spec.json
 */

import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { DemoSpecSchema, type Action, type CaptionMarker, type VideoMetadata } from "./types.js";
import { getArg, resolvePath, ensureDir, readJson, writeJson, log, warn, error, nowSeconds } from "./utils.js";

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // ── Mode ──────────────────────────────────────────────────────────────────
  const rawMode = getArg("mode") ?? "landscape";
  if (rawMode !== "landscape" && rawMode !== "reel") {
    error(`Invalid --mode="${rawMode}". Must be "landscape" or "reel".`);
  }
  const mode = rawMode as "landscape" | "reel";

  // ── Spec file ─────────────────────────────────────────────────────────────
  const specArg = getArg("spec") ?? "demo-video/specs/demo.spec.json";
  const specPath = resolvePath(specArg);

  if (!fs.existsSync(specPath)) {
    error(
      `Spec file not found: ${specPath}\n` +
        `  Create one at demo-video/specs/demo.spec.json or pass --spec=path/to/spec.json`
    );
  }

  log(`Loading spec from ${specPath}`);
  const rawSpec = readJson(specPath);

  // ── Validate spec with Zod ────────────────────────────────────────────────
  const parseResult = DemoSpecSchema.safeParse(rawSpec);
  if (!parseResult.success) {
    const messages = parseResult.error.issues
      .map((i) => `  • ${i.path.join(".")} — ${i.message}`)
      .join("\n");
    error(`Spec validation failed:\n${messages}`);
  }
  const spec = parseResult.data;

  // ── Determine viewport ────────────────────────────────────────────────────
  const modeConfig = mode === "landscape" ? spec.landscape : spec.reel;
  if (!modeConfig?.enabled) {
    error(`Mode "${mode}" is disabled in the spec.`);
  }
  const width = modeConfig?.width ?? (mode === "landscape" ? 1920 : 1080);
  const height = modeConfig?.height ?? (mode === "landscape" ? 1080 : 1920);

  log(`Mode: ${mode} (${width}x${height})`);
  log(`Project: ${spec.projectName}`);

  // ── Output paths ──────────────────────────────────────────────────────────
  const tempDir = resolvePath("demo-video/temp");
  const outputDir = resolvePath("demo-video/output");
  ensureDir(tempDir);
  ensureDir(outputDir);

  const rawVideoName = `${spec.outputName}-${mode}-raw.webm`;
  const rawVideoDir = tempDir;
  const metadataPath = path.join(tempDir, `${spec.outputName}-${mode}-metadata.json`);
  const outputVideoPath = path.join(outputDir, `${spec.outputName}-${mode}.mp4`);

  // ── Launch browser ────────────────────────────────────────────────────────
  log("Launching Chromium…");
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    viewport: { width, height },
    recordVideo: {
      dir: rawVideoDir,
      size: { width, height },
    },
    // Reduce motion for smoother captures
    reducedMotion: "reduce",
  });

  const page = await context.newPage();

  // ── Track captions and timing ─────────────────────────────────────────────
  const captions: CaptionMarker[] = [];
  const recordingStartTime = nowSeconds();

  // ── Execute journey ───────────────────────────────────────────────────────
  for (const [stepIndex, step] of spec.journey.entries()) {
    log(`Step ${stepIndex + 1}/${spec.journey.length}: ${step.title}`);

    // Navigate if a URL is provided for this step
    const url = step.url ?? null;
    if (url) {
      const fullUrl = url.startsWith("http") ? url : `${spec.baseUrl}${url}`;
      log(`  Navigating to ${fullUrl}`);
      await page.goto(fullUrl, { waitUntil: "domcontentloaded" });
    }

    const stepStartSeconds = nowSeconds() - recordingStartTime;

    // Execute each action in the step
    for (const action of step.actions) {
      await executeAction(page, action, spec.baseUrl);
    }

    // Linger after actions
    const linger = step.durationAfterActionsMs ?? 500;
    if (linger > 0) {
      await page.waitForTimeout(linger);
    }

    const stepEndSeconds = nowSeconds() - recordingStartTime;

    // Record caption marker
    if (step.caption) {
      captions.push({
        text: step.caption,
        startSeconds: stepStartSeconds,
        endSeconds: stepEndSeconds,
      });
    }
  }

  const totalDurationSeconds = nowSeconds() - recordingStartTime;

  // ── Close context and retrieve video ──────────────────────────────────────
  log("Closing browser and saving video…");
  const videoObj = await page.video();
  await context.close();
  await browser.close();

  if (!videoObj) {
    error("Playwright did not produce a video.  Ensure recordVideo is configured correctly.");
  }

  // Playwright writes the video file when the context is closed
  const savedVideoPath = await videoObj.path();
  if (!savedVideoPath || !fs.existsSync(savedVideoPath)) {
    error(`Video file not found at expected path: ${savedVideoPath}`);
  }

  // Rename to a deterministic filename
  const finalRawPath = path.join(rawVideoDir, rawVideoName);
  fs.renameSync(savedVideoPath, finalRawPath);
  log(`Raw video saved: ${finalRawPath}`);

  // ── Resolve logo path ─────────────────────────────────────────────────────
  let logoPath: string | null = null;
  if (spec.brand?.logo) {
    const resolved = resolvePath(spec.brand.logo);
    if (fs.existsSync(resolved)) {
      logoPath = resolved;
    } else {
      warn(`Logo file not found: ${resolved} — skipping logo overlay.`);
    }
  }

  // ── Resolve music path ────────────────────────────────────────────────────
  let musicConfig: VideoMetadata["music"] = null;
  if (spec.music) {
    const resolvedMusic = resolvePath(spec.music.file);
    if (fs.existsSync(resolvedMusic)) {
      musicConfig = {
        file: resolvedMusic,
        startAt: spec.music.startAt ?? 0,
        volume: spec.music.volume ?? 0.75,
        fadeOutSeconds: spec.music.fadeOutSeconds ?? 4,
      };
    } else {
      warn(`Music file not found: ${resolvedMusic} — skipping background music.`);
    }
  }

  // ── Write metadata ────────────────────────────────────────────────────────
  const metadata: VideoMetadata = {
    outputName: spec.outputName,
    mode,
    width,
    height,
    rawVideoPath: finalRawPath,
    outputVideoPath,
    totalDurationSeconds,
    captions,
    logoPath,
    music: musicConfig,
    brand: spec.brand
      ? {
          primaryColour: spec.brand.primaryColour ?? "#ffffff",
          background: spec.brand.background ?? "dark-gradient",
        }
      : null,
    reel:
      mode === "reel"
        ? {
            safeArea: spec.reel?.safeArea ?? null,
          }
        : null,
  };

  writeJson(metadataPath, metadata);
  log(`Metadata written: ${metadataPath}`);
  log(`✅ Capture complete. Total duration: ${totalDurationSeconds.toFixed(2)}s`);
}

// ---------------------------------------------------------------------------
// Action executor
// ---------------------------------------------------------------------------

async function executeAction(
  page: import("playwright").Page,
  action: Action,
  baseUrl: string
): Promise<void> {
  switch (action.type) {
    case "waitForLoad":
      log(`    Action: waitForLoad`);
      await page.waitForLoadState("load");
      break;

    case "navigate": {
      const fullUrl = action.url.startsWith("http") ? action.url : `${baseUrl}${action.url}`;
      log(`    Action: navigate → ${fullUrl}`);
      await page.goto(fullUrl, { waitUntil: "domcontentloaded" });
      break;
    }

    case "click":
      log(`    Action: click "${action.selector}"`);
      try {
        await page.click(action.selector, { timeout: 10_000 });
      } catch {
        warn(`Could not click selector "${action.selector}" — skipping.`);
      }
      break;

    case "fill":
      log(`    Action: fill "${action.selector}" with "${action.value}"`);
      try {
        await page.fill(action.selector, action.value, { timeout: 10_000 });
      } catch {
        warn(`Could not fill selector "${action.selector}" — skipping.`);
      }
      break;

    case "type":
      log(`    Action: type "${action.value}" into "${action.selector}"`);
      try {
        await page.locator(action.selector).type(action.value, { delay: 60 });
      } catch {
        warn(`Could not type into selector "${action.selector}" — skipping.`);
      }
      break;

    case "hover":
      log(`    Action: hover "${action.selector}"`);
      try {
        await page.hover(action.selector, { timeout: 10_000 });
      } catch {
        warn(`Could not hover over selector "${action.selector}" — skipping.`);
      }
      break;

    case "scroll": {
      const x = action.x ?? 0;
      const y = action.y ?? 0;
      const duration = action.duration ?? 800;
      log(`    Action: scroll to (${x}, ${y}) over ${duration}ms`);
      await page.evaluate(
        ({ x, y, duration }) => {
          return new Promise<void>((resolve) => {
            const startX = window.scrollX;
            const startY = window.scrollY;
            const startTime = performance.now();
            function step(now: number) {
              const elapsed = now - startTime;
              const progress = Math.min(elapsed / duration, 1);
              // Ease in-out cubic
              const ease =
                progress < 0.5
                  ? 4 * progress * progress * progress
                  : 1 - Math.pow(-2 * progress + 2, 3) / 2;
              window.scrollTo(startX + (x - startX) * ease, startY + (y - startY) * ease);
              if (progress < 1) {
                requestAnimationFrame(step);
              } else {
                resolve();
              }
            }
            requestAnimationFrame(step);
          });
        },
        { x, y, duration }
      );
      // Give the browser time to paint after scrolling
      await page.waitForTimeout(200);
      break;
    }

    case "wait":
      log(`    Action: wait ${action.ms}ms`);
      await page.waitForTimeout(action.ms);
      break;

    case "press": {
      log(`    Action: press "${action.key}"${action.selector ? ` on "${action.selector}"` : ""}`);
      if (action.selector) {
        try {
          await page.press(action.selector, action.key, { timeout: 10_000 });
        } catch {
          warn(`Could not press key on selector "${action.selector}" — skipping.`);
        }
      } else {
        await page.keyboard.press(action.key);
      }
      break;
    }

    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = action;
      warn(`Unknown action type: ${JSON.stringify(_exhaustive)} — skipping.`);
    }
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

main().catch((err: unknown) => {
  error(err instanceof Error ? err.message : String(err));
});
