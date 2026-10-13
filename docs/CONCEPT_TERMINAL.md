# Amadeus 终端 · 概念稿（已暂停）

状态：2026-10-12 11:00（Asia/Shanghai）按用户要求**暂停视觉设计**，等待新的方向（可能融合 steinsgate.jp 与 moontide-demo）。本分支只保留可运行的基础设施与一版初稿，不代表定稿。

## 现有基础设施
- 分支 `concept/terminal`（基于 main `bc1e69c`，含 94e77f6 第十轮与之后的 Pages 部署提交）；main 未改动。
- 入口 `terminal.html` + `src/term.js` + `src/term.css`；旧站 `index.html` 不受影响。`vite.config.js` 增加多页构建（main + terminal）。
- 开发预览：`npx vite --host 127.0.0.1 --port 5291 --strictPort` → http://127.0.0.1:5291/terminal.html （5287 / 5290 未动）。
- 复用 `src/emote-stage.js`（真实 E-mote 模型、表情、动作、视线、机位缓动 `setView`、换装 `swap`）、齿轮 Logo、本地字体（`scripts/build-fonts.py` 已加入 `terminal.html` 扫描）、原 CG（作为记忆碎片 / 观测帧）。
- `?wl=b` 直接载入白大褂模型；`D` 键运行时切换世界线。
- 截图脚本 `scripts/cap-terminal.mjs <目录> <宽> <高> [--b] [--mem] [--shift]`；测试钩子 `window.__term`。

## 初稿内容（仅供参考）
- 首屏“会话”：标题 + 她的一句话 + 本页真实运行状态控制台（模型/表情/视线/fps）。
- 记忆屏：四层知识来源（亲历/所见/既视感/禁区）点击读取，示例记忆 I/O 日志滚动，人物表情动作随之变化，CG 以观测帧短暂出现；人物机位推近。
- 截图：`docs/screenshots/concept-terminal/`。
