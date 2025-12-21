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
 * - window.debugTools: Herramientas de debugging (logger, inspector, metrics, etc.)
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
        
        console.log('[DebugTools] Herramientas de debugging inicializadas. Usa window.debugTools para acceder.');
        console.log('[DebugTools] Interface disponible:', developmentTools.interface ? 'Sí' : 'No');
        console.log('[DebugTools] Interface enabled:', developmentTools.interface?.enabled);
        console.log('[DebugTools] Test Interface disponible: F6 para abrir/cerrar');
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
