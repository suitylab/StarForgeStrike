import * as THREE from 'three';
import { EnemyBulletPool } from './EnemyBulletPool';

/**
 * LaserBarrageShot — an internal class for the SovereignBoss.
 * 
 * A fast bullet aimed at the player position with a delay before firing.
 * Used for the Phase 2 and Phase 3 laser barrage attacks.
 */
class LaserBarrageShot {
  /** The THREE.js group containing the shot mesh */
  public readonly mesh: THREE.Group;
  
  /** Current velocity vector (units per second) */
  public velocity: THREE.Vector3;
  
  /** Whether this shot is currently active */
  public active: boolean = false;
  
  /** Time remaining before the shot fires (seconds) */
  public delay: number = 0;
  
  /** Time elapsed since the shot was queued (seconds) */
  public elapsed: number = 0;
  
  /** Speed of the shot (units per second) */
  public readonly speed: number = 14;
  
  /** Reference to the core mesh for pulse animation */
  private core: THREE.Mesh;
  
  /** Reference to the trail mesh for animation */
  private trail: THREE.Mesh;

  /**
   * Creates a new laser barrage shot.
   * Builds the mesh and adds it to the scene (hidden).
   * 
   * @param scene - The THREE.js scene to add the shot to
   */
  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.Group();
    
    // --- Main body (elongated gold/white bolt) ---
    const bodyMaterial = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 0.8, 8),
      bodyMaterial
    );
    body.rotation.x = Math.PI / 2; // Align along Y-axis
    this.mesh.add(body);
    
    // --- Core (bright white center) ---
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.core = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 8),
      coreMaterial
    );
    this.mesh.add(this.core);
    
    // --- Trail (elongated cone behind) ---
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.trail = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.6, 8),
      trailMaterial
    );
    this.trail.rotation.x = Math.PI; // Point backward
    this.trail.position.y = -0.5;
    this.mesh.add(this.trail);
    
    // Add to scene but keep hidden until spawned
    scene.add(this.mesh);
    this.mesh.visible = false;
    
    this.velocity = new THREE.Vector3(0, 0, 0);
  }

  /**
   * Queues the shot at the given position with a delay.
   * The shot will fire after the delay expires.
   * 
   * @param position - The spawn position
   * @param delay - Delay before the shot fires (seconds)
   */
  public queue(position: { x: number; y: number; z: number }, delay: number): void {
    this.mesh.position.set(position.x, position.y, position.z);
    this.active = true;
    this.delay = delay;
    this.elapsed = 0;
    this.mesh.visible = true;
    this.velocity.set(0, 0, 0);
  }

  /**
   * Updates the shot — counts down the delay, then moves the shot.
   * 
   * @param delta - Time elapsed since last frame in seconds
   */
  public update(delta: number): void {
    if (!this.active) return;
    
    this.elapsed += delta;
    
    if (this.delay > 0) {
      // Still waiting to fire — pulse the core
      this.delay -= delta;
      const pulse = Math.sin(this.elapsed * 20) * 0.5 + 0.5;
      const scale = 1 + pulse * 0.3;
      this.core.scale.set(scale, scale, scale);
      (this.core.material as THREE.MeshBasicMaterial).opacity = 0.7 + pulse * 0.3;
      return;
    }
    
    // Move the shot
    this.mesh.position.addScaledVector(this.velocity, delta);
    
    // Pulse animation while moving
    const pulse = Math.sin(this.elapsed * 10) * 0.5 + 0.5;
    const scale = 1 + pulse * 0.2;
    this.core.scale.set(scale, scale, scale);
    (this.core.material as THREE.MeshBasicMaterial).opacity = 0.8 + pulse * 0.2;
    
    // Deactivate if off-screen
    if (this.mesh.position.y < -12 || this.mesh.position.y > 12 ||
        this.mesh.position.x < -12 || this.mesh.position.x > 12) {
      this.deactivate();
    }
  }

  /**
   * Fires the shot in the given direction.
   * 
   * @param direction - The direction vector (normalized)
   */
  public fire(direction: THREE.Vector3): void {
    this.velocity.copy(direction).multiplyScalar(this.speed);
    this.delay = 0;
  }

  /**
   * Deactivates the shot and hides it.
   */
  public deactivate(): void {
    this.active = false;
    this.mesh.visible = false;
  }

  /**
   * Returns the Axis-Aligned Bounding Box for collision detection.
   * 
   * @returns {THREE.Box3} The shot's bounding box
   */
  public getBounds(): THREE.Box3 {
    const halfSize = 0.15;
    const pos = this.mesh.position;
    return new THREE.Box3(
      new THREE.Vector3(pos.x - halfSize, pos.y - halfSize, pos.z - halfSize),
      new THREE.Vector3(pos.x + halfSize, pos.y + halfSize, pos.z + halfSize)
    );
  }

  /**
   * Disposes the shot's mesh and materials.
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
 * SovereignBoss — the Level 3 final boss for StarForge Strike.
 * 
 * A colossal flagship with a glowing command spire and multiple turret banks.
 * The boss descends into position at the top of the screen, then hovers with
 * a subtle side-to-side drift while firing increasingly complex attack patterns.
 * 
 * Attack phases based on health thresholds:
 *   - Phase 1 (100-50% HP): Multi-directional bullet walls
 *   - Phase 2 (50-25% HP): Adds targeted laser barrages
 *   - Phase 3 (25-0% HP): Combines all patterns with increased speed
 */
