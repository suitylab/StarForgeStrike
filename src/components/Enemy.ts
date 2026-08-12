import * as THREE from 'three';
import { EnemyBulletPool } from './EnemyBulletPool';

/**
 * EnemyType — the three basic enemy variants in StarForge Strike.
 * Each type has distinct visuals, health, and attack patterns.
 */
export type EnemyType = 'drone' | 'raider' | 'sentry' | 'reaper' | 'warden' | 'harbinger' | 'overlord';

/**
 * MovementPattern — the movement behavior for an enemy.
 *   - 'straight': Simple downward drift (default)
 *   - 'sine': S-shaped oscillation while drifting down
 *   - 'zigzag': Diagonal weaving back and forth
 *   - 'hover': Moves to a target Y position then stops
 */
export type MovementPattern = 'straight' | 'sine' | 'zigzag' | 'hover';

/**
 * Metadata for an enemy type, used by the HUD and UI displays.
 */
export interface EnemyTypeData {
  /** Display name of the enemy type */
  name: string;
  /** Primary color (hex) */
  color: string;
  /** Brief description of the enemy */
  description: string;
}

/**
 * Metadata for all three basic enemy types.
 */
export const ENEMY_TYPE_DATA: Record<EnemyType, EnemyTypeData> = {
  drone: {
    name: 'DRONE',
    color: '#3a3f4a',
    description: 'Small scout drone. Fires slow single shots.',
  },
  raider: {
    name: 'RAIDER',
    color: '#1a2a4a',
    description: 'Medium fighter with swept wings. Fires fan spreads.',
  },
    sentry: {
    name: 'SENTRY',
    color: '#4a5058',
    description: 'Hovering turret. Fires aimed bursts at the player.',
  },
  reaper: {
    name: 'REAPER',
    color: '#2a2a2a',
    description: 'Large angular fighter. Fires spiral bullet patterns.',
  },
  warden: {
    name: 'WARDEN',
    color: '#4a5058',
    description: 'Heavy armored unit. Fires spreads and aimed lasers.',
  },
  harbinger: {
    name: 'HARBINGER',
    color: '#1a2a4a',
    description: 'Twin-hulled bomber. Launches homing missiles.',
  },
  overlord: {
    name: 'OVERLORD',
    color: '#3a4a6a',
    description: 'Command ship. Fires ring bursts and aimed streams.',
  },
};

/**
 * Factory function that creates the DRONE enemy mesh.
 *
 * A small angular drone with:
 *   - Dark gray octahedron body
 *   - Red emissive sensor eye on the front face
 *   - Small wing fins angled outward
 *   - Dark red/orange engine glow at the rear
 *
 * The drone faces downward: nose points toward -Y.
 *
 * @returns {THREE.Group} A configured DRONE mesh group
 */
export function createDroneMesh(): THREE.Group {
  const group = new THREE.Group();

  // --- Materials ---
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a3f4a,
    metalness: 0.75,
    roughness: 0.35,
  });

  const darkMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2e34,
    metalness: 0.8,
    roughness: 0.5,
  });

  const sensorMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 1.2,
    metalness: 0.2,
    roughness: 0.1,
  });

  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xff4400,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // --- Main Body (layered octahedron core + armor plates) ---
  const bodyGeometry = new THREE.OctahedronGeometry(0.28, 0);
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.scale.set(1.3, 0.9, 0.9);
  group.add(body);

  // Upper armor plate — adds depth to the top
  const topPlateGeometry = new THREE.BoxGeometry(0.4, 0.08, 0.35);
  const topPlate = new THREE.Mesh(topPlateGeometry, darkMaterial);
  topPlate.position.set(0, 0.2, 0);
  topPlate.rotation.x = 0.15;
  group.add(topPlate);

  // Lower armor plate
  const bottomPlateGeometry = new THREE.BoxGeometry(0.35, 0.06, 0.3);
  const bottomPlate = new THREE.Mesh(bottomPlateGeometry, darkMaterial);
  bottomPlate.position.set(0, -0.2, 0);
  bottomPlate.rotation.x = -0.1;
  group.add(bottomPlate);

  // --- Red Sensor Eye (with glow ring) ---
  const sensorGeometry = new THREE.SphereGeometry(0.07, 12, 12);
  const sensor = new THREE.Mesh(sensorGeometry, sensorMaterial);
  sensor.position.set(0, -0.22, 0.18);
  group.add(sensor);

  // Sensor housing ring
  const sensorRingGeometry = new THREE.TorusGeometry(0.09, 0.025, 8, 16);
  const sensorRing = new THREE.Mesh(sensorRingGeometry, darkMaterial);
  sensorRing.position.set(0, -0.22, 0.18);
  sensorRing.rotation.x = Math.PI / 2;
  group.add(sensorRing);

  // --- Wing Fins (angled, with edge accents) ---
  const finGeometry = new THREE.BoxGeometry(0.35, 0.05, 0.12);
  const finAccentMaterial = new THREE.MeshStandardMaterial({
    color: 0xff2200,
    emissive: 0xff2200,
    emissiveIntensity: 0.4,
    metalness: 0.3,
    roughness: 0.3,
  });

  // Left fin
  const leftFin = new THREE.Mesh(finGeometry, bodyMaterial);
  leftFin.position.set(-0.38, 0.05, 0);
  leftFin.rotation.z = 0.35;
  group.add(leftFin);

  // Left fin accent strip
  const leftFinAccent = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.3, 0.02),
    finAccentMaterial
  );
  leftFinAccent.position.set(-0.5, 0.1, 0.08);
  leftFinAccent.rotation.z = 0.35;
  group.add(leftFinAccent);

  // Right fin
  const rightFin = new THREE.Mesh(finGeometry, bodyMaterial);
  rightFin.position.set(0.38, 0.05, 0);
  rightFin.rotation.z = -0.35;
  group.add(rightFin);

  // Right fin accent strip
  const rightFinAccent = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.3, 0.02),
    finAccentMaterial
  );
  rightFinAccent.position.set(0.5, 0.1, 0.08);
  rightFinAccent.rotation.z = -0.35;
  group.add(rightFinAccent);

  // --- Engine Glow (layered cone + inner bright core) ---
  const glowGeometry = new THREE.ConeGeometry(0.09, 0.25, 8);
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.set(0, 0.38, 0);
  group.add(glow);

  // Inner bright core
  const innerGlowGeometry = new THREE.ConeGeometry(0.04, 0.15, 8);
  const innerGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffcc88,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
    const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
  innerGlow.position.set(0, 0.45, 0);
  group.add(innerGlow);

  // --- Side antenna details ---
  const antennaGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.2, 4);
  const leftAntenna = new THREE.Mesh(antennaGeometry, darkMaterial);
  leftAntenna.position.set(-0.2, 0.3, 0.1);
  leftAntenna.rotation.z = 0.4;
  group.add(leftAntenna);

  const rightAntenna = new THREE.Mesh(antennaGeometry, darkMaterial);
  rightAntenna.position.set(0.2, 0.3, 0.1);
  rightAntenna.rotation.z = -0.4;
  group.add(rightAntenna);

  return group;
}

