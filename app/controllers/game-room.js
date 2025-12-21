'use strict';

const db = require('../../database/db');

const BOARD_WIDTH = parseInt(process.env.BOARD_WIDTH) || 20;
const BOARD_HEIGHT = parseInt(process.env.BOARD_HEIGHT) || 15;
const GAME_SPEED = parseInt(process.env.GAME_SPEED) || 12;

/**
 * GameRoom - مدیریت یک اتاق بازی مستقل
 * هر room حداکثر 10 بازیکن داره و game loop مستقل خودش رو داره
 */
class GameRoom {
    constructor(roomId, io, maxPlayers = 10) {
        this.roomId = roomId;
        this.io = io;
        this.maxPlayers = maxPlayers;
        this.players = new Map();
        this.food = [];
        this.gameInterval = null;
        this.foodEmojis = ['🍎', '🍉', '🍇', '🍊', '🍋', '🍌'];
        this.createdAt = Date.now();

        this.generateFood(50);
        this.startGameLoop();

        console.log(`Room ${roomId} created with capacity ${maxPlayers}`);
    }

    isFull() {
        return this.players.size >= this.maxPlayers;
    }

    isEmpty() {
        return this.players.size === 0;
    }

    canAcceptPlayer() {
        return !this.isFull();
    }

    addPlayer(socket, userData) {
        if (this.isFull()) {
            throw new Error('Room is full');
        }

        const player = {
            id: socket.id,
            userId: userData.userId || null,
            baleUserId: userData.baleUserId || null,
            name: userData.name || `Player_${socket.id.substring(0, 6)}`,
            username: userData.username || null,
            snake: this.createSnake(),
            direction: { x: 1, y: 0 },
            score: 0,
            kills: 0,
            alive: true,
            joinedAt: Date.now()
        };

        this.players.set(socket.id, player);

        // Join Socket.io room
        socket.join(this.roomId);

        // Send initial game state to player
        socket.emit('init', {
            playerId: socket.id,
            roomId: this.roomId,
            boardWidth: BOARD_WIDTH,
            boardHeight: BOARD_HEIGHT,
            players: this.getPlayersData(),
            food: this.food
        });

        // Broadcast to other players in this room
        socket.to(this.roomId).emit('player-joined', {
            id: player.id,
            name: player.name,
            snake: player.snake,
            score: player.score
        });

        console.log(`Player ${player.name} joined room ${this.roomId} (${this.players.size}/${this.maxPlayers})`);

        return player;
    }

    removePlayer(socketId) {
        const player = this.players.get(socketId);
        if (player) {
            this.players.delete(socketId);
            console.log(`Player ${player.name} left room ${this.roomId} (${this.players.size}/${this.maxPlayers})`);
            return player;
        }
        return null;
    }

    updatePlayerDirection(socketId, direction) {
        const player = this.players.get(socketId);
        if (player && player.alive) {
            const newDir = this.normalizeDirection(direction);
            // Validate: can't reverse direction
            if (Math.abs(newDir.x + player.direction.x) !== 2 &&
                Math.abs(newDir.y + player.direction.y) !== 2) {
                player.direction = newDir;
            }
        }
    }

    normalizeDirection(dir) {
        const x = dir.x || 0;
        const y = dir.y || 0;
        return {
            x: x !== 0 ? (x > 0 ? 1 : -1) : 0,
            y: y !== 0 ? (y > 0 ? 1 : -1) : 0
        };
    }

    createSnake() {
        const x = Math.floor(Math.random() * (BOARD_WIDTH - 10)) + 5;
        const y = Math.floor(Math.random() * (BOARD_HEIGHT - 10)) + 5;
        return [
            { x, y },
            { x: x - 1, y },
            { x: x - 2, y }
        ];
    }

    generateFood(count) {
        for (let i = 0; i < count; i++) {
            this.food.push({
                x: Math.floor(Math.random() * BOARD_WIDTH),
                y: Math.floor(Math.random() * BOARD_HEIGHT),
                emoji: this.foodEmojis[Math.floor(Math.random() * this.foodEmojis.length)]
            });
        }
    }

