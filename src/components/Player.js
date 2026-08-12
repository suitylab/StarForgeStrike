import * as THREE from 'three';
import { buildPhantom, buildTitan } from './Fighters';
import { createWingman } from './Wingman';
/**
 * Factory function that creates the VANGUARD fighter mesh.
 *
 * The VANGUARD is a sleek, angular cosmic fighter built from THREE.js primitives:
 *   - Angular main fuselage (elongated box) with a pointed nose cone
 *   - Swept wings extending outward and slightly downward
 *   - Twin engine nacelles at the rear with emissive cyan exhaust ports
 *   - Cyan cockpit canopy near the top
 *   - Engine glow effect that pulses at the rear
 *
 * The fighter faces upward: nose points toward +Y.
 *
 * @returns {THREE.Group} A configured VANGUARD fighter mesh group
 */
export function buildVanguard() {
    const group = new THREE.Group();
    // --- Materials ---
    // Dark steel-blue for the main body
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a3a4a,
        metalness: 0.75,
        roughness: 0.3,
    });
    // Darker gunmetal for wings
    const wingMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a2230,
        metalness: 0.8,
        roughness: 0.4,
    });
    // Dark accent material for panel lines and details
    const darkMaterial = new THREE.MeshStandardMaterial({
        color: 0x141a22,
        metalness: 0.85,
        roughness: 0.5,
    });
    // Cyan emissive for cockpit canopy
    const cockpitMaterial = new THREE.MeshStandardMaterial({
        color: 0x00c8ff,
        emissive: 0x00c8ff,
        emissiveIntensity: 0.8,
        metalness: 0.3,
        roughness: 0.2,
    });
    // Cyan emissive for engine exhaust ports
    const exhaustMaterial = new THREE.MeshStandardMaterial({
        color: 0x00c8ff,
        emissive: 0x00c8ff,
        emissiveIntensity: 1.0,
        metalness: 0.2,
        roughness: 0.1,
    });
    // Cyan accent material for wingtip lights and details
    const accentMaterial = new THREE.MeshStandardMaterial({
        color: 0x00c8ff,
        emissive: 0x00c8ff,
        emissiveIntensity: 0.6,
        metalness: 0.3,
        roughness: 0.2,
    });
    // --- Main Fuselage (layered: central spine + side panels) ---
    const fuselageGeometry = new THREE.BoxGeometry(0.55, 1.2, 0.55);
    const fuselage = new THREE.Mesh(fuselageGeometry, bodyMaterial);
    group.add(fuselage);
    // Central spine — raised ridge along the top
    const spineGeometry = new THREE.BoxGeometry(0.15, 1.25, 0.15);
    const spine = new THREE.Mesh(spineGeometry, darkMaterial);
    spine.position.set(0, 0, 0.22);
    group.add(spine);
    // Side armor panels — angled plates on the fuselage
    const panelGeometry = new THREE.BoxGeometry(0.08, 0.8, 0.4);
    const leftPanel = new THREE.Mesh(panelGeometry, darkMaterial);
    leftPanel.position.set(-0.3, 0, 0);
    leftPanel.rotation.z = 0.12;
    group.add(leftPanel);
    const rightPanel = new THREE.Mesh(panelGeometry, darkMaterial);
    rightPanel.position.set(0.3, 0, 0);
    rightPanel.rotation.z = -0.12;
    group.add(rightPanel);
    // --- Nose (layered: main cone + tip + accent) ---
    const noseGeometry = new THREE.ConeGeometry(0.28, 0.5, 4);
    const nose = new THREE.Mesh(noseGeometry, bodyMaterial);
    nose.position.set(0, 0.85, 0);
    nose.rotation.z = Math.PI / 4;
    group.add(nose);
    // Nose tip — small bright accent
    const noseTipGeometry = new THREE.ConeGeometry(0.08, 0.15, 4);
    const noseTip = new THREE.Mesh(noseTipGeometry, accentMaterial);
    noseTip.position.set(0, 1.1, 0);
    noseTip.rotation.z = Math.PI / 4;
    group.add(noseTip);
    // --- Swept Wings (layered: main wing + wingtip + accent edge) ---
    const wingGeometry = new THREE.BoxGeometry(0.85, 0.08, 0.3);
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(-0.65, -0.1, 0);
    leftWing.rotation.z = 0.3;
    group.add(leftWing);
    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightWing.position.set(0.65, -0.1, 0);
    rightWing.rotation.z = -0.3;
    group.add(rightWing);
    // Wing underside panels — darker layer beneath
    const underWingGeometry = new THREE.BoxGeometry(0.75, 0.04, 0.25);
    const leftUnderWing = new THREE.Mesh(underWingGeometry, darkMaterial);
    leftUnderWing.position.set(-0.62, -0.14, 0);
    leftUnderWing.rotation.z = 0.3;
    group.add(leftUnderWing);
    const rightUnderWing = new THREE.Mesh(underWingGeometry, darkMaterial);
    rightUnderWing.position.set(0.62, -0.14, 0);
    rightUnderWing.rotation.z = -0.3;
    group.add(rightUnderWing);
    // Wingtip accent lights — small emissive spheres
    const wingtipGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const leftWingtip = new THREE.Mesh(wingtipGeometry, accentMaterial);
    leftWingtip.position.set(-1.0, -0.15, 0);
    group.add(leftWingtip);
    const rightWingtip = new THREE.Mesh(wingtipGeometry, accentMaterial);
    rightWingtip.position.set(1.0, -0.15, 0);
    group.add(rightWingtip);
    // Wing accent strips — emissive lines along wing edges
    const accentStripGeometry = new THREE.BoxGeometry(0.04, 0.5, 0.04);
    const leftAccent = new THREE.Mesh(accentStripGeometry, accentMaterial);
    leftAccent.position.set(-0.85, -0.05, 0.12);
    leftAccent.rotation.z = 0.3;
    group.add(leftAccent);
    const rightAccent = new THREE.Mesh(accentStripGeometry, accentMaterial);
    rightAccent.position.set(0.85, -0.05, 0.12);
    rightAccent.rotation.z = -0.3;
    group.add(rightAccent);
    // --- Twin Engine Nacelles (layered: nacelle + exhaust + glow) ---
    const nacelleGeometry = new THREE.CylinderGeometry(0.15, 0.17, 0.55, 8);
    const leftNacelle = new THREE.Mesh(nacelleGeometry, bodyMaterial);
    leftNacelle.position.set(-0.2, -0.75, 0);
    leftNacelle.rotation.x = Math.PI / 2;
    group.add(leftNacelle);
    const rightNacelle = new THREE.Mesh(nacelleGeometry, bodyMaterial);
    rightNacelle.position.set(0.2, -0.75, 0);
    rightNacelle.rotation.x = Math.PI / 2;
    group.add(rightNacelle);
    // Nacelle intake rings — darker rings at the front
    const intakeGeometry = new THREE.TorusGeometry(0.15, 0.03, 6, 12);
    const leftIntake = new THREE.Mesh(intakeGeometry, darkMaterial);
    leftIntake.position.set(-0.2, -0.48, 0);
    leftIntake.rotation.x = Math.PI / 2;
    group.add(leftIntake);
    const rightIntake = new THREE.Mesh(intakeGeometry, darkMaterial);
    rightIntake.position.set(0.2, -0.48, 0);
    rightIntake.rotation.x = Math.PI / 2;
    group.add(rightIntake);
    // Exhaust ports — emissive cyan discs
    const exhaustGeometry = new THREE.CircleGeometry(0.12, 8);
    const leftExhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
    leftExhaust.position.set(-0.2, -1.02, 0);
    leftExhaust.rotation.x = Math.PI / 2;
    group.add(leftExhaust);
    const rightExhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
    rightExhaust.position.set(0.2, -1.02, 0);
    rightExhaust.rotation.x = Math.PI / 2;
    group.add(rightExhaust);
    // --- Cockpit Canopy (layered: base + glass + frame) ---
    const canopyBaseGeometry = new THREE.ConeGeometry(0.16, 0.28, 8);
    const canopyBase = new THREE.Mesh(canopyBaseGeometry, cockpitMaterial);
    canopyBase.position.set(0, 0.55, 0.1);
    group.add(canopyBase);
    // Canopy frame — darker ring around the base
    const canopyFrameGeometry = new THREE.TorusGeometry(0.14, 0.02, 6, 12);
    const canopyFrame = new THREE.Mesh(canopyFrameGeometry, darkMaterial);
    canopyFrame.position.set(0, 0.42, 0.1);
    canopyFrame.rotation.x = Math.PI / 2;
    group.add(canopyFrame);
    // --- Engine Glow Effect (layered: outer glow + inner bright core) ---
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x00c8ff,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    const glowGeometry = new THREE.ConeGeometry(0.1, 0.3, 8);
    const leftGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    leftGlow.position.set(-0.2, -1.15, 0);
    leftGlow.rotation.x = -Math.PI / 2;
    group.add(leftGlow);
    const rightGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    rightGlow.position.set(0.2, -1.15, 0);
    rightGlow.rotation.x = -Math.PI / 2;
    group.add(rightGlow);
    // Inner bright cores
    const innerGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xe0f7ff,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    const innerGlowGeometry = new THREE.ConeGeometry(0.05, 0.2, 8);
    const leftInnerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
    leftInnerGlow.position.set(-0.2, -1.25, 0);
    leftInnerGlow.rotation.x = -Math.PI / 2;
    group.add(leftInnerGlow);
    const rightInnerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
    rightInnerGlow.position.set(0.2, -1.25, 0);
    rightInnerGlow.rotation.x = -Math.PI / 2;
    group.add(rightInnerGlow);
    // Store glow meshes for pulse animation via userData
    group.userData = {
        leftGlow,
        rightGlow,
    };
    return group;
}
/**
 * Player class that wraps the VANGUARD fighter mesh and manages
 * movement, firing state, and engine glow animation.
 */
