import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/**
 * Returns the absolute path to the repository root, regardless of where the
 * script is invoked from.
 */
export function repoRoot(): string {
  // scripts/demo-video/utils.ts → ../../
  const thisFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(thisFile), "..", "..");
}

/**
 * Resolves a path that may be absolute or relative to the repo root.
 */
export function resolvePath(p: string): string {
  if (path.isAbsolute(p)) return p;
  return path.join(repoRoot(), p);
}

// ---------------------------------------------------------------------------
// CLI argument helpers
// ---------------------------------------------------------------------------

/**
 * Returns the value of a CLI flag such as `--mode=landscape`.
 * Returns `undefined` if the flag is not present.
 */
export function getArg(flag: string): string | undefined {
  const prefix = `--${flag}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------

/**
 * Ensures a directory exists, creating it (and parents) if necessary.
 */
export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Reads and parses a JSON file.  Throws a descriptive error if the file does
 * not exist or contains invalid JSON.
 */
export function readJson<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`Invalid JSON in ${filePath}`);
  }
}

/**
 * Writes an object as pretty-printed JSON to disk.
 */
export function writeJson(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------

const PREFIX = "[demo-video]";

export function log(message: string): void {
  console.log(`${PREFIX} ${message}`);
}

export function warn(message: string): void {
  console.warn(`${PREFIX} ⚠️  ${message}`);
}

export function error(message: string): never {
  console.error(`${PREFIX} ❌ ${message}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Duration helpers
// ---------------------------------------------------------------------------

/**
 * Returns the current high-resolution time in seconds (fractional).
 */
export function nowSeconds(): number {
  return Date.now() / 1000;
}

/**
 * Formats a number of seconds as `MM:SS.mmm` for display purposes.
 */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`;
}
