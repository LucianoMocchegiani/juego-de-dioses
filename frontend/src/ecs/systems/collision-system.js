/**
 * Sistema de Colisiones
 * 
 * Detecta y resuelve colisiones con partículas sólidas del mundo.
 * Verifica colisiones laterales y suelo para entidades con componentes Position y Physics.
 */
import { System } from '../system.js';
import { ECS_CONSTANTS } from '../../config/ecs-constants.js';
import { ANIMATION_CONSTANTS } from '../../config/animation-constants.js';

export class CollisionSystem extends System {
    /**
     * @param {CollisionDetector} collisionDetector - Detector de colisiones
     * @param {string} bloqueId - ID del bloque
     * @param {Object} [dimension] - Información del bloque (para límites)
     * @param {Array} [particles] - Partículas ya cargadas del viewport (opcional)
     * @param {SpatialGrid} [spatialGrid] - Grid espacial para optimizar queries (opcional)
     */
    constructor(collisionDetector, bloqueId, dimension = null, particles = null, spatialGrid = null) {
        super();
        this.requiredComponents = [
            ECS_CONSTANTS.COMPONENT_NAMES.POSITION,
            ECS_CONSTANTS.COMPONENT_NAMES.PHYSICS
        ];
        this.collisionDetector = collisionDetector;
        this.bloqueId = bloqueId;
        this.dimension = dimension;
        this.particles = particles;
        this.spatialGrid = spatialGrid;
        this.priority = 2; // Ejecutar después de PhysicsSystem (priority 1)
        
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
        this.cacheInvalidationThreshold = ANIMATION_CONSTANTS.COLLISION.CACHE_INVALIDATION_THRESHOLD;
        
        /**
         * Mapa de celdas ocupadas basado en partículas cargadas
         * @type {Set<string>}
         */
        this.loadedOccupiedCells = null;
        
        // Pre-calcular celdas ocupadas si hay partículas cargadas
        if (this.particles && this.particles.length > 0) {
            this.updateLoadedCells();
        }
    }
    
    /**
     * Actualizar mapa de celdas ocupadas desde partículas cargadas
     */
    updateLoadedCells() {
        if (!this.particles) return;
        
        this.loadedOccupiedCells = new Set();
        for (const particle of this.particles) {
            if (particle.estado_nombre === ANIMATION_CONSTANTS.COLLISION.PARTICLE_STATE_SOLID) {
                const key = `${particle.celda_x},${particle.celda_y},${particle.celda_z}`;
                this.loadedOccupiedCells.add(key);
            }
        }
    }
    
    /**
     * Establecer partículas cargadas
     * @param {Array} particles - Partículas del viewport
     */
    setParticles(particles) {
        this.particles = particles;
        this.updateLoadedCells();
        // Invalidar cache de entidades
        this.entityCollisionCache.clear();
    }
    
    /**
     * Actualizar sistema de colisiones
     * @param {number} deltaTime - Tiempo transcurrido desde el último frame
     */
    update(deltaTime) {
        const entities = this.getEntities();
        
        for (const entityId of entities) {
            const position = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.POSITION);
            const physics = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.PHYSICS);
            
            if (!position || !physics) continue;
            
            // Actualizar spatial grid si está disponible
            if (this.spatialGrid) {
                this.spatialGrid.update(entityId, position.x, position.y, position.z);
            }
            
            // Usar partículas cargadas si están disponibles, sino usar cache o consultar
            let occupiedCells = this.loadedOccupiedCells;
            
            // Si no hay partículas cargadas, usar cache o consultar
            if (!occupiedCells) {
                occupiedCells = this.entityCollisionCache.get(entityId);
                
                // Si no hay cache, iniciar consulta async (no bloquea)
                if (!occupiedCells) {
                    // Iniciar consulta async
                    this.collisionDetector.checkCollision(
                        position, 2, this.bloqueId
                    ).then(cells => {
                        this.entityCollisionCache.set(entityId, cells);
                    }).catch(error => {
                        // console.error('Error en detección de colisiones:', error);
                    });
                    // Por ahora, usar set vacío hasta que llegue la respuesta
                    occupiedCells = new Set();
                }
            }
            
            // Verificar colisión en dirección de movimiento
            // X = izquierda/derecha, Y = adelante/atrás, Z = arriba/abajo
            const nextX = position.x + physics.velocity.x * deltaTime;
            const nextY = position.y + physics.velocity.y * deltaTime;
            const nextZ = position.z + physics.velocity.z * deltaTime;
            
            // Verificar colisión lateral X (izquierda/derecha)
            if (occupiedCells && this.collisionDetector.isCellOccupied(occupiedCells, nextX, position.y, position.z)) {
                physics.velocity.x = ANIMATION_CONSTANTS.COLLISION.POSITION_CORRECTION.VELOCITY_RESET;
            }
            
            // Verificar colisión lateral Y (adelante/atrás)
            if (occupiedCells && this.collisionDetector.isCellOccupied(occupiedCells, position.x, nextY, position.z)) {
                physics.velocity.y = ANIMATION_CONSTANTS.COLLISION.POSITION_CORRECTION.VELOCITY_RESET;
            }
            
