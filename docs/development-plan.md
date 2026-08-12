# StarForge Strike — Execution Roadmap SSOT

## Phase 1: Walking Skeleton & Core Initialization

- **Functional Feature Scope (User Experience & Visuals):**
  - A dark-themed window launches displaying a 3D-rendered corridor scene with a placeholder player cube at the bottom center.
  - Player moves the cube with A/D/W/S keys within screen bounds.
  - The cube auto-fires simple white bullets upward at a steady rate.
  - Simple enemy cubes spawn from the top and drift downward.
  - Bullets that hit enemies destroy them with a basic flash effect.
  - A top-left HUD displays the current score, incrementing by 100 per enemy destroyed.
  - The game loop runs at a stable frame rate with no console errors.

- **Technical Tasks:**
  - Scaffold the Vite + TypeScript + THREE.js project structure.
  - Create the entry point (`main.ts`) that initializes the renderer, scene, and camera.
  - Implement the main update/render loop with delta-time-based updates.
  - Define initial data interfaces: `Player`, `Enemy`, `Bullet`, `GameState`.
  - Implement basic player movement with clamped bounds.
  - Implement auto-fire spawning simple bullet meshes.
  - Implement basic enemy spawning and downward movement.
  - Implement AABB collision detection between bullets and enemies.
  - Implement a minimal score counter displayed as HTML overlay.

- **Verification Goal:** The project compiles and runs without errors. The player can move, auto-fire, destroy enemy cubes, and see the score increment. The game loop runs continuously without crashes.

## Phase 2: Bullet Pooling System + Player Fighter Visual

- **Functional Feature Scope (User Experience & Visuals):**
  - The placeholder player cube is replaced with the **VANGUARD** fighter: a sleek, angular cosmic fighter with a cyan cockpit canopy, swept wings, and twin engine nacelles, built from THREE.js primitives.
  - The fighter rotates slowly in place on the menu screen and faces upward during gameplay.
  - Bullets are now cyan energy bolts with a glowing core, fired from the fighter's nose.
  - The game maintains 60 FPS even with 100+ bullets on screen, thanks to object pooling.
  - Bullets that go off-screen or hit enemies are recycled back into the pool, not destroyed.

- **Technical Tasks:**
  - Create a `BulletPool` class with `get()` and `release()` methods managing a fixed pool of bullet meshes.
  - Rewire the auto-fire system to use the pool instead of creating new meshes.
  - Create a `buildVanguard()` function that constructs the VANGUARD fighter from THREE.js primitives (boxes, cones, cylinders).
  - Replace the player cube with the VANGUARD mesh.
  - Add a subtle engine glow effect at the fighter's rear.

- **Prior Code Adjustments & Rewiring:**
  - Replace the placeholder cube mesh in `main.ts` with the VANGUARD fighter mesh.
  - Replace direct bullet mesh creation in the auto-fire system with `BulletPool.get()` and `BulletPool.release()` calls.
  - Update the bullet mesh material to the new cyan energy style.

- **Verification Goal:** The player sees the VANGUARD fighter instead of a cube. The game runs at 60 FPS with 100+ bullets on screen. Bullets are visibly recycled (no memory growth over time).

## Phase 3: Main Menu + Plane Selection Screen

- **Functional Feature Scope (User Experience & Visuals):**
  - The game launches into a sci-fi **Main Menu** with the title "STARFORGE STRIKE" in bold angular metallic font with a cyan glow.
  - Two menu options: "START MISSION" and "HOW TO PLAY". Options highlight with a cyan border on hover.
  - Selecting "START MISSION" transitions to the **Plane Selection** screen.
  - The Plane Selection screen displays three rotating fighter holograms: **VANGUARD**, **PHANTOM**, and **TITAN**, each on a pedestal with a name label and brief description.
  - Player cycles selection with A/D or Left/Right arrows. The selected fighter is highlighted with a bright cyan ring and enlarged scale.
  - Pressing Enter/Space or clicking "DEPLOY" starts the game with the selected fighter.
  - The "HOW TO PLAY" screen shows controls (ADSW movement, auto-fire, ESC pause) and returns to the main menu with a "BACK" button.

