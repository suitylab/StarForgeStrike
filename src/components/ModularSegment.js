import * as THREE from 'three';
/**
 * ModularSegment — a single corridor segment.
 *
 * Each segment is 20 units long along the Y-axis. The corridor runs
 * vertically (player flies upward). The play field is X: -8 to 8,
 * Y: -6 to 10, with the camera at z=14 looking at the X-Y plane.
 *
  * Supports three visual styles:
 *   - 'titan-gate': cold steel military base with cyan energy conduits,
 *     harsh overhead lighting, support beams, red warning lights, and floor grates.
 *   - 'void-reactor': organic-tech hybrid with pulsing purple membranes,
 *     exposed energy cores, bioluminescent growths, flickering emergency lights,
 *     and purple ambient lighting.
 *   - 'sovereign-core': pristine white/gold command deck with holographic displays,
 *     massive energy pillars, gold trim, and warm gold ambient lighting.
 */
export class ModularSegment {
    /**
     * Creates a new corridor segment at the given Y position.
     *
     * @param scene - The THREE.js scene to add the segment to
     * @param yPosition - The Y position of the segment's bottom edge
     * @param levelStyle - The visual style of this segment (default: 'titan-gate')
     */
    constructor(scene, yPosition, levelStyle = 'titan-gate') {
        /** The THREE.js group containing all segment geometry */
        Object.defineProperty(this, "mesh", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** The Y position of the segment's bottom edge */
        Object.defineProperty(this, "yPosition", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** The scene this segment belongs to */
        Object.defineProperty(this, "scene", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** The visual style of this segment */
        Object.defineProperty(this, "levelStyle", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Warning light meshes for pulse animation (titan-gate) */
        Object.defineProperty(this, "warningLights", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Emergency light meshes for flicker animation (void-reactor) */
        Object.defineProperty(this, "emergencyLights", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Purple membrane meshes for pulse animation (void-reactor) */
        Object.defineProperty(this, "membranes", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Energy core meshes for pulse animation (void-reactor) */
        Object.defineProperty(this, "energyCores", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Bioluminescent growth meshes for pulse animation (void-reactor) */
        Object.defineProperty(this, "growths", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Holographic display meshes for pulse animation (sovereign-core) */
        Object.defineProperty(this, "holographicDisplays", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Energy pillar meshes for pulse animation (sovereign-core) */
        Object.defineProperty(this, "energyPillars", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Gold trim light meshes for pulse animation (sovereign-core) */
        Object.defineProperty(this, "goldTrimLights", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Whether this segment has been disposed */
        Object.defineProperty(this, "isDisposed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        /** Time accumulator for pulse animations */
        Object.defineProperty(this, "pulseTime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** Time accumulator for emergency light flicker */
        Object.defineProperty(this, "flickerTime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        this.scene = scene;
        this.yPosition = yPosition;
        this.levelStyle = levelStyle;
        this.mesh = new THREE.Group();
        // Build the base corridor structure (shared between styles)
        this.buildFloor();
        this.buildCeiling();
        this.buildWalls();
        this.buildSupportBeams();
        this.buildConduits();
        this.buildOverheadLights();
        this.buildFloorGrates();
        this.buildSidePipes();
        // Build style-specific decorations
        if (this.levelStyle === 'titan-gate') {
            this.buildWarningLights();
        }
        else if (this.levelStyle === 'void-reactor') {
            this.buildPurpleMembranes();
            this.buildEnergyCores();
            this.buildBioluminescentGrowths();
            this.buildEmergencyLights();
            this.buildPurpleAmbientLight();
        }
        else {
            this.buildSovereignCoreDecorations();
        }
        // Position the segment
        this.mesh.position.y = this.yPosition;
        // Add to scene
        scene.add(this.mesh);
    }
    /**
     * Updates the segment — scrolls it downward and animates style-specific elements.
     *
     * @param delta - Time elapsed since last frame in seconds
     * @param scrollSpeed - Speed at which the corridor scrolls (units/second)
     */
    update(delta, scrollSpeed) {
        // Scroll downward
        this.yPosition -= scrollSpeed * delta;
        this.mesh.position.y = this.yPosition;
        // Animate based on style
        this.pulseTime += delta;
        if (this.levelStyle === 'titan-gate') {
            this.animateWarningLights();
        }
        else if (this.levelStyle === 'void-reactor') {
            this.animateMembranes();
            this.animateEnergyCores();
            this.animateGrowths();
            this.animateEmergencyLights(delta);
        }
        else {
            this.animateHolographicDisplays();
            this.animateEnergyPillars();
            this.animateGoldTrimLights();
        }
    }
    /**
     * Checks if this segment is fully below the visible area.
     * The visible area extends from y=-20 to y=140.
     * A segment is below view when its top edge (yPosition + 20) is below -20.
     *
     * @returns {boolean} True if the segment is fully below the visible area
     */
    isBelowView() {
        return (this.yPosition + 20) < -20;
    }
    /**
     * Repositions the segment ahead of the player.
     *
     * @param aheadY - The Y position to place the segment's bottom edge at
     */
    recycle(aheadY) {
        this.yPosition = aheadY;
        this.mesh.position.y = this.yPosition;
    }
    /**
     * Disposes all resources used by this segment.
     * Removes the group from the scene and disposes all geometries and materials.
     */
    dispose() {
        if (this.isDisposed)
            return;
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
     * Builds the floor — a dark steel box with grid lines.
     */
    buildFloor() {
        // Floor slab
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a2230,
            metalness: 0.7,
            roughness: 0.4,
        });
        const floor = new THREE.Mesh(new THREE.BoxGeometry(16, 0.5, 8), floorMaterial);
        floor.position.set(0, 0, -2);
        this.mesh.add(floor);
        // Grid lines on floor
        const gridMaterial = new THREE.LineBasicMaterial({
            color: 0x2a3a4a,
            transparent: true,
            opacity: 0.5,
        });
        const gridPoints = [];
        const gridSize = 16;
        const gridSpacing = 2;
        // Vertical lines (along X)
        for (let x = -gridSize / 2; x <= gridSize / 2; x += gridSpacing) {
            gridPoints.push(new THREE.Vector3(x, 0.26, -5.5));
            gridPoints.push(new THREE.Vector3(x, 0.26, 1.5));
        }
        // Horizontal lines (along Z)
        for (let z = -5.5; z <= 1.5; z += gridSpacing) {
            gridPoints.push(new THREE.Vector3(-gridSize / 2, 0.26, z));
            gridPoints.push(new THREE.Vector3(gridSize / 2, 0.26, z));
        }
        const gridGeometry = new THREE.BufferGeometry().setFromPoints(gridPoints);
        const gridLines = new THREE.LineSegments(gridGeometry, gridMaterial);
        this.mesh.add(gridLines);
    }
    /**
     * Builds the ceiling — a dark panel with overhead light strips.
     */
    buildCeiling() {
        // Ceiling slab
        const ceilingMaterial = new THREE.MeshStandardMaterial({
            color: 0x141a24,
            metalness: 0.6,
            roughness: 0.5,
        });
        const ceiling = new THREE.Mesh(new THREE.BoxGeometry(16, 0.5, 8), ceilingMaterial);
        ceiling.position.set(0, 20, -2);
        this.mesh.add(ceiling);
    }
    /**
     * Builds the left and right walls.
     */
    buildWalls() {
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a2230,
            metalness: 0.7,
            roughness: 0.4,
        });
        // Left wall
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 20, 8), wallMaterial);
        leftWall.position.set(-8.25, 10, -2);
        this.mesh.add(leftWall);
        // Right wall
        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 20, 8), wallMaterial);
        rightWall.position.set(8.25, 10, -2);
        this.mesh.add(rightWall);
    }
    /**
     * Builds vertical support beams at the segment boundaries.
     * Each beam is split into upper and lower sections with a hollow
     * center gap so the player's flight path is not blocked.
     */
    buildSupportBeams() {
        const beamMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a3a4a,
            metalness: 0.8,
            roughness: 0.3,
        });
        // Cap plate material for the beam ends
        const capMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a4a5a,
            metalness: 0.75,
            roughness: 0.35,
        });
        // Accent strip material — cyan for titan-gate, purple for void-reactor, gold for sovereign-core
        const accentColor = this.levelStyle === 'titan-gate' ? 0x00c8ff : this.levelStyle === 'void-reactor' ? 0xaa44ff : 0xffcc00;
        const accentMaterial = new THREE.MeshBasicMaterial({
            color: accentColor,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        // Support beam positions at segment boundaries (x positions)
        const beamXPositions = [-8, 8];
        // Beam sections: lower (y=0 to y=6) and upper (y=14 to y=20)
        // The gap between y=6 and y=14 is the hollow center for the player
        const beamSections = [
            { centerY: 3, height: 6 }, // Lower section
            { centerY: 17, height: 6 }, // Upper section
        ];
        for (const x of beamXPositions) {
            for (const section of beamSections) {
                // Main beam column
                const beam = new THREE.Mesh(new THREE.BoxGeometry(0.8, section.height, 0.8), beamMaterial);
                beam.position.set(x, section.centerY, -2);
                this.mesh.add(beam);
                // Cap plate at the inner end (facing the hollow center)
                const capY = section.centerY > 10 ? section.centerY - section.height / 2 : section.centerY + section.height / 2;
                const cap = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.15, 0.9), capMaterial);
                cap.position.set(x, capY, -2);
                this.mesh.add(cap);
                // Accent strip on the inner edge
                const accent = new THREE.Mesh(new THREE.BoxGeometry(0.1, section.height - 0.4, 0.1), accentMaterial);
                accent.position.set(x, section.centerY, -1.6);
                this.mesh.add(accent);
            }
        }
    }
    /**
     * Builds energy conduit strips running along the walls.
     * Color varies by style: cyan for titan-gate, purple for void-reactor.
     */
    buildConduits() {
        const conduitColor = this.levelStyle === 'titan-gate' ? 0x00c8ff : this.levelStyle === 'void-reactor' ? 0xaa44ff : 0xffcc00;
        const conduitMaterial = new THREE.MeshBasicMaterial({
            color: conduitColor,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        // Left wall conduits
        const leftConduit1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 18, 0.1), conduitMaterial);
        leftConduit1.position.set(-8.5, 10, -1);
        this.mesh.add(leftConduit1);
        const leftConduit2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 18, 0.1), conduitMaterial);
        leftConduit2.position.set(-8.5, 10, -3);
        this.mesh.add(leftConduit2);
        // Right wall conduits
        const rightConduit1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 18, 0.1), conduitMaterial);
        rightConduit1.position.set(8.5, 10, -1);
        this.mesh.add(rightConduit1);
        const rightConduit2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 18, 0.1), conduitMaterial);
        rightConduit2.position.set(8.5, 10, -3);
        this.mesh.add(rightConduit2);
    }
    /**
     * Builds harsh overhead light strips on the ceiling.
     */
    buildOverheadLights() {
        const lightMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        // Three light strips across the ceiling
        const lightPositions = [-4, 0, 4];
        for (const x of lightPositions) {
            const light = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 0.3), lightMaterial);
            light.position.set(x, 19.8, -2);
            this.mesh.add(light);
        }
    }
    /**
     * Builds red warning lights that pulse (titan-gate style).
     */
    buildWarningLights() {
        const warningMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        // Warning lights on walls at segment boundaries
        const lightPositions = [
            { x: -8.5, y: 1, z: -2 }, { x: 8.5, y: 1, z: -2 },
            { x: -8.5, y: 19, z: -2 }, { x: 8.5, y: 19, z: -2 },
        ];
        for (const pos of lightPositions) {
            const light = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), warningMaterial);
            light.position.set(pos.x, pos.y, pos.z);
            this.mesh.add(light);
            this.warningLights.push(light);
        }
    }
    /**
     * Builds thin dark lines across the floor (floor grates).
     */
    buildFloorGrates() {
        const grateMaterial = new THREE.MeshStandardMaterial({
            color: 0x0a0e14,
            metalness: 0.5,
            roughness: 0.8,
        });
        // Grate lines across the floor
        for (let i = 0; i < 5; i++) {
            const grate = new THREE.Mesh(new THREE.BoxGeometry(16, 0.02, 0.1), grateMaterial);
            grate.position.set(0, 0.26, -4 + i * 2);
            this.mesh.add(grate);
        }
    }
    /**
     * Builds side pipes running along the walls.
     */
    buildSidePipes() {
        const pipeMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a3a4a,
            metalness: 0.8,
            roughness: 0.3,
        });
        // Left wall pipes
        const leftPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 18, 8), pipeMaterial);
        leftPipe.rotation.x = Math.PI / 2;
        leftPipe.position.set(-8.5, 10, 0.5);
        this.mesh.add(leftPipe);
        // Right wall pipes
        const rightPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 18, 8), pipeMaterial);
        rightPipe.rotation.x = Math.PI / 2;
        rightPipe.position.set(8.5, 10, 0.5);
        this.mesh.add(rightPipe);
    }
    /**
     * Builds pulsing purple membranes along the walls (void-reactor style).
     * Semi-transparent purple planes that pulse with a breathing animation.
     */
    buildPurpleMembranes() {
        const membraneMaterial = new THREE.MeshBasicMaterial({
            color: 0xaa44ff,
            transparent: true,
            opacity: 0.15,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
        });
        // Membrane planes along the left wall
        const leftMembranePositions = [
            { y: 3, z: -4.5 },
            { y: 10, z: -4.5 },
            { y: 17, z: -4.5 },
        ];
        for (const pos of leftMembranePositions) {
            const membrane = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 5), membraneMaterial);
            membrane.position.set(-8.0, pos.y, pos.z);
            membrane.rotation.y = Math.PI / 2;
            this.mesh.add(membrane);
            this.membranes.push(membrane);
        }
        // Membrane planes along the right wall
        const rightMembranePositions = [
            { y: 3, z: -4.5 },
            { y: 10, z: -4.5 },
            { y: 17, z: -4.5 },
        ];
        for (const pos of rightMembranePositions) {
            const membrane = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 5), membraneMaterial);
            membrane.position.set(8.0, pos.y, pos.z);
            membrane.rotation.y = -Math.PI / 2;
            this.mesh.add(membrane);
            this.membranes.push(membrane);
        }
        // Membrane planes on the ceiling
        const ceilingMembranePositions = [
            { x: -4, z: -4.5 },
            { x: 0, z: -4.5 },
            { x: 4, z: -4.5 },
        ];
        for (const pos of ceilingMembranePositions) {
            const membrane = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.4), membraneMaterial);
            membrane.position.set(pos.x, 19.8, pos.z);
            membrane.rotation.x = Math.PI / 2;
            this.mesh.add(membrane);
            this.membranes.push(membrane);
        }
    }
    /**
     * Builds exposed energy cores embedded in the walls (void-reactor style).
     * Glowing purple/cyan spheres that pulse with energy.
     */
    buildEnergyCores() {
        // Purple core material
        const purpleCoreMaterial = new THREE.MeshBasicMaterial({
            color: 0xaa44ff,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        // Cyan core material (alternating)
        const cyanCoreMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffcc,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        // Core positions embedded in walls
        const corePositions = [
            { x: -8.0, y: 2, z: -3, color: 'purple' },
            { x: 8.0, y: 5, z: -1, color: 'cyan' },
            { x: -8.0, y: 8, z: -4, color: 'cyan' },
            { x: 8.0, y: 12, z: -2, color: 'purple' },
            { x: -8.0, y: 15, z: -1, color: 'purple' },
            { x: 8.0, y: 18, z: -4, color: 'cyan' },
        ];
        for (const pos of corePositions) {
            const material = pos.color === 'purple' ? purpleCoreMaterial : cyanCoreMaterial;
            const core = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), material);
            core.position.set(pos.x, pos.y, pos.z);
            this.mesh.add(core);
            this.energyCores.push(core);
            // Outer glow ring around the core
            const glowRingMaterial = new THREE.MeshBasicMaterial({
                color: pos.color === 'purple' ? 0xaa44ff : 0x00ffcc,
                transparent: true,
                opacity: 0.3,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 8, 16), glowRingMaterial);
            glowRing.position.set(pos.x, pos.y, pos.z);
            glowRing.rotation.x = Math.PI / 2;
            this.mesh.add(glowRing);
        }
    }
    /**
     * Builds bioluminescent growths along the floor and walls (void-reactor style).
     * Small glowing green/purple spheres or cone clusters.
     */
    buildBioluminescentGrowths() {
        // Green growth material
        const greenGrowthMaterial = new THREE.MeshBasicMaterial({
            color: 0x44ff88,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        // Purple growth material
        const purpleGrowthMaterial = new THREE.MeshBasicMaterial({
            color: 0xcc44ff,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        // Growth positions along floor and walls
        const growthPositions = [
            // Floor growths
            { x: -6, y: 0.3, z: -4, type: 'sphere', color: 'green' },
            { x: -3, y: 0.3, z: -1, type: 'cone', color: 'purple' },
            { x: 2, y: 0.3, z: -3, type: 'sphere', color: 'purple' },
            { x: 5, y: 0.3, z: -5, type: 'cone', color: 'green' },
            { x: 7, y: 0.3, z: 0, type: 'sphere', color: 'green' },
            // Left wall growths
            { x: -8.0, y: 4, z: -2, type: 'cone', color: 'green' },
            { x: -8.0, y: 7, z: -5, type: 'sphere', color: 'purple' },
            { x: -8.0, y: 13, z: -3, type: 'cone', color: 'purple' },
            { x: -8.0, y: 16, z: -1, type: 'sphere', color: 'green' },
            // Right wall growths
            { x: 8.0, y: 3, z: -5, type: 'sphere', color: 'purple' },
            { x: 8.0, y: 6, z: -2, type: 'cone', color: 'green' },
            { x: 8.0, y: 11, z: -4, type: 'sphere', color: 'green' },
            { x: 8.0, y: 14, z: -1, type: 'cone', color: 'purple' },
            { x: 8.0, y: 18, z: -3, type: 'sphere', color: 'purple' },
        ];
        for (const pos of growthPositions) {
            const material = pos.color === 'green' ? greenGrowthMaterial : purpleGrowthMaterial;
            let growth;
            if (pos.type === 'sphere') {
                growth = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), material);
            }
            else {
                // Cone cluster — small cone pointing outward
                growth = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 6), material);
                // Orient cone based on position (floor vs wall)
                if (pos.y < 1) {
                    growth.rotation.x = Math.PI / 2; // Point up from floor
                }
                else if (pos.x < -7) {
                    growth.rotation.y = Math.PI / 2; // Point right from left wall
                }
                else if (pos.x > 7) {
                    growth.rotation.y = -Math.PI / 2; // Point left from right wall
                }
            }
            growth.position.set(pos.x, pos.y, pos.z);
            this.mesh.add(growth);
            this.growths.push(growth);
        }
    }
    /**
     * Builds flickering emergency lights (void-reactor style).
     * Red/orange point lights that pulse with an irregular flicker.
     */
    buildEmergencyLights() {
        const emergencyMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4400,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        // Emergency light positions on walls and ceiling
        const lightPositions = [
            { x: -8.5, y: 2, z: -2 },
            { x: 8.5, y: 4, z: -2 },
            { x: -8.5, y: 9, z: -2 },
            { x: 8.5, y: 11, z: -2 },
            { x: -8.5, y: 16, z: -2 },
            { x: 8.5, y: 18, z: -2 },
            { x: -4, y: 19.8, z: -2 },
            { x: 4, y: 19.8, z: -2 },
        ];
        for (const pos of lightPositions) {
            const light = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), emergencyMaterial);
            light.position.set(pos.x, pos.y, pos.z);
            this.mesh.add(light);
            this.emergencyLights.push(light);
        }
    }
    /**
     * Builds purple ambient lighting for the void-reactor style.
     * Adds a purple point light to the segment for atmosphere.
     */
    buildPurpleAmbientLight() {
        const purpleLight = new THREE.PointLight(0xaa44ff, 0.4, 12);
        purpleLight.position.set(0, 10, 2);
        this.mesh.add(purpleLight);
    }
    /**
   * Builds the sovereign-core style decorations.
   * Calls all the individual build methods for the white/gold command deck aesthetic.
   */
    buildSovereignCoreDecorations() {
        this.buildWhiteFloorCeiling();
        this.buildGoldTrim();
        this.buildHolographicDisplays();
        this.buildEnergyPillars();
        this.buildGoldAmbientLight();
    }
    /**
     * Builds the white/ivory floor and ceiling panels with gold trim edges (sovereign-core style).
     * Replaces the dark floor/ceiling with clean white/ivory surfaces.
     */
    buildWhiteFloorCeiling() {
        // White/ivory floor slab
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0xf0f0e8,
            metalness: 0.3,
            roughness: 0.6,
        });
        const floor = new THREE.Mesh(new THREE.BoxGeometry(16, 0.5, 8), floorMaterial);
        floor.position.set(0, 0, -2);
        this.mesh.add(floor);
        // White/ivory ceiling slab
        const ceilingMaterial = new THREE.MeshStandardMaterial({
            color: 0xf0f0e8,
            metalness: 0.3,
            roughness: 0.6,
        });
        const ceiling = new THREE.Mesh(new THREE.BoxGeometry(16, 0.5, 8), ceilingMaterial);
        ceiling.position.set(0, 20, -2);
        this.mesh.add(ceiling);
        // Ivory panel lines on the floor (subtle grid)
        const panelLineMaterial = new THREE.MeshStandardMaterial({
            color: 0xd8d8d0,
            metalness: 0.2,
            roughness: 0.7,
        });
        // Floor panel lines
        for (let i = 0; i < 5; i++) {
            const line = new THREE.Mesh(new THREE.BoxGeometry(16, 0.02, 0.08), panelLineMaterial);
            line.position.set(0, 0.26, -4 + i * 2);
            this.mesh.add(line);
        }
        // Ceiling panel lines
        for (let i = 0; i < 5; i++) {
            const line = new THREE.Mesh(new THREE.BoxGeometry(16, 0.02, 0.08), panelLineMaterial);
            line.position.set(0, 19.74, -4 + i * 2);
            this.mesh.add(line);
        }
    }
    /**
     * Builds gold trim strips along floor edges, ceiling edges, and wall edges (sovereign-core style).
     * Thin gold boxes with high metalness for a polished command deck look.
     */
    buildGoldTrim() {
        const goldTrimMaterial = new THREE.MeshStandardMaterial({
            color: 0xffcc00,
            metalness: 0.9,
            roughness: 0.2,
        });
        // Floor edge trims (left and right edges)
        const floorLeftTrim = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 8), goldTrimMaterial);
        floorLeftTrim.position.set(-7.9, 0.3, -2);
        this.mesh.add(floorLeftTrim);
        const floorRightTrim = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 8), goldTrimMaterial);
        floorRightTrim.position.set(7.9, 0.3, -2);
        this.mesh.add(floorRightTrim);
        // Ceiling edge trims (left and right edges)
        const ceilingLeftTrim = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 8), goldTrimMaterial);
        ceilingLeftTrim.position.set(-7.9, 19.7, -2);
        this.mesh.add(ceilingLeftTrim);
        const ceilingRightTrim = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 8), goldTrimMaterial);
        ceilingRightTrim.position.set(7.9, 19.7, -2);
        this.mesh.add(ceilingRightTrim);
        // Wall edge trims (vertical gold strips at the wall-floor and wall-ceiling junctions)
        // Left wall bottom edge
        const leftWallBottomTrim = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 8), goldTrimMaterial);
        leftWallBottomTrim.position.set(-8.2, 0.3, -2);
        this.mesh.add(leftWallBottomTrim);
        // Left wall top edge
        const leftWallTopTrim = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 8), goldTrimMaterial);
        leftWallTopTrim.position.set(-8.2, 19.7, -2);
        this.mesh.add(leftWallTopTrim);
        // Right wall bottom edge
        const rightWallBottomTrim = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 8), goldTrimMaterial);
        rightWallBottomTrim.position.set(8.2, 0.3, -2);
        this.mesh.add(rightWallBottomTrim);
        // Right wall top edge
        const rightWallTopTrim = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 8), goldTrimMaterial);
        rightWallTopTrim.position.set(8.2, 19.7, -2);
        this.mesh.add(rightWallTopTrim);
    }
    /**
     * Builds glowing holographic display planes along the walls (sovereign-core style).
     * Cyan and gold semi-transparent planes that pulse with an animated glow.
     */
    buildHolographicDisplays() {
        // Cyan holographic material
        const cyanHoloMaterial = new THREE.MeshBasicMaterial({
            color: 0x00e5ff,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
        });
        // Gold holographic material
        const goldHoloMaterial = new THREE.MeshBasicMaterial({
            color: 0xffcc00,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
        });
        // Holographic display positions along left and right walls
        // Each display is a plane facing into the corridor
        const displayConfigs = [
            // Left wall displays
            { x: -8.0, y: 3, z: -3, color: 'cyan', rotationY: Math.PI / 2 },
            { x: -8.0, y: 8, z: -1, color: 'gold', rotationY: Math.PI / 2 },
            { x: -8.0, y: 13, z: -4, color: 'cyan', rotationY: Math.PI / 2 },
            { x: -8.0, y: 17, z: -2, color: 'gold', rotationY: Math.PI / 2 },
            // Right wall displays
            { x: 8.0, y: 4, z: -2, color: 'gold', rotationY: -Math.PI / 2 },
            { x: 8.0, y: 9, z: -4, color: 'cyan', rotationY: -Math.PI / 2 },
            { x: 8.0, y: 14, z: -1, color: 'gold', rotationY: -Math.PI / 2 },
            { x: 8.0, y: 18, z: -3, color: 'cyan', rotationY: -Math.PI / 2 },
        ];
        for (const config of displayConfigs) {
            const material = config.color === 'cyan' ? cyanHoloMaterial : goldHoloMaterial;
            const display = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 3.5), material);
            display.position.set(config.x, config.y, config.z);
            display.rotation.y = config.rotationY;
            this.mesh.add(display);
            this.holographicDisplays.push(display);
            // Add a thin frame around the display for detail
            const frameMaterial = new THREE.MeshStandardMaterial({
                color: 0xffcc00,
                metalness: 0.8,
                roughness: 0.3,
            });
            const frame = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3.7, 0.05), frameMaterial);
            frame.position.set(config.x, config.y, config.z);
            this.mesh.add(frame);
        }
    }
    /**
     * Builds tall glowing energy pillars at intervals (sovereign-core style).
     * White/gold cylinders with a glowing inner core.
     */
    buildEnergyPillars() {
        // Outer pillar material (white/gold)
        const pillarMaterial = new THREE.MeshStandardMaterial({
            color: 0xf0f0e8,
            metalness: 0.7,
            roughness: 0.3,
        });
        // Glowing inner core material (gold, additive)
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: 0xffcc00,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        // Pillar positions: x positions -6, 0, 6 at intervals along the segment
        const pillarPositions = [
            { x: -6, y: 10, z: -4.5 },
            { x: 0, y: 10, z: -4.5 },
            { x: 6, y: 10, z: -4.5 },
        ];
        for (const pos of pillarPositions) {
            // Outer pillar
            const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 14, 12), pillarMaterial);
            pillar.position.set(pos.x, pos.y, pos.z);
            this.mesh.add(pillar);
            // Gold trim rings on the pillar (top and bottom)
            const trimMaterial = new THREE.MeshStandardMaterial({
                color: 0xffcc00,
                metalness: 0.9,
                roughness: 0.2,
            });
            const topRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 16), trimMaterial);
            topRing.position.set(pos.x, pos.y + 6.5, pos.z);
            topRing.rotation.x = Math.PI / 2;
            this.mesh.add(topRing);
            const bottomRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 16), trimMaterial);
            bottomRing.position.set(pos.x, pos.y - 6.5, pos.z);
            bottomRing.rotation.x = Math.PI / 2;
            this.mesh.add(bottomRing);
            // Glowing inner core
            const core = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 12, 8), coreMaterial);
            core.position.set(pos.x, pos.y, pos.z);
            this.mesh.add(core);
            this.energyPillars.push(core);
        }
    }
    /**
     * Builds warm gold ambient lighting for the sovereign-core style.
     * Adds a gold point light to the segment for atmosphere.
     */
    buildGoldAmbientLight() {
        const goldLight = new THREE.PointLight(0xffcc66, 0.5, 15);
        goldLight.position.set(0, 10, 2);
        this.mesh.add(goldLight);
    }
    /**
     * Animates the holographic displays (sovereign-core style).
     * Pulses opacity with a sine wave for a shimmering hologram effect.
     */
    animateHolographicDisplays() {
        const pulse = Math.sin(this.pulseTime * 2.5) * 0.5 + 0.5; // 0 to 1
        for (let i = 0; i < this.holographicDisplays.length; i++) {
            const display = this.holographicDisplays[i];
            const material = display.material;
            // Alternate pulse phase for a cascading effect
            const phaseOffset = (i % 3) * 0.3;
            const displayPulse = Math.sin(this.pulseTime * 2.5 + phaseOffset) * 0.5 + 0.5;
            material.opacity = 0.2 + displayPulse * 0.4;
        }
    }
    /**
     * Animates the energy pillars (sovereign-core style).
     * Pulses scale and opacity with a sine wave for a powerful energy feel.
     */
    animateEnergyPillars() {
        const pulse = Math.sin(this.pulseTime * 3) * 0.5 + 0.5; // 0 to 1
        for (let i = 0; i < this.energyPillars.length; i++) {
            const pillar = this.energyPillars[i];
            const scale = 1 + pulse * 0.15;
            pillar.scale.set(scale, 1, scale);
            const material = pillar.material;
            material.opacity = 0.6 + pulse * 0.4;
        }
    }
    /**
     * Animates the gold trim lights (sovereign-core style).
     * Pulses opacity with a sine wave for a subtle shimmer.
     */
    animateGoldTrimLights() {
        const pulse = Math.sin(this.pulseTime * 2) * 0.5 + 0.5; // 0 to 1
        for (const light of this.goldTrimLights) {
            const material = light.material;
            material.opacity = 0.5 + pulse * 0.5;
            const scale = 1 + pulse * 0.2;
            light.scale.set(scale, scale, scale);
        }
    }
    /**
     * Animates the warning lights (titan-gate style).
     * Pulses opacity and scale with a sine wave.
     */
    animateWarningLights() {
        const pulse = Math.sin(this.pulseTime * 3) * 0.5 + 0.5; // 0 to 1
        for (const light of this.warningLights) {
            const material = light.material;
            material.opacity = 0.5 + pulse * 0.5;
            const scale = 1 + pulse * 0.3;
            light.scale.set(scale, scale, scale);
        }
    }
    /**
     * Animates the purple membranes (void-reactor style).
     * Pulses opacity with a slow breathing effect.
     */
    animateMembranes() {
        const pulse = Math.sin(this.pulseTime * 1.5) * 0.5 + 0.5; // 0 to 1
        for (const membrane of this.membranes) {
            const material = membrane.material;
            material.opacity = 0.1 + pulse * 0.15;
        }
    }
    /**
     * Animates the energy cores (void-reactor style).
     * Pulses scale and opacity with a faster energy rhythm.
     */
    animateEnergyCores() {
        const pulse = Math.sin(this.pulseTime * 4) * 0.5 + 0.5; // 0 to 1
        for (const core of this.energyCores) {
            const scale = 1 + pulse * 0.4;
            core.scale.set(scale, scale, scale);
            const material = core.material;
            material.opacity = 0.7 + pulse * 0.3;
        }
    }
    /**
     * Animates the bioluminescent growths (void-reactor style).
     * Pulses scale with a gentle organic rhythm.
     */
    animateGrowths() {
        const pulse = Math.sin(this.pulseTime * 2 + this.yPosition) * 0.5 + 0.5; // 0 to 1
        for (const growth of this.growths) {
            const scale = 1 + pulse * 0.3;
            growth.scale.set(scale, scale, scale);
            const material = growth.material;
            material.opacity = 0.6 + pulse * 0.4;
        }
    }
    /**
     * Animates the emergency lights (void-reactor style).
     * Uses a pseudo-random flicker pattern for an unstable feel.
     *
     * @param delta - Time elapsed since last frame in seconds
     */
    animateEmergencyLights(delta) {
        this.flickerTime += delta;
        // Flicker pattern: mostly on, with brief random dimming
        const flicker = Math.random() < 0.1 ? 0.2 : 0.8;
        const pulse = Math.sin(this.flickerTime * 8) * 0.1;
        for (const light of this.emergencyLights) {
            const material = light.material;
            material.opacity = Math.max(0.1, flicker + pulse);
            const scale = 1 + pulse * 0.5;
            light.scale.set(scale, scale, scale);
        }
    }
}
/**
 * ModularCorridor — manages an array of ModularSegment instances.
 *
 * The corridor spans from y=-20 to y=140 initially (8 segments × 20 units).
 * Segments scroll downward and are recycled when they go below the view.
 * Supports multiple visual styles via the levelStyle parameter.
 */
