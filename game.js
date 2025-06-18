let selectedTank = null;
let canvas, ctx;
let username, tankType;
let keys = {};
let mouseAngle = 0;
let socket;
let playerId = null;

let players = {};
let bullets = [];
let previousPositions = {};

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
  if (!nameInput) return alert("Please enter a username!");
  if (!selectedTank) return alert("Please select a tank type!");

  username = nameInput;
  tankType = selectedTank;

  document.getElementById("home-screen").style.display = "none";
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");
  canvas.style.display = "block";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  setupSocket();
  setupControls();
});

function setupSocket() {
  socket = io("https://armytanksbackend.onrender.com");

  socket.on("connect", () => {
    playerId = socket.id;
    socket.emit("newPlayer", { username, tankType });
  });

  socket.on("state", (data) => {
    players = data.players;
    bullets = data.bullets;
  });
}

function setupControls() {
  document.addEventListener("keydown", (e) => keys[e.key.toLowerCase()] = true);
  document.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

  canvas.addEventListener("mousemove", (e) => {
    const dx = e.clientX - canvas.width / 2;
    const dy = e.clientY - canvas.height / 2;
    mouseAngle = Math.atan2(dy, dx);
  });

  canvas.addEventListener("mousedown", () => {
    if (!players[playerId]) return;
    const p = players[playerId];
    socket.emit("shoot", {
      x: p.x,
      y: p.y,
      angle: p.angle,
      speed: 6
    });
  });

  requestAnimationFrame(gameLoop);
}

function update() {
  if (!players[playerId]) return;

  const p = players[playerId];

  const speed = 3;
  if (keys["w"] || keys["arrowup"]) p.y -= speed;
  if (keys["s"] || keys["arrowdown"]) p.y += speed;
  if (keys["a"] || keys["arrowleft"]) p.x -= speed;
  if (keys["d"] || keys["arrowright"]) p.x += speed;

  p.angle = mouseAngle;

  socket.emit("playerMove", {
    x: p.x,
    y: p.y,
    angle: p.angle
  });
}

function getTankColorByType(type) {
  switch (type) {
    case "scout": return "limegreen";
    case "sniper": return "skyblue";
    case "heavy": return "crimson";
    default: return "gray";
  }
}

function drawGrid(centerX, centerY) {
  const gridSize = 50;
  const offsetX = centerX % gridSize;
  const offsetY = centerY % gridSize;

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

function drawTank(player, isSelf) {
  let x = player.x;
  let y = player.y;

  if (!isSelf) {
    if (!previousPositions[player.id]) {
      previousPositions[player.id] = { x: player.x, y: player.y };
    }

    // Smoothly interpolate
    previousPositions[player.id].x += (player.x - previousPositions[player.id].x) * 0.1;
    previousPositions[player.id].y += (player.y - previousPositions[player.id].y) * 0.1;

    x = previousPositions[player.id].x;
    y = previousPositions[player.id].y;
  }

  const screenX = canvas.width / 2 + (x - players[playerId].x);
  const screenY = canvas.height / 2 + (y - players[playerId].y);

  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.rotate(player.angle);

  ctx.fillStyle = getTankColorByType(player.tankType);
  ctx.fillRect(-20, -20, 40, 40); // Body

  ctx.fillStyle = "black";
  ctx.fillRect(15, -5, 25, 10); // Cannon

  ctx.restore();

  // Draw health bar
  ctx.fillStyle = "gray";
  ctx.fillRect(screenX - 25, screenY + 30, 50, 6);
  const ratio = player.health / player.maxHealth;
  ctx.fillStyle = ratio > 0.5 ? "limegreen" : ratio > 0.25 ? "orange" : "red";
  ctx.fillRect(screenX - 25, screenY + 30, 50 * ratio, 6);
}

function drawBullets() {
  ctx.fillStyle = "yellow";
  bullets.forEach(b => {
    const dx = b.x - players[playerId].x + canvas.width / 2;
    const dy = b.y - players[playerId].y + canvas.height / 2;
    ctx.beginPath();
    ctx.arc(dx, dy, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function draw() {
  if (!players[playerId]) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#2b2b2b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const me = players[playerId];
  drawGrid(me.x, me.y);
  drawBullets();

  Object.values(players).forEach(player => {
    drawTank(player, player.id === playerId);
  });
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

