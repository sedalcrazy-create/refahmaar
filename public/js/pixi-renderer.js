// Yalda Snake - PixiJS Renderer
// Main rendering engine with smooth interpolation
'use strict';

/**
 * PixiJS-based snake game renderer
 * Replaces canvas 2D rendering with hardware-accelerated WebGL
 */
class PixiSnakeRenderer {
    /**
     * @param {HTMLCanvasElement} canvasElement - Existing canvas element to replace
     * @param {number} boardWidth - Grid width (100)
     * @param {number} boardHeight - Grid height (60)
     * @param {number} squareSize - Size of each grid square in pixels (15)
     */
    constructor(canvasElement, boardWidth, boardHeight, squareSize) {
        this.boardWidth = boardWidth;
        this.boardHeight = boardHeight;
        this.squareSize = squareSize;
        this.canvasElement = canvasElement;

        // Create PixiJS application
        this.app = new PIXI.Application();

        // Display object pools
        this.playerContainers = new Map(); // playerId -> Container
        this.snakeSegments = new Map();    // playerId -> Sprite[]
        this.foodSprites = new Map();      // foodKey -> {sprite, data}
        this.playerLabels = new Map();     // playerId -> Text

        // Interpolation state tracking
        this.interpolationData = new Map(); // playerId -> segment interpolation data

        // Textures cache
        this.textures = {};
        this.emojiToTexture = {};

        // Layer containers for z-ordering
        this.layers = {
            background: new PIXI.Container(),
            grid: new PIXI.Container(),
            food: new PIXI.Container(),
            snakes: new PIXI.Container(),
            particles: new PIXI.Container(),
            ui: new PIXI.Container()
        };

        // Particle effect system
        this.particleEffect = null;

        // Mobile detection
        this.isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);

