import * as THREE from 'three';
import { EnemyBulletPool } from './EnemyBulletPool';
import { HitFlash } from './HitFlash';

/**
 * HomingMissile — an internal class for the VoidReaverBoss.
 * 
 * A small purple glowing sphere with a trail that tracks the player position
 * using steering behavior. Missiles accelerate toward the player each frame.
 */
class HomingMissile {
  /** The THREE.js group containing the missile mesh */
  public readonly mesh: THREE.Group;
  
  /** Current velocity vector (units per second) */
  public velocity: THREE.Vector3;
  
  /** Whether this missile is currently active */
  public active: boolean = false;
  
  /** Time remaining before the missile expires (seconds) */
  public lifetime: number = 5.0;
  
  /** Maximum speed of the missile (units per second) */
  private readonly maxSpeed: number = 9;
  
  /** Turn rate limit — how fast the missile can rotate toward the player (radians per second) */
  private readonly turnRate: number = 2.2;
  
  /** How long the missile actively homes on the player before steering fades (seconds) */
  private readonly agilityTime: number = 1.6;
  
  /** How long homing fades to zero after the agility window (seconds) */
  private readonly coastTime: number = 1.4;
  
  /** Acceleration toward max speed (seconds^-1) */
  private readonly acceleration: number = 4.0;
  
  /** Age of the missile (seconds since spawn) */
  private age: number = 0;
  
  /** Reference to the trail mesh for animation */
  private trail: THREE.Mesh;
  
  /** Reference to the core mesh for pulse animation */
  private core: THREE.Mesh;
  
  /** Time accumulator for pulse animation */
  private pulseTime: number = 0;

  /**
   * Creates a new homing missile.
   * Builds the mesh and adds it to the scene (hidden).
   * 
   * @param scene - The THREE.js scene to add the missile to
   */
  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.Group();
    
