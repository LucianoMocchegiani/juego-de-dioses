/**
 * Registry de geometrías que mapea tipos abstractos a implementaciones Three.js
 */
import * as THREE from 'three';

export class GeometryRegistry {
    constructor() {
        this.geometries = new Map();
        this.registerDefaults();
    }

    registerDefaults() {
        this.register('box', (params, cellSize) => {
            const scaled = this.scaleParams(params, cellSize);
            return new THREE.BoxGeometry(scaled.width || cellSize, scaled.height || cellSize, scaled.depth || cellSize);
        });
        this.register('sphere', (params, cellSize) => {
            const scaled = this.scaleParams(params, cellSize);
            return new THREE.SphereGeometry(scaled.radius || cellSize * 0.5, scaled.segments || 16);
        });
        this.register('cylinder', (params, cellSize) => {
            const scaled = this.scaleParams(params, cellSize);
            return new THREE.CylinderGeometry(
                scaled.radiusTop !== undefined ? scaled.radiusTop : (scaled.radius || cellSize * 0.5),
                scaled.radiusBottom !== undefined ? scaled.radiusBottom : (scaled.radius || cellSize * 0.5),
                scaled.height || cellSize,
                scaled.segments || 8
            );
        });
        this.register('cone', (params, cellSize) => {
            const scaled = this.scaleParams(params, cellSize);
            return new THREE.ConeGeometry(scaled.radius || cellSize * 0.5, scaled.height || cellSize, scaled.segments || 8);
        });
        this.register('torus', (params, cellSize) => {
            const scaled = this.scaleParams(params, cellSize);
            return new THREE.TorusGeometry(scaled.radius || cellSize * 0.5, scaled.tube || cellSize * 0.2, scaled.radialSegments || 8, scaled.tubularSegments || 8);
        });
    }

    scaleParams(params, cellSize) {
        const scaled = { ...params };
        const physicalParams = ['width', 'height', 'depth', 'radius', 'radiusTop', 'radiusBottom', 'tube'];
        physicalParams.forEach(key => {
            if (scaled[key] !== undefined && scaled[key] !== null) scaled[key] = scaled[key] * cellSize;
        });
        return scaled;
    }

    register(tipo, factory) {
        this.geometries.set(tipo, factory);
    }

    create(tipo, params = {}, cellSize = 0.25) {
        const factory = this.geometries.get(tipo);
        if (!factory) return new THREE.BoxGeometry(cellSize, cellSize, cellSize);
        try {
            return factory(params, cellSize);
        } catch (error) {
            return new THREE.BoxGeometry(cellSize, cellSize, cellSize);
        }
    }
}
