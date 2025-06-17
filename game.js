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
  angle: 0
};

// HOME SCREEN: Handle tank selection
document.querySelectorAll(".tank-button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tank-button").forEach(btn => btn.classList.remove("selected"));
    button.classList.add("selected");
    selectedTank = button.getAttribute("data-type");
  });
});

// HOME SCREEN: Handle play button
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

  // Save info
  username = nameInput;
  tankType = selectedTank;

  // Hide menu and show canvas
  document.getElementById("home-screen").style.display = "none";
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");
  canvas.style.display = "block";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Begin game
  setupControls();
  requestAnimationFrame(gameLoop);
});

// Input Handling
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

// Shooting bullets
function shootBullet() {
  bullets.push({
    x: player.x,
    y: player.y,
    angle: mouseAngle,
    speed: 6
  });
}

// Game Update
function update() {
  if (keys["w"] || keys["arrowup"]) player.y -= player.speed;
  if (keys["s"] || keys["arrowdown"]) player.y += player.speed;
  if (keys["a"] || keys["arrowleft"]) player.x -= player.speed;
  if (keys["d"] || keys["arrowright"]) player.x += player.speed;

  bullets.forEach(bullet => {
    bullet.x += Math.cos(bullet.angle) * bullet.speed;
    bullet.y += Math.sin(bullet.angle) * bullet.speed;
  });

  // Remove bullets off-screen
  bullets = bullets.filter(b => b.x > 0 && b.x < 2000 && b.y > 0 && b.y < 2000);
}

// Draw Tank
function drawTank(x, y, angle) {
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(angle);
  ctx.fillStyle = "green";
  ctx.fillRect(-20, -20, 40, 40); // Tank body
  ctx.fillStyle = "black";
  ctx.fillRect(15, -5, 25, 10); // Cannon
  ctx.restore();
}

// Draw Bullets
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

// Game Draw
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  ctx.fillStyle = "#2b2b2b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Bullets
  drawBullets();

  // Tank
  drawTank(player.x, player.y, mouseAngle);
}

// Main Loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

