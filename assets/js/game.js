const core = window.GameCore;

const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
const overlay = document.querySelector("#overlay");
const title = document.querySelector("#overlay-title");
const copy = document.querySelector("#overlay-copy");
const startButton = document.querySelector("#start-button");
const scoreLabel = document.querySelector("#score");
const livesLabel = document.querySelector("#lives");
const bestLabel = document.querySelector("#best");
const levelLabel = document.querySelector("#level");
const result = document.querySelector("#result");
const resultScore = document.querySelector("#result-score");
const resultTime = document.querySelector("#result-time");
const resultBest = document.querySelector("#result-best");
const recordBadge = document.querySelector("#record");

const storage = (() => {
  try {
    return window.localStorage;
  } catch (error) {
    return null;
  }
})();

const keys = new Set();

let width = 0;
let height = 0;
let player;
let meteors = [];
let stars = [];
let backgroundStars = [];
let score = 0;
let lives = core.MAX_LIVES;
let elapsed = 0;
let level = 1;
let meteorClock = 0;
let starClock = 0;
let running = false;
let previousTime = 0;

function refreshBestLabel() {
  bestLabel.textContent = core.formatScore(core.readBestScore(storage));
}

function resize() {
  const bounds = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  width = bounds.width;
  height = bounds.height;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  backgroundStars = Array.from({ length: Math.floor(width * height / 6500) }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * 1.4 + .3,
    alpha: Math.random() * .55 + .2
  }));
  if (player) {
    player.x = Math.min(Math.max(player.x, 22), width - 22);
    player.y = Math.min(Math.max(player.y, 24), height - 24);
  }
  draw();
}

function reset() {
  score = 0;
  lives = core.MAX_LIVES;
  elapsed = 0;
  level = 1;
  meteorClock = .3;
  starClock = 1;
  meteors = [];
  stars = [];
  player = core.createPlayer(width, height);
  scoreLabel.textContent = core.formatScore(score);
  livesLabel.textContent = core.formatLives(lives);
  levelLabel.textContent = String(level);
  refreshBestLabel();
}

function start() {
  reset();
  result.hidden = true;
  recordBadge.hidden = true;
  overlay.hidden = true;
  running = true;
  previousTime = performance.now();
  requestAnimationFrame(frame);
}

function endGame() {
  running = false;
  const { best, isRecord } = core.commitScore(storage, score);
  title.textContent = isRecord ? "刷新纪录！" : "快递任务完成！";
  copy.textContent = isRecord
    ? "这趟飞得比以往任何一次都远，星星记得牢牢的。"
    : "货舱已经清点完毕，下一单马上出发。";
  resultScore.textContent = `${score} 颗`;
  resultTime.textContent = `${core.formatSeconds(elapsed)} 秒`;
  resultBest.textContent = `${best} 颗`;
  result.hidden = false;
  recordBadge.hidden = !isRecord;
  startButton.textContent = "再玩一次";
  overlay.hidden = false;
  refreshBestLabel();
}

function spawnMeteor() {
  const radius = 10 + Math.random() * 13;
  meteors.push({
    x: radius + Math.random() * (width - radius * 2),
    y: -radius - 5,
    radius,
    speed: 115 + Math.random() * 95 + core.difficultyAt(elapsed).meteorSpeedBonus,
    drift: (Math.random() - .5) * 42,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - .5) * 2.4
  });
}

function spawnStar() {
  stars.push({
    x: 20 + Math.random() * Math.max(1, width - 40),
    y: -18,
    radius: 10,
    speed: 95 + Math.random() * 45,
    phase: Math.random() * Math.PI * 2
  });
}

