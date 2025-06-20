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

const bagButton = document.getElementById('bag-button');
bagButton.addEventListener('click', () => {
    showInventory = !showInventory;
});

const HOTBAR_SIZE = 5;        // fixed 5 slots
const HOTBAR_SLOT_SIZE = 50;  // square size

document.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (e.key === 'z') showInventory = !showInventory;
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

    // Check inventory petals first
    inventory.forEach((petal, i) => {
        const x = 30 + (i % 5) * 55;
        const y = 70 + Math.floor(i / 5) * 55;
        if (Math.hypot(mouseX - x, mouseY - y) < 20) {
            draggedPetal = petal;
            dragOrigin = { from: 'inventory', index: i };
        }
    });

    // Check hotbar slots (rectangles)
    const hotbarY = canvas.height - HOTBAR_SLOT_SIZE - 10;
    const hotbarX = canvas.width / 2 - (HOTBAR_SIZE * HOTBAR_SLOT_SIZE) / 2;

    petals.forEach((petal, i) => {
        const slotX = hotbarX + i * HOTBAR_SLOT_SIZE;
        const slotY = hotbarY;
        if (
            mouseX >= slotX &&
            mouseX <= slotX + HOTBAR_SLOT_SIZE &&
            mouseY >= slotY &&
            mouseY <= slotY + HOTBAR_SLOT_SIZE
        ) {
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

    const hotbarY = canvas.height - HOTBAR_SLOT_SIZE - 10;
    const hotbarX = canvas.width / 2 - (HOTBAR_SIZE * HOTBAR_SLOT_SIZE) / 2;

    let dropped = false;

    // Try dropping on hotbar slots
    for (let i = 0; i < HOTBAR_SIZE; i++) {
        const slotX = hotbarX + i * HOTBAR_SLOT_SIZE;
        const slotY = hotbarY;

        if (
            mouseX >= slotX &&
            mouseX <= slotX + HOTBAR_SLOT_SIZE &&
            mouseY >= slotY &&
            mouseY <= slotY + HOTBAR_SLOT_SIZE
        ) {
            if (dragOrigin.from === 'inventory') {
                // Remove from inventory
                players[playerId].inventory.splice(dragOrigin.index, 1);
                // Swap with petal in hotbar slot if exists
                const replaced = players[playerId].petals[i];
                if (replaced) players[playerId].inventory.push(replaced);
                // Set dragged petal in hotbar slot
                players[playerId].petals[i] = draggedPetal;
            } else if (dragOrigin.from === 'hotbar') {
                // Swap petals between slots
                const temp = players[playerId].petals[i];
                players[playerId].petals[i] = draggedPetal;
                players[playerId].petals[dragOrigin.index] = temp;
            }
            dropped = true;
            break;
        }
    }

    // If dropped outside hotbar and dragging from hotbar, move petal back to inventory
    if (!dropped && dragOrigin.from === 'hotbar') {
        players[playerId].inventory.push(draggedPetal);
        players[playerId].petals.splice(dragOrigin.index, 1);
    }

    // Emit update to server to sync petals/inventory
    socket.emit('updatePetalsInventory', {
        petals: players[playerId].petals,
        inventory: players[playerId].inventory
    });

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

    // Draw enemies
    enemies.forEach(e => {
        ctx.fillStyle = 'red';
        ctx.fillRect(e.x + offsetX, e.y + offsetY, 30, 30);
        ctx.fillStyle = 'white';
        ctx.fillText(`HP: ${e.hp}`, e.x + offsetX, e.y + offsetY - 5);
    });

    // Draw drops
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

    // Draw players
    for (const id in players) {
        const p = players[id];
        const isMe = id === playerId;

        // Player body
        ctx.fillStyle = isMe ? 'lime' : 'white';
        ctx.beginPath();
        ctx.arc(p.x + offsetX, p.y + offsetY, 20, 0, Math.PI * 2);
        ctx.fill();

        // Face (eyes + smile)
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(p.x + offsetX - 6, p.y + offsetY - 5, 2, 0, Math.PI * 2); // left eye
        ctx.arc(p.x + offsetX + 6, p.y + offsetY - 5, 2, 0, Math.PI * 2); // right eye
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x + offsetX, p.y + offsetY + 2, 7, 0, Math.PI); // smile
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

    // Draw hotbar background squares
    const hotbarY = canvas.height - HOTBAR_SLOT_SIZE - 10;
    const hotbarX = canvas.width / 2 - (HOTBAR_SIZE * HOTBAR_SLOT_SIZE) / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    for (let i = 0; i < HOTBAR_SIZE; i++) {
        ctx.fillRect(hotbarX + i * HOTBAR_SLOT_SIZE, hotbarY, HOTBAR_SLOT_SIZE - 5, HOTBAR_SLOT_SIZE - 5);
    }

    // Draw petals inside hotbar squares
    const hotbarPetals = players[playerId]?.petals || [];
    hotbarPetals.forEach((petal, i) => {
        if (!petal) return;
        const x = hotbarX + i * HOTBAR_SLOT_SIZE + HOTBAR_SLOT_SIZE / 2;
        const y = hotbarY + HOTBAR_SLOT_SIZE / 2;

        // Draw petal shape depending on type
        if (petal.type === 'rock') {
            const size = 15;
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
            ctx.arc(x, y, 15, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // Draw inventory panel
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

    // Draw dragged petal following mouse
    if (draggedPetal) {
        const x = mouseX;
        const y = mouseY;

        if (draggedPetal.type === 'rock') {
            const size = 20;
            ctx.fillStyle = 'yellow';
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
            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            ctx.arc(x, y, 20, 0, Math.PI * 2);
            ctx.fill();
        }
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

socket.on('players', data => {
    // Merge players but keep your local player's petals and inventory to prevent flicker
    for (const id in data) {
        if (id === playerId && players[id]) {
            players[id] = {
                ...data[id],
                petals: players[id].petals,
                inventory: players[id].inventory
            };
        } else {
            players[id] = data[id];
        }
    }
});

socket.on('enemies', data => enemies = data);
socket.on('drops', data => drops = data);

loop();
