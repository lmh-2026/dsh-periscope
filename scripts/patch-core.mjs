#!/usr/bin/env node
/**
 * dsh-periscope — core patch installer for the generic file-attachment feature.
 *
 * The file-attachment feature requires source-level changes to installed DSH
 * core bundles (see patches/manifest.mjs). This script applies / reverts /
 * verifies those changes against the core packages of the active DSH
 * installation, and can print the diff for review.
 *
 * Usage:
 *   node scripts/patch-core.mjs apply    # apply every patch (idempotent)
 *   node scripts/patch-core.mjs revert   # restore original files from backup
 *   node scripts/patch-core.mjs verify   # report applied/missing per file
 *   node scripts/patch-core.mjs diff     # print old→new hunks for review
 *
 * Options:
 *   --dsh-home <dir>   DSH home (default: $DSH_HOME or ~/.dsh)
 *   --core-root <dir>  explicit node_modules root containing @deepseek-ai
 *                      (default: auto-detect under the DSH home profiles)
 *
 * Backup location: <DSH_HOME>/.dsh-periscope-patch-backup/<pkg>/<rel>.orig
 * The backup is derived from the manifest (reverse-applied), so it works both
 * on pristine installs and on installs that were already patched.
 *
 * @module dsh-periscope/scripts/patch-core
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync, readdirSync, realpathSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { PATCHES } from "../patches/manifest.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(HERE, "..");

const COMMANDS = new Set(["apply", "revert", "verify", "diff"]);

function parseArgs(argv) {
	const args = { command: "verify", dshHome: process.env.DSH_HOME, coreRoot: null };
	const rest = [];
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--dsh-home") args.dshHome = argv[++i];
		else if (arg === "--core-root") args.coreRoot = argv[++i];
		else rest.push(arg);
	}
	if (rest.length > 0) {
		if (!COMMANDS.has(rest[0])) {
			console.error(`dsh-periscope: unknown command "${rest[0]}"; expected one of ${[...COMMANDS].join(", ")}`);
			process.exit(2);
		}
		args.command = rest[0];
	}
	return args;
}

function dshHomeOf(args) {
	if (args.dshHome) return normalize(args.dshHome);
	return process.env.DSH_HOME || join(homedir(), ".dsh");
}

/** Candidate absolute paths for one manifest entry (deduped by realpath). */
function candidatesFor(entry, args) {
	const roots = [];
	if (args.coreRoot) roots.push(args.coreRoot);
	const home = dshHomeOf(args);
	roots.push(join(home, "profiles", "node_modules"));
	// profile-specific node_modules trees, if present
	if (existsSync(join(home, "profiles"))) {
		for (const name of readdirSafe(join(home, "profiles"))) {
			const dir = join(home, "profiles", name, "node_modules");
			if (name !== "node_modules" && existsSync(dir)) roots.push(dir);
		}
	}
	const seen = new Set();
	const out = [];
	for (const root of roots) {
		const file = join(root, entry.pkg, entry.rel);
		if (!existsSync(file)) continue;
		let real;
		try {
			real = realpathSync(file);
		} catch {
			real = file;
		}
		if (seen.has(real)) continue;
		seen.add(real);
		out.push(file);
	}
	return out;
}

function readdirSafe(dir) {
	try {
		return readdirSync(dir);
	} catch {
		return [];
	}
}

/** Replace exactly one occurrence of `old` with `new`; returns true when done. */
function applyReplacement(content, replacement) {
	const { old: from, new: to } = replacement;
	if (content.includes(to)) return { changed: false, status: "already" };
	const count = content.split(from).length - 1;
	if (count === 0) return { changed: false, status: "missing", detail: from.slice(0, 60) };
	if (count > 1) return { changed: false, status: "ambiguous", detail: from.slice(0, 60) };
	return { changed: true, status: "applied", content: content.replace(from, to) };
}

/** Undo one replacement (reverse apply). */
function revertReplacement(content, replacement) {
	const { old: from, new: to } = replacement;
	if (content.includes(from) && !content.includes(to)) return { changed: false, status: "pristine" };
	const count = content.split(to).length - 1;
	if (count === 0) return { changed: false, status: "missing", detail: to.slice(0, 60) };
	if (count > 1) return { changed: false, status: "ambiguous", detail: to.slice(0, 60) };
	return { changed: true, status: "reverted", content: content.replace(to, from) };
}

async function readUtf8(file) {
	return readFile(file, "utf8");
}

async function writeUtf8(file, content) {
	await writeFile(file, content, "utf8");
}

