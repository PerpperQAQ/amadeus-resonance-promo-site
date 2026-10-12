# 第二轮调研记录（R1–R4）

> 全部为只读调研，未改动主项目与素材原件。

## R1　主项目开场/启动动画 → 与本页统一

**来源**（只读）：`amadeus-system-new` 的 `src/features/dailyStage/BootFirstRun.tsx` + `bootFirstRun.module.less`（主窗口首次进入的“接入”界面）、`public/local-private-assets/boot/monitor-scene.jpg`（1920×1080 背景）、`docs/FRONTEND_BOOT_LOGO_HANDOFF_20260907.md`、`docs/LOGO_DESIGN_LANGUAGE.md`、品牌目录下的 `logo.svg / logo-boot.svg / boot-variant.json`。

**视觉语言**
- 配色：琥珀 `#e08a30`（深 `#a5540f`，光晕 `rgba(224,138,48,.4)`）+ 暖白 `#f2ede6`；次级文字 `#b9b0a4 / #8a8073`；成功色灰绿 `#8fae7f`。
- 字体：衬线体为主（Georgia / Songti SC），标题字距 .2em；“ACCESS”类小字 10px、字距 .62em、`steps(1)` 硬切闪烁。
- 画面：监视器场景底图压暗（`brightness(.3)` + 轻微模糊）+ 重暗角；全屏 CRT 扫描线（0/3px 重复条）并每 8s 有一次 `steps(1)` 的短促闪烁。
- 节奏：节拍变量 600 / 1200 / 1800 ms；进度条为琥珀渐变细条；整体“终端接入”感，克制、少装饰。
- 真正的客户端 Boot（Electron `loading.html`）只有透明背景上的 Logo 动效（齿轮 68s/58s 反向慢转、描边“蚀刻”、红色套印抖动、一道扫光），**没有进度文字**，且不人为拖长启动。
- 主项目里**没有** IBM 5100 / cipher / 乱码 / worldline 彩蛋相关代码（`src` 内搜索无结果），所以世界线变动彩蛋是本页新写的。

**与本页是否统一**：色相同源（本页 `#ffae2e` 比主项目 `#e08a30` 更亮一档，为了在暗场图上有辉光管感）；扫描线 + 硬切闪烁 + 衬线字标可直接沿用；监视器底图已有，但与本页“每章一张场景图”的做法不冲突。
**调整结论**：保留“暗场 + 琥珀 + 扫描线 + steps(1) 闪烁”的语言；开场加入宣传页特有的“时间线跳动”（辉光管读数 + 色散/抖动）；Logo 用主项目标准资产的拆层版（齿轮反向缓转，同主项目参数 68s/58s）。若想与主项目完全一致，只需把 `style.css` 里 `--acc` 改为 `#e08a30`（一处变量）。

## R2　E-mote 模型的动作 / timeline / 变量

数据来源：`public/models/kurisu_ab-catalog.json`（由 `authored-controls-v2/kurisu_ab*.json` 复制）及真机 probe（`scripts/probe2.mjs`、`probe3.mjs`）。

- **timeline（authoredExpressions）共 39 条**，全部是“表情”时间线（21 帧，少数 11 帧），轨道为：`face_*`（眼睛开合/视线/瞳孔/眉/嘴/脸颊/泪）+ `head_slant/head_UD/head_LR` + `body_UD/body_LR`。没有独立的“挥手/转身”整段动作 timeline——**不声称存在**。
  标签：普通、ニヤニヤ、むっとする、睨む(+強)、眠そう、笑う、怒る(00–03)、照れる、喜ぶ00–02、哀しい00–02、楽しい00–04、頬染め00–02(+n)、驚き00–03、困る00–03(+01n)。页面选用 11 条（普通/むっとする/ニヤニヤ/照れる/驚き00/笑う/怒る/困る03/睨む/喜ぶ01/眠そう）。
