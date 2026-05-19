#!/usr/bin/env node
/**
 * install-skill.mjs
 *
 * Installs the skill-generate-demo-videos skill into a target project directory.
 *
 * Usage:
 *   node scripts/install-skill.mjs <target-project-path>
 *
 * Example:
 *   node scripts/install-skill.mjs ../my-project
 *
 * What gets copied:
 *   .cursor/          → Cursor commands and rules
 *   demo-video/       → Specs, assets, and placeholder directories
 *   scripts/demo-video/ → Capture and render scripts
 */

import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// ─── Colour helpers ──────────────────────────────────────────────────────────

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
  section: (msg) => console.log(`\n${c.bold}${c.cyan}${msg}${c.reset}`),
  dim: (msg) => console.log(`${c.dim}   ${msg}${c.reset}`),
};

// ─── Paths that must never be copied ─────────────────────────────────────────

const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  // output artefacts
  'demo-video/output',
  'demo-video/temp',
  // scripts that are only relevant to this repo
  'scripts/install-skill.mjs',
  'scripts/install-global-cursor-commands.mjs',
];

/**
 * Returns true if the given source-relative path should be skipped.
 */
function shouldIgnore(relPath) {
  const normalised = relPath.replace(/\\/g, '/');
  return IGNORE_PATTERNS.some(
    (p) => normalised === p || normalised.startsWith(p + '/'),
  );
}

// ─── Directories to install ───────────────────────────────────────────────────

const SOURCE_DIRS = ['.cursor', path.join('demo-video'), path.join('scripts', 'demo-video')];

// ─── Core helpers ─────────────────────────────────────────────────────────────

/**
 * Recursively copies a file tree from `src` to `dest`.
 * Skips paths matched by shouldIgnore (relative to the repo root).
 * Preserves existing files — only creates files that are missing.
 *
 * @param {string} src       Absolute source directory
 * @param {string} dest      Absolute destination directory
 * @param {string} repoRoot  Absolute path to the repo root (for ignore matching)
 */
async function copyTree(src, dest, repoRoot) {
  let entries;
  try {
    entries = await fs.readdir(src, { withFileTypes: true });
  } catch {
    log.warn(`Source directory not found, skipping: ${src}`);
    return;
  }

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    const relPath = path.relative(repoRoot, srcPath).replace(/\\/g, '/');

    if (shouldIgnore(relPath)) {
      log.dim(`skip  ${relPath}`);
      continue;
    }

    if (entry.isDirectory()) {
      await fs.mkdir(destPath, { recursive: true });
      await copyTree(srcPath, destPath, repoRoot);
    } else {
      // Preserve existing files
      if (existsSync(destPath)) {
        log.dim(`keep  ${relPath}`);
      } else {
        await fs.copyFile(srcPath, destPath);
        log.success(`copy  ${relPath}`);
      }
    }
  }
}

// ─── Package.json script injection ───────────────────────────────────────────

const SCRIPTS_TO_ADD = {
  'demo:video:capture': 'tsx scripts/demo-video/capture-demo.ts --mode=landscape',
  'demo:video:render': 'node scripts/demo-video/render-demo-video.mjs --mode=landscape',
  'demo:video': 'npm run demo:video:capture && npm run demo:video:render',
  'demo:video:reel:capture': 'tsx scripts/demo-video/capture-demo.ts --mode=reel',
  'demo:video:reel:render': 'node scripts/demo-video/render-demo-video.mjs --mode=reel',
  'demo:video:reel': 'npm run demo:video:reel:capture && npm run demo:video:reel:render',
};

const DEPS_TO_ADD = {
  playwright: '^1.44.0',
  '@playwright/test': '^1.44.0',
  tsx: '^4.11.0',
  zod: '^3.23.8',
};

/**
 * Merges skill npm scripts and dependencies into the target package.json.
 * Skips entries that already exist to avoid overwriting project values.
 */
