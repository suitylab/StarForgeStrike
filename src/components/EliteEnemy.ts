import * as THREE from 'three';
import { Enemy } from './Enemy';
import { EnemyBulletPool } from './EnemyBulletPool';

/**
 * EliteEnemyType — the four elite enemy variants in StarForge Strike.
 * These are larger, tougher enemies with unique attack patterns.
 */
export type EliteEnemyType = 'reaper' | 'warden' | 'harbinger' | 'overlord';

/**
 * Metadata for an elite enemy type, used by the HUD and UI displays.
 */
export interface EliteEnemyTypeData {
  /** Display name of the elite enemy type */
  name: string;
  /** Primary color (hex) */
  color: string;
  /** Brief description of the enemy */
  description: string;
}

/**
 * Metadata for all four elite enemy types.
 */
export const ELITE_ENEMY_TYPE_DATA: Record<EliteEnemyType, EliteEnemyTypeData> = {
  reaper: {
    name: 'REAPER',
    color: '#2a2a2a',
    description: 'Large angular fighter. Fires spiral bullet patterns.',
  },
  warden: {
    name: 'WARDEN',
    color: '#4a5058',
    description: 'Heavy armored unit. Fires spreads and aimed lasers.',
  },
  harbinger: {
    name: 'HARBINGER',
    color: '#1a2a4a',
    description: 'Twin-hulled bomber. Launches homing missiles.',
  },
  overlord: {
    name: 'OVERLORD',
    color: '#3a4a6a',
    description: 'Command ship. Fires ring bursts and aimed streams.',
  },
};

/**
 * HomingMissile — a missile fired by the Harbinger that tracks the player.
 * Uses steering behavior to smoothly curve toward the player position.
 */
export class HomingMissile {
  /** The THREE.js group representing this missile */
  public mesh: THREE.Group;
  /** Whether this missile is currently active */
  public active: boolean;
  /** Current velocity vector (units per second) */
  public velocity: THREE.Vector3;
  /** Movement speed in units per second */
  public speed: number;
  /** Steering strength toward the player */
  public steeringStrength: number;
  /** Total elapsed time for animations */
  public elapsedTime: number;

  /** The THREE.js scene this missile belongs to */
  private scene: THREE.Scene;

  /**
   * Creates a new homing missile and adds its mesh to the scene.
   * The missile starts inactive and hidden.
   *
   * @param scene - The THREE.js scene to add the missile to
   */
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.active = false;
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.speed = 8;
    this.steeringStrength = 3.0;
    this.elapsedTime = 0;

    // Build the missile mesh
    this.mesh = this.buildMissileMesh();

    // Add to scene but keep hidden until spawned
    scene.add(this.mesh);
    this.mesh.visible = false;
  }

  /**
   * Builds the missile mesh — a small green cone with a trail.
   *
   * @returns {THREE.Group} The configured missile mesh group
   */
  private buildMissileMesh(): THREE.Group {
    const group = new THREE.Group();

    // --- Materials ---
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0.6,
      metalness: 0.3,
      roughness: 0.2,
    });

    const trailMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // --- Missile Body ---
    // Small cone pointing upward
    const bodyGeometry = new THREE.ConeGeometry(0.08, 0.25, 8);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(body);

    // --- Trail ---
    // Elongated cone extending downward
    const trailGeometry = new THREE.ConeGeometry(0.05, 0.4, 8);
    const trail = new THREE.Mesh(trailGeometry, trailMaterial);
    trail.position.set(0, -0.3, 0);
    trail.rotation.x = Math.PI; // Point downward
    group.add(trail);

    // Store trail reference for animation
    group.userData = {
      trail,
    };

    return group;
  }

  /**
   * Spawns the missile at the given position.
   * The missile initially flies toward the player.
   *
   * @param position - The spawn position
   * @param playerPosition - The player's current position
   */
  public spawn(
    position: THREE.Vector3 | { x: number; y: number; z: number },
    playerPosition: THREE.Vector3 | { x: number; y: number; z: number }
  ): void {
    this.mesh.position.set(position.x, position.y, position.z);
    this.active = true;
    this.mesh.visible = true;
    this.elapsedTime = 0;

    // Calculate initial direction toward player
    const dx = playerPosition.x - position.x;
    const dy = playerPosition.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0.001) {
      // Initial velocity: toward player at full speed
      this.velocity.set((dx / distance) * this.speed, (dy / distance) * this.speed, 0);
    } else {
      // Player is at same position — fly straight up
      this.velocity.set(0, this.speed, 0);
    }
  }

  /**
   * Updates the missile position and steering.
   * The missile curves toward the player each frame.
   *
   * @param delta - Time elapsed since last frame in seconds
   * @param playerPosition - The player's current position
   */
  public update(
    delta: number,
    playerPosition: THREE.Vector3 | { x: number; y: number; z: number }
  ): void {
    if (!this.active) return;

    this.elapsedTime += delta;

    // --- Steering ---
    // Calculate direction to player
    const dx = playerPosition.x - this.mesh.position.x;
    const dy = playerPosition.y - this.mesh.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0.001) {
      // Desired direction toward player
      const desiredX = dx / distance;
      const desiredY = dy / distance;

      // Current direction (normalized velocity)
      const currentSpeed = Math.sqrt(
        this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y
      );
      const currentX = currentSpeed > 0 ? this.velocity.x / currentSpeed : 0;
      const currentY = currentSpeed > 0 ? this.velocity.y / currentSpeed : 0;

      // Steer toward player
      const steerX = (desiredX - currentX) * this.steeringStrength * delta;
      const steerY = (desiredY - currentY) * this.steeringStrength * delta;

      // Apply steering to velocity
      this.velocity.x += steerX;
      this.velocity.y += steerY;

      // Clamp velocity to maintain speed
      const newSpeed = Math.sqrt(
        this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y
      );
      if (newSpeed > 0) {
        const scale = this.speed / newSpeed;
        this.velocity.x *= scale;
        this.velocity.y *= scale;
      }
    }

    // --- Apply Velocity ---
    this.mesh.position.x += this.velocity.x * delta;
    this.mesh.position.y += this.velocity.y * delta;

    // --- Rotation ---
    // Rotate missile to face movement direction
    const angle = Math.atan2(-this.velocity.x, this.velocity.y);
    this.mesh.rotation.z = angle;

    // --- Trail Pulse ---
    const trailData = this.mesh.userData as { trail?: THREE.Mesh };
    if (trailData.trail) {
      const pulse = Math.sin(this.elapsedTime * 10);
      const scale = 1 + pulse * 0.3;
      trailData.trail.scale.set(scale, scale, scale);
      (trailData.trail.material as THREE.MeshBasicMaterial).opacity = 0.3 + pulse * 0.2;
    }
  }

  /**
   * Deactivates the missile and hides it.
   */
  public deactivate(): void {
    this.active = false;
    this.mesh.visible = false;
  }

  /**
   * Returns the Axis-Aligned Bounding Box (AABB) of this missile
   * for collision detection.
   *
   * @returns {THREE.Box3} The missile's bounding box in world space
   */
  public getBounds(): THREE.Box3 {
    // Half-extents of the missile (0.16 wide, 0.5 tall, 0.16 deep)
    const halfWidth = 0.08;
    const halfHeight = 0.25;
    const halfDepth = 0.08;

    const pos = this.mesh.position;
    return new THREE.Box3(
      new THREE.Vector3(pos.x - halfWidth, pos.y - halfHeight, pos.z - halfDepth),
      new THREE.Vector3(pos.x + halfWidth, pos.y + halfHeight, pos.z + halfDepth)
    );
  }
}