export class ModularCorridor {
    /**
     * Creates a new modular corridor.
     *
     * @param scene - The THREE.js scene to add segments to
     * @param segmentCount - Number of segments to create (default: 8)
     * @param levelStyle - The visual style of the corridor (default: 'titan-gate')
     */
    constructor(scene, segmentCount = 8, levelStyle = 'titan-gate') {
        /** Array of corridor segments */
        Object.defineProperty(this, "segments", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** The THREE.js scene to add segments to */
        Object.defineProperty(this, "scene", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** The visual style of the corridor */
        Object.defineProperty(this, "levelStyle", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** Whether the corridor has been disposed */
        Object.defineProperty(this, "isDisposed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        this.scene = scene;
        this.levelStyle = levelStyle;
        // Create segments spanning from y=-20 to y=140
        // Each segment is 20 units long
        const startY = -20;
        for (let i = 0; i < segmentCount; i++) {
            const y = startY + i * 20;
            const segment = new ModularSegment(scene, y, this.levelStyle);
            this.segments.push(segment);
        }
    }
    /**
     * Updates all segments — scrolls them downward and recycles
     * any that go below the visible area.
     *
     * @param delta - Time elapsed since last frame in seconds
     * @param scrollSpeed - Speed at which the corridor scrolls (units/second)
     */
    update(delta, scrollSpeed) {
        // Update all segments
        for (const segment of this.segments) {
            segment.update(delta, scrollSpeed);
        }
        // Recycle segments that are below the view
        // Find the highest segment's top edge
        let highestY = -Infinity;
        for (const segment of this.segments) {
            // Get the segment's current Y position
            // We need to access the mesh position
            const segY = segment.mesh.position.y;
            if (segY > highestY) {
                highestY = segY;
            }
        }
        // Recycle any segment below the view
        for (const segment of this.segments) {
            if (segment.isBelowView()) {
                // Place it ahead of the highest segment
                segment.recycle(highestY + 20);
                // Update highestY for subsequent recycles
                highestY += 20;
            }
        }
    }
    /**
     * Disposes all segments and cleans up resources.
     */
    dispose() {
        if (this.isDisposed)
            return;
        for (const segment of this.segments) {
            segment.dispose();
        }
        this.segments = [];
        this.isDisposed = true;
    }
    /**
     * Changes the visual style of the corridor.
     * Disposes all existing segments and recreates them with the new style.
     *
     * @param levelStyle - The new visual style for the corridor
     */
    setLevelStyle(levelStyle) {
        // Dispose all existing segments
        for (const segment of this.segments) {
            segment.dispose();
        }
        this.segments = [];
        // Set the new style
        this.levelStyle = levelStyle;
        // Recreate segments spanning from y=-20 to y=140 (8 segments × 20 units each)
        const startY = -20;
        for (let i = 0; i < 8; i++) {
            const y = startY + i * 20;
            const segment = new ModularSegment(this.scene, y, this.levelStyle);
            this.segments.push(segment);
        }
    }
    /**
     * Returns the current visual style of the corridor.
     *
     * @returns {LevelStyle} The current level style
     */
    getLevelStyle() {
        return this.levelStyle;
    }
}