/**
 * Factory function that creates the RAIDER enemy mesh.
 *
 * A medium fighter with:
 *   - Dark blue elongated fuselage
 *   - Swept wings angled backward (toward +Y since facing down)
 *   - Orange emissive accent strips on wing edges
 *   - Twin orange engine glows at the rear
 *
 * The raider faces downward: nose points toward -Y.
 *
 * @returns {THREE.Group} A configured RAIDER mesh group
 */
export function createRaiderMesh(): THREE.Group {
  const group = new THREE.Group();

  // --- Materials ---
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a2a4a,
    metalness: 0.75,
    roughness: 0.35,
  });

  const darkMaterial = new THREE.MeshStandardMaterial({
    color: 0x121a30,
    metalness: 0.8,
    roughness: 0.5,
  });

  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0xff6600,
    emissive: 0xff6600,
    emissiveIntensity: 0.7,
    metalness: 0.3,
    roughness: 0.2,
  });

  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xff8800,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // --- Main Fuselage (layered: central spine + side panels) ---
  const fuselageGeometry = new THREE.BoxGeometry(0.35, 0.85, 0.35);
  const fuselage = new THREE.Mesh(fuselageGeometry, bodyMaterial);
  group.add(fuselage);

  // Central spine — raised ridge along the top
  const spineGeometry = new THREE.BoxGeometry(0.12, 0.9, 0.12);
  const spine = new THREE.Mesh(spineGeometry, darkMaterial);
  spine.position.set(0, 0, 0.18);
  group.add(spine);

  // Side panels — angled armor plates
  const panelGeometry = new THREE.BoxGeometry(0.08, 0.6, 0.3);
  const leftPanel = new THREE.Mesh(panelGeometry, darkMaterial);
  leftPanel.position.set(-0.22, 0, 0);
  leftPanel.rotation.z = 0.15;
  group.add(leftPanel);

  const rightPanel = new THREE.Mesh(panelGeometry, darkMaterial);
  rightPanel.position.set(0.22, 0, 0);
  rightPanel.rotation.z = -0.15;
  group.add(rightPanel);

  // --- Nose (layered cone + tip) ---
  const noseGeometry = new THREE.ConeGeometry(0.18, 0.35, 6);
  const nose = new THREE.Mesh(noseGeometry, bodyMaterial);
  nose.position.set(0, -0.55, 0);
  nose.rotation.x = Math.PI;
  group.add(nose);

  // Nose tip — small bright accent
  const noseTipGeometry = new THREE.ConeGeometry(0.06, 0.12, 6);
  const noseTip = new THREE.Mesh(noseTipGeometry, accentMaterial);
  noseTip.position.set(0, -0.75, 0);
  noseTip.rotation.x = Math.PI;
  group.add(noseTip);

  // --- Swept Wings (layered: main wing + wingtip + accent edge) ---
  // Custom triangular geometry for swept wings
  const wingGeometry = new THREE.BufferGeometry();
  const wingVertices = new Float32Array([
    // Left wing
    -0.18, -0.15, 0,
    -0.75, 0.35, 0,
    -0.18, 0.35, 0,
    // Right wing
    0.18, -0.15, 0,
    0.75, 0.35, 0,
    0.18, 0.35, 0,
  ]);
  wingGeometry.setAttribute('position', new THREE.BufferAttribute(wingVertices, 3));
  wingGeometry.computeVertexNormals();

  const wing = new THREE.Mesh(wingGeometry, bodyMaterial);
  group.add(wing);

  // Wing underside panels — darker layer beneath
  const underWingGeometry = new THREE.BufferGeometry();
  const underWingVertices = new Float32Array([
    // Left wing underside
    -0.15, -0.12, -0.1,
    -0.7, 0.32, -0.1,
    -0.15, 0.32, -0.1,
    // Right wing underside
    0.15, -0.12, -0.1,
    0.7, 0.32, -0.1,
    0.15, 0.32, -0.1,
  ]);
  underWingGeometry.setAttribute('position', new THREE.BufferAttribute(underWingVertices, 3));
  underWingGeometry.computeVertexNormals();

  const underWing = new THREE.Mesh(underWingGeometry, darkMaterial);
  group.add(underWing);

  // Wingtip accent lights — small emissive spheres at wingtips
  const wingtipGeometry = new THREE.SphereGeometry(0.05, 8, 8);
  const leftWingtip = new THREE.Mesh(wingtipGeometry, accentMaterial);
  leftWingtip.position.set(-0.72, 0.28, 0);
  group.add(leftWingtip);

  const rightWingtip = new THREE.Mesh(wingtipGeometry, accentMaterial);
  rightWingtip.position.set(0.72, 0.28, 0);
  group.add(rightWingtip);

  // --- Orange Accent Strips (emissive along wing edges) ---
  const accentStripGeometry = new THREE.BoxGeometry(0.04, 0.45, 0.04);

  const leftAccent = new THREE.Mesh(accentStripGeometry, accentMaterial);
  leftAccent.position.set(-0.55, 0.08, 0.05);
  leftAccent.rotation.z = 0.3;
  group.add(leftAccent);

  const rightAccent = new THREE.Mesh(accentStripGeometry, accentMaterial);
  rightAccent.position.set(0.55, 0.08, 0.05);
  rightAccent.rotation.z = -0.3;
  group.add(rightAccent);

  // --- Twin Engine Nacelles (layered: nacelle + exhaust + glow) ---
  const nacelleGeometry = new THREE.CylinderGeometry(0.1, 0.12, 0.35, 8);

  const leftNacelle = new THREE.Mesh(nacelleGeometry, bodyMaterial);
  leftNacelle.position.set(-0.16, 0.5, 0);
  leftNacelle.rotation.x = Math.PI / 2;
  group.add(leftNacelle);

  const rightNacelle = new THREE.Mesh(nacelleGeometry, bodyMaterial);
  rightNacelle.position.set(0.16, 0.5, 0);
  rightNacelle.rotation.x = Math.PI / 2;
  group.add(rightNacelle);

  // Exhaust discs
  const exhaustGeometry = new THREE.CircleGeometry(0.09, 8);
  const leftExhaust = new THREE.Mesh(exhaustGeometry, accentMaterial);
  leftExhaust.position.set(-0.16, 0.68, 0);
  leftExhaust.rotation.x = Math.PI / 2;
  group.add(leftExhaust);

  const rightExhaust = new THREE.Mesh(exhaustGeometry, accentMaterial);
  rightExhaust.position.set(0.16, 0.68, 0);
  rightExhaust.rotation.x = Math.PI / 2;
  group.add(rightExhaust);

  // Engine glow cones
  const glowGeometry = new THREE.ConeGeometry(0.07, 0.3, 8);
    const leftGlow = new THREE.Mesh(glowGeometry, glowMaterial);
  leftGlow.position.set(-0.16, 0.78, 0);
  group.add(leftGlow);

  const rightGlow = new THREE.Mesh(glowGeometry, glowMaterial);
  rightGlow.position.set(0.16, 0.78, 0);
  group.add(rightGlow);

  // --- Cockpit Canopy ---
  const canopyGeometry = new THREE.ConeGeometry(0.1, 0.2, 6);
  const canopyMaterial = new THREE.MeshStandardMaterial({
    color: 0xff8800,
    emissive: 0xff8800,
    emissiveIntensity: 0.5,
    metalness: 0.3,
    roughness: 0.2,
  });
  const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
  canopy.position.set(0, -0.15, 0.15);
  group.add(canopy);

  return group;
}