/**
 * Reaper — large angular fighter with glowing red core.
 * Fires spiral pattern of 6 bullets rotating outward every 2.5s.
 * 8 HP. Slow sine drift movement.
 */
export class Reaper extends Enemy {
  /** Angle offset for the spiral pattern (increments each fire) */
  private spiralAngle: number = 0;

  /**
   * Creates a new Reaper enemy.
   *
   * @param scene - The THREE.js scene
   * @param id - Unique identifier
   */
  constructor(scene: THREE.Scene, id: number) {
    super(scene, id, 'drone'); // Base type 'drone' — mesh is replaced below

    // Replace the default mesh with the Reaper mesh
    this.scene.remove(this.mesh);
    this.mesh = createReaperMesh();
    this.scene.add(this.mesh);
    this.mesh.visible = false;

    // Configure Reaper stats
    this.maxHealth = 32;
    this.health = 32;
    this.fireRate = 2.5;
    this.movementPattern = 'sine';
    this.patternAmplitude = 1.0;
    this.patternFrequency = 0.3; // Slow sine drift
    this.patternPhase = Math.random() * Math.PI * 2;
  }

  /**
   * Fires 6 bullets in a spiral pattern that rotates outward.
   * Each fire, the spiral angle increments, causing the pattern to rotate.
   *
   * @param bulletPool - The enemy bullet pool to spawn bullets from
   * @param playerPosition - The player's current position (unused for reaper)
   */
  public fire(bulletPool: EnemyBulletPool, playerPosition: THREE.Vector3 | { x: number; y: number; z: number }): void {
    if (this.fireCooldown > 0) return;

        const pos = this.mesh.position;
    const speed = 6 * this.bulletSpeedMultiplier;
    const bulletCount = 6;

    // Fire 6 bullets in a circle with spiral offset
    for (let i = 0; i < bulletCount; i++) {
      const angle = (Math.PI * 2 * i) / bulletCount + this.spiralAngle;
      const bullet = bulletPool.get();
      if (bullet) {
        bullet.spawn({ x: pos.x, y: pos.y - 0.4, z: pos.z }, speed);
        bullet.velocity.set(Math.cos(angle) * speed, Math.sin(angle) * speed, 0);
      }
    }

    // Increment spiral angle for next fire (rotate the pattern)
    this.spiralAngle += Math.PI / 6; // 30 degrees per fire

    this.fireCooldown = this.fireRate;
  }

  /**
   * Returns the Axis-Aligned Bounding Box (AABB) of this enemy
   * for collision detection. Reaper has a large hitbox (~1.8 units).
   *
   * @returns {THREE.Box3} The enemy's bounding box in world space
   */
  public getBounds(): THREE.Box3 {
    const halfWidth = 0.9;
    const halfHeight = 0.9;
    const halfDepth = 0.5;

    const pos = this.mesh.position;
    return new THREE.Box3(
      new THREE.Vector3(pos.x - halfWidth, pos.y - halfHeight, pos.z - halfDepth),
      new THREE.Vector3(pos.x + halfWidth, pos.y + halfHeight, pos.z + halfDepth)
    );
  }
}

/**
 * Warden — heavy armored unit with shield plating.
 * Fires 5-bullet spread every 2.0s plus aimed laser every 5s.
 * 12 HP. Slow straight drift movement.
 */
export class Warden extends Enemy {
  /** Time remaining before the next aimed laser shot (seconds) */
  private laserCooldown: number = 5.0;

