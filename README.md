# Amadeus-Resonance 宣传页

课堂展示用的纯前端单页，Vite + 原生 JavaScript + E-mote WebGL。产品仍在开发中；这里的文字、人物与世界线交互用于介绍项目，没有接入真实对话、语音或用户数据。

接手与当前状态见 [HANDOFF.md](HANDOFF.md)，素材来源见 [ASSETS.md](ASSETS.md)，文案与字体修改见 [docs/copy-revision.md](docs/copy-revision.md)。

## GitHub Pages 发布

Owner 于 2026-10-12 明确选择完整效果公开展示，允许访客下载模型、SDK 和原声；这些大素材仍不进入 Git 历史。本次发布决定替代下方历史记录中的“仅本机展示”范围，不表示取得新的第三方素材许可；来源与署名保留在 `ASSETS.md`。

- 网站：<https://perpperqaq.github.io/amadeus-resonance-promo-site/>
- 仓库：<https://github.com/PerpperQAQ/amadeus-resonance-promo-site>
- 开发保留在本地 `main`。提交后运行 `npm run deploy`，将当前源码快照推送到远程 `pages-source`；Actions 随后自动构建并发布，也可在 Actions 中手动执行。发布快照排除历史截图和未采用候选图，本地提交历史保留；`deployment-source.json` 记录对应本地提交。
- 模型、SDK、原声保存在 Release `runtime-assets-r10-v1` 的 `runtime-assets.tar.gz` 附件。Actions 下载到 `public/`，按 `scripts/pages-assets.json` 校验文件大小和 SHA-256，再构建并核验 `dist/`。附件不进入 Git 历史。
- 本地检查：`node scripts/verify-pages-assets.mjs public && npm run build && node scripts/verify-pages-assets.mjs dist`。`base: './'` 支持 Pages 仓库子路径。
- 素材更新时创建新版本 Release 附件，更新校验清单中的版本、大小及哈希后推送；不要覆盖旧附件或强制把素材加入 Git。源码/文案更新提交到本地 `main` 后运行 `npm run deploy`；不要把完整截图历史作为 Pages 源码推送。

## 启动与构建

```bash
npm install
npm run dev            # 默认 http://127.0.0.1:5287
npm run build          # 输出 dist/
npm run preview        # 默认 http://127.0.0.1:5287，读取 dist/
```

本机已经有两个原有服务，可以直接复用：