/**
 * Factory function that creates the SENTRY enemy mesh.
 *
 * A hovering turret with:
 *   - Gunmetal gray cylindrical base
 *   - Rotating barrel (stored in userData as `barrel`)
 *   - Emissive sensor dome on top
 *   - Small side panels for detail
 *
 * The sentry faces downward: barrel points toward -Y.
 *
 * @returns {THREE.Group} A configured SENTRY mesh group
 */
export function createSentryMesh(): THREE.Group {
  const group = new THREE.Group();

  // --- Materials ---
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a5058,
    metalness: 0.8,
    roughness: 0.4,
  });

  const darkMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2e34,
    metalness: 0.8,
    roughness: 0.5,
  });

  const barrelMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a3e44,
    metalness: 0.85,
    roughness: 0.4,
  });

  const sensorMaterial = new THREE.MeshStandardMaterial({
    color: 0xff2200,
    emissive: 0xff2200,
    emissiveIntensity: 1.0,
    metalness: 0.2,
    roughness: 0.1,
  });

  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0x00c8ff,
    emissive: 0x00c8ff,
    emissiveIntensity: 0.4,
    metalness: 0.3,
    roughness: 0.2,
  });

  // --- Base (layered: main cylinder + base ring + top ring) ---
  const baseGeometry = new THREE.CylinderGeometry(0.38, 0.5, 0.35, 12);
  const base = new THREE.Mesh(baseGeometry, bodyMaterial);
  group.add(base);

  // Base bottom ring — wider footing
  const baseRingGeometry = new THREE.CylinderGeometry(0.52, 0.55, 0.1, 12);
  const baseRing = new THREE.Mesh(baseRingGeometry, darkMaterial);
  baseRing.position.set(0, -0.2, 0);
  group.add(baseRing);

  // Base top ring — transition to the turret head
  const topRingGeometry = new THREE.CylinderGeometry(0.42, 0.38, 0.08, 12);
  const topRing = new THREE.Mesh(topRingGeometry, darkMaterial);
  topRing.position.set(0, 0.2, 0);
  group.add(topRing);

  // --- Turret Head (rotating assembly) ---
  // Create a sub-group for the rotating turret head
  const turretHead = new THREE.Group();
  turretHead.position.set(0, 0.1, 0);

  // Head base — wider cylinder
  const headBaseGeometry = new THREE.CylinderGeometry(0.3, 0.35, 0.2, 10);
  const headBase = new THREE.Mesh(headBaseGeometry, bodyMaterial);
  turretHead.add(headBase);

  // Head dome — rounded top
  const headDomeGeometry = new THREE.SphereGeometry(0.28, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const headDome = new THREE.Mesh(headDomeGeometry, bodyMaterial);
  headDome.position.set(0, 0.12, 0);
  turretHead.add(headDome);

  // --- Rotating Barrel (with barrel shroud + muzzle) ---
  const barrelGroup = new THREE.Group();
  barrelGroup.position.set(0, -0.15, 0);

  // Main barrel
  const barrelGeometry = new THREE.CylinderGeometry(0.07, 0.09, 0.55, 8);
  const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
  barrel.rotation.x = Math.PI / 2;
  barrelGroup.add(barrel);

  // Barrel shroud — wider section near the base
  const shroudGeometry = new THREE.CylinderGeometry(0.11, 0.08, 0.15, 8);
  const shroud = new THREE.Mesh(shroudGeometry, darkMaterial);
  shroud.position.set(0, 0.15, 0);
  shroud.rotation.x = Math.PI / 2;
  barrelGroup.add(shroud);

  // Muzzle brake — wider section at the tip
  const muzzleGeometry = new THREE.CylinderGeometry(0.1, 0.12, 0.08, 8);
  const muzzle = new THREE.Mesh(muzzleGeometry, darkMaterial);
  muzzle.position.set(0, -0.28, 0);
  muzzle.rotation.x = Math.PI / 2;
  barrelGroup.add(muzzle);

  // Muzzle glow — small emissive ring at the tip
  const muzzleGlowGeometry = new THREE.TorusGeometry(0.06, 0.02, 6, 12);
  const muzzleGlow = new THREE.Mesh(muzzleGlowGeometry, accentMaterial);
  muzzleGlow.position.set(0, -0.32, 0);
  muzzleGlow.rotation.x = Math.PI / 2;
  barrelGroup.add(muzzleGlow);

  turretHead.add(barrelGroup);

  // Store barrel group for rotation in userData
  group.userData = {
    barrel: barrelGroup,
  };

  group.add(turretHead);

  // --- Sensor Dome (on top, with ring) ---
  const sensorGeometry = new THREE.SphereGeometry(0.12, 10, 10);
  const sensor = new THREE.Mesh(sensorGeometry, sensorMaterial);
  sensor.position.set(0, 0.35, 0);
  group.add(sensor);

  // Sensor ring
  const sensorRingGeometry = new THREE.TorusGeometry(0.14, 0.025, 8, 16);
  const sensorRing = new THREE.Mesh(sensorRingGeometry, darkMaterial);
  sensorRing.position.set(0, 0.35, 0);
  sensorRing.rotation.x = Math.PI / 2;
  group.add(sensorRing);

  // --- Side Panels (armor plates with accent strips) ---
  const panelGeometry = new THREE.BoxGeometry(0.3, 0.18, 0.06);

  const leftPanel = new THREE.Mesh(panelGeometry, bodyMaterial);
  leftPanel.position.set(-0.38, 0, 0);
  leftPanel.rotation.z = 0.15;
  group.add(leftPanel);

  const rightPanel = new THREE.Mesh(panelGeometry, bodyMaterial);
  rightPanel.position.set(0.38, 0, 0);
  rightPanel.rotation.z = -0.15;
  group.add(rightPanel);

  // Accent strips on panels
  const accentStripGeometry = new THREE.BoxGeometry(0.04, 0.12, 0.02);
  const leftAccent = new THREE.Mesh(accentStripGeometry, accentMaterial);
  leftAccent.position.set(-0.38, 0, 0.05);
  leftAccent.rotation.z = 0.15;
  group.add(leftAccent);

  const rightAccent = new THREE.Mesh(accentStripGeometry, accentMaterial);
  rightAccent.position.set(0.38, 0, 0.05);
  rightAccent.rotation.z = -0.15;
  group.add(rightAccent);

  // --- Hover glow ring (bottom) ---
  const hoverGlowGeometry = new THREE.TorusGeometry(0.45, 0.03, 8, 20);
  const hoverGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0x00c8ff,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const hoverGlow = new THREE.Mesh(hoverGlowGeometry, hoverGlowMaterial);
  hoverGlow.position.set(0, -0.35, 0);
  hoverGlow.rotation.x = Math.PI / 2;
  group.add(hoverGlow);

  return group;
}