export class SovereignBoss {
  /** The THREE.js group containing all boss geometry */
  public readonly mesh: THREE.Group;
  
  /** Whether the boss is currently active */
  public active: boolean = false;
  
/** Current health points */
  public health: number = 2500;

  /** Maximum health points */
  public readonly maxHealth: number = 2500;
  
  /** Time remaining before the next attack (seconds) */
  public fireCooldown: number = 0;
  
      /** Base time between attacks (seconds) */
  public fireRate: number = 1.5;
  
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
  private readonly descentSpeed: number = 1.0;
  
  /** Base X position for side-to-side drift */
  private baseX: number = 0;
  
  /** Time accumulator for side-to-side drift */
  private driftTime: number = 0;
  
  /** Time accumulator for command spire pulse animation */
  private spirePulseTime: number = 0;
  
  /** Time accumulator for energy core pulse animation */
  private corePulseTime: number = 0;
  
  /** Time accumulator for accent light pulse animation */
  private accentPulseTime: number = 0;
  
  /** Time accumulator for warning light pulse animation */
  private warningPulseTime: number = 0;
  
  /** Time accumulator for engine glow pulse animation */
  private enginePulseTime: number = 0;
  
  /** Time accumulator for turret glow pulse animation */
  private turretPulseTime: number = 0;
  
  /** Direction of the next bullet wall (true = left-to-right, false = right-to-left) */
  private bulletWallDirection: boolean = true;
  
  /** Whether the next Phase 3 attack should be a radial burst */
  private phase3RadialAlternator: boolean = false;
  
  /** Array of queued laser barrage shots */
  private laserBarrageQueue: LaserBarrageShot[] = [];
  
  /** Reference to the command spire mesh for pulse animation */
  private commandSpire: THREE.Mesh | null = null;
  
  /** Reference to the command spire glow sphere */
  private spireGlow: THREE.Mesh | null = null;
  
  /** Reference to the energy core mesh for pulse animation */
  private energyCore: THREE.Mesh | null = null;
  
  /** Reference to the energy core outer glow */
  private energyCoreGlow: THREE.Mesh | null = null;
  
  /** Array of turret bank meshes for glow animation */
  private turretBanks: THREE.Mesh[] = [];
  
  /** Array of gold accent light meshes for pulse animation */
  private accentLights: THREE.Mesh[] = [];
  
  /** Array of warning light meshes for pulse animation */
  private warningLights: THREE.Mesh[] = [];
  
  /** Array of engine glow meshes for pulse animation */
  private engineGlows: THREE.Mesh[] = [];
  
/** Reference to the golden glow ring for entrance effect */
  private glowRing: THREE.Mesh | null = null;

  /** Golden halo ring hovering above the command spire */
  private haloRing: THREE.Mesh | null = null;

  /** Glowing prow core mesh for pulse animation */
  private prowGlow: THREE.Mesh | null = null;

  /** Wing sail meshes for pulse animation */
  private wingSails: THREE.Mesh[] = [];

  /** Whether this boss has been disposed */
  private isDisposed: boolean = false;

  /**
   * Creates a new SovereignBoss.
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
    this.buildMainHull();
    this.buildArmorPlates();
    this.buildGoldTrim();
    this.buildTurretBanks();
    this.buildCommandSpire();
    this.buildEnergyCore();
    this.buildEngineGlows();
    this.buildAccentLights();
    this.buildWarningLights();
    this.buildGlowRing();
    this.buildProw();
    this.buildWingSails();
    this.buildHaloRing();
    
    // Add to scene but keep hidden until spawned
    scene.add(this.mesh);
    this.mesh.visible = false;
  }

  /**
   * Activates the boss at the given position.
   * The boss starts descending toward its hover position.
   * 
   * @param position - The spawn position (typically above the screen)
   */
  public spawn(position: { x: number; y: number; z: number }): void {
    this.mesh.position.set(position.x, position.y, position.z);
    this.active = true;
    this.descending = true;
    this.health = this.maxHealth;
        this.fireCooldown = 2.0; // Initial delay before first attack
    this.elapsedTime = 0;
    this.justFired = false;
    this.driftTime = 0;
    this.spirePulseTime = 0;
    this.corePulseTime = 0;
    this.accentPulseTime = 0;
    this.warningPulseTime = 0;
    this.enginePulseTime = 0;
    this.turretPulseTime = 0;
    this.bulletWallDirection = true;
    this.phase3RadialAlternator = false;
    this.baseX = position.x;
    this.mesh.visible = true;
    
    // Reset glow ring
    if (this.glowRing) {
      this.glowRing.visible = true;
      this.glowRing.scale.set(1, 1, 1);
      (this.glowRing.material as THREE.MeshBasicMaterial).opacity = 0.8;
    }
    
    // Deactivate any leftover laser shots
    for (const shot of this.laserBarrageQueue) {
      shot.deactivate();
    }
  }

