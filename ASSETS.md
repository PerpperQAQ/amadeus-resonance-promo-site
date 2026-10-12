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