/**
 * Enemy base class — represents a single enemy in the StarForge Strike game.
 * Provides common functionality for all enemy types: spawning, updating,
 * taking damage, firing, and deactivation.
 *
 * The enemy faces downward (nose toward -Y) and drifts downward when spawned.
 * Subclasses override the fire() method to implement type-specific attack patterns.
 */
export class Enemy {
  /** Unique identifier for this enemy */
  public id: number;
  /** The type of this enemy */
  public type: EnemyType;
  /** The THREE.js group representing this enemy */
  public mesh: THREE.Group;
  /** Current velocity vector (units per second) */
  public velocity: THREE.Vector3;
  /** Whether this enemy is currently active */
  public active: boolean;
    /** Movement speed in units per second */
  public speed: number;
  /** Multiplier for bullet speeds (level-based difficulty scaling) */
  public bulletSpeedMultiplier: number = 1.0;
  /** Current health points */
  public health: number;
  /** Maximum health points */
  public maxHealth: number;
  /** Time remaining before the next shot can be fired (seconds) */
  public fireCooldown: number;
  /** Time between shots in seconds */
  public fireRate: number;
    /** Total elapsed time since spawn (seconds) */
  public elapsedTime: number;
  /** The THREE.js scene this enemy belongs to */
  public scene: THREE.Scene;

