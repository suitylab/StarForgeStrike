import * as THREE from 'three';
import { EnemyBulletPool } from './EnemyBulletPool';

/**
 * IroncladBoss — the Level 1 boss for StarForge Strike.
 * 
 * A massive rectangular dreadnought with layered armor plates and a central cannon.
 * The boss descends into position at the top of the screen, then hovers with a
 * slight bobbing motion while firing increasingly complex attack patterns.
 * 
 * Attack phases based on health thresholds:
 *   - Phase 1 (100-50% HP): Wide spread shots (5-7 bullets in a fan downward)
 *   - Phase 2 (50-25% HP): Adds aimed laser sweeps toward the player
 *   - Phase 3 (25-0% HP): Fires rotating spiral patterns
 */
export class IroncladBoss {
  /** The THREE.js group containing all boss geometry */
  public readonly mesh: THREE.Group;
  
  /** Whether the boss is currently active */
  public active: boolean = false;
  
  /** Current health points */
  public health: number = 2000;
  
  /** Maximum health points */
  public readonly maxHealth: number = 2000;
  
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
  private readonly descentSpeed: number = 1.5;
  
  /** Base Y position for bobbing animation */
  private baseY: number = 0;
  
  /** Time accumulator for bobbing animation */
  private bobTime: number = 0;
  
  /** Time accumulator for core pulse animation */
  private corePulseTime: number = 0;
  
  /** Time accumulator for warning light pulse animation */
  private warningPulseTime: number = 0;
  
  /** Current spiral angle for Phase 3 attacks */
  private spiralAngle: number = 0;
  
  /** Current sweep angle for Phase 2 attacks */
  private sweepAngle: number = 0;
  
  /** Sweep direction (1 = clockwise, -1 = counter-clockwise) */
  private sweepDirection: number = 1;
  
  /** Reference to the cyan energy core mesh for pulse animation */
  private energyCore: THREE.Mesh | null = null;
  
  /** Reference to the engine glow meshes for pulse animation */
  private engineGlows: THREE.Mesh[] = [];
  
  /** Reference to the warning light meshes for pulse animation */
  private warningLights: THREE.Mesh[] = [];

  /** Spinning gyroscope rings around the energy core */
  private spinningRings: THREE.Mesh[] = [];

  /** Rotating radar dish meshes for animation */
  private radarDisks: THREE.Mesh[] = [];

  /** Glowing wingtip meshes for pulse animation */
  private wingTipGlows: THREE.Mesh[] = [];

  /** Cyan hull glow strips for pulse animation */
  private glowStripes: THREE.Mesh[] = [];
  
  /** Whether this boss has been disposed */
  private isDisposed: boolean = false;