export class Player {
    /**
   * Creates a new player and adds its mesh to the scene.
   * The player starts at the bottom center of the play field.
   *
   * @param scene - The THREE.js scene to add the player mesh to
   * @param planeType - The type of fighter to build (defaults to 'vanguard')
   */
    constructor(scene, planeType = 'vanguard') {
        /** The THREE.js group representing the player */
        Object.defineProperty(this, "mesh", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Movement speed in units per second */
        Object.defineProperty(this, "speed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Whether the player is currently active */
        Object.defineProperty(this, "active", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Time remaining before the next shot can be fired (seconds) */
        Object.defineProperty(this, "fireCooldown", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Time between shots in seconds */
        Object.defineProperty(this, "fireRate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Movement bounds — lower 60% of the -6..10 play field */
        Object.defineProperty(this, "bounds", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {
                minX: -8,
                maxX: 8,
                minY: -6,
                maxY: 2.4,
            }
        });
        /** Total elapsed time for engine glow pulse animation */
        Object.defineProperty(this, "elapsedTime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** Current power level (1-5) */
        Object.defineProperty(this, "powerLevel", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 1
        });
        /** Array of active wingmen */
        Object.defineProperty(this, "wingmen", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Counter for generating unique wingman IDs */
        Object.defineProperty(this, "wingmanIdCounter", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** Previous position for velocity calculation */
        Object.defineProperty(this, "previousPosition", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new THREE.Vector3(0, -4, 0)
        });
        /** Wingmen currently being despawned (for animation) */
        Object.defineProperty(this, "despawnAnimations", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        // Select the fighter builder based on the plane type
        switch (planeType) {
            case 'phantom':
                this.mesh = buildPhantom();
                break;
            case 'titan':
                this.mesh = buildTitan();
                break;
            case 'vanguard':
            default:
                this.mesh = buildVanguard();
                break;
        }
        this.speed = 8;
        this.active = true;
        this.fireCooldown = 0;
        this.fireRate = 0.18;
        // Position at bottom center
        this.mesh.position.set(0, -4, 0);
        scene.add(this.mesh);
    }
    /**
     * Updates the player based on WASD key input.
     * Moves the player, clamps to bounds, decrements the fire cooldown,
     * and animates the engine glow pulse.
     *
     * @param delta - Time elapsed since last frame in seconds
     * @param keys - Record of key states (true = pressed)
     */
    update(delta, keys) {
        if (!this.active)
            return;
        // Track elapsed time for pulse animation
        this.elapsedTime += delta;
        // Process despawn animations
        this.updateDespawnAnimations(delta);
        // Calculate movement direction from WASD keys
        let moveX = 0;
        let moveY = 0;
        if (keys['KeyW'] || keys['ArrowUp'])
            moveY += 1;
        if (keys['KeyS'] || keys['ArrowDown'])
            moveY -= 1;
        if (keys['KeyA'] || keys['ArrowLeft'])
            moveX -= 1;
        if (keys['KeyD'] || keys['ArrowRight'])
            moveX += 1;
        // Apply movement
        this.mesh.position.x += moveX * this.speed * delta;
        this.mesh.position.y += moveY * this.speed * delta;
        // Clamp to bounds
        this.mesh.position.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.mesh.position.x));
        this.mesh.position.y = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, this.mesh.position.y));
        // Decrement fire cooldown
        if (this.fireCooldown > 0) {
            this.fireCooldown = Math.max(0, this.fireCooldown - delta);
        }
        // Animate engine glow pulse
        this.animateEngineGlow();
    }
    /**
   * Animates the engine glow meshes with a sine wave pulse.
   * The glow cones scale and fade in a rhythmic pattern.
   * Handles both twin-glow fighters (vanguard, titan) and
   * single-glow fighters (phantom).
   */
    animateEngineGlow() {
        const glowData = this.mesh.userData;
        if (!glowData)
            return;
        // Sine wave pulse: scale between 0.7 and 1.3, opacity between 0.4 and 1.0
        const pulse = Math.sin(this.elapsedTime * 6);
        const scale = 1 + pulse * 0.3;
        const opacity = 0.7 + pulse * 0.3;
        // Twin glow pattern (vanguard, titan)
        if (glowData.leftGlow && glowData.rightGlow) {
            glowData.leftGlow.scale.set(scale, scale, scale);
            glowData.rightGlow.scale.set(scale, scale, scale);
            const leftMaterial = glowData.leftGlow.material;
            const rightMaterial = glowData.rightGlow.material;
            leftMaterial.opacity = opacity;
            rightMaterial.opacity = opacity;
        }
        // Single glow pattern (phantom)
        if (glowData.singleGlow) {
            glowData.singleGlow.scale.set(scale, scale, scale);
            const singleMaterial = glowData.singleGlow.material;
            singleMaterial.opacity = opacity;
        }
    }
    /**
   * Returns the current power level.
   *
   * @returns {number} The current power level (1-5)
   */
    getPowerLevel() {
        return this.powerLevel;
    }
    /**
     * Sets the power level, clamped between 1 and MAX_POWER_LEVEL.
     *
     * @param level - The new power level
     */
    setPowerLevel(level) {
        this.powerLevel = Math.max(1, Math.min(Player.MAX_POWER_LEVEL, level));
    }
    /**
     * Checks if the player can fire a shot.
     *
     * @returns {boolean} True if the fire cooldown has elapsed
     */
    canFire() {
        return this.fireCooldown <= 0;
    }
    /**
     * Resets the fire cooldown to the fire rate.
     * Called after firing a shot.
     */
    resetFireCooldown() {
        this.fireCooldown = this.fireRate;
    }
    /**
     * Returns the Axis-Aligned Bounding Box (AABB) of the player
     * for collision detection.
     *
     * The bounds match the fighter size: approximately 1.2 wide, 1.6 tall.
     *
     * @returns {THREE.Box3} The player's bounding box in world space
     */
    getBounds() {
        // Half-extents of the fighter (1.2 wide, 1.6 tall, 0.6 deep)
        const halfWidth = 0.6;
        const halfHeight = 0.8;
        const halfDepth = 0.3;
        const pos = this.mesh.position;
        return new THREE.Box3(new THREE.Vector3(pos.x - halfWidth, pos.y - halfHeight, pos.z - halfDepth), new THREE.Vector3(pos.x + halfWidth, pos.y + halfHeight, pos.z + halfDepth));
    }
    /**
     * Returns the array of active wingmen.
     *
     * @returns {Wingman[]} The wingmen array
     */
    getWingmen() {
        return this.wingmen;
    }
    /**
     * Returns the number of active wingmen.
     *
     * @returns {number} The wingman count
     */
    getWingmanCount() {
        return this.wingmen.length;
    }
    /**
     * Adds a new wingman of the given type to the player's squadron.
     * The wingman spawns behind the player. If the player already has
     * MAX_WINGMEN wingmen, the oldest one is despawned first.
     *
     * @param scene - The THREE.js scene to add the wingman to
     * @param type - The wingman type to create
     * @returns {Wingman} The newly created wingman
     */
    addWingman(scene, type) {
        // Enforce max-5 rule: remove oldest if at capacity
        if (this.wingmen.length >= Player.MAX_WINGMEN) {
            this.removeOldestWingman();
        }
        // Create the new wingman
        const wingman = createWingman(scene, this.wingmanIdCounter++, type);
        wingman.formationIndex = this.wingmen.length;
        // Spawn behind the player
        const playerPos = this.mesh.position;
        wingman.spawn({
            x: playerPos.x,
            y: playerPos.y - 2.5,
            z: playerPos.z,
        });
        // Add to the wingmen array
        this.wingmen.push(wingman);
        return wingman;
    }
    /**
     * Removes and deactivates the wingman at the given index.
     *
     * @param index - The index of the wingman to remove
     */
    removeWingman(index) {
        if (index < 0 || index >= this.wingmen.length)
            return;
        const wingman = this.wingmen[index];
        this.despawnWingman(wingman);
        this.wingmen.splice(index, 1);
        // Re-index formation positions
        this.reindexWingmen();
    }
    /**
     * Removes and deactivates the oldest wingman (first in the array).
     */
    removeOldestWingman() {
        if (this.wingmen.length === 0)
            return;
        this.removeWingman(0);
    }
    /**
     * Deactivates and clears all wingmen.
     */
    clearWingmen() {
        for (const wingman of this.wingmen) {
            wingman.deactivate();
        }
        this.wingmen.length = 0;
        this.despawnAnimations.length = 0;
    }
    /**
     * Updates all wingmen formation positions and triggers attacks.
     * Calculates player velocity from position delta for smooth trailing.
     *
     * @param delta - Time elapsed since last frame in seconds
     * @param bulletPool - The bullet pool for wingman attacks
     * @param enemies - Array of active enemies for targeting
     */
    updateWingmen(delta, bulletPool, enemies) {
        // Calculate player velocity from position delta
        const playerPos = this.mesh.position;
        const velocity = new THREE.Vector3((playerPos.x - this.previousPosition.x) / Math.max(delta, 0.001), (playerPos.y - this.previousPosition.y) / Math.max(delta, 0.001), 0);
        // Update previous position
        this.previousPosition.copy(playerPos);
        // Update each wingman
        const wingmanCount = this.wingmen.length;
        for (const wingman of this.wingmen) {
            if (!wingman.active)
                continue;
            // Update formation position
            wingman.update(delta, playerPos, velocity, wingmanCount);
            // Trigger attack when cooldown is ready
            if (wingman.attackCooldown <= 0) {
                wingman.attack(bulletPool, enemies);
            }
        }
    }
    /**
     * Animates a wingman scaling down and fading out before deactivating.
     * The wingman is added to a despawn animation list that is processed
     * in the update loop.
     *
     * @param wingman - The wingman to despawn
     */
    despawnWingman(wingman) {
        // Add to despawn animations for smooth scale-down and fade-out
        this.despawnAnimations.push({
            wingman,
            elapsed: 0,
            duration: 0.3,
        });
    }
    /**
     * Processes despawn animations — scales down and fades out wingmen
     * being removed. Deactivates them when the animation completes.
     *
     * @param delta - Time elapsed since last frame in seconds
     */
    updateDespawnAnimations(delta) {
        for (let i = this.despawnAnimations.length - 1; i >= 0; i--) {
            const anim = this.despawnAnimations[i];
            anim.elapsed += delta;
            const progress = Math.min(anim.elapsed / anim.duration, 1);
            const scale = 1 - progress;
            const opacity = 1 - progress;
            // Scale down the wingman
            anim.wingman.mesh.scale.set(scale, scale, scale);
            // Fade out materials
            anim.wingman.mesh.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    const material = child.material;
                    if (material && 'transparent' in material) {
                        material.transparent = true;
                        material.opacity = opacity;
                    }
                }
            });
            // Deactivate when animation completes
            if (progress >= 1) {
                anim.wingman.deactivate();
                // Reset scale for potential reuse
                anim.wingman.mesh.scale.set(1, 1, 1);
                this.despawnAnimations.splice(i, 1);
            }
        }
    }
    /**
     * Re-indexes wingman formation positions after a removal.
     * Ensures formation indices are sequential (0, 1, 2, ...).
     */
    reindexWingmen() {
        this.wingmen.forEach((wingman, index) => {
            wingman.formationIndex = index;
        });
    }
    /**
   * Resets the player to its initial state.
   * Used when restarting a level.
   * Handles both twin-glow fighters (vanguard, titan) and
   * single-glow fighters (phantom).
   */
    reset() {
        // Reset wingmen
        this.clearWingmen();
        this.previousPosition.set(0, -4, 0);
        this.mesh.position.set(0, -4, 0);
        this.fireCooldown = 0;
        this.active = true;
        this.elapsedTime = 0;
        this.powerLevel = 1;
        // Reset engine glow to default state
        const glowData = this.mesh.userData;
        if (!glowData)
            return;
        // Twin glow pattern (vanguard, titan)
        if (glowData.leftGlow && glowData.rightGlow) {
            glowData.leftGlow.scale.set(1, 1, 1);
            glowData.rightGlow.scale.set(1, 1, 1);
            const leftMaterial = glowData.leftGlow.material;
            const rightMaterial = glowData.rightGlow.material;
            leftMaterial.opacity = 0.7;
            rightMaterial.opacity = 0.7;
        }
        // Single glow pattern (phantom)
        if (glowData.singleGlow) {
            glowData.singleGlow.scale.set(1, 1, 1);
            const singleMaterial = glowData.singleGlow.material;
            singleMaterial.opacity = 0.7;
        }
    }
}
/** Maximum power level a player can reach */
Object.defineProperty(Player, "MAX_POWER_LEVEL", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: 5
});
/** Maximum number of wingmen a player can have */
Object.defineProperty(Player, "MAX_WINGMEN", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: 5
});
