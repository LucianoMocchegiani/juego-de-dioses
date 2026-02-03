/**
 * Gestor de limitación agresiva de partículas
 * 
 * Limita el número máximo de partículas renderizadas y prioriza
 * las partículas cercanas a la cámara para mejorar el rendimiento.
 */
import * as THREE from 'three';
import { debugLogger } from '../../../debug/logger.js';
import {
    DEFAULT_MAX_PARTICLES,
    WATER_REDUCTION_FACTOR,
    WATER_TYPES,
    WATER_NEAR_DISTANCE,
    MAX_WATER_PARTICLES,
    WATER_SAMPLING_RATIOS,
    WATER_DISTRIBUTION_RATIOS,
    NORMAL_SAMPLING_RATIOS,
    DEFAULT_NEAR_DISTANCE,
    DEFAULT_FAR_DISTANCE,
    LOG_INTERVALS
} from '../../../config/particle-optimization-config.js';

export class ParticleLimiter {
    /**
     * @param {number} maxParticles - Número máximo de partículas a renderizar
     */
    constructor(maxParticles = DEFAULT_MAX_PARTICLES) {
        this.maxParticles = maxParticles;
        this.stats = {
            totalInput: 0,
            totalOutput: 0,
            nearParticles: 0,
            mediumParticles: 0,
            farParticles: 0,
            mediumSampled: 0,
            farSampled: 0,
            lastUpdate: 0
        };
    }
    
    /**
     * Configurar límite máximo de partículas
     * @param {number} maxParticles - Número máximo de partículas
     */
    setMaxParticles(maxParticles) {
        this.maxParticles = maxParticles;
    }
    
