import * as THREE from 'three';
import { BulletPool } from './BulletPool';
import { Enemy } from './Enemy';

/**
 * WingmanType — the five distinct wingman variants in StarForge Strike.
 * Each type has a unique attack behavior and visual accent color.
 */
export type WingmanType = 'pulser' | 'lance' | 'seeker' | 'flare' | 'barrage';

/**
 * Metadata for a wingman type, used by the HUD and UI displays.
 */
export interface WingmanTypeData {
  /** Display name of the wingman type */
  name: string;
  /** Primary accent color (hex) */
  color: string;
  /** Brief description of the attack behavior */
  description: string;
}

/**
 * Metadata for all five wingman types.
 */
export const WINGMAN_TYPE_DATA: Record<WingmanType, WingmanTypeData> = {
  pulser: {
    name: 'PULSER',
    color: '#00c8ff',
    description: 'Rapid-fire straight shots',
  },
  lance: {
    name: 'LANCE',
    color: '#88ccff',
    description: 'Continuous piercing laser beam',
  },
  seeker: {
    name: 'SEEKER',
    color: '#00ff88',
    description: 'Homing missiles that track enemies',
  },
  flare: {
    name: 'FLARE',
    color: '#ff8800',
    description: 'Wide fan spread of 3 shots',
  },
  barrage: {
    name: 'BARRAGE',
    color: '#ff2244',
    description: 'Dense narrow cone of 5 shots',
  },
};

/**
 * Returns a random wingman type.
 *
 * @returns {WingmanType} A randomly selected wingman type
 */
export function getRandomWingmanType(): WingmanType {
  const types: WingmanType[] = ['pulser', 'lance', 'seeker', 'flare', 'barrage'];
  return types[Math.floor(Math.random() * types.length)];
}

/**
 * Accent color mapping per wingman type.
 */
export const ACCENT_COLORS: Record<WingmanType, number> = {
  pulser: 0x00c8ff,
  lance: 0x88ccff,
  seeker: 0x00ff88,
  flare: 0xff8800,
  barrage: 0xff2244,
};

/**
 * Formation styles for wingman following behavior.
 * Each player plane type can use a different follow algorithm.
 */
export enum WingmanFormation {
  /** Arc formation behind the player (default for PHANTOM) */
  ArcBehind = 'arc-behind',

  /** VANGUARD: wide horizontal line in FRONT of the player */
  VanguardFront = 'vanguard-front',

  /** TITAN: follow the player's historical movement trail */
  TrailFollow = 'trail-follow',
}

/**
 * Wingman base class — represents a single wingman drone that follows
 * the player in an arc formation and attacks enemies with a type-specific
 * weapon.
 *
 * The wingman drone is built from THREE.js primitives:
 *   - Angular hull body in dark gunmetal gray
 *   - Emissive cockpit core in the center
 *   - Accent-colored weapon attachment on the front
 *   - Engine glow cone at the rear
 *
 * Wingmen follow behind the player in an arc formation, evenly spaced
 * based on the total wingman count. They smoothly lerp toward their
 * target position for a fluid trailing effect.
 */
export class Wingman {
  /** Unique identifier for this wingman */
  public id: number;
  /** The THREE.js group representing this wingman */
  public mesh: THREE.Group;
  /** The type of this wingman */
  public type: WingmanType;
  /** Whether this wingman is currently active */
  public active: boolean;
  /** Time remaining before the next attack (seconds) */
  public attackCooldown: number;
  /** Time between attacks in seconds */
  public attackRate: number;
  /** Index in the formation (0-based) */
  public formationIndex: number;
  /** Total elapsed time for animations */
  public elapsedTime: number;

  /** The THREE.js scene this wingman belongs to */
  protected scene: THREE.Scene;

  /** Reference to the beam mesh for LANCE type */
  protected beamMesh: THREE.Mesh | null = null;

  /** Whether the beam is currently visible (LANCE only) */
  protected beamActive: boolean = false;

  /** Time remaining for the beam to stay visible (LANCE only) */
  protected beamTimer: number = 0;

  /** Bobbing amplitude in units */
  protected readonly bobAmplitude: number = 0.1;
  /** Bobbing frequency in radians per second */
  protected readonly bobFrequency: number = 2.5;

