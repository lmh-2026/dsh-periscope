#!/usr/bin/env node
// dsh-periscope — npm bin: one-click installer.
// Finds the installed package (either this package dir, or the DSH profile
// node_modules copy) and runs install.ps1 (Windows PowerShell). On non-Windows
// it prints a helpful message and exits non-zero.
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

if (process.platform !== "win32") {
  console.error("dsh-periscope: this installer targets the DSH Desktop client (Windows).");
  console.error("On this platform, download the repo and read README.md.");
  process.exit(1);
}

// The package root is one level above bin/ when run from node_modules, but if the
// bin is invoked in-place (repo), it may sit directly in the package too. Try both.
const here = __dirname;
const candidates = [join(here, ".."), here];
let pkgRoot;
for (const c of candidates) {
  if (existsSync(join(c, "install.ps1"))) { pkgRoot = c; break; }
}
if (!pkgRoot) {
  // Fallback: scan for install.ps1 up to a few levels.
  let base = here;
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(base, "install.ps1"))) { pkgRoot = base; break; }
    const up = dirname(base);
    if (up === base) break;
    base = up;
  }
}
if (!pkgRoot) {
  console.error("dsh-periscope: install.ps1 not found next to this bin.");
  process.exit(1);
}

const ps1 = join(pkgRoot, "install.ps1");
const args = process.argv.slice(2);

// Try Windows PowerShell; fall back to pwsh.
const psCandidates = [
  { cmd: "powershell.exe", pre: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1] },
];
let result = null;
for (const { cmd, pre } of psCandidates) {
  result = spawnSync(cmd, [...pre, ...args], { stdio: "inherit" });
  if (result.status === 0) break;
  // If the command itself wasn't found, try the next.
  if (result.error && result.error.code === "ENOENT") continue;
  break;
}

if (result && result.error && result.error.code === "ENOENT") {
  console.error("dsh-periscope: Windows PowerShell not found. Run install.ps1 manually.");
  process.exit(1);
}
process.exit(result && typeof result.status === "number" ? result.status : 1);
