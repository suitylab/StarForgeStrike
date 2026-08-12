import { Bullet } from './Bullet';
/**
 * BulletPool — a fixed-size object pool for managing reusable Bullet instances.
 *
 * The pool pre-allocates a fixed number of Bullet objects and recycles them via
 * get()/release() cycles. This avoids the performance cost of continuous mesh
 * creation/destruction, ensuring stable frame rates even with 100+ bullets on
 * screen (Phase 2 requirement).
 *
 * The pool is the sole source of bullets in the game. All bullet spawning
 * (player, enemies, wingmen) must request bullets through this pool.
 *
 * Performance characteristics:
 *   - get(): O(n) worst case (linear scan for first inactive bullet)
 *   - release(): O(1) via Set-based active tracking
 *   - update(): O(activeCount) for updating, O(1) per auto-release
 *   - clear(): O(activeCount)
 */
export class BulletPool {
    /**
     * Creates a new bullet pool and pre-allocates the specified number of bullets.
     *
     * @param scene - The THREE.js scene to add bullet meshes to
     * @param initialSize - Number of bullets to pre-allocate (default: 150)
     */
    constructor(scene, initialSize = 150) {
        /** All bullets in the pool (both active and inactive) */
        Object.defineProperty(this, "pool", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** Set of currently active bullets for O(1) membership checks and removal */
        Object.defineProperty(this, "activeSet", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Set()
        });
        /** Array of active bullets for efficient iteration (kept in sync with activeSet) */
        Object.defineProperty(this, "activeList", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** The THREE.js scene that bullets are added to */
        Object.defineProperty(this, "scene", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.scene = scene;
        // Pre-allocate the pool with sequential ids (0..initialSize-1)
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(new Bullet(this.scene, i));
        }
    }
    /**
     * Retrieves an inactive bullet from the pool and activates it.
     *
     * @returns {Bullet | null} An inactive bullet ready for spawning, or null if all bullets are active
     */
    get() {
        // Find the first inactive bullet in the pool
        const bullet = this.pool.find((b) => !b.active);
        if (bullet) {
            // Add to active tracking structures
            this.activeSet.add(bullet);
            this.activeList.push(bullet);
            return bullet;
        }
        // Pool exhausted — all bullets are currently active
        return null;
    }
    /**
     * Deactivates a bullet and returns it to the pool for reuse.
     * This method is idempotent — releasing an already-inactive bullet is a no-op.
     *
     * @param bullet - The bullet to release back to the pool
     */
    release(bullet) {
        // Idempotency check: if bullet is not in active set, it's already released
        if (!this.activeSet.has(bullet)) {
            return;
        }
        // Deactivate the bullet (hides mesh, sets active = false)
        bullet.deactivate();
        // Remove from active tracking — O(1) via Set
        this.activeSet.delete(bullet);
        // Remove from active list — O(n) but only on release (infrequent)
        const index = this.activeList.indexOf(bullet);
        if (index !== -1) {
            this.activeList.splice(index, 1);
        }
    }
    /**
     * Updates all active bullets and auto-releases any that go off-screen.
     *
     * @param delta - Time elapsed since last frame in seconds
     */
    update(delta) {
        // Iterate backwards to safely remove bullets during iteration
        for (let i = this.activeList.length - 1; i >= 0; i--) {
            const bullet = this.activeList[i];
            bullet.update(delta);
            // Check if bullet went off-screen and auto-release it
            const pos = bullet.mesh.position;
            if (pos.y > 12 || pos.y < -12 || pos.x < -12 || pos.x > 12) {
                this.release(bullet);
            }
        }
    }
    /**
     * Returns the number of currently active bullets.
     *
     * @returns {number} Active bullet count
     */
    getActiveCount() {
        return this.activeSet.size;
    }
    /**
     * Returns the number of currently inactive (available) bullets.
     *
     * @returns {number} Inactive bullet count
     */
    getInactiveCount() {
        return this.pool.length - this.activeSet.size;
    }
    /**
     * Returns the total number of bullets in the pool (both active and inactive).
     *
     * @returns {number} Total pool size
     */
    getTotalCount() {
        return this.pool.length;
    }
    /**
     * Returns the array of active bullets for collision detection.
     *
     * @returns {Bullet[]} Array of active bullets
     */
    getActive() {
        return this.activeList;
    }
    /**
     * Deactivates all active bullets and returns them to the pool.
     * Used when resetting the game state (e.g., level restart).
     */
    clear() {
        // Iterate backwards to safely remove during iteration
        for (let i = this.activeList.length - 1; i >= 0; i--) {
            this.release(this.activeList[i]);
        }
    }
}
