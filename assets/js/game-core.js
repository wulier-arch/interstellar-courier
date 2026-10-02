/**
 * 星际快递员 · 纯逻辑层
 *
 * 这里刻意不碰任何 DOM，只保留可单测的纯函数。
 * 通过传统 <script> 挂到全局（不用 ES Module），
 * 因为 ES Module 在 file:// 协议下会被 CORS 拦截，破坏「双击即玩」。
 *
 * Node 测试通过 vm 加载本文件，见 tests/game-core.test.mjs
 */
(function (root) {
  "use strict";

  const STORAGE_KEY = "interstellar-courier:best-score";
  const MAX_LIVES = 3;
  const DIFFICULTY_RAMP_SECONDS = 60;

  /** NaN 退回下限；+Infinity 取上限，-Infinity 取下限。 */
  function clamp(value, min, max) {
    if (Number.isNaN(value)) return min;
    return Math.min(Math.max(value, min), max);
  }

  /**
   * 难度曲线：随时间线性拉满，60 秒后进入最高难度并保持。
   * meteorInterval 越小生成越密，speedBonus 越大陨石落得越快。
   */
  function difficultyAt(elapsed) {
    const ramp = clamp(elapsed, 0, DIFFICULTY_RAMP_SECONDS) / DIFFICULTY_RAMP_SECONDS;
    return {
      ramp,
      level: 1 + Math.floor(ramp * 4),
      meteorInterval: 0.95 - ramp * 0.62,
      meteorSpeedBonus: ramp * 110,
    };
  }

  /** 给生成间隔加随机抖动，避免节奏机械；random 可注入以便测试。 */
  function nextMeteorInterval(elapsed, random = Math.random) {
    const { meteorInterval } = difficultyAt(elapsed);
    return Math.max(0.22, meteorInterval * (0.75 + random() * 0.5));
  }

  /** 圆形碰撞判定。scale 用来微调判定半径（<1 表示宽容一点）。 */
  function circlesOverlap(a, b, scale = 1) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const reach = a.radius + b.radius * scale;
    return dx * dx + dy * dy < reach * reach;
  }

  /** 同时按两个方向时归一化，避免斜向移动速度更快。 */
  function normalizeDirection(dx, dy) {
    const length = Math.hypot(dx, dy);
    return length > 0 ? { x: dx / length, y: dy / length } : { x: 0, y: 0 };
  }

  function createPlayer(width, height) {
    return { x: width / 2, y: height * 0.78, radius: 15, speed: 250, invulnerable: 0 };
  }

  /** 隐私模式等场景下 localStorage 会抛错，一律降级为 0。 */
  function readBestScore(storage) {
    try {
      const value = Number.parseInt(storage && storage.getItem(STORAGE_KEY), 10);
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch (error) {
      return 0;
    }
  }

  function writeBestScore(storage, score) {
    try {
      if (storage) storage.setItem(STORAGE_KEY, String(score));
    } catch (error) {
      /* 存不进去就算了，不影响本局游戏 */
    }
    return score;
  }

  /** 提交本局成绩，返回 { best, isRecord }。 */
  function commitScore(storage, score) {
    const best = readBestScore(storage);
    if (score > best) return { best: writeBestScore(storage, score), isRecord: true };
    return { best, isRecord: false };
  }

  function formatScore(value) {
    return String(Math.max(0, Math.floor(value) || 0)).padStart(2, "0");
  }

  function formatLives(value) {
    return "♥ ".repeat(clamp(Math.floor(value), 0, MAX_LIVES)).trim() || "—";
  }

  function formatSeconds(value) {
    return Math.floor(clamp(value, 0, Number.MAX_SAFE_INTEGER));
  }

  root.GameCore = {
    STORAGE_KEY,
    MAX_LIVES,
    DIFFICULTY_RAMP_SECONDS,
    clamp,
    difficultyAt,
    nextMeteorInterval,
    circlesOverlap,
    normalizeDirection,
    createPlayer,
    readBestScore,
    writeBestScore,
    commitScore,
    formatScore,
    formatLives,
    formatSeconds,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);