  /**
   * Creates a new wingman and adds its mesh to the scene.
   * The wingman starts inactive and hidden.
   *
   * @param scene - The THREE.js scene to add the wingman mesh to
   * @param id - Unique identifier for this wingman
   * @param type - The wingman type
   */
  constructor(scene: THREE.Scene, id: number, type: WingmanType) {
    this.scene = scene;
    this.id = id;
    this.type = type;
    this.active = false;
    this.attackCooldown = 0;
    this.attackRate = 1.0;
    this.formationIndex = 0;
    this.elapsedTime = 0;

    // Build the drone mesh
    this.mesh = this.buildDroneMesh(type);

    // Add to scene but keep hidden until spawned
    scene.add(this.mesh);
    this.mesh.visible = false;
  }

  /**
   * Builds the drone mesh for the given wingman type.
   * All wingmen share a similar base body with distinct accent colors
   * and small weapon attachments.
   *
   * @param type - The wingman type
   * @returns {THREE.Group} The configured drone mesh group
   */
  protected buildDroneMesh(type: WingmanType): THREE.Group {
    const group = new THREE.Group();
    const accentColor = ACCENT_COLORS[type];

    // --- Materials ---
    // Dark gunmetal gray for the body
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a3a4a,
      metalness: 0.7,
      roughness: 0.4,
    });

    // Emissive accent material
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.8,
      metalness: 0.3,
      roughness: 0.2,
    });

    // Bright core material
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.6,
      metalness: 0.2,
      roughness: 0.1,
    });

    // --- Base Body ---
    // Angular hull using an octahedron for a faceted look
    const hullGeometry = new THREE.OctahedronGeometry(0.3, 0);
    const hull = new THREE.Mesh(hullGeometry, bodyMaterial);
    hull.scale.set(1, 1.2, 0.8);
    group.add(hull);

    // --- Cockpit Core ---
    // Small emissive sphere in the center
    const coreGeometry = new THREE.SphereGeometry(0.12, 8, 8);
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.set(0, 0, 0.1);
    group.add(core);

    // --- Weapon Attachment ---
    // Small box on the front (top, +Y direction) matching accent color
    const weaponGeometry = new THREE.BoxGeometry(0.1, 0.2, 0.1);
    const weapon = new THREE.Mesh(weaponGeometry, accentMaterial);
    weapon.position.set(0, 0.35, 0);
    group.add(weapon);

    // --- Engine Glow ---
    // Emissive cone at the rear pointing downward (-Y)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glowGeometry = new THREE.ConeGeometry(0.08, 0.2, 8);
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(0, -0.35, 0);
    glow.rotation.x = Math.PI; // Point downward
    group.add(glow);

    // Store glow reference for pulse animation
    group.userData = {
      glow,
    };

    // --- LANCE Beam Mesh ---
    // Only for LANCE type: a thin stretched box extending upward
    if (type === 'lance') {
      const beamGeometry = new THREE.BoxGeometry(0.15, 18, 0.15);
      const beamMaterial = new THREE.MeshBasicMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.beamMesh = new THREE.Mesh(beamGeometry, beamMaterial);
      // Position the beam so it extends upward from the wingman
      // The beam center is 9 units above the wingman (half of 18 height)
      this.beamMesh.position.set(0, 9.0, 0);
      this.beamMesh.visible = false;
      group.add(this.beamMesh);
    }

    return group;
  }

  /**
   * Activates the wingman at the given position.
   *
   * @param position - The spawn position (Vector3 or {x, y, z})
   */
  public spawn(position: THREE.Vector3 | { x: number; y: number; z: number }): void {
    this.mesh.position.set(position.x, position.y, position.z);
    this.active = true;
    this.mesh.visible = true;
    this.elapsedTime = 0;
    this.attackCooldown = 0;

    // Hide beam if present
    if (this.beamMesh) {
      this.beamMesh.visible = false;
      this.beamActive = false;
      this.beamTimer = 0;
    }
  }

  /**
   * Updates the wingman position and animations.
   * Calculates the target position in the plane-specific formation,
   * smoothly lerps toward it, and handles bobbing/rotation.
   *
   * @param delta - Time elapsed since last frame in seconds
   * @param playerPosition - The player's current position
   * @param playerVelocity - The player's current velocity (unused, reserved)
   * @param wingmanCount - Total number of active wingmen
   * @param formation - The wingman follow formation to use (defaults to arc behind)
   * @param trailPositions - The player's recorded movement trail (required for TrailFollow)
   */
  public update(
    delta: number,
    playerPosition: THREE.Vector3 | { x: number; y: number; z: number },
    playerVelocity: THREE.Vector3 | { x: number; y: number; z: number },
    wingmanCount: number,
    formation: WingmanFormation = WingmanFormation.ArcBehind,
    trailPositions?: THREE.Vector3[]
  ): void {
    if (!this.active) return;

    // Track elapsed time
    this.elapsedTime += delta;

    // --- Formation Position Calculation ---
    let targetX = playerPosition.x;
    let targetY = playerPosition.y;

    if (formation === WingmanFormation.VanguardFront) {
      // VANGUARD: wide horizontal line IN FRONT of the player
      const frontDistance = 2.2; // Distance in front of player
      const maxSpread = 4.0; // Wider horizontal spread
      const spread = Math.min(maxSpread, (wingmanCount - 1) * 1.0);

      // Evenly spaced across the line
      let horizontalOffset = 0;
      if (wingmanCount > 1) {
        const t = this.formationIndex / (wingmanCount - 1); // 0 to 1
        horizontalOffset = -spread / 2 + t * spread;
      }

      targetX = playerPosition.x + horizontalOffset;
      targetY = playerPosition.y + frontDistance;
    } else if (formation === WingmanFormation.TrailFollow && trailPositions && trailPositions.length > 0) {
      // TITAN: follow the player's historical movement trail.
      // Each wingman locks onto a fixed point in the trail queue:
      // the first wingman takes the 10th recorded position, the second the 20th, etc.
      const step = 10;
      const offset = (this.formationIndex + 1) * step;
      const trailIndex = Math.max(0, Math.min(trailPositions.length - 1, trailPositions.length - offset));
      const trailPoint = trailPositions[trailIndex];

      targetX = trailPoint.x;
      targetY = trailPoint.y;
    } else {
      // Default: arc behind the player, horizontal spread increases with count
      const arcDistance = 2.5; // Base distance behind player
      const maxSpread = 3.0; // Maximum horizontal spread
      const spread = Math.min(maxSpread, (wingmanCount - 1) * 0.8);

      // Calculate the horizontal offset for this wingman
      // Evenly spaced across the arc
      let horizontalOffset = 0;
      if (wingmanCount > 1) {
        const t = this.formationIndex / (wingmanCount - 1); // 0 to 1
        horizontalOffset = -spread / 2 + t * spread;
      }

      // Target position: behind player with horizontal offset
      targetX = playerPosition.x + horizontalOffset;
      targetY = playerPosition.y - arcDistance;
    }

    // --- Smooth Lerp ---
    // Delay factor for fluid trailing effect
    const lerpFactor = 0.08;
    this.mesh.position.x += (targetX - this.mesh.position.x) * lerpFactor;
    this.mesh.position.y += (targetY - this.mesh.position.y) * lerpFactor;

    // --- Bobbing Animation ---
    const bobOffset = Math.sin(this.elapsedTime * this.bobFrequency + this.formationIndex) * this.bobAmplitude;
    this.mesh.position.y += bobOffset;

    // --- Subtle Rotation ---
    // Slight tilt based on horizontal movement direction
    const tiltAngle = (targetX - this.mesh.position.x) * 0.5;
    this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, tiltAngle, 0.1);

    // --- Engine Glow Pulse ---
    const glowData = this.mesh.userData as { glow?: THREE.Mesh };
    if (glowData.glow) {
      const pulse = Math.sin(this.elapsedTime * 5);
      const scale = 1 + pulse * 0.2;
      glowData.glow.scale.set(scale, scale, scale);
      (glowData.glow.material as THREE.MeshBasicMaterial).opacity = 0.5 + pulse * 0.3;
    }

    // --- Attack Cooldown ---
    if (this.attackCooldown > 0) {
      this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    }

    // --- LANCE Beam Timer ---
    if (this.beamActive && this.beamMesh) {
      this.beamTimer -= delta;
      if (this.beamTimer <= 0) {
        this.beamMesh.visible = false;
        this.beamActive = false;
      }
    }
  }

  /**
   * Performs the wingman's attack.
   * Base implementation is a no-op — subclasses override this.
   *
   * @param bulletPool - The bullet pool to spawn bullets from
   * @param enemies - Array of active enemies (for targeting)
   */
  public attack(bulletPool: BulletPool, enemies: Enemy[]): void {
    // Base no-op — overridden by subclasses
  }

  /**
   * Deactivates the wingman and hides it.
   */
  public deactivate(): void {
    this.active = false;
    this.mesh.visible = false;

    // Hide beam if present
    if (this.beamMesh) {
      this.beamMesh.visible = false;
      this.beamActive = false;
    }
  }

  /**
   * Removes the wingman's mesh (and beam) from the scene and disposes
   * all geometries and materials, freeing the GPU resources.
   * Used when the game is disposed.
   */
  public dispose(): void {
    this.scene.remove(this.mesh);
    this.mesh.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        if (mesh.geometry) mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) material.dispose();
      }
    });

    if (this.beamMesh) {
      this.scene.remove(this.beamMesh);
      if (this.beamMesh.geometry) this.beamMesh.geometry.dispose();
      if (this.beamMesh.material) {
        const materials = Array.isArray(this.beamMesh.material)
          ? this.beamMesh.material
          : [this.beamMesh.material];
        for (const material of materials) material.dispose();
      }
      this.beamMesh = null;
    }

    this.active = false;
  }

  /**
   * Returns the Axis-Aligned Bounding Box (AABB) of this wingman
   * for collision detection.
   *
   * @returns {THREE.Box3} The wingman's bounding box in world space
   */
  public getBounds(): THREE.Box3 {
    // Half-extents of the drone (0.6 wide, 0.7 tall, 0.5 deep)
    const halfWidth = 0.3;
    const halfHeight = 0.35;
    const halfDepth = 0.25;

    const pos = this.mesh.position;
    return new THREE.Box3(
      new THREE.Vector3(pos.x - halfWidth, pos.y - halfHeight, pos.z - halfDepth),
      new THREE.Vector3(pos.x + halfWidth, pos.y + halfHeight, pos.z + halfDepth)
    );
  }

  /**
   * Returns the beam's bounding box for collision detection.
   * Only valid for LANCE type when the beam is active.
   *
   * @returns {THREE.Box3 | null} The beam's bounding box, or null if not applicable
   */
  public getBeamBounds(): THREE.Box3 | null {
    if (!this.beamMesh || !this.beamActive || !this.beamMesh.visible) {
      return null;
    }

    // Beam is 0.15 wide, 18 tall, 0.15 deep
    // Positioned at (0, 9, 0) relative to the wingman
    const beamWorldPos = this.beamMesh.getWorldPosition(new THREE.Vector3());
    const halfWidth = 0.075;
    const halfHeight = 9.0;
    const halfDepth = 0.075;

    return new THREE.Box3(
      new THREE.Vector3(beamWorldPos.x - halfWidth, beamWorldPos.y - halfHeight, beamWorldPos.z - halfDepth),
      new THREE.Vector3(beamWorldPos.x + halfWidth, beamWorldPos.y + halfHeight, beamWorldPos.z + halfDepth)
    );
  }
}

