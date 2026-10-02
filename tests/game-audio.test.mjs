/**
 * game-audio 音效层单元测试
 *
 * 运行：node --test tests/game-audio.test.mjs
 * 用假的 AudioContext 验证调度逻辑，不产生任何真实声音。
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { createContext, runInContext } from "node:vm";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(resolve(ROOT, "assets/js/game-audio.js"), "utf8");

function loadAudio() {
  const sandbox = createContext({});
  runInContext(source, sandbox, { filename: "game-audio.js" });
  return sandbox.GameAudio;
}

const audio = loadAudio();

/** 记录所有调度调用的假音频上下文 */
function fakeContextFactory(log, options = {}) {
  const node = () => ({
    connect: () => {},
    frequency: {
      setValueAtTime: (v, t) => log.push(["freq.set", v, t]),
      exponentialRampToValueAtTime: (v, t) => log.push(["freq.ramp", v, t]),
    },
    gain: {
      setValueAtTime: (v, t) => log.push(["gain.set", v, t]),
      exponentialRampToValueAtTime: (v, t) => log.push(["gain.ramp", v, t]),
    },
    start: (t) => log.push(["start", t]),
    stop: (t) => log.push(["stop", t]),
  });
  return () => ({
    currentTime: options.currentTime ?? 0,
    state: options.state ?? "running",
    destination: {},
    createOscillator: () => {
      log.push(["createOscillator"]);
      const n = node();
      n.type = "";
      return n;
    },
    createGain: () => {
      log.push(["createGain"]);
      return node();
    },
    resume: () => {
      log.push(["resume"]);
      return Promise.resolve();
    },
  });
}

function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    raw: map,
  };
}

describe("音效开关读写", () => {
  it("默认开启", () => {
    assert.equal(audio.readEnabled(fakeStorage()), true);
    assert.equal(audio.readEnabled(null), true);
  });

  it("显式关闭后保持关闭", () => {
    assert.equal(audio.readEnabled(fakeStorage({ [audio.STORAGE_KEY]: "off" })), false);
  });

  it("写入后可读回", () => {
    const s = fakeStorage();
    audio.writeEnabled(s, false);
    assert.equal(audio.readEnabled(s), false);
    audio.writeEnabled(s, true);
    assert.equal(audio.readEnabled(s), true);
  });

  it("存储抛错时退回开启", () => {
    const hostile = { getItem() { throw new Error("denied"); } };
    assert.equal(audio.readEnabled(hostile), true);
  });
});

describe("音效配方", () => {
  it("五类事件都存在", () => {
    for (const name of ["collect", "hit", "levelUp", "gameOver", "start"]) {
      assert.ok(audio.RECIPES[name], `缺少配方：${name}`);
    }
  });

  it("时长与增益均为正数", () => {
    for (const [name, r] of Object.entries(audio.RECIPES)) {
      assert.ok(r.duration > 0, `${name} 时长非正`);
      assert.ok(r.gain > 0, `${name} 增益非正`);
      assert.ok(["sine", "square", "triangle", "sawtooth"].includes(r.type));
    }
  });
});

describe("播放调度", () => {
  it("创建振荡器并启停", () => {
    const log = [];
    const player = audio.createPlayer({
      storage: fakeStorage(),
      contextFactory: fakeContextFactory(log),
    });
    assert.equal(player.play("collect"), true);
    assert.ok(log.some(([k]) => k === "createOscillator"));
    assert.ok(log.some(([k]) => k === "start"));
    assert.ok(log.some(([k]) => k === "stop"));
  });

  it("未知音效名安全返回 false", () => {
    const log = [];
    const player = audio.createPlayer({
      storage: fakeStorage(),
      contextFactory: fakeContextFactory(log),
    });
    assert.equal(player.play("不存在"), false);
    assert.equal(log.filter(([k]) => k === "createOscillator").length, 0);
  });

  it("增益不会指数衰减到 0（会抛异常）", () => {
    const log = [];
    const player = audio.createPlayer({
      storage: fakeStorage(),
      contextFactory: fakeContextFactory(log),
    });
    player.play("collect");
    const ramp = log.find(([k]) => k === "gain.ramp");
    assert.ok(ramp, "未调用增益衰减");
    assert.ok(ramp[1] > 0, `衰减目标必须大于 0，实际 ${ramp[1]}`);
  });

  it("无 AudioContext 时降级为 false 而不抛错", () => {
    const player = audio.createPlayer({
      storage: fakeStorage(),
      contextFactory: () => null,
    });
    assert.equal(player.play("collect"), false);
  });

  it("上下文被自动播放策略挂起时 resume", () => {
    const log = [];
    const player = audio.createPlayer({
      storage: fakeStorage(),
      contextFactory: fakeContextFactory(log, { state: "suspended" }),
    });
    player.resume();
    assert.ok(log.some(([k]) => k === "resume"));
  });

  it("调度抛异常不影响游戏", () => {
    const broken = () => ({
      currentTime: 0,
      state: "running",
      destination: {},
      createOscillator() { throw new Error("boom"); },
      createGain() { throw new Error("boom"); },
    });
    const player = audio.createPlayer({ storage: fakeStorage(), contextFactory: broken });
    assert.doesNotThrow(() => player.play("collect"));
    assert.equal(player.play("collect"), false);
  });
});

describe("播放器开关", () => {
  it("默认启用状态与存储一致", () => {
    const player = audio.createPlayer({
      storage: fakeStorage(),
      contextFactory: fakeContextFactory([]),
    });
    assert.equal(player.isEnabled(), true);
  });

  it("关闭后播放被拦截", () => {
    const log = [];
    const player = audio.createPlayer({
      storage: fakeStorage(),
      contextFactory: fakeContextFactory(log),
    });
    player.setEnabled(false);
    assert.equal(player.play("collect"), false);
    assert.equal(log.filter(([k]) => k === "createOscillator").length, 0);
  });

  it("关闭状态会被持久化", () => {
    const s = fakeStorage();
    const player = audio.createPlayer({ storage: s, contextFactory: fakeContextFactory([]) });
    player.setEnabled(false);
    assert.equal(s.raw.get(audio.STORAGE_KEY), "off");
  });

  it("toggle 可来回切换", () => {
    const player = audio.createPlayer({
      storage: fakeStorage(),
      contextFactory: fakeContextFactory([]),
    });
    assert.equal(player.toggle(), false);
    assert.equal(player.isEnabled(), false);
    assert.equal(player.toggle(), true);
  });
});