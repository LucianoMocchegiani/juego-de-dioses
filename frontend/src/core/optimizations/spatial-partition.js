/**
 * Spatial Partition usando Grid
 * Organiza entidades/partículas en grid para queries eficientes
 * Reduce complejidad de búsquedas espaciales de O(n) a O(1) en el mejor caso
 */
export class SpatialGrid {
    constructor(cellSize = 10) {
        this.cellSize = cellSize;
        this.grid = new Map(); // "x,y,z" -> Set<entityId>
        this.entityPositions = new Map(); // entityId -> {x, y, z, cellKey}
        this.stats = {
            totalEntities: 0,
            totalCells: 0,
            queries: 0,
            averageEntitiesPerCell: 0
        };
    }
    
    /**
     * Obtener clave de celda para posición
     * @param {number} x - Posición X
     * @param {number} y - Posición Y
     * @param {number} z - Posición Z
     * @returns {string} Clave de celda
     */
    getCellKey(x, y, z) {
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        const cz = Math.floor(z / this.cellSize);
        return `${cx},${cy},${cz}`;
    }
    
    /**
     * Insertar entidad en grid
     * @param {number} entityId - ID de la entidad
     * @param {number} x - Posición X
     * @param {number} y - Posición Y
     * @param {number} z - Posición Z
     */
    insert(entityId, x, y, z) {
        // Remover de celda anterior si existe
        const oldData = this.entityPositions.get(entityId);
        if (oldData) {
            const oldCell = this.grid.get(oldData.cellKey);
            if (oldCell) {
                oldCell.delete(entityId);
                if (oldCell.size === 0) {
                    this.grid.delete(oldData.cellKey);
                }
            }
        }
        
        // Insertar en nueva celda
        const cellKey = this.getCellKey(x, y, z);
        if (!this.grid.has(cellKey)) {
            this.grid.set(cellKey, new Set());
        }
        this.grid.get(cellKey).add(entityId);
        this.entityPositions.set(entityId, { x, y, z, cellKey });
        
        this.stats.totalEntities = this.entityPositions.size;
        this.stats.totalCells = this.grid.size;
    }
    
    /**
     * Remover entidad del grid
     * @param {number} entityId - ID de la entidad
     */
    remove(entityId) {
        const data = this.entityPositions.get(entityId);
        if (!data) return;
        
        const cell = this.grid.get(data.cellKey);
        if (cell) {
            cell.delete(entityId);
            if (cell.size === 0) {
                this.grid.delete(data.cellKey);
            }
        }
        
        this.entityPositions.delete(entityId);
        this.stats.totalEntities = this.entityPositions.size;
        this.stats.totalCells = this.grid.size;
    }
    
    /**
     * Actualizar posición de entidad
     * @param {number} entityId - ID de la entidad
     * @param {number} x - Nueva posición X
     * @param {number} y - Nueva posición Y
     * @param {number} z - Nueva posición Z
     */
    update(entityId, x, y, z) {
        this.insert(entityId, x, y, z);
    }
    
    /**
     * Obtener entidades en una celda específica
     * @param {number} x - Posición X
     * @param {number} y - Posición Y
     * @param {number} z - Posición Z
     * @returns {Set<number>} Set de entity IDs
     */
    queryCell(x, y, z) {
        const cellKey = this.getCellKey(x, y, z);
        const cell = this.grid.get(cellKey);
        return cell ? new Set(cell) : new Set();
    }
    
