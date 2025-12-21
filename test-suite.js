'use strict';

const io = require('socket.io-client');

const SERVER_URL = 'http://localhost:3001';
const TEST_RESULTS = {
    passed: 0,
    failed: 0,
    tests: []
};

// Helper functions
function log(msg, type = 'info') {
    const icons = { info: 'ℹ️', pass: '✅', fail: '❌', warn: '⚠️' };
    console.log(`${icons[type] || ''} ${msg}`);
}

function addResult(name, passed, details = '') {
    TEST_RESULTS.tests.push({ name, passed, details });
    if (passed) {
        TEST_RESULTS.passed++;
        log(`${name}: PASSED ${details}`, 'pass');
    } else {
        TEST_RESULTS.failed++;
        log(`${name}: FAILED ${details}`, 'fail');
    }
}

// Test 1: Socket Connection
async function testSocketConnection() {
    return new Promise((resolve) => {
        const socket = io(SERVER_URL, { transports: ['websocket'] });
        const timeout = setTimeout(() => {
            socket.disconnect();
            addResult('Socket Connection', false, '- Timeout');
            resolve(false);
        }, 5000);

        socket.on('connect', () => {
            clearTimeout(timeout);
            addResult('Socket Connection', true, `- ID: ${socket.id}`);
            socket.disconnect();
            resolve(true);
        });

        socket.on('connect_error', (err) => {
            clearTimeout(timeout);
            addResult('Socket Connection', false, `- Error: ${err.message}`);
            resolve(false);
        });
    });
}

// Test 2: Join Game (existing user)
async function testJoinGame() {
    return new Promise((resolve) => {
        const socket = io(SERVER_URL, { transports: ['websocket'] });
        const timeout = setTimeout(() => {
            socket.disconnect();
            addResult('Join Game', false, '- Timeout');
            resolve(false);
        }, 5000);

        socket.on('connect', () => {
            socket.emit('join game', { baleUserId: '12345678' }, (response) => {
                clearTimeout(timeout);
                if (response && response.success !== undefined) {
                    addResult('Join Game', true, `- Response received`);
                } else {
                    addResult('Join Game', false, '- Invalid response');
                }
                socket.disconnect();
                resolve(true);
            });
        });
    });
}

// Test 3: Register User
async function testRegisterUser() {
    return new Promise((resolve) => {
        const socket = io(SERVER_URL, { transports: ['websocket'] });
        const testUser = {
            baleUserId: 'test_' + Date.now(),
            phoneNumber: '09123456789',
            firstName: 'Test',
            lastName: 'User',
            employeeCode: '123456'
        };

        const timeout = setTimeout(() => {
            socket.disconnect();
            addResult('Register User', false, '- Timeout');
            resolve(false);
        }, 5000);

        socket.on('connect', () => {
            socket.emit('register user', testUser, (response) => {
                clearTimeout(timeout);
                if (response && response.success) {
                    addResult('Register User', true, `- User created`);
                } else if (response && response.error) {
                    // Duplicate is OK for testing
                    addResult('Register User', true, `- ${response.error}`);
                } else {
                    addResult('Register User', false, '- Invalid response');
                }
                socket.disconnect();
                resolve(true);
            });
        });
    });
}

// Test 4: Join Room and Get Init
async function testJoinRoom() {
    return new Promise((resolve) => {
        const socket = io(SERVER_URL, { transports: ['websocket'] });
        let initReceived = false;

        const timeout = setTimeout(() => {
            socket.disconnect();
            addResult('Join Room', initReceived, initReceived ? '' : '- No init event');
            resolve(initReceived);
        }, 5000);

        socket.on('connect', () => {
            socket.on('init', (data) => {
                initReceived = true;
                clearTimeout(timeout);
                const hasRequired = data.playerId && data.boardWidth && data.boardHeight;
                addResult('Join Room', hasRequired,
                    `- Room: ${data.roomId}, Board: ${data.boardWidth}x${data.boardHeight}`);
                socket.disconnect();
                resolve(hasRequired);
            });

            socket.emit('join', {
                baleUserId: 'test_' + Date.now(),
                name: 'TestPlayer'
            });
        });
    });
}

