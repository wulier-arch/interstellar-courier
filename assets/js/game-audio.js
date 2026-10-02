/**
 * 音效层 —— 全部由 WebAudio 实时合成，不加载任何音频文件。
 *
 * 合成的理由：项目坚持「零外部资源」，引入 mp3/ogg 会破坏离线可玩，
 * 也会给每个玩家增加几十 KB 的下载体积。
 *
 * 注意浏览器自动播放策略：AudioContext 必须在用户手势里创建或 resume，
 * 因此懒加载 —— 第一次调用 play() 时才建立上下文。
 */
(function (root) {
  "use strict";

  const STORAGE_KEY = "interstellar-courier:sound";

  /**
   * 音效配方表。type 对应振荡器波形，sweep 决定频率的起止。
   * 数值均为经验值，追求的是「短促不刺耳」，不是物理仿真。
   */
  const RECIPES = {
    collect: { type: "sine", from: 880, to: 1320, duration: 0.12, gain: 0.14 },
    hit: { type: "square", from: 220, to: 70, duration: 0.22, gain: 0.12 },
    levelUp: { type: "triangle", from: 520, to: 1040, duration: 0.26, gain: 0.13 },
    gameOver: { type: "sawtooth", from: 420, to: 90, duration: 0.6, gain: 0.1 },
    start: { type: "sine", from: 440, to: 660, duration: 0.16, gain: 0.12 },
  };

  function readEnabled(storage) {
    try {
      const raw = storage && storage.getItem(STORAGE_KEY);
      // 默认开启；只有显式存了 "off" 才静音
      return raw !== "off";
    } catch (error) {
      return true;
    }
  }

  function writeEnabled(storage, enabled) {
    try {
      if (storage) storage.setItem(STORAGE_KEY, enabled ? "on" : "off");
    } catch (error) {
      /* 存不进去也不影响游戏 */
    }
    return enabled;
  }

  /**
   * 创建音效播放器。
   * factory 用于注入 AudioContext 构造器，方便在测试中替换。
   */
  function createPlayer(options = {}) {
    const storage = options.storage || null;
    const factory = options.contextFactory || defaultContextFactory;

    let context = null;
    let enabled = readEnabled(storage);

    function defaultContextFactory() {
      const Ctor = root.AudioContext || root.webkitAudioContext;
      return Ctor ? new Ctor() : null;
    }

    /** 取（必要时创建）音频上下文；失败时静默降级。 */
    function ensureContext() {
      if (context) return context;
      try {
        context = factory();
      } catch (error) {
        context = null;
      }
      return context;
    }

    /** 自动播放策略下上下文可能处于 suspended，用户手势时恢复。 */
    function resume() {
      const audio = ensureContext();
      if (!audio) return false;
      if (audio.state === "suspended" && typeof audio.resume === "function") {
        audio.resume().catch(() => {});
      }
      return true;
    }

    function play(name) {
      if (!enabled) return false;
      const recipe = RECIPES[name];
      if (!recipe) return false;

      const audio = ensureContext();
      if (!audio) return false;

      try {
        const now = audio.currentTime;
        const oscillator = audio.createOscillator();
        const amplifier = audio.createGain();

        oscillator.type = recipe.type;
        oscillator.frequency.setValueAtTime(recipe.from, now);
        oscillator.frequency.exponentialRampToValueAtTime(
          Math.max(1, recipe.to),
          now + recipe.duration,
        );

        // 指数衰减必须避开 0，否则会抛异常
        amplifier.gain.setValueAtTime(recipe.gain, now);
        amplifier.gain.exponentialRampToValueAtTime(0.0001, now + recipe.duration);

        oscillator.connect(amplifier);
        amplifier.connect(audio.destination);
        oscillator.start(now);
        oscillator.stop(now + recipe.duration);
        return true;
      } catch (error) {
        // 音效失败绝不能影响游戏主流程
        return false;
      }
    }

    return {
      play,
      resume,
      isEnabled: () => enabled,
      setEnabled(value) {
        enabled = writeEnabled(storage, !!value);
        if (enabled) resume();
        return enabled;
      },
      toggle() {
        return this.setEnabled(!enabled);
      },
      RECIPES,
      STORAGE_KEY,
    };
  }

  root.GameAudio = {
    STORAGE_KEY,
    RECIPES,
    readEnabled,
    writeEnabled,
    createPlayer,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);