    startGameLoop() {
        const intervalMs = 1000 / GAME_SPEED;
        this.lastUpdateTime = Date.now();

        // Use setInterval but with drift correction
        this.gameInterval = setInterval(() => {
            const now = Date.now();
            const delta = now - this.lastUpdateTime;

            // Skip if we're too fast (shouldn't happen with setInterval)
            if (delta < intervalMs * 0.5) return;

            this.lastUpdateTime = now;
            this.update();
        }, intervalMs);
    }

    stopGameLoop() {
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
            this.gameInterval = null;
            console.log(`Game loop stopped for room ${this.roomId}`);
        }
    }

    update() {
        if (this.players.size === 0) return;

        const updates = [];

        this.players.forEach((player, id) => {
            if (!player.alive) return;

            // Move snake
            const head = player.snake[0];
            const newHead = {
                x: head.x + player.direction.x,
                y: head.y + player.direction.y
            };

            // Wrap around borders
            if (newHead.x < 0) newHead.x = BOARD_WIDTH - 1;
            if (newHead.x >= BOARD_WIDTH) newHead.x = 0;
            if (newHead.y < 0) newHead.y = BOARD_HEIGHT - 1;
            if (newHead.y >= BOARD_HEIGHT) newHead.y = 0;

            // Check self collision
            if (player.snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
                this.handlePlayerDeath(id, player);
                return;
            }

            // Check collision with other players
            let killer = null;
            this.players.forEach((otherPlayer, otherId) => {
                if (otherId !== id && otherPlayer.alive) {
                    if (otherPlayer.snake.some((segment) => {
                        return segment.x === newHead.x && segment.y === newHead.y;
                    })) {
                        killer = otherPlayer;
                    }
                }
            });

            if (killer) {
                // Give killer the victim's score as bonus and increment kills
                killer.score += player.score;
                killer.kills += 1;
                this.handlePlayerDeath(id, player, killer);
                return;
            }

            // Check food collision
            const foodIndex = this.food.findIndex(f => f.x === newHead.x && f.y === newHead.y);
            let ate = false;

            if (foodIndex !== -1) {
                this.food.splice(foodIndex, 1);
                player.score += 10;
                ate = true;
                this.generateFood(1);
            }

            // Update snake
            player.snake.unshift(newHead);
            if (!ate) {
                player.snake.pop();
            }

            updates.push({
                id: player.id,
                name: player.name,
                username: player.username,
                snake: player.snake,
                score: player.score
            });
        });

        // Broadcast updates only to this room with server timestamp
        if (updates.length > 0 || this.food.length > 0) {
            this.io.to(this.roomId).volatile.emit('update', {
                players: updates,
                food: this.food,
                t: Date.now() // Server timestamp for client sync
            });
        }
    }

    async handlePlayerDeath(socketId, player, killer = null) {
        player.alive = false;

        // Save score to database (including kills)
        if (player.userId) {
            try {
                await db.query(
                    `INSERT INTO leaderboard (user_id, score, snake_length, game_duration, kills)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [player.userId, player.score, player.snake.length, 0, player.kills]
                );
            } catch (error) {
                console.error('Error saving score:', error);
            }
        }

        // Emit death event to this room
        this.io.to(this.roomId).emit('player-died', {
            id: socketId,
            name: player.name,
            score: player.score,
            killedBy: killer ? killer.name : null,
            killerBonus: killer ? player.score : 0
        });

        // Notify killer about the bonus
        if (killer) {
            console.log(`${killer.name} killed ${player.name} and got +${player.score} bonus!`);
        }

        // Remove player after delay
        setTimeout(() => {
            this.players.delete(socketId);
        }, 1000);
    }

    getPlayersData() {
        const data = [];
        this.players.forEach(player => {
            data.push({
                id: player.id,
                name: player.name,
                snake: player.snake,
                score: player.score,
                alive: player.alive
            });
        });
        return data;
    }

    getRoomStats() {
        return {
            roomId: this.roomId,
            playerCount: this.players.size,
            maxPlayers: this.maxPlayers,
            isFull: this.isFull(),
            isEmpty: this.isEmpty(),
            createdAt: this.createdAt,
            uptime: Date.now() - this.createdAt
        };
    }

    destroy() {
        this.stopGameLoop();
        this.players.clear();
        this.food = [];
        console.log(`Room ${this.roomId} destroyed`);
    }
}

module.exports = GameRoom;
