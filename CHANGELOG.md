# Changelog

All notable changes to this project are documented here. The format is based
on [Keep a Changelog](https://keepachangelog.com/), and this project adheres
to [Semantic Versioning](https://semver.org/).

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
