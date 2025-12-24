/**
 * Gestión de estilos y cache de tipos de partículas
 */
import {
    MATERIAL_DEFAULT_METALNESS,
    MATERIAL_DEFAULT_ROUGHNESS
} from '../../config/constants.js';

/**
 * @typedef {import('../../types.js').ParticleStyle} ParticleStyle
 * @typedef {import('../../types.js').TipoEstilosBD} TipoEstilosBD
 */

/**
 * Módulo de datos puros para estilos
 */
export class Style {
    constructor() {
        /**
         * Cache de estilos por tipo de partícula
         * @type {Map<string, ParticleStyle>}
         */
        this.styleCache = new Map();
    }
    
    /**
     * Cachear estilos de tipos de partículas
     * @param {Array<{nombre: string, estilos: TipoEstilosBD}>} tipos - Array de tipos con estilos
     */
    cacheStyles(tipos) {
        tipos.forEach(tipo => {
            if (tipo.estilos) {
                const estilo = this.parseStyle(tipo.estilos);
                this.styleCache.set(tipo.nombre, estilo);
            }
        });
    }
    
    /**
     * Parsear estilos desde BD a formato para Three.js
     * @param {TipoEstilosBD} tipoEstilos - Estilos desde la base de datos
     * @returns {ParticleStyle}
     */
    parseStyle(tipoEstilos) {
        /** @type {ParticleStyle} */
        let estilo = {
            color: '#FFFFFF', // Color por defecto (blanco) en formato string
            metalness: MATERIAL_DEFAULT_METALNESS,
            roughness: MATERIAL_DEFAULT_ROUGHNESS
        };
        
        if (tipoEstilos) {
            // Prioridad: color directo (nuevo) > color_hex (antiguo)
            if (tipoEstilos.color !== undefined && tipoEstilos.color !== null) {
                // color viene como string desde BD (puede ser nombre de color CSS o hex)
                // THREE.Color acepta strings en formato CSS (#RRGGBB) o nombres de color CSS
                // Si no empieza con #, asumimos que es un nombre de color CSS válido
                const colorValue = tipoEstilos.color.trim();
                if (colorValue.startsWith('#')) {
                    estilo.color = colorValue;
                } else {
                    // Es un nombre de color CSS (ej: "brown", "blue", "lightgreen")
                    // THREE.Color acepta nombres de color CSS directamente
                    estilo.color = colorValue;
                }
            } else if (tipoEstilos.color_hex !== undefined && tipoEstilos.color_hex !== null) {
                // color_hex viene como string hexadecimal en formato CSS desde BD (ej: "#8B4513")
                // THREE.Color acepta strings en formato CSS (#RRGGBB) directamente
                estilo.color = tipoEstilos.color_hex;
            }
            
            if (tipoEstilos.material) {
                if (tipoEstilos.material.metalness !== undefined) {
                    estilo.metalness = tipoEstilos.material.metalness;
                }
                if (tipoEstilos.material.roughness !== undefined) {
                    estilo.roughness = tipoEstilos.material.roughness;
                }
            }
            
            // Extraer opacidad de visual.opacity
            if (tipoEstilos.visual && tipoEstilos.visual.opacity !== undefined) {
                estilo.opacity = tipoEstilos.visual.opacity;
            }
        }
        return estilo;
    }
    
    /**
     * Obtener estilo desde cache
     * @param {string} tipoNombre - Nombre del tipo de partícula
     * @returns {ParticleStyle} - Estilo (o estilo por defecto si no está en cache)
     */
    getStyle(tipoNombre) {
        const tipoNormalizado = String(tipoNombre).trim();
        
        if (this.styleCache.has(tipoNormalizado)) {
            return this.styleCache.get(tipoNormalizado);
        }
        
        // Intentar buscar con diferentes variaciones del nombre
        for (const key of this.styleCache.keys()) {
            if (key.toLowerCase() === tipoNormalizado.toLowerCase()) {
                return this.styleCache.get(key);
            }
        }
        
        // Si no está en cache, usar fallback
        return {
            color: '#FFFFFF', // Color por defecto (blanco) en formato string
            metalness: MATERIAL_DEFAULT_METALNESS,
            roughness: MATERIAL_DEFAULT_ROUGHNESS,
            isError: false
        };
    }
    
    /**
     * Obtener estilos como Map para uso con renderizadores
     * @returns {Map<string, TipoEstilosBD>} - Map de estilos por tipo
     */
    getStylesMap() {
        // Convertir cache a Map de TipoEstilosBD (para compatibilidad con renderizadores)
        const stylesMap = new Map();
        // Nota: Esto requeriría almacenar los TipoEstilosBD originales, no solo ParticleStyle
        // Por ahora, retornar Map vacío y el renderizador usará getStyle()
        return stylesMap;
    }
    
    /**
     * Invalidar cache (futuro: cuando se actualicen tipos)
     */
    invalidateCache() {
        this.styleCache.clear();
    }
    
    /**
     * Invalidar estilo específico
     * @param {string} tipoNombre - Nombre del tipo a invalidar
     */
    invalidateStyle(tipoNombre) {
        this.styleCache.delete(tipoNombre);
    }
}