  /**
   * Updates the boss — handles movement, firing, laser barrage processing, and animations.
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
    
    // Handle movement
    if (this.descending) {
      // Descend toward hover position
      const targetY = this.hoverY;
      const currentY = this.mesh.position.y;
      
      if (currentY > targetY) {
        const newY = Math.max(currentY - this.descentSpeed * delta, targetY);
        this.mesh.position.y = newY;
        
        // Expand the glow ring during descent
        if (this.glowRing) {
          const progress = 1 - (newY - targetY) / (14 - targetY);
          const ringScale = 1 + progress * 4;
          this.glowRing.scale.set(ringScale, ringScale, ringScale);
          (this.glowRing.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - progress * 0.5);
        }
      } else {
        // Reached hover position
        this.descending = false;
        this.baseX = this.mesh.position.x;
        
        // Hide the glow ring
        if (this.glowRing) {
          this.glowRing.visible = false;
        }
      }
    } else {
      // Hover with side-to-side drift
      this.driftTime += delta;
      const driftOffset = Math.sin(this.driftTime * 0.5) * 1.0;
      this.mesh.position.x = this.baseX + driftOffset;
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
      this.fireCooldown = this.fireRate / (phase === 3 ? 1.5 : phase === 2 ? 1.2 : 1.0);
    }
    
    // Process laser barrage queue
    this.updateLaserBarrage(delta, playerPosition);
    
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
    return this.health <= 0;
  }

  /**
   * Returns the Axis-Aligned Bounding Box (AABB) of the boss
   * for collision detection.
   * 
   * @returns {THREE.Box3} The boss's bounding box in world space
   */
  public getBounds(): THREE.Box3 {
    // Main hull dimensions: width 4.5, height 2.5, depth 1.5
    const halfWidth = 2.5;
    const halfHeight = 1.5;
    const halfDepth = 0.75;
    
    const pos = this.mesh.position;
    return new THREE.Box3(
      new THREE.Vector3(pos.x - halfWidth, pos.y - halfHeight, pos.z - halfDepth),
      new THREE.Vector3(pos.x + halfWidth, pos.y + halfHeight, pos.z + halfDepth)
    );
  }

