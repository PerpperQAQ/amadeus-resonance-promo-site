# 素材与授权清单

2026-10-12 发布决定：Owner 已明确选择完整效果公开部署到 GitHub Pages，允许模型、SDK 和两段原声公开下载，但不进入 Git 历史。发布方式见 [README](README.md#github-pages-发布)。下表的本机/课堂用途描述为此前记录；素材来源、权利方及许可事实保持原样，本次 Owner 决定不是第三方授权证明。

| 素材 | 位置 | 来源 | 处理 | 授权/用途 |
|---|---|---|---|---|
| E-mote 角色模型 ×2（牧濑红莉栖：外套 `kurisu_ab` / 白大褂 `kurisu_ab_labcoat`） | `public/models/kurisu_ab.expressions.psb`、`kurisu_ab_labcoat.expressions.psb`（均为项目内真实文件）、`kurisu_ab-catalog.json` | 主项目 `amadeus-system-new/.local_live2d_assets/reboot_20260905/derived/authored-controls-v2/` | 原样使用，未改动 | 版权属原权利方；仅课堂展示，不分发 |
| E-mote WebGL SDK | `public/vendor/emote/` | 主项目 `tools/emofuri-sdk/webgl/` | 原样复制 | © M2 Co., Ltd.；页面显示 E-mote Logo；个人/非商用学习展示 |
| 章节背景图 ×16（8 章 × A 琥珀 / B 夜蓝） | `public/img/bg-*.webp` | 美术参考库 `Amadeus-Resonance-Art-References/2026-07-26/`：`03_reboot/` 的 reboot_intro_04/05、reboot_background_01–04、reboot_story，及 `06_official_store_screenshots/steins_gate_2009/originals/screenshot_full_03__3efed34996.jpg`（逐章对应见 `docs/round2-research.md`） | 裁掉底边水印/UI，缩至 1600px 宽，渐变映射 + 暗角 + 噪点，转 WebP（`scripts/build-images.py`）；原件未动 | 版权属原权利方；仅课堂展示 |
| 产品 Logo 派生图层 | `public/img/logo-base.webp`、`logo-gear-major.webp`、`logo-gear-minor.webp` | 主项目 `public/local-private-assets/brand/amadeus-resonance/v1/logo.svg` | Chrome 渲染：底图（去齿轮）+ 两个齿轮单独图层，齿轮位置/尺寸由 `scripts/build-logo.py` 计算；原 SVG 未动 | 项目自有设计（含《命运石之门》元素，同上限制） |
| 产品 Logo（旧版整图） | `public/img/logo-amadeus-resonance.webp` | 同目录 `logo-transparent.png` | 裁边缩放转 WebP | 同上 |
| 静态降级立绘 | `public/img/fallback-kurisu.webp` | 由上述 E-mote 模型实际渲染截图去底得到 | 仅模型加载失败时显示 | 同模型 |
| 字体 | `src/fonts/*.woff2` | ZCOOL XiaoWei（站酷小薇体）、Noto Serif SC、Noto Sans SC、Barlow Condensed、Share Tech Mono（SIL OFL 1.1）；**DejaVu Sans Mono**（Bitstream Vera 许可，可自由使用/再分发，仅用于 IBM 5100 风格乱码里的 APL 符号与十六进制字符） | 按页面字符/符号裁剪、可变字重限定范围（`scripts/build-fonts.py`；APL 子集 `ar-apl.woff2` 为预先裁好的文件） | 允许嵌入与再分发 |
| 辉光管、IBM 5100、电话微波炉、指针、光环、世界线进度条、乱码效果 | `src/nixie.js`、`props.js`、`cursor.js`、`halo.js`、`rail.js`、`cipher.js` | 本次作业原创（SVG/CSS/Canvas 自绘，非图片）；外形仅致敬《命运石之门》道具 | — | 原创 |
| 页面代码、样式、文案 | `index.html`、`src/*`、`scripts/*` | 本次作业原创（文案依据项目 PRD/设计文档） | — | 原创；未复制任何参考页代码 |
| 背景音乐 | —— | 尚未加入 | — | 请使用有授权的音乐 |

再生成：`python3 scripts/build-images.py`（背景）、`node scripts/build-logo.mjs && python3 scripts/build-logo.py`（Logo 图层）、`python3 scripts/build-fonts.py`（字体；源字体放 `.tmp/fonts/`）。

## 刻意不包含

真实后端 / LLM / 语音 / 数据库 / 登录 / 支付 / 用户数据；任何用户规模、性能指标或评价数据；官方 UI 复刻。辉光管读数（1.048596 等）与 IBM 5100 乱码均只是装饰性致敬，不代表产品数据或真实加密。

## 第三轮新增 / 变更素材

| 素材 | 来源 | 说明 / 许可 |
|---|---|---|
| `public/img/bg-*.webp`、`bg-*-b.webp`（16 张，重新生成） | 素材库 `03_reboot/`、`06_official_store_screenshots/`（同第二轮清单） | 保留原图色彩的统一明暗/颗粒处理；官方素材，素材库标注 official_reference_only，仅限作业/内部展示 |
| `assets-candidates/**`（候选，未上线） | Wikimedia Commons（IBM 5100：Sandstein CC BY‑SA 3.0、Sailko CC BY 3.0；GN‑4 数字：Hellbus CC BY‑SA 3.0；Daewoo 微波炉：TaurusEmerald CC BY‑SA 4.0 等）及素材库官方 CG | 详见 `docs/props-candidates.md`（含 URL / 作者 / 许可）。若采用，需在页面与本文件署名，BY‑SA 衍生图需同许可发布 |
| Logo 齿轮层 | 同第二轮：从官方 logo.svg 精确拆分，字标层 z-index 高于齿轮层 | 原图未改动 |
| 代码（`strands.js`、`stagefx.js`、`cursor.js` 齿轮、`meter.js`、`boot.js`、`rail.js`、`shift.js`） | 自写 | 开场/世界线语言借鉴用户 Amadeus 项目的**节奏与元素**，未复制代码 |

## 第四轮新增素材（道具实拍图）
| 文件 | 来源 | 作者 | 许可 | 处理 |
|---|---|---|---|---|
| `public/img/props/ibm5100.webp` | https://commons.wikimedia.org/wiki/File:IBM_5100_-_MfK_Bern.jpg | Sandstein（Museum für Kommunikation Bern 馆藏拍摄） | **CC BY-SA 3.0** | 去背景（rembg）、缩放、转 WebP；屏幕区域在页面里叠加 APL 文本 |
| `public/img/props/mw-oven.webp` | 素材库 `03_reboot/reboot_background_02.jpg`（《命运石之门 Re:Boot》官方，steinsgate.jp/reboot）中的电话微波炉，裁切 → ×3 放大 → 缩到 600px 宽 + 轻微锐化 + 颗粒，按矩形轮廓抠图（`scripts/build-mw.py`） | ©MAGES./Chiyo St. Inc. ©MAGES./NITRO PLUS 等 | **官方素材，仅供课堂展示，不对外分发** | 炉灯/刻度窗/红开关/4 位数码管/手机屏幕为页面叠加（CSS 光效） |
| `public/img/props/mw-phone.webp` | 素材库 `03_reboot/reboot_phone_trigger.png`（Re:Boot 官方界面图）抠去白底，缩到 240px 宽，底部渐隐 | 同上 | 同上 | 屏幕点亮为 CSS 叠加 |
| `public/img/boot-cg.webp` | 用户 Amadeus 项目 ready 界面的红莉栖近景 CG：`/Volumes/GM7 2T/Mac扩容/项目/Amadeus-Resonance/Documents/Playground/amadeus-resonance-frontend-claude-20260925/public/assets/ready-cg-owner-r3.png`（1672×941 PNG，2.1MB）→ WebP（约 140KB，`scripts/build-bootcg.py`，不改画面） | 《命运石之门》相关官方 CG（含牧濑红莉栖、椎名真由理、桶田至，©MAGES./Chiyo St. Inc. ©MAGES./NITRO PLUS 等权利方）；文件由作者的 Amadeus 项目提供，具体出处无法从文件确认 | **官方素材，仅供课堂展示，不对外分发** | 开屏底图；满屏 cover；叠加暗角/扫描线/颗粒与右上氛围角标（纯 CSS）；第九轮已取消上下黑边；加载失败回退纯黑星图背景 |
| ~~`public/img/props/gn4-0…9.webp`~~（第五轮起已从页面移除） | Wikimedia Commons Nixie tubes（Hellbus，CC BY-SA 3.0） | Hellbus | CC BY-SA 3.0 | 结尾章读数仪改用橙色细线数字（字形来自用户自己的 divergence-meter 字形库 `meterLib.js`，用户自有资产），不再使用 GN-4 实拍图；候选目录里仍保留供参考 |

**CC BY-SA 义务**：页面结尾（`.credits-img`）已署名作者/来源/许可；IBM 5100 衍生图（`public/img/props/ibm5100.webp`）沿用其原图的 CC BY-SA 3.0 署名/许可记录。此说明不涵盖官方微波炉、手机与其他游戏素材。原图的版权不属于本作业；本站的代码与其它设计仍为作业原创。

另：开屏/世界线变动的辉光管字形（`src/tube.js` 的 `CATHODE` 单笔画路径）按用户 Amadeus 项目 `glyphs.ts` 的阴极丝形状改写（用户自己的项目，已获授权），渲染代码为本页自写。


## 第五轮补充
- 电话微波炉与手机：第六轮起改用官方素材（见上表，用户选定方案 A）；原先的 Wikimedia Daewoo 微波炉（TaurusEmerald，CC BY-SA 4.0）与自绘 CSS 手机已从站内移除（候选目录仍保留 Daewoo 原图）。
- IBM 5100 融合处理（色调叠色、阴影、辉光）全部是页面 CSS；微波炉/手机的放大、锐化、颗粒在 `scripts/build-mw.py` 中完成，调色/光影在页面 CSS。
- 开屏/变动的数字字形：用户 Amadeus 前端 `design-assets/divergence-meter/meterLib.js` 的单线字形（用户自有）。


## 第六轮追加
- 字体 `src/fonts/ar-apl.woff2`：DejaVu Sans Mono 重新裁剪（扩到 U+2190–23FF 全部箭头/数学/技术符号 + 拉丁），补齐开屏入口乱码所需的 `⎕ ⊂ ⊃ × ÷ ∨ ∧ ¯ ¨` 等字形（Bitstream Vera 许可）。
- 电话微波炉候选素材：`assets-candidates/microwave/official-*` 中，实验室背景微波炉裁切与 Re:Boot 触发手机抠图已按方案 A 入站（见上），零代手机等其余仍未使用；详见 `docs/microwave-options.md`。
- 空间撕裂（`src/tear.js`）为自写代码；参考的原片抽帧只在本机 `.tmp/wl-tear/`，不进入工程产物。

## 接手核对（2026-10-11）

- 新标题字体：`.tmp/fonts/ZCOOLXiaoWei.ttf` → `src/fonts/ar-disp.woff2`，来源记录为 Google Fonts 的 ZCOOL XiaoWei / SIL OFL 1.1，由现有字体脚本按页面文字裁剪。
- 底部进度条现用 `src/railline.js`；页码现用 `src/meter.js` 的 `GlowNum`，都由 Canvas/SVG 绘制。原 `wlines.js`、`nixie.js` 保留为旧实现，当前进度条没有使用。
- 开屏底图仍是原有 `boot-cg.webp`；这一轮只调整 CSS 覆盖范围，没有修改或扩绘原 CG。
- `public/models/kurisu_ab_labcoat.expressions.psb` 接手时为本机符号链接，现已复制为项目内真实文件，原资源未改。大小 222572967 bytes；SHA-256 及源/目标路径见 `output/playwright/model-copy.json`。Git 仍忽略两个 PSB 与本地 SDK，复制整个本地项目时须一并携带。

## 第十轮新增 / 变更素材（2026-10-12）

| 用途 | 源文件（只读，未改动） | 派生文件 | 处理 |
|---|---|---|---|
| 06 本地章底图（柳林神社，IBM 5100 存放处） | `/Users/perpperqaq/Downloads/resg_bg028a1.png`（3072×1728 RGBA，柳林神社白天空景 CG，由用户提供；原图自带少量故障条纹） | `public/img/bg-local.webp`、`public/img/bg-local-b.webp`（1920×1080） | `scripts/build-images.py` 中 `SHRINE`：等比缩放、压暗 0.86、饱和 0.9；B 版按 B 世界线配色（暗部淡紫、高光琥珀） |
| 05「声」原声 | `/Users/perpperqaq/Music/Music/Media.localized/Music/Unknown Artist/Unknown Album/crs_2148.wav` | `public/audio/kurisu-crs_2148.m4a`（约 7.8 s，90 KB） | ffmpeg 转 AAC + 响度归一；牧濑红莉栖游戏原声：「漆原さんの性別を男に戻すことで、本当にIBN5100は戻ってくるのか、っていうこと。」 |
| 05「形」原声 | 同目录 `crs_1897.wav` | `public/audio/kurisu-crs_1897.m4a`（约 16.1 s，183 KB） | 同上；「極端な管理社会。全体主義。まゆりがバナナを……そんな社会ってところ？」，表情/动作按词级时间戳切换 |

- 两段语音为《命运石之门》游戏原声（版权归 MAGES./5pb.），仅用于课程作业本地演示；`public/audio/` 已加入 `.gitignore`，**不进仓库**。换机器时需手动把两个 m4a 放回 `public/audio/`，否则页面显示「语音素材待补」，「形」仍会完成表情与字幕。
- 听写：faster-whisper medium（日语、词级时间戳）后人工校正；中文为本页翻译。
- 已排除：`imai_asami_*.mp3`（听写确认含其他角色语音，不适用）。
- 06 底图此前曾临时使用 `amadeus-system-new/public/local-private-assets/scenes/shrine.jpg`，已按用户更正替换为上表来源。

## 概念稿 · cinema.html / split.html 用图（`public/img/cinema/`，branch concept/terminal）

> ⚠️ **版权**：以下源图在美术参考库 `RIGHTS_AND_USAGE.md` / `CATALOG.csv` 中均标为 `official_reference_only`：官方宣传素材，**未获再分发 / 公开发布授权**。仅限本机课堂演示，**公开发布前必须替换**。

源库：`/Users/perpperqaq/Pictures/Amadeus-Resonance-Art-References/2026-07-26/`（只读，未修改）。由 `scripts/build-cinema.py` 裁切 / 缩放 / 转 WebP。

| 输出 | 源文件 | 处理 | 来源 URL | 权利 |
|---|---|---|---|---|
| `kv-ghost.webp` | `01_games_original/steinsgate_zero_key_visual.jpg` | 裁切 (780,0,1440,1300) → 宽 1000 | https://steinsgate0.jp/common/img/top/image5.jpg | official_reference_only |
| `mem-rooftop.webp` | `03_reboot/reboot_background_04.jpg` | 宽 1600 | https://steinsgate.jp/reboot/zh-hans/common/img/gallery/bg4.jpg | official_reference_only |
| `mem-lab.webp` | `03_reboot/reboot_intro_03.jpg` | 宽 1600 | https://steinsgate.jp/reboot/zh-hans/common/img/intro3.jpg | official_reference_only |
| `mem-radiokan.webp` | `03_reboot/reboot_intro_04.jpg` | 宽 1600 | https://steinsgate.jp/reboot/zh-hans/common/img/intro4.jpg | official_reference_only |
| `mem-meter.webp` | `03_reboot/reboot_story.jpg` | 宽 1600（页面里始终模糊显示） | https://steinsgate.jp/reboot/zh-hans/common/img/story.jpg | official_reference_only |
| `stage-lab.webp` | `03_reboot/reboot_background_03.jpg` | 宽 1600（页面里压暗） | https://steinsgate.jp/reboot/zh-hans/common/img/gallery/bg3.jpg | official_reference_only |

另复用：`public/img/logo-amadeus-resonance.webp`（本项目标志）、E-mote 模型 `kurisu_ab` / `kurisu_ab_labcoat`、`public/audio/` 两段原声（git-ignored）。split.html 只参考 steinsgate0-anime.com 的版式比例，未使用该站任何素材或代码。

### cinema v2 追加
- `public/img/cinema/*-obs.webp`：上表 6 张图的“被观测画面”版本，由 `scripts/build-cinema.py` 的 `observe()` 生成（R/B 通道各错位 2px + 45° 细网点半调，强度 0.11），只处理图像本身。权利同源图：`official_reference_only`，公开发布前必须替换。
- 字体 `src/fonts/ar-grunge.woff2`：**Rubik Distressed**（Google Fonts，SIL OFL 1.1，许可全文 `src/fonts/OFL-RubikDistressed.txt`），来源 https://github.com/google/fonts/tree/main/ofl/rubikdistressed ，用 fontTools 子集化为 A–Z / 0–9。仅用于章节英文名（PROLOGUE / MEMORY / PERFORM）。
- 视觉语言（黑底字幕条标题、ruby 双关、网点 + 色差、做旧章节名、带青 / 品红错位阴影的黑块按钮）参考 https://steinsgate.jp/reboot/zh-hans/ ；未使用该站任何素材或代码。
- cinema v3：`public/img/cinema/ex-*.webp`（8 张状态缩略图）是用本项目 E-mote 模型（kurisu_ab）在页面里渲染后截取的脸部，由 `scripts/cap-cinema-stills.mjs` 生成；模型本身的权利说明同上文模型条目。加载器齿轮复用本项目 `public/img/logo-gear-major.webp`。

## 概念稿 · reboot-*.html（`public/img/reboot/`）
- `app-daily / app-vn / app-health / app-boot / app-overlay`（+ `-t` 缩略图）← 主项目 `amadeus-system-new/artifacts/wp8-8/frontend-acceptance/wp8-8-1280-{daily,vn,health,boot}.png`、`wp8-8-overlay.png`；`app-history / app-settings` ← `artifacts/wp8-6/frontend-daily/wp8-6-1280-{history,settings}-drawer.png`；`app-bootlogo` ← `artifacts/frontend-boot-logo-20260907/boot-1920x1080.png`。本项目自己的界面截图，缩放转 WebP（`scripts/build-reboot.py`），原件未改。截图里出现的角色立绘 / 背景本身仍属原权利方。
- `hero.webp` ← 美术参考库 `03_reboot/reboot_intro_03.jpg`（https://steinsgate.jp/reboot/zh-hans/common/img/intro3.jpg），1920 宽 + 同 cinema 的观测处理；**official_reference_only，公开发布前须替换**。
- 其余复用 `public/img/cinema/`（同上表，official_reference_only）与本项目标志 / 齿轮图。字体 Rubik Distressed 子集扩展为 A–Z a–z 0–9（OFL 1.1）。
- 页面结构与交互逻辑参考 https://steinsgate.jp/reboot/zh-hans/ ，未使用其任何素材或代码。

## PV 预览素材（pv.html，`public/img/pv/`）

全部由 `scripts/build-pv.py` 从原图**派生**（裁切 + 缩放 + 细网点半调 + R/B 各错位约 1–6px + 轻微纸色），原图未改动。

| 文件 | 来源 | 用途 | 权利 |
|---|---|---|---|
| `mem-story.webp` | `amadeus-system-new/artifacts/wp8-6/frontend-daily/wp8-6-1280-history-drawer.png` 右侧对话记录抽屉 | 3 记忆：「你和我」抽屉贴图 | 作者自己项目的真实截图 |
| `mem-card.webp` | `/Volumes/GM7 2T/…/amadeus-resonance-frontend-claude-20260925/captures/11-record.png` 记录区 | 3 记忆：飞入抽屉的记忆卡 | 作者项目的**设计稿截图（mock）**，页面不标注为已上线界面 |
| `cfg-chat.webp` / `cfg-voice.webp` / `cfg-screen.webp` | 同上 captures：`13-config-llm-filled.png`、`14-config-tts-error.png`、`cfg-diag.png` 配置区 | 6 本机：索引卡背面 | 设计稿截图（mock），不标注为已上线界面 |
| `cfg-mem.webp` | `amadeus-system-new/artifacts/wp8-8/frontend-acceptance/wp8-8-1280-health.png` 服务健康面板（含 Mem0 行） | 6 本机：「记忆」卡背面 | 作者项目真实截图 |
| `win-game.webp`、`play-game.webp` | 美术参考库 `03_reboot/reboot_character_scene_03.jpg`（真由理、桶田至，原作游戏画面，含原 UI） | 4 一起看：游戏窗口缩略图 / 选中后的游戏画面 | official_reference_only，**公开发布前必须替换** |
| `talk-mayuri.webp` | 美术参考库 `03_reboot/reboot_intro_02.jpg`（真由理在研究所） | 5 分寸：别人说话的游戏画面与胶片格 | official_reference_only，**公开发布前必须替换** |
| `win-browser.webp` | Playwright 截取 https://steinsgate.jp/ 首屏（2026-10-12） | 4 一起看：浏览器窗口缩略图 | 官方网站截图，同上仅限演示 |
| `win-editor.webp` | Playwright 渲染本仓库 `src/pv/voice.js` 前 34 行的代码视图 | 4 一起看：编辑器窗口缩略图 | 本项目代码 |

「看过的故事」抽屉沿用 `img/cinema/mem-lab-obs.webp`（见上表）。5 段的游戏台词「大家今天也辛苦啦——先吃点东西再继续吧？」为演示编写，**不是原作台词**，字幕标注说话人「真由理」。

## UI 语言对照页（pv-ui.html）

- 没有引入新的外部图片。四种材质（纸卡纤维、胡桃木管座、辉光管玻璃/网格/灯丝光晕、金属铭牌、翻盖手机机身与按键、液晶像素格、白板、便利贴、记号笔圈与箭头、标签带、拍立得与纸胶带）全部由 `src/pv-ui/pv-ui.css` 中的 CSS 渐变与内联 SVG（feTurbulence / feDisplacementMap）绘制，无许可问题。
- 复用：`img/cinema/stage-lab.webp`、`img/cinema/mem-lab-obs.webp`（official_reference_only，见上）、`img/pv/mem-story.webp`（见「PV 预览素材」）、E-mote 模型与字体同主站。手写体使用系统楷体（Kaiti SC / STKaiti），未打包字体文件。

## PV 预览 A+B（pv-ab.html）

| 文件 | 来源 | 处理 | 权利 |
|---|---|---|---|
| `src/fonts/oswald.woff2` | Oswald（https://github.com/google/fonts/tree/main/ofl/oswald ，可变字重） | `fontTools.subset` 仅保留 ASCII + `·` `—`，woff2 | SIL OFL 1.1，许可全文 `src/fonts/OFL-Oswald.txt` |
| `public/img/pv-ab/face-{calm,smug,joy,surprise,shy,pout,glare,worry}.webp` | 本项目 E-mote 模型（`kurisu_ab.expressions.psb`）在 pv-ui.html 中实时渲染的画布截图（Playwright，8 种表情） | `scripts/build-pv-ab.py`：裁头部 → 去色 → 粗网点半调 → 透明底；页面上再加 R/B 错位与 20% 不透明度 | 同 E-mote 模型（© M2 / 原作权利方），仅限演示 |

中文字体按 Source Han Sans SC → Noto Sans SC → PingFang SC 的顺序调用系统字体，未打包。原作语音与模型同前文说明，仅演示。

## pv-ab v4 — 道具粒子 / 背景（public/img/pv-ab/props, scripts/pv-ab-props.py）
| 文件 | 来源 | 权利 |
|---|---|---|
| ibn5100.webp | Wikimedia Commons File:IBM_5100_-_MfK_Bern.jpg, 摄影 Sandstein | CC BY-SA 3.0（需署名，衍生同协议） |
| phone_sg001.webp | STEINS;GATE RE:BOOT 手机触发画面裁切，短信文字区域已涂空 | official_reference_only |
| phone_microwave.webp | STEINS;GATE RE:BOOT 实验室背景裁切 | official_reference_only |
| metal_upa.webp | STEINS;GATE 原作 CG（经 fandom wiki） | official_reference_only |
| divergence_meter.webp | STEINS;GATE RE:BOOT 剧情 CG 裁切 | official_reference_only |
| play-game.webp（陪看演示窗口画面） | 原作游戏画面截图 | official_reference_only；演示台词为原创 |
粒子仅以主题色网格点渲染，不展示原图；原图不再分发到其他用途。

## pv-ab v5 — 字体（src/fonts，子集由 scripts/pv-ab-fonts.py 从页面全部文字含 JS 动态字符串生成）
| 文件 | 字体 | 来源 | 许可 |
|---|---|---|---|
| serif-sc.woff2 | Noto Serif SC（可变 wght） | github.com/google/fonts ofl/notoserifsc | SIL OFL 1.1（src/fonts/OFL-NotoSerifSC.txt） |
| sans-sc.woff2 | Noto Sans SC（可变 wght） | github.com/google/fonts ofl/notosanssc | SIL OFL 1.1（src/fonts/OFL-NotoSC.txt） |
| cormorant.woff2 / cormorant-italic.woff2 | Cormorant Garamond（可变 wght） | github.com/google/fonts ofl/cormorantgaramond | SIL OFL 1.1（src/fonts/OFL-Cormorant.txt） |
pv-ab 页面不再使用 Oswald / Archivo（文件仍保留供其他页面使用）。

## pv-ab v6 — 第 5 屏 REPORT 拼贴道具（public/img/pv-ab/report，scripts/pv-ab-report-props.py 由 .tmp/props2/*/cutout.png 生成）
| 文件 | 来源 | 权利 |
|---|---|---|
| ibn5100.webp | Wikimedia Commons File:IBM_5100_-_MfK_Bern.jpg，摄影 Sandstein（IBN 5100 原型 IBM 5100 实物） | CC BY-SA 3.0 |
| radio_kaikan.webp | Wikimedia Commons File:Akihabara_Radio_Kaikan_-01.jpg，Aimaimyi | CC BY-SA 3.0（同时作第 5 屏淡化背景） |
| dr_pepper.webp | Wikimedia Commons File:50_cl_Dr_Pepper,_september_2017.jpg，Kuriosatempel | CC BY-SA 4.0；Dr Pepper 商标归 Keurig Dr Pepper |
| phone_microwave.webp | STEINS;GATE RE:BOOT 实验室背景 reboot_background_02.jpg 裁切放大 | official_reference_only |
| divergence_meter.webp | STEINS;GATE RE:BOOT 官网 story.jpg | official_reference_only |
| time_leap_machine.webp | steins-gate.fandom.com File:Time_Leap_Machine.png（动画截图裁切） | official_reference_only |
| future_gadget_12.webp | steins-gate.fandom.com File:FG_-_12.jpg（比翼恋理のだーりん） | official_reference_only |
| upa_green.webp | steins-gate.fandom.com File:Upa.jpg | official_reference_only |

## pv-ab v7 — 第 4 屏「观测」小窗（移植自 Amadeus 前端样稿 amadeus-resonance-frontend-claude-20260925，只读参考）
| 文件 | 来源 | 权利 |
|---|---|---|
| public/img/pv-ab/observe/kurisu.webp | 前端 public/assets/kurisu.png（原作白大褂静态帧，小窗替身） | official_reference_only |
| public/img/pv-ab/observe/room.webp | 前端 public/assets/laboratory-lounge-reboot.jpg（RE:BOOT 实验室背景） | official_reference_only |
小窗的结构、样式数值与台词（MINI_LINES / MINI_REPLY / 暂停与中断说明）取自前端 screens/PlayFlow.jsx 与 styles/play.css；无后端，全部为演示脚本。
