/**
 * Helper para Carga de Modelos de Armas
 * 
 * Maneja la carga de modelos de armas desde archivos GLB con gestión de cache
 * y promesas para evitar cargas duplicadas.
 */
import { getBackendBaseUrl } from '../../../../../shared/config.js';
import { debugLogger } from '../../../../../debug/logger.js';

export class WeaponModelLoader {
    constructor(modelLoader, weaponCache, weaponInspector) {
        this.modelLoader = modelLoader;
        this.weaponCache = weaponCache;
        this.weaponInspector = weaponInspector; // Para inspeccionar modelos después de cargar
        // Cache de promesas de carga para evitar cargas duplicadas
        this.loadingPromises = new Map();
    }

    /**
     * Cargar modelo de arma con cache y gestión de promesas
     * @param {string} weaponConfigPath - Ruta del modelo desde WEAPON_MODELS
     * @param {Object|null} objectPool - Object Pool opcional (optimización JDG-047)
     * @returns {Promise<THREE.Object3D>} Modelo cargado o desde cache
     */
    async loadWeaponModel(weaponConfigPath, objectPool = null) {
        // Construir URL del modelo
        const backendBase = getBackendBaseUrl();
        const modelUrl = `${backendBase}/static/models/${weaponConfigPath}`;
        
        debugLogger.debug('WeaponModelLoader', `Iniciando carga de modelo de arma`, {
            weaponConfigPath,
            modelUrl
        });
        
        // Verificar si ya se está cargando este modelo
        if (this.loadingPromises.has(modelUrl)) {
            debugLogger.debug('WeaponModelLoader', `Modelo ya está cargando, esperando...`, {
                modelUrl
            });
            // Esperar a que termine la carga en curso
            const weaponModel = await this.loadingPromises.get(modelUrl);
            debugLogger.debug('WeaponModelLoader', `Modelo terminó de cargar (desde promesa)`, {
                modelUrl,
                modelType: weaponModel?.constructor?.name,
                hasChildren: weaponModel?.children?.length
            });
            return weaponModel;
        }
        
        // Verificar cache
        if (this.weaponCache.has(modelUrl)) {
            debugLogger.debug('WeaponModelLoader', `Modelo encontrado en cache`, {
                modelUrl
            });
            const weaponModel = this.weaponCache.get(modelUrl); // Ya clona internamente
            debugLogger.debug('WeaponModelLoader', `Modelo clonado desde cache`, {
                modelUrl,
                modelType: weaponModel?.constructor?.name,
                hasChildren: weaponModel?.children?.length
            });
            return weaponModel;
        }
        
        // Cargar modelo (crear promesa para evitar cargas duplicadas)
        const loadPromise = this.modelLoader.loadModel(modelUrl, 'glb')
            .then(loadedModel => {
                // Inspeccionar estructura completa del modelo usando WeaponModelInspector
                const modelStructure = this.weaponInspector.inspectWeaponModel(loadedModel, modelUrl, objectPool);
                
                debugLogger.debug('WeaponModelLoader', `Modelo cargado exitosamente`, {
                    modelUrl,
                    modelType: loadedModel?.constructor?.name,
                    hasChildren: loadedModel?.children?.length,
                    childrenNames: loadedModel?.children?.map(c => c.name || c.type)
                });
                
                // Log resumen de la estructura
                debugLogger.info('WeaponModelLoader', `Análisis de estructura del modelo de arma`, {
                    url: modelStructure.url,
                    summary: modelStructure.analysis.summary,
                    hasIntermediateGroups: modelStructure.analysis.hasIntermediateGroups,
                    warning: modelStructure.analysis.summary.warning
                });
                
                // Log detallado de la jerarquía completa
                debugLogger.info('WeaponModelLoader', `Jerarquía completa del modelo`, {
                    url: modelStructure.url,
                    hierarchy: modelStructure.hierarchy.map(obj => ({
                        depth: obj.depth,
                        path: obj.path.join(' → '),
                        type: obj.type,
                        name: obj.name,
                        hasTransform: obj.hasTransform,
                        localPosition: obj.localTransform.position,
                        worldPosition: obj.worldTransform.position
                    }))
                });
                
                // Log de paths desde meshes hasta root
                debugLogger.info('WeaponModelLoader', `Paths desde meshes hasta root`, {
                    url: modelStructure.url,
                    meshPaths: modelStructure.analysis.meshPathToRoot.map(m => ({
                        meshName: m.meshName,
                        path: m.path.join(' → '),
                        depth: m.depth,
                        localPosition: m.localPosition,
                        worldPosition: m.worldPosition,
                        distanceFromOrigin: m.distanceFromOrigin.toFixed(3)
                    }))
                });
                
                // Log de transformaciones que pueden afectar el origen
                if (modelStructure.analysis.totalTransformations.length > 0) {
                    debugLogger.warn('WeaponModelLoader', `⚠️ Transformaciones detectadas que pueden afectar el origen`, {
                        url: modelStructure.url,
                        transformations: modelStructure.analysis.totalTransformations.map(t => ({
                            type: t.type,
                            name: t.name,
                            path: t.path.join(' → '),
                            transform: t.transform,
                            note: t.note
                        }))
                    });
                }
                
                // Log completo de estructura (para debugging detallado)
                debugLogger.debug('WeaponModelLoader', `Estructura completa detallada del modelo`, {
                    url: modelStructure.url,
                    root: modelStructure.root,
                    totalMeshes: modelStructure.meshes.length,
                    totalGroups: modelStructure.groups.length,
                    totalOther: modelStructure.other.length,
                    meshes: modelStructure.meshes,
                    groups: modelStructure.groups,
                    other: modelStructure.other,
                    analysis: modelStructure.analysis
                });
                
                // Clonar y cachear el modelo original
                const originalClone = loadedModel.clone();
                originalClone.scale.set(1, 1, 1);
                this.weaponCache.set(modelUrl, originalClone);
                this.loadingPromises.delete(modelUrl);
                debugLogger.debug('WeaponModelLoader', `Modelo clonado y cacheado`, {
                    modelUrl
                });
                return loadedModel;
            })
            .catch(error => {
                debugLogger.error('WeaponModelLoader', `Error en promesa de carga`, {
                    modelUrl,
                    error: error.message,
                    stack: error.stack
                });
                // Remover promesa del cache en caso de error
                this.loadingPromises.delete(modelUrl);
                throw error;
            });
        
        this.loadingPromises.set(modelUrl, loadPromise);
        const weaponModel = await loadPromise;
        debugLogger.debug('WeaponModelLoader', `Modelo listo para usar`, {
            modelUrl,
            modelType: weaponModel?.constructor?.name,
            hasChildren: weaponModel?.children?.length
        });
        return weaponModel;
    }

    /**
     * Limpiar recursos del loader
     */
    destroy() {
        // Limpiar cache de promesas
        this.loadingPromises.clear();
    }
}