  /** Movement pattern for this enemy */
  public movementPattern: MovementPattern = 'straight';
  /** Amplitude of the movement pattern (units) */
  public patternAmplitude: number = 1.0;
  /** Frequency of the movement pattern (cycles per second) */
  public patternFrequency: number = 1.0;
  /** Phase offset for the movement pattern (radians) */
  public patternPhase: number = 0;
  /** Base X position for patterns that oscillate around a center */
  public baseX: number = 0;
  /** Target Y position for hover pattern */
  public hoverTargetY: number = 5;
  /** Whether the hover pattern has reached its target */
  public hoverReached: boolean = false;

    /** Time remaining for the hit flash effect (seconds) */
  protected flashTimer: number = 0;
  /** Whether the enemy is currently warping in (fading from transparent to opaque) */
  protected warpInProgress: boolean = false;
  /** Time elapsed during the warp-in fade (seconds) */
  protected warpInTimer: number = 0;
  /** Total duration of the warp-in fade (seconds) */
  protected readonly warpInDuration: number = 0.3;
  /** Original emissive intensities of materials (for flash restoration) */
  protected originalEmissiveIntensities: number[] = [];
  /** Original emissive colors of materials (for flash restoration) */
  protected originalEmissiveColors: THREE.Color[] = [];

  /**
   * Creates a new enemy and adds its mesh to the scene.
   * The enemy starts inactive and hidden.
   *
   * @param scene - The THREE.js scene to add the enemy mesh to
   * @param id - Unique identifier for this enemy
   * @param type - The enemy type
   */
  constructor(scene: THREE.Scene, id: number, type: EnemyType) {
    this.scene = scene;
    this.id = id;
    this.type = type;
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.active = false;
    this.speed = 0;
    this.health = 1;
    this.maxHealth = 1;
    this.fireCooldown = 0;
    this.fireRate = 1.0;
    this.elapsedTime = 0;

    // Build the appropriate mesh based on type
    switch (type) {
      case 'drone':
        this.mesh = createDroneMesh();
        break;
      case 'raider':
        this.mesh = createRaiderMesh();
        break;
            case 'sentry':
        this.mesh = createSentryMesh();
        break;
      case 'reaper':
      case 'warden':
      case 'harbinger':
      case 'overlord':
        // Elite enemies replace their mesh in their own constructors (EliteEnemy.ts)
        // Use a drone mesh as a temporary placeholder until then
        this.mesh = createDroneMesh();
        break;
      default:
        this.mesh = createDroneMesh();
        break;
    }

    // Add to scene but keep hidden until spawned
    scene.add(this.mesh);
    this.mesh.visible = false;
  }

  /**
   * Activates the enemy at the given position with the given speed.
   * The enemy drifts downward (-Y direction).
   *
   * @param position - The spawn position (Vector3 or {x, y, z})
   * @param speed - Movement speed in units per second
   */
    public spawn(position: THREE.Vector3 | { x: number; y: number; z: number }, speed: number): void {
        this.mesh.position.set(position.x, position.y, position.z);
    this.speed = speed;
    // Enemies drift downward: -Y direction
    this.velocity.set(0, -speed, 0);
    this.active = true;
    this.health = this.maxHealth;
    this.fireCooldown = this.fireRate * 0.5; // Initial delay before first shot
    this.elapsedTime = 0;
    this.flashTimer = 0;
    this.baseX = position.x;
    this.hoverReached = false;
    this.mesh.visible = true;

    // Start warp-in fade: set all materials to transparent with opacity 0
    this.warpInProgress = true;
    this.warpInTimer = 0;
    this.setAllMaterialsOpacity(0);
  }