- **Technical Tasks:**
  - Create a `UIManager` class that manages screen transitions (menu, plane select, gameplay).
  - Implement the main menu HTML overlay with styled buttons.
  - Implement the plane selection screen with three fighter previews rendered in a separate THREE.js scene or as HTML/CSS with canvas previews.
  - Create `buildPhantom()` and `buildTitan()` fighter construction functions.
  - Store the selected plane type in a global `GameConfig` object.
  - Implement the HOW TO PLAY overlay.

- **Prior Code Adjustments & Rewiring:**
  - Modify the game initialization flow: instead of starting gameplay immediately, start at the main menu.
  - Wire the "DEPLOY" button to start the game loop with the selected fighter.
  - Wire the "BACK" button to return to the main menu.
  - Store the selected plane type and pass it to the gameplay initialization.

- **Verification Goal:** The game launches to the main menu. The player can navigate to plane selection, cycle through three fighters, see their distinct visuals, and deploy with the selected fighter. The HOW TO PLAY screen displays correctly.

## Phase 4: POWER Pickup System

- **Functional Feature Scope (User Experience & Visuals):**
  - Cyan hexagonal crystal pickups with a lightning bolt icon drift downward from destroyed enemies and spawn points.
  - Pickups bob gently as they fall and accelerate toward the player when within a magnet radius.
  - Collecting a POWER pickup increases the player's power level by 1 (max 5 levels).
  - Power progression is per-plane:
    - **VANGUARD:** Bullet count increases from 1 to 5 parallel streams.
    - **PHANTOM:** Scatter angle widens from 3 to 9 bullets in a fan.
    - **TITAN:** Bullet width and damage increase (single wide beam grows thicker).
  - When power is at max, collecting a POWER pickup converts it to +500 score with a golden flash and "BONUS +500" floating text.
  - A power level indicator appears in the HUD as 5 segmented bars.

- **Technical Tasks:**
  - Create a `PowerPickup` class with visual mesh, bobbing animation, and magnet behavior.
  - Implement pickup spawning from destroyed enemies (20% drop chance) and level spawn points.
  - Implement the power level system in the player state.
  - Modify the bullet firing system to respect the current power level and plane type.
  - Implement the max-power score conversion with floating text.
  - Add the power level indicator to the HUD.

- **Prior Code Adjustments & Rewiring:**
  - Modify the bullet firing logic in the auto-fire system to check the player's power level and plane type.
  - Add a `powerLevel` property to the player state.
  - Wire the HUD power indicator to the player's power level.
  - Add pickup collection detection to the collision system.

- **Verification Goal:** The player collects POWER pickups and sees their bullet pattern change per plane. At max power, pickups convert to +500 score with visual feedback. The HUD power indicator updates correctly.

## Phase 5: Wingman System

- **Functional Feature Scope (User Experience & Visuals):**
  - Silver drone modules with glowing blue cores drift downward as pickups.
  - Collecting a wingman pickup adds a wingman to the player's squadron.
  - Wingmen follow behind the player in an arc formation, mirroring horizontal movement with a slight delay.
  - Up to 5 wingmen can be active. When full, the oldest wingman despawns with a small effect and the new one joins.
  - Five wingman types with distinct attack behaviors:
    - **PULSER:** Fires rapid small bullets in a straight line parallel to the player.
    - **LANCE:** Fires a continuous thin laser beam that pierces enemies.
    - **SEEKER:** Fires homing missiles that track the nearest enemy.
    - **FLARE:** Fires spread shots in a fan pattern (3 bullets at 30-degree angles).
    - **BARRAGE:** Fires a dense burst of 5 bullets in a narrow cone.
  - Wingman type is randomly selected on pickup.
  - A wingman indicator appears in the HUD showing active wingmen as small icons.

- **Technical Tasks:**
  - Create a `Wingman` base class with follow formation logic and attack behavior.
  - Create 5 wingman subclasses with distinct attack patterns.
  - Create the wingman pickup visual and collection logic.
  - Implement the max-5 rule with oldest-removed behavior.
  - Implement wingman attack firing logic (each wingman fires independently).
  - Add the wingman indicator to the HUD.

