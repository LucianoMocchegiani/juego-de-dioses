/**
 * Utilidades para cargar y transformar modelos 3D
 * 
 * Proporciona funciones helper para cargar modelos desde la BD,
 * aplicar transformaciones (escala, offset, rotación) y manejar cache.
 */
import * as THREE from 'three';
import { ModelLoader } from './model-loader.js';
import { ModelCache } from './model-cache.js';

const modelLoader = new ModelLoader();
const modelCache = ModelCache.getInstance();

/**
 * Obtener URL base del backend para archivos estáticos
 * @returns {string} URL base del backend
 * 
 * NOTA: Esta función duplica la lógica de API_BASE_URL en api/client.js
 * TODO: Extraer a un módulo común de configuración
 */
function getBackendBaseUrl() {
    // Misma lógica que ApiClient: si está en Docker (nginx proxy), usar ruta relativa
    // Si está en desarrollo local, usar URL completa del backend
    if (window.location.hostname === 'localhost' && window.location.port === '8080') {
        return '';  // Nginx proxy (Docker) - rutas relativas funcionan
    } else {
        return 'http://localhost:8000';  // Desarrollo local directo
    }
}

/**
 * Cargar modelo 3D y aplicar transformaciones
 * @param {Object} modelo3d - Configuración del modelo desde BD
 * @param {number} cellSize - Tamaño de celda en metros
 * @returns {Promise<THREE.Group>} Grupo con modelo transformado
 * @throws {Error} Si hay error cargando el modelo
 */
export async function loadModel3D(modelo3d, cellSize) {
    const backendBase = getBackendBaseUrl();
    // Agregar timestamp para invalidar cache del navegador
    // Esto fuerza la descarga del modelo más reciente
    const cacheBuster = `?v=${Date.now()}`;
    const modelUrl = `${backendBase}/static/models/${modelo3d.ruta}${cacheBuster}`;
    
    // Verificar cache (el cacheBuster en la URL evita usar cache viejo)
    // NOTA: El cacheBuster hace que cada carga tenga URL única, así que el cache
    // solo funciona si se carga el mismo modelo múltiples veces en la misma sesión
    if (modelCache.has(modelUrl)) {
        const cached = modelCache.get(modelUrl); // Ya clona internamente
        const transformed = applyTransformations(cached, modelo3d, cellSize);
        return transformed;
    }
    
    // Cargar modelo
    const model = await modelLoader.loadModel(modelUrl, modelo3d.tipo);
    
    // IMPORTANTE: Cachear modelo original SIN transformaciones
    // Clonar antes de guardar para asegurar que el original no se modifique
    const originalClone = model.clone();
    // Resetear escala del clon a 1,1,1 para asegurar que está limpio
    originalClone.scale.set(1, 1, 1);
    originalClone.position.set(0, 0, 0);
    originalClone.rotation.set(0, 0, 0);
    modelCache.set(modelUrl, originalClone);
    
    // Aplicar transformaciones al modelo original
    const transformed = applyTransformations(model, modelo3d, cellSize);
    return transformed;
}

/**
 * Aplicar transformaciones a un modelo
 * @param {THREE.Group} model - Modelo Three.js
 * @param {Object} modelo3d - Configuración del modelo
 * @param {number} cellSize - Tamaño de celda
 * @returns {THREE.Group} Modelo transformado
 */
function applyTransformations(model, modelo3d, cellSize) {
    // IMPORTANTE: Trabajar con un clon para no modificar el original en cache
    const transformed = model.clone();
    
    // Aplicar escala
    // Si no se especifica escala, usar 0.001 (0.1% del tamaño) en lugar de 1.0
    const escalaBase = modelo3d.escala !== undefined ? modelo3d.escala : 0.001;
    const escala = escalaBase * cellSize;
    
    // IMPORTANTE: Aplicar escala directamente al grupo transformado
    transformed.scale.set(escala, escala, escala);
    
    // Aplicar offset (en metros, convertir a coordenadas del juego)
    // Mapear ejes: juego (x,y,z) -> Three.js (x,z,y)
    // Juego: X=izq/der, Y=adelante/atrás, Z=arriba/abajo
    // Three.js: X=izq/der, Y=arriba/abajo, Z=adelante/atrás
    if (modelo3d.offset) {
        transformed.position.set(
            (modelo3d.offset.x || 0),
            (modelo3d.offset.z || 0), // Z del juego -> Y de Three.js (altura)
            (modelo3d.offset.y || 0)  // Y del juego -> Z de Three.js (profundidad)
        );
    }
    
    // Aplicar rotación (convertir grados a radianes)
    // Mapear rotaciones igual que posiciones
    if (modelo3d.rotacion) {
        transformed.rotation.set(
            ((modelo3d.rotacion.x || 0) * Math.PI) / 180,  // X igual
            ((modelo3d.rotacion.z || 0) * Math.PI) / 180, // Z del juego -> Y de Three.js
            ((modelo3d.rotacion.y || 0) * Math.PI) / 180  // Y del juego -> Z de Three.js
        );
    }
    
    // Habilitar sombras por defecto
    transformed.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    
    return transformed;
}