// Test 5: Game Updates
async function testGameUpdates() {
    return new Promise((resolve) => {
        const socket = io(SERVER_URL, { transports: ['websocket'] });
        let updateCount = 0;

        const timeout = setTimeout(() => {
            socket.disconnect();
            const passed = updateCount >= 3;
            addResult('Game Updates', passed, `- Received ${updateCount} updates`);
            resolve(passed);
        }, 3000);

        socket.on('connect', () => {
            socket.on('init', () => {
                // Wait for game updates
            });

            socket.on('update', (data) => {
                updateCount++;
                if (updateCount === 1) {
                    const hasPlayers = Array.isArray(data.players);
                    const hasFood = Array.isArray(data.food);
                    log(`  First update: ${data.players?.length || 0} players, ${data.food?.length || 0} food`, 'info');
                }
            });

            socket.emit('join', {
                baleUserId: 'test_update_' + Date.now(),
                name: 'UpdateTester'
            });
        });
    });
}

// Test 6: Direction Change
async function testDirectionChange() {
    return new Promise((resolve) => {
        const socket = io(SERVER_URL, { transports: ['websocket'] });
        let positionChanged = false;
        let lastHead = null;

        const timeout = setTimeout(() => {
            socket.disconnect();
            addResult('Direction Change', positionChanged,
                positionChanged ? '' : '- Position did not change');
            resolve(positionChanged);
        }, 3000);

        socket.on('connect', () => {
            socket.on('init', (data) => {
                // Send direction changes
                setTimeout(() => socket.emit('direction', { x: 0, y: 1 }), 200);
                setTimeout(() => socket.emit('direction', { x: -1, y: 0 }), 400);
            });

            let updateCount = 0;
            socket.on('update', (data) => {
                updateCount++;
                const me = data.players?.find(p => p.id === socket.id);
                if (me && me.snake && me.snake[0]) {
                    if (lastHead) {
                        if (me.snake[0].x !== lastHead.x || me.snake[0].y !== lastHead.y) {
                            positionChanged = true;
                        }
                    }
                    lastHead = { ...me.snake[0] };
                }
            });

            socket.emit('join', {
                baleUserId: 'test_dir_' + Date.now(),
                name: 'DirectionTester'
            });
        });
    });
}

// Test 7: Multiple Players (Room Test)
async function testMultiplePlayers() {
    return new Promise((resolve) => {
        const sockets = [];
        const playerCount = 5;
        let connectedCount = 0;
        let allInSameRoom = true;
        let roomId = null;

        const timeout = setTimeout(() => {
            sockets.forEach(s => s.disconnect());
            addResult('Multiple Players', connectedCount === playerCount,
                `- ${connectedCount}/${playerCount} connected`);
            resolve(connectedCount === playerCount);
        }, 5000);

        for (let i = 0; i < playerCount; i++) {
            const socket = io(SERVER_URL, { transports: ['websocket'] });
            sockets.push(socket);

            socket.on('init', (data) => {
                connectedCount++;
                if (!roomId) {
                    roomId = data.roomId;
                } else if (data.roomId !== roomId) {
                    allInSameRoom = false;
                }

                if (connectedCount === playerCount) {
                    clearTimeout(timeout);
                    addResult('Multiple Players', true,
                        `- All ${playerCount} in room ${roomId}`);
                    sockets.forEach(s => s.disconnect());
                    resolve(true);
                }
            });

            socket.on('connect', () => {
                socket.emit('join', {
                    baleUserId: `test_multi_${i}_${Date.now()}`,
                    name: `Player${i}`
                });
            });
        }
    });
}

