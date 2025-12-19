// Yalda Snake - Asset Generator
// Programmatic texture generation for food sprites
'use strict';

/**
 * Create watermelon sprite texture
 * @param {PIXI.Renderer} renderer - PixiJS renderer
 * @returns {PIXI.Texture} Watermelon texture
 */
function createWatermelonTexture(renderer) {
    const graphics = new PIXI.Graphics();
    const size = 32;
    const center = size / 2;

    // Dark green outer layer
    graphics.circle(center, center, size / 2);
    graphics.fill({ color: 0x2d5016 });

    // Light green layer
    graphics.circle(center, center, size / 2 * 0.85);
    graphics.fill({ color: 0x3d7030 });

    // Red flesh
    graphics.circle(center, center, size / 2 * 0.7);
    graphics.fill({ color: 0xe74c3c });

    // White inner layer
    graphics.circle(center, center, size / 2 * 0.4);
    graphics.fill({ color: 0xffeeee });

    // Black seeds arranged in circle
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const x = center + Math.cos(angle) * size / 4;
        const y = center + Math.sin(angle) * size / 4;
        graphics.circle(x, y, 1.5);
        graphics.fill({ color: 0x000000 });
    }

    // Generate and return texture
    return renderer.generateTexture(graphics);
}

/**
 * Create pomegranate sprite texture
 * @param {PIXI.Renderer} renderer - PixiJS renderer
 * @returns {PIXI.Texture} Pomegranate texture
 */
function createPomegranateTexture(renderer) {
    const graphics = new PIXI.Graphics();
    const size = 32;
    const center = size / 2;

    // Burgundy red outer layer
    graphics.circle(center, center, size / 2);
    graphics.fill({ color: 0x8B0000 });

    // Ruby red middle layer
    graphics.circle(center, center, size / 2 * 0.8);
    graphics.fill({ color: 0xDC143C });

    // Light red inner layer
    graphics.circle(center, center, size / 2 * 0.6);
    graphics.fill({ color: 0xff6b6b });

    // Golden crown shape on top
    const crownY = size / 4;
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const x = center + Math.cos(angle) * size / 3;
        const y = crownY + Math.sin(angle) * size / 8;
        graphics.circle(x, y, 2);
        graphics.fill({ color: 0xFFD700 });
    }

    // Generate and return texture
    return renderer.generateTexture(graphics);
}

/**
 * Create apple sprite texture (fallback for other emojis)
 * @param {PIXI.Renderer} renderer - PixiJS renderer
 * @returns {PIXI.Texture} Apple texture
 */
function createAppleTexture(renderer) {
    const graphics = new PIXI.Graphics();
    const size = 32;
    const center = size / 2;

    // Red outer layer
    graphics.circle(center, center, size / 2);
    graphics.fill({ color: 0xff0000 });

    // Darker red for depth
    graphics.circle(center, center, size / 2 * 0.7);
    graphics.fill({ color: 0xcc0000 });

    // Highlight
    graphics.circle(center - size / 6, center - size / 6, size / 6);
    graphics.fill({ color: 0xff6666, alpha: 0.7 });

    // Small stem
    graphics.rect(center - 1, center - size / 2 + 2, 2, 4);
    graphics.fill({ color: 0x8B4513 });

    // Generate and return texture
    return renderer.generateTexture(graphics);
}

console.log('Asset generator loaded');
