/**
 * Utilidades de geometría
 */
/**
 * @typedef {import('../types.js').Particle} Particle
 */

/**
 * Calcular bounding box de partículas
 * @param {Array<Particle>} particles - Array de partículas
 * @returns {Object} - Bounding box con min/max para x, y, z
 */
export function calculateBoundingBox(particles) {
    if (!particles || particles.length === 0) {
        return {
            minX: 0, maxX: 0,
            minY: 0, maxY: 0,
            minZ: 0, maxZ: 0
        };
    }
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    particles.forEach(particle => {
        minX = Math.min(minX, particle.celda_x);
        maxX = Math.max(maxX, particle.celda_x);
        minY = Math.min(minY, particle.celda_y);
        maxY = Math.max(maxY, particle.celda_y);
        minZ = Math.min(minZ, particle.celda_z);
        maxZ = Math.max(maxZ, particle.celda_z);
    });
    
    return { minX, maxX, minY, maxY, minZ, maxZ };
}

/**
 * Calcular centro de partículas
 * @param {Array<Particle>} particles - Array de partículas
 * @returns {Object} - Centro con x, y, z
 */
export function calculateCenter(particles) {
    if (!particles || particles.length === 0) {
        return { x: 0, y: 0, z: 0 };
    }
    
    const bbox = calculateBoundingBox(particles);
    
    return {
        x: (bbox.minX + bbox.maxX) / 2,
        y: (bbox.minY + bbox.maxY) / 2,
        z: (bbox.minZ + bbox.maxZ) / 2
    };
}

/**
 * Calcular tamaño de bounding box
 * @param {Array<Particle>} particles - Array de partículas
 * @returns {Object} - Tamaño con width, height, depth
 */
export function calculateSize(particles) {
    if (!particles || particles.length === 0) {
        return { width: 0, height: 0, depth: 0 };
    }
    
    const bbox = calculateBoundingBox(particles);
    
    return {
        width: bbox.maxX - bbox.minX + 1,
        height: bbox.maxZ - bbox.minZ + 1, // Z es altura en Three.js
        depth: bbox.maxY - bbox.minY + 1
    };
}