  /**
   * Creates a new Warden enemy.
   *
   * @param scene - The THREE.js scene
   * @param id - Unique identifier
   */
  constructor(scene: THREE.Scene, id: number) {
    super(scene, id, 'drone'); // Base type 'drone' — mesh is replaced below

    // Replace the default mesh with the Warden mesh
    this.scene.remove(this.mesh);
    this.mesh = createWardenMesh();
    this.scene.add(this.mesh);
    this.mesh.visible = false;

    // Configure Warden stats
    this.maxHealth = 48;
    this.health = 48;
    this.fireRate = 2.0;
    this.movementPattern = 'straight';
  }

  /**
   * Fires a 5-bullet spread every 2.0s and an aimed laser every 5s.
   * The spread covers -30° to +30° from straight down.
   * The laser is a fast aimed bullet with a laser-like visual.
   *
   * @param bulletPool - The enemy bullet pool to spawn bullets from
   * @param playerPosition - The player's current position (for aiming)
   */
  public fire(bulletPool: EnemyBulletPool, playerPosition: THREE.Vector3 | { x: number; y: number; z: number }): void {
    if (this.fireCooldown > 0) return;

        const pos = this.mesh.position;
    const speed = 7 * this.bulletSpeedMultiplier;
    const spreadAngle = Math.PI / 6; // 30 degrees

    // Fire 5-bullet spread: -30°, -15°, 0°, +15°, +30°
    for (let i = 0; i < 5; i++) {
      const angle = -spreadAngle + (i * spreadAngle) / 2;
      const bullet = bulletPool.get();
      if (bullet) {
        bullet.spawn({ x: pos.x, y: pos.y - 0.4, z: pos.z }, speed);
        bullet.velocity.set(Math.sin(angle) * speed, -Math.cos(angle) * speed, 0);
      }
    }

    this.fireCooldown = this.fireRate;

    // Check if laser should fire
    this.laserCooldown -= this.fireRate;
    if (this.laserCooldown <= 0) {
      this.fireLaser(bulletPool, playerPosition);
      this.laserCooldown = 5.0;
    }
  }

  /**
   * Fires an aimed laser at the player.
   * The laser is a fast bullet with a stretched visual.
   *
   * @param bulletPool - The enemy bullet pool to spawn bullets from
   * @param playerPosition - The player's current position (for aiming)
   */
  private fireLaser(bulletPool: EnemyBulletPool, playerPosition: THREE.Vector3 | { x: number; y: number; z: number }): void {
    const pos = this.mesh.position;
        const speed = 14 * this.bulletSpeedMultiplier; // Fast laser

    // Calculate direction to player
    const dx = playerPosition.x - pos.x;
    const dy = playerPosition.y - pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 0.001) return;

    // Normalized direction to player
    const dirX = dx / distance;
    const dirY = dy / distance;

    // Fire a fast aimed bullet
    const bullet = bulletPool.get();
    if (bullet) {
      bullet.spawn({ x: pos.x, y: pos.y - 0.4, z: pos.z }, speed);
      bullet.velocity.set(dirX * speed, dirY * speed, 0);

      // Scale the bullet to look like a laser (longer and thinner)
      bullet.mesh.scale.set(0.5, 2.0, 0.5);
    }
  }

  /**
   * Returns the Axis-Aligned Bounding Box (AABB) of this enemy
   * for collision detection. Warden has a large hitbox (~2.0 units).
   *
   * @returns {THREE.Box3} The enemy's bounding box in world space
   */
  public getBounds(): THREE.Box3 {
    const halfWidth = 1.0;
    const halfHeight = 1.0;
    const halfDepth = 0.5;

    const pos = this.mesh.position;
    return new THREE.Box3(
      new THREE.Vector3(pos.x - halfWidth, pos.y - halfHeight, pos.z - halfDepth),
      new THREE.Vector3(pos.x + halfWidth, pos.y + halfHeight, pos.z + halfDepth)
    );
  }
}

/**
 * Harbinger — twin-hulled bomber with missile pods.
 * Launches 3 homing missiles every 3.5s that track the player.
 * 10 HP. Slow sine drift movement.
 */
export class Harbinger extends Enemy {
  /** Array of homing missiles managed by this Harbinger */
  private missiles: HomingMissile[] = [];

  /**
   * Creates a new Harbinger enemy.
   *
   * @param scene - The THREE.js scene
   * @param id - Unique identifier
   */
  constructor(scene: THREE.Scene, id: number) {
    super(scene, id, 'drone'); // Base type 'drone' — mesh is replaced below

    // Replace the default mesh with the Harbinger mesh
    this.scene.remove(this.mesh);
    this.mesh = createHarbingerMesh();
    this.scene.add(this.mesh);
    this.mesh.visible = false;

    // Configure Harbinger stats
    this.maxHealth = 40;
    this.health = 40;
    this.fireRate = 3.5;
    this.movementPattern = 'sine';
    this.patternAmplitude = 1.2;
    this.patternFrequency = 0.25; // Slow sine drift
    this.patternPhase = Math.random() * Math.PI * 2;

    // Pre-allocate homing missiles for pooling
    for (let i = 0; i < 6; i++) {
      this.missiles.push(new HomingMissile(scene));
    }
  }

  /**
   * Launches 3 homing missiles that track the player.
   * Missiles are launched in a small fan pattern.
   *
   * @param bulletPool - The enemy bullet pool (unused for harbinger)
   * @param playerPosition - The player's current position (for missile targeting)
   */
  public fire(bulletPool: EnemyBulletPool, playerPosition: THREE.Vector3 | { x: number; y: number; z: number }): void {
    if (this.fireCooldown > 0) return;

    const pos = this.mesh.position;

    // Launch 3 missiles in a small fan pattern
    for (let i = 0; i < 3; i++) {
      // Find an inactive missile
      const missile = this.missiles.find((m) => !m.active);
      if (missile) {
        // Offset the launch position slightly for the fan pattern
        const offsetX = (i - 1) * 0.3;
        missile.spawn(
          { x: pos.x + offsetX, y: pos.y - 0.4, z: pos.z },
          playerPosition
        );
      }
    }

    this.fireCooldown = this.fireRate;
  }

