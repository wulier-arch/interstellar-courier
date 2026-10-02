# 星际快递员 · Interstellar Courier

> 驾驶一艘小小的星际快递船，在流星雨中收集星星、躲避陨石。
> 一个零依赖、打开浏览器就能玩的迷你太空躲避游戏。

[![License: MIT](https://img.shields.io/badge/License-MIT-a48aff.svg)](LICENSE)
[![CI](https://github.com/wulier-arch/interstellar-courier/actions/workflows/ci.yml/badge.svg)](https://github.com/wulier-arch/interstellar-courier/actions/workflows/ci.yml)
[![无构建步骤](https://img.shields.io/badge/build-none-4ec9a0.svg)](#-特点)
[![无外部依赖](https://img.shields.io/badge/dependencies-0-4ec9a0.svg)](#-特点)

---

## 🎮 快速开始

无需安装任何东西，二选一：

```bash
# 方式一：直接用浏览器打开
open index.html

# 方式二：起一个本地服务器（调试时更方便）
python3 -m http.server 8000
# 浏览器访问 http://localhost:8000
```

点击「开始送快递」即可开玩。

## 🕹️ 玩法

| 操作 | 按键 |
| --- | --- |
| 移动 | `←` `↑` `↓` `→` 或 `W` `A` `S` `D` |
| 暂停 / 继续 | `Esc`（再点按钮继续） |
| 触屏移动 | 屏幕下方的方向按钮 |

- ✦ **收集星星**加分
- ☄ **撞到陨石**会损失一艘飞船，共 3 艘
- 撞到陨石后有短暂无敌时间，期间飞船会闪烁
- ⚡ **难度递增**：60 秒内从 1 级拉满到 5 级，陨石越来越密、越来越快
- 🏆 **最高分自动保存**，破纪录时会有提示

## ✨ 特点

- **零依赖、零构建**：只有原生 HTML / CSS / JavaScript，没有 `node_modules`，没有打包器
- **零外部资源**：不加载任何 CDN，断网也能完整游玩
- **高分屏适配**：按 `devicePixelRatio` 渲染，缩放窗口自动重算画布
- **响应式**：同一套代码适配桌面与手机平板
- **逻辑可测**：游戏逻辑抽到 `game-core.js`，配 31 个零依赖单元测试
- **无障碍基础**：语义化标签、`aria-label`、键盘可操作

## 📁 项目结构

```
interstellar-courier/
├── index.html              # 页面骨架
├── assets/
│   ├── css/style.css       # 全部样式
│   └── js/
│       ├── game-core.js    # 纯逻辑层：碰撞、难度、存档（无 DOM 依赖，可单测）
│       └── game.js         # 渲染、输入与界面驱动
├── tests/
│   └── game-core.test.mjs  # 单元测试（Node 内置 test runner，零依赖）
├── scripts/
│   └── check-project.mjs   # 零依赖项目自检脚本
├── .github/
│   ├── workflows/ci.yml    # 持续集成
│   ├── ISSUE_TEMPLATE/     # Issue 表单
│   └── PULL_REQUEST_TEMPLATE.md
├── .editorconfig           # 统一缩进与换行
├── .gitattributes          # 统一 LF 换行
├── CHANGELOG.md            # 更新日志
├── CODE_OF_CONDUCT.md      # 行为准则
├── CONTRIBUTING.md         # 贡献指南
├── LICENSE                 # MIT
└── SECURITY.md             # 安全政策
```

## 🛠️ 本地自检

```bash
node --check assets/js/game.js      # JS 语法检查
node --check assets/js/game-core.js # 纯逻辑层语法检查
node --test tests/game-core.test.mjs # 单元测试（31 个用例）
node scripts/check-project.mjs      # 结构、依赖、必需文件自检
```

以上全部零依赖，也是 CI 在每次 push / PR 上执行的检查。

## 🧱 技术实现

- **渲染**：Canvas 2D，`requestAnimationFrame` 驱动，每帧按 `dt`（上限 40ms）做时间步进，
  低帧率设备上也不会「瞬移」
- **碰撞**：圆形距离判定，星星与陨石各用半径数组
- **输入**：键盘事件写入 `Set`，触屏按钮用 Pointer Events 统一处理
  （`pointerup` / `pointercancel` / `lostpointercapture` 三路释放，避免拖拽后按键卡住）
- **状态**：`running` 标志与遮罩层驱动运行、暂停、结束三种界面

## 🤝 参与贡献

欢迎提 Issue 和 PR，详见 [贡献指南](CONTRIBUTING.md)。
参与即表示同意 [行为准则](CODE_OF_CONDUCT.md)。

## 📄 许可

[MIT](LICENSE) © 2026 wulier-arch
