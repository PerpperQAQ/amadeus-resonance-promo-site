# 第四轮进度
- [x] 5 道具改实拍图：IBM 5100（屏幕叠加 APL 解码文本+辉光）、微波炉（门窗/炉灯/显示/手机叠加，“叮”）、GN-4 辉光管读数仪（结尾章）；页面署名；ASSETS/README 更新。→ build ✔ 截图 `docs/screenshots/r4/props-*.png`
- [x] 1 底图：build-images.py 调弱（dim .97/gamma 1/sat 1），`.bgl.on` 不透明度 .66→.96，tint/vig 减弱，新增 `.fx-pad` 局部垫底。
- [x] 视频实看：ffmpeg 抽帧 6 段（`.tmp/wl-frames/`），结论写入 `docs/worldline-reference.md` §5。
- [x] 2 开屏辉光管（`src/tube.js`）+ 世界线变动演出重做（`src/shift.js`）。→ 帧序列 `.tmp/shift-frames/`，代表帧 `docs/screenshots/r4/shift-*.jpg`
- [x] 4 世界线条：`src/waves.js` + `src/rail.js`，110px 波带。→ `docs/screenshots/r4/rail-*.png`
- [x] 3 切章表情+动作：`performance_` 重写（联动换场方式、不重复、可补发），e2e 增加检查。
- [ ] 四分辨率 e2e

## 修正小轮（逐帧研究）
- 底部世界线重写为 `src/wlines.js`：黑底带 + 细长线条 + 大小远近不一的白色发光节点；线条色按章节底图渐变（用户允许不用原图蓝色）；章节节点可点击；进度沿串联曲线点亮；切章涟漪。原图仅造型参考、未嵌入；运动为视觉近似。
- 世界线变动 `src/shift.js` 重写为统一时间轴（冲糊→青绿/暗色→竖糊→黑帧+深蓝长波→橙色整组乱数→锁定→收线→黑场换世界线），四种变体轮换；`Meter` 整组跳变；`waves.js` 仅保留 `Scope`（深蓝长波）。
- 辉光管：八个管位、独立小数点、细线曲线数字、橙色分层辉光（开屏/变动共用）。
- docs/worldline-reference.md §6 已更新；README 同步。
- 四分辨率 e2e：全部通过（日志 .tmp/e2e-r4.log，220 项 ✓）。截图：docs/screenshots/r4/rail-*.png、shift-sheet-r4.jpg、shift-sheet-early-r4.jpg、boot-sheet-r4.jpg。
