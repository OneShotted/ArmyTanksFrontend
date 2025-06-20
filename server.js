const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3000;

app.use(express.static('public'));

const players = {};
const enemies = [];

function createEnemy() {
    return {
        id: Date.now() + Math.random(),
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        hp: 3,
        drop: 'basic'
    };
}

// Spawn new enemies every 5 seconds
setInterval(() => {
    if (enemies.length < 10) {
        enemies.push(createEnemy());
        io.emit('enemies', enemies);
    }
}, 5000);

io.on('connection', socket => {
    console.log('New player:', socket.id);

    players[socket.id] = {
        id: socket.id,
        x: 500,
        y: 500,
        petals: ['basic', 'basic', 'basic', 'basic', 'basic'],
    };

    socket.emit('init', {
        id: socket.id,
        players,
        enemies
    });

    io.emit('players', players);

    socket.on('move', data => {
        const player = players[socket.id];
        if (player) {
            player.x += data.dx;
            player.y += data.dy;
            io.emit('players', players); // <== emit updates to all clients
        }
    });

    socket.on('collect', enemyId => {
        const enemy = enemies.find(e => e.id === enemyId);
        if (enemy && players[socket.id]) {
            players[socket.id].petals.push(enemy.drop);
            enemies.splice(enemies.indexOf(enemy), 1);
            io.emit('enemies', enemies);
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('players', players);
    });
});

server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

