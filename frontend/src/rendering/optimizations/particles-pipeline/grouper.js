/**
 * Grouper helper for particles pipeline
 *
 * Builds groups by geometry+material+LOD and separates opaque/transparent groups.
 */

/**
 * Build groups from sorted particles.
 * @param {Array} sortedParticles
 * @param {Map} tiposEstilos
 * @param {Map} agrupacionesGeometria
 * @param {Object} opts - helper functions and objects:
 *   - getStyle(particle, tipoEstilos)
 *   - geometryCacheLOD (object with getGeometry(type, params, lodLevel, cellSize))
 *   - getGeometryKey(type, params, estilo, lodLevel)
 *   - cellSize (number)
 * @returns {{groupsToRender:Array}} - array of groupData {group, geometryKey}
 */
export function buildParticleGroups(sortedParticles, tiposEstilos, agrupacionesGeometria, opts) {
    const { getStyle, geometryCacheLOD, getGeometryKey, cellSize } = opts;

    const particlesByGeometry = new Map();

    sortedParticles.forEach((particle) => {
        const tipoEstilos = tiposEstilos.get(particle.tipo);
        const agrupacionGeom = agrupacionesGeometria?.get(particle.agrupacion_id);

        const estilo = getStyle(particle, tipoEstilos);
        const opacity = estilo.opacity !== undefined ? estilo.opacity : 1.0;

        if (opacity === 0.0) return; // skip invisible

        let geometryType = 'box';
        let geometryParams = {};

        if (particle.agrupacion_id && agrupacionGeom) {
            const parteEntidad = particle.propiedades?.parte_entidad;
            if (parteEntidad && agrupacionGeom.partes && agrupacionGeom.partes[parteEntidad]) {
                const parteDef = agrupacionGeom.partes[parteEntidad];
                if (parteDef.geometria) {
                    geometryType = parteDef.geometria.tipo;
                    geometryParams = parteDef.geometria.parametros || {};
                }
            }
        } else if (tipoEstilos?.geometria) {
            geometryType = tipoEstilos.geometria.tipo;
            geometryParams = tipoEstilos.geometria.parametros || {};
        } else if (tipoEstilos?.visual?.geometria) {
            geometryType = tipoEstilos.visual.geometria.tipo;
            geometryParams = tipoEstilos.visual.geometria.parametros || {};
        }

        const lodLevel = particle._lodLevel || 'high';

        const geometry = geometryCacheLOD.getGeometry(geometryType, geometryParams, lodLevel, cellSize);

        const geometryKey = getGeometryKey(geometryType, geometryParams, estilo, lodLevel);

        if (!particlesByGeometry.has(geometryKey)) {
            particlesByGeometry.set(geometryKey, {
                geometry: geometry,
                estilo: estilo,
                particles: []
            });
        }

        particlesByGeometry.get(geometryKey).particles.push(particle);
    });

    const opaqueGroups = [];
    const transparentGroups = [];

    particlesByGeometry.forEach((group, geometryKey) => {
        const opacity = group.estilo.opacity !== undefined ? group.estilo.opacity : 1.0;
        const isTransparent = group.estilo.isError || opacity < 1.0;
        const avgDepth = group.particles.reduce((sum, p) => sum + p.celda_z, 0) / group.particles.length;
        const groupData = { group, geometryKey, avgDepth };
        if (isTransparent) transparentGroups.push(groupData);
        else opaqueGroups.push(groupData);
    });

    opaqueGroups.sort((a, b) => b.avgDepth - a.avgDepth);
    if (transparentGroups.length > 1) {
        transparentGroups.sort((a, b) => b.avgDepth - a.avgDepth);
    }

    return { groupsToRender: [...opaqueGroups, ...transparentGroups] };
}