  /**
   * Creates a new IroncladBoss.
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
    this.buildHull();
    this.buildArmorPlates();
    this.buildCannons();
    this.buildEnergyCore();
    this.buildEngines();
    this.buildWarningLights();
    this.buildSweptWings();
    this.buildKeelArmor();
    this.buildGlowStripes();
    this.buildRadarArray();
    this.buildSpinningRings();
    
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
    this.bobTime = 0;
    this.corePulseTime = 0;
    this.warningPulseTime = 0;
    this.spiralAngle = 0;
    this.sweepAngle = 0;
    this.sweepDirection = 1;
    this.mesh.visible = true;
  }

  /**
   * Updates the boss — handles movement, firing, and animations.
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
      } else {
        // Reached hover position
        this.descending = false;
        this.baseY = this.mesh.position.y;
      }
    } else {
      // Hover with bobbing motion
      this.bobTime += delta;
      const bobOffset = Math.sin(this.bobTime * 1.5) * 0.3;
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
      this.fireCooldown = this.fireRate / (phase === 3 ? 1.5 : phase === 2 ? 1.2 : 1.0);
    }
    
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
    // Main hull dimensions: width 6, height 2.5, depth 1.5
    const halfWidth = 3.0;
    const halfHeight = 1.25;
    const halfDepth = 0.75;
    
    const pos = this.mesh.position;
    return new THREE.Box3(
      new THREE.Vector3(pos.x - halfWidth, pos.y - halfHeight, pos.z - halfDepth),
      new THREE.Vector3(pos.x + halfWidth, pos.y + halfHeight, pos.z + halfDepth)
    );
  }

  /**
   * Deactivates the boss and hides it.
   */
  public deactivate(): void {
    this.active = false;
    this.descending = false;
    this.mesh.visible = false;
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
        this.fireWideSpread(bulletPool, pos);
        break;
      case 2:
        this.fireWideSpread(bulletPool, pos);
        this.fireAimedSweep(bulletPool, pos, playerPosition);
        break;
      case 3:
        this.fireWideSpread(bulletPool, pos);
        this.fireAimedSweep(bulletPool, pos, playerPosition);
        this.fireSpiral(bulletPool, pos);
        break;
    }
  }

  /**
   * Fires a wide spread of 5-7 bullets in a fan pattern downward.
   * Angles range from -30° to +30°.
   * 
   * @param bulletPool - The enemy bullet pool
   * @param pos - The boss's position
   */
  private fireWideSpread(bulletPool: EnemyBulletPool, pos: { x: number; y: number; z: number }): void {
    const bulletCount = 5 + Math.floor(Math.random() * 3); // 5-7 bullets
        const maxAngle = Math.PI / 6; // 30 degrees
    const speed = 6 * this.bulletSpeedMultiplier;
    
    for (let i = 0; i < bulletCount; i++) {
      const t = bulletCount === 1 ? 0 : i / (bulletCount - 1);
      const angle = -maxAngle + t * 2 * maxAngle;
      
      const bullet = bulletPool.get();
      if (bullet) {
        bullet.spawn({ x: pos.x, y: pos.y - 1.5, z: pos.z }, speed);
        bullet.velocity.set(
          Math.sin(angle) * speed,
          -Math.cos(angle) * speed,
          0
        );
      }
    }
  }

  /**
   * Fires a burst of bullets aimed at the player with a sweeping motion.
   * The sweep angle oscillates over time.
   * 
   * @param bulletPool - The enemy bullet pool
   * @param pos - The boss's position
   * @param playerPosition - The player's current position
   */
  private fireAimedSweep(
    bulletPool: EnemyBulletPool,
    pos: { x: number; y: number; z: number },
    playerPosition: { x: number; y: number; z: number }
  ): void {
    // Calculate direction to player
    const dx = playerPosition.x - pos.x;
    const dy = playerPosition.y - pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 0.001) return;
    
    // Base angle to player
    const baseAngle = Math.atan2(dx, dy);
    
    // Update sweep angle (oscillates between -20° and +20°)
    this.sweepAngle += this.sweepDirection * 0.15;
    if (this.sweepAngle > Math.PI / 9) {
      this.sweepAngle = Math.PI / 9;
      this.sweepDirection = -1;
    } else if (this.sweepAngle < -Math.PI / 9) {
      this.sweepAngle = -Math.PI / 9;
      this.sweepDirection = 1;
    }
    
        // Fire 3 bullets in a tight burst around the sweep angle
    const speed = 8 * this.bulletSpeedMultiplier;
    const burstSpread = 0.08; // ~4.6 degrees
    
    for (let i = -1; i <= 1; i++) {
      const angle = baseAngle + this.sweepAngle + i * burstSpread;
      
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
   * Fires bullets in a rotating spiral pattern.
   * Each shot rotates the angle by a fixed increment.
   * 
   * @param bulletPool - The enemy bullet pool
   * @param pos - The boss's position
   */
    private fireSpiral(bulletPool: EnemyBulletPool, pos: { x: number; y: number; z: number }): void {
    const speed = 5 * this.bulletSpeedMultiplier;
    const angleIncrement = Math.PI / 8; // 22.5 degrees per shot
    
    // Fire 2 bullets per shot (opposite sides of the spiral)
    for (let i = 0; i < 2; i++) {
      const angle = this.spiralAngle + i * Math.PI;
      
      const bullet = bulletPool.get();
      if (bullet) {
        bullet.spawn({ x: pos.x, y: pos.y - 1.5, z: pos.z }, speed);
        bullet.velocity.set(
          Math.sin(angle) * speed,
          -Math.cos(angle) * speed,
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
   * Updates all visual animations — core pulse, engine glow, warning lights.
   * 
   * @param delta - Time elapsed since last frame in seconds
   */
  private updateAnimations(delta: number): void {
    // Core pulse animation
    this.corePulseTime += delta;
    const corePulse = Math.sin(this.corePulseTime * 3) * 0.5 + 0.5; // 0 to 1
    if (this.energyCore) {
      const scale = 1 + corePulse * 0.3;
      this.energyCore.scale.set(scale, scale, scale);
      const material = this.energyCore.material as THREE.MeshBasicMaterial;
      material.opacity = 0.7 + corePulse * 0.3;
    }
    
    // Engine glow pulse animation
    const enginePulse = Math.sin(this.corePulseTime * 4) * 0.5 + 0.5;
    for (const glow of this.engineGlows) {
      const scale = 1 + enginePulse * 0.2;
      glow.scale.set(scale, scale, scale);
      const material = glow.material as THREE.MeshBasicMaterial;
      material.opacity = 0.6 + enginePulse * 0.4;
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

    // Wingtip glow pulse animation
    const wingPulse = Math.sin(this.corePulseTime * 2) * 0.5 + 0.5;
    for (const tip of this.wingTipGlows) {
      const material = tip.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.5 + wingPulse * 0.6;
    }

    // Hull glow strip pulse — cascading along the ship
    for (const strip of this.glowStripes) {
      const material = strip.material as THREE.MeshBasicMaterial;
      material.opacity = 0.35 + Math.sin(this.corePulseTime * 3 + strip.position.y * 2) * 0.4;
    }

    // Radar dish rotation
    for (const disk of this.radarDisks) {
      disk.rotation.y -= delta * 2.5;
    }

    // Spinning gyroscope rings around the core
    for (let i = 0; i < this.spinningRings.length; i++) {
      const ring = this.spinningRings[i];
      ring.rotation.y += delta * (i % 2 === 0 ? 1.2 : -1.2);
      ring.rotation.x = Math.PI / 2 + Math.sin(this.corePulseTime * 0.8 + i) * 0.35;
    }
  }

  /**
   * Builds the main hull — a large box in dark steel blue.
   */
  private buildHull(): void {
    const hullMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a3a4a,
      metalness: 0.7,
      roughness: 0.4,
    });
    
    // Main hull
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(6, 2.5, 1.5),
      hullMaterial
    );
    this.mesh.add(hull);
    
    // Hull bottom plate (slightly darker)
    const bottomPlateMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a2a3a,
      metalness: 0.75,
      roughness: 0.35,
    });
    const bottomPlate = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 0.3, 1.3),
      bottomPlateMaterial
    );
    bottomPlate.position.set(0, -1.1, 0);
    this.mesh.add(bottomPlate);
    
    // Hull top plate (slightly lighter)
    const topPlateMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a4a5a,
      metalness: 0.65,
      roughness: 0.45,
    });
    const topPlate = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 0.3, 1.3),
      topPlateMaterial
    );
    topPlate.position.set(0, 1.1, 0);
    this.mesh.add(topPlate);
  }

  /**
   * Builds layered armor plates on the hull.
   */
  private buildArmorPlates(): void {
    // Armor plate materials with slightly different shades
    const plateMaterial1 = new THREE.MeshStandardMaterial({
      color: 0x3a4a5a,
      metalness: 0.7,
      roughness: 0.4,
    });
    const plateMaterial2 = new THREE.MeshStandardMaterial({
      color: 0x2a3a4a,
      metalness: 0.75,
      roughness: 0.35,
    });
    const plateMaterial3 = new THREE.MeshStandardMaterial({
      color: 0x1a2a3a,
      metalness: 0.8,
      roughness: 0.3,
    });
    
    // Front armor plate (facing downward)
    const frontPlate = new THREE.Mesh(
      new THREE.BoxGeometry(5, 0.4, 1.2),
      plateMaterial1
    );
    frontPlate.position.set(0, -1.0, 0);
    this.mesh.add(frontPlate);
    
    // Mid armor plate
    const midPlate = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 0.35, 1.1),
      plateMaterial2
    );
    midPlate.position.set(0, -0.5, 0);
    this.mesh.add(midPlate);
    
    // Rear armor plate
    const rearPlate = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.3, 1.0),
      plateMaterial3
    );
    rearPlate.position.set(0, 0, 0);
    this.mesh.add(rearPlate);
    
    // Side armor plates
    const sidePlateMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a3a4a,
      metalness: 0.7,
      roughness: 0.4,
    });
    
    const leftPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 2.0, 1.2),
      sidePlateMaterial
    );
    leftPlate.position.set(-2.85, 0, 0);
    this.mesh.add(leftPlate);
    
    const rightPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 2.0, 1.2),
      sidePlateMaterial
    );
    rightPlate.position.set(2.85, 0, 0);
    this.mesh.add(rightPlate);
  }

  /**
   * Builds the central cannon and side cannons.
   */
  private buildCannons(): void {
    const cannonMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a4a5a,
      metalness: 0.8,
      roughness: 0.3,
    });
    
    // Central cannon (large, pointing downward)
    const centralCannon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.5, 2.0, 12),
      cannonMaterial
    );
    centralCannon.position.set(0, -2.0, 0);
    this.mesh.add(centralCannon);
    
    // Central cannon muzzle (wider section at the tip)
    const muzzleMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a3a4a,
      metalness: 0.85,
      roughness: 0.25,
    });
    const muzzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.55, 0.4, 12),
      muzzleMaterial
    );
    muzzle.position.set(0, -3.0, 0);
    this.mesh.add(muzzle);
    
    // Central cannon glow ring
    const glowRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x00c8ff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glowRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.06, 8, 16),
      glowRingMaterial
    );
    glowRing.position.set(0, -2.8, 0);
    glowRing.rotation.x = Math.PI / 2;
    this.mesh.add(glowRing);
    
    // Side cannons (smaller, on left and right)
    const sideCannonGeometry = new THREE.CylinderGeometry(0.2, 0.25, 1.2, 8);
    
    const leftCannon = new THREE.Mesh(sideCannonGeometry, cannonMaterial);
    leftCannon.position.set(-2.0, -1.5, 0);
    this.mesh.add(leftCannon);
    
    const rightCannon = new THREE.Mesh(sideCannonGeometry, cannonMaterial);
    rightCannon.position.set(2.0, -1.5, 0);
    this.mesh.add(rightCannon);
    
    // Side cannon glow rings
    const sideGlowRingGeometry = new THREE.TorusGeometry(0.22, 0.04, 8, 12);
    
    const leftGlowRing = new THREE.Mesh(sideGlowRingGeometry, glowRingMaterial);
    leftGlowRing.position.set(-2.0, -2.0, 0);
    leftGlowRing.rotation.x = Math.PI / 2;
    this.mesh.add(leftGlowRing);
    
    const rightGlowRing = new THREE.Mesh(sideGlowRingGeometry, glowRingMaterial);
    rightGlowRing.position.set(2.0, -2.0, 0);
    rightGlowRing.rotation.x = Math.PI / 2;
    this.mesh.add(rightGlowRing);
  }

  /**
   * Builds the cyan energy core in the center of the hull.
   */
  private buildEnergyCore(): void {
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x00c8ff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    // Main core
    this.energyCore = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.8, 0.8),
      coreMaterial
    );
    this.energyCore.position.set(0, 0.3, 0);
    this.mesh.add(this.energyCore);
    
    // Outer glow ring around the core
    const glowRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x00c8ff,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glowRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.6, 0.08, 8, 16),
      glowRingMaterial
    );
    glowRing.position.set(0, 0.3, 0);
    glowRing.rotation.x = Math.PI / 2;
    this.mesh.add(glowRing);
  }

  /**
   * Builds the engine glow cones at the top (rear) of the boss.
   */
  private buildEngines(): void {
    const engineGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00c8ff,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    // Twin engine glows at the top
    const glowGeometry = new THREE.ConeGeometry(0.3, 0.8, 8);
    
    const leftGlow = new THREE.Mesh(glowGeometry, engineGlowMaterial);
    leftGlow.position.set(-1.5, 1.5, 0);
    leftGlow.rotation.x = Math.PI; // Point upward (rear of boss)
    this.mesh.add(leftGlow);
    this.engineGlows.push(leftGlow);
    
    const rightGlow = new THREE.Mesh(glowGeometry, engineGlowMaterial);
    rightGlow.position.set(1.5, 1.5, 0);
    rightGlow.rotation.x = Math.PI;
    this.mesh.add(rightGlow);
    this.engineGlows.push(rightGlow);
    
    // Center engine glow (smaller)
    const centerGlow = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.5, 8),
      engineGlowMaterial
    );
    centerGlow.position.set(0, 1.5, 0);
    centerGlow.rotation.x = Math.PI;
    this.mesh.add(centerGlow);
    this.engineGlows.push(centerGlow);
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
      { x: -2.8, y: 1.0, z: 0.7 },
      { x: 2.8, y: 1.0, z: 0.7 },
      { x: -2.8, y: -1.0, z: 0.7 },
      { x: 2.8, y: -1.0, z: 0.7 },
    ];
    
    for (const pos of lightPositions) {
      const light = new THREE.Mesh(lightGeometry, warningMaterial);
      light.position.set(pos.x, pos.y, pos.z);
      this.mesh.add(light);
      this.warningLights.push(light);
    }
  }

  /**
   * Builds swept wing protrusions with glowing cyan wingtips.
   */
  private buildSweptWings(): void {
    const wingMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a4a5a,
      metalness: 0.7,
      roughness: 0.4,
    });
    const tipMaterial = new THREE.MeshStandardMaterial({
      color: 0x00c8ff,
      emissive: 0x00c8ff,
      emissiveIntensity: 0.8,
      metalness: 0.4,
      roughness: 0.2,
    });

    for (const side of [-1, 1]) {
      // Swept wing
      const wing = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.2, 0.35), wingMaterial);
      wing.position.set(side * 3.6, 0.15, 0);
      wing.rotation.z = -side * 0.3;
      this.mesh.add(wing);

      // Angled support strut
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.3), wingMaterial);
      strut.position.set(side * 3.8, -0.35, 0);
      strut.rotation.z = -side * 0.5;
      this.mesh.add(strut);

      // Glowing wingtip
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.35), tipMaterial);
      tip.position.set(side * 5.2, -0.1, 0);
      this.mesh.add(tip);
      this.wingTipGlows.push(tip);
    }
  }

  /**
   * Builds layered keel armor wedges along the bottom of the hull.
   */
  private buildKeelArmor(): void {
    const keelMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a2a3a,
      metalness: 0.8,
      roughness: 0.3,
    });
    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a5a6a,
      metalness: 0.65,
      roughness: 0.45,
    });

    // Three descending keel wedges below the hull
    for (let i = 0; i < 3; i++) {
      const y = -1.55 - i * 0.35;
      const width = 4.0 - i * 0.4;
      const wedge = new THREE.Mesh(new THREE.BoxGeometry(width, 0.3, 0.9), i % 2 === 0 ? keelMaterial : edgeMaterial);
      wedge.position.set(0, y, 0);
      this.mesh.add(wedge);
    }

    // Fore keel ram
    const ram = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.35, 0.8), keelMaterial);
    ram.position.set(0, -2.5, 0);
    ram.rotation.z = 0.15;
    this.mesh.add(ram);
  }

  /**
   * Builds cyan glow light strips running along the hull edges.
   */
  private buildGlowStripes(): void {
    const stripeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00c8ff,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Horizontal edge stripes
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const x = -1.8 + i * 1.2;
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.05), stripeMaterial);
        stripe.position.set(x, side * 1.28, 0.75);
        this.mesh.add(stripe);
        this.glowStripes.push(stripe);
      }

      // Vertical side stripes
      const sideStripe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.6, 0.05), stripeMaterial);
      sideStripe.position.set(side * 3.0, 0, 0.75);
      this.mesh.add(sideStripe);
      this.glowStripes.push(sideStripe);
    }
  }

  /**
   * Builds rotating radar dish arrays on the upper deck.
   */
  private buildRadarArray(): void {
    const dishMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a4a5a,
      metalness: 0.7,
      roughness: 0.5,
    });
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: 0x00c8ff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    for (const pos of [{ x: -1.2, y: 1.35, z: 0.1 }, { x: 1.2, y: 1.35, z: 0.1 }]) {
      // Dish housing
      const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.25, 8), dishMaterial);
      housing.position.set(pos.x, pos.y, pos.z);
      housing.rotation.x = Math.PI / 2;
      this.mesh.add(housing);

      // Rotating radar disk
      const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.05, 0.06, 12), innerMaterial);
      disk.position.set(pos.x, pos.y + 0.14, pos.z);
      disk.rotation.x = Math.PI / 2;
      this.mesh.add(disk);
      this.radarDisks.push(disk);
    }
  }

  /**
   * Builds twin gyroscope rings rotating around the energy core.
   */
  private buildSpinningRings(): void {
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x00c8ff,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    for (let i = 0; i < 2; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75 + i * 0.3, 0.045, 8, 24), ringMaterial);
      ring.position.set(0, 0.3, 0);
      ring.rotation.x = Math.PI / 2;
      this.mesh.add(ring);
      this.spinningRings.push(ring);
    }
  }
}