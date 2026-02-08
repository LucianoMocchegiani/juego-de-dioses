/**
 * Pipeline culling helper
 *
 * Encapsula la lógica de frustum culling reutilizando FrustumCache desde
 * `rendering/terrain/utils/culling.js`. Devuelve la instancia de cache
 * (posiblemente creada) y el listado de partículas visibles.
 */
import { FrustumCache } from '../../terrain/utils/culling.js';

/**
 * Obtener partículas visibles usando un FrustumCache (crear si es null)
 * @param {FrustumCache|null} frustumCache
 * @param {Array} particles
 * @param {THREE.Camera} camera
 * @param {number} cellSize
 * @returns {{frustumCache: FrustumCache, visible: Array}}
 */
export function getVisibleWithCache(frustumCache, particles, camera, cellSize) {
    if (!camera) {
        return { frustumCache: frustumCache || null, visible: particles };
    }

    let cache = frustumCache;
    if (!cache) {
        cache = new FrustumCache();
    }

    const visible = cache.getVisible(particles, camera, cellSize);
    return { frustumCache: cache, visible };
}

