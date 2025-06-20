const socket = io('https://armytanksbackend.onrender.com');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let playerId;
let players = {};
let enemies = [];
let drops = [];

let keys = {};
let showInventory = false;
let isAttacking = false;

document.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (e.key === 'i') showInventory = !showInventory;
});
document.addEventListener('keyup', e => keys[e.key] = false);
document.addEventListener('mousedown', e => { if (e.button === 0) isAttacking = true; });
document.addEventListener('mouseup', e => { if (e.button === 0) isAttacking = false; });

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

    // Draw enemies
    enemies.forEach(e => {
        ctx.fillStyle = 'red';
        ctx.fillRect(e.x + offsetX, e.y + offsetY, 30, 30);
        ctx.fillStyle = 'white';
        ctx.fillText(`HP: ${e.hp}`, e.x + offsetX, e.y + offsetY - 5);
    });

    // Draw drops
    drops.forEach(d => {
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(d.x + offsetX, d.y + offsetY, 8, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw players
    for (const id in players) {
        const p = players[id];
        const isMe = id === playerId;

        // Core
        ctx.fillStyle = isMe ? 'lime' : 'white';
        ctx.beginPath();
        ctx.arc(p.x + offsetX, p.y + offsetY, 20, 0, Math.PI * 2);
        ctx.fill();

        // Orbiting petals
        if (isMe && p.petals) {
            const time = Date.now() / 500;
            const baseRadius = isAttacking ? 70 : 40;
            p.petals.forEach((petal, i) => {
                const angle = time + (i / p.petals.length) * Math.PI * 2;
                const px = p.x + Math.cos(angle) * baseRadius;
                const py = p.y + Math.sin(angle) * baseRadius;

                // Send petal position to server
                if (isAttacking) {
                    socket.emit('petalAttack', { petalId: petal.id, x: px, y: py });
                }

                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(px + offsetX, py + offsetY, 10, 0, Math.PI * 2);
                ctx.fill();

                // Health bar
                ctx.fillStyle = 'red';
                ctx.fillRect(px + offsetX - 10, py + offsetY + 12, 20, 4);
                ctx.fillStyle = 'lime';
                ctx.fillRect(px + offsetX - 10, py + offsetY + 12, 20 * (petal.hp / 3), 4);
            });
        }
    }

    // HOTBAR
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

    // INVENTORY
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
    drops = data.drops;
});

socket.on('players', data => players = data);
socket.on('enemies', data => enemies = data);
socket.on('drops', data => drops = data);

loop();


