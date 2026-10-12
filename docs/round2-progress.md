## 进度 10-10 23:16
- 已落地：新 index.html/style.css/main.js 及 boot/nixie/props/cipher/cursor/rail/halo/shift 模块（在 box 上完成并同步），背景图 16 张，E-mote 动作库(含抱臂)与 labcoat 备用模型。
- 待办：logo 齿轮图层、透明降级图、字体重裁、Mac 完整 e2e、文档。
- 23:26 已 build：新页面+logo 图层+透明降级图+字体重裁；下一步在 Mac 上跑 e2e
- 23:35 修复：点击人物被正文层挡住（改全局命中框）、IBM 解码等待；1440 首轮通过其余项；已启动四分辨率全量 e2e（.tmp/e2e-all.log）
- 23:57 第二次全量 e2e 已启动（首轮仅『连点节流』断言因慢机时序误报，已改为按耗时判定+同刻连发断言）；已修首屏标题折行、IBM 与人物重叠
- 10-11 08:54 重新 build（含本地章标题不折行/540px 列），启动最终全量 e2e
- 10-11 10:05 已重新 build（含 ≤1100px 本地章 IBM 缩小/左列 400px）；5287 返回 200；08:54 那轮四分辨率『全部通过』(log: .tmp/e2e-run3-pass.log)