- **Prior Code Adjustments & Rewiring:**
  - Modify the collision system to detect wingman pickups.
  - Add a `wingmen` array to the player state.
  - Wire wingman attacks into the bullet pool system.
  - Update the HUD to display wingman icons.

- **Verification Goal:** The player collects wingmen and sees them follow behind in formation. Each wingman type attacks with its unique pattern. When 5 are active, collecting a new one removes the oldest. The HUD shows active wingmen.

## Phase 6: Basic Enemies + Entrance Effects

- **Functional Feature Scope (User Experience & Visuals):**
  - Three basic enemy types appear in the corridor:
    - **DRONE:** Small angular drone, dark gray with red sensor eye. Fires 1 slow bullet straight down. 1 HP.
    - **RAIDER:** Medium fighter with swept wings, dark blue with orange accents. Fires 3-bullet fan spread downward. 2 HP.
    - **SENTRY:** Hovering turret with rotating barrel, gunmetal gray. Fires aimed 2-bullet burst at the player's position. 3 HP.
  - Enemies warp in with a cyan flash and expanding ring effect.
  - Enemies take damage with a white flash and small cyan particle burst on hit.
  - Destroyed enemies explode with orange and yellow particles and a shockwave ring.
  - Enemy bullets are red-orange and visually distinct from player bullets.

- **Technical Tasks:**
  - Create `Drone`, `Raider`, and `Sentry` classes with distinct visuals, health, and attack patterns.
  - Implement the warp-in entrance effect (cyan flash + expanding ring).
  - Implement hit flash and explosion particle effects.
  - Implement enemy bullet firing with distinct visuals.
  - Add enemy spawn logic to the level system.

- **Prior Code Adjustments & Rewiring:**
  - Replace the placeholder enemy cube in Phase 1 with the new enemy classes.
  - Modify the collision system to handle enemy bullets vs player.
  - Add enemy bullet visuals to the bullet pool system.
  - Wire the explosion effects into the enemy destruction handler.

- **Verification Goal:** The player encounters all three basic enemy types with distinct visuals and attack patterns. Enemies warp in with effects, take damage with flashes, and explode on destruction. Enemy bullets are visually distinct and damage the player.

## Phase 7: Level 1 TITAN GATE + Boss IRONCLAD

- **Functional Feature Scope (User Experience & Visuals):**
  - The game now has a proper **Level 1: TITAN GATE** with a cold steel corridor aesthetic, cyan energy conduits along walls, and harsh overhead lighting.
  - The corridor is composed of modular segments that loop infinitely, dynamically generated ahead of the player and recycled behind.
  - Enemy spawn flow for Level 1: DRONEs in waves of 5-8, then RAIDERs mixed in, then SENTRYs as stationary threats.
  - At the level midpoint, a warning banner appears: "WARNING: HEAVY HOSTILE DETECTED" with a red flashing border.
  - The **IRONCLAD** boss descends slowly into position: a massive rectangular dreadnought with layered armor plates and a central cannon.
  - IRONCLAD has 3 attack phases:
    - Phase 1 (100-50% HP): Wide spread shots.
    - Phase 2 (50-25% HP): Adds aimed laser sweeps.
    - Phase 3 (25-0% HP): Fires rotating spiral patterns.
  - Defeating IRONCLAD triggers a massive explosion with multiple shockwave rings and screen shake.

- **Technical Tasks:**
  - Create a `ModularSegment` system that generates corridor segments and recycles them as the player advances.
  - Implement Level 1 enemy spawn flow configuration.
  - Create the `IroncladBoss` class with 3 attack phases based on health thresholds.
  - Implement the boss warning banner UI.
  - Implement the boss explosion sequence.
  - Add a level progression system (level 1 complete → level 2).

- **Prior Code Adjustments & Rewiring:**
  - Replace the simple background with the modular corridor system.
  - Wire the enemy spawn system to use the Level 1 flow configuration.
  - Add boss health tracking to the HUD.
  - Modify the level completion logic to trigger the boss fight.

