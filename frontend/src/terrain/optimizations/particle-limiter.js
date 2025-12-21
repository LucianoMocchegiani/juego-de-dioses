/**
 * Gestor de limitación agresiva de partículas
 * 
 * Limita el número máximo de partículas renderizadas y prioriza
 * las partículas cercanas a la cámara para mejorar el rendimiento.
 */
import * as THREE from 'three';

export class ParticleLimiter {
    /**
     * @param {number} maxParticles - Número máximo de partículas a renderizar (default: 100000)
     */
    constructor(maxParticles = 100000) {
        this.maxParticles = maxParticles;
    }
    
    /**
     * Configurar límite máximo de partículas
     * @param {number} maxParticles - Número máximo de partículas
     */
    setMaxParticles(maxParticles) {
        this.maxParticles = maxParticles;
    }
    
    /**
     * Limitar partículas: priorizar cercanas y limitar total
     * @param {Array} particles - Array de partículas (debe tener _distance si viene de LOD)
     * @param {THREE.Vector3} cameraPosition - Posición de la cámara
     * @param {number} cellSize - Tamaño de celda en metros
     * @returns {Array} - Array limitado de partículas
     */
    limitParticles(particles, cameraPosition, cellSize) {
        if (particles.length <= this.maxParticles) {
            return particles; // No hay necesidad de limitar
        }
        
        // Si las partículas ya tienen _distance (de LOD), usarlas
        // Si no, calcular distancias
        let particlesWithDistance = particles;
        if (!particles[0] || particles[0]._distance === undefined) {
            particlesWithDistance = particles.map(particle => {
                const particlePos = new THREE.Vector3(
                    particle.celda_x * cellSize,
                    particle.celda_y * cellSize,
                    particle.celda_z * cellSize
                );
                
                // Usar distancia al cuadrado para evitar sqrt (más rápido)
                const distanceSq = particlePos.distanceToSquared(cameraPosition);
                
                return {
                    ...particle,
                    _distanceSq: distanceSq
                };
            });
        } else {
            // Convertir _distance a _distanceSq para consistencia
            particlesWithDistance = particles.map(particle => ({
                ...particle,
                _distanceSq: particle._distance * particle._distance
            }));
        }
        
        // Ordenar por distancia (más cercanas primero)
        particlesWithDistance.sort((a, b) => {
            const distA = a._distanceSq !== undefined ? a._distanceSq : a._distance * a._distance;
            const distB = b._distanceSq !== undefined ? b._distanceSq : b._distance * b._distance;
            return distA - distB;
        });
        
        // Tomar solo las N más cercanas
        const limited = particlesWithDistance.slice(0, this.maxParticles);
        
        return limited;
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
    limitParticlesWithDensity(particles, cameraPosition, cellSize, nearDistance = 20, farDistance = 50) {
        if (particles.length <= this.maxParticles) {
            return particles;
        }
        
        // Calcular distancias
        const particlesWithDistance = particles.map(particle => {
            const particlePos = new THREE.Vector3(
                particle.celda_x * cellSize,
                particle.celda_y * cellSize,
                particle.celda_z * cellSize
            );
            
            const distanceSq = particlePos.distanceToSquared(cameraPosition);
            const distance = Math.sqrt(distanceSq);
            
            return {
                ...particle,
                _distance: distance,
                _distanceSq: distanceSq
            };
        });
        
        // Separar en grupos por distancia
        const nearParticles = [];
        const mediumParticles = [];
        const farParticles = [];
        
        particlesWithDistance.forEach(particle => {
            if (particle._distance < nearDistance) {
                nearParticles.push(particle);
            } else if (particle._distance < farDistance) {
                mediumParticles.push(particle);
            } else {
                farParticles.push(particle);
            }
        });
        
        // Renderizar todas las cercanas, 50% de las medianas, 25% de las lejanas
        const mediumSampled = this.sampleParticles(mediumParticles, 0.5);
        const farSampled = this.sampleParticles(farParticles, 0.25);
        
        // Combinar y limitar total
        const combined = [...nearParticles, ...mediumSampled, ...farSampled];
        
        if (combined.length <= this.maxParticles) {
            return combined;
        }
        
        // Si aún excede, ordenar por distancia y tomar las más cercanas
        combined.sort((a, b) => a._distanceSq - b._distanceSq);
        return combined.slice(0, this.maxParticles);
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
