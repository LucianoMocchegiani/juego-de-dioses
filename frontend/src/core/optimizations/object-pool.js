/**
 * Sistema de Object Pooling para objetos reutilizables
 * Reduce garbage collection reutilizando objetos temporales
 * 
 * Este sistema es especialmente útil para objetos Three.js (Vector3, Quaternion, Euler, Matrix4)
 * que se crean frecuentemente para cálculos temporales.
 * 
 * @example
 * const pool = new ObjectPool(
 *     () => new THREE.Vector3(),
 *     (v) => v.set(0, 0, 0),
 *     20  // Pool inicial de 20 objetos
 * );
 * 
 * const vec = pool.acquire();  // Obtener objeto del pool
 * // ... usar vec ...
 * pool.release(vec);  // Devolver al pool
 */
export class ObjectPool {
    /**
     * Crear un nuevo Object Pool
     * @param {Function} createFn - Función que crea un nuevo objeto
     * @param {Function|null} resetFn - Función que resetea un objeto antes de reutilizarlo (opcional)
     * @param {number} initialSize - Tamaño inicial del pool (default: 10)
     */
    constructor(createFn, resetFn, initialSize = 10) {
        if (typeof createFn !== 'function') {
            throw new Error('createFn debe ser una función');
        }
        
        this.pool = [];
        this.createFn = createFn;
        this.resetFn = resetFn || null;
        this.totalCreated = 0;
        this.totalReused = 0;
        
        // Pre-crear objetos iniciales
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(createFn());
            this.totalCreated++;
        }
    }
    
    /**
     * Obtener un objeto del pool (o crear uno nuevo si el pool está vacío)
     * @returns {*} Objeto del pool
     */
    acquire() {
        if (this.pool.length > 0) {
            this.totalReused++;
            return this.pool.pop();
        }
        // Pool vacío, crear nuevo objeto
        this.totalCreated++;
        return this.createFn();
    }
    
    /**
     * Devolver un objeto al pool
     * @param {*} obj - Objeto a devolver
     */
    release(obj) {
        if (!obj) {
            return; // No hacer nada si obj es null/undefined
        }
        
        // Resetear objeto antes de agregarlo al pool
        if (this.resetFn) {
            this.resetFn(obj);
        }
        
        this.pool.push(obj);
    }
    
    /**
     * Limpiar el pool (liberar todos los objetos)
     * Útil cuando se necesita liberar memoria
     */
    clear() {
        this.pool.length = 0;
    }
    
    /**
     * Obtener estadísticas del pool
     * @returns {Object} Estadísticas del pool
     */
    getStats() {
        const totalOperations = this.totalCreated + this.totalReused;
        return {
            poolSize: this.pool.length,
            totalCreated: this.totalCreated,
            totalReused: this.totalReused,
            reuseRate: totalOperations > 0 ? (this.totalReused / totalOperations) * 100 : 0
        };
    }
}