- [课堂预览](http://localhost:5287)：生产构建。修改源码后执行 `npm run build` 再刷新。
- [开发预览](http://127.0.0.1:5290)：开发服务器，会随源码更新。

默认使用 `strictPort`，端口被占用时会退出。如果需要另开服务，先检查端口，再用 `npx vite --host 127.0.0.1 --port 5291 --strictPort` 等未占用端口；不要关闭其他项目的服务。旧 `scripts/serve-bg.sh` 是此前的启动辅助脚本，已有服务时无需再运行。

## 页面与操作

八章：序 → 定位 → 双模式 → 边界 → 表演 → 本地 → 路线 → 终。

- 开屏：CG 铺满窗口，橙色辉光数字与暖橙世界线并行播放。数字锁定后左上 Logo 出现，线条汇聚后继续流动。悬停入口解码出 `El Psy Kongroo`，点击或 Enter 进入。加载中显示进度；失败或超时允许以静态立绘进入。
- 导航：底部 34px 窄条，一条近水平主线；白色进度点左侧有一条从上方并入的“过去”分支、右侧有一条向下分出的“未来”分支（都很淡），主线下方是变动率表式短刻度，章节处为长刻度。白点从左向右，八个小节点可点击或键盘聚焦。左下为无管壳的橙色辉光页码。
- 左上“开发中”：小齿轮 + 闪烁字样 + 迷你世界线变动率读数（A 1.048596 / B 0.571024）。每章标题上方有“REPORT 0x · 地点 · 日期 · WL 读数”的实验报告式抬头。
- 人物：真实 SDK 在本页 Canvas 渲染 PSB。点击人物随机换表情与动作；切章会走位与换表演。路线章人物离场时停止渲染，页面隐藏时也暂停。
- 双模式：大字切换“日常陪伴 / VN 陪玩”；方向键也可切换。
- 记忆边界：记忆盘（雷达扫描）——中心是确定记得的，外圈依次为观测、既视感、禁止的全知。点击、悬停或键盘操作每一圈查看说明。
- 表演：点“字”人物身边打出字幕；点“声”播放红莉栖原声并口型同步（不出字幕）；点“形”按时间点切换表情/动作，同时出日中字幕与原声。重复点击会取消上一次；离开本章、页面隐藏或世界线变动时停止。
- 本地运行：底图为柳林神社（IBM 5100 的存放处），IBM 5100 缩小后落在狐狸石像基座前。点击三个服务名称，道具上的文字随之变化，只是介绍性动画。
- 路线：节点之间连线已恢复——已完成段实线发光并有流光、当前节点辉光、未完成段虚线暗色。
- 彩蛋：点击电话微波炉或按 `D`，触发空间撕裂、数字跳变和文字重组，切换白大褂 / 外套模型与 A/B 文案。B 世界线配色为琥珀主色 + 淡紫辅色（不再是青色）。演出期间重复触发会被忽略。
- 结尾：读数仪可点击；“回到开头”回到第一章。

`?wl=b` 仅增加开屏线条密度，仍是暖橙色；与 `D` 触发的 B 世界线不同。`?autoenter` 是截图调试用的自动进入参数，正常课堂展示不加。

## 本机资源

资源路径和处理方式集中记录在 `ASSETS.md`。原件保持不变。

外套 PSB 约 205MB，白大褂 PSB 约 212MB，首次进入只载入当前模型，换世界线时载入另一套。表演章语音 `public/audio/kurisu-crs_*.m4a` 同样不进 Git，构建时由 Vite 复制到 `dist/audio/`。两套模型现在都是项目内的真实文件：接手时已将白大褂模型的符号链接替换成经 SHA-256 核对的本地副本，原资源未改。换机器时请复制整个项目（含 `public/models/` 和 `public/vendor/emote/`）；仅克隆 Git 不会取得被忽略的私有模型与 SDK。

标题使用站酷小薇体，重点词用 Noto Serif SC，正文用 Noto Sans SC，英文标注用 Barlow Condensed / Share Tech Mono；均以内置 WOFF2 加载。修改文案后可运行 `python3 scripts/build-fonts.py` 重做子集（需要 `.tmp/fonts/` 源字体和 Python fontTools / Brotli）；正常启动、构建无需运行字体脚本。

## 验证

```bash
npm run test:e2e
# 单分辨率完整交互与失败路径；额外的 lite 换线会在指定次数之外再做一次
SHOT_DIR=output/playwright/check REPORT=output/playwright/check.json \
  node scripts/e2e.mjs --res=1440x900 --shifts=2
# 只运行主流程，可用于其他桌面尺寸；不重复慢加载和失败注入
SHOT_DIR=output/playwright/check-1920 REPORT=output/playwright/check-1920.json \
  node scripts/e2e.mjs --res=1920x1080 --core-only --noshift
# 实际文字/控件的边界、8 个尺寸、返回、离场暂停及 B 世界线排版
node scripts/verify-layout.mjs
# 两种开屏密度 × 八种尺寸的路径与汇聚点检查
node scripts/check-worldlines.mjs
# 同时阻断 CG/模型，再通过页面重试按钮恢复真实模型
node scripts/verify-recovery.mjs
# 定向检查八种入场、连续换页、离场暂停、黑场载入及下载失败回退
node scripts/verify-performance.mjs
# 真实后台标签页缩放/返回（会打开独立 Chrome；默认 macOS，可用 CHROME_BIN 指定）
node scripts/verify-visibility.mjs
# 第十轮截图：八章 × A/B，含记忆盘与字/声/形演出状态
node scripts/cap-r10.mjs docs/screenshots/r10 1440 900 --world=ab
# 性能采样：相同窗口/像素密度、串行运行，避免浏览器互相争用 GPU
PERF_OUT=output/playwright/performance/sample node scripts/profile-performance.mjs
PERF_RES=1920x1080 PERF_DPR=2 NO_SHIFT=1 PERF_OUT=output/playwright/performance/retina \
  node scripts/profile-performance.mjs
```

测试使用本机 Chrome；默认无头、真实 GPU。`HEADFUL=1` 可打开测试浏览器，`SOFT=1` 可使用软件渲染。每份 JSON 仅记录本次运行，不混入旧结果。最新已完成检查见 `HANDOFF.md`。

## 限制

- CG 原图为 1672×941，章节底图约 1600px 宽。去黑边通过满屏 `cover` 和一致画幅完成，没有生成新画面或补出更高分辨率的细节；超宽、竖向窗口会裁掉部分画面，大屏仍受原图清晰度限制。
- 模型加载较重；动态表现取决于浏览器、GPU 和本机负载。首次下载与解析期间应等待入口就绪。换装时先下载，再在黑场中同步解析与上传纹理；SDK 的同步开销仍然存在。排查方法、前后数据及保留边界见 [性能记录](docs/PERFORMANCE_REVIEW_2026-10-11.md)。
- 音乐尚未接入。表演章的两段语音是游戏原声（见 `ASSETS.md`），放在 `public/audio/` 且被 Git 忽略；缺失时按钮显示“语音素材待补”，不会伪造声音。本页不播放真实 TTS。
- 游戏美术与模型仅用于本机课堂展示；保留既有素材来源与署名。E-mote 与旧 Live2D 资源体系不混用。
- 本项目与正式 Amadeus 工程分离，不代表正式产品的阶段验收、后端接入或发布。

历次视觉研究保留在 `docs/round*-progress.md`、`docs/boot-assessment.md`、`docs/worldline-reference.md`；它们是历史记录，当前实现以源码及交接文档为准。
