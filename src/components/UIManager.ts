import * as THREE from 'three';
import { GameConfig, PlaneType, PLANE_DATA } from './GameConfig';
import { buildVanguard } from './Player';
import { buildPhantom, buildTitan } from './Fighters';

/**
 * UIManager — manages all screen transitions for StarForge Strike.
 *
  * Handles the main menu, plane selection, how-to-play, level clear,
 * mission failed, and pause overlays.
 * During plane selection, renders three fighter holograms on pedestals
 * in the main THREE.js scene. The selected fighter is highlighted with
 * a cyan ring and enlarged scale.
 *
 * Screen states:
 *   - 'menu': Main menu with START MISSION and HOW TO PLAY buttons
 *   - 'planeSelect': Fighter selection with three holograms
 *   - 'howToPlay': Controls and mechanics overview
  *   - 'levelClear': MISSION COMPLETE settlement screen after boss defeat
 *   - 'missionFailed': MISSION FAILED screen when player is destroyed
 *   - 'victory': Victory screen shown after all levels completed
 *   - 'paused': Pause overlay shown when the game is paused
 *   - 'gameplay': Game is running (no overlay visible)
 */
export class UIManager {
  /** The THREE.js scene for adding plane selection objects */
  private scene: THREE.Scene;
  /** The perspective camera (used for lighting setup) */
  private camera: THREE.PerspectiveCamera;
  /** Callback invoked when the player deploys a fighter */
  private onDeploy: (planeType: PlaneType) => void;
  /** Callback invoked when the player clicks NEXT MISSION on the level clear screen */
  private onNextMission: () => void;
  /** Callback invoked when the player clicks RETRY MISSION on the mission failed screen */
  private onRetry: () => void;
    /** Callback invoked when the player clicks RETURN TO BASE on the mission failed screen */
  private onReturnToBase: () => void;
  /** Callback invoked when the player clicks RESUME on the pause overlay */
  private onResume: () => void;
  /** Callback invoked when the player clicks RESTART MISSION on the pause overlay */
  private onRestart: () => void;
  /** Callback invoked when the player clicks ABANDON MISSION on the pause overlay */
  private onAbandon: () => void;

  /** Current screen state */
  private screen: 'menu' | 'planeSelect' | 'howToPlay' | 'levelClear' | 'missionFailed' | 'victory' | 'gameplay' | 'paused' = 'menu';

  /** Main menu overlay element */
  private mainMenuEl: HTMLElement | null = null;
  /** Plane selection overlay element */
  private planeSelectEl: HTMLElement | null = null;
  /** How-to-play overlay element */
  private howToPlayEl: HTMLElement | null = null;
  /** Level clear overlay element */
  private levelClearEl: HTMLElement | null = null;
    /** Mission failed overlay element */
  private missionFailedEl: HTMLElement | null = null;
  /** Victory overlay element */
  private victoryEl: HTMLElement | null = null;
    /** Victory total score element */
  private victoryTotalScoreEl: HTMLElement | null = null;
  /** Pause overlay element */
  private pauseOverlayEl: HTMLElement | null = null;

  /** Group containing all plane selection 3D objects */
  private planeSelectGroup: THREE.Group | null = null;

  /** Array of fighter preview groups (index 0 = vanguard, 1 = phantom, 2 = titan) */
  private fighterPreviews: THREE.Group[] = [];
  /** Array of selection rings (torus meshes) for each fighter */
  private selectionRings: THREE.Mesh[] = [];
  /** Array of glowing totem groups (replaces pedestals) for each fighter */
  private fighterTotems: THREE.Group[] = [];

  /** Group containing the holographic city backdrop behind the main menu */
  private cityGroup: THREE.Group | null = null;

  /** Scene fog to restore when leaving the menu backdrop */
  private originalFog: THREE.FogBase | null = null;

  /** Currently selected fighter index (0, 1, 2) */
  private selectedIndex: number = 0;

  /** Plane name label element */
  private planeNameEl: HTMLElement | null = null;
  /** Plane description element */
  private planeDescEl: HTMLElement | null = null;

  /** Level clear score breakdown value elements */
  private levelClearEnemiesEl: HTMLElement | null = null;
  private levelClearElitesEl: HTMLElement | null = null;
  private levelClearBossEl: HTMLElement | null = null;
  private levelClearPickupsEl: HTMLElement | null = null;
  private levelClearTimeEl: HTMLElement | null = null;
  private levelClearHealthEl: HTMLElement | null = null;
  private levelClearTotalEl: HTMLElement | null = null;

  /** Mission failed score display elements */
  private missionFailedLevelNameEl: HTMLElement | null = null;
  private missionFailedScoreEl: HTMLElement | null = null;

  /** Target score for the count-up animation */
  private levelClearTotalScore: number = 0;
  /** Handle for the count-up animation frame */
  private countUpAnimationId: number | null = null;

  /** Point light for illuminating fighter previews */
  private previewLight: THREE.PointLight | null = null;

  /** Total elapsed time for pulse animations */
  private elapsedTime: number = 0;

  /** Whether the UIManager has been disposed */
  private isDisposed: boolean = false;