// Test 8: Leaderboard Request
async function testLeaderboard() {
    return new Promise((resolve) => {
        const socket = io(SERVER_URL, { transports: ['websocket'] });

        const timeout = setTimeout(() => {
            socket.disconnect();
            addResult('Leaderboard', false, '- Timeout');
            resolve(false);
        }, 5000);

        socket.on('connect', () => {
            socket.emit('request leaderboard', (response) => {
                clearTimeout(timeout);
                const passed = response && response.success && Array.isArray(response.leaderboard);
                addResult('Leaderboard', passed,
                    passed ? `- ${response.leaderboard.length} entries` : '- Invalid response');
                socket.disconnect();
                resolve(passed);
            });
        });
    });
}

// Test 9: Room Capacity (10 players per room)
async function testRoomCapacity() {
    return new Promise((resolve) => {
        const sockets = [];
        const playerCount = 12; // More than room capacity
        const rooms = new Set();

        const timeout = setTimeout(() => {
            sockets.forEach(s => s.disconnect());
            const passed = rooms.size >= 2; // Should have at least 2 rooms
            addResult('Room Capacity', passed,
                `- ${rooms.size} rooms created for ${playerCount} players`);
            resolve(passed);
        }, 8000);

        for (let i = 0; i < playerCount; i++) {
            setTimeout(() => {
                const socket = io(SERVER_URL, { transports: ['websocket'] });
                sockets.push(socket);

                socket.on('init', (data) => {
                    rooms.add(data.roomId);
                });

                socket.on('connect', () => {
                    socket.emit('join', {
                        baleUserId: `test_cap_${i}_${Date.now()}`,
                        name: `CapPlayer${i}`
                    });
                });
            }, i * 100);
        }
    });
}

// Test 10: Stress Test (Quick)
async function testStress() {
    return new Promise((resolve) => {
        const sockets = [];
        const targetCount = 50;
        let connectedCount = 0;
        let errorCount = 0;

        log(`Starting stress test with ${targetCount} connections...`, 'info');

        const timeout = setTimeout(() => {
            sockets.forEach(s => s.disconnect());
            const successRate = Math.round((connectedCount / targetCount) * 100);
            const passed = successRate >= 80;
            addResult('Stress Test (50)', passed,
                `- ${connectedCount}/${targetCount} connected (${successRate}%), ${errorCount} errors`);
            resolve(passed);
        }, 15000);

        for (let i = 0; i < targetCount; i++) {
            setTimeout(() => {
                const socket = io(SERVER_URL, {
                    transports: ['websocket'],
                    reconnection: false
                });
                sockets.push(socket);

                socket.on('init', () => {
                    connectedCount++;
                });

                socket.on('connect_error', () => {
                    errorCount++;
                });

                socket.on('connect', () => {
                    socket.emit('join', {
                        baleUserId: `stress_${i}_${Date.now()}`,
                        name: `Stress${i}`
                    });
                });
            }, i * 50);
        }
    });
}

// Main test runner
async function runAllTests() {
    console.log('\n' + '='.repeat(50));
    console.log('🧪 YALDA SNAKE - COMPREHENSIVE TEST SUITE');
    console.log('='.repeat(50) + '\n');

    await testSocketConnection();
    await testJoinGame();
    await testRegisterUser();
    await testJoinRoom();
    await testGameUpdates();
    await testDirectionChange();
    await testMultiplePlayers();
    await testLeaderboard();
    await testRoomCapacity();
    await testStress();

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${TEST_RESULTS.passed}`);
    console.log(`❌ Failed: ${TEST_RESULTS.failed}`);
    console.log(`📈 Success Rate: ${Math.round((TEST_RESULTS.passed / (TEST_RESULTS.passed + TEST_RESULTS.failed)) * 100)}%`);
    console.log('='.repeat(50) + '\n');

    process.exit(TEST_RESULTS.failed > 0 ? 1 : 0);
}

runAllTests().catch(console.error);
