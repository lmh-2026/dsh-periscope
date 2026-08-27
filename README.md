[**简体中文**](./README.md) | [English](./README.en.md)

# 🔭 dsh-periscope

> 一个为 **[DSH Desktop 桌面端](https://www.dshdesktop.cn/)** 打造的插件，让纯文本模型无需切换就能「看」图，并把 **任意文件**（Word / Excel / PDF / txt / zip…）拖进对话作为附件交给 agent 读取。本项目**完全由 AI 结对编程（vibecoding）编写**。

![文件附件卡片展示](docs/attachment-cards.png)

---

## ⚠️ 适配范围（重要）

dsh-periscope **只适配 [DSH Desktop 桌面客户端](https://www.dshdesktop.cn/)**，且只适配打包为单个 `app.asar` 的发行形态。

- ❌ **不适用于** DSH 的 Web / CLI / 源码运行形态——那些形态下核心以松散文件加载，本插件的历史补丁方式与桌面端打包形态不通用。
- ⚠️ **DSH 客户端升级可能影响本插件**：每次 DSH 更新都会重新打包 `app.asar`，因此**升级后文件附件功能很可能失效**，需要按下方「使用方法」重新执行一次 `apply-file-attachments.ps1` 重打包。

---

## ✨ 它做了什么

1. **视觉路由（periscope）** — 会话默认停留在 `deepseek-v4-flash` / `deepseek-v4-pro`，所有**含图请求自动路由**到官方视觉模型 `deepseek-v4-flash-vision-exp`（同一 provider）。纯文字请求零开销走文本模型，无需手动切换、无第三方视觉模型、无 OCR，图片**原样**发给 DeepSeek 官方视觉 API。
2. **通用文件附件** — 原版 DSH 只能拖入光栅图片（PNG/JPG/WebP/GIF），拖入非图片文件会被当作图片拒绝。本插件让 DSH 支持**任意文件附件**：拖入/粘贴非图片文件即出现**附件卡片**（文件类型图标 + 文件名 + 大小），发送后文件**落盘保存**，会话持久化为附件块，agent 用文件工具**按路径读取**。

![附件卡片类型图标](docs/attachment-cards.png)

---

## 🧰 工作原理

文件附件功能的实现位置（wire 协议、附件存储、composer、模型适配器）是 DSH **核心包**，而核心的 `session.prompt` wire 校验 schema 是 `dsh-host-apiproxy` 模块内部常量，第三方插件在运行时**无法扩展**。因此本插件随包携带对 DSH 桌面端核心的**补丁**（见下）。

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

**为什么不把文件直接发给模型？** DeepSeek 官方 [Files API 仅支持 JPEG/PNG/GIF/WebP 图片](https://api-docs.deepseek.com/zh-cn/guides/files_api/)，非图片文档无法直接送入模型。路径式消费是 agent 架构下的等价体验（Codex 同款做法）：文件真实落盘，agent 用 `read`/`bash`/`pwsh` 等工具读取（docx/xlsx/pdf 等二进制格式 agent 会自行解析）。

**默认限制**（可通过 `dsh-attachment-local` 配置调整）：单文件 20 MiB、单条消息 20 个文件、单条合计 200 MiB；客户端与 host 双重校验。

---

## 📦 使用方法

> 本方式针对 **DSH Desktop 桌面端（`app.asar` 打包形态）**。请在 **Windows** 上操作，且**每次 DSH 升级后都需要重做一次**。

### 1. 完全退出 DSH Desktop

关闭所有 DSH 窗口，并**右键系统托盘图标 → 退出**（确保进程全部结束）。脚本会自己检查，没关会中止。

### 2. 运行一键重打包脚本

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
cd C:\Users\hndsj\Desktop\dsh-periscope-repack   # 或你 clone/解压本仓库的目录
.\apply-file-attachments.ps1
```

脚本会依次：检查 DSH 已退出 → 选 node → 校验补丁文件 → **备份 `app.asar` → 原位打入 6 个补丁核心文件**（保留原生模块）→ 用官方 asar 校验。

期望看到：`重打包完成: ... 打进补丁文件: 6 / 6`，最后 `✅ 完成！`。

### 3. 重新打开 DSH

重新启动 DSH，即可拖入/粘贴任意文件测试。

> node 路径不一定适用于所有环境；脚本已内置 DSH runtime 与 Codex runtime 两个候选，找不到时请改 `scripts/apply-file-attachments.ps1` 里的 `$node`。

---

## 🛠️ 核心补丁（patches / scripts）

本插件改动 DSH 的 6 个核心包。仓库同时随包携带**补丁清单**与**原位重打包器**：

| 文件 | 说明 |
| --- | --- |
| `patches/manifest.mjs` | 6 个核心文件的 old→new 替换清单（约 30 处，供审查/演进用） |
| `patches/asar-patched/` | 已打好补丁的 6 个核心文件（重打包时直接打进 `app.asar`） |
| `scripts/repack-inplace.mjs` | 原位重打包：只替换这 6 个文件，完整保留其余文件字节与原生模块结构 |
| `scripts/apply-file-attachments.ps1` | 一键入口：退出检测 → 备份 → 重打包 → 校验 |
| `scripts/patch-core.mjs` | apply / revert / verify / diff 安装器（面向松散核心的历史方式，见下） |

涉及的 6 个核心包：`@deepseek-ai/dsh-attachment`、`dsh-attachment-local`、`dsh-host-apiproxy`、`dsh-llm-deepseek`、`dsh-client-ui-conversation`、`dsh-client-ui-attachment`。

> 面向**松散核心**的安装器 `scripts/patch-core.mjs apply` 仍在仓库中（适用于非打包形态），但**桌面端 `app.asar` 形态请用上面的原位重打包**——naive 的 `asar extract→pack` 会孤立 unpacked 原生模块，导致 DSH 无法启动。

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

## ⚠️ 潜在风险与注意事项

请在使用前充分了解：**本插件通过直接修改 DSH 桌面端的核心文件来工作，属于非官方行为。**

| 风险 | 说明 |
| --- | --- |
| 🔄 **DSH 升级会失效** | DSH 更新会重新打包 `app.asar`，文件附件功能随之失效；需重新执行一次 `apply-file-attachments.ps1`。升级前记得先备份 `app.asar`。 |
| 💥 **损坏与不可启动** | 若重打包有误或补丁与新版核心不匹配，DSH 可能无法启动。**脚本每次都会先备份 `app.asar` → `app.asar.bak`**；出问题按下方还原即可。 |
| 🧩 **内核不匹配** | 补丁针对编写时的 DSH 核心版本；核心升级后替换项可能对不上，属正常，需按新版核心重新生成补丁。 |
| 🔬 **非官方行为** | 修改的是 DSH 核心文件而非插件 API。DSH 官方不承诺稳定；长期看更希望 DSH 上游原生支持文件附件。 |
| 💾 **本地文件落盘** | 附件会以明文保存到 `~/.dsh/attachments/v1/files/`，文件路径与会话块会持久化；注意隐私与磁盘占用。 |
| 📎 **非图片需 agent 读取** | 非图片文件由 agent 按路径读取（DeepSeek API 不支持非图片格式）；`read_image` 工具自身的准入不受影响。 |
| 🧪 **仅 Windows 桌面端** | 当前重打包脚本面向 Windows + `app.asar` 形态；其他平台/形态不适用。 |

**还原方法**（DSH 完全退出后运行）：

```powershell
Copy-Item "D:\DSH\DSH Desktop\resources\app.asar.bak" "D:\DSH\DSH Desktop\resources\app.asar" -Force
```

> 若 DSH 已无法启动，先还原备份（上一步），如首次运行无 `.bak` 可直接在 DSH 官网重新下载覆盖安装。

---

## 📝 已知边界

- **视觉路由**：切换按请求、按内容发生：含图轮次跑 vision 模型（含历史），文字轮次跑文本模型；请求头日志与 token 计量仍记录文本模型（头在流开始前写入），属已知外观性偏差。不影响 `read_image` 工具自身的准入检查。
- **文件附件**：非图片文件由 agent 按路径读取；会话导出暂不打包文件字节；核心升级后需重跑 `apply-file-attachments.ps1`。

---

## 🤖 关于 vibecoding

本项目**全程由 AI 结对编程（vibecoding）完成**：需求描述、实现、调试、核心 `app.asar` 重打包器、文档均由 AI 编码代理协作产出，作者负责验证与发布。欢迎 PR / Issue。

---

## 📄 许可证

[MIT](./LICENSE)
