/**
 * Frame Scheduler - Distribuye trabajo pesado a lo largo de múltiples frames
 */
export class FrameScheduler {
    constructor() {
        this.updateQueues = new Map();
        this.frameCounter = 0;
        this.stats = { totalRegistrations: 0, totalUpdates: 0, skippedUpdates: 0 };
    }

    register(entityId, frequency = 1) {
        if (!this.updateQueues.has(frequency)) this.updateQueues.set(frequency, new Set());
        this.updateQueues.get(frequency).add(entityId);
        this.stats.totalRegistrations++;
    }

    unregister(entityId) {
        for (const queue of this.updateQueues.values()) {
            if (queue.delete(entityId)) this.stats.totalRegistrations--;
        }
    }

    updateFrequency(entityId, oldFrequency, newFrequency) {
        if (oldFrequency !== newFrequency) {
            const oldQueue = this.updateQueues.get(oldFrequency);
            if (oldQueue) oldQueue.delete(entityId);
            this.register(entityId, newFrequency);
        }
    }

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

    shouldUpdate(entityId) {
        return this.getEntitiesToUpdate().has(entityId);
    }

    reset() { this.frameCounter = 0; }

    getStats() {
        const totalScheduled = Array.from(this.updateQueues.values()).reduce((sum, q) => sum + q.size, 0);
        const skipRate = this.stats.totalUpdates > 0 && this.stats.skippedUpdates > 0
            ? (this.stats.skippedUpdates / (this.stats.totalUpdates * Math.max(1, totalScheduled))) * 100 : 0;
        return {
            totalRegistrations: this.stats.totalRegistrations,
            totalUpdates: this.stats.totalUpdates,
            skippedUpdates: this.stats.skippedUpdates,
            totalScheduled,
            skipRate: skipRate.toFixed(2) + '%'
        };
    }

    resetStats() {
        this.stats = {
            totalRegistrations: Array.from(this.updateQueues.values()).reduce((sum, q) => sum + q.size, 0),
            totalUpdates: 0,
            skippedUpdates: 0
        };
    }
}
