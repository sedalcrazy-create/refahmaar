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

let canvas, ctx;
let canvas, ctx;
let boardWidth, boardHeight;
let squareSize = 10;
let currentPlayer = null;
let baleUserData = null;


// Initialize game
function init() {
    initBale();

    // DOM elements
    const loginScreen = document.getElementById('login-screen');
    const gameScreen = document.getElementById('game-screen');
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const showLeaderboardBtn = document.getElementById('show-leaderboard');
    const leaderboardModal = document.getElementById('leaderboard-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const loading = document.getElementById('loading');

    // Canvas
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    // Pre-fill form if Bale data available
    if (baleUserData) {
        document.getElementById('first-name').value = baleUserData.firstName;
        document.getElementById('last-name').value = baleUserData.lastName;
    }

    // Registration form submit
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const firstName = document.getElementById('first-name').value.trim();
        const lastName = document.getElementById('last-name').value.trim();
        const employeeCode = document.getElementById('employee-code').value.trim();

        if (!firstName || !lastName || !employeeCode) {
            showError('لطفاً تمام فیلدها را پر کنید');
            return;
        }

        if (!baleUserData) {
            baleUserData = {
                baleUserId: 'test_' + Date.now(),
                phoneNumber: '',
                firstName: firstName,
                lastName: lastName
            };
        }

        loading.classList.remove('hidden');

        // Check if user exists
        socket.emit('join game', {
            baleUserId: baleUserData.baleUserId,
            firstName: firstName,
            lastName: lastName
        });

        // Listen for registration result
        socket.once('registration result', async (result) => {
            if (result.needsRegistration) {
                // Register new user
                socket.emit('register user', {
                    baleUserId: baleUserData.baleUserId,
                    phoneNumber: baleUserData.phoneNumber,
                    firstName: firstName,
                    lastName: lastName,
                    employeeCode: employeeCode
                }, (response) => {
                    loading.classList.add('hidden');

                    if (response.success) {
                        loginScreen.classList.add('hidden');
                        gameScreen.classList.remove('hidden');
                        document.getElementById('player-name').textContent = `${firstName} ${lastName}`;
                    } else {
                        showError('خطا در ثبت‌نام: ' + response.error);
                    }
                });
            } else {
                loading.classList.add('hidden');
                loginScreen.classList.add('hidden');
                gameScreen.classList.remove('hidden');
                document.getElementById('player-name').textContent = `${firstName} ${lastName}`;
            }
        });
    });

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
            socket.emit('key down', keyCode);
        });
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if ([37, 38, 39, 40].includes(e.keyCode)) {
            e.preventDefault();
            socket.emit('key down', e.keyCode);
        }
    });

    // Socket events
    socket.on('new player info', (data) => {
        currentPlayer = data;
    });

    socket.on('board info', (data) => {
        boardWidth = data.width;
        boardHeight = data.height;
        canvas.width = boardWidth * squareSize;
        canvas.height = boardHeight * squareSize;
    });

    socket.on('game update', (gameState) => {
        render(gameState);

        // Update score
        if (currentPlayer) {
            const player = gameState.players.find(p => p.id === currentPlayer.playerId);
            if (player) {
                document.getElementById('player-score').textContent = `امتیاز: ${player.score}`;
            }
        }
    });

    socket.on('you died', (data) => {
        // Could show death message
        console.log('You died! Score:', data.score);
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

        item.innerHTML = `
            <div>
                <strong>${rank} ${player.first_name} ${player.last_name}</strong>
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

function render(gameState) {
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid (optional)
    ctx.strokeStyle = '#2a2a3e';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= boardWidth; x++) {
        ctx.beginPath();
        ctx.moveTo(x * squareSize, 0);
        ctx.lineTo(x * squareSize, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= boardHeight; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * squareSize);
        ctx.lineTo(canvas.width, y * squareSize);
        ctx.stroke();
    }

    // Draw food
    if (gameState.food) {
        Object.values(gameState.food).forEach(food => {
            ctx.font = `${squareSize * 0.8}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                food.emoji,
                food.coordinate.x * squareSize + squareSize / 2,
                food.coordinate.y * squareSize + squareSize / 2
            );
        });
    }

    // Draw players
    if (gameState.players) {
        gameState.players.forEach(player => {
            if (player.segments && player.segments.length > 0) {
                player.segments.forEach((segment, index) => {
                    // Draw snake body
                    ctx.fillStyle = player.color || '#4CAF50';

                    // Make head slightly brighter
                    if (index === 0) {
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = player.color || '#4CAF50';
                    } else {
                        ctx.shadowBlur = 0;
                    }

                    ctx.fillRect(
                        segment.x * squareSize + 1,
                        segment.y * squareSize + 1,
                        squareSize - 2,
                        squareSize - 2
                    );
                });

                ctx.shadowBlur = 0;

                // Draw player name above head
                const head = player.segments[0];
                ctx.fillStyle = 'white';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(
                    player.name,
                    head.x * squareSize + squareSize / 2,
                    head.y * squareSize - 5
                );
            }
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
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

// Initialize game
function init() {
    initBale();

    // DOM elements
    const loginScreen = document.getElementById('login-screen');
    const gameScreen = document.getElementById('game-screen');
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const showLeaderboardBtn = document.getElementById('show-leaderboard');
    const leaderboardModal = document.getElementById('leaderboard-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const loading = document.getElementById('loading');

    // Canvas
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    // Pre-fill form if Bale data available
    if (baleUserData) {
        document.getElementById('first-name').value = baleUserData.firstName;
        document.getElementById('last-name').value = baleUserData.lastName;
    }

    // Registration form submit
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const firstName = document.getElementById('first-name').value.trim();
        const lastName = document.getElementById('last-name').value.trim();
        const employeeCode = document.getElementById('employee-code').value.trim();

        if (!firstName || !lastName || !employeeCode) {
            showError('لطفاً تمام فیلدها را پر کنید');
            return;
        }

        if (!baleUserData) {
            baleUserData = {
                baleUserId: 'test_' + Date.now(),
                phoneNumber: '',
                firstName: firstName,
                lastName: lastName
            };
        }

        loading.classList.remove('hidden');

        // Check if user exists
        socket.emit('join game', {
            baleUserId: baleUserData.baleUserId,
            firstName: firstName,
            lastName: lastName
        });

        // Listen for registration result
        socket.once('registration result', async (result) => {
            if (result.needsRegistration) {
                // Register new user
                socket.emit('register user', {
                    baleUserId: baleUserData.baleUserId,
                    phoneNumber: baleUserData.phoneNumber,
                    firstName: firstName,
                    lastName: lastName,
                    employeeCode: employeeCode
                }, (response) => {
                    loading.classList.add('hidden');

                    if (response.success) {
                        loginScreen.classList.add('hidden');
                        gameScreen.classList.remove('hidden');
                        document.getElementById('player-name').textContent = `${firstName} ${lastName}`;
                    } else {
                        showError('خطا در ثبت‌نام: ' + response.error);
                    }
                });
            } else {
                loading.classList.add('hidden');
                loginScreen.classList.add('hidden');
                gameScreen.classList.remove('hidden');
                document.getElementById('player-name').textContent = `${firstName} ${lastName}`;
            }
        });
    });

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
            socket.emit('key down', keyCode);
        });
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if ([37, 38, 39, 40].includes(e.keyCode)) {
            e.preventDefault();
            socket.emit('key down', e.keyCode);
        }
    });

    // Socket events
    socket.on('new player info', (data) => {
        currentPlayer = data;
    });

    socket.on('board info', (data) => {
        boardWidth = data.width;
        boardHeight = data.height;
        canvas.width = boardWidth * squareSize;
        canvas.height = boardHeight * squareSize;
    });

    socket.on('game update', (gameState) => {
        render(gameState);

        // Update score
        if (currentPlayer) {
            const player = gameState.players.find(p => p.id === currentPlayer.playerId);
            if (player) {
                document.getElementById('player-score').textContent = `امتیاز: ${player.score}`;
            }
        }
    });

    socket.on('you died', (data) => {
        // Could show death message
        console.log('You died! Score:', data.score);
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

        item.innerHTML = `
            <div>
                <strong>${rank} ${player.first_name} ${player.last_name}</strong>
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

function render(gameState) {
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid (optional)
    ctx.strokeStyle = '#2a2a3e';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= boardWidth; x++) {
        ctx.beginPath();
        ctx.moveTo(x * squareSize, 0);
        ctx.lineTo(x * squareSize, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= boardHeight; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * squareSize);
        ctx.lineTo(canvas.width, y * squareSize);
        ctx.stroke();
    }

    // Draw food
    if (gameState.food) {
        Object.values(gameState.food).forEach(food => {
            ctx.font = `${squareSize * 0.8}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                food.emoji,
                food.coordinate.x * squareSize + squareSize / 2,
                food.coordinate.y * squareSize + squareSize / 2
            );
        });
    }

    // Draw players
    if (gameState.players) {
        gameState.players.forEach(player => {
            if (player.segments && player.segments.length > 0) {
                player.segments.forEach((segment, index) => {
                    // Draw snake body
                    ctx.fillStyle = player.color || '#4CAF50';

                    // Make head slightly brighter
                    if (index === 0) {
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = player.color || '#4CAF50';
                    } else {
                        ctx.shadowBlur = 0;
                    }

                    ctx.fillRect(
                        segment.x * squareSize + 1,
                        segment.y * squareSize + 1,
                        squareSize - 2,
                        squareSize - 2
                    );
                });

                ctx.shadowBlur = 0;

                // Draw player name above head
                const head = player.segments[0];
                ctx.fillStyle = 'white';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(
                    player.name,
                    head.x * squareSize + squareSize / 2,
                    head.y * squareSize - 5
                );
            }
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
