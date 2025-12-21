/**
 * Aplicación principal - Orquestación de todos los módulos
 */
import { Store } from './state/store.js';
import { actions } from './state/actions.js';
import { selectors } from './state/selectors.js';
import { PerformanceManager } from './core/performance/performance-manager.js';
import { ApiClient } from './api/client.js';
import { DimensionsApi, ParticlesApi, CharactersApi, initCharactersApi } from './api/endpoints/__init__.js';
import { Scene3D } from './core/scene.js';
import { GeometryRegistry } from './core/geometries/registry.js';
import { TerrainManager } from './terrain/manager.js';
import { DEMO_DIMENSION_NAME } from './config/constants.js';
import { ECSManager } from './ecs/index.js';
import { InputSystem, PhysicsSystem, RenderSystem, CollisionSystem, AnimationStateSystem, AnimationMixerSystem, ComboSystem, CombatSystem, WeaponEquipSystem } from './ecs/systems/index.js';
import { PlayerFactory } from './ecs/factories/player-factory.js';
import { InputManager } from './core/input/input-manager.js';
import { CollisionDetector } from './world/collision-detector.js';
import { CameraController } from './world/camera-controller.js';
// Herramientas de debugging inicializadas centralmente en dev-exposure.js
import { exposeDevelopmentTools, initDevelopmentTools } from './dev-exposure.js';

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
        
        // Inicializar Performance Manager
        this.performanceManager = new PerformanceManager();
        
        // Suscribirse a métricas de performance
        this.performanceManager.subscribe((metrics) => {
            // Log en consola (opcional: mostrar en UI)
            // El notify ya verifica isProfiling, así que siempre loguear aquí
            // console.log(`Performance: FPS: ${metrics.fps}, Draw Calls: ${metrics.drawCalls || 0}`);
        });
        
        // Inicializar Registry de Geometrías
        this.geometryRegistry = new GeometryRegistry();
        
        // Inicializar API
        const apiClient = new ApiClient();
        this.dimensionsApi = new DimensionsApi(apiClient);
        this.particlesApi = new ParticlesApi(apiClient);
        this.charactersApi = new CharactersApi(apiClient);
        // Inicializar funciones helper de CharactersApi
        initCharactersApi(apiClient);
        
        // Inicializar escena 3D
        this.scene = new Scene3D(container);
        
        // Inicializar TerrainManager (nuevo sistema modular)
        this.terrain = new TerrainManager(
            this.scene.scene,
            this.particlesApi,
            this.dimensionsApi,
            this.geometryRegistry
        );
        
        // Instanced meshes actuales (para compatibilidad temporal)
        this.currentInstancedMeshes = new Map();
        
        // Inicializar ECS
        this.ecs = new ECSManager();
        
        // Inicializar InputManager
        this.inputManager = new InputManager();
        
        // Inicializar sistemas ECS
        this.inputSystem = new InputSystem(this.inputManager);
        this.physicsSystem = new PhysicsSystem({ gravity: -9.8 });
        this.combatSystem = new CombatSystem(this.inputManager);
        this.comboSystem = new ComboSystem(this.inputManager);
        this.animationStateSystem = new AnimationStateSystem();
        this.animationMixerSystem = new AnimationMixerSystem();
        // RenderSystem, CollisionSystem y WeaponEquipSystem se inicializarán después de cargar la dimensión
        this.renderSystem = null;
        this.collisionSystem = null;
        this.weaponEquipSystem = null;
        this.collisionDetector = null;
        
        // Registrar sistemas con prioridades correctas (orden de ejecución)
        this.ecs.registerSystem(this.inputSystem);         // Priority 0
        this.ecs.registerSystem(this.physicsSystem);       // Priority 1
        this.ecs.registerSystem(this.combatSystem);        // Priority 1.4
        this.ecs.registerSystem(this.comboSystem);         // Priority 1.5
        this.ecs.registerSystem(this.animationStateSystem); // Priority 2
        this.ecs.registerSystem(this.animationMixerSystem); // Priority 2.5
        
        // Jugador se creará después de cargar la dimensión
        this.playerId = null;
        
        // Controlador de cámara (se inicializará después de cargar la dimensión)
        this.cameraController = null;
        
        // Para calcular deltaTime en animate
        this.lastTime = null;
        
        // Inicializar herramientas de debugging (solo en desarrollo)
        this.initDevelopmentTools();
        
        // Suscribirse a cambios de estado
        this.setupStateListeners();
    }
    
    /**
     * Inicializar herramientas de debugging
     */
    initDevelopmentTools() {
        // Inicializar herramientas de debugging (centralizado)
        const developmentToolsResult = initDevelopmentTools(this);
        
        if (developmentToolsResult) {
            // Guardar referencias para uso interno si es necesario
            this.inspector = developmentToolsResult.inspector;
            this.debugMetrics = developmentToolsResult.metrics;
            this.debugPanel = developmentToolsResult.panel;
            this.debugInterface = developmentToolsResult.interface;
            
            // Exponer todas las herramientas de desarrollo (centralizado)
            exposeDevelopmentTools(this, {
                developmentTools: developmentToolsResult
            });
        } else {
            // Log si no está en desarrollo
            if (typeof window !== 'undefined' && window.console) {
                console.log('[DebugTools] Modo desarrollo no detectado. Debugging deshabilitado.');
            }
        }
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
            
            // 4. Cargar dimensión usando TerrainManager
            const terrainResult = await this.terrain.loadDimension(demoDimension);
            const viewport = terrainResult.viewport;
            const particlesData = { particles: terrainResult.particles };
            
            // 5. Establecer partículas y viewport en estado
            actions.setParticles(this.store, particlesData.particles);
            actions.setViewport(this.store, viewport);
            
            // 6. Actualizar instanced meshes para compatibilidad temporal
            this.currentInstancedMeshes = terrainResult.meshes;
            
            // 7. Ajustar grilla y ejes al tamaño del terreno
            this.scene.updateHelpers(demoDimension.ancho_metros, demoDimension.alto_metros);
            
            // 8. Centrar cámara PRIMERO (antes de renderizar para que frustum culling funcione correctamente)
            const centerX = (viewport.x_max + viewport.x_min) / 2 * demoDimension.tamano_celda;
            const centerY = (viewport.y_max + viewport.y_min) / 2 * demoDimension.tamano_celda;
            const centerZ = (viewport.z_max + viewport.z_min) / 2 * demoDimension.tamano_celda;
            this.scene.centerCamera(centerX, centerY, centerZ);
            
            // 9. Actualizar matrices de la cámara para que frustum culling funcione correctamente
            this.scene.camera.camera.updateMatrixWorld();
            
            // 10. Contar draw calls después de renderizar
            this.performanceManager.countDrawCalls(this.currentInstancedMeshes);
            
            // 11. Finalizar carga
            actions.setLoading(this.store, false);
            
            // 12. Inicializar CollisionDetector y CollisionSystem
            if (!this.collisionDetector) {
                this.collisionDetector = new CollisionDetector(
                    this.particlesApi,
                    demoDimension.tamano_celda
                );
                this.collisionSystem = new CollisionSystem(
                    this.collisionDetector,
                    demoDimension.id,
                    demoDimension,
                    particlesData.particles // Usar partículas ya cargadas
                );
                this.ecs.registerSystem(this.collisionSystem);
            } else {
                // Actualizar partículas en CollisionSystem si ya existe
                this.collisionSystem.setParticles(particlesData.particles);
            }
            
            // 13. Inicializar RenderSystem con cellSize de la dimensión
            if (!this.renderSystem) {
                this.renderSystem = new RenderSystem(demoDimension.tamano_celda);
                this.ecs.registerSystem(this.renderSystem);
            }
            
            // 14. Inicializar WeaponEquipSystem (necesita la escena)
            if (!this.weaponEquipSystem) {
                this.weaponEquipSystem = new WeaponEquipSystem(this.scene.scene);
                this.ecs.registerSystem(this.weaponEquipSystem);
            }
            
            // 15. Crear jugador después de cargar dimensión
            if (!this.playerId) {
                // Primero intentar cargar personaje existente
                let characterId = null;
                try {
                    const characters = await this.charactersApi.listCharacters(demoDimension.id);
                    if (characters && characters.length > 0) {
                        // Usar el primer personaje encontrado (el más reciente)
                        characterId = characters[0].id;
                        // console.log(`✓ Cargando personaje existente: ${characterId} (de ${characters.length} totales)`);
                    } else {
                        // console.log('No hay personajes existentes, se creará uno nuevo');
                    }
                } catch (error) {
                    // console.warn('Error al listar personajes:', error);
                }
                
                // Si no hay personaje existente, crear uno nuevo
                const startX = 45; // Esquina superior izquierda
                const startY = 45; // Esquina superior izquierda
                
                // IMPORTANTE: Solo crear si NO hay characterId
                // Si hay characterId, solo cargar, NO crear nuevo
                this.playerId = await PlayerFactory.createPlayer({
                    ecs: this.ecs,
                    scene: this.scene.scene,
                    x: startX,
                    y: startY,
                    z: 1, // Justo arriba de la superficie (hierba en z=0)
                    cellSize: demoDimension.tamano_celda,
                    characterId: characterId, // Cargar existente si existe
                    templateId: characterId ? null : 'humano', // Crear solo si NO hay existente
                    dimensionId: demoDimension.id
                });
                
                // console.log(`✓ Jugador creado/cargado. Entity ID: ${this.playerId}, Character ID: ${characterId || 'nuevo'}`);
                
                // 16. Inicializar controlador de cámara y configurarlo para seguir al jugador
                if (!this.cameraController) {
                    this.cameraController = new CameraController(
                        this.scene.camera,
                        this.scene,
                        demoDimension.tamano_celda,
                        this.inputManager // Pasar InputManager para control de mouse
                    );
                    this.cameraController.setTarget(this.playerId);
                    
                    // Deshabilitar OrbitControls cuando el jugador está activo
                    this.scene.controls.setEnabled(false);
                }
            }
            
            // 17. Iniciar profiling de performance
            this.performanceManager.startProfiling();
            // console.log('Performance profiling iniciado. Las métricas aparecerán cada segundo en consola.');
            
            // 18. Iniciar animación (con medición de FPS y actualización de ECS)
            // Usar nuestro propio loop de animación que incluye ECS
            this.startAnimation();
            
            // Retornar datos para actualizar UI externa
            return {
                dimension: demoDimension,
                particlesCount: terrainResult.particlesCount,
                viewport: viewport
            };
            
        } catch (error) {
            // console.error('Error cargando demo:', error);
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
    
    /**
     * Iniciar loop de animación con actualización de ECS
     */
    startAnimation() {
        const animate = () => {
            requestAnimationFrame(animate);
            
            // Calcular deltaTime
            const currentTime = performance.now();
            const deltaTime = this.lastTime ? (currentTime - this.lastTime) / 1000 : 0;
            this.lastTime = currentTime;
            
            // Actualizar sistemas ECS (procesan input primero)
            if (this.ecs) {
                this.ecs.update(deltaTime);
            }
            
            // Actualizar controlador de cámara ANTES de limpiar el frame
            // (necesita el mouseDelta antes de que se resetee)
            if (this.cameraController) {
                this.cameraController.update(this.ecs);
            } else {
                // Si no hay controlador de cámara, actualizar OrbitControls
            this.scene.controls.update();
            }
            
            // Limpiar frame de InputManager DESPUÉS de que todos los sistemas procesen el input
            this.inputManager.clearFrame();
            
            // Renderizar
            this.scene.renderer.render(this.scene.scene, this.scene.camera.camera);
            
            // Medir FPS
            this.performanceManager.measureFPS();
        };
        
        animate();
    }
}

