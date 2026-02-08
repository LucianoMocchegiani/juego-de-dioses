/**
 * Limiter helpers for particles pipeline
 *
 * Encapsula adaptive limiting y limitación por densidad delegando en
 * las clases existentes `adaptiveLimiter` y `particleLimiter`.
 */

/**
 * Apply adaptive limit (set particleLimiter.maxParticles from adaptiveLimiter)
 * @param {Object|null} adaptiveLimiter - expected to implement getCurrentLimit() and performanceManager
 * @param {Object|null} particleLimiter - expected to implement maxParticles, setMaxParticles(limit)
 * @returns {{changed:boolean, previous:number, current:number, fps:number}}
 */
export function applyAdaptiveLimit(adaptiveLimiter, particleLimiter) {
    if (!adaptiveLimiter || !particleLimiter) {
        return { changed: false, previous: particleLimiter?.maxParticles ?? 0, current: particleLimiter?.maxParticles ?? 0, fps: 0 };
    }

    const adaptiveLimit = adaptiveLimiter.getCurrentLimit();
    const previousLimit = particleLimiter.maxParticles;
    particleLimiter.setMaxParticles(adaptiveLimit);
    const fps = adaptiveLimiter.performanceManager?.getMetrics?.()?.fps || 0;
    return { changed: adaptiveLimit !== previousLimit, previous: previousLimit, current: adaptiveLimit, fps };
}

/**
 * Apply density-based limiting using particleLimiter.limitParticlesWithDensity
 * @param {Array} particles
 * @param {Object} particleLimiter
 * @param {THREE.Vector3} referencePosition
 * @param {number} cellSize
 * @param {number} nearDistance
 * @param {number} farDistance
 * @param {Object} waterOptions
 * @returns {Array} - limited particles
 */
export function applyDensityLimit(particles, particleLimiter, referencePosition, cellSize, nearDistance, farDistance, waterOptions) {
    if (!particleLimiter || !referencePosition || particles.length === 0) {
        return particles;
    }

    try {
        return particleLimiter.limitParticlesWithDensity(particles, referencePosition, cellSize, nearDistance, farDistance, waterOptions);
    } catch (err) {
        return particles;
    }
}

