/**
 * Helper para Gestión de Cache de Colisiones
 * 
 * Gestiona el cache de partículas ocupadas por entidad, invalidación basada en movimiento
 * y actualización de celdas ocupadas desde partículas cargadas.
 */
import { ANIMATION_CONSTANTS } from '../../../../../config/animation-constants.js';

export class CollisionCacheManager {
    constructor(animationConstants = ANIMATION_CONSTANTS) {
        this.animationConstants = animationConstants;
        
        /**
         * Cache de partículas ocupadas por entidad (para evitar consultas repetidas)
         * @type {Map<number, Set<string>>}
         */
        this.entityCollisionCache = new Map();
        
        /**
         * Últimas posiciones conocidas de las entidades (para invalidar cache solo cuando se mueven)
         * @type {Map<number, {x: number, y: number, z: number}>}
         */
        this.lastEntityPositions = new Map();
        
        /**
         * Umbral de movimiento para invalidar cache (en celdas)
         * @type {number}
         */
        this.cacheInvalidationThreshold = animationConstants.COLLISION.CACHE_INVALIDATION_THRESHOLD;
        
        /**
         * Mapa de celdas ocupadas basado en partículas cargadas
         * @type {Set<string>}
         */
        this.loadedOccupiedCells = null;
    }

    /**
     * Actualizar mapa de celdas ocupadas desde partículas cargadas
     * @param {Array} particles - Partículas del viewport
     */
    updateLoadedCells(particles) {
        if (!particles) return;
        
        this.loadedOccupiedCells = new Set();
        for (const particle of particles) {
            if (particle.estado_nombre === this.animationConstants.COLLISION.PARTICLE_STATE_SOLID) {
                const key = `${particle.celda_x},${particle.celda_y},${particle.celda_z}`;
                this.loadedOccupiedCells.add(key);
            }
        }
    }

    /**
     * Obtener celdas ocupadas para una entidad (usando cache, cargadas o consultando)
     * @param {number} entityId - ID de la entidad
     * @param {Object} position - Posición {x, y, z}
     * @param {CollisionDetector} collisionDetector - Detector de colisiones
     * @param {string} bloqueId - ID del bloque
     * @returns {Set<string>} Celdas ocupadas
     */
    getOccupiedCells(entityId, position, collisionDetector, bloqueId) {
        // Usar partículas cargadas si están disponibles
        if (this.loadedOccupiedCells) {
            return this.loadedOccupiedCells;
        }
        
        // Si no hay partículas cargadas, usar cache o consultar
        let occupiedCells = this.entityCollisionCache.get(entityId);
        
        // Si no hay cache, iniciar consulta async (no bloquea)
        if (!occupiedCells) {
            // Iniciar consulta async
            collisionDetector.checkCollision(
                position, 2, bloqueId
            ).then(cells => {
                this.entityCollisionCache.set(entityId, cells);
            }).catch(error => {
                // console.error('Error en detección de colisiones:', error);
            });
            // Por ahora, usar set vacío hasta que llegue la respuesta
            occupiedCells = new Set();
        }
        
        return occupiedCells;
    }

    /**
     * Invalidar cache si la entidad se movió significativamente
     * @param {number} entityId - ID de la entidad
     * @param {Object} position - Posición actual {x, y, z}
     * @returns {boolean} True si el cache fue invalidado
     */
    invalidateCacheIfNeeded(entityId, position) {
        const lastPos = this.lastEntityPositions.get(entityId);
        if (lastPos) {
            const dx = Math.abs(position.x - lastPos.x);
            const dy = Math.abs(position.y - lastPos.y);
            const dz = Math.abs(position.z - lastPos.z);
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            if (distance > this.cacheInvalidationThreshold) {
                this.entityCollisionCache.delete(entityId);
                return true;
            }
        }
        return false;
    }

    /**
     * Actualizar última posición conocida de la entidad
     * @param {number} entityId - ID de la entidad
     * @param {Object} position - Posición {x, y, z}
     */
    updateLastPosition(entityId, position) {
        this.lastEntityPositions.set(entityId, {
            x: position.x,
            y: position.y,
            z: position.z
        });
    }

    /**
     * Limpiar cache completo
     */
    clearCache() {
        this.entityCollisionCache.clear();
        this.lastEntityPositions.clear();
    }

    /**
     * Limpiar cache de una entidad específica
     * @param {number} entityId - ID de la entidad
     */
    clearEntityCache(entityId) {
        this.entityCollisionCache.delete(entityId);
        this.lastEntityPositions.delete(entityId);
    }

    /**
     * Obtener celdas ocupadas cargadas
     * @returns {Set<string>|null} Celdas ocupadas cargadas o null
     */
    getLoadedOccupiedCells() {
        return this.loadedOccupiedCells;
    }

    /**
     * Establecer celdas ocupadas cargadas
     * @param {Set<string>|null} cells - Celdas ocupadas o null
     */
    setLoadedOccupiedCells(cells) {
        this.loadedOccupiedCells = cells;
    }
}
