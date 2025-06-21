window.onload = () => {
  const homeScreen = document.getElementById('homeScreen');
  const usernameInput = document.getElementById('usernameInput');
  const startBtn = document.getElementById('startBtn');
  const tankTypeSelect = document.getElementById('tankTypeSelect');
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const deathScreen = document.getElementById('deathScreen');
  const respawnBtn = document.getElementById('respawnBtn');
  const infoBtn = document.getElementById('infoBtn');
  const infoBox = document.getElementById('infoBox');

  deathScreen.style.display = 'none';
  infoBox.style.display = 'none';

  infoBtn.onclick = () => {
    infoBox.style.display = infoBox.style.display === 'none' ? 'block' : 'none';
  };

  const ARENA_WIDTH = 3200;
  const ARENA_HEIGHT = 2400;

  let socket;
  let myId = null;
  let username = null;

  let players = {};
  let bullets = [];
  let walls = [];

  const keys = {
    up: false,
    down: false,
    left: false,
    right: false,
    shooting: false,
    angle: 0,
  };

  let isDead = false;

  let currentZoom = 1;
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 2;
  const ZOOM_STEP = 0.1;

  startBtn.onclick = () => {
    const name = usernameInput.value.trim();
    if (name.length === 0) {
      alert('Please enter a username.');
      return;
    }
    username = name;
    const tankType = tankTypeSelect.value;
    homeScreen.style.display = 'none';
    canvas.style.display = 'block';
    deathScreen.style.display = 'none';
    isDead = false;
    connectSocket(tankType);
    gameLoop(); // Start smooth input loop
  };

  function connectSocket(tankType) {
    socket = io('https://armytanksbackend.onrender.com');

    socket.on('connect', () => {
      myId = socket.id;
      socket.emit('setUsername', username);
      socket.emit('setTankType', tankType);
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

    socket.on('playerUpdated', (player) => {
      players[player.id] = player;
    });

    socket.on('gameState', (state) => {
      players = state.players;
      bullets = state.bullets;
      walls = state.walls;

      const me = players[myId];
      if (me) {
        if (me.health <= 0 && !isDead) {
          isDead = true;
          deathScreen.style.display = 'flex';
          canvas.style.display = 'none';
        } else if (me.health > 0 && isDead) {
          isDead = false;
          deathScreen.style.display = 'none';
          canvas.style.display = 'block';
        }
      }

      if (!isDead) draw();
    });

    setupInputHandlers();
  }

  function setupInputHandlers() {
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const player = players[myId];
      if (!player) return;
      keys.angle = Math.atan2(mouseY - canvas.height / 2, mouseX - canvas.width / 2);
    });

    canvas.addEventListener('mousedown', () => {
      keys.shooting = true;
    });

    canvas.addEventListener('mouseup', () => {
      keys.shooting = false;
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'w' || e.key === 'ArrowUp') keys.up = true;
      if (e.key === 's' || e.key === 'ArrowDown') keys.down = true;
      if (e.key === 'a' || e.key === 'ArrowLeft') keys.left = true;
      if (e.key === 'd' || e.key === 'ArrowRight') keys.right = true;
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'w' || e.key === 'ArrowUp') keys.up = false;
      if (e.key === 's' || e.key === 'ArrowDown') keys.down = false;
      if (e.key === 'a' || e.key === 'ArrowLeft') keys.left = false;
      if (e.key === 'd' || e.key === 'ArrowRight') keys.right = false;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        currentZoom = Math.min(currentZoom + ZOOM_STEP, MAX_ZOOM);
      } else {
        currentZoom = Math.max(currentZoom - ZOOM_STEP, MIN_ZOOM);
      }
      draw();
    });
  }

  // 🔁 Smooth continuous input loop
  function gameLoop() {
    if (!isDead && socket) {
      sendInput();
    }
    requestAnimationFrame(gameLoop);
  }

  respawnBtn.onclick = () => {
    if (!socket) return;
    socket.emit('respawn');
  };

  function sendInput() {
    if (!socket) return;
    socket.emit('input', keys);
  }

  function drawTank(x, y, angle, health, isMe, username, tankType) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    if (tankType === 'sniper') {
      ctx.fillStyle = isMe ? '#0f0' : '#f00';
      ctx.fillRect(-15, -8, 30, 16);
      ctx.fillStyle = 'gray';
      ctx.fillRect(0, -3, 25, 6);
    } else if (tankType === 'minigun') {
      ctx.fillStyle = isMe ? '#00f' : '#800';
      ctx.fillRect(-15, -10, 30, 20);
      ctx.fillStyle = 'silver';
      ctx.fillRect(0, -5, 15, 10);
    } else if (tankType === 'shotgun') {
      ctx.fillStyle = isMe ? '#ff0' : '#880';
      ctx.beginPath();
      ctx.ellipse(0, 0, 20, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'gray';
      ctx.fillRect(0, -6, 18, 12);
    } else {
      ctx.fillStyle = isMe ? 'lime' : 'red';
      ctx.fillRect(-15, -10, 30, 20);
      ctx.fillStyle = 'gray';
      ctx.fillRect(0, -5, 20, 10);
    }

    ctx.fillStyle = 'black';
    ctx.fillRect(-20, -20, 40, 5);
    ctx.fillStyle = 'lime';
    ctx.fillRect(-20, -20, 40 * (health / 100), 5);

    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(username || 'Anonymous', 0, -25);

    ctx.restore();
  }

  function drawBullet(x, y, radius = 5) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'yellow';
    ctx.fill();
  }

  function drawGrid() {
    const gridSize = 40;
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 0.5 / currentZoom;

    for (let x = 0; x <= ARENA_WIDTH; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ARENA_HEIGHT);
      ctx.stroke();
    }

    for (let y = 0; y <= ARENA_HEIGHT; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(ARENA_WIDTH, y);
      ctx.stroke();
    }
  }

  function drawBorder() {
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 3 / currentZoom;
    ctx.strokeRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
  }

  function drawWalls() {
    ctx.fillStyle = 'gray';
    for (const w of walls) {
      ctx.fillRect(w.x, w.y, w.width, w.height);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const me = players[myId];
    if (!me) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const offsetX = me.x * currentZoom - centerX;
    const offsetY = me.y * currentZoom - centerY;

    ctx.save();
    ctx.scale(currentZoom, currentZoom);
    ctx.translate(-offsetX / currentZoom, -offsetY / currentZoom);

    drawGrid();
    drawBorder();
    drawWalls();

    for (const id in players) {
      const p = players[id];
      drawTank(p.x, p.y, p.angle, p.health, id === myId, p.username, p.tankType);
    }

    for (const b of bullets) {
      drawBullet(b.x, b.y, b.radius || 5);
    }

    ctx.restore();
  }

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  window.addEventListener('resize', () => {
    resizeCanvas();
    draw();
  });

  resizeCanvas();
};
