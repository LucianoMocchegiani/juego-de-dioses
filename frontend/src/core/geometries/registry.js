/**
 * Registry de geometrías que mapea tipos abstractos a implementaciones Three.js
 * 
 * Los parámetros son RELATIVOS a tamano_celda de la dimensión.
 * Tamaño absoluto = parametro × tamano_celda × escala
 */
import * as THREE from 'three';

export class GeometryRegistry {
    constructor() {
        this.geometries = new Map();
        this.registerDefaults();
    }
    
    /**
     * Registrar factories de geometrías por defecto
     */
    registerDefaults() {
        // Box
        this.register('box', (params, cellSize) => {
            const scaled = this.scaleParams(params, cellSize);
            return new THREE.BoxGeometry(
                scaled.width || cellSize,
                scaled.height || cellSize,
                scaled.depth || cellSize
            );
        });
        
        // Sphere
        this.register('sphere', (params, cellSize) => {
            const scaled = this.scaleParams(params, cellSize);
            return new THREE.SphereGeometry(
                scaled.radius || cellSize * 0.5,
                scaled.segments || 16
            );
        });
        
        // Cylinder
        this.register('cylinder', (params, cellSize) => {
            const scaled = this.scaleParams(params, cellSize);
            return new THREE.CylinderGeometry(
                scaled.radiusTop !== undefined ? scaled.radiusTop : (scaled.radius || cellSize * 0.5),
                scaled.radiusBottom !== undefined ? scaled.radiusBottom : (scaled.radius || cellSize * 0.5),
                scaled.height || cellSize,
                scaled.segments || 8
            );
        });
        
        // Cone
        this.register('cone', (params, cellSize) => {
            const scaled = this.scaleParams(params, cellSize);
            return new THREE.ConeGeometry(
                scaled.radius || cellSize * 0.5,
                scaled.height || cellSize,
                scaled.segments || 8
            );
        });
        
        // Torus
        this.register('torus', (params, cellSize) => {
            const scaled = this.scaleParams(params, cellSize);
            return new THREE.TorusGeometry(
                scaled.radius || cellSize * 0.5,
                scaled.tube || cellSize * 0.2,
                scaled.radialSegments || 8,
                scaled.tubularSegments || 8
            );
        });
    }
    
    /**
     * Escalar parámetros relativos a tamaño absoluto
     * Tamaño absoluto = parametro × tamano_celda
     * 
     * @param {Object} params - Parámetros relativos
     * @param {number} cellSize - Tamaño de celda en metros
     * @returns {Object} - Parámetros escalados (NO incluye segments, que son números de divisiones)
     */
    scaleParams(params, cellSize) {
        const scaled = { ...params };
        
        // Escalar dimensiones físicas
        const physicalParams = ['width', 'height', 'depth', 'radius', 'radiusTop', 'radiusBottom', 'tube'];
        physicalParams.forEach(key => {
            if (scaled[key] !== undefined && scaled[key] !== null) {
                scaled[key] = scaled[key] * cellSize;
            }
        });
        
        // NO escalar segments (número de divisiones, no es una dimensión física)
        // segments, radialSegments, tubularSegments se mantienen como están
        
        return scaled;
    }
    
    /**
     * Registrar una nueva geometría
     * @param {string} tipo - Tipo de geometría (ej: 'box', 'sphere')
     * @param {Function} factory - Factory function: (params, cellSize) => THREE.Geometry
     */
    register(tipo, factory) {
        this.geometries.set(tipo, factory);
    }
    
    /**
     * Crear geometría Three.js desde definición
     * @param {string} tipo - Tipo de geometría
     * @param {Object} params - Parámetros relativos a tamano_celda
     * @param {number} cellSize - Tamaño de celda en metros (default: 0.25)
     * @returns {THREE.BufferGeometry} - Geometría Three.js
     */
    create(tipo, params = {}, cellSize = 0.25) {
        const factory = this.geometries.get(tipo);
        if (!factory) {
            // console.warn(`Geometría desconocida: ${tipo}, usando box`);
            return new THREE.BoxGeometry(cellSize, cellSize, cellSize);
        }
        
        try {
            return factory(params, cellSize);
        } catch (error) {
            // console.error(`Error creando geometría ${tipo}:`, error);
            return new THREE.BoxGeometry(cellSize, cellSize, cellSize);
        }
    }
}