- **Verification Goal:** The player plays through Level 1 with the modular corridor background, faces the configured enemy flow, and defeats the IRONCLAD boss with its 3 attack phases. The boss warning banner displays correctly.

## Phase 8: Elite Enemies

- **Functional Feature Scope (User Experience & Visuals):**
  - Four elite enemy types appear in Level 1 and later levels:
    - **REAPER:** Large angular fighter with glowing red core. Fires spiral pattern of 6 bullets rotating outward. 8 HP.
    - **WARDEN:** Heavy armored unit with shield plating. Fires 5-bullet spread plus occasional aimed laser. 12 HP.
    - **HARBINGER:** Twin-hulled bomber with missile pods. Launches 3 homing missiles that track the player. 10 HP.
    - **OVERLORD:** Command ship with rotating turret ring. Fires alternating ring bursts and aimed streams. 15 HP.
  - Elite enemies have dramatic warp-in entrances with larger flashes and brief screen shake.
  - Elite enemies drop POWER or wingman pickups more frequently (40% drop chance).
  - Elite enemies explode with larger particle effects and a 0.2s screen shake.

- **Technical Tasks:**
  - Create `Reaper`, `Warden`, `Harbinger`, and `Overlord` classes with distinct visuals, health, and attack patterns.
  - Implement homing missile behavior for HARBINGER.
  - Implement the rotating turret ring for OVERLORD.
  - Add elite enemy spawn configurations to the level system.
  - Enhance the entrance and explosion effects for elite enemies.

- **Prior Code Adjustments & Rewiring:**
  - Modify the enemy spawn system to include elite enemies in the flow.
  - Add homing missile visuals to the bullet pool system.
  - Increase the pickup drop rate for elite enemies.
  - Wire the enhanced explosion effects into the elite enemy destruction handler.

- **Verification Goal:** The player encounters all four elite enemy types with distinct visuals and attack patterns. Elite enemies have dramatic entrances and explosions. They drop pickups more frequently.

## Phase 9: Level 2 VOID REACTOR + Boss VOID REAVER

- **Functional Feature Scope (User Experience & Visuals):**
  - The game now has **Level 2: VOID REACTOR** with an organic-tech hybrid aesthetic: pulsing purple membranes, exposed energy cores, and bioluminescent growths along the walls.
  - The corridor segments change to the new visual style with flickering emergency lights.
  - Enemy spawn flow for Level 2: RAIDERs and SENTRYs in aggressive mixed waves, HARBINGERs as priority targets, REAPERs and WARDENs in coordinated assaults.
  - The **VOID REAVER** boss appears: an organic-mechanical hybrid with tentacle-like appendages and a pulsing void core.
  - VOID REAVER has 3 attack phases:
    - Phase 1 (100-50% HP): Homing missile volleys.
    - Phase 2 (50-25% HP): Adds radial bullet bursts.
    - Phase 3 (25-0% HP): Fires alternating spiral and aimed patterns.
  - The level clear transition shows "MISSION COMPLETE" with a score breakdown.

- **Technical Tasks:**
  - Create the Level 2 corridor segment style (purple membranes, energy cores).
  - Implement Level 2 enemy spawn flow configuration.
  - Create the `VoidReaverBoss` class with 3 attack phases.
  - Implement the level transition from Level 1 to Level 2.
  - Add the level clear settlement screen (basic version).

- **Prior Code Adjustments & Rewiring:**
  - Modify the modular segment system to support multiple visual styles.
  - Wire the level progression to load Level 2 after Level 1.
  - Add the level clear settlement screen to the UI flow.
  - Modify the boss system to support the VOID REAVER.

- **Verification Goal:** The player plays through Level 2 with the organic-tech visual style, faces the configured enemy flow, and defeats the VOID REAVER boss. The level clear settlement screen appears after the boss is defeated.

## Phase 10: Level Clear Settlement + Game Over Screens

