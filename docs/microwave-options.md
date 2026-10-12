# 电话微波炉：素材调研与方案选项（第六轮）

> **更新：用户已选定方案 A 并已上线**——`public/img/props/mw-oven.webp`（官方实验室图裁出的原作电话微波炉）+ `mw-phone.webp`（Re:Boot 珊瑚红直板手机）；生成脚本 `scripts/build-mw.py`；炉灯/刻度窗/4 位数码管/红开关/手机屏幕以 CSS 光效点亮（点击或 D 键时）。截图见 `docs/screenshots/r6/mw-*`。下文为当时的选项调研，保留备查。

> 对比总览图：`assets-candidates/microwave/_options-sheet.jpg`（左：当前；中：方案 A 预览；右：官方实验室全景）。
> 结论先说：**原作官方美术里就有“电话微波炉”本体**（实验室背景图里），而且比我们现在用的白色家用微波炉更接近原作；手机也要换成 Re:Boot 的珊瑚红直板机。但这两项都属于“官方素材（仅限参考）”，是否直接入站需要你拍板。

## 1. 我实际看过的素材（素材库 `Amadeus-Resonance-Art-References/2026-07-26`）

| # | 素材 | 路径 / 来源 | 看到了什么 | 许可 | 评价 |
|---|---|---|---|---|---|
| 1 | **Re:Boot 实验室背景 02** | `03_reboot/reboot_background_02.jpg`（1600×900，来源 steinsgate.jp/reboot） | 桌面后方铁架上就是**电话微波炉**：灰绿色金属外壳的旧式微波炉，顶部叠着一台带橙色刻度窗、4 个方键、红色开关的仪器盒，右侧有 4 位橙色数字管 + 两个旋钮，炉门窗是深色玻璃，旁边有橙色排插、红黑电线 | official_reference_only（官方，仅供参考） | **原作最准**；暗调、旧、有电线，与本页暗场风格天然一致。缺点：原图里只有约 285×265 像素（见 #2） |
| 2 | 微波炉裁切 ×3 放大 | `assets-candidates/microwave/official-lab-microwave-crop-x3.png`（由 #1 裁出） | 同上，放大后有颗粒感但不糊，作为页面里 ~250px 宽的道具够用；> 400px 会发软 | 同 #1 | 可直接抠图用；需自行做门灯/窗光/数码管点亮叠加（原图的 4 个数码管是 0000，可作为“点亮”的动画落点） |
| 3 | **Re:Boot 触发手机**（官方 UI 图） | `03_reboot/reboot_phone_trigger.png` → 抠白底 `assets-candidates/microwave/official-reboot-phone-trigger-cut.png`（549×1051） | **珊瑚红直板机**（机身约 `#FF636C / #FF5A6B`），顶部黑色桁架天线，蓝灰色（`#3269A9`）标题栏，浅绿 LCD（`#C6E7D6`），银灰色四键金属带（邮件/i/书/相机），下方黑色方向键盘；屏幕显示“已发送短信：桶子 / 大事不好 …” | official_reference_only | 造型最像官方，分辨率足够；注意它是**游戏 Re:Boot 的手机**，不是动画 Okabe 的翻盖机 |
| 4 | 零代手机 | `01_games_original/steinsgate_zero_phone.png`（390×770，已拷 `official-sg0-phone.png`） | 暗红色直板手机，两端有三角形加强件，蓝色主界面 | official_reference_only | 与“电话微波炉”剧情无关（Amadeus 用的是它），仅作 Amadeus 风格参考 |
| 5 | Re:Boot 演示视频帧 | `07_reboot_ui_public_materials/frames/demo_play_00m38s_phone_boot_ui.png` | 街景里的同款珊瑚红直板机（偏橙，约 `#EE5A40`），说明游戏内手机的真实色调随光线偏橙 | official_reference_only | 色彩参考 |
| 6 | 动画里 Okabe 的手机 | 用户视频 `【命运石之门片段】…mp4` 抽帧（`.tmp/wl-tear/e2/`） | 暗室里是**红黑配色翻盖手机**（来自逐帧分析：“人物持红黑手机”）；只有小尺寸、运动中的画面 | 版权素材，仅可作观察 | 没有可用的干净特写，只能当配色参考（红 + 黑） |
| 7 | 已有 Wikimedia 实拍（Daewoo 白色微波炉等） | `assets-candidates/microwave/wm-ccbysa-*.{jpg,webp}` | 现代白色家用微波炉；与原作造型不符（原作是灰绿色旧式机） | CC BY-SA 4.0（可商用，需署名+相同方式共享） | 当前站点用的就是它；**这正是“不像”的原因** |
| 8 | 当前站点：Daewoo 实拍 + CSS 红色翻盖手机 | `assets-candidates/microwave/current-css-phone-microwave.png` | 白色微波炉 + 红色翻盖机 | — | 与原作造型/配色都对不上 |