/**
 * PulserWingman — fires rapid small bullets in a straight line parallel to the player.
 * Attack rate: 0.15s. Bullet speed: 14. Cyan bullets at 0.7x scale.
 */
export class PulserWingman extends Wingman {
  /**
   * Creates a new PulserWingman.
   *
   * @param scene - The THREE.js scene
   * @param id - Unique identifier
   */
  constructor(scene: THREE.Scene, id: number) {
    super(scene, id, 'pulser');
    this.attackRate = 0.15;
  }

  /**
   * Fires a single small bullet straight up from the wingman's position.
   *
   * @param bulletPool - The bullet pool to spawn bullets from
   * @param enemies - Array of active enemies (unused for pulser)
   */
  public attack(bulletPool: BulletPool, enemies: Enemy[]): void {
    if (this.attackCooldown > 0) return;

    const bullet = bulletPool.get();
    if (bullet) {
      const pos = this.mesh.position;
      bullet.spawn({ x: pos.x, y: pos.y + 0.4, z: pos.z }, 14);
      bullet.setScale(0.7);
      bullet.damage = 1;
    }

    this.attackCooldown = this.attackRate;
  }
}

/**
 * LanceWingman — fires a continuous thin laser beam that pierces enemies.
 * The beam is visible for 0.5s, then hidden for 0.5s cooldown.
 * Beam color: white-blue.
 */
