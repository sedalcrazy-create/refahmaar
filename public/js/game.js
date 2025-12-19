// Yalda Snake Challenge - Client Side
'use strict';

// Socket.io configuration with better error handling
const socket = io({
    transports: ['websocket', 'polling'],
    upgrade: true,
    rememberUpgrade: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    timeout: 20000
});

socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
});

socket.on('connect', () => {
    console.log('Socket connected successfully');
});

socket.on('disconnect', () => {
    console.log('Socket disconnected');
});

let pixiRenderer = null; // PixiJS renderer instance
let boardWidth, boardHeight;
let squareSize = 15; // Increased from 10 for better visibility
let currentPlayer = null;
let baleUserData = null;

let userStatus = null; // Track user status

// Swipe control variables
let touchStartX = 0;
let touchStartY = 0;
let lastDirectionTime = 0;
const DIRECTION_THROTTLE = 200; // ms
let currentDirection = { x: 1, y: 0 }; // Track current direction to prevent 180° turns

// Smooth movement interpolation
let lastUpdateTime = Date.now();
let interpolatedPositions = new Map();

// Game state tracking
let gameStartTime = 0;
let isGameActive = false;

// Initialize game
// Initialize Bale SDK
function initBale() {
    try {
        // Check for BaleWebApp global object
        if (typeof BaleWebApp !== 'undefined' && BaleWebApp) {
            BaleWebApp.ready();
            BaleWebApp.expand();

            // Get user data from Bale
            const initData = BaleWebApp.initDataUnsafe;
            if (initData && initData.user) {
                baleUserData = {
                    baleUserId: String(initData.user.id),
                    phoneNumber: initData.user.phone_number || '',
                    firstName: initData.user.first_name || '',
                    lastName: initData.user.last_name || ''
                };

                console.log('Bale user data:', baleUserData);
            }
        } else {
            console.log('BaleWebApp not available - running in browser mode');
        }
    } catch (error) {
        console.error('Error initializing Bale SDK:', error);
    }
}

// Check user status on page load
function checkUserStatus() {
    if (!baleUserData || !baleUserData.baleUserId) {
        console.log('No Bale user data - user needs to register in bot');
        showError('لطفاً ابتدا از طریق ربات @refahsnakebot ثبت‌نام کنید');
        return;
    }

    const loading = document.getElementById('loading');
    loading.classList.remove('hidden');

    // Check if user exists in database
    socket.emit('join game', { baleUserId: baleUserData.baleUserId }, (response) => {
        loading.classList.add('hidden');

        if (response && response.success) {
            if (response.needsRegistration) {
                console.log('User not registered - needs to register in bot first');
                showError('لطفاً ابتدا از طریق ربات @refahsnakebot ثبت‌نام کنید و سپس دوباره بازی را باز کنید');
            } else if (response.user) {
                userStatus = 'complete';
                console.log('Complete user - starting game');
                startGame(response.user.first_name, response.user.last_name);
            }
        } else {
            showError('خطا در اتصال به سرور. لطفاً دوباره تلاش کنید');
        }
    });
}

// Hide employee code field for pending users
function hideEmployeeCodeField() {
    const employeeCodeGroup = document.getElementById('employee-code').closest('.form-group');
    if (employeeCodeGroup) {
        employeeCodeGroup.style.display = 'none';
    }
}

// Start game directly for complete users
function startGame(firstName, lastName) {
    const loginScreen = document.getElementById('login-screen');
    const gameScreen = document.getElementById('game-screen');
    const startOverlay = document.getElementById('start-overlay');

    loginScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    startOverlay.classList.remove('hidden');
    document.getElementById('player-name').textContent = firstName + ' ' + lastName;
}

// Actually begin gameplay
function beginGame() {
    const startOverlay = document.getElementById('start-overlay');
    startOverlay.classList.add('hidden');

    isGameActive = true;
    gameStartTime = Date.now();
    currentDirection = { x: 1, y: 0 }; // Reset direction (snake starts moving right)

    // Join the actual game
    socket.emit('join', {
        baleUserId: baleUserData ? baleUserData.baleUserId : null,
        name: document.getElementById('player-name').textContent
    });
}

