[简体中文](./README.md) | [**English**](./README.en.md)

# 🔭 dsh-periscope

> A plugin for the **[DSH Desktop app](https://www.dshdesktop.cn/)**: lets a text-only model "see" images without switching, and lets you drop **any file** (Word / Excel / PDF / txt / zip…) into the conversation as an attachment the agent reads by path. This project was **built entirely by AI pair-programming (vibecoding)**.

![File attachment cards](docs/attachment-cards.png)

---

## ⚠️ Compatibility scope (important)

dsh-periscope **only works with the [DSH Desktop client](https://www.dshdesktop.cn/)**, and only with its release form where the core is packaged as a single `app.asar`.

- ❌ It does **not** work with DSH's Web / CLI / source-run forms — those load the core as loose files, which is incompatible with the desktop packaged form that this plugin targets.
- ⚠️ **DSH client upgrades may break the plugin**: every update re-packages `app.asar`, so the file-attachment feature is likely to stop working after an upgrade — you need to re-run `apply-file-attachments.ps1` (see usage below).

---

## ✨ What it does

1. **Vision routing (periscope)** — the session stays on `deepseek-v4-flash` / `deepseek-v4-pro`, and every request containing an image is **automatically routed** to the official vision model `deepseek-v4-flash-vision-exp` (same provider). Text-only requests stay on the text model at zero cost — no manual switching, no third-party vision model, no OCR; the image is sent **raw** to DeepSeek's own vision API.
2. **Generic file attachments** — stock DSH only accepts raster images (PNG/JPG/WebP/GIF) in the composer; dropping a non-image file is treated as an image and rejected. This plugin adds **arbitrary-file attachments**: dropping/pasting a non-image file shows an **attachment card** (file-type icon + name + size); on send the file is **persisted to disk** and the conversation keeps a durable block the agent reads **by path**.

---

## 🧰 How it works

The file-attachment feature lives in DSH **core packages** (wire protocol, attachment store, composer, model adapter), and the core `session.prompt` wire schema is a module-internal constant in `dsh-host-apiproxy` that a third-party plugin cannot extend at runtime — so the package ships **patches to the DSH Desktop core** (see below).

Data flow:

```text
drop / paste any file 📎
  ▼
composer attachment card (colored type icon + name + size, removable)
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

**Why not hand the file to the model directly?** DeepSeek's official [Files API only accepts JPEG/PNG/GIF/WebP images](https://api-docs.deepseek.com/guides/files_api/), so non-image documents cannot be sent to the model. Path-based consumption is the equivalent experience in an agent architecture (the Codex approach): the file is really on disk and the agent reads it with `read`/`bash`/`pwsh` (decoding docx/xlsx/pdf as needed).

**Default limits** (configurable via `dsh-attachment-local`): 20 MiB per file, 20 files per message, 200 MiB per message; enforced on both client and host.

---

## 📦 Usage

> This targets the **DSH Desktop client (`app.asar` form)** on **Windows**, and you need to **re-do it after every DSH upgrade**.

### 1. Fully quit DSH Desktop

Close all DSH windows and **right-click the tray icon → Exit** (make sure every process has ended). The script checks this itself and aborts otherwise.

### 2. Run the one-click repack script

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
cd C:\Users\hndsj\Desktop\dsh-periscope-repack   # or the dir where you cloned/extracted this repo
.\apply-file-attachments.ps1
```

The script: checks DSH is quit → picks node → verifies the patch files → **backs up `app.asar` → in-place injects the 6 patched core files** (native modules preserved) → verifies with official asar.

Expect: `重打包完成: ... 打进补丁文件: 6 / 6`, ending with `✅ 完成！`.

### 3. Reopen DSH

Launch DSH again and try dragging/pasting any file.

> The node path may not fit every machine; the script tries DSH's runtime and Codex runtime, and you can edit `$node` in `scripts/apply-file-attachments.ps1` if it can't find one.

---

## 🛠️ Core patches (patches / scripts)

The plugin modifies 6 DSH core packages. The repo ships both the **patch manifest** and the **in-place repacker**:

| File | What |
| --- | --- |
| `patches/manifest.mjs` | old→new replacement list for the 6 core files (~30 hunks, for review/evolution) |
| `patches/asar-patched/` | the 6 already-patched core files (injected into `app.asar` at repack time) |
| `scripts/repack-inplace.mjs` | in-place repack: replaces only these 6 files, preserving every other entry's bytes and the native-module layout |
| `scripts/apply-file-attachments.ps1` | one-click entry: quit check → backup → repack → verify |
| `scripts/patch-core.mjs` | apply / revert / verify / diff installer (legacy loose-core path, see below) |

Affected core packages: `@deepseek-ai/dsh-attachment`, `dsh-attachment-local`, `dsh-host-apiproxy`, `dsh-llm-deepseek`, `dsh-client-ui-conversation`, `dsh-client-ui-attachment`.

> The **loose-core** installer `scripts/patch-core.mjs apply` is still in the repo (for non-packaged forms), but for the **desktop `app.asar` form use the in-place repack above** — a naive `asar extract→pack` orphans the unpacked native modules and prevents DSH from starting.

---

## 🛠️ Configuration

Defaults work out of the box for the official DeepSeek setup:

| Field | Default | Meaning |
| --- | --- | --- |
| `provider` | `deepseek-official` | LLM route provider owning the models |
| `textModels` | `["deepseek-v4-flash", "deepseek-v4-pro"]` | Text-only models whose image-bearing requests are routed to the vision model |
| `visionModel` | `deepseek-v4-flash-vision-exp` | Model used for requests with images |

Override in the profile's `cordis.patch.yml` (user layer replaces the whole row config):

```yaml
- id: periscope
  config:
    provider: deepseek-official
    textModels: [deepseek-v4-flash, deepseek-v4-pro]
    visionModel: deepseek-v4-flash-vision-exp
```

The provider's catalog must contain the text models and the vision model whose entry declares `image` input (the DeepSeek catalog already does). ✅

---

## ⚠️ Risks & caveats

Understand this before you use it: **the plugin works by directly modifying DSH Desktop's core files — it is unofficial.**

| Risk | Description |
| --- | --- |
| 🔄 **breaks on DSH upgrade** | DSH re-packages `app.asar` on update, so the file-attachment feature stops working; re-run `apply-file-attachments.ps1`. Back up `app.asar` before upgrading. |
| 💥 **corruption / won't start** | A bad repack or a patch that no longer matches the new core can prevent DSH from starting. The script always backs up `app.asar` → `app.asar.bak` first; restore as below. |
| 🧩 **core mismatch** | Patches target the core version they were written against; after a core upgrade replacements may not match — regenerate the patches for the new core. |
| 🔬 **unofficial** | This patches DSH core files, not a supported plugin API. DSH makes no stability promise; long-term, native file-attachment support in DSH upstream would be ideal. |
| 💾 **local persistence** | Attachments are saved in plaintext to `~/.dsh/attachments/v1/files/`, and paths/blocks are persisted — mind privacy and disk usage. |
| 📎 **non-image read by agent** | Non-image files are consumed by the agent by path (DeepSeek's API does not accept non-image formats); the `read_image` tool's own gate is unaffected. |
| 🧪 **Windows desktop only** | The current repack script targets Windows + the `app.asar` form; other platforms/forms are out of scope. |

**To restore** (with DSH fully quit):

```powershell
Copy-Item "D:\DSH\DSH Desktop\resources\app.asar.bak" "D:\DSH\DSH Desktop\resources\app.asar" -Force
```

> If DSH won't start, restore the backup first (above); if there's no `.bak` (first run), just re-download the client from the official site.

---

## 📝 Notes

- **Vision routing**: the switch is per-request and content-driven; image turns run on the vision model (including history), text turns run on the text model. The request-header log and token metering still record the text model (a known cosmetic inaccuracy). The `read_image` tool's own gate is unaffected.
- **File attachments**: non-image files are consumed by the agent by path; session export does not bundle file bytes yet; re-run `apply-file-attachments.ps1` after core upgrades.

---

## 🤖 About vibecoding

This project was **built entirely by AI pair-programming (vibecoding)**: feature spec, implementation, debugging, the core `app.asar` repacker, and the docs were all produced by coding agents, with the author validating and releasing. PRs / issues welcome.

---

## 📣 Join the group / support the project

🐧 **QQ group: 332689798** (小鲸子TV) — scan the QR code to join, **report bugs**, and share your experience:

![QQ group QR code](docs/qq-group.jpg)

⭐ If you find it useful, please give the project a **Star**! Your feedback helps make it better.

---

## 📄 License

[MIT](./LICENSE)