  /**
   * Updates the enemy position, timers, and state.
   *
   * @param delta - Time elapsed since last frame in seconds
   */
    public update(delta: number): void {
        if (!this.active) return;

    // Apply movement pattern
    this.applyMovementPattern(delta);

    // Decrement fire cooldown
    if (this.fireCooldown > 0) {
      this.fireCooldown = Math.max(0, this.fireCooldown - delta);
    }

    // Increment elapsed time
    this.elapsedTime += delta;

    // Handle warp-in fade
    if (this.warpInProgress) {
      this.warpInTimer += delta;
      const progress = Math.min(this.warpInTimer / this.warpInDuration, 1);
      this.setAllMaterialsOpacity(progress);
      if (progress >= 1) {
        this.warpInProgress = false;
        this.restoreAllMaterialsOpaque();
      }
    }

        // Handle hit flash restoration
    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      if (this.flashTimer <= 0) {
        this.restoreEmissive();
      }
    }
  }

  /**
   * Applies the enemy's movement pattern.
   * Different patterns create distinct movement behaviors:
   *   - 'straight': Simple downward drift (default)
   *   - 'sine': S-shaped oscillation while drifting down
   *   - 'zigzag': Diagonal weaving back and forth
   *   - 'hover': Moves to a target Y position then stops
   *
   * @param delta - Time elapsed since last frame in seconds
   */
  private applyMovementPattern(delta: number): void {
    switch (this.movementPattern) {
      case 'sine':
        // S-shaped movement: oscillate horizontally while drifting down
        this.mesh.position.y += this.velocity.y * delta;
        this.mesh.position.x = this.baseX + Math.sin(this.elapsedTime * this.patternFrequency * Math.PI * 2) * this.patternAmplitude;
        break;

      case 'zigzag':
        // Zigzag movement: alternate horizontal direction at intervals
        this.mesh.position.y += this.velocity.y * delta;
        // Use a triangle wave for smooth zigzag
        const zigzagPhase = (this.elapsedTime * this.patternFrequency) % 1;
        const zigzagOffset = zigzagPhase < 0.5
          ? (zigzagPhase * 2 - 0.5) * 2 * this.patternAmplitude
          : (1 - (zigzagPhase - 0.5) * 2 - 0.5) * 2 * this.patternAmplitude;
        this.mesh.position.x = this.baseX + zigzagOffset;
        break;

      case 'hover':
        // Hover: move to target Y then stop
        if (!this.hoverReached) {
          if (this.mesh.position.y > this.hoverTargetY) {
            this.mesh.position.y += this.velocity.y * delta;
            // Clamp to target
            if (this.mesh.position.y <= this.hoverTargetY) {
              this.mesh.position.y = this.hoverTargetY;
              this.hoverReached = true;
              this.velocity.set(0, 0, 0);
            }
          } else {
            this.hoverReached = true;
            this.velocity.set(0, 0, 0);
          }
        }
        break;

      case 'straight':
      default:
        // Simple downward drift
        this.mesh.position.addScaledVector(this.velocity, delta);
        break;
    }
  }

  /**
   * Applies damage to the enemy.
   *
   * @param amount - Amount of damage to apply
   * @returns {boolean} True if the enemy is destroyed (health <= 0)
   */
  public takeDamage(amount: number): boolean {
    if (!this.active) return false;
    this.health -= amount;
    return this.health <= 0;
  }

  /**
   * Deactivates the enemy and hides it.
   * The mesh remains in the scene for potential pooling reuse.
   */
  public deactivate(): void {
    this.active = false;
    this.mesh.visible = false;
    this.flashTimer = 0;
    this.restoreEmissive();
  }

  /**
   * Returns the Axis-Aligned Bounding Box (AABB) of this enemy
   * for collision detection. Bounds are type-specific.
   *
   * @returns {THREE.Box3} The enemy's bounding box in world space
   */
  public getBounds(): THREE.Box3 {
    let halfWidth: number;
    let halfHeight: number;
    const halfDepth = 0.3;

    switch (this.type) {
      case 'drone':
        halfWidth = 0.4;
        halfHeight = 0.3;
        break;
      case 'raider':
        halfWidth = 0.6;
        halfHeight = 0.45;
        break;
            case 'sentry':
        halfWidth = 0.5;
        halfHeight = 0.4;
        break;
      case 'reaper':
        halfWidth = 0.9;
        halfHeight = 0.9;
        break;
      case 'warden':
        halfWidth = 1.0;
        halfHeight = 1.0;
        break;
      case 'harbinger':
        halfWidth = 1.1;
        halfHeight = 1.1;
        break;
      case 'overlord':
        halfWidth = 1.25;
        halfHeight = 1.25;
        break;
      default:
        halfWidth = 0.4;
        halfHeight = 0.3;
        break;
    }

    const pos = this.mesh.position;
    return new THREE.Box3(
      new THREE.Vector3(pos.x - halfWidth, pos.y - halfHeight, pos.z - halfDepth),
      new THREE.Vector3(pos.x + halfWidth, pos.y + halfHeight, pos.z + halfDepth)
    );
  }

  /**
   * Fires a bullet from this enemy.
   * Base implementation is a no-op — overridden by subclasses.
   *
   * @param bulletPool - The enemy bullet pool to spawn bullets from
   * @param playerPosition - The player's current position (for aimed shots)
   */
  public fire(bulletPool: EnemyBulletPool, playerPosition: THREE.Vector3 | { x: number; y: number; z: number }): void {
    // Base no-op — overridden by subclasses
  }

  /**
   * Triggers a brief white flash on the enemy mesh.
   * Stores original emissive values and restores them after ~0.1s.
   */
  public flashHit(): void {
    // Only capture the original emissive values while not already flashing.
    // Re-flashing (multiple hits within the 0.1s window) must NOT capture
    // the white flash state as the "original", or the enemy would stay white.
    if (this.flashTimer <= 0) {
      this.originalEmissiveIntensities = [];
      this.originalEmissiveColors = [];

      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.MeshStandardMaterial;
          if (material && 'emissive' in material) {
            this.originalEmissiveIntensities.push(material.emissiveIntensity);
            this.originalEmissiveColors.push(material.emissive.clone());
          }
        }
      });
    }

    // Apply the white flash
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial;
        if (material && 'emissive' in material) {
          material.emissiveIntensity = 2.0;
          material.emissive.set(0xffffff);
        }
      }
    });

    // Refresh the flash timer for restoration
    this.flashTimer = 0.1;
  }

  /**
   * Restores the original emissive values of all materials.
   * Called when the hit flash timer expires.
   */
  private restoreEmissive(): void {
    let index = 0;
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial;
        if (material && 'emissive' in material && index < this.originalEmissiveIntensities.length) {
          material.emissiveIntensity = this.originalEmissiveIntensities[index];
          material.emissive.copy(this.originalEmissiveColors[index]);
          index++;
        }
      }
    });

    this.originalEmissiveIntensities = [];
    this.originalEmissiveColors = [];
  }

    /**
   * Sets all materials to transparent with the given opacity.
   * Used for the warp-in fade effect.
   *
   * @param opacity - The opacity value (0 = invisible, 1 = opaque)
   */
  private setAllMaterialsOpacity(opacity: number): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
        if (material) {
          material.transparent = true;
          material.opacity = opacity;
        }
      }
    });
  }

  /**
   * Restores all materials to opaque.
   * Called after the warp-in effect completes.
   */
  private restoreAllMaterialsOpaque(): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
        if (material) {
          // Restore based on material type
          if (material instanceof THREE.MeshBasicMaterial) {
            // Glow materials: keep transparent but restore opacity
            material.transparent = true;
            material.opacity = 0.8;
          } else {
            // Standard materials: restore to opaque
            material.transparent = false;
            material.opacity = 1.0;
          }
        }
      }
    });
  }
}

