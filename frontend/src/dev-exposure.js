/**
 * Módulo centralizado para exposición de herramientas de desarrollo
 * 
 * Centraliza la lógica de detección de entorno, inicialización y exposición de todas las
 * herramientas de desarrollo a la consola del navegador. Solo funciona en
 * modo desarrollo (localhost o NODE_ENV === 'development').
 * 
 * Para agregar nuevas funciones de desarrollo, simplemente agrégalas aquí.
 */

import { equipWeapon, getEquippedWeapon, listAvailableWeapons } from './utils/weapon-utils.js';
import { debugLogger } from './debug/logger.js';
import { stateValidator } from './debug/validator.js';
import { debugEvents } from './debug/events.js';
import { ECSInspector } from './debug/inspector.js';
import { DebugMetrics } from './debug/metrics.js';
import { DebugPanel } from './interfaces/debug-panel.js';
import { DebugInterface } from './interfaces/debug-interface.js';
import { TestInterface } from './interfaces/test-interface.js';

/**
 * Detectar si estamos en modo desarrollo
 * @returns {boolean} True si estamos en desarrollo
 */
export function isDevelopment() {
    if (typeof window === 'undefined') {
        return false;
    }
    
    return window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1' ||
           (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development');
}

/**
 * Inicializar todas las herramientas de debugging
 * 
 * Crea e inicializa todas las herramientas de debugging necesarias:
 * - Logger (habilitado)
 * - Inspector ECS
 * - Métricas de performance
 * - Validador de estado
 * - Sistema de eventos
 * - Panel de debugging
 * - Interfaz GUI (F4)
 * - Test Tools (F6)
 * 
 * @param {Object} app - Instancia de App
 * @returns {Object|null} Objeto con todas las herramientas inicializadas, o null si no está en desarrollo
 */
export function initDevelopmentTools(app) {
    if (!isDevelopment()) {
        return null;
    }
    
    // Logger (ya es singleton, solo habilitar)
    debugLogger.setEnabled(true);
    
    // Inspector ECS
    const inspector = new ECSInspector(app.ecs);
    inspector.setEnabled(true);
    
    // Métricas de performance
    const debugMetrics = new DebugMetrics(app.ecs);
    debugMetrics.setEnabled(true);
    app.ecs.setDebugMetrics(debugMetrics);
    
    // Validador (ya es singleton, solo habilitar)
    stateValidator.setEnabled(true);
    
    // Eventos (ya es singleton, solo habilitar)
    debugEvents.setEnabled(true);
    
    // Panel de debugging
    const debugPanel = new DebugPanel(app, app.ecs);
    debugPanel.setTools(inspector, debugMetrics);
    
    // Interfaz GUI de debugging (F4)
    const debugInterface = new DebugInterface(app, app.ecs);
    
    // Test Interface (F6) - Herramientas de testing (animaciones, armas, etc.)
    const testInterface = new TestInterface(app, app.ecs);
    
    return {
        inspector,
        metrics: debugMetrics,
        panel: debugPanel,
        interface: debugInterface,
        testInterface: testInterface
    };
}

/**
 * Exponer todas las herramientas de desarrollo globalmente
 * 
 * Esta función expone en window todas las herramientas útiles para desarrollo
 * y testing, incluyendo:
 * - window.app: Instancia principal de la aplicación
 * - window.developmentTools: Herramientas de debugging (logger, inspector, metrics, etc.)
 * - window.equipWeapon: Funciones para equipar/desequipar armas
 * - window.getEquippedWeapon: Obtener arma equipada
 * - window.listAvailableWeapons: Listar armas disponibles
 * 
 * @param {Object} app - Instancia de App
 * @param {Object} options - Opciones adicionales
 * @param {Object} [options.debugTools] - Objeto con herramientas de debug (inspector, metrics, panel, interface)
 *                                        Si no se proporciona, se inicializarán automáticamente
 */
export function exposeDevelopmentTools(app, options = {}) {
    if (!isDevelopment()) {
        return;
    }
    
    if (typeof window === 'undefined') {
        return;
    }
    
    // Exponer instancia de app
    window.app = app;
    
    // Inicializar o usar herramientas de debugging proporcionadas
    let developmentTools = options.developmentTools;
    if (!developmentTools && app.ecs) {
        developmentTools = initDevelopmentTools(app);
    }
    
    // Exponer herramientas de debugging si están disponibles
    if (developmentTools) {
        window.developmentTools = {
            logger: debugLogger,
            inspector: developmentTools.inspector,
            metrics: developmentTools.metrics,
            validator: stateValidator,
            events: debugEvents,
            panel: developmentTools.panel,
            interface: developmentTools.interface,
            testInterface: developmentTools.testInterface
        };
        
        // También exponer directamente para fácil acceso
        window.testInterface = developmentTools.testInterface;
        
        debugLogger.info('DebugTools', 'Herramientas de debugging inicializadas. Usa window.developmentTools para acceder.');
    }
    
    // Exponer utilidades de armas (funciones lazy que buscan playerId dinámicamente)
    if (app.ecs) {
        window.equipWeapon = (weaponType) => {
            // Validar que weaponType sea un string válido
            if (typeof weaponType !== 'string' && weaponType !== null) {
                debugLogger.error('WeaponUtils', 'equipWeapon requiere un string (tipo de arma) o null para desequipar', {
                    valorRecibido: weaponType,
                    tipoRecibido: typeof weaponType,
                    uso: 'equipWeapon("sword") o equipWeapon(null)'
                });
                return false;
            }
            
            if (!app.playerId) {
                debugLogger.warn('WeaponUtils', 'app.playerId no disponible todavía. Espera a que el juego cargue.');
                return false;
            }
            
            if (!app.ecs) {
                debugLogger.error('WeaponUtils', 'app.ecs no disponible.');
                return false;
            }
            
            return equipWeapon(app.ecs, app.playerId, weaponType);
        };
        
        window.getEquippedWeapon = () => {
            if (!app.playerId) {
                debugLogger.warn('WeaponUtils', 'app.playerId no disponible todavía.');
                return null;
            }
            if (!app.ecs) {
                debugLogger.error('WeaponUtils', 'app.ecs no disponible.');
                return null;
            }
            return getEquippedWeapon(app.ecs, app.playerId);
        };
        
        window.listAvailableWeapons = listAvailableWeapons;
        
        debugLogger.info('WeaponUtils', 'Funciones de armas disponibles: equipWeapon(type), getEquippedWeapon(), listAvailableWeapons()');
    } else {
        debugLogger.warn('WeaponUtils', 'app.ecs no disponible. Funciones de armas no expuestas.');
    }
    
    // Exponer funciones de verificación de optimizaciones JDG-047
    window.checkOptimizations = () => {
        debugLogger.info('Optimizations', 'Verificación de Optimizaciones');
        
        // 1. Verificar Object Pool
        if (app.objectPool) {
            debugLogger.info('Optimizations', 'Object Pool está inicializado');
            const poolStats = {};
            for (const [poolName, pool] of Object.entries(app.objectPool)) {
                const stats = pool.getStats();
                poolStats[poolName] = {
                    'Objetos en pool': stats.poolSize,
                    'Total creados': stats.totalCreated,
                    'Total reutilizados': stats.totalReused,
                    'Tasa de reutilización': stats.reuseRate.toFixed(2) + '%'
                };
            }
            debugLogger.info('Optimizations', 'Estadísticas de pools:', poolStats);
            
            // Calcular tasa de reutilización global
            let totalCreated = 0;
            let totalReused = 0;
            for (const pool of Object.values(app.objectPool)) {
                const stats = pool.getStats();
                totalCreated += stats.totalCreated;
                totalReused += stats.totalReused;
            }
            const globalReuseRate = totalCreated + totalReused > 0 
                ? (totalReused / (totalCreated + totalReused)) * 100 
                : 0;
            debugLogger.info('Optimizations', `Tasa de reutilización global: ${globalReuseRate.toFixed(2)}%`);
            if (globalReuseRate > 50) {
                debugLogger.info('Optimizations', 'Excelente! El pool está siendo utilizado eficientemente');
            } else if (globalReuseRate > 20) {
                debugLogger.warn('Optimizations', 'El pool se está usando, pero podría mejorar');
            } else {
                debugLogger.warn('Optimizations', 'El pool no se está usando mucho. ¿Hay objetos siendo creados?');
            }
        } else {
            debugLogger.error('Optimizations', 'Object Pool NO está inicializado');
        }
        
        // 2. Verificar Cache de Sistemas ECS
        if (app.ecs) {
            const hasCache = app.ecs.sortedSystems !== null && app.ecs.sortedSystems !== undefined;
            const isDirty = app.ecs.systemsDirty;
            const stats = app.ecs.cacheStats || { totalUpdates: 0, cacheHits: 0, cacheMisses: 0 };
            const hitRate = stats.totalUpdates > 0 ? (stats.cacheHits / stats.totalUpdates) * 100 : 0;
            
            debugLogger.info('Optimizations', 'ECS Manager está disponible');
            debugLogger.info('Optimizations', 'Cache de sistemas:', {
                'Cache existe': hasCache ? 'Sí' : 'No',
                'Sistemas en cache': hasCache ? app.ecs.sortedSystems.length : 0,
                'Total sistemas': app.ecs.systems.length,
                'Flag dirty': isDirty ? 'Sí (necesita reordenar)' : 'No (cache válido)'
            });
            
            if (stats.totalUpdates > 0) {
                debugLogger.info('Optimizations', 'Estadísticas de cache:', {
                    'Total updates': stats.totalUpdates,
                    'Cache hits': stats.cacheHits,
                    'Cache misses': stats.cacheMisses,
                    'Tasa de hit': hitRate.toFixed(2) + '%'
                });
                if (hitRate > 90) {
                    debugLogger.info('Optimizations', 'Excelente! El cache está funcionando muy bien');
                } else if (hitRate > 50) {
                    debugLogger.info('Optimizations', 'El cache está funcionando correctamente');
                } else {
                    debugLogger.warn('Optimizations', 'El cache podría mejorar (muchos misses)');
                }
            }
            
            if (hasCache && !isDirty) {
                debugLogger.info('Optimizations', 'El cache está funcionando correctamente. Los sistemas solo se ordenarán cuando cambien');
            } else if (isDirty) {
                debugLogger.warn('Optimizations', 'El cache está marcado como dirty (esto es normal si acabas de agregar sistemas)');
            }
        } else {
            debugLogger.error('Optimizations', 'ECS Manager NO está disponible');
        }
        
        // 3. Verificar Dirty Flag del Cielo
        if (app.scene && app.scene.renderer) {
            const renderer = app.scene.renderer;
            const hasDirtyFlag = renderer.lastSkyColor !== undefined || 
                                renderer.lastSunIntensity !== undefined;
            
            debugLogger.info('Optimizations', 'Renderer está disponible');
            const skyStats = renderer.getSkyColorStats ? renderer.getSkyColorStats() : null;
            debugLogger.info('Optimizations', 'Dirty Flag del Cielo:', {
                'Sistema implementado': hasDirtyFlag ? 'Sí' : 'No',
                'Última intensidad solar': renderer.lastSunIntensity !== undefined 
                    ? renderer.lastSunIntensity.toFixed(3) 
                    : 'N/A',
                'Último color del cielo': renderer.lastSkyColor 
                    ? `RGB(${renderer.lastSkyColor.r.toFixed(3)}, ${renderer.lastSkyColor.g.toFixed(3)}, ${renderer.lastSkyColor.b.toFixed(3)})` 
                    : 'N/A',
                'Threshold': renderer.skyColorChangeThreshold || 'N/A',
                'Flag dirty': renderer.skyColorDirty ? 'Sí' : 'No'
            });
            
            if (skyStats) {
                debugLogger.info('Optimizations', 'Estadísticas de uso:', skyStats);
                if (parseFloat(skyStats.skipRate) > 50) {
                    debugLogger.info('Optimizations', 'Excelente! El dirty flag está evitando muchas actualizaciones innecesarias');
                }
            }
        } else {
            debugLogger.error('Optimizations', 'Renderer NO está disponible');
        }
        
        debugLogger.info('Optimizations', 'Fin de Verificación');
    };
    
    // Función para monitorear uso del object pool en tiempo real
    window.monitorObjectPool = (intervalSeconds = 5) => {
        if (!app.objectPool) {
            debugLogger.error('Optimizations', 'Object Pool no está disponible');
            return;
        }
        
        debugLogger.info('Optimizations', `Monitoreando Object Pool cada ${intervalSeconds} segundos...`);
        debugLogger.info('Optimizations', 'Ejecuta clearInterval(window._objectPoolMonitor) para detener');
        
        const interval = setInterval(() => {
            const poolStats = {};
            for (const [poolName, pool] of Object.entries(app.objectPool)) {
                const stats = pool.getStats();
                poolStats[poolName] = {
                    'En pool': stats.poolSize,
                    'Creados': stats.totalCreated,
                    'Reutilizados': stats.totalReused,
                    'Reutilización': stats.reuseRate.toFixed(2) + '%'
                };
            }
            debugLogger.info('Optimizations', `Monitoreo de Object Pool - ${new Date().toLocaleTimeString()}`, poolStats);
        }, intervalSeconds * 1000);
        
        // Guardar interval para poder detenerlo
        window._objectPoolMonitor = interval;
        
        return {
            stop: () => {
                clearInterval(interval);
                debugLogger.info('Optimizations', 'Monitoreo detenido');
            }
        };
    };
    
    // Función para verificar optimizaciones avanzadas (Frustum Culling, LOD, Render Batching)
    window.checkAdvancedOptimizations = () => {
        debugLogger.info('Optimizations', 'Verificación de Optimizaciones Avanzadas');
        
        // 1. Verificar Frustum Culling
        if (app.frustumCuller) {
            debugLogger.info('Optimizations', 'Frustum Culling está inicializado');
            const frustumStats = app.frustumCuller.getStats();
            
            // Contar entidades totales para contexto
            const totalEntities = app.ecs ? app.ecs.query().size : 0;
            
            debugLogger.info('Optimizations', 'Estadísticas de Frustum Culling:', {
                'Total entidades ECS': totalEntities,
                'Total verificaciones': frustumStats.totalChecks,
                'Objetos visibles': frustumStats.visibleObjects,
                'Objetos culled': frustumStats.culledObjects,
                'Tasa de culling': frustumStats.cullRate,
                'Eficiencia': frustumStats.efficiency
            });
            
            if (frustumStats.totalChecks > 0) {
                const cullRateNum = parseFloat(frustumStats.cullRate);
                if (cullRateNum > 30) {
                    debugLogger.info('Optimizations', 'Excelente! Frustum Culling está eliminando muchos objetos invisibles');
                } else if (cullRateNum > 10) {
                    debugLogger.info('Optimizations', 'Frustum Culling está funcionando correctamente');
                } else if (totalEntities <= 5) {
                    debugLogger.info('Optimizations', 'Frustum Culling: 0% culling es normal con pocas entidades. Todas están visibles.');
                } else {
                    debugLogger.warn('Optimizations', 'Frustum Culling tiene baja eficiencia. Puede ser que todas las entidades estén dentro del frustum, o que necesite ajustes.');
                    debugLogger.info('Optimizations', 'Sugerencia: Mueve la cámara lejos o rota para ver si objetos se cullen correctamente.');
                }
            }
        } else {
            debugLogger.error('Optimizations', 'Frustum Culling NO está inicializado');
        }
        
        // 2. Verificar LOD Manager
        if (app.lodManager) {
            debugLogger.info('Optimizations', 'LOD Manager está inicializado');
            const lodStats = app.lodManager.getStats();
            debugLogger.info('Optimizations', 'Estadísticas de LOD:', {
                'Total actualizaciones': lodStats.totalUpdates,
                'LOD Alto': lodStats.highLODCount,
                'LOD Bajo': lodStats.lowLODCount,
                'Tasa LOD Alto': lodStats.highLODRate,
                'Tasa LOD Bajo': lodStats.lowLODRate,
                'Eficiencia': lodStats.efficiency
            });
            
            debugLogger.info('Optimizations', 'Configuración LOD:', {
                'Distancia cercana': app.lodManager.nearDistance + ' unidades',
                'Distancia lejana': app.lodManager.farDistance + ' unidades'
            });
            
            if (lodStats.totalUpdates > 0) {
                const lowLODRateNum = parseFloat(lodStats.lowLODRate);
                if (lowLODRateNum > 30) {
                    debugLogger.info('Optimizations', 'Excelente! Muchas entidades están usando LOD bajo');
                } else if (lowLODRateNum > 10) {
                    debugLogger.info('Optimizations', 'LOD está funcionando correctamente');
                } else {
                    debugLogger.info('Optimizations', 'LOD: Baja tasa indica que las entidades están cerca de la cámara. Esto es normal si hay pocas entidades o están concentradas.');
                    debugLogger.info('Optimizations', 'Sugerencia: El LOD será más útil cuando haya muchas entidades distribuidas en un área grande.');
                }
            }
        } else {
            debugLogger.error('Optimizations', 'LOD Manager NO está inicializado');
        }
        
        // 3. Verificar Render Batching
        // Nota: Render Batching puede no estar en uso aún, pero verificar si existe
        if (app.renderBatcher) {
            debugLogger.info('Optimizations', 'Render Batcher está inicializado');
            const batchStats = app.renderBatcher.getStats();
            debugLogger.info('Optimizations', 'Estadísticas de Render Batching:', {
                'Total meshes': batchStats.totalMeshes,
                'Total batches': batchStats.totalBatches,
                'Tamaño promedio batch': batchStats.averageBatchSize,
                'Eficiencia': batchStats.efficiency
            });
            
            if (batchStats.totalBatches > 0) {
                if (parseFloat(batchStats.averageBatchSize) > 5) {
                    debugLogger.info('Optimizations', 'Excelente! Render Batching está agrupando eficientemente');
                } else if (parseFloat(batchStats.averageBatchSize) > 2) {
                    debugLogger.info('Optimizations', 'Render Batching está funcionando correctamente');
                } else {
                    debugLogger.warn('Optimizations', 'Render Batching podría mejorar (batches pequeños)');
                }
            }
        } else {
            debugLogger.warn('Optimizations', 'Render Batcher no está inicializado (opcional, puede agregarse cuando sea necesario)');
        }
        
        // 4. Verificar Instancing Manager (JDG-049)
        if (app.instancingManager) {
            debugLogger.info('Optimizations', 'Instancing Manager está inicializado');
            const instancingStats = app.instancingManager.getStats();
            debugLogger.info('Optimizations', 'Estadísticas de Instancing:', {
                'Total grupos': instancingStats.totalGroups,
                'Total instancias': instancingStats.totalInstances,
                'Draw calls ahorrados': instancingStats.savedDrawCalls,
                'Eficiencia': instancingStats.efficiency
            });
            
            if (instancingStats.totalInstances > 0) {
                if (instancingStats.savedDrawCalls > 50) {
                    debugLogger.info('Optimizations', 'Excelente! Instancing está ahorrando muchos draw calls');
                } else if (instancingStats.savedDrawCalls > 10) {
                    debugLogger.info('Optimizations', 'Instancing está funcionando correctamente');
                } else {
                    debugLogger.info('Optimizations', 'Instancing creado pero con poco uso. Será más útil con muchas entidades similares.');
                }
            }
        } else {
            debugLogger.warn('Optimizations', 'Instancing Manager no está inicializado');
        }
        
        // 5. Verificar Frame Scheduler (JDG-049)
        if (app.frameScheduler) {
            debugLogger.info('Optimizations', 'Frame Scheduler está inicializado');
            const schedulerStats = app.frameScheduler.getStats();
            debugLogger.info('Optimizations', 'Estadísticas de Frame Scheduler:', {
                'Total registraciones': schedulerStats.totalRegistrations,
                'Total updates': schedulerStats.totalUpdates,
                'Updates saltados': schedulerStats.skippedUpdates,
                'Total programados': schedulerStats.totalScheduled,
                'Tasa de skip': schedulerStats.skipRate,
                'Eficiencia': schedulerStats.efficiency
            });
            
            if (schedulerStats.totalScheduled > 0) {
                const skipRateNum = parseFloat(schedulerStats.skipRate);
                if (skipRateNum > 30) {
                    debugLogger.info('Optimizations', 'Excelente! Frame Scheduler está distribuyendo carga eficientemente');
                } else if (skipRateNum > 10) {
                    debugLogger.info('Optimizations', 'Frame Scheduler está funcionando correctamente');
                } else {
                    debugLogger.info('Optimizations', 'Frame Scheduler creado pero con poco uso. Los sistemas pueden usarlo opcionalmente.');
                }
            }
        } else {
            debugLogger.error('Optimizations', 'Frame Scheduler NO está inicializado');
        }
        
        // 6. Verificar Spatial Grid (JDG-049)
        if (app.spatialGrid) {
            debugLogger.info('Optimizations', 'Spatial Grid está inicializado');
            const spatialStats = app.spatialGrid.getStats();
            debugLogger.info('Optimizations', 'Estadísticas de Spatial Grid:', {
                'Total entidades': spatialStats.totalEntities,
                'Total celdas': spatialStats.totalCells,
                'Queries realizadas': spatialStats.queries,
                'Promedio entidades por celda': spatialStats.averageEntitiesPerCell,
                'Eficiencia': spatialStats.efficiency
            });
            
            debugLogger.info('Optimizations', 'Configuración Spatial Grid:', {
                'Tamaño de celda': app.spatialGrid.cellSize + ' unidades'
            });
            
            if (spatialStats.totalEntities > 0) {
                const avgPerCell = parseFloat(spatialStats.averageEntitiesPerCell);
                if (avgPerCell < 10) {
                    debugLogger.info('Optimizations', 'Excelente! Spatial Grid está distribuido eficientemente');
                } else if (avgPerCell < 50) {
                    debugLogger.info('Optimizations', 'Spatial Grid está funcionando correctamente');
                } else {
                    debugLogger.warn('Optimizations', 'Spatial Grid tiene muchas entidades por celda. Considera aumentar tamaño de celda.');
                }
            } else {
                debugLogger.info('Optimizations', 'Spatial Grid creado pero sin entidades aún. Se actualizará cuando las entidades se muevan.');
            }
        } else {
            debugLogger.warn('Optimizations', 'Spatial Grid no está inicializado');
        }
        
        debugLogger.info('Optimizations', 'Fin de Verificación de Optimizaciones Avanzadas');
    };
    
    // Función para monitorear optimizaciones avanzadas en tiempo real
    window.monitorAdvancedOptimizations = (intervalSeconds = 5) => {
        debugLogger.info('Optimizations', `Monitoreando Optimizaciones Avanzadas cada ${intervalSeconds} segundos...`);
        debugLogger.info('Optimizations', 'Ejecuta clearInterval(window._advancedOptimizationsMonitor) para detener');
        
        const interval = setInterval(() => {
            debugLogger.info('Optimizations', `Monitoreo Optimizaciones Avanzadas - ${new Date().toLocaleTimeString()}`);
            
            // Frustum Culling
            if (app.frustumCuller) {
                const frustumStats = app.frustumCuller.getStats();
                debugLogger.info('Optimizations', 'Frustum Culling', {
                    'Verificaciones': frustumStats.totalChecks,
                    'Visibles': frustumStats.visibleObjects,
                    'Culled': frustumStats.culledObjects,
                    'Tasa culling': frustumStats.cullRate
                });
            }
            
            // LOD Manager
            if (app.lodManager) {
                const lodStats = app.lodManager.getStats();
                debugLogger.info('Optimizations', 'LOD Manager', {
                    'Actualizaciones': lodStats.totalUpdates,
                    'LOD Alto': lodStats.highLODCount,
                    'LOD Bajo': lodStats.lowLODCount,
                    'Tasa LOD Bajo': lodStats.lowLODRate
                });
            }
            
            // Render Batching
            if (app.renderBatcher) {
                const batchStats = app.renderBatcher.getStats();
                debugLogger.info('Optimizations', 'Render Batching', {
                    'Meshes': batchStats.totalMeshes,
                    'Batches': batchStats.totalBatches,
                    'Promedio': batchStats.averageBatchSize
                });
            }
            
            // Instancing Manager
            if (app.instancingManager) {
                const instancingStats = app.instancingManager.getStats();
                debugLogger.info('Optimizations', 'Instancing Manager', {
                    'Grupos': instancingStats.totalGroups,
                    'Instancias': instancingStats.totalInstances,
                    'Draw calls ahorrados': instancingStats.savedDrawCalls
                });
            }
            
            // Frame Scheduler
            if (app.frameScheduler) {
                const schedulerStats = app.frameScheduler.getStats();
                debugLogger.info('Optimizations', 'Frame Scheduler', {
                    'Programados': schedulerStats.totalScheduled,
                    'Updates': schedulerStats.totalUpdates,
                    'Saltados': schedulerStats.skippedUpdates,
                    'Tasa skip': schedulerStats.skipRate
                });
            }
            
            // Spatial Grid
            if (app.spatialGrid) {
                const spatialStats = app.spatialGrid.getStats();
                debugLogger.info('Optimizations', 'Spatial Grid', {
                    'Entidades': spatialStats.totalEntities,
                    'Celdas': spatialStats.totalCells,
                    'Queries': spatialStats.queries,
                    'Promedio/celda': spatialStats.averageEntitiesPerCell
                });
            }
        }, intervalSeconds * 1000);
        
        // Guardar interval para poder detenerlo
        window._advancedOptimizationsMonitor = interval;
        
        return {
            stop: () => {
                clearInterval(interval);
                debugLogger.info('Optimizations', 'Monitoreo de Optimizaciones Avanzadas detenido');
            }
        };
    };
    
    // Informar sobre funciones de verificación disponibles
        // Exponer función de verificación de optimizaciones de partículas (JDG-008)
        window.checkParticleOptimizations = () => {
            if (!app.terrain || !app.terrain.renderer) {
                debugLogger.error('ParticleOptimizations', 'TerrainManager o ParticleRenderer no disponible');
                return;
            }
            
            debugLogger.info('ParticleOptimizations', 'Verificación de Optimizaciones de Partículas');
            
            const stats = app.terrain.renderer.getOptimizationStats();
            const performanceMetrics = app.performanceManager?.getMetrics() || {};
            
            debugLogger.info('ParticleOptimizations', 'Estado de optimizaciones:', {
                frustumCulling: stats.frustumCulling.enabled ? 'Habilitado' : 'Deshabilitado',
                lod: stats.lod.enabled ? 'Habilitado' : 'Deshabilitado',
                particleLimiting: stats.particleLimiting.enabled ? 'Habilitado' : 'Deshabilitado',
                adaptiveLimiting: stats.adaptiveLimiting.enabled ? 'Habilitado' : 'Deshabilitado'
            });
            
            if (stats.particleLimiting.enabled) {
                const limitStats = stats.particleLimiting.stats;
                debugLogger.info('ParticleOptimizations', 'Estadísticas de limitación:', {
                    'Límite actual': stats.particleLimiting.currentLimit,
                    'Partículas entrada': limitStats.totalInput || 0,
                    'Partículas salida': limitStats.totalOutput || 0,
                    'Cercanas (<20m)': limitStats.nearParticles || 0,
                    'Medianas (20-50m)': `${limitStats.mediumParticles || 0} → ${limitStats.mediumSampled || 0}`,
                    'Lejanas (>50m)': `${limitStats.farParticles || 0} → ${limitStats.farSampled || 0}`
                });
            }
            
            if (stats.adaptiveLimiting.enabled) {
                debugLogger.info('ParticleOptimizations', 'Adaptación dinámica:', {
                    'FPS actual': stats.adaptiveLimiting.fps || 'N/A',
                    'Límite actual': stats.adaptiveLimiting.currentLimit,
                    'Estado': stats.adaptiveLimiting.fps < 45 ? 'Crítico (reduciendo límite)' :
                             stats.adaptiveLimiting.fps < 55 ? 'Bajo (límite reducido)' :
                             stats.adaptiveLimiting.fps < 59 ? 'Medio (límite medio)' :
                             stats.adaptiveLimiting.fps >= 60 ? 'Óptimo (límite máximo)' : 'Desconocido'
                });
            }
            
            debugLogger.info('ParticleOptimizations', 'Configuración de densidad:', {
                'Distancia cercana': `${stats.densityLimiting.near}m (100% partículas)`,
                'Distancia lejana': `${stats.densityLimiting.far}m (25% partículas)`
            });
            
            debugLogger.info('ParticleOptimizations', 'Performance:', {
                'FPS': performanceMetrics.fps || 'N/A',
                'Draw Calls': performanceMetrics.drawCalls || 'N/A'
            });
        };
        
        debugLogger.info('Optimizations', 'Funciones de verificación disponibles: checkOptimizations(), monitorObjectPool(seconds), checkAdvancedOptimizations(), monitorAdvancedOptimizations(seconds), checkParticleOptimizations()');
    
    // Retornar las herramientas para que puedan ser guardadas en app si es necesario
    return developmentTools;
}

/**
 * Exponer app básico (útil antes de que esté completamente inicializada)
 * 
 * @param {Object} app - Instancia de App
 */
export function exposeAppOnly(app) {
    if (!isDevelopment()) {
        return;
    }
    
    if (typeof window === 'undefined') {
        return;
    }
    
    window.app = app;
}
