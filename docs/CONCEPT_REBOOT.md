# 概念稿：RE:BOOT 式长页（reboot-white / reboot-dark / reboot-hybrid）

预览级。三个页面由同一个模板生成（`src/reboot/page.template.html` → `node scripts/build-reboot-pages.mjs`），共用 `src/reboot/reboot.js` / `reboot.css`，差别只在 `body[data-variant]` 的色板与舞台处理：
- **white**：白色纸面；黑色字幕条 / 按钮 / 目录；角色模块也在白底上；首屏文字放在白色卡片里。
- **dark**：同样的模块，整页暗色剧场色板（cinema 的观感），角色模块垫一层压暗的实验室原画。
- **hybrid**：白色文档；首屏与 CHARACTER 是暗场（满幅暗色 + 上下黑边画幅），作为“换场”。

模块顺序（参考 RE:BOOT 宣传页的结构与交互逻辑，自写代码）：TOP → NEWS（开发日志）→ INTRODUCTION（字幕条标题 + ruby、两行介绍、FEATURE 001–004）→ STORY（项目缘起）→ CHARACTER（唯一出现 E-mote 模型：靠近才载入，离开视口暂停；8 个状态缩略图 + ←→，点击时章节顶部平滑滚入视口）→ SYSTEM（本地三层服务，点击换截图）→ GALLERY（大图交叉淡化 + 缩略图条，点击打开大图浮层，✕ / Esc 关闭）→ PRODUCT（获取方式：macOS / Windows / 配置要求 页签）→ FOOTER。
全局：齿轮加载器 → 一次淡入；右上角 GitHub + 目录黑块（滚过首屏后固定）；全屏目录（两列英文 + 中文）、平滑滚动、Esc、背后 inert；入场只有黑块遮罩退去与英文标题 0/1 解码；首屏原画视差。世界线：角色模块里的 α/β 按钮或 D 键（模型换白大褂、原画染淡紫）。

真实数据来源：
- 开发日志三条取自主项目 `amadeus-system-new` 的 git 历史与阶段索引：`78fd9c6` 2026-07-27 “feat(stage8): complete daily stage and overlay controls”；`1efd26a` 2026-07-14 “feat(vn): complete stage 6.26d performance director”；`docs/PROJECT_STAGE_PROGRESS.md` 阶段索引 “VN/Emote 后继完整双包 2026-09-26 both_offline_accepted_with_limits”。
- 特性 / 系统 / 获取方式文字取自主项目 `README.md`（两种核心模式、三服务端口 5173/3002/8001、Node.js 20 或 22 + npm 10、Python 3.10、macOS 或 Windows、不提供模型服务或 API Key、暂无经过验收的预编译客户端）与 `docs/PROJECT_STAGE_PROGRESS.md`（记忆与 VN 状态分离、原始截图默认不持久化）。
- 界面截图来自主项目验收记录 `artifacts/wp8-8/frontend-acceptance/`、`artifacts/wp8-6/frontend-daily/`、`artifacts/frontend-boot-logo-20260907/`（见 ASSETS.md）。

自检：`node scripts/cap-reboot.mjs <white|dark|hybrid> [w] [h] [--b]`（19 项检查 + 截图）。截图：`docs/screenshots/concept-reboot/{white,dark,hybrid}/`。
