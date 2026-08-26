[简体中文](./README.md) | [**English**](./README.en.md)

# 🔭 dsh-periscope

[![DSH plugin](https://img.shields.io/badge/DSH-plugin-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
[![license](https://img.shields.io/github/license/lmh-2026/dsh-periscope.svg?style=flat-square)](./LICENSE)
[![version](https://img.shields.io/npm/v/dsh-periscope.svg?style=flat-square)](https://www.npmjs.com/package/dsh-periscope)
[![node](https://img.shields.io/badge/Node.js-%5E22.19%20%7C%20%3E%3D24-339933?style=flat-square&logo=nodedotjs)](./package.json)

> 🎯 Like a periscope: a **text-only** DeepSeek model can "see" images without
> ever switching models — and you can drop **any file (Word / Excel / PDF /
> txt …)** into the conversation as an attachment the agent reads by path.

dsh-periscope does two things:

1. **Vision routing (periscope)** — keep `deepseek-v4-flash` / `deepseek-v4-pro`
   as the session default and **automatically route every request that carries
   image content** to the official vision-capable model
   **`deepseek-v4-flash-vision-exp`** on the same provider. Text-only requests
   stay on the text model. No manual switching, no third-party vision model, no
   OCR — the image is sent **raw** to DeepSeek's own vision API.
2. **Generic file attachments (0.3.0+)** — stock DSH only accepts raster images
   (PNG/JPG/WebP/GIF) in the composer; dropping a non-image file is treated as
   an image and rejected. This plugin adds **arbitrary-file attachments**: drop
   or paste any file → a file card (type icon + name + size) appears → on send
   the file is **persisted to disk** and the conversation keeps a durable
   attachment block the agent reads **by path**.

---

## ✨ Features

| Capability | Description |
| --- | --- |
| 🔀 Vision auto-routing | Image-bearing requests re-dispatch to `deepseek-v4-flash-vision-exp`; text requests stay on the text model at zero cost |
| 📎 Generic file attachments | Drop/paste any file (docx/xlsx/pdf/txt/zip…) → file card → persisted → agent reads by path |
| 🗂️ File-type icons | Cards show a colored type tile per extension (DOCX/PDF/XLSX/MD/ZIP…) |
| 💾 Durable storage | Files saved under `~/.dsh/attachments/v1/files/`; history keeps the block and the absolute path |
| 🛠️ One-command patches | `patch:apply` / `patch:revert` / `patch:verify` / `patch:diff` — idempotent, with originals backed up |
| 🛡️ Crash fix | Fixes `Cannot read properties of undefined (reading 'startsWith')` when sending/removing file drafts |

---

## ⚙️ How it works

### 1. Vision routing

Two gates stand between attaching an image and it reaching a vision-capable
provider in a text-only session; this plugin clears both:

1. **🚪 Host image admission** — on submit the host's `prompt` handler refuses
   images unless the session model declares image input
   (`MODEL_DOES_NOT_SUPPORT_IMAGES`). The plugin wraps `llm.resolveModelInfo`
   so every configured text model reports image input, admitting the prompt.
2. **🔀 Stream routing** — every request funnels through
   `llm.streamWithRegistration`. The plugin wraps it: if messages contain an
   image block and the request is routed to one of the configured text models,
   it re-dispatches on the vision model, so the image blocks are actually sent
   (no `[image omitted because this model accepts text only]` projection, no
   `UNSUPPORTED_CONTENT` refusal).

```text
text-only session (flash/pro)
  │  attach an image 📷
  ▼
host admission   ── resolveModelInfo wrapped → image admitted ✅
  ▼
llm.stream       ── streamWithRegistration wrapped
  │   messages contain an image?
  │     ├─ no  → pass through on deepseek-v4-flash / deepseek-v4-pro (zero-cost) ⚡
  │     └─ yes → re-dispatch on deepseek-v4-flash-vision-exp (official vision API) 🎯
  ▼
wire request     ── same provider + API key, image sent raw 📤
```

### 2. Generic file attachments

File attachments touch DSH **core packages** (wire protocol, attachment store,
composer, model adapter), and the core `session.prompt` wire schema is a
module-internal constant in `dsh-host-apiproxy` that a third-party plugin
cannot extend at runtime — so the package ships the **core patches and an
installer** (see "Core patches" below).

Data flow:

```text
drop / paste any file 📎
  ▼
composer file card (colored type tile + name + size, removable)
  ▼
send ── file bytes (base64) ride the prompt as a {type:"file"} part
  ▼
host validates and persists ── ~/.dsh/attachments/v1/files/<sha256>-<name>
  ▼
durable session block ── {type:"file", file:{name, size, path, …}} (history renders the card)
  ▼
model request ── block projects to text:
  [附件：name（size）\n完整路径：<absolute path>\n请读取该文件内容后继续。]
  ▼
agent reads the file by path with its own tools 🔧
```

**Why not hand the file to the model directly?** DeepSeek's official [Files API
only accepts JPEG/PNG/GIF/WebP images](https://api-docs.deepseek.com/guides/files_api/),
so non-image documents cannot be sent to the model. Path-based consumption is
the equivalent experience in an agent architecture (the Codex approach): the
file is really on disk and the agent reads it with `read`/`bash`/`pwsh`
(decoding docx/xlsx/pdf as needed).

**Default limits** (configurable via `dsh-attachment-local`): 20 MiB per file,
20 files per message, 200 MiB per message; enforced on both client and host.

---

## 📦 Install

### 1. Install the plugin

```powershell
# from npm
dsh plugin --profile web add dsh-periscope

# from a local tarball
dsh plugin --profile web add .\dsh-periscope-0.3.0.tgz
```

### 2. Apply the core patches (enables file attachments)

```bash
npm run patch:apply     # or: node scripts/patch-core.mjs apply
npm run patch:verify    # confirm the core is patched
```

### 3. Restart the DSH app

After installing the plugin and applying the patches, **restart DSH** (the
bundle list and host-side code are read at startup). 🔄

---

## 🛠️ Core patches (patches / scripts)

The feature requires changes to 6 DSH core packages; the plugin carries them as
an **old→new replacement manifest** plus an installer:

| File | What |
| --- | --- |
| `patches/manifest.mjs` | Full replacement list for the 6 core files (~30 hunks) |
| `scripts/patch-core.mjs` | apply / revert / verify / diff installer (idempotent, with backups) |

| Command | Effect |
| --- | --- |
| `node scripts/patch-core.mjs apply` | Apply all patches (skips already-patched files) |
| `node scripts/patch-core.mjs verify` | Report patch status per file |
| `node scripts/patch-core.mjs revert` | Restore original core files from backup |
| `node scripts/patch-core.mjs diff` | Print a summary of every change (for review) |

- Originals are backed up under `~/.dsh/.dsh-periscope-patch-backup/`
  (reconstructed from the manifest, so it works on pristine or already-patched
  installs).
- `--dsh-home <dir>` / `--core-root <dir>` let you point at a non-default
  install.
- ⚠️ **Patches target the DSH core version they were written against**; re-run
  `apply` after a core upgrade — version-mismatched replacements fail loudly
  instead of guessing.

Affected core packages: `@deepseek-ai/dsh-attachment`,
`dsh-attachment-local`, `dsh-host-apiproxy`, `dsh-llm-deepseek`,
`dsh-client-ui-conversation`, `dsh-client-ui-attachment`.

---

## 🛠️ Configuration

Defaults work out of the box for the official DeepSeek setup:

| Field | Default | Meaning |
| --- | --- | --- |
| `provider` | `deepseek-official` | LLM route provider owning the models |
| `textModels` | `["deepseek-v4-flash", "deepseek-v4-pro"]` | Text-only models whose image-bearing requests are routed to the vision model |
| `visionModel` | `deepseek-v4-flash-vision-exp` | Model used for requests with images |

Override in the profile's `cordis.patch.yml` (user layer replaces the whole
row config):

```yaml
- id: periscope
  config:
    provider: deepseek-official
    textModels: [deepseek-v4-flash, deepseek-v4-pro]
    visionModel: deepseek-v4-flash-vision-exp
```

The provider's catalog must contain the text models and the vision model whose
entry declares `image` input (the DeepSeek catalog already does). ✅

---

## 📝 Notes

- **Vision routing**: the switch is per-request and content-driven; image turns
  run on the vision model (including history), text turns run on the text
  model. The request-header log and token metering still record the text model
  (a known cosmetic inaccuracy). The `read_image` tool's own gate is
  unaffected.
- **File attachments**: non-image files are consumed by the agent by path
  (DeepSeek's API does not accept non-image formats); session export does not
  bundle file bytes yet; re-run `patch:apply` after core upgrades.
- The patches are an engineering compromise of shipping core changes with the
  plugin; long term, native file-attachment support in DSH upstream would be
  ideal.

---

## 📄 License

[MIT](./LICENSE)
