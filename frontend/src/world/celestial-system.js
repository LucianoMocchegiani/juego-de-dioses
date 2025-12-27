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
        this.celestialState = initialState || {
            time: 0,
            sun_angle: 0,
            luna_angle: 0,
            luna_phase: 0,
            current_hour: 12,
            is_daytime: true
        };
        
        // Estado anterior para interpolación
        this.previousState = null;
        
        // Radio del mundo para cálculos de posición
        // Se calcula desde el tamaño total del mundo (todos los bloques combinados)
        // Los bloques son subdivisiones técnicas, pero el sol/luna ven el mundo completo
        this.worldRadius = this.calculateWorldRadius(worldSize);
        
        // Centro del mundo (para cálculos futuros)
        this.worldCenter = worldSize ? {
            x: worldSize.centro_x || 0.0,
            y: worldSize.centro_y || 0.0
        } : { x: 0.0, y: 0.0 };
        
        // Altura del sol/luna sobre el mundo (configurable)
        this.celestialHeight = 500.0;
    }
    
    /**
     * Calcular radio del mundo desde el tamaño total del mundo
     * 
     * IMPORTANTE: El mundo es un conjunto abierto de bloques
     * - Los bloques son subdivisiones técnicas para optimización (temperatura, renderizado, etc.)
     * - El mundo real es la unión de todos los bloques
     * - El sol y la luna orbitan alrededor del mundo completo, no de un bloque individual
     * - El radio se calcula desde el bounding box de todos los bloques combinados
     * 
     * @param {Object} [worldSize] - Tamaño total del mundo con:
     *   - radio_mundo: Radio ya calculado (preferido)
     *   - ancho_total y alto_total: Para calcular el radio
     * @returns {number} - Radio del mundo en metros
     */
    calculateWorldRadius(worldSize) {
        if (!worldSize) {
            // Valor por defecto si no hay información del mundo
            return 1000.0;
        }
        
        // Si ya viene el radio calculado, usarlo directamente
        if (worldSize.radio_mundo !== undefined && worldSize.radio_mundo !== null) {
            return worldSize.radio_mundo;
        }
        
        // Si no, calcular desde ancho_total y alto_total
        if (worldSize.ancho_total && worldSize.alto_total) {
            const halfWidth = worldSize.ancho_total / 2;
            const halfHeight = worldSize.alto_total / 2;
            return Math.sqrt(halfWidth * halfWidth + halfHeight * halfHeight);
        }
        
        // Fallback a valor por defecto
        return 1000.0;
    }
    
    /**
     * Actualizar radio del mundo desde el tamaño total del mundo
     * 
     * Útil cuando se carga el mundo o se agregan nuevos bloques.
     * 
     * @param {Object} worldSize - Tamaño total del mundo (todos los bloques combinados)
     */
    updateWorldRadius(worldSize) {
        this.worldRadius = this.calculateWorldRadius(worldSize);
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
     * @param {number} [interpolationFactor] - Factor de interpolación (0.0 a 1.0) para movimiento suave
     * @returns {Object} - Posición {x, y, z}
     */
    getSunPosition(interpolationFactor = 0.0) {
        const state = this.getInterpolatedState(interpolationFactor);
        const angle = state.sun_angle;
        
        // Calcular posición en círculo alrededor del centro
        // El sol gira en sentido horario alrededor del centro
        const radius = this.worldRadius * 1.5; // Sol más lejos que el borde del mundo
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const z = this.celestialHeight;
        
        return { x, y, z };
    }
    
    /**
     * Obtener posición visual de la luna en coordenadas 3D
     * @param {number} [interpolationFactor] - Factor de interpolación (0.0 a 1.0) para movimiento suave
     * @returns {Object} - Posición {x, y, z}
     */
    getLunaPosition(interpolationFactor = 0.0) {
        const state = this.getInterpolatedState(interpolationFactor);
        const angle = state.luna_angle;
        
        // Calcular posición en círculo alrededor del centro
        // La luna gira más lento que el sol
        const radius = this.worldRadius * 1.5;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const z = this.celestialHeight;
        
        return { x, y, z };
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
        
        return {
            ...this.celestialState,
            sun_angle: interpolateAngle(this.previousState.sun_angle, this.celestialState.sun_angle, factor),
            luna_angle: interpolateAngle(this.previousState.luna_angle, this.celestialState.luna_angle, factor)
        };
    }
}

