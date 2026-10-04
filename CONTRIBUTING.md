# 贡献指南

感谢你愿意为「星际快递员」出力！这是一个零依赖的小型项目，贡献门槛很低。

## 项目原则

在提 PR 之前，请先认同这几条，它们决定了这个项目的方向：

1. **零依赖**：不引入任何运行时或构建期依赖，不使用打包器。克隆下来就能直接玩。
2. **零外部资源**：不加载 CDN 上的字体、脚本、图片。断网状态下游戏必须完整可玩。
3. **纯静态**：用浏览器直接打开 `index.html` 就能运行，不需要起服务器。
4. **改动最小**：保持 `index.html` 简洁，别把简单的事情复杂化。

## 本地运行

```bash
git clone https://github.com/wulier-arch/interstellar-courier.git
cd interstellar-courier

# 方式一：直接双击 index.html
open index.html

# 方式二：起个本地服务器（推荐，便于调试）
python3 -m http.server 8000
# 然后访问 http://localhost:8000
```

## 提交前必须通过的自检

```bash
node --check assets/js/game.js          # 渲染与输入层语法
node --check assets/js/game-core.js     # 纯逻辑层语法
node --check assets/js/game-audio.js    # 音效层语法
node --test tests/game-core.test.mjs    # 逻辑层单元测试
node --test tests/game-audio.test.mjs   # 音效层单元测试
node scripts/check-project.mjs          # 结构 / 零依赖 / 必需文件 / 体积预算
```

以上全部零依赖，也正是 CI 会在每次 push 和 PR 上执行的检查，本地跑通再提交能省一轮往返。
（CI 另外还会确认仓库里没有 `package.json` / `node_modules`，以及关键文件都已纳入版本管理。）

## 提 Issue

请先搜索是否已有同类 Issue。提交时尽量提供：

- 你的浏览器与操作系统版本
- 复现步骤
- 控制台报错截图（如果崩溃）
- 是否在手机 / 平板上出现

## 提 Pull Request

1. 从 `main` 切出特性分支：`git checkout -b feat/your-feature`
2. 只提交一个逻辑变更，方便评审
3. 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)：

   ```
   feat: 增加最高分本地记录
   fix: 修复移动端方向键失灵
   docs: 补充玩法说明
   chore: 整理项目结构
   ```

4. 确认 `node scripts/check-project.mjs` 通过
5. 在 PR 描述里说明「改了什么」和「为什么」，最好附上截图或 GIF

## 代码风格

- 缩进 2 个空格，行尾 LF，文件末尾保留换行（详见 `.editorconfig`）
- CSS 与 JS 沿用现有写法：CSS 用短横线类名，JS 用 `const` / 箭头函数
- 提交前用编辑器的格式化功能整理一遍，不要在 PR 里混入无关的格式化改动

## 行为准则

参与即表示同意 [行为准则](CODE_OF_CONDUCT.md)。

## 许可

提交贡献即表示你同意你的作品按 [MIT 协议](LICENSE) 授权。
