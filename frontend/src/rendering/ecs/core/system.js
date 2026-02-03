/**
 * Clase base para sistemas ECS
 * 
 * Los sistemas contienen la lógica y operan sobre componentes específicos.
 * Cada sistema debe extender esta clase e implementar el método update().
 */
export class System {
    constructor() {
        /**
         * ECS Manager que gestiona este sistema
         * @type {ECSManager|null}
         */
        this.ecs = null;
        
        /**
         * Si el sistema está habilitado
         * @type {boolean}
         */
        this.enabled = true;
        
        /**
         * Prioridad del sistema (menor número = mayor prioridad)
         * @type {number}
         */
        this.priority = 0;
        
        /**
         * Tipos de componentes requeridos por este sistema
         * @type {Array<string>}
         */
        this.requiredComponents = [];
    }
    
    /**
     * Establecer el ECS Manager
     * @param {ECSManager|null} ecs - ECS Manager
     */
    setECSManager(ecs) {
        this.ecs = ecs;
    }
    
    /**
     * Obtener entidades que tienen los componentes requeridos
     * @returns {Set<number>} Set de IDs de entidades
     */
    getEntities() {
        if (!this.ecs) {
            return new Set();
        }
        
        if (this.requiredComponents.length === 0) {
            return this.ecs.query();
        }
        
        return this.ecs.query(...this.requiredComponents);
    }
    
    /**
     * Actualizar el sistema
     * Este método debe ser implementado por las clases hijas
     * @param {number} deltaTime - Tiempo transcurrido desde el último frame (en segundos)
     */
    update(deltaTime) {
        throw new Error('System.update() must be implemented by subclass');
    }
    
    /**
     * Inicializar el sistema
     * Puede ser sobrescrito por clases hijas
     */
    init() {
        // Override en subclases si es necesario
    }
    
    /**
     * Limpiar recursos del sistema
     * Puede ser sobrescrito por clases hijas
     */
    destroy() {
        // Override en subclases si es necesario
    }
}

