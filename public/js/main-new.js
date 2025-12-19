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
let boardWidth, boardHeight;
let squareSize = 10;
let currentPlayer = null;
let baleUserData = null;
let userStatus = null;

function initBale() {
    try {
        if (typeof BaleWebApp !== 'undefined' && BaleWebApp) {
            BaleWebApp.ready();
            BaleWebApp.expand();
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
