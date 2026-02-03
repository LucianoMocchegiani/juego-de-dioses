/**
 * Sistema de Object Pooling para objetos reutilizables
 */
export class ObjectPool {
    constructor(createFn, resetFn, initialSize = 10) {
        if (typeof createFn !== 'function') throw new Error('createFn debe ser una función');
        this.pool = [];
        this.createFn = createFn;
        this.resetFn = resetFn || null;
        this.totalCreated = 0;
        this.totalReused = 0;
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(createFn());
            this.totalCreated++;
        }
    }

    acquire() {
        if (this.pool.length > 0) {
            this.totalReused++;
            return this.pool.pop();
        }
        this.totalCreated++;
        return this.createFn();
    }

    release(obj) {
        if (!obj) return;
        if (this.resetFn) this.resetFn(obj);
        this.pool.push(obj);
    }

    clear() { this.pool.length = 0; }

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
