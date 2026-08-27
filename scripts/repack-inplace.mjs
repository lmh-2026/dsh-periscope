// dsh-periscope — in-place app.asar repacker for the file-attachment feature.
//
// The DSH Desktop app loads its core from a single packed `app.asar`. A naive
// `asar extract → pack` orphams the unpacked native modules (conpty / sharp /
// koffi / node-pty …) and can break DSH at startup. This script instead rewrites
// ONLY the 6 patched core files inside the existing asar, preserving every other
// entry's bytes and integrity, and leaves unpacked entries untouched.
//
// Usage:  node scripts/repack-inplace.mjs   (DSH must be fully closed)
// Overrides:
//   --asar  <path>   path to app.asar       (default: D:/DSH/DSH Desktop/resources/app.asar)
//   --patch <dir>    root holding the same @deepseek-ai tree as patches/asar-patched
//
// It backs up app.asar → app.asar.bak on first run, then writes the new asar.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { Pickle } from "./vendor/asar/pickle.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const ASAR = resolve(arg("--asar") || "D:/DSH/DSH Desktop/resources/app.asar");
const BAK = ASAR + ".bak";
const PATCH = resolve(arg("--patch") || join(__dirname, "..", "patches", "asar-patched", "node_modules", "@deepseek-ai"));

const TARGETS = {
  "node_modules/@deepseek-ai/dsh-attachment/lib/index.js": "dsh-attachment/lib/index.js",
  "node_modules/@deepseek-ai/dsh-attachment-local/lib/index.js": "dsh-attachment-local/lib/index.js",
  "node_modules/@deepseek-ai/dsh-host-apiproxy/lib/index.js": "dsh-host-apiproxy/lib/index.js",
  "node_modules/@deepseek-ai/dsh-llm-deepseek/lib/index.js": "dsh-llm-deepseek/lib/index.js",
  "node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js": "dsh-client-ui-conversation/lib/client.js",
  "node_modules/@deepseek-ai/dsh-client-ui-attachment/lib/client.js": "dsh-client-ui-attachment/lib/client.js",
};

function u32(b, o) { return b.readUInt32LE(o); }

if (!existsSync(ASAR)) { console.error("app.asar 不存在:", ASAR); process.exit(1); }
for (const t of Object.values(TARGETS)) {
  if (!existsSync(join(PATCH, t))) { console.error("补丁文件缺失:", join(PATCH, t)); process.exit(1); }
}
if (!existsSync(BAK)) { copyFileSync(ASAR, BAK); console.log("已备份:", BAK); } else { console.log("备份已存在:", BAK); }

const orig = readFileSync(ASAR);
const sizePickle = u32(orig, 4);
const headerPickle = Pickle.createFromBuffer(orig.slice(8, 8 + sizePickle));
const headerJson = headerPickle.createIterator().readString();
const header = JSON.parse(headerJson);
const dataStart = 8 + sizePickle;

function walk(node, prefix, out) {
  for (const [name, v] of Object.entries(node.files || {})) {
    const p = prefix + name;
    if (v.files) walk(v, p + "/", out);
    else out.push({ path: p, entry: v });
  }
  return out;
}
const files = walk({ files: header.files }, "", []);

const dataChunks = [];
let cursor = 0;
let patched = 0;
for (const f of files) {
  const e = f.entry;
  if (e.link !== undefined) continue;        // symlink: no data
  if (e.offset === undefined) continue;      // unpacked: lives in .asar.unpacked; keep entry as-is
  const t = TARGETS[f.path];
  if (t) {
    const data = readFileSync(join(PATCH, t));
    e.size = data.length; delete e.integrity; e.offset = String(cursor);
    dataChunks.push(data); cursor += data.length; patched++;
  } else {
    const data = orig.subarray(dataStart + Number(e.offset), dataStart + Number(e.offset) + e.size);
    e.offset = String(cursor);
    dataChunks.push(data); cursor += data.length;
  }
}

const h = Pickle.createEmpty(); h.writeString(JSON.stringify(header)); const headerBuf = h.toBuffer();
const s = Pickle.createEmpty(); s.writeUInt32(headerBuf.length); const sizeBuf = s.toBuffer();
const out = Buffer.concat([sizeBuf, headerBuf, ...dataChunks]);
writeFileSync(ASAR, out);
console.log("重打包完成:", out.length, "字节（原 " + orig.length + "）  打进补丁文件:", patched, "/ 6");