    // --- Trail (elongated cone behind the missile) ---
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: 0xaa44ff,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.trail = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 0.8, 8),
      trailMaterial
    );
    this.trail.rotation.x = Math.PI; // Point backward (trail behind)
    this.trail.position.y = -0.4;
    this.mesh.add(this.trail);
    
    // --- Main body (small purple sphere) ---
    const bodyMaterial = new THREE.MeshBasicMaterial({
      color: 0x8833cc,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 8),
      bodyMaterial
    );
    this.mesh.add(body);
    
    // --- Core (bright purple center) ---
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xcc66ff,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.core = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 6, 6),
      coreMaterial
    );
    this.mesh.add(this.core);
    
    // Add to scene but keep hidden until spawned
    scene.add(this.mesh);
    this.mesh.visible = false;
    
    this.velocity = new THREE.Vector3(0, 0, 0);
  }

  /**
   * Activates the missile at the given position with an initial velocity.
   * 
   * @param position - The spawn position
   * @param initialVelocity - The initial velocity vector
   */
  public spawn(position: { x: number; y: number; z: number }, initialVelocity: THREE.Vector3): void {
    this.mesh.position.set(position.x, position.y, position.z);
    this.velocity.copy(initialVelocity);
    this.active = true;
    this.lifetime = 5.0;
    this.age = 0;
    this.pulseTime = 0;
    this.mesh.visible = true;
  }

  /**
   * Updates the missile — steers toward the player and moves.
   * 
   * @param delta - Time elapsed since last frame in seconds
   * @param playerPosition - The player's current position
   */
  public update(delta: number, playerPosition: { x: number; y: number; z: number }): void {
    if (!this.active) return;
    
    this.pulseTime += delta;
    this.lifetime -= delta;
    this.age += delta;
    
    // --- Steering behavior ---
    // Calculate direction to player
    const dx = playerPosition.x - this.mesh.position.x;
    const dy = playerPosition.y - this.mesh.position.y;
    const dz = playerPosition.z - this.mesh.position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    if (distance > 0.001) {
      // Desired direction (normalized)
      const desiredDir = new THREE.Vector3(dx / distance, dy / distance, dz / distance);
      const speed = this.velocity.length();
      
      // Homing intensity: full steering for the agility window, then fades out
      // so the missile eventually flies straight and becomes dodgeable.
      const fadingTime = this.age - this.agilityTime;
      const homing = fadingTime < 0 ? 1 : Math.max(0, 1 - fadingTime / this.coastTime);
      
      if (homing > 0) {
        if (speed > 0.001) {
          // Limit the turn rate instead of snapping toward the player
          const currentDir = this.velocity.clone().normalize();
          const dot = THREE.MathUtils.clamp(currentDir.dot(desiredDir), -1, 1);
          const angleBetween = Math.acos(dot);
          const turn = Math.min(angleBetween, this.turnRate * homing * delta);
          
          if (turn < angleBetween - 0.0001 && angleBetween > 0.0001) {
            const axis = new THREE.Vector3().crossVectors(currentDir, desiredDir);
            if (axis.lengthSq() > 0.0001) {
              axis.normalize();
              currentDir.applyAxisAngle(axis, turn);
            } else {
              currentDir.copy(desiredDir);
            }
          } else {
            currentDir.copy(desiredDir);
          }
          
          // Accelerate toward max speed
          const newSpeed = THREE.MathUtils.lerp(speed, this.maxSpeed, Math.min(1, this.acceleration * delta));
          this.velocity.copy(currentDir.multiplyScalar(newSpeed));
        } else {
          // Launch: head toward the player at reduced initial speed
          this.velocity.copy(desiredDir.multiplyScalar(this.maxSpeed * 0.5));
        }
      } else {
        // Homing exhausted — continue on the current heading at max speed
        if (speed > 0.001) {
          const dir = this.velocity.clone().normalize();
          const newSpeed = THREE.MathUtils.lerp(speed, this.maxSpeed, Math.min(1, this.acceleration * delta));
          this.velocity.copy(dir.multiplyScalar(newSpeed));
        }
      }
    }
    
    // Move missile
    this.mesh.position.addScaledVector(this.velocity, delta);
    
    // Rotate missile to face direction of travel
    if (this.velocity.length() > 0.1) {
      const angle = Math.atan2(-this.velocity.x, this.velocity.y);
      this.mesh.rotation.z = angle;
    }
    
    // Pulse animation
    const pulse = Math.sin(this.pulseTime * 8) * 0.5 + 0.5;
    const scale = 1 + pulse * 0.3;
    this.core.scale.set(scale, scale, scale);
    (this.core.material as THREE.MeshBasicMaterial).opacity = 0.7 + pulse * 0.3;
    
    // Deactivate if lifetime expired or off-screen
    if (this.lifetime <= 0 || 
        this.mesh.position.y < -12 || this.mesh.position.y > 12 ||
        this.mesh.position.x < -12 || this.mesh.position.x > 12) {
      this.deactivate();
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
   * Returns the Axis-Aligned Bounding Box for collision detection.
   * 
   * @returns {THREE.Box3} The missile's bounding box
   */
  public getBounds(): THREE.Box3 {
    const halfSize = 0.25;
    const pos = this.mesh.position;
    return new THREE.Box3(
      new THREE.Vector3(pos.x - halfSize, pos.y - halfSize, pos.z - halfSize),
      new THREE.Vector3(pos.x + halfSize, pos.y + halfSize, pos.z + halfSize)
    );
  }

  /**
   * Disposes the missile's mesh and materials.
   * 
   * @param scene - The scene to remove the mesh from
   */
  public dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          for (const material of materials) material.dispose();
        }
      }
    });
  }
}

/**
 * VoidReaverBoss — the Level 2 boss for StarForge Strike.
 * 
 * An organic-mechanical hybrid with tentacle-like appendages and a pulsing void core.
 * The boss descends into position at the top of the screen, then hovers with a
 * subtle bobbing motion while firing increasingly complex attack patterns.
 * 
 * Attack phases based on health thresholds:
 *   - Phase 1 (100-50% HP): Homing missile volleys (3-5 missiles every 3s)
 *   - Phase 2 (50-25% HP): Alternates homing missiles and radial bursts (every 2s)
 *   - Phase 3 (25-0% HP): Homing missiles on every attack (increased frequency),
 *     alternating spiral and aimed patterns on top (every 1.5s)
 */
export class VoidReaverBoss {
  /** The THREE.js group containing all boss geometry */
  public readonly mesh: THREE.Group;
  
  /** Whether the boss is currently active */
  public active: boolean = false;
  
/** Current health points */
  public health: number = 3000;

  /** Maximum health points */
  public readonly maxHealth: number = 3000;
  
  /** Time remaining before the next attack (seconds) */
  public fireCooldown: number = 0;
  