    /**
     * Obtener entidades en rango (busca en celdas que intersecten el rango)
     * @param {number} x - Posición X centro
     * @param {number} y - Posición Y centro
     * @param {number} z - Posición Z centro
     * @param {number} radius - Radio de búsqueda
     * @returns {Set<number>} Set de entity IDs
     */
    queryRange(x, y, z, radius) {
        this.stats.queries++;
        const results = new Set();
        
        // Calcular celdas que intersectan con el rango
        const minCellX = Math.floor((x - radius) / this.cellSize);
        const maxCellX = Math.floor((x + radius) / this.cellSize);
        const minCellY = Math.floor((y - radius) / this.cellSize);
        const maxCellY = Math.floor((y + radius) / this.cellSize);
        const minCellZ = Math.floor((z - radius) / this.cellSize);
        const maxCellZ = Math.floor((z + radius) / this.cellSize);
        
        // Iterar sobre todas las celdas en el rango
        for (let cx = minCellX; cx <= maxCellX; cx++) {
            for (let cy = minCellY; cy <= maxCellY; cy++) {
                for (let cz = minCellZ; cz <= maxCellZ; cz++) {
                    const cellKey = `${cx},${cy},${cz}`;
                    const cell = this.grid.get(cellKey);
                    if (cell) {
                        cell.forEach(entityId => {
                            // Verificar distancia real (filtrar entidades fuera del radio)
                            const entityData = this.entityPositions.get(entityId);
                            if (entityData) {
                                const dx = entityData.x - x;
                                const dy = entityData.y - y;
                                const dz = entityData.z - z;
                                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                                if (distance <= radius) {
                                    results.add(entityId);
                                }
                            }
                        });
                    }
                }
            }
        }
        
        return results;
    }
    
    /**
     * Obtener todas las entidades en un bounding box
     * @param {number} minX - Mínimo X
     * @param {number} minY - Mínimo Y
     * @param {number} minZ - Mínimo Z
     * @param {number} maxX - Máximo X
     * @param {number} maxY - Máximo Y
     * @param {number} maxZ - Máximo Z
     * @returns {Set<number>} Set de entity IDs
     */
    queryBox(minX, minY, minZ, maxX, maxY, maxZ) {
        this.stats.queries++;
        const results = new Set();
        
        // Calcular celdas que intersectan con el box
        const minCellX = Math.floor(minX / this.cellSize);
        const maxCellX = Math.floor(maxX / this.cellSize);
        const minCellY = Math.floor(minY / this.cellSize);
        const maxCellY = Math.floor(maxY / this.cellSize);
        const minCellZ = Math.floor(minZ / this.cellSize);
        const maxCellZ = Math.floor(maxZ / this.cellSize);
        
        // Iterar sobre todas las celdas en el box
        for (let cx = minCellX; cx <= maxCellX; cx++) {
            for (let cy = minCellY; cy <= maxCellY; cy++) {
                for (let cz = minCellZ; cz <= maxCellZ; cz++) {
                    const cellKey = `${cx},${cy},${cz}`;
                    const cell = this.grid.get(cellKey);
                    if (cell) {
                        cell.forEach(entityId => {
                            // Verificar si realmente está dentro del box
                            const entityData = this.entityPositions.get(entityId);
                            if (entityData) {
                                if (entityData.x >= minX && entityData.x <= maxX &&
                                    entityData.y >= minY && entityData.y <= maxY &&
                                    entityData.z >= minZ && entityData.z <= maxZ) {
                                    results.add(entityId);
                                }
                            }
                        });
                    }
                }
            }
        }
        
        return results;
    }
    
    /**
     * Limpiar grid (remover todas las entidades)
     */
    clear() {
        this.grid.clear();
        this.entityPositions.clear();
        this.stats.totalEntities = 0;
        this.stats.totalCells = 0;
    }
    
    /**
     * Obtener estadísticas de uso
     * @returns {Object} Estadísticas del spatial grid
     */
    getStats() {
        const totalEntitiesInCells = Array.from(this.grid.values())
            .reduce((sum, cell) => sum + cell.size, 0);
        this.stats.averageEntitiesPerCell = this.stats.totalCells > 0
            ? (totalEntitiesInCells / this.stats.totalCells).toFixed(2)
            : 0;
        
        return {
            totalEntities: this.stats.totalEntities,
            totalCells: this.stats.totalCells,
            queries: this.stats.queries,
            averageEntitiesPerCell: this.stats.averageEntitiesPerCell,
            efficiency: parseFloat(this.stats.averageEntitiesPerCell) < 10 
                ? 'Excelente' 
                : parseFloat(this.stats.averageEntitiesPerCell) < 50 
                    ? 'Regular' 
                    : 'Baja'
        };
    }
    
    /**
     * Resetear estadísticas
     */
    resetStats() {
        this.stats = {
            totalEntities: this.entityPositions.size,
            totalCells: this.grid.size,
            queries: 0,
            averageEntitiesPerCell: 0
        };
    }
}
