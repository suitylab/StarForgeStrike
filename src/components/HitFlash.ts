import * as THREE from 'three';

/**
 * HitFlash — a reusable hit-flash (glow) effect for boss meshes.
 *
 * When triggered, the boss briefly flashes white-hot before restoring its
 * original appearance. Handles both MeshStandardMaterial (via emissive) and
 * MeshBasicMaterial (via color), capturing the original state only on the
 * first trigger so overlapping hits don't corrupt the stored originals.
 */
export class HitFlash {
  /** The root group whose descendants are flashed */
  private readonly mesh: THREE.Group;

  /** Time remaining for the flash effect (seconds) */
  private timer: number = 0;

  /** Duration of the flash in seconds */
  private readonly duration: number = 0.12;

  /** Captured original material states, used for restoration */
  private states: HitFlashMaterialState[] = [];

  constructor(mesh: THREE.Group) {
    this.mesh = mesh;
  }

  /**
   * Triggers the white flash on the boss mesh.
   * Safe to call repeatedly — overlapping hits extend the flash timer without
   * re-capturing the (already white) flash state as the "original".
   */
  public trigger(): void {
    if (this.timer <= 0) {
      this.capture();
    }
    this.apply();
    this.timer = this.duration;
  }

  /**
   * Advances the flash timer and restores the original materials on expiry.
   *
   * @param delta - Time elapsed since last frame in seconds
   */
  public update(delta: number): void {
    if (this.timer <= 0) return;
    this.timer -= delta;
    if (this.timer <= 0) {
      this.restore();
    }
  }

  /**
   * Immediately restores the original material appearance and clears the flash.
   * Called when the boss is deactivated so a pending flash can't leak into respawn.
   */
  public reset(): void {
    if (this.timer > 0 || this.states.length > 0) {
      this.restore();
    }
    this.timer = 0;
  }

  /**
   * Captures the original emissive/color state of every material in the mesh.
   */
  private capture(): void {
    this.states = [];
    this.mesh.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const material = child.material as THREE.Material;
      if (material instanceof THREE.MeshStandardMaterial) {
        this.states.push({
          material,
          color: null,
          emissive: material.emissive.clone(),
          emissiveIntensity: material.emissiveIntensity,
        });
      } else if (material instanceof THREE.MeshBasicMaterial) {
        this.states.push({
          material,
          color: material.color.clone(),
          emissive: null,
          emissiveIntensity: 1,
        });
      }
    });
  }

  /**
   * Applies the white-hot flash to all captured materials.
   */
  private apply(): void {
    for (const state of this.states) {
      if (state.emissive !== null) {
        (state.material as THREE.MeshStandardMaterial).emissive.set(0xffffff);
        (state.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.0;
      } else if (state.color !== null) {
        (state.material as THREE.MeshBasicMaterial).color.set(0xffffff);
      }
    }
  }

  /**
   * Restores the original appearance of all captured materials.
   */
  private restore(): void {
    for (const state of this.states) {
      if (state.emissive !== null) {
        const mat = state.material as THREE.MeshStandardMaterial;
        mat.emissive.copy(state.emissive);
        mat.emissiveIntensity = state.emissiveIntensity;
      } else if (state.color !== null) {
        (state.material as THREE.MeshBasicMaterial).color.copy(state.color);
      }
    }
    this.states = [];
  }
}

/**
 * Internal state tracking a single material's original appearance.
 */
interface HitFlashMaterialState {
  material: THREE.Material;
  /** Original color for MeshBasicMaterial, or null for standard materials */
  color: THREE.Color | null;
  /** Original emissive for MeshStandardMaterial, or null for basic materials */
  emissive: THREE.Color | null;
  /** Original emissiveIntensity for MeshStandardMaterial */
  emissiveIntensity: number;
}