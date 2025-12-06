/**
 * Sistema de Colisiones
 * 
 * Detecta y resuelve colisiones con partículas sólidas del mundo.
 * Verifica colisiones laterales y suelo para entidades con componentes Position y Physics.
 */
import { System } from '../system.js';

export class CollisionSystem extends System {
    /**
     * @param {CollisionDetector} collisionDetector - Detector de colisiones
     * @param {string} dimensionId - ID de la dimensión
     * @param {Object} [dimension] - Información de la dimensión (para límites)
     * @param {Array} [particles] - Partículas ya cargadas del viewport (opcional)
     */
    constructor(collisionDetector, dimensionId, dimension = null, particles = null) {
        super();
        this.requiredComponents = ['Position', 'Physics'];
        this.collisionDetector = collisionDetector;
        this.dimensionId = dimensionId;
        this.dimension = dimension;
        this.particles = particles;
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
        this.cacheInvalidationThreshold = 2;
        
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
            if (particle.estado_nombre === 'solido') {
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
            const position = this.ecs.getComponent(entityId, 'Position');
            const physics = this.ecs.getComponent(entityId, 'Physics');
            
            if (!position || !physics) continue;
            
            // Usar partículas cargadas si están disponibles, sino usar cache o consultar
            let occupiedCells = this.loadedOccupiedCells;
            
            // Si no hay partículas cargadas, usar cache o consultar
            if (!occupiedCells) {
                occupiedCells = this.entityCollisionCache.get(entityId);
                
                // Si no hay cache, iniciar consulta async (no bloquea)
                if (!occupiedCells) {
                    // Iniciar consulta async
                    this.collisionDetector.checkCollision(
                        position, 2, this.dimensionId
                    ).then(cells => {
                        this.entityCollisionCache.set(entityId, cells);
                    }).catch(error => {
                        console.error('Error en detección de colisiones:', error);
                    });
                    // Por ahora, usar set vacío hasta que llegue la respuesta
                    occupiedCells = new Set();
                }
            }
            
            // Verificar colisión en dirección de movimiento
            const nextX = position.x + physics.velocity.x * deltaTime;
            const nextY = position.y + physics.velocity.y * deltaTime;
            const nextZ = position.z + physics.velocity.z * deltaTime;
            
            // Verificar colisión lateral X
            if (occupiedCells && this.collisionDetector.isCellOccupied(occupiedCells, nextX, position.y, position.z)) {
                physics.velocity.x = 0;
            }
            
            // Verificar colisión lateral Z
            if (occupiedCells && this.collisionDetector.isCellOccupied(occupiedCells, position.x, position.y, nextZ)) {
                physics.velocity.z = 0;
            }
            
            // Verificar suelo (debajo)
            const groundX = Math.floor(position.x);
            const groundY = Math.floor(position.y) - 1;
            const groundZ = Math.floor(position.z);
            
            if (occupiedCells && this.collisionDetector.isCellOccupied(occupiedCells, groundX, groundY, groundZ)) {
                physics.isGrounded = true;
                if (physics.velocity.y < 0) {
                    physics.velocity.y = 0;
                    // Ajustar posición a superficie
                    position.y = Math.floor(position.y) + 1;
                }
            } else {
                physics.isGrounded = false;
            }
            
            // Límites del terreno (prevenir caída infinita)
            if (this.dimension) {
                const maxX = this.dimension.ancho_metros / this.dimension.tamano_celda;
                const maxY = this.dimension.alto_metros / this.dimension.tamano_celda;
                const minZ = this.dimension.profundidad_maxima || -10;
                const maxZ = this.dimension.altura_maxima || 40;
                
                // Limitar posición
                position.x = Math.max(0, Math.min(maxX - 1, position.x));
                position.y = Math.max(0, Math.min(maxY - 1, position.y));
                position.z = Math.max(minZ, Math.min(maxZ, position.z));
                
                // Si cae fuera del terreno, teleportar a superficie
                if (position.z < minZ) {
                    position.z = 1;
                    position.x = 80;
                    position.y = 80;
                    physics.velocity = { x: 0, y: 0, z: 0 };
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

