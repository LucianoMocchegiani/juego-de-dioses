/**
 * Sistema de Render Batching
 * Agrupa actualizaciones de renderizado para mejor rendimiento
 */
export class RenderBatcher {
    constructor() {
        this.batches = new Map(); // material UUID -> meshes[]
        this.needsUpdate = false;
        this.stats = {
            totalMeshes: 0,
            totalBatches: 0,
            averageBatchSize: 0
        };
    }
    
    /**
     * Agregar mesh a un batch
     * @param {THREE.Mesh} mesh - Mesh a agregar
     */
    add(mesh) {
        if (!mesh || !mesh.material) return;
        
        const materialKey = mesh.material.uuid || 'default';
        if (!this.batches.has(materialKey)) {
            this.batches.set(materialKey, []);
        }
        this.batches.get(materialKey).push(mesh);
        this.needsUpdate = true;
    }
    
    /**
     * Limpiar batches (llamar al final de cada frame)
     */
    clear() {
        this.batches.clear();
        this.needsUpdate = false;
        this.stats.totalMeshes = 0;
        this.stats.totalBatches = 0;
        this.stats.averageBatchSize = 0;
    }
    
    /**
     * Obtener batches agrupados por material
     * @returns {Map} Map de material UUID -> meshes[]
     */
    getBatches() {
        return this.batches;
    }
    
    /**
     * Actualizar estadísticas
     */
    updateStats() {
        this.stats.totalMeshes = 0;
        this.stats.totalBatches = this.batches.size;
        
        for (const meshes of this.batches.values()) {
            this.stats.totalMeshes += meshes.length;
        }
        
        this.stats.averageBatchSize = this.stats.totalBatches > 0 
            ? (this.stats.totalMeshes / this.stats.totalBatches).toFixed(2)
            : 0;
    }
    
    /**
     * Obtener estadísticas de uso
     * @returns {Object} Estadísticas de batching
     */
    getStats() {
        this.updateStats();
        return {
            totalMeshes: this.stats.totalMeshes,
            totalBatches: this.stats.totalBatches,
            averageBatchSize: this.stats.averageBatchSize,
            efficiency: this.stats.averageBatchSize > 5 ? 'Excelente' : this.stats.averageBatchSize > 2 ? 'Regular' : 'Baja'
        };
    }
}
