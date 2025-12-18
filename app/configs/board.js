'use strict';

const Board = {
    SQUARE_SIZE_IN_PIXELS: 10,
    HORIZONTAL_SQUARES: parseInt(process.env.BOARD_WIDTH) || 100,
    VERTICAL_SQUARES: parseInt(process.env.BOARD_HEIGHT) || 60,
};

module.exports = Board;
