/**
 * HUD (Heads-Up Display) overlay component for the StarForge Strike game.
 *
 * Manages the score display as an HTML overlay. The HUD queries and updates
 * DOM elements that are already present in index.html:
 *   - #score-value  (the score number display)
 *   - #hud-score    (the score panel container, used for flash feedback)
 *
 * The HUD is designed to be extended in Phase 12 with additional indicators
 * (health, power level, wingman icons, boss health bar).
 */
import { WINGMAN_TYPE_DATA } from './Wingman';
export class HUD {
    /**
     * Creates a new HUD instance.
     * Queries the DOM for the required elements and initializes the score to 0.
     */
    constructor() {
        /** Reference to the score value DOM element */
        Object.defineProperty(this, "scoreValueElement", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Reference to the score panel container (for flash animation) */
        Object.defineProperty(this, "hudScoreElement", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Current score value */
        Object.defineProperty(this, "score", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** Handle for the flash timeout, used to cancel overlapping animations */
        Object.defineProperty(this, "flashTimeout", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Reference to the health indicator element */
        Object.defineProperty(this, "healthIndicatorElement", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Target score for the count-up animation */
        Object.defineProperty(this, "scoreDisplayTarget", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** Current displayed score during the count-up animation */
        Object.defineProperty(this, "scoreDisplayCurrent", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** Handle for the score count-up animation frame */
        Object.defineProperty(this, "scoreAnimationId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Reference to the power indicator element */
        Object.defineProperty(this, "powerIndicatorElement", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Reference to the wingman indicator element */
        Object.defineProperty(this, "wingmanIndicatorElement", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Reference to the boss health bar container element */
        Object.defineProperty(this, "bossHealthBarElement", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Reference to the boss health bar fill element (the bar that shrinks) */
        Object.defineProperty(this, "bossHealthFillElement", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        /** Reference to the boss health bar label element (shows boss name + HP %) */
        Object.defineProperty(this, "bossHealthLabelElement", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        // Query DOM elements — these exist in index.html
        this.scoreValueElement = document.getElementById('score-value');
        this.hudScoreElement = document.getElementById('hud-score');
        // Build the power indicator
        this.buildPowerIndicator();
        // Build the wingman indicator
        this.buildWingmanIndicator();
        // Build the health indicator
        this.buildHealthIndicator();
        // Build the boss health bar
        this.buildBossHealthBar();
        // Initialize the display
        this.updateDisplay();
    }
    /**
   * Builds the power indicator DOM element with 5 segmented bars.
   * Appends it to the HUD container.
   */
    buildPowerIndicator() {
        const hudContainer = document.getElementById('hud');
        if (!hudContainer)
            return;
        const indicator = document.createElement('div');
        indicator.id = 'power-indicator';
        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = 'POWER';
        indicator.appendChild(label);
        const segmentsContainer = document.createElement('div');
        segmentsContainer.className = 'power-segments';
        for (let i = 0; i < 5; i++) {
            const segment = document.createElement('div');
            segment.className = 'power-segment empty';
            segmentsContainer.appendChild(segment);
        }
        indicator.appendChild(segmentsContainer);
        hudContainer.appendChild(indicator);
        this.powerIndicatorElement = indicator;
    }
    /**
   * Updates the power indicator display based on the given power level.
   * Fills segments up to the power level, leaves the rest empty.
   *
   * @param level - The current power level (1-5)
   */
    setPowerLevel(level) {
        if (!this.powerIndicatorElement)
            return;
        const segments = this.powerIndicatorElement.querySelectorAll('.power-segment');
        segments.forEach((segment, index) => {
            if (index < level) {
                segment.classList.remove('empty');
                segment.classList.add('filled');
            }
            else {
                segment.classList.remove('filled');
                segment.classList.add('empty');
            }
        });
    }
    /**
     * Builds the wingman indicator DOM element with 5 slots.
     * Each slot represents a wingman position in the squadron.
     * Appends it to the HUD container.
     */
    buildWingmanIndicator() {
        const hudContainer = document.getElementById('hud');
        if (!hudContainer)
            return;
        const indicator = document.createElement('div');
        indicator.id = 'wingman-indicator';
        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = 'WINGMEN';
        indicator.appendChild(label);
        const slotsContainer = document.createElement('div');
        slotsContainer.className = 'wingman-slots';
        for (let i = 0; i < 5; i++) {
            const slot = document.createElement('div');
            slot.className = 'wingman-slot empty';
            slotsContainer.appendChild(slot);
        }
        indicator.appendChild(slotsContainer);
        hudContainer.appendChild(indicator);
        this.wingmanIndicatorElement = indicator;
    }
    /**
   * Builds the health indicator DOM element.
   * Creates a container div with id 'health-indicator' containing a label 'SHIELD'
   * and 3 shield segment divs with class 'shield-segment empty'.
   * Appends it to the #hud container.
   */
    buildHealthIndicator() {
        const hudContainer = document.getElementById('hud');
        if (!hudContainer)
            return;
        const indicator = document.createElement('div');
        indicator.id = 'health-indicator';
        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = 'SHIELD';
        indicator.appendChild(label);
        const segmentsContainer = document.createElement('div');
        segmentsContainer.className = 'shield-segments';
        for (let i = 0; i < 3; i++) {
            const segment = document.createElement('div');
            segment.className = 'shield-segment empty';
            segmentsContainer.appendChild(segment);
        }
        indicator.appendChild(segmentsContainer);
        hudContainer.appendChild(indicator);
        this.healthIndicatorElement = indicator;
    }
    /**
     * Updates the health indicator display based on the given health value.
     * Fills segments up to the health value, leaves the rest empty.
     *
     * @param health - The current health value (0-3)
     */
    setHealth(health) {
        if (!this.healthIndicatorElement)
            return;
        // Clamp health to 0-3
        const clampedHealth = Math.max(0, Math.min(3, Math.floor(health)));
        const segments = this.healthIndicatorElement.querySelectorAll('.shield-segment');
        segments.forEach((segment, index) => {
            if (index < clampedHealth) {
                segment.classList.remove('empty');
                segment.classList.add('filled');
            }
            else {
                segment.classList.remove('filled');
                segment.classList.add('empty');
            }
        });
    }
    /**
     * Builds the boss health bar DOM element.
     * Creates a container div with id 'boss-health-bar' positioned at the top center
     * of the screen. Contains a label (boss name + HP %) and a bar with a fill div.
     * The bar is initially hidden.
     */
    buildBossHealthBar() {
        // Container
        const container = document.createElement('div');
        container.id = 'boss-health-bar';
        container.style.display = 'none';
        // Label (boss name + HP %)
        this.bossHealthLabelElement = document.createElement('span');
        this.bossHealthLabelElement.className = 'boss-health-label';
        this.bossHealthLabelElement.textContent = 'IRONCLAD — 100%';
        container.appendChild(this.bossHealthLabelElement);
        // Bar container
        const barContainer = document.createElement('div');
        barContainer.className = 'boss-health-bar-container';
        // Fill div
        this.bossHealthFillElement = document.createElement('div');
        this.bossHealthFillElement.className = 'boss-health-fill';
        this.bossHealthFillElement.style.width = '100%';
        barContainer.appendChild(this.bossHealthFillElement);
        container.appendChild(barContainer);
        // Append to document body (positioned at top center via CSS)
        document.body.appendChild(container);
        this.bossHealthBarElement = container;
    }
    /**
     * Displays the boss health bar and sets the boss name.
     *
     * @param name - The name of the boss to display
     */
    showBossHealthBar(name) {
        if (!this.bossHealthBarElement)
            return;
        // Set the boss name in the label
        if (this.bossHealthLabelElement) {
            this.bossHealthLabelElement.textContent = `${name} — 100%`;
        }
        // Reset the fill to full
        if (this.bossHealthFillElement) {
            this.bossHealthFillElement.style.width = '100%';
        }
        // Show the bar
        this.bossHealthBarElement.style.display = 'flex';
    }
    /**
     * Hides the boss health bar.
     */
    hideBossHealthBar() {
        if (!this.bossHealthBarElement)
            return;
        this.bossHealthBarElement.style.display = 'none';
    }
    /**
     * Updates the boss health bar fill width and percentage text.
     *
     * @param health - The current health of the boss
     * @param maxHealth - The maximum health of the boss
     */
    updateBossHealth(health, maxHealth) {
        if (!this.bossHealthBarElement || !this.bossHealthFillElement || !this.bossHealthLabelElement)
            return;
        // Guard against division by zero
        if (maxHealth <= 0)
            return;
        // Calculate health percentage (clamped to 0-100)
        const percent = Math.max(0, Math.min(100, (health / maxHealth) * 100));
        // Update the fill width
        this.bossHealthFillElement.style.width = `${percent}%`;
        // Update the label text (preserve the boss name prefix)
        const currentText = this.bossHealthLabelElement.textContent || '';
        const namePart = currentText.split('—')[0].trim();
        this.bossHealthLabelElement.textContent = `${namePart} — ${Math.round(percent)}%`;
    }
    /**
     * Updates the wingman indicator display based on the given wingmen array.
     * Fills slots up to the wingman count, leaves the rest empty.
     * Each filled slot shows the wingman type's accent color.
     *
     * @param wingmen - The array of active wingmen
     */
    setWingmen(wingmen) {
        if (!this.wingmanIndicatorElement)
            return;
        const slots = this.wingmanIndicatorElement.querySelectorAll('.wingman-slot');
        slots.forEach((slot, index) => {
            if (index < wingmen.length) {
                const wingman = wingmen[index];
                const typeData = WINGMAN_TYPE_DATA[wingman.type];
                slot.classList.remove('empty');
                slot.classList.add('filled');
                slot.style.backgroundColor = typeData.color;
                slot.style.boxShadow = `0 0 6px ${typeData.color}`;
                slot.title = typeData.name;
            }
            else {
                slot.classList.remove('filled');
                slot.classList.add('empty');
                slot.style.backgroundColor = '';
                slot.style.boxShadow = '';
                slot.title = '';
            }
        });
    }
    /**
   * Sets the score to the given value and triggers the count-up animation.
   * The score is clamped to a non-negative integer.
   *
   * @param value - The new score value
   */
    setScore(value) {
        // Clamp to non-negative integer
        this.score = Math.max(0, Math.floor(value));
        this.scoreDisplayTarget = this.score;
        this.animateScoreCountUp();
        this.triggerFlash();
    }
    /**
   * Increments the score by the given amount and triggers the count-up animation.
   * The resulting score is clamped to a non-negative integer.
   *
   * @param amount - The amount to add to the current score
   */
    addScore(amount) {
        this.score = Math.max(0, Math.floor(this.score + amount));
        this.scoreDisplayTarget = this.score;
        this.animateScoreCountUp();
        this.triggerFlash();
    }
    /**
     * Animates the score display from the current displayed value to the target
     * over ~300ms with ease-out. Cancels any previous animation first.
     */
    animateScoreCountUp() {
        // Cancel any previous animation
        if (this.scoreAnimationId !== null) {
            cancelAnimationFrame(this.scoreAnimationId);
            this.scoreAnimationId = null;
        }
        const duration = 300; // 300ms
        const startTime = performance.now();
        const startValue = this.scoreDisplayCurrent;
        const targetValue = this.scoreDisplayTarget;
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(1, elapsed / duration);
            // Ease-out cubic for a satisfying deceleration
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            // Calculate the current displayed value
            this.scoreDisplayCurrent = Math.round(startValue + (targetValue - startValue) * easedProgress);
            // Update the display
            this.updateDisplay();
            // Continue or finish the animation
            if (progress < 1) {
                this.scoreAnimationId = requestAnimationFrame(animate);
            }
            else {
                // Ensure the final value is exactly the target
                this.scoreDisplayCurrent = targetValue;
                this.updateDisplay();
                this.scoreAnimationId = null;
            }
        };
        this.scoreAnimationId = requestAnimationFrame(animate);
    }
    /**
     * Returns the current score value.
     *
     * @returns {number} The current score
     */
    getScore() {
        return this.score;
    }
    /**
     * Resets the score to 0 and updates the display.
     */
    reset() {
        this.score = 0;
        this.scoreDisplayTarget = 0;
        this.scoreDisplayCurrent = 0;
        // Cancel any pending score animation
        if (this.scoreAnimationId !== null) {
            cancelAnimationFrame(this.scoreAnimationId);
            this.scoreAnimationId = null;
        }
        this.updateDisplay();
        this.setPowerLevel(1);
        this.setHealth(3);
        // Reset wingman indicator
        this.setWingmen([]);
        // Hide the boss health bar
        this.hideBossHealthBar();
    }
    /**
     * Updates the DOM text content with the formatted score value.
     * The score is padded to 6 digits (e.g., '000000') for a military HUD feel.
     */
    updateDisplay() {
        if (this.scoreValueElement) {
            // Pad to 6 digits with leading zeros
            const formatted = String(this.score).padStart(6, '0');
            this.scoreValueElement.textContent = formatted;
        }
    }
    /**
     * Triggers a brief visual flash on the score panel.
     * Adds the 'score-flash' CSS class, then removes it after ~150ms.
     * If a previous flash is still active, it is cancelled and restarted.
     */
    triggerFlash() {
        if (!this.hudScoreElement)
            return;
        // Cancel any pending flash removal
        if (this.flashTimeout !== null) {
            window.clearTimeout(this.flashTimeout);
            this.flashTimeout = null;
        }
        // Add the flash class
        this.hudScoreElement.classList.add('score-flash');
        // Remove the flash class after 150ms
        this.flashTimeout = window.setTimeout(() => {
            this.hudScoreElement?.classList.remove('score-flash');
            this.flashTimeout = null;
        }, 150);
    }
}
