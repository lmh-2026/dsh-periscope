[**English**](./README.md) | 简体中文

# 🔭 dsh-periscope

[![DSH 插件](https://img.shields.io/badge/DSH-插件-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
[![license](https://img.shields.io/github/license/lmh-2026/dsh-periscope.svg?style=flat-square)](./LICENSE)
[![version](https://img.shields.io/npm/v/dsh-periscope.svg?style=flat-square)](https://www.npmjs.com/package/dsh-periscope)

> 🎯 如潜望镜一般——**纯文本**的 DeepSeek 模型无需切换，就能"看"到图片。

📎 让会话默认停留在 `deepseek-v4-flash` / `deepseek-v4-pro`，**把所有含图请求自动路由**到官方视觉模型 **`deepseek-v4-flash-vision-exp`**（同一 provider）。纯文字请求原路走文本模型——无需手动切换、无第三方视觉模型、无 OCR，图片**原样**发给 DeepSeek 官方视觉 API。✨

## 🤔 为什么需要它

大多数 DSH 视觉插件是"**转文字桥**"：接一个**第三方**视觉模型（GLM / Qwen / Gemini / 智谱…）先把图*转述成文字*，再把描述交给 DeepSeek。要多一把第三方 key、多了层有损的图→文转换，且常要切换 provider。😮‍💨

dsh-periscope 走**透明**路线：会话保持在文本模型上，只在**真正含图的那一轮**把*发出用*的模型换成 `deepseek-v4-flash-vision-exp`，复用你已有的 `deepseek-official` 路由与 key。视觉模型看到的是原始像素。🔍

## ⚙️ 工作原理

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

## 📦 安装

```powershell
# 从 npm
dsh plugin --profile web add dsh-periscope

# 从本地 tarball
dsh plugin --profile web add .\dsh-periscope-0.2.0.tgz
```

装完**重启 DSH 应用**（bundle 列表在启动时读取）。🔄

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

## 📎 通用文件附件（0.3.0+）

原版 DSH 对话只能拖入光栅图片（PNG/JPG/WebP/GIF），拖入 Word/Excel/PDF/txt 等非图片文件会被当作图片拒绝（弹"仅支持 PNG、JPG、WebP、GIF 格式的图片"）。从 0.3.0 起，dsh-periscope 随包提供**通用文件附件**能力：

- **拖入/粘贴任意文件** → 输入框上方出现文件附件卡片（彩色扩展名方块 + 文件名 + 大小，可删除）；
- **发送时文件字节随 prompt 上送**，host 校验并**落盘保存**到 `~/.dsh/attachments/v1/files/`（默认限制：单文件 20 MiB、单条 20 个、单条合计 200 MiB）；
- 会话持久化为 `{type:"file"}` 内容块，历史消息渲染附件卡片（悬停显示完整路径）；
- 模型请求时 file 块投影为 `[附件：名称（大小）\n完整路径：…]` 文本，**agent 用文件工具按路径读取**。DeepSeek 官方 [Files API 只支持图片格式](https://api-docs.deepseek.com/zh-cn/guides/files_api/)，非图片文档无法直接发给模型，路径式消费是等价体验（Codex 同款做法）。图片仍走原有缩略图 + 视觉模型通道，互不影响。

该功能需要改动 DSH **核心包**（wire 协议、附件存储、composer、适配器），运行时无法由插件完成，因此随包携带核心补丁与安装器：

- `patches/manifest.mjs` — 6 个受影响核心文件的 old→new 替换清单；
- `scripts/patch-core.mjs` — `apply` / `revert` / `verify` / `diff`（幂等；原始文件备份在 `~/.dsh/.dsh-periscope-patch-backup/`）。

```bash
npm run patch:apply     # 或 node scripts/patch-core.mjs apply
npm run patch:verify    # 确认核心已补丁
npm run patch:revert    # 还原核心文件
npm run patch:diff      # 查看每处改动
```

> ⚠️ 补丁针对编写时的 DSH 核心版本；核心升级后需重新 `apply`（版本不匹配的替换项脚本会明确报错，不会乱改）。

## 📝 已知边界

- 切换是按请求、按内容发生的：含图轮次跑 vision 模型（含历史），文字轮次跑文本模型。
- 请求头日志与 token 计量仍记录文本模型（头在流开始前就已写入）；属已知的外观性偏差。
- 不影响 `read_image` 工具自身的准入检查。

## 📄 许可证

[MIT](./LICENSE)
