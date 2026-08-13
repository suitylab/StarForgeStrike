import * as THREE from 'three';

/**
 * EnemyBullet entity interface for the StarForge Strike game.
 * Represents a single enemy bullet in the 2D gameplay space (X-Y plane).
 * Enemy bullets are red-orange to be visually distinct from the player's cyan bullets.
 */
export interface EnemyBullet {
  /** Unique identifier for this bullet */
  id: number;
  /** The THREE.js group representing this bullet in the scene */
  mesh: THREE.Group;
  /** Current velocity vector (units per second) */
  velocity: THREE.Vector3;
  /** Whether this bullet is currently active and updating */
  active: boolean;
  /** Movement speed in units per second (magnitude of velocity) */
  speed: number;
}

/**
 * Factory function that creates a visually polished red-orange energy bolt bullet.
 *
 * The bullet is composed of three layered meshes for a glowing energy effect:
 *   1. Outer glow — largest, transparent red-orange with additive blending
 *   2. Main core — elongated red-orange energy bolt
 *   3. Inner core — brightest warm-white for the 'glowing core' effect
 *
 * All meshes use MeshBasicMaterial with bright colors and additive blending
 * to simulate an emissive glow without needing lights.
 *
 * @returns {THREE.Group} A configured enemy bullet group containing the layered meshes
 */
export function createEnemyBulletMesh(): THREE.Group {
  const group = new THREE.Group();

  // --- Outer Glow ---
  // Largest mesh, transparent with additive blending for a soft halo effect
  const glowGeometry = new THREE.BoxGeometry(0.25, 0.6, 0.25);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xff4400,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.z = 0;
  group.add(glow);

  // --- Main Core ---
  // Elongated red-orange energy bolt — the primary visible body
  const coreGeometry = new THREE.BoxGeometry(0.18, 0.5, 0.18);
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: 0xff6600,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  core.position.z = 0.01;
  group.add(core);

  // --- Inner Core ---
  // Brightest warm-white core for the intense glowing center effect
  const innerGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.1);
  const innerMaterial = new THREE.MeshBasicMaterial({
    color: 0xffcc88,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const inner = new THREE.Mesh(innerGeometry, innerMaterial);
  inner.position.z = 0.02;
  group.add(inner);

  return group;
}

/**
 * EnemyBullet class that wraps a bullet mesh group and manages its lifecycle.
 * Designed for object pooling integration — meshes are created once and
 * reused via spawn/deactivate cycles.
 *
 * Enemy bullets travel downward (-Y direction) and are visually distinct
 * from player bullets (red-orange vs cyan).
 */
export class EnemyBullet {
  /** Unique identifier for this bullet */
  public id: number;
  /** The THREE.js group representing this bullet */
  public mesh: THREE.Group;
  /** Current velocity vector (units per second) */
  public velocity: THREE.Vector3;
  /** Whether this bullet is currently active */
  public active: boolean;
  /** Movement speed in units per second */
  public speed: number;
  /** Damage dealt to the player on hit */
  public damage: number;

  /**
   * Creates a new enemy bullet and adds its mesh group to the scene.
   * The bullet starts inactive and hidden.
   *
   * @param scene - The THREE.js scene to add the bullet mesh to
   * @param id - Unique identifier for this bullet
   */
  constructor(scene: THREE.Scene, id: number) {
    this.id = id;
    this.mesh = createEnemyBulletMesh();
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.active = false;
    this.speed = 0;
    this.damage = 1;

    // Add to scene but keep hidden until spawned
    scene.add(this.mesh);
    this.mesh.visible = false;
  }

  /**
   * Activates the bullet at the given position with the given speed.
   * The bullet travels downward (-Y direction).
   *
   * @param position - The spawn position (Vector3 or {x, y, z})
   * @param speed - Movement speed in units per second
   */
  public spawn(position: THREE.Vector3 | { x: number; y: number; z: number }, speed: number): void {
    this.mesh.position.set(position.x, position.y, position.z);
    // Reset scale so recycled bullets (e.g. elongated lasers from fireLaser)
    // don't retain their custom size for later spawns.
    this.mesh.scale.set(1, 1, 1);
    this.speed = speed;
    // Enemy bullets travel downward: -Y direction
    this.velocity.set(0, -speed, 0);
    this.active = true;
    this.mesh.visible = true;
  }

  /**
   * Updates the bullet position based on velocity and delta time.
   *
   * @param delta - Time elapsed since last frame in seconds
   */
  public update(delta: number): void {
    if (!this.active) return;
    this.mesh.position.addScaledVector(this.velocity, delta);
    // Orient the elongated mesh (forward = local +Y) to face the travel direction
    this.mesh.rotation.z = Math.atan2(this.velocity.y, this.velocity.x) - Math.PI / 2;
  }

  /**
   * Deactivates the bullet and hides it.
   * The mesh remains in the scene for pooling reuse.
   */
  public deactivate(): void {
    this.active = false;
    this.mesh.visible = false;
  }

  /**
   * Returns the Axis-Aligned Bounding Box (AABB) of this bullet
   * for collision detection.
   *
   * The bounds are based on the overall bullet size:
   * approximately 0.25 wide, 0.6 tall, 0.25 deep.
   *
   * @returns {THREE.Box3} The bullet's bounding box in world space
   */
  public getBounds(): THREE.Box3 {
    // Half-extents of the overall bullet size (0.25 x 0.6 x 0.25)
    const halfWidth = 0.125;
    const halfHeight = 0.3;
    const halfDepth = 0.125;

    const pos = this.mesh.position;
    return new THREE.Box3(
      new THREE.Vector3(pos.x - halfWidth, pos.y - halfHeight, pos.z - halfDepth),
      new THREE.Vector3(pos.x + halfWidth, pos.y + halfHeight, pos.z + halfDepth)
    );
  }
}