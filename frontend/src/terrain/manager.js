/**
 * TerrainManager - Núcleo del sistema de terreno
 * 
 * Gestiona la carga, renderizado y actualización dinámica de partículas del terreno.
 * Similar en estructura a ECSManager pero enfocado en partículas modificables.
 */
import { ViewportSystem } from './systems/viewport-system.js';
import { StyleSystem } from './systems/style-system.js';
import { OptimizationSystem } from './systems/optimization-system.js';
import { UpdateSystem } from './systems/update-system.js';
import { ParticleRenderer } from './renderers/particle-renderer.js';
import { LODManager } from './optimizations/lod-manager.js';
import { ParticleLimiter } from './optimizations/particle-limiter.js';
import { CullingManager } from './optimizations/culling-manager.js';
import { BloquesClient } from './api/bloques-client.js';
import { ParticlesClient } from './api/particles-client.js';

/**
 * @typedef {import('../types.js').Particle} Particle
 * @typedef {import('../types.js').ParticleStyle} ParticleStyle
 * @typedef {import('../types.js').TipoEstilosBD} TipoEstilosBD
 */

export class TerrainManager {
    /**
     * @param {THREE.Scene} scene - Escena Three.js
     * @param {Object} particlesApi - Cliente API para partículas
     * @param {Object} bloquesApi - Cliente API para bloques
     * @param {GeometryRegistry} geometryRegistry - Registry de geometrías
     */
    constructor(scene, particlesApi, bloquesApi, geometryRegistry) {
        this.scene = scene;
        this.geometryRegistry = geometryRegistry;
        
        // Inicializar clientes API
        this.bloquesClient = new BloquesClient(bloquesApi);
        this.particlesClient = new ParticlesClient(particlesApi);
        
        // Inicializar sistemas
        this.viewportSystem = new ViewportSystem();
        this.styleSystem = new StyleSystem();
        
        // Inicializar optimizaciones
        this.lodManager = new LODManager(geometryRegistry);
        this.cullingManager = new CullingManager();
        this.particleLimiter = new ParticleLimiter(150000);
        this.optimizationSystem = new OptimizationSystem(
            this.lodManager,
            this.cullingManager,
            this.particleLimiter
        );
        
        // Sistema de actualización
        this.updateSystem = new UpdateSystem(this.particlesClient);
        
        // Renderer
        this.renderer = new ParticleRenderer(geometryRegistry);
        
        // Cache de estado actual
        this.currentMeshes = new Map();
        this.currentParticles = new Map();
        this.currentDimension = null;
    }
    
