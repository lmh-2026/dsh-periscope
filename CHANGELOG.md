## [0.3.2] — 2026-08-26

### 美化
- 文件附件改为 **Codex 式自然卡片**：小巧圆角 App 图标（品牌字母 + 高光）+ 文件名 + 类型/大小两行小字 + 常显删除按钮，去掉原来的厚重外框。
## [0.3.1] 鈥?2026-08-26

### 缇庡寲
- 鏂囦欢闄勪欢鍥炬爣鍗囩骇涓?*鏂囨。绾稿紶 + 鍝佺墝寰芥爣**椋庢牸锛堢櫧鑹叉枃妗ｉ〉 + 鎶樿 + 褰╄壊鍝佺墝瀛楁瘝锛屽 Word 钃濊壊 W銆丒xcel 缁胯壊 X銆丳DF 绾㈣壊 P锛夛紝鏇夸唬鍘熸潵鐨勬墎骞宠壊鍧楁枃瀛椼€?# Changelog

All notable changes to this project are documented here. The format is based
on [Keep a Changelog](https://keepachangelog.com/), and this project adheres
to [Semantic Versioning](https://semver.org/).

## [0.3.0] 閳?2026-08-26

### 闁氨鏁ら弬鍥︽闂勫嫪娆㈤敍鍧揺neric file attachments閿?
DSH 閸樼喓澧楃€电鐦介崣顏囧厴閹锋牕鍙嗛崶鍓у閿涘湧NG/JPG/WebP/GIF閿涘绱濋幏鏍у弳 Word/Excel/PDF/txt 缁涘娼崶鍓у閺傚洣娆㈡导姘愁潶瑜版挷缍旈崶鍓у閹锋帞绮烽妴鍌涙拱閻楀牊婀版稉?DSH 婢х偛濮?*闁氨鏁ら弬鍥︽闂勫嫪娆?*閼宠棄濮忛敍?
- **閹锋牕鍙?缁鍒涙禒缁樺壈閺傚洣娆?* 閳?鏉堟挸鍙嗗鍡楀毉閻滄澘鐢弬鍥︽缁鐎烽崶鐐垼閻ㄥ嫰妾禒璺哄幢閻楀浄绱欒ぐ鈺勫閹碘晛鐫嶉崥宥嗘煙閸?+ 閺傚洣娆㈤崥?+ 婢堆冪毈閿涘苯褰查崚鐘绘珟閿涘绱?- **閸欐垿鈧焦妞傞弬鍥︽闂?prompt 娑撳﹪鈧?*閿涘ost 閺嶏繝鐛欓獮?*閽€鐣屾磸娣囨繂鐡?*閸?`~/.dsh/attachments/v1/files/`閿涘牓绮拋銈呭礋閺傚洣娆?20 MiB閵嗕礁宕熼弶?20 娑擃亗鈧礁宕熼弶鈥虫値鐠?200 MiB閿涘绱?- 娴兼俺鐦芥稉顓熷瘮娑斿懎瀵叉稉?`{type:"file"}` 閸愬懎顔愰崸妤嬬礉閸樺棗褰跺☉鍫熶紖濞撳弶鐓嬮梽鍕閸楋紕澧栭敍鍫熷亾閸嬫粍妯夌粈鍝勭暚閺佺鐭惧鍕剁礆閿?- 濡€崇€风拠閿嬬湴閺?file 閸ф濮囪ぐ鍙樿礋 `[闂勫嫪娆㈤敍姘倳缁夊府绱欐径褍鐨敍濉鐎瑰本鏆ｇ捄顖氱窞閿涙埃鈧泝` 閺傚洦婀伴敍?*agent 閻劍鏋冩禒璺轰紣閸忛攱瀵滅捄顖氱窞鐠囪褰?*閿涘湒eepSeek 鐎规ɑ鏌?[Files API 娴犲懏鏁幐浣告禈閻楀洦鐗稿寤?https://api-docs.deepseek.com/zh-cn/guides/files_api/)閿涘矂娼崶鍓у閺傚洦銆傞弮鐘崇《閻╁瓨甯撮崣鎴犵舶濡€崇€烽敍澶涚幢
- 閸ュ墽澧栨禒宥堣泲閸樼喐婀佺憴鍡氼潕闁岸浜鹃敍鍫㈢級閻ｃ儱娴?+ vision 濡€崇€风捄顖滄暠閿涘绱濇禍鎺嶇瑝瑜板崬鎼烽妴?
鐠囥儱濮涢懗浠嬫付鐟?*閺€鐟板З DSH 閺嶇绺鹃崠?*閿涘澋ire 閸楀繗顔呴妴渚€妾禒璺虹摠閸屻劊鈧恭omposer閵嗕線鈧倿鍘ら崳顭掔礆閿涘本妫ゅ▔鏇炴躬鏉╂劘顢戦弮鍓佹暠閹绘帊娆㈢€瑰本鍨氶敍灞芥礈濮濄倝娈㈤崠鍛儭鐢讣绱?
- `patches/manifest.mjs` 閳?6 娑擃亝鐗宠箛鍐╂瀮娴犺泛鍙忛柈銊︽暭閸斻劎娈?old閳姧ew 濞撳懎宕熼敍?- `scripts/patch-core.mjs` 閳?`apply` / `revert` / `verify` / `diff`閿涘苯绠撶粵澶堚偓浣哥敨閸樼喎顫愭径鍥﹀敜閿涘潉~/.dsh/.dsh-periscope-patch-backup/`閿涘鈧?
娴ｈ法鏁ら敍?
```bash
npm run patch:apply     # 閹?node scripts/patch-core.mjs apply
npm run patch:verify    # 濡偓閺屻儲鐗宠箛鍐╂Ц閸氾箑鍑＄悰銉ょ
npm run patch:revert    # 鏉╂ê甯弽绋跨妇閺傚洣娆?npm run patch:diff      # 閺屻儳婀呭В蹇擃槱閺€鐟板З
```

**濞夈劍鍓?*閿涙俺藟娑撲線鎷＄€电懓缍嬮崜?DSH 閺嶇绺鹃悧鍫熸拱缂傛牕鍟撻敍娑欑壋韫囧啫宕岀痪褍鎮楅棁鈧柌宥嗘煀 `apply`閿涘牐鍓奸張顑跨窗閹躲儱鎲￠悧鍫熸拱娑撳秴灏柊宥囨畱閺囨寧宕叉い鐧哥礆閵嗗倽绻栨稊鐔恍掗柌濠佺啊娑撹桨缍嶉弬鍥︽闂勫嫪娆㈡担鎾荤崣閺嗗倹妞傞弮鐘崇《閸嬫艾鍩屾稉搴⒛侀崹瀣￥閸忓磭娈戠痪顖涘絻娴犺泛瀵查妴?
### 娣囶喖顦查敍鍫滅瑢閺傚洣娆㈤梽鍕闁板秴顨滈敍?
- 娣囶喖顦查弬鍥︽閼藉顭堥崣鎴︹偓?閸掔娀娅庨弮?`Cannot read properties of undefined (reading 'startsWith')`閿涘潉revokePreview` 鐎佃妫?`previewUrl` 閻ㄥ嫯宕忕粙鍨┛濠у喛绱氶敍?- 鐎广垺鍩涚粩顖欐櫠婢х偛濮為崡鏇熸瀮娴?20 MiB 娑撳﹪妾洪幓鎰仛閿涘矂浼╅崗宥堢Т婢堆勬瀮娴犺泛鍘涢弫纾嬵嚢閸忋儱鍞寸€涙ǜ鈧?
## [0.2.0] 閳?2026-08-22

- Renamed the plugin to **dsh-periscope** (cordis id `periscope`).
- Support **multiple text models**: `textModels` now defaults to
  `["deepseek-v4-flash", "deepseek-v4-pro"]`, so image-bearing requests are
  auto-routed to `deepseek-v4-flash-vision-exp` whether the session runs on
  flash or pro.
- Same core mechanism: wraps `llm.resolveModelInfo` (host image-admission
  bypass) and `llm.streamWithRegistration` (per-request vision routing).

## [0.1.1] 閳?2026-08-22

- Added the host api-proxy image-admission bypass by also wrapping
  `llm.resolveModelInfo`; previously images under a text-only session were
  rejected before reaching the stream (the plugin alone did not fix
  `MODEL_DOES_NOT_SUPPORT_IMAGES`).

## [0.1.0] 閳?2026-08-22

- Initial release: auto-routes image-bearing requests to a vision-capable
  model on the same provider by wrapping `llm.streamWithRegistration`.
- Configurable `provider`, `textModel`, `visionModel`.
