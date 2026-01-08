/**
 * Frame Scheduler
 * Distribuye trabajo pesado a lo largo de múltiples frames
 * para evitar sobrecarga en un solo frame
 */
export class FrameScheduler {
    constructor() {
        this.updateQueues = new Map(); // frequency -> Set<entityId>
        this.frameCounter = 0;
        this.stats = {
            totalRegistrations: 0,
            totalUpdates: 0,
            skippedUpdates: 0
        };
    }
    
    /**
     * Registrar entidad para actualización con frecuencia específica
     * @param {number} entityId - ID de la entidad
     * @param {number} frequency - Cada cuántos frames actualizar (1 = cada frame, 2 = cada 2 frames, etc.)
     */
    register(entityId, frequency = 1) {
        if (!this.updateQueues.has(frequency)) {
            this.updateQueues.set(frequency, new Set());
        }
        this.updateQueues.get(frequency).add(entityId);
        this.stats.totalRegistrations++;
    }
    
    /**
     * Desregistrar entidad
     * @param {number} entityId - ID de la entidad
     */
    unregister(entityId) {
        for (const queue of this.updateQueues.values()) {
            if (queue.delete(entityId)) {
                this.stats.totalRegistrations--;
            }
        }
    }
    
    /**
     * Actualizar frecuencia de actualización para una entidad
     * @param {number} entityId - ID de la entidad
     * @param {number} oldFrequency - Frecuencia anterior
     * @param {number} newFrequency - Nueva frecuencia
     */
    updateFrequency(entityId, oldFrequency, newFrequency) {
        if (oldFrequency !== newFrequency) {
            const oldQueue = this.updateQueues.get(oldFrequency);
            if (oldQueue) {
                oldQueue.delete(entityId);
            }
            this.register(entityId, newFrequency);
        }
    }
    
    /**
     * Obtener entidades que deben actualizarse este frame
     * @returns {Set<number>} Set de entity IDs
     */
    getEntitiesToUpdate() {
        const entitiesToUpdate = new Set();
        this.frameCounter++;
        this.stats.totalUpdates++;
        
        for (const [frequency, entityIds] of this.updateQueues.entries()) {
            if (this.frameCounter % frequency === 0) {
                entityIds.forEach(id => entitiesToUpdate.add(id));
            } else {
                this.stats.skippedUpdates += entityIds.size;
            }
        }
        
        return entitiesToUpdate;
    }
    
    /**
     * Verificar si una entidad debe actualizarse este frame
     * @param {number} entityId - ID de la entidad
     * @returns {boolean} True si debe actualizarse
     */
    shouldUpdate(entityId) {
        const entitiesToUpdate = this.getEntitiesToUpdate();
        return entitiesToUpdate.has(entityId);
    }
    
    /**
     * Reset frame counter (si es necesario)
     */
    reset() {
        this.frameCounter = 0;
    }
    
    /**
     * Obtener estadísticas de uso
     * @returns {Object} Estadísticas del frame scheduler
     */
    getStats() {
        const totalScheduled = Array.from(this.updateQueues.values())
            .reduce((sum, queue) => sum + queue.size, 0);
        const skipRate = this.stats.totalUpdates > 0 && this.stats.skippedUpdates > 0
            ? (this.stats.skippedUpdates / (this.stats.totalUpdates * totalScheduled)) * 100
            : 0;
        
        return {
            totalRegistrations: this.stats.totalRegistrations,
            totalUpdates: this.stats.totalUpdates,
            skippedUpdates: this.stats.skippedUpdates,
            totalScheduled: totalScheduled,
            skipRate: skipRate.toFixed(2) + '%',
            efficiency: skipRate > 30 ? 'Excelente' : skipRate > 10 ? 'Regular' : 'Baja'
        };
    }
    
    /**
     * Resetear estadísticas
     */
    resetStats() {
        this.stats = {
            totalRegistrations: Array.from(this.updateQueues.values())
                .reduce((sum, queue) => sum + queue.size, 0),
            totalUpdates: 0,
            skippedUpdates: 0
        };
    }
}