Wikimedia / 其他 CC 来源里没有找到“带电话线的原作微波炉”现成图片，只有普通复古微波炉。

## 2. 可选方案

### 方案 A（推荐，改动最小）：用官方实验室里的微波炉裁切 + Re:Boot 手机
- 微波炉：`official-lab-microwave-crop-x3.png` 去背景后作为道具；叠加层做“炉灯/窗口发光、数码管点亮、顶部刻度窗橙光”。手机：`official-reboot-phone-trigger-cut.png` 缩小放在炉旁，屏幕保留官方“已发送短信”画面，点击时屏幕亮起。
- 预览（粗略拼合）：`preview-option-A-official-crop-mock.png`。
- 风险：两张图都是官方素材（仅限参考）。这是你的课程作业/非商业展示，通常可接受，但**页面上应注明“图像版权归 5pb./Nitroplus/MAGES. 所有，仅作展示”并在 ASSETS.md 标明**；如果你要公开发布或商用，建议走方案 B。

### 方案 B：GPT 生成原创“致敬款”图片再引用
- 可行性：**可行，质量取决于提示词与多次抽卡**。GPT 图像模型擅长“旧式金属微波炉 + 复古手机”这类硬表面静物，暗调赛博实验室氛围也容易出；弱点是（1）**不保证透明背景**（ChatGPT 网页里通常给的是实底，API 才有真透明）——所以提示词里让它出**纯色背景（#00FF00 或纯中灰）**，我再用 rembg 抠；（2）细节（电话线、小按钮文字）会出错，需要挑图；（3）不可能 1:1 复刻官方设计，会是“风格相近的原创”，反而没有版权顾虑。
- 建议一次让它出 2–4 张候选，我来挑图、抠图、做调色与光效。

### 方案 C：把官方实验室背景整张用作“本章底图”，微波炉做成画面里的热点
- 把 `reboot_background_02.jpg` 作为“双模式/本地”章节的底图，在图中微波炉的位置叠一个点击热点 + 光效（窗口光、数码管点亮），手机以小图叠在旁边。好处是**没有“贴图感”**——它本来就在场景里；坏处是该章其他内容要避开这块区域，且同样是官方素材。

### 是否需要 3D 建模？
**不需要。** 这个道具在页面里只是 ~250px 的静态物件，交互是“点击→炉灯亮、手机屏亮→触发世界线变动”，2.5D（图 + 光效叠层 + 轻微视差）足够。3D（glTF + three.js）会增加体积和加载、还要等你用 GPT/建模工具产出带分件的模型（门、转盘、手机屏要独立节点），收益远小于成本。只有当你想要“可旋转查看”才值得；如果要做，需求清单见 `docs/props-candidates.md` 末尾。

## 3. 可直接复制给 GPT 的提示词（图片）

通用约束（每条都带上）：**单个物体居中、无文字水印、无人物；背景用纯色 #00FF00（绿幕）方便抠图；留出 15% 边距；正方形 1:1，2048×2048；柔和的主光从左上来，暗处有橙色轮廓光；不要出现任何品牌 logo。**

