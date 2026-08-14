import { EnemyType } from './Enemy';

/**
 * WaveConfig — defines a single wave of enemies in a level.
 */
export interface WaveConfig {
    /** Wave type identifier */
  type: 'drones' | 'raiders' | 'sentries' | 'mixed' | 'elite-reapers' | 'elite-wardens' | 'elite-harbingers' | 'elite-overlords' | 'elite-combined' | 'boss';
  /** Number of enemies in this wave */
  count: number;
  /** Time between enemy spawns within the wave (seconds) */
  spawnInterval: number;
  /** Time before this wave starts (seconds from level start) */
  startTime: number;
  /** Whether this wave triggers the boss warning banner */
  triggersBossWarning?: boolean;
}

/**
 * LevelConfig — defines the configuration for a single level.
 */
export interface LevelConfig {
  /** Level number */
  level: number;
  /** Level display name */
  name: string;
  /** Corridor scroll speed (units per second) */
  scrollSpeed: number;
  /** Total level duration before boss (seconds) */
  duration: number;
  /** Waves in this level */
  waves: WaveConfig[];
}

/**
 * LEVEL_CONFIGS — a record of all level configurations, keyed by level number.
 */
export const LEVEL_CONFIGS: Record<number, LevelConfig> = {
  1: {
    level: 1,
    name: 'TITAN GATE',
    scrollSpeed: 2.0,
    duration: 60, // 60 seconds of waves before boss
    waves: [
      // Phase 1: DRONEs in waves of 5-8
      { type: 'drones', count: 6, spawnInterval: 0.8, startTime: 0 },
      { type: 'drones', count: 8, spawnInterval: 0.7, startTime: 8 },
            // Phase 2: RAIDERs mixed in
      { type: 'mixed', count: 5, spawnInterval: 1.0, startTime: 16 },
      { type: 'raiders', count: 4, spawnInterval: 0.9, startTime: 24 },
      // Phase 3: Elite REAPERs at midpoint
      { type: 'elite-reapers', count: 2, spawnInterval: 3.0, startTime: 28 },
      // Phase 4: SENTRYs as stationary threats
      { type: 'sentries', count: 3, spawnInterval: 1.5, startTime: 32 },
      { type: 'mixed', count: 6, spawnInterval: 0.8, startTime: 40 },
      // Phase 5: Elite WARDENs in final approach
      { type: 'elite-wardens', count: 2, spawnInterval: 3.0, startTime: 44 },
      // Final approach: mixed waves before boss
      { type: 'mixed', count: 7, spawnInterval: 0.7, startTime: 48 },
      // Boss trigger at midpoint
      { type: 'boss', count: 1, spawnInterval: 0, startTime: 56, triggersBossWarning: true },
    ],
  },
    2: {
    level: 2,
    name: 'VOID REACTOR',
    scrollSpeed: 2.5,
    duration: 70, // 70 seconds of waves before boss
    waves: [
      // Aggressive start: RAIDERs immediately
      { type: 'raiders', count: 6, spawnInterval: 0.6, startTime: 0 },
      // Mixed wave: RAIDERs + SENTRYs
      { type: 'mixed', count: 8, spawnInterval: 0.5, startTime: 6 },
      // SENTRYs as stationary threats
      { type: 'sentries', count: 5, spawnInterval: 0.8, startTime: 14 },
      // Aggressive mixed wave
      { type: 'mixed', count: 10, spawnInterval: 0.45, startTime: 22 },
      // HARBINGERs as priority targets
      { type: 'elite-harbingers', count: 3, spawnInterval: 2.5, startTime: 30 },
      // Mixed wave
      { type: 'mixed', count: 8, spawnInterval: 0.5, startTime: 38 },
      // REAPERs coordinated assault
      { type: 'elite-reapers', count: 3, spawnInterval: 2.0, startTime: 44 },
      // WARDENs coordinated assault
      { type: 'elite-wardens', count: 3, spawnInterval: 2.0, startTime: 50 },
      // Final assault: aggressive mixed wave
      { type: 'mixed', count: 12, spawnInterval: 0.4, startTime: 56 },
      // Combined elite assault: REAPERs + WARDENs
      { type: 'elite-combined', count: 4, spawnInterval: 1.5, startTime: 62 },
      // Boss trigger: VOID REAVER
      { type: 'boss', count: 1, spawnInterval: 0, startTime: 68, triggersBossWarning: true },
    ],
  },
  3: {
    level: 3,
    name: 'SOVEREIGN CORE',
    scrollSpeed: 3.0,
    duration: 80, // 80 seconds of waves before boss
    waves: [
      // Immediate aggressive mixed wave: all basic types, shortest interval
      { type: 'mixed', count: 10, spawnInterval: 0.35, startTime: 0 },
      // Elite REAPERs introduced early
      { type: 'elite-reapers', count: 2, spawnInterval: 2.0, startTime: 5 },
      // Aggressive mixed wave
      { type: 'mixed', count: 12, spawnInterval: 0.35, startTime: 10 },
      // Elite WARDENs introduced
      { type: 'elite-wardens', count: 2, spawnInterval: 2.0, startTime: 16 },
      // Aggressive mixed wave
      { type: 'mixed', count: 12, spawnInterval: 0.4, startTime: 22 },
      // HARBINGERs as priority targets
      { type: 'elite-harbingers', count: 3, spawnInterval: 1.8, startTime: 28 },
      // Aggressive mixed wave
      { type: 'mixed', count: 14, spawnInterval: 0.35, startTime: 34 },
      // OVERLORDs as mini-boss encounter (2 at a time)
      { type: 'elite-overlords', count: 2, spawnInterval: 3.0, startTime: 40 },
      // Aggressive mixed wave
      { type: 'mixed', count: 14, spawnInterval: 0.4, startTime: 46 },
      // OVERLORDs as mini-boss encounter (3 at a time)
      { type: 'elite-overlords', count: 3, spawnInterval: 2.5, startTime: 52 },
      // Aggressive mixed wave
      { type: 'mixed', count: 16, spawnInterval: 0.35, startTime: 58 },
      // Final gauntlet: mixed elites (REAPERs, WARDENs, HARBINGERs, OVERLORDs)
      { type: 'elite-combined', count: 6, spawnInterval: 1.2, startTime: 64 },
      // Final aggressive mixed wave before boss
      { type: 'mixed', count: 16, spawnInterval: 0.35, startTime: 70 },
      // Boss trigger: SOVEREIGN
      { type: 'boss', count: 1, spawnInterval: 0, startTime: 78, triggersBossWarning: true },
    ],
  },
};