async function patchPackageJson(targetDir) {
  const pkgPath = path.join(targetDir, 'package.json');

  if (!existsSync(pkgPath)) {
    log.warn('No package.json found in target — skipping script/dependency injection.');
    return;
  }

  const raw = await fs.readFile(pkgPath, 'utf8');
  let pkg;
  try {
    pkg = JSON.parse(raw);
  } catch {
    log.warn('Could not parse target package.json — skipping script/dependency injection.');
    return;
  }

  pkg.scripts = pkg.scripts ?? {};
  pkg.dependencies = pkg.dependencies ?? {};

  let changed = false;

  for (const [name, value] of Object.entries(SCRIPTS_TO_ADD)) {
    if (!pkg.scripts[name]) {
      pkg.scripts[name] = value;
      log.success(`added script  "${name}"`);
      changed = true;
    } else {
      log.dim(`script exists  "${name}"`);
    }
  }

  for (const [name, version] of Object.entries(DEPS_TO_ADD)) {
    if (!pkg.dependencies[name] && !pkg.devDependencies?.[name]) {
      pkg.dependencies[name] = version;
      log.success(`added dependency  "${name}": "${version}"`);
      changed = true;
    } else {
      log.dim(`dependency exists  "${name}"`);
    }
  }

  if (changed) {
    await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    log.success('Updated package.json');
  } else {
    log.info('package.json already up-to-date.');
  }
}

// ─── Ensure placeholder directories exist ────────────────────────────────────

async function ensurePlaceholderDirs(targetDir) {
  const dirs = [
    'demo-video/output',
    'demo-video/temp',
    'demo-video/assets/logos',
    'demo-video/assets/music',
  ];

  for (const dir of dirs) {
    const full = path.join(targetDir, dir);
    await fs.mkdir(full, { recursive: true });

    const gitkeep = path.join(full, '.gitkeep');
    if (!existsSync(gitkeep)) {
      await fs.writeFile(gitkeep, '', 'utf8');
      log.success(`created  ${dir}/.gitkeep`);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const targetArg = process.argv[2];

  if (!targetArg) {
    log.error('Usage: node scripts/install-skill.mjs <target-project-path>');
    log.error('Example: node scripts/install-skill.mjs ../my-project');
    process.exit(1);
  }

  const repoRoot = path.resolve(import.meta.dirname, '..');
  const targetDir = path.resolve(targetArg);

  // ── Validate target ──────────────────────────────────────────────────────
  if (!existsSync(targetDir)) {
    log.error(`Target directory does not exist: ${targetDir}`);
    log.error('Please create it first or provide a valid path.');
    process.exit(1);
  }

  const stat = await fs.stat(targetDir);
  if (!stat.isDirectory()) {
    log.error(`Target path is not a directory: ${targetDir}`);
    process.exit(1);
  }

  console.log(
    `\n${c.bold}${c.cyan}▶ skill-generate-demo-videos installer${c.reset}\n`,
  );
  log.info(`Source : ${repoRoot}`);
  log.info(`Target : ${targetDir}`);

  // ── Copy file trees ───────────────────────────────────────────────────────
  for (const dir of SOURCE_DIRS) {
    log.section(`Copying ${dir}/`);
    const src = path.join(repoRoot, dir);
    const dest = path.join(targetDir, dir);
    await fs.mkdir(dest, { recursive: true });
    await copyTree(src, dest, repoRoot);
  }

  // ── Placeholder directories ───────────────────────────────────────────────
  log.section('Ensuring placeholder directories');
  await ensurePlaceholderDirs(targetDir);

  // ── Patch package.json ────────────────────────────────────────────────────
  log.section('Patching package.json');
  await patchPackageJson(targetDir);

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log(`\n${c.bold}${c.green}✔ Skill installed successfully!${c.reset}\n`);
  console.log(`${c.bold}Next steps:${c.reset}`);
  console.log(`  1. ${c.cyan}cd ${targetDir}${c.reset}`);
  console.log(`  2. ${c.cyan}npm install${c.reset}`);
  console.log(`  3. ${c.cyan}npx playwright install chromium${c.reset}`);
  console.log(`  4. Copy ${c.cyan}demo-video/specs/example.spec.json${c.reset} → ${c.cyan}demo-video/specs/demo.spec.json${c.reset} and edit it.`);
  console.log(`  5. ${c.cyan}npm run demo:video${c.reset}\n`);
}

main().catch((err) => {
  log.error(`Unexpected error: ${err.message}`);
  process.exit(1);
});