  /**
   * Returns the active homing missiles for collision detection in Game.ts.
   *
   * @returns {HomingMissile[]} Array of active missiles
   */
  public getActiveMissiles(): HomingMissile[] {
    return this.missiles.filter((m) => m.active);
  }

  /**
   * Updates all active homing missiles with the player position.
   * Called from Game.ts each frame.
   *
   * @param delta - Time elapsed since last frame in seconds
   * @param playerPosition - The player's current position
   */
  public updateMissiles(delta: number, playerPosition: THREE.Vector3 | { x: number; y: number; z: number }): void {
    for (const missile of this.missiles) {
      if (!missile.active) continue;

      missile.update(delta, playerPosition);

      // Deactivate missiles that go off-screen
      const pos = missile.mesh.position;
      if (pos.y > 12 || pos.y < -12 || pos.x < -12 || pos.x > 12) {
        missile.deactivate();
      }
    }
  }

  /**
   * Deactivates the enemy and all its missiles.
   */
  public deactivate(): void {
    super.deactivate();

    // Deactivate all missiles
    for (const missile of this.missiles) {
      missile.deactivate();
    }
  }

  /**
   * Returns the Axis-Aligned Bounding Box (AABB) of this enemy
   * for collision detection. Harbinger has a large hitbox (~2.2 units).
   *
   * @returns {THREE.Box3} The enemy's bounding box in world space
   */
  public getBounds(): THREE.Box3 {
    const halfWidth = 1.1;
    const halfHeight = 1.1;
    const halfDepth = 0.5;

    const pos = this.mesh.position;
    return new THREE.Box3(
      new THREE.Vector3(pos.x - halfWidth, pos.y - halfHeight, pos.z - halfDepth),
      new THREE.Vector3(pos.x + halfWidth, pos.y + halfHeight, pos.z + halfDepth)
    );
  }
}

/**
 * Overlord — command ship with rotating turret ring.
 * Fires alternating ring bursts (8 bullets) and aimed streams (3 bullets) every 2.0s.
 * 15 HP. Very slow straight drift movement.
 */
export class Overlord extends Enemy {
  /** Attack phase counter — even = ring burst, odd = aimed stream */
  private attackPhase: number = 0;

  /**
   * Creates a new Overlord enemy.
   *
   * @param scene - The THREE.js scene
   * @param id - Unique identifier
   */
  constructor(scene: THREE.Scene, id: number) {
    super(scene, id, 'drone'); // Base type 'drone' — mesh is replaced below

    // Replace the default mesh with the Overlord mesh
    this.scene.remove(this.mesh);
    this.mesh = createOverlordMesh();
    this.scene.add(this.mesh);
    this.mesh.visible = false;

    // Configure Overlord stats
    this.maxHealth = 60;
    this.health = 60;
    this.fireRate = 2.0;
    this.movementPattern = 'straight';
  }

  /**
   * Fires alternating attacks:
   *   - Even phase: ring burst of 8 bullets in a circle
   *   - Odd phase: aimed stream of 3 bullets at the player
   *
   * @param bulletPool - The enemy bullet pool to spawn bullets from
   * @param playerPosition - The player's current position (for aimed stream)
   */
  public fire(bulletPool: EnemyBulletPool, playerPosition: THREE.Vector3 | { x: number; y: number; z: number }): void {
    if (this.fireCooldown > 0) return;

    const pos = this.mesh.position;

    if (this.attackPhase % 2 === 0) {
      // Ring burst: 8 bullets in a circle
      this.fireRingBurst(bulletPool, pos);
    } else {
      // Aimed stream: 3 bullets at the player
      this.fireAimedStream(bulletPool, pos, playerPosition);
    }

    // Increment attack phase
    this.attackPhase++;

    this.fireCooldown = this.fireRate;
  }

  /**
   * Fires 8 bullets in a circle around the enemy.
   *
   * @param bulletPool - The enemy bullet pool to spawn bullets from
   * @param pos - The enemy's position
   */
    private fireRingBurst(bulletPool: EnemyBulletPool, pos: THREE.Vector3): void {
    const speed = 6 * this.bulletSpeedMultiplier;
    const bulletCount = 8;

    for (let i = 0; i < bulletCount; i++) {
      const angle = (Math.PI * 2 * i) / bulletCount;
      const bullet = bulletPool.get();
      if (bullet) {
        bullet.spawn({ x: pos.x, y: pos.y - 0.4, z: pos.z }, speed);
        bullet.velocity.set(Math.cos(angle) * speed, Math.sin(angle) * speed, 0);
      }
    }
  }

  /**
   * Fires 3 bullets aimed at the player with slight spread.
   *
   * @param bulletPool - The enemy bullet pool to spawn bullets from
   * @param pos - The enemy's position
   * @param playerPosition - The player's current position
   */
    private fireAimedStream(
    bulletPool: EnemyBulletPool,
    pos: THREE.Vector3,
    playerPosition: THREE.Vector3 | { x: number; y: number; z: number }
  ): void {
    const speed = 8 * this.bulletSpeedMultiplier;

    // Calculate direction to player
    const dx = playerPosition.x - pos.x;
    const dy = playerPosition.y - pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 0.001) return;

    // Normalized direction to player
    const dirX = dx / distance;
    const dirY = dy / distance;

    // Fire 3 bullets with slight spread (±5°)
    const spreadAngle = Math.PI / 36; // 5 degrees

