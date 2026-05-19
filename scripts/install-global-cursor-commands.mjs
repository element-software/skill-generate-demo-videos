#!/usr/bin/env node
/**
 * install-global-cursor-commands.mjs
 *
 * Installs Cursor slash commands from this skill into the global Cursor commands directory.
 *
 * Targets:
 *   macOS / Linux : ~/.cursor/commands/
 *   Windows       : %USERPROFILE%\.cursor\commands\
 *
 * Commands installed:
 *   .cursor/commands/generate-demo-video.md
 *   .cursor/commands/generate-demo-video-reel.md
 *
 * Usage:
 *   node scripts/install-global-cursor-commands.mjs
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { existsSync } from 'fs';

// ─── Colour helpers ───────────────────────────────────────────────────────────

const supportsColour = process.stdout.isTTY;

const c = {
  reset: supportsColour ? '\x1b[0m' : '',
  bold: supportsColour ? '\x1b[1m' : '',
  green: supportsColour ? '\x1b[32m' : '',
  cyan: supportsColour ? '\x1b[36m' : '',
  yellow: supportsColour ? '\x1b[33m' : '',
  red: supportsColour ? '\x1b[31m' : '',
  dim: supportsColour ? '\x1b[2m' : '',
};

const log = {
  info: (msg) => console.log(`${c.cyan}ℹ${c.reset}  ${msg}`),
  success: (msg) => console.log(`${c.green}✔${c.reset}  ${msg}`),
  warn: (msg) => console.log(`${c.yellow}⚠${c.reset}  ${msg}`),
  error: (msg) => console.error(`${c.red}✖${c.reset}  ${msg}`),
  dim: (msg) => console.log(`${c.dim}   ${msg}${c.reset}`),
};

// ─── Command files to install ─────────────────────────────────────────────────

const COMMANDS = [
  'generate-demo-video.md',
  'generate-demo-video-reel.md',
];

// ─── Resolve the global Cursor commands directory ─────────────────────────────

function getGlobalCursorCommandsDir() {
  const home = os.homedir();
  return path.join(home, '.cursor', 'commands');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const repoRoot = path.resolve(import.meta.dirname, '..');
  const sourceCommandsDir = path.join(repoRoot, '.cursor', 'commands');
  const globalCommandsDir = getGlobalCursorCommandsDir();

  console.log(`\n${c.bold}${c.cyan}▶ Installing global Cursor commands${c.reset}\n`);
  log.info(`Source : ${sourceCommandsDir}`);
  log.info(`Target : ${globalCommandsDir}`);

  // ── Validate source directory ─────────────────────────────────────────────
  if (!existsSync(sourceCommandsDir)) {
    log.error(`Source commands directory not found: ${sourceCommandsDir}`);
    log.error('Ensure you are running this script from the skill-generate-demo-videos repo root.');
    process.exit(1);
  }

  // ── Create global commands directory if needed ────────────────────────────
  await fs.mkdir(globalCommandsDir, { recursive: true });
  log.info(`Ensured directory exists: ${globalCommandsDir}`);

  // ── Copy each command file ────────────────────────────────────────────────
  let installedCount = 0;
  let skippedCount = 0;

  for (const filename of COMMANDS) {
    const srcPath = path.join(sourceCommandsDir, filename);
    const destPath = path.join(globalCommandsDir, filename);

    if (!existsSync(srcPath)) {
      log.warn(`Command file not found, skipping: ${filename}`);
      skippedCount++;
      continue;
    }

    const alreadyExists = existsSync(destPath);

    await fs.copyFile(srcPath, destPath);

    if (alreadyExists) {
      log.success(`updated  ${filename}`);
    } else {
      log.success(`installed  ${filename}`);
    }
    installedCount++;
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('');

  if (installedCount > 0) {
    console.log(
      `${c.bold}${c.green}✔ ${installedCount} command${installedCount !== 1 ? 's' : ''} installed successfully!${c.reset}`,
    );
    console.log('');
    console.log(`${c.bold}Commands available in Cursor:${c.reset}`);
    console.log(`  ${c.cyan}/generate-demo-video${c.reset}       — generate a landscape 1920×1080 demo video`);
    console.log(`  ${c.cyan}/generate-demo-video-reel${c.reset}  — generate a portrait 1080×1920 social reel`);
    console.log('');
    console.log(`${c.yellow}↻  Restart Cursor to pick up the new commands.${c.reset}`);
  }

  if (skippedCount > 0) {
    log.warn(`${skippedCount} file${skippedCount !== 1 ? 's' : ''} skipped (not found in source).`);
  }

  console.log('');
}

main().catch((err) => {
  log.error(`Unexpected error: ${err.message}`);
  process.exit(1);
});