- **Functional Feature Scope (User Experience & Visuals):**
  - The **MISSION COMPLETE** screen appears after each boss is defeated:
    - "MISSION COMPLETE" header in cyan.
    - Level name.
    - Score breakdown: enemies destroyed, boss bonus, pickup bonus, time bonus.
    - Total score with a count-up animation.
    - "NEXT MISSION" button (or "MISSION COMPLETE — ALL LEVELS CLEARED" on the final level).
  - The **MISSION FAILED** screen appears when the player's health reaches zero:
    - "MISSION FAILED" header in red.
    - Level name and score achieved.
    - "RETRY MISSION" button — restarts the current level.
    - "RETURN TO BASE" button — returns to the main menu.
  - Both screens have a sci-fi design with particle effects and animated backgrounds.

- **Technical Tasks:**
  - Create the MISSION COMPLETE screen with score breakdown and count-up animation.
  - Create the MISSION FAILED screen with retry and return buttons.
  - Implement the score breakdown calculation (enemies, boss, pickups, time bonus).
  - Wire the level clear and game over events to the respective screens.
  - Implement the retry logic that resets the level state.

- **Prior Code Adjustments & Rewiring:**
  - Modify the level completion handler to show the MISSION COMPLETE screen.
  - Modify the player death handler to show the MISSION FAILED screen.
  - Wire the "NEXT MISSION" button to load the next level.
  - Wire the "RETRY MISSION" button to reset the current level.
  - Wire the "RETURN TO BASE" button to return to the main menu.

- **Verification Goal:** The player sees the MISSION COMPLETE screen with correct score breakdown after defeating a boss. The player sees the MISSION FAILED screen with correct score when health reaches zero. Both screens have working buttons.

## Phase 11: Level 3 SOVEREIGN CORE + Boss SOVEREIGN

- **Functional Feature Scope (User Experience & Visuals):**
  - The game now has **Level 3: SOVEREIGN CORE** with a pristine white and gold command deck aesthetic: holographic displays, massive energy pillars, and clean bright surfaces.
  - The corridor segments change to the new visual style.
  - Enemy spawn flow for Level 3: all enemy types in escalating combinations, OVERLORDs as mini-bosses, and a final gauntlet of mixed elites.
  - The **SOVEREIGN** boss appears: a colossal flagship with a glowing command spire and multiple turret banks.
  - SOVEREIGN has 3 attack phases:
    - Phase 1 (100-50% HP): Multi-directional bullet walls.
    - Phase 2 (50-25% HP): Adds targeted laser barrages.
    - Phase 3 (25-0% HP): Combines all patterns with increased speed.
  - Defeating SOVEREIGN triggers the **Victory Screen** with "ALL MISSIONS COMPLETE" in gold and a total score display.

- **Technical Tasks:**
  - Create the Level 3 corridor segment style (white/gold command deck).
  - Implement Level 3 enemy spawn flow configuration.
  - Create the `SovereignBoss` class with 3 attack phases.
  - Implement the level transition from Level 2 to Level 3.
  - Create the Victory Screen with total score.

- **Prior Code Adjustments & Rewiring:**
  - Modify the modular segment system to support the third visual style.
  - Wire the level progression to load Level 3 after Level 2.
  - Modify the level clear settlement to show the Victory Screen on the final level.
  - Modify the boss system to support the SOVEREIGN.

- **Verification Goal:** The player plays through Level 3 with the white/gold visual style, faces the configured enemy flow, and defeats the SOVEREIGN boss. The Victory Screen appears with the total score.

## Phase 12: Pause Overlay + HUD Polish

- **Functional Feature Scope (User Experience & Visuals):**
  - Pressing ESC or P during gameplay pauses the game and shows the **Pause Overlay**:
    - "RESUME" — returns to gameplay.
    - "RESTART MISSION" — restarts the current level.
    - "ABANDON MISSION" — returns to the main menu.
  - The pause overlay has a dark translucent background with a blurred game view.
  - The HUD is polished with:
    - Health displayed as 3 shield segments.
    - Power level displayed as 5 segmented bars.
    - Wingman indicators as small icons.
    - Score displayed with a count-up animation on change.
    - Boss health bar displayed during boss fights.
  - The HUD has a sci-fi design with angular frames and cyan accents.

