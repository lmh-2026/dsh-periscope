<div align="center">

# 🔭 dsh-periscope

**Let DSH Desktop's text-only model "see" images, and drop any file into the conversation for the agent to read.**

<br />

<p>
  <a href="https://www.dshdesktop.cn/"><img src="https://img.shields.io/badge/Target-DSH%20Desktop-4D6BFE?style=for-the-badge&logo=deepseek&logoColor=white" alt="DSH Desktop" /></a>
  <img src="https://img.shields.io/badge/Platform-Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white" alt="Windows" />
  <img src="https://img.shields.io/badge/Node.js-22%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/lmh-2026/dsh-periscope.svg?style=for-the-badge" alt="License MIT" /></a>
</p>

<p>
  <a href="https://github.com/lmh-2026/dsh-periscope/stargazers"><img src="https://img.shields.io/github/stars/lmh-2026/dsh-periscope.svg?style=social" alt="Stars" /></a>
  <a href="https://github.com/lmh-2026/dsh-periscope/forks"><img src="https://img.shields.io/github/forks/lmh-2026/dsh-periscope.svg?style=social" alt="Forks" /></a>
  <a href="https://github.com/lmh-2026/dsh-periscope/issues"><img src="https://img.shields.io/github/issues/lmh-2026/dsh-periscope.svg?style=social" alt="Issues" /></a>
</p>

<br />

<p align="center">
  <picture>
    <img src="docs/attachment-cards.png" alt="File attachment cards" width="90%" />
  </picture>
</p>

<br />

[简体中文](./README.md) · **🇬🇧 English**

</div>

---

## ✨ Features

| Capability | Description |
| --- | --- |
| 🔀 **Vision auto-routing** | Attach an image in a text-only session with no manual switching — requests with images are auto-dispatched to the official vision model `deepseek-v4-flash-vision-exp`; text requests stay on the text model at zero cost |
| 📎 **Generic file attachments** | Stock DSH only accepts images; this plugin lets you drop/paste **any file** (docx/xlsx/pdf/txt/zip…) → attachment card → persisted → agent reads by path |
| 🗂️ **File-type icons** | Cards show a colored type tile per extension (Word blue W / Excel green X / PDF red P…) |
| 💾 **Durable storage** | Files saved under `~/.dsh/attachments/v1/files/`; history keeps the block and the absolute path |
| 🛡️ **Crash fix** | Fixes `Cannot read properties of undefined (reading 'startsWith')` when sending/removing file drafts |
| 🧩 **Shipped core patches** | Replacement manifest for 6 core files + a one-click in-place repacker that modifies the DSH Desktop core |

---

## ⚠️ Toggle explained: two features, two mechanisms (important)

People often wonder why the slider in DSH's plugin list doesn't control file attachments. That's because the two features live on **two completely different layers**:

| Feature | Lives on | How it's enabled | Does the plugin-list toggle control it? |
| --- | --- | --- | --- |
| 🔀 **Vision routing** | the `dsh-periscope` plugin **bundle** | loaded at startup via the plugin list | ✅ **Yes** — the toggle switches exactly this |
| 📎 **File attachments** | DSH's **6 core packages** (inside `app.asar`) | `install.ps1` in-place patches `app.asar`; **fixed once packaged** | ❌ **No** |

**Why?**

- **Vision routing is a plugin**: it's loaded at runtime through DSH's plugin system. The plugin-list slider controls whether the `dsh-periscope` bundle is loaded, so it only affects vision routing.
- **File attachments are a core patch**: DSH core's `session.prompt` wire schema is a **module-internal constant** in `dsh-host-apiproxy` that a third-party plugin **cannot extend at runtime**. Giving DSH an "any file" capability requires **directly modifying the core**, and `app.asar` is packed once — it's **outside the plugin's runtime toggle**.

**What this means in practice**:

- Whether file attachments work depends only on whether `app.asar` **has been patched** (whether `install.ps1` was run). It has **nothing to do with the slider**: patched → turning the slider off leaves file attachments working; not patched → the slider can't help.
- The slider's visible effect is limited to the **vision-routing** half.

> ✅ So the slider isn't pointless — it just governs **vision routing**. **File attachments need `install.ps1` to patch `app.asar`.** Treat the two separately.

