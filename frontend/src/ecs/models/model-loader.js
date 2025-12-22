/**
 * Loader de modelos 3D usando Factory pattern
 * 
 * Soporta múltiples formatos de modelos (GLTF, GLB, OBJ)
 * usando los loaders de Three.js
 */
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { debugLogger } from '../../debug/logger.js';
// import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'; // Opcional

export class ModelLoader {
    /**
     * Crear instancia de ModelLoader
     */
    constructor() {
        this.loaders = new Map();
        
        // GLTFLoader puede cargar tanto .gltf como .glb
        const gltfLoader = new GLTFLoader();
        this.loaders.set('gltf', gltfLoader);
        this.loaders.set('glb', gltfLoader);
        
        // OBJLoader opcional (descomentar si se necesita)
        // const objLoader = new OBJLoader();
        // this.loaders.set('obj', objLoader);
    }
    
    /**
     * Cargar modelo 3D según tipo
     * @param {string} url - URL del modelo
     * @param {string} tipo - Tipo de modelo ('gltf', 'glb', 'obj')
     * @returns {Promise<THREE.Group>} Grupo Three.js con el modelo
     * @throws {Error} Si el tipo no está soportado o hay error cargando
     */
    async loadModel(url, tipo) {
        debugLogger.debug('ModelLoader', `Iniciando carga de modelo: ${url} (tipo: ${tipo})`, {
            url: url,
            tipo: tipo
        });
        
        const loader = this.loaders.get(tipo.toLowerCase());
        if (!loader) {
            const error = new Error(`Tipo de modelo no soportado: ${tipo}. Tipos disponibles: ${Array.from(this.loaders.keys()).join(', ')}`);
            debugLogger.error('ModelLoader', `Tipo de modelo no soportado: ${tipo}`, {
                tipo: tipo,
                tiposDisponibles: Array.from(this.loaders.keys())
            });
            throw error;
        }
        
        try {
            if (tipo === 'gltf' || tipo === 'glb') {
                debugLogger.debug('ModelLoader', `Cargando GLTF/GLB desde: ${url}`);
                const gltf = await loader.loadAsync(url);
                
                debugLogger.debug('ModelLoader', `Modelo cargado exitosamente: ${url}`, {
                    hasScene: !!gltf.scene,
                    sceneType: gltf.scene?.constructor?.name,
                    sceneChildren: gltf.scene?.children?.length,
                    animations: gltf.animations?.length || 0,
                    sceneName: gltf.scene?.name
                });
                
                // Guardar animaciones en userData si existen
                if (gltf.animations && gltf.animations.length > 0) {
                    gltf.scene.userData.animations = gltf.animations;
                    debugLogger.debug('ModelLoader', `${gltf.animations.length} animaciones guardadas en userData`, {
                        animacionesCount: gltf.animations.length
                    });
                }
                
                // Log detallado de la estructura del modelo
                if (gltf.scene) {
                    debugLogger.debug('ModelLoader', `Estructura del modelo`, {
                        name: gltf.scene.name,
                        type: gltf.scene.type,
                        children: gltf.scene.children.map(child => ({
                            name: child.name,
                            type: child.type,
                            isMesh: child.isMesh,
                            isGroup: child.isGroup
                        }))
                    });
                }
                
                return gltf.scene;
            }
            // Agregar otros tipos aquí si se implementan
            // else if (tipo === 'obj') {
            //     const obj = await loader.loadAsync(url);
            //     return obj;
            // }
            
            throw new Error(`Tipo de modelo no implementado: ${tipo}`);
        } catch (error) {
            debugLogger.error('ModelLoader', `Error cargando modelo ${url} (tipo: ${tipo})`, {
                url: url,
                tipo: tipo,
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            throw new Error(`Error cargando modelo ${url} (tipo: ${tipo}): ${error.message}`);
        }
    }
}
