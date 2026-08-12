import * as THREE from 'three';
/**
 * AmbientParticles — manages a fixed pool of ambient particles that drift
 * through the corridor to create atmosphere.
 *
 * The system supports two particle types:
 *   1. Floating dust motes — small dim spheres that drift slowly downward
 *      with gentle horizontal sway.
 *   2. Energy sparks — slightly larger bright spheres that occasionally
 *      brighten and fade along the walls.
 *
 * The system uses a fixed pool of 40 particles (30 dust motes, 10 energy sparks)
 * that are recycled, not created/destroyed constantly.
 *
 * Particle color matches the level theme:
 *   - 'titan-gate': cyan (0x00c8ff)
 *   - 'void-reactor': purple (0xaa44ff)
 *   - 'sovereign-core': gold (0xffcc00)
 */
export class AmbientParticles {
    /**
     * Creates a new AmbientParticles system.
     * Builds the fixed pool of 40 particles and adds them to the scene.
     *
     * @param scene - The THREE.js scene to add particles to
     * @param levelStyle - The visual style of the particles (default: 'titan-gate')
     */
    constructor(scene, levelStyle = 'titan-gate') {
        /** The THREE.js scene to add particles to */
        Object.defineProperty(this, "scene", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Array of particle meshes */
        Object.defineProperty(this, "particles", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Array of particle types (parallel to particles array) */
        Object.defineProperty(this, "particleTypes", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Array of downward drift speeds (units/second) */
        Object.defineProperty(this, "driftSpeeds", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Array of horizontal sway amplitudes */
        Object.defineProperty(this, "swayAmplitudes", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Array of sway phase offsets (radians) */
        Object.defineProperty(this, "swayPhases", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Array of base opacities for each particle */
        Object.defineProperty(this, "baseOpacities", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Array of brightness phase offsets for sparks (radians) */
        Object.defineProperty(this, "brightnessPhases", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Array of brightness speeds for sparks (radians/second) */
        Object.defineProperty(this, "brightnessSpeeds", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** The current level style */
        Object.defineProperty(this, "levelStyle", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** The accent color for the current level style */
        Object.defineProperty(this, "accentColor", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Whether this system has been disposed */
        Object.defineProperty(this, "isDisposed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        /** Time accumulator for sway/brightness animations */
        Object.defineProperty(this, "time", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** Number of dust motes in the pool */
        Object.defineProperty(this, "dustCount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 30
        });
        /** Number of energy sparks in the pool */
        Object.defineProperty(this, "sparkCount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 10
        });
        /** Total number of particles in the pool */
        Object.defineProperty(this, "totalCount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 40
        });
        /** Corridor bounds */
        Object.defineProperty(this, "minX", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: -7.5
        });
        Object.defineProperty(this, "maxX", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 7.5
        });
        Object.defineProperty(this, "minZ", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: -4
        });
        Object.defineProperty(this, "maxZ", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 1
        });
        Object.defineProperty(this, "minY", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: -8
        });
        Object.defineProperty(this, "maxY", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 10
        });
        this.scene = scene;
        this.levelStyle = levelStyle;
        this.accentColor = this.getAccentColor(levelStyle);
        // Build the fixed particle pool
        this.buildParticles();
    }
    /**
     * Updates all ambient particles.
     * Drifts particles downward, applies horizontal sway to dust motes,
     * animates spark brightness, and recycles particles that go below the view.
     *
     * @param delta - Time elapsed since last frame in seconds
     * @param scrollSpeed - The corridor scroll speed in units/second (unused for ambient drift)
     */
    update(delta, scrollSpeed) {
        if (this.isDisposed)
            return;
        // Advance the animation time
        this.time += delta;
        // Update each particle
        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];
            const type = this.particleTypes[i];
            // Move downward at the particle's drift speed
            particle.position.y -= this.driftSpeeds[i] * delta;
            if (type === 'dust') {
                // Dust motes: sinusoidal horizontal sway
                const sway = Math.sin(this.time * 1.5 + this.swayPhases[i]) * this.swayAmplitudes[i];
                particle.position.x += sway * delta;
            }
            else {
                // Energy sparks: brightness oscillation
                const material = particle.material;
                const brightness = 0.5 + 0.5 * Math.sin(this.time * this.brightnessSpeeds[i] + this.brightnessPhases[i]);
                material.opacity = this.baseOpacities[i] * (0.4 + 0.6 * brightness);
            }
            // Recycle particles that go below the visible area
            if (particle.position.y < this.minY) {
                this.recycleParticle(i);
            }
        }
    }
    /**
     * Changes the visual style of the ambient particles.
     * Updates all particle material colors to match the new theme.
     *
     * @param levelStyle - The new visual style for the particles
     */
    setLevelStyle(levelStyle) {
        if (this.isDisposed)
            return;
        if (this.levelStyle === levelStyle)
            return;
        this.levelStyle = levelStyle;
        this.accentColor = this.getAccentColor(levelStyle);
        // Update all particle colors
        for (const particle of this.particles) {
            particle.material.color.setHex(this.accentColor);
        }
    }
    /**
     * Disposes the ambient particle system.
     * Removes all particles from the scene and disposes all geometries and materials.
     */
    dispose() {
        if (this.isDisposed)
            return;
        // Remove all particles from the scene
        for (const particle of this.particles) {
            this.scene.remove(particle);
            particle.geometry.dispose();
            particle.material.dispose();
        }
        // Clear all arrays
        this.particles = [];
        this.particleTypes = [];
        this.driftSpeeds = [];
        this.swayAmplitudes = [];
        this.swayPhases = [];
        this.baseOpacities = [];
        this.brightnessPhases = [];
        this.brightnessSpeeds = [];
        this.isDisposed = true;
    }
    /**
     * Returns the accent color for the given level style.
     *
     * @param levelStyle - The level style
     * @returns {number} The accent color as a hex number
     */
    getAccentColor(levelStyle) {
        switch (levelStyle) {
            case 'titan-gate':
                return 0x00c8ff; // Cyan
            case 'void-reactor':
                return 0xaa44ff; // Purple
            case 'sovereign-core':
                return 0xffcc00; // Gold
            default:
                return 0x00c8ff;
        }
    }
    /**
     * Builds the fixed particle pool.
     * Creates 30 dust motes and 10 energy sparks with random properties.
     */
    buildParticles() {
        // Create dust motes
        for (let i = 0; i < this.dustCount; i++) {
            this.createParticle('dust', i);
        }
        // Create energy sparks
        for (let i = 0; i < this.sparkCount; i++) {
            this.createParticle('spark', this.dustCount + i);
        }
    }
    /**
     * Creates a single particle and adds it to the pool.
     *
     * @param type - The particle type ('dust' or 'spark')
     * @param index - The index in the particles array
     */
    createParticle(type, index) {
        // Determine particle properties based on type
        let radius;
        let baseOpacity;
        let driftSpeed;
        let swayAmplitude;
        if (type === 'dust') {
            // Dust motes: small dim spheres
            radius = 0.04 + Math.random() * 0.04; // 0.04-0.08
            baseOpacity = 0.15 + Math.random() * 0.15; // 0.15-0.3
            driftSpeed = 0.3 + Math.random() * 0.5; // 0.3-0.8 units/sec
            swayAmplitude = 0.3 + Math.random() * 0.5; // 0.3-0.8 units/sec sway
        }
        else {
            // Energy sparks: slightly larger, brighter
            radius = 0.06 + Math.random() * 0.04; // 0.06-0.1
            baseOpacity = 0.4 + Math.random() * 0.3; // 0.4-0.7
            driftSpeed = 0.5 + Math.random() * 0.5; // 0.5-1.0 units/sec
            swayAmplitude = 0.1 + Math.random() * 0.2; // Less sway for sparks
        }
        // Create the particle mesh
        const geometry = new THREE.SphereGeometry(radius, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: this.accentColor,
            transparent: true,
            opacity: baseOpacity,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const particle = new THREE.Mesh(geometry, material);
        // Random position within corridor bounds
        particle.position.set(this.minX + Math.random() * (this.maxX - this.minX), this.minY + Math.random() * (this.maxY - this.minY), this.minZ + Math.random() * (this.maxZ - this.minZ));
        // Add to scene and arrays
        this.scene.add(particle);
        this.particles.push(particle);
        this.particleTypes.push(type);
        this.driftSpeeds.push(driftSpeed);
        this.swayAmplitudes.push(swayAmplitude);
        this.swayPhases.push(Math.random() * Math.PI * 2); // Random phase offset
        this.baseOpacities.push(baseOpacity);
        this.brightnessPhases.push(Math.random() * Math.PI * 2); // Random phase offset
        this.brightnessSpeeds.push(2 + Math.random() * 4); // 2-6 rad/sec
    }
    /**
     * Recycles a particle that has gone below the visible area.
     * Repositions it at the top with new random x/z and resets its animation phase.
     *
     * @param index - The index of the particle to recycle
     */
    recycleParticle(index) {
        const particle = this.particles[index];
        // Reposition at the top with new random x/z
        particle.position.set(this.minX + Math.random() * (this.maxX - this.minX), this.maxY, this.minZ + Math.random() * (this.maxZ - this.minZ));
        // Reset the animation phase to avoid synchronized movement
        this.swayPhases[index] = Math.random() * Math.PI * 2;
        this.brightnessPhases[index] = Math.random() * Math.PI * 2;
        // Reset the material opacity to the base value
        particle.material.opacity = this.baseOpacities[index];
    }
}
