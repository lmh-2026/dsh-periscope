[**简体中文**](./README.md) | [English](./README.en.md)

# 🔭 dsh-periscope

[![DSH 插件](https://img.shields.io/badge/DSH-插件-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
[![license](https://img.shields.io/github/license/lmh-2026/dsh-periscope.svg?style=flat-square)](./LICENSE)
[![version](https://img.shields.io/npm/v/dsh-periscope.svg?style=flat-square)](https://www.npmjs.com/package/dsh-periscope)
[![node](https://img.shields.io/badge/Node.js-%5E22.19%20%7C%20%3E%3D24-339933?style=flat-square&logo=nodedotjs)](./package.json)

> 🎯 如潜望镜一般——**纯文本**的 DeepSeek 模型无需切换，就能"看"到图片；还能把 **Word / Excel / PDF / txt 等任意文件**拖进对话，作为附件交给 agent 按路径读取。

dsh-periscope 做两件事：

1. **视觉路由（periscope）**：会话默认停留在 `deepseek-v4-flash` / `deepseek-v4-pro`，所有**含图请求自动路由**到官方视觉模型 **`deepseek-v4-flash-vision-exp`**（同一 provider）。纯文字请求原路走文本模型——无需手动切换、无第三方视觉模型、无 OCR，图片**原样**发给 DeepSeek 官方视觉 API。
2. **通用文件附件（0.3.0+）**：原版 DSH 对话只能拖入光栅图片（PNG/JPG/WebP/GIF），拖入非图片文件会被当作图片拒绝。本插件为 DSH 补上**任意文件附件**能力：拖入/粘贴即出现附件卡片（文件类型图标 + 文件名 + 大小），发送后文件**落盘保存**，会话持久化为附件块，agent 用文件工具**按路径读取**。

---

## ✨ 特性

| 能力 | 说明 |
| --- | --- |
| 🔀 视觉自动路由 | 含图请求自动改派 `deepseek-v4-flash-vision-exp`，文字请求零开销走文本模型 |
| 📎 通用文件附件 | 拖入/粘贴任意文件（docx/xlsx/pdf/txt/zip…）→ 附件卡片 → 落盘 → agent 按路径读取 |
| 🗂️ 文件类型图标 | 附件卡片按扩展名显示彩色类型方块（DOCX/PDF/XLSX/MD/ZIP…） |
| 💾 持久化落盘 | 文件保存到 `~/.dsh/attachments/v1/files/`，会话历史保留附件块与完整路径 |
| 🛠️ 一键补丁 | `patch:apply` / `patch:revert` / `patch:verify` / `patch:diff`，幂等、带原始备份 |
| 🛡️ 崩溃修复 | 修复文件草稿发送/删除时 `Cannot read properties of undefined (reading 'startsWith')` |

---

## ⚙️ 工作原理

### 1. 视觉路由

在纯文本会话里贴图要过两道关卡，本插件把两道都打通：

1. **🚪 Host 图片准入** —— 提交带图消息时，host 的 `prompt` 处理器会查会话模型是否声明 image 输入（否则 `MODEL_DOES_NOT_SUPPORT_IMAGES` 拒绝）。插件包装 `llm.resolveModelInfo`，让每个配置的文本模型都报告支持 image，图片因此进入会话。
2. **🔀 流式路由** —— 所有请求都经过 `llm.streamWithRegistration`。插件包装它：若消息含图片块且请求路由到配置的文本模型，就改派到配置的视觉模型，使图片块真正被发送（不再出现 `[image omitted because this model accepts text only]` 占位、也不会 `UNSUPPORTED_CONTENT` 报错）。

```text
纯文本会话 (flash/pro)
  │  贴图 📷
  ▼
host 准入   ── resolveModelInfo 包装 → 图片放行 ✅
  ▼
llm.stream  ── streamWithRegistration 包装
  │   消息含图？
  │     ├─ 否 → 原样走 deepseek-v4-flash / deepseek-v4-pro（零开销）⚡
  │     └─ 是 → 改派 deepseek-v4-flash-vision-exp（官方视觉 API）🎯
  ▼
发出请求    ── 同一 provider + key，图片原样发送 📤
```

### 2. 通用文件附件

文件附件涉及 DSH **核心包**（wire 协议、附件存储、composer、模型适配器），而核心的 `session.prompt` wire 校验 schema 是 `dsh-host-apiproxy` 模块内部常量，第三方插件在运行时**无法扩展**，因此本插件随包携带**核心补丁与安装器**（见下方「核心补丁」）。

数据流：

```text
拖入/粘贴任意文件 📎
  ▼
composer 附件卡片（彩色类型图标 + 文件名 + 大小，可删除）
  ▼
发送 ── 文件字节(base64) 作为 {type:"file"} 部件随 prompt 上送
  ▼
host 校验并落盘 ── ~/.dsh/attachments/v1/files/<sha256>-<文件名>
  ▼
会话持久化 ── {type:"file", file:{name, size, path, …}} 内容块（历史渲染附件卡片）
  ▼
模型请求 ── file 块投影为文本：
  [附件：名称（大小）\n完整路径：<绝对路径>\n请读取该文件内容后继续。]
  ▼
agent 用文件工具按路径读取并处理 🔧
```

**为什么不是把文件直接发给模型？** DeepSeek 官方 [Files API 仅支持 JPEG/PNG/GIF/WebP 图片](https://api-docs.deepseek.com/zh-cn/guides/files_api/)，非图片文档无法直接送入模型。路径式消费是 agent 架构下的等价体验（Codex 同款做法）：文件真实落盘，agent 用 `read`/`bash`/`pwsh` 等工具读取（docx/xlsx/pdf 等二进制格式 agent 会自行解包解析）。

**默认限制**（可通过 `dsh-attachment-local` 配置调整）：单文件 20 MiB、单条消息 20 个文件、单条合计 200 MiB；客户端与 host 双重校验。

---

## 📦 安装

### 1. 安装插件

```powershell
# 从 npm
dsh plugin --profile web add dsh-periscope

# 从本地 tarball
dsh plugin --profile web add .\dsh-periscope-0.3.0.tgz
```

### 2. 应用核心补丁（启用文件附件）

```bash
npm run patch:apply     # 或：node scripts/patch-core.mjs apply
npm run patch:verify    # 确认核心文件已补丁
```

### 3. 重启 DSH 应用

装完插件并打完补丁后**重启 DSH**（bundle 列表与 host 端代码在启动时读取）。🔄

---

## 🛠️ 核心补丁（patches / scripts）

文件附件功能需要改动 6 个 DSH 核心包，本插件把它们以 **old→new 替换清单**的形式随包携带：

| 文件 | 改动 |
| --- | --- |
| `patches/manifest.mjs` | 6 个核心文件的全部替换清单（约 30 处） |
| `scripts/patch-core.mjs` | apply / revert / verify / diff 安装器（幂等、带备份） |

| 命令 | 作用 |
| --- | --- |
| `node scripts/patch-core.mjs apply` | 应用全部补丁（已补丁则跳过，幂等） |
| `node scripts/patch-core.mjs verify` | 逐文件报告补丁状态 |
| `node scripts/patch-core.mjs revert` | 从备份还原原始核心文件 |
| `node scripts/patch-core.mjs diff` | 打印每处改动的行数摘要（供审查） |

- 原始文件备份在 `~/.dsh/.dsh-periscope-patch-backup/`（由 manifest 反向重建，未补丁/已补丁环境都能生成）。
- 支持 `--dsh-home <dir>` / `--core-root <dir>` 指定安装位置。
- ⚠️ **补丁针对编写时的 DSH 核心版本**；核心升级后需重新 `apply`，版本不匹配的替换项脚本会明确报错，不会乱改。

涉及的 6 个核心包：`@deepseek-ai/dsh-attachment`、`dsh-attachment-local`、`dsh-host-apiproxy`、`dsh-llm-deepseek`、`dsh-client-ui-conversation`、`dsh-client-ui-attachment`。

---

## 🛠️ 配置

官方 DeepSeek 无需任何设置即开箱即用：

| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `provider` | `deepseek-official` | 承载模型的路由 provider |
| `textModels` | `["deepseek-v4-flash", "deepseek-v4-pro"]` | 含图请求会被路由到视觉模型的文本模型 |
| `visionModel` | `deepseek-v4-flash-vision-exp` | 含图请求使用的视觉模型 |

在 profile 的 `cordis.patch.yml`（用户层会整体替换该行配置）覆盖：

```yaml
- id: periscope
  config:
    provider: deepseek-official
    textModels: [deepseek-v4-flash, deepseek-v4-pro]
    visionModel: deepseek-v4-flash-vision-exp
```

该 provider 的模型目录需同时包含这些文本模型与一个声明了 image 输入的视觉模型（DeepSeek 目录已满足）。✅

---

## 📝 已知边界

- **视觉路由**：切换是按请求、按内容发生的：含图轮次跑 vision 模型（含历史），文字轮次跑文本模型；请求头日志与 token 计量仍记录文本模型（头在流开始前就已写入），属已知的外观性偏差；不影响 `read_image` 工具自身的准入检查。
- **文件附件**：非图片文件由 agent 按路径读取（DeepSeek API 不支持非图片格式）；会话导出暂不打包文件字节；核心升级后需重跑 `patch:apply`。
- 补丁针对 DSH 核心版本编写，属"随插件分发核心改动"的工程妥协；长期建议推动 DSH 上游原生支持文件附件。

---

## 📄 许可证

[MIT](./LICENSE)