  /**
   * Deactivates the boss and hides it.
   * Also deactivates all queued laser barrage shots.
   */
  public deactivate(): void {
    this.active = false;
    this.descending = false;
    this.mesh.visible = false;
    
    // Deactivate all laser shots
    for (const shot of this.laserBarrageQueue) {
      shot.deactivate();
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
   * Returns the array of active laser barrage shots.
   * Used for collision detection with the player.
   * 
   * @returns {LaserBarrageShot[]} Array of active laser shots
   */
  public getActiveLaserShots(): LaserBarrageShot[] {
    return this.laserBarrageQueue.filter((s) => s.active);
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
    
    // Dispose all laser shots
    for (const shot of this.laserBarrageQueue) {
      shot.dispose(this.scene);
    }
    this.laserBarrageQueue = [];
    
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
        this.fireBulletWall(bulletPool, pos);
        break;
      case 2:
        this.fireBulletWall(bulletPool, pos);
        this.fireLaserBarrage(bulletPool, pos, playerPosition);
        break;
      case 3:
        this.fireBulletWall(bulletPool, pos);
        this.fireLaserBarrage(bulletPool, pos, playerPosition);
        // Occasionally fire a radial burst
        if (this.phase3RadialAlternator) {
          this.fireRadialBurst(bulletPool, pos);
        }
        this.phase3RadialAlternator = !this.phase3RadialAlternator;
        break;
    }
  }

  /**
   * Fires a horizontal wall of bullets across the screen.
   * Alternates between left-to-right and right-to-left directions.
   * Also fires a downward wall of bullets.
   * 
   * @param bulletPool - The enemy bullet pool to spawn bullets from
   * @param pos - The boss's position
   */
  private fireBulletWall(bulletPool: EnemyBulletPool, pos: { x: number; y: number; z: number }): void {
        const bulletCount = 8 + Math.floor(Math.random() * 3); // 8-10 bullets
    const speed = 6 * this.bulletSpeedMultiplier;
    
    // --- Horizontal wall (left-to-right or right-to-left) ---
    const direction = this.bulletWallDirection ? 1 : -1;
    
    for (let i = 0; i < bulletCount; i++) {
      const x = -7 + (14 * i) / (bulletCount - 1);
      const bullet = bulletPool.get();
      if (bullet) {
        bullet.spawn({ x: x, y: pos.y - 1.5, z: pos.z }, speed);
        bullet.velocity.set(direction * speed, 0, 0);
      }
    }
    
    // Alternate direction for next time
    this.bulletWallDirection = !this.bulletWallDirection;
    
    // --- Downward wall ---
    const downCount = 6;
    for (let i = 0; i < downCount; i++) {
      const x = -5 + (10 * i) / (downCount - 1);
      const bullet = bulletPool.get();
      if (bullet) {
        bullet.spawn({ x: x, y: pos.y - 1.5, z: pos.z }, speed);
        bullet.velocity.set(0, -speed, 0);
      }
    }
  }

  /**
   * Queues 3-5 fast bullets aimed at the player position.
   * Each shot fires with a slight delay for a barrage effect.
   * 
   * @param bulletPool - The enemy bullet pool (unused for laser shots but kept for interface consistency)
   * @param pos - The boss's position
   * @param playerPosition - The player's current position
   */
  private fireLaserBarrage(bulletPool: EnemyBulletPool, pos: { x: number; y: number; z: number }, playerPosition: { x: number; y: number; z: number }): void {
    const shotCount = 3 + Math.floor(Math.random() * 3); // 3-5 shots
    
    // Calculate direction to player
    const dx = playerPosition.x - pos.x;
    const dy = playerPosition.y - pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 0.001) return;
    
    // Normalized direction
    const dirX = dx / distance;
    const dirY = dy / distance;
    const direction = new THREE.Vector3(dirX, dirY, 0);
    
    for (let i = 0; i < shotCount; i++) {
      // Find an inactive shot or create a new one
      let shot = this.laserBarrageQueue.find((s) => !s.active);
      if (!shot) {
        shot = new LaserBarrageShot(this.scene);
        this.laserBarrageQueue.push(shot);
      }
      
      // Queue the shot with a slight delay (staggered barrage)
      const delay = i * 0.15;
      shot.queue({ x: pos.x, y: pos.y - 1.5, z: pos.z }, delay);
      shot.fire(direction);
    }
  }

  /**
   * Fires 12 bullets in a circle expanding outward from the boss center.
   * 
   * @param bulletPool - The enemy bullet pool to spawn bullets from
   * @param pos - The boss's position
   */
    private fireRadialBurst(bulletPool: EnemyBulletPool, pos: { x: number; y: number; z: number }): void {
    const bulletCount = 12;
    const speed = 5 * this.bulletSpeedMultiplier;
    
    for (let i = 0; i < bulletCount; i++) {
      const angle = (2 * Math.PI * i) / bulletCount;
      
      const bullet = bulletPool.get();
      if (bullet) {
        bullet.spawn({ x: pos.x, y: pos.y - 1.5, z: pos.z }, speed);
        bullet.velocity.set(
          Math.sin(angle) * speed,
          Math.cos(angle) * speed,
          0
        );
      }
    }
  }

  /**
   * Updates all queued laser barrage shots.
   * 
   * @param delta - Time elapsed since last frame in seconds
   * @param playerPosition - The player's current position
   */
  private updateLaserBarrage(delta: number, playerPosition: { x: number; y: number; z: number }): void {
    for (const shot of this.laserBarrageQueue) {
      if (shot.active) {
        shot.update(delta);
      }
    }
  }

