/**
 * Configuración de la escena Three.js
 * 
 * NOTA: Este archivo mantiene compatibilidad temporal con el código existente.
 * La lógica de renderizado de partículas se moverá a renderers/ en pasos posteriores.
 */
import * as THREE from 'three';
import { Scene3D as CoreScene3D } from './core/scene.js';
import {
    DEFAULT_COLOR,
    MATERIAL_DEFAULT_METALNESS,
    MATERIAL_DEFAULT_ROUGHNESS,
    COLOR_MAX_VALUE,
    DEFAULT_CELL_SIZE
} from './config/constants.js';

/**
 * @typedef {import('./types.js').ParticleStyle} ParticleStyle
 * @typedef {import('./types.js').TipoEstilosBD} TipoEstilosBD
 * @typedef {import('./types.js').Particle} Particle
 */

export class Scene3D {
    /**
     * @param {HTMLElement} container - Contenedor HTML para el canvas
     */
    constructor(container) {
        this.container = container;
        
        // Usar escena core modular
        this.coreScene = new CoreScene3D(container);
        
        // Exponer propiedades para compatibilidad
        this.scene = this.coreScene.scene;
        this.camera = this.coreScene.camera.camera;
        this.renderer = this.coreScene.renderer.renderer;
        this.controls = this.coreScene.controls.getControls();
        
        // Mantener lógica de renderizado de partículas (temporal, se moverá a renderers/)
        this.particleMeshes = new Map();
        /**
         * Instanced meshes agrupados por tipo/material para optimización
         * @type {Map<string, THREE.InstancedMesh>}
         */
        this.instancedMeshes = new Map();
        /**
         * Cache de estilos por tipo de partícula
         * 
         * Se precarga antes de renderizar partículas desde query separada.
         * 
         * TODO: Implementar invalidación cuando:
         * - Se recibe mensaje WebSocket de tipo actualizado
         * - Se detecta cambio en tipos de partículas nuevas
         * - Polling periódico (cada 30s) para verificar cambios
         * 
         * @type {Map<string, ParticleStyle>}
         */
        this.styleCache = new Map();
    }

    /**
     * Ajustar grilla y ejes al tamaño del terreno
     * @param {number} anchoMetros - Ancho del terreno en metros
     * @param {number} altoMetros - Alto del terreno en metros
     */
    updateHelpers(anchoMetros, altoMetros) {
        this.coreScene.updateHelpers(anchoMetros, altoMetros);
    }

    /**
     * Cachear estilo de tipo de partícula (llamado antes de renderizar)
     * @param {string} tipoNombre - Nombre del tipo de partícula
     * @param {TipoEstilosBD} tipoEstilos - Estilos desde la base de datos
     */
    cacheStyle(tipoNombre, tipoEstilos) {
        const estilo = this.parseStyle(tipoNombre, tipoEstilos);
        this.styleCache.set(tipoNombre, estilo);
    }

