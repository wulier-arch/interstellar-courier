# 更新日志

本项目的版本记录遵循 [语义化版本](https://semver.org/lang/zh-CN/)（SemVer）。

## [未发布]

### 计划中

- 最高分本地持久化（`localStorage`）
- 移动端横屏提示与更细腻的触屏操控
- 音效开关（默认关闭，不引入外部音频资源）
- 无障碍增强：完整键盘焦点管理与屏幕阅读器实时播报

## [1.0.0] - 2026-10-02

### 新增

- 首个可玩版本：Canvas 2D 渲染的太空躲避游戏
- 星星收集计分与三艘飞船的失误机制
- 陨石生成、撞击后短暂无敌与闪烁反馈
- 键盘（方向键 / WASD）与触屏双套操作方式
- `Esc` 暂停与继续
- 基于 `devicePixelRatio` 的高分屏适配，窗口缩放自动重算画布
- 响应式布局，适配桌面与移动端

### 工程化

- 拆分内联样式与脚本为 `assets/css/style.css`、`assets/js/game.js`
- 补充 `LICENSE`、`CONTRIBUTING`、`CODE_OF_CONDUCT`、`SECURITY` 与更新日志
- 引入 GitHub Actions 持续集成：JS 语法检查、HTML 规范校验、零外部资源校验

[未发布]: https://github.com/wulier-arch/interstellar-courier/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/wulier-arch/interstellar-courier/releases/tag/v1.0.0
