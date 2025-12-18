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
app.use(express.static(path.join(__dirname, 'public')));
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
