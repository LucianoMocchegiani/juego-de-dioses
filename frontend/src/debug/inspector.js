/**
 * Inspector de estado ECS para debugging
 */
import { DEBUG_CONFIG } from './config.js';

export class ECSInspector {
    constructor(ecs) {
        this.ecs = ecs;
        const config = DEBUG_CONFIG.inspector;
        this.enabled = config.enabled && DEBUG_CONFIG.enabled;
        this.cacheEnabled = config.cacheEnabled ?? true;
        this.maxCacheSize = config.maxCacheSize ?? 100;
        this.cache = new Map(); // Cache de inspecciones
    }
    
    /**
     * Obtener información de una entidad
     * @param {number} entityId - ID de la entidad
     * @returns {Object|null} Información de la entidad o null si está deshabilitado
     */
    inspectEntity(entityId) {
        if (!this.enabled) return null;
        
        // Verificar cache
        if (this.cacheEnabled && this.cache.has(entityId)) {
            return this.cache.get(entityId);
        }
        
        const components = {};
        const componentTypes = this.ecs.getComponentTypes();
        
        for (const componentType of componentTypes) {
            const component = this.ecs.getComponent(entityId, componentType);
            if (component) {
                components[componentType] = this.serializeComponent(component);
            }
        }
        
        const info = {
            entityId,
            components,
            componentCount: Object.keys(components).length
        };
        
        // Guardar en cache
        if (this.cacheEnabled) {
            this.cache.set(entityId, info);
            // Limitar tamaño del cache
            if (this.cache.size > this.maxCacheSize) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }
        }
        
        return info;
    }
    
    /**
     * Buscar entidades por componente o valor
     * @param {Object} query - Query de búsqueda { hasComponent, componentValue, etc. }
     * @returns {Array} Entidades que coinciden
     */
    findEntities(query) {
        if (!this.enabled) return [];
        
        const results = [];
        const entities = this.ecs.query();
        
        for (const entityId of entities) {
            const info = this.inspectEntity(entityId);
            if (this.matchesQuery(info, query)) {
                results.push(info);
            }
        }
        
        return results;
    }
    
    /**
     * Verificar si una entidad coincide con la query
     * @param {Object} info - Información de la entidad
     * @param {Object} query - Query de búsqueda
     * @returns {boolean} Si coincide
     */
    matchesQuery(info, query) {
        // Buscar por componente
        if (query.hasComponent) {
            if (!(query.hasComponent in info.components)) {
                return false;
            }
        }
        
        // Buscar por valor de componente
        if (query.componentValue) {
            const { componentType, property, value } = query.componentValue;
            const component = info.components[componentType];
            if (!component || component[property] !== value) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Obtener estadísticas del ECS
     * @returns {Object|null} Estadísticas o null si está deshabilitado
     */
    getStats() {
        if (!this.enabled) return null;
        
        const entities = this.ecs.query();
        const componentCounts = {};
        const componentTypes = this.ecs.getComponentTypes();
        
        // Inicializar contadores
        for (const componentType of componentTypes) {
            componentCounts[componentType] = 0;
        }
        
        // Contar componentes
        for (const entityId of entities) {
            for (const componentType of componentTypes) {
                if (this.ecs.hasComponent(entityId, componentType)) {
                    componentCounts[componentType]++;
                }
            }
        }
        
        return {
            totalEntities: entities.size,
            componentCounts,
            systems: this.ecs.getSystems().map(s => ({
                name: s.constructor.name,
                enabled: s.enabled,
                priority: s.priority
            }))
        };
    }
    
    /**
     * Serializar componente de forma segura
     * @param {Object} component - Componente a serializar
     * @returns {Object} Componente serializado
     */
    serializeComponent(component) {
        const serialized = {};
        for (const key in component) {
            if (key === 'mesh' || key === 'userData') {
                // Omitir objetos Three.js grandes
                serialized[key] = '[Object]';
            } else if (typeof component[key] === 'object' && component[key] !== null) {
                // Serializar objetos simples
                try {
                    serialized[key] = JSON.parse(JSON.stringify(component[key]));
                } catch (e) {
                    serialized[key] = '[Object]';
                }
            } else {
                serialized[key] = component[key];
            }
        }
        return serialized;
    }
    
    /**
     * Limpiar cache
     */
    clearCache() {
        this.cache.clear();
    }
    
    /**
     * Habilitar/deshabilitar inspector
     * @param {boolean} enabled - Si está habilitado
     */
    setEnabled(enabled) {
        this.enabled = enabled && DEBUG_CONFIG.enabled;
    }
}
