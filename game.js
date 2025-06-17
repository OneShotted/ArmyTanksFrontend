let selectedTank = null;
let canvas, ctx;
let username, tankType;
let keys = {};
let mouseAngle = 0;
let bullets = [];

const player = {
  x: 500,
  y: 500,
  speed: 3,
  size: 40,
  angle: 0,
  health: 100,
  maxHealth: 100
};

// Tank selection
document.querySelectorAll(".tank-button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tank-button").forEach(btn => btn.classList.remove("selected"));
    button.classList.add("selected");
    selectedTank = button.getAttribute("data-type");
  });
});

// Play button
document.getElementById("play-button").addEventListener("click", () => {
  const nameInput = document.getElementById("username").value.trim();

  if (!nameInput) {
    alert("Please enter a username!");
    return;
  }

  if (!selectedTank) {
    alert("Please select a tank type!");
    return;
  }

  username = nameInput;
  tankType = selectedTank;

  document.getElementById("home-screen").style.display = "none";
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");
  canvas.style.display = "block";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  setupControls();
  requestAnimationFrame(gameLoop);
});

function setupControls() {
  document.addEventListener("keydown", (e) => keys[e.key.toLowerCase()] = true);
  document.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

  canvas.addEventListener("mousemove", (e) => {
    const dx = e.clientX - canvas.width / 2;
    const dy = e.clientY - canvas.height / 2;
    mouseAngle = Math.atan2(dy, dx);
  });

  canvas.addEventListener("mousedown", () => {
    shootBullet();
  });
}

function shootBullet() {
  bullets.push({
    x: player.x,
    y: player.y,
    angle: mouseAngle,
    speed: 6,
    shooter: "player" // Mark the bullet as fired by the player
  });
}

function update() {
  if (keys["w"] || keys["arrowup"]) player.y -= player.speed;
  if (keys["s"] || keys["arrowdown"]) player.y += player.speed;
  if (keys["a"] || keys["arrowleft"]) player.x -= player.speed;
  if (keys["d"] || keys["arrowright"]) player.x += player.speed;

  bullets.forEach(bullet => {
    bullet.x += Math.cos(bullet.angle) * bullet.speed;
    bullet.y += Math.sin(bullet.angle) * bullet.speed;
  });

  // Only take damage from bullets not shot by the player
  bullets.forEach(bullet => {
    if (bullet.shooter === "player") return;

    const dx = bullet.x - player.x;
    const dy = bullet.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < player.size / 2) {
      player.health -= 10;
      bullet.hit = true;
    }
  });

  bullets = bullets.filter(b => !b.hit && b.x > 0 && b.x < 2000 && b.y > 0 && b.y < 2000);

  if (player.health <= 0) {
    alert("You died!");
    player.health = player.maxHealth;
    player.x = 500;
    player.y = 500;
    bullets = [];
  }
}

function getTankColorByType(type) {
  switch (type) {
    case "scout": return "limegreen";
    case "sniper": return "skyblue";
    case "heavy": return "crimson";
    default: return "gray";
  }
}

function drawGrid() {
  const gridSize = 50;
  const offsetX = player.x % gridSize;
  const offsetY = player.y % gridSize;

  ctx.strokeStyle = "#444";
  ctx.lineWidth = 1;

  for (let x = -offsetX; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = -offsetY; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawTank(x, y, angle) {
  const tankColor = getTankColorByType(tankType);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(angle);

  ctx.fillStyle = tankColor;
  ctx.fillRect(-20, -20, 40, 40); // Body

  ctx.fillStyle = "black";
  ctx.fillRect(15, -5, 25, 10); // Cannon

  ctx.restore();
}

function drawBullets() {
  ctx.fillStyle = "yellow";
  bullets.forEach(b => {
    const dx = b.x - player.x + canvas.width / 2;
    const dy = b.y - player.y + canvas.height / 2;
    ctx.beginPath();
    ctx.arc(dx, dy, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawHealthBar() {
  const barWidth = 100;
  const barHeight = 10;
  const x = canvas.width / 2 - barWidth / 2;
  const y = canvas.height - 30;

  const healthRatio = player.health / player.maxHealth;

  ctx.fillStyle = "gray";
  ctx.fillRect(x, y, barWidth, barHeight);

  ctx.fillStyle = healthRatio > 0.5 ? "limegreen" : healthRatio > 0.25 ? "orange" : "red";
  ctx.fillRect(x, y, barWidth * healthRatio, barHeight);

  ctx.strokeStyle = "black";
  ctx.strokeRect(x, y, barWidth, barHeight);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#2b2b2b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid();
  drawBullets();
  drawTank(player.x, player.y, mouseAngle);
  drawHealthBar();
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}


