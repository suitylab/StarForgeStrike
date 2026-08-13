import * as THREE from 'three';

/**
 * Bullet entity interface for the StarForge Strike game.
 * Represents a single bullet in the 2D gameplay space (X-Y plane).
 */
export interface Bullet {
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
 * Factory function that creates a visually polished cyan energy bolt bullet.
 *
 * The bullet is composed of three layered meshes for a glowing energy effect:
 *   1. Outer glow — largest, transparent cyan with additive blending
 *   2. Main core — elongated cyan energy bolt
 *   3. Inner core — brightest white-cyan for the 'glowing core' effect
 *
 * All meshes use MeshBasicMaterial with bright colors and additive blending
 * to simulate an emissive glow without needing lights.
 *
 * @returns {THREE.Group} A configured bullet group containing the layered meshes
 */
export function createBulletMesh(): THREE.Group {
  const group = new THREE.Group();

  // --- Outer Glow ---
  // Largest mesh, transparent with additive blending for a soft halo effect
  const glowGeometry = new THREE.BoxGeometry(0.3, 0.8, 0.3);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x00c8ff,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.z = 0;
  group.add(glow);

  // --- Main Core ---
  // Elongated cyan energy bolt — the primary visible body
  const coreGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: 0x00a8e8,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  core.position.z = 0.01;
  group.add(core);

  // --- Inner Core ---
  // Brightest white-cyan core for the intense glowing center effect
  const innerGeometry = new THREE.BoxGeometry(0.1, 0.35, 0.1);
  const innerMaterial = new THREE.MeshBasicMaterial({
    color: 0xe0f7ff,
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
 * Bullet class that wraps a bullet mesh group and manages its lifecycle.
 * Designed for Phase 2 object pooling integration — meshes are created
 * once and reused via spawn/deactivate cycles.
 */
export class Bullet {
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
  /** Damage dealt to enemies on hit */
  public damage: number;

  /**
   * Creates a new bullet and adds its mesh group to the scene.
   * The bullet starts inactive and hidden.
   *
   * @param scene - The THREE.js scene to add the bullet mesh to
   * @param id - Unique identifier for this bullet
   */
  constructor(scene: THREE.Scene, id: number) {
    this.id = id;
    this.mesh = createBulletMesh();
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
   * The bullet travels upward (+Y direction).
   *
   * @param position - The spawn position (Vector3 or {x, y, z})
   * @param speed - Movement speed in units per second
   */
  public spawn(position: THREE.Vector3 | { x: number; y: number; z: number }, speed: number): void {
    this.mesh.position.set(position.x, position.y, position.z);
    // Reset the scale so a recycled bullet doesn't retain a previous
    // custom scale (e.g. TITAN/PULSER). Call setScale() after spawn() to override.
    this.mesh.scale.set(1, 1, 1);
    this.speed = speed;
    // Bullets travel upward: +Y direction
    this.velocity.set(0, speed, 0);
    this.active = true;
    this.mesh.visible = true;
  }

    /**
   * Sets the scale of the bullet mesh group.
   * Used by TITAN's power progression to grow the bullet size.
   *
   * @param scale - The scale factor to apply
   */
  public setScale(scale: number): void {
    this.mesh.scale.set(scale, scale, scale);
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
   * The mesh remains in the scene for Phase 2 pooling reuse.
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
   * approximately 0.2 wide, 0.6 tall, 0.2 deep.
   *
   * @returns {THREE.Box3} The bullet's bounding box in world space
   */
  public getBounds(): THREE.Box3 {
    // Half-extents of the overall bullet size (0.2 x 0.6 x 0.2)
    const halfWidth = 0.1;
    const halfHeight = 0.3;
    const halfDepth = 0.1;

    const pos = this.mesh.position;
    return new THREE.Box3(
      new THREE.Vector3(pos.x - halfWidth, pos.y - halfHeight, pos.z - halfDepth),
      new THREE.Vector3(pos.x + halfWidth, pos.y + halfHeight, pos.z + halfDepth)
    );
  }
}