/**
 * Drone — small scout drone with 1 HP.
 * Fires 1 slow bullet straight down every 2 seconds.
 * Drift speed: 1.5 units/second.
 */
export class Drone extends Enemy {
  /**
   * Creates a new Drone enemy.
   *
   * @param scene - The THREE.js scene
   * @param id - Unique identifier
   */
    constructor(scene: THREE.Scene, id: number) {
    super(scene, id, 'drone');
    this.maxHealth = 1;
    this.health = 1;
    this.fireRate = 2.0;
    this.movementPattern = 'sine';
    this.patternAmplitude = 0.8;
    this.patternFrequency = 0.5; // 0.5 cycles per second
    this.patternPhase = Math.random() * Math.PI * 2; // Random phase offset
  }

  /**
   * Fires 1 slow bullet straight down from the enemy position.
   *
   * @param bulletPool - The enemy bullet pool to spawn bullets from
   * @param playerPosition - The player's current position (unused for drone)
   */
  public fire(bulletPool: EnemyBulletPool, playerPosition: THREE.Vector3 | { x: number; y: number; z: number }): void {
    if (this.fireCooldown > 0) return;

    const bullet = bulletPool.get();
    if (bullet) {
      const pos = this.mesh.position;
            bullet.spawn({ x: pos.x, y: pos.y - 0.4, z: pos.z }, 5 * this.bulletSpeedMultiplier);
    }

    this.fireCooldown = this.fireRate;
  }
}

/**
 * Raider — medium fighter with 2 HP.
 * Fires 3 bullets in a fan spread (straight down, ±15°) every 1.5 seconds.
 * Drift speed: 2.5 units/second.
 */
export class Raider extends Enemy {
  /**
   * Creates a new Raider enemy.
   *
   * @param scene - The THREE.js scene
   * @param id - Unique identifier
   */
    constructor(scene: THREE.Scene, id: number) {
    super(scene, id, 'raider');
    this.maxHealth = 2;
    this.health = 2;
    this.fireRate = 1.5;
    this.movementPattern = 'zigzag';
    this.patternAmplitude = 1.2;
    this.patternFrequency = 0.4; // 0.4 cycles per second
    this.patternPhase = Math.random() * Math.PI * 2;
  }

