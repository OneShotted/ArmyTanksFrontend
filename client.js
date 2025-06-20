const socket = io('https://armytanksbackend.onrender.com'); // Change if needed

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let playerId;
let players = {};
let enemies = [];

let keys = {};
let showInventory = false;

document.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (e.key === 'i') showInventory = !showInventory;
});
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

    // Draw all players
    for (const id in players) {
        const p = players[id];
        const isMe = id === playerId;

        // Player core
        ctx.fillStyle = isMe ? 'lime' : 'white';
        ctx.beginPath();
        ctx.arc(p.x + offsetX, p.y + offsetY, 20, 0, Math.PI * 2);
        ctx.fill();

        // Orbiting petals
        if (isMe && p.petals) {
            const time = Date.now() / 500;
            const radius = 40;
            p.petals.forEach((petal, i) => {
                const angle = time + (i / p.petals.length) * Math.PI * 2;
                const px = p.x + Math.cos(angle) * radius;
                const py = p.y + Math.sin(angle) * radius;
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(px + offsetX, py + offsetY, 10, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }

    // Draw enemies
    enemies.forEach(e => {
        ctx.fillStyle = 'red';
        ctx.fillRect(e.x + offsetX, e.y + offsetY, 30, 30);
    });

    // HOTBAR UI (bottom center)
    const hotbar = players[playerId]?.petals || [];
    const hotbarWidth = hotbar.length * 50;
    const hotbarX = canvas.width / 2 - hotbarWidth / 2;
    const hotbarY = canvas.height - 60;

    hotbar.forEach((petal, i) => {
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(hotbarX + i * 50 + 25, hotbarY + 25, 20, 0, Math.PI * 2);
        ctx.fill();
    });

    // Inventory (toggleable)
    if (showInventory) {
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(20, 20, 300, 300);

        ctx.fillStyle = 'white';
        ctx.font = '18px Arial';
        ctx.fillText('Inventory:', 30, 50);

        const inventory = players[playerId]?.inventory || [];
        inventory.forEach((petal, i) => {
            const x = 30 + (i % 5) * 55;
            const y = 70 + Math.floor(i / 5) * 55;
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(x, y, 20, 0, Math.PI * 2);
            ctx.fill();
        });
    }
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