            // Verificar suelo (debajo en Z)
            // X = izquierda/derecha, Y = adelante/atrás, Z = arriba/abajo
            const currentX = Math.floor(position.x);
            const currentY = Math.floor(position.y);
            const currentZ = Math.floor(position.z);
            const groundZ = currentZ - 1; // Z es altura, suelo está abajo
            
            // Verificar si hay suelo debajo
            let hasGround = false;
            if (occupiedCells && occupiedCells.size > 0) {
                // Verificar suelo directamente debajo
                hasGround = this.collisionDetector.isCellOccupied(occupiedCells, currentX, currentY, groundZ);
                
                // Si no hay suelo debajo, verificar si estamos dentro de una partícula sólida (ajustar hacia arriba)
                if (!hasGround && this.collisionDetector.isCellOccupied(occupiedCells, currentX, currentY, currentZ)) {
                    // Estamos dentro de una partícula sólida, mover hacia arriba
                    position.z = currentZ + ANIMATION_CONSTANTS.COLLISION.POSITION_CORRECTION.MIN_Z;
                    hasGround = false; // Aún no estamos en el suelo
                }
            } else {
                // Si no hay partículas cargadas, verificar límites del terreno
                // Si estamos muy abajo (z <= 1), asumir que hay suelo para prevenir caída infinita
                if (this.dimension && position.z <= ANIMATION_CONSTANTS.COLLISION.POSITION_CORRECTION.MIN_Z) {
                    hasGround = true;
                    position.z = ANIMATION_CONSTANTS.COLLISION.POSITION_CORRECTION.MIN_Z;
                    physics.velocity.z = ANIMATION_CONSTANTS.COLLISION.POSITION_CORRECTION.VELOCITY_RESET;
                }
            }
            
            if (hasGround) {
                physics.isGrounded = true;
                if (physics.velocity.z < ANIMATION_CONSTANTS.COLLISION.POSITION_CORRECTION.VELOCITY_RESET) { // Z es altura, negativo es hacia abajo
                    physics.velocity.z = ANIMATION_CONSTANTS.COLLISION.POSITION_CORRECTION.VELOCITY_RESET;
                    // Ajustar posición a superficie (arriba del suelo)
                    // Asegurar que esté exactamente arriba del suelo
                    position.z = groundZ + ANIMATION_CONSTANTS.COLLISION.POSITION_CORRECTION.MIN_Z;
                }
            } else {
                physics.isGrounded = false;
            }
            
            // Límites del terreno (prevenir caída infinita hacia abajo, pero permitir vuelo ilimitado hacia arriba)
            if (this.dimension) {
                const maxX = this.dimension.ancho_metros / this.dimension.tamano_celda;
                const maxY = this.dimension.alto_metros / this.dimension.tamano_celda;
                const minZ = this.dimension.profundidad_maxima || ANIMATION_CONSTANTS.COLLISION.DEFAULT_DIMENSION.MIN_Z;
                // No limitar altura máxima - permitir vuelo ilimitado hacia arriba para ver sol/luna
                // const maxZ = this.dimension.altura_maxima || ANIMATION_CONSTANTS.COLLISION.DEFAULT_DIMENSION.MAX_Z;
                
                // Limitar posición horizontal y profundidad mínima
                position.x = Math.max(0, Math.min(maxX - 1, position.x));
                position.y = Math.max(0, Math.min(maxY - 1, position.y));
                position.z = Math.max(minZ, position.z); // Solo limitar hacia abajo, no hacia arriba
                
                // Si cae fuera del terreno (hacia abajo), teleportar a superficie
                if (position.z < minZ) {
                    position.z = ANIMATION_CONSTANTS.COLLISION.DEFAULT_RESPAWN.Z;
                    position.x = ANIMATION_CONSTANTS.COLLISION.DEFAULT_RESPAWN.X;
                    position.y = ANIMATION_CONSTANTS.COLLISION.DEFAULT_RESPAWN.Y;
                    physics.velocity = {
                        x: ANIMATION_CONSTANTS.COLLISION.POSITION_CORRECTION.VELOCITY_RESET,
                        y: ANIMATION_CONSTANTS.COLLISION.POSITION_CORRECTION.VELOCITY_RESET,
                        z: ANIMATION_CONSTANTS.COLLISION.POSITION_CORRECTION.VELOCITY_RESET
                    };
                }
            }
            
            // Invalidar cache solo si la entidad se movió significativamente
            const lastPos = this.lastEntityPositions.get(entityId);
            if (lastPos) {
                const dx = Math.abs(position.x - lastPos.x);
                const dy = Math.abs(position.y - lastPos.y);
                const dz = Math.abs(position.z - lastPos.z);
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                
                if (distance > this.cacheInvalidationThreshold) {
                    this.entityCollisionCache.delete(entityId);
                }
            }
            
            // Actualizar última posición conocida
            this.lastEntityPositions.set(entityId, {
                x: position.x,
                y: position.y,
                z: position.z
            });
        }
    }
}