  /**
   * Updates all visual animations — command spire pulse, energy core pulse,
   * turret glow, accent lights, warning lights, and engine glows.
   * 
   * @param delta - Time elapsed since last frame in seconds
   */
  private updateAnimations(delta: number): void {
    // Command spire pulse animation
    this.spirePulseTime += delta;
    const spirePulse = Math.sin(this.spirePulseTime * 3) * 0.5 + 0.5; // 0 to 1
    
    if (this.commandSpire) {
      const scale = 1 + spirePulse * 0.15;
      this.commandSpire.scale.set(scale, scale, scale);
      const material = this.commandSpire.material as THREE.MeshBasicMaterial;
      material.opacity = 0.7 + spirePulse * 0.3;
    }
    
    if (this.spireGlow) {
      const glowScale = 1 + spirePulse * 0.4;
      this.spireGlow.scale.set(glowScale, glowScale, glowScale);
      const material = this.spireGlow.material as THREE.MeshBasicMaterial;
      material.opacity = 0.6 + spirePulse * 0.4;
    }
    
    // Energy core pulse animation
    this.corePulseTime += delta;
    const corePulse = Math.sin(this.corePulseTime * 4) * 0.5 + 0.5;
    
    if (this.energyCore) {
      const scale = 1 + corePulse * 0.3;
      this.energyCore.scale.set(scale, scale, scale);
      const material = this.energyCore.material as THREE.MeshBasicMaterial;
      material.opacity = 0.7 + corePulse * 0.3;
    }
    
    if (this.energyCoreGlow) {
      const glowScale = 1 + corePulse * 0.5;
      this.energyCoreGlow.scale.set(glowScale, glowScale, glowScale);
      const material = this.energyCoreGlow.material as THREE.MeshBasicMaterial;
      material.opacity = 0.3 + corePulse * 0.3;
    }
    
    // Turret glow pulse animation
    this.turretPulseTime += delta;
    const turretPulse = Math.sin(this.turretPulseTime * 5) * 0.5 + 0.5;
    for (const turret of this.turretBanks) {
      const material = turret.material as THREE.MeshBasicMaterial;
      material.opacity = 0.5 + turretPulse * 0.5;
      const scale = 1 + turretPulse * 0.2;
      turret.scale.set(scale, scale, scale);
    }
    
    // Accent light pulse animation
    this.accentPulseTime += delta;
    const accentPulse = Math.sin(this.accentPulseTime * 3) * 0.5 + 0.5;
    for (let i = 0; i < this.accentLights.length; i++) {
      const light = this.accentLights[i];
      const material = light.material as THREE.MeshBasicMaterial;
      // Alternate pulse phase for a cascading effect
      const phaseOffset = (i % 3) * 0.3;
      const lightPulse = Math.sin(this.accentPulseTime * 3 + phaseOffset) * 0.5 + 0.5;
      material.opacity = 0.5 + lightPulse * 0.5;
      const scale = 1 + lightPulse * 0.3;
      light.scale.set(scale, scale, scale);
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
    
    // Engine glow pulse animation
    this.enginePulseTime += delta;
    const enginePulse = Math.sin(this.enginePulseTime * 4) * 0.5 + 0.5;
    for (const glow of this.engineGlows) {
      const scale = 1 + enginePulse * 0.2;
      glow.scale.set(scale, scale, scale);
      const material = glow.material as THREE.MeshBasicMaterial;
      material.opacity = 0.6 + enginePulse * 0.4;
    }

    // Prow core pulse animation
    if (this.prowGlow) {
      const prowPulse = Math.sin(this.corePulseTime * 3 + 1) * 0.5 + 0.5;
      const scale = 1 + prowPulse * 0.25;
      this.prowGlow.scale.set(scale, scale, scale);
      (this.prowGlow.material as THREE.MeshBasicMaterial).opacity = 0.6 + prowPulse * 0.4;
    }

    // Wing sail edge pulse animation (gold shimmer)
    for (let i = 0; i < this.wingSails.length; i++) {
      const sail = this.wingSails[i];
      const material = sail.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.3 + Math.sin(this.corePulseTime * 2 + i * 0.5) * 0.5;
    }

    // Golden halo ring — slowly rotates above the command spire
    if (this.haloRing) {
      this.haloRing.rotation.y += delta * 1.2;
      this.haloRing.rotation.x = Math.PI / 2 + Math.sin(this.corePulseTime * 0.7) * 0.3;
    }
  }

  /**
   * Builds the main hull — a large white/ivory box.
   */
  private buildMainHull(): void {
    const hullMaterial = new THREE.MeshStandardMaterial({
      color: 0xf0f0e8,
      metalness: 0.7,
      roughness: 0.3,
    });
    
    // Main hull
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 2.5, 1.5),
      hullMaterial
    );
    this.mesh.add(hull);
    
