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

  let isDead = false;
  let currentZoom = 1;
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 2;
  const ZOOM_STEP = 0.1;

  // UI elements
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

  // Setup UI display
  deathScreen.style.display = 'none';
  infoBox.style.display = 'none';
  canvas.style.display = 'none';

  infoBtn.onclick = () => {
    infoBox.style.display = infoBox.style.display === 'none' ? 'block' : 'none';
  };

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
    gameLoop();
  };

  function connectSocket(tankType) {
    socket = io('https://armytanksbackend.onrender.com');

    socket.on('connect', () => {
      myId = socket.id;
      socket.emit('setUsername', username);
      socket.emit('setTankType', tankType);
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

    socket.on('chatMessage', ({ username, message }) => {
      const p = document.createElement('p');
      p.innerText = `${username}: ${message}`;
      chatBox.appendChild(p);
      if (chatBox.children.length > 30) {
        chatBox.removeChild(chatBox.children[0]);
      }
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

      if (e.key === 'w' || e.key === 'ArrowUp') keys.up = true;
      if (e.key === 's' || e.key === 'ArrowDown') keys.down = true;
      if (e.key === 'a' || e.key === 'ArrowLeft') keys.left = true;
      if (e.key === 'd' || e.key === 'ArrowRight') keys.right = true;

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

      if (e.key === 'w' || e.key === 'ArrowUp') keys.up = false;
      if (e.key === 's' || e.key === 'ArrowDown') keys.down = false;
      if (e.key === 'a' || e.key === 'ArrowLeft') keys.left = false;
      if (e.key === 'd' || e.key === 'ArrowRight


