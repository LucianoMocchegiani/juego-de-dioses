/**
 * Gestor de Level of Detail (LOD) para partículas
 * 
 * Reduce el detalle de partículas lejanas según su distancia a la cámara,
 * optimizando el rendimiento al reducir el número de polígonos renderizados.
 */
import * as THREE from 'three';
import {
    LOD_DISTANCE_THRESHOLDS,
    LOD_SPHERE_SEGMENTS
} from '../../../config/particle-optimization-config.js';

export class LODManager {
    /**
     * @param {GeometryRegistry} geometryRegistry - Registry de geometrías
     */
    constructor(geometryRegistry) {
        this.geometryRegistry = geometryRegistry;
        this.lodCache = new Map(); // Cache de geometrías LOD
        
        // Umbrales de distancia para cada nivel LOD (en metros)
        this.distanceThresholds = LOD_DISTANCE_THRESHOLDS;
    }
    
    /**
     * Obtener nivel LOD según distancia
     * @param {number} distance - Distancia en metros
     * @returns {string} - Nivel LOD: 'high', 'medium', 'low'
     */
    getLODLevel(distance) {
        if (distance < this.distanceThresholds.high) {
            return 'high';
        } else if (distance < this.distanceThresholds.medium) {
            return 'medium';
        } else {
            return 'low';
        }
    }
    
    /**
     * Aplicar LOD a partículas: calcular distancias y agregar metadata LOD
     * @param {Array} particles - Array de partículas
     * @param {THREE.Vector3} cameraPosition - Posición de la cámara
     * @param {number} cellSize - Tamaño de celda en metros
     * @returns {Array} - Partículas con metadata LOD
     */
    applyLOD(particles, cameraPosition, cellSize) {
        return particles.map(particle => {
            // Calcular posición 3D de la partícula
            const particlePos = new THREE.Vector3(
                particle.celda_x * cellSize,
                particle.celda_y * cellSize,
                particle.celda_z * cellSize
            );
            
            // Calcular distancia al cuadrado primero (evitar sqrt para performance)
            const distanceSq = particlePos.distanceToSquared(cameraPosition);
            const distance = Math.sqrt(distanceSq); // Solo calcular sqrt una vez
            
            const lodLevel = this.getLODLevel(distance);
            
            return {
                ...particle,
                _lodLevel: lodLevel,
                _distance: distance
            };
        });
    }
    
    /**
     * Obtener parámetros LOD para una geometría según nivel
     * @param {string} geometryType - Tipo de geometría
     * @param {Object} originalParams - Parámetros originales
     * @param {string} lodLevel - Nivel LOD
     * @returns {Object} - Parámetros modificados para LOD
     */
    getLODParams(geometryType, originalParams, lodLevel) {
        if (lodLevel === 'high') {
            return originalParams; // Sin cambios
        }
        
        const lodParams = { ...originalParams };
        
        // Reducir segments según nivel LOD
        // OPTIMIZACIÓN: Para esferas (agua), reducir EXTREMADAMENTE agresivamente
        if (geometryType === 'sphere') {
            const originalSegments = originalParams.segments || LOD_SPHERE_SEGMENTS.high;
            if (lodLevel === 'medium') {
                lodParams.segments = LOD_SPHERE_SEGMENTS.medium;
            } else if (lodLevel === 'low') {
                lodParams.segments = LOD_SPHERE_SEGMENTS.low;
            }
        } else if (geometryType === 'cylinder') {
            const originalSegments = originalParams.segments || 8;
            if (lodLevel === 'medium') {
                lodParams.segments = Math.max(4, Math.floor(originalSegments * 0.5));
            } else if (lodLevel === 'low') {
                lodParams.segments = Math.max(3, Math.floor(originalSegments * 0.25));
            }
        } else if (geometryType === 'cone') {
            const originalSegments = originalParams.segments || 8;
            if (lodLevel === 'medium') {
                lodParams.segments = Math.max(4, Math.floor(originalSegments * 0.5));
            } else if (lodLevel === 'low') {
                lodParams.segments = Math.max(3, Math.floor(originalSegments * 0.25));
            }
        } else if (geometryType === 'torus') {
            const originalRadialSegments = originalParams.radialSegments || 8;
            const originalTubularSegments = originalParams.tubularSegments || 8;
            if (lodLevel === 'medium') {
                lodParams.radialSegments = Math.max(4, Math.floor(originalRadialSegments * 0.5));
                lodParams.tubularSegments = Math.max(4, Math.floor(originalTubularSegments * 0.5));
            } else if (lodLevel === 'low') {
                lodParams.radialSegments = Math.max(3, Math.floor(originalRadialSegments * 0.25));
                lodParams.tubularSegments = Math.max(3, Math.floor(originalTubularSegments * 0.25));
            }
        }
        // Box no necesita reducción de segments (siempre es simple)
        
        return lodParams;
    }
    
    /**
     * Configurar umbrales de distancia para LOD
     * @param {number} high - Umbral para detalle alto (metros)
     * @param {number} medium - Umbral para detalle medio (metros)
     * @param {number} low - Umbral para detalle bajo (metros)
     */
    setDistanceThresholds(high, medium, low) {
        this.distanceThresholds = {
            high: high,
            medium: medium,
            low: low
        };
    }
    
    /**
     * Limpiar cache de LOD
     */
    clearCache() {
        this.lodCache.clear();
    }
}