  /**
   * Creates a new UIManager.
   *
   * @param scene - The THREE.js scene to add plane selection objects to
   * @param camera - The perspective camera viewing the play field
   * @param onDeploy - Callback invoked with the selected plane type when deploying
   * @param onNextMission - Callback invoked when the NEXT MISSION button is clicked
      * @param onRetry - Callback invoked when the RETRY MISSION button is clicked
   * @param onReturnToBase - Callback invoked when the RETURN TO BASE button is clicked
   * @param onResume - Callback invoked when the RESUME button is clicked on the pause overlay
   * @param onRestart - Callback invoked when the RESTART MISSION button is clicked on the pause overlay
   * @param onAbandon - Callback invoked when the ABANDON MISSION button is clicked on the pause overlay
   */
  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    onDeploy: (planeType: PlaneType) => void,
    onNextMission: () => void,
    onRetry: () => void,
    onReturnToBase: () => void,
    onResume: () => void,
    onRestart: () => void,
    onAbandon: () => void
  ) {
    this.scene = scene;
    this.camera = camera;
    this.originalFog = scene.fog;
    this.onDeploy = onDeploy;
    this.onNextMission = onNextMission;
    this.onRetry = onRetry;
    this.onReturnToBase = onReturnToBase;
    this.onResume = onResume;
    this.onRestart = onRestart;
    this.onAbandon = onAbandon;

    // Build all DOM overlays
    this.buildMainMenu();
    this.buildPlaneSelect();
    this.buildHowToPlay();
        this.buildLevelClear();
    this.buildMissionFailed();
    this.buildVictory();
    this.buildPauseOverlay();

    // Add keyboard listener for plane selection cycling
    window.addEventListener('keydown', this.handleKeyDown);

    // Start on the main menu
    this.showMenu();
  }

  /**
   * Shows the main menu overlay.
   * Hides all other overlays and clears plane selection scene objects.
   */
  public showMenu(): void {
    this.screen = 'menu';
    this.hideAll();
    this.clearPlaneSelectScene();
    this.buildCity();

    // Position the camera for an elevated top-down view of the city
    this.camera.position.set(0, 22, 14);
    this.camera.lookAt(0, 0, -10);

    // Disable fog so the whole city stays crisp from above
    this.scene.fog = null;

    if (this.mainMenuEl) {
      this.mainMenuEl.style.display = 'flex';
    }
  }

  /**
   * Shows the plane selection screen.
   * Hides all other overlays, builds the pedestals and fighter holograms,
   * and resets the selection to the first fighter.
   */
  public showPlaneSelect(): void {
    this.screen = 'planeSelect';
    this.hideAll();
    this.clearPlaneSelectScene();
    this.buildCity();

    // Keep the elevated top-down camera over the city
    this.camera.position.set(0, 22, 14);
    this.camera.lookAt(0, 0, -10);

    // Keep fog disabled so the city stays crisp from above
    this.scene.fog = null;

    // Reset selection
    this.selectedIndex = 0;

    // Build the 3D scene objects
    this.buildPlaneSelectScene();

    // Update the UI labels
    this.updatePlaneInfo();

    if (this.planeSelectEl) {
      this.planeSelectEl.style.display = 'flex';
    }
  }

  /**
   * Shows the how-to-play overlay.
   * Hides all other overlays.
   */
  public showHowToPlay(): void {
    this.screen = 'howToPlay';
    this.hideAll();
    this.clearPlaneSelectScene();
    this.clearCity();

    if (this.howToPlayEl) {
      this.howToPlayEl.style.display = 'flex';
    }
  }

  /**
   * Shows the level clear settlement screen with the given score breakdown.
   * Hides all other overlays and displays the MISSION COMPLETE screen.
   *
   * @param levelName - The name of the level that was completed
   * @param scoreBreakdown - The score breakdown for the completed level
   */
  public showLevelClear(
    levelName: string,
    scoreBreakdown: { enemies: number; elites: number; boss: number; pickups: number; time: number; health: number; total: number }
  ): void {
    this.screen = 'levelClear';
    this.hideAll();
    this.clearPlaneSelectScene();
    this.clearCity();

    if (!this.levelClearEl) return;

    // Update level name
    const levelNameEl = this.levelClearEl.querySelector('.level-clear-level-name');
    if (levelNameEl) {
      levelNameEl.textContent = levelName;
    }

    // Update score breakdown values
    if (this.levelClearEnemiesEl) {
      this.levelClearEnemiesEl.textContent = scoreBreakdown.enemies.toLocaleString();
    }
    if (this.levelClearElitesEl) {
      this.levelClearElitesEl.textContent = scoreBreakdown.elites.toLocaleString();
    }
    if (this.levelClearBossEl) {
      this.levelClearBossEl.textContent = scoreBreakdown.boss.toLocaleString();
    }
    if (this.levelClearPickupsEl) {
      this.levelClearPickupsEl.textContent = scoreBreakdown.pickups.toLocaleString();
    }
    if (this.levelClearTimeEl) {
      this.levelClearTimeEl.textContent = scoreBreakdown.time.toLocaleString();
    }
    if (this.levelClearHealthEl) {
      this.levelClearHealthEl.textContent = scoreBreakdown.health.toLocaleString();
    }

    // Store the total score for the count-up animation
    this.levelClearTotalScore = scoreBreakdown.total;

    // Show the overlay
    this.levelClearEl.style.display = 'flex';

    // Start the count-up animation
    this.animateScoreCountUp(scoreBreakdown.total);
  }

  /**
   * Hides the level clear overlay.
   */
  public hideLevelClear(): void {
    if (this.levelClearEl) {
      this.levelClearEl.style.display = 'none';
    }
  }

  /**
   * Shows the mission failed screen with the given level name and score.
   * Hides all other overlays and displays the MISSION FAILED screen.
   *
   * @param levelName - The name of the level where the player was destroyed
   * @param score - The score achieved before destruction
   */
  public showMissionFailed(levelName: string, score: number): void {
    this.screen = 'missionFailed';
    this.hideAll();
    this.clearPlaneSelectScene();
    this.clearCity();

    if (!this.missionFailedEl) return;

    // Update level name
    if (this.missionFailedLevelNameEl) {
      this.missionFailedLevelNameEl.textContent = levelName;
    }

    // Update score
    if (this.missionFailedScoreEl) {
      this.missionFailedScoreEl.textContent = score.toLocaleString();
    }

    // Show the overlay
    this.missionFailedEl.style.display = 'flex';
  }

    /**
   * Hides the mission failed overlay.
   */
  public hideMissionFailed(): void {
    if (this.missionFailedEl) {
      this.missionFailedEl.style.display = 'none';
    }
    this.screen = 'gameplay';
  }

  /**
   * Shows the victory screen with the total score across all levels.
   * Hides all other overlays and displays the ALL MISSIONS COMPLETE screen.
   *
   * @param totalScore - The total score accumulated across all levels
   */
  public showVictory(totalScore: number): void {
    this.screen = 'victory';
    this.hideAll();
    this.clearPlaneSelectScene();
    this.clearCity();

    if (!this.victoryEl) return;

    // Update the total score display
    if (this.victoryTotalScoreEl) {
      this.victoryTotalScoreEl.textContent = totalScore.toLocaleString();
    }

    // Show the overlay
    this.victoryEl.style.display = 'flex';
  }

    /**
   * Hides the victory overlay.
   */
  public hideVictory(): void {
    if (this.victoryEl) {
      this.victoryEl.style.display = 'none';
    }
  }

  /**
   * Shows the pause overlay.
   * Hides all other overlays and displays the MISSION PAUSED screen.
   */
  public showPause(): void {
    this.screen = 'paused';
    this.hideAll();
    this.clearPlaneSelectScene();
    this.clearCity();

    if (this.pauseOverlayEl) {
      this.pauseOverlayEl.style.display = 'flex';
    }
  }

  /**
   * Hides the pause overlay and returns to gameplay.
   */
  public hidePause(): void {
    if (this.pauseOverlayEl) {
      this.pauseOverlayEl.style.display = 'none';
    }
    this.screen = 'gameplay';
  }

  /**
   * Hides all overlays.
   * Used when transitioning to gameplay.
   */
  public hideAll(): void {
    if (this.mainMenuEl) this.mainMenuEl.style.display = 'none';
    if (this.planeSelectEl) this.planeSelectEl.style.display = 'none';
    if (this.howToPlayEl) this.howToPlayEl.style.display = 'none';
        if (this.levelClearEl) this.levelClearEl.style.display = 'none';
    if (this.missionFailedEl) this.missionFailedEl.style.display = 'none';
    if (this.victoryEl) this.victoryEl.style.display = 'none';
    if (this.pauseOverlayEl) this.pauseOverlayEl.style.display = 'none';
  }

  /**
   * Updates the plane selection animations.
   * Pulses the selection ring and engine glows.
   * Should be called once per frame from the render loop.
   *
   * @param delta - Time elapsed since last frame in seconds
   */
  public update(delta: number): void {
    // Slowly rotate the holographic city backdrop on menu and plane select
    if ((this.screen === 'menu' || this.screen === 'planeSelect') && this.cityGroup) {
      this.cityGroup.rotation.y += delta * 0.05;
    }

    if (this.screen === 'menu') {
      return;
    }

    if (this.screen !== 'planeSelect') return;

    this.elapsedTime += delta;

    // Rotate each glowing totem facing the camera
    for (const totem of this.fighterTotems) {
      totem.rotation.z += delta * 0.8;
    }

    // Pulse the selection ring on the selected fighter
    if (this.selectionRings[this.selectedIndex]) {
      const ring = this.selectionRings[this.selectedIndex];
      const pulse = Math.sin(this.elapsedTime * 4);
      const scale = 1 + pulse * 0.15;
      ring.scale.set(scale, scale, scale);

      // Pulse opacity
      const material = ring.material as THREE.MeshBasicMaterial;
      material.opacity = 0.7 + pulse * 0.3;
    }

    // Animate engine glow pulses on all fighters
    for (const fighter of this.fighterPreviews) {
      const userData = fighter.userData as {
        leftGlow?: THREE.Mesh;
        rightGlow?: THREE.Mesh;
        singleGlow?: THREE.Mesh;
      };

      if (!userData) continue;

      const pulse = Math.sin(this.elapsedTime * 6);
      const scale = 1 + pulse * 0.3;
      const opacity = 0.7 + pulse * 0.3;

      // Handle twin glow (vanguard, titan)
      if (userData.leftGlow && userData.rightGlow) {
        userData.leftGlow.scale.set(scale, scale, scale);
        userData.rightGlow.scale.set(scale, scale, scale);
        (userData.leftGlow.material as THREE.MeshBasicMaterial).opacity = opacity;
        (userData.rightGlow.material as THREE.MeshBasicMaterial).opacity = opacity;
      }

      // Handle single glow (phantom)
      if (userData.singleGlow) {
        userData.singleGlow.scale.set(scale, scale, scale);
        (userData.singleGlow.material as THREE.MeshBasicMaterial).opacity = opacity;
      }
    }
  }

  /**
   * Disposes the UIManager.
   * Removes all DOM elements, event listeners, and scene objects.
   */
  public dispose(): void {
    if (this.isDisposed) return;

    // Cancel any pending count-up animation
    if (this.countUpAnimationId !== null) {
      cancelAnimationFrame(this.countUpAnimationId);
      this.countUpAnimationId = null;
    }

    // Remove keyboard listener
    window.removeEventListener('keydown', this.handleKeyDown);

    // Remove all DOM overlays
    if (this.mainMenuEl && this.mainMenuEl.parentNode) {
      this.mainMenuEl.parentNode.removeChild(this.mainMenuEl);
    }
    if (this.planeSelectEl && this.planeSelectEl.parentNode) {
      this.planeSelectEl.parentNode.removeChild(this.planeSelectEl);
    }
    if (this.howToPlayEl && this.howToPlayEl.parentNode) {
      this.howToPlayEl.parentNode.removeChild(this.howToPlayEl);
    }
    if (this.levelClearEl && this.levelClearEl.parentNode) {
      this.levelClearEl.parentNode.removeChild(this.levelClearEl);
    }
        if (this.missionFailedEl && this.missionFailedEl.parentNode) {
      this.missionFailedEl.parentNode.removeChild(this.missionFailedEl);
    }
        if (this.victoryEl && this.victoryEl.parentNode) {
      this.victoryEl.parentNode.removeChild(this.victoryEl);
    }
    if (this.pauseOverlayEl && this.pauseOverlayEl.parentNode) {
      this.pauseOverlayEl.parentNode.removeChild(this.pauseOverlayEl);
    }

    // Clear plane selection scene objects
    this.clearPlaneSelectScene();

    // Clear the city backdrop
    this.clearCity();

    this.mainMenuEl = null;
    this.planeSelectEl = null;
    this.howToPlayEl = null;
        this.levelClearEl = null;
    this.missionFailedEl = null;
    this.victoryEl = null;
    this.victoryTotalScoreEl = null;
    this.pauseOverlayEl = null;

    this.isDisposed = true;
  }

  /**
   * Builds the main menu DOM overlay.
   * Contains the title, subtitle, and two action buttons.
   */
  private buildMainMenu(): void {
    const overlay = document.createElement('div');
    overlay.id = 'main-menu';
    overlay.className = 'ui-overlay';

    const content = document.createElement('div');
    content.className = 'menu-content';

    // Title
    const title = document.createElement('h1');
    title.className = 'menu-title';
    title.textContent = 'STARFORGE STRIKE';
    content.appendChild(title);

    // Subtitle
    const subtitle = document.createElement('p');
    subtitle.className = 'menu-subtitle';
    subtitle.textContent = 'TACTICAL STRIKE FIGHTER PROGRAM';
    content.appendChild(subtitle);

    // Button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'menu-buttons';

    // START MISSION button
    const startButton = document.createElement('button');
    startButton.className = 'menu-button';
    startButton.textContent = 'START MISSION';
    startButton.addEventListener('click', () => {
      this.showPlaneSelect();
    });
    buttonContainer.appendChild(startButton);

    // HOW TO PLAY button
    const howToPlayButton = document.createElement('button');
    howToPlayButton.className = 'menu-button';
    howToPlayButton.textContent = 'HOW TO PLAY';
    howToPlayButton.addEventListener('click', () => {
      this.showHowToPlay();
    });
    buttonContainer.appendChild(howToPlayButton);

    content.appendChild(buttonContainer);
    overlay.appendChild(content);

    document.body.appendChild(overlay);
    this.mainMenuEl = overlay;
  }

  /**
   * Builds the plane selection DOM overlay.
   * Contains the title, deploy button, plane info, and control hints.
   */
  private buildPlaneSelect(): void {
    const overlay = document.createElement('div');
    overlay.id = 'plane-select';
    overlay.className = 'ui-overlay';

    const content = document.createElement('div');
    content.className = 'plane-select-content';

    // Title
    const title = document.createElement('h2');
    title.className = 'plane-select-title';
    title.textContent = 'SELECT FIGHTER';
    content.appendChild(title);

    // Plane name label
    this.planeNameEl = document.createElement('h3');
    this.planeNameEl.className = 'plane-name';
    content.appendChild(this.planeNameEl);

    // Plane description
    this.planeDescEl = document.createElement('p');
    this.planeDescEl.className = 'plane-description';
    content.appendChild(this.planeDescEl);

    // DEPLOY button
    const deployButton = document.createElement('button');
    deployButton.className = 'menu-button deploy-button';
    deployButton.textContent = 'DEPLOY';
    deployButton.addEventListener('click', () => {
      this.deploy();
    });
    content.appendChild(deployButton);

    // Control hints
    const hints = document.createElement('p');
    hints.className = 'plane-select-hints';
    hints.textContent = 'A/D or Left/Right to cycle  •  Enter/Space to deploy';
    content.appendChild(hints);

    overlay.appendChild(content);

    document.body.appendChild(overlay);
    this.planeSelectEl = overlay;
  }

  /**
   * Builds the how-to-play DOM overlay.
   * Contains the title, controls list, and a back button.
   */
  private buildHowToPlay(): void {
    const overlay = document.createElement('div');
    overlay.id = 'how-to-play';
    overlay.className = 'ui-overlay';

    const content = document.createElement('div');
    content.className = 'how-to-play-content';

    // Title
    const title = document.createElement('h2');
    title.className = 'how-to-play-title';
    title.textContent = 'HOW TO PLAY';
    content.appendChild(title);

    // Controls list
    const controlsList = document.createElement('ul');
    controlsList.className = 'controls-list';

    const controls = [
      'A / D — Move Left / Right',
      'W / S — Move Up / Down',
      'Auto-Fire — Weapons fire automatically',
      'SPACE — PROTECT: sacrifice oldest wingman to clear enemy bullets',
      'ESC / P — Pause game',
    ];

    for (const control of controls) {
      const item = document.createElement('li');
      item.textContent = control;
      controlsList.appendChild(item);
    }

    content.appendChild(controlsList);

    // BACK button
    const backButton = document.createElement('button');
    backButton.className = 'menu-button';
    backButton.textContent = 'BACK';
    backButton.addEventListener('click', () => {
      this.showMenu();
    });
    content.appendChild(backButton);

    overlay.appendChild(content);

    document.body.appendChild(overlay);
    this.howToPlayEl = overlay;
  }

  /**
   * Builds the level clear settlement DOM overlay.
   * Contains the MISSION COMPLETE header, level name, score breakdown,
   * total score, and NEXT MISSION button.
   */
  private buildLevelClear(): void {
    const overlay = document.createElement('div');
    overlay.id = 'level-clear';
    overlay.className = 'ui-overlay';

    const content = document.createElement('div');
    content.className = 'level-clear-content';

    // Header
    const header = document.createElement('h2');
    header.className = 'level-clear-header';
    header.textContent = 'MISSION COMPLETE';
    content.appendChild(header);

    // Level name
    const levelName = document.createElement('p');
    levelName.className = 'level-clear-level-name';
    levelName.textContent = '';
    content.appendChild(levelName);

    // Score breakdown container
    const breakdownContainer = document.createElement('div');
    breakdownContainer.className = 'level-clear-breakdown';

    // Helper to create a score row
    const createScoreRow = (label: string, valueEl: HTMLElement): HTMLElement => {
      const row = document.createElement('div');
      row.className = 'level-clear-row';

      const labelEl = document.createElement('span');
      labelEl.className = 'level-clear-row-label';
      labelEl.textContent = label;
      row.appendChild(labelEl);

      valueEl.className = 'level-clear-row-value';
      valueEl.textContent = '0';
      row.appendChild(valueEl);

      return row;
    };

    // Enemies destroyed row
    this.levelClearEnemiesEl = document.createElement('span');
    breakdownContainer.appendChild(createScoreRow('ENEMIES DESTROYED', this.levelClearEnemiesEl));

    // Elites destroyed row
    this.levelClearElitesEl = document.createElement('span');
    breakdownContainer.appendChild(createScoreRow('ELITES DESTROYED', this.levelClearElitesEl));

    // Boss bonus row
    this.levelClearBossEl = document.createElement('span');
    breakdownContainer.appendChild(createScoreRow('BOSS BONUS', this.levelClearBossEl));

    // Pickup bonus row
    this.levelClearPickupsEl = document.createElement('span');
    breakdownContainer.appendChild(createScoreRow('PICKUP BONUS', this.levelClearPickupsEl));

    // Time bonus row
    this.levelClearTimeEl = document.createElement('span');
    breakdownContainer.appendChild(createScoreRow('TIME BONUS', this.levelClearTimeEl));

    // Health bonus row
    this.levelClearHealthEl = document.createElement('span');
    breakdownContainer.appendChild(createScoreRow('HEALTH BONUS', this.levelClearHealthEl));

    // Divider
    const divider = document.createElement('div');
    divider.className = 'level-clear-divider';
    breakdownContainer.appendChild(divider);

    // Total score row
    const totalRow = document.createElement('div');
    totalRow.className = 'level-clear-row total';

    const totalLabel = document.createElement('span');
    totalLabel.className = 'level-clear-row-label';
    totalLabel.textContent = 'TOTAL SCORE';
    totalRow.appendChild(totalLabel);

    this.levelClearTotalEl = document.createElement('span');
    this.levelClearTotalEl.className = 'level-clear-row-value total-value';
    this.levelClearTotalEl.textContent = '0';
    totalRow.appendChild(this.levelClearTotalEl);

    breakdownContainer.appendChild(totalRow);

    content.appendChild(breakdownContainer);

    // NEXT MISSION button
    const nextMissionButton = document.createElement('button');
    nextMissionButton.className = 'menu-button level-clear-button';
    nextMissionButton.textContent = 'NEXT MISSION';
    nextMissionButton.addEventListener('click', () => {
      this.hideLevelClear();
      this.onNextMission();
    });
    content.appendChild(nextMissionButton);

    overlay.appendChild(content);

    document.body.appendChild(overlay);
    this.levelClearEl = overlay;
  }

  /**
   * Builds the mission failed DOM overlay.
   * Contains the MISSION FAILED header, level name, score achieved,
   * RETRY MISSION button, and RETURN TO BASE button.
   */
  private buildMissionFailed(): void {
    const overlay = document.createElement('div');
    overlay.id = 'mission-failed';
    overlay.className = 'ui-overlay';

    const content = document.createElement('div');
    content.className = 'mission-failed-content';

    // Header
    const header = document.createElement('h2');
    header.className = 'mission-failed-header';
    header.textContent = 'MISSION FAILED';
    content.appendChild(header);

    // Level name
    this.missionFailedLevelNameEl = document.createElement('p');
    this.missionFailedLevelNameEl.className = 'mission-failed-level-name';
    this.missionFailedLevelNameEl.textContent = '';
    content.appendChild(this.missionFailedLevelNameEl);

    // Score achieved
    const scoreLabel = document.createElement('p');
    scoreLabel.className = 'mission-failed-score-label';
    scoreLabel.textContent = 'SCORE ACHIEVED';
    content.appendChild(scoreLabel);

    this.missionFailedScoreEl = document.createElement('p');
    this.missionFailedScoreEl.className = 'mission-failed-score';
    this.missionFailedScoreEl.textContent = '0';
    content.appendChild(this.missionFailedScoreEl);

    // Button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'mission-failed-buttons';

    // RETRY MISSION button
    const retryButton = document.createElement('button');
    retryButton.className = 'menu-button mission-failed-button';
    retryButton.textContent = 'RETRY MISSION';
    retryButton.addEventListener('click', () => {
      this.hideMissionFailed();
      this.onRetry();
    });
    buttonContainer.appendChild(retryButton);

    // RETURN TO BASE button
    const returnButton = document.createElement('button');
    returnButton.className = 'menu-button mission-failed-button';
    returnButton.textContent = 'RETURN TO BASE';
    returnButton.addEventListener('click', () => {
      this.hideMissionFailed();
      this.onReturnToBase();
    });
    buttonContainer.appendChild(returnButton);

    content.appendChild(buttonContainer);

    overlay.appendChild(content);

    document.body.appendChild(overlay);
    this.missionFailedEl = overlay;
  }

    /**
   * Builds the victory DOM overlay.
   * Contains the ALL MISSIONS COMPLETE header, total score display,
   * and RETURN TO BASE button.
   */
  private buildVictory(): void {
    const overlay = document.createElement('div');
    overlay.id = 'victory-screen';
    overlay.className = 'ui-overlay';

    const content = document.createElement('div');
    content.className = 'victory-content';

    // Header
    const header = document.createElement('h2');
    header.className = 'victory-header';
    header.textContent = 'ALL MISSIONS COMPLETE';
    content.appendChild(header);

    // Subtitle
    const subtitle = document.createElement('p');
    subtitle.className = 'victory-subtitle';
    subtitle.textContent = 'THE SOVEREIGN CORE HAS FALLEN';
    content.appendChild(subtitle);

    // Total score label
    const scoreLabel = document.createElement('p');
    scoreLabel.className = 'victory-score-label';
    scoreLabel.textContent = 'TOTAL SCORE';
    content.appendChild(scoreLabel);

    // Total score value
    this.victoryTotalScoreEl = document.createElement('p');
    this.victoryTotalScoreEl.className = 'victory-score-value';
    this.victoryTotalScoreEl.textContent = '0';
    content.appendChild(this.victoryTotalScoreEl);

    // RETURN TO BASE button
    const returnButton = document.createElement('button');
    returnButton.className = 'menu-button victory-button';
    returnButton.textContent = 'RETURN TO BASE';
    returnButton.addEventListener('click', () => {
      this.hideVictory();
      this.onReturnToBase();
    });
    content.appendChild(returnButton);

    overlay.appendChild(content);

    document.body.appendChild(overlay);
    this.victoryEl = overlay;
  }

    /**
   * Builds the pause overlay DOM element.
   * Creates a dark translucent overlay with RESUME, RESTART MISSION,
   * and ABANDON MISSION buttons.
   */
  private buildPauseOverlay(): void {
    const overlay = document.createElement('div');
    overlay.id = 'pause-overlay';
    overlay.className = 'ui-overlay pause-overlay';

    const content = document.createElement('div');
    content.className = 'pause-content';

    // Header
    const header = document.createElement('h2');
    header.className = 'pause-header';
    header.textContent = 'MISSION PAUSED';
    content.appendChild(header);

    // Subtitle
    const subtitle = document.createElement('p');
    subtitle.className = 'pause-subtitle';
    subtitle.textContent = 'SYSTEMS SUSPENDED';
    content.appendChild(subtitle);

    // Button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'pause-buttons';

    // RESUME button
    const resumeButton = document.createElement('button');
    resumeButton.className = 'menu-button pause-button';
    resumeButton.textContent = 'RESUME';
    resumeButton.addEventListener('click', () => {
      this.hidePause();
      this.onResume();
    });
    buttonContainer.appendChild(resumeButton);

    // RESTART MISSION button
    const restartButton = document.createElement('button');
    restartButton.className = 'menu-button pause-button';
    restartButton.textContent = 'RESTART MISSION';
    restartButton.addEventListener('click', () => {
      this.hidePause();
      this.onRestart();
    });
    buttonContainer.appendChild(restartButton);

    // ABANDON MISSION button
    const abandonButton = document.createElement('button');
    abandonButton.className = 'menu-button pause-button abandon';
    abandonButton.textContent = 'ABANDON MISSION';
    abandonButton.addEventListener('click', () => {
      this.hidePause();
      this.onAbandon();
    });
    buttonContainer.appendChild(abandonButton);

    content.appendChild(buttonContainer);
    overlay.appendChild(content);

    document.body.appendChild(overlay);
    this.pauseOverlayEl = overlay;
  }

  /**
   * Builds the 3D plane selection scene.
   * Creates glowing totems, fighter holograms, selection rings, and lighting.
   */
  private buildPlaneSelectScene(): void {
    this.planeSelectGroup = new THREE.Group();
    this.fighterPreviews = [];
    this.selectionRings = [];
    this.fighterTotems = [];

    // Fighter builders in order: vanguard, phantom, titan
    const builders: (() => THREE.Group)[] = [buildVanguard, buildPhantom, buildTitan];
    const planeTypes: PlaneType[] = ['vanguard', 'phantom', 'titan'];
    const positions = [-4, 0, 4];

    // Add a point light to illuminate the fighters
    this.previewLight = new THREE.PointLight(0xffffff, 1.5, 20);
    this.previewLight.position.set(0, 3, 6);
    this.planeSelectGroup.add(this.previewLight);

    // Add a secondary fill light from below
    const fillLight = new THREE.PointLight(0x00c8ff, 0.5, 15);
    fillLight.position.set(0, -3, 4);
    this.planeSelectGroup.add(fillLight);

    for (let i = 0; i < 3; i++) {
      const x = positions[i];
      const planeType = planeTypes[i];
      const accentColor = PLANE_DATA[planeType].accentColor;

      // --- Glowing Totem (replaces the pedestal) ---
      // A large circular glowing emblem that slowly spins, always facing
      // the camera. Colored to match each fighter's accent color.
      // A billboarding pivot orients it toward the camera; the inner totem
      // group handles the in-plane spin so they never fight each other.
      const totem = new THREE.Group();
      const totemColor = new THREE.Color(accentColor);

      // Ring materials — bright core + soft additive glow
      const totemRingMaterial = new THREE.MeshBasicMaterial({
        color: totemColor,
        transparent: true,
        opacity: 0.9,
      });
      const totemGlowMaterial = new THREE.MeshBasicMaterial({
        color: totemColor,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      // Outer glow ring
      const outerRing = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.07, 8, 48), totemGlowMaterial);
      totem.add(outerRing);

      // Mid ring
      const midRing = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.05, 8, 40), totemRingMaterial);
      totem.add(midRing);

      // Inner ring
      const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 8, 32), totemGlowMaterial);
      totem.add(innerRing);

      // Radiating spokes
      const spokeGeometry = new THREE.BoxGeometry(0.9, 0.05, 0.02);
      const spokeMaterial = new THREE.MeshBasicMaterial({
        color: totemColor,
        transparent: true,
        opacity: 0.7,
      });
      for (let s = 0; s < 8; s++) {
        const spoke = new THREE.Mesh(spokeGeometry, spokeMaterial);
        spoke.rotation.z = (s / 8) * Math.PI * 2;
        spoke.position.set(0, 0.8, 0.02);
        totem.add(spoke);
      }

      // Center hub — glowing disc
      const hubMaterial = new THREE.MeshBasicMaterial({
        color: totemColor,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const hub = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), hubMaterial);
      hub.position.z = 0.03;
      totem.add(hub);

      // Billboarding pivot oriented to face the camera
      const totemPivot = new THREE.Group();
      totemPivot.position.set(x, 0.6, -0.5);
      totemPivot.lookAt(this.camera.position);
      totemPivot.add(totem);
      this.planeSelectGroup.add(totemPivot);
      this.fighterTotems.push(totem);

      // --- Fighter Preview ---
      const fighter = builders[i]();
      fighter.position.set(x, 0.6, 0);
      // TITAN's raw geometry is the largest, so it gets a smaller preview scale
      const previewScale = planeType === 'titan' ? 0.4 : 1.0;
      fighter.scale.set(previewScale, previewScale, previewScale);
      this.planeSelectGroup.add(fighter);
      this.fighterPreviews.push(fighter);

      // --- Selection Ring ---
      // Bright cyan torus that highlights the selected fighter.
      // Billboarded to face the camera.
      const selectionRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.4, 0.06, 8, 32),
        new THREE.MeshBasicMaterial({
          color: 0x00c8ff,
          transparent: true,
          opacity: 0.7,
        })
      );
      selectionRing.position.set(x, 0.6, 0);
      selectionRing.lookAt(this.camera.position);
      this.planeSelectGroup.add(selectionRing);
      this.selectionRings.push(selectionRing);
    }

    // Apply initial selection highlight
    this.updateSelectionHighlight();

    // Center the independent plane-select node on the camera view axis,
    // hovering much closer to the camera so the fighters appear larger
    this.camera.updateMatrixWorld();
    const viewDir = new THREE.Vector3();
    this.camera.getWorldDirection(viewDir);
    const hoverZ = 0;
    const t = (hoverZ - this.camera.position.z) / viewDir.z;
    const center = this.camera.position.clone().addScaledVector(viewDir, t);
    this.planeSelectGroup.position.copy(center);

    // Add the group to the scene
    this.scene.add(this.planeSelectGroup);
  }

  /**
   * Clears all plane selection 3D objects from the scene.
   * Removes the group and all its children.
   */
  private clearPlaneSelectScene(): void {
    if (this.planeSelectGroup) {
      this.scene.remove(this.planeSelectGroup);

      // Dispose geometries and materials to prevent memory leaks
      this.planeSelectGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) {
            child.geometry.dispose();
          }
          if (child.material) {
            const materials = Array.isArray(child.material)
              ? child.material
              : [child.material];
            for (const material of materials) {
              material.dispose();
            }
          }
        }
      });

      this.planeSelectGroup = null;
    }

    this.fighterPreviews = [];
    this.selectionRings = [];
    this.fighterTotems = [];
    this.previewLight = null;
  }

  /** Ground level on which the city sits */
  private static readonly CITY_GROUND_Y = -8;

  /**
   * Builds the holographic 3D city backdrop.
   * Composed of a glowing horizontal ground grid and box buildings rising
   * from the ground, densely distributed across a large square area.
   * Uses a neutral steel-blue palette — no neon colors.
   * The three fighter slots (x = -4, 0, 4) keep a clear central corridor.
   */
  private buildCity(): void {
    if (this.cityGroup) return;

    const group = new THREE.Group();
    const groundY = UIManager.CITY_GROUND_Y;

    // --- Ground grid (horizontal square, seen fully from the top-down view) ---
    const grid = new THREE.GridHelper(100, 40, 0x243448, 0x161f2a);
    (grid.material as THREE.LineBasicMaterial).transparent = true;
    (grid.material as THREE.LineBasicMaterial).opacity = 0.35;
    grid.position.set(0, groundY, 0);
    group.add(grid);

    // --- Building material palette (neutral steel-blue, no neon) ---
    const buildingMaterials: THREE.MeshStandardMaterial[] = [
      new THREE.MeshStandardMaterial({ color: 0x1a2532, metalness: 0.7, roughness: 0.55 }),
      new THREE.MeshStandardMaterial({ color: 0x22303f, metalness: 0.7, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: 0x141d28, metalness: 0.75, roughness: 0.6 }),
    ];

    // --- Square city layout ---
    // Buildings are distributed across a square footprint spanning
    // [-extent, extent] in both X and Z, using a uniform cell grid.
    const extent = 42;
    const cellsPerSide = 21;
    const cellSize = (2 * extent) / cellsPerSide;

    // Clear corridor so the fighter previews (x = -4, 0, 4) are never blocked
    const clearZoneHalf = 7;

    for (let cx = 0; cx < cellsPerSide; cx++) {
      for (let cz = 0; cz < cellsPerSide; cz++) {
        const x = -extent + cellSize * (cx + 0.5);
        const z = -extent + cellSize * (cz + 0.5);

        // Skip the central corridor where the fighters sit
        if (Math.abs(x) < clearZoneHalf) continue;

        // Place a building in roughly half of the cells for density variety
        if (Math.random() < 0.5) continue;

        const w = cellSize * (0.35 + Math.random() * 0.5);
        const d = cellSize * (0.35 + Math.random() * 0.5);
        const h = 3 + Math.pow(Math.random(), 1.4) * 16;

        const mat = buildingMaterials[Math.floor(Math.random() * buildingMaterials.length)];
        const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        building.position.set(x + (Math.random() - 0.5) * 0.5, groundY + h / 2, z);
        group.add(building);
      }
    }

    this.cityGroup = group;
    this.scene.add(group);
  }

  /**
   * Removes the holographic city backdrop from the scene.
   * Disposes all geometries and materials to prevent memory leaks.
   */
  private clearCity(): void {
    if (!this.cityGroup) return;

    this.scene.remove(this.cityGroup);
    this.cityGroup.traverse((child) => {
      const anyChild = child as THREE.Mesh;
      if (anyChild.geometry) {
        anyChild.geometry.dispose();
      }
      if (anyChild.material) {
        const materials = Array.isArray(anyChild.material)
          ? anyChild.material
          : [anyChild.material];
        for (const material of materials) {
          material.dispose();
        }
      }
    });

    this.cityGroup = null;
  }

  /**
   * Updates the selection highlight based on the current selected index.
   * Selected fighter is enlarged and has a bright cyan ring.
   * Non-selected fighters have normal scale and dimmer rings.
   */
  private updateSelectionHighlight(): void {
    for (let i = 0; i < this.fighterPreviews.length; i++) {
      const fighter = this.fighterPreviews[i];
      const ring = this.selectionRings[i];

      // Base preview scale per plane (TITAN's raw geometry is the largest)
      const baseScale = i === 2 ? 0.4 : 1.0;

      if (i === this.selectedIndex) {
        // Selected: enlarged scale, bright ring
        fighter.scale.set(baseScale * 1.3, baseScale * 1.3, baseScale * 1.3);
        (ring.material as THREE.MeshBasicMaterial).color.set(0x00c8ff);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.9;
        ring.scale.set(1, 1, 1);
      } else {
        // Non-selected: normal scale, dimmer ring
        fighter.scale.set(baseScale, baseScale, baseScale);
        (ring.material as THREE.MeshBasicMaterial).color.set(0x2a4a5a);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.3;
        ring.scale.set(0.8, 0.8, 0.8);
      }
    }
  }

  /**
   * Updates the plane name and description labels based on the selected index.
   */
  private updatePlaneInfo(): void {
    const planeTypes: PlaneType[] = ['vanguard', 'phantom', 'titan'];
    const planeType = planeTypes[this.selectedIndex];
    const data = PLANE_DATA[planeType];

    if (this.planeNameEl) {
      this.planeNameEl.textContent = data.name;
    }
    if (this.planeDescEl) {
      this.planeDescEl.textContent = data.description;
    }
  }

  /**
   * Deploys the currently selected fighter.
   * Calls the onDeploy callback and transitions to gameplay.
   */
  private deploy(): void {
    const planeTypes: PlaneType[] = ['vanguard', 'phantom', 'titan'];
    const selectedPlane = planeTypes[this.selectedIndex];

    // Store the selected plane in the global config
    GameConfig.selectedPlane = selectedPlane;

    // Clear the plane selection scene
    this.clearPlaneSelectScene();

    // Clear the city backdrop
    this.clearCity();

    // Hide all overlays
    this.hideAll();

    // Set screen to gameplay
    this.screen = 'gameplay';

    // Restore the gameplay camera and fog
    this.camera.position.set(0, 0, 14);
    this.camera.lookAt(0, 0, 0);
    if (this.scene.fog === null && this.originalFog) {
      this.scene.fog = this.originalFog;
    }

    // Call the deploy callback
    this.onDeploy(selectedPlane);
  }

  /**
   * Animates the total score from 0 to the target value over ~1.5 seconds.
   * Uses requestAnimationFrame with easing for a smooth count-up effect.
   * Cancels any previous animation before starting a new one.
   *
   * @param targetScore - The final score value to animate to
   */
  private animateScoreCountUp(targetScore: number): void {
    // Cancel any previous animation
    if (this.countUpAnimationId !== null) {
      cancelAnimationFrame(this.countUpAnimationId);
      this.countUpAnimationId = null;
    }

    const duration = 1500; // 1.5 seconds
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Ease out cubic for a satisfying deceleration
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      // Calculate the current displayed value
      const currentValue = Math.round(targetScore * easedProgress);

      // Update the display
      if (this.levelClearTotalEl) {
        this.levelClearTotalEl.textContent = currentValue.toLocaleString();
      }

      // Continue or finish the animation
      if (progress < 1) {
        this.countUpAnimationId = requestAnimationFrame(animate);
      } else {
        // Ensure the final value is exactly the target
        if (this.levelClearTotalEl) {
          this.levelClearTotalEl.textContent = targetScore.toLocaleString();
        }
        this.countUpAnimationId = null;
      }
    };

    this.countUpAnimationId = requestAnimationFrame(animate);
  }

  /**
   * Handles keyboard input for the plane selection screen.
   * A/Left = previous fighter, D/Right = next fighter, Enter/Space = deploy.
   *
   * @param event - The keyboard event
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    if (this.screen !== 'planeSelect') return;

    switch (event.code) {
      case 'KeyA':
      case 'ArrowLeft':
        event.preventDefault();
        this.selectedIndex = (this.selectedIndex + 2) % 3; // Wrap backwards
        this.updateSelectionHighlight();
        this.updatePlaneInfo();
        break;

      case 'KeyD':
      case 'ArrowRight':
        event.preventDefault();
        this.selectedIndex = (this.selectedIndex + 1) % 3; // Wrap forwards
        this.updateSelectionHighlight();
        this.updatePlaneInfo();
        break;

      case 'Enter':
      case 'Space':
        event.preventDefault();
        this.deploy();
        break;
    }
  };
}