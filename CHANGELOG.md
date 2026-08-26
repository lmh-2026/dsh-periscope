## [0.3.1] — 2026-08-26

### 美化
- 文件附件图标升级为**文档纸张 + 品牌徽标**风格（白色文档页 + 折角 + 彩色品牌字母，如 Word 蓝色 W、Excel 绿色 X、PDF 红色 P），替代原来的扁平色块文字。
# Changelog

All notable changes to this project are documented here. The format is based
on [Keep a Changelog](https://keepachangelog.com/), and this project adheres
to [Semantic Versioning](https://semver.org/).

## [0.3.0] 鈥?2026-08-26

### 閫氱敤鏂囦欢闄勪欢锛坓eneric file attachments锛?
DSH 鍘熺増瀵硅瘽鍙兘鎷栧叆鍥剧墖锛圥NG/JPG/WebP/GIF锛夛紝鎷栧叆 Word/Excel/PDF/txt 绛夐潪鍥剧墖鏂囦欢浼氳褰撲綔鍥剧墖鎷掔粷銆傛湰鐗堟湰涓?DSH 澧炲姞**閫氱敤鏂囦欢闄勪欢**鑳藉姏锛?
- **鎷栧叆/绮樿创浠绘剰鏂囦欢** 鈫?杈撳叆妗嗗嚭鐜板甫鏂囦欢绫诲瀷鍥炬爣鐨勯檮浠跺崱鐗囷紙褰╄壊鎵╁睍鍚嶆柟鍧?+ 鏂囦欢鍚?+ 澶у皬锛屽彲鍒犻櫎锛夛紱
- **鍙戦€佹椂鏂囦欢闅?prompt 涓婇€?*锛宧ost 鏍￠獙骞?*钀界洏淇濆瓨**鍒?`~/.dsh/attachments/v1/files/`锛堥粯璁ゅ崟鏂囦欢 20 MiB銆佸崟鏉?20 涓€佸崟鏉″悎璁?200 MiB锛夛紱
- 浼氳瘽涓寔涔呭寲涓?`{type:"file"}` 鍐呭鍧楋紝鍘嗗彶娑堟伅娓叉煋闄勪欢鍗＄墖锛堟偓鍋滄樉绀哄畬鏁磋矾寰勶級锛?- 妯″瀷璇锋眰鏃?file 鍧楁姇褰变负 `[闄勪欢锛氬悕绉帮紙澶у皬锛塡n瀹屾暣璺緞锛氣€` 鏂囨湰锛?*agent 鐢ㄦ枃浠跺伐鍏锋寜璺緞璇诲彇**锛圖eepSeek 瀹樻柟 [Files API 浠呮敮鎸佸浘鐗囨牸寮廬(https://api-docs.deepseek.com/zh-cn/guides/files_api/)锛岄潪鍥剧墖鏂囨。鏃犳硶鐩存帴鍙戠粰妯″瀷锛夛紱
- 鍥剧墖浠嶈蛋鍘熸湁瑙嗚閫氶亾锛堢缉鐣ュ浘 + vision 妯″瀷璺敱锛夛紝浜掍笉褰卞搷銆?
璇ュ姛鑳介渶瑕?*鏀瑰姩 DSH 鏍稿績鍖?*锛坵ire 鍗忚銆侀檮浠跺瓨鍌ㄣ€乧omposer銆侀€傞厤鍣級锛屾棤娉曞湪杩愯鏃剁敱鎻掍欢瀹屾垚锛屽洜姝ら殢鍖呮惡甯︼細

- `patches/manifest.mjs` 鈥?6 涓牳蹇冩枃浠跺叏閮ㄦ敼鍔ㄧ殑 old鈫抧ew 娓呭崟锛?- `scripts/patch-core.mjs` 鈥?`apply` / `revert` / `verify` / `diff`锛屽箓绛夈€佸甫鍘熷澶囦唤锛坄~/.dsh/.dsh-periscope-patch-backup/`锛夈€?
浣跨敤锛?
```bash
npm run patch:apply     # 鎴?node scripts/patch-core.mjs apply
npm run patch:verify    # 妫€鏌ユ牳蹇冩槸鍚﹀凡琛ヤ竵
npm run patch:revert    # 杩樺師鏍稿績鏂囦欢
npm run patch:diff      # 鏌ョ湅姣忓鏀瑰姩
```

**娉ㄦ剰**锛氳ˉ涓侀拡瀵瑰綋鍓?DSH 鏍稿績鐗堟湰缂栧啓锛涙牳蹇冨崌绾у悗闇€閲嶆柊 `apply`锛堣剼鏈細鎶ュ憡鐗堟湰涓嶅尮閰嶇殑鏇挎崲椤癸級銆傝繖涔熻В閲婁簡涓轰綍鏂囦欢闄勪欢浣撻獙鏆傛椂鏃犳硶鍋氬埌涓庢ā鍨嬫棤鍏崇殑绾彃浠跺寲銆?
### 淇锛堜笌鏂囦欢闄勪欢閰嶅锛?
- 淇鏂囦欢鑽夌鍙戦€?鍒犻櫎鏃?`Cannot read properties of undefined (reading 'startsWith')`锛坄revokePreview` 瀵规棤 `previewUrl` 鐨勮崏绋垮穿婧冿級锛?- 瀹㈡埛绔晶澧炲姞鍗曟枃浠?20 MiB 涓婇檺鎻愮ず锛岄伩鍏嶈秴澶ф枃浠跺厛鏁磋鍏ュ唴瀛樸€?
## [0.2.0] 鈥?2026-08-22

- Renamed the plugin to **dsh-periscope** (cordis id `periscope`).
- Support **multiple text models**: `textModels` now defaults to
  `["deepseek-v4-flash", "deepseek-v4-pro"]`, so image-bearing requests are
  auto-routed to `deepseek-v4-flash-vision-exp` whether the session runs on
  flash or pro.
- Same core mechanism: wraps `llm.resolveModelInfo` (host image-admission
  bypass) and `llm.streamWithRegistration` (per-request vision routing).

## [0.1.1] 鈥?2026-08-22

- Added the host api-proxy image-admission bypass by also wrapping
  `llm.resolveModelInfo`; previously images under a text-only session were
  rejected before reaching the stream (the plugin alone did not fix
  `MODEL_DOES_NOT_SUPPORT_IMAGES`).

## [0.1.0] 鈥?2026-08-22

- Initial release: auto-routes image-bearing requests to a vision-capable
  model on the same provider by wrapping `llm.streamWithRegistration`.
- Configurable `provider`, `textModel`, `visionModel`.
