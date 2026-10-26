#!/usr/bin/env node
/**
 * Sync private emulator .data/.wasm into the public cores tree using the
 * browser-distributable allowlist. Deny-by-default in PUBLIC_BROWSER mode.
 *
 * Env:
 *   RBG_PRIVATE_ASSET_DIR  (default /private-runtime)
 *   RBG_CORE_PROVISION_MODE  PUBLIC_BROWSER | LOCAL_FULL (default PUBLIC_BROWSER)
 *   RBG_ALLOWLIST_PATH  optional path to allowlist JSON
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const privateRoot = process.env.RBG_PRIVATE_ASSET_DIR || "/private-runtime";
const mode = (process.env.RBG_CORE_PROVISION_MODE || "PUBLIC_BROWSER").trim();
const srcRoot = path.join(privateRoot, "cores");
const dstRoot = process.env.RBG_PUBLIC_CORES_DIR || "/app/public/cores";

const allowlistCandidates = [
  process.env.RBG_ALLOWLIST_PATH,
  path.join(privateRoot, "manifests", "browser-distributable-allowlist.json"),
  "/app/policy/browser-distributable-allowlist.json",
  path.join(dstRoot, "..", "runtime", "browser-distributable-allowlist.json"),
  "/app/public/runtime/browser-distributable-allowlist.json",
].filter(Boolean);

function loadAllowlist() {
  for (const candidate of allowlistCandidates) {
    if (fs.existsSync(candidate)) {
      return { path: candidate, data: JSON.parse(fs.readFileSync(candidate, "utf8")) };
    }
  }
  throw new Error("browser-distributable-allowlist.json not found");
}

function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function removeIfPresent(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch (err) {
    if (err && err.code !== "ENOENT") throw err;
  }
}

const { path: allowlistPath, data: allowlist } = loadAllowlist();
const entries = allowlist.files || [];
if (!fs.existsSync(srcRoot)) {
  console.error(`WARN: private cores missing at ${srcRoot}`);
  process.exit(0);
}

let copied = 0;
let skippedBlocked = 0;
let removed = 0;
const missing = [];
const mismatched = [];

for (const entry of entries) {
  const rel = entry.path;
  const status = entry.browser_distribution;
  const src = path.join(srcRoot, rel);
  const dst = path.join(dstRoot, rel);
  const authorize =
    mode === "LOCAL_FULL" || status === "AUTHORIZED_BROWSER_DISTRIBUTABLE";

  if (!authorize) {
    if (fs.existsSync(dst)) {
      removeIfPresent(dst);
      removed += 1;
    }
    skippedBlocked += 1;
    continue;
  }

  if (!fs.existsSync(src)) {
    missing.push(rel);
    continue;
  }
  const digest = sha256File(src);
  if (entry.sha256 && digest !== entry.sha256) {
    mismatched.push(rel);
    continue;
  }
  ensureDir(path.dirname(dst));
  if (fs.existsSync(dst) && sha256File(dst) === digest) {
    continue;
  }
  fs.copyFileSync(src, dst);
  if (sha256File(dst) !== digest) {
    mismatched.push(rel);
    continue;
  }
  copied += 1;
}

if (missing.length || mismatched.length) {
  console.error("PRIVATE_CORE_SYNC_FAILED");
  for (const row of missing.slice(0, 50)) console.error(`missing ${row}`);
  for (const row of mismatched.slice(0, 50)) console.error(`mismatch ${row}`);
  process.exit(1);
}

console.log(
  `PRIVATE_CORE_SYNC_OK mode=${mode} copied=${copied} blocked_skipped=${skippedBlocked} removed_public=${removed} allowlist=${allowlistPath}`,
);
