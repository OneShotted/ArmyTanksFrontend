// game.js

const homeScreen = document.getElementById('homeScreen');
const usernameInput = document.getElementById('usernameInput');
const startBtn = document.getElementById('startBtn');
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let socket;
let myId = null;
let username = null;

let players = {};
let bullets = [];

const keys = {
  up: false,
  down: false,
  left: false,
  right: false,
  shooting: false,
  angle: 0,
};

startBtn.onclick = () => {
  const name = usernameInput.value.trim();
  if (name.length === 0) {
    alert('Please enter a username.');
    return;
  }
  username = name;

  homeScreen.style.display = 'none';
  canvas.style.display = 'block';

  connectSocket();
};

function connectSocket() {
  socket = io('https://armytanksbackend.onrender.com'); // your backend URL

  socket.on('connect', () => {
    myId = socket.id;
    socket.emit('setUsername', username);
  });

  socket.on('init', (data) => {
    players = data.players;
    bullets = data.bullets;
  });

  socket.on('newPlayer', (player) => {
    players[player.id] = player;
  });

  socket.on('playerDisconnected', (id) => {
    delete players[id];
  });

  socket.on('gameState', (state) => {
    players = state.players;
    bullets = state.bullets;
    draw();
  });

  setupInputHandlers();
}

// Handle input for movement and mouse
function setupInputHandlers() {
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const player = players[myId];
    if (!player) return;
    keys.angle = Math.atan2(mouseY - player.y, mouseX - player.x);
    sendInput();
  });

  canvas.addEventListener('mousedown', () => {
    keys.shooting = true;
    sendInput();
  });

  canvas.addEventListener('mouseup', () => {
    keys.shooting = false;
    sendInput();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'w' || e.key === 'ArrowUp') keys.up = true;
    if (e.key === 's' || e.key === 'ArrowDown') keys.down = true;
    if (e.key === 'a' || e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'd' || e.key === 'ArrowRight') keys.right = true;
    sendInput();
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'w' || e.key === 'ArrowUp') keys.up = false;
    if (e.key === 's' || e.key === 'ArrowDown') keys.down = false;
    if (e.key === 'a' || e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'd' || e.key === 'ArrowRight') keys.right = false;
    sendInput();
  });
}

// Send input to server
function sendInput() {
  if (!socket) return;
  socket.emit('input', keys);
}

// Draw a tank
function drawTank(x, y, angle, health, isMe, username) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = isMe ? 'lime' : 'red';

  ctx.fillRect(-15, -10, 30, 20);

  ctx.fillStyle = 'gray';
  ctx.fillRect(0, -5, 20, 10);

  // Health bar
  ctx.fillStyle = 'black';
  ctx.fillRect(-20, -20, 40, 5);
  ctx.fillStyle = 'lime';
  ctx.fillRect(-20, -20, 40 * (health / 100), 5);

  // Username text above tank
  ctx.fillStyle = 'white';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(username || 'Anonymous', 0, -25);

  ctx.restore();
}

// Draw a bullet
function drawBullet(x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = 'yellow';
  ctx.fill();
}

// Draw green grid background
function drawGrid() {
  const gridSize = 40;
  ctx.strokeStyle = '#0f0';
  ctx.lineWidth = 0.5;

  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

// Main draw function
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawGrid();

  for (const id in players) {
    const p = players[id];
    drawTank(p.x, p.y, p.angle, p.health, id === myId, p.username);
  }

  for (const b of bullets) {
    drawBullet(b.x, b.y);
  }
}

// Resize canvas when window changes
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