      /** Base time between attacks (seconds) */
  public fireRate: number = 3.0;
  
  /** Multiplier for bullet speeds (level-based difficulty scaling) */
  public bulletSpeedMultiplier: number = 1.0;
  
  /** Whether the boss fired this frame (for screen shake effects) */
  public justFired: boolean = false;
  
  /** Total elapsed time since spawn (seconds) */
  public elapsedTime: number = 0;
  
  /** The THREE.js scene this boss belongs to */
  private scene: THREE.Scene;
  
  /** Unique identifier for this boss */
  private id: number;
  
  /** Whether the boss is currently descending into position */
  private descending: boolean = false;
  
  /** Target Y position for the boss to hover at */
  private readonly hoverY: number = 7;
  
  /** Descent speed (units per second) */
  private readonly descentSpeed: number = 1.2;
  
  /** Base Y position for bobbing animation */
  private baseY: number = 0;
  
  /** Time accumulator for bobbing animation */
  private bobTime: number = 0;
  
  /** Time accumulator for void core pulse animation */
  private corePulseTime: number = 0;
  
  /** Time accumulator for tentacle sway animation */
  private tentacleSwayTime: number = 0;
  
  /** Time accumulator for warning light pulse animation */
  private warningPulseTime: number = 0;
  
  /** Current spiral angle for Phase 3 attacks */
  private spiralAngle: number = 0;
  
  /** Whether the next Phase 3 attack should be spiral or aimed */
  private phase3Alternator: boolean = true;
  
  /** Whether the next Phase 2 attack should be homing or radial */
  private phase2Alternator: boolean = true;
  
  /** Reference to the void core mesh for pulse animation */
  private voidCore: THREE.Mesh | null = null;
  
  /** Reference to the void core outer glow mesh */
  private voidCoreGlow: THREE.Mesh | null = null;
  
  /** Array of tentacle meshes for sway animation */
  private tentacles: THREE.Mesh[] = [];
  
  /** Array of warning light meshes for pulse animation */
  private warningLights: THREE.Mesh[] = [];

  /** Twin gyroscope rings orbiting the void core */
  private orbitingRings: THREE.Mesh[] = [];
  
  /** Array of active homing missiles */
  private missiles: HomingMissile[] = [];
  
  /** Whether this boss has been disposed */
  private isDisposed: boolean = false;

  /** Flash-on-hit effect for the boss mesh */
  private readonly hitFlash: HitFlash;

  /**
   * Creates a new VoidReaverBoss.
   * Builds all visual geometry and adds the mesh to the scene (hidden).
   * 
   * @param scene - The THREE.js scene to add the boss to
   * @param id - Unique identifier for this boss
   */
  constructor(scene: THREE.Scene, id: number) {
    this.scene = scene;
    this.id = id;
    
    // Build the boss mesh
    this.mesh = new THREE.Group();
    this.buildMainBody();
    this.buildArmorPlates();
    this.buildVoidCore();
    this.buildTentacles();
    this.buildGlowingAccents();
    this.buildWarningLights();
    this.buildSpikes();
    this.buildOrbitingRings();
    
    // Add to scene but keep hidden until spawned
    scene.add(this.mesh);
    this.mesh.visible = false;
    this.hitFlash = new HitFlash(this.mesh);
  }

  /**
   * Activates the boss at the given position.
   * The boss starts descending toward its hover position.
   * 
   * @param position - The spawn position (typically above the screen)
   */
  public spawn(position: { x: number; y: number; z: number }): void {
    this.mesh.position.set(position.x, position.y, position.z);
    this.hitFlash.reset();
    this.active = true;
    this.descending = true;
    this.health = this.maxHealth;
        this.fireCooldown = 2.0; // Initial delay before first attack
    this.elapsedTime = 0;
    this.justFired = false;
    this.bobTime = 0;
    this.corePulseTime = 0;
    this.tentacleSwayTime = 0;
    this.warningPulseTime = 0;
    this.spiralAngle = 0;
    this.phase3Alternator = true;
    this.phase2Alternator = true;
    this.mesh.visible = true;
    
    // Deactivate any leftover missiles
    for (const missile of this.missiles) {
      missile.deactivate();
    }
  }

