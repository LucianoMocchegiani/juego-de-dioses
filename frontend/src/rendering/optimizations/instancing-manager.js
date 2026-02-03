import * as THREE from 'three';

/**
 * Gestor de Instancing para entidades similares
 * Agrupa entidades con mismo mesh/material en InstancedMesh
 * para reducir draw calls significativamente
 */
export class InstancingManager {
    constructor(scene) {
        this.scene = scene;
        this.instanceGroups = new Map(); // meshKey -> InstancedMesh
        this.instanceData = new Map(); // meshKey -> { entityId -> instanceIndex }
        this.stats = {
            totalGroups: 0,
            totalInstances: 0,
            savedDrawCalls: 0
        };
    }
    
    /**
     * Generar clave única para agrupar instancias
     * @param {THREE.BufferGeometry} geometry - Geometría del mesh
     * @param {THREE.Material} material - Material del mesh
     * @returns {string} Clave única
     */
    generateMeshKey(geometry, material) {
        const geoId = geometry.uuid || geometry.id || 'unknown';
        const matId = material.uuid || material.id || 'unknown';
        return `${geoId}_${matId}`;
    }
    
    /**
     * Crear o obtener instancia agrupada
     * @param {string} meshKey - Clave única para el tipo de mesh (ej: "tree_01")
     * @param {THREE.BufferGeometry} geometry - Geometría del mesh
     * @param {THREE.Material} material - Material del mesh
     * @param {number} maxInstances - Máximo de instancias (default: 1000)
     * @returns {THREE.InstancedMesh} Instancia agrupada
     */
    getOrCreateInstanceGroup(meshKey, geometry, material, maxInstances = 1000) {
        if (this.instanceGroups.has(meshKey)) {
            return this.instanceGroups.get(meshKey);
        }
        
        const instancedMesh = new THREE.InstancedMesh(geometry, material, maxInstances);
        instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        instancedMesh.frustumCulled = true; // Habilitar frustum culling en instancias
        this.instanceGroups.set(meshKey, instancedMesh);
        this.instanceData.set(meshKey, new Map()); // entityId -> instanceIndex
        
        if (this.scene) {
            this.scene.add(instancedMesh);
        }
        
        this.stats.totalGroups++;
        return instancedMesh;
    }
    
    /**
     * Agregar entidad a grupo de instancias
     * @param {number} entityId - ID de la entidad
     * @param {string} meshKey - Clave del grupo
     * @param {THREE.BufferGeometry} geometry - Geometría
     * @param {THREE.Material} material - Material
     * @returns {number|null} Index de la instancia o null si falla
     */
    addEntity(entityId, meshKey, geometry, material) {
        const instancedMesh = this.getOrCreateInstanceGroup(meshKey, geometry, material);
        const data = this.instanceData.get(meshKey);
        
        // Buscar slot disponible
        const maxInstances = instancedMesh.count;
        let instanceIndex = -1;
        
        for (let i = 0; i < maxInstances; i++) {
            if (!Array.from(data.values()).includes(i)) {
                instanceIndex = i;
                break;
            }
        }
        
        if (instanceIndex === -1) {
            // No hay slots disponibles
            return null;
        }
        
        data.set(entityId, instanceIndex);
        this.stats.totalInstances++;
        
        // Inicializar matriz con identidad (se actualizará después)
        const matrix = new THREE.Matrix4();
        instancedMesh.setMatrixAt(instanceIndex, matrix);
        
        return instanceIndex;
    }
    
    /**
     * Remover entidad de grupo de instancias
     * @param {number} entityId - ID de la entidad
     * @param {string} meshKey - Clave del grupo
     */
    removeEntity(entityId, meshKey) {
        const data = this.instanceData.get(meshKey);
        if (!data) return;
        
        const instanceIndex = data.get(entityId);
        if (instanceIndex === undefined) return;
        
        // Marcar instancia como no usada (matriz identidad)
        const instancedMesh = this.instanceGroups.get(meshKey);
        if (instancedMesh) {
            const matrix = new THREE.Matrix4();
            instancedMesh.setMatrixAt(instanceIndex, matrix);
            instancedMesh.instanceMatrix.needsUpdate = true;
        }
        
        data.delete(entityId);
        this.stats.totalInstances--;
    }
    
    /**
     * Actualizar transformación de una instancia
     * @param {string} meshKey - Clave del grupo
     * @param {number} entityId - ID de la entidad
     * @param {THREE.Matrix4} matrix - Matriz de transformación
     * @returns {boolean} True si se actualizó correctamente
     */
    updateInstanceTransform(meshKey, entityId, matrix) {
        const data = this.instanceData.get(meshKey);
        if (!data) return false;
        
        const instanceIndex = data.get(entityId);
        if (instanceIndex === undefined) return false;
        
        const instancedMesh = this.instanceGroups.get(meshKey);
        if (!instancedMesh) return false;
        
        instancedMesh.setMatrixAt(instanceIndex, matrix);
        instancedMesh.instanceMatrix.needsUpdate = true;
        
        return true;
    }
    
    /**
     * Obtener índice de instancia para una entidad
     * @param {string} meshKey - Clave del grupo
     * @param {number} entityId - ID de la entidad
     * @returns {number|null} Índice de instancia o null
     */
    getInstanceIndex(meshKey, entityId) {
        const data = this.instanceData.get(meshKey);
        if (!data) return null;
        return data.get(entityId) ?? null;
    }
    
    /**
     * Limpiar instancias no usadas
     */
    cleanup() {
        // Por ahora, solo limpiar datos vacíos
        for (const [meshKey, data] of this.instanceData.entries()) {
            if (data.size === 0) {
                const instancedMesh = this.instanceGroups.get(meshKey);
                if (instancedMesh && this.scene) {
                    this.scene.remove(instancedMesh);
                    instancedMesh.dispose();
                }
                this.instanceGroups.delete(meshKey);
                this.instanceData.delete(meshKey);
                this.stats.totalGroups--;
            }
        }
    }
    
    /**
     * Obtener estadísticas de uso
     * @returns {Object} Estadísticas de instancing
     */
    getStats() {
        // Calcular draw calls ahorrados (asumiendo que sin instancing cada entidad sería 1 draw call)
        const totalEntities = Array.from(this.instanceData.values())
            .reduce((sum, data) => sum + data.size, 0);
        this.stats.savedDrawCalls = Math.max(0, totalEntities - this.stats.totalGroups);
        
        return {
            totalGroups: this.stats.totalGroups,
            totalInstances: this.stats.totalInstances,
            savedDrawCalls: this.stats.savedDrawCalls,
            efficiency: this.stats.totalGroups > 0 && this.stats.savedDrawCalls > 50 
                ? 'Excelente' 
                : this.stats.savedDrawCalls > 10 
                    ? 'Regular' 
                    : 'Baja'
        };
    }
    
    /**
     * Resetear estadísticas
     */
    resetStats() {
        this.stats = {
            totalGroups: this.instanceGroups.size,
            totalInstances: Array.from(this.instanceData.values())
                .reduce((sum, data) => sum + data.size, 0),
            savedDrawCalls: 0
        };
    }
}
