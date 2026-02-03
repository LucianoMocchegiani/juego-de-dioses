/**
 * Caso de uso: cargar mundo (dimensiones y tamaño del mundo)
 * Usa ports.worldApi; actualiza store; devuelve datos para que App inicialice terrain y celestial.
 */
import { actions } from '../state/actions.js';
import { DEMO_DIMENSION_NAME } from '../config/constants.js';

/**
 * Cargar dimensión demo y tamaño del mundo
 * @param {Object} ports - Puertos inyectados (worldApi)
 * @param {Object} store - Store de estado
 * @param {Object} [options] - Opciones
 * @param {string} [options.demoDimensionName] - Nombre de la dimensión demo (default: DEMO_DIMENSION_NAME)
 * @returns {Promise<{ dimension: Object, worldSize: Object }>}
 */
export async function loadWorld(ports, store, options = {}) {
    const demoDimensionName = options.demoDimensionName ?? DEMO_DIMENSION_NAME;

    actions.setLoading(store, true);
    actions.setError(store, null);

    const dimensions = await ports.worldApi.getDimensions();
    const demoDimension = dimensions.find(d => d.nombre && d.nombre === demoDimensionName);

    if (!demoDimension) {
        const err = new Error(
            `No se encontró el bloque demo: "${demoDimensionName}". Bloques disponibles: ${dimensions.map(d => d.nombre).join(', ')}`
        );
        actions.setLoading(store, false);
        actions.setError(store, err.message);
        throw err;
    }

    actions.setDimension(store, demoDimension);

    const worldSize = await ports.worldApi.getWorldSize();
    actions.setLoading(store, false);

    return { dimension: demoDimension, worldSize };
}
