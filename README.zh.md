# dsh-periscope

[![DSH 鎻掍欢](https://img.shields.io/badge/DSH-鎻掍欢-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
[![license](https://img.shields.io/github/license/lmh-2026/dsh-periscope.svg?style=flat-square)](./LICENSE)
[![version](https://img.shields.io/npm/v/dsh-periscope.svg?style=flat-square)](https://www.npmjs.com/package/dsh-periscope)

> 濡傛綔鏈涢暅涓€鑸€斺€?*绾枃鏈?*鐨?DeepSeek 妯″瀷鏃犻渶鍒囨崲锛屽氨鑳?鐪?鍒板浘鐗囥€?
璁╀細璇濋粯璁ゅ仠鐣欏湪 `deepseek-v4-flash` / `deepseek-v4-pro`锛?*鎶婃墍鏈夊惈鍥捐姹傝嚜鍔ㄨ矾鐢?*鍒板畼鏂硅瑙夋ā鍨?**`deepseek-v4-flash-vision-exp`**锛堝悓涓€ provider锛夈€傜函鏂囧瓧璇锋眰鍘熻矾璧版枃鏈ā鍨嬧€斺€旀棤闇€鎵嬪姩鍒囨崲銆佹棤绗笁鏂硅瑙夋ā鍨嬨€佹棤 OCR锛屽浘鐗?*鍘熸牱**鍙戠粰 DeepSeek 瀹樻柟瑙嗚 API銆?
## 涓轰粈涔堥渶瑕佸畠

澶у鏁?DSH 瑙嗚鎻掍欢鏄?**杞枃瀛楁ˉ**"锛氭帴涓€涓?*绗笁鏂?*瑙嗚妯″瀷锛圙LM / Qwen / Gemini / 鏅鸿氨鈥︼級鍏堟妸鍥?杞堪鎴愭枃瀛?锛屽啀鎶婃弿杩颁氦缁?DeepSeek銆傝澶氫竴鎶婄涓夋柟 key銆佸浜嗗眰鏈夋崯鐨勫浘鈫掓枃杞崲锛屼笖甯歌鍒囨崲 provider銆?
dsh-periscope 璧?*閫忔槑**璺嚎锛氫細璇濅繚鎸佸湪鏂囨湰妯″瀷涓婏紝鍙湪**鐪熸鍚浘鐨勯偅涓€杞?*鎶?鍙戝嚭鐢?鐨勬ā鍨嬫崲鎴?`deepseek-v4-flash-vision-exp`锛屽鐢ㄤ綘宸叉湁鐨?`deepseek-official` 璺敱涓?key銆傝瑙夋ā鍨嬬湅鍒扮殑鏄師濮嬪儚绱犮€?
## 宸ヤ綔鍘熺悊

鍦ㄧ函鏂囨湰浼氳瘽閲岃创鍥捐杩囦袱閬撳叧鍗★紝鏈彃浠舵妸涓ら亾閮芥墦閫氾細

1. **Host 鍥剧墖鍑嗗叆** 鈥斺€?鎻愪氦甯﹀浘娑堟伅鏃讹紝host 鐨?`prompt` 澶勭悊鍣ㄤ細鏌ヤ細璇濇ā鍨嬫槸鍚﹀０鏄?image 杈撳叆锛堝惁鍒?`MODEL_DOES_NOT_SUPPORT_IMAGES` 鎷掔粷锛夈€傛彃浠跺寘瑁?`llm.resolveModelInfo`锛岃姣忎釜閰嶇疆鐨勬枃鏈ā鍨嬮兘鎶ュ憡鏀寔 image锛屽浘鐗囧洜姝よ繘鍏ヤ細璇濄€?2. **娴佸紡璺敱** 鈥斺€?鎵€鏈夎姹傞兘缁忚繃 `llm.streamWithRegistration`銆傛彃浠跺寘瑁呭畠锛氳嫢娑堟伅鍚浘鐗囧潡涓旇姹傝矾鐢卞埌閰嶇疆鐨勬枃鏈ā鍨嬶紝灏辨敼娲惧埌閰嶇疆鐨勮瑙夋ā鍨嬶紝浣垮浘鐗囧潡鐪熸琚彂閫侊紙涓嶅啀鍑虹幇 `[image omitted because this model accepts text only]` 鍗犱綅銆佷篃涓嶄細 `UNSUPPORTED_CONTENT` 鎶ラ敊锛夈€?
```text
绾枃鏈細璇?(flash/pro)
  鈹? 璐村浘
  鈻?host 鍑嗗叆   鈹€鈹€ resolveModelInfo 鍖呰 鈫?鍥剧墖鏀捐
  鈻?llm.stream  鈹€鈹€ streamWithRegistration 鍖呰
  鈹?  娑堟伅鍚浘锛?  鈹?    鈹溾攢 鍚?鈫?鍘熸牱璧?deepseek-v4-flash / deepseek-v4-pro锛堥浂寮€閿€锛?  鈹?    鈹斺攢 鏄?鈫?鏀规淳 deepseek-v4-flash-vision-exp锛堝畼鏂硅瑙?API锛?  鈻?鍙戝嚭璇锋眰    鈹€鈹€ 鍚屼竴 provider + key锛屽浘鐗囧師鏍峰彂閫?```

## 瀹夎

```powershell
# 浠?npm
dsh plugin --profile web add dsh-periscope

# 浠庢湰鍦?tarball
dsh plugin --profile web add .\dsh-periscope-0.2.0.tgz
```

瑁呭畬**閲嶅惎 DSH 搴旂敤**锛坆undle 鍒楄〃鍦ㄥ惎鍔ㄦ椂璇诲彇锛夈€?
## 閰嶇疆

瀹樻柟 DeepSeek 鏃犻渶浠讳綍璁剧疆鍗冲紑绠卞嵆鐢細

| 瀛楁 | 榛樿 | 璇存槑 |
| --- | --- | --- |
| `provider` | `deepseek-official` | 鎵胯浇妯″瀷鐨勮矾鐢?provider |
| `textModels` | `["deepseek-v4-flash", "deepseek-v4-pro"]` | 鍚浘璇锋眰浼氳璺敱鍒拌瑙夋ā鍨嬬殑鏂囨湰妯″瀷 |
| `visionModel` | `deepseek-v4-flash-vision-exp` | 鍚浘璇锋眰浣跨敤鐨勮瑙夋ā鍨?|

鍦?profile 鐨?`cordis.patch.yml`锛堢敤鎴峰眰浼氭暣浣撴浛鎹㈣琛岄厤缃級瑕嗙洊锛?
```yaml
- id: periscope
  config:
    provider: deepseek-official
    textModels: [deepseek-v4-flash, deepseek-v4-pro]
    visionModel: deepseek-v4-flash-vision-exp
```

璇?provider 鐨勬ā鍨嬬洰褰曢渶鍚屾椂鍖呭惈杩欎簺鏂囨湰妯″瀷涓庝竴涓０鏄庝簡 image 杈撳叆鐨勮瑙夋ā鍨嬶紙DeepSeek 鐩綍宸叉弧瓒筹級銆?
## 宸茬煡杈圭晫

- 鍒囨崲鏄寜璇锋眰銆佹寜鍐呭鍙戠敓鐨勶細鍚浘杞璺憊ision妯″瀷锛堝惈鍘嗗彶锛夛紝鏂囧瓧杞璺戞枃鏈ā鍨嬨€?- 璇锋眰澶存棩蹇椾笌 token 璁￠噺浠嶈褰曟枃鏈ā鍨嬶紙澶村湪娴佸紑濮嬪墠灏卞凡鍐欏叆锛夛紱灞炲凡鐭ョ殑澶栬鎬у亸宸€?- 涓嶅奖鍝?`read_image` 宸ュ叿鑷韩鐨勫噯鍏ユ鏌ャ€?
## 璁稿彲璇?
[MIT](./LICENSE)
