# Changelog

All notable changes to this project are documented here. The format is based
on [Keep a Changelog](https://keepachangelog.com/), and this project adheres
to [Semantic Versioning](https://semver.org/).

## [0.3.5] — 2026-08-27

### 文档
- README（中/英）新增「开关说明：两种功能、两套机制」，澄清视觉路由走插件系统（受滑块开关控制）、文件附件走 `app.asar` 核心补丁（不受开关控制、需 `install.ps1`）。README 同步到 npm 包。

## [0.3.4] — 2026-08-27

### 新增：一键安装
- 仓库根目录新增 **`install.ps1`**：退出检测 → 备份 `app.asar` → 以精确版本安装/更新 `dsh-periscope` bundle（修正依赖 `^0.2.0` → `^0.3.4`，让 DSH 插件列表正确显示版本）→ 用已安装包内的 `scripts/repack-inplace.mjs` 对 `app.asar` 做原位重打包 → 校验 + 提示重启。
- 新增 **npm bin `dsh-periscope-install`**（`bin/install.mjs`），`npx dsh-periscope-install` 即可一键安装。
- 支持 `-Version` / `-Profile` / `-FromLocal` 参数。
- 新增 `.gitattributes` 保持文本行尾稳定；两个 PowerShell 脚本统一为 UTF-8 带 BOM（Windows PowerShell 5.1 需 BOM 才能解析中文）。
- README（中/英）「快速开始」改为「一键安装」，并解释「插件列表显示本地版本、`^0.2.0` 导致停在 0.2.0、需精确版本安装」的原因。
- README（中/英）新增「开关说明：两种功能、两套机制」：澄清视觉路由走插件系统（受滑块开关控制）、文件附件走 `app.asar` 核心补丁（不受开关控制、需 `install.ps1`）。

## [0.3.3] — 2026-08-27

### 重要改变
- 适配重新打包的 **DSH Desktop `app.asar`** 发行形态：核心改为 `app.asar` 单文件打包，历史的对松散核心的 `patch:apply` 方式不再适用；新增**原位重打包器** `scripts/repack-inplace.mjs` 与一键入口 `scripts/apply-file-attachments.ps1`，只替换 6 个补丁核心文件、完整保留原生模块结构。
- 补充**适配范围**说明：只适配 [DSH Desktop 桌面端](https://www.dshdesktop.cn/)，不适用于 Web / CLI / 源码形态。
- 补充 **DSH 升级影响** 警示：每次升级会重新打包 `app.asar`，需重跑 `apply-file-attachments.ps1`。
- 补充**风险与使用方法**章节，并加入附件卡片展示图 `docs/attachment-cards.png`。
- 声明项目**全程 vibecoding**（AI 结对编程）完成。
- 新增 `patches/asar-patched/`（已打补丁的 6 个核心文件）与 `scripts/vendor/asar/pickle.js`（打包工具的 asar Pickle 依赖）。

### 修复
- 重写 CHANGELOG，修正旧条目（0.3.1 / 0.3.0）曾存在的乱码。

## [0.3.2] — 2026-08-26

### 美化
- 文件附件改为 **Codex 式自然卡片**：小巧圆角 App 图标（品牌字母 + 高光）+ 文件名 + 类型/大小两行小字 + 常显删除按钮，去掉原来的厚重外框。

## [0.3.1] — 2026-08-26

### 美化
- 文件附件图标升级为 **文档纸张 + 品牌徽标** 风格（白色文档页 + 折角 + 彩色品牌字母，如 Word 蓝色 W、Excel 绿色 X、PDF 红色 P），替代原来的扁平色块文字。

## [0.3.0] — 2026-08-26

### 新增
- **通用文件附件**：DSH 默认只能拖入光栅图片（PNG/JPG/WebP/GIF），拖入非图片文件会被当作图片拒绝。本插件新增任意文件附件能力：
  - **拖入/粘贴**任意文件（Word/Excel/PDF/txt/zip…）→ **附件卡片**（类型图标 + 文件名 + 大小，可删除）；
  - 发送后 **host 校验并落盘** 到 `~/.dsh/attachments/v1/files/`；
  - 会话持久化为 `{type:"file"}` 内容块，历史记录渲染附件卡片，agent 按完整路径读取；
  - 默认限制：单文件 20 MiB、单条 20 个文件、单条合计 200 MiB（客户端与 host 双重校验）；
  - DeepSeek 官方 [Files API 仅支持图片](https://api-docs.deepseek.com/zh-cn/guides/files_api/)，非图片文档由 agent 按路径读取（Codex 同款路径式消费）。

### 工程
- 由于核心 `session.prompt` wire 校验 schema 位于 `dsh-host-apiproxy` 内部、第三方插件运行时无法扩展，本插件随包携带**核心补丁与安装器**：
  - `patches/manifest.mjs` — 6 个核心文件的 old→new 替换清单（约 30 处）；
  - `scripts/patch-core.mjs` — `apply` / `revert` / `verify` / `diff` 安装器（幂等、自动备份到 `~/.dsh/.dsh-periscope-patch-backup/`）；
- 支持 `--dsh-home <dir>` / `--core-root <dir>` 指定安装位置。

## [0.2.0] — 2026-08-22

- Renamed the plugin to **dsh-periscope** (cordis id `periscope`).
- Support **multiple text models**: `textModels` now defaults to
  `["deepseek-v4-flash", "deepseek-v4-pro"]`, so image-bearing requests are
  auto-routed to `deepseek-v4-flash-vision-exp` whether the session runs on
  flash or pro.
- Same core mechanism: wraps `llm.resolveModelInfo` (host image-admission
  bypass) and `llm.streamWithRegistration` (per-request vision routing).

## [0.1.1] — 2026-08-22

- Added the host api-proxy image-admission bypass by also wrapping
  `llm.resolveModelInfo`; previously images under a text-only session were
  rejected before reaching the stream (the plugin alone did not fix
  `MODEL_DOES_NOT_SUPPORT_IMAGES`).

## [0.1.0] — 2026-08-22

- Initial release: auto-routes image-bearing requests to a vision-capable
  model on the same provider by wrapping `llm.streamWithRegistration`.
- Configurable `provider`, `textModel`, `visionModel`.
