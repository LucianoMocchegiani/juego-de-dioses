/**
 * Sistema Celestial del Frontend
 * 
 * Recibe el estado celestial autoritativo del backend y calcula posiciones visuales
 * para renderizado en Three.js. El backend controla el tiempo, el frontend solo renderiza.
 */
export class CelestialSystem {
    /**
     * @param {Object} [initialState] - Estado celestial inicial del backend
     * @param {Object} [worldSize] - Tamaño total del mundo (todos los bloques combinados)
     *   Debe tener radio_mundo (o ancho_total y alto_total para calcularlo).
     *   Los bloques son subdivisiones técnicas para optimización, pero el mundo es un conjunto abierto.
     *   El sol y la luna orbitan alrededor del mundo completo, no de un bloque individual.
     */
    constructor(initialState = null, worldSize = null) {
        // Estado celestial recibido del backend (autoritativo)
        // Ahora incluye sun_position y luna_position calculadas en el backend
        this.celestialState = initialState || {
            time: 0,
            sun_angle: 0,
            luna_angle: 0,
            luna_phase: 0,
            current_hour: 12,
            is_daytime: true,
            sun_position: { x: 0, y: 0, z: 500 },
            luna_position: { x: 0, y: 0, z: 500 }
        };
        
        // Estado anterior para interpolación
        this.previousState = null;
        
        // Centro del mundo (para ajustar posiciones del backend al centro del mundo)
        this.worldCenter = worldSize ? {
            x: worldSize.centro_x || 0.0,
            y: worldSize.centro_y || 0.0
        } : { x: 0.0, y: 0.0 };
    }
    
    /**
     * Actualizar centro del mundo (para ajustar posiciones del backend)
     * 
     * Las posiciones del backend vienen relativas al centro (0,0), pero el mundo
     * puede tener un centro diferente. Este método actualiza el centro para ajustar.
     * 
     * @param {Object} worldSize - Tamaño total del mundo (todos los bloques combinados)
     */
    updateWorldCenter(worldSize) {
        if (worldSize) {
            this.worldCenter = {
                x: worldSize.centro_x || 0.0,
                y: worldSize.centro_y || 0.0
            };
        }
    }
    
    /**
     * Actualizar estado celestial desde el backend
     * @param {Object} newState - Nuevo estado celestial del backend
     */
    update(newState) {
        // Guardar estado anterior para interpolación
        this.previousState = { ...this.celestialState };
        
        // Actualizar estado actual
        this.celestialState = { ...newState };
    }
    
    /**
     * Obtener posición visual del sol en coordenadas 3D
     * Usa la posición calculada por el backend (autoritativa)
     * @param {number} [interpolationFactor] - Factor de interpolación (0.0 a 1.0) para movimiento suave
     * @returns {Object} - Posición {x, y, z} en metros
     * @throws {Error} Si no hay posición del sol en el estado celestial
     */
    getSunPosition(interpolationFactor = 0.0) {
        const state = this.getInterpolatedState(interpolationFactor);
        
        // Usar posición del backend (ya calculada)
        if (!state.sun_position || state.sun_position.x === undefined) {
            throw new Error('CelestialSystem: No hay posición del sol en el estado celestial. El backend debe enviar sun_position.');
        }
        
        return {
            x: state.sun_position.x,
            y: state.sun_position.y,
            z: state.sun_position.z
        };
    }
    
    /**
     * Obtener posición visual de la luna en coordenadas 3D
     * Usa la posición calculada por el backend (autoritativa)
     * @param {number} [interpolationFactor] - Factor de interpolación (0.0 a 1.0) para movimiento suave
     * @returns {Object} - Posición {x, y, z} en metros
     * @throws {Error} Si no hay posición de la luna en el estado celestial
     */
    getLunaPosition(interpolationFactor = 0.0) {
        const state = this.getInterpolatedState(interpolationFactor);
        
        // Usar posición del backend (ya calculada)
        if (!state.luna_position || state.luna_position.x === undefined) {
            throw new Error('CelestialSystem: No hay posición de la luna en el estado celestial. El backend debe enviar luna_position.');
        }
        
        return {
            x: state.luna_position.x,
            y: state.luna_position.y,
            z: state.luna_position.z
        };
    }
    
    /**
     * Obtener fase lunar actual
     * @returns {number} - Fase lunar (0.0 = nueva, 0.5 = llena, 1.0 = nueva)
     */
    getLunaPhase() {
        return this.celestialState.luna_phase;
    }
    
    /**
     * Determinar si es de día (promedio mundial)
     * @returns {boolean} - True si es de día
     */
    isDaytime() {
        return this.celestialState.is_daytime;
    }
    
    /**
     * Obtener hora actual del día
     * @returns {number} - Hora del día (0-24)
     */
    getCurrentHour() {
        return this.celestialState.current_hour;
    }
    
    /**
     * Obtener intensidad solar promedio (para iluminación)
     * @returns {number} - Intensidad solar (0.0 a 1.0)
     */
    getSunIntensity() {
        const hour = this.getCurrentHour();
        // Intensidad máxima al mediodía (12:00), mínima a medianoche (0:00)
        if (hour >= 6 && hour <= 18) {
            // Día: intensidad basada en posición del sol
            const normalizedHour = (hour - 6) / 12; // 0.0 a 1.0
            return Math.sin(normalizedHour * Math.PI); // Curva senoidal suave
        } else {
            // Noche: intensidad mínima
            return 0.1; // Luz mínima de estrellas/luna
        }
    }
    
    /**
     * Obtener estado interpolado para movimiento suave
     * @param {number} factor - Factor de interpolación (0.0 = estado anterior, 1.0 = estado actual)
     * @returns {Object} - Estado interpolado
     */
    getInterpolatedState(factor) {
        if (!this.previousState || factor === 0.0) {
            return this.celestialState;
        }
        
        if (factor === 1.0) {
            return this.celestialState;
        }
        
        // Interpolar ángulos (usar shortest path)
        const interpolateAngle = (a1, a2, t) => {
            const diff = ((a2 - a1 + Math.PI) % (2 * Math.PI)) - Math.PI;
            return a1 + diff * t;
        };
        
        // Interpolar posiciones (lineal)
        const interpolatePosition = (pos1, pos2, t) => {
            if (!pos1 || !pos2) return pos2 || pos1;
            return {
                x: pos1.x + (pos2.x - pos1.x) * t,
                y: pos1.y + (pos2.y - pos1.y) * t,
                z: pos1.z + (pos2.z - pos1.z) * t
            };
        };
        
        return {
            ...this.celestialState,
            sun_angle: interpolateAngle(this.previousState.sun_angle, this.celestialState.sun_angle, factor),
            luna_angle: interpolateAngle(this.previousState.luna_angle, this.celestialState.luna_angle, factor),
            sun_position: interpolatePosition(
                this.previousState.sun_position,
                this.celestialState.sun_position,
                factor
            ),
            luna_position: interpolatePosition(
                this.previousState.luna_position,
                this.celestialState.luna_position,
                factor
            )
        };
    }
}

