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

let draggedPetal = null;
let dragOrigin = null;
let mouseX = 0;
let mouseY = 0;

document.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (e.key === 'i') showInventory = !showInventory;
});
document.addEventListener('keyup', e => keys[e.key] = false);

canvas.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

canvas.addEventListener('mousedown', e => {
    const inventory = players[playerId]?.inventory || [];
    const petals = players[playerId]?.petals || [];
    mouseX = e.clientX;
    mouseY = e.clientY;

    inventory.forEach((petal, i) => {
        const x = 30 + (i % 5) * 55;
        const y = 70 + Math.floor(i / 5) * 55;
        if (Math.hypot(mouseX - x, mouseY - y) < 20) {
            draggedPetal = petal;
            dragOrigin = { from: 'inventory', index: i };
        }
    });

    const hotbarY = canvas.height - 60;
    const hotbarX = canvas.width / 2 - petals.length * 50 / 2;
    petals.forEach((petal, i) => {
        const x = hotbarX + i * 50 + 25;
        const y = hotbarY + 25;
        if (Math.hypot(mouseX - x, mouseY - y) < 20) {
            draggedPetal = petal;
            dragOrigin = { from: 'hotbar', index: i };
        }
    });

    if (e.button === 0) isAttacking = true;
});
canvas.addEventListener('mouseup', e => {
    if (e.button === 0) isAttacking = false;

    if (!draggedPetal) return;

    const inventory = players[playerId]?.inventory || [];
    const petals = players[playerId]?.petals || [];
    mouseX = e.clientX;
    mouseY = e.clientY;

    const hotbarY = canvas.height - 60;
    const hotbarX = canvas.width / 2 - petals.length * 50 / 2;

    let dropped = false;

    petals.forEach((slotPetal, i) => {
        const x = hotbarX + i * 50 + 25;
        const y = hotbarY + 25;
        if (Math.hypot(mouseX - x, mouseY - y) < 20) {
            if (dragOrigin.from === 'inventory') {
                // Fixed: swap inventory petal with hotbar petal
                players[playerId].inventory.splice(dragOrigin.index, 1);
                const replaced = players[playerId].petals[i];
                if (replaced) players[playerId].inventory.push(replaced);
                players[playerId].petals[i] = draggedPetal;
            } else if (dragOrigin.from === 'hotbar') {
                const temp = players[playerId].petals[i];
                players[playerId].petals[i] = draggedPetal;
                players[playerId].petals[dragOrigin.index] = temp;
            }
            dropped = true;
        }
    });

    if (!dropped && dragOrigin.from === 'hotbar') {
        players[playerId].inventory.push(draggedPetal);
        players[playerId].petals.splice(dragOrigin.index, 1);
    }

    draggedPetal = null;
    dragOrigin = null;
});

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

    enemies.forEach(e => {
        ctx.fillStyle = 'red';
        ctx.fillRect(e.x + offsetX, e.y + offsetY, 30, 30);
        ctx.fillStyle = 'white';
        ctx.fillText(`HP: ${e.hp}`, e.x + offsetX, e.y + offsetY - 5);
    });

    drops.forEach(d => {
        const type = d.petal?.type || 'basic';
        if (type === 'rock') {
            const size = 10;
            const centerX = d.x + offsetX;
            const centerY = d.y + offsetY;
            ctx.fillStyle = 'gray';
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = Math.PI / 3 * i;
                const x = centerX + Math.cos(angle) * size;
                const y = centerY + Math.sin(angle) * size;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(d.x + offsetX, d.y + offsetY, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    for (const id in players) {
        const p = players[id];
        const isMe = id === playerId;

        // Player body
        ctx.fillStyle = isMe ? 'lime' : 'white';
        ctx.beginPath();
        ctx.arc(p.x + offsetX, p.y + offsetY, 20, 0, Math.PI * 2);
        ctx.fill();

        // Eyes and smile (face)
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(p.x + offsetX - 6, p.y + offsetY - 5, 2, 0, Math.PI * 2);
        ctx.arc(p.x + offsetX + 6, p.y + offsetY - 5, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x + offsetX, p.y + offsetY + 2, 7, 0, Math.PI);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (isMe && p.petals) {
            const time = Date.now() / 500;
            const baseRadius = isAttacking ? 70 : 40;
            p.petals.forEach((petal, i) => {
                if (petal.isReloading) return;
                const angle = time + (i / p.petals.length) * Math.PI * 2;
                const px = p.x + Math.cos(angle) * baseRadius;
                const py = p.y + Math.sin(angle) * baseRadius;

                if (isAttacking) {
                    socket.emit('petalAttack', { petalId: petal.id, x: px, y: py });
                }

                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(px + offsetX, py + offsetY, 10, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = 'red';
                ctx.fillRect(px + offsetX - 10, py + offsetY + 12, 20, 4);
                ctx.fillStyle = 'lime';
                ctx.fillRect(px + offsetX - 10, py + offsetY + 12, 20 * (petal.hp / 3), 4);
            });
        }
    }

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

            if (petal.type === 'rock') {
                const size = 20;
                ctx.fillStyle = 'gray';
                ctx.beginPath();
                for (let j = 0; j < 6; j++) {
                    const angle = Math.PI / 3 * j;
                    const px = x + Math.cos(angle) * size;
                    const py = y + Math.sin(angle) * size;
                    if (j === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(x, y, 20, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    if (draggedPetal) {
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 20, 0, Math.PI * 2);
        ctx.fill();
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