    /**
     * Cargar dimensión completa
     * @param {Object} dimension - Dimensión con propiedades
     * @returns {Promise<Object>} - Resultado con dimension, particles, meshes
     */
    async loadDimension(dimension) {
        // 1. Calcular viewport
        const viewport = this.viewportSystem.calculateViewport(dimension);
        
        // 2. Cargar partículas y estilos en paralelo
        const [particlesData, typesData] = await Promise.all([
            this.particlesClient.getParticles(dimension.id, viewport),
            this.particlesClient.getParticleTypes(dimension.id, viewport)
        ]);
        
        // 3. Cachear estilos y partículas
        this.styleSystem.cacheStyles(typesData.types);
        this.currentParticles = new Map(particlesData.particles.map(p => [p.id || `${p.celda_x}_${p.celda_y}_${p.celda_z}`, p]));
        
        // 4. Preparar tiposEstilos para renderizado (compatibilidad con estructura antigua)
        const tiposEstilos = new Map();
        typesData.types.forEach(tipo => {
            // Convertir nueva estructura (color, geometria, opacidad) a estructura antigua (estilos) para compatibilidad
            if (tipo.color || tipo.geometria || tipo.opacidad !== undefined) {
                const estilosCompat = {};
                if (tipo.color) {
                    // El color puede venir como nombre de color (ej: "brown", "blue") o como hex
                    // THREE.Color acepta ambos formatos, pero para compatibilidad guardamos como color_hex
                    // Si no empieza con #, asumimos que es un nombre de color y lo pasamos tal cual
                    // El parser de estilos manejará la conversión
                    estilosCompat.color = tipo.color;
                    estilosCompat.color_hex = tipo.color; // Simplificado: siempre usar el mismo valor
                }
                if (tipo.geometria) {
                    // Guardar geometria tanto en nueva estructura como en antigua para compatibilidad
                    estilosCompat.geometria = tipo.geometria;
                    estilosCompat.visual = {
                        geometria: tipo.geometria
                    };
                }
                // Agregar opacidad si está disponible
                if (tipo.opacidad !== undefined && tipo.opacidad !== null) {
                    if (!estilosCompat.visual) {
                        estilosCompat.visual = {};
                    }
                    estilosCompat.visual.opacity = tipo.opacidad;
                }
                tiposEstilos.set(tipo.nombre, estilosCompat);
            }
        });
        
        // 5. Limpiar partículas anteriores
        if (this.currentMeshes.size > 0) {
            this.renderer.clearParticles(this.currentMeshes, this.scene);
        }
        
        // 6. Renderizar partículas (sin frustum culling inicial para ver todo)
        const originalFrustumCulling = this.renderer.enableFrustumCulling;
        this.renderer.enableFrustumCulling = false;
        
        const meshes = this.renderer.renderParticles(
            particlesData.particles,
            tiposEstilos,
            null, // agrupacionesGeometria (opcional)
            dimension.tamano_celda,
            this.scene,
            null // Sin cámara para renderizado inicial
        );
        
        this.renderer.enableFrustumCulling = originalFrustumCulling;
        this.currentMeshes = meshes;
        
        // 7. Guardar dimensión actual
        this.currentDimension = dimension;
        
        return {
            dimension,
            viewport,
            particles: particlesData.particles,
            particlesCount: particlesData.particles.length,
            meshes
        };
    }
    
    /**
     * Actualizar partícula individual (romper/colocar)
     * @param {string} particleId - ID de la partícula
     * @param {Particle|null} newData - Nuevos datos (null = eliminar)
     */
    async updateParticle(particleId, newData) {
        // 1. Actualizar en backend (si aplica)
        if (this.currentDimension) {
            await this.updateSystem.updateParticleInBackend(particleId, newData);
        }
        
        // 2. Actualizar cache local
        if (newData === null) {
            // Partícula eliminada (rota)
            this.currentParticles.delete(particleId);
        } else {
            // Partícula modificada/colocada
            this.currentParticles.set(particleId, newData);
        }
        
        // 3. Re-renderizar solo la partícula afectada (optimización)
        // TODO: Implementar actualización incremental más eficiente
        if (this.currentDimension) {
            // Por ahora, recargar la dimensión completa (no óptimo, pero funciona)
            await this.loadDimension(this.currentDimension);
        }
    }
    
    /**
     * Actualizar múltiples partículas (batch)
     * @param {string[]} particleIds - IDs de partículas
     * @param {Array<Particle|null>} newDataArray - Array de nuevos datos
     */
    async updateParticles(particleIds, newDataArray) {
        // Similar a updateParticle pero en batch para eficiencia
        if (this.currentDimension) {
            await this.updateSystem.updateParticlesBatch(particleIds, newDataArray);
            
            // Actualizar cache local
            particleIds.forEach((id, index) => {
                if (newDataArray[index] === null) {
                    this.currentParticles.delete(id);
                } else {
                    this.currentParticles.set(id, newDataArray[index]);
                }
            });
            
            // Re-renderizar (TODO: implementar actualización incremental)
            await this.loadDimension(this.currentDimension);
        }
    }
    
    /**
     * Obtener meshes actuales (para limpieza externa)
     * @returns {Map} - Map de meshes actuales
     */
    getCurrentMeshes() {
        return this.currentMeshes;
    }
    
    /**
     * Limpiar todo el terreno
     */
    clear() {
        if (this.currentMeshes.size > 0) {
            this.renderer.clearParticles(this.currentMeshes, this.scene);
        }
        this.currentMeshes.clear();
        this.currentParticles.clear();
        this.currentDimension = null;
    }
}