- **Technical Tasks:**
  - Implement the pause overlay with RESUME, RESTART, and ABANDON buttons.
  - Implement pause/resume logic that freezes the game loop.
  - Polish the HUD with health, power, wingman, and score indicators.
  - Add the boss health bar to the HUD.
  - Implement the restart mission logic.

- **Prior Code Adjustments & Rewiring:**
  - Modify the game loop to support pause/resume.
  - Wire the ESC/P key handler to toggle the pause overlay.
  - Wire the RESTART MISSION button to reset the current level.
  - Wire the ABANDON MISSION button to return to the main menu.
  - Update the HUD to display all indicators.

- **Verification Goal:** The player can pause the game with ESC/P, see the pause overlay, and resume, restart, or abandon. The HUD displays health, power, wingmen, score, and boss health correctly.

## Phase 13: Advanced Visual Effects

- **Functional Feature Scope (User Experience & Visuals):**
  - **Screen shake:** Triggered by explosions, boss attacks, and player hits. Magnitude scales with event intensity.
  - **Hit stop:** Brief (50-100ms) freeze frame on boss kills and player death for dramatic impact.
  - **Particle explosions:** Enhanced particle systems with more particles, varied colors, and longer durations.
  - **Player entrance scene:** At level start, the player fighter performs a dramatic fly-in from the bottom with a speed trail, pulling up to the starting position and firing a celebratory burst.
  - **Boss warning banner:** "WARNING: HEAVY HOSTILE DETECTED" with a red flashing border and alarm effect.
  - **Parallax background:** Background layers move at different speeds to create depth.
  - **Ambient particles:** Floating dust, energy motes, and sparks drift through the corridor.

- **Technical Tasks:**
  - Implement a screen shake system that offsets the camera.
  - Implement a hit stop system that freezes the game loop briefly.
  - Enhance the particle system with more particles and varied colors.
  - Implement the player entrance scene animation.
  - Implement the boss warning banner with flashing border.
  - Implement parallax background layers.
  - Add ambient particle effects.

- **Prior Code Adjustments & Rewiring:**
  - Modify the camera system to support screen shake.
  - Modify the game loop to support hit stop.
  - Wire the player entrance scene to the level start.
  - Wire the boss warning banner to the boss spawn event.
  - Modify the background system to support parallax layers.
  - Add ambient particles to the level system.

- **Verification Goal:** The player experiences screen shake on explosions, hit stop on boss kills, dramatic player entrance at level start, boss warning banners, parallax backgrounds, and ambient particles throughout the game.

## Phase 14: Final Polish + Balancing

- **Functional Feature Scope (User Experience & Visuals):**
  - The full game flow works flawlessly: Main Menu → Plane Selection → Level 1 → Level Clear → Level 2 → Level Clear → Level 3 → Victory.
  - Difficulty is balanced: enemy spawn rates, bullet speeds, and boss attack patterns are tuned for a fair but challenging experience.
  - Score values are balanced: basic enemy 100pts, elite 500pts, boss 5000pts, POWER at max +500pts, level clear bonus 1000pts per health, time bonus 100pts per 10 seconds under par.
  - Performance is optimized: the game runs at 60 FPS on mid-range hardware with no memory leaks.
  - All edge cases are handled: wingman full, power max, player death during boss, pause during boss entrance, multiple simultaneous explosions.
  - All temporary debug code, console logs, and stub functions are removed.

- **Technical Tasks:**
  - Tune enemy spawn rates, bullet speeds, and boss attack patterns for balance.
  - Verify and adjust score values.
  - Optimize rendering performance (draw calls, material reuse, geometry merging).
  - Fix any remaining edge case bugs.
  - Remove all debug code and temporary stubs.
  - Run a full playthrough to verify the complete game flow.

- **Prior Code Adjustments & Rewiring:**
  - Clean up all temporary debug flags and hardcoded values.
  - Replace any remaining stub functions with final implementations.
  - Optimize the bullet pool and particle systems for performance.
  - Finalize all configuration values.

- **Verification Goal:** The full game is playable from start to finish without bugs. Difficulty is balanced. The game runs at 60 FPS with no memory leaks. All edge cases are handled correctly.