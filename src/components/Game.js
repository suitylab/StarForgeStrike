import * as THREE from 'three';
import { Player } from './Player';
import { BulletPool } from './BulletPool';
import { createEnemy, getRandomEnemyType } from './Enemy';
import { createEliteEnemy, Reaper, Warden, Harbinger, Overlord } from './EliteEnemy';
import { boxIntersects } from './Collision';
import { PowerPickup } from './PowerPickup';
import { WingmanPickup } from './WingmanPickup';
import { getRandomWingmanType } from './Wingman';
import { EnemyBulletPool } from './EnemyBulletPool';
import { EffectManager } from './Effects';
import { ModularCorridor } from './ModularSegment';
import { IroncladBoss } from './IroncladBoss';
import { VoidReaverBoss } from './VoidReaverBoss';
import { SovereignBoss } from './SovereignBoss';
import { LevelFlowManager, LEVEL_CONFIGS } from './LevelConfig';
import { ParallaxBackground } from './ParallaxBackground';
import { AmbientParticles } from './AmbientParticles';
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
    constructor(scene, camera, hud, planeType = 'vanguard', onLevelClear, onGameOver, onVictory) {
        /** The THREE.js scene containing all game objects */
        Object.defineProperty(this, "scene", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** The perspective camera viewing the play field */
        Object.defineProperty(this, "camera", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** The HUD overlay for score display */
        Object.defineProperty(this, "hud", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** The player-controlled fighter */
        Object.defineProperty(this, "player", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** The bullet object pool for efficient bullet management */
        Object.defineProperty(this, "bulletPool", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Array of active enemy entities */
        Object.defineProperty(this, "enemies", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Current game state */
        Object.defineProperty(this, "state", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Keyboard state — true for currently pressed keys */
        Object.defineProperty(this, "keys", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {}
        });
        /** Counter for generating unique enemy IDs */
        Object.defineProperty(this, "enemyIdCounter", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** THREE.js clock for delta-time calculation */
        Object.defineProperty(this, "clock", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Group containing all corridor background geometry */
        Object.defineProperty(this, "backgroundGroup", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Whether the game has been disposed (listeners removed) */
        Object.defineProperty(this, "isDisposed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        /** Reference to the grid floor for scrolling animation */
        Object.defineProperty(this, "gridFloor", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Reference to the grid helper for scrolling animation */
        Object.defineProperty(this, "gridHelper", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Array of active POWER pickups */
        Object.defineProperty(this, "pickups", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Array of active wingman pickups */
        Object.defineProperty(this, "wingmanPickups", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Counter for generating unique wingman pickup IDs */
        Object.defineProperty(this, "wingmanPickupIdCounter", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** Timer for periodic wingman pickup spawning (seconds) */
        Object.defineProperty(this, "periodicWingmanPickupTimer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 20.0
        });
        /** Counter for generating unique pickup IDs */
        Object.defineProperty(this, "pickupIdCounter", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** Array of active floating texts */
        Object.defineProperty(this, "floatingTexts", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Timer for periodic pickup spawning (seconds) */
        Object.defineProperty(this, "periodicPickupTimer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 10.0
        });
        /** The type of fighter the player selected */
        Object.defineProperty(this, "planeType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Pool for enemy bullets (red-orange, distinct from player cyan bullets) */
        Object.defineProperty(this, "enemyBulletPool", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Manager for warp-in, hit, and explosion effects */
        Object.defineProperty(this, "effectManager", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Player health (3 HP per design doc) */
        Object.defineProperty(this, "playerHealth", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 3
        });
        /** Maximum player health */
        Object.defineProperty(this, "maxPlayerHealth", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 3
        });
        /** Time remaining for player invincibility after being hit (seconds) */
        Object.defineProperty(this, "playerInvincibleTimer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** Duration of player invincibility after being hit (seconds) */
        Object.defineProperty(this, "playerInvincibleDuration", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 2.0
        });
        /** Timer for player blink animation during invincibility */
        Object.defineProperty(this, "playerBlinkTimer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** Modular corridor system for Level 1 */
        Object.defineProperty(this, "corridor", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Level flow manager for wave progression */
        Object.defineProperty(this, "levelFlowManager", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** The current level boss (IRONCLAD for Level 1, VOID REAVER for Level 2, SOVEREIGN for Level 3) */
        Object.defineProperty(this, "boss", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Callback invoked when a level is cleared — receives the level number and full score breakdown */
        Object.defineProperty(this, "onLevelClear", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Callback invoked when the player is destroyed (game over) */
        Object.defineProperty(this, "onGameOver", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Callback invoked when all levels are completed (victory) */
        Object.defineProperty(this, "onVictory", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Total score accumulated across all levels */
        Object.defineProperty(this, "totalScore", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** Game stats tracking for the current level */
        Object.defineProperty(this, "gameStats", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Whether the boss warning banner is currently shown */
        Object.defineProperty(this, "bossWarningShown", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        /** Time remaining for the boss warning banner (seconds) */
        Object.defineProperty(this, "bossWarningTimer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** The boss warning banner DOM element */
        Object.defineProperty(this, "bossWarningElement", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Whether the boss is currently active */
        Object.defineProperty(this, "bossActive", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        /** Whether the boss has been spawned */
        Object.defineProperty(this, "bossSpawned", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        /** Current level number */
        Object.defineProperty(this, "currentLevel", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 1
        });
        /** Time elapsed in the current level (seconds) */
        Object.defineProperty(this, "levelElapsedTime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** Timer for spawning enemies within the current wave (seconds) */
        Object.defineProperty(this, "waveSpawnTimer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** Number of enemies spawned in the current wave */
        Object.defineProperty(this, "enemiesSpawnedInWave", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** The type of the current wave ('drones', 'raiders', etc.) */
        Object.defineProperty(this, "currentWaveType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ''
        });
        /** Time remaining for screen shake (seconds) */
        Object.defineProperty(this, "screenShakeTime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** Magnitude of the screen shake */
        Object.defineProperty(this, "screenShakeMagnitude", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** Timer for hit stop freeze frames (seconds) */
        Object.defineProperty(this, "hitStopTimer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** Timer for player entrance animation (seconds) */
        Object.defineProperty(this, "entranceTimer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** Whether the player entrance animation is playing */
        Object.defineProperty(this, "entranceActive", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        /** Parallax background system */
        Object.defineProperty(this, "parallaxBackground", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Ambient particle system */
        Object.defineProperty(this, "ambientParticles", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Base camera position for screen shake restoration */
        Object.defineProperty(this, "baseCameraPosition", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new THREE.Vector3(0, 0, 14)
        });
        /** Base camera rotation for screen shake restoration */
        Object.defineProperty(this, "baseCameraRotation", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new THREE.Euler(0, 0, 0)
        });
        /** Speed trail particles for player entrance */
        Object.defineProperty(this, "entranceTrailParticles", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Timer for spawning entrance trail particles */
        Object.defineProperty(this, "entranceTrailTimer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** Whether the current level is complete */
        Object.defineProperty(this, "levelComplete", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        /** Whether the boss has been defeated */
        Object.defineProperty(this, "bossDefeated", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        /** Whether the game is currently paused */
        Object.defineProperty(this, "paused", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        /**
         * Handles keydown events — marks the key as pressed.
         *
         * @param event - The keyboard event
         */
        Object.defineProperty(this, "handleKeyDown", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (event) => {
                this.keys[event.code] = true;
            }
        });
        /**
         * Handles keyup events — marks the key as released.
         *
         * @param event - The keyboard event
         */
        Object.defineProperty(this, "handleKeyUp", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (event) => {
                this.keys[event.code] = false;
            }
        });
        /**
         * Handles window resize events — updates the camera aspect ratio
         * and projection matrix to match the new window size.
         */
        Object.defineProperty(this, "handleResize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => {
                const width = window.innerWidth;
                const height = window.innerHeight;
                this.camera.aspect = width / height;
                this.camera.updateProjectionMatrix();
            }
        });
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
        this.periodicPickupTimer = 10.0;
        // Initialize wingman pickup system
        this.wingmanPickups = [];
        this.wingmanPickupIdCounter = 0;
        this.periodicWingmanPickupTimer = 20.0;
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
    start() {
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
        this.periodicPickupTimer = 10.0;
        // Reset wingman pickup timer
        this.periodicWingmanPickupTimer = 20.0;
        // Clear wingman pickups
        for (const wp of this.wingmanPickups) {
            wp.deactivate();
        }
        this.wingmanPickups.length = 0;
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
    stop() {
        this.state.running = false;
    }
    /**
     * Pauses the game.
     * Sets the paused flag, stops the game loop, and consumes any pending delta time
     * so that resuming doesn't cause a large time jump.
     */
    pause() {
        this.paused = true;
        this.state.running = false;
        this.clock.getDelta();
    }
    /**
     * Resumes the game from a paused state.
     * Clears the paused flag, restarts the game loop, and resets the clock
     * to prevent a large delta jump on the next frame.
     */
    resume() {
        this.paused = false;
        this.state.running = true;
        this.clock.getDelta();
    }
    /**
     * Returns whether the game is currently paused.
     *
     * @returns {boolean} True if the game is paused, false otherwise
     */
    isPaused() {
        return this.paused;
    }
    /**
     * The main per-frame update method.
     * Should be called once per frame from the render loop.
     * Calculates delta time, updates all game systems, and checks collisions.
     */
    update() {
        if (!this.state.running)
            return;
        // Skip all update logic while paused (the scene still renders via the render loop)
        if (this.paused)
            return;
        // Get delta time, clamped to 0.05s to prevent spiral of death
        // (moved above hit-stop block so it's available there)
        const delta = Math.min(this.clock.getDelta(), 0.05);
        // Hit stop — freeze the game loop briefly for dramatic impact
        if (this.hitStopTimer > 0) {
            this.hitStopTimer -= delta;
            // Still update effects so the freeze frame looks alive
            this.updateEffects(delta);
            return;
        }
        // when the tab is backgrounded or on slow frames
        this.state.elapsedTime += delta;
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
            this.periodicPickupTimer = 10.0;
        }
        // Update periodic wingman pickup spawner
        this.periodicWingmanPickupTimer -= delta;
        if (this.periodicWingmanPickupTimer <= 0) {
            this.spawnPeriodicWingmanPickup();
            this.periodicWingmanPickupTimer = 20.0;
        }
        // Update pickups and floating texts
        this.updatePickups(delta);
        this.checkPickupCollection();
        this.updateFloatingTexts(delta);
        // Update wingman pickups
        this.updateWingmanPickups(delta);
        this.checkWingmanPickupCollection();
    }
    /**
     * Disposes the game — removes all event listeners and cleans up.
     * Should be called when the game is no longer needed.
     */
    dispose() {
        if (this.isDisposed)
            return;
        // Remove event listeners
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('resize', this.handleResize);
        // Clean up floating texts
        for (const ft of this.floatingTexts) {
            ft.element.remove();
        }
        this.floatingTexts.length = 0;
        // Clean up wingman pickups
        for (const wp of this.wingmanPickups) {
            wp.deactivate();
        }
        this.wingmanPickups.length = 0;
        // Clean up wingmen
        this.player.clearWingmen();
        // Clear enemy bullets and effects
        this.enemyBulletPool.clear();
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
     * Builds the cold military corridor background scene.
     * Creates a grid floor, side walls with cyan conduit strips,
     * and a subtle ceiling. The corridor runs along the Y-axis.
     */
    buildCorridorBackground() {
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
        this.gridHelper.material.transparent = true;
        this.gridHelper.material.opacity = 0.4;
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
    buildModularCorridor() {
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
    updateCorridor(delta) {
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
    buildBossWarningBanner(level = 1) {
        const banner = document.createElement('div');
        banner.id = 'boss-warning-banner';
        banner.style.display = 'none';
        // Title
        const title = document.createElement('span');
        title.className = 'warning-title';
        title.textContent = 'WARNING: HEAVY HOSTILE DETECTED';
        banner.appendChild(title);
        // Subtitle
        const subtitle = document.createElement('span');
        subtitle.className = 'warning-subtitle';
        const levelName = level === 1 ? 'LEVEL 1' : level === 2 ? 'LEVEL 2' : 'LEVEL 3';
        subtitle.textContent = `CLASSIFIED THREAT — ${levelName}`;
        banner.appendChild(subtitle);
        // Append to document body
        document.body.appendChild(banner);
        this.bossWarningElement = banner;
    }
    /**
     * Shows the boss warning banner.
     * The banner displays for 2 seconds before the boss spawns.
     */
    showBossWarning() {
        if (!this.bossWarningElement || this.bossWarningShown)
            return;
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
    hideBossWarning() {
        if (!this.bossWarningElement)
            return;
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
    spawnBoss() {
        if (this.bossSpawned)
            return;
        // Create the boss lazily based on the current level
        if (this.currentLevel === 1) {
            if (!this.boss) {
                this.boss = new IroncladBoss(this.scene, 200);
            }
            this.boss.bulletSpeedMultiplier = 0.85;
            this.boss.spawn({ x: 0, y: 14, z: 0 });
            this.hud.showBossHealthBar('IRONCLAD');
        }
        else if (this.currentLevel === 2) {
            if (!this.boss) {
                this.boss = new VoidReaverBoss(this.scene, 300);
            }
            this.boss.bulletSpeedMultiplier = 1.0;
            this.boss.spawn({ x: 0, y: 14, z: 0 });
            this.hud.showBossHealthBar('VOID REAVER');
        }
        else if (this.currentLevel === 3) {
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
            subtitle.textContent = `CLASSIFIED THREAT — LEVEL ${this.currentLevel}`;
        }
        this.bossActive = true;
        this.bossSpawned = true;
        // Clear all existing enemies
        this.clearEnemies();
        // Stop regular enemy spawning by setting the wave to boss type
        this.currentWaveType = 'boss';
    }
    /**
     * Updates the level flow — handles wave progression and enemy spawning.
     *
     * @param delta - Time elapsed since last frame in seconds
     */
    updateLevelFlow(delta) {
        // Skip if boss is active or level is complete
        if (this.bossActive || this.levelComplete || !this.levelFlowManager)
            return;
        // Increment level elapsed time
        this.levelElapsedTime += delta;
        // Check if the current wave should start
        const currentWave = this.levelFlowManager.getCurrentWave();
        if (this.levelElapsedTime < currentWave.startTime)
            return;
        // Check if the boss warning should be triggered
        if (this.levelFlowManager.shouldTriggerBossWarning()) {
            this.showBossWarning();
        }
        // Check if the boss should be spawned
        if (this.levelFlowManager.shouldSpawnBoss()) {
            this.spawnBoss();
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
    updateBoss(delta) {
        if (!this.boss || !this.bossActive)
            return;
        // Update the boss
        this.boss.update(delta, this.enemyBulletPool, this.player.mesh.position);
        // Trigger screen shake on boss attacks (check if boss just fired)
        if (this.boss instanceof IroncladBoss && this.boss.justFired) {
            this.triggerShake(0.2, 0.1);
        }
        else if (this.boss instanceof VoidReaverBoss && this.boss.justFired) {
            this.triggerShake(0.25, 0.1);
        }
        else if (this.boss instanceof SovereignBoss && this.boss.justFired) {
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
     * Spawns a massive explosion and shows the level complete state.
     */
    triggerBossDefeat() {
        if (!this.boss)
            return;
        // Set state flags
        this.bossActive = false;
        this.levelComplete = true;
        this.bossDefeated = true;
        // Hide the boss health bar
        this.hud.hideBossHealthBar();
        // Spawn the massive boss explosion at the boss position
        const bossPos = this.boss.mesh.position;
        this.effectManager.spawnBossExplosion({
            x: bossPos.x,
            y: bossPos.y,
            z: bossPos.z,
        });
        // Set screen shake
        this.screenShakeTime = 0.5;
        this.screenShakeMagnitude = 0.5;
        // Trigger hit stop for dramatic impact (100ms freeze)
        this.hitStopTimer = 0.1;
        // Deactivate the boss
        this.boss.deactivate();
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
        }
        else {
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
    updateScreenShake(delta) {
        if (this.screenShakeTime > 0) {
            // Decrement the shake timer
            this.screenShakeTime -= delta;
            // Decay the magnitude linearly over time
            const decayFactor = Math.max(0, this.screenShakeTime / 0.5);
            const currentMagnitude = this.screenShakeMagnitude * decayFactor;
            // Apply random camera offset with decaying magnitude
            const shakeX = (Math.random() - 0.5) * 2 * currentMagnitude;
            const shakeY = (Math.random() - 0.5) * 2 * currentMagnitude;
            this.camera.position.set(this.baseCameraPosition.x + shakeX, this.baseCameraPosition.y + shakeY, this.baseCameraPosition.z);
            // Add small random rotation for extra impact
            const shakeRotX = (Math.random() - 0.5) * 0.02 * currentMagnitude;
            const shakeRotY = (Math.random() - 0.5) * 0.02 * currentMagnitude;
            this.camera.rotation.set(this.baseCameraRotation.x + shakeRotX, this.baseCameraRotation.y + shakeRotY, this.baseCameraRotation.z);
        }
        else {
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
    triggerShake(magnitude, duration) {
        this.screenShakeMagnitude = magnitude;
        this.screenShakeTime = duration;
    }
    /**
     * Starts the player entrance animation.
     * Positions the player at the bottom of the screen and animates them
     * flying up to the starting position with a speed trail.
     */
    startPlayerEntrance() {
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
    updatePlayerEntrance(delta) {
        if (!this.entranceActive)
            return;
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
    spawnEntranceTrailParticle() {
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
        particle.position.set(playerPos.x + (Math.random() - 0.5) * 0.3, playerPos.y - 0.5, playerPos.z);
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
    clearEntranceTrailParticles() {
        for (const particle of this.entranceTrailParticles) {
            this.scene.remove(particle);
            particle.geometry.dispose();
            particle.material.dispose();
        }
        this.entranceTrailParticles = [];
    }
    /**
     * Fires a celebratory ring of bullets outward from the player position.
     * Spawns 24 bullets in a circle around the player.
     */
    fireCelebratoryBurst() {
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
    getBoss() {
        return this.boss;
    }
    /**
     * Returns the total score accumulated across all levels.
     *
     * @returns {number} The total score
     */
    getTotalScore() {
        return this.totalScore;
    }
    /**
   * Returns the current level number.
   *
   * @returns {number} The current level number
   */
    getCurrentLevel() {
        return this.currentLevel;
    }
    /**
     * Returns the display name of the current level.
     *
     * @returns {string} The current level name
     */
    getLevelName() {
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
    getLevelParTime() {
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
    getGameStats() {
        return { ...this.gameStats };
    }
    /**
     * Resets the game stats to their initial zeroed state.
     * Called when a level starts or restarts.
     */
    resetGameStats() {
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
    retryLevel() {
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
        // Reset periodic pickup timers
        this.periodicPickupTimer = 10.0;
        this.periodicWingmanPickupTimer = 20.0;
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
        }
        else if (this.currentLevel === 2) {
            this.corridor?.setLevelStyle('void-reactor');
        }
        else if (this.currentLevel === 3) {
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
    returnToBase() {
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
        this.periodicPickupTimer = 10.0;
        this.periodicWingmanPickupTimer = 20.0;
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
    transitionToNextLevel() {
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
        // Reset player health to max
        this.playerHealth = this.maxPlayerHealth;
        // Reset player power level to 1 (per design doc: power resets between levels)
        this.player.setPowerLevel(1);
        this.hud.setPowerLevel(1);
        // Keep wingmen (per design doc: wingmen carry to next level)
        // Change corridor style for level 2 or 3
        if (this.currentLevel === 2) {
            this.corridor?.setLevelStyle('void-reactor');
        }
        else if (this.currentLevel === 3) {
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
        // Reset the clock
        this.clock.getDelta();
        // Start the player entrance animation for the new level
        this.startPlayerEntrance();
        // Update parallax and ambient particle styles
        if (this.currentLevel === 2) {
            this.parallaxBackground?.setLevelStyle('void-reactor');
            this.ambientParticles?.setLevelStyle('void-reactor');
        }
        else if (this.currentLevel === 3) {
            this.parallaxBackground?.setLevelStyle('sovereign-core');
            this.ambientParticles?.setLevelStyle('sovereign-core');
        }
    }
    /**
     * Updates the player based on keyboard input.
     *
     * @param delta - Time elapsed since last frame in seconds
     */
    updatePlayer(delta) {
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
    updateAutoFire(delta) {
        if (!this.player.canFire())
            return;
        const powerLevel = this.player.getPowerLevel();
        const noseY = this.player.mesh.position.y + 1.0;
        const noseZ = this.player.mesh.position.z;
        const playerX = this.player.mesh.position.x;
        switch (this.planeType) {
            case 'vanguard': {
                // VANGUARD: N parallel streams, evenly spaced horizontally
                const spacing = 0.4;
                const totalWidth = (powerLevel - 1) * spacing;
                for (let i = 0; i < powerLevel; i++) {
                    const offsetX = -totalWidth / 2 + i * spacing;
                    const bullet = this.bulletPool.get();
                    if (bullet) {
                        bullet.spawn({ x: playerX + offsetX, y: noseY, z: noseZ }, 14);
                    }
                }
                break;
            }
            case 'phantom': {
                // PHANTOM: (2N+1) bullets in a fan with widening angle
                const bulletCount = 2 * powerLevel + 1;
                const maxAngle = 0.15 + powerLevel * 0.1;
                for (let i = 0; i < bulletCount; i++) {
                    const t = bulletCount === 1 ? 0 : i / (bulletCount - 1);
                    const angle = -maxAngle + t * 2 * maxAngle;
                    const bullet = this.bulletPool.get();
                    if (bullet) {
                        bullet.spawn({ x: playerX, y: noseY, z: noseZ }, 14);
                        bullet.velocity.set(Math.sin(angle) * 14, Math.cos(angle) * 14, 0);
                    }
                }
                break;
            }
            case 'titan': {
                // TITAN: single wider bullet with increased scale and damage
                const bullet = this.bulletPool.get();
                if (bullet) {
                    bullet.spawn({ x: playerX, y: noseY, z: noseZ }, 14);
                    const scale = 1 + (powerLevel - 1) * 0.3;
                    bullet.setScale(scale);
                    bullet.damage = powerLevel;
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
    updateEnemies(delta) {
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
            // Handle enemy firing
            if (enemy.fireCooldown <= 0) {
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
    updateEliteEnemies(delta) {
        for (const enemy of this.enemies) {
            if (!enemy.active)
                continue;
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
    updateBullets(delta) {
        this.bulletPool.update(delta);
    }
    /**
     * Updates all active enemy bullets in the pool.
     * The pool automatically releases bullets that go off-screen.
     *
     * @param delta - Time elapsed since last frame in seconds
     */
    updateEnemyBullets(delta) {
        this.enemyBulletPool.update(delta);
    }
    /**
     * Updates all active effects (warp-in, hit, explosion).
     * The EffectManager automatically removes completed effects.
     *
     * @param delta - Time elapsed since last frame in seconds
     */
    updateEffects(delta) {
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
    checkCollisions() {
        const activeBullets = this.bulletPool.getActive();
        const activeEnemies = this.enemies.filter((e) => e.active);
        // Iterate bullets and enemies for collision detection
        for (const bullet of activeBullets) {
            // Skip if bullet was already released in a previous iteration
            if (!bullet.active)
                continue;
            const bulletBounds = bullet.getBounds();
            for (const enemy of activeEnemies) {
                // Skip if enemy is no longer active
                if (!enemy.active)
                    continue;
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
                if (!bullet.active)
                    continue;
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
    checkEnemyBulletCollisions() {
        // Skip if player is invincible
        if (this.playerInvincibleTimer > 0)
            return;
        if (!this.player.active)
            return;
        const activeEnemyBullets = this.enemyBulletPool.getActive();
        const playerBounds = this.player.getBounds();
        for (const bullet of activeEnemyBullets) {
            // Skip if bullet was already released
            if (!bullet.active)
                continue;
            // Check for AABB intersection with player
            if (boxIntersects(bullet.getBounds(), playerBounds)) {
                // Damage the player
                this.playerHealth--;
                this.hud.setHealth(this.playerHealth);
                this.playerInvincibleTimer = this.playerInvincibleDuration;
                this.playerBlinkTimer = 0;
                // Trigger large screen shake on player hit
                this.triggerShake(0.5, 0.3);
                // Release the bullet
                this.enemyBulletPool.release(bullet);
                // Check if player is destroyed
                if (this.playerHealth <= 0) {
                    this.player.active = false;
                    this.player.mesh.visible = false;
                    this.state.running = false;
                    // Trigger hit stop for dramatic impact (100ms freeze)
                    this.hitStopTimer = 0.1;
                    // Trigger explosion at player position
                    const playerPos = this.player.mesh.position;
                    this.effectManager.spawnExplosion({
                        x: playerPos.x,
                        y: playerPos.y,
                        z: playerPos.z,
                    });
                    // Call the onGameOver callback with the current level and score
                    if (this.onGameOver) {
                        this.onGameOver(this.currentLevel, this.hud.getScore());
                    }
                }
                // Only one bullet can hit per frame
                break;
            }
        }
        // Check SovereignBoss laser shots for collision with the player
        if (this.boss instanceof SovereignBoss && this.bossActive) {
            const laserShots = this.boss.getActiveLaserShots();
            for (const shot of laserShots) {
                if (!shot.active)
                    continue;
                if (boxIntersects(shot.getBounds(), playerBounds)) {
                    // Damage the player (same as enemy bullet hit)
                    this.playerHealth--;
                    this.hud.setHealth(this.playerHealth);
                    this.playerInvincibleTimer = this.playerInvincibleDuration;
                    this.playerBlinkTimer = 0;
                    shot.deactivate();
                    // Check if player is destroyed
                    if (this.playerHealth <= 0) {
                        this.player.active = false;
                        this.player.mesh.visible = false;
                        this.state.running = false;
                        // Trigger explosion at player position
                        const playerPos = this.player.mesh.position;
                        this.effectManager.spawnExplosion({
                            x: playerPos.x,
                            y: playerPos.y,
                            z: playerPos.z,
                        });
                        // Call the onGameOver callback with the current level and score
                        if (this.onGameOver) {
                            this.onGameOver(this.currentLevel, this.hud.getScore());
                        }
                    }
                    // Only one laser shot can hit per frame
                    break;
                }
            }
        }
    }
    /**
 * Checks if the given enemy type string is an elite type.
 *
 * @param type - The enemy type string to check
 * @returns {boolean} True if the type is an elite type
 */
    isEliteType(type) {
        return type === 'reaper' || type === 'warden' || type === 'harbinger' || type === 'overlord';
    }
    /**
     * Checks if the given enemy is an elite enemy instance.
     *
     * @param enemy - The enemy to check
     * @returns {boolean} True if the enemy is an elite type
     */
    isEliteEnemy(enemy) {
        return enemy instanceof Reaper || enemy instanceof Warden || enemy instanceof Harbinger || enemy instanceof Overlord;
    }
    /**
     * Handles enemy destruction — deactivates the enemy, awards score,
     * triggers the appropriate explosion effect, and handles pickup drops.
     * Elite enemies award 500 points, trigger enhanced explosions, and have
     * a 40% chance to drop a POWER or wingman pickup.
     *
     * @param enemy - The destroyed enemy
     */
    handleEnemyDestroyed(enemy) {
        const enemyPos = enemy.mesh.position;
        enemy.deactivate();
        if (this.isEliteEnemy(enemy)) {
            // Elite enemy: 500 points, enhanced explosion, 40% drop chance
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
            // 40% chance to drop a POWER or wingman pickup (randomly chosen)
            if (Math.random() < 0.4) {
                if (Math.random() < 0.5) {
                    this.spawnPickup(enemy.mesh.position);
                }
                else {
                    this.spawnWingmanPickup(enemy.mesh.position);
                }
            }
        }
        else {
            // Basic enemy: 100 points, normal explosion, 20% drop chance
            this.hud.addScore(100);
            this.gameStats.enemiesDestroyed++;
            this.effectManager.spawnExplosion({
                x: enemyPos.x,
                y: enemyPos.y,
                z: enemyPos.z,
            });
            // Trigger small screen shake for basic explosions
            this.triggerShake(0.15, 0.15);
            // 20% chance to drop a POWER pickup
            if (Math.random() < 0.2) {
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
    spawnEnemy() {
        // Use the level flow manager to determine the enemy type based on the current wave
        const type = this.levelFlowManager
            ? this.levelFlowManager.getEnemyTypeForWave(this.currentWaveType)
            : getRandomEnemyType();
        // Check if this is an elite enemy type
        const isElite = this.isEliteType(type);
        // Create the enemy with the selected type
        const enemy = isElite
            ? createEliteEnemy(this.scene, this.enemyIdCounter++, type)
            : createEnemy(this.scene, this.enemyIdCounter++, type);
        // Random spawn position at the top of the play field
        const spawnX = -7 + Math.random() * 14; // -7 to 7
        const spawnY = 9;
        // Type-specific drift speeds
        let spawnSpeed;
        if (isElite) {
            // Elite enemies move slower for a more imposing entrance
            spawnSpeed = 0.8;
        }
        else {
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
        }
        else if (this.currentLevel === 2) {
            enemy.bulletSpeedMultiplier = 1.0;
        }
        else {
            enemy.bulletSpeedMultiplier = 1.15;
        }
        // Spawn the enemy — the Enemy class handles its own warp-in fade
        // (materials start at opacity 0 and fade in over 0.3s)
        enemy.spawn({ x: spawnX, y: spawnY, z: 0 }, spawnSpeed);
        // Trigger warp-in visual effect
        if (isElite) {
            // Elite enemies use the enhanced warp effect with screen shake
            this.effectManager.spawnEliteWarp({ x: spawnX, y: spawnY, z: 0 }, enemy.mesh);
        }
        else {
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
    clearEnemies() {
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
    spawnPickup(position) {
        const pickup = new PowerPickup(this.scene, this.pickupIdCounter++);
        pickup.spawn(position);
        this.pickups.push(pickup);
    }
    /**
   * Spawns a periodic POWER pickup from a random spawn point.
   * Called every ~10 seconds during gameplay.
   */
    spawnPeriodicPickup() {
        const spawnX = -6 + Math.random() * 12;
        const spawnY = 9;
        this.spawnPickup({ x: spawnX, y: spawnY, z: 0 });
    }
    /**
     * Spawns a periodic wingman pickup from a random spawn point.
     * Called every ~20 seconds during gameplay.
     */
    spawnPeriodicWingmanPickup() {
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
    spawnWingmanPickup(position) {
        const pickup = new WingmanPickup(this.scene, this.wingmanPickupIdCounter++);
        pickup.spawn(position);
        this.wingmanPickups.push(pickup);
    }
    /**
     * Updates all active wingman pickups and removes off-screen ones.
     *
     * @param delta - Time elapsed since last frame in seconds
     */
    updateWingmanPickups(delta) {
        const playerPos = this.player.mesh.position;
        for (let i = this.wingmanPickups.length - 1; i >= 0; i--) {
            const pickup = this.wingmanPickups[i];
            if (!pickup.active)
                continue;
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
    checkWingmanPickupCollection() {
        const playerPos = this.player.mesh.position;
        for (let i = this.wingmanPickups.length - 1; i >= 0; i--) {
            const pickup = this.wingmanPickups[i];
            if (!pickup.active)
                continue;
            if (pickup.isCollected(playerPos)) {
                // Add a random wingman type to the player's squadron
                const type = getRandomWingmanType();
                this.player.addWingman(this.scene, type);
                // Update HUD wingman indicator
                this.hud.setWingmen(this.player.getWingmen());
                pickup.deactivate();
            }
        }
    }
    /**
     * Checks LANCE wingman beam collisions against active enemies.
     * The beam pierces enemies — it damages all enemies it touches.
     */
    checkLanceBeamCollisions() {
        const wingmen = this.player.getWingmen();
        const activeEnemies = this.enemies.filter((e) => e.active);
        for (const wingman of wingmen) {
            if (!wingman.active || wingman.type !== 'lance')
                continue;
            const beamBounds = wingman.getBeamBounds();
            if (!beamBounds)
                continue;
            for (const enemy of activeEnemies) {
                if (!enemy.active)
                    continue;
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
    checkSeekerMissileCollisions() {
        const wingmen = this.player.getWingmen();
        const activeEnemies = this.enemies.filter((e) => e.active);
        for (const wingman of wingmen) {
            if (!wingman.active || wingman.type !== 'seeker')
                continue;
            const seeker = wingman;
            const missiles = seeker.getActiveMissiles();
            for (const missile of missiles) {
                if (!missile.active)
                    continue;
                const missileBounds = missile.getBounds();
                for (const enemy of activeEnemies) {
                    if (!enemy.active)
                        continue;
                    if (boxIntersects(missileBounds, enemy.getBounds())) {
                        // Missile hits enemy — apply damage and destroy missile
                        const destroyed = enemy.takeDamage(2);
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
    checkPickupCollection() {
        const playerPos = this.player.mesh.position;
        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const pickup = this.pickups[i];
            if (!pickup.active)
                continue;
            if (pickup.isCollected(playerPos)) {
                const powerLevel = this.player.getPowerLevel();
                if (powerLevel < Player.MAX_POWER_LEVEL) {
                    // Increase power level and update HUD
                    this.player.setPowerLevel(powerLevel + 1);
                    this.hud.setPowerLevel(this.player.getPowerLevel());
                }
                else {
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
    updatePickups(delta) {
        const playerPos = this.player.mesh.position;
        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const pickup = this.pickups[i];
            if (!pickup.active)
                continue;
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
    createFloatingText(text, position) {
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
    updateFloatingTexts(delta) {
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
}
