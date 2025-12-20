'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const GameController = require('./app/controllers/game-controller');
const userService = require('./database/userService');

// Middleware
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res) => {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
}));
app.use(express.json());

// Routes
app.get('/', (request, response) => {
    response.sendFile('index.html', { root: path.join(__dirname, 'public') });
});

// Health check for Docker
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// API Routes for Bale Bot

// Check if user exists
app.get('/api/user/:baleUserId', async (req, res) => {
    try {
        const user = await userService.getUserByBaleId(req.params.baleUserId);
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Register new user
app.post('/api/register', async (req, res) => {
    try {
        const { baleUserId, phoneNumber, firstName, lastName, employeeCode } = req.body;

        if (!baleUserId || !firstName || !lastName || !employeeCode) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const user = await userService.registerUser(
            baleUserId,
            phoneNumber || '',
            firstName,
            lastName,
            employeeCode
        );

        res.json({ success: true, user });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Get top N players
app.get('/api/leaderboard/top/:limit?', async (req, res) => {
    try {
        const limit = parseInt(req.params.limit) || 10;
        const leaderboard = await userService.getTopPlayers(limit);
        res.json(leaderboard);
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
});

// Get user stats
app.get('/api/user/:baleUserId/stats', async (req, res) => {
    try {
        const user = await userService.getUserByBaleId(req.params.baleUserId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const rank = await userService.getUserRank(user.id);

        // Get user's game stats
        const db = require('./database/db');
        const statsQuery = `
            SELECT
                COUNT(*) as games_played,
                MAX(score) as high_score,
                MAX(snake_length) as max_length
            FROM leaderboard
            WHERE user_id = $1
        `;

        const statsResult = await db.query(statsQuery, [user.id]);
        const stats = statsResult.rows[0];

        res.json({
            first_name: user.first_name,
            last_name: user.last_name,
            employee_code: user.employee_code,
            high_score: stats.high_score || 0,
            max_length: stats.max_length || 0,
            games_played: parseInt(stats.games_played) || 0,
            rank: rank
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Socket.IO event handlers for user management
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join game', async (data, callback) => {
        try {
            const { baleUserId } = data;
            if (!baleUserId) {
                if (callback) callback({ success: false, error: 'Missing baleUserId' });
                return;
            }
            const user = await userService.getUserByBaleId(baleUserId);
            if (!user) {
                socket.emit('registration result', { needsRegistration: true });
                if (callback) callback({ success: true, needsRegistration: true });
            } else {
                socket.emit('registration result', {
                    needsRegistration: false,
                    user: { first_name: user.first_name, last_name: user.last_name, employee_code: user.employee_code }
                });
                if (callback) callback({
                    success: true,
                    needsRegistration: false,
                    user: { first_name: user.first_name, last_name: user.last_name, employee_code: user.employee_code }
                });
            }
        } catch (error) {
            console.error('Join game error:', error);
            if (callback) callback({ success: false, error: error.message });
        }
    });

    socket.on('register user', async (data, callback) => {
        try {
            const { baleUserId, phoneNumber, firstName, lastName, employeeCode } = data;
            if (!baleUserId || !firstName || !lastName || !employeeCode) {
                if (callback) callback({ success: false, error: 'Missing required fields' });
                return;
            }
            const user = await userService.registerUser(baleUserId, phoneNumber || '', firstName, lastName, employeeCode);
            if (callback) callback({ success: true, user });
        } catch (error) {
            console.error('Register user error:', error);
            if (callback) callback({ success: false, error: error.message });
        }
    });

    socket.on('update user names', async (data, callback) => {
        try {
            const { baleUserId, firstName, lastName } = data;
            if (!baleUserId || !firstName || !lastName) {
                if (callback) callback({ success: false, error: 'Missing required fields' });
                return;
            }
            const user = await userService.getUserByBaleId(baleUserId);
            if (!user) {
                if (callback) callback({ success: false, error: 'User not found' });
                return;
            }
            const updatedUser = await userService.updateUserNames(user.id, firstName, lastName);
            if (callback) callback({ success: true, user: updatedUser });
        } catch (error) {
            console.error('Update user names error:', error);
            if (callback) callback({ success: false, error: error.message });
        }
    });

    socket.on('request leaderboard', async (callback) => {
        try {
            const leaderboard = await userService.getTopPlayers(10);
            if (callback) callback({ success: true, leaderboard });
        } catch (error) {
            console.error('Request leaderboard error:', error);
            if (callback) callback({ success: false, error: error.message });
        }
    });
});

// Create the main game controller
const gameController = new GameController();
gameController.listen(io);

const SERVER_PORT = process.env.PORT || 3001;
app.set('port', SERVER_PORT);

// Start Express server
server.listen(app.get('port'), () => {
    console.log('==============================================');
    console.log('🎮 Yalda Snake Challenge Server');
    console.log('==============================================');
    console.log(`Server running on port: ${app.get('port')}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Max players: ${process.env.MAX_PLAYERS || 150}`);
    console.log(`Game speed: ${process.env.GAME_SPEED || 10} FPS`);
    console.log('==============================================');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

module.exports = app;
