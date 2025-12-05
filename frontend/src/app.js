/**
 * Aplicación principal - Orquestación de todos los módulos
 */
import { Store } from './state/store.js';
import { actions } from './state/actions.js';
import { selectors } from './state/selectors.js';
import { ViewportManager } from './managers/viewport-manager.js';
import { StyleManager } from './managers/style-manager.js';
import { EntityManager } from './managers/entity-manager.js';
import { ApiClient } from './api/client.js';
import { DimensionsApi, ParticlesApi } from './api/endpoints/__init__.js';
import { Scene3D } from './core/scene.js';
import { ParticleRenderer } from './renderers/particle-renderer.js';
import { GeometryRegistry } from './renderers/geometries/registry.js';
import { DEMO_DIMENSION_NAME } from './constants.js';

/**
 * @typedef {import('./types.js').Particle} Particle
 */

export class App {
    /**
     * @param {HTMLElement} container - Contenedor HTML para el canvas
     */
    constructor(container) {
        this.container = container;
        
        // Inicializar Store
        this.store = new Store();
        
        // Inicializar Managers
        this.viewportManager = new ViewportManager();
        this.styleManager = new StyleManager();
        
        // Inicializar Registry de Geometrías
        this.geometryRegistry = new GeometryRegistry();
        
        // Inicializar Renderizador de Partículas
        this.particleRenderer = new ParticleRenderer(this.geometryRegistry);
        
        // Inicializar Entity Manager
        this.entityManager = new EntityManager(this.particleRenderer);
        
        // Inicializar API
        const apiClient = new ApiClient();
        this.dimensionsApi = new DimensionsApi(apiClient);
        this.particlesApi = new ParticlesApi(apiClient);
        
        // Inicializar escena 3D
        this.scene = new Scene3D(container);
        
        // Instanced meshes actuales (para limpieza)
        this.currentInstancedMeshes = new Map();
        
        // Suscribirse a cambios de estado
        this.setupStateListeners();
    }
    
    /**
     * Configurar listeners de estado para actualizar UI
     */
    setupStateListeners() {
        this.store.subscribe((state) => {
            // Aquí se pueden actualizar componentes UI reactivos al estado
            // Por ahora, la UI se actualiza manualmente en loadDemo()
        });
    }
    
    /**
     * Cargar y renderizar dimensión demo
     */
    async loadDemo() {
        try {
            // 1. Establecer estado de carga
            actions.setLoading(this.store, true);
            actions.setError(this.store, null);
            
            // 2. Obtener dimensiones
            const dimensions = await this.dimensionsApi.getDimensions();
            
            // Buscar dimensión demo por nombre exacto
            const demoDimension = dimensions.find(d => 
                d.nombre && d.nombre === DEMO_DIMENSION_NAME
            );
            
            if (!demoDimension) {
                throw new Error(`No se encontró la dimensión demo: "${DEMO_DIMENSION_NAME}". Dimensiones disponibles: ${dimensions.map(d => d.nombre).join(', ')}`);
            }
            
            // 3. Establecer dimensión en estado
            actions.setDimension(this.store, demoDimension);
            
            // 4. Calcular viewport
            const viewport = this.viewportManager.calculateViewport(demoDimension);
            actions.setViewport(this.store, viewport);
            
            // 5. Cargar partículas Y tipos en paralelo
            const [particlesData, typesData] = await Promise.all([
                this.particlesApi.getParticles(demoDimension.id, viewport),
                this.particlesApi.getParticleTypes(demoDimension.id, viewport)
            ]);
            
            // 6. Establecer partículas en estado
            actions.setParticles(this.store, particlesData.particles);
            
            // 7. Cachear estilos
            this.styleManager.cacheStyles(typesData.types);
            
            // 8. Preparar datos para renderizado
            const tiposEstilos = new Map();
            typesData.types.forEach(tipo => {
                if (tipo.estilos) {
                    tiposEstilos.set(tipo.nombre, tipo.estilos);
                }
            });
            
            // 9. Limpiar partículas anteriores
            if (this.currentInstancedMeshes.size > 0) {
                this.entityManager.clearParticles(this.currentInstancedMeshes, this.scene.scene);
            }
            
            // 10. Renderizar partículas
            this.currentInstancedMeshes = this.entityManager.renderParticles(
                particlesData.particles,
                tiposEstilos,
                null, // agrupacionesGeometria (opcional, por ahora null)
                demoDimension.tamano_celda,
                this.scene.scene
            );
            
            // 11. Ajustar grilla y ejes al tamaño del terreno
            this.scene.updateHelpers(demoDimension.ancho_metros, demoDimension.alto_metros);
            
            // 12. Centrar cámara
            const centerX = (viewport.x_max + viewport.x_min) / 2 * demoDimension.tamano_celda;
            const centerY = (viewport.y_max + viewport.y_min) / 2 * demoDimension.tamano_celda;
            const centerZ = (viewport.z_max + viewport.z_min) / 2 * demoDimension.tamano_celda;
            this.scene.centerCamera(centerX, centerY, centerZ);
            
            // 13. Finalizar carga
            actions.setLoading(this.store, false);
            
            // 14. Iniciar animación
            this.scene.animate();
            
            // Retornar datos para actualizar UI externa
            return {
                dimension: demoDimension,
                particlesCount: particlesData.total,
                viewport: viewport
            };
            
        } catch (error) {
            console.error('Error cargando demo:', error);
            actions.setLoading(this.store, false);
            actions.setError(this.store, error.message);
            throw error;
        }
    }
    
    /**
     * Obtener estado actual
     * @returns {Object} - Estado actual
     */
    getState() {
        return this.store.getState();
    }
    
    /**
     * Obtener dimensión actual
     * @returns {Object|null} - Dimensión actual
     */
    getCurrentDimension() {
        return selectors.getCurrentDimension(this.store.getState());
    }
    
    /**
     * Obtener número de partículas
     * @returns {number} - Número de partículas
     */
    getParticlesCount() {
        return selectors.getParticlesCount(this.store.getState());
    }
}

