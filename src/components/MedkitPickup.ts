import * as THREE from 'three';

/**
 * MedkitPickup entity interface for the StarForge Strike game.
 * Represents a white medkit case with a red cross that restores 1 shield
 * segment when collected. The pickup drifts downward, bobs gently,
 * and magnetizes toward the player when within range.
 */
export interface MedkitPickup {
  /** Unique identifier for this pickup */
  id: number;
  /** The THREE.js group representing this pickup in the scene */
  mesh: THREE.Group;
  /** Whether this pickup is currently active and updating */
  active: boolean;
  /** Current velocity vector (units per second) */
  velocity: THREE.Vector3;
  /** Downward drift speed in units per second */
  fallSpeed: number;
  /** Distance at which the pickup starts magnetizing toward the player */
  magnetRadius: number;
  /** Distance at which the pickup is considered collected */
  collectRadius: number;
  /** Acceleration strength of the magnet effect */
  magnetStrength: number;
  /** Base Y position for bobbing animation reference */
  baseY: number;
  /** Total elapsed time for animations */
  elapsedTime: number;
}

/**
 * Factory function that creates the medkit pickup visual mesh.
 *
 * The pickup is composed of three layered meshes:
 *   1. Medkit case — white box with a raised red cross on the front face
 *   2. Cross handle — small red latch bar across the top of the case
 *   3. Outer glow — transparent green sphere with additive blending that pulses
 *
 * The case rotates slowly and the glow pulses with a sine wave so the pickup
 * is visually distinct from the cyan POWER crystal and blue wingman module.
 *
 * @returns {THREE.Group} A configured medkit pickup mesh group
 */
