/**
 * Converts a THREE.Box3 to a lightweight 2D AABB.
 * Only the X and Y axes are extracted — the Z-axis is ignored
 * since gameplay collisions happen on the X-Y plane.
 *
 * @param box - The THREE.Box3 to convert
 * @returns {AABB} The lightweight 2D bounding box
 */
export function box3ToAABB(box) {
    return {
        minX: box.min.x,
        maxX: box.max.x,
        minY: box.min.y,
        maxY: box.max.y,
    };
}
/**
 * Checks if two 2D AABBs overlap.
 * Uses the standard AABB overlap test: boxes intersect if they
 * overlap on both the X and Y axes. The comparison is inclusive,
 * so touching edges count as an intersection.
 *
 * @param a - First AABB
 * @param b - Second AABB
 * @returns {boolean} True if the two AABBs overlap
 */
export function aabbIntersects(a, b) {
    return (a.minX <= b.maxX &&
        a.maxX >= b.minX &&
        a.minY <= b.maxY &&
        a.maxY >= b.minY);
}
/**
 * Checks if two THREE.Box3 objects intersect.
 * This is the primary collision check used by the game loop.
 * Both Box3s are converted to lightweight AABBs and tested
 * for overlap on the X-Y plane.
 *
 * @param a - First THREE.Box3
 * @param b - Second THREE.Box3
 * @returns {boolean} True if the two boxes intersect
 */
export function boxIntersects(a, b) {
    return aabbIntersects(box3ToAABB(a), box3ToAABB(b));
}
/**
 * Gets the AABB of a game entity that exposes a getBounds() method.
 * This provides a clean abstraction for collision checks against
 * any entity (Bullet, Enemy, Player, etc.) that implements the
 * getBounds() contract.
 *
 * @param entity - An entity with a getBounds() method returning a THREE.Box3
 * @returns {AABB} The entity's bounding box as a lightweight 2D AABB
 */
export function getEntityAABB(entity) {
    return box3ToAABB(entity.getBounds());
}