  /**
   * Fires 3 bullets in a fan spread: straight down, 15° left, 15° right.
   *
   * @param bulletPool - The enemy bullet pool to spawn bullets from
   * @param playerPosition - The player's current position (unused for raider)
   */
  public fire(bulletPool: EnemyBulletPool, playerPosition: THREE.Vector3 | { x: number; y: number; z: number }): void {
    if (this.fireCooldown > 0) return;

        const pos = this.mesh.position;
    const speed = 7 * this.bulletSpeedMultiplier;
    const spreadAngle = Math.PI / 12; // 15 degrees

    // Straight down
    const bullet1 = bulletPool.get();
    if (bullet1) {
      bullet1.spawn({ x: pos.x, y: pos.y - 0.4, z: pos.z }, speed);
    }

    // 15 degrees left
    const bullet2 = bulletPool.get();
    if (bullet2) {
      bullet2.spawn({ x: pos.x, y: pos.y - 0.4, z: pos.z }, speed);
      bullet2.velocity.set(-Math.sin(spreadAngle) * speed, -Math.cos(spreadAngle) * speed, 0);
    }

    // 15 degrees right
    const bullet3 = bulletPool.get();
    if (bullet3) {
      bullet3.spawn({ x: pos.x, y: pos.y - 0.4, z: pos.z }, speed);
      bullet3.velocity.set(Math.sin(spreadAngle) * speed, -Math.cos(spreadAngle) * speed, 0);
    }

    this.fireCooldown = this.fireRate;
  }
}

/**
 * Sentry — hovering turret with 3 HP.
 * Fires 2 bullets aimed at the player position (±5°) every 2.5 seconds.
 * Hovers in place once reaching target Y (y < 5).
 */
export class Sentry extends Enemy {
  /**
   * Creates a new Sentry enemy.
   *
   * @param scene - The THREE.js scene
   * @param id - Unique identifier
   */
    constructor(scene: THREE.Scene, id: number) {
    super(scene, id, 'sentry');
    this.maxHealth = 3;
    this.health = 3;
    this.fireRate = 2.5;
    this.movementPattern = 'hover';
    this.hoverTargetY = 4 + Math.random() * 2; // Random hover height between 4-6
  }

  /**
   * Fires 2 bullets aimed at the player position with slight spread (±5°).
   * Rotates the barrel to aim at the player.
   *
   * @param bulletPool - The enemy bullet pool to spawn bullets from
   * @param playerPosition - The player's current position (for aiming)
   */
  public fire(bulletPool: EnemyBulletPool, playerPosition: THREE.Vector3 | { x: number; y: number; z: number }): void {
    if (this.fireCooldown > 0) return;

        const pos = this.mesh.position;
    const speed = 8 * this.bulletSpeedMultiplier;

    // Calculate direction to player
    const dx = playerPosition.x - pos.x;
    const dy = playerPosition.y - pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 0.001) return;

    // Normalized direction to player
    const dirX = dx / distance;
    const dirY = dy / distance;

    // Rotate barrel to aim at player
    const barrelData = this.mesh.userData as { barrel?: THREE.Mesh };
    if (barrelData.barrel) {
      const angle = Math.atan2(dirX, -dirY);
      barrelData.barrel.rotation.z = angle;
    }

    // Fire 2 bullets with slight spread (±5°)
    const spreadAngle = Math.PI / 36; // 5 degrees

    // Bullet 1: slightly left of aim
    const bullet1 = bulletPool.get();
    if (bullet1) {
      bullet1.spawn({ x: pos.x, y: pos.y - 0.4, z: pos.z }, speed);
      const angle = Math.atan2(dirX, dirY) - spreadAngle;
      bullet1.velocity.set(Math.sin(angle) * speed, Math.cos(angle) * speed, 0);
    }

    // Bullet 2: slightly right of aim
    const bullet2 = bulletPool.get();
    if (bullet2) {
      bullet2.spawn({ x: pos.x, y: pos.y - 0.4, z: pos.z }, speed);
      const angle = Math.atan2(dirX, dirY) + spreadAngle;
      bullet2.velocity.set(Math.sin(angle) * speed, Math.cos(angle) * speed, 0);
    }

    this.fireCooldown = this.fireRate;
  }
}

/**
 * Factory function that creates an enemy of the given type.
 *
 * @param scene - The THREE.js scene
 * @param id - Unique identifier
 * @param type - The enemy type to create
 * @returns {Enemy} A configured enemy instance
 */
export function createEnemy(scene: THREE.Scene, id: number, type: EnemyType): Enemy {
  switch (type) {
    case 'drone':
      return new Drone(scene, id);
    case 'raider':
      return new Raider(scene, id);
    case 'sentry':
      return new Sentry(scene, id);
    case 'reaper':
    case 'warden':
    case 'harbinger':
    case 'overlord':
      // Elite enemies are created separately via createEliteEnemy() in EliteEnemy.ts
      // Return a basic enemy as fallback
      return new Drone(scene, id);
    default:
      return new Drone(scene, id);
  }
}

/**
 * Returns a random enemy type with weighted distribution:
 *   - Drone: 60%
 *   - Raider: 30%
 *   - Sentry: 10%
 *
 * @returns {EnemyType} A randomly selected enemy type
 */
export function getRandomEnemyType(): EnemyType {
  // Elite enemies are spawned separately via getRandomEliteEnemyType() in EliteEnemy.ts
  // This function only returns basic enemy types
  const roll = Math.random();

  if (roll < 0.6) {
    return 'drone';
  } else if (roll < 0.9) {
    return 'raider';
  } else {
    return 'sentry';
  }
}