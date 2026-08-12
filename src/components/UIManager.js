import * as THREE from 'three';
import { GameConfig, PLANE_DATA } from './GameConfig';
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
    constructor(scene, camera, onDeploy, onNextMission, onRetry, onReturnToBase, onResume, onRestart, onAbandon) {
        /** The THREE.js scene for adding plane selection objects */
        Object.defineProperty(this, "scene", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** The perspective camera (used for lighting setup) */
        Object.defineProperty(this, "camera", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Callback invoked when the player deploys a fighter */
        Object.defineProperty(this, "onDeploy", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Callback invoked when the player clicks NEXT MISSION on the level clear screen */
        Object.defineProperty(this, "onNextMission", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Callback invoked when the player clicks RETRY MISSION on the mission failed screen */
        Object.defineProperty(this, "onRetry", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Callback invoked when the player clicks RETURN TO BASE on the mission failed screen */
        Object.defineProperty(this, "onReturnToBase", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Callback invoked when the player clicks RESUME on the pause overlay */
        Object.defineProperty(this, "onResume", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Callback invoked when the player clicks RESTART MISSION on the pause overlay */
        Object.defineProperty(this, "onRestart", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Callback invoked when the player clicks ABANDON MISSION on the pause overlay */
        Object.defineProperty(this, "onAbandon", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Current screen state */
        Object.defineProperty(this, "screen", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'menu'
        });
        /** Main menu overlay element */
        Object.defineProperty(this, "mainMenuEl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Plane selection overlay element */
        Object.defineProperty(this, "planeSelectEl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** How-to-play overlay element */
        Object.defineProperty(this, "howToPlayEl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Level clear overlay element */
        Object.defineProperty(this, "levelClearEl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Mission failed overlay element */
        Object.defineProperty(this, "missionFailedEl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Victory overlay element */
        Object.defineProperty(this, "victoryEl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Victory total score element */
        Object.defineProperty(this, "victoryTotalScoreEl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Pause overlay element */
        Object.defineProperty(this, "pauseOverlayEl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Group containing all plane selection 3D objects */
        Object.defineProperty(this, "planeSelectGroup", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Array of fighter preview groups (index 0 = vanguard, 1 = phantom, 2 = titan) */
        Object.defineProperty(this, "fighterPreviews", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Array of selection rings (torus meshes) for each fighter */
        Object.defineProperty(this, "selectionRings", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Array of pedestal accent rings */
        Object.defineProperty(this, "accentRings", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Currently selected fighter index (0, 1, 2) */
        Object.defineProperty(this, "selectedIndex", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** Plane name label element */
        Object.defineProperty(this, "planeNameEl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Plane description element */
        Object.defineProperty(this, "planeDescEl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Level clear score breakdown value elements */
        Object.defineProperty(this, "levelClearEnemiesEl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "levelClearElitesEl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "levelClearBossEl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "levelClearPickupsEl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "levelClearTimeEl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "levelClearHealthEl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "levelClearTotalEl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Mission failed score display elements */
        Object.defineProperty(this, "missionFailedLevelNameEl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "missionFailedScoreEl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Target score for the count-up animation */
        Object.defineProperty(this, "levelClearTotalScore", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** Handle for the count-up animation frame */
        Object.defineProperty(this, "countUpAnimationId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Point light for illuminating fighter previews */
        Object.defineProperty(this, "previewLight", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Total elapsed time for pulse animations */
        Object.defineProperty(this, "elapsedTime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** Whether the UIManager has been disposed */
        Object.defineProperty(this, "isDisposed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        /**
         * Handles keyboard input for the plane selection screen.
         * A/Left = previous fighter, D/Right = next fighter, Enter/Space = deploy.
         *
         * @param event - The keyboard event
         */
        Object.defineProperty(this, "handleKeyDown", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (event) => {
                if (this.screen !== 'planeSelect')
                    return;
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
            }
        });
        this.scene = scene;
        this.camera = camera;
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
    showMenu() {
        this.screen = 'menu';
        this.hideAll();
        this.clearPlaneSelectScene();
        if (this.mainMenuEl) {
            this.mainMenuEl.style.display = 'flex';
        }
    }
    /**
     * Shows the plane selection screen.
     * Hides all other overlays, builds the pedestals and fighter holograms,
     * and resets the selection to the first fighter.
     */
    showPlaneSelect() {
        this.screen = 'planeSelect';
        this.hideAll();
        this.clearPlaneSelectScene();
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
    showHowToPlay() {
        this.screen = 'howToPlay';
        this.hideAll();
        this.clearPlaneSelectScene();
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
    showLevelClear(levelName, scoreBreakdown) {
        this.screen = 'levelClear';
        this.hideAll();
        this.clearPlaneSelectScene();
        if (!this.levelClearEl)
            return;
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
    hideLevelClear() {
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
    showMissionFailed(levelName, score) {
        this.screen = 'missionFailed';
        this.hideAll();
        this.clearPlaneSelectScene();
        if (!this.missionFailedEl)
            return;
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
    hideMissionFailed() {
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
    showVictory(totalScore) {
        this.screen = 'victory';
        this.hideAll();
        this.clearPlaneSelectScene();
        if (!this.victoryEl)
            return;
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
    hideVictory() {
        if (this.victoryEl) {
            this.victoryEl.style.display = 'none';
        }
    }
    /**
     * Shows the pause overlay.
     * Hides all other overlays and displays the MISSION PAUSED screen.
     */
    showPause() {
        this.screen = 'paused';
        this.hideAll();
        this.clearPlaneSelectScene();
        if (this.pauseOverlayEl) {
            this.pauseOverlayEl.style.display = 'flex';
        }
    }
    /**
     * Hides the pause overlay and returns to gameplay.
     */
    hidePause() {
        if (this.pauseOverlayEl) {
            this.pauseOverlayEl.style.display = 'none';
        }
        this.screen = 'gameplay';
    }
    /**
     * Hides all overlays.
     * Used when transitioning to gameplay.
     */
    hideAll() {
        if (this.mainMenuEl)
            this.mainMenuEl.style.display = 'none';
        if (this.planeSelectEl)
            this.planeSelectEl.style.display = 'none';
        if (this.howToPlayEl)
            this.howToPlayEl.style.display = 'none';
        if (this.levelClearEl)
            this.levelClearEl.style.display = 'none';
        if (this.missionFailedEl)
            this.missionFailedEl.style.display = 'none';
        if (this.victoryEl)
            this.victoryEl.style.display = 'none';
        if (this.pauseOverlayEl)
            this.pauseOverlayEl.style.display = 'none';
    }
    /**
     * Updates the plane selection animations.
     * Rotates fighter previews and pulses the selection ring.
     * Should be called once per frame from the render loop.
     *
     * @param delta - Time elapsed since last frame in seconds
     */
    update(delta) {
        if (this.screen !== 'planeSelect')
            return;
        this.elapsedTime += delta;
        // Rotate each fighter preview
        for (const fighter of this.fighterPreviews) {
            fighter.rotation.z += delta * 0.5;
        }
        // Pulse the selection ring on the selected fighter
        if (this.selectionRings[this.selectedIndex]) {
            const ring = this.selectionRings[this.selectedIndex];
            const pulse = Math.sin(this.elapsedTime * 4);
            const scale = 1 + pulse * 0.15;
            ring.scale.set(scale, scale, scale);
            // Pulse opacity
            const material = ring.material;
            material.opacity = 0.7 + pulse * 0.3;
        }
        // Animate engine glow pulses on all fighters
        for (const fighter of this.fighterPreviews) {
            const userData = fighter.userData;
            if (!userData)
                continue;
            const pulse = Math.sin(this.elapsedTime * 6);
            const scale = 1 + pulse * 0.3;
            const opacity = 0.7 + pulse * 0.3;
            // Handle twin glow (vanguard, titan)
            if (userData.leftGlow && userData.rightGlow) {
                userData.leftGlow.scale.set(scale, scale, scale);
                userData.rightGlow.scale.set(scale, scale, scale);
                userData.leftGlow.material.opacity = opacity;
                userData.rightGlow.material.opacity = opacity;
            }
            // Handle single glow (phantom)
            if (userData.singleGlow) {
                userData.singleGlow.scale.set(scale, scale, scale);
                userData.singleGlow.material.opacity = opacity;
            }
        }
    }
    /**
     * Disposes the UIManager.
     * Removes all DOM elements, event listeners, and scene objects.
     */
    dispose() {
        if (this.isDisposed)
            return;
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
    buildMainMenu() {
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
    buildPlaneSelect() {
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
    buildHowToPlay() {
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
    buildLevelClear() {
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
        const createScoreRow = (label, valueEl) => {
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
    buildMissionFailed() {
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
    buildVictory() {
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
    buildPauseOverlay() {
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
     * Creates pedestals, fighter holograms, selection rings, and lighting.
     */
    buildPlaneSelectScene() {
        this.planeSelectGroup = new THREE.Group();
        this.fighterPreviews = [];
        this.selectionRings = [];
        this.accentRings = [];
        // Fighter builders in order: vanguard, phantom, titan
        const builders = [buildVanguard, buildPhantom, buildTitan];
        const planeTypes = ['vanguard', 'phantom', 'titan'];
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
            // --- Pedestal ---
            const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 1.2, 16), new THREE.MeshStandardMaterial({
                color: 0x1a2230,
                metalness: 0.7,
                roughness: 0.4,
            }));
            pedestal.position.set(x, -0.6, 0);
            this.planeSelectGroup.add(pedestal);
            // --- Pedestal Accent Ring ---
            // Small emissive ring at the top of the pedestal matching the fighter's accent color
            const accentRing = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.04, 8, 24), new THREE.MeshBasicMaterial({
                color: new THREE.Color(accentColor),
                transparent: true,
                opacity: 0.8,
            }));
            accentRing.position.set(x, 0, 0);
            accentRing.rotation.x = Math.PI / 2;
            this.planeSelectGroup.add(accentRing);
            this.accentRings.push(accentRing);
            // --- Fighter Preview ---
            const fighter = builders[i]();
            fighter.position.set(x, 0.6, 0);
            fighter.scale.set(1, 1, 1);
            this.planeSelectGroup.add(fighter);
            this.fighterPreviews.push(fighter);
            // --- Selection Ring ---
            // Bright cyan torus that highlights the selected fighter
            const selectionRing = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.06, 8, 32), new THREE.MeshBasicMaterial({
                color: 0x00c8ff,
                transparent: true,
                opacity: 0.7,
            }));
            selectionRing.position.set(x, 0.6, 0);
            selectionRing.rotation.x = Math.PI / 2;
            this.planeSelectGroup.add(selectionRing);
            this.selectionRings.push(selectionRing);
        }
        // Apply initial selection highlight
        this.updateSelectionHighlight();
        // Add the group to the scene
        this.scene.add(this.planeSelectGroup);
    }
    /**
     * Clears all plane selection 3D objects from the scene.
     * Removes the group and all its children.
     */
    clearPlaneSelectScene() {
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
        this.accentRings = [];
        this.previewLight = null;
    }
    /**
     * Updates the selection highlight based on the current selected index.
     * Selected fighter is enlarged and has a bright cyan ring.
     * Non-selected fighters have normal scale and dimmer rings.
     */
    updateSelectionHighlight() {
        for (let i = 0; i < this.fighterPreviews.length; i++) {
            const fighter = this.fighterPreviews[i];
            const ring = this.selectionRings[i];
            if (i === this.selectedIndex) {
                // Selected: enlarged scale, bright ring
                fighter.scale.set(1.3, 1.3, 1.3);
                ring.material.color.set(0x00c8ff);
                ring.material.opacity = 0.9;
                ring.scale.set(1, 1, 1);
            }
            else {
                // Non-selected: normal scale, dimmer ring
                fighter.scale.set(1, 1, 1);
                ring.material.color.set(0x2a4a5a);
                ring.material.opacity = 0.3;
                ring.scale.set(0.8, 0.8, 0.8);
            }
        }
    }
    /**
     * Updates the plane name and description labels based on the selected index.
     */
    updatePlaneInfo() {
        const planeTypes = ['vanguard', 'phantom', 'titan'];
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
    deploy() {
        const planeTypes = ['vanguard', 'phantom', 'titan'];
        const selectedPlane = planeTypes[this.selectedIndex];
        // Store the selected plane in the global config
        GameConfig.selectedPlane = selectedPlane;
        // Clear the plane selection scene
        this.clearPlaneSelectScene();
        // Hide all overlays
        this.hideAll();
        // Set screen to gameplay
        this.screen = 'gameplay';
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
    animateScoreCountUp(targetScore) {
        // Cancel any previous animation
        if (this.countUpAnimationId !== null) {
            cancelAnimationFrame(this.countUpAnimationId);
            this.countUpAnimationId = null;
        }
        const duration = 1500; // 1.5 seconds
        const startTime = performance.now();
        const animate = (currentTime) => {
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
            }
            else {
                // Ensure the final value is exactly the target
                if (this.levelClearTotalEl) {
                    this.levelClearTotalEl.textContent = targetScore.toLocaleString();
                }
                this.countUpAnimationId = null;
            }
        };
        this.countUpAnimationId = requestAnimationFrame(animate);
    }
}
