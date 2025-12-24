/**
 * Collision Detector
 * 
 * Detecta colisiones con partículas sólidas del mundo.
 * Consulta partículas en un área pequeña alrededor de una posición y crea un mapa de celdas ocupadas.
 */
export class CollisionDetector {
    /**
     * @param {ParticlesApi} particlesApi - API para consultar partículas
     * @param {number} cellSize - Tamaño de celda en metros
     */
    constructor(particlesApi, cellSize) {
        this.particlesApi = particlesApi;
        this.cellSize = cellSize;
        
        /**
         * Cache de colisiones por área
         * @type {Map<string, Set<string>>}
         */
        this.collisionCache = new Map();
        
        /**
         * Límite máximo de entradas en el cache
         * @type {number}
         */
        this.maxCacheSize = 100;
    }
    
    /**
     * Verificar colisiones en un área alrededor de una posición
     * @param {Object} position - Posición {x, y, z} en celdas
     * @param {number} radius - Radio de búsqueda en celdas (default: 2)
     * @param {string} bloqueId - ID del bloque
     * @returns {Promise<Set<string>>} Set de claves de celdas ocupadas (formato: "x,y,z")
     */
    async checkCollision(position, radius = 2, bloqueId) {
        // Calcular área de colisión
        const xMin = Math.floor(position.x - radius);
        const xMax = Math.floor(position.x + radius);
        const yMin = Math.floor(position.y - radius);
        const yMax = Math.floor(position.y + radius);
        const zMin = Math.floor(position.z - radius);
        const zMax = Math.floor(position.z + radius);
        
        // Verificar cache
        const cacheKey = `${bloqueId}-${xMin}-${xMax}-${yMin}-${yMax}-${zMin}-${zMax}`;
        if (this.collisionCache.has(cacheKey)) {
            return this.collisionCache.get(cacheKey);
        }
        
        try {
            // Consultar partículas en área pequeña
            const particlesData = await this.particlesApi.getParticles(
                bloqueId,
                { x_min: xMin, x_max: xMax, y_min: yMin, y_max: yMax, z_min: zMin, z_max: zMax }
            );
            
            // Filtrar solo partículas sólidas
            const solidParticles = particlesData.particles.filter(p => p.estado_nombre === 'solido');
            
            // Crear mapa de posiciones ocupadas
            const occupiedCells = new Set();
            for (const particle of solidParticles) {
                const key = `${particle.celda_x},${particle.celda_y},${particle.celda_z}`;
                occupiedCells.add(key);
            }
            
            // Cachear resultado
            this.collisionCache.set(cacheKey, occupiedCells);
            
            // Limitar tamaño del cache
            if (this.collisionCache.size > this.maxCacheSize) {
                const firstKey = this.collisionCache.keys().next().value;
                this.collisionCache.delete(firstKey);
            }
            
            return occupiedCells;
        } catch (error) {
            // console.error('Error al consultar partículas para colisiones:', error);
            // Retornar set vacío en caso de error
            return new Set();
        }
    }
    
    /**
     * Verificar si una celda está ocupada
     * @param {Set<string>} occupiedCells - Set de celdas ocupadas
     * @param {number} x - Coordenada X en celdas
     * @param {number} y - Coordenada Y en celdas
     * @param {number} z - Coordenada Z en celdas
     * @returns {boolean} True si la celda está ocupada
     */
    isCellOccupied(occupiedCells, x, y, z) {
        const key = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
        return occupiedCells.has(key);
    }
    
    /**
     * Limpiar cache de colisiones
     */
    clearCache() {
        this.collisionCache.clear();
    }
}