    // Hull bottom plate (slightly darker ivory)
    const bottomPlateMaterial = new THREE.MeshStandardMaterial({
      color: 0xe0e0d8,
      metalness: 0.75,
      roughness: 0.25,
    });
    const bottomPlate = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.3, 1.3),
      bottomPlateMaterial
    );
    bottomPlate.position.set(0, -1.1, 0);
    this.mesh.add(bottomPlate);
    
    // Hull top plate (slightly lighter)
    const topPlateMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.65,
      roughness: 0.35,
    });
    const topPlate = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.3, 1.3),
      topPlateMaterial
    );
    topPlate.position.set(0, 1.1, 0);
    this.mesh.add(topPlate);
  }

  /**
   * Builds layered white/gold armor plates on the hull.
   */
  private buildArmorPlates(): void {
    // Armor plate materials with alternating white and gold
    const whitePlateMaterial = new THREE.MeshStandardMaterial({
      color: 0xf0f0e8,
      metalness: 0.7,
      roughness: 0.3,
    });
    const goldPlateMaterial = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      metalness: 0.9,
      roughness: 0.2,
    });
    
    // Front armor plate (white)
    const frontPlate = new THREE.Mesh(
      new THREE.BoxGeometry(4.0, 0.4, 1.2),
      whitePlateMaterial
    );
    frontPlate.position.set(0, -1.0, 0);
    this.mesh.add(frontPlate);
    
    // Gold trim on front plate
    const frontGoldTrim = new THREE.Mesh(
      new THREE.BoxGeometry(4.0, 0.08, 1.2),
      goldPlateMaterial
    );
    frontGoldTrim.position.set(0, -0.8, 0);
    this.mesh.add(frontGoldTrim);
    
    // Mid armor plate (gold)
    const midPlate = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 0.35, 1.1),
      goldPlateMaterial
    );
    midPlate.position.set(0, -0.5, 0);
    this.mesh.add(midPlate);
    
    // White trim on mid plate
    const midWhiteTrim = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 0.08, 1.1),
      whitePlateMaterial
    );
    midWhiteTrim.position.set(0, -0.3, 0);
    this.mesh.add(midWhiteTrim);
    
    // Rear armor plate (white)
    const rearPlate = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 0.3, 1.0),
      whitePlateMaterial
    );
    rearPlate.position.set(0, 0, 0);
    this.mesh.add(rearPlate);
    
    // Gold trim on rear plate
    const rearGoldTrim = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 0.08, 1.0),
      goldPlateMaterial
    );
    rearGoldTrim.position.set(0, 0.2, 0);
    this.mesh.add(rearGoldTrim);
    
    // Side armor plates (white with gold edges)
    const sidePlateMaterial = new THREE.MeshStandardMaterial({
      color: 0xf0f0e8,
      metalness: 0.7,
      roughness: 0.3,
    });
    
    const leftPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 2.0, 1.2),
      sidePlateMaterial
    );
    leftPlate.position.set(-2.1, 0, 0);
    this.mesh.add(leftPlate);
    
    const rightPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 2.0, 1.2),
      sidePlateMaterial
    );
    rightPlate.position.set(2.1, 0, 0);
    this.mesh.add(rightPlate);
  }

  /**
   * Builds gold trim strips along hull edges.
   */
  private buildGoldTrim(): void {
    const goldTrimMaterial = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      metalness: 0.9,
      roughness: 0.2,
    });
    
    // Top edge trim
    const topTrim = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 0.1, 0.1),
      goldTrimMaterial
    );
    topTrim.position.set(0, 1.25, 0.7);
    this.mesh.add(topTrim);
    
    // Bottom edge trim
    const bottomTrim = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 0.1, 0.1),
      goldTrimMaterial
    );
    bottomTrim.position.set(0, -1.25, 0.7);
    this.mesh.add(bottomTrim);
    
    // Left edge trim
    const leftTrim = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 2.5, 0.1),
      goldTrimMaterial
    );
    leftTrim.position.set(-2.25, 0, 0.7);
    this.mesh.add(leftTrim);
    
    // Right edge trim
    const rightTrim = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 2.5, 0.1),
      goldTrimMaterial
    );
    rightTrim.position.set(2.25, 0, 0.7);
    this.mesh.add(rightTrim);
    
    // Vertical trim strips along the hull sides
    for (let i = 0; i < 3; i++) {
      const y = -0.8 + i * 0.8;
      
      const leftVertical = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, 1.5),
        goldTrimMaterial
      );
      leftVertical.position.set(-2.25, y, 0);
      this.mesh.add(leftVertical);
      
      const rightVertical = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, 1.5),
        goldTrimMaterial
      );
      rightVertical.position.set(2.25, y, 0);
      this.mesh.add(rightVertical);
    }
  }

  /**
   * Builds multiple turret banks along the hull.
   * Rows of small turret cylinders on the left, right, and bottom.
   */
  private buildTurretBanks(): void {
    const turretMaterial = new THREE.MeshStandardMaterial({
      color: 0xf0f0e8,
      metalness: 0.7,
      roughness: 0.3,
    });
    
    const muzzleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    // Left turret bank (3 turrets)
    for (let i = 0; i < 3; i++) {
      const y = -0.6 + i * 0.6;
      
      const turret = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.18, 0.4, 8),
        turretMaterial
      );
      turret.position.set(-2.2, y, 0);
      turret.rotation.z = Math.PI / 2; // Point outward
      this.mesh.add(turret);
      
      // Gold muzzle ring
      const muzzle = new THREE.Mesh(
        new THREE.TorusGeometry(0.12, 0.03, 8, 12),
        muzzleMaterial
      );
      muzzle.position.set(-2.4, y, 0);
      muzzle.rotation.y = Math.PI / 2;
      this.mesh.add(muzzle);
      this.turretBanks.push(muzzle);
    }
    
    // Right turret bank (3 turrets)
    for (let i = 0; i < 3; i++) {
      const y = -0.6 + i * 0.6;
      
      const turret = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.18, 0.4, 8),
        turretMaterial
      );
      turret.position.set(2.2, y, 0);
      turret.rotation.z = -Math.PI / 2; // Point outward
      this.mesh.add(turret);
      
      // Gold muzzle ring
      const muzzle = new THREE.Mesh(
        new THREE.TorusGeometry(0.12, 0.03, 8, 12),
        muzzleMaterial
      );
      muzzle.position.set(2.4, y, 0);
      muzzle.rotation.y = -Math.PI / 2;
      this.mesh.add(muzzle);
      this.turretBanks.push(muzzle);
    }
    
    // Bottom turret bank (3 turrets)
    for (let i = 0; i < 3; i++) {
      const x = -0.8 + i * 0.8;
      
      const turret = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.18, 0.4, 8),
        turretMaterial
      );
      turret.position.set(x, -1.3, 0);
      turret.rotation.x = Math.PI / 2; // Point downward
      this.mesh.add(turret);
      
      // Gold muzzle ring
      const muzzle = new THREE.Mesh(
        new THREE.TorusGeometry(0.12, 0.03, 8, 12),
        muzzleMaterial
      );
      muzzle.position.set(x, -1.5, 0);
      muzzle.rotation.x = Math.PI / 2;
      this.mesh.add(muzzle);
      this.turretBanks.push(muzzle);
    }
  }

  /**
   * Builds the glowing command spire on top of the hull.
   */
  private buildCommandSpire(): void {
    // Spire base (white)
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0xf0f0e8,
      metalness: 0.7,
      roughness: 0.3,
    });
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.4, 0.5, 8),
      baseMaterial
    );
    base.position.set(0, 1.5, 0);
    this.mesh.add(base);
    
    // Glowing spire (gold, additive)
    const spireMaterial = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.commandSpire = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 2.0, 8),
      spireMaterial
    );
    this.commandSpire.position.set(0, 2.5, 0);
    this.mesh.add(this.commandSpire);
    
    // Glowing sphere at the tip
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.spireGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 8, 8),
      glowMaterial
    );
    this.spireGlow.position.set(0, 3.5, 0);
    this.mesh.add(this.spireGlow);
    
    // Gold ring at the base of the spire
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.4, 0.04, 8, 16),
      ringMaterial
    );
    ring.position.set(0, 1.5, 0);
    ring.rotation.x = Math.PI / 2;
    this.mesh.add(ring);
  }

  /**
   * Builds the central gold energy core.
   */
  private buildEnergyCore(): void {
    // Outer glow ring
    const glowRingMaterial = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.energyCoreGlow = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.08, 8, 16),
      glowRingMaterial
    );
    this.energyCoreGlow.rotation.x = Math.PI / 2;
    this.energyCoreGlow.position.set(0, 0, 0.7);
    this.mesh.add(this.energyCoreGlow);
    
    // Inner glowing core
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.energyCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 12, 12),
      coreMaterial
    );
    this.energyCore.position.set(0, 0, 0.7);
    this.mesh.add(this.energyCore);
    
    // White inner core
    const whiteCoreMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const whiteCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 8),
      whiteCoreMaterial
    );
    whiteCore.position.set(0, 0, 0.7);
    this.mesh.add(whiteCore);
  }

  /**
   * Builds gold engine glows at the top (rear) of the boss.
   */
  private buildEngineGlows(): void {
    const engineGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    // Three engine glows at the top
    const glowGeometry = new THREE.ConeGeometry(0.3, 0.8, 8);
    
    const leftGlow = new THREE.Mesh(glowGeometry, engineGlowMaterial);
    leftGlow.position.set(-1.2, 1.5, 0);
    leftGlow.rotation.x = Math.PI; // Point upward (rear of boss)
    this.mesh.add(leftGlow);
    this.engineGlows.push(leftGlow);
    
    const centerGlow = new THREE.Mesh(glowGeometry, engineGlowMaterial);
    centerGlow.position.set(0, 1.5, 0);
    centerGlow.rotation.x = Math.PI;
    this.mesh.add(centerGlow);
    this.engineGlows.push(centerGlow);
    
    const rightGlow = new THREE.Mesh(glowGeometry, engineGlowMaterial);
    rightGlow.position.set(1.2, 1.5, 0);
    rightGlow.rotation.x = Math.PI;
    this.mesh.add(rightGlow);
    this.engineGlows.push(rightGlow);
    
    // Fourth smaller glow
    const smallGlowGeometry = new THREE.ConeGeometry(0.2, 0.5, 8);
    const smallGlow = new THREE.Mesh(smallGlowGeometry, engineGlowMaterial);
    smallGlow.position.set(0, 1.5, 0.5);
    smallGlow.rotation.x = Math.PI;
    this.mesh.add(smallGlow);
    this.engineGlows.push(smallGlow);
  }

  /**
   * Builds gold accent lights along the hull.
   */
  private buildAccentLights(): void {
    const accentMaterial = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    const lightGeometry = new THREE.SphereGeometry(0.12, 8, 8);
    
    // Accent lights along the hull
    const lightPositions = [
      { x: -1.5, y: 0.8, z: 0.7 },
      { x: -0.5, y: 0.8, z: 0.7 },
      { x: 0.5, y: 0.8, z: 0.7 },
      { x: 1.5, y: 0.8, z: 0.7 },
      { x: -1.5, y: -0.8, z: 0.7 },
      { x: -0.5, y: -0.8, z: 0.7 },
      { x: 0.5, y: -0.8, z: 0.7 },
      { x: 1.5, y: -0.8, z: 0.7 },
    ];
    
    for (const pos of lightPositions) {
      const light = new THREE.Mesh(lightGeometry, accentMaterial);
      light.position.set(pos.x, pos.y, pos.z);
      this.mesh.add(light);
      this.accentLights.push(light);
    }
  }

  /**
   * Builds red warning lights on the hull corners.
   */
  private buildWarningLights(): void {
    const warningMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    const lightGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    
    // Warning lights on the four corners of the hull
    const lightPositions = [
      { x: -2.1, y: 1.0, z: 0.7 },
      { x: 2.1, y: 1.0, z: 0.7 },
      { x: -2.1, y: -1.0, z: 0.7 },
      { x: 2.1, y: -1.0, z: 0.7 },
    ];
    
    for (const pos of lightPositions) {
      const light = new THREE.Mesh(lightGeometry, warningMaterial);
      light.position.set(pos.x, pos.y, pos.z);
      this.mesh.add(light);
      this.warningLights.push(light);
    }
  }

  /**
   * Builds the golden glow ring for the entrance effect.
   */
  private buildGlowRing(): void {
    const glowRingMaterial = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    this.glowRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.1, 8, 32),
      glowRingMaterial
    );
    this.glowRing.rotation.x = Math.PI / 2;
    this.glowRing.position.set(0, 0, 0);
    this.glowRing.visible = false;
    this.mesh.add(this.glowRing);
  }

  /**
   * Builds the majestic forward prow — a tall arrow-shaped bow with a
   * pulsing golden core, giving the capital ship an aggressive silhouette.
   */
  private buildProw(): void {
    const prowMaterial = new THREE.MeshStandardMaterial({
      color: 0xf0f0e8,
      metalness: 0.7,
      roughness: 0.3,
    });
    const goldEdgeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      metalness: 0.9,
      roughness: 0.2,
    });
    const prowGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Main arrow prow wedge
    const prowWedge = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.6, 4), prowMaterial);
    prowWedge.position.set(0, -2.3, 0);
    prowWedge.rotation.z = Math.PI; // Point downward (forward)
    prowWedge.scale.set(1.4, 1.0, 0.7);
    this.mesh.add(prowWedge);

    // Gold edge trim on the prow
    for (const side of [-1, 1]) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 0.12), goldEdgeMaterial);
      edge.position.set(side * 1.5, -2.3, 0);
      edge.rotation.z = side * -0.5;
      this.mesh.add(edge);
    }

    // Pulsing prow core
    this.prowGlow = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), prowGlowMaterial);
    this.prowGlow.position.set(0, -3.1, 0);
    this.mesh.add(this.prowGlow);
  }

  /**
   * Builds sweeping wing sails behind the hull with gold edges,
   * giving the ship a regal, ceremonial look.
   */
  private buildWingSails(): void {
    const sailMaterial = new THREE.MeshStandardMaterial({
      color: 0xf2f2ea,
      metalness: 0.6,
      roughness: 0.3,
      emissive: 0xffcc00,
      emissiveIntensity: 0.3,
    });
    const spineMaterial = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      metalness: 0.9,
      roughness: 0.2,
    });

    for (const side of [-1, 1]) {
      // Swept sail wing
      const sail = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 0.3), sailMaterial);
      sail.position.set(side * 3.2, 0.6, 0);
      sail.rotation.z = side * 0.35;
      this.mesh.add(sail);
      this.wingSails.push(sail);

      // Gold spine along the sail
      const spine = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.0, 0.3), spineMaterial);
      spine.position.set(side * 3.2, 0.3, 0);
      spine.rotation.z = side * 0.35;
      this.mesh.add(spine);

      // Sail tip accent
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.4), spineMaterial);
      tip.position.set(side * 4.4, 0.1, 0);
      this.mesh.add(tip);
    }
  }

  /**
   * Builds the golden halo ring that slowly rotates above the command spire.
   */
  private buildHaloRing(): void {
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 8, 24), haloMaterial);
    this.haloRing.position.set(0, 3.9, 0);
    this.haloRing.rotation.x = Math.PI / 2;
    this.mesh.add(this.haloRing);
  }
}