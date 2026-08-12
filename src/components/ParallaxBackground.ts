import * as THREE from 'three';

/**
 * LevelStyle — the visual theme for the parallax background.
 * 'titan-gate': Level 1 cold steel military corridor with cyan accents.
 * 'void-reactor': Level 2 organic-tech hybrid with purple accents.
 * 'sovereign-core': Level 3 pristine white/gold command deck with gold accents.
 */
export type LevelStyle = 'titan-gate' | 'void-reactor' | 'sovereign-core';

/**
 * ParallaxBackground — manages two background layers that move at different speeds
 * to create depth behind the modular corridor.
 *
 * The far layer (20% speed) shows distant stars and base silhouettes.
 * The mid layer (40% speed) shows distant structures and energy fields.
 * Both layers are positioned behind the corridor (z < -2) and scroll based on
 * the player's vertical movement.
 *
 * The background supports three level styles:
 *   - 'titan-gate': cyan accents (0x00c8ff)
 *   - 'void-reactor': purple accents (0xaa44ff)
 *   - 'sovereign-core': gold accents (0xffcc00)
 */
export class ParallaxBackground {
  /** The THREE.js scene to add background layers to */
  private scene: THREE.Scene;

  /** The far background layer group (stars + base silhouettes) */
  private farLayer: THREE.Group;

  /** The mid background layer group (structures + energy fields) */
  private midLayer: THREE.Group;

  /** The current level style */
  private levelStyle: LevelStyle;

  /** Whether this background has been disposed */
  private isDisposed: boolean = false;

  /** The vertical span of the background layers (matches corridor span) */
  private readonly layerHeight: number = 160;

  /** The vertical extent of the visible area (below this, objects are recycled) */
  private readonly viewBottom: number = -20;

  /** The vertical extent of the visible area (above this, objects are recycled) */
  private readonly viewTop: number = 140;

  /** Speed factor for the far layer (20% of scroll speed) */
  private readonly farSpeedFactor: number = 0.2;

  /** Speed factor for the mid layer (40% of scroll speed) */
  private readonly midSpeedFactor: number = 0.4;

  /** Accent color for the current level style */
  private accentColor: number;

  /**
   * Creates a new ParallaxBackground.
   * Builds both layers and adds them to the scene.
   *
   * @param scene - The THREE.js scene to add background layers to
   * @param levelStyle - The visual style of the background (default: 'titan-gate')
   */
  constructor(scene: THREE.Scene, levelStyle: LevelStyle = 'titan-gate') {
    this.scene = scene;
    this.levelStyle = levelStyle;
    this.accentColor = this.getAccentColor(levelStyle);

    // Create the layer groups
    this.farLayer = new THREE.Group();
    this.midLayer = new THREE.Group();

    // Build the layers
    this.buildFarLayer();
    this.buildMidLayer();

    // Add layers to the scene (far first, then mid — mid renders on top of far)
    this.scene.add(this.farLayer);
    this.scene.add(this.midLayer);
  }

  /**
   * Updates the parallax background — scrolls both layers downward
   * and recycles objects that go below the visible area.
   *
   * @param delta - Time elapsed since last frame in seconds
   * @param scrollSpeed - The corridor scroll speed in units/second
   */
  public update(delta: number, scrollSpeed: number): void {
    if (this.isDisposed) return;

    // Scroll the far layer at 20% speed
    this.scrollLayer(this.farLayer, scrollSpeed * this.farSpeedFactor * delta);

    // Scroll the mid layer at 40% speed
    this.scrollLayer(this.midLayer, scrollSpeed * this.midSpeedFactor * delta);
  }

  /**
   * Changes the visual style of the background.
   * Disposes both layers and rebuilds them with the new style.
   *
   * @param levelStyle - The new visual style for the background
   */
  public setLevelStyle(levelStyle: LevelStyle): void {
    if (this.isDisposed) return;
    if (this.levelStyle === levelStyle) return;

    // Remove and dispose the current layers
    this.scene.remove(this.farLayer);
    this.scene.remove(this.midLayer);
    this.disposeLayer(this.farLayer);
    this.disposeLayer(this.midLayer);

    // Set the new style
    this.levelStyle = levelStyle;
    this.accentColor = this.getAccentColor(levelStyle);

    // Rebuild the layers
    this.farLayer = new THREE.Group();
    this.midLayer = new THREE.Group();
    this.buildFarLayer();
    this.buildMidLayer();

    // Add the new layers to the scene
    this.scene.add(this.farLayer);
    this.scene.add(this.midLayer);
  }