// Show game over screen
function showGameOver(score) {
    isGameActive = false;
    const gameOverlay = document.getElementById('gameover-overlay');
    const gameTime = Math.floor((Date.now() - gameStartTime) / 1000);

    document.getElementById('final-score').textContent = score;
    document.getElementById('game-time').textContent = gameTime;
    gameOverlay.classList.remove('hidden');
}

// Helper function to convert key codes to direction vectors
function keyCodeToDirection(keyCode) {
    switch(keyCode) {
        case 37: return { x: -1, y: 0 }; // Left
        case 38: return { x: 0, y: -1 }; // Up
        case 39: return { x: 1, y: 0 };  // Right
        case 40: return { x: 0, y: 1 };  // Down
        default: return null;
    }
}

// Validate direction change (prevent 180° reversal into snake body)
function isValidDirectionChange(newDir) {
    if (!newDir) return false;

    // Check if trying to reverse direction
    // Example: Left (-1,0) + Right (1,0) = (0,0) - NOT allowed
    const sumX = currentDirection.x + newDir.x;
    const sumY = currentDirection.y + newDir.y;

    // If both sum to 0, it's a complete reversal
    if (sumX === 0 && sumY === 0) {
        return false;
    }

    return true;
}

// Send direction with validation
function sendDirection(direction) {
    if (isValidDirectionChange(direction)) {
        socket.emit('direction', direction);
        currentDirection = direction;
    }
}

// Helper function to get consistent colors for players
function getPlayerColor(playerId) {
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4'];
    const hash = playerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
}

// Swipe detection (inspired by hammer.js pattern)
function handleTouchStart(e) {
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
}

function handleTouchMove(e) {
    if (!touchStartX || !touchStartY) return;

    const now = Date.now();
    if (now - lastDirectionTime < DIRECTION_THROTTLE) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    if (Math.abs(deltaX) < 30 && Math.abs(deltaY) < 30) return;

    let direction = null;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
    } else {
        direction = deltaY > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
    }

    if (direction) {
        sendDirection(direction);
        lastDirectionTime = now;
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }
}

function handleTouchEnd() {
    touchStartX = 0;
    touchStartY = 0;
}

// Request landscape orientation
function requestLandscapeOrientation() {
    try {
        // Try to lock orientation to landscape (if supported)
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(err => {
                console.log('Orientation lock not supported or denied:', err);
            });
        }
    } catch (error) {
        console.log('Orientation API not available:', error);
    }
}