export class LanceWingman extends Wingman {
  /** Duration the beam stays visible in seconds */
  private readonly beamDuration: number = 0.5;

  /**
   * Creates a new LanceWingman.
   *
   * @param scene - The THREE.js scene
   * @param id - Unique identifier
   */
  constructor(scene: THREE.Scene, id: number) {
    super(scene, id, 'lance');
    this.attackRate = 1.0;
  }

  /**
   * Activates the beam for 0.5 seconds.
   * The beam damages enemies on contact (checked in Game.ts).
   *
   * @param bulletPool - The bullet pool (unused for lance)
   * @param enemies - Array of active enemies (unused for lance)
   */
  public attack(bulletPool: BulletPool, enemies: Enemy[]): void {
    if (this.attackCooldown > 0) return;

    // Activate the beam
    if (this.beamMesh) {
      this.beamMesh.visible = true;
      this.beamActive = true;
      this.beamTimer = this.beamDuration;
    }

    this.attackCooldown = this.attackRate;
  }
}

/**
 * SeekerMissile — a homing missile fired by SeekerWingman.
 * The missile steers toward its target each frame.
 */
export class SeekerMissile {
  /** The THREE.js group representing this missile */
  public mesh: THREE.Group;
  /** Whether this missile is currently active */
  public active: boolean;
  /** Current velocity vector (units per second) */
  public velocity: THREE.Vector3;
  /** The target enemy this missile is tracking */
  public target: Enemy | null;
  /** Movement speed in units per second */
  public speed: number;
  /** Steering strength toward the target */
  public steeringStrength: number;
  /** Total elapsed time for animations */
  public elapsedTime: number;

