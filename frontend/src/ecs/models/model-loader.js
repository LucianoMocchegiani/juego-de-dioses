/**
 * Loader de modelos 3D usando Factory pattern
 * 
 * Soporta múltiples formatos de modelos (GLTF, GLB, OBJ)
 * usando los loaders de Three.js
 */
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
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
        const loader = this.loaders.get(tipo.toLowerCase());
        if (!loader) {
            throw new Error(`Tipo de modelo no soportado: ${tipo}. Tipos disponibles: ${Array.from(this.loaders.keys()).join(', ')}`);
        }
        
        try {
            if (tipo === 'gltf' || tipo === 'glb') {
                const gltf = await loader.loadAsync(url);
                
                // Guardar animaciones en userData si existen
                if (gltf.animations && gltf.animations.length > 0) {
                    gltf.scene.userData.animations = gltf.animations;
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
            throw new Error(`Error cargando modelo ${url} (tipo: ${tipo}): ${error.message}`);
        }
    }
}
