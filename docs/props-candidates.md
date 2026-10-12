# 道具素材候选清单（第三轮 · 并行调研）

> 状态：**只是候选，尚未替换页面里的自绘道具。** 所有候选文件在 `assets-candidates/`（约 7.7 MB）。
> 缩略图在 `assets-candidates/_thumbs/`，可交互原型在 `assets-candidates/prototype/`（直接用浏览器打开 `.html`）。

## 结论（先看这里）

| 道具 | 推荐方案 | 是否需要 3D |
|---|---|---|
| **IBM 5100** | **Wikimedia 实拍抠图 + 屏幕区域叠加 APL 文字/辉光**（已做原型，效果很好） | 不需要 |
| **辉光管读数（Divergence Meter）** | 首选：**官方 Re:Boot 的世界线探测器 CG**（素材库 `03_reboot/reboot_story.jpg`，已是页面“边界”章的底图）作为视觉基准；交互读数用 **GN‑4 实拍数字贴图**（CC BY‑SA）拼装（已做原型），或继续用大号细线数字（开场/彩蛋已采用） | 不需要；若要“可旋转/可点击”的实物，才用 3D（见下） |
| **电话微波炉（暂定）** | **Wikimedia 实拍白色微波炉抠图（Daewoo，CC BY‑SA 4.0）+ 手机/电话线用 CSS/SVG 叠加**；官方 `reboot_phone_trigger.png` 仅作造型参考 | 不需要；想要原作质感再让 GPT 建模（需求清单见文末） |

**不建议再用自绘 SVG。** 判断依据：三件里有两件（IBM 5100、微波炉）找到了许可清晰、分辨率足够、抠图干净的实拍图；辉光管有官方 CG + 实拍数字贴图。
Sketchfab 上有现成的 3D 模型（见下），但**下载 glTF 需要登录 Sketchfab 账号**（我这边无法登录，没有下载），并且多数是 **CC BY‑NC / NoAI** 或付费——本作业为非商业，BY‑NC 可用，但要求署名且 NoAI 条款需要尊重（不得作为生成式 AI 的输入）。

## A. IBM 5100

| 候选 | 来源 | 作者 / 许可 | 尺寸 | 评价 |
|---|---|---|---|---|
| ![](../assets-candidates/_thumbs/ibm-bern.jpg) **MfK Bern**（首选）`ibm5100/wm-ccbysa-mfk-bern-cut.webp`（原图同目录 `.jpg`） | https://commons.wikimedia.org/wiki/File:IBM_5100_-_MfK_Bern.jpg | Sandstein · **CC BY‑SA 3.0** | 3306×2421（取 1600 宽） | 正面略俯视，光照均匀，抠图边缘干净，屏幕/按键/磁带仓清晰；屏幕区域约占宽 12.6%–32.6%、高 33.8%–52.3%，可叠加发光文字 |
| ![](../assets-candidates/_thumbs/ibm-sailko.jpg) Sailko `ibm5100/wm-ccby-sailko-cut.webp` | https://commons.wikimedia.org/wiki/File:Ibm_5100,_microcomputer,_1975_(1976_ca.).jpg | Sailko · **CC BY 3.0** | 2838×2550 | 3/4 视角，抠图好；屏幕偏小、有电源线 |
| Wichary `ibm5100/wm-ccby-wichary.jpg` | https://commons.wikimedia.org/wiki/File:Ibm5100_(2297950254).jpg | Marcin Wichary · CC BY 2.0 | 2272×1704 | 展柜玻璃反光，抠图失败，**不用** |
| 其它 | `IBM 5100 (1).jpg`（CC0，木地板背景）、`IBM-5100-overhead view.jpg`（PD，俯视） | snuci / Deskthority | 1366 宽 | 备选 |

原型：`assets-candidates/prototype/ibm5100.html`（截图 `prototype/ibm5100.png`）——通电后屏幕逐行打出 APL/十六进制解码文本，屏幕有辉光。
要点：CC BY‑SA 要求**署名 + 相同方式共享**（衍生的抠图图片也应以 CC BY‑SA 发布并注明出处），已写进 ASSETS.md 的待办。

## B. 辉光管读数（Divergence Meter）