    for (let i = 0; i < 3; i++) {
      const angle = Math.atan2(dirX, dirY) + (i - 1) * spreadAngle;
      const bullet = bulletPool.get();
      if (bullet) {
        bullet.spawn({ x: pos.x, y: pos.y - 0.4, z: pos.z }, speed);
        bullet.velocity.set(Math.sin(angle) * speed, Math.cos(angle) * speed, 0);
      }
    }
  }

  /**
   * Updates the enemy, including rotating the turret ring.
   * Overrides the base update to add turret ring rotation.
   *
   * @param delta - Time elapsed since last frame in seconds
   */
  public update(delta: number): void {
    super.update(delta);

    // Rotate the turret ring continuously
    const userData = this.mesh.userData as { turretRing?: THREE.Group };
    if (userData.turretRing) {
      userData.turretRing.rotation.z += delta * 1.5; // 1.5 radians per second
    }
  }

  /**
   * Returns the Axis-Aligned Bounding Box (AABB) of this enemy
   * for collision detection. Overlord has a very large hitbox (~2.5 units).
   *
   * @returns {THREE.Box3} The enemy's bounding box in world space
   */
  public getBounds(): THREE.Box3 {
    const halfWidth = 1.25;
    const halfHeight = 1.25;
    const halfDepth = 0.6;

    const pos = this.mesh.position;
    return new THREE.Box3(
      new THREE.Vector3(pos.x - halfWidth, pos.y - halfHeight, pos.z - halfDepth),
      new THREE.Vector3(pos.x + halfWidth, pos.y + halfHeight, pos.z + halfDepth)
    );
  }
}

/**
 * Factory function that creates the REAPER enemy mesh.
 *
 * A large angular fighter with:
 *   - Dark gray/black angular body
 *   - Glowing red core in the center
 *   - Red accent strips on the wings
 *   - Twin red engine glows at the rear
 *
 * The reaper faces downward: nose points toward -Y.
 *
 * @returns {THREE.Group} A configured REAPER mesh group
 */
function createReaperMesh(): THREE.Group {
  const group = new THREE.Group();

  // --- Materials ---
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    metalness: 0.8,
    roughness: 0.3,
  });

  const darkMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    metalness: 0.85,
    roughness: 0.5,
  });

  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0xff2200,
    emissive: 0xff2200,
    emissiveIntensity: 0.8,
    metalness: 0.3,
    roughness: 0.2,
  });

  const coreMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 1.5,
    metalness: 0.2,
    roughness: 0.1,
  });

  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xff4400,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // --- Main Body (angular fuselage) ---
  // Central spine
  const spineGeometry = new THREE.BoxGeometry(0.5, 1.6, 0.5);
  const spine = new THREE.Mesh(spineGeometry, bodyMaterial);
  group.add(spine);

  // Upper armor plate
  const topPlateGeometry = new THREE.BoxGeometry(0.7, 0.15, 0.6);
  const topPlate = new THREE.Mesh(topPlateGeometry, darkMaterial);
  topPlate.position.set(0, 0.7, 0);
  group.add(topPlate);

  // Lower armor plate
  const bottomPlateGeometry = new THREE.BoxGeometry(0.6, 0.12, 0.5);
  const bottomPlate = new THREE.Mesh(bottomPlateGeometry, darkMaterial);
  bottomPlate.position.set(0, -0.7, 0);
  group.add(bottomPlate);

  // --- Glowing Red Core ---
  // Central sphere with strong red glow
  const coreGeometry = new THREE.SphereGeometry(0.25, 12, 12);
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  core.position.set(0, 0, 0.2);
  group.add(core);

  // Core glow ring
  const coreRingGeometry = new THREE.TorusGeometry(0.3, 0.04, 8, 16);
  const coreRing = new THREE.Mesh(coreRingGeometry, accentMaterial);
  coreRing.position.set(0, 0, 0.2);
  coreRing.rotation.x = Math.PI / 2;
  group.add(coreRing);

  // --- Wings (angular swept wings) ---
  // Left wing
  const leftWingGeometry = new THREE.BoxGeometry(0.8, 0.08, 0.4);
  const leftWing = new THREE.Mesh(leftWingGeometry, bodyMaterial);
  leftWing.position.set(-0.7, 0.2, 0);
  leftWing.rotation.z = 0.3;
  group.add(leftWing);

  // Right wing
  const rightWingGeometry = new THREE.BoxGeometry(0.8, 0.08, 0.4);
  const rightWing = new THREE.Mesh(rightWingGeometry, bodyMaterial);
  rightWing.position.set(0.7, 0.2, 0);
  rightWing.rotation.z = -0.3;
  group.add(rightWing);

  // Wing accent strips (red)
  const accentStripGeometry = new THREE.BoxGeometry(0.06, 0.6, 0.04);
  const leftAccent = new THREE.Mesh(accentStripGeometry, accentMaterial);
  leftAccent.position.set(-0.95, 0.2, 0.1);
  leftAccent.rotation.z = 0.3;
  group.add(leftAccent);

  const rightAccent = new THREE.Mesh(accentStripGeometry, accentMaterial);
  rightAccent.position.set(0.95, 0.2, 0.1);
  rightAccent.rotation.z = -0.3;
  group.add(rightAccent);

  // --- Nose ---
  const noseGeometry = new THREE.ConeGeometry(0.25, 0.5, 6);
  const nose = new THREE.Mesh(noseGeometry, bodyMaterial);
  nose.position.set(0, -1.0, 0);
  nose.rotation.x = Math.PI;
  group.add(nose);

  // Nose tip accent
  const noseTipGeometry = new THREE.ConeGeometry(0.08, 0.15, 6);
  const noseTip = new THREE.Mesh(noseTipGeometry, accentMaterial);
  noseTip.position.set(0, -1.3, 0);
  noseTip.rotation.x = Math.PI;
  group.add(noseTip);

  // --- Engine Glows ---
  // Twin engine glow cones at the rear
  const glowGeometry = new THREE.ConeGeometry(0.12, 0.35, 8);
  const leftGlow = new THREE.Mesh(glowGeometry, glowMaterial);
  leftGlow.position.set(-0.2, 0.9, 0);
  group.add(leftGlow);

  const rightGlow = new THREE.Mesh(glowGeometry, glowMaterial);
  rightGlow.position.set(0.2, 0.9, 0);
  group.add(rightGlow);

  // --- Cockpit ---
  const cockpitGeometry = new THREE.ConeGeometry(0.12, 0.25, 6);
  const cockpitMaterial = new THREE.MeshStandardMaterial({
    color: 0xff4400,
    emissive: 0xff4400,
    emissiveIntensity: 0.5,
    metalness: 0.3,
    roughness: 0.2,
  });
  const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
  cockpit.position.set(0, -0.3, 0.25);
  group.add(cockpit);

  return group;
}