/**
 * LevelFlowManager — tracks the progression of waves within a level.
 * Manages the current wave index, boss warning state, and boss spawn state.
 */
export class LevelFlowManager {
  /** The level number this manager is configured for */
  private levelNumber: number;
  /** The level configuration for this manager */
  private config: LevelConfig;
  /** Index of the current wave in the config's waves array */
  private currentWaveIndex: number = 0;
  /** Whether the boss warning banner has been triggered */
  private bossWarningTriggered: boolean = false;
  /** Whether the boss has been spawned */
  private bossSpawned: boolean = false;

  /**
   * Creates a new LevelFlowManager for the given level.
   *
   * @param level - The level number to manage
   */
  constructor(level: number) {
    this.levelNumber = level;
    this.config = LEVEL_CONFIGS[level];
    if (!this.config) {
      throw new Error(`LevelFlowManager: No configuration found for level ${level}`);
    }
  }

  /**
   * Returns the current wave configuration.
   *
   * @returns {WaveConfig} The current wave config
   */
  public getCurrentWave(): WaveConfig {
    return this.config.waves[this.currentWaveIndex];
  }

  /**
   * Advances to the next wave in the level.
   * Updates boss warning and boss spawn states based on the new wave.
   */
  public advanceWave(): void {
    if (this.currentWaveIndex < this.config.waves.length - 1) {
      this.currentWaveIndex++;
      const wave = this.getCurrentWave();

      // Update boss warning state
      if (wave.triggersBossWarning && !this.bossWarningTriggered) {
        this.bossWarningTriggered = true;
      }

      // Update boss spawn state
      if (wave.type === 'boss') {
        this.bossSpawned = true;
      }
    }
  }

