'use strict';

const db = require('../../database/db');
const userService = require('../../database/userService');

const BOARD_WIDTH = parseInt(process.env.BOARD_WIDTH) || 100;
const BOARD_HEIGHT = parseInt(process.env.BOARD_HEIGHT) || 60;
const GAME_SPEED = parseInt(process.env.GAME_SPEED) || 10;
const MAX_PLAYERS = parseInt(process.env.MAX_PLAYERS) || 150;

class GameController {
    constructor() {
        this.players = new Map();
        this.food = [];
        this.gameInterval = null;
        this.foodEmojis = ['🍎', '🍉', '🍇', '🍊', '🍋', '🍌'];
        this.generateFood(50); // Generate initial food
    }

    listen(io) {
        this.io = io;

        io.on('connection', (socket) => {
            console.log(`New connection: ${socket.id}`);

            socket.on('join', async (data) => {
                try {
                    const { baleUserId, name } = data;

                    if (this.players.size >= MAX_PLAYERS) {
                        socket.emit('error', { message: 'بازی پر است' });
                        return;
                    }

                    // Get or create user
                    let user = null;
                    if (baleUserId) {
                        user = await userService.getUserByBaleId(baleUserId);
                    }

                    const playerName = user ? `${user.first_name} ${user.last_name}` : (name || `Player_${socket.id.substring(0, 6)}`);

                    const player = {
                        id: socket.id,
                        userId: user ? user.id : null,
                        baleUserId: baleUserId || null,
                        name: playerName,
                        snake: this.createSnake(),
                        direction: { x: 1, y: 0 },
                        score: 0,
                        alive: true
                    };

                    this.players.set(socket.id, player);

                    // Send game state to new player
                    socket.emit('init', {
                        playerId: socket.id,
                        boardWidth: BOARD_WIDTH,
                        boardHeight: BOARD_HEIGHT,
                        players: this.getPlayersData(),
                        food: this.food
                    });

                    // Broadcast new player to others
                    socket.broadcast.emit('player-joined', {
                        id: player.id,
                        name: player.name,
                        snake: player.snake,
                        score: player.score
                    });

                    console.log(`Player joined: ${playerName} (${socket.id})`);
                } catch (error) {
                    console.error('Join error:', error);
                    socket.emit('error', { message: 'خطا در اتصال' });
                }
            });

            socket.on('direction', (direction) => {
                const player = this.players.get(socket.id);
                if (player && player.alive) {
                    // Validate direction (can't reverse)
                    const newDir = this.normalizeDirection(direction);
                    if (Math.abs(newDir.x + player.direction.x) !== 2 &&
                        Math.abs(newDir.y + player.direction.y) !== 2) {
                        player.direction = newDir;
                    }
                }
            });

            socket.on('disconnect', () => {
                this.handlePlayerDisconnect(socket.id);
            });
        });

        // Start game loop
        if (!this.gameInterval) {
            this.startGameLoop();
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
        this.gameInterval = setInterval(() => {
            this.update();
        }, intervalMs);
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

            // Check food collision
            const foodIndex = this.food.findIndex(f => f.x === newHead.x && f.y === newHead.y);
            let ate = false;

            if (foodIndex !== -1) {
                // Ate food
                this.food.splice(foodIndex, 1);
                player.score += 10;
                ate = true;

                // Generate new food
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
                snake: player.snake,
                score: player.score
            });
        });

        // Broadcast updates
        if (updates.length > 0 || this.food.length > 0) {
            this.io.emit('update', {
                players: updates,
                food: this.food
            });
        }
    }

    async handlePlayerDeath(socketId, player) {
        player.alive = false;

        // Save score to database
        if (player.userId) {
            try {
                await db.query(
                    `INSERT INTO leaderboard (user_id, score, snake_length, game_duration)
                     VALUES ($1, $2, $3, $4)`,
                    [player.userId, player.score, player.snake.length, 0]
                );

                // Update high score
                await db.query(
                    `INSERT INTO high_scores (user_id, score, snake_length, achieved_at)
                     VALUES ($1, $2, $3, NOW())
                     ON CONFLICT (user_id)
                     DO UPDATE SET
                         score = GREATEST(high_scores.score, $2),
                         snake_length = GREATEST(high_scores.snake_length, $3),
                         achieved_at = CASE
                             WHEN $2 > high_scores.score THEN NOW()
                             ELSE high_scores.achieved_at
                         END`,
                    [player.userId, player.score, player.snake.length]
                );
            } catch (error) {
                console.error('Error saving score:', error);
            }
        }

        this.io.emit('player-died', {
            id: socketId,
            name: player.name,
            score: player.score
        });

        // Remove player after delay
        setTimeout(() => {
            this.players.delete(socketId);
        }, 1000);
    }

    handlePlayerDisconnect(socketId) {
        const player = this.players.get(socketId);
        if (player) {
            if (player.alive) {
                this.handlePlayerDeath(socketId, player);
            } else {
                this.players.delete(socketId);
            }

            this.io.emit('player-left', { id: socketId });
            console.log(`Player left: ${player.name} (${socketId})`);
        }
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
}

module.exports = GameController;
