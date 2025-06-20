const socket = io('https://armytanksbackend.onrender.com'); // CHANGE THIS if needed

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let playerId;
let players = {};
let enemies = [];

let keys = {};

document.addEventListener('keydown', e => keys[e.key] = true);
document.addEventListener('keyup', e => keys[e.key] = false);

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const me = players[playerId];
    if (!me) return;

    const offsetX = canvas.width / 2 - me.x;
    const offsetY = canvas.height / 2 - me.y;

    // Draw players
    for (const id in players) {
        const p = players[id];
        ctx.fillStyle = id === playerId ? 'lime' : 'white';
        ctx.beginPath();
        ctx.arc(p.x + offsetX, p.y + offsetY, 20, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw enemies
    enemies.forEach(e => {
        ctx.fillStyle = 'red';
        ctx.fillRect(e.x + offsetX, e.y + offsetY, 30, 30);
    });

    // Draw inventory
    ctx.fillStyle = 'black';
    ctx.fillRect(10, canvas.height - 50, 300, 40);
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    const mePetals = me.petals || [];
    mePetals.forEach((petal, i) => {
        ctx.fillStyle = 'cyan';
        ctx.fillText(petal, 20 + i * 55, canvas.height - 25);
    });
}

function update() {
    const p = players[playerId];
    if (!p) return;

    let dx = 0, dy = 0;
    if (keys['w']) dy -= 5;
    if (keys['s']) dy += 5;
    if (keys['a']) dx -= 5;
    if (keys['d']) dx += 5;

    socket.emit('move', { dx, dy });

    enemies.forEach(enemy => {
        const dist = Math.hypot(p.x - enemy.x, p.y - enemy.y);
        if (dist < 30) {
            socket.emit('collect', enemy.id);
        }
    });
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

socket.on('init', data => {
    playerId = data.id;
    players = data.players;
    enemies = data.enemies;
});

socket.on('players', data => {
    players = data;
});

socket.on('enemies', data => {
    enemies = data;
});

loop();


