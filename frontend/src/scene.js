/**
 * Configuración de la escena Three.js
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
    DEFAULT_COLOR,
    COLOR_CIELO,
    COLOR_GRID_PRIMARY,
    COLOR_GRID_SECONDARY,
    COLOR_LUZ_AMBIENTE,
    COLOR_LUZ_DIRECCIONAL,
    CAMERA_FOV,
    CAMERA_NEAR,
    CAMERA_FAR,
    CAMERA_POSITION_X,
    CAMERA_POSITION_Y,
    CAMERA_POSITION_Z,
    CONTROLS_DAMPING_FACTOR,
    CONTROLS_MIN_DISTANCE,
    CONTROLS_MAX_DISTANCE,
    LUZ_AMBIENTE_INTENSIDAD,
    LUZ_DIRECCIONAL_INTENSIDAD,
    LUZ_DIRECCIONAL_POS_X,
    LUZ_DIRECCIONAL_POS_Y,
    LUZ_DIRECCIONAL_POS_Z,
    GRID_SIZE,
    GRID_DIVISIONS,
    AXES_SIZE,
    MATERIAL_DEFAULT_METALNESS,
    MATERIAL_DEFAULT_ROUGHNESS,
    COLOR_MAX_VALUE,
    DEFAULT_CELL_SIZE
} from './constants.js';

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
        this.scene = new THREE.Scene();
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.particleMeshes = new Map();
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
        
        this.init();
    }

    init() {
        this.createCamera();
        this.createRenderer();
        this.createControls();
        this.createLights();
        this.createHelpers();
        this.setupResizeHandler();
    }

    createCamera() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, width / height, CAMERA_NEAR, CAMERA_FAR);
        this.camera.position.set(CAMERA_POSITION_X, CAMERA_POSITION_Y, CAMERA_POSITION_Z);
        this.camera.lookAt(0, 0, 0);
    }

    createRenderer() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setClearColor(COLOR_CIELO);
        this.container.appendChild(this.renderer.domElement);
    }

    createControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = CONTROLS_DAMPING_FACTOR;
        this.controls.minDistance = CONTROLS_MIN_DISTANCE;
        this.controls.maxDistance = CONTROLS_MAX_DISTANCE;
    }

    createLights() {
        const ambientLight = new THREE.AmbientLight(COLOR_LUZ_AMBIENTE, LUZ_AMBIENTE_INTENSIDAD);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(COLOR_LUZ_DIRECCIONAL, LUZ_DIRECCIONAL_INTENSIDAD);
        directionalLight.position.set(LUZ_DIRECCIONAL_POS_X, LUZ_DIRECCIONAL_POS_Y, LUZ_DIRECCIONAL_POS_Z);
        this.scene.add(directionalLight);
    }

    createHelpers() {
        const gridHelper = new THREE.GridHelper(GRID_SIZE, GRID_DIVISIONS, COLOR_GRID_PRIMARY, COLOR_GRID_SECONDARY);
        this.scene.add(gridHelper);

        const axesHelper = new THREE.AxesHelper(AXES_SIZE);
        this.scene.add(axesHelper);
    }

    setupResizeHandler() {
        window.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
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
        
        return new THREE.MeshStandardMaterial({ 
            color: color,
            metalness: estilo.metalness,
            roughness: estilo.roughness,
            transparent: estilo.isError || false,
            opacity: estilo.opacity !== undefined ? estilo.opacity : 1.0
        });
    }

    /**
     * Crear mesh para una partícula
     * @param {Particle} particle - Datos de la partícula
     * @param {number} cellSize - Tamaño de celda
     * @returns {THREE.Mesh}
     */
    createParticleMesh(particle, cellSize) {
        const estilo = this.getStyle(particle.tipo);
        
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
     * Renderizar partículas (tipos ya cacheados)
     * @param {Particle[]} particles - Array de partículas
     * @param {number} cellSize - Tamaño de celda (default: 0.25)
     */
    renderParticles(particles, cellSize = DEFAULT_CELL_SIZE) {
        this.clearParticles();

        particles.forEach((particle) => {
            const cube = this.createParticleMesh(particle, cellSize);
            const key = `${particle.celda_x}_${particle.celda_y}_${particle.celda_z}`;
            this.particleMeshes.set(key, cube);
            this.scene.add(cube);
        });
    }

    /**
     * Limpiar todas las partículas
     */
    clearParticles() {
        this.particleMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        });
        this.particleMeshes.clear();
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
        this.camera.position.set(centerX + 10, centerZ + 10, centerY + 10);
        this.controls.target.set(centerX, centerZ, centerY);
        this.controls.update();
    }
}