function update(dt) {
  elapsed += dt;
  player.invulnerable = Math.max(0, player.invulnerable - dt);

  let dx = 0;
  let dy = 0;
  if (keys.has("ArrowLeft") || keys.has("a")) dx--;
  if (keys.has("ArrowRight") || keys.has("d")) dx++;
  if (keys.has("ArrowUp") || keys.has("w")) dy--;
  if (keys.has("ArrowDown") || keys.has("s")) dy++;
  const direction = core.normalizeDirection(dx, dy);
  player.x = Math.max(18, Math.min(width - 18, player.x + direction.x * player.speed * dt));
  player.y = Math.max(20, Math.min(height - 20, player.y + direction.y * player.speed * dt));

  const difficulty = core.difficultyAt(elapsed);
  if (difficulty.level !== level) {
    level = difficulty.level;
    levelLabel.textContent = String(level);
  }

  meteorClock -= dt;
  starClock -= dt;
  if (meteorClock <= 0) {
    spawnMeteor();
    meteorClock = core.nextMeteorInterval(elapsed);
  }
  if (starClock <= 0) {
    spawnStar();
    starClock = 1.5 + Math.random() * 1.1;
  }

  for (const meteor of meteors) {
    meteor.y += meteor.speed * dt;
    meteor.x += meteor.drift * dt;
    meteor.angle += meteor.spin * dt;
    if (core.circlesOverlap(player, meteor, .72) && player.invulnerable === 0) {
      lives--;
      player.invulnerable = 1.1;
      livesLabel.textContent = core.formatLives(lives);
      if (lives <= 0) {
        endGame();
        return;
      }
    }
  }
  meteors = meteors.filter(meteor => meteor.y < height + meteor.radius);

  for (const star of stars) {
    star.y += star.speed * dt;
    star.phase += dt * 4;
    if (core.circlesOverlap(player, star)) {
      star.collected = true;
      score++;
      scoreLabel.textContent = core.formatScore(score);
    }
  }
  stars = stars.filter(star => !star.collected && star.y < height + 20);
}

function draw() {
  if (!width || !height) return;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#111222";
  ctx.fillRect(0, 0, width, height);

  for (const point of backgroundStars) {
    ctx.globalAlpha = point.alpha * (.72 + Math.sin(elapsed + point.x) * .28);
    ctx.fillStyle = "#eee9ff";
    ctx.beginPath();
    ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const star of stars) {
    const pulse = 1 + Math.sin(star.phase) * .14;
    ctx.save();
    ctx.translate(star.x, star.y);
    ctx.rotate(star.phase * .2);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = "#ffe99a";
    ctx.shadowBlur = 15;
    ctx.fillStyle = "#ffe99a";
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 ? 4 : 9;
      const angle = -Math.PI / 2 + i * Math.PI / 5;
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  for (const meteor of meteors) {
    ctx.save();
    ctx.translate(meteor.x, meteor.y);
    ctx.rotate(meteor.angle);
    ctx.shadowColor = "#ff9270";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#c57971";
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const angle = i * Math.PI * 2 / 9;
      const radius = meteor.radius * (i % 2 ? .82 : 1);
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#e7a08b";
    ctx.beginPath();
    ctx.arc(-meteor.radius * .2, -meteor.radius * .18, meteor.radius * .17, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (player && (player.invulnerable === 0 || Math.floor(elapsed * 12) % 2 === 0)) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.shadowColor = "#a894ff";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#a894ff";
    ctx.beginPath();
    ctx.moveTo(0, 19);
    ctx.lineTo(-6, 9);
    ctx.lineTo(6, 9);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#ded5ff";
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.quadraticCurveTo(13, -3, 10, 10);
    ctx.lineTo(-10, 10);
    ctx.quadraticCurveTo(-13, -3, 0, -17);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#8977ce";
    ctx.beginPath();
    ctx.ellipse(0, -2, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function frame(now) {
  if (!running) return;
  const dt = Math.min((now - previousTime) / 1000, .04);
  previousTime = now;
  update(dt);
  draw();
  if (running) requestAnimationFrame(frame);
}

startButton.addEventListener("click", () => {
  title.textContent = "今晚也要准时送达";
  copy.textContent = "驾驶小飞船穿过流星雨，收集沿途的星星。撞到陨石会消耗一艘飞船。";
  startButton.textContent = "开始送快递";
  start();
});

window.addEventListener("keydown", event => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(key)) event.preventDefault();
  if (key === "Escape" && running) {
    running = false;
    title.textContent = "稍作休息";
    copy.textContent = "星际快递员也需要喘口气。准备好了就继续出发吧。";
    startButton.textContent = "继续出发";
    overlay.hidden = false;
    return;
  }
  keys.add(key);
});

window.addEventListener("keyup", event => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys.delete(key);
});

document.querySelectorAll(".touch-button").forEach(button => {
  const key = button.dataset.key;
  button.addEventListener("pointerdown", event => {
    event.preventDefault();
    keys.add(key);
    button.setPointerCapture(event.pointerId);
  });
  const release = () => keys.delete(key);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});

window.addEventListener("blur", () => keys.clear());
window.addEventListener("resize", resize);
resize();
refreshBestLabel();