  /** The THREE.js scene this missile belongs to */
  private scene: THREE.Scene;

  /**
   * Creates a new seeker missile and adds its mesh to the scene.
   * The missile starts inactive and hidden.
   *
   * @param scene - The THREE.js scene to add the missile to
   */
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.active = false;
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.target = null;
    this.speed = 10;
    this.steeringStrength = 3.0;
    this.elapsedTime = 0;

    // Build the missile mesh
    this.mesh = this.buildMissileMesh();

    // Add to scene but keep hidden until spawned
    scene.add(this.mesh);
    this.mesh.visible = false;
  }

  /**
   * Builds the missile mesh — a small cone with a green trail.
   *
   * @returns {THREE.Group} The configured missile mesh group
   */
  private buildMissileMesh(): THREE.Group {
    const group = new THREE.Group();

    // Missile body — small cone pointing upward
    const bodyGeometry = new THREE.ConeGeometry(0.08, 0.25, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0.6,
      metalness: 0.3,
      roughness: 0.2,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(body);

    // Trail — elongated cone extending downward
    const trailGeometry = new THREE.ConeGeometry(0.05, 0.4, 8);
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
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
   * Spawns the missile at the given position targeting the given enemy.
   *
   * @param position - The spawn position
   * @param target - The enemy to track
   */
  public spawn(position: THREE.Vector3 | { x: number; y: number; z: number }, target: Enemy): void {
    this.mesh.position.set(position.x, position.y, position.z);
    this.target = target;
    this.active = true;
    this.mesh.visible = true;
    this.elapsedTime = 0;

    // Initial velocity: straight up
    this.velocity.set(0, this.speed, 0);
  }

  /**
   * Updates the missile position and steering.
   * The missile curves toward its target each frame.
   *
   * @param delta - Time elapsed since last frame in seconds
   */
  public update(delta: number): void {
    if (!this.active) return;

    this.elapsedTime += delta;

    // --- Steering ---
    if (this.target && this.target.active) {
      // Calculate direction to target
      const dx = this.target.mesh.position.x - this.mesh.position.x;
      const dy = this.target.mesh.position.y - this.mesh.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0.001) {
        // Desired direction toward target
        const desiredX = dx / distance;
        const desiredY = dy / distance;

        // Current direction (normalized velocity)
        const currentSpeed = Math.sqrt(
          this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y
        );
        const currentX = currentSpeed > 0 ? this.velocity.x / currentSpeed : 0;
        const currentY = currentSpeed > 0 ? this.velocity.y / currentSpeed : 0;

        // Steer toward target
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
    }

    // --- Apply Velocity ---
    this.mesh.position.x += this.velocity.x * delta;
    this.mesh.position.y += this.velocity.y * delta;

    // --- Rotation ---
    // Rotate missile to face movement direction
    const angle = Math.atan2(this.velocity.x, this.velocity.y);
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
    this.target = null;
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
 * SeekerWingman — fires homing missiles that track the nearest enemy.
 * Attack rate: 1.5s. Missiles are small cones with green trails.
 */
export class SeekerWingman extends Wingman {
  /** Array of active seeker missiles */
  private missiles: SeekerMissile[] = [];

  /**
   * Creates a new SeekerWingman.
   *
   * @param scene - The THREE.js scene
   * @param id - Unique identifier
   */
  constructor(scene: THREE.Scene, id: number) {
    super(scene, id, 'seeker');
    this.attackRate = 1.5;

    // Pre-allocate a few missiles for pooling
    for (let i = 0; i < 3; i++) {
      this.missiles.push(new SeekerMissile(scene));
    }
  }

  /**
   * Fires a homing missile at the nearest enemy.
   *
   * @param bulletPool - The bullet pool (unused for seeker)
   * @param enemies - Array of active enemies to target
   */
  public attack(bulletPool: BulletPool, enemies: Enemy[]): void {
    if (this.attackCooldown > 0) return;

    // Find the nearest active enemy
    let nearestEnemy: Enemy | null = null;
    let nearestDistance = Infinity;

    for (const enemy of enemies) {
      if (!enemy.active) continue;

      const dx = enemy.mesh.position.x - this.mesh.position.x;
      const dy = enemy.mesh.position.y - this.mesh.position.y;
      const distance = dx * dx + dy * dy;

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestEnemy = enemy;
      }
    }

    // If no enemy found, don't fire
    if (!nearestEnemy) {
      this.attackCooldown = this.attackRate * 0.5; // Shorter cooldown when no target
      return;
    }

    // Find an inactive missile to fire
    const missile = this.missiles.find((m) => !m.active);
    if (missile) {
      const pos = this.mesh.position;
      missile.spawn({ x: pos.x, y: pos.y + 0.4, z: pos.z }, nearestEnemy);
    }

    this.attackCooldown = this.attackRate;
  }

  /**
   * Updates the wingman and all active missiles.
   * Overrides the base update to also update missiles.
   *
   * @param delta - Time elapsed since last frame in seconds
   * @param playerPosition - The player's current position
   * @param playerVelocity - The player's current velocity
   * @param wingmanCount - Total number of active wingmen
   * @param formation - The wingman follow formation to use
   * @param trailPositions - The player's recorded movement trail (required for TrailFollow)
   */
  public update(
    delta: number,
    playerPosition: THREE.Vector3 | { x: number; y: number; z: number },
    playerVelocity: THREE.Vector3 | { x: number; y: number; z: number },
    wingmanCount: number,
    formation: WingmanFormation = WingmanFormation.ArcBehind,
    trailPositions?: THREE.Vector3[]
  ): void {
    super.update(delta, playerPosition, playerVelocity, wingmanCount, formation, trailPositions);

    // Update all active missiles
    for (const missile of this.missiles) {
      if (!missile.active) continue;

      missile.update(delta);

      // Deactivate missiles that go off-screen
      const pos = missile.mesh.position;
      if (pos.y > 12 || pos.y < -12 || pos.x < -12 || pos.x > 12) {
        missile.deactivate();
      }
    }
  }

  /**
   * Returns the active missiles for collision detection in Game.ts.
   *
   * @returns {SeekerMissile[]} Array of active missiles
   */
  public getActiveMissiles(): SeekerMissile[] {
    return this.missiles.filter((m) => m.active);
  }

  /**
   * Deactivates the wingman and all its missiles.
   */
  public deactivate(): void {
    super.deactivate();

    // Deactivate all missiles
    for (const missile of this.missiles) {
      missile.deactivate();
    }
  }
}

/**
 * FlareWingman — fires 3 bullets in a fan pattern.
 * Attack rate: 0.8s. Bullets at -30°, 0°, +30° angles. Orange color.
 */
export class FlareWingman extends Wingman {
  /**
   * Creates a new FlareWingman.
   *
   * @param scene - The THREE.js scene
   * @param id - Unique identifier
   */
  constructor(scene: THREE.Scene, id: number) {
    super(scene, id, 'flare');
    this.attackRate = 0.8;
  }

  /**
   * Fires 3 bullets in a fan pattern: straight up, 30° left, 30° right.
   *
   * @param bulletPool - The bullet pool to spawn bullets from
   * @param enemies - Array of active enemies (unused for flare)
   */
  public attack(bulletPool: BulletPool, enemies: Enemy[]): void {
    if (this.attackCooldown > 0) return;

    const pos = this.mesh.position;
    const speed = 14;
    const spreadAngle = Math.PI / 6; // 30 degrees

    // Straight up
    const bullet1 = bulletPool.get();
    if (bullet1) {
      bullet1.spawn({ x: pos.x, y: pos.y + 0.4, z: pos.z }, speed);
      bullet1.velocity.set(0, speed, 0);
      bullet1.damage = 1;
    }

    // 30 degrees left
    const bullet2 = bulletPool.get();
    if (bullet2) {
      bullet2.spawn({ x: pos.x, y: pos.y + 0.4, z: pos.z }, speed);
      bullet2.velocity.set(-Math.sin(spreadAngle) * speed, Math.cos(spreadAngle) * speed, 0);
      bullet2.damage = 1;
    }

    // 30 degrees right
    const bullet3 = bulletPool.get();
    if (bullet3) {
      bullet3.spawn({ x: pos.x, y: pos.y + 0.4, z: pos.z }, speed);
      bullet3.velocity.set(Math.sin(spreadAngle) * speed, Math.cos(spreadAngle) * speed, 0);
      bullet3.damage = 1;
    }

    this.attackCooldown = this.attackRate;
  }
}

/**
 * BarrageWingman — fires 5 bullets in a narrow cone.
 * Attack rate: 1.2s. Total spread of ~15 degrees. Red color.
 */
export class BarrageWingman extends Wingman {
  /**
   * Creates a new BarrageWingman.
   *
   * @param scene - The THREE.js scene
   * @param id - Unique identifier
   */
  constructor(scene: THREE.Scene, id: number) {
    super(scene, id, 'barrage');
    this.attackRate = 1.2;
  }

  /**
   * Fires 5 bullets in a narrow cone (~15° total spread).
   *
   * @param bulletPool - The bullet pool to spawn bullets from
   * @param enemies - Array of active enemies (unused for barrage)
   */
  public attack(bulletPool: BulletPool, enemies: Enemy[]): void {
    if (this.attackCooldown > 0) return;

    const pos = this.mesh.position;
    const speed = 14;
        const bulletCount: number = 5;
    const totalSpread = Math.PI / 12; // 15 degrees total

    for (let i = 0; i < bulletCount; i++) {
      const t = bulletCount === 1 ? 0 : i / (bulletCount - 1);
      const angle = -totalSpread / 2 + t * totalSpread;

      const bullet = bulletPool.get();
      if (bullet) {
        bullet.spawn({ x: pos.x, y: pos.y + 0.4, z: pos.z }, speed);
        bullet.velocity.set(Math.sin(angle) * speed, Math.cos(angle) * speed, 0);
        bullet.damage = 1;
      }
    }

    this.attackCooldown = this.attackRate;
  }
}

/**
 * Factory function that creates a wingman of the given type.
 *
 * @param scene - The THREE.js scene
 * @param id - Unique identifier
 * @param type - The wingman type to create
 * @returns {Wingman} A configured wingman instance
 */
export function createWingman(scene: THREE.Scene, id: number, type: WingmanType): Wingman {
  switch (type) {
    case 'pulser':
      return new PulserWingman(scene, id);
    case 'lance':
      return new LanceWingman(scene, id);
    case 'seeker':
      return new SeekerWingman(scene, id);
    case 'flare':
      return new FlareWingman(scene, id);
    case 'barrage':
      return new BarrageWingman(scene, id);
    default:
      return new PulserWingman(scene, id);
  }
}