const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let playerId;
let players = {};
let enemies = [];

let keys = {};

document.addEventListener('keydown', e => keys[e.key] = true);
document.addEventListener('keyup', e => keys[e.key] = false);

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const id in players) {
        const p = players[id];
        ctx.fillStyle = id === playerId ? 'lime' : 'white';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
        ctx.fill();

        if (id === playerId) {
            p.petals?.forEach((petal, i) => {
                ctx.fillStyle = 'cyan';
                ctx.fillText(petal, 10 + i * 60, 20);
            });
        }
    }

    enemies.forEach(e => {
        ctx.fillStyle = 'red';
        ctx.fillRect(e.x, e.y, 30, 30);
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

    // Try collect enemy
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