| 候选 | 来源 | 作者 / 许可 | 评价 |
|---|---|---|---|
| ![](../assets-candidates/_thumbs/official-meter.jpg) **官方 Re:Boot 世界线探测器 CG** `official/reboot_story.jpg` | 官网 https://steinsgate.jp/reboot/zh-hans/（`common/img/story.jpg`），素材库 `03_reboot/` | © 官方 · 素材库标注 **official_reference_only**（不得再分发/商用） | 画面最好：8 管 + 黑色底座 + 线缆，读数 0.571024；**数字字形是动画里的细线体**（斜线 0、带旗的 1），可作为字形基准。背景是米色宣纸，抠线缆很难 → 适合整图当底图，不做抠图 |
| ![](../assets-candidates/_thumbs/nixie-gn4-8.jpg) **GN‑4 数字 0–9 实拍** `nixie/wm-ccbysa-gn4-digit0…9.jpg` | https://commons.wikimedia.org/wiki/Category:Nixie_tubes | Hellbus · **CC BY‑SA 3.0** | 1000×1000 微距，每个数字一张，橙红辉光真实；圆形取景（像鱼眼）——拼成 8 管读数后有“真辉光管”质感（原型 `prototype/nixie-meter.html`，截图 `prototype/nixie-meter.png`），但不是动画里的平顶高管 |
| ![](../assets-candidates/_thumbs/nixie-8.jpg) 8 nixies `nixie/wm-ccbysa-8nixies.jpg` | Commons | Adam Greig · CC BY‑SA 2.0 | 8 管排列实拍，可作质感参考 |
| 其它 | `IN18`（CC0）、`Dalibor Farny RZ568M`（CC0）、`IN‑12` 等 | Commons | 单管，灯丝风格不同 |
| Sketchfab 3D：Divergence Meter – Steins;Gate | https://sketchfab.com/3d-models/divergencemeter-steinsgate-344a1e2d0ff44ca99357a7333ed75ba7 | giuseppegamer1 · **CC BY‑NC**，145k 三角面 | 需登录下载；面数偏高（需减面至 <50k）。另有 Ivanix88（33k 顶点，NoAI，许可待确认）、Amatsukast（CC BY‑NC‑SA，209k 三角面） |

建议：不做 3D。页面里读数继续用“细线辉光大数字”（开场/彩蛋已用，风格与用户 Amadeus 项目一致）；若要实体感，用原型的 GN‑4 贴图方案；官方 CG 保留为章节底图。

## C. 电话微波炉（暂定）

| 候选 | 来源 | 作者 / 许可 | 评价 |
|---|---|---|---|
| ![](../assets-candidates/_thumbs/mw-daewoo.jpg) **Daewoo KOR‑1N0A**（首选）`microwave/wm-ccbysa-daewoo-kor1n0a-cut.webp` | https://commons.wikimedia.org/wiki/File:Daewoo_Model_KOR-1N0A_Microwave.jpg | TaurusEmerald · **CC BY‑SA 4.0** | 白色微波炉，3/4 视角，抠图干净；与动画里“白色普通微波炉 + 接手机”的设定相符 |
| Amana Radarange `microwave/wm-ccbysa-amana-radarange-cut.webp` | Commons | TaurusEmerald · CC BY‑SA 4.0 | 复古金属面，但正面平视且倒影杂 |
| `reboot_phone_trigger.png`（官方 Re:Boot 手机 UI） | 官网 `system_phonetrigger.png` | © 官方 · reference only | 红色手机造型参考，**不建议直接使用** |

方案：微波炉实拍图 + 一台 CSS/SVG 画的小手机（屏幕写“已发送短信”之类，自写文案）+ 电话线；点击时炉灯亮、转盘转（叠加层）、按钮高亮。

## D. 若需要“GPT 建模”（可选，3D 方案）

三件都能用图片解决，**只有想做“可旋转/可点击的 3D 实物”时才需要**。需求清单：
- 对象：IBM 5100（1975 款，翻盖键盘+5 英寸屏+磁带仓）/ 辉光管读数仪（8 管：`d . dddddd`，平顶高管，黑色底座，线缆）/ 白色微波炉（带一台翻盖手机，电话线相连）。
- 参考图：本文列出的实拍图（IBM：MfK Bern；微波炉：Daewoo；读数仪：官方 CG `reboot_story.jpg` 仅作内部参考）。
- 规格：glTF 2.0（.glb），单个模型 ≤ 30k 三角面、≤ 3 MB；PBR（baseColor/metalRoughness/normal，2048² 以内，可压缩 KTX2/WebP）；原点在底面中心，单位米，朝向 +Z。
- 动效需要的独立节点：IBM 的屏幕（独立发光材质，可换贴图）；读数仪每根管一个节点（emissive，可改贴图或切换子网格）；微波炉的门（可绕铰链旋转 90°）、转盘（可旋转）、炉灯（emissive）、手机屏幕（emissive）。
- 页面接入成本：three.js（约 150 KB gzip）+ GLTFLoader；需做离屏暂停、降级图片。建议仍优先用图片方案。

## 许可与署名待办
- Wikimedia 来源的抠图/衍生图在页面中使用时需在 `ASSETS.md` 与页面角落小字写明：作者、许可（CC BY / BY‑SA）、来源链接；BY‑SA 的衍生图需以同许可发布。
- 素材库（官方）图片均为 **official_reference_only**：当前页面的章节底图、官方 CG 属于用户已确认的内部学习/作业用途，**若公开发布或商用需要先取得授权**（见素材库 `RIGHTS_AND_USAGE.md`）。
