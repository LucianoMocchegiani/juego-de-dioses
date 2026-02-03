/**
 * Renderizador base abstracto para todos los renderizadores
 */
import * as THREE from 'three';
import { GeometryRegistry } from '../geometries/registry.js';

export class BaseRenderer {
    constructor(geometryRegistry) {
        this.geometryRegistry = geometryRegistry;
    }

    getGeometry(particle, tipoEstilos, agrupacionGeometria, cellSize) {
        if (particle.agrupacion_id && agrupacionGeometria) {
            const parteEntidad = particle.propiedades?.parte_entidad;
            if (parteEntidad && agrupacionGeometria.partes && agrupacionGeometria.partes[parteEntidad]) {
                const parteDef = agrupacionGeometria.partes[parteEntidad];
                if (parteDef.geometria) {
                    const geometriaDef = parteDef.geometria;
                    return this.geometryRegistry.create(geometriaDef.tipo, geometriaDef.parametros || {}, cellSize);
                }
            }
        }
        if (tipoEstilos?.geometria) {
            const geometriaDef = tipoEstilos.geometria;
            return this.geometryRegistry.create(geometriaDef.tipo, geometriaDef.parametros || {}, cellSize);
        } else if (tipoEstilos?.visual?.geometria) {
            const geometriaDef = tipoEstilos.visual.geometria;
            return this.geometryRegistry.create(geometriaDef.tipo, geometriaDef.parametros || {}, cellSize);
        }
        return new THREE.BoxGeometry(cellSize, cellSize, cellSize);
    }
}
