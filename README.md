# dsh-periscope

[![DSh plugin](https://img.shields.io/badge/DSH-plugin-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
[![license](https://img.shields.io/github/license/lmh-2026/dsh-periscope.svg?style=flat-square)](./LICENSE)
[![version](https://img.shields.io/npm/v/dsh-periscope.svg?style=flat-square)](https://www.npmjs.com/package/dsh-periscope)
[![node](https://img.shields.io/badge/Node.js-%5E22.19%20%7C%20%3E%3D24-339933?style=flat-square&logo=nodedotjs)](./package.json)

> Like a periscope, dsh-periscope lets a **text-only** DeepSeek model "see" the
> imagery without ever switching models.

Keep `deepseek-v4-flash` / `deepseek-v4-pro` as the session default and
**automatically route every request that carries image content** to the
official vision-capable model **`deepseek-v4-flash-vision-exp`** on the same
provider. Text-only requests stay on the text model. No manual switching, no
third-party vision model, no OCR 鈥?the image is sent **raw** to DeepSeek's own
vision model.

## Why

Most DSH "vision" plugins bridge a **third-party** vision language model (GLM /
Qwen / Gemini / Zhipu 鈥? that *transcribes* the image to text, then hand the
description to DeepSeek. That needs an extra API key, adds a lossy
image鈫抰ext step, and often requires picking a different provider.

dsh-periscope takes the *transparent* route instead: it keeps your session on
a text model and swaps the **wire model** to `deepseek-v4-flash-vision-exp`
only for turns that actually contain images, using your existing
`deepseek-official` route and API key. The vision model sees the original
pixels.

## How it works

Two gates stand between pasting an image and it reaching a vision-capable
provider in a text-only session; this plugin clears both:

1. **Host image admission** 鈥?when you submit a message with an image, the
   host's `prompt` handler rejects it unless the session model declares image
   input (`MODEL_DOES_NOT_SUPPORT_IMAGES`). The plugin wraps
   `llm.resolveModelInfo` so every configured text model reports image input,
   letting the prompt (and its image) into the conversation.
2. **Stream routing** 鈥?every request funnels through
   `llm.streamWithRegistration`. The plugin wraps it: if messages contain an
   image block and the request is routed to one of the configured text models,
   it re-dispatches on the configured vision model, so the image blocks are
   actually sent (no `[image omitted because this model accepts text only]`
   projection, no `UNSUPPORTED_CONTENT` refusal).

```text
text-only session (flash/pro)
  鈹? attach an image
  鈻?host admission   鈹€鈹€ resolveModelInfo wrapped 鈫?image admitted
  鈻?llm.stream       鈹€鈹€ streamWithRegistration wrapped
  鈹?  messages contain an image?
  鈹?    鈹溾攢 no  鈫?pass through on deepseek-v4-flash / deepseek-v4-pro (zero-cost)
  鈹?    鈹斺攢 yes 鈫?re-dispatch on deepseek-v4-flash-vision-exp (official vision API)
  鈻?wire request     鈹€鈹€ same provider + API key, image sent raw
```

## Install

```powershell
# from npm
dsh plugin --profile web add dsh-periscope

# from a local tarball
dsh plugin --profile web add .\dsh-periscope-0.2.0.tgz
```

Then **restart the DSH app** (the bundle list is read at startup).

## Configuration

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
entry declares `image` input (the DeepSeek catalog already does).

## Notes

- The switch is per-request and content-driven: image turns run on the vision
  model (including the conversation history), text turns run on the text model.
- The request-header log and token metering still record the text model (the
  header is written before the stream starts); this is a known cosmetic
  inaccuracy.
- The `read_image` tool's own capability gate is not affected; it still uses
  the session route's declared input.

## License

[MIT](./LICENSE)