    /**
     * Limitar partículas con estrategia de densidad reducida
     * Reduce densidad de partículas lejanas (cada N partículas)
     * @param {Array} particles - Array de partículas
     * @param {THREE.Vector3} cameraPosition - Posición de la cámara
     * @param {number} cellSize - Tamaño de celda en metros
     * @param {number} nearDistance - Distancia cercana (todas las partículas se renderizan)
     * @param {number} farDistance - Distancia lejana (reducir densidad)
     * @returns {Array} - Array limitado de partículas
     */
    limitParticlesWithDensity(particles, cameraPosition, cellSize, nearDistance = DEFAULT_NEAR_DISTANCE, farDistance = DEFAULT_FAR_DISTANCE, options = {}) {
        // Opciones para optimización específica por tipo de partícula
        const waterReductionFactor = options?.waterReductionFactor ?? WATER_REDUCTION_FACTOR;
        const waterTypes = options?.waterTypes ?? WATER_TYPES;
        const waterNearDist = options?.waterNearDistance ?? WATER_NEAR_DISTANCE;
        if (particles.length <= this.maxParticles) {
            return particles;
        }
        
        // Reutilizar distancias si ya están calculadas por LOD (evita recalcular)
        const particlesWithDistance = particles.map(particle => {
            let distance;
            let distanceSq;
            
            if (particle._distance !== undefined) {
                // Ya calculado por LOD, reutilizar
                distance = particle._distance;
                distanceSq = distance * distance;
            } else {
                // Calcular distancia si no está disponible
                const particlePos = new THREE.Vector3(
                    particle.celda_x * cellSize,
                    particle.celda_y * cellSize,
                    particle.celda_z * cellSize
                );
                
                distanceSq = particlePos.distanceToSquared(cameraPosition);
                distance = Math.sqrt(distanceSq);
            }
            
            return {
                ...particle,
                _distance: distance,
                _distanceSq: distanceSq
            };
        });
        
        // Separar en grupos por distancia y tipo (agua vs otras)
        const nearParticles = [];
        const mediumParticles = [];
        const farParticles = [];
        const nearWaterParticles = [];
        const mediumWaterParticles = [];
        const farWaterParticles = [];
        
        // Separar partículas normales de agua (usando distancias diferentes)
        particlesWithDistance.forEach(particle => {
            const isWater = waterTypes.includes(particle.tipo);
            
            if (isWater) {
                // Para agua: usar distancia más corta para "cercanas" (más agresivo)
                if (particle._distance < waterNearDist) {
                    nearWaterParticles.push(particle);
                } else if (particle._distance < farDistance) {
                    mediumWaterParticles.push(particle);
                } else {
                    farWaterParticles.push(particle);
                }
            } else {
                // Para otras partículas: usar distancia normal
                if (particle._distance < nearDistance) {
                    nearParticles.push(particle);
                } else if (particle._distance < farDistance) {
                    mediumParticles.push(particle);
                } else {
                    farParticles.push(particle);
                }
            }
        });
        
        // Renderizar todas las cercanas normales, 50% de las medianas, 25% de las lejanas
        const mediumSampled = this.sampleParticles(mediumParticles, NORMAL_SAMPLING_RATIOS.medium);
        const farSampled = this.sampleParticles(farParticles, NORMAL_SAMPLING_RATIOS.far);
        
        // Para agua: aplicar reducción EXTREMADAMENTE agresiva (transparentes son más costosas)
        // Cercanas (< 12m): 100%, Medianas (12-50m): 15%, Lejanas (> 50m): 3%
        const nearWaterSampled = this.sampleParticles(nearWaterParticles, NORMAL_SAMPLING_RATIOS.near);
        const mediumWaterSampled = this.sampleParticles(mediumWaterParticles, waterReductionFactor * WATER_SAMPLING_RATIOS.medium);
        const farWaterSampled = this.sampleParticles(farWaterParticles, waterReductionFactor * WATER_SAMPLING_RATIOS.far);
        const allWaterParticles = [...nearWaterSampled, ...mediumWaterSampled, ...farWaterSampled];
        let finalWaterParticles = allWaterParticles;
        
        if (allWaterParticles.length > MAX_WATER_PARTICLES) {
            // Si excede el límite, priorizar cercanas y limitar medias/lejanas
            const waterToKeep = Math.min(nearWaterSampled.length, MAX_WATER_PARTICLES);
            const remainingSlots = Math.max(0, MAX_WATER_PARTICLES - waterToKeep);
            
            // Priorizar cercanas
            finalWaterParticles = nearWaterSampled.slice(0, waterToKeep);
            
            // Agregar medias y lejanas hasta completar el límite
            const remainingMedium = Math.floor(remainingSlots * WATER_DISTRIBUTION_RATIOS.medium);
            const remainingFar = remainingSlots - remainingMedium;
            
            finalWaterParticles.push(...mediumWaterSampled.slice(0, remainingMedium));
            finalWaterParticles.push(...farWaterSampled.slice(0, remainingFar));
        }
        
        // Combinar: partículas normales + agua optimizada
        const combined = [
            ...nearParticles, 
            ...mediumSampled, 
            ...farSampled,
            ...finalWaterParticles
        ];
        
        // Actualizar estadísticas y log detallado
        const now = performance.now();
        const shouldLog = now - this.stats.lastUpdate >= LOG_INTERVALS.stats;
        
        if (shouldLog) {
            this.stats.totalInput = particles.length;
            this.stats.nearParticles = nearParticles.length;
            this.stats.mediumParticles = mediumParticles.length;
            this.stats.farParticles = farParticles.length;
            this.stats.mediumSampled = mediumSampled.length;
            this.stats.farSampled = farSampled.length;
            this.stats.lastUpdate = now;
            
            const waterTotal = nearWaterParticles.length + mediumWaterParticles.length + farWaterParticles.length;
            const waterRendered = finalWaterParticles.length;
            const waterSampledTotal = nearWaterSampled.length + mediumWaterSampled.length + farWaterSampled.length;
            const waterLimited = waterSampledTotal > MAX_WATER_PARTICLES;
            
            debugLogger.info('ParticleLimiter', 'Limitación con densidad aplicada', {
                totalInput: particles.length,
                totalOutput: combined.length,
                limiteMax: this.maxParticles,
                cerca: nearParticles.length,
                media: `${mediumParticles.length} → ${mediumSampled.length}`,
                lejana: `${farParticles.length} → ${farSampled.length}`,
                agua: `${waterTotal} → ${waterRendered} (${waterTotal > 0 ? ((waterRendered / waterTotal) * 100).toFixed(1) : '0'}%)`,
                aguaCercana: `${nearWaterParticles.length} → ${nearWaterSampled.length}`,
                aguaMedia: `${mediumWaterParticles.length} → ${mediumWaterSampled.length}`,
                aguaLejana: `${farWaterParticles.length} → ${farWaterSampled.length}`,
                aguaLimitada: waterLimited ? `Sí (${waterSampledTotal} → ${MAX_WATER_PARTICLES})` : 'No',
                reduccion: `${((1 - combined.length / particles.length) * 100).toFixed(1)}%`,
                referencia: {
                    x: cameraPosition.x?.toFixed(2),
                    y: cameraPosition.y?.toFixed(2),
                    z: cameraPosition.z?.toFixed(2)
                }
            });
        }
        
        if (combined.length <= this.maxParticles) {
            this.stats.totalOutput = combined.length;
            return combined;
        }
        
        // Si aún excede, ordenar por distancia y tomar las más cercanas
        combined.sort((a, b) => a._distanceSq - b._distanceSq);
        const final = combined.slice(0, this.maxParticles);
        this.stats.totalOutput = final.length;
        
        // Log cuando se necesita limitar adicionalmente
        if (now - this.stats.lastUpdate >= LOG_INTERVALS.stats) {
            debugLogger.info('ParticleLimiter', 'Límite adicional aplicado', {
                despuesDensidad: combined.length,
                limiteMax: this.maxParticles,
                final: final.length
            });
        }
        
        return final;
    }
    
    /**
     * Obtener estadísticas de limitación
     * @returns {Object} - Estadísticas
     */
    getStats() {
        return { ...this.stats };
    }
    
    /**
     * Muestrear partículas (tomar cada N partículas)
     * @param {Array} particles - Array de partículas
     * @param {number} ratio - Ratio de partículas a mantener (0.0 a 1.0)
     * @returns {Array} - Array muestreado
     */
    sampleParticles(particles, ratio) {
        if (ratio >= 1.0) {
            return particles;
        }
        if (ratio <= 0.0) {
            return [];
        }
        
        const step = Math.max(1, Math.floor(1 / ratio));
        const sampled = [];
        
        for (let i = 0; i < particles.length; i += step) {
            sampled.push(particles[i]);
        }
        
        return sampled;
    }
}
