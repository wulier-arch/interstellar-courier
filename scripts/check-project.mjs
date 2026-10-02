/**
 * 项目自检脚本 —— 零依赖，运行方式：node scripts/check-project.mjs
 *
 * 校验内容：
 *   1. index.html 引用的本地资源（link/script/img）是否都真实存在
 *   2. 项目是否仍然保持「零外部依赖」（不得引用任何 http(s) 资源）
 *   3. 治理类文件是否齐全
 *   4. index.html 是否还残留内联 <style> / <script> 块
 *
 * 退出码 0 表示全部通过，1 表示存在错误。
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warnings = [];

const read = (rel) => readFileSync(resolve(root, rel), "utf8");

// 1. index.html 引用的本地资源是否存在
//    只检查会真正发起网络请求的标签；canonical、license 等纯元信息不计入「零外部依赖」
const html = read("index.html");
const resourceTags = /<(script|link|img|iframe|source|video|audio|embed|object)\b([^>]*)>/gi;
const refPattern = /(?<![\w-])(?:src|href)\s*=\s*"([^"]+)"/gi;
const nonResourceRels = new Set([
  "canonical", "alternate", "author", "license", "next", "prev", "search",
]);

for (const tag of html.matchAll(resourceTags)) {
  const tagName = tag[1].toLowerCase();
  const attrs = tag[2] || "";

  if (tagName === "link") {
    const rel = (attrs.match(/rel\s*=\s*"([^"]*)"/i) || [])[1] || "";
    const tokens = rel.toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.some((token) => nonResourceRels.has(token))) continue;
  }

  for (const attr of attrs.matchAll(refPattern)) {
    const ref = attr[1];
    if (/^(https?:)?\/\//.test(ref)) {
      errors.push(`index.html 的 <${tagName}> 引用了外部资源：${ref}`);
      continue;
    }
    if (/^(data:|mailto:|#|\{\{)/.test(ref)) continue;
    if (!existsSync(resolve(root, ref))) {
      errors.push(`index.html 引用的资源不存在：${ref}`);
    }
  }
}

// 2. 样式与脚本中不得出现外部资源
for (const rel of ["assets/css/style.css", "assets/js/game.js"]) {
  const body = read(rel);
  for (const match of body.matchAll(/url\(\s*['"]?(https?:)?\/\/[^)'"]+/g)) {
    errors.push(`${rel} 引用了外部资源：${match[0]}`);
  }
}

// 3. 治理文件齐全
const required = [
  "README.md",
  "LICENSE",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "SECURITY.md",
  ".gitignore",
  ".editorconfig",
  "assets/js/game-core.js",
  "assets/js/game-audio.js",
  "tests/game-core.test.mjs",
  "tests/game-audio.test.mjs",
];

// 6. 体积预算：守住「零依赖、小体量」的承诺，防止意外引入大文件
const budgets = [
  { file: "assets/js/game-core.js", limit: 6 * 1024 },
  { file: "assets/js/game-audio.js", limit: 6 * 1024 },
  { file: "assets/js/game.js", limit: 16 * 1024 },
  { file: "assets/css/style.css", limit: 10 * 1024 },
  { file: "index.html", limit: 10 * 1024 },
];

for (const { file, limit } of budgets) {
  const full = resolve(root, file);
  if (!existsSync(full)) {
    errors.push(`体积预算检查的文件不存在：${file}`);
    continue;
  }
  const size = statSync(full).size;
  const kb = (size / 1024).toFixed(1);
  if (size > limit) {
    errors.push(`${file} 体积 ${kb}KB 超出预算 ${(limit / 1024).toFixed(0)}KB`);
  } else {
    console.log(`  体积 ${file}: ${kb}KB / 预算 ${(limit / 1024).toFixed(0)}KB`);
  }
}
for (const rel of required) {
  if (!existsSync(resolve(root, rel))) errors.push(`缺少必需文件：${rel}`);
}

// 4. 不应残留内联样式 / 脚本块
if (/<style[\s>]/.test(html)) warnings.push("index.html 仍包含内联 <style> 块");
if (/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/.test(html)) {
  warnings.push("index.html 仍包含内联 <script> 块");
}

// 5. 所有 JS 文件语法自检由 node --check 负责，这里只确认文件非空
for (const rel of ["assets/js/game.js", "assets/css/style.css"]) {
  if (read(rel).trim() === "") errors.push(`${rel} 内容为空`);
}

// 输出
for (const w of warnings) console.warn(`⚠️  警告：${w}`);
for (const e of errors) console.error(`❌ 错误：${e}`);

if (errors.length === 0) {
  console.log("✅ 项目自检通过");
  process.exit(0);
}
console.error(`\n共 ${errors.length} 个错误。`);
process.exit(1);
