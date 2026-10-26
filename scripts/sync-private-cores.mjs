#!/usr/bin/env node
/**
 * Fail-closed sync of private emulator .data/.wasm into the *runtime* public cores tree.
 *
 * Never deletes or modifies the private asset store (source). Only writes under dstRoot.
 *
 * Env:
 *   RBG_PRIVATE_ASSET_DIR     (default /private-runtime)
 *   RBG_CORE_PROVISION_MODE    PUBLIC_BROWSER | LOCAL_FULL (required; no silent invalid)
 *   RBG_PUBLIC_CORES_DIR      (default /app/public/cores)
 *   RBG_ALLOWLIST_PATH        optional allowlist JSON path
 *   RBG_SYNC_ALLOW_EMPTY_PRIVATE  if "1", missing private dir exits 0 (SOURCE_ONLY shell);
 *                                 otherwise missing private dir fails (default for full runtime)
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

const VALID_MODES = new Set(["PUBLIC_BROWSER", "LOCAL_FULL"]);
const VALID_DIST = new Set([
  "AUTHORIZED_BROWSER_DISTRIBUTABLE",
  "NOT_CLEARED_FOR_PUBLIC_DISTRIBUTION",
  "LOCAL_ONLY",
]);
const SHA256_RE = /^[a-f0-9]{64}$/i;

const privateRoot = process.env.RBG_PRIVATE_ASSET_DIR || "/private-runtime";
const modeRaw = (process.env.RBG_CORE_PROVISION_MODE || "").trim();
const dstRoot = path.resolve(process.env.RBG_PUBLIC_CORES_DIR || "/app/public/cores");
const srcRoot = path.resolve(path.join(privateRoot, "cores"));
const allowEmptyPrivate = process.env.RBG_SYNC_ALLOW_EMPTY_PRIVATE === "1";

function fail(message, details = []) {
  console.error(`PRIVATE_CORE_SYNC_FAILED: ${message}`);
  for (const row of details.slice(0, 80)) console.error(row);
  process.exit(1);
}

if (!VALID_MODES.has(modeRaw)) {
  fail(
    `invalid RBG_CORE_PROVISION_MODE=${JSON.stringify(modeRaw)} (need PUBLIC_BROWSER|LOCAL_FULL)`,
  );
}
const mode = modeRaw;

const allowlistCandidates = [
  process.env.RBG_ALLOWLIST_PATH,
  path.join(privateRoot, "manifests", "browser-distributable-allowlist.json"),
  "/app/policy/browser-distributable-allowlist.json",
  path.join(repoRoot, "docs", "open-source", "browser-distributable-allowlist.json"),
  path.join(repoRoot, "apps", "web", "public", "runtime", "browser-distributable-allowlist.json"),
  path.join(dstRoot, "..", "runtime", "browser-distributable-allowlist.json"),
  "/app/public/runtime/browser-distributable-allowlist.json",
].filter(Boolean);

function loadAllowlist() {
  for (const candidate of allowlistCandidates) {
    if (fs.existsSync(candidate)) {
      return { path: candidate, data: JSON.parse(fs.readFileSync(candidate, "utf8")) };
    }
  }
  fail("browser-distributable-allowlist.json not found", allowlistCandidates);
}

function validateAllowlist(data, allowlistPath) {
  if (!data || data.schema !== "rbg-browser-distributable-allowlist-v1") {
    fail(`invalid allowlist schema at ${allowlistPath}`);
  }
  if (!Array.isArray(data.files) || data.files.length === 0) {
    fail(`allowlist files[] empty at ${allowlistPath}`);
  }
  const seen = new Set();
  for (const [i, entry] of data.files.entries()) {
    const label = `files[${i}]`;
    if (!entry || typeof entry.path !== "string") fail(`${label}: path required`);
    const rel = entry.path.replace(/\\/g, "/");
    if (!rel || rel.startsWith("/") || rel.split("/").includes("..")) {
      fail(`${label}: unsafe path ${JSON.stringify(entry.path)}`);
    }
    if (seen.has(rel)) fail(`${label}: duplicate path ${rel}`);
    seen.add(rel);
    if (!VALID_DIST.has(entry.browser_distribution)) {
      fail(`${label}: unknown browser_distribution ${entry.browser_distribution}`);
    }
    if (!SHA256_RE.test(String(entry.sha256 || ""))) {
      fail(`${label}: invalid sha256 for ${rel}`);
    }
    if (!Number.isInteger(entry.byteSize) || entry.byteSize <= 0) {
      fail(`${label}: invalid byteSize for ${rel}`);
    }
    entry.path = rel;
  }
  return data.files;
}

function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function assertRegularFile(filePath, label) {
  const st = fs.lstatSync(filePath);
  if (st.isSymbolicLink()) fail(`${label}: symlinks forbidden: ${filePath}`);
  if (!st.isFile()) fail(`${label}: not a regular file: ${filePath}`);
}

function resolveUnder(root, rel, label) {
  const resolved = path.resolve(root, rel);
  const rootResolved = path.resolve(root) + path.sep;
  if (resolved !== path.resolve(root) && !resolved.startsWith(rootResolved)) {
    fail(`${label}: path escape ${rel}`);
  }
  return resolved;
}

function removeIfPresent(filePath) {
  try {
    assertRegularFile(filePath, "remove");
    fs.unlinkSync(filePath);
  } catch (err) {
    if (err && err.code === "ENOENT") return;
    throw err;
  }
}

function listPublicBinaries(root) {
  const out = [];
  if (!fs.existsSync(root)) return out;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const st = fs.lstatSync(full);
      if (st.isSymbolicLink()) {
        fail(`public tree contains symlink: ${full}`);
      }
      if (st.isDirectory()) stack.push(full);
      else if (st.isFile()) {
        const ext = path.extname(name).toLowerCase();
        if (ext === ".data" || ext === ".wasm") {
          out.push(full);
        }
      }
    }
  }
  return out;
}

const { path: allowlistPath, data: allowlist } = loadAllowlist();
const entries = validateAllowlist(allowlist, allowlistPath);

if (!fs.existsSync(srcRoot)) {
  if (allowEmptyPrivate) {
    console.error(`WARN: private cores missing at ${srcRoot} (RBG_SYNC_ALLOW_EMPTY_PRIVATE=1)`);
    process.exit(0);
  }
  fail(`private cores directory missing: ${srcRoot}`);
}

const authorizedForMode = [];
for (const entry of entries) {
  const ok =
    mode === "LOCAL_FULL" ||
    entry.browser_distribution === "AUTHORIZED_BROWSER_DISTRIBUTABLE";
  if (ok) authorizedForMode.push(entry);
}

if (authorizedForMode.length === 0) {
  fail(`no files authorized for mode=${mode}`);
}

let copied = 0;
let skippedBlocked = 0;
let removed = 0;
const missing = [];
const mismatched = [];
const selectedRel = new Set(authorizedForMode.map((e) => e.path));

for (const entry of entries) {
  const rel = entry.path;
  const src = resolveUnder(srcRoot, rel, "source");
  const dst = resolveUnder(dstRoot, rel, "destination");
  const authorize = selectedRel.has(rel);

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
  assertRegularFile(src, "source");
  const digest = sha256File(src);
  const size = fs.statSync(src).size;
  if (digest !== entry.sha256 || size !== entry.byteSize) {
    mismatched.push(`${rel} (hash/size)`);
    continue;
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  if (fs.existsSync(dst)) {
    assertRegularFile(dst, "destination");
    if (sha256File(dst) === digest && fs.statSync(dst).size === size) {
      continue;
    }
    removeIfPresent(dst);
  }
  fs.copyFileSync(src, dst);
  assertRegularFile(dst, "copy");
  if (sha256File(dst) !== digest || fs.statSync(dst).size !== size) {
    mismatched.push(`${rel} (post-copy)`);
    continue;
  }
  copied += 1;
}

// Purge any leftover public binaries not in the selected set (stale LOCAL_FULL residue).
for (const full of listPublicBinaries(dstRoot)) {
  const rel = path.relative(dstRoot, full).split(path.sep).join("/");
  if (!selectedRel.has(rel)) {
    removeIfPresent(full);
    removed += 1;
  }
}

if (missing.length || mismatched.length) {
  fail("required assets missing or mismatched", [
    ...missing.map((r) => `missing ${r}`),
    ...mismatched.map((r) => `mismatch ${r}`),
  ]);
}

// Final verification: every public binary must be selected + hash-ok.
const leftovers = [];
for (const full of listPublicBinaries(dstRoot)) {
  const rel = path.relative(dstRoot, full).split(path.sep).join("/");
  if (!selectedRel.has(rel)) leftovers.push(rel);
}
if (leftovers.length) {
  fail("unexpected public binaries remain", leftovers);
}

console.log(
  `PRIVATE_CORE_SYNC_OK mode=${mode} selected=${authorizedForMode.length} copied=${copied} blocked_skipped=${skippedBlocked} removed_public=${removed} allowlist=${allowlistPath}`,
);
