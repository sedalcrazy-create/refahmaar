// Yalda Snake - Particle Effects System
// Handles food consumption particle explosions
'use strict';

/**
 * Food particle effect manager
 * Creates and manages particle emitters for food consumption effects
 */
class FoodParticleEffect {
    /**
     * @param {PIXI.Application} pixiApp - PixiJS application instance
     * @param {PIXI.Container} particleContainer - Container for particles
     */
    constructor(pixiApp, particleContainer) {
        this.app = pixiApp;
        this.container = particleContainer;
        this.activeEmitters = [];

        // Create reusable particle texture
        this.particleTexture = this.createParticleTexture();
    }

    /**
     * Create a circular particle texture
     * @returns {PIXI.Texture} Particle texture
     */
    createParticleTexture() {
        const graphics = new PIXI.Graphics();
        graphics.circle(0, 0, 4);
        graphics.fill({ color: 0xffffff });

        return this.app.renderer.generateTexture(graphics);
    }

    /**
     * Create particle explosion effect at food position
     * @param {number} x - X position in pixels
     * @param {number} y - Y position in pixels
     * @param {string} color - Hex color string (e.g., '#e74c3c')
     * @param {number} particleCount - Number of particles (default: 15)
     */
    createExplosion(x, y, color = '#e74c3c', particleCount = 15) {
        // Emitter configuration for particle-emitter library
        const emitterConfig = {
            lifetime: {
                min: 0.2,
                max: 0.5
            },
            frequency: 0.001,
            emitterLifetime: 0.1,
            maxParticles: particleCount,
            pos: { x, y },
            behaviors: [
                {
                    type: 'alpha',
                    config: {
                        alpha: {
                            start: 1,
                            end: 0
                        }
                    }
                },
                {
                    type: 'scale',
                    config: {
                        scale: {
                            start: 1,
                            end: 0.2
                        }
                    }
                },
                {
                    type: 'color',
                    config: {
                        color: {
                            start: color,
                            end: '#ffffff'
                        }
                    }
                },
                {
                    type: 'moveSpeed',
                    config: {
                        speed: {
                            start: 200,
                            end: 50
                        },
                        minMult: 0.8,
                        maxMult: 1.2
                    }
                },
                {
                    type: 'rotationStatic',
                    config: {
                        min: 0,
                        max: 360
                    }
                },
                {
                    type: 'spawnShape',
                    config: {
                        type: 'circle',
                        data: {
                            radius: 10
                        }
                    }
                }
            ]
        };

        try {
            // Create emitter using pixi-particles library
            const emitter = new PIXI.ParticleEmitter(
                this.container,
                this.particleTexture,
                emitterConfig
            );

            emitter.emit = true;
            this.activeEmitters.push(emitter);

            // Auto-cleanup after effect finishes
            setTimeout(() => {
                emitter.destroy();
                const index = this.activeEmitters.indexOf(emitter);
                if (index > -1) {
                    this.activeEmitters.splice(index, 1);
                }
            }, 600);
        } catch (error) {
            console.error('Failed to create particle emitter:', error);
        }
    }

    /**
     * Create watermelon-specific explosion (green outer, red inner)
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    createWatermelonExplosion(x, y) {
        // Green particles first
        this.createExplosion(x, y, '#2ecc71', 20);

        // Red particles slightly delayed
        setTimeout(() => {
            this.createExplosion(x, y, '#e74c3c', 10);
        }, 50);
    }

    /**
     * Create pomegranate-specific explosion (ruby red with sparkle)
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    createPomegranateExplosion(x, y) {
        this.createExplosion(x, y, '#c0392b', 15);
    }

    /**
     * Update all active particle emitters
     * Called every frame from PixiJS ticker
     * @param {number} deltaTime - Time elapsed in milliseconds
     */
    update(deltaTime) {
        // Update all active emitters
        this.activeEmitters.forEach(emitter => {
            // Convert deltaTime from milliseconds to seconds
            emitter.update(deltaTime * 0.001);
        });
    }

    /**
     * Clean up all active emitters
     */
    destroy() {
        this.activeEmitters.forEach(emitter => {
            emitter.destroy();
        });
        this.activeEmitters = [];
    }
}

console.log('Particle effects system loaded');