---

## 🚀 One-click install (recommended)

> **Only works with the [DSH Desktop client](https://www.dshdesktop.cn/)** (the form where the core is packed into a single `app.asar`). Operate on **Windows**, and **re-do this after every DSH upgrade**.

Published to npm: [`dsh-periscope@0.3.4`](https://www.npmjs.com/package/dsh-periscope). The repo ships a one-click `install.ps1` that does "install the bundle + fix the version + repack `app.asar`" in a single step.

### A. From GitHub (zip / clone)

```powershell
# 1) Fully quit DSH Desktop
# 2) In the repo dir, run:
Set-ExecutionPolicy -Scope Process Bypass -Force
.\install.ps1
```

### B. From npm

```powershell
npm install dsh-periscope
npx dsh-periscope-install
```

Or use the DSH plugin entry directly:

```bash
dsh plugin add dsh-periscope@0.3.4     # exact version -> plugin list shows the right version
```

**The script does**: quit check → back up `app.asar` → install/update the bundle at the exact version via `dsh plugin add dsh-periscope@<ver>` (bumps the dependency from `^0.2.0` to `^0.3.3`, so the DSH plugin list shows the correct version) → in-place repack `app.asar` with the installed package's `scripts/repack-inplace.mjs` (injects the 6 patched core files, preserving native modules) → verify + prompt to restart.

- Pick a version / profile: `.\install.ps1 -Version 0.3.3 -Profile desktop`
- Offline (skip npm registry): `.\install.ps1 -FromLocal`

> ⚠️ Key point: the plugin list shows the **locally installed** version. It was stuck at `0.2.0` because the dependency was `^0.2.0` (= `>=0.2.0 <0.3.0`, which can never reach 0.3.x). Installing an **exact version** bypasses that and shows the correct version.

### 3. Reopen DSH

Drop/paste a non-image file and you'll see an attachment card with the file-type icon; after sending, the agent reads it by path. The DSH plugin list should show `dsh-periscope v0.3.3`.

---

## 📖 How it works

File attachments live in DSH **core packages** (wire protocol, attachment store, composer, model adapter), and the core validation schema is a module-internal constant in `dsh-host-apiproxy` that a third-party plugin cannot extend at runtime — so the package ships **patches to the desktop core**.

```text
drop / paste any file 📎
  → composer attachment card (type icon + name + size, removable)
  → send: file bytes (base64) ride the prompt as a {type:"file"} part
  → host validates and persists: ~/.dsh/attachments/v1/files/<sha256>-<name>
  → durable session block: {type:"file", file:{name, size, path, …}} (history renders the card)
  → model request: the block projects to text
      [附件：name（size）\n完整路径：<absolute path>\n请读取该文件内容后继续。]
  → agent reads the file by path with its own tools 🔧
```

**Why not hand the file to the model directly?** DeepSeek's official [Files API only accepts JPEG/PNG/GIF/WebP images](https://api-docs.deepseek.com/guides/files_api/), so non-image documents cannot be sent to the model. Path-based consumption is the equivalent experience in an agent architecture (the Codex approach): the file is really on disk and the agent reads it with `read`/`bash`/`pwsh`.

**Default limits** (configurable via `dsh-attachment-local`): **20 MiB** per file, **20 files** per message, **200 MiB** per message; enforced on both client and host.

---

## 🛠️ Configuration

Defaults work out of the box for the official DeepSeek setup:

| Field | Default | Meaning |
| --- | --- | --- |
| `provider` | `deepseek-official` | LLM route provider owning the models |
| `textModels` | `["deepseek-v4-flash", "deepseek-v4-pro"]` | Text-only models whose image-bearing requests route to the vision model |
| `visionModel` | `deepseek-v4-flash-vision-exp` | Model used for requests with images |

Override in the profile's `cordis.patch.yml` (user layer replaces the whole row config):

```yaml
- id: periscope
  config:
    provider: deepseek-official
    textModels: [deepseek-v4-flash, deepseek-v4-pro]
    visionModel: deepseek-v4-flash-vision-exp
```

The provider's catalog must contain the text models and the vision model whose entry declares `image` input (the DeepSeek catalog already does) ✅

---

## 📁 Repository structure

| Path | What |
| --- | --- |
| `patches/manifest.mjs` | old→new replacement list for the 6 core files (~30 hunks, for review/evolution) |
| `patches/asar-patched/` | the 6 already-patched core files (injected into `app.asar` at repack time) |
| `scripts/repack-inplace.mjs` | in-place repack: replaces only these 6 files, preserving every other entry and the native-module layout |
| `scripts/apply-file-attachments.ps1` | one-click entry: quit check → backup → repack → verify |
| `scripts/patch-core.mjs` | `apply` / `revert` / `verify` / `diff` (legacy loose-core path) |
| `lib/` · `cordis.patch.yml` | the plugin itself and its DSH patch declaration |

Affected core packages: `@deepseek-ai/dsh-attachment`, `dsh-attachment-local`, `dsh-host-apiproxy`, `dsh-llm-deepseek`, `dsh-client-ui-conversation`, `dsh-client-ui-attachment`.

---

## ❓ FAQ

**Q: File attachments stopped working after a DSH upgrade?**
A: Expected. DSH re-packages `app.asar` on every upgrade, so the feature breaks. Re-run `apply-file-attachments.ps1` (back up `app.asar` before upgrading).

**Q: Can I use the official `asar extract→pack`?**
A: No. A naive `extract→pack` orphans the unpacked native modules (conpty / sharp / koffi) and prevents DSH from starting. Use the bundled **in-place repacker**.

**Q: Does it work with Web / CLI / source forms?**
A: No. It only targets the DSH Desktop client where the core is packed into a single `app.asar`.

**Q: Why does the agent read non-image files by path instead of sending them to the model?**
A: DeepSeek's official Files API only accepts images. Path-based consumption is the equivalent experience in an agent architecture.

**Q: node path not found?**
A: The script tries DSH's runtime and Codex runtime; if still missing, edit `$node` in `scripts/apply-file-attachments.ps1`.

---

## ⚠️ Risks & disclaimer

**This plugin works by directly modifying DSH Desktop's core files — it is unofficial.** Please understand this before use:

| Risk | Description |
| --- | --- |
| 🔄 **breaks on DSH upgrade** | Upgrading re-packages `app.asar`, so the feature stops working; re-run the script. |
| 💥 **corruption / won't start** | A bad repack or a patch that no longer matches the new core can prevent DSH from starting. The script always backs up `app.asar` → `app.asar.bak`. |
| 🧩 **core mismatch** | Patches target the core version they were written against; after an upgrade replacements may not match — regenerate for the new core. |
| 🔬 **unofficial** | This patches core files, not a supported plugin API; DSH makes no stability promise. |
| 💾 **local persistence** | Attachments are saved in plaintext to `~/.dsh/attachments/v1/files/`, and paths/blocks are persisted — mind privacy and disk usage. |
| 📎 **non-image read by agent** | Non-image documents are consumed by the agent by path; the `read_image` tool's own gate is unaffected. |
| 🧪 **Windows desktop only** | The current script targets Windows + the `app.asar` form. |

**To restore** (with DSH fully quit):

```powershell
Copy-Item "D:\DSH\DSH Desktop\resources\app.asar.bak" "D:\DSH\DSH Desktop\resources\app.asar" -Force
```

> If DSH won't start, restore the backup first; if there's no `.bak` on first run, re-download the client from the official site.

---

## 🗺️ Roadmap

- [ ] Auto-regenerate patches for the newest DSH core
- [ ] Bundle attachment bytes in session export
- [ ] Support more desktop platforms
- [ ] Native file-attachment support upstream (long term)

---

## 🤖 About vibecoding

This project was **built entirely by AI pair-programming (vibecoding)**: feature spec, implementation, debugging, the core `app.asar` repacker, and the docs were all produced by coding agents, with the author validating and releasing. PRs / issues welcome.

---

## 📣 Join the group / support the project

🐧 **QQ group: 332689798** (小鲸子TV) — scan the QR code to join, **report bugs**, and share your experience:

<p align="center">
  <img src="docs/qq-group.jpg" alt="QQ group QR code" width="300" />
</p>

⭐ If you find it useful, please give the project a **Star**! Your feedback helps make it better.

---

## 📄 License

[MIT](./LICENSE)