/**
 * Factory function that creates the WARDEN enemy mesh.
 *
 * A heavy armored unit with:
 *   - Gunmetal gray body with layered armor plates
 *   - Orange accent strips
 *   - Shield plating on the sides
 *   - Central cannon barrel
 *
 * The warden faces downward: nose points toward -Y.
 *
 * @returns {THREE.Group} A configured WARDEN mesh group
 */
function createWardenMesh(): THREE.Group {
  const group = new THREE.Group();

  // --- Materials ---
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a5058,
    metalness: 0.8,
    roughness: 0.4,
  });

  const darkMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2e34,
    metalness: 0.85,
    roughness: 0.5,
  });

  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0xff6600,
    emissive: 0xff6600,
    emissiveIntensity: 0.7,
    metalness: 0.3,
    roughness: 0.2,
  });

  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xff8800,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // --- Main Body ---
  // Central block
  const bodyGeometry = new THREE.BoxGeometry(1.2, 1.4, 0.8);
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  group.add(body);

  // Upper armor plate
  const topPlateGeometry = new THREE.BoxGeometry(1.4, 0.2, 0.9);
  const topPlate = new THREE.Mesh(topPlateGeometry, darkMaterial);
  topPlate.position.set(0, 0.7, 0);
  group.add(topPlate);

  // Lower armor plate
  const bottomPlateGeometry = new THREE.BoxGeometry(1.3, 0.18, 0.8);
  const bottomPlate = new THREE.Mesh(bottomPlateGeometry, darkMaterial);
  bottomPlate.position.set(0, -0.7, 0);
  group.add(bottomPlate);

  // --- Shield Plating (side armor) ---
  // Left shield
  const leftShieldGeometry = new THREE.BoxGeometry(0.3, 1.0, 0.7);
  const leftShield = new THREE.Mesh(leftShieldGeometry, darkMaterial);
  leftShield.position.set(-0.75, 0, 0);
  leftShield.rotation.z = 0.15;
  group.add(leftShield);

  // Right shield
  const rightShieldGeometry = new THREE.BoxGeometry(0.3, 1.0, 0.7);
  const rightShield = new THREE.Mesh(rightShieldGeometry, darkMaterial);
  rightShield.position.set(0.75, 0, 0);
  rightShield.rotation.z = -0.15;
  group.add(rightShield);

  // Shield accent strips (orange)
  const accentStripGeometry = new THREE.BoxGeometry(0.05, 0.8, 0.04);
  const leftAccent = new THREE.Mesh(accentStripGeometry, accentMaterial);
  leftAccent.position.set(-0.85, 0, 0.15);
  leftAccent.rotation.z = 0.15;
  group.add(leftAccent);

  const rightAccent = new THREE.Mesh(accentStripGeometry, accentMaterial);
  rightAccent.position.set(0.85, 0, 0.15);
  rightAccent.rotation.z = -0.15;
  group.add(rightAccent);

  // --- Central Cannon ---
  // Main barrel pointing downward
  const barrelGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.8, 8);
  const barrel = new THREE.Mesh(barrelGeometry, darkMaterial);
  barrel.position.set(0, -0.8, 0);
  barrel.rotation.x = Math.PI / 2;
  group.add(barrel);

  // Barrel muzzle
  const muzzleGeometry = new THREE.CylinderGeometry(0.2, 0.22, 0.15, 8);
  const muzzle = new THREE.Mesh(muzzleGeometry, bodyMaterial);
  muzzle.position.set(0, -1.2, 0);
  muzzle.rotation.x = Math.PI / 2;
  group.add(muzzle);

  // Muzzle glow
  const muzzleGlowGeometry = new THREE.TorusGeometry(0.15, 0.03, 8, 16);
  const muzzleGlow = new THREE.Mesh(muzzleGlowGeometry, accentMaterial);
  muzzleGlow.position.set(0, -1.3, 0);
  muzzleGlow.rotation.x = Math.PI / 2;
  group.add(muzzleGlow);

  // --- Sensor Array ---
  // Small orange sensor on top
  const sensorGeometry = new THREE.SphereGeometry(0.12, 8, 8);
  const sensor = new THREE.Mesh(sensorGeometry, accentMaterial);
  sensor.position.set(0, 0.85, 0.3);
  group.add(sensor);

  // --- Engine Glows ---
  // Twin engine glow cones at the rear
  const glowGeometry = new THREE.ConeGeometry(0.15, 0.4, 8);
  const leftGlow = new THREE.Mesh(glowGeometry, glowMaterial);
  leftGlow.position.set(-0.35, 0.9, 0);
  group.add(leftGlow);

  const rightGlow = new THREE.Mesh(glowGeometry, glowMaterial);
  rightGlow.position.set(0.35, 0.9, 0);
  group.add(rightGlow);

  return group;
}