  /**
   * Returns the enemy type to spawn for the given wave type.
   * For 'mixed' waves, a weighted random selection is made.
   * The weighting differs by level:
   *   - Level 1: drone 40%, raider 35%, sentry 25%
   *   - Level 2: raider 45%, sentry 35%, drone 20%
   *
   * @param waveType - The type of wave
   * @returns {EnemyType} The enemy type to spawn
   */
  public getEnemyTypeForWave(waveType: string): EnemyType {
    switch (waveType) {
      case 'drones':
        return 'drone';
      case 'raiders':
        return 'raider';
      case 'sentries':
        return 'sentry';
            case 'mixed': {
        if (this.levelNumber === 3) {
          // Level 3 weighting: drone 30%, raider 35%, sentry 35%
          const roll = Math.random();
          if (roll < 0.30) {
            return 'drone';
          } else if (roll < 0.65) {
            return 'raider';
          } else {
            return 'sentry';
          }
        } else if (this.levelNumber === 2) {
          // Level 2 weighting: raider 45%, sentry 35%, drone 20%
          const roll = Math.random();
          if (roll < 0.45) {
            return 'raider';
          } else if (roll < 0.80) {
            return 'sentry';
          } else {
            return 'drone';
          }
        } else {
          // Level 1 weighting: drone 40%, raider 35%, sentry 25%
          const roll = Math.random();
          if (roll < 0.4) {
            return 'drone';
          } else if (roll < 0.75) {
            return 'raider';
          } else {
            return 'sentry';
          }
        }
      }
      case 'elite-reapers':
        return 'reaper';
      case 'elite-wardens':
        return 'warden';
      case 'elite-harbingers':
        return 'harbinger';
      case 'elite-overlords':
        return 'overlord';
            case 'elite-combined': {
        if (this.levelNumber === 3) {
          // Level 3: randomly select from all four elite types
          const eliteTypes: EnemyType[] = ['reaper', 'warden', 'harbinger', 'overlord'];
          return eliteTypes[Math.floor(Math.random() * eliteTypes.length)];
        } else {
          // Levels 1-2: 50/50 split between reaper and warden
          return Math.random() < 0.5 ? 'reaper' : 'warden';
        }
      }
      case 'boss':
        // Boss is handled separately
        return 'drone';
      default:
        return 'drone';
    }
  }

  /**
   * Returns the spawn interval for the current wave.
   *
   * @returns {number} The current wave's spawn interval in seconds
   */
  public getSpawnInterval(): number {
    return this.getCurrentWave().spawnInterval;
  }

  /**
   * Returns whether the boss should be spawned.
   * True when the current wave is the boss wave.
   *
   * @returns {boolean} True if the boss should spawn
   */
  public shouldSpawnBoss(): boolean {
    return this.getCurrentWave().type === 'boss';
  }

  /**
   * Returns whether the boss warning banner should be shown.
   * True when the current wave is the boss wave.
   * (The trigger guard is handled by the Game timer, not by this flag —
   * advanceWave() pre-flags bossWarningTriggered, which would otherwise
   * prevent the warning from ever firing.)
   *
   * @returns {boolean} True if the boss warning should be shown
   */
  public shouldTriggerBossWarning(): boolean {
    const wave = this.getCurrentWave();
    return wave.triggersBossWarning === true;
  }

  /**
   * Returns whether the boss warning has already been triggered.
   *
   * @returns {boolean} True if the boss warning has been triggered
   */
  public hasBossWarningTriggered(): boolean {
    return this.bossWarningTriggered;
  }

  /**
   * Returns whether the boss has already been spawned.
   *
   * @returns {boolean} True if the boss has been spawned
   */
  public hasBossSpawned(): boolean {
    return this.bossSpawned;
  }

  /**
   * Resets the flow manager to its initial state for level restart.
   */
  public reset(): void {
    this.currentWaveIndex = 0;
    this.bossWarningTriggered = false;
    this.bossSpawned = false;
  }
}