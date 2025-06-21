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

  // Walls around spawn with 4 entrances
  const walls = [
    // Top wall segments (left, gap, right)
    { x: 1400, y: 1150, width: 140, height: 20 },
    { x: 1600, y: 1150, width: 40, height: 20 }, // entrance gap here (between 1540 - 1600)
    { x: 1640, y: 1150, width: 140, height: 20 },

    // Bottom wall segments (left, gap, right)
    { x: 1400, y: 1330, width: 140, height: 20 },
    { x: 1600, y: 1330, width: 40, height: 20 }, // entrance gap here
    { x: 1640, y: 1330, width: 140, height: 20 },

    // Left wall segments (top, gap, bottom)
    { x: 1400, y: 1150, width: 20, height: 80 },
    { x: 1400, y: 1170, width: 20, height: 40 }, // entrance gap here (between 1190 - 1230)
    { x: 1400, y: 1210, width: 20, height: 80 },

    // Right wall segments (top, gap, bottom)
    { x: 1780, y: 1150, width: 20, height: 80 },
    { x: 1780, y: 1170, width: 20, height: 40 }, // entrance gap here
    { x: 1780, y: 1210, width: 20, height: 80 },
  ];

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

  let isDead = false;

  // Zoom settings
  let currentZoom = 1;
  const zoomStep = 0.1;
  const minZoom = 0.5;
  const maxZoom = 2;

  // Zoom controls
  window.addEventListener('wheel', (e) => {
    if (!players[myId]) return;
    const oldZoom = currentZoom;
    if (e.deltaY < 0) {
      currentZoom += zoomStep;
    } else {
      currentZoom -= zoomStep;
    }
    currentZoom = Math.min(maxZoom, Math.max(minZoom, currentZoom));

    // Optional: prevent page scroll when zooming on canvas
    if (Math.abs(currentZoom - oldZoom) > 0.0001) {
      e.preventDefault();
    }
  }, { passive: false });

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

  function drawGrid(offsetX = 0, offsetY = 0) {
    const gridSize = 40;
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 0.5 / currentZoom; // scale grid line width with zoom

    const arenaLeft = -offsetX;
    const arenaTop = -offsetY;
    const arenaRight = arenaLeft + ARENA_WIDTH;
    const arenaBottom = arenaTop + ARENA_HEIGHT;

    let startX = Math.floor(arenaLeft / gridSize) * gridSize;
    for (let x = startX; x <= arenaRight; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo((x + offsetX) * currentZoom, (arenaTop + offsetY) * currentZoom);
      ctx.lineTo((x + offsetX) * currentZoom, (arenaBottom + offsetY) * currentZoom);
      ctx.stroke();
    }

    let startY = Math.floor(arenaTop / gridSize) * gridSize;
    for (let y = startY; y <= arenaBottom; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo((arenaLeft + offsetX) * currentZoom, (y + offsetY) * currentZoom);
      ctx.lineTo((arenaRight + offsetX) * currentZoom, (y + offsetY) * currentZoom);
      ctx.stroke();
    }
  }

  function drawBorder(offsetX = 0, offsetY = 0) {
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 3 / currentZoom; // scale border width with zoom
    const x = -offsetX;
    const y = -offsetY;
    ctx.strokeRect(x * currentZoom, y * currentZoom, ARENA_WIDTH * currentZoom, ARENA_HEIGHT * currentZoom);
  }

  function drawWalls() {
    ctx.fillStyle = '#555'; // dark fill color
    ctx.strokeStyle = '#222'; // dark stroke color
    ctx.lineWidth = 3 / currentZoom; // scale line width with zoom

    for (const w of walls) {
      ctx.fillRect(w.x * currentZoom, w.y * currentZoom, w.width * currentZoom, w.height * currentZoom);
      ctx.strokeRect(w.x * currentZoom, w.y * currentZoom, w.width * currentZoom, w.height * currentZoom);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const me = players[myId];
    if (!me) return;

    // Calculate offsets so player is always centered, then scale everything by zoom
    const offsetX = me.x - canvas.width / (2 * currentZoom);
    const offsetY = me.y - canvas.height / (2 * currentZoom);

    drawGrid(offsetX, offsetY);
    drawBorder(offsetX, offsetY);
    drawWalls();

    for (const id in players) {
      const p = players[id];
      const drawX = (p.x - offsetX) * currentZoom;
      const drawY = (p.y - offsetY) * currentZoom;
      drawTank(drawX, drawY, p.angle, p.health, id === myId, p.username, p.tankType);
    }

    for (const b of bullets) {
      drawBullet((b.x - offsetX) * currentZoom, (b.y - offsetY) * currentZoom, (b.radius || 5) * currentZoom);
    }
  }

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
};