  /**
   * Updates the boss — handles movement, firing, missile tracking, and animations.
   * 
   * @param delta - Time elapsed since last frame in seconds
   * @param bulletPool - The enemy bullet pool to spawn bullets from
   * @param playerPosition - The player's current position (for aimed attacks)
   */
  public update(
    delta: number,
    bulletPool: EnemyBulletPool,
    playerPosition: { x: number; y: number; z: number }
  ): void {
        if (!this.active) return;
    
    // Reset one-frame flag
    this.justFired = false;
    
    this.elapsedTime += delta;
    
    // Advance the hit flash effect
    this.hitFlash.update(delta);
    
    // Handle movement
    if (this.descending) {
      // Descend toward hover position
      const targetY = this.hoverY;
      const currentY = this.mesh.position.y;
      
      if (currentY > targetY) {
        const newY = Math.max(currentY - this.descentSpeed * delta, targetY);
        this.mesh.position.y = newY;
      } else {
        // Reached hover position
        this.descending = false;
        this.baseY = this.mesh.position.y;
      }
    } else {
      // Hover with bobbing motion
      this.bobTime += delta;
      const bobOffset = Math.sin(this.bobTime * 1.2) * 0.3;
      this.mesh.position.y = this.baseY + bobOffset;
    }
    
    // Decrement fire cooldown
    if (this.fireCooldown > 0) {
      this.fireCooldown = Math.max(0, this.fireCooldown - delta);
    }
    
    // Fire when ready
        if (this.fireCooldown <= 0) {
      this.fire(bulletPool, playerPosition);
      this.justFired = true; // Mark that the boss fired this frame
      // Reset cooldown based on phase (faster in later phases)
      const phase = this.getPhase();
      this.fireCooldown = this.fireRate / (phase === 3 ? 2.0 : phase === 2 ? 1.5 : 1.0);
    }
    
    // Update homing missiles
    this.updateMissiles(delta, playerPosition);
    
    // Update animations
    this.updateAnimations(delta);
  }

  /**
   * Applies damage to the boss.
   * 
   * @param amount - Amount of damage to apply
   * @returns {boolean} True if the boss is destroyed (health <= 0)
   */
  public takeDamage(amount: number): boolean {
    if (!this.active) return false;
    this.health -= amount;
    this.hitFlash.trigger();
    return this.health <= 0;
  }

  /**
   * Returns the Axis-Aligned Bounding Box (AABB) of the boss
   * for collision detection.
   * 
   * @returns {THREE.Box3} The boss's bounding box in world space
   */
  public getBounds(): THREE.Box3 {
    // Main body dimensions: radius ~1.5 sphere
    const halfSize = 1.5;
    
    const pos = this.mesh.position;
    return new THREE.Box3(
      new THREE.Vector3(pos.x - halfSize, pos.y - halfSize, pos.z - halfSize),
      new THREE.Vector3(pos.x + halfSize, pos.y + halfSize, pos.z + halfSize)
    );
  }

  /**
   * Deactivates the boss and hides it.
   * Also deactivates all active homing missiles.
   */
  public deactivate(): void {
    this.active = false;
    this.descending = false;
    this.mesh.visible = false;
    this.hitFlash.reset();
    
    // Deactivate all missiles
    for (const missile of this.missiles) {
      missile.deactivate();
    }
  }

  /**
   * Returns the current attack phase based on health percentage.
   * 
   * @returns {number} 1, 2, or 3
   */
  public getPhase(): number {
    const healthPercent = this.health / this.maxHealth;
    if (healthPercent > 0.5) return 1;
    if (healthPercent > 0.25) return 2;
    return 3;
  }

  /**
   * Returns whether the boss is still descending into position.
   * 
   * @returns {boolean} True if the boss is descending
   */
  public isDescending(): boolean {
    return this.descending;
  }

  /**
   * Returns the array of active homing missiles.
   * Used for collision detection with the player.
   * 
   * @returns {HomingMissile[]} Array of active missiles
   */
  public getActiveMissiles(): HomingMissile[] {
    return this.missiles.filter((m) => m.active);
  }

