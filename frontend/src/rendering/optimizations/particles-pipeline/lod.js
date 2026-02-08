/**
 * LOD helper for particles pipeline
 *
 * This module delegates to the existing lodManager if available.
 */

/**
 * Apply LOD optimization using provided lodManager.
 * @param {Array} particles
 * @param {Object|null} lodManager - expected to implement applyLOD(particles, referencePosition, cellSize)
 * @param {THREE.Vector3} referencePosition
 * @param {number} cellSize
 * @returns {Array} - filtered/modified particles
 */
export function applyLOD(particles, lodManager, referencePosition, cellSize) {
    if (!lodManager || !referencePosition || particles.length === 0) {
        return particles;
    }

    // Delegate to existing manager implementation to preserve behavior.
    try {
        return lodManager.applyLOD(particles, referencePosition, cellSize);
    } catch (err) {
        // On error, return original particles to avoid breaking render flow.
        // The renderer will still log the error if needed.
        return particles;
    }
}

