// game.js

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const socket = io('http://localhost:3000'); // Change if deployed

let players = {};
let bullets = [];
let myId = null;

// Input tracking
const keys = {
  up: false,
  down: false,
  left: false,
  right: false,
  shooting: false,
  angle: 0
};

// Mouse aiming
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const player = players[myId];
  if (!player) return;
  keys.angle = Math.atan2(mouseY - player.y, mouseX - player.x);
  sendInput();
});

canvas.addEventListener('mousedown', e => {
  keys.shooting = true;
  sendInput();
});
canvas.addEventListener('mouseup', e => {
  keys.shooting = false;
  sendInput();
});

// Keyboard input
window.addEventListener('keydown', e => {
  if (e.key === 'w' || e.key === 'ArrowUp') keys.up = true;
  if (e.key === 's' || e.key === 'ArrowDown') keys.down = true;
  if (e.key === 'a' || e.key === 'ArrowLeft') keys.left = true;
  if (e.key === 'd' || e.key === 'ArrowRight') keys.right = true;
  sendInput();
});

window.addEventListener('keyup', e => {
  if (e.key === 'w' || e.key === 'ArrowUp') keys.up = false;
  if (e.key === 's' || e.key === 'ArrowDown') keys.down = false;
  if (e.key === 'a' || e.key === 'ArrowLeft') keys.left = false;
  if (e.key === 'd' || e.key === 'ArrowRight') keys.right = false;
  sendInput();
});

function sendInput() {
  socket.emit('input', keys);
}

socket.on('connect', () => {
  myId = socket.id;
});

socket.on('init', data => {
  players = data.players;
  bullets = data.bullets;
});

socket.on('newPlayer', player => {
  players[player.id] = player;
});

socket.on('playerDisconnected', id => {
  delete players[id];
});

socket.on('gameState', state => {
  players = state.players;
  bullets = state.bullets;
  draw();
});

// Drawing functions

function drawTank(x, y, angle, health, isMe) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = isMe ? 'lime' : 'red';

  // Tank body
  ctx.fillRect(-15, -10, 30, 20);

  // Tank turret
  ctx.fillStyle = 'gray';
  ctx.fillRect(0, -5, 20, 10);

  // Health bar
  ctx.fillStyle = 'black';
  ctx.fillRect(-20, -20, 40, 5);
  ctx.fillStyle = 'lime';
  ctx.fillRect(-20, -20, 40 * (health / 100), 5);

  ctx.restore();
}

function drawBullet(x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = 'yellow';
  ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw players
  for (const id in players) {
    const p = players[id];
    drawTank(p.x, p.y, p.angle, p.health, id === myId);
  }

  // Draw bullets
  for (const b of bullets) {
    drawBullet(b.x, b.y);
  }
}

