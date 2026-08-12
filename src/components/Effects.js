import * as THREE from 'three';
/**
 * Effect system for StarForge Strike.
 * Provides warp-in entrances, hit flashes, and explosion effects.
 * All effects use MeshBasicMaterial with AdditiveBlending for the glow look.
 */
/**
 * Gravity constant applied to explosion particles (units/sec^2).
 * Makes particles slow down as they rise and start falling.
 */
const GRAVITY = 3.0;
/**
 * WarpEffect — cyan flash + expanding ring entrance effect.
 * Fades in the target enemy mesh from transparent to opaque.
 */
export class WarpEffect {
    /**
     * Creates a new WarpEffect.
     * The effect starts inactive and hidden.
     *
     * @param scene - The THREE.js scene to add the effect to
     */
    constructor(scene) {
        /** The THREE.js group containing all effect meshes */
        Object.defineProperty(this, "mesh", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Whether this effect is currently active */
        Object.defineProperty(this, "active", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Time elapsed since spawn in seconds */
        Object.defineProperty(this, "elapsed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Total duration of the effect in seconds */
        Object.defineProperty(this, "duration", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** The target enemy mesh to fade in */
        Object.defineProperty(this, "targetMesh", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** The flash sphere mesh */
        Object.defineProperty(this, "flash", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** The expanding ring mesh */
        Object.defineProperty(this, "ring", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.active = false;
        this.elapsed = 0;
        this.duration = 0.3;
        this.targetMesh = null;
        // Build the effect group
        this.mesh = new THREE.Group();
        // --- Flash Sphere ---
        // Bright cyan sphere that fades out quickly
        const flashGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        this.flash = new THREE.Mesh(flashGeometry, flashMaterial);
        this.mesh.add(this.flash);
        // --- Expanding Ring ---
        // Cyan torus that scales up and fades out
        const ringGeometry = new THREE.TorusGeometry(0.5, 0.05, 8, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x00c8ff,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
        this.ring.rotation.x = Math.PI / 2; // Lay flat on X-Y plane
        this.mesh.add(this.ring);
        // Add to scene but keep hidden until spawned
        scene.add(this.mesh);
        this.mesh.visible = false;
    }
    /**
     * Activates the effect at the given position.
     * Makes the target enemy's materials transparent and fades them in.
     *
     * @param position - The spawn position (Vector3 or {x, y, z})
     * @param targetMesh - The enemy mesh to fade in during the warp
     */
    spawn(position, targetMesh) {
        this.mesh.position.set(position.x, position.y, position.z);
        this.targetMesh = targetMesh;
        this.elapsed = 0;
        this.active = true;
        this.mesh.visible = true;
        // Reset flash and ring
        this.flash.material.opacity = 1.0;
        this.flash.scale.set(1, 1, 1);
        this.ring.material.opacity = 1.0;
        this.ring.scale.set(1, 1, 1);
        // The Enemy class handles its own material fade-in during warp.
        // WarpEffect only handles the visual ring/flash effect.
    }
    /**
     * Updates the effect animation.
     * Scales the ring, fades the flash, and fades in the target mesh.
     *
     * @param delta - Time elapsed since last frame in seconds
     */
    update(delta) {
        if (!this.active)
            return;
        this.elapsed += delta;
        const progress = Math.min(this.elapsed / this.duration, 1);
        // --- Ring Expansion ---
        // Scale from 0.5 to 3.0 units
        const ringScale = 0.5 + progress * 2.5; // 0.5 → 3.0
        this.ring.scale.set(ringScale, ringScale, ringScale);
        // Fade ring opacity from 1 to 0
        this.ring.material.opacity = 1 - progress;
        // --- Flash Fade ---
        // Fade flash opacity from 1 to 0 (faster than ring)
        const flashProgress = Math.min(progress * 1.5, 1);
        this.flash.material.opacity = 1 - flashProgress;
        // The Enemy class handles its own material fade-in during warp.
        // Deactivate when complete
        if (progress >= 1) {
            this.deactivate();
        }
    }
    /**
     * Deactivates the effect and restores the target mesh to opaque.
     */
    deactivate() {
        if (!this.active)
            return;
        this.active = false;
        this.mesh.visible = false;
        this.targetMesh = null;
    }
    /**
     * Disposes all geometries and materials used by this effect.
     * Called by the EffectManager when the effect is removed.
     */
    dispose() {
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                child.material.dispose();
            }
        });
    }
}
/**
 * EliteWarpEffect — enhanced warp-in effect for elite enemies.
 * Features a larger flash, bigger expanding ring, particle burst, and screen shake trigger.
 */
export class EliteWarpEffect {
    /**
     * Creates a new EliteWarpEffect.
     * The effect starts inactive and hidden.
     *
     * @param scene - The THREE.js scene to add the effect to
     */
    constructor(scene) {
        /** The THREE.js group containing all effect meshes */
        Object.defineProperty(this, "mesh", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Whether this effect is currently active */
        Object.defineProperty(this, "active", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Time elapsed since spawn in seconds */
        Object.defineProperty(this, "elapsed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Total duration of the effect in seconds */
        Object.defineProperty(this, "duration", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Whether screen shake should be triggered (read by Game.ts) */
        Object.defineProperty(this, "screenShakeTriggered", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        /** The target enemy mesh to fade in */
        Object.defineProperty(this, "targetMesh", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** The flash sphere mesh */
        Object.defineProperty(this, "flash", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** The expanding ring mesh */
        Object.defineProperty(this, "ring", {
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
        /** Array of particle velocities (parallel to particles array) */
        Object.defineProperty(this, "velocities", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** The THREE.js scene this effect belongs to */
        Object.defineProperty(this, "scene", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.scene = scene;
        this.active = false;
        this.elapsed = 0;
        this.duration = 0.5;
        this.targetMesh = null;
        // Build the effect group
        this.mesh = new THREE.Group();
        // --- Flash Sphere ---
        // Larger bright cyan sphere that fades out quickly
        const flashGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        this.flash = new THREE.Mesh(flashGeometry, flashMaterial);
        this.mesh.add(this.flash);
        // --- Expanding Ring ---
        // Larger cyan torus that scales up and fades out
        const ringGeometry = new THREE.TorusGeometry(0.8, 0.07, 8, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x00c8ff,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
        this.ring.rotation.x = Math.PI / 2; // Lay flat on X-Y plane
        this.mesh.add(this.ring);
        // Add to scene but keep hidden until spawned
        scene.add(this.mesh);
        this.mesh.visible = false;
    }
    /**
     * Activates the effect at the given position.
     * Makes the target enemy's materials transparent and fades them in.
     * Spawns 10-15 cyan particles that burst outward.
     *
     * @param position - The spawn position (Vector3 or {x, y, z})
     * @param targetMesh - The enemy mesh to fade in during the warp
     */
    spawn(position, targetMesh) {
        this.mesh.position.set(position.x, position.y, position.z);
        this.targetMesh = targetMesh;
        this.elapsed = 0;
        this.active = true;
        this.mesh.visible = true;
        this.screenShakeTriggered = false;
        // Reset flash and ring
        this.flash.material.opacity = 1.0;
        this.flash.scale.set(1, 1, 1);
        this.ring.material.opacity = 1.0;
        this.ring.scale.set(1, 1, 1);
        // Clear any existing particles
        this.clearParticles();
        // Spawn 10-15 cyan particles that burst outward
        const particleCount = 10 + Math.floor(Math.random() * 6); // 10-15
        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            const material = new THREE.MeshBasicMaterial({
                color: 0x00c8ff,
                transparent: true,
                opacity: 1.0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            const particle = new THREE.Mesh(geometry, material);
            particle.position.set(position.x, position.y, position.z);
            this.scene.add(particle);
            this.particles.push(particle);
            // Random outward velocity
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 4; // 3-7 units per second
            const velocity = new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed, 0);
            this.velocities.push(velocity);
        }
    }
    /**
     * Updates the effect animation.
     * Scales the ring, fades the flash, moves particles, and fades in the target mesh.
     *
     * @param delta - Time elapsed since last frame in seconds
     */
    update(delta) {
        if (!this.active)
            return;
        this.elapsed += delta;
        const progress = Math.min(this.elapsed / this.duration, 1);
        // Trigger screen shake at the start
        if (!this.screenShakeTriggered && this.elapsed >= 0.05) {
            this.screenShakeTriggered = true;
        }
        // --- Ring Expansion ---
        // Scale from 0.8 to 5.0 units
        const ringScale = 0.8 + progress * 4.2; // 0.8 → 5.0
        this.ring.scale.set(ringScale, ringScale, ringScale);
        // Fade ring opacity from 1 to 0
        this.ring.material.opacity = 1 - progress;
        // --- Flash Fade ---
        // Fade flash opacity from 1 to 0 (faster than ring)
        const flashProgress = Math.min(progress * 1.5, 1);
        this.flash.material.opacity = 1 - flashProgress;
        // --- Particles ---
        // Move particles outward and fade them out
        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];
            const velocity = this.velocities[i];
            particle.position.x += velocity.x * delta;
            particle.position.y += velocity.y * delta;
            // Fade out
            particle.material.opacity = 1 - progress;
        }
        // Deactivate when complete
        if (progress >= 1) {
            this.deactivate();
        }
    }
    /**
     * Deactivates the effect and restores the target mesh to opaque.
     */
    deactivate() {
        if (!this.active)
            return;
        this.active = false;
        this.mesh.visible = false;
        this.targetMesh = null;
        this.clearParticles();
    }
    /**
     * Removes all particles from the scene and disposes their resources.
     */
    clearParticles() {
        for (const particle of this.particles) {
            this.scene.remove(particle);
            particle.geometry.dispose();
            particle.material.dispose();
        }
        this.particles = [];
        this.velocities = [];
    }
    /**
     * Disposes all geometries and materials used by this effect.
     * Called by the EffectManager when the effect is removed.
     */
    dispose() {
        this.clearParticles();
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                child.material.dispose();
            }
        });
    }
}
/**
 * HitEffect — white flash + small cyan particle burst.
 * Spawns 5-8 small cyan particles that burst outward from the impact point.
 * Particles have a tiny gravity effect for realism.
 */
export class HitEffect {
    /**
     * Creates a new HitEffect.
     * The effect starts inactive with no particles.
     *
     * @param scene - The THREE.js scene to add particles to
     */
    constructor(scene) {
        /** Array of particle meshes */
        Object.defineProperty(this, "particles", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Array of particle velocities (parallel to particles array) */
        Object.defineProperty(this, "velocities", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Whether this effect is currently active */
        Object.defineProperty(this, "active", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Time elapsed since spawn in seconds */
        Object.defineProperty(this, "elapsed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Total duration of the effect in seconds */
        Object.defineProperty(this, "duration", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** The THREE.js scene this effect belongs to */
        Object.defineProperty(this, "scene", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.scene = scene;
        this.active = false;
        this.elapsed = 0;
        this.duration = 0.3;
    }
    /**
     * Activates the effect at the given position.
     * Spawns 5-8 cyan particles with random outward velocities.
     *
     * @param position - The impact position (Vector3 or {x, y, z})
     */
    spawn(position) {
        this.elapsed = 0;
        this.active = true;
        // Clear any existing particles
        this.clearParticles();
        // Spawn 5-8 particles
        const particleCount = 5 + Math.floor(Math.random() * 4); // 5-8
        for (let i = 0; i < particleCount; i++) {
            // Small box particle
            const geometry = new THREE.BoxGeometry(0.08, 0.08, 0.08);
            const material = new THREE.MeshBasicMaterial({
                color: 0x00c8ff,
                transparent: true,
                opacity: 1.0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            const particle = new THREE.Mesh(geometry, material);
            particle.position.set(position.x, position.y, position.z);
            this.scene.add(particle);
            this.particles.push(particle);
            // Random outward velocity
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3; // 2-5 units per second
            const velocity = new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed, 0);
            this.velocities.push(velocity);
        }
    }
    /**
     * Updates the effect animation.
     * Moves particles outward, applies gravity, and fades them out.
     *
     * @param delta - Time elapsed since last frame in seconds
     */
    update(delta) {
        if (!this.active)
            return;
        this.elapsed += delta;
        const progress = Math.min(this.elapsed / this.duration, 1);
        // Update each particle
        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];
            const velocity = this.velocities[i];
            // Apply tiny gravity effect
            velocity.y -= GRAVITY * 0.3 * delta;
            // Move particle
            particle.position.x += velocity.x * delta;
            particle.position.y += velocity.y * delta;
            // Fade out
            particle.material.opacity = 1 - progress;
        }
        // Deactivate when complete
        if (progress >= 1) {
            this.deactivate();
        }
    }
    /**
     * Deactivates the effect and removes all particles from the scene.
     */
    deactivate() {
        this.active = false;
        this.clearParticles();
    }
    /**
     * Removes all particles from the scene and disposes their resources.
     */
    clearParticles() {
        for (const particle of this.particles) {
            this.scene.remove(particle);
            particle.geometry.dispose();
            particle.material.dispose();
        }
        this.particles = [];
        this.velocities = [];
    }
    /**
     * Disposes all resources used by this effect.
     * Called by the EffectManager when the effect is removed.
     */
    dispose() {
        this.clearParticles();
    }
}
/**
 * ExplosionEffect — enhanced explosion for basic enemies.
 * Spawns 15-20 particles with varied colors, particle trails, and gravity.
 */
export class ExplosionEffect {
    /**
     * Creates a new ExplosionEffect.
     * The effect starts inactive with no particles.
     *
     * @param scene - The THREE.js scene to add particles to
     */
    constructor(scene) {
        /** Array of particle meshes */
        Object.defineProperty(this, "particles", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Array of particle velocities (parallel to particles array) */
        Object.defineProperty(this, "velocities", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Array of trail meshes (parallel to particles array) */
        Object.defineProperty(this, "trails", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Array of previous positions for trail lag (parallel to particles array) */
        Object.defineProperty(this, "previousPositions", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** The shockwave ring mesh */
        Object.defineProperty(this, "ring", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Whether this effect is currently active */
        Object.defineProperty(this, "active", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Time elapsed since spawn in seconds */
        Object.defineProperty(this, "elapsed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Total duration of the effect in seconds */
        Object.defineProperty(this, "duration", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** The THREE.js scene this effect belongs to */
        Object.defineProperty(this, "scene", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.scene = scene;
        this.active = false;
        this.elapsed = 0;
        this.duration = 0.8;
    }
    /**
     * Activates the effect at the given position.
     * Spawns 15-20 particles with varied colors and trails.
     *
     * @param position - The explosion position (Vector3 or {x, y, z})
     */
    spawn(position) {
        this.elapsed = 0;
        this.active = true;
        // Clear any existing particles, trails, and ring
        this.clearParticles();
        this.clearTrails();
        this.clearRing();
        // Spawn 15-20 particles
        const particleCount = 15 + Math.floor(Math.random() * 6); // 15-20
        // Color palette: orange, yellow, red, white
        const colors = [0xff8800, 0xffcc00, 0xff4400, 0xffffff];
        for (let i = 0; i < particleCount; i++) {
            // Random color from palette
            const color = colors[Math.floor(Math.random() * colors.length)];
            // Small box particle
            const geometry = new THREE.BoxGeometry(0.12, 0.12, 0.12);
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 1.0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            const particle = new THREE.Mesh(geometry, material);
            particle.position.set(position.x, position.y, position.z);
            this.scene.add(particle);
            this.particles.push(particle);
            // Random outward velocity in all directions
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 5; // 3-8 units per second
            const velocity = new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed, 0);
            this.velocities.push(velocity);
            // Store the initial position as the previous position for trail lag
            this.previousPositions.push(new THREE.Vector3(position.x, position.y, position.z));
            // Create trail mesh — smaller box, same color, lower opacity
            const trailGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.08);
            const trailMaterial = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.6,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            const trail = new THREE.Mesh(trailGeometry, trailMaterial);
            trail.position.set(position.x, position.y, position.z);
            this.scene.add(trail);
            this.trails.push(trail);
        }
        // Create shockwave ring
        const ringGeometry = new THREE.TorusGeometry(0.5, 0.06, 8, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
        this.ring.rotation.x = Math.PI / 2; // Lay flat on X-Y plane
        this.ring.position.set(position.x, position.y, position.z);
        this.scene.add(this.ring);
    }
    /**
     * Updates the effect animation.
     * Moves particles with gravity, updates trails, scales down and fades out,
     * and expands the shockwave ring.
     *
     * @param delta - Time elapsed since last frame in seconds
     */
    update(delta) {
        if (!this.active)
            return;
        this.elapsed += delta;
        const progress = Math.min(this.elapsed / this.duration, 1);
        // Update each particle
        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];
            const velocity = this.velocities[i];
            const trail = this.trails[i];
            const previousPos = this.previousPositions[i];
            // Store the current position as the previous position for the trail
            previousPos.copy(particle.position);
            // Apply gravity — particles slow down as they rise and start falling
            velocity.y -= GRAVITY * delta;
            // Move particle
            particle.position.x += velocity.x * delta;
            particle.position.y += velocity.y * delta;
            // Position the trail at the previous position (lag effect)
            trail.position.copy(previousPos);
            // Scale down and fade out the particle
            const scale = 1 - progress;
            particle.scale.set(scale, scale, scale);
            particle.material.opacity = 1 - progress;
            // Trail shrinks and fades faster than the main particle
            const trailScale = 1 - progress * 1.3; // Faster shrink
            trail.scale.set(Math.max(0.1, trailScale), Math.max(0.1, trailScale), Math.max(0.1, trailScale));
            trail.material.opacity = Math.max(0, 0.6 - progress * 0.8);
        }
        // Update shockwave ring
        if (this.ring) {
            // Scale from 0.5 to 4.0 units
            const ringScale = 0.5 + progress * 3.5; // 0.5 → 4.0
            this.ring.scale.set(ringScale, ringScale, ringScale);
            // Fade out
            this.ring.material.opacity = 1 - progress;
        }
        // Deactivate when complete
        if (progress >= 1) {
            this.deactivate();
        }
    }
    /**
     * Deactivates the effect and removes all particles, trails, and ring from the scene.
     */
    deactivate() {
        this.active = false;
        this.clearParticles();
        this.clearTrails();
        this.clearRing();
    }
    /**
     * Removes all particles from the scene and disposes their resources.
     */
    clearParticles() {
        for (const particle of this.particles) {
            this.scene.remove(particle);
            particle.geometry.dispose();
            particle.material.dispose();
        }
        this.particles = [];
        this.velocities = [];
        this.previousPositions = [];
    }
    /**
     * Removes all trail meshes from the scene and disposes their resources.
     */
    clearTrails() {
        for (const trail of this.trails) {
            this.scene.remove(trail);
            trail.geometry.dispose();
            trail.material.dispose();
        }
        this.trails = [];
    }
    /**
     * Removes the shockwave ring from the scene and disposes its resources.
     */
    clearRing() {
        if (this.ring) {
            this.scene.remove(this.ring);
            this.ring.geometry.dispose();
            this.ring.material.dispose();
            this.ring = null;
        }
    }
    /**
     * Disposes all resources used by this effect.
     * Called by the EffectManager when the effect is removed.
     */
    dispose() {
        this.clearParticles();
        this.clearTrails();
        this.clearRing();
    }
}
/**
 * EliteExplosionEffect — enhanced explosion effect for elite enemies.
 * Features 40-50 particles with varied colors, trails, gravity, and screen shake trigger.
 */
export class EliteExplosionEffect {
    /**
     * Creates a new EliteExplosionEffect.
     * The effect starts inactive with no particles.
     *
     * @param scene - The THREE.js scene to add particles to
     */
    constructor(scene) {
        /** Array of particle meshes */
        Object.defineProperty(this, "particles", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Array of particle velocities (parallel to particles array) */
        Object.defineProperty(this, "velocities", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Array of trail meshes (parallel to particles array) */
        Object.defineProperty(this, "trails", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Array of previous positions for trail lag (parallel to particles array) */
        Object.defineProperty(this, "previousPositions", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** The shockwave ring mesh */
        Object.defineProperty(this, "ring", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Whether this effect is currently active */
        Object.defineProperty(this, "active", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Time elapsed since spawn in seconds */
        Object.defineProperty(this, "elapsed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Total duration of the effect in seconds */
        Object.defineProperty(this, "duration", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Whether screen shake should be triggered (read by Game.ts) */
        Object.defineProperty(this, "screenShakeTriggered", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        /** The THREE.js scene this effect belongs to */
        Object.defineProperty(this, "scene", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.scene = scene;
        this.active = false;
        this.elapsed = 0;
        this.duration = 1.2;
    }
    /**
     * Activates the effect at the given position.
     * Spawns 40-50 particles with varied colors and trails.
     *
     * @param position - The explosion position (Vector3 or {x, y, z})
     */
    spawn(position) {
        this.elapsed = 0;
        this.active = true;
        this.screenShakeTriggered = false;
        // Clear any existing particles, trails, and ring
        this.clearParticles();
        this.clearTrails();
        this.clearRing();
        // Spawn 40-50 particles
        const particleCount = 40 + Math.floor(Math.random() * 11); // 40-50
        // Color palette: orange, yellow, red, white, cyan
        const colors = [0xff8800, 0xffcc00, 0xff4400, 0xffffff, 0x00c8ff];
        for (let i = 0; i < particleCount; i++) {
            // Random color from palette
            const color = colors[Math.floor(Math.random() * colors.length)];
            // Larger box particle (0.15-0.2 size)
            const size = 0.15 + Math.random() * 0.05; // 0.15-0.2
            const geometry = new THREE.BoxGeometry(size, size, size);
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 1.0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            const particle = new THREE.Mesh(geometry, material);
            particle.position.set(position.x, position.y, position.z);
            this.scene.add(particle);
            this.particles.push(particle);
            // Random outward velocity in all directions (faster than normal explosion)
            const angle = Math.random() * Math.PI * 2;
            const speed = 4 + Math.random() * 6; // 4-10 units per second
            const velocity = new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed, 0);
            this.velocities.push(velocity);
            // Store the initial position as the previous position for trail lag
            this.previousPositions.push(new THREE.Vector3(position.x, position.y, position.z));
            // Create trail mesh — smaller box, same color, lower opacity
            const trailSize = size * 0.7;
            const trailGeometry = new THREE.BoxGeometry(trailSize, trailSize, trailSize);
            const trailMaterial = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.6,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            const trail = new THREE.Mesh(trailGeometry, trailMaterial);
            trail.position.set(position.x, position.y, position.z);
            this.scene.add(trail);
            this.trails.push(trail);
        }
        // Create larger shockwave ring
        const ringGeometry = new THREE.TorusGeometry(0.8, 0.08, 8, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
        this.ring.rotation.x = Math.PI / 2; // Lay flat on X-Y plane
        this.ring.position.set(position.x, position.y, position.z);
        this.scene.add(this.ring);
    }
    /**
     * Updates the effect animation.
     * Moves particles with gravity, updates trails, scales down and fades out,
     * and expands the shockwave ring.
     *
     * @param delta - Time elapsed since last frame in seconds
     */
    update(delta) {
        if (!this.active)
            return;
        this.elapsed += delta;
        const progress = Math.min(this.elapsed / this.duration, 1);
        // Trigger screen shake at the start
        if (!this.screenShakeTriggered && this.elapsed >= 0.05) {
            this.screenShakeTriggered = true;
        }
        // Update each particle
        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];
            const velocity = this.velocities[i];
            const trail = this.trails[i];
            const previousPos = this.previousPositions[i];
            // Store the current position as the previous position for the trail
            previousPos.copy(particle.position);
            // Apply gravity — particles slow down as they rise and start falling
            velocity.y -= GRAVITY * delta;
            // Move particle
            particle.position.x += velocity.x * delta;
            particle.position.y += velocity.y * delta;
            // Position the trail at the previous position (lag effect)
            trail.position.copy(previousPos);
            // Scale down and fade out the particle
            const scale = 1 - progress;
            particle.scale.set(scale, scale, scale);
            particle.material.opacity = 1 - progress;
            // Trail shrinks and fades faster than the main particle
            const trailScale = 1 - progress * 1.3; // Faster shrink
            trail.scale.set(Math.max(0.1, trailScale), Math.max(0.1, trailScale), Math.max(0.1, trailScale));
            trail.material.opacity = Math.max(0, 0.6 - progress * 0.8);
        }
        // Update shockwave ring
        if (this.ring) {
            // Scale from 0.8 to 6.0 units
            const ringScale = 0.8 + progress * 5.2; // 0.8 → 6.0
            this.ring.scale.set(ringScale, ringScale, ringScale);
            // Fade out
            this.ring.material.opacity = 1 - progress;
        }
        // Deactivate when complete
        if (progress >= 1) {
            this.deactivate();
        }
    }
    /**
     * Deactivates the effect and removes all particles, trails, and ring from the scene.
     */
    deactivate() {
        this.active = false;
        this.clearParticles();
        this.clearTrails();
        this.clearRing();
    }
    /**
     * Removes all particles from the scene and disposes their resources.
     */
    clearParticles() {
        for (const particle of this.particles) {
            this.scene.remove(particle);
            particle.geometry.dispose();
            particle.material.dispose();
        }
        this.particles = [];
        this.velocities = [];
        this.previousPositions = [];
    }
    /**
     * Removes all trail meshes from the scene and disposes their resources.
     */
    clearTrails() {
        for (const trail of this.trails) {
            this.scene.remove(trail);
            trail.geometry.dispose();
            trail.material.dispose();
        }
        this.trails = [];
    }
    /**
     * Removes the shockwave ring from the scene and disposes its resources.
     */
    clearRing() {
        if (this.ring) {
            this.scene.remove(this.ring);
            this.ring.geometry.dispose();
            this.ring.material.dispose();
            this.ring = null;
        }
    }
    /**
     * Disposes all resources used by this effect.
     * Called by the EffectManager when the effect is removed.
     */
    dispose() {
        this.clearParticles();
        this.clearTrails();
        this.clearRing();
    }
}
/**
 * BossExplosionEffect — massive explosion for boss defeats.
 * Features 80-100 particles with varied colors, trails, gravity,
 * multiple shockwave rings, and screen shake.
 */
export class BossExplosionEffect {
    constructor(scene) {
        /** Array of particle meshes */
        Object.defineProperty(this, "particles", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Array of particle velocities (parallel to particles array) */
        Object.defineProperty(this, "velocities", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Array of trail meshes (parallel to particles array) */
        Object.defineProperty(this, "trails", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Array of previous positions for trail lag (parallel to particles array) */
        Object.defineProperty(this, "previousPositions", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Array of shockwave ring meshes */
        Object.defineProperty(this, "rings", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Whether this effect is currently active */
        Object.defineProperty(this, "active", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Time elapsed since spawn in seconds */
        Object.defineProperty(this, "elapsed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Total duration of the effect in seconds */
        Object.defineProperty(this, "duration", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Whether screen shake should be triggered (read by Game.ts) */
        Object.defineProperty(this, "screenShakeTriggered", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        /** Screen shake magnitude */
        Object.defineProperty(this, "shakeMagnitude", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0.5
        });
        /** The THREE.js scene this effect belongs to */
        Object.defineProperty(this, "scene", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Ring spawn timings (seconds) */
        Object.defineProperty(this, "ringTimings", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: [0, 0.15, 0.3]
        });
        /** Whether each ring has been spawned */
        Object.defineProperty(this, "ringSpawned", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: [false, false, false]
        });
        this.scene = scene;
        this.active = false;
        this.elapsed = 0;
        this.duration = 2.0;
    }
    spawn(position) {
        this.elapsed = 0;
        this.active = true;
        this.screenShakeTriggered = false;
        this.ringSpawned = [false, false, false];
        this.clearParticles();
        this.clearTrails();
        this.clearRings();
        // Spawn 80-100 particles with varied colors
        const particleCount = 80 + Math.floor(Math.random() * 21); // 80-100
        const colors = [0xff8800, 0xffcc00, 0xff4400, 0xffffff, 0x00c8ff, 0x4488ff];
        for (let i = 0; i < particleCount; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = 0.1 + Math.random() * 0.2;
            const geometry = new THREE.BoxGeometry(size, size, size);
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 1.0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            const particle = new THREE.Mesh(geometry, material);
            particle.position.set(position.x, position.y, position.z);
            this.scene.add(particle);
            this.particles.push(particle);
            // Random outward velocity in all directions (faster than normal explosion)
            const angle = Math.random() * Math.PI * 2;
            const speed = 5 + Math.random() * 10; // 5-15 units per second
            const velocity = new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed, 0);
            this.velocities.push(velocity);
            // Store the initial position as the previous position for trail lag
            this.previousPositions.push(new THREE.Vector3(position.x, position.y, position.z));
            // Create trail mesh — smaller box, same color, lower opacity
            const trailSize = size * 0.7;
            const trailGeometry = new THREE.BoxGeometry(trailSize, trailSize, trailSize);
            const trailMaterial = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.6,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            const trail = new THREE.Mesh(trailGeometry, trailMaterial);
            trail.position.set(position.x, position.y, position.z);
            this.scene.add(trail);
            this.trails.push(trail);
        }
        // Spawn the first shockwave ring immediately
        this.spawnRing(position, 0);
    }
    update(delta) {
        if (!this.active)
            return;
        this.elapsed += delta;
        const progress = Math.min(this.elapsed / this.duration, 1);
        // Trigger screen shake at the start
        if (!this.screenShakeTriggered && this.elapsed >= 0.05) {
            this.screenShakeTriggered = true;
        }
        // Update particles
        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];
            const velocity = this.velocities[i];
            const trail = this.trails[i];
            const previousPos = this.previousPositions[i];
            // Store the current position as the previous position for the trail
            previousPos.copy(particle.position);
            // Apply gravity — particles slow down as they rise and start falling
            velocity.y -= GRAVITY * delta;
            // Move particle
            particle.position.x += velocity.x * delta;
            particle.position.y += velocity.y * delta;
            // Position the trail at the previous position (lag effect)
            trail.position.copy(previousPos);
            // Scale down and fade out the particle
            const scale = 1 - progress;
            particle.scale.set(scale, scale, scale);
            particle.material.opacity = 1 - progress;
            // Trail shrinks and fades faster than the main particle
            const trailScale = 1 - progress * 1.3; // Faster shrink
            trail.scale.set(Math.max(0.1, trailScale), Math.max(0.1, trailScale), Math.max(0.1, trailScale));
            trail.material.opacity = Math.max(0, 0.6 - progress * 0.8);
        }
        // Spawn additional rings at staggered timings
        for (let i = 1; i < this.ringTimings.length; i++) {
            if (!this.ringSpawned[i] && this.elapsed >= this.ringTimings[i]) {
                this.spawnRing({ x: this.particles[0]?.position.x ?? 0, y: this.particles[0]?.position.y ?? 0, z: 0 }, i);
            }
        }
        // Update all rings
        for (let i = 0; i < this.rings.length; i++) {
            const ring = this.rings[i];
            // Each ring expands at a different rate
            const ringProgress = Math.min((this.elapsed - this.ringTimings[i]) / 0.6, 1);
            if (ringProgress < 0)
                continue;
            const ringScale = 0.5 + ringProgress * 8; // Expand to 8.5 units
            ring.scale.set(ringScale, ringScale, ringScale);
            ring.material.opacity = 1 - ringProgress;
        }
        // Deactivate when complete
        if (progress >= 1) {
            this.deactivate();
        }
    }
    deactivate() {
        this.active = false;
        this.clearParticles();
        this.clearTrails();
        this.clearRings();
    }
    spawnRing(position, index) {
        const ringGeometry = new THREE.TorusGeometry(0.5, 0.08, 8, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: index === 0 ? 0xff6600 : index === 1 ? 0xffcc00 : 0x00c8ff,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(position.x, position.y, position.z);
        this.scene.add(ring);
        this.rings.push(ring);
        this.ringSpawned[index] = true;
    }
    clearParticles() {
        for (const particle of this.particles) {
            this.scene.remove(particle);
            particle.geometry.dispose();
            particle.material.dispose();
        }
        this.particles = [];
        this.velocities = [];
        this.previousPositions = [];
    }
    clearTrails() {
        for (const trail of this.trails) {
            this.scene.remove(trail);
            trail.geometry.dispose();
            trail.material.dispose();
        }
        this.trails = [];
    }
    clearRings() {
        for (const ring of this.rings) {
            this.scene.remove(ring);
            ring.geometry.dispose();
            ring.material.dispose();
        }
        this.rings = [];
    }
    dispose() {
        this.clearParticles();
        this.clearTrails();
        this.clearRings();
    }
}
/**
 * EffectManager — manages all active effects.
 * Maintains arrays of WarpEffects, HitEffects, and ExplosionEffects.
 */
export class EffectManager {
    /**
     * Creates a new EffectManager.
     *
     * @param scene - The THREE.js scene to add effects to
     */
    constructor(scene) {
        /** Array of active warp effects */
        Object.defineProperty(this, "warpEffects", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Array of active hit effects */
        Object.defineProperty(this, "hitEffects", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Array of active explosion effects */
        Object.defineProperty(this, "explosionEffects", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Array of active boss explosion effects */
        Object.defineProperty(this, "bossExplosionEffects", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Array of active elite warp effects */
        Object.defineProperty(this, "eliteWarpEffects", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Array of active elite explosion effects */
        Object.defineProperty(this, "eliteExplosionEffects", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** The THREE.js scene to add effects to */
        Object.defineProperty(this, "scene", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.scene = scene;
    }
    /**
     * Spawns a warp-in effect at the given position.
     * The target enemy mesh fades in during the warp.
     *
     * @param position - The spawn position (Vector3 or {x, y, z})
     * @param targetMesh - The enemy mesh to fade in
     * @returns {WarpEffect} The created warp effect
     */
    spawnWarp(position, targetMesh) {
        const effect = new WarpEffect(this.scene);
        effect.spawn(position, targetMesh);
        this.warpEffects.push(effect);
        return effect;
    }
    /**
     * Spawns a hit effect at the given position.
     *
     * @param position - The impact position (Vector3 or {x, y, z})
     * @returns {HitEffect} The created hit effect
     */
    spawnHit(position) {
        const effect = new HitEffect(this.scene);
        effect.spawn(position);
        this.hitEffects.push(effect);
        return effect;
    }
    /**
     * Spawns an explosion effect at the given position.
     *
     * @param position - The explosion position (Vector3 or {x, y, z})
     * @returns {ExplosionEffect} The created explosion effect
     */
    spawnExplosion(position) {
        const effect = new ExplosionEffect(this.scene);
        effect.spawn(position);
        this.explosionEffects.push(effect);
        return effect;
    }
    /**
     * Spawns a massive boss explosion effect at the given position.
     *
     * @param position - The explosion position (Vector3 or {x, y, z})
     * @returns {BossExplosionEffect} The created boss explosion effect
     */
    spawnBossExplosion(position) {
        const effect = new BossExplosionEffect(this.scene);
        effect.spawn(position);
        this.bossExplosionEffects.push(effect);
        return effect;
    }
    /**
     * Returns the array of active boss explosion effects.
     * Used by Game.ts to handle screen shake.
     *
     * @returns {BossExplosionEffect[]} Array of active boss explosion effects
     */
    getActiveBossExplosions() {
        return this.bossExplosionEffects;
    }
    /**
     * Spawns an elite warp-in effect at the given position.
     * The target enemy mesh fades in during the warp.
     *
     * @param position - The spawn position (Vector3 or {x, y, z})
     * @param targetMesh - The enemy mesh to fade in
     * @returns {EliteWarpEffect} The created elite warp effect
     */
    spawnEliteWarp(position, targetMesh) {
        const effect = new EliteWarpEffect(this.scene);
        effect.spawn(position, targetMesh);
        this.eliteWarpEffects.push(effect);
        return effect;
    }
    /**
     * Spawns an elite explosion effect at the given position.
     *
     * @param position - The explosion position (Vector3 or {x, y, z})
     * @returns {EliteExplosionEffect} The created elite explosion effect
     */
    spawnEliteExplosion(position) {
        const effect = new EliteExplosionEffect(this.scene);
        effect.spawn(position);
        this.eliteExplosionEffects.push(effect);
        return effect;
    }
    /**
     * Returns the array of active elite explosion effects.
     * Used by Game.ts to handle screen shake.
     *
     * @returns {EliteExplosionEffect[]} Array of active elite explosion effects
     */
    getActiveEliteExplosions() {
        return this.eliteExplosionEffects;
    }
    /**
     * Returns the array of active elite warp effects.
     * Used by Game.ts to handle screen shake.
     *
     * @returns {EliteWarpEffect[]} Array of active elite warp effects
     */
    getActiveEliteWarps() {
        return this.eliteWarpEffects;
    }
    /**
     * Updates all active effects and removes completed ones.
     *
     * @param delta - Time elapsed since last frame in seconds
     */
    update(delta) {
        // Update warp effects
        for (let i = this.warpEffects.length - 1; i >= 0; i--) {
            const effect = this.warpEffects[i];
            effect.update(delta);
            // Remove completed effects
            if (!effect.active) {
                effect.dispose();
                this.scene.remove(effect.mesh);
                this.warpEffects.splice(i, 1);
            }
        }
        // Update hit effects
        for (let i = this.hitEffects.length - 1; i >= 0; i--) {
            const effect = this.hitEffects[i];
            effect.update(delta);
            // Remove completed effects
            if (!effect.active) {
                effect.dispose();
                this.hitEffects.splice(i, 1);
            }
        }
        // Update explosion effects
        for (let i = this.explosionEffects.length - 1; i >= 0; i--) {
            const effect = this.explosionEffects[i];
            effect.update(delta);
            // Remove completed effects
            if (!effect.active) {
                effect.dispose();
                this.explosionEffects.splice(i, 1);
            }
        }
        // Update boss explosion effects
        for (let i = this.bossExplosionEffects.length - 1; i >= 0; i--) {
            const effect = this.bossExplosionEffects[i];
            effect.update(delta);
            // Remove completed effects
            if (!effect.active) {
                effect.dispose();
                this.bossExplosionEffects.splice(i, 1);
            }
        }
        // Update elite warp effects
        for (let i = this.eliteWarpEffects.length - 1; i >= 0; i--) {
            const effect = this.eliteWarpEffects[i];
            effect.update(delta);
            // Remove completed effects
            if (!effect.active) {
                effect.dispose();
                this.scene.remove(effect.mesh);
                this.eliteWarpEffects.splice(i, 1);
            }
        }
        // Update elite explosion effects
        for (let i = this.eliteExplosionEffects.length - 1; i >= 0; i--) {
            const effect = this.eliteExplosionEffects[i];
            effect.update(delta);
            // Remove completed effects
            if (!effect.active) {
                effect.dispose();
                this.eliteExplosionEffects.splice(i, 1);
            }
        }
    }
    /**
     * Clears all active effects.
     * Deactivates and disposes all effects, emptying all arrays.
     */
    clear() {
        // Clear warp effects
        for (const effect of this.warpEffects) {
            effect.deactivate();
            effect.dispose();
            this.scene.remove(effect.mesh);
        }
        this.warpEffects = [];
        // Clear hit effects
        for (const effect of this.hitEffects) {
            effect.deactivate();
            effect.dispose();
        }
        this.hitEffects = [];
        // Clear explosion effects
        for (const effect of this.explosionEffects) {
            effect.deactivate();
            effect.dispose();
        }
        this.explosionEffects = [];
        // Clear boss explosion effects
        for (const effect of this.bossExplosionEffects) {
            effect.deactivate();
            effect.dispose();
        }
        this.bossExplosionEffects = [];
        // Clear elite warp effects
        for (const effect of this.eliteWarpEffects) {
            effect.deactivate();
            effect.dispose();
            this.scene.remove(effect.mesh);
        }
        this.eliteWarpEffects = [];
        // Clear elite explosion effects
        for (const effect of this.eliteExplosionEffects) {
            effect.deactivate();
            effect.dispose();
        }
        this.eliteExplosionEffects = [];
    }
}