        // Initialize async (ready promise for caller to await)
        this.ready = this.init();
    }

    /**
     * Initialize PixiJS application and setup rendering
     * @returns {Promise} Resolves when initialization complete
     */
    async init() {
        try {
            // Initialize PixiJS app
            await this.app.init({
                width: this.boardWidth * this.squareSize,
                height: this.boardHeight * this.squareSize,
                backgroundColor: 0x2D1B1B, // Yalda theme: warm dark red/brown
                resolution: this.isMobile ? 1 : (window.devicePixelRatio || 1),
                autoDensity: true,
                antialias: true,
                powerPreference: 'low-power' // Battery-friendly for mobile
            });

            // Replace the canvas element with PixiJS canvas
            this.canvasElement.parentNode.replaceChild(this.app.canvas, this.canvasElement);

            // Apply same ID and class to new canvas
            this.app.canvas.id = 'game-canvas';

            // Setup layer hierarchy
            Object.values(this.layers).forEach(layer => {
                this.app.stage.addChild(layer);
            });

            // Generate all textures
            this.generateTextures();

            // Create particle system
            this.particleEffect = new FoodParticleEffect(this.app, this.layers.particles);

            // Create static background elements
            this.createBackground();

            // Start render loop
            this.app.ticker.add((ticker) => this.update(ticker));

            console.log('PixiJS renderer initialized successfully');
        } catch (error) {
            console.error('Failed to initialize PixiJS renderer:', error);
            throw error;
        }
    }

    /**
     * Generate all sprite textures
     */
    generateTextures() {
        // Create food textures using asset generator
        this.textures.watermelon = createWatermelonTexture(this.app.renderer);
        this.textures.pomegranate = createPomegranateTexture(this.app.renderer);
        this.textures.apple = createAppleTexture(this.app.renderer);
        this.textures.grape = createGrapeTexture(this.app.renderer);

        // Map food emojis to textures
        this.emojiToTexture = {
            '🍉': this.textures.watermelon,
            '🍇': this.textures.grape,
            '🍎': this.textures.apple,
            '🍊': this.textures.apple,
            '🍋': this.textures.apple,
            '🍌': this.textures.apple
        };
    }

    /**
     * Create static background and grid
     */
    createBackground() {
        // Background is set via app.init backgroundColor

        // Draw grid lines
        const grid = new PIXI.Graphics();
        grid.lineStyle({ width: 0.5, color: 0x2a2a3e, alpha: 1 });

        // Vertical lines
        for (let x = 0; x <= this.boardWidth; x++) {
            grid.moveTo(x * this.squareSize, 0);
            grid.lineTo(x * this.squareSize, this.boardHeight * this.squareSize);
        }

        // Horizontal lines
        for (let y = 0; y <= this.boardHeight; y++) {
            grid.moveTo(0, y * this.squareSize);
            grid.lineTo(this.boardWidth * this.squareSize, y * this.squareSize);
        }

        grid.stroke();
        this.layers.grid.addChild(grid);
    }

    /**
     * Create a snake segment sprite
     * @param {string} color - Hex color (e.g., '#4CAF50')
     * @param {boolean} isHead - Whether this is the snake head
     * @returns {PIXI.Sprite} Snake segment sprite
     */
    createSnakeSegment(color, isHead = false) {
        const graphics = new PIXI.Graphics();
        const radius = (this.squareSize - 2) / 2;

        // Draw circle
        graphics.circle(0, 0, radius);
        graphics.fill({ color: parseInt(color.replace('#', '0x')) });

        // Generate texture and create sprite
        const sprite = new PIXI.Sprite(this.app.renderer.generateTexture(graphics));
        sprite.anchor.set(0.5);

        if (isHead) {
            // Add glow filter for snake head (desktop only)
            if (!this.isMobile) {
                try {
                    const glowFilter = new PIXI.GlowFilter({
                        distance: 15,
                        outerStrength: 2,
                        innerStrength: 0,
                        color: parseInt(color.replace('#', '0x')),
                        quality: 0.5
                    });
                    sprite.filters = [glowFilter];
                } catch (error) {
                    console.warn('Glow filter not available:', error);
                }
            }

            // Add white highlight circle for depth
            const highlight = new PIXI.Graphics();
            highlight.circle(0, 0, radius * 0.6);
            highlight.fill({ color: 0xffffff, alpha: 0.3 });

            const highlightSprite = new PIXI.Sprite(this.app.renderer.generateTexture(highlight));
            highlightSprite.anchor.set(0.5);
            sprite.addChild(highlightSprite);
        }

        return sprite;
    }

    /**
     * Update player snakes from server data
     * @param {Array} players - Array of player objects from server
     */
    updatePlayers(players) {
        const now = Date.now();

        players.forEach(player => {
            // Get or create player container
            let container = this.playerContainers.get(player.id);

            if (!container) {
                // Create new container for this player
                container = new PIXI.Container();
                this.layers.snakes.addChild(container);
                this.playerContainers.set(player.id, container);

                // Create player name label (show only username/phone)
                const displayName = player.username || player.name || 'Player';
                const label = new PIXI.Text({
                    text: displayName,
                    style: {
                        fontFamily: 'IranSans, Arial',
                        fontSize: 36,
                        fontWeight: 'bold',
                        fill: 0xffffff,
                        stroke: { color: 0x000000, width: 5 }
                    }
                });
                label.anchor.set(0.5, 1);
                this.layers.ui.addChild(label);
                this.playerLabels.set(player.id, label);
            }

            // Get or create segment sprites
            let segments = this.snakeSegments.get(player.id) || [];

            // Adjust segment count to match server data
            while (segments.length < player.segments.length) {
                const isHead = segments.length === 0;
                const segment = this.createSnakeSegment(player.color, isHead);
                container.addChild(segment);
                segments.push(segment);
            }

            while (segments.length > player.segments.length) {
                const removed = segments.pop();
                removed.destroy();
            }

            this.snakeSegments.set(player.id, segments);

            // Setup interpolation data
            let interpolation = this.interpolationData.get(player.id) || [];

            player.segments.forEach((serverPos, index) => {
                if (!interpolation[index]) {
                    // First time seeing this segment - no interpolation needed
                    interpolation[index] = {
                        previous: { x: serverPos.x, y: serverPos.y },
                        target: { x: serverPos.x, y: serverPos.y },
                        lastUpdate: now
                    };
                    // Set sprite position immediately
                    if (segments[index]) {
                        segments[index].x = serverPos.x * this.squareSize + this.squareSize / 2;
                        segments[index].y = serverPos.y * this.squareSize + this.squareSize / 2;
                    }
                } else {
                    // Use OLD target as new previous (not sprite position - avoids conversion errors)
                    interpolation[index].previous = {
                        x: interpolation[index].target.x,
                        y: interpolation[index].target.y
                    };
                    interpolation[index].target = { x: serverPos.x, y: serverPos.y };
                    interpolation[index].lastUpdate = now;
                }
            });

            this.interpolationData.set(player.id, interpolation);
        });

        // Remove disconnected players
        this.playerContainers.forEach((container, playerId) => {
            if (!players.find(p => p.id === playerId)) {
                this.removePlayer(playerId);
            }
        });
    }

    /**
     * Remove a player and cleanup resources
     * @param {string} playerId - Player ID to remove
     */
    removePlayer(playerId) {
        const container = this.playerContainers.get(playerId);
        if (container) {
            container.destroy({ children: true });
            this.playerContainers.delete(playerId);
        }

        const label = this.playerLabels.get(playerId);
        if (label) {
            label.destroy();
            this.playerLabels.delete(playerId);
        }

        this.snakeSegments.delete(playerId);
        this.interpolationData.delete(playerId);
    }

    /**
     * Update food sprites from server data
     * @param {Array} foodArray - Array of food objects from server
     */
    updateFood(foodArray) {
        const currentFoodKeys = new Set();

        foodArray.forEach((food) => {
            const key = `${food.x}-${food.y}`;
            currentFoodKeys.add(key);

            // Create food sprite if it doesn't exist
            if (!this.foodSprites.has(key)) {
                const texture = this.emojiToTexture[food.emoji] || this.textures.watermelon;
                const sprite = new PIXI.Sprite(texture);
                sprite.anchor.set(0.5);

                // Position at center of grid square
                sprite.x = food.x * this.squareSize + this.squareSize / 2;
                sprite.y = food.y * this.squareSize + this.squareSize / 2;

                // Scale texture to fit (larger for better visibility)
                sprite.scale.set(this.squareSize / 20);

                this.layers.food.addChild(sprite);
                this.foodSprites.set(key, { sprite, data: food });
            }
        });

        // Remove eaten food with particle effect
        this.foodSprites.forEach((value, key) => {
            if (!currentFoodKeys.has(key)) {
                // Trigger particle explosion
                const sprite = value.sprite;
                const emoji = value.data.emoji;

                if (emoji === '🍉') {
                    this.particleEffect.createWatermelonExplosion(sprite.x, sprite.y);
                } else if (emoji === '🍇' || emoji === '🍎') {
                    this.particleEffect.createPomegranateExplosion(sprite.x, sprite.y);
                } else {
                    this.particleEffect.createExplosion(sprite.x, sprite.y, '#e74c3c');
                }

                sprite.destroy();
                this.foodSprites.delete(key);
            }
        });
    }

    /**
     * Update render loop with interpolation
     * Called by PixiJS ticker (60 FPS)
     * @param {object} ticker - PixiJS ticker object
     */
    update(ticker) {
        const now = Date.now();
        const deltaTime = ticker.deltaTime;

        // Interpolate snake positions
        this.interpolationData.forEach((playerData, playerId) => {
            const segments = this.snakeSegments.get(playerId);
            const label = this.playerLabels.get(playerId);

            if (!segments) return;

            playerData.forEach((segmentData, index) => {
                const segment = segments[index];
                const elapsed = now - segmentData.lastUpdate;
                // Use fixed server tick interval (100ms = 10 FPS)
                let progress = elapsed / 100;

                // Handle grid wrapping for interpolation
                let targetX = segmentData.target.x;
                let targetY = segmentData.target.y;
                let prevX = segmentData.previous.x;
                let prevY = segmentData.previous.y;

                // Check if wrapping occurred (teleport across board edge)
                if (Math.abs(targetX - prevX) > this.boardWidth / 2) {
                    if (targetX > prevX) {
                        prevX += this.boardWidth;
                    } else {
                        targetX += this.boardWidth;
                    }
                }

                if (Math.abs(targetY - prevY) > this.boardHeight / 2) {
                    if (targetY > prevY) {
                        prevY += this.boardHeight;
                    } else {
                        targetY += this.boardHeight;
                    }
                }

                let interpolatedX, interpolatedY;

                // Clamp progress to avoid overshooting
                const clampedProgress = Math.min(progress, 1);

                // Simple linear interpolation (most reliable)
                interpolatedX = prevX + (targetX - prevX) * clampedProgress;
                interpolatedY = prevY + (targetY - prevY) * clampedProgress;

                // Convert grid coordinates to screen coordinates with proper wrapping
                const finalX = ((interpolatedX % this.boardWidth) + this.boardWidth) % this.boardWidth;
                const finalY = ((interpolatedY % this.boardHeight) + this.boardHeight) % this.boardHeight;

                segment.x = finalX * this.squareSize + this.squareSize / 2;
                segment.y = finalY * this.squareSize + this.squareSize / 2;

                // Update player name label position (follow head)
                if (index === 0 && label) {
                    label.x = segment.x;
                    label.y = segment.y - 15;
                }
            });
        });

        // Update particle effects
        if (this.particleEffect) {
            this.particleEffect.update(deltaTime);
        }
    }

    /**
     * Cleanup and destroy renderer
     */
    destroy() {
        if (this.particleEffect) {
            this.particleEffect.destroy();
        }

        if (this.app) {
            this.app.destroy(true, { children: true, texture: true, baseTexture: true });
        }
    }
}

console.log('PixiJS renderer loaded');
