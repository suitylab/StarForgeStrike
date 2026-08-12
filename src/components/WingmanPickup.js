import * as THREE from 'three';
/**
 * Factory function that creates the wingman pickup visual mesh.
 *
 * The pickup is composed of four layered meshes:
 *   1. Main body — angular silver octahedron drone module
 *   2. Blue core — emissive sphere at the center
 *   3. Accent panels — small lighter silver boxes on the body surface
 *   4. Outer glow — transparent blue sphere with additive blending that pulses
 *
 * The drone module rotates slowly and the glow pulses with a sine wave for a
 * polished, visually distinct appearance — clearly different from the cyan
 * hexagonal POWER crystal.
 *
 * @returns {THREE.Group} A configured wingman pickup mesh group
 */
export function createWingmanPickupMesh() {
    const group = new THREE.Group();
    // --- Main Body ---
    // Angular silver octahedron drone module
    const bodyGeometry = new THREE.OctahedronGeometry(0.35, 0);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x8a9aaa,
        metalness: 0.8,
        roughness: 0.3,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.scale.set(1, 1.2, 0.8); // Slightly elongated for a drone-like silhouette
    group.add(body);
    // --- Blue Core ---
    // Emissive sphere at the center of the drone
    const coreGeometry = new THREE.SphereGeometry(0.12, 8, 8);
    const coreMaterial = new THREE.MeshStandardMaterial({
        color: 0x00aaff,
        emissive: 0x00aaff,
        emissiveIntensity: 1.0,
        metalness: 0.3,
        roughness: 0.2,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.set(0, 0, 0.15); // Slightly in front of the body center
    group.add(core);
    // --- Accent Panels ---
    // Small lighter silver boxes on the body surface for detail
    const panelMaterial = new THREE.MeshStandardMaterial({
        color: 0xb0c0d0,
        metalness: 0.9,
        roughness: 0.2,
    });
    // Top panel
    const topPanelGeometry = new THREE.BoxGeometry(0.2, 0.05, 0.2);
    const topPanel = new THREE.Mesh(topPanelGeometry, panelMaterial);
    topPanel.position.set(0, 0.3, 0);
    group.add(topPanel);
    // Left panel
    const sidePanelGeometry = new THREE.BoxGeometry(0.05, 0.15, 0.2);
    const leftPanel = new THREE.Mesh(sidePanelGeometry, panelMaterial);
    leftPanel.position.set(-0.25, 0, 0);
    leftPanel.rotation.z = 0.3;
    group.add(leftPanel);
    // Right panel
    const rightPanel = new THREE.Mesh(sidePanelGeometry, panelMaterial);
    rightPanel.position.set(0.25, 0, 0);
    rightPanel.rotation.z = -0.3;
    group.add(rightPanel);
    // --- Outer Glow ---
    // Transparent blue sphere with additive blending for a soft halo effect
    const glowGeometry = new THREE.SphereGeometry(0.6, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(0, 0, 0);
    group.add(glow);
    // Store the glow mesh reference for pulse animation via userData
    group.userData = {
        glow,
    };
    return group;
}
/**
 * WingmanPickup class that wraps the wingman pickup mesh group and manages
 * its lifecycle. The pickup drifts downward, bobs gently, rotates slowly,
 * and magnetizes toward the player when within range.
 *
 * The pickup follows the same pooling pattern as Bullet, Enemy, and PowerPickup:
 * meshes are created once and reused via spawn/deactivate cycles.
 */
export class WingmanPickup {
    /**
     * Creates a new wingman pickup and adds its mesh group to the scene.
     * The pickup starts inactive and hidden.
     *
     * @param scene - The THREE.js scene to add the pickup mesh to
     * @param id - Unique identifier for this pickup
     */
    constructor(scene, id) {
        /** Unique identifier for this pickup */
        Object.defineProperty(this, "id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** The THREE.js group representing this pickup */
        Object.defineProperty(this, "mesh", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Whether this pickup is currently active */
        Object.defineProperty(this, "active", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Current velocity vector (units per second) */
        Object.defineProperty(this, "velocity", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Downward drift speed in units per second */
        Object.defineProperty(this, "fallSpeed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Distance at which the pickup starts magnetizing toward the player */
        Object.defineProperty(this, "magnetRadius", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Distance at which the pickup is considered collected */
        Object.defineProperty(this, "collectRadius", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Acceleration strength of the magnet effect */
        Object.defineProperty(this, "magnetStrength", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Base Y position for bobbing animation reference */
        Object.defineProperty(this, "baseY", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Total elapsed time for animations */
        Object.defineProperty(this, "elapsedTime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Bobbing amplitude in units */
        Object.defineProperty(this, "bobAmplitude", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0.15
        });
        /** Bobbing frequency in radians per second */
        Object.defineProperty(this, "bobFrequency", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 3.0
        });
        /** Rotation speed in radians per second */
        Object.defineProperty(this, "rotationSpeed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 1.5
        });
        /** Glow pulse frequency in radians per second */
        Object.defineProperty(this, "glowPulseFrequency", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 2.5
        });
        this.id = id;
        this.mesh = createWingmanPickupMesh();
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.active = false;
        this.fallSpeed = 1.5;
        this.magnetRadius = 3.0;
        this.collectRadius = 1.2;
        this.magnetStrength = 8.0;
        this.baseY = 0;
        this.elapsedTime = 0;
        // Add to scene but keep hidden until spawned
        scene.add(this.mesh);
        this.mesh.visible = false;
    }
    /**
     * Activates the pickup at the given position.
     * The pickup begins drifting downward with a gentle bobbing motion.
     *
     * @param position - The spawn position (Vector3 or {x, y, z})
     */
    spawn(position) {
        this.mesh.position.set(position.x, position.y, position.z);
        this.baseY = position.y;
        this.velocity.set(0, -this.fallSpeed, 0);
        this.elapsedTime = 0;
        this.active = true;
        this.mesh.visible = true;
        // Reset glow to default state
        const glowData = this.mesh.userData;
        if (glowData.glow) {
            glowData.glow.scale.set(1, 1, 1);
            glowData.glow.material.opacity = 0.2;
        }
    }
    /**
     * Updates the pickup position and animations.
     * Handles falling, bobbing, rotation, glow pulsing, and magnet behavior.
     *
     * @param delta - Time elapsed since last frame in seconds
     * @param playerPosition - The player's current position (Vector3 or {x, y, z})
     */
    update(delta, playerPosition) {
        if (!this.active)
            return;
        // Track elapsed time for animations
        this.elapsedTime += delta;
        // --- Falling ---
        // Constant downward drift
        this.velocity.y = -this.fallSpeed;
        // --- Magnet Behavior ---
        // Calculate distance to player on the X-Y plane (ignore Z)
        const dx = playerPosition.x - this.mesh.position.x;
        const dy = playerPosition.y - this.mesh.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        // If within magnet radius, accelerate toward the player
        if (distance < this.magnetRadius && distance > 0.001) {
            // Normalize direction to player
            const dirX = dx / distance;
            const dirY = dy / distance;
            // Acceleration strength increases as the pickup gets closer
            // Closer = stronger pull (inverse of distance, clamped)
            const proximityFactor = 1.0 - distance / this.magnetRadius;
            const acceleration = this.magnetStrength * (0.5 + proximityFactor * 0.5);
            // Apply acceleration toward player
            this.velocity.x += dirX * acceleration * delta;
            this.velocity.y += dirY * acceleration * delta;
            // Clamp velocity to prevent excessive speed
            const maxSpeed = 12.0;
            const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
            if (speed > maxSpeed) {
                const scale = maxSpeed / speed;
                this.velocity.x *= scale;
                this.velocity.y *= scale;
            }
        }
        else {
            // No magnet — no horizontal movement
            this.velocity.x = 0;
        }
        // --- Apply Velocity ---
        this.mesh.position.x += this.velocity.x * delta;
        this.mesh.position.y += this.velocity.y * delta;
        // Update baseY to track the falling position (without bobbing)
        this.baseY = this.mesh.position.y;
        // --- Bobbing ---
        // Gentle sine wave oscillation on Y position relative to baseY
        const bobOffset = Math.sin(this.elapsedTime * this.bobFrequency) * this.bobAmplitude;
        this.mesh.position.y = this.baseY + bobOffset;
        // --- Rotation ---
        // Slow rotation around the Y-axis
        this.mesh.rotation.y += this.rotationSpeed * delta;
        // --- Glow Pulse ---
        // Scale and fade the outer glow with a sine wave
        const glowData = this.mesh.userData;
        if (glowData.glow) {
            const pulse = Math.sin(this.elapsedTime * this.glowPulseFrequency);
            const glowScale = 1 + pulse * 0.2;
            glowData.glow.scale.set(glowScale, glowScale, glowScale);
            const glowMaterial = glowData.glow.material;
            glowMaterial.opacity = 0.15 + (pulse + 1) * 0.15; // Range: 0.0 to 0.45
        }
    }
    /**
     * Deactivates the pickup and hides it.
     * The mesh remains in the scene for pooling reuse.
     */
    deactivate() {
        this.active = false;
        this.mesh.visible = false;
    }
    /**
     * Returns the Axis-Aligned Bounding Box (AABB) of this pickup
     * for collision detection.
     *
     * The bounds match the drone module size: approximately 0.7 wide, 0.84 tall.
     *
     * @returns {THREE.Box3} The pickup's bounding box in world space
     */
    getBounds() {
        // Half-extents of the drone module (0.7 wide, 0.84 tall, 0.56 deep)
        const halfWidth = 0.35;
        const halfHeight = 0.42;
        const halfDepth = 0.28;
        const pos = this.mesh.position;
        return new THREE.Box3(new THREE.Vector3(pos.x - halfWidth, pos.y - halfHeight, pos.z - halfDepth), new THREE.Vector3(pos.x + halfWidth, pos.y + halfHeight, pos.z + halfDepth));
    }
    /**
     * Checks if the pickup is within collection range of the player.
     *
     * @param playerPosition - The player's current position (Vector3 or {x, y, z})
     * @returns {boolean} True if the pickup is within collectRadius of the player
     */
    isCollected(playerPosition) {
        if (!this.active)
            return false;
        // Calculate distance on the X-Y plane (ignore Z)
        const dx = playerPosition.x - this.mesh.position.x;
        const dy = playerPosition.y - this.mesh.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= this.collectRadius;
    }
}
