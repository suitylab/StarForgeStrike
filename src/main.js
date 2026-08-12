import * as THREE from 'three';
import { Game } from './components/Game';
import { HUD } from './components/HUD';
import { UIManager } from './components/UIManager';
import './style.css';
/**
 * StarForge Strike — Application Entry Point
 *
 * Bootstraps the entire game: initializes the THREE.js renderer, scene,
 * camera, HUD overlay, and the main Game orchestrator, then starts the
 * render loop. This is the single entry point for the application.
 */
// --- Canvas Element ---
// The canvas must exist in the DOM before the renderer can be created.
const canvas = document.getElementById('game-canvas');
if (!canvas) {
    throw new Error('StarForge Strike: Canvas element #game-canvas not found in the DOM.');
}
// --- Renderer ---
// Create the WebGL renderer with antialiasing for smooth edges.
const renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas,
});
// Match the renderer resolution to the device pixel ratio for crisp rendering.
renderer.setPixelRatio(window.devicePixelRatio);
// Set the renderer size to fill the entire window.
renderer.setSize(window.innerWidth, window.innerHeight);
// Dark cold gray-blue background — the base color of the military corridor.
renderer.setClearColor(0x0a0e14);
// --- Scene ---
// Create the main scene that will contain all game objects.
const scene = new THREE.Scene();
// Add subtle fog to give depth to the corridor.
// Fog color matches the background for a seamless blend.
scene.fog = new THREE.Fog(0x0a0e14, 15, 40);
// --- Camera ---
// Perspective camera for a 3D view of the 2D gameplay plane.
const camera = new THREE.PerspectiveCamera(60, // Field of view
window.innerWidth / window.innerHeight, // Aspect ratio
0.1, // Near clipping plane
100 // Far clipping plane
);
// Position the camera to view the X-Y play field head-on.
// The play field is X: -8 to 8, Y: -6 to 10.
camera.position.set(0, 0, 14);
camera.lookAt(0, 0, 0);
// --- Lighting ---
// Ambient light provides base illumination for all objects.
// Increased intensity and brightened to a cool blue tint for the steel corridor.
const ambientLight = new THREE.AmbientLight(0x506080, 1.2);
scene.add(ambientLight);
// Hemisphere light for natural-looking base illumination from all directions.
// Sky color is cool blue, ground color is dark steel.
const hemisphereLight = new THREE.HemisphereLight(0x88aacc, 0x1a2230, 0.8);
scene.add(hemisphereLight);
// Overhead directional light — HARSH OVERHEAD LIGHTING.
// Strong light from directly above to create the harsh overhead lighting effect
// described in the design doc for the TITAN GATE corridor.
const overheadLight = new THREE.DirectionalLight(0xffffff, 1.8);
overheadLight.position.set(0, 10, 0);
scene.add(overheadLight);
// Front directional light for shading and depth on front faces.
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(0, 3, 10);
scene.add(directionalLight);
// Side directional lights to illuminate the corridor walls.
// Left side — cool blue tint.
const leftSideLight = new THREE.DirectionalLight(0x88aacc, 0.8);
leftSideLight.position.set(-10, 0, 5);
scene.add(leftSideLight);
// Right side — cool blue tint.
const rightSideLight = new THREE.DirectionalLight(0x88aacc, 0.8);
rightSideLight.position.set(10, 0, 5);
scene.add(rightSideLight);
// Point lights for corridor interior illumination.
// Main point light — bright white to illuminate the central play area.
const mainPointLight = new THREE.PointLight(0xffffff, 1.0, 20);
mainPointLight.position.set(0, 0, 8);
scene.add(mainPointLight);
// Cyan accent point light — matches the corridor's cyan energy conduits.
const cyanPointLight = new THREE.PointLight(0x00c8ff, 0.6, 15);
cyanPointLight.position.set(0, 0, 4);
scene.add(cyanPointLight);
// Lower point light — cool blue tint for the lower corridor area.
const lowerPointLight = new THREE.PointLight(0x88aacc, 0.5, 15);
lowerPointLight.position.set(0, -4, 6);
scene.add(lowerPointLight);
// Secondary fill light from below with a cool cyan tint.
const fillLight = new THREE.PointLight(0x00c8ff, 0.6, 20);
fillLight.position.set(0, -4, 6);
scene.add(fillLight);
// --- HUD ---
// Create the HUD overlay for score display (DOM-based).
const hud = new HUD();
// --- Game ---
// The game is created lazily when the player deploys from the menu.
// It starts as null and is instantiated in the UIManager's onDeploy callback.
let game = null;
// --- UIManager ---
// Create the UI manager that handles the main menu, plane selection,
// and how-to-play screens. The onDeploy callback creates and starts
// the game with the selected plane type.
const uiManager = new UIManager(scene, camera, (planeType) => {
    // Create the game with the selected plane type
    // The onLevelClear callback shows the level clear settlement screen
    // when a boss is defeated.
    // The onVictory callback shows the victory screen when all levels are complete.
    game = new Game(scene, camera, hud, planeType, (level, breakdown) => {
        // Determine the level name based on the level number
        const levelName = level === 1 ? 'TITAN GATE' : level === 2 ? 'VOID REACTOR' : 'SOVEREIGN CORE';
        // Build the score breakdown for the settlement screen
        const scoreBreakdown = {
            enemies: breakdown.enemies,
            elites: breakdown.elites,
            boss: breakdown.boss,
            pickups: breakdown.pickups,
            time: breakdown.time,
            health: breakdown.health,
            total: breakdown.total,
        };
        // Show the level clear settlement screen
        uiManager.showLevelClear(levelName, scoreBreakdown);
    }, (level, score) => {
        // Game over callback — show the MISSION FAILED screen
        // Determine the level name based on the level number
        const levelName = level === 1 ? 'TITAN GATE' : level === 2 ? 'VOID REACTOR' : 'SOVEREIGN CORE';
        // Show the mission failed screen
        uiManager.showMissionFailed(levelName, score);
    }, (totalScore) => {
        // Victory callback — show the victory screen with the total score
        uiManager.showVictory(totalScore);
    });
    game.start();
    // Hide the loading message now that gameplay has started
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
        loadingMessage.style.display = 'none';
    }
}, () => {
    // NEXT MISSION button callback — transitions to the next level
    if (game) {
        game.transitionToNextLevel();
    }
}, () => {
    // RETRY MISSION button callback — restarts the current level
    if (game) {
        game.retryLevel();
    }
}, () => {
    // RETURN TO BASE button callback — returns to the main menu
    if (game) {
        game.returnToBase();
    }
    uiManager.showMenu();
}, () => {
    // RESUME button callback — resumes the game from pause
    if (game) {
        game.resume();
    }
}, () => {
    // RESTART MISSION button callback — restarts the current level
    if (game) {
        game.retryLevel();
    }
}, () => {
    // ABANDON MISSION button callback — returns to the main menu
    if (game) {
        game.returnToBase();
    }
    uiManager.showMenu();
});
// --- Loading Message ---
// Remove the loading message now that the menu has booted successfully.
const loadingMessage = document.getElementById('loading-message');
if (loadingMessage) {
    loadingMessage.style.display = 'none';
}
// --- Render Loop ---
// Use THREE's built-in animation loop for efficient frame management.
// A clock tracks delta time for UI animations and game updates.
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    // Update UI animations (plane selection rotation, glow pulses)
    uiManager.update(delta);
    // Update game state if gameplay has started
    if (game) {
        game.update();
    }
    // Render the current frame.
    renderer.render(scene, camera);
});
// --- Window Resize Handling ---
// Update the renderer size and camera aspect ratio when the window resizes.
// Note: Game.ts has its own resize handler for the camera, but the renderer
// also needs to be updated here to match the new window dimensions.
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    // Update renderer size
    renderer.setSize(width, height);
    // Update camera aspect ratio (Game.ts also does this, but keeping it here
    // ensures the renderer and camera stay in sync even if Game is disposed).
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});
// --- Pause Key Handling ---
// ESC or P toggles the pause overlay during gameplay.
// Only works when the game exists (i.e., gameplay has started).
window.addEventListener('keydown', (event) => {
    // Only handle ESC or P keys
    if (event.code !== 'Escape' && event.code !== 'KeyP')
        return;
    // Only toggle pause when the game is active
    if (!game)
        return;
    if (game.isPaused()) {
        // Resume the game
        uiManager.hidePause();
        game.resume();
    }
    else {
        // Pause the game
        game.pause();
        uiManager.showPause();
    }
});