    /**
     * Parsear estilos desde BD a formato para Three.js
     * @param {string} tipoNombre - Nombre del tipo de partícula
     * @param {TipoEstilosBD} tipoEstilos - Estilos desde la base de datos
     * @returns {ParticleStyle}
     */
    parseStyle(tipoNombre, tipoEstilos) {
        /** @type {ParticleStyle} */
        let estilo = {
            color: DEFAULT_COLOR,
            metalness: MATERIAL_DEFAULT_METALNESS,
            roughness: MATERIAL_DEFAULT_ROUGHNESS
        };
        
        if (tipoEstilos) {
            if (tipoEstilos.color_hex !== undefined && tipoEstilos.color_hex !== null) {
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
     * Obtener estilo desde cache (ya precargado)
     * @param {string} tipoNombre - Nombre del tipo de partícula
     * @returns {ParticleStyle}
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
            color: DEFAULT_COLOR,
            metalness: MATERIAL_DEFAULT_METALNESS,
            roughness: MATERIAL_DEFAULT_ROUGHNESS,
            isError: false
        };
    }

    /**
     * Aumentar brillo de un color RGB
     * @param {number} color - Color hexadecimal
     * @param {number} multiplier - Multiplicador de brillo
     * @returns {number} - Color con brillo aumentado
     */
    increaseBrightness(color, multiplier) {
        const r = (color >> 16) & 0xFF;
        const g = (color >> 8) & 0xFF;
        const b = color & 0xFF;
        const rNew = Math.min(COLOR_MAX_VALUE, Math.floor(r * multiplier));
        const gNew = Math.min(COLOR_MAX_VALUE, Math.floor(g * multiplier));
        const bNew = Math.min(COLOR_MAX_VALUE, Math.floor(b * multiplier));
        return (rNew << 16) | (gNew << 8) | bNew;
    }

    /**
     * Crear material para una partícula
     * @param {ParticleStyle} estilo - Estilo de la partícula
     * @returns {THREE.MeshStandardMaterial}
     */
    createMaterial(estilo) {
        // color_hex viene como string hexadecimal en formato CSS desde BD (ej: "#8B4513")
        // THREE.Color acepta strings en formato CSS (#RRGGBB) directamente
        const color = new THREE.Color(estilo.color);
        
        // Determinar opacidad (default: 1.0 si no se especifica)
        const opacity = estilo.opacity !== undefined ? estilo.opacity : 1.0;
        
        // Hacer transparente si opacity < 1.0 o si es un estilo de error
        const isTransparent = estilo.isError || opacity < 1.0;
        
        return new THREE.MeshStandardMaterial({ 
            color: color,
            metalness: estilo.metalness,
            roughness: estilo.roughness,
            transparent: isTransparent,
            opacity: opacity
        });
    }

    /**
     * Crear mesh para una partícula
     * @param {Particle} particle - Datos de la partícula
     * @param {number} cellSize - Tamaño de celda
     * @returns {THREE.Mesh|null} - Retorna null si la partícula es invisible (opacity 0.0)
     */
    createParticleMesh(particle, cellSize) {
        const estilo = this.getStyle(particle.tipo);
        
        // Si la opacidad es 0.0, no crear el mesh para optimizar rendimiento
        const opacity = estilo.opacity !== undefined ? estilo.opacity : 1.0;
        if (opacity === 0.0) {
            return null;
        }
        
        // HARDCODEADO: Colores directos (comentado - usar solo para debugging)
        // const colorMap = {
        //     'madera': 0x8B4513,   // Marrón
        //     'hojas': 0x228B22,    // Verde bosque
        //     'hierba': 0x90EE90,   // Verde claro
        //     'tierra': 0x8B7355,   // Tan
        //     'piedra': 0x808080,   // Gris
        //     'agua': 0x4169E1,     // Azul
        //     'aire': 0xFFFFFF      // Blanco
        // };
        // const colorHardcoded = colorMap[particle.tipo] || 0xFFFFFF;
        
        const geometry = new THREE.BoxGeometry(cellSize, cellSize, cellSize);
        const material = this.createMaterial({ ...estilo });  // Usar color desde BD
        const cube = new THREE.Mesh(geometry, material);
        
        cube.position.set(
            particle.celda_x * cellSize + cellSize / 2,
            particle.celda_z * cellSize + cellSize / 2,
            particle.celda_y * cellSize + cellSize / 2
        );
        
        return cube;
    }

    /**
     * Renderizar partículas usando instanced rendering para optimización
     * @param {Particle[]} particles - Array de partículas
     * @param {number} cellSize - Tamaño de celda (default: 0.25)
     */
    renderParticles(particles, cellSize = DEFAULT_CELL_SIZE) {
        this.clearParticles();

        // Agrupar partículas por tipo/material para instanced rendering
        const particlesByType = new Map();
        
        particles.forEach((particle) => {
            const estilo = this.getStyle(particle.tipo);
            const opacity = estilo.opacity !== undefined ? estilo.opacity : 1.0;
            
            // Saltar partículas invisibles
            if (opacity === 0.0) {
                return;
            }
            
            // Crear clave única para tipo+material (mismo tipo con diferentes materiales = diferentes grupos)
            const materialKey = `${particle.tipo}_${estilo.metalness}_${estilo.roughness}_${opacity}`;
            
            if (!particlesByType.has(materialKey)) {
                particlesByType.set(materialKey, {
                    tipo: particle.tipo,
                    estilo: estilo,
                    particles: []
                });
            }
            
            particlesByType.get(materialKey).particles.push(particle);
        });
        
        // Crear instanced meshes para cada grupo
        // Optimización: dividir grupos grandes en múltiples instanced meshes
        const MAX_INSTANCES_PER_MESH = 50000; // Reducido de 100k para mejor rendimiento
        
        particlesByType.forEach((group, materialKey) => {
            const count = group.particles.length;
            
            // Crear geometría compartida
            const geometry = new THREE.BoxGeometry(cellSize, cellSize, cellSize);
            
            // Crear material
            const material = this.createMaterial(group.estilo);
            
            // Dividir en múltiples instanced meshes si es necesario
            const numMeshes = Math.ceil(count / MAX_INSTANCES_PER_MESH);
            
            for (let meshIndex = 0; meshIndex < numMeshes; meshIndex++) {
                const start = meshIndex * MAX_INSTANCES_PER_MESH;
                const end = Math.min(start + MAX_INSTANCES_PER_MESH, count);
                const particlesChunk = group.particles.slice(start, end);
                
                // Crear instanced mesh para este chunk
                const instancedMesh = new THREE.InstancedMesh(geometry, material, particlesChunk.length);
                
                // Configurar posiciones de instancias
                const matrix = new THREE.Matrix4();
                particlesChunk.forEach((particle, index) => {
                    const x = particle.celda_x * cellSize + cellSize / 2;
                    const y = particle.celda_z * cellSize + cellSize / 2;
                    const z = particle.celda_y * cellSize + cellSize / 2;
                    
                    matrix.setPosition(x, y, z);
                    instancedMesh.setMatrixAt(index, matrix);
                });
                
                instancedMesh.instanceMatrix.needsUpdate = true;
                
                // Guardar referencia con índice único
                const meshKey = numMeshes > 1 ? `${materialKey}_${meshIndex}` : materialKey;
                this.instancedMeshes.set(meshKey, instancedMesh);
                this.scene.add(instancedMesh);
            }
        });
        
        console.log(`Renderizadas ${particles.length} partículas en ${particlesByType.size} grupos instanciados`);
    }

    /**
     * Limpiar todas las partículas
     */
    clearParticles() {
        // Limpiar meshes individuales (legacy)
        this.particleMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        });
        this.particleMeshes.clear();
        
        // Limpiar instanced meshes
        this.instancedMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        });
        this.instancedMeshes.clear();
    }

    /**
     * Animar escena
     */
    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Centrar cámara en el mundo
     * @param {number} centerX - Centro X
     * @param {number} centerY - Centro Y
     * @param {number} centerZ - Centro Z
     */
    centerCamera(centerX, centerY, centerZ) {
        this.coreScene.centerCamera(centerX, centerY, centerZ);
    }
}
