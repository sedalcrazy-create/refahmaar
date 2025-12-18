'use strict';

const ServerConfig = {
    STARTING_FPS: parseInt(process.env.GAME_SPEED) || 10,
    PLAYER_STARTING_LENGTH: 3,
    SPAWN_TURN_LEEWAY: 10,
    MAX_PLAYERS: parseInt(process.env.MAX_PLAYERS) || 150,

    FOOD: {
        DEFAULT_AMOUNT: 30,
        APPLE: {
            TYPE: 'APPLE',
            EMOJI: '🍎',
            POINTS: 1,
            GROWTH: 1,
            SPAWN_RATE: 0.7,
        },
        WATERMELON: {
            TYPE: 'WATERMELON',
            EMOJI: '🍉',
            POINTS: 5,
            GROWTH: 3,
            SPAWN_RATE: 0.2,
        },
        POMEGRANATE: {
            TYPE: 'POMEGRANATE',
            EMOJI: '🍇',
            POINTS: 10,
            GROWTH: 5,
            SPAWN_RATE: 0.1,
        },
    },

    IO: {
        DEFAULT_CONNECTION: 'connection',
        INCOMING: {
            REGISTER_USER: 'register user',
            JOIN_GAME: 'join game',
            KEY_DOWN: 'key down',
            DISCONNECT: 'disconnect',
            REQUEST_LEADERBOARD: 'request leaderboard',
        },
        OUTGOING: {
            NEW_STATE: 'game update',
            NEW_PLAYER_INFO: 'new player info',
            BOARD_INFO: 'board info',
            REGISTRATION_RESULT: 'registration result',
            LEADERBOARD_UPDATE: 'leaderboard update',
            NOTIFICATION: {
                GENERAL: 'general notification',
                FOOD_COLLECTED: 'food collected',
                KILL: 'kill notification',
                YOU_DIED: 'you died',
                GAME_OVER: 'game over',
            },
        },
    },
};

module.exports = ServerConfig;
