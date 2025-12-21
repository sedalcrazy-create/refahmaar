'use strict';

const io = require('socket.io-client');

const SERVER_URL = 'http://localhost:3001';
const TARGET_PLAYERS = parseInt(process.argv[2]) || 200;
const RAMP_UP_DELAY = 20; // ms between each connection

let connectedCount = 0;
let joinedCount = 0;
let errorCount = 0;
let rooms = new Set();
const sockets = [];

console.log(`\n${'='.repeat(50)}`);
console.log(`🔥 LOAD TEST - ${TARGET_PLAYERS} PLAYERS`);
console.log(`${'='.repeat(50)}\n`);

const startTime = Date.now();

// Progress reporter
const progressInterval = setInterval(() => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`⏱️  ${elapsed}s | Connected: ${connectedCount} | Joined: ${joinedCount} | Rooms: ${rooms.size} | Errors: ${errorCount}`);
}, 2000);

// Create connections
for (let i = 0; i < TARGET_PLAYERS; i++) {
    setTimeout(() => {
        const socket = io(SERVER_URL, {
            transports: ['websocket'],
            reconnection: false,
            timeout: 10000
        });
        sockets.push(socket);

        socket.on('connect', () => {
            connectedCount++;
            socket.emit('join', {
                baleUserId: `load_${i}_${Date.now()}`,
                name: `LoadPlayer${i}`
            });
        });

        socket.on('init', (data) => {
            joinedCount++;
            rooms.add(data.roomId);
        });

        socket.on('connect_error', (err) => {
            errorCount++;
        });

        socket.on('error', (err) => {
            errorCount++;
        });

    }, i * RAMP_UP_DELAY);
}

// Final report after all connections
setTimeout(() => {
    clearInterval(progressInterval);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const successRate = Math.round((joinedCount / TARGET_PLAYERS) * 100);

    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 LOAD TEST RESULTS`);
    console.log(`${'='.repeat(50)}`);
    console.log(`⏱️  Total Time: ${elapsed}s`);
    console.log(`🎯 Target: ${TARGET_PLAYERS} players`);
    console.log(`✅ Connected: ${connectedCount}`);
    console.log(`🎮 Joined: ${joinedCount}`);
    console.log(`🏠 Rooms: ${rooms.size}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log(`${'='.repeat(50)}`);

    if (successRate >= 90) {
        console.log(`\n✅ LOAD TEST PASSED!\n`);
    } else if (successRate >= 70) {
        console.log(`\n⚠️  LOAD TEST PARTIAL SUCCESS\n`);
    } else {
        console.log(`\n❌ LOAD TEST FAILED\n`);
    }

    // Cleanup
    sockets.forEach(s => s.disconnect());
    process.exit(successRate >= 90 ? 0 : 1);

}, (TARGET_PLAYERS * RAMP_UP_DELAY) + 15000);
