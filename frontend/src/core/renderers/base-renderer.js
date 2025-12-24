/**
 * Renderizador base abstracto para todos los renderizadores
 * 
 * Proporciona lógica común de resolución de formas geométricas:
 * Prioridad: Agrupación > Tipo de partícula > Default
 */
import * as THREE from 'three';
import { GeometryRegistry } from '../geometries/registry.js';

export class BaseRenderer {
    /**
     * @param {GeometryRegistry} geometryRegistry - Registry de geometrías
     */
    constructor(geometryRegistry) {
        this.geometryRegistry = geometryRegistry;
    }
    
    /**
     * Obtener geometría para una partícula según prioridad:
     * 1. Agrupación (si existe geometria_agrupacion y parte_entidad)
     * 2. Tipo de partícula (si existe estilos.visual.geometria)
     * 3. Default (box)
     * 
     * @param {Object} particle - Partícula con propiedades
     * @param {Object} tipoEstilos - Estilos del tipo de partícula (puede incluir visual.geometria)
     * @param {Object} agrupacionGeometria - Geometría de agrupación (puede incluir partes)
     * @param {number} cellSize - Tamaño de celda en metros
     * @returns {THREE.BufferGeometry} - Geometría Three.js
     */
    getGeometry(particle, tipoEstilos, agrupacionGeometria, cellSize) {
        // 1. Verificar agrupación (si existe)
        if (particle.agrupacion_id && agrupacionGeometria) {
            const parteEntidad = particle.propiedades?.parte_entidad;
            if (parteEntidad && agrupacionGeometria.partes && agrupacionGeometria.partes[parteEntidad]) {
                const parteDef = agrupacionGeometria.partes[parteEntidad];
                if (parteDef.geometria) {
                    const geometriaDef = parteDef.geometria;
                    return this.geometryRegistry.create(
                        geometriaDef.tipo,
                        geometriaDef.parametros || {},
                        cellSize
                    );
                }
            }
        }
        
        // 2. Verificar tipo de partícula
        // Prioridad: nueva estructura (geometria directa) > estructura antigua (visual.geometria)
        if (tipoEstilos?.geometria) {
            const geometriaDef = tipoEstilos.geometria;
            return this.createGeometry(
                geometriaDef.tipo,
                geometriaDef.parametros || {},
                cellSize
            );
        } else if (tipoEstilos?.visual?.geometria) {
            const geometriaDef = tipoEstilos.visual.geometria;
            return this.geometryRegistry.create(
                geometriaDef.tipo,
                geometriaDef.parametros || {},
                cellSize
            );
        }
        
        // 3. Default (box)
        return new THREE.BoxGeometry(cellSize, cellSize, cellSize);
    }
}
