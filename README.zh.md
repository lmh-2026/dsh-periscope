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

## 📝 已知边界

- 切换是按请求、按内容发生的：含图轮次跑 vision 模型（含历史），文字轮次跑文本模型。
- 请求头日志与 token 计量仍记录文本模型（头在流开始前就已写入）；属已知的外观性偏差。
- 不影响 `read_image` 工具自身的准入检查。

## 📄 许可证

[MIT](./LICENSE)
