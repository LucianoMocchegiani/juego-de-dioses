/**
 * Sistema de Colisiones
 * 
 * Detecta y resuelve colisiones con partículas sólidas del mundo.
 * Verifica colisiones laterales y suelo para entidades con componentes Position y Physics.
 */
import { System } from '../../../core/system.js';
import { ECS_CONSTANTS } from '../../../../../config/ecs-constants.js';
import { ANIMATION_CONSTANTS } from '../../../../../config/animation-constants.js';
import { CollisionCacheManager } from '../helpers/collision-cache-manager.js';
import { CollisionDetectorHelper } from '../helpers/collision-detector-helper.js';
import { LiquidDetector } from '../helpers/liquid-detector.js';
import { TerrainBoundsChecker } from '../helpers/terrain-bounds-checker.js';

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
        
        // Instanciar helpers
        this.collisionCacheManager = new CollisionCacheManager(ANIMATION_CONSTANTS);
        this.collisionDetectorHelper = new CollisionDetectorHelper(collisionDetector, ANIMATION_CONSTANTS);
        this.liquidDetector = new LiquidDetector(ANIMATION_CONSTANTS);
        this.terrainBoundsChecker = new TerrainBoundsChecker(ANIMATION_CONSTANTS);
        
        // Pre-calcular celdas ocupadas si hay partículas cargadas
        if (this.particles && this.particles.length > 0) {
            this.collisionCacheManager.updateLoadedCells(this.particles);
        }
    }
    
    /**
     * Actualizar mapa de celdas ocupadas desde partículas cargadas
     */
    updateLoadedCells() {
        this.collisionCacheManager.updateLoadedCells(this.particles);
    }
    
    /**
     * Detectar si hay líquidos en la posición dada
     * @param {Object} position - Posición {x, y, z}
     * @returns {boolean} True si hay líquidos en la posición
     */
    detectLiquidAtPosition(position) {
        return this.liquidDetector.detectLiquidAtPosition(position, this.particles);
    }
    
    /**
     * Establecer partículas cargadas
     * @param {Array} particles - Partículas del viewport
     */
    setParticles(particles) {
        this.particles = particles;
        this.collisionCacheManager.updateLoadedCells(this.particles);
        // Invalidar cache de entidades
        this.collisionCacheManager.clearCache();
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
            
            // Obtener celdas ocupadas usando cache manager
            const occupiedCells = this.collisionCacheManager.getOccupiedCells(
                entityId,
                position,
                this.collisionDetector,
                this.bloqueId
            );
            
            // Verificar colisiones laterales (X/Y)
            this.collisionDetectorHelper.checkLateralCollisions(
                position,
                physics,
                deltaTime,
                occupiedCells
            );
            
            // Verificar colisión con suelo (Z)
            this.collisionDetectorHelper.checkGroundCollision(
                position,
                physics,
                occupiedCells,
                this.dimension
            );
            
            // Verificar límites del terreno y respawn si es necesario
            this.terrainBoundsChecker.checkAndApplyBounds(
                position,
                physics,
                this.dimension
            );
            
            // Invalidar cache solo si la entidad se movió significativamente
            this.collisionCacheManager.invalidateCacheIfNeeded(entityId, position);
            
            // Detectar agua/líquidos
            physics.isInWater = this.liquidDetector.detectLiquidAtPosition(position, this.particles);
            
            // Actualizar última posición conocida
            this.collisionCacheManager.updateLastPosition(entityId, position);
        }
    }
}

