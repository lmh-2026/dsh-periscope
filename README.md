**English** | [简体中文](./README.zh.md)

# 🔭 dsh-periscope

[![DSH plugin](https://img.shields.io/badge/DSH-plugin-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
[![license](https://img.shields.io/github/license/lmh-2026/dsh-periscope.svg?style=flat-square)](./LICENSE)
[![version](https://img.shields.io/npm/v/dsh-periscope.svg?style=flat-square)](https://www.npmjs.com/package/dsh-periscope)
[![node](https://img.shields.io/badge/Node.js-%5E22.19%20%7C%20%3E%3D24-339933?style=flat-square&logo=nodedotjs)](./package.json)

> 🎯 Like a periscope, dsh-periscope lets a **text-only** DeepSeek model "see"
> the imagery without ever switching models.

📎 Keep `deepseek-v4-flash` / `deepseek-v4-pro` as the session default and
**automatically route every request that carries image content** to the
official vision-capable model **`deepseek-v4-flash-vision-exp`** on the same
provider. Text-only requests stay on the text model. No manual switching, no
third-party vision model, no OCR — the image is sent **raw** to DeepSeek's own
vision model. ✨

## 🤔 Why

Most DSH "vision" plugins bridge a **third-party** vision language model (GLM /
Qwen / Gemini / Zhipu …) that *transcribes* the image to text, then hand the
description to DeepSeek. That needs an extra API key, adds a lossy
image→text step, and often requires picking a different provider. 😮‍💨

dsh-periscope takes the *transparent* route instead: it keeps your session on
a text model and swaps the **wire model** to `deepseek-v4-flash-vision-exp`
only for turns that actually contain images, using your existing
`deepseek-official` route and API key. The vision model sees the original
pixels. 🔍

## ⚙️ How it works

Two gates stand between pasting an image and it reaching a vision-capable
provider in a text-only session; this plugin clears both:

1. **🚪 Host image admission** — when you submit a message with an image, the
   host's `prompt` handler rejects it unless the session model declares image
   input (`MODEL_DOES_NOT_SUPPORT_IMAGES`). The plugin wraps
   `llm.resolveModelInfo` so every configured text model reports image input,
   letting the prompt (and its image) into the conversation.
2. **🔀 Stream routing** — every request funnels through
   `llm.streamWithRegistration`. The plugin wraps it: if messages contain an
   image block and the request is routed to one of the configured text models,
   it re-dispatches on the configured vision model, so the image blocks are
   actually sent (no `[image omitted because this model accepts text only]`
   projection, no `UNSUPPORTED_CONTENT` refusal).

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

## 📦 Install

```powershell
# from npm
dsh plugin --profile web add dsh-periscope

# from a local tarball
dsh plugin --profile web add .\dsh-periscope-0.2.0.tgz
```

Then **restart the DSH app** (the bundle list is read at startup). 🔄

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

## 📎 Generic file attachments (0.3.0+)

DSH's composer only accepts raster images (PNG/JPG/WebP/GIF) — dragging in a
Word/Excel/PDF/txt file is treated as an image and rejected. Since 0.3.0
dsh-periscope ships the **generic file-attachment** feature:

- **Drag/paste any file** → a file card appears above the composer (colored
  type tile with the extension, file name, size; removable);
- **On send** the file bytes ride the prompt, the host validates and **persists
  them** under `~/.dsh/attachments/v1/files/` (default caps: 20 MiB per file,
  20 files per message, 200 MiB per message);
- The conversation stores a durable `{type:"file"}` block and history renders
  the file card (hover shows the absolute path);
- When the request reaches the model, the block projects to
  `[附件：name（size）\n完整路径：…]` text and the **agent reads the file with
  its own tools**. DeepSeek's official [Files API only accepts image
  formats](https://api-docs.deepseek.com/guides/files_api/), so non-image
  documents cannot be handed to the model directly; path-based consumption is
  the equivalent (Codex-style) experience. Images keep the existing thumbnail +
  vision-model path.

Because the feature touches DSH core packages (wire schema, attachment store,
composer, adapter) that a Cordis plugin cannot extend at runtime, the package
ships the exact source-level changes and an installer:

- `patches/manifest.mjs` — old→new replacements for the 6 affected core files;
- `scripts/patch-core.mjs` — `apply` / `revert` / `verify` / `diff`
  (idempotent, backs up originals under `~/.dsh/.dsh-periscope-patch-backup/`).

```bash
npm run patch:apply     # or: node scripts/patch-core.mjs apply
npm run patch:verify    # confirm the core is patched
npm run patch:revert    # restore the original core files
npm run patch:diff      # review every change
```

> ⚠️ The patches target the DSH core version they were written against. After a
> core upgrade, re-run `apply` (the script reports any version-mismatched
> replacement instead of guessing).

## 📝 Notes

- The switch is per-request and content-driven: image turns run on the vision
  model (including the conversation history), text turns run on the text model.
- The request-header log and token metering still record the text model (the
  header is written before the stream starts); this is a known cosmetic
  inaccuracy.
- The `read_image` tool's own capability gate is not affected; it still uses
  the session route's declared input.

## 📄 License

[MIT](./LICENSE)
