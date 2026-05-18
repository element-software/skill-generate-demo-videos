/**
 * render-demo-video.mjs
 *
 * Reads the metadata JSON produced by capture-demo.ts and uses FFmpeg to
 * composite the final MP4: scaling, logo overlay, captions, background music.
 *
 * Usage (via npm scripts):
 *   npm run demo:video:render          # landscape
 *   npm run demo:video:reel:render     # reel
 *   node scripts/demo-video/render-demo-video.mjs --mode=landscape
 *
 * Requirements: FFmpeg must be installed and available on PATH.
 */

import { execSync, spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// Helpers (inline – this is a plain .mjs file, no TypeScript imports)
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const PREFIX = "[demo-video]";

function log(msg) {
  console.log(`${PREFIX} ${msg}`);
}
function warn(msg) {
  console.warn(`${PREFIX} ⚠️  ${msg}`);
}
function die(msg) {
  console.error(`${PREFIX} ❌ ${msg}`);
  process.exit(1);
}

function getArg(flag) {
  const prefix = `--${flag}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

function resolvePath(p) {
  if (path.isAbsolute(p)) return p;
  return path.join(REPO_ROOT, p);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    die(`File not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

// ---------------------------------------------------------------------------
// FFmpeg check
// ---------------------------------------------------------------------------

function checkFfmpeg() {
  const result = spawnSync("ffmpeg", ["-version"], { stdio: "pipe" });
  if (result.error || result.status !== 0) {
    die(
      "FFmpeg is not installed or not on PATH.\n" +
        "  Install it from https://ffmpeg.org/download.html and ensure it is in your PATH."
    );
  }
}

// ---------------------------------------------------------------------------
// ASS subtitle generation
// ---------------------------------------------------------------------------

/**
 * Generates an ASS subtitle file from caption markers.
 * Using ASS gives much better control over font size, position, and styling
 * than FFmpeg's drawtext filter.
 *
 * @param {Array<{text: string, startSeconds: number, endSeconds: number}>} captions
 * @param {number} width  Video width in pixels
 * @param {number} height Video height in pixels
 * @param {'landscape'|'reel'} mode
 * @param {{top:number,bottom:number,left:number,right:number}|null} safeArea
 * @returns {string} Path to the written ASS file
 */
function buildAssSubtitles(captions, width, height, mode, safeArea) {
  const assPath = path.join(os.tmpdir(), `demo-captions-${Date.now()}.ass`);

  // Choose font size and bottom margin based on mode
  const fontSize = mode === "reel" ? 56 : 42;
  // Keep captions within the safe area for reel; default bottom margin for landscape
  const marginV = mode === "reel" && safeArea ? safeArea.bottom + 20 : 60;
  const marginL = mode === "reel" && safeArea ? safeArea.left : 40;
  const marginR = mode === "reel" && safeArea ? safeArea.right : 40;

  /**
   * Converts seconds to ASS timestamp format: H:MM:SS.cc
   */
  function toAssTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const cs = Math.round((seconds % 1) * 100);
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
  }

  const header = `[Script Info]
Title: Demo Video Captions
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,${fontSize},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,1,2,${marginL},${marginR},${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events = captions
    .map((c) => {
      // Escape braces and special characters in ASS
      const text = c.text.replace(/\{/g, "\\{").replace(/\}/g, "\\}");
      return `Dialogue: 0,${toAssTime(c.startSeconds)},${toAssTime(c.endSeconds)},Default,,0,0,0,,${text}`;
    })
    .join("\n");

  fs.writeFileSync(assPath, header + events, "utf-8");
  return assPath;
}

// ---------------------------------------------------------------------------
// FFmpeg filter graph builder
// ---------------------------------------------------------------------------

/**
 * Builds the FFmpeg filter_complex string and returns it along with
 * the final output stream label.
 *
 * @param {object} opts
 * @returns {{ filterComplex: string, outLabel: string }}
 */
function buildFilterComplex(opts) {
  const { width, height, mode, hasLogo, assPath, primaryColour } = opts;

  const filters = [];
  let currentLabel = "[v0]";

  // 1. Scale + pad input video to target resolution
  //
  //    For portrait (reel) the browser captures at 1080x1920 natively, so
  //    this just ensures correct resolution if the raw is slightly off.
  //    For landscape the raw WebM is already 1920x1080.
  //
  //    We use force_original_aspect_ratio=decrease and pad so that any
  //    size discrepancy is handled gracefully.
  //
  //    To customise cropping for reel mode (e.g. centre-crop a landscape
  //    recording), change the scale/crop values here.
  filters.push(
    `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
      `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black${currentLabel}`
  );

  // 2. Logo overlay (top-right corner, 10px padding)
  if (hasLogo) {
    const logoLabel = "[logo_scaled]";
    const logoSize = mode === "reel" ? 120 : 100;
    // Scale logo to fixed width preserving aspect ratio
    filters.push(`[1:v]scale=${logoSize}:-1${logoLabel}`);
    const x = `${width} - overlay_w - 20`;
    const y = `20`;
    const outLabel = "[v_logo]";
    filters.push(`${currentLabel}${logoLabel}overlay=${x}:${y}${outLabel}`);
    currentLabel = outLabel;
  }

  // 3. Burn in ASS captions
  if (assPath) {
    // Escape Windows backslashes and colons for FFmpeg filter syntax
    const escapedAssPath = assPath.replace(/\\/g, "/").replace(/:/g, "\\:");
    const outLabel = "[v_captions]";
    filters.push(`${currentLabel}ass='${escapedAssPath}'${outLabel}`);
    currentLabel = outLabel;
  }

  return {
    filterComplex: filters.join("; "),
    outLabel: currentLabel,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  checkFfmpeg();

  // ── Mode ───────────────────────────────────────────────────────────────────
  const rawMode = getArg("mode") ?? "landscape";
  if (rawMode !== "landscape" && rawMode !== "reel") {
    die(`Invalid --mode="${rawMode}". Must be "landscape" or "reel".`);
  }
  const mode = rawMode;

  // ── Read metadata ──────────────────────────────────────────────────────────
  const specArg = getArg("spec") ?? "demo-video/specs/demo.spec.json";
  const specPath = resolvePath(specArg);
  let outputName;

  // Try to derive outputName from the spec file quickly
  if (fs.existsSync(specPath)) {
    try {
      const spec = readJson(specPath);
      outputName = spec.outputName;
    } catch {
      // will be caught by metadata check below
    }
  }

  // Fallback: scan temp dir for any metadata file matching the mode
  if (!outputName) {
    const tempDir = resolvePath("demo-video/temp");
    const candidates = fs
      .readdirSync(tempDir)
      .filter((f) => f.endsWith(`-${mode}-metadata.json`));
    if (candidates.length === 0) {
      die(
        `No metadata file found in demo-video/temp for mode "${mode}".\n` +
          `Run npm run demo:video:${mode === "reel" ? "reel:" : ""}capture first.`
      );
    }
    // Use the most recently modified file
    candidates.sort((a, b) => {
      return (
        fs.statSync(path.join(tempDir, b)).mtimeMs -
        fs.statSync(path.join(tempDir, a)).mtimeMs
      );
    });
    outputName = candidates[0].replace(`-${mode}-metadata.json`, "");
  }

  const metadataPath = resolvePath(
    `demo-video/temp/${outputName}-${mode}-metadata.json`
  );
  log(`Reading metadata from ${metadataPath}`);
  const meta = readJson(metadataPath);

  const { width, height, rawVideoPath, outputVideoPath, captions, logoPath, music, reel } = meta;

  // Verify raw video exists
  if (!fs.existsSync(rawVideoPath)) {
    die(
      `Raw video not found: ${rawVideoPath}\n` +
        `Run npm run demo:video:${mode === "reel" ? "reel:" : ""}capture first.`
    );
  }

  ensureDir(path.dirname(outputVideoPath));

  log(`Rendering ${mode} video: ${width}x${height}`);

  // ── Build ASS subtitles ────────────────────────────────────────────────────
  let assPath = null;
  if (captions && captions.length > 0) {
    assPath = buildAssSubtitles(
      captions,
      width,
      height,
      mode,
      reel?.safeArea ?? null
    );
    log(`ASS subtitles written: ${assPath}`);
  }

  // ── Build FFmpeg command ───────────────────────────────────────────────────
  const inputs = [`-i "${rawVideoPath}"`];
  let hasLogo = false;

  if (logoPath && fs.existsSync(logoPath)) {
    inputs.push(`-i "${logoPath}"`);
    hasLogo = true;
    log(`Logo overlay: ${logoPath}`);
  } else if (logoPath) {
    warn(`Logo file not found: ${logoPath} — skipping logo overlay.`);
  }

  const { filterComplex, outLabel } = buildFilterComplex({
    width,
    height,
    mode,
    hasLogo,
    assPath,
    primaryColour: meta.brand?.primaryColour ?? "#ffffff",
  });

  // ── Music ──────────────────────────────────────────────────────────────────
  let audioFilters = "";
  let musicInputIndex = hasLogo ? 2 : 1;

  if (music && fs.existsSync(music.file)) {
    inputs.push(`-ss ${music.startAt} -i "${music.file}"`);
    log(`Music: ${music.file} (start=${music.startAt}s, vol=${music.volume}, fadeOut=${music.fadeOutSeconds}s)`);

    const totalDuration = meta.totalDurationSeconds;
    const fadeStart = Math.max(0, totalDuration - music.fadeOutSeconds);

    // Mix original video audio (if any) with background music.
    // If the video has no audio track [0:a] will simply not be used.
    audioFilters =
      `-filter_complex "${filterComplex}; ` +
      `[${musicInputIndex}:a]atrim=0:${totalDuration},` +
      `asetpts=PTS-STARTPTS,` +
      `volume=${music.volume},` +
      `afade=t=out:st=${fadeStart.toFixed(3)}:d=${music.fadeOutSeconds}[music_out]" ` +
      `-map "${outLabel}" -map "[music_out]"`;
  } else {
    if (music) {
      warn(`Music file not found: ${music.file} — skipping background music.`);
    }
    audioFilters =
      `-filter_complex "${filterComplex}" ` +
      `-map "${outLabel}" -map 0:a?`;
  }

  // ── Encode ─────────────────────────────────────────────────────────────────
  const ffmpegCmd = [
    "ffmpeg -y",
    ...inputs,
    audioFilters,
    // H.264 video
    "-c:v libx264 -preset slow -crf 18",
    // AAC audio at 192kbps
    "-c:a aac -b:a 192k",
    // Ensure correct pixel format for broad compatibility
    "-pix_fmt yuv420p",
    // Allow web playback without full download
    "-movflags +faststart",
    `"${outputVideoPath}"`,
  ].join(" ");

  log(`Running FFmpeg…`);
  log(`  ${ffmpegCmd}`);

  try {
    execSync(ffmpegCmd, { stdio: "inherit" });
  } catch (err) {
    die(`FFmpeg failed: ${err.message}`);
  }

  // ── Cleanup temp ASS file ──────────────────────────────────────────────────
  if (assPath && fs.existsSync(assPath)) {
    fs.unlinkSync(assPath);
  }

  log(`✅ Render complete: ${outputVideoPath}`);
}

main().catch((err) => {
  die(err instanceof Error ? err.message : String(err));
});
