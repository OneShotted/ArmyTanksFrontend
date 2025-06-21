window.onload = () => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

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

  // UI Elements
  const homeScreen = document.getElementById('homeScreen');
  const usernameInput = document.getElementById('usernameInput');
  const startBtn = document.getElementById('startBtn');
  const tankTypeSelect = document.getElementById('tankTypeSelect');
  const deathScreen = document.getElementById('deathScreen');
  const respawnBtn = document.getElementById('respawnBtn');
  const infoBtn = document.getElementById('infoBtn');
  const infoBox = document.getElementById('infoBox');
  const chatBox = document.getElementById('chatBox');
  const chatInput = document.getElementById('chatInput');

  let chatVisible = false;
  let isDead = false;

  // Initial UI setup
  deathScreen.style.display = 'none';
  infoBox.style.display = 'none';
  canvas.style.display = 'none';

  infoBtn.onclick = () => {
    infoBox.style.display = infoBox.style.display === 'none' ? 'block' : 'none';
  };

  startBtn.onclick = () => {
    const name = usernameInput.value.trim();
    if (!name) {
      alert('Enter a username');
      return;
    }
    username = name;
    const tankType = tankTypeSelect.value;
    homeScreen.style.display = 'none';
    canvas.style.display = 'block';
    deathScreen.style.display = 'none';
    isDead = false;
    connectSocket(tankType);
    gameLoop();
  };

  function connectSocket(tankType) {
    socket = io('https://armytanksbackend.onrender.com');

    socket.on('connect', () => {
      myId = socket.id;
      socket.emit('setUsername', username);
      socket.emit('setTankType', tankType);
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

    socket.on('playerDisconnected', (id) => {
      delete players[id];
    });

    socket.on('chatMessage', ({ username, message }) => {
      const p = document.createElement('p');
      p.innerText = `${username}: ${message}`;
      chatBox.appendChild(p);
      if (chatBox.children.length > 30) chatBox.removeChild(chatBox.children[0]);
      chatBox.scrollTop = chatBox.scrollHeight;
    });

    setupInputHandlers();
  }

  function setupInputHandlers() {
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      keys.angle = Math.atan2(mouseY - centerY, mouseX - centerX);
    });

    canvas.addEventListener('mousedown', () => {
      keys.shooting = true;
    });

    canvas.addEventListener('mouseup', () => {
      keys.shooting = false;
    });

    window.addEventListener('keydown', (e) => {
      if (chatVisible && document.activeElement === chatInput) return;

      if (['w', 'ArrowUp'].includes(e.key)) keys.up = true;
      if (['s', 'ArrowDown'].includes(e.key)) keys.down = true;
      if (['a', 'ArrowLeft'].includes(e.key)) keys.left = true;
      if (['d', 'ArrowRight'].includes(e.key)) keys.right = true;

      // Chat toggle
      if (e.key === 'Enter') {
        if (!chatVisible) {
          chatBox.style.display = 'block';
          chatInput.style.display = 'block';
          chatInput.focus();
          chatVisible = true;
          e.preventDefault();
        } else if (chatInput.value.trim() !== '') {
          socket.emit('chatMessage', { username, message: chatInput.value.trim() });
          chatInput.value = '';
          chatBox.style.display = 'none';
          chatInput.style.display = 'none';
          chatVisible = false;
          e.preventDefault();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (chatVisible && document.activeElement === chatInput) return;

      if (['w', 'ArrowUp'].includes(e.key)) keys.up = false;
      if (['s', 'ArrowDown'].includes(e.key)) keys.down = false;
      if (['a', 'ArrowLeft'].includes(e.key)) keys.left = false;
      if (['d', 'ArrowRight'].includes(e.key)) keys.right = false;
    });

    respawnBtn.onclick = () => {
      if (!socket) return;
      socket.emit('respawn');
    };
  }

  function gameLoop() {
    if (!isDead && socket) {
      socket.emit('input', keys);
    }
    requestAnimationFrame(gameLoop);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const me = players[myId];
    if (!me) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const offsetX = me.x - centerX;
    const offsetY = me.y - centerY;

    ctx.save();
    ctx.translate(centerX - me.x, centerY - me.y);

    // Draw grid
    drawGrid();

    // Draw walls
    drawWalls();

    // Draw players
    for (const id in players) {
      const p = players[id];
      drawTank(p.x, p.y, p.angle, p.health, id === myId, p.username, p.tankType);
    }

    // Draw bullets
    for (const b of bullets) {
      drawBullet(b.x, b.y, b.radius || 5);
    }

    ctx.restore();
  }

  function drawTank(x, y, angle, health, isMe, username, tankType) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Draw tank shape/colors by tankType (same as before)
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

    // Health bar
    ctx.fillStyle = 'black';
    ctx.fillRect(-20, -20, 40, 5);
    ctx.fillStyle = 'lime';
    ctx.fillRect(-20, -20, 40 * (health / 100), 5);

    // Username
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
    ctx.lineWidth = 0.5;

    for (let x = 0; x <= 3200; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 2400);
      ctx.stroke();
    }

    for (let y = 0; y <= 2400; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(3200, y);
      ctx.stroke();
    }
  }

  function drawWalls() {
    ctx.fillStyle = 'gray';
    for (const w of walls) {
      ctx.fillRect(w.x, w.y, w.width, w.height);
    }
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

