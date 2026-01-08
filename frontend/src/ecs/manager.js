/**
 * ECS Manager - Sistema de Entidades, Componentes y Sistemas
 * 
 * Este es el núcleo del sistema ECS que gestiona entidades, componentes y sistemas.
 * 
 * Conceptos:
 * - Entity: ID único que identifica una entidad
 * - Component: Datos puros (sin lógica)
 * - System: Lógica que opera sobre componentes específicos
 */
export class ECSManager {
    constructor() {
        /**
         * Contador de IDs de entidades
         * @type {number}
         */
        this.nextEntityId = 1;
        
        /**
         * Map de componentes por tipo
         * Estructura: Map<ComponentType, Map<EntityId, ComponentData>>
         * @type {Map<string, Map<number, Object>>}
         */
        this.components = new Map();
        
        /**
         * Map de entidades con sus componentes
         * Estructura: Map<EntityId, Set<ComponentType>>
         * @type {Map<number, Set<string>>}
         */
        this.entities = new Map();
        
        /**
         * Lista de sistemas registrados
         * @type {Array<System>}
         */
        this.systems = [];
        
        /**
         * Cache de queries para optimización
         * @type {Map<string, Set<number>>}
         */
        this.queryCache = new Map();
        
        /**
         * Cache del ordenamiento de sistemas (optimización JDG-047)
         * @type {Array<System>|null}
         */
        this.sortedSystems = null;
        
        /**
         * Flag para indicar que el ordenamiento de sistemas está desactualizado
         * @type {boolean}
         */
        this.systemsDirty = true;
        
        /**
         * Estadísticas de uso del cache (para debugging)
         * @type {Object}
         */
        this.cacheStats = {
            totalUpdates: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
    }
    
    /**
     * Crear una nueva entidad
     * @returns {number} ID de la entidad creada
     */
    createEntity() {
        const entityId = this.nextEntityId++;
        this.entities.set(entityId, new Set());
        return entityId;
    }
    
    /**
     * Eliminar una entidad y todos sus componentes
     * @param {number} entityId - ID de la entidad
     */
    destroyEntity(entityId) {
        if (!this.entities.has(entityId)) {
            return;
        }
        
        // Eliminar todos los componentes de la entidad
        const componentTypes = this.entities.get(entityId);
        for (const componentType of componentTypes) {
            this.removeComponent(entityId, componentType);
        }
        
        // Eliminar la entidad
        this.entities.delete(entityId);
        
        // Invalidar cache de queries
        this.queryCache.clear();
    }
    
    /**
     * Agregar un componente a una entidad
     * @param {number} entityId - ID de la entidad
     * @param {string} componentType - Tipo del componente
     * @param {Object} componentData - Datos del componente
     */
    addComponent(entityId, componentType, componentData) {
        if (!this.entities.has(entityId)) {
            throw new Error(`Entity ${entityId} does not exist`);
        }
        
        // Inicializar Map de componentes si no existe
        if (!this.components.has(componentType)) {
            this.components.set(componentType, new Map());
        }
        
        // Agregar componente
        const componentMap = this.components.get(componentType);
        componentMap.set(entityId, componentData);
        
        // Registrar componente en la entidad
        this.entities.get(entityId).add(componentType);
        
        // Invalidar cache de queries
        this.queryCache.clear();
    }
    
    /**
     * Obtener un componente de una entidad
     * @param {number} entityId - ID de la entidad
     * @param {string} componentType - Tipo del componente
     * @returns {Object|undefined} Datos del componente o undefined si no existe
     */
    getComponent(entityId, componentType) {
        const componentMap = this.components.get(componentType);
        if (!componentMap) {
            return undefined;
        }
        return componentMap.get(entityId);
    }
    
    /**
     * Verificar si una entidad tiene un componente
     * @param {number} entityId - ID de la entidad
     * @param {string} componentType - Tipo del componente
     * @returns {boolean} True si la entidad tiene el componente
     */
    hasComponent(entityId, componentType) {
        const componentMap = this.components.get(componentType);
        if (!componentMap) {
            return false;
        }
        return componentMap.has(entityId);
    }
    
    /**
     * Eliminar un componente de una entidad
     * @param {number} entityId - ID de la entidad
     * @param {string} componentType - Tipo del componente
     */
    removeComponent(entityId, componentType) {
        const componentMap = this.components.get(componentType);
        if (componentMap) {
            componentMap.delete(entityId);
        }
        
        const entityComponents = this.entities.get(entityId);
        if (entityComponents) {
            entityComponents.delete(componentType);
        }
        
        // Invalidar cache de queries
        this.queryCache.clear();
    }
    
    /**
     * Obtener todas las entidades que tienen los componentes especificados
     * @param {...string} componentTypes - Tipos de componentes requeridos
     * @returns {Set<number>} Set de IDs de entidades que tienen todos los componentes
     */
    query(...componentTypes) {
        // Crear clave de cache
        const cacheKey = componentTypes.sort().join(',');
        
        // Verificar cache
        if (this.queryCache.has(cacheKey)) {
            return this.queryCache.get(cacheKey);
        }
        
        // Si no hay componentes requeridos, retornar todas las entidades
        if (componentTypes.length === 0) {
            return new Set(this.entities.keys());
        }
        
        // Obtener entidades que tienen el primer componente
        const firstComponentMap = this.components.get(componentTypes[0]);
        if (!firstComponentMap || firstComponentMap.size === 0) {
            const emptySet = new Set();
            this.queryCache.set(cacheKey, emptySet);
            return emptySet;
        }
        
        let result = new Set(firstComponentMap.keys());
        
        // Filtrar por los demás componentes
        for (let i = 1; i < componentTypes.length; i++) {
            const componentMap = this.components.get(componentTypes[i]);
            if (!componentMap || componentMap.size === 0) {
                const emptySet = new Set();
                this.queryCache.set(cacheKey, emptySet);
                return emptySet;
            }
            
            // Intersectar con entidades que tienen este componente
            result = new Set([...result].filter(id => componentMap.has(id)));
        }
        
        // Cachear resultado
        this.queryCache.set(cacheKey, result);
        
        return result;
    }
    
    /**
     * Registrar un sistema
     * @param {System} system - Sistema a registrar
     */
    registerSystem(system) {
        this.systems.push(system);
        system.setECSManager(this);
        this.systemsDirty = true; // Marcar como sucio para reordenar
    }
    
    /**
     * Eliminar un sistema
     * @param {System} system - Sistema a eliminar
     */
    unregisterSystem(system) {
        const index = this.systems.indexOf(system);
        if (index !== -1) {
            this.systems.splice(index, 1);
            system.setECSManager(null);
            this.systemsDirty = true; // Marcar como sucio para reordenar
        }
    }
    
    /**
     * Establecer métricas de debugging
     * @param {DebugMetrics} debugMetrics - Instancia de DebugMetrics
     */
    setDebugMetrics(debugMetrics) {
        this.debugMetrics = debugMetrics;
    }
    
    /**
     * Actualizar todos los sistemas registrados
     * @param {number} deltaTime - Tiempo transcurrido desde el último frame (en segundos)
     */
    update(deltaTime) {
        // Iniciar medición de frame
        if (this.debugMetrics) {
            this.debugMetrics.startFrame();
        }
        
        // Reordenar sistemas solo si es necesario (optimización JDG-047)
        // Esto evita O(n log n) cada frame cuando los sistemas no cambian
        if (this.systemsDirty || !this.sortedSystems) {
            this.sortedSystems = [...this.systems].sort((a, b) => a.priority - b.priority);
            this.systemsDirty = false;
            this.cacheStats.cacheMisses++;
            this.cacheStats.totalUpdates++;
        } else {
            // Cache hit: se está usando el cache
            this.cacheStats.cacheHits++;
            this.cacheStats.totalUpdates++;
        }
        
        for (const system of this.sortedSystems) {
            if (system.enabled) {
                if (this.debugMetrics) {
                    const entityCount = system.getEntities().size;
                    this.debugMetrics.startSystem(system.constructor.name);
                    system.update(deltaTime);
                    this.debugMetrics.endSystem(system.constructor.name, entityCount);
                } else {
                    system.update(deltaTime);
                }
            }
        }
        
        // Finalizar medición de frame
        if (this.debugMetrics) {
            this.debugMetrics.endFrame();
        }
    }
    
    /**
     * Obtener estadísticas del ECS
     * @returns {Object} Estadísticas (número de entidades, componentes, sistemas)
     */
    getStats() {
        const componentStats = {};
        for (const [componentType, componentMap] of this.components.entries()) {
            componentStats[componentType] = componentMap.size;
        }
        
        return {
            entities: this.entities.size,
            components: componentStats,
            systems: this.systems.length,
            queries: this.queryCache.size
        };
    }
    
    /**
     * Obtener tipos de componentes disponibles
     * @returns {Array<string>} Array de tipos de componentes
     */
    getComponentTypes() {
        return Array.from(this.components.keys());
    }
    
    /**
     * Obtener sistemas registrados
     * @returns {Array<System>} Array de sistemas
     */
    getSystems() {
        return [...this.systems];
    }
}