export function createMedkitPickupMesh(): THREE.Group {
  const group = new THREE.Group();

  // --- Medkit Case ---
  // White box with a slightly rounded feel via a red cross on the front
  const caseGeometry = new THREE.BoxGeometry(0.55, 0.55, 0.4);
  const caseMaterial = new THREE.MeshStandardMaterial({
    color: 0xf2f4f8,
    emissive: 0x222222,
    emissiveIntensity: 0.2,
    metalness: 0.2,
    roughness: 0.4,
    transparent: true,
    opacity: 0.95,
  });
  const medkitCase = new THREE.Mesh(caseGeometry, caseMaterial);
  medkitCase.position.set(0, 0, 0);
  group.add(medkitCase);

  // --- Red Cross ---
  // Two thin boxes forming a plus sign on the front face of the case
  const crossMaterial = new THREE.MeshStandardMaterial({
    color: 0xff3355,
    emissive: 0xff3355,
    emissiveIntensity: 0.7,
    metalness: 0.1,
    roughness: 0.3,
  });

  const crossVerticalGeometry = new THREE.BoxGeometry(0.16, 0.36, 0.06);
  const crossVertical = new THREE.Mesh(crossVerticalGeometry, crossMaterial);
  crossVertical.position.set(0, 0, 0.24);
  group.add(crossVertical);

  const crossHorizontalGeometry = new THREE.BoxGeometry(0.36, 0.16, 0.06);
  const crossHorizontal = new THREE.Mesh(crossHorizontalGeometry, crossMaterial);
  crossHorizontal.position.set(0, 0, 0.24);
  group.add(crossHorizontal);

  // --- Top Latch ---
  // Small red bar across the top of the case
  const latchGeometry = new THREE.BoxGeometry(0.3, 0.08, 0.12);
  const latch = new THREE.Mesh(latchGeometry, crossMaterial);
  latch.position.set(0, 0.3, 0);
  group.add(latch);

  // --- Outer Glow ---
  // Transparent green sphere with additive blending for a soft halo effect
  const glowGeometry = new THREE.SphereGeometry(0.65, 16, 16);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x00e676,
    transparent: true,
    opacity: 0.25,
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
 * MedkitPickup class that wraps the medkit pickup mesh group and manages
 * its lifecycle. The pickup drifts downward, bobs gently, rotates slowly,
 * and magnetizes toward the player when within range.
 */
export class MedkitPickup {
  /** Unique identifier for this pickup */
  public id: number;
  /** The THREE.js group representing this pickup */
  public mesh: THREE.Group;
  /** Whether this pickup is currently active */
  public active: boolean;
  /** Current velocity vector (units per second) */
  public velocity: THREE.Vector3;
  /** Downward drift speed in units per second */
  public fallSpeed: number;
  /** Distance at which the pickup starts magnetizing toward the player */
  public magnetRadius: number;
  /** Distance at which the pickup is considered collected */
  public collectRadius: number;
  /** Acceleration strength of the magnet effect */
  public magnetStrength: number;
  /** Base Y position for bobbing animation reference */
  public baseY: number;
  /** Total elapsed time for animations */
  public elapsedTime: number;

  /** Bobbing amplitude in units */
  private readonly bobAmplitude: number = 0.15;
  /** Bobbing frequency in radians per second */
  private readonly bobFrequency: number = 3.0;
  /** Rotation speed in radians per second */
  private readonly rotationSpeed: number = 1.5;
  /** Glow pulse frequency in radians per second */
  private readonly glowPulseFrequency: number = 2.5;

  /**
   * Creates a new medkit pickup and adds its mesh group to the scene.
   * The pickup starts inactive and hidden.
   *
   * @param scene - The THREE.js scene to add the pickup mesh to
   * @param id - Unique identifier for this pickup
   */
  constructor(scene: THREE.Scene, id: number) {
    this.id = id;
    this.mesh = createMedkitPickupMesh();
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
  public spawn(position: THREE.Vector3 | { x: number; y: number; z: number }): void {
    this.mesh.position.set(position.x, position.y, position.z);
    this.baseY = position.y;
    this.velocity.set(0, -this.fallSpeed, 0);
    this.elapsedTime = 0;
    this.active = true;
    this.mesh.visible = true;

    // Reset glow to default state
    const glowData = this.mesh.userData as { glow?: THREE.Mesh };
    if (glowData.glow) {
      glowData.glow.scale.set(1, 1, 1);
      (glowData.glow.material as THREE.MeshBasicMaterial).opacity = 0.25;
    }
  }

  /**
   * Updates the pickup position and animations.
   * Handles falling, bobbing, rotation, glow pulsing, and magnet behavior.
   *
   * @param delta - Time elapsed since last frame in seconds
   * @param playerPosition - The player's current position (Vector3 or {x, y, z})
   */
  public update(
    delta: number,
    playerPosition: THREE.Vector3 | { x: number; y: number; z: number }
  ): void {
    if (!this.active) return;

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
      const speed = Math.sqrt(
        this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y
      );
      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        this.velocity.x *= scale;
        this.velocity.y *= scale;
      }
    } else {
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
    const glowData = this.mesh.userData as { glow?: THREE.Mesh };
    if (glowData.glow) {
      const pulse = Math.sin(this.elapsedTime * this.glowPulseFrequency);
      const glowScale = 1 + pulse * 0.2;
      glowData.glow.scale.set(glowScale, glowScale, glowScale);

      const glowMaterial = glowData.glow.material as THREE.MeshBasicMaterial;
      glowMaterial.opacity = 0.2 + (pulse + 1) * 0.15; // Range: 0.05 to 0.5
    }
  }

  /**
   * Deactivates the pickup and hides it.
   * The mesh remains in the scene for pooling reuse.
   */
  public deactivate(): void {
    this.active = false;
    this.mesh.visible = false;
  }

  /**
   * Returns the Axis-Aligned Bounding Box (AABB) of this pickup
   * for collision detection.
   *
   * The bounds match the medkit case size: approximately 0.55 wide, 0.55 tall.
   *
   * @returns {THREE.Box3} The pickup's bounding box in world space
   */
  public getBounds(): THREE.Box3 {
    // Half-extents of the medkit case
    const halfWidth = 0.3;
    const halfHeight = 0.3;
    const halfDepth = 0.35;

    const pos = this.mesh.position;
    return new THREE.Box3(
      new THREE.Vector3(pos.x - halfWidth, pos.y - halfHeight, pos.z - halfDepth),
      new THREE.Vector3(pos.x + halfWidth, pos.y + halfHeight, pos.z + halfDepth)
    );
  }

  /**
   * Checks if the pickup is within collection range of the player.
   *
   * @param playerPosition - The player's current position (Vector3 or {x, y, z})
   * @returns {boolean} True if the pickup is within collectRadius of the player
   */
  public isCollected(
    playerPosition: THREE.Vector3 | { x: number; y: number; z: number }
  ): boolean {
    if (!this.active) return false;

    // Calculate distance on the X-Y plane (ignore Z)
    const dx = playerPosition.x - this.mesh.position.x;
    const dy = playerPosition.y - this.mesh.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance <= this.collectRadius;
  }
}