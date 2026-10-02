const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
const overlay = document.querySelector("#overlay");
const title = document.querySelector("#overlay-title");
const copy = document.querySelector("#overlay-copy");
const startButton = document.querySelector("#start-button");
const scoreLabel = document.querySelector("#score");
const livesLabel = document.querySelector("#lives");
const keys = new Set();

let width = 0;
let height = 0;
let player;
let meteors = [];
let stars = [];
let backgroundStars = [];
let score = 0;
let lives = 3;
let elapsed = 0;
let meteorClock = 0;
let starClock = 0;
let running = false;
let previousTime = 0;

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
  lives = 3;
  elapsed = 0;
  meteorClock = .3;
  starClock = 1;
  meteors = [];
  stars = [];
  player = { x: width / 2, y: height * .78, radius: 15, speed: 250, invulnerable: 0 };
  scoreLabel.textContent = "00";
  livesLabel.textContent = "♥ ♥ ♥";
}

function start() {
  reset();
  overlay.hidden = true;
  running = true;
  previousTime = performance.now();
  requestAnimationFrame(frame);
}

function endGame() {
  running = false;
  title.textContent = "快递任务完成！";
  copy.textContent = `你收集了 ${score} 颗星星，坚持了 ${Math.floor(elapsed)} 秒。要不要再飞一趟？`;
  startButton.textContent = "再玩一次";
  overlay.hidden = false;
}

function spawnMeteor() {
  const radius = 10 + Math.random() * 13;
  meteors.push({
    x: radius + Math.random() * (width - radius * 2),
    y: -radius - 5,
    radius,
    speed: 115 + Math.random() * 95 + Math.min(elapsed * 2.2, 100),
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
  const length = Math.hypot(dx, dy) || 1;
  player.x = Math.max(18, Math.min(width - 18, player.x + dx / length * player.speed * dt));
  player.y = Math.max(20, Math.min(height - 20, player.y + dy / length * player.speed * dt));

  meteorClock -= dt;
  starClock -= dt;
  if (meteorClock <= 0) {
    spawnMeteor();
    meteorClock = Math.max(.28, .8 - elapsed * .008) + Math.random() * .45;
  }
  if (starClock <= 0) {
    spawnStar();
    starClock = 1.5 + Math.random() * 1.1;
  }

  for (const meteor of meteors) {
    meteor.y += meteor.speed * dt;
    meteor.x += meteor.drift * dt;
    meteor.angle += meteor.spin * dt;
    const distance = Math.hypot(player.x - meteor.x, player.y - meteor.y);
    if (distance < player.radius + meteor.radius * .72 && player.invulnerable === 0) {
      lives--;
      player.invulnerable = 1.1;
      livesLabel.textContent = "♥ ".repeat(lives).trim() || "—";
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
    if (Math.hypot(player.x - star.x, player.y - star.y) < player.radius + star.radius) {
      star.collected = true;
      score++;
      scoreLabel.textContent = String(score).padStart(2, "0");
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
