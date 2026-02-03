/**
 * Caso de uso: sincronizar estado celestial con el backend
 * Devuelve el estado; quien llame (App) debe actualizar CelestialSystem con ese estado.
 */
/**
 * Obtener estado celestial actual del backend
 * @param {Object} ports - Puertos inyectados (celestialApi)
 * @returns {Promise<Object>} Estado celestial (time, sun_angle, luna_angle, luna_phase, current_hour, is_daytime)
 */
export async function syncCelestial(ports) {
    return await ports.celestialApi.getState();
}