  /**
   * Disposes all resources used by this boss.
   * Removes the mesh from the scene and disposes all geometries and materials.
   */
  public dispose(): void {
    if (this.isDisposed) return;
    
    // Remove from scene
    this.scene.remove(this.mesh);
    
    // Dispose all geometries and materials
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          for (const material of materials) {
            material.dispose();
          }
        }
      }
    });
    
    // Dispose all missiles
    for (const missile of this.missiles) {
      missile.dispose(this.scene);
    }
    this.missiles = [];
    
    this.isDisposed = true;
  }

  /**
   * Fires an attack based on the current phase.
   * 
   * @param bulletPool - The enemy bullet pool to spawn bullets from
   * @param playerPosition - The player's current position
   */
  private fire(bulletPool: EnemyBulletPool, playerPosition: { x: number; y: number; z: number }): void {
    const phase = this.getPhase();
    const pos = this.mesh.position;
    
    switch (phase) {
      case 1:
        this.fireHomingMissiles(bulletPool, playerPosition);
        break;
      case 2:
        // Alternate between homing missiles and radial bursts
        if (this.phase2Alternator) {
          this.fireHomingMissiles(bulletPool, playerPosition);
        } else {
          this.fireRadialBurst(bulletPool);
        }
        this.phase2Alternator = !this.phase2Alternator;
        break;
      case 3:
        // Missiles fire on EVERY attack (increased frequency in the later
        // stage), alternating spiral and aimed bullet patterns on top.
        this.fireHomingMissiles(bulletPool, playerPosition);
        if (this.phase3Alternator) {
          this.fireSpiral(bulletPool);
        } else {
          this.fireAimedBurst(bulletPool, playerPosition);
        }
        this.phase3Alternator = !this.phase3Alternator;
        break;
    }
  }

  /**
   * Launches 3-5 homing missiles that track the player.
   * Missiles spawn from the boss and accelerate toward the player with steering behavior.
   * 
   * @param bulletPool - The enemy bullet pool (unused for missiles but kept for interface consistency)
   * @param playerPosition - The player's current position
   */
  private fireHomingMissiles(bulletPool: EnemyBulletPool, playerPosition: { x: number; y: number; z: number }): void {
    // More missiles per volley in the later stages of the fight
    const phase = this.getPhase();
    const missileCount = phase === 3
      ? 4 + Math.floor(Math.random() * 3) // 4-6 missiles in the final phase
      : 3 + Math.floor(Math.random() * 3); // 3-5 missiles otherwise
    const pos = this.mesh.position;
    
    for (let i = 0; i < missileCount; i++) {
      // Find an inactive missile or create a new one
      let missile = this.missiles.find((m) => !m.active);
      if (!missile) {
        missile = new HomingMissile(this.scene);
        this.missiles.push(missile);
      }
      
      // Spawn missile at boss position with slight random offset
      const offsetX = (Math.random() - 0.5) * 1.0;
      const offsetY = (Math.random() - 0.5) * 0.5;
      
      // Initial velocity: downward with slight random spread
      const initialVelocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        -3 - Math.random() * 2,
        0
      );
      
      missile.spawn(
        { x: pos.x + offsetX, y: pos.y - 1.0 + offsetY, z: pos.z },
        initialVelocity
      );
    }
  }

  /**
   * Fires 8-12 bullets in a circle expanding outward from the boss center.
   * 
   * @param bulletPool - The enemy bullet pool to spawn bullets from
   */
  private fireRadialBurst(bulletPool: EnemyBulletPool): void {
        const bulletCount = 8 + Math.floor(Math.random() * 5); // 8-12 bullets
    const speed = 5 * this.bulletSpeedMultiplier;
    const pos = this.mesh.position;
    
    for (let i = 0; i < bulletCount; i++) {
      const angle = (2 * Math.PI * i) / bulletCount;
      
      const bullet = bulletPool.get();
      if (bullet) {
        bullet.spawn({ x: pos.x, y: pos.y, z: pos.z }, speed);
        bullet.velocity.set(
          Math.sin(angle) * speed,
          Math.cos(angle) * speed,
          0
        );
      }
    }
  }

  /**
   * Fires bullets in a rotating spiral pattern.
   * Each shot rotates the angle by a fixed increment.
   * 
   * @param bulletPool - The enemy bullet pool to spawn bullets from
   */
    private fireSpiral(bulletPool: EnemyBulletPool): void {
    const speed = 5 * this.bulletSpeedMultiplier;
    const angleIncrement = Math.PI / 8; // 22.5 degrees per shot
    const pos = this.mesh.position;
    
    // Fire 2 bullets per shot (opposite sides of the spiral)
    for (let i = 0; i < 2; i++) {
      const angle = this.spiralAngle + i * Math.PI;
      
      const bullet = bulletPool.get();
      if (bullet) {
        bullet.spawn({ x: pos.x, y: pos.y, z: pos.z }, speed);
        bullet.velocity.set(
          Math.sin(angle) * speed,
          Math.cos(angle) * speed,
          0
        );
      }
    }
    
    // Advance the spiral angle
    this.spiralAngle += angleIncrement;
    if (this.spiralAngle >= Math.PI * 2) {
      this.spiralAngle -= Math.PI * 2;
    }
  }

  /**
   * Fires a burst of bullets aimed at the player position.
   * 
   * @param bulletPool - The enemy bullet pool to spawn bullets from
   * @param playerPosition - The player's current position
   */
  private fireAimedBurst(bulletPool: EnemyBulletPool, playerPosition: { x: number; y: number; z: number }): void {
    const pos = this.mesh.position;
    
    // Calculate direction to player
    const dx = playerPosition.x - pos.x;
    const dy = playerPosition.y - pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 0.001) return;
    
    // Base angle to player
    const baseAngle = Math.atan2(dx, dy);
    
        // Fire 3 bullets in a tight cone around the player direction
    const speed = 8 * this.bulletSpeedMultiplier;
    const burstSpread = 0.12; // ~6.9 degrees
    
    for (let i = -1; i <= 1; i++) {
      const angle = baseAngle + i * burstSpread;
      
      const bullet = bulletPool.get();
      if (bullet) {
        bullet.spawn({ x: pos.x, y: pos.y, z: pos.z }, speed);
        bullet.velocity.set(
          Math.sin(angle) * speed,
          Math.cos(angle) * speed,
          0
        );
      }
    }
  }

  /**
   * Updates all active homing missiles.
   * 
   * @param delta - Time elapsed since last frame in seconds
   * @param playerPosition - The player's current position
   */
  private updateMissiles(delta: number, playerPosition: { x: number; y: number; z: number }): void {
    for (const missile of this.missiles) {
      if (missile.active) {
        missile.update(delta, playerPosition);
      }
    }
  }

  /**
   * Updates all visual animations — void core pulse, tentacle sway, warning lights.
   * 
   * @param delta - Time elapsed since last frame in seconds
   */
  private updateAnimations(delta: number): void {
    // Void core pulse animation
    this.corePulseTime += delta;
    const corePulse = Math.sin(this.corePulseTime * 3) * 0.5 + 0.5; // 0 to 1
    
    if (this.voidCore) {
      const scale = 1 + corePulse * 0.4;
      this.voidCore.scale.set(scale, scale, scale);
      const material = this.voidCore.material as THREE.MeshBasicMaterial;
      material.opacity = 0.7 + corePulse * 0.3;
    }
    
    // Void core outer glow pulse
    if (this.voidCoreGlow) {
      const glowScale = 1 + corePulse * 0.6;
      this.voidCoreGlow.scale.set(glowScale, glowScale, glowScale);
      const material = this.voidCoreGlow.material as THREE.MeshBasicMaterial;
      material.opacity = 0.2 + corePulse * 0.3;
    }
    
    // Tentacle sway animation
    this.tentacleSwayTime += delta;
    for (let i = 0; i < this.tentacles.length; i++) {
      const tentacle = this.tentacles[i];
      const sway = Math.sin(this.tentacleSwayTime * 2 + i * 0.8) * 0.15;
      tentacle.rotation.z = sway;
    }
    
    // Warning light pulse animation
    this.warningPulseTime += delta;
    const warningPulse = Math.sin(this.warningPulseTime * 5) * 0.5 + 0.5;
    for (const light of this.warningLights) {
      const material = light.material as THREE.MeshBasicMaterial;
      material.opacity = 0.5 + warningPulse * 0.5;
      const scale = 1 + warningPulse * 0.3;
      light.scale.set(scale, scale, scale);
    }

    // Orbiting rings — slowly rotate and wobble around the void core
    for (let i = 0; i < this.orbitingRings.length; i++) {
      const ring = this.orbitingRings[i];
      const baseTilt = Math.PI / 2 + (i % 2 === 0 ? 0.5 : -0.8);
      ring.rotation.x = baseTilt + Math.sin(this.corePulseTime * 0.9 + i) * 0.35;
      ring.rotation.y += delta * (i % 2 === 0 ? 1.1 : -1.4);
    }
  }

  /**
   * Builds the main body — a dark purple/black organic sphere.
   */
  private buildMainBody(): void {
    // Main organic body
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a1030,
      metalness: 0.3,
      roughness: 0.7,
    });
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 16, 16),
      bodyMaterial
    );
    body.scale.set(1.2, 1.0, 0.8);
    this.mesh.add(body);
    
    // Inner organic layer (slightly lighter purple)
    const innerMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a1a4a,
      metalness: 0.2,
      roughness: 0.8,
    });
    const inner = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 12, 12),
      innerMaterial
    );
    inner.scale.set(1.2, 1.0, 0.8);
    this.mesh.add(inner);
  }

  /**
   * Builds angular armor plates on the body for the mechanical aspect.
   */
  private buildArmorPlates(): void {
    const plateMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a0a20,
      metalness: 0.7,
      roughness: 0.4,
    });
    
    // Top armor plate
    const topPlate = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.3, 1.2),
      plateMaterial
    );
    topPlate.position.set(0, 1.2, 0);
    topPlate.rotation.z = 0.1;
    this.mesh.add(topPlate);
    
    // Bottom armor plate
    const bottomPlate = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.3, 1.0),
      plateMaterial
    );
    bottomPlate.position.set(0, -1.2, 0);
    bottomPlate.rotation.z = -0.1;
    this.mesh.add(bottomPlate);
    
    // Left armor plate
    const leftPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 1.8, 1.0),
      plateMaterial
    );
    leftPlate.position.set(-1.4, 0, 0);
    leftPlate.rotation.z = 0.2;
    this.mesh.add(leftPlate);
    
    // Right armor plate
    const rightPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 1.8, 1.0),
      plateMaterial
    );
    rightPlate.position.set(1.4, 0, 0);
    rightPlate.rotation.z = -0.2;
    this.mesh.add(rightPlate);
    
    // Front armor plate (facing downward)
    const frontPlate = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.4, 0.8),
      plateMaterial
    );
    frontPlate.position.set(0, -0.8, 0);
    this.mesh.add(frontPlate);
  }

  /**
   * Builds the pulsing void core — a glowing purple/black sphere in the center.
   */
  private buildVoidCore(): void {
    // Inner dark core
    const darkCoreMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0010,
      metalness: 0.5,
      roughness: 0.3,
      emissive: 0x220033,
      emissiveIntensity: 0.5,
    });
    const darkCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 12, 12),
      darkCoreMaterial
    );
    this.mesh.add(darkCore);
    
    // Glowing purple core (additive blending)
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xaa44ff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.voidCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 12, 12),
      coreMaterial
    );
    this.mesh.add(this.voidCore);
    
    // Outer glow ring
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xaa44ff,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.voidCoreGlow = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.08, 8, 16),
      glowMaterial
    );
    this.voidCoreGlow.rotation.x = Math.PI / 2;
    this.mesh.add(this.voidCoreGlow);
  }

  /**
   * Builds 4-6 curved tentacle appendages extending from the body.
   * Dark purple material with glowing purple tips.
   */
  private buildTentacles(): void {
    const tentacleMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a1a4a,
      metalness: 0.3,
      roughness: 0.7,
    });
    
    const tipMaterial = new THREE.MeshBasicMaterial({
      color: 0xcc66ff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    // Tentacle configurations: angle, radius, length
    const tentacleConfigs = [
      { angle: 0, radius: 1.8, length: 1.2 },
      { angle: Math.PI / 3, radius: 1.8, length: 1.0 },
      { angle: 2 * Math.PI / 3, radius: 1.8, length: 1.3 },
      { angle: Math.PI, radius: 1.8, length: 1.1 },
      { angle: 4 * Math.PI / 3, radius: 1.8, length: 1.2 },
      { angle: 5 * Math.PI / 3, radius: 1.8, length: 1.0 },
    ];
    
    for (const config of tentacleConfigs) {
      // Curved tentacle using torus segment
      const tentacle = new THREE.Mesh(
        new THREE.TorusGeometry(config.length, 0.12, 8, 12, Math.PI / 2),
        tentacleMaterial
      );
      
      // Position tentacle at the edge of the body
      tentacle.position.set(
        Math.cos(config.angle) * config.radius * 0.7,
        Math.sin(config.angle) * config.radius * 0.7,
        0
      );
      
      // Rotate tentacle to extend outward
      tentacle.rotation.z = config.angle;
      tentacle.rotation.x = Math.PI / 2;
      
      this.mesh.add(tentacle);
      this.tentacles.push(tentacle);
      
      // Glowing tip at the end of the tentacle
      const tipX = Math.cos(config.angle) * (config.radius * 0.7 + config.length * 0.8);
      const tipY = Math.sin(config.angle) * (config.radius * 0.7 + config.length * 0.8);
      
      const tip = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        tipMaterial
      );
      tip.position.set(tipX, tipY, 0);
      this.mesh.add(tip);
    }
  }

  /**
   * Builds glowing purple emissive strips/rings on the body.
   */
  private buildGlowingAccents(): void {
    const accentMaterial = new THREE.MeshBasicMaterial({
      color: 0xaa44ff,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    // Horizontal ring around the body
    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.4, 0.06, 8, 24),
      accentMaterial
    );
    ring1.rotation.x = Math.PI / 2;
    this.mesh.add(ring1);
    
    // Vertical ring
    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.3, 0.05, 8, 24),
      accentMaterial
    );
    ring2.rotation.y = Math.PI / 2;
    this.mesh.add(ring2);
    
    // Diagonal ring
    const ring3 = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.04, 8, 24),
      accentMaterial
    );
    ring3.rotation.x = Math.PI / 3;
    ring3.rotation.y = Math.PI / 4;
    this.mesh.add(ring3);
  }

  /**
   * Builds small red/orange warning lights for the mechanical hybrid feel.
   */
  private buildWarningLights(): void {
    const warningMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    const lightGeometry = new THREE.SphereGeometry(0.12, 8, 8);
    
    // Warning lights on armor plates
    const lightPositions = [
      { x: -1.4, y: 1.2, z: 0.5 },
      { x: 1.4, y: 1.2, z: 0.5 },
      { x: -1.4, y: -1.2, z: 0.5 },
      { x: 1.4, y: -1.2, z: 0.5 },
      { x: 0, y: 1.2, z: 0.5 },
      { x: 0, y: -1.2, z: 0.5 },
    ];
    
    for (const pos of lightPositions) {
      const light = new THREE.Mesh(lightGeometry, warningMaterial);
      light.position.set(pos.x, pos.y, pos.z);
      this.mesh.add(light);
      this.warningLights.push(light);
    }
  }

  /**
   * Builds jagged crystalline spikes on the shell for a more menacing silhouette.
   * Each spike gets a glowing purple tip.
   */
  private buildSpikes(): void {
    const spikeMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a1a4a,
      metalness: 0.4,
      roughness: 0.5,
    });
    const spikeTipMaterial = new THREE.MeshBasicMaterial({
      color: 0xcc66ff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Spikes radiating outward around the body shell
    const spikeAngles = [0.4, 1.2, 2.0, 2.8, 3.6, 4.4, 5.2];
    for (let i = 0; i < spikeAngles.length; i++) {
      const angle = spikeAngles[i];
      const outer = i % 2 === 0 ? 1.7 : 1.4;

      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 5), spikeMaterial);
      spike.position.set(Math.cos(angle) * outer, Math.sin(angle) * outer * 0.9, 0);
      spike.rotation.z = angle + Math.PI / 2;
      this.mesh.add(spike);

      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), spikeTipMaterial);
      tip.position.set(Math.cos(angle) * (outer + 0.38), Math.sin(angle) * (outer + 0.38) * 0.9, 0);
      this.mesh.add(tip);
    }

    // Tall forward horn on the top of the shell
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.0, 6), spikeMaterial);
    horn.position.set(0, 1.4, 0);
    this.mesh.add(horn);

    const hornTip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), spikeTipMaterial);
    hornTip.position.set(0, 1.95, 0);
    this.mesh.add(hornTip);
  }

  /**
   * Builds twin gyroscope rings orbiting the void core.
   */
  private buildOrbitingRings(): void {
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xaa44ff,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    for (let i = 0; i < 2; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.8 + i * 0.35, 0.05, 8, 32), ringMaterial);
      ring.position.set(0, 0, 0);
      ring.rotation.x = Math.PI / 2 + i * 0.6;
      this.mesh.add(ring);
      this.orbitingRings.push(ring);
    }
  }
}