### 变体 1：电话微波炉本体（原作造型致敬，正面略俯）
```
Create a single product-style illustration of a retro 1980s Japanese microwave oven, front view, slightly looking down about 10 degrees, centered, on a solid pure green (#00FF00) background with 15% margin, no text, no logo, no watermark.
Design: grey-green brushed metal body, a dark glass door with a long horizontal handle at the top of the door, on the right a narrow control strip with four small orange glowing numeric tube digits "0000" and two round black rotary knobs. On top of the oven sits a flat electronic instrument box with a long amber scale window with thin grid lines, four square cream-colored buttons and one small red switch. A red and a black cable come out from the right side and hang down.
Style: realistic hand-painted anime background art (like Steins;Gate visual-novel backgrounds), slightly worn and dusty, muted desaturated teal-green colour grading, soft key light from upper left, faint orange rim light, subtle film grain. High resolution, sharp edges for easy cut-out.
```

### 变体 2：同一台微波炉，侧后 3/4 视角（做轻微视差/翻转用）
```
Same retro grey-green 1980s microwave oven with an electronic instrument box on top, three-quarter view from front-left, centered on a solid pure green (#00FF00) background, 15% margin, no text, no logo. Anime visual-novel background-art style, desaturated teal-green metal, dark glass door, small orange numeric tube display and two black knobs on the right, red and black cables. Soft light from upper left, subtle amber rim light. Sharp edges for cut-out.
```

### 变体 3：微波炉门开、内部有暖黄灯（点击后的状态）
```
The same retro grey-green microwave oven, front view, door slightly open (about 20 degrees) showing a warm amber light inside and a small glass turntable, centered on a solid pure green (#00FF00) background, 15% margin, no text, no logo. Anime visual-novel background-art style, desaturated teal-green metal body, orange glow spilling softly onto the front panel. Sharp edges for cut-out.
```

### 变体 4：手机（Re:Boot 珊瑚红直板机，用于叠在微波炉旁）
```
Create a single illustration of a fictional candy-bar mobile phone from a 2010s Japanese visual novel, front view, perfectly straight-on, centered on a solid pure green (#00FF00) background, 15% margin, no text, no logo, no watermark.
Design: coral-red body (about #FF636C), a black steel truss-shaped antenna on top, a small round camera dot and a speaker slot above a 2.4-inch screen with a thin black bezel, the screen shows a pale green LCD message window with a blue title bar and a few unreadable lines of text, below the screen a grey metallic strip with four rectangular icon keys (envelope, "i", open book, camera), below that a black directional-pad panel with a rounded square centre button.
Style: clean 3D-rendered game UI asset, soft studio lighting, subtle reflections, sharp edges.
```

### 变体 5：动画款红黑翻盖手机（Okabe 的手机，备选）
```
A single fictional red-and-black clamshell (flip) mobile phone from the early 2010s, half-open at about 100 degrees, three-quarter view from the front, centered on a solid pure green (#00FF00) background, 15% margin, no text, no logo. Glossy dark-red outer shell with black keypad, small green LCD on the inner screen, a short stub antenna on top. Clean anime-style hard-surface illustration, soft key light from upper left, subtle orange rim light. Sharp edges for cut-out.
```

### 变体 6：一张“微波炉 + 手机 + 电话线”的合成场景（想要一张图搞定时用）
```
A dark cyber-lab still life on a solid pure grey (#808080) background: a retro grey-green 1980s microwave oven (door closed, dark glass, small orange numeric tube digits on the right, a flat instrument box with an amber scale window on top) standing on a worn wooden shelf, with a coral-red candy-bar mobile phone (black truss antenna) standing in front of it on the shelf, connected to the microwave by a thin black coiled cable. Wide shot, 16:9, slightly low camera angle. Anime visual-novel background-art style, muted teal-green and amber colour grading, soft light from upper left, faint orange rim light, film grain. No text, no logo, no people.
```

交付要求给 GPT：每个变体出 2 张；PNG；不要压缩；如果可以请直接给透明背景 PNG（ChatGPT 里说“透明背景”，不一定成功，不行就保持绿幕）。

## 4. 我的建议
1. **先用方案 A 出一版**（官方微波炉裁切 + Re:Boot 手机，加署名/版权说明），观感最接近原作，也最省事；
2. 如果你觉得官方图不能入站，就用上面的变体 1/3/4 让 GPT 出图，我抠图后替换（不需要 3D）；
3. 方案 C 作为“更有环境感”的升级项，可以之后再做。

> 说明：我没有在页面里替换任何东西，当前站点仍是第五轮的 CSS 手机 + Wikimedia 微波炉。