// Initialize game
function init() {
    initBale();
    checkUserStatus();

    // DOM elements
    const loginScreen = document.getElementById('login-screen');
    const gameScreen = document.getElementById('game-screen');
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const showLeaderboardBtn = document.getElementById('show-leaderboard');
    const leaderboardModal = document.getElementById('leaderboard-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const loading = document.getElementById('loading');

    // Canvas will be replaced by PixiJS renderer after 'init' socket event
    // Request landscape orientation on mobile
    requestLandscapeOrientation();

    // Registration is disabled in mini-app - users must register via bot
    // Hide the login form since registration happens only in bot
    if (loginForm) {
        loginForm.style.display = 'none';
    }

    // Show message that registration must happen in bot
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) {
        const message = document.createElement('div');
        message.style.cssText = 'text-align:center; padding:40px 20px; color:white; font-size:18px;';
        message.innerHTML = `
            <h2 style="margin-bottom:20px;">🎮 بازی مار یلدایی</h2>
            <p style="margin-bottom:15px;">برای شروع بازی، ابتدا باید در ربات ثبت‌نام کنید</p>
            <p style="font-size:16px; opacity:0.8;">👉 @refahsnakebot</p>
        `;
        const container = loginScreen.querySelector('.login-container');
        if (container) {
            container.innerHTML = '';
            container.appendChild(message);
        }
    }
    // Leaderboard
    showLeaderboardBtn.addEventListener('click', () => {
        socket.emit('request leaderboard', (response) => {
            if (response.success) {
                displayLeaderboard(response.leaderboard);
                leaderboardModal.classList.remove('hidden');
            }
        });
    });

    closeModalBtn.addEventListener('click', () => {
        leaderboardModal.classList.add('hidden');
    });

    // Touch controls
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const keyCode = parseInt(btn.getAttribute('data-key'));
            const direction = keyCodeToDirection(keyCode);
            if (direction) {
                sendDirection(direction);
            }
        });
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if ([37, 38, 39, 40].includes(e.keyCode)) {
            e.preventDefault();
            const direction = keyCodeToDirection(e.keyCode);
            if (direction) {
                sendDirection(direction);
            }
        }
    });

    // Swipe controls for mobile - attach to document body (works with any canvas)
    document.body.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.body.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.body.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Hide control buttons on mobile (swipe is better UX)
    if ('ontouchstart' in window) {
        const controls = document.querySelector('.game-controls');
        if (controls) controls.style.display = 'none';
    }

    // Start game button
    document.getElementById('start-game-btn').addEventListener('click', beginGame);

    // Play again button
    document.getElementById('play-again-btn').addEventListener('click', () => {
        document.getElementById('gameover-overlay').classList.add('hidden');
        beginGame();
    });

    // Socket events
    socket.on('init', async (data) => {
        console.log('Game initialized:', data);
        currentPlayer = { playerId: data.playerId };
        boardWidth = data.boardWidth;
        boardHeight = data.boardHeight;

        // Initialize PixiJS renderer
        const canvasElement = document.getElementById('game-canvas');
        pixiRenderer = new PixiSnakeRenderer(
            canvasElement,
            boardWidth,
            boardHeight,
            squareSize
        );

        // Wait for renderer to initialize
        await pixiRenderer.ready;
        console.log('PixiJS renderer ready');
    });

    socket.on('update', (data) => {
        const gameState = {
            players: data.players ? data.players.map(p => ({
                id: p.id,
                name: p.name,
                segments: p.snake,
                score: p.score,
                color: getPlayerColor(p.id)
            })) : [],
            food: data.food ? data.food.map(f => ({
                x: f.x,
                y: f.y,
                emoji: f.emoji
            })) : []
        };

        render(gameState);

        // Update score
        if (currentPlayer) {
            const player = data.players ? data.players.find(p => p.id === currentPlayer.playerId) : null;
            if (player) {
                document.getElementById('player-score').textContent = `امتیاز: ${player.score}`;
            }
        }
    });

    socket.on('player-died', (data) => {
        console.log('Player died:', data);
        if (data.id === currentPlayer?.playerId) {
            showGameOver(data.score);
        }
    });
}

function showError(message) {
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = message;
    errorMessage.classList.add('show');

    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 5000);
}

function displayLeaderboard(leaderboard) {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';

    leaderboard.forEach((player, index) => {
        const item = document.createElement('div');
        item.className = `leaderboard-item rank-${index + 1}`;

        const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        const name = player.first_name === 'pending' ? 'بازیکن' : `${player.first_name} ${player.last_name}`;

        item.innerHTML = `
            <div>
                <strong>${rank} ${name}</strong>
                <br>
                <small>کد استخدامی: ${player.employee_code}</small>
            </div>
            <div>
                <strong>${player.high_score}</strong> امتیاز
            </div>
        `;

        list.appendChild(item);
    });
}

// Render function - now using PixiJS renderer
function render(gameState) {
    if (!pixiRenderer) {
        console.warn('PixiJS renderer not initialized yet');
        return;
    }

    // Update players with smooth interpolation
    if (gameState.players) {
        pixiRenderer.updatePlayers(gameState.players);
    }

    // Update food
    if (gameState.food) {
        pixiRenderer.updateFood(gameState.food);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
