#!/usr/bin/env node
// Downloads a pre-built Stockfish 16 binary for Linux x64 during npm install on Render.
// On other platforms (macOS, Windows) it does nothing — use system stockfish instead.

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TARGET_PATH = path.join(__dirname, '..', 'bin', 'stockfish');

// Only run on Linux (Render environment)
if (os.platform() !== 'linux') {
  console.log('[stockfish] Skipping install on non-Linux platform');
  process.exit(0);
}

// Already installed
if (fs.existsSync(TARGET_PATH)) {
  console.log('[stockfish] Already installed at', TARGET_PATH);
  process.exit(0);
}

// Try system stockfish first
const systemCheck = spawnSync('which', ['stockfish']);
if (systemCheck.status === 0) {
  console.log('[stockfish] System stockfish found:', systemCheck.stdout.toString().trim());
  process.exit(0);
}

// Download Stockfish 16.1 static Linux binary
const DOWNLOAD_URL =
  'https://github.com/official-stockfish/Stockfish/releases/download/sf_16.1/stockfish-ubuntu-x86-64.tar';

const binDir = path.join(__dirname, '..', 'bin');
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

console.log('[stockfish] Downloading Stockfish 16.1 for Linux...');
try {
  execSync(
    `curl -L --fail --silent --show-error "${DOWNLOAD_URL}" | tar -xO stockfish/stockfish-ubuntu-x86-64 > "${TARGET_PATH}"`,
    { stdio: 'inherit', timeout: 60000 },
  );
  fs.chmodSync(TARGET_PATH, 0o755);
  console.log('[stockfish] Installed at', TARGET_PATH);
} catch (err) {
  console.warn('[stockfish] Download failed:', err.message);
  console.warn('[stockfish] Bot will be unavailable but server will start normally');
}
