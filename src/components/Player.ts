import * as THREE from 'three';
import { PlaneType } from './GameConfig';
import { buildPhantom, buildTitan } from './Fighters';
import { Wingman, WingmanType, WingmanFormation, createWingman } from './Wingman';
import { BulletPool } from './BulletPool';
import { Enemy } from './Enemy';

/**
 * Player entity interface for the StarForge Strike game.
 * Represents the player-controlled fighter in the 2D gameplay space (X-Y plane).
 */
export interface Player {
  /** The THREE.js group representing the player in the scene */
  mesh: THREE.Group;
  /** Current position in world space */
  position: THREE.Vector3;
  /** Movement speed in units per second */
  speed: number;
  /** Whether the player is currently active and updating */
  active: boolean;
  /** Time remaining before the next shot can be fired (seconds) */
  fireCooldown: number;
  /** Time between shots in seconds */
  fireRate: number;
}

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
export function buildVanguard(): THREE.Group {
  const group = new THREE.Group();

  // --- Materials ---
  // -- Signature cyan for the VANGUARD body
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x00a8dc,
    metalness: 0.75,
    roughness: 0.3,
  });

  // Deeper cyan for wings
  const wingMaterial = new THREE.MeshStandardMaterial({
    color: 0x0070b0,
    metalness: 0.8,
    roughness: 0.4,
  });

  // Dark cyan accent for panel lines and details
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: 0x00588a,
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
  const noseGeometry = new THREE.ConeGeometry(0.28, 0.5, 8);
  const nose = new THREE.Mesh(noseGeometry, bodyMaterial);
  nose.position.set(0, 0.85, 0);
  group.add(nose);

  // Nose tip — small bright accent
  const noseTipGeometry = new THREE.ConeGeometry(0.08, 0.15, 8);
  const noseTip = new THREE.Mesh(noseTipGeometry, accentMaterial);
  noseTip.position.set(0, 1.1, 0);
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
  /** The THREE.js group representing the player */
  public mesh: THREE.Group;
  /** Movement speed in units per second */
  public speed: number;
  /** Whether the player is currently active */
  public active: boolean;
  /** Time remaining before the next shot can be fired (seconds) */
  public fireCooldown: number;
  /** Time between shots in seconds */
  public fireRate: number;
  /** Movement bounds — the -6..10 play field with slightly relaxed vertical limits */
  public readonly bounds = {
    minX: -8,
    maxX: 8,
    minY: -6.5,
    maxY: 4,
  };

    /** Total elapsed time for engine glow pulse animation */
  private elapsedTime: number = 0;

  /** Maximum power level a player can reach */
  public static readonly MAX_POWER_LEVEL: number = 5;

  /** Maximum number of wingmen a player can have */
  public static readonly MAX_WINGMEN: number = 5;

  /** Maximum number of positions kept in the movement trail queue */
  private static readonly TRAIL_MAX_LENGTH: number = 100;

  /** Movement threshold below which the player is considered stationary (pixels/frame) */
  private static readonly TRAIL_MOVE_EPSILON: number = 0.02;

  /** The type of fighter the player controls (determines wingman follow formation) */
  private planeType: PlaneType;

  /** Fixed-length queue of the player's recent movement positions (newest at the end) */
  private trailPositions: THREE.Vector3[] = [];

  /** Current power level (1-5) */
  private powerLevel: number = 1;

  /** Array of active wingmen */
  private wingmen: Wingman[] = [];

  /** Counter for generating unique wingman IDs */
  private wingmanIdCounter: number = 0;

  /** Previous position for velocity calculation */
  private previousPosition: THREE.Vector3 = new THREE.Vector3(0, -4, 0);

  /** Wingmen currently being despawned (for animation) */
  private despawnAnimations: { wingman: Wingman; elapsed: number; duration: number }[] = [];

    /**
   * Creates a new player and adds its mesh to the scene.
   * The player starts at the bottom center of the play field.
   *
   * @param scene - The THREE.js scene to add the player mesh to
   * @param planeType - The type of fighter to build (defaults to 'vanguard')
   */
  constructor(scene: THREE.Scene, planeType: PlaneType = 'vanguard') {
    // Store the plane type — it determines the wingman follow formation
    this.planeType = planeType;

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

    // Scale each in-game fighter to a consistent size.
    // TITAN's raw geometry is the widest/largest, so it gets extra reduction.
    const inGameScale = planeType === 'titan' ? 0.4 : 0.75;
    this.mesh.scale.set(inGameScale, inGameScale, inGameScale);

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
  public update(delta: number, keys: Record<string, boolean>): void {
    if (!this.active) return;

    // Track elapsed time for pulse animation
    this.elapsedTime += delta;

    // Process despawn animations
    this.updateDespawnAnimations(delta);

    // Calculate movement direction from WASD keys
    let moveX = 0;
    let moveY = 0;

    if (keys['KeyW'] || keys['ArrowUp']) moveY += 1;
    if (keys['KeyS'] || keys['ArrowDown']) moveY -= 1;
    if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

    // Apply movement
    this.mesh.position.x += moveX * this.speed * delta;
    this.mesh.position.y += moveY * this.speed * delta;

    // Clamp to bounds
    this.mesh.position.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.mesh.position.x));
    this.mesh.position.y = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, this.mesh.position.y));

    // Tilt (roll) based on horizontal movement.
    // The craft's forward axis is +Y, so its roll axis is the Y axis.
    // Banking right with rightward motion (positive roll), left with leftward motion.
    const maxTilt = 0.35; // ~20 degrees
    const targetTilt = moveX * maxTilt;
    const tiltLerp = 1 - Math.exp(-10 * delta); // Frame-rate independent smooth easing
    this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetTilt, tiltLerp);

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
  private animateEngineGlow(): void {
    const glowData = this.mesh.userData as {
      leftGlow?: THREE.Mesh;
      rightGlow?: THREE.Mesh;
      singleGlow?: THREE.Mesh;
    };
    if (!glowData) return;

    // Sine wave pulse: scale between 0.7 and 1.3, opacity between 0.4 and 1.0
    const pulse = Math.sin(this.elapsedTime * 6);
    const scale = 1 + pulse * 0.3;
    const opacity = 0.7 + pulse * 0.3;

    // Twin glow pattern (vanguard, titan)
    if (glowData.leftGlow && glowData.rightGlow) {
      glowData.leftGlow.scale.set(scale, scale, scale);
      glowData.rightGlow.scale.set(scale, scale, scale);

      const leftMaterial = glowData.leftGlow.material as THREE.MeshBasicMaterial;
      const rightMaterial = glowData.rightGlow.material as THREE.MeshBasicMaterial;
      leftMaterial.opacity = opacity;
      rightMaterial.opacity = opacity;
    }

    // Single glow pattern (phantom)
    if (glowData.singleGlow) {
      glowData.singleGlow.scale.set(scale, scale, scale);

      const singleMaterial = glowData.singleGlow.material as THREE.MeshBasicMaterial;
      singleMaterial.opacity = opacity;
    }
  }

    /**
   * Returns the current power level.
   *
   * @returns {number} The current power level (1-5)
   */
  public getPowerLevel(): number {
    return this.powerLevel;
  }

  /**
   * Sets the power level, clamped between 1 and MAX_POWER_LEVEL.
   *
   * @param level - The new power level
   */
  public setPowerLevel(level: number): void {
    this.powerLevel = Math.max(1, Math.min(Player.MAX_POWER_LEVEL, level));
  }

  /**
   * Checks if the player can fire a shot.
   *
   * @returns {boolean} True if the fire cooldown has elapsed
   */
  public canFire(): boolean {
    return this.fireCooldown <= 0;
  }

  /**
   * Resets the fire cooldown to the fire rate.
   * Called after firing a shot.
   */
  public resetFireCooldown(): void {
    this.fireCooldown = this.fireRate;
  }

  /**
   * Returns the Axis-Aligned Bounding Box (AABB) of the player
   * for collision detection.
   *
   * The bounds match the in-game fighter size (0.75 scale):
   * approximately 0.9 wide, 1.2 tall.
   *
   * @returns {THREE.Box3} The player's bounding box in world space
   */
  public getBounds(): THREE.Box3 {
    // Half-extents of the in-game fighter (0.6 wide, 0.8 tall, 0.34 deep)
    const halfWidth = 0.3;
    const halfHeight = 0.4;
    const halfDepth = 0.17;

    const pos = this.mesh.position;
        return new THREE.Box3(
      new THREE.Vector3(pos.x - halfWidth, pos.y - halfHeight, pos.z - halfDepth),
      new THREE.Vector3(pos.x + halfWidth, pos.y + halfHeight, pos.z + halfDepth)
    );
  }

  /**
   * Returns the array of active wingmen.
   *
   * @returns {Wingman[]} The wingmen array
   */
  public getWingmen(): Wingman[] {
    return this.wingmen;
  }

  /**
   * Returns the number of active wingmen.
   *
   * @returns {number} The wingman count
   */
  public getWingmanCount(): number {
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
  public addWingman(scene: THREE.Scene, type: WingmanType): Wingman {
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
  public removeWingman(index: number): void {
    if (index < 0 || index >= this.wingmen.length) return;

    const wingman = this.wingmen[index];
    this.despawnWingman(wingman);
    this.wingmen.splice(index, 1);

    // Re-index formation positions
    this.reindexWingmen();
  }

  /**
   * Removes and deactivates the oldest wingman (first in the array).
   */
  public removeOldestWingman(): void {
    if (this.wingmen.length === 0) return;
    this.removeWingman(0);
  }

  /**
   * Removes and deactivates the most recently acquired wingman (last in the array).
   */
  public removeNewestWingman(): void {
    if (this.wingmen.length === 0) return;
    this.removeWingman(this.wingmen.length - 1);
  }

  /**
   * Deactivates and clears all wingmen.
   */
  public clearWingmen(): void {
    for (const wingman of this.wingmen) {
      wingman.deactivate();
    }
    this.wingmen.length = 0;
    this.despawnAnimations.length = 0;
  }

  /**
   * Removes all wingmen from the scene — including any that are currently
   * playing a despawn animation — and disposes their GPU resources.
   * Used when the game is disposed.
   */
  public disposeWingmen(): void {
    for (const wingman of this.wingmen) {
      wingman.dispose();
    }
    for (const anim of this.despawnAnimations) {
      anim.wingman.dispose();
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
  public updateWingmen(delta: number, bulletPool: BulletPool, enemies: Enemy[]): void {
    // Calculate player velocity from position delta
    const playerPos = this.mesh.position;
    const velocity = new THREE.Vector3(
      (playerPos.x - this.previousPosition.x) / Math.max(delta, 0.001),
      (playerPos.y - this.previousPosition.y) / Math.max(delta, 0.001),
      0
    );

    // Compute how far the player moved this frame (before overwriting previousPosition)
    const movedThisFrame =
      Math.abs(playerPos.x - this.previousPosition.x) + Math.abs(playerPos.y - this.previousPosition.y);

    // Update previous position
    this.previousPosition.copy(playerPos);

    // Update each wingman
    const wingmanCount = this.wingmen.length;

    // Record the player's movement trail.
    // Only push a new position when the player is actually moving — a
    // stationary player does not add positions to the trail queue.
    if (movedThisFrame > Player.TRAIL_MOVE_EPSILON) {
      this.trailPositions.push(playerPos.clone());
      if (this.trailPositions.length > Player.TRAIL_MAX_LENGTH) {
        this.trailPositions.shift();
      }
    }

    // Select the follow formation based on the player's plane type.
    // Each plane type can use a different wingman following algorithm.
    let formation = WingmanFormation.ArcBehind;
    if (this.planeType === 'vanguard') {
      formation = WingmanFormation.VanguardFront;
    } else if (this.planeType === 'titan') {
      formation = WingmanFormation.TrailFollow;
    }

    for (const wingman of this.wingmen) {
      if (!wingman.active) continue;

      // Update formation position
      wingman.update(delta, playerPos, velocity, wingmanCount, formation, this.trailPositions);

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
  private despawnWingman(wingman: Wingman): void {
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
  private updateDespawnAnimations(delta: number): void {
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
          const material = child.material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
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
  private reindexWingmen(): void {
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
    public reset(): void {
    // Reset movement trail queue
    this.trailPositions.length = 0;

    // Reset wingmen
    this.clearWingmen();
    this.previousPosition.set(0, -4, 0);

    this.mesh.position.set(0, -4, 0);
    this.fireCooldown = 0;
    this.active = true;
    this.elapsedTime = 0;
    this.powerLevel = 1;

    // Reset engine glow to default state
    const glowData = this.mesh.userData as {
      leftGlow?: THREE.Mesh;
      rightGlow?: THREE.Mesh;
      singleGlow?: THREE.Mesh;
    };
    if (!glowData) return;

    // Twin glow pattern (vanguard, titan)
    if (glowData.leftGlow && glowData.rightGlow) {
      glowData.leftGlow.scale.set(1, 1, 1);
      glowData.rightGlow.scale.set(1, 1, 1);
      const leftMaterial = glowData.leftGlow.material as THREE.MeshBasicMaterial;
      const rightMaterial = glowData.rightGlow.material as THREE.MeshBasicMaterial;
      leftMaterial.opacity = 0.7;
      rightMaterial.opacity = 0.7;
    }

    // Single glow pattern (phantom)
    if (glowData.singleGlow) {
      glowData.singleGlow.scale.set(1, 1, 1);
      const singleMaterial = glowData.singleGlow.material as THREE.MeshBasicMaterial;
      singleMaterial.opacity = 0.7;
    }
  }
}