/**
 * Factory function that creates the HARBINGER enemy mesh.
 *
 * A twin-hulled bomber with:
 *   - Dark blue twin hulls
 *   - Green accent strips
 *   - Missile pods on the sides
 *   - Green engine glows
 *
 * The harbinger faces downward: nose points toward -Y.
 *
 * @returns {THREE.Group} A configured HARBINGER mesh group
 */
function createHarbingerMesh(): THREE.Group {
  const group = new THREE.Group();

  // --- Materials ---
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a2a4a,
    metalness: 0.75,
    roughness: 0.35,
  });

  const darkMaterial = new THREE.MeshStandardMaterial({
    color: 0x121a30,
    metalness: 0.8,
    roughness: 0.5,
  });

  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0x00ff88,
    emissive: 0x00ff88,
    emissiveIntensity: 0.7,
    metalness: 0.3,
    roughness: 0.2,
  });

  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff88,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // --- Twin Hulls ---
  // Left hull
  const leftHullGeometry = new THREE.BoxGeometry(0.6, 1.6, 0.5);
  const leftHull = new THREE.Mesh(leftHullGeometry, bodyMaterial);
  leftHull.position.set(-0.5, 0, 0);
  group.add(leftHull);

  // Right hull
  const rightHullGeometry = new THREE.BoxGeometry(0.6, 1.6, 0.5);
  const rightHull = new THREE.Mesh(rightHullGeometry, bodyMaterial);
  rightHull.position.set(0.5, 0, 0);
  group.add(rightHull);

  // --- Connecting Wing ---
  // Wing connecting the two hulls
  const wingGeometry = new THREE.BoxGeometry(1.6, 0.1, 0.4);
  const wing = new THREE.Mesh(wingGeometry, darkMaterial);
  wing.position.set(0, 0.3, 0);
  group.add(wing);

  // --- Missile Pods ---
  // Left missile pod
  const leftPodGeometry = new THREE.BoxGeometry(0.25, 0.5, 0.25);
  const leftPod = new THREE.Mesh(leftPodGeometry, darkMaterial);
  leftPod.position.set(-0.9, -0.2, 0);
  group.add(leftPod);

  // Right missile pod
  const rightPodGeometry = new THREE.BoxGeometry(0.25, 0.5, 0.25);
  const rightPod = new THREE.Mesh(rightPodGeometry, darkMaterial);
  rightPod.position.set(0.9, -0.2, 0);
  group.add(rightPod);

  // Pod accent strips (green)
  const accentStripGeometry = new THREE.BoxGeometry(0.04, 0.4, 0.04);
  const leftAccent = new THREE.Mesh(accentStripGeometry, accentMaterial);
  leftAccent.position.set(-0.9, -0.2, 0.15);
  group.add(leftAccent);

  const rightAccent = new THREE.Mesh(accentStripGeometry, accentMaterial);
  rightAccent.position.set(0.9, -0.2, 0.15);
  group.add(rightAccent);

  // --- Noses ---
  // Left nose
  const leftNoseGeometry = new THREE.ConeGeometry(0.2, 0.4, 6);
  const leftNose = new THREE.Mesh(leftNoseGeometry, bodyMaterial);
  leftNose.position.set(-0.5, -0.95, 0);
  leftNose.rotation.x = Math.PI;
  group.add(leftNose);

  // Right nose
  const rightNoseGeometry = new THREE.ConeGeometry(0.2, 0.4, 6);
  const rightNose = new THREE.Mesh(rightNoseGeometry, bodyMaterial);
  rightNose.position.set(0.5, -0.95, 0);
  rightNose.rotation.x = Math.PI;
  group.add(rightNose);

  // --- Cockpits ---
  // Left cockpit
  const leftCockpitGeometry = new THREE.ConeGeometry(0.1, 0.2, 6);
  const leftCockpit = new THREE.Mesh(leftCockpitGeometry, accentMaterial);
  leftCockpit.position.set(-0.5, -0.4, 0.2);
  group.add(leftCockpit);

  // Right cockpit
  const rightCockpitGeometry = new THREE.ConeGeometry(0.1, 0.2, 6);
  const rightCockpit = new THREE.Mesh(rightCockpitGeometry, accentMaterial);
  rightCockpit.position.set(0.5, -0.4, 0.2);
  group.add(rightCockpit);

  // --- Engine Glows ---
  // Twin engine glow cones at the rear
  const glowGeometry = new THREE.ConeGeometry(0.12, 0.35, 8);
  const leftGlow = new THREE.Mesh(glowGeometry, glowMaterial);
  leftGlow.position.set(-0.5, 0.9, 0);
  group.add(leftGlow);

  const rightGlow = new THREE.Mesh(glowGeometry, glowMaterial);
  rightGlow.position.set(0.5, 0.9, 0);
  group.add(rightGlow);

  return group;
}

/**
 * Factory function that creates the OVERLORD enemy mesh.
 *
 * A command ship with:
 *   - Steel blue body
 *   - Gold accent strips
 *   - Rotating turret ring (stored in userData)
 *   - Central command spire
 *
 * The overlord faces downward: nose points toward -Y.
 *
 * @returns {THREE.Group} A configured OVERLORD mesh group
 */