- **可驱动变量（67 个参数中与动作相关的）**：`head_slant / head_UD / head_LR / body_slant / body_UD / body_LR`（±100）；`act_sp / act_sp2 / act_sp3`（±100，特殊动作量，模型内标签未注明语义，**未使用**）；选择器 `head_type / body_type / arm_type`（`arm_type=1` 为抱臂姿势，已验证可切换）。
- **SDK 播放方式**：`player.mainTimelineLabels` 列出可用 timeline；先 `stopTimeline()`，再设置 `player.mainTimelineLabel = '表情_笑う'` 即播放。变量叠加用 `player.setVariableDiff(组名, 变量, 偏移, 毫秒)`（与 timeline 同时生效，互不打断；视线跟随、动作库都用它），绝对值用 `setVariable`（如 `arm_type`）。头/身体幅度小，需接近满量程才可见（已实测标定）。
- **安全性**：叠加用独立组名（`look` / `mot`），每个动作最后一步回到 0；SDK 的 `onStopAnimation` 在本版本不可靠，改用自己的计时；换模型前先显式销毁旧实例释放 WASM 堆（见 `emote-stage.js`），否则 215MB + 222MB 两个模型会撑爆堆。
- **页面实际使用**：自建 7 个动作（点头 nod、歪头 tilt、前倾 lean、左右摇摆 sway、转开 away、探头 peek、抱臂 cross），每章指定可用的表情/动作池；章节切换从该章池中随机、点击人物从全库随机，均“不与上一次重复”。

## R3　章节背景图（见 `scripts/build-images.py`，原件不动）

来源均在 `/Users/perpperqaq/Pictures/Amadeus-Resonance-Art-References/2026-07-26/`，裁掉底边水印/字幕条，缩到 1600px 宽，统一做“渐变映射（墨绿炭黑→琥珀高光）+ 暗角 + 噪点”，输出 A（琥珀）、B（夜蓝，世界线变动彩蛋用）两套 WebP（共 16 张，每张约 80–145KB）。

| 章节 | 来源文件 | 观感 |
|---|---|---|
| 01 概览 hero | `03_reboot/reboot_intro_04.jpg` | 黄昏下的实验室楼与屋顶水塔，无人物，上方空旷利于放标题 |
| 02 定位 what | `03_reboot/reboot_background_03.jpg` | 实验室室内一角，窗光，纵深强 |
| 03 双模式 modes | `03_reboot/reboot_background_01.jpg` | 沙发、日历、墙面装饰的实验室起居区 |
| 04 角色边界 boundary | `03_reboot/reboot_story.jpg` | 辉光管阵列，直接呼应“世界线数值” |
| 05 统一表演 perform | `03_reboot/reboot_background_02.jpg` | 偏绿的机柜/设备间，冷静 |
| 06 本地运行 local | `03_reboot/reboot_intro_05.jpg` | 秋叶原街招（K-BOOKS 等），夜色 |
| 07 路线 road | `06_official_store_screenshots/steins_gate_2009/originals/screenshot_full_03__3efed34996.jpg`（裁去底部 26% 的 UI） | 秋叶原街景与车站，远景 |
| 结尾 outro | `03_reboot/reboot_background_04.jpg` | 屋顶栏杆与城市，收束感 |

神社（雷网/柳林）类图片本轮**未入选**（现用 8 张已覆盖室内/街道/屋顶且无人物与 UI）；如需把某章换成神社场景，只改 `build-images.py` 的 `SECS` 一行并重跑即可。素材版权属原权利方，仅课堂展示。

## R4　用世界线流动做滚动进度：可行性与实现

- 方案对比：SVG `path` + `stroke-dashoffset`（只改一个属性，合成层友好）vs. canvas（每帧重绘）。结论：**SVG 足够**，整条线约 60 个控制点，节点是 DOM/SVG 元素，天然支持点击、悬停、键盘与无障碍。
- 实现（`src/rail.js`）：屏幕底边一条发光细线，滚动进度 = 被点亮长度；8 个章节为线上的节点（点击跳转、悬停显示章节名），节点处线条有小分叉/起伏；章节切换时一条红色“迁移线”从上一节点绕到新节点并淡出（一次克制的闪烁）。
- 性能：滚动中只更新 `dashoffset` 与当前节点 class；e2e 在软件渲染的无头 Chrome 下仍稳定。