function backupPathFor(entry, args) {
	return join(dshHomeOf(args), ".dsh-periscope-patch-backup", entry.pkg.replace("/", "__"), entry.rel.replace(/[\\/]/g, "__") + ".orig");
}

/** Ensure an original-content backup exists (derived by reverse-applying the manifest). */
async function ensureBackup(entry, file, args) {
	const backup = backupPathFor(entry, args);
	if (existsSync(backup)) return backup;
	let content = await readUtf8(file);
	for (const replacement of [...entry.replacements].reverse()) {
		const result = revertReplacement(content, replacement);
		if (result.changed) content = result.content;
	}
	await mkdir(dirname(backup), { recursive: true });
	await writeUtf8(backup, content);
	return backup;
}

function isPatched(content, entry) {
	return content.includes(entry.marker);
}

async function handleCommand(args) {
	const home = dshHomeOf(args);
	console.log(`dsh-periscope patch-core: DSH home = ${home}`);
	const failures = [];
	for (const entry of PATCHES) {
		const files = candidatesFor(entry, args);
		if (files.length === 0) {
			console.log(`  [MISSING] ${entry.pkg}/${entry.rel} — core package not found under the DSH home; is it installed?`);
			failures.push(`${entry.pkg}/${entry.rel}: not found`);
			continue;
		}
		for (const file of files) {
			const label = `${entry.pkg}/${entry.rel} (${file})`;
			switch (args.command) {
				case "apply": {
					let content = await readUtf8(file);
					const backup = await ensureBackup(entry, file, args);
					let changedAny = false;
					let applied = 0;
					for (const replacement of entry.replacements) {
						const result = applyReplacement(content, replacement);
						if (result.changed) {
							content = result.content;
							changedAny = true;
							applied += 1;
						} else if (result.status === "missing") {
							failures.push(`${label}: replacement source not found (${result.detail}…) — core version mismatch?`);
							console.log(`  [ERROR] ${label}: replacement source not found (${result.detail}…)`);
						} else if (result.status === "ambiguous") {
							failures.push(`${label}: replacement source is ambiguous (${result.detail}…)`);
							console.log(`  [ERROR] ${label}: replacement source is ambiguous (${result.detail}…)`);
						}
					}
					if (changedAny) {
						await writeUtf8(file, content);
						console.log(`  [PATCHED] ${label} — ${applied} replacement(s) applied (backup: ${backup})`);
					} else {
						console.log(`  [SKIP]   ${label} — already patched (${applied} replacement(s) verified)`);
					}
					break;
				}
				case "revert": {
					const backup = backupPathFor(entry, args);
					if (!existsSync(backup)) {
						failures.push(`${label}: no backup found (${backup})`);
						console.log(`  [ERROR] ${label}: no backup found — run \`apply\` first`);
						break;
					}
					const original = await readUtf8(backup);
					const current = await readUtf8(file);
					if (current === original) {
						console.log(`  [SKIP]   ${label} — already pristine`);
						break;
					}
					await writeUtf8(file, original);
					console.log(`  [REVERTED] ${label}`);
					break;
				}
				case "verify": {
					const content = await readUtf8(file);
					console.log(`  [${isPatched(content, entry) ? "PATCHED  " : "NOT-PATCHED"}] ${label}`);
					break;
				}
				case "diff": {
					const content = await readUtf8(file);
					let original = content;
					for (const replacement of [...entry.replacements].reverse()) {
						const result = revertReplacement(original, replacement);
						if (result.changed) original = result.content;
					}
					if (original === content) {
						console.log(`  [IDENTICAL] ${label} — not patched`);
						break;
					}
					console.log(`  --- ${label}`);
					for (const replacement of entry.replacements) {
						const inOriginal = original.includes(replacement.old);
						const inCurrent = content.includes(replacement.new);
						if (!inOriginal || !inCurrent) continue;
						console.log(`      # ${replacement.note ?? ""}`);
						const oldLines = replacement.old.split("\n");
						const newLines = replacement.new.split("\n");
						console.log(`      - ${oldLines.length} line(s) -> + ${newLines.length} line(s)`);
					}
					break;
				}
			}
		}
	}
	if (failures.length > 0) {
		console.error(`\ndsh-periscope: ${failures.length} problem(s):`);
		for (const f of failures) console.error(`  - ${f}`);
		process.exitCode = 1;
	} else if (args.command === "verify") {
		console.log("dsh-periscope: all core files are patched for the file-attachment feature.");
	}
}

const args = parseArgs(process.argv.slice(2));
await handleCommand(args);