function createOverlordMesh(): THREE.Group {
  const group = new THREE.Group();

  // --- Materials ---
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a4a6a,
    metalness: 0.8,
    roughness: 0.35,
  });

  const darkMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a3a5a,
    metalness: 0.85,
    roughness: 0.5,
  });

  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0xffcc00,
    emissive: 0xffcc00,
    emissiveIntensity: 0.7,
    metalness: 0.3,
    roughness: 0.2,
  });

  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffcc00,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // --- Main Body ---
  // Central block
  const bodyGeometry = new THREE.BoxGeometry(1.6, 1.8, 1.0);
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  group.add(body);

  // Upper armor plate
  const topPlateGeometry = new THREE.BoxGeometry(1.8, 0.2, 1.1);
  const topPlate = new THREE.Mesh(topPlateGeometry, darkMaterial);
  topPlate.position.set(0, 0.9, 0);
  group.add(topPlate);

  // Lower armor plate
  const bottomPlateGeometry = new THREE.BoxGeometry(1.7, 0.18, 1.0);
  const bottomPlate = new THREE.Mesh(bottomPlateGeometry, darkMaterial);
  bottomPlate.position.set(0, -0.9, 0);
  group.add(bottomPlate);

  // --- Rotating Turret Ring ---
  // Create a sub-group for the rotating turret ring
  const turretRing = new THREE.Group();
  turretRing.position.set(0, 0, 0.3);

  // Ring base
  const ringGeometry = new THREE.TorusGeometry(0.8, 0.08, 8, 24);
  const ring = new THREE.Mesh(ringGeometry, darkMaterial);
  ring.rotation.x = Math.PI / 2;
  turretRing.add(ring);

  // Turret barrels (4 barrels evenly spaced)
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI * 2 * i) / 4;
    const barrelGeometry = new THREE.CylinderGeometry(0.06, 0.08, 0.4, 6);
    const barrel = new THREE.Mesh(barrelGeometry, bodyMaterial);
    barrel.position.set(Math.cos(angle) * 0.8, Math.sin(angle) * 0.8, 0);
    barrel.rotation.z = angle + Math.PI / 2;
    turretRing.add(barrel);
  }

  // Gold accent ring
  const accentRingGeometry = new THREE.TorusGeometry(0.85, 0.03, 8, 24);
  const accentRing = new THREE.Mesh(accentRingGeometry, accentMaterial);
  accentRing.rotation.x = Math.PI / 2;
  turretRing.add(accentRing);

  group.add(turretRing);

  // Store turret ring reference for rotation in update()
  group.userData = {
    turretRing,
  };

  // --- Command Spire ---
  // Central spire on top
  const spireGeometry = new THREE.ConeGeometry(0.15, 0.5, 6);
  const spire = new THREE.Mesh(spireGeometry, accentMaterial);
  spire.position.set(0, 1.2, 0);
  group.add(spire);

  // Spire glow
  const spireGlowGeometry = new THREE.SphereGeometry(0.08, 8, 8);
  const spireGlow = new THREE.Mesh(spireGlowGeometry, glowMaterial);
  spireGlow.position.set(0, 1.45, 0);
  group.add(spireGlow);

  // --- Side Panels ---
  // Left panel
  const leftPanelGeometry = new THREE.BoxGeometry(0.3, 1.2, 0.8);
  const leftPanel = new THREE.Mesh(leftPanelGeometry, darkMaterial);
  leftPanel.position.set(-0.95, 0, 0);
  leftPanel.rotation.z = 0.1;
  group.add(leftPanel);

  // Right panel
  const rightPanelGeometry = new THREE.BoxGeometry(0.3, 1.2, 0.8);
  const rightPanel = new THREE.Mesh(rightPanelGeometry, darkMaterial);
  rightPanel.position.set(0.95, 0, 0);
  rightPanel.rotation.z = -0.1;
  group.add(rightPanel);

  // Panel accent strips (gold)
  const accentStripGeometry = new THREE.BoxGeometry(0.05, 1.0, 0.04);
  const leftAccent = new THREE.Mesh(accentStripGeometry, accentMaterial);
  leftAccent.position.set(-1.05, 0, 0.2);
  leftAccent.rotation.z = 0.1;
  group.add(leftAccent);

  const rightAccent = new THREE.Mesh(accentStripGeometry, accentMaterial);
  rightAccent.position.set(1.05, 0, 0.2);
  rightAccent.rotation.z = -0.1;
  group.add(rightAccent);

  // --- Engine Glows ---
  // Twin engine glow cones at the rear
  const glowGeometry = new THREE.ConeGeometry(0.18, 0.5, 8);
  const leftGlow = new THREE.Mesh(glowGeometry, glowMaterial);
  leftGlow.position.set(-0.4, 1.1, 0);
  group.add(leftGlow);

  const rightGlow = new THREE.Mesh(glowGeometry, glowMaterial);
  rightGlow.position.set(0.4, 1.1, 0);
  group.add(rightGlow);

  return group;
}

/**
 * Factory function that creates an elite enemy of the given type.
 *
 * @param scene - The THREE.js scene
 * @param id - Unique identifier
 * @param type - The elite enemy type to create
 * @returns {Enemy} A configured elite enemy instance
 */
export function createEliteEnemy(scene: THREE.Scene, id: number, type: EliteEnemyType): Enemy {
  switch (type) {
    case 'reaper':
      return new Reaper(scene, id);
    case 'warden':
      return new Warden(scene, id);
    case 'harbinger':
      return new Harbinger(scene, id);
    case 'overlord':
      return new Overlord(scene, id);
    default:
      return new Reaper(scene, id);
  }
}

/**
 * Returns a random elite enemy type.
 *
 * @returns {EliteEnemyType} A randomly selected elite enemy type
 */
export function getRandomEliteEnemyType(): EliteEnemyType {
  const types: EliteEnemyType[] = ['reaper', 'warden', 'harbinger', 'overlord'];
  return types[Math.floor(Math.random() * types.length)];
}