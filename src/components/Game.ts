import * as THREE from 'three';
import { Player } from './Player';
import { BulletPool } from './BulletPool';
import { Enemy, createEnemy, getRandomEnemyType, EnemyType } from './Enemy';
import { createEliteEnemy, EliteEnemyType, Reaper, Warden, Harbinger, Overlord } from './EliteEnemy';
import { boxIntersects } from './Collision';
import { HUD } from './HUD';
import { PlaneType, GameConfig } from './GameConfig';
import { PowerPickup } from './PowerPickup';
import { WingmanPickup } from './WingmanPickup';
import { MedkitPickup } from './MedkitPickup';
import { getRandomWingmanType, SeekerWingman } from './Wingman';
import { EnemyBulletPool } from './EnemyBulletPool';
import { EffectManager } from './Effects';
import { ModularCorridor } from './ModularSegment';
import { IroncladBoss } from './IroncladBoss';
import { VoidReaverBoss } from './VoidReaverBoss';
import { SovereignBoss } from './SovereignBoss';
import { LevelFlowManager, LEVEL_CONFIGS } from './LevelConfig';
import { ParallaxBackground } from './ParallaxBackground';
import { AmbientParticles } from './AmbientParticles';
import { LevelStyle } from './ModularSegment';

/**
 * Game state interface for the StarForge Strike game.
 * Tracks the core gameplay state that persists across frames.
 */
export interface GameState {
  /** Current score value */
  score: number;
  /** Whether the game loop is currently running */
  running: boolean;
  /** Total elapsed time in seconds since the game started */
  elapsedTime: number;
  /** Time remaining before the next enemy spawns (seconds) */
  enemySpawnTimer: number;
  /** Total number of enemies destroyed by the player */
  enemiesDestroyed: number;
}

/**
 * GameStats — tracks detailed scoring statistics for the current level.
 * Used to calculate the score breakdown on the level clear settlement screen
 * and to display stats on the game over screen.
 */
export interface GameStats {
  /** Number of basic enemies destroyed */
  enemiesDestroyed: number;
  /** Number of elite enemies destroyed */
  elitesDestroyed: number;
  /** Points awarded for defeating the boss */
  bossBonus: number;
  /** Points awarded from POWER pickups collected at max power */
  pickupBonus: number;
  /** Points awarded for completing the level under the par time */
  timeBonus: number;
  /** Points awarded for remaining health at level completion */
  healthBonus: number;
  /** Total score for the level (sum of all bonuses) */
  totalScore: number;
}

/**
 * Keyboard state type — maps key codes to their pressed state.
 * Example: { 'KeyW': true, 'KeyA': false, ... }
 */
export type Keys = Record<string, boolean>;

/**
 * Floating text entry for the max-power bonus display.
 * Tracks the DOM element and animation state.
 */
interface FloatingText {
  /** The DOM element displaying the text */
  element: HTMLElement;
  /** Time elapsed since creation in seconds */
  elapsed: number;
  /** Total animation duration in seconds */
  duration: number;
  /** Initial Y position on screen */
  startY: number;
}

/**
 * Game — the main orchestrator class for the StarForge Strike game.
 *
 * Ties together the player, bullet pool, enemies, collision detection,
 * HUD, and the corridor background scene. The game is 2D gameplay rendered
 * in 3D — the play field is the X-Y plane (X horizontal, Y vertical, up = +Y),
 * with the camera looking down the Z-axis from a slight angle.
 *
 * The class is structured for future phases:
 *   - Phase 2: Bullet pooling integration (already using BulletPool)
 *   - Phase 6: Enemy types (DRONE, RAIDER, SENTRY will extend Enemy)
 *   - Phase 7: Level system (modular corridor segments)
 */
export class Game {
  /** The THREE.js scene containing all game objects */
  public readonly scene: THREE.Scene;
  /** The perspective camera viewing the play field */
  public readonly camera: THREE.PerspectiveCamera;
  /** The HUD overlay for score display */
  public readonly hud: HUD;
  /** The player-controlled fighter */
  public readonly player: Player;
  /** The bullet object pool for efficient bullet management */
  public readonly bulletPool: BulletPool;
  /** Array of active enemy entities */
  public readonly enemies: Enemy[] = [];
  /** Current game state */
  public readonly state: GameState;
  /** Keyboard state — true for currently pressed keys */
  public readonly keys: Keys = {};
  /** Counter for generating unique enemy IDs */
  public enemyIdCounter: number = 0;
  /** THREE.js clock for delta-time calculation */
  public readonly clock: THREE.Clock;
  /** Group containing all corridor background geometry */
  public readonly backgroundGroup: THREE.Group;
  /** Whether the game has been disposed (listeners removed) */
  public isDisposed: boolean = false;

  /** Reference to the grid floor for scrolling animation */
  private gridFloor: THREE.LineSegments | null = null;
    /** Reference to the grid helper for scrolling animation */
  private gridHelper: THREE.GridHelper | null = null;

    /** Array of active POWER pickups */
  private pickups: PowerPickup[] = [];

  /** Array of active wingman pickups */
  private wingmanPickups: WingmanPickup[] = [];

  /** Counter for generating unique wingman pickup IDs */
  private wingmanPickupIdCounter: number = 0;

  /** Timer for periodic wingman pickup spawning (seconds) */
  private periodicWingmanPickupTimer: number = 20.0;

  /** Array of active medkit pickups */
  private medkitPickups: MedkitPickup[] = [];

  /** Counter for generating unique medkit pickup IDs */
  private medkitPickupIdCounter: number = 0;

  /** Timer for periodic medkit pickup spawning (seconds) */
  private periodicMedkitPickupTimer: number = 25.0;

  /** Counter for generating unique pickup IDs */
  private pickupIdCounter: number = 0;

  /** Array of active floating texts */
  private floatingTexts: FloatingText[] = [];

  /** Timer for periodic pickup spawning (seconds) */
  private periodicPickupTimer: number = 10.0;

    /** The type of fighter the player selected */
  private planeType: PlaneType;

  /** Pool for enemy bullets (red-orange, distinct from player cyan bullets) */
  private enemyBulletPool: EnemyBulletPool;

  /** Manager for warp-in, hit, and explosion effects */
  private effectManager: EffectManager;

  /** Player health (3 HP per design doc) */
  private playerHealth: number = 3;

  /** Maximum player health */
  private readonly maxPlayerHealth: number = 3;

  /** Time remaining for player invincibility after being hit (seconds) */
  private playerInvincibleTimer: number = 0;

  /** Duration of player invincibility after being hit (seconds) */
  private readonly playerInvincibleDuration: number = 2.0;

    /** Timer for player blink animation during invincibility */
  private playerBlinkTimer: number = 0;

  /** Modular corridor system for Level 1 */
  private corridor: ModularCorridor | null = null;

  /** Level flow manager for wave progression */
  private levelFlowManager: LevelFlowManager | null = null;

      /** The current level boss (IRONCLAD for Level 1, VOID REAVER for Level 2, SOVEREIGN for Level 3) */
  private boss: IroncladBoss | VoidReaverBoss | SovereignBoss | null = null;

    /** Callback invoked when a level is cleared — receives the level number and full score breakdown */
  private onLevelClear: ((level: number, breakdown: { enemies: number; elites: number; boss: number; pickups: number; time: number; health: number; total: number }) => void) | null = null;

    /** Callback invoked when the player is destroyed (game over) */
  private onGameOver: ((level: number, score: number) => void) | null = null;

  /** Callback invoked when all levels are completed (victory) */
  private onVictory: ((totalScore: number) => void) | null = null;

  /** Total score accumulated across all levels */
  private totalScore: number = 0;

  /** Game stats tracking for the current level */
  private gameStats: GameStats;

  /** Whether the boss warning banner is currently shown */
  private bossWarningShown: boolean = false;

  /** Time remaining for the boss warning banner (seconds) */
  private bossWarningTimer: number = 0;

  /** The boss warning banner DOM element */
  private bossWarningElement: HTMLElement | null = null;

  /** Whether the boss is currently active */
  private bossActive: boolean = false;

  /** Whether the boss has been spawned */
  private bossSpawned: boolean = false;

  /** Current level number */
  private currentLevel: number = 1;

  /** Time elapsed in the current level (seconds) */
  private levelElapsedTime: number = 0;

  /** Timer for spawning enemies within the current wave (seconds) */
  private waveSpawnTimer: number = 0;

  /** Number of enemies spawned in the current wave */
  private enemiesSpawnedInWave: number = 0;

  /** The type of the current wave ('drones', 'raiders', etc.) */
  private currentWaveType: string = '';

  /** Time remaining for screen shake (seconds) */
  private screenShakeTime: number = 0;

    /** Magnitude of the screen shake */
  private screenShakeMagnitude: number = 0;

  /** Timer for hit stop freeze frames (seconds) */
  private hitStopTimer: number = 0;

  /** Countdown before the MISSION FAILED screen appears after the player is destroyed (seconds) */
  private deathDelayTimer: number = 0;

  /** Countdown before the settlement screen appears after the boss is defeated (seconds) */
  private levelClearDelayTimer: number = 0;

  /** Timer for the sustained boss explosion chain during the level clear delay (seconds) */
  private bossExplosionChainTimer: number = 0;

  /** World position where the defeated boss keeps exploding during the level clear delay */
  private bossExplosionPos: THREE.Vector3 | null = null;

  /** Timer for player entrance animation (seconds) */
  private entranceTimer: number = 0;

  /** Whether the player entrance animation is playing */
  private entranceActive: boolean = false;

  /** Parallax background system */
  private parallaxBackground: ParallaxBackground | null = null;

  /** Ambient particle system */
  private ambientParticles: AmbientParticles | null = null;

  /** Base camera position for screen shake restoration */
  private readonly baseCameraPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 14);

  /** Base camera rotation for screen shake restoration */
  private readonly baseCameraRotation: THREE.Euler = new THREE.Euler(0, 0, 0);

  /** Speed trail particles for player entrance */
  private entranceTrailParticles: THREE.Mesh[] = [];

  /** Timer for spawning entrance trail particles */
  private entranceTrailTimer: number = 0;

  /** Whether the current level is complete */
  private levelComplete: boolean = false;

    /** Whether the boss has been defeated */
  private bossDefeated: boolean = false;

  /** Global suppression timer — while > 0, enemies cannot fire new bullets.
   *  Set by the PROTECT mechanic after sacrificing a wingman. */
  private enemyFireSuppressionTimer: number = 0;

  /** Whether the game is currently paused */
  private paused: boolean = false;

    /**
   * Creates a new Game instance.
   * Initializes the game state, player, bullet pool, enemies array,
   * corridor background, and keyboard event listeners.
   *
   * @param scene - The THREE.js scene to add game objects to
   * @param camera - The perspective camera viewing the play field
   * @param hud - The HUD overlay for score display
   * @param planeType - The type of fighter to build (defaults to 'vanguard')
   */
                constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, hud: HUD, planeType: PlaneType = 'vanguard', onLevelClear?: (level: number, breakdown: { enemies: number; elites: number; boss: number; pickups: number; time: number; health: number; total: number }) => void, onGameOver?: (level: number, score: number) => void, onVictory?: (totalScore: number) => void) {
        this.scene = scene;
    this.camera = camera;
    this.hud = hud;
    this.planeType = planeType;

    // Initialize game stats
    this.gameStats = {
      enemiesDestroyed: 0,
      elitesDestroyed: 0,
      bossBonus: 0,
      pickupBonus: 0,
      timeBonus: 0,
      healthBonus: 0,
      totalScore: 0,
    };

    // Initialize game state
    this.state = {
      score: 0,
      running: false,
      elapsedTime: 0,
      enemySpawnTimer: 0,
      enemiesDestroyed: 0,
    };

            // Create core game objects
        this.player = new Player(scene, planeType);
    this.bulletPool = new BulletPool(scene, 150);
    this.enemyBulletPool = new EnemyBulletPool(scene, 100);
    this.effectManager = new EffectManager(scene);
    this.clock = new THREE.Clock();

        // Initialize pickup system
    this.pickups = [];
    this.pickupIdCounter = 0;
    this.floatingTexts = [];
    this.periodicPickupTimer = 30.0;

    // Initialize wingman pickup system
    this.wingmanPickups = [];
    this.wingmanPickupIdCounter = 0;
    this.periodicWingmanPickupTimer = 20.0;

    // Initialize medkit pickup system
    this.medkitPickups = [];
    this.medkitPickupIdCounter = 0;
    this.periodicMedkitPickupTimer = 25.0;

        // Build the corridor background
    this.backgroundGroup = new THREE.Group();
    this.buildCorridorBackground();
    scene.add(this.backgroundGroup);

        // Build the modular corridor system (replaces the static background)
    this.buildModularCorridor();

    // Build the parallax background and ambient particles
    this.parallaxBackground = new ParallaxBackground(scene, 'titan-gate');
    this.ambientParticles = new AmbientParticles(scene, 'titan-gate');

    // Initialize the level flow manager for Level 1
    this.levelFlowManager = new LevelFlowManager(1);

                // Store the onLevelClear callback
    this.onLevelClear = onLevelClear || null;

        // Store the onGameOver callback
    this.onGameOver = onGameOver || null;

    // Store the onVictory callback
    this.onVictory = onVictory || null;

    // Build the boss warning banner DOM element
    this.buildBossWarningBanner(this.currentLevel);

    // Set up keyboard event listeners
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('resize', this.handleResize);
  }

  /**
   * Starts the game — resets all state and begins the game loop.
   * The game loop is driven externally by calling update() each frame.
   */
  public start(): void {
                // Reset game state
    this.state.score = 0;
    this.state.running = true;
    this.paused = false;
    this.state.elapsedTime = 0;
    this.state.enemySpawnTimer = 1.0;
    this.state.enemiesDestroyed = 0;

    // Reset total score
    this.totalScore = 0;

    // Reset game stats
    this.resetGameStats();

    // Reset player
    this.player.reset();

            // Clear all enemies, bullets, and pickups
    this.clearEnemies();
    this.bulletPool.clear();
    this.enemyBulletPool.clear();
    this.effectManager.clear();
    this.playerHealth = this.maxPlayerHealth;
    this.playerInvincibleTimer = 0;

    // Clear floating texts
    for (const ft of this.floatingTexts) {
      ft.element.remove();
    }
    this.floatingTexts.length = 0;

        // Reset periodic pickup timer
    this.periodicPickupTimer = 30.0;

    // Reset wingman pickup timer
    this.periodicWingmanPickupTimer = 20.0;

    // Reset medkit pickup timer
    this.periodicMedkitPickupTimer = 25.0;

    // Clear wingman pickups
    for (const wp of this.wingmanPickups) {
      wp.deactivate();
    }
    this.wingmanPickups.length = 0;

    // Clear medkit pickups
    for (const mp of this.medkitPickups) {
      mp.deactivate();
    }
    this.medkitPickups.length = 0;

        // Reset HUD
    this.hud.reset();

        // Reset level state
    this.currentLevel = 1;
    this.levelElapsedTime = 0;
    this.bossActive = false;
    this.bossSpawned = false;
    this.levelComplete = false;
    this.bossDefeated = false;
    this.waveSpawnTimer = 0;
    this.enemiesSpawnedInWave = 0;
    this.currentWaveType = '';
    this.screenShakeTime = 0;
    this.screenShakeMagnitude = 0;

    // Dispose the old boss (will be recreated lazily on spawn)
    this.boss?.dispose();
    this.boss = null;

    // Reset corridor style to titan-gate
    this.corridor?.setLevelStyle('titan-gate');

    // Reset the level flow manager
    this.levelFlowManager?.reset();

    // Hide the boss warning banner
    this.hideBossWarning();

    // Hide the boss health bar
    this.hud.hideBossHealthBar();

        // Reset the clock to avoid a large delta on the first frame
    this.clock.getDelta();

    // Start the player entrance animation
    this.startPlayerEntrance();
  }

    /**
   * Stops the game loop.
   * The game state is preserved — call start() to resume.
   */
  public stop(): void {
    this.state.running = false;
  }

  /**
   * Pauses the game.
   * Sets the paused flag, stops the game loop, and consumes any pending delta time
   * so that resuming doesn't cause a large time jump.
   */
  public pause(): void {
    this.paused = true;
    this.state.running = false;
    this.clock.getDelta();
  }

  /**
   * Resumes the game from a paused state.
   * Clears the paused flag, restarts the game loop, and resets the clock
   * to prevent a large delta jump on the next frame.
   */
  public resume(): void {
    this.paused = false;
    this.state.running = true;
    this.clock.getDelta();
  }

  /**
   * Returns whether the game is currently paused.
   *
   * @returns {boolean} True if the game is paused, false otherwise
   */
  public isPaused(): boolean {
    return this.paused;
  }

  /**
   * The main per-frame update method.
   * Should be called once per frame from the render loop.
   * Calculates delta time, updates all game systems, and checks collisions.
   */
    public update(): void {
    // Get delta time, clamped to 0.05s to prevent spiral of death
    const delta = Math.min(this.clock.getDelta(), 0.05);

    // Death sequence — keeps ticking even though the game is paused, so the
    // explosion can play out before the MISSION FAILED screen appears
    if (this.deathDelayTimer > 0) {
      this.deathDelayTimer -= delta;

      // Keep the explosion and screen shake animating while paused
      this.updateEffects(delta);
      this.updateScreenShake(delta);

      if (this.deathDelayTimer <= 0) {
        this.deathDelayTimer = 0;
        this.triggerGameOver();
      }
      return;
    }

    // Level clear sequence — the player keeps control while the boss's
    // sustained explosion plays; the game only pauses at the settlement screen
    if (this.levelClearDelayTimer > 0) {
      this.levelClearDelayTimer -= delta;

      // Spawn a sustained chain of explosions at the defeated boss position
      if (this.bossExplosionPos) {
        this.bossExplosionChainTimer -= delta;
        if (this.bossExplosionChainTimer <= 0) {
          const jitterX = (Math.random() - 0.5) * 4;
          const jitterY = (Math.random() - 0.5) * 3;
          this.effectManager.spawnExplosion({
            x: this.bossExplosionPos.x + jitterX,
            y: this.bossExplosionPos.y + jitterY,
            z: this.bossExplosionPos.z,
          });
          this.bossExplosionChainTimer = 0.22;
        }
      }

      if (this.levelClearDelayTimer <= 0) {
        this.levelClearDelayTimer = 0;
        this.bossExplosionPos = null;
        this.triggerLevelClear();
        return;
      }
    }

    if (!this.state.running) return;

        // Skip all update logic while paused (the scene still renders via the render loop)
    if (this.paused) return;

    // Hit stop — freeze the game loop briefly for dramatic impact
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= delta;
      // Still update effects so the freeze frame looks alive
      this.updateEffects(delta);
      return;
    }
    // when the tab is backgrounded or on slow frames
    this.state.elapsedTime += delta;

    // Decrement the enemy fire suppression timer (PROTECT mechanic)
    if (this.enemyFireSuppressionTimer > 0) {
      this.enemyFireSuppressionTimer = Math.max(0, this.enemyFireSuppressionTimer - delta);
    }

            // Update all game systems
    this.updatePlayer(delta);

    // Update player invincibility timer
    if (this.playerInvincibleTimer > 0) {
      this.playerInvincibleTimer -= delta;
      this.playerBlinkTimer += delta;
      // Blink the player mesh during invincibility
      const blinkVisible = Math.sin(this.playerBlinkTimer * 20) > 0;
      this.player.mesh.visible = blinkVisible;
      if (this.playerInvincibleTimer <= 0) {
        this.player.mesh.visible = true;
      }
    }

        this.updateAutoFire(delta);
        this.updateEnemies(delta);
    this.updateEliteEnemies(delta);
    this.updateEnemyBullets(delta);
    this.updateEffects(delta);
    this.updateBullets(delta);
    this.checkCollisions();
    this.checkEnemyBulletCollisions();
    this.checkEnemyContactCollisions();
    this.updateCorridor(delta);
    this.updateLevelFlow(delta);
        this.updateBoss(delta);
    this.updateScreenShake(delta);

    // Update parallax background and ambient particles
    if (this.parallaxBackground && !this.bossActive) {
      const config = LEVEL_CONFIGS[this.currentLevel];
      if (config) {
        this.parallaxBackground.update(delta, config.scrollSpeed);
      }
    }
    this.ambientParticles?.update(delta, 0);

    // Update wingmen (formation + attacks)
    this.player.updateWingmen(delta, this.bulletPool, this.enemies);

    // Check LANCE beam collisions
    this.checkLanceBeamCollisions();

    // Check SEEKER missile collisions
    this.checkSeekerMissileCollisions();

        // Update periodic pickup spawner
    this.periodicPickupTimer -= delta;
    if (this.periodicPickupTimer <= 0) {
      this.spawnPeriodicPickup();
      this.periodicPickupTimer = 30.0;
    }

    // Update periodic wingman pickup spawner
    this.periodicWingmanPickupTimer -= delta;
    if (this.periodicWingmanPickupTimer <= 0) {
      this.spawnPeriodicWingmanPickup();
      this.periodicWingmanPickupTimer = 20.0;
    }

    // Update periodic medkit pickup spawner
    this.periodicMedkitPickupTimer -= delta;
    if (this.periodicMedkitPickupTimer <= 0) {
      this.spawnPeriodicMedkitPickup();
      this.periodicMedkitPickupTimer = 25.0;
    }

    // Update pickups and floating texts
    this.updatePickups(delta);
    this.checkPickupCollection();
    this.updateFloatingTexts(delta);

    // Update wingman pickups
    this.updateWingmanPickups(delta);
    this.checkWingmanPickupCollection();

    // Update medkit pickups
    this.updateMedkitPickups(delta);
    this.checkMedkitPickupCollection();
  }

  /**
   * Disposes the game — removes all event listeners and cleans up.
   * Should be called when the game is no longer needed.
   */
  public dispose(): void {
    if (this.isDisposed) return;

        // Remove event listeners
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.handleResize);

        // Clean up floating texts
    for (const ft of this.floatingTexts) {
      ft.element.remove();
    }
    this.floatingTexts.length = 0;

    // Remove and dispose all remaining enemies
    for (const enemy of this.enemies) {
      enemy.deactivate();
      this.disposeObject(enemy.mesh);
    }
    this.enemies.length = 0;

    // Remove and dispose all remaining pickups
    for (const pickup of this.pickups) {
      pickup.deactivate();
      this.disposeObject(pickup.mesh);
    }
    this.pickups.length = 0;

    // Remove and dispose wingman pickups
    for (const wp of this.wingmanPickups) {
      wp.deactivate();
      this.disposeObject(wp.mesh);
    }
    this.wingmanPickups.length = 0;

    // Remove and dispose medkit pickups
    for (const mp of this.medkitPickups) {
      mp.deactivate();
      this.disposeObject(mp.mesh);
    }
    this.medkitPickups.length = 0;

    // Remove and dispose wingmen (including despawning ones)
    this.player.disposeWingmen();

    // Remove and dispose the player plane
    this.disposeObject(this.player.mesh);

    // Dispose the bullet pools (removes every bullet mesh from the scene)
    this.bulletPool.dispose();
    this.enemyBulletPool.dispose();
    this.effectManager.clear();

    // Dispose the modular corridor
    this.corridor?.dispose();
    this.corridor = null;

        // Dispose the boss
    this.boss?.dispose();
    this.boss = null;

    // Dispose parallax background and ambient particles
    this.parallaxBackground?.dispose();
    this.parallaxBackground = null;
    this.ambientParticles?.dispose();
    this.ambientParticles = null;

    // Clear entrance trail particles
    this.clearEntranceTrailParticles();

    // Remove the boss warning banner element
    if (this.bossWarningElement && this.bossWarningElement.parentNode) {
      this.bossWarningElement.parentNode.removeChild(this.bossWarningElement);
    }
    this.bossWarningElement = null;

    this.isDisposed = true;
  }

  /**
   * Removes an object from the scene and disposes every geometry and
   * material on its mesh children, freeing the associated GPU resources.
   */
  private disposeObject(object: THREE.Object3D): void {
    this.scene.remove(object);
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        if (mesh.geometry) mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) material.dispose();
      }
    });
  }

  /**
   * Builds the cold military corridor background scene.
   * Creates a grid floor, side walls with cyan conduit strips,
   * and a subtle ceiling. The corridor runs along the Y-axis.
   */
  private buildCorridorBackground(): void {
    // --- Grid Floor ---
    // Use a GridHelper for the floor grid with cyan-tinted lines
    const gridSize = 40;
    const gridDivisions = 40;
    this.gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x00c8ff, 0x2a3a4a);
    // Rotate so the grid lies on the X-Y plane (facing the camera on Z)
    this.gridHelper.rotation.x = Math.PI / 2;
    // Position the grid at the bottom of the play field
    this.gridHelper.position.z = -2;
    // Slightly transparent for a subtle look
    (this.gridHelper.material as THREE.Material).transparent = true;
    (this.gridHelper.material as THREE.Material).opacity = 0.4;
    this.backgroundGroup.add(this.gridHelper);

    // --- Side Walls ---
    // Left wall
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x141a24,
      metalness: 0.5,
      roughness: 0.7,
    });
    const wallGeometry = new THREE.BoxGeometry(1, 20, 12);

    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.position.set(-9, 0, -2);
    this.backgroundGroup.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWall.position.set(9, 0, -2);
    this.backgroundGroup.add(rightWall);

    // --- Cyan Energy Conduit Strips ---
    // Thin emissive boxes running along the walls
    const conduitMaterial = new THREE.MeshBasicMaterial({
      color: 0x00c8ff,
      transparent: true,
      opacity: 0.8,
    });
    const conduitGeometry = new THREE.BoxGeometry(0.1, 18, 0.1);

    // Left wall conduits
    const leftConduit1 = new THREE.Mesh(conduitGeometry, conduitMaterial);
    leftConduit1.position.set(-8.5, 0, -1);
    this.backgroundGroup.add(leftConduit1);

    const leftConduit2 = new THREE.Mesh(conduitGeometry, conduitMaterial);
    leftConduit2.position.set(-8.5, 0, -3);
    this.backgroundGroup.add(leftConduit2);

    // Right wall conduits
    const rightConduit1 = new THREE.Mesh(conduitGeometry, conduitMaterial);
    rightConduit1.position.set(8.5, 0, -1);
    this.backgroundGroup.add(rightConduit1);

    const rightConduit2 = new THREE.Mesh(conduitGeometry, conduitMaterial);
    rightConduit2.position.set(8.5, 0, -3);
    this.backgroundGroup.add(rightConduit2);

    // --- Ceiling ---
    // Subtle dark ceiling above the play field
    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0e14,
      metalness: 0.3,
      roughness: 0.8,
    });
    const ceilingGeometry = new THREE.BoxGeometry(20, 1, 12);
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.position.set(0, 10, -2);
    this.backgroundGroup.add(ceiling);

    // --- Lighting ---
    // Ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.backgroundGroup.add(ambientLight);

    // Directional light for shadows and depth
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    this.backgroundGroup.add(directionalLight);

    // Cyan accent light for the cold military aesthetic
    const cyanLight = new THREE.PointLight(0x00c8ff, 0.5, 20);
    cyanLight.position.set(0, 0, 3);
    this.backgroundGroup.add(cyanLight);
  }

    /**
   * Builds the modular corridor system for Level 1.
   * Creates 8 corridor segments and hides the old static background.
   */
  private buildModularCorridor(): void {
    // Hide the old static background group to prevent visual conflict
    this.backgroundGroup.visible = false;

    // Create the modular corridor with 8 segments
    this.corridor = new ModularCorridor(this.scene, 8);
  }

  /**
   * Updates the modular corridor — scrolls segments and recycles them.
   *
   * @param delta - Time elapsed since last frame in seconds
   */
  private updateCorridor(delta: number): void {
    if (this.corridor && !this.bossActive) {
      const config = LEVEL_CONFIGS[this.currentLevel];
      if (config) {
        this.corridor.update(delta, config.scrollSpeed);
      }
    }
  }

  /**
   * Builds the boss warning banner DOM element.
   * Creates a red flashing banner that appears before the boss fight.
   */
    private buildBossWarningBanner(level: number = 1): void {
    const banner = document.createElement('div');
    banner.id = 'boss-warning-banner';
    banner.style.display = 'none';

    // Title
    const title = document.createElement('span');
    title.className = 'warning-title';
    title.textContent = 'WARNING';
    banner.appendChild(title);

    // Subtitle
    const subtitle = document.createElement('span');
    subtitle.className = 'warning-subtitle';
                const levelName = level === 1 ? 'LEVEL 1' : level === 2 ? 'LEVEL 2' : 'LEVEL 3';
    subtitle.textContent = `HEAVY HOSTILE DETECTED — ${levelName}`;
    banner.appendChild(subtitle);

    // Append to document body
    document.body.appendChild(banner);

    this.bossWarningElement = banner;
  }

  /**
   * Shows the boss warning banner.
   * The banner displays for 2 seconds before the boss spawns.
   */
  private showBossWarning(): void {
    if (!this.bossWarningElement || this.bossWarningShown) return;

        this.bossWarningElement.style.display = 'flex';
    this.bossWarningElement.classList.remove('fade-out', 'hidden');
    this.bossWarningShown = true;
    this.bossWarningTimer = 2.0;

    // Add subtle screen shake during the warning
    this.triggerShake(0.1, 2.0);
  }

  /**
   * Hides the boss warning banner with a fade-out animation.
   */
  private hideBossWarning(): void {
    if (!this.bossWarningElement) return;

    // Add fade-out class for the animation
    this.bossWarningElement.classList.add('fade-out');

    // After 500ms, hide the banner and remove the fade-out class
    setTimeout(() => {
      if (this.bossWarningElement) {
        this.bossWarningElement.style.display = 'none';
        this.bossWarningElement.classList.remove('fade-out', 'hidden');
      }
    }, 500);

    this.bossWarningShown = false;
  }

  /**
   * Spawns the Level 1 boss (IRONCLAD).
   * Clears all existing enemies and shows the boss health bar.
   */
    private spawnBoss(): void {
    if (this.bossSpawned) return;

    // Create the boss lazily based on the current level
        if (this.currentLevel === 1) {
      if (!this.boss) {
                this.boss = new IroncladBoss(this.scene, 200);
      }
      this.boss.bulletSpeedMultiplier = 0.85;
      this.boss.spawn({ x: 0, y: 14, z: 0 });
      this.hud.showBossHealthBar('IRONCLAD');
        } else if (this.currentLevel === 2) {
      if (!this.boss) {
                this.boss = new VoidReaverBoss(this.scene, 300);
      }
      this.boss.bulletSpeedMultiplier = 1.0;
      this.boss.spawn({ x: 0, y: 14, z: 0 });
      this.hud.showBossHealthBar('VOID REAVER');
    } else if (this.currentLevel === 3) {
      if (!this.boss) {
                this.boss = new SovereignBoss(this.scene, 500);
      }
      this.boss.bulletSpeedMultiplier = 1.15;
      this.boss.spawn({ x: 0, y: 14, z: 0 });
      this.hud.showBossHealthBar('SOVEREIGN');
    }

    // Update the boss warning subtitle with the current level
    const subtitle = this.bossWarningElement?.querySelector('.warning-subtitle');
    if (subtitle) {
      subtitle.textContent = `HEAVY HOSTILE DETECTED — LEVEL ${this.currentLevel}`;
    }

    this.bossActive = true;
    this.bossSpawned = true;

    // Stop regular enemy spawning by setting the wave to boss type
    this.currentWaveType = 'boss';
  }

  /**
   * Updates the level flow — handles wave progression and enemy spawning.
   *
   * @param delta - Time elapsed since last frame in seconds
   */
  private updateLevelFlow(delta: number): void {
    // Skip if boss is active or level is complete
    if (this.bossActive || this.levelComplete || !this.levelFlowManager) return;

    // Increment level elapsed time
    this.levelElapsedTime += delta;

    // Check if the current wave should start
    const currentWave = this.levelFlowManager.getCurrentWave();
    if (this.levelElapsedTime < currentWave.startTime) return;

    // Check if the boss warning should be triggered
    if (this.levelFlowManager.shouldTriggerBossWarning()) {
      this.showBossWarning();
    }

    // Run the boss warning timer — when it expires, hide the banner
    if (this.bossWarningTimer > 0) {
      this.bossWarningTimer -= delta;
      if (this.bossWarningTimer <= 0) {
        this.bossWarningTimer = 0;
        this.hideBossWarning();
      }
    }

    // Check if the boss should be spawned — only after the warning finishes
    if (this.levelFlowManager.shouldSpawnBoss()) {
      if (this.bossWarningTimer <= 0) {
        this.spawnBoss();
        return;
      }
      // Warning still playing — hold off on spawning enemies
      return;
    }

    // Update the current wave type
    this.currentWaveType = currentWave.type;

    // Spawn enemies at the wave's spawn interval
    this.waveSpawnTimer -= delta;
    if (this.waveSpawnTimer <= 0 && this.enemiesSpawnedInWave < currentWave.count) {
      this.spawnEnemy();
      this.enemiesSpawnedInWave++;
      this.waveSpawnTimer = currentWave.spawnInterval;
    }

    // Advance to the next wave when all enemies in the current wave are spawned
    if (this.enemiesSpawnedInWave >= currentWave.count) {
      this.levelFlowManager.advanceWave();
      this.enemiesSpawnedInWave = 0;
      this.waveSpawnTimer = 0;
    }
  }

  /**
   * Updates the boss — handles movement, firing, and health bar sync.
   *
   * @param delta - Time elapsed since last frame in seconds
   */
  private updateBoss(delta: number): void {
    if (!this.boss || !this.bossActive) return;

    // Suppress boss attacks while the PROTECT suppression timer is active:
    // keep a small positive cooldown so the boss's internal fire check
    // never reaches zero during the 1s window.
    if (this.enemyFireSuppressionTimer > 0 && this.boss.fireCooldown > 0) {
      this.boss.fireCooldown = Math.max(this.boss.fireCooldown, 0.05);
    }

        // Update the boss
    this.boss.update(delta, this.enemyBulletPool, this.player.mesh.position);

    // Trigger screen shake on boss attacks (check if boss just fired)
    if (this.boss instanceof IroncladBoss && this.boss.justFired) {
      this.triggerShake(0.2, 0.1);
    } else if (this.boss instanceof VoidReaverBoss && this.boss.justFired) {
      this.triggerShake(0.25, 0.1);
    } else if (this.boss instanceof SovereignBoss && this.boss.justFired) {
      this.triggerShake(0.3, 0.15);
    }

    // Update the boss health bar
    this.hud.updateBossHealth(this.boss.health, this.boss.maxHealth);

    // Check if the boss is destroyed
    if (this.boss.health <= 0) {
      this.triggerBossDefeat();
    }
  }

  /**
   * Triggers the boss defeat sequence.
   * Spawns a sustained explosion effect and clears all other enemies and
   * enemy bullets, then waits 3 seconds before showing the settlement screen.
   */
    private triggerBossDefeat(): void {
    if (!this.boss) return;

    // Set state flags
    this.bossActive = false;
    this.levelComplete = true;
    this.bossDefeated = true;

    // Hide the boss health bar
    this.hud.hideBossHealthBar();

    // Capture the boss position for the sustained explosion chain
    this.bossExplosionPos = this.boss.mesh.position.clone();

    // Spawn the massive boss explosion at the boss position
    this.effectManager.spawnBossExplosion({
      x: this.bossExplosionPos.x,
      y: this.bossExplosionPos.y,
      z: this.bossExplosionPos.z,
    });
    this.bossExplosionChainTimer = 0.2;

        // Set screen shake
    this.screenShakeTime = 0.5;
    this.screenShakeMagnitude = 0.5;

    // Deactivate the boss
    this.boss.deactivate();

    // Clear all other enemies and enemy bullets (the boss keeps burning)
    for (const enemy of this.enemies) {
      enemy.deactivate();
    }
    this.enemies.length = 0;
    this.enemyBulletPool.clear();

    // Do NOT show the settlement screen yet — let the sustained explosion
    // play out for 3 seconds first
    this.levelClearDelayTimer = 3;
  }

  /**
   * Shows the level clear settlement screen.
   * Computes the full score breakdown and fires the onLevelClear / onVictory
   * callback after the boss defeat explosion sequence has played out.
   */
  private triggerLevelClear(): void {
    // Pause gameplay while the settlement screen is shown
    this.state.running = false;

    // Calculate the full score breakdown using game stats
    const enemiesScore = this.gameStats.enemiesDestroyed * 100;
    const elitesScore = this.gameStats.elitesDestroyed * 500;
    const bossBonus = 5000;
    const pickupBonus = this.gameStats.pickupBonus;
    
    // Calculate time bonus: 100 points per 10 seconds remaining under par time
    const parTime = this.getLevelParTime();
    const remainingTime = Math.max(0, parTime - this.levelElapsedTime);
    const timeBonus = 100 * Math.floor(remainingTime / 10);
    
    // Calculate health bonus: 1000 points per remaining health point
    const healthBonus = this.playerHealth * 1000;
    
    // Calculate total score
    const totalScore = enemiesScore + elitesScore + bossBonus + pickupBonus + timeBonus + healthBonus;
    
    // Update game stats
    this.gameStats.bossBonus = bossBonus;
    this.gameStats.timeBonus = timeBonus;
    this.gameStats.healthBonus = healthBonus;
    this.gameStats.totalScore = totalScore;
    
    // Add the level clear bonuses to the HUD score
    this.hud.addScore(totalScore);
    
    // Build the full score breakdown object
    const scoreBreakdown = {
      enemies: enemiesScore,
      elites: elitesScore,
      boss: bossBonus,
      pickups: pickupBonus,
      time: timeBonus,
      health: healthBonus,
      total: totalScore,
    };

        // Accumulate the total score across all levels
    this.totalScore += totalScore;

    // If this is the final level (Level 3), trigger victory
    if (this.currentLevel === 3) {
      if (this.onVictory) {
        this.onVictory(this.totalScore);
      }
    } else {
      // Call the onLevelClear callback with the full breakdown
      if (this.onLevelClear) {
        this.onLevelClear(this.currentLevel, scoreBreakdown);
      }
    }

    
  }

    /**
   * Updates the screen shake effect.
   * Decays the shake magnitude linearly over time, applies random offsets
   * with decaying magnitude, and adds small random rotation for extra impact.
   * Restores the camera position and rotation when the shake completes.
   *
   * @param delta - Time elapsed since last frame in seconds
   */
  private updateScreenShake(delta: number): void {
    if (this.screenShakeTime > 0) {
      // Decrement the shake timer
      this.screenShakeTime -= delta;

      // Decay the magnitude linearly over time
      const decayFactor = Math.max(0, this.screenShakeTime / 0.5);
      const currentMagnitude = this.screenShakeMagnitude * decayFactor;

      // Apply random camera offset with decaying magnitude
      const shakeX = (Math.random() - 0.5) * 2 * currentMagnitude;
      const shakeY = (Math.random() - 0.5) * 2 * currentMagnitude;
      this.camera.position.set(
        this.baseCameraPosition.x + shakeX,
        this.baseCameraPosition.y + shakeY,
        this.baseCameraPosition.z
      );

      // Add small random rotation for extra impact
      const shakeRotX = (Math.random() - 0.5) * 0.02 * currentMagnitude;
      const shakeRotY = (Math.random() - 0.5) * 0.02 * currentMagnitude;
      this.camera.rotation.set(
        this.baseCameraRotation.x + shakeRotX,
        this.baseCameraRotation.y + shakeRotY,
        this.baseCameraRotation.z
      );
    } else {
      // Restore the camera to its default position and rotation
      this.camera.position.copy(this.baseCameraPosition);
      this.camera.rotation.copy(this.baseCameraRotation);
    }
  }

  /**
   * Triggers a screen shake with the given magnitude and duration.
   * If a shake is already active, the new shake overrides it.
   *
   * @param magnitude - The maximum offset magnitude in units
   * @param duration - The duration of the shake in seconds
   */
  public triggerShake(magnitude: number, duration: number): void {
    this.screenShakeMagnitude = magnitude;
    this.screenShakeTime = duration;
  }

  /**
   * Starts the player entrance animation.
   * Positions the player at the bottom of the screen and animates them
   * flying up to the starting position with a speed trail.
   */
  private startPlayerEntrance(): void {
    this.entranceActive = true;
    this.entranceTimer = 1.5;
    this.player.mesh.position.set(0, -10, 0);
    this.player.active = false;
    this.entranceTrailTimer = 0;
  }

  /**
   * Updates the player entrance animation.
   * Animates the player from y=-10 to y=-4 over 1.5 seconds with easing,
   * spawns trail particles behind the player, and on completion fires
   * a celebratory burst and enables player control.
   *
   * @param delta - Time elapsed since last frame in seconds
   */
  private updatePlayerEntrance(delta: number): void {
    if (!this.entranceActive) return;

    this.entranceTimer -= delta;
        const progress = Math.min(1, 1 - this.entranceTimer / 1.5);

    // Ease out cubic for a smooth deceleration
    const easedProgress = 1 - Math.pow(1 - progress, 3);

    // Animate from y=-10 to y=-4
    const targetY = -10 + easedProgress * 6;
    this.player.mesh.position.y = targetY;

    // Spawn trail particles
    this.entranceTrailTimer -= delta;
    if (this.entranceTrailTimer <= 0) {
      this.spawnEntranceTrailParticle();
      this.entranceTrailTimer = 0.05;
    }

    // Complete the entrance
    if (this.entranceTimer <= 0) {
      this.entranceActive = false;
      this.player.mesh.position.set(0, -4, 0);
      this.player.active = true;
      this.clearEntranceTrailParticles();
      this.fireCelebratoryBurst();
    }
  }

  /**
   * Spawns a small fading cyan particle behind the player during the entrance.
   * The particle drifts downward and fades out over 0.5 seconds.
   */
  private spawnEntranceTrailParticle(): void {
    const playerPos = this.player.mesh.position;
    const geometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00c8ff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particle = new THREE.Mesh(geometry, material);
    particle.position.set(
      playerPos.x + (Math.random() - 0.5) * 0.3,
      playerPos.y - 0.5,
      playerPos.z
    );
    this.scene.add(particle);
    this.entranceTrailParticles.push(particle);

    // Animate the trail particle — fade out and shrink over 0.5s
    const startTime = performance.now();
    const animateTrail = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const trailProgress = Math.min(elapsed / 0.5, 1);

      if (trailProgress >= 1) {
        this.scene.remove(particle);
        particle.geometry.dispose();
        material.dispose();
        const index = this.entranceTrailParticles.indexOf(particle);
        if (index !== -1) {
          this.entranceTrailParticles.splice(index, 1);
        }
        return;
      }

      material.opacity = 0.8 * (1 - trailProgress);
      const scale = 1 - trailProgress * 0.5;
      particle.scale.set(scale, scale, scale);
      particle.position.y -= 2 * 0.016; // Drift downward

      requestAnimationFrame(animateTrail);
    };
    requestAnimationFrame(animateTrail);
  }

  /**
   * Removes all entrance trail particles from the scene and disposes their resources.
   */
  private clearEntranceTrailParticles(): void {
    for (const particle of this.entranceTrailParticles) {
      this.scene.remove(particle);
      particle.geometry.dispose();
      (particle.material as THREE.Material).dispose();
    }
    this.entranceTrailParticles = [];
  }

  /**
   * PROTECT — the defensive core mechanic.
   * Sacrifices the oldest acquired wingman, clears every enemy bullet on
   * screen (including active boss projectiles), and detonates an
   * all-directional celebratory burst from the player.
   *
   * @returns {boolean} True if the protect was executed, false if no wingman
   *                    was available to sacrifice (or the game is paused).
   */
  public performProtect(): boolean {
    if (!this.state.running || this.paused) return false;
    if (this.player.getWingmanCount() === 0) return false;

    // 1. Sacrifice the oldest acquired wingman
    this.player.removeOldestWingman();

    // Refresh the HUD wingman indicator
    this.hud.setWingmen(this.player.getWingmen());

    // 2. Clear all enemy bullets on screen
    this.enemyBulletPool.clear();

    // Clear active boss projectiles as well (homing missiles / laser barrage)
    if (this.boss) {
      if (this.boss instanceof VoidReaverBoss) {
        for (const missile of this.boss.getActiveMissiles()) {
          missile.deactivate();
        }
      } else if (this.boss instanceof SovereignBoss) {
        for (const shot of this.boss.getActiveLaserShots()) {
          shot.deactivate();
        }
      }
    }

    // 3. Fire an all-directional celebratory burst from the player
    this.fireCelebratoryBurst();

    // 4. Enemies cannot fire new bullets for 1 second
    this.enemyFireSuppressionTimer = 1.0;

    return true;
  }

  /**
   * Fires a celebratory ring of bullets outward from the player position.
   * Spawns 24 bullets in a circle around the player.
   */
  private fireCelebratoryBurst(): void {
    const playerPos = this.player.mesh.position;
    const bulletCount = 24;

    for (let i = 0; i < bulletCount; i++) {
      const angle = (i / bulletCount) * Math.PI * 2;
      const bullet = this.bulletPool.get();
      if (bullet) {
        bullet.spawn({ x: playerPos.x, y: playerPos.y, z: playerPos.z }, 8);
        bullet.velocity.set(Math.cos(angle) * 8, Math.sin(angle) * 8, 0);
      }
    }
  }

      /**
   * Returns the boss instance for external use.
   *
   * @returns {IroncladBoss | VoidReaverBoss | SovereignBoss | null} The boss instance, or null if not created
   */
  public getBoss(): IroncladBoss | VoidReaverBoss | SovereignBoss | null {
    return this.boss;
  }

  /**
   * Returns the total score accumulated across all levels.
   *
   * @returns {number} The total score
   */
  public getTotalScore(): number {
    return this.totalScore;
  }

    /**
   * Returns the current level number.
   *
   * @returns {number} The current level number
   */
  public getCurrentLevel(): number {
    return this.currentLevel;
  }

  /**
   * Returns the display name of the current level.
   *
   * @returns {string} The current level name
   */
  public getLevelName(): string {
    switch (this.currentLevel) {
      case 1:
        return 'TITAN GATE';
      case 2:
        return 'VOID REACTOR';
      case 3:
        return 'SOVEREIGN CORE';
      default:
        return 'UNKNOWN LEVEL';
    }
  }

  /**
   * Returns the par time for the current level in seconds.
   * Par times: Level 1 = 5 min (300s), Level 2 = 7 min (420s), Level 3 = 9 min (540s).
   *
   * @returns {number} The par time in seconds
   */
  public getLevelParTime(): number {
    switch (this.currentLevel) {
      case 1:
        return 300;
      case 2:
        return 420;
      case 3:
        return 540;
      default:
        return 300;
    }
  }

  /**
   * Returns the current game stats for display on the game over screen.
   *
   * @returns {GameStats} The current game stats
   */
  public getGameStats(): GameStats {
    return { ...this.gameStats };
  }

  /**
   * Resets the game stats to their initial zeroed state.
   * Called when a level starts or restarts.
   */
  private resetGameStats(): void {
    this.gameStats = {
      enemiesDestroyed: 0,
      elitesDestroyed: 0,
      bossBonus: 0,
      pickupBonus: 0,
      timeBonus: 0,
      healthBonus: 0,
      totalScore: 0,
    };
  }

  /**
   * Retries the current level.
   * Resets the player health, power, wingmen, and position.
   * Clears all enemies, bullets, pickups, and effects.
   * Resets the level flow manager and restarts the level.
   */
    public retryLevel(): void {
    // Reset pause state
    this.paused = false;

    // Reset player health to max
    this.playerHealth = this.maxPlayerHealth;
    this.playerInvincibleTimer = 0;
    this.player.mesh.visible = true;
    this.player.active = true;

    // Reset player power level to 1
    this.player.setPowerLevel(1);
    this.hud.setPowerLevel(1);

    // Clear all wingmen (per design doc: level restart resets wingmen)
    this.player.clearWingmen();
    this.hud.setWingmen([]);

    // Reset player position to starting position
    this.player.mesh.position.set(0, -4, 0);

    // Clear all enemies, bullets, pickups, and effects
    this.clearEnemies();
    this.bulletPool.clear();
    this.enemyBulletPool.clear();
    this.effectManager.clear();

    // Clear floating texts
    for (const ft of this.floatingTexts) {
      ft.element.remove();
    }
    this.floatingTexts.length = 0;

    // Clear pickups
    for (const pickup of this.pickups) {
      pickup.deactivate();
    }
    this.pickups.length = 0;

    // Clear wingman pickups
    for (const wp of this.wingmanPickups) {
      wp.deactivate();
    }
    this.wingmanPickups.length = 0;

    // Clear medkit pickups
    for (const mp of this.medkitPickups) {
      mp.deactivate();
    }
    this.medkitPickups.length = 0;

    // Reset periodic pickup timers
    this.periodicPickupTimer = 30.0;
    this.periodicWingmanPickupTimer = 20.0;
    this.periodicMedkitPickupTimer = 25.0;

    // Reset level state
    this.levelElapsedTime = 0;
    this.bossActive = false;
    this.bossSpawned = false;
    this.levelComplete = false;
    this.bossDefeated = false;
    this.waveSpawnTimer = 0;
    this.enemiesSpawnedInWave = 0;
    this.currentWaveType = '';
    this.screenShakeTime = 0;
    this.screenShakeMagnitude = 0;

        // Dispose the old boss (will be recreated lazily on spawn)
    this.boss?.dispose();
    this.boss = null;

    // Reset corridor to the current level's style (disposes and recreates all segments)
    if (this.currentLevel === 1) {
      this.corridor?.setLevelStyle('titan-gate');
    } else if (this.currentLevel === 2) {
      this.corridor?.setLevelStyle('void-reactor');
    } else if (this.currentLevel === 3) {
      this.corridor?.setLevelStyle('sovereign-core');
    }

    // Reset the level flow manager
    this.levelFlowManager?.reset();

    // Hide the boss warning banner
    this.hideBossWarning();

    // Hide the boss health bar
    this.hud.hideBossHealthBar();

    // Reset game stats
    this.resetGameStats();

    // Reset HUD score
    this.hud.reset();

    // Spawn starting pickups for the retry, varying by level:
    //   Level 1: no pickups
    //   Level 2: 2 POWER + 1 random wingman
    //   Level 3: 3 POWER + 3 random wingmen
    // All drop from just above the top of the screen.
    if (this.currentLevel >= 2) {
      const powerCount = this.currentLevel === 2 ? 2 : 3;
      const wingmanCount = this.currentLevel === 2 ? 1 : 3;
      for (let i = 0; i < powerCount; i++) {
        const x = (i - (powerCount - 1) / 2) * 2.5;
        this.spawnPickup({ x, y: 9, z: 0 });
      }
      for (let i = 0; i < wingmanCount; i++) {
        const x = (i - (wingmanCount - 1) / 2) * 2.5;
        this.spawnWingmanPickup({ x, y: 9, z: 0 });
      }
    }

    // Fire an all-directional celebratory burst from the player, matching
    // the effect played when a level first starts.
    this.fireCelebratoryBurst();

    // Restart the game loop
    this.state.running = true;

    // Reset the clock to avoid a large delta on the first frame
    this.clock.getDelta();
  }

    /**
   * Returns to the base (main menu).
   * Stops the game loop and clears the scene.
   * Resets all game state including the current level back to 1.
   * The game only starts again when the player deploys a fighter from the menu.
   */
    public returnToBase(): void {
    // Reset pause state
    this.paused = false;

        // Stop the game loop
    this.state.running = false;

    // Reset total score
    this.totalScore = 0;

    // Reset current level to 1
    this.currentLevel = 1;

    // Reset corridor style to titan-gate
    this.corridor?.setLevelStyle('titan-gate');

    // Clear all enemies, bullets, pickups, and effects
    this.clearEnemies();
    this.bulletPool.clear();

    // Clear floating texts
    for (const ft of this.floatingTexts) {
      ft.element.remove();
    }
    this.floatingTexts.length = 0;

    // Reset periodic pickup timers
    this.periodicPickupTimer = 30.0;
    this.periodicWingmanPickupTimer = 20.0;
    this.periodicMedkitPickupTimer = 25.0;

    // Hide the player mesh and deactivate it
    this.player.mesh.visible = false;
    this.player.active = false;

    // Reset player health to max
    this.playerHealth = this.maxPlayerHealth;
    this.playerInvincibleTimer = 0;

    // Reset the HUD
    this.hud.reset();

    // Hide the boss health bar
    this.hud.hideBossHealthBar();

    // Dispose the boss (will be recreated lazily on spawn)
    this.boss?.dispose();
    this.boss = null;

    // Reset the level flow manager
    this.levelFlowManager?.reset();

    // Reset level state
    this.levelElapsedTime = 0;
    this.bossActive = false;
    this.bossSpawned = false;
    this.levelComplete = false;
    this.bossDefeated = false;
    this.waveSpawnTimer = 0;
    this.enemiesSpawnedInWave = 0;
    this.currentWaveType = '';
    this.screenShakeTime = 0;
    this.screenShakeMagnitude = 0;

    // Reset game stats
    this.resetGameStats();

        // Hide the boss warning banner
    this.hideBossWarning();

        // Reset the clock to avoid a large delta on the next start
    this.clock.getDelta();

        // Reset parallax and ambient particles to titan-gate style
    this.parallaxBackground?.setLevelStyle('titan-gate');
    this.ambientParticles?.setLevelStyle('titan-gate');
    this.clearEntranceTrailParticles();
  }

    /**
   * Transitions to the next level.
   * Resets level state, player health, and power level.
   * Keeps wingmen (they carry to next level).
   * Changes corridor style and creates a new level flow manager.
   */
    public transitionToNextLevel(): void {
    // Reset pause state
    this.paused = false;

    // Increment current level
    this.currentLevel++;

    // Reset game stats for the new level
    this.resetGameStats();

    // Reset level state
    this.levelElapsedTime = 0;
    this.bossActive = false;
    this.bossSpawned = false;
    this.levelComplete = false;
    this.bossDefeated = false;
    this.waveSpawnTimer = 0;
    this.enemiesSpawnedInWave = 0;
    this.currentWaveType = '';

    // Dispose the previous level's boss so the next level spawns its own
    this.boss?.dispose();
    this.boss = null;

    // Reset player health to max
    this.playerHealth = this.maxPlayerHealth;

    // Keep player power level and wingmen (carry over to the next level)
    this.hud.setPowerLevel(this.player.getPowerLevel());

        // Change corridor style for level 2 or 3
    if (this.currentLevel === 2) {
      this.corridor?.setLevelStyle('void-reactor');
    } else if (this.currentLevel === 3) {
      this.corridor?.setLevelStyle('sovereign-core');
    }

    // Create a new LevelFlowManager for the new level
    this.levelFlowManager = new LevelFlowManager(this.currentLevel);

    // Hide boss warning
    this.hideBossWarning();

    // Hide boss health bar
    this.hud.hideBossHealthBar();

    // Clear all enemies, bullets, and effects
    this.clearEnemies();
    this.bulletPool.clear();
    this.enemyBulletPool.clear();
    this.effectManager.clear();

    // Resume the game loop (it was paused while the settlement screen was shown)
    this.state.running = true;

        // Reset the clock
    this.clock.getDelta();

    // Start the player entrance animation for the new level
    this.startPlayerEntrance();

    // Update parallax and ambient particle styles
    if (this.currentLevel === 2) {
      this.parallaxBackground?.setLevelStyle('void-reactor');
      this.ambientParticles?.setLevelStyle('void-reactor');
    } else if (this.currentLevel === 3) {
      this.parallaxBackground?.setLevelStyle('sovereign-core');
      this.ambientParticles?.setLevelStyle('sovereign-core');
    }
  }

  


  /**
   * Updates the player based on keyboard input.
   *
   * @param delta - Time elapsed since last frame in seconds
   */
    private updatePlayer(delta: number): void {
    if (this.entranceActive) {
      this.updatePlayerEntrance(delta);
      return;
    }
    this.player.update(delta, this.keys);
  }

  /**
   * Handles auto-fire — spawns a bullet from the player's nose
   * when the fire cooldown has elapsed.
   *
   * @param delta - Time elapsed since last frame in seconds
   */
    private updateAutoFire(delta: number): void {
    if (!this.player.canFire()) return;

    const powerLevel = this.player.getPowerLevel();
    const noseY = this.player.mesh.position.y + 1.0;
    const noseZ = this.player.mesh.position.z;
    const playerX = this.player.mesh.position.x;

    // Base bullet damage per plane type.
    // TITAN (third fighter): base damage 5, scaling linearly with the power
    // level (5, 10, 15, 20, 25 across power levels 1-5 → +5 per POWER).
    // Other fighters: base damage 1 (+1 per POWER).
    const baseDamage = this.planeType === 'titan' ? 5 : 1;
    // Getting POWER pickups scales damage linearly with the power level
    const bulletDamage = baseDamage * powerLevel;

    switch (this.planeType) {
      case 'vanguard': {
        // VANGUARD: (N+1) parallel streams — starts at 2, +1 per power level
        const streams = powerLevel + 1;
        const spacing = 0.4;
        const totalWidth = (streams - 1) * spacing;
        for (let i = 0; i < streams; i++) {
          const offsetX = -totalWidth / 2 + i * spacing;
          const bullet = this.bulletPool.get();
          if (bullet) {
            bullet.spawn({ x: playerX + offsetX, y: noseY, z: noseZ }, 14);
            bullet.damage = bulletDamage;
          }
        }
        break;
      }
      case 'phantom': {
        // PHANTOM: N bullets in a fan — starts at 1, +1 per power level, widening angle
        const bulletCount = powerLevel;
        const maxAngle = 0.1 + (bulletCount - 1) * 0.1;
        for (let i = 0; i < bulletCount; i++) {
          const t = bulletCount === 1 ? 0 : i / (bulletCount - 1);
          const angle = bulletCount === 1 ? 0 : -maxAngle + t * 2 * maxAngle;
          const bullet = this.bulletPool.get();
          if (bullet) {
            bullet.spawn({ x: playerX, y: noseY, z: noseZ }, 14);
            bullet.velocity.set(Math.sin(angle) * 14, Math.cos(angle) * 14, 0);
            bullet.damage = bulletDamage;
          }
        }
        break;
      }
      case 'titan': {
        // TITAN: single wider bullet with increased scale, damage, and bullet speed
        const bullet = this.bulletPool.get();
        if (bullet) {
          bullet.spawn({ x: playerX, y: noseY, z: noseZ }, 18);
          const scale = 1 + (powerLevel - 1) * 0.3;
          bullet.setScale(scale);
          bullet.damage = bulletDamage;
        }
        break;
      }
    }

    this.player.resetFireCooldown();
  }

    /**
   * Updates enemies — spawns new enemies on a timer, updates all active enemies,
   * handles enemy firing, and removes enemies that go off-screen.
   *
   * @param delta - Time elapsed since last frame in seconds
   */
  private updateEnemies(delta: number): void {
    // Decrement the spawn timer
    this.state.enemySpawnTimer -= delta;

    // Spawn a new enemy when the timer reaches zero
    if (this.state.enemySpawnTimer <= 0) {
      this.spawnEnemy();
      // Reset timer to a random value between 1.0 and 2.0 seconds
      this.state.enemySpawnTimer = 1.0 + Math.random() * 1.0;
    }

    // Update all active enemies and remove off-screen ones
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      if (!enemy.active) {
        continue;
      }

      enemy.update(delta);

      // Handle enemy firing (suppressed for 1s after a PROTECT)
      if (enemy.fireCooldown <= 0 && this.enemyFireSuppressionTimer <= 0) {
        enemy.fire(this.enemyBulletPool, this.player.mesh.position);
      }

            // Deactivate enemies that go off-screen (below the play field)
      if (enemy.mesh.position.y < -8) {
        enemy.deactivate();
      }
    }
  }

  /**
   * Updates elite enemy systems — specifically Harbinger homing missiles.
   * Iterates through all active enemies and updates their missiles with
   * the player's current position for tracking.
   *
   * @param delta - Time elapsed since last frame in seconds
   */
  private updateEliteEnemies(delta: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      if (enemy instanceof Harbinger) {
        enemy.updateMissiles(delta, this.player.mesh.position);
      }
    }
  }

    /**
   * Updates all active bullets in the pool.
   * The pool automatically releases bullets that go off-screen.
   *
   * @param delta - Time elapsed since last frame in seconds
   */
  private updateBullets(delta: number): void {
    this.bulletPool.update(delta);
  }

  /**
   * Updates all active enemy bullets in the pool.
   * The pool automatically releases bullets that go off-screen.
   *
   * @param delta - Time elapsed since last frame in seconds
   */
  private updateEnemyBullets(delta: number): void {
    this.enemyBulletPool.update(delta);
  }

  /**
   * Updates all active effects (warp-in, hit, explosion).
   * The EffectManager automatically removes completed effects.
   *
   * @param delta - Time elapsed since last frame in seconds
   */
    private updateEffects(delta: number): void {
    this.effectManager.update(delta);
    
        // Check elite explosion effects for screen shake triggers
    const eliteExplosions = this.effectManager.getActiveEliteExplosions();
    for (const effect of eliteExplosions) {
      if (effect.screenShakeTriggered) {
        this.triggerShake(0.3, 0.2);
        effect.screenShakeTriggered = false;
        break;
      }
    }
    
    // Check elite warp effects for screen shake triggers
    const eliteWarps = this.effectManager.getActiveEliteWarps();
    for (const effect of eliteWarps) {
      if (effect.screenShakeTriggered) {
        this.triggerShake(0.15, 0.1);
        effect.screenShakeTriggered = false;
        break;
      }
    }
    
    // Check boss explosion effects for screen shake triggers
    const bossExplosions = this.effectManager.getActiveBossExplosions();
    for (const effect of bossExplosions) {
      if (effect.screenShakeTriggered) {
        this.triggerShake(0.5, 0.5);
        effect.screenShakeTriggered = false;
        break;
      }
    }
  }

    /**
   * Checks collisions between active bullets and active enemies.
   * On hit: applies damage, triggers hit flash, handles destruction with explosion,
   * and releases the bullet.
   */
  private checkCollisions(): void {
    const activeBullets = this.bulletPool.getActive();
    const activeEnemies = this.enemies.filter((e) => e.active);

    // Iterate bullets and enemies for collision detection
    for (const bullet of activeBullets) {
      // Skip if bullet was already released in a previous iteration
      if (!bullet.active) continue;

      const bulletBounds = bullet.getBounds();

      for (const enemy of activeEnemies) {
        // Skip if enemy is no longer active
        if (!enemy.active) continue;

        // Check for AABB intersection
        if (boxIntersects(bulletBounds, enemy.getBounds())) {
          // Apply damage to the enemy
          const destroyed = enemy.takeDamage(bullet.damage);

          // Trigger hit flash effect (white flash + cyan particle burst)
          enemy.flashHit();
          this.effectManager.spawnHit({
            x: bullet.mesh.position.x,
            y: bullet.mesh.position.y,
            z: bullet.mesh.position.z,
          });

                    if (destroyed) {
            // Enemy destroyed — deactivate, add score, trigger explosion
            this.handleEnemyDestroyed(enemy);
          }

                    // Release the bullet (single-hit bullets)
          this.bulletPool.release(bullet);
          break;
        }
      }
    }

    // Check collisions between bullets and the boss
    if (this.boss && this.bossActive) {
      const bossBounds = this.boss.getBounds();

      for (const bullet of activeBullets) {
        // Skip if bullet was already released
        if (!bullet.active) continue;

        // Check for AABB intersection with the boss
        if (boxIntersects(bullet.getBounds(), bossBounds)) {
          // Apply damage to the boss
          const destroyed = this.boss.takeDamage(bullet.damage);

          // Trigger hit flash effect
          this.effectManager.spawnHit({
            x: bullet.mesh.position.x,
            y: bullet.mesh.position.y,
            z: bullet.mesh.position.z,
          });

          // Release the bullet
          this.bulletPool.release(bullet);
        }
      }
    }
  }

  /**
   * Checks collisions between active enemy bullets and the player.
   * On hit: reduces player health, triggers invincibility blink, and releases the bullet.
   */
  private checkEnemyBulletCollisions(): void {
    // Skip if player is invincible
    if (this.playerInvincibleTimer > 0) return;
    if (!this.player.active) return;

    const activeEnemyBullets = this.enemyBulletPool.getActive();
    const playerBounds = this.player.getBounds();

    for (const bullet of activeEnemyBullets) {
      // Skip if bullet was already released
      if (!bullet.active) continue;

      // Check for AABB intersection with player
            if (boxIntersects(bullet.getBounds(), playerBounds)) {
// Damage the player
                this.playerHealth--;
        this.hud.setHealth(this.playerHealth);
        this.playerInvincibleTimer = this.playerInvincibleDuration;
        this.playerBlinkTimer = 0;

        // Hit penalty: lose 1 POWER (wingmen are kept)
        const hitPowerLevel = this.player.getPowerLevel();
        this.player.setPowerLevel(hitPowerLevel - 1);
        this.hud.setPowerLevel(this.player.getPowerLevel());

        // Trigger large screen shake on player hit
        this.triggerShake(0.5, 0.3);

        // Play an explosion particle burst on the player's hull
        const hitPos = this.player.mesh.position;
        this.effectManager.spawnExplosion({
          x: hitPos.x,
          y: hitPos.y,
          z: hitPos.z,
        });

        // Release the bullet
        this.enemyBulletPool.release(bullet);

                // Check if player is destroyed
                if (this.playerHealth <= 0) {
          // Stop player control
          this.player.active = false;
          this.player.mesh.visible = false;
          // Pause gameplay
          this.state.running = false;

          // Trigger explosion at player position
          const playerPos = this.player.mesh.position;
          this.effectManager.spawnExplosion({
            x: playerPos.x,
            y: playerPos.y,
            z: playerPos.z,
          });

          // Wait 3 seconds (while the explosion plays) before showing MISSION FAILED
          this.deathDelayTimer = 3;
        }

                // Only one bullet can hit per frame
        break;
      }
    }

    // Check SovereignBoss laser shots for collision with the player
    if (this.boss instanceof SovereignBoss && this.bossActive) {
      const laserShots = this.boss.getActiveLaserShots();
      for (const shot of laserShots) {
        if (!shot.active) continue;
                if (boxIntersects(shot.getBounds(), playerBounds)) {
          // Damage the player (same as enemy bullet hit)
          this.playerHealth--;
          this.hud.setHealth(this.playerHealth);
          this.playerInvincibleTimer = this.playerInvincibleDuration;
          this.playerBlinkTimer = 0;

          // Hit penalty: lose 1 POWER (wingmen are kept)
          const laserPowerLevel = this.player.getPowerLevel();
          this.player.setPowerLevel(laserPowerLevel - 1);
          this.hud.setPowerLevel(this.player.getPowerLevel());

          // Play an explosion particle burst on the player's hull
          const laserHitPos = this.player.mesh.position;
          this.effectManager.spawnExplosion({
            x: laserHitPos.x,
            y: laserHitPos.y,
            z: laserHitPos.z,
          });

          shot.deactivate();

          // Check if player is destroyed
          if (this.playerHealth <= 0) {
            // Stop player control
            this.player.active = false;
            this.player.mesh.visible = false;
            // Pause gameplay
            this.state.running = false;

            // Trigger explosion at player position
            const playerPos = this.player.mesh.position;
            this.effectManager.spawnExplosion({
              x: playerPos.x,
              y: playerPos.y,
              z: playerPos.z,
            });

            // Wait 3 seconds (while the explosion plays) before showing MISSION FAILED
            this.deathDelayTimer = 3;
          }

          // Only one laser shot can hit per frame
          break;
        }
      }
    }

    // Check VoidReaverBoss homing missiles for collision with the player
    if (this.boss instanceof VoidReaverBoss && this.bossActive) {
      const missiles = this.boss.getActiveMissiles();
      for (const missile of missiles) {
        if (!missile.active) continue;
                if (boxIntersects(missile.getBounds(), playerBounds)) {
          // Damage the player (same as enemy bullet hit)
          this.playerHealth--;
          this.hud.setHealth(this.playerHealth);
          this.playerInvincibleTimer = this.playerInvincibleDuration;
          this.playerBlinkTimer = 0;

          // Hit penalty: lose 1 POWER (wingmen are kept)
          const missilePowerLevel = this.player.getPowerLevel();
          this.player.setPowerLevel(missilePowerLevel - 1);
          this.hud.setPowerLevel(this.player.getPowerLevel());

          // Trigger screen shake on missile impact
          this.triggerShake(0.4, 0.25);

          // Play an explosion particle burst on the player's hull
          const missileHitPos = this.player.mesh.position;
          this.effectManager.spawnExplosion({
            x: missileHitPos.x,
            y: missileHitPos.y,
            z: missileHitPos.z,
          });

          // Destroy the missile on impact
          missile.deactivate();

          // Check if player is destroyed
          if (this.playerHealth <= 0) {
            // Stop player control
            this.player.active = false;
            this.player.mesh.visible = false;
            // Pause gameplay
            this.state.running = false;

            // Trigger explosion at player position
            const playerPos = this.player.mesh.position;
            this.effectManager.spawnExplosion({
              x: playerPos.x,
              y: playerPos.y,
              z: playerPos.z,
            });

            // Wait 3 seconds (while the explosion plays) before showing MISSION FAILED
            this.deathDelayTimer = 3;
          }

          // Only one missile can hit per frame
          break;
        }
      }
    }
  }

  /**
   * Checks body-contact collisions between Drones and the player.
   * Drones no longer fire bullets — instead they damage the player when
   * they fly into the player, and are destroyed on impact.
   */
  private checkEnemyContactCollisions(): void {
    // Skip if player is invincible or inactive
    if (this.playerInvincibleTimer > 0) return;
    if (!this.player.active) return;

    const playerBounds = this.player.getBounds();

    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      // Only Drones deal contact damage
      if (enemy.type !== 'drone') continue;

      if (boxIntersects(enemy.getBounds(), playerBounds)) {
        // Damage the player
        this.playerHealth--;
        this.hud.setHealth(this.playerHealth);
        this.playerInvincibleTimer = this.playerInvincibleDuration;
        this.playerBlinkTimer = 0;

        // Hit penalty: lose 1 POWER (wingmen are kept)
        const contactPowerLevel = this.player.getPowerLevel();
        this.player.setPowerLevel(contactPowerLevel - 1);
        this.hud.setPowerLevel(this.player.getPowerLevel());

        // Trigger large screen shake on player hit
        this.triggerShake(0.5, 0.3);

        // Play an explosion particle burst on the player's hull
        const hitPos = this.player.mesh.position;
        this.effectManager.spawnExplosion({
          x: hitPos.x,
          y: hitPos.y,
          z: hitPos.z,
        });

        // Destroy the drone on impact
        this.handleEnemyDestroyed(enemy);

        // Check if the player is destroyed
        if (this.playerHealth <= 0) {
          // Stop player control
          this.player.active = false;
          this.player.mesh.visible = false;
          // Pause gameplay
          this.state.running = false;

          // Trigger explosion at player position
          const playerPos = this.player.mesh.position;
          this.effectManager.spawnExplosion({
            x: playerPos.x,
            y: playerPos.y,
            z: playerPos.z,
          });

          // Wait 3 seconds (while the explosion plays) before showing MISSION FAILED
          this.deathDelayTimer = 3;
        }

        // Only one drone can hit per frame
        break;
      }
    }
  }

  /**
   * Fires the game-over callback after the death sequence has played out.
   */
  private triggerGameOver(): void {
    if (this.onGameOver) {
      this.onGameOver(this.currentLevel, this.hud.getScore());
    }
  }

      /**
   * Checks if the given enemy type string is an elite type.
   *
   * @param type - The enemy type string to check
   * @returns {boolean} True if the type is an elite type
   */
  private isEliteType(type: string): boolean {
    return type === 'reaper' || type === 'warden' || type === 'harbinger' || type === 'overlord';
  }

  /**
   * Checks if the given enemy is an elite enemy instance.
   *
   * @param enemy - The enemy to check
   * @returns {boolean} True if the enemy is an elite type
   */
  private isEliteEnemy(enemy: Enemy): boolean {
    return enemy instanceof Reaper || enemy instanceof Warden || enemy instanceof Harbinger || enemy instanceof Overlord;
  }

  /**
   * Handles enemy destruction — deactivates the enemy, awards score,
   * triggers the appropriate explosion effect, and handles pickup drops.
   * Elite enemies award 500 points, trigger enhanced explosions, and have
   * a 12% chance to drop a POWER or wingman pickup.
   *
   * @param enemy - The destroyed enemy
   */
    private handleEnemyDestroyed(enemy: Enemy): void {
    const enemyPos = enemy.mesh.position;
    enemy.deactivate();
    
    if (this.isEliteEnemy(enemy)) {
      // Elite enemy: 500 points, enhanced explosion, 12% drop chance
      this.hud.addScore(500);
      this.gameStats.elitesDestroyed++;
            this.effectManager.spawnEliteExplosion({
        x: enemyPos.x,
        y: enemyPos.y,
        z: enemyPos.z,
      });

      // Trigger hit stop for elite kills (50ms freeze)
      this.hitStopTimer = 0.05;

      // Trigger medium screen shake
      this.triggerShake(0.3, 0.2);

      // 12% chance to drop a POWER or wingman pickup (randomly chosen)
      if (Math.random() < 0.12) {
        if (Math.random() < 0.5) {
          this.spawnPickup(enemy.mesh.position);
        } else {
          this.spawnWingmanPickup(enemy.mesh.position);
        }
      }
        } else {
      // Basic enemy: 100 points, normal explosion, 5% drop chance
      this.hud.addScore(100);
      this.gameStats.enemiesDestroyed++;
            this.effectManager.spawnExplosion({
        x: enemyPos.x,
        y: enemyPos.y,
        z: enemyPos.z,
      });

      // Trigger small screen shake for basic explosions
      this.triggerShake(0.15, 0.15);

      // 5% chance to drop a POWER pickup
      if (Math.random() < 0.05) {
        this.spawnPickup(enemy.mesh.position);
      }
    }
    
    this.state.enemiesDestroyed++;
  }

    /**
   * Spawns a new enemy at a random top position.
   * Randomly selects from the three basic enemy types with weighted distribution:
   *   - Drone: 60%
   *   - Raider: 30%
   *   - Sentry: 10%
   * Enemies warp in with a cyan flash and expanding ring effect.
   * Elite enemies use the enhanced warp effect and move slower.
   */
    private spawnEnemy(): void {
    // Use the level flow manager to determine the enemy type based on the current wave
    const type = this.levelFlowManager
      ? this.levelFlowManager.getEnemyTypeForWave(this.currentWaveType)
      : getRandomEnemyType();
    
    // Check if this is an elite enemy type
    const isElite = this.isEliteType(type);
    
    // Create the enemy with the selected type
    const enemy = isElite
      ? createEliteEnemy(this.scene, this.enemyIdCounter++, type as EliteEnemyType)
      : createEnemy(this.scene, this.enemyIdCounter++, type);

    // Random spawn position at the top of the play field
    const spawnX = -7 + Math.random() * 14; // -7 to 7
    const spawnY = 9;
    
    // Type-specific drift speeds
    let spawnSpeed: number;
    if (isElite) {
      // Elite enemies move slower for a more imposing entrance
      spawnSpeed = 0.8;
    } else {
      switch (type) {
        case 'drone':
          spawnSpeed = 1.5; // Slow drift
          break;
        case 'raider':
          spawnSpeed = 2.5; // Medium drift
          break;
        case 'sentry':
          spawnSpeed = 2.0; // Medium drift, then hovers
          break;
        default:
          spawnSpeed = 1.5;
          break;
      }
    }

            // Set level-based bullet speed multiplier for difficulty scaling
    if (this.currentLevel === 1) {
      enemy.bulletSpeedMultiplier = 0.85;
    } else if (this.currentLevel === 2) {
      enemy.bulletSpeedMultiplier = 1.0;
    } else {
      enemy.bulletSpeedMultiplier = 1.15;
    }

    // Spawn the enemy — the Enemy class handles its own warp-in fade
    // (materials start at opacity 0 and fade in over 0.3s)
    enemy.spawn({ x: spawnX, y: spawnY, z: 0 }, spawnSpeed);
    
    // Trigger warp-in visual effect
    if (isElite) {
      // Elite enemies use the enhanced warp effect with screen shake
      this.effectManager.spawnEliteWarp({ x: spawnX, y: spawnY, z: 0 }, enemy.mesh);
    } else {
      // Basic enemies use the standard warp effect
      this.effectManager.spawnWarp({ x: spawnX, y: spawnY, z: 0 }, enemy.mesh);
    }
    
    // Add to enemies array
    this.enemies.push(enemy);
  }

  


  /**
   * Clears all enemies from the game.
   * Deactivates all active enemies and clears the enemies array.
   */
    private clearEnemies(): void {
    for (const enemy of this.enemies) {
      enemy.deactivate();
    }
    this.enemies.length = 0;

            // Also clear all pickups
    for (const pickup of this.pickups) {
      pickup.deactivate();
    }
    this.pickups.length = 0;

    // Also clear all wingman pickups
    for (const wp of this.wingmanPickups) {
      wp.deactivate();
    }
    this.wingmanPickups.length = 0;

    // Also clear all medkit pickups
    for (const mp of this.medkitPickups) {
      mp.deactivate();
    }
    this.medkitPickups.length = 0;

    // Clear all enemy bullets
    this.enemyBulletPool.clear();

    // Clear all effects
    this.effectManager.clear();
  }

    /**
   * Spawns a POWER pickup at the given position.
   * Creates a new PowerPickup instance and adds it to the pickups array.
   *
   * @param position - The spawn position (Vector3 or {x, y, z})
   */
  private spawnPickup(position: THREE.Vector3 | { x: number; y: number; z: number }): void {
    const pickup = new PowerPickup(this.scene, this.pickupIdCounter++);
    pickup.spawn(position);
    this.pickups.push(pickup);
  }

    /**
   * Spawns a periodic POWER pickup from a random spawn point.
   * Called every ~10 seconds during gameplay.
   */
  private spawnPeriodicPickup(): void {
    const spawnX = -6 + Math.random() * 12;
    const spawnY = 9;
    this.spawnPickup({ x: spawnX, y: spawnY, z: 0 });
  }

  /**
   * Spawns a periodic wingman pickup from a random spawn point.
   * Called every ~20 seconds during gameplay.
   */
  private spawnPeriodicWingmanPickup(): void {
    const spawnX = -6 + Math.random() * 12;
    const spawnY = 9;
    this.spawnWingmanPickup({ x: spawnX, y: spawnY, z: 0 });
  }

  /**
   * Spawns a wingman pickup at the given position.
   * Creates a new WingmanPickup instance and adds it to the wingmanPickups array.
   *
   * @param position - The spawn position (Vector3 or {x, y, z})
   */
  private spawnWingmanPickup(position: THREE.Vector3 | { x: number; y: number; z: number }): void {
    // Pick the wingman type at spawn time so the pickup's accent color matches
    const type = getRandomWingmanType();
    const pickup = new WingmanPickup(this.scene, this.wingmanPickupIdCounter++, type);
    pickup.spawn(position);
    this.wingmanPickups.push(pickup);
  }

  /**
   * Updates all active wingman pickups and removes off-screen ones.
   *
   * @param delta - Time elapsed since last frame in seconds
   */
  private updateWingmanPickups(delta: number): void {
    const playerPos = this.player.mesh.position;

    for (let i = this.wingmanPickups.length - 1; i >= 0; i--) {
      const pickup = this.wingmanPickups[i];
      if (!pickup.active) continue;

      pickup.update(delta, playerPos);

      // Deactivate pickups that go off-screen (below the play field)
      if (pickup.mesh.position.y < -8) {
        pickup.deactivate();
      }
    }
  }

  /**
   * Checks if any active wingman pickup is within collection range of the player.
   * On collection: adds a random wingman type to the player's squadron and updates HUD.
   */
  private checkWingmanPickupCollection(): void {
    const playerPos = this.player.mesh.position;

    for (let i = this.wingmanPickups.length - 1; i >= 0; i--) {
      const pickup = this.wingmanPickups[i];
      if (!pickup.active) continue;

      if (pickup.isCollected(playerPos)) {
        // Add the pickup's wingman type (fixed at spawn) to the squadron
        const type = pickup.type;
        this.player.addWingman(this.scene, type);

        // Update HUD wingman indicator
        this.hud.setWingmen(this.player.getWingmen());

        pickup.deactivate();
      }
    }
  }

  /**
   * Spawns a periodic medkit pickup from a random spawn point.
   * Called every 25 seconds during gameplay.
   */
  private spawnPeriodicMedkitPickup(): void {
    const spawnX = -6 + Math.random() * 12;
    const spawnY = 9;
    this.spawnMedkitPickup({ x: spawnX, y: spawnY, z: 0 });
  }

  /**
   * Spawns a medkit pickup at the given position.
   * Creates a new MedkitPickup instance and adds it to the medkitPickups array.
   *
   * @param position - The spawn position (Vector3 or {x, y, z})
   */
  private spawnMedkitPickup(position: THREE.Vector3 | { x: number; y: number; z: number }): void {
    const pickup = new MedkitPickup(this.scene, this.medkitPickupIdCounter++);
    pickup.spawn(position);
    this.medkitPickups.push(pickup);
  }

  /**
   * Updates all active medkit pickups and removes off-screen ones.
   *
   * @param delta - Time elapsed since last frame in seconds
   */
  private updateMedkitPickups(delta: number): void {
    const playerPos = this.player.mesh.position;

    for (let i = this.medkitPickups.length - 1; i >= 0; i--) {
      const pickup = this.medkitPickups[i];
      if (!pickup.active) continue;

      pickup.update(delta, playerPos);

      // Deactivate pickups that go off-screen (below the play field)
      if (pickup.mesh.position.y < -8) {
        pickup.deactivate();
      }
    }
  }

  /**
   * Checks if any active medkit pickup is within collection range of the player.
   * On collection: restores 1 shield segment (health) up to the max and updates HUD.
   */
  private checkMedkitPickupCollection(): void {
    const playerPos = this.player.mesh.position;

    for (let i = this.medkitPickups.length - 1; i >= 0; i--) {
      const pickup = this.medkitPickups[i];
      if (!pickup.active) continue;

      if (pickup.isCollected(playerPos)) {
        // Restore 1 shield segment, clamped to max health
        if (this.playerHealth < this.maxPlayerHealth) {
          this.playerHealth++;
          this.hud.setHealth(this.playerHealth);
          this.createFloatingText('SHIELD +1', playerPos);
        } else {
          // At full health: convert to score bonus with floating text
          this.hud.addScore(250);
          this.gameStats.pickupBonus += 250;
          this.createFloatingText('BONUS +250', playerPos);
        }

        pickup.deactivate();
      }
    }
  }

  /**
   * Checks LANCE wingman beam collisions against active enemies.
   * The beam pierces enemies — it damages all enemies it touches.
   */
  private checkLanceBeamCollisions(): void {
    const wingmen = this.player.getWingmen();
    const activeEnemies = this.enemies.filter((e) => e.active);

    for (const wingman of wingmen) {
      if (!wingman.active || wingman.type !== 'lance') continue;

      const beamBounds = wingman.getBeamBounds();
      if (!beamBounds) continue;

      for (const enemy of activeEnemies) {
        if (!enemy.active) continue;

                        if (boxIntersects(beamBounds, enemy.getBounds())) {
          // Beam pierces — apply damage but don't destroy the beam
          const destroyed = enemy.takeDamage(0.5); // Beam damage per frame

          // Trigger hit flash effect
          enemy.flashHit();
          this.effectManager.spawnHit({
            x: enemy.mesh.position.x,
            y: enemy.mesh.position.y,
            z: enemy.mesh.position.z,
          });

          if (destroyed) {
            // Enemy destroyed — deactivate, add score, trigger explosion
            this.handleEnemyDestroyed(enemy);
          }
        }
      }
    }
  }

  /**
   * Checks SEEKER missile collisions against active enemies.
   * Missiles are destroyed on impact.
   */
  private checkSeekerMissileCollisions(): void {
    const wingmen = this.player.getWingmen();
    const activeEnemies = this.enemies.filter((e) => e.active);

    for (const wingman of wingmen) {
      if (!wingman.active || wingman.type !== 'seeker') continue;

      const seeker = wingman as SeekerWingman;
      const missiles = seeker.getActiveMissiles();

      for (const missile of missiles) {
        if (!missile.active) continue;

        const missileBounds = missile.getBounds();

        for (const enemy of activeEnemies) {
          if (!enemy.active) continue;

                              if (boxIntersects(missileBounds, enemy.getBounds())) {
            // Missile hits enemy — apply damage and destroy missile
            const destroyed = enemy.takeDamage(4);

            // Trigger hit flash effect
            enemy.flashHit();
            this.effectManager.spawnHit({
              x: enemy.mesh.position.x,
              y: enemy.mesh.position.y,
              z: enemy.mesh.position.z,
            });

            if (destroyed) {
              // Enemy destroyed — deactivate, add score, trigger explosion
              this.handleEnemyDestroyed(enemy);
            }

            missile.deactivate();
            break;
          }
        }
      }
    }
  }

  /**
   * Checks if any active pickup is within collection range of the player.
   * On collection: increases power level, or converts to +500 score at max power.
   */
  private checkPickupCollection(): void {
    const playerPos = this.player.mesh.position;

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pickup = this.pickups[i];
      if (!pickup.active) continue;

      if (pickup.isCollected(playerPos)) {
        const powerLevel = this.player.getPowerLevel();

        if (powerLevel < Player.MAX_POWER_LEVEL) {
          // Increase power level and update HUD
          this.player.setPowerLevel(powerLevel + 1);
          this.hud.setPowerLevel(this.player.getPowerLevel());
                } else {
          // At max power: convert to score bonus with floating text
          this.hud.addScore(500);
          this.gameStats.pickupBonus += 500;
          this.createFloatingText('BONUS +500', playerPos);
        }

        pickup.deactivate();
      }
    }
  }

  /**
   * Updates all active pickups and removes off-screen ones.
   *
   * @param delta - Time elapsed since last frame in seconds
   */
  private updatePickups(delta: number): void {
    const playerPos = this.player.mesh.position;

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pickup = this.pickups[i];
      if (!pickup.active) continue;

      pickup.update(delta, playerPos);

      // Deactivate pickups that go off-screen (below the play field)
      if (pickup.mesh.position.y < -8) {
        pickup.deactivate();
      }
    }
  }

  /**
   * Creates a floating text overlay element that floats up and fades out.
   * Used for the max-power bonus display.
   *
   * @param text - The text to display
   * @param position - The world position to display the text at
   */
  private createFloatingText(text: string, position: THREE.Vector3 | { x: number; y: number; z: number }): void {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.textContent = text;

    // Convert world position to screen position
    // Play field: X: -8 to 8, Y: -6 to 10
    const screenX = ((position.x + 8) / 16) * window.innerWidth;
    const screenY = ((10 - position.y) / 16) * window.innerHeight;

    el.style.left = `${screenX}px`;
    el.style.top = `${screenY}px`;

    document.body.appendChild(el);

    this.floatingTexts.push({
      element: el,
      elapsed: 0,
      duration: 1.5,
      startY: screenY,
    });
  }

  /**
   * Updates all floating texts — animates them floating up and fading out.
   * Removes elements when the animation completes.
   *
   * @param delta - Time elapsed since last frame in seconds
   */
  private updateFloatingTexts(delta: number): void {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.elapsed += delta;

      const progress = Math.min(ft.elapsed / ft.duration, 1);
      const offsetY = -progress * 60; // Float up 60px
      const opacity = 1 - progress;

      ft.element.style.transform = `translateY(${offsetY}px)`;
      ft.element.style.opacity = String(opacity);

      if (progress >= 1) {
        ft.element.remove();
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  /**
   * Handles keydown events — marks the key as pressed.
   *
   * @param event - The keyboard event
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    this.keys[event.code] = true;

    // PROTECT (Space): sacrifice the oldest wingman to clear enemy bullets
    if (event.code === 'Space' && !event.repeat && this.state.running && !this.paused) {
      this.performProtect();
    }
  };

  /**
   * Handles keyup events — marks the key as released.
   *
   * @param event - The keyboard event
   */
  private handleKeyUp = (event: KeyboardEvent): void => {
    this.keys[event.code] = false;
  };

  /**
   * Handles window resize events — updates the camera aspect ratio
   * and projection matrix to match the new window size.
   */
  private handleResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };
}