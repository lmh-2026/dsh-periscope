# Changelog

All notable changes to this project are documented here. The format is based
on [Keep a Changelog](https://keepachangelog.com/), and this project adheres
to [Semantic Versioning](https://semver.org/).

## [0.3.0] — 2026-08-26

### 通用文件附件（generic file attachments）

DSH 原版对话只能拖入图片（PNG/JPG/WebP/GIF），拖入 Word/Excel/PDF/txt 等非图片文件会被当作图片拒绝。本版本为 DSH 增加**通用文件附件**能力：

- **拖入/粘贴任意文件** → 输入框出现带文件类型图标的附件卡片（彩色扩展名方块 + 文件名 + 大小，可删除）；
- **发送时文件随 prompt 上送**，host 校验并**落盘保存**到 `~/.dsh/attachments/v1/files/`（默认单文件 20 MiB、单条 20 个、单条合计 200 MiB）；
- 会话中持久化为 `{type:"file"}` 内容块，历史消息渲染附件卡片（悬停显示完整路径）；
- 模型请求时 file 块投影为 `[附件：名称（大小）\n完整路径：…]` 文本，**agent 用文件工具按路径读取**（DeepSeek 官方 [Files API 仅支持图片格式](https://api-docs.deepseek.com/zh-cn/guides/files_api/)，非图片文档无法直接发给模型）；
- 图片仍走原有视觉通道（缩略图 + vision 模型路由），互不影响。

该功能需要**改动 DSH 核心包**（wire 协议、附件存储、composer、适配器），无法在运行时由插件完成，因此随包携带：

- `patches/manifest.mjs` — 6 个核心文件全部改动的 old→new 清单；
- `scripts/patch-core.mjs` — `apply` / `revert` / `verify` / `diff`，幂等、带原始备份（`~/.dsh/.dsh-periscope-patch-backup/`）。

使用：

```bash
npm run patch:apply     # 或 node scripts/patch-core.mjs apply
npm run patch:verify    # 检查核心是否已补丁
npm run patch:revert    # 还原核心文件
npm run patch:diff      # 查看每处改动
```

**注意**：补丁针对当前 DSH 核心版本编写；核心升级后需重新 `apply`（脚本会报告版本不匹配的替换项）。这也解释了为何文件附件体验暂时无法做到与模型无关的纯插件化。

### 修复（与文件附件配套）

- 修复文件草稿发送/删除时 `Cannot read properties of undefined (reading 'startsWith')`（`revokePreview` 对无 `previewUrl` 的草稿崩溃）；
- 客户端侧增加单文件 20 MiB 上限提示，避免超大文件先整读入内存。

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
