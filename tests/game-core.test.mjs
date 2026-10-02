/**
 * game-core 纯逻辑单元测试
 *
 * 运行：node --test tests/
 * 用 Node 内置 test runner，零第三方依赖。
 * 通过 vm 加载传统 <script>，与浏览器里保持同一套加载方式。
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { createContext, runInContext } from "node:vm";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(resolve(ROOT, "assets/js/game-core.js"), "utf8");

function loadCore() {
  const sandbox = createContext({});
  runInContext(source, sandbox, { filename: "game-core.js" });
  return sandbox.GameCore;
}

const core = loadCore();

/**
 * vm 沙箱与宿主 realm 的 Object.prototype 不同，
 * 直接 deepStrictEqual 会因原型不一致而失败，这里把两侧都转成宿主普通对象。
 */
function same(actual, expected) {
  const plain = (value) => JSON.parse(JSON.stringify(value));
  return assert.deepEqual(plain(actual), plain(expected));
}

/** 内存版 localStorage，可模拟抛错 */
function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    raw: map,
  };
}

describe("模块加载", () => {
  it("挂载到全局 GameCore", () => {
    assert.ok(core, "GameCore 未挂载");
    assert.equal(typeof core.difficultyAt, "function");
  });

  it("不泄漏到 Node 全局", () => {
    assert.equal(globalThis.GameCore, undefined);
  });
});

describe("clamp", () => {
  it("限制在区间内", () => {
    assert.equal(core.clamp(5, 0, 10), 5);
    assert.equal(core.clamp(-3, 0, 10), 0);
    assert.equal(core.clamp(99, 0, 10), 10);
  });

  it("NaN 退回下限，无穷数取对应边界", () => {
    assert.equal(core.clamp(NaN, 2, 8), 2);
    assert.equal(core.clamp(Infinity, 2, 8), 8);
    assert.equal(core.clamp(-Infinity, 2, 8), 2);
  });
});

describe("difficultyAt 难度曲线", () => {
  it("起点为最低难度", () => {
    const d = core.difficultyAt(0);
    assert.equal(d.level, 1);
    assert.equal(d.ramp, 0);
    assert.equal(d.meteorInterval, 0.95);
    assert.equal(d.meteorSpeedBonus, 0);
  });

  it("难度随时间单调递增", () => {
    let prevInterval = Infinity;
    let prevBonus = -1;
    for (const t of [0, 10, 20, 30, 45, 60, 120, 999]) {
      const d = core.difficultyAt(t);
      assert.ok(d.meteorInterval <= prevInterval, `t=${t} 生成间隔未递减`);
      assert.ok(d.meteorSpeedBonus >= prevBonus, `t=${t} 速度加成未递增`);
      prevInterval = d.meteorInterval;
      prevBonus = d.meteorSpeedBonus;
    }
  });

  it("60 秒封顶后保持满难度", () => {
    const at60 = core.difficultyAt(60);
    const at999 = core.difficultyAt(999);
    same(at60, at999);
    assert.equal(at60.level, 5);
  });

  it("负数时间等同起点", () => {
    same(core.difficultyAt(-10), core.difficultyAt(0));
  });
});

describe("nextMeteorInterval", () => {
  it("random 可注入，结果确定", () => {
    assert.equal(core.nextMeteorInterval(0, () => 0), 0.95 * 0.75);
    assert.equal(core.nextMeteorInterval(0, () => 1), 0.95 * 1.25);
  });

  it("有下限保护，难度再高也不会瞬间刷屏", () => {
    assert.ok(core.nextMeteorInterval(9999, () => 0) >= 0.22);
  });

  it("结果始终为正", () => {
    for (const t of [0, 30, 60, 200]) {
      assert.ok(core.nextMeteorInterval(t) > 0);
    }
  });
});