  /**
   * Disposes the background — removes both layers from the scene
   * and disposes all geometries and materials.
   */
  public dispose(): void {
    if (this.isDisposed) return;

    // Remove layers from the scene
    this.scene.remove(this.farLayer);
    this.scene.remove(this.midLayer);

    // Dispose all resources
    this.disposeLayer(this.farLayer);
    this.disposeLayer(this.midLayer);

    this.isDisposed = true;
  }

  /**
   * Returns the accent color for the given level style.
   *
   * @param levelStyle - The level style
   * @returns {number} The accent color as a hex number
   */
  private getAccentColor(levelStyle: LevelStyle): number {
    switch (levelStyle) {
      case 'titan-gate':
        return 0x00c8ff; // Cyan
      case 'void-reactor':
        return 0xaa44ff; // Purple
      case 'sovereign-core':
        return 0xffcc00; // Gold
      default:
        return 0x00c8ff;
    }
  }

  /**
   * Builds the far background layer.
   * Contains ~60 small dim star particles and ~8 large base silhouette boxes.
   * The far layer is positioned at z = -10 (behind the corridor at z = -2).
   */
  private buildFarLayer(): void {
    // --- Stars ---
    // ~60 small dim spheres scattered across the layer
    const starCount = 60;
    const starGeometry = new THREE.SphereGeometry(0.08, 6, 6);
    const starMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    for (let i = 0; i < starCount; i++) {
      const star = new THREE.Mesh(starGeometry, starMaterial);

      // Random position within the layer bounds
      const x = -8 + Math.random() * 16; // -8 to 8
      const y = this.viewBottom + Math.random() * this.layerHeight; // -20 to 140
      const z = -10 - Math.random() * 2; // -10 to -12

      star.position.set(x, y, z);

      // Random scale for variety (0.5 to 1.5)
      const scale = 0.5 + Math.random();
      star.scale.set(scale, scale, scale);

      // Random opacity for depth variation
      (star.material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.random() * 0.3;

      this.farLayer.add(star);
    }

    // --- Base Silhouette Boxes ---
    // ~8 large dark boxes that look like distant base structures
    const silhouetteCount = 8;
    const silhouetteMaterial = new THREE.MeshBasicMaterial({
      color: 0x0a0e14,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });

    // Silhouette configurations: width, height, depth
    const silhouetteSizes = [
      { w: 2.0, h: 3.0, d: 0.5 },
      { w: 1.5, h: 2.5, d: 0.5 },
      { w: 2.5, h: 2.0, d: 0.5 },
      { w: 1.8, h: 3.5, d: 0.5 },
      { w: 2.2, h: 2.8, d: 0.5 },
      { w: 1.2, h: 2.0, d: 0.5 },
      { w: 3.0, h: 2.5, d: 0.5 },
      { w: 1.6, h: 3.2, d: 0.5 },
    ];

    for (let i = 0; i < silhouetteCount; i++) {
      const size = silhouetteSizes[i % silhouetteSizes.length];
      const geometry = new THREE.BoxGeometry(size.w, size.h, size.d);
      const silhouette = new THREE.Mesh(geometry, silhouetteMaterial);

      // Position silhouettes at the edges of the view (left and right sides)
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (6 + Math.random() * 2); // 6 to 8 on either side
      const y = this.viewBottom + (i / silhouetteCount) * this.layerHeight + Math.random() * 10;
      const z = -10 - Math.random() * 1; // -10 to -11

      silhouette.position.set(x, y, z);

      // Slight random rotation for variety
      silhouette.rotation.z = (Math.random() - 0.5) * 0.1;

      this.farLayer.add(silhouette);
    }
  }

  /**
   * Builds the mid background layer.
   * Contains ~30 medium structure boxes and ~6 energy field planes.
   * The mid layer is positioned at z = -6 (behind the corridor at z = -2).
   */
  private buildMidLayer(): void {
    // --- Structure Boxes ---
    // ~30 medium boxes that look like distant structures
    const structureCount = 30;
    const structureMaterial = new THREE.MeshBasicMaterial({
      color: 0x1a2230,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });

    // Structure sizes: width, height, depth
    const structureSizes = [
      { w: 0.8, h: 1.2, d: 0.3 },
      { w: 0.6, h: 0.8, d: 0.3 },
      { w: 1.0, h: 0.6, d: 0.3 },
      { w: 0.7, h: 1.0, d: 0.3 },
      { w: 1.2, h: 0.8, d: 0.3 },
      { w: 0.5, h: 0.7, d: 0.3 },
    ];

    for (let i = 0; i < structureCount; i++) {
      const size = structureSizes[i % structureSizes.length];
      const geometry = new THREE.BoxGeometry(size.w, size.h, size.d);
      const structure = new THREE.Mesh(geometry, structureMaterial);

      // Random position within the layer bounds
      const x = -7 + Math.random() * 14; // -7 to 7
      const y = this.viewBottom + Math.random() * this.layerHeight; // -20 to 140
      const z = -6 - Math.random() * 1.5; // -6 to -7.5

      structure.position.set(x, y, z);

      // Slight random rotation for variety
      structure.rotation.z = (Math.random() - 0.5) * 0.2;

      this.midLayer.add(structure);
    }

    // --- Energy Field Planes ---
    // ~6 semi-transparent planes with accent color glow
    const energyFieldCount = 6;
    const energyFieldMaterial = new THREE.MeshBasicMaterial({
      color: this.accentColor,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // Energy field positions: x positions at -6, 0, 6, with two rows
    const fieldXPositions = [-6, 0, 6];

    for (let i = 0; i < energyFieldCount; i++) {
      const x = fieldXPositions[i % fieldXPositions.length];
      const row = Math.floor(i / fieldXPositions.length);
      const y = this.viewBottom + (row * this.layerHeight) / 2 + Math.random() * 20;
      const z = -6 - Math.random() * 0.5; // -6 to -6.5

      const field = new THREE.Mesh(
        new THREE.PlaneGeometry(0.4, 4),
        energyFieldMaterial
      );
      field.position.set(x, y, z);
      field.rotation.y = Math.PI / 2; // Face into the corridor

      this.midLayer.add(field);
    }

    // --- Accent Glow Points ---
    // Small glowing spheres with the accent color scattered through the mid layer
    const glowCount = 15;
    const glowGeometry = new THREE.SphereGeometry(0.12, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: this.accentColor,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    for (let i = 0; i < glowCount; i++) {
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);

      const x = -7 + Math.random() * 14; // -7 to 7
      const y = this.viewBottom + Math.random() * this.layerHeight; // -20 to 140
      const z = -6 - Math.random() * 1; // -6 to -7

      glow.position.set(x, y, z);

      // Random scale for variety
      const scale = 0.5 + Math.random();
      glow.scale.set(scale, scale, scale);

      this.midLayer.add(glow);
    }
  }

  /**
   * Scrolls a layer downward by the given offset and recycles
   * any objects that go below the visible area.
   *
   * @param layer - The layer group to scroll
   * @param offset - The distance to scroll downward
   */
  private scrollLayer(layer: THREE.Group, offset: number): void {
    // Track the highest Y position in the layer for recycling
    let highestY = -Infinity;

    // First pass: move all objects and find the highest Y
    for (const child of layer.children) {
      child.position.y -= offset;
      if (child.position.y > highestY) {
        highestY = child.position.y;
      }
    }

    // Second pass: recycle objects that went below the view
    for (const child of layer.children) {
      if (child.position.y < this.viewBottom) {
        // Reposition above the highest object
        child.position.y = highestY + 20;
        highestY += 20;
      }
    }
  }

  /**
   * Disposes all geometries and materials in a layer group.
   *
   * @param layer - The layer group to dispose
   */
  private disposeLayer(layer: THREE.Group): void {
    layer.traverse((child) => {
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
  }
}