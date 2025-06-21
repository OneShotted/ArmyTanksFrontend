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
  const TANK_RADIUS = 20;

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

  // Zoom variables
  let zoomLevel = 1;
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 2;

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
      walls = data.walls || [];
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
      walls = state.walls || [];

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

    // Zoom with mouse wheel
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomSpeed = 0.1;
      if (e.deltaY < 0) {
        zoomLevel += zoomSpeed;
      } else {
        zoomLevel -= zoomSpeed;
      }
      zoomLevel = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomLevel));
      draw();
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

  function drawWall(wall, offsetX, offsetY) {
    ctx.fillStyle = '#654321'; // Brownish wall color
    ctx.fillRect(wall.x - offsetX, wall.y - offsetY, wall.width, wall.height);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(wall.x - offsetX, wall.y - offsetY, wall.width, wall.height);
  }

  function drawGrid(offsetX = 0, offsetY = 0) {
    const gridSize = 40;
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 0.5;

    const arenaLeft = -offsetX;
    const arenaTop = -offsetY;
    const arenaRight = arenaLeft + ARENA_WIDTH;
    const arenaBottom = arenaTop + ARENA_HEIGHT;

    let startX = Math.floor(arenaLeft / gridSize) * gridSize;
    for (let x = startX; x <= arenaRight; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo((x - offsetX) * zoomLevel, (arenaTop - offsetY) * zoomLevel);
      ctx.lineTo((x - offsetX) * zoomLevel, (arenaBottom - offsetY) * zoomLevel);
      ctx.stroke();
    }

    let startY = Math.floor(arenaTop / gridSize) * gridSize;
    for (let y = startY; y <= arenaBottom; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo((arenaLeft - offsetX) * zoomLevel, (y - offsetY) * zoomLevel);
      ctx.lineTo((arenaRight - offsetX) * zoomLevel, (y - offsetY) * zoomLevel);
      ctx.stroke();
    }
  }

  function drawBorder(offsetX = 0, offsetY = 0) {
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 3;
    ctx.strokeRect(
      (0 - offsetX) * zoomLevel,
      (0 - offsetY) * zoomLevel,
      ARENA_WIDTH * zoomLevel,
      ARENA_HEIGHT * zoomLevel
    );
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const me = players[myId];
    if (!me) return;

    // Center camera on player with zoom
    const offsetX = me.x - (canvas.width / 2) / zoomLevel;
    const offsetY = me.y - (canvas.height / 2) / zoomLevel;

    ctx.save();
    ctx.scale(zoomLevel, zoomLevel);

    drawGrid(offsetX, offsetY);
    drawBorder(offsetX, offsetY);

    // Draw walls
    for (const wall of walls) {
      drawWall(wall, offsetX, offsetY);
    }

    for (const id in players) {
      const p = players[id];
      drawTank(p.x - offsetX, p.y - offsetY, p.angle, p.health, id === myId, p.username, p.tankType);
    }

    for (const b of bullets) {
      drawBullet(b.x - offsetX, b.y - offsetY, b.radius || 5);
    }

    ctx.restore();
  }

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
};