describe("circlesOverlap 碰撞判定", () => {
  const a = { x: 0, y: 0, radius: 10 };

  it("重叠时为 true", () => {
    assert.equal(core.circlesOverlap(a, { x: 15, y: 0, radius: 10 }), true);
  });

  it("分离时为 false", () => {
    assert.equal(core.circlesOverlap(a, { x: 100, y: 0, radius: 5 }), false);
  });

  it("恰好相切不算命中", () => {
    assert.equal(core.circlesOverlap(a, { x: 20, y: 0, radius: 10 }), false);
  });

  it("scale 可收紧判定范围", () => {
    const b = { x: 18, y: 0, radius: 10 };
    assert.equal(core.circlesOverlap(a, b), true);
    assert.equal(core.circlesOverlap(a, b, 0.5), false);
  });
});

describe("normalizeDirection 方向归一化", () => {
  it("单方向长度保持为 1", () => {
    same(core.normalizeDirection(1, 0), { x: 1, y: 0 });
  });

  it("斜向不会加速", () => {
    const d = core.normalizeDirection(1, 1);
    assert.ok(Math.abs(Math.hypot(d.x, d.y) - 1) < 1e-12);
describe("最高分读写", () => {
  it("空存储返回 0", () => {
    assert.equal(core.readBestScore(fakeStorage()), 0);
    assert.equal(core.readBestScore(null), 0);
  });

  it("可写入并读回", () => {
    const s = fakeStorage();
    core.writeBestScore(s, 42);
    assert.equal(core.readBestScore(s), 42);
  });

  it("脏数据安全降级为 0", () => {
    assert.equal(core.readBestScore(fakeStorage({ [core.STORAGE_KEY]: "abc" })), 0);
    assert.equal(core.readBestScore(fakeStorage({ [core.STORAGE_KEY]: "-5" })), 0);
  });

  it("隐私模式下抛错也不影响游戏", () => {
    const hostile = {
      getItem() {
        throw new Error("denied");
      },
      setItem() {
        throw new Error("denied");
      },
    };
    assert.equal(core.readBestScore(hostile), 0);
    assert.doesNotThrow(() => core.writeBestScore(hostile, 10));
  });
});

describe("commitScore 成绩提交", () => {
  it("超过纪录时刷新并标记", () => {
    const s = fakeStorage();
    same(core.commitScore(s, 30), { best: 30, isRecord: true });
  });

  it("未超过纪录时保持原值", () => {
    const s = fakeStorage({ [core.STORAGE_KEY]: "50" });
    same(core.commitScore(s, 30), { best: 50, isRecord: false });
  });

  it("平纪录不算新纪录", () => {
    const s = fakeStorage({ [core.STORAGE_KEY]: "30" });
    same(core.commitScore(s, 30), { best: 30, isRecord: false });
  });

  it("0 分不算新纪录", () => {
    same(core.commitScore(fakeStorage(), 0), { best: 0, isRecord: false });
  });
});

describe("格式化输出", () => {
  it("分数补零到两位", () => {
    assert.equal(core.formatScore(0), "00");
    assert.equal(core.formatScore(7), "07");
    assert.equal(core.formatScore(42), "42");
    assert.equal(core.formatScore(123), "123");
  });

  it("非法分数退回 00", () => {
    assert.equal(core.formatScore(NaN), "00");
    assert.equal(core.formatScore(-5), "00");
  });

  it("飞船数渲染成心形", () => {
    assert.equal(core.formatLives(3), "♥ ♥ ♥");
    assert.equal(core.formatLives(1), "♥");
    assert.equal(core.formatLives(0), "—");
    assert.equal(core.formatLives(-3), "—");
  });

  it("时间向下取整且不为负", () => {
    assert.equal(core.formatSeconds(12.9), 12);
    assert.equal(core.formatSeconds(-1), 0);
  });
});
  });

  it("无输入返回零向量", () => {
    same(core.normalizeDirection(0, 0), { x: 0, y: 0 });
  });
});

describe("createPlayer", () => {
  it("位置与初始属性正确", () => {
    const p = core.createPlayer(800, 500);
    assert.equal(p.x, 400);
    assert.equal(p.y, 390);
    assert.equal(p.invulnerable, 0);
    assert.ok(p.radius > 0 && p.speed > 0);
  });
});
// __PART2__