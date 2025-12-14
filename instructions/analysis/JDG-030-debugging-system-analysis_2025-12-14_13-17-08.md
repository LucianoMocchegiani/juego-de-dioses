# Análisis de Arquitectura - Sistema de Debugging y Herramientas de Desarrollo (JDG-030)

## Situación Actual

### Contexto del Proyecto

El proyecto **Juego de Dioses** utiliza una arquitectura ECS (Entity Component System) en el frontend con Three.js para renderizado 3D. Los sistemas principales incluyen:

- **Sistemas ECS**: InputSystem, PhysicsSystem, CombatSystem, AnimationStateSystem, AnimationMixerSystem, CollisionSystem, RenderSystem
- **Gestión de Estado**: Store centralizado, PerformanceManager básico
- **Renderizado**: Three.js con modelos GLB y animaciones
- **Combat System**: Sistema de combate con acciones, combos, cooldowns

### Estado Actual del Debugging

#### Herramientas Existentes

1. **PerformanceManager Básico** (`frontend/src/managers/performance-manager.js`):
   - Medición de FPS (solo cuando `isProfiling` está activo)
   - Conteo aproximado de draw calls
   - Sistema de suscripción para métricas
   - Métricas limitadas: solo FPS y draw calls

2. **Logs Esporádicos**:
   - ~40 logs fueron eliminados/comentados en limpieza previa (JDG-012)
   - Algunos `console.warn` y `console.error` comentados en sistemas críticos
   - No hay sistema estructurado de logging

3. **Validación Mínima**:
   - No hay validación de estados inválidos en runtime
   - No hay warnings cuando hay inconsistencias de estado
   - Difícil detectar problemas de animaciones que no se reproducen

#### Problemas Identificados

##### 1. **Falta de Logging Estructurado**

**Problema:** No hay sistema centralizado de logging para debugging:

```javascript
// Estado actual: logs esporádicos y no estructurados
// animation-mixer-system.js
if (!animation) {
    console.warn('Animation not found'); // Sin contexto, sin timestamp
}

// combat-system.js
if (!animationState) {
    // No hay log, solo falla silenciosamente
}
```

**Impacto:**
- Difícil rastrear problemas de animaciones que no se reproducen
- No hay contexto temporal (cuándo ocurrió el problema)
- No hay información sobre el estado del sistema cuando ocurre el error
- Imposible filtrar logs por sistema o nivel de severidad

##### 2. **Falta de Inspección de Estado en Runtime**

**Problema:** No hay forma de inspeccionar el estado de entidades y componentes en tiempo real:

```javascript
// No hay forma de ver:
// - ¿Qué entidades tienen qué componentes?
// - ¿Cuál es el estado actual de AnimationComponent?
// - ¿Por qué una animación no se está reproduciendo?
// - ¿Qué acción de combate está activa?
```

**Impacto:**
- Debugging requiere agregar `console.log` manualmente
- No se puede inspeccionar estado sin modificar código
- Difícil entender el flujo de datos entre sistemas
- No hay visibilidad del estado del ECS

##### 3. **Métricas de Performance Limitadas**

**Problema:** `PerformanceManager` solo mide FPS y draw calls:

```javascript
// performance-manager.js - Métricas actuales
getMetrics() {
    return {
        fps: this.fps,
        drawCalls: this.lastDrawCalls
    };
}
```

**Falta:**
- Tiempo de ejecución por sistema (cuál sistema es más lento)
- Número de entidades procesadas por sistema
- Accesos a componentes (cuántos `getComponent()` por frame)
- Memoria usada (objetos Three.js, caches)
- Frame time breakdown (input → physics → combat → animation → render)

**Impacto:**
- No se puede identificar cuellos de botella de performance
- No se puede medir impacto de optimizaciones
- Difícil detectar memory leaks

##### 4. **Falta de Validación de Estado**

**Problema:** No hay validación para detectar estados inválidos:

```javascript
// animation-mixer-system.js
resolveAnimationName(entityId, stateId) {
    // No valida que stateId exista en ANIMATION_STATES
    // No valida que animationName exista en ANIMATION_FILES
    // Falla silenciosamente si hay error
}

// combat-system.js
applyActionConfig(combat, actionConfig) {
    // No valida que actionConfig.animationStateId exista
    // No valida que combat.activeAction exista en COMBAT_ACTIONS
}
```

**Impacto:**
- Bugs silenciosos (animación no se reproduce y no se sabe por qué)
- Difícil de debuggear (no hay warnings)
- Errores de tipeo en configs no se detectan hasta runtime

##### 5. **Falta de Herramientas de Visualización**

**Problema:** No hay herramientas visuales para debugging:

- No hay panel de debugging en la UI
- No hay visualización de entidades y componentes
- No hay timeline de eventos (cuándo se activó una acción, cuándo terminó)
- No hay visualización de métricas en tiempo real

**Impacto:**
- Debugging requiere conocimiento profundo del código
- Difícil para nuevos desarrolladores entender el sistema
- No se puede monitorear el juego en tiempo real

##### 6. **Falta de Sistema de Eventos para Debugging**

**Problema:** No hay sistema de eventos estructurado para debugging:

```javascript
// No hay forma de escuchar eventos como:
// - "animación iniciada"
// - "acción de combate activada"
// - "componente agregado/removido"
// - "sistema actualizado"
```

**Impacto:**
- No se puede rastrear el flujo de eventos
- Difícil entender la secuencia de acciones
- No se puede hacer profiling de eventos específicos

## Necesidades Futuras

### Requisitos de Debugging

1. **Logging Estructurado:**
   - Logs con contexto (sistema, entidad, timestamp)
   - Niveles de log (debug, info, warn, error)
   - Filtrado por sistema, nivel, entidad
   - Opcional (no afecta performance en producción)

2. **Inspección de Estado:**
   - Ver entidades y sus componentes en tiempo real
   - Ver estado actual de componentes específicos
   - Buscar entidades por componente o valor
   - Modificar valores en runtime (para testing)

3. **Métricas Detalladas:**
   - Frame time breakdown por sistema
   - Número de entidades procesadas
   - Accesos a componentes (cache hits/misses)
   - Memoria usada (Three.js objects, caches)
   - Eventos por segundo

4. **Validación de Estado:**
   - Validar estados inválidos con warnings
   - Validar configuraciones en runtime
   - Detectar inconsistencias entre componentes
   - Validar transiciones de estado

5. **Herramientas Visuales:**
   - Panel de debugging en UI (opcional, activable con tecla)
   - Visualización de entidades y componentes
   - Timeline de eventos
   - Gráficos de métricas en tiempo real

6. **Sistema de Eventos:**
   - Emitir eventos estructurados para debugging
   - Escuchar eventos específicos
   - Timeline de eventos con timestamps

### Requisitos de Performance

1. **Zero Overhead en Producción:**
   - Todas las herramientas de debugging deben ser opcionales
   - No afectar performance cuando están deshabilitadas
   - Usar flags de entorno o configuración

2. **Sampling Opcional:**
   - Métricas pueden usar sampling (solo cada N frames)
   - Logs pueden usar rate limiting
   - Validación solo en desarrollo

3. **Eficiencia:**
   - Caches para inspección de estado
   - Lazy evaluation de métricas
   - Minimizar allocations en hot paths

## Arquitectura Propuesta

### Visión General

El sistema de debugging propuesto consta de varios módulos independientes pero integrados:

```
debug/
├── logger.js              # Sistema de logging estructurado
├── inspector.js           # Inspección de estado ECS
├── metrics.js             # Métricas detalladas de performance
├── validator.js           # Validación de estado
├── events.js              # Sistema de eventos para debugging
├── ui/                    # Herramientas visuales (opcional)
│   ├── debug-panel.js     # Panel de debugging en UI
│   ├── entity-viewer.js   # Visualizador de entidades
│   └── metrics-chart.js   # Gráficos de métricas
└── config.js              # Configuración centralizada
```

### Cambio 1: Sistema de Logging Estructurado

**Problema:** Logs esporádicos sin estructura.

**Solución:** Crear `DebugLogger` centralizado:

```javascript
// frontend/src/debug/logger.js
export class DebugLogger {
    constructor(options = {}) {
        this.enabled = options.enabled ?? (process.env.NODE_ENV === 'development');
        this.level = options.level ?? 'info'; // 'debug' | 'info' | 'warn' | 'error'
        this.filters = options.filters ?? {}; // { system: 'AnimationMixer', level: 'warn' }
        this.subscribers = [];
    }
    
    /**
     * Log con contexto estructurado
     * @param {string} level - Nivel de log
     * @param {string} system - Nombre del sistema
     * @param {string} message - Mensaje
     * @param {Object} data - Datos adicionales
     */
    log(level, system, message, data = {}) {
        if (!this.enabled) return;
        if (!this.shouldLog(level, system)) return;
        
        const logEntry = {
            timestamp: performance.now(),
            timestampISO: new Date().toISOString(),
            level,
            system,
            message,
            data,
            stack: level === 'error' ? new Error().stack : undefined
        };
        
        // Emitir a suscriptores (UI, archivo, etc.)
        this.notifySubscribers(logEntry);
        
        // Log a consola
        const consoleMethod = console[level] || console.log;
        const prefix = `[${system}]`;
        consoleMethod(prefix, message, data);
    }
    
    // Helpers para cada nivel
    debug(system, message, data) { this.log('debug', system, message, data); }
    info(system, message, data) { this.log('info', system, message, data); }
    warn(system, message, data) { this.log('warn', system, message, data); }
    error(system, message, data) { this.log('error', system, message, data); }
    
    // Suscripción para UI o archivos
    subscribe(callback) {
        this.subscribers.push(callback);
    }
}

// Singleton global
export const debugLogger = new DebugLogger();
```

**Uso en sistemas:**

```javascript
// animation-mixer-system.js
import { debugLogger } from '../../debug/logger.js';

export class AnimationMixerSystem extends System {
    resolveAnimationName(entityId, stateId) {
        const stateConfig = this.stateConfigMap.get(stateId);
        if (!stateConfig) {
            debugLogger.warn('AnimationMixer', 'State not found', {
                entityId,
                stateId,
                availableStates: Array.from(this.stateConfigMap.keys())
            });
            return null;
        }
        // ...
    }
}
```

**Beneficio:** Logs estructurados con contexto, fácil de filtrar y rastrear.

### Cambio 2: Inspector de Estado ECS

**Problema:** No hay forma de inspeccionar estado en runtime.

**Solución:** Crear `ECSInspector`:

```javascript
// frontend/src/debug/inspector.js
export class ECSInspector {
    constructor(ecs) {
        this.ecs = ecs;
        this.enabled = false;
        this.cache = new Map(); // Cache de inspecciones
    }
    
    /**
     * Obtener información de una entidad
     * @param {number} entityId - ID de la entidad
     * @returns {Object} Información de la entidad
     */
    inspectEntity(entityId) {
        if (!this.enabled) return null;
        
        const components = {};
        const componentTypes = this.ecs.getComponentTypes();
        
        for (const componentType of componentTypes) {
            const component = this.ecs.getComponent(entityId, componentType);
            if (component) {
                components[componentType] = this.serializeComponent(component);
            }
        }
        
        return {
            entityId,
            components,
            componentCount: Object.keys(components).length
        };
    }
    
    /**
     * Buscar entidades por componente o valor
     * @param {Object} query - Query de búsqueda
     * @returns {Array} Entidades que coinciden
     */
    findEntities(query) {
        if (!this.enabled) return [];
        
        const results = [];
        const entities = this.ecs.query();
        
        for (const entityId of entities) {
            const info = this.inspectEntity(entityId);
            if (this.matchesQuery(info, query)) {
                results.push(info);
            }
        }
        
        return results;
    }
    
    /**
     * Obtener estadísticas del ECS
     * @returns {Object} Estadísticas
     */
    getStats() {
        if (!this.enabled) return null;
        
        const entities = this.ecs.query();
        const componentCounts = {};
        const componentTypes = this.ecs.getComponentTypes();
        
        for (const componentType of componentTypes) {
            componentCounts[componentType] = 0;
        }
        
        for (const entityId of entities) {
            for (const componentType of componentTypes) {
                if (this.ecs.hasComponent(entityId, componentType)) {
                    componentCounts[componentType]++;
                }
            }
        }
        
        return {
            totalEntities: entities.size,
            componentCounts,
            systems: this.ecs.getSystems().map(s => ({
                name: s.constructor.name,
                enabled: s.enabled,
                priority: s.priority
            }))
        };
    }
    
    serializeComponent(component) {
        // Serializar componente de forma segura (evitar referencias circulares)
        const serialized = {};
        for (const key in component) {
            if (key === 'mesh' || key === 'userData') {
                // Omitir objetos Three.js grandes
                serialized[key] = '[Object]';
            } else {
                serialized[key] = component[key];
            }
        }
        return serialized;
    }
}
```

**Uso:**

```javascript
// En consola del navegador o panel de debugging
const inspector = new ECSInspector(ecs);
inspector.enabled = true;

// Ver entidad específica
inspector.inspectEntity(playerId);

// Buscar entidades con Animation component
inspector.findEntities({ hasComponent: 'Animation' });

// Ver estadísticas
inspector.getStats();
```

**Beneficio:** Inspección completa del estado ECS en tiempo real.

### Cambio 3: Sistema de Métricas Detalladas

**Problema:** Métricas limitadas (solo FPS y draw calls).

**Solución:** Extender `PerformanceManager` o crear `DebugMetrics`:

```javascript
// frontend/src/debug/metrics.js
export class DebugMetrics {
    constructor(ecs) {
        this.ecs = ecs;
        this.enabled = false;
        this.metrics = {
            frameTime: [],
            systemTimes: new Map(), // systemName -> [times]
            entityCounts: new Map(), // systemName -> [counts]
            componentAccesses: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        this.currentFrame = {
            startTime: 0,
            systemTimes: new Map()
        };
    }
    
    /**
     * Iniciar medición de frame
     */
    startFrame() {
        if (!this.enabled) return;
        this.currentFrame.startTime = performance.now();
        this.currentFrame.systemTimes.clear();
    }
    
    /**
     * Iniciar medición de sistema
     * @param {string} systemName - Nombre del sistema
     */
    startSystem(systemName) {
        if (!this.enabled) return;
        this.currentFrame.systemTimes.set(systemName, performance.now());
    }
    
    /**
     * Finalizar medición de sistema
     * @param {string} systemName - Nombre del sistema
     * @param {number} entityCount - Número de entidades procesadas
     */
    endSystem(systemName, entityCount) {
        if (!this.enabled) return;
        
        const startTime = this.currentFrame.systemTimes.get(systemName);
        if (!startTime) return;
        
        const time = performance.now() - startTime;
        
        // Agregar a métricas
        if (!this.metrics.systemTimes.has(systemName)) {
            this.metrics.systemTimes.set(systemName, []);
        }
        this.metrics.systemTimes.get(systemName).push(time);
        
        // Mantener solo últimos 100 frames
        const times = this.metrics.systemTimes.get(systemName);
        if (times.length > 100) {
            times.shift();
        }
        
        // Contar entidades
        if (!this.metrics.entityCounts.has(systemName)) {
            this.metrics.entityCounts.set(systemName, []);
        }
        this.metrics.entityCounts.get(systemName).push(entityCount);
        const counts = this.metrics.entityCounts.get(systemName);
        if (counts.length > 100) {
            counts.shift();
        }
    }
    
    /**
     * Finalizar medición de frame
     */
    endFrame() {
        if (!this.enabled) return;
        
        const frameTime = performance.now() - this.currentFrame.startTime;
        this.metrics.frameTime.push(frameTime);
        
        // Mantener solo últimos 100 frames
        if (this.metrics.frameTime.length > 100) {
            this.metrics.frameTime.shift();
        }
    }
    
    /**
     * Obtener estadísticas
     * @returns {Object} Estadísticas de performance
     */
    getStats() {
        if (!this.enabled) return null;
        
        const stats = {
            frameTime: {
                avg: this.average(this.metrics.frameTime),
                min: Math.min(...this.metrics.frameTime),
                max: Math.max(...this.metrics.frameTime)
            },
            systems: {}
        };
        
        // Calcular estadísticas por sistema
        for (const [systemName, times] of this.metrics.systemTimes) {
            stats.systems[systemName] = {
                avgTime: this.average(times),
                minTime: Math.min(...times),
                maxTime: Math.max(...times),
                avgEntities: this.average(this.metrics.entityCounts.get(systemName) || [])
            };
        }
        
        return stats;
    }
    
    average(array) {
        if (array.length === 0) return 0;
        return array.reduce((a, b) => a + b, 0) / array.length;
    }
}
```

**Integración en ECSManager:**

```javascript
// ecs/manager.js
update(deltaTime) {
    if (this.debugMetrics) {
        this.debugMetrics.startFrame();
    }
    
    const sortedSystems = [...this.systems].sort((a, b) => a.priority - b.priority);
    
    for (const system of sortedSystems) {
        if (system.enabled) {
            if (this.debugMetrics) {
                const entityCount = system.getEntities().size;
                this.debugMetrics.startSystem(system.constructor.name);
                system.update(deltaTime);
                this.debugMetrics.endSystem(system.constructor.name, entityCount);
            } else {
                system.update(deltaTime);
            }
        }
    }
    
    if (this.debugMetrics) {
        this.debugMetrics.endFrame();
    }
}
```

**Beneficio:** Métricas detalladas de performance por sistema, identificación de cuellos de botella.

### Cambio 4: Validación de Estado

**Problema:** No hay validación de estados inválidos.

**Solución:** Crear `StateValidator`:

```javascript
// frontend/src/debug/validator.js
export class StateValidator {
    constructor(options = {}) {
        this.enabled = options.enabled ?? (process.env.NODE_ENV === 'development');
        this.warnOnInvalid = options.warnOnInvalid ?? true;
        this.validators = new Map();
    }
    
    /**
     * Registrar validador para un tipo de estado
     * @param {string} type - Tipo de estado
     * @param {Function} validator - Función validadora
     */
    registerValidator(type, validator) {
        this.validators.set(type, validator);
    }
    
    /**
     * Validar estado de animación
     * @param {string} stateId - ID del estado
     * @param {Map} validStates - Map de estados válidos
     * @param {string} context - Contexto (sistema, entidad)
     * @returns {boolean} Si es válido
     */
    validateAnimationState(stateId, validStates, context = '') {
        if (!this.enabled) return true;
        
        if (!validStates.has(stateId)) {
            if (this.warnOnInvalid) {
                console.warn(`[StateValidator] Invalid animation state '${stateId}'`, {
                    context,
                    validStates: Array.from(validStates.keys())
                });
            }
            return false;
        }
        return true;
    }
    
    /**
     * Validar acción de combate
     * @param {string} actionId - ID de la acción
     * @param {Object} validActions - Objeto de acciones válidas
     * @param {string} context - Contexto
     * @returns {boolean} Si es válido
     */
    validateCombatAction(actionId, validActions, context = '') {
        if (!this.enabled) return true;
        
        if (!validActions[actionId]) {
            if (this.warnOnInvalid) {
                console.warn(`[StateValidator] Invalid combat action '${actionId}'`, {
                    context,
                    validActions: Object.keys(validActions)
                });
            }
            return false;
        }
        return true;
    }
    
    /**
     * Validar componente
     * @param {number} entityId - ID de la entidad
     * @param {string} componentType - Tipo de componente
     * @param {Object} component - Componente
     * @param {Object} schema - Esquema de validación
     * @returns {boolean} Si es válido
     */
    validateComponent(entityId, componentType, component, schema) {
        if (!this.enabled) return true;
        
        // Validar propiedades requeridas
        for (const prop of schema.required || []) {
            if (!(prop in component)) {
                if (this.warnOnInvalid) {
                    console.warn(`[StateValidator] Missing required property '${prop}'`, {
                        entityId,
                        componentType
                    });
                }
                return false;
            }
        }
        
        return true;
    }
}

// Singleton global
export const stateValidator = new StateValidator();
```

**Uso en sistemas:**

```javascript
// animation-mixer-system.js
import { stateValidator } from '../../debug/validator.js';

resolveAnimationName(entityId, stateId) {
    // Validar estado
    if (!stateValidator.validateAnimationState(
        stateId,
        this.stateConfigMap,
        `AnimationMixer.resolveAnimationName(${entityId})`
    )) {
        return null;
    }
    
    // ... resto del código
}
```

**Beneficio:** Detecta bugs temprano, warnings claros cuando hay estados inválidos.

### Cambio 5: Sistema de Eventos para Debugging

**Problema:** No hay sistema de eventos estructurado.

**Solución:** Crear `DebugEventEmitter`:

```javascript
// frontend/src/debug/events.js
export class DebugEventEmitter {
    constructor() {
        this.enabled = false;
        this.listeners = new Map();
        this.eventHistory = []; // Timeline de eventos
        this.maxHistorySize = 1000;
    }
    
    /**
     * Emitir evento
     * @param {string} eventName - Nombre del evento
     * @param {Object} data - Datos del evento
     */
    emit(eventName, data = {}) {
        if (!this.enabled) return;
        
        const event = {
            name: eventName,
            timestamp: performance.now(),
            timestampISO: new Date().toISOString(),
            data
        };
        
        // Agregar a historial
        this.eventHistory.push(event);
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
        
        // Notificar listeners
        const listeners = this.listeners.get(eventName) || [];
        listeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error('Error in debug event listener:', error);
            }
        });
    }
    
    /**
     * Escuchar evento
     * @param {string} eventName - Nombre del evento
     * @param {Function} listener - Función listener
     * @returns {Function} Función para desuscribirse
     */
    on(eventName, listener) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        this.listeners.get(eventName).push(listener);
        
        // Retornar función de desuscripción
        return () => {
            const listeners = this.listeners.get(eventName);
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        };
    }
    
    /**
     * Obtener historial de eventos
     * @param {string} eventName - Filtrar por nombre (opcional)
     * @returns {Array} Historial de eventos
     */
    getHistory(eventName = null) {
        if (eventName) {
            return this.eventHistory.filter(e => e.name === eventName);
        }
        return [...this.eventHistory];
    }
}

// Singleton global
export const debugEvents = new DebugEventEmitter();
```

**Uso en sistemas:**

```javascript
// combat-system.js
import { debugEvents } from '../../debug/events.js';

update(deltaTime) {
    // ...
    if (wantsAction && canExecute) {
        combat.startAction(actionId);
        
        // Emitir evento
        debugEvents.emit('combat:action:started', {
            entityId,
            actionId,
            actionConfig
        });
        
        // ...
    }
}
```

**Beneficio:** Timeline de eventos, fácil rastrear flujo de acciones.

### Cambio 6: Panel de Debugging en UI (Opcional)

**Problema:** No hay herramientas visuales.

**Solución:** Crear panel de debugging activable con tecla:

```javascript
// frontend/src/debug/ui/debug-panel.js
export class DebugPanel {
    constructor(app, ecs) {
        this.app = app;
        this.ecs = ecs;
        this.visible = false;
        this.panel = null;
        this.inspector = null;
        this.metrics = null;
        
        this.init();
    }
    
    init() {
        // Crear panel HTML
        this.panel = document.createElement('div');
        this.panel.id = 'debug-panel';
        this.panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 400px;
            max-height: 80vh;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            font-family: monospace;
            font-size: 12px;
            overflow-y: auto;
            z-index: 10000;
            display: none;
        `;
        document.body.appendChild(this.panel);
        
        // Toggle con tecla F3
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F3') {
                this.toggle();
            }
        });
    }
    
    toggle() {
        this.visible = !this.visible;
        this.panel.style.display = this.visible ? 'block' : 'none';
        
        if (this.visible) {
            this.update();
            this.startAutoUpdate();
        } else {
            this.stopAutoUpdate();
        }
    }
    
    update() {
        if (!this.visible) return;
        
        // Mostrar métricas
        const metrics = this.metrics?.getStats();
        const stats = this.inspector?.getStats();
        
        this.panel.innerHTML = `
            <h3>Debug Panel (F3 to toggle)</h3>
            <div>
                <h4>Performance</h4>
                <div>FPS: ${this.app.performanceManager.fps}</div>
                ${metrics ? `
                    <div>Avg Frame Time: ${metrics.frameTime.avg.toFixed(2)}ms</div>
                    <div>Systems:</div>
                    ${Object.entries(metrics.systems).map(([name, stats]) => `
                        <div style="margin-left: 10px;">
                            ${name}: ${stats.avgTime.toFixed(2)}ms (${stats.avgEntities} entities)
                        </div>
                    `).join('')}
                ` : ''}
            </div>
            <div>
                <h4>ECS Stats</h4>
                ${stats ? `
                    <div>Entities: ${stats.totalEntities}</div>
                    <div>Components:</div>
                    ${Object.entries(stats.componentCounts).map(([name, count]) => `
                        <div style="margin-left: 10px;">${name}: ${count}</div>
                    `).join('')}
                ` : ''}
            </div>
        `;
    }
    
    startAutoUpdate() {
        this.updateInterval = setInterval(() => this.update(), 1000);
    }
    
    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}
```

**Beneficio:** Herramientas visuales para debugging sin modificar código.

## Beneficios de la Nueva Arquitectura

### Debugging

1. **Logs Estructurados:** Fácil rastrear problemas con contexto completo
2. **Inspección de Estado:** Ver estado en tiempo real sin modificar código
3. **Métricas Detalladas:** Identificar cuellos de botella de performance
4. **Validación:** Detectar bugs temprano con warnings claros
5. **Eventos:** Timeline de eventos para entender flujo
6. **UI Visual:** Panel de debugging para monitoreo en tiempo real

### Performance

1. **Zero Overhead:** Todas las herramientas son opcionales
2. **Sampling:** Métricas pueden usar sampling para reducir overhead
3. **Eficiencia:** Caches y lazy evaluation minimizan impacto

### Mantenibilidad

1. **Código Más Claro:** Logs estructurados facilitan entender el código
2. **Debugging Más Fácil:** Herramientas integradas reducen tiempo de debugging
3. **Onboarding:** Nuevos desarrolladores pueden entender el sistema más rápido

## Migración Propuesta

### Fase 1: Sistema de Logging (Alta Prioridad)

**Pasos:**
1. Crear `DebugLogger` en `frontend/src/debug/logger.js`
2. Integrar en sistemas críticos (AnimationMixerSystem, CombatSystem)
3. Reemplazar `console.warn`/`console.error` esporádicos
4. Agregar logs en puntos clave (inicio/fin de acciones, errores)

**Criterio de éxito:**
- Logs estructurados funcionando
- Fácil filtrar por sistema
- No afecta performance cuando está deshabilitado

### Fase 2: Validación de Estado (Alta Prioridad)

**Pasos:**
1. Crear `StateValidator` en `frontend/src/debug/validator.js`
2. Integrar validación en sistemas críticos
3. Validar estados de animación y acciones de combate
4. Agregar warnings cuando hay estados inválidos

**Criterio de éxito:**
- Warnings aparecen cuando hay estados inválidos
- Bugs detectados temprano
- No afecta performance en producción

### Fase 3: Inspector de Estado (Media Prioridad)

**Pasos:**
1. Crear `ECSInspector` en `frontend/src/debug/inspector.js`
2. Integrar en ECSManager
3. Exponer API para inspección
4. Documentar uso

**Criterio de éxito:**
- Puede inspeccionar entidades y componentes
- Puede buscar entidades
- Puede obtener estadísticas del ECS

### Fase 4: Métricas Detalladas (Media Prioridad)

**Pasos:**
1. Crear `DebugMetrics` en `frontend/src/debug/metrics.js`
2. Integrar en ECSManager.update()
3. Medir tiempo por sistema
4. Exponer estadísticas

**Criterio de éxito:**
- Métricas detalladas funcionando
- Puede identificar cuellos de botella
- No afecta performance cuando está deshabilitado

### Fase 5: Sistema de Eventos (Baja Prioridad)

**Pasos:**
1. Crear `DebugEventEmitter` en `frontend/src/debug/events.js`
2. Integrar eventos en sistemas clave
3. Crear timeline de eventos
4. Documentar eventos disponibles

**Criterio de éxito:**
- Eventos se emiten correctamente
- Timeline funciona
- Puede escuchar eventos específicos

### Fase 6: Panel de Debugging UI (Baja Prioridad)

**Pasos:**
1. Crear `DebugPanel` en `frontend/src/debug/ui/debug-panel.js`
2. Integrar con inspector y métricas
3. Agregar toggle con tecla F3
4. Mostrar métricas y estadísticas en tiempo real

**Criterio de éxito:**
- Panel visible y funcional
- Muestra métricas en tiempo real
- Fácil de usar

## Consideraciones Técnicas

### Compatibilidad

**✅ No rompe funcionalidad existente:**
- Todas las herramientas son opcionales
- APIs públicas no cambian
- Cambios son incrementales

**✅ Performance:**
- Zero overhead cuando están deshabilitadas
- Sampling opcional para métricas
- Caches para inspección

### Testing

**Tests necesarios:**
1. **Logger:** Verificar que logs se emiten correctamente
2. **Inspector:** Verificar que inspección funciona
3. **Métricas:** Verificar que métricas se recopilan correctamente
4. **Validación:** Verificar que warnings aparecen cuando corresponden
5. **Performance:** Verificar que no hay overhead cuando están deshabilitadas

### Riesgos y Mitigación

#### Riesgo 1: Overhead de logging en producción

**Riesgo:** Logs pueden afectar performance si se emiten frecuentemente.

**Mitigación:**
- Logger deshabilitado por defecto en producción
- Rate limiting opcional
- Sampling de logs (solo cada N eventos)

#### Riesgo 2: Memory leaks en historial de eventos

**Riesgo:** Historial de eventos puede crecer indefinidamente.

**Mitigación:**
- Limitar tamaño del historial (últimos 1000 eventos)
- Limpiar historial periódicamente
- Deshabilitar historial en producción

#### Riesgo 3: Overhead de métricas

**Riesgo:** Medir métricas cada frame puede ser costoso.

**Mitigación:**
- Métricas opcionales (disabled por defecto)
- Sampling (solo cada N frames)
- Usar `performance.now()` solo cuando está habilitado

#### Riesgo 4: Serialización costosa de componentes

**Riesgo:** Serializar componentes grandes puede ser lento.

**Mitigación:**
- Cachear serializaciones
- Omitir objetos grandes (meshes, userData)
- Lazy evaluation (solo serializar cuando se necesita)

## Ejemplo de Uso

### Configuración Inicial

```javascript
// app.js
import { debugLogger } from './debug/logger.js';
import { ECSInspector } from './debug/inspector.js';
import { DebugMetrics } from './debug/metrics.js';
import { stateValidator } from './debug/validator.js';
import { debugEvents } from './debug/events.js';
import { DebugPanel } from './debug/ui/debug-panel.js';

export class App {
    constructor(container) {
        // ... código existente ...
        
        // Inicializar herramientas de debugging (solo en desarrollo)
        if (process.env.NODE_ENV === 'development') {
            this.debugLogger = debugLogger;
            this.debugLogger.enabled = true;
            
            this.inspector = new ECSInspector(this.ecs);
            this.inspector.enabled = true;
            
            this.debugMetrics = new DebugMetrics(this.ecs);
            this.debugMetrics.enabled = true;
            this.ecs.setDebugMetrics(this.debugMetrics);
            
            stateValidator.enabled = true;
            debugEvents.enabled = true;
            
            // Panel de debugging (opcional)
            this.debugPanel = new DebugPanel(this, this.ecs);
            this.debugPanel.inspector = this.inspector;
            this.debugPanel.metrics = this.debugMetrics;
        }
    }
}
```

### Uso en Sistemas

```javascript
// animation-mixer-system.js
import { debugLogger } from '../../debug/logger.js';
import { stateValidator } from '../../debug/validator.js';
import { debugEvents } from '../../debug/events.js';

export class AnimationMixerSystem extends System {
    resolveAnimationName(entityId, stateId) {
        // Validar estado
        if (!stateValidator.validateAnimationState(
            stateId,
            this.stateConfigMap,
            `AnimationMixer.resolveAnimationName(${entityId})`
        )) {
            debugLogger.warn('AnimationMixer', 'Invalid state', { entityId, stateId });
            return null;
        }
        
        const animationName = this.getAnimationNameForState(stateId);
        
        // Log
        debugLogger.debug('AnimationMixer', 'Resolved animation', {
            entityId,
            stateId,
            animationName
        });
        
        // Emitir evento
        debugEvents.emit('animation:resolved', {
            entityId,
            stateId,
            animationName
        });
        
        return animationName;
    }
}
```

### Uso en Consola del Navegador

```javascript
// Inspeccionar entidad
app.inspector.inspectEntity(playerId);

// Buscar entidades
app.inspector.findEntities({ hasComponent: 'Animation' });

// Ver estadísticas
app.inspector.getStats();

// Ver métricas
app.debugMetrics.getStats();

// Escuchar eventos
debugEvents.on('combat:action:started', (event) => {
    console.log('Action started:', event);
});

// Ver historial de eventos
debugEvents.getHistory('combat:action:started');
```

## Conclusión

### ✅ Sistema de Debugging Recomendado

**El sistema de debugging propuesto es beneficioso porque:**

1. **Facilita debugging** → Logs estructurados, inspección de estado, métricas detalladas
2. **Detecta bugs temprano** → Validación de estado con warnings claros
3. **Mejora performance** → Identifica cuellos de botella con métricas detalladas
4. **Zero overhead** → Todas las herramientas son opcionales y no afectan producción
5. **Mejora mantenibilidad** → Código más claro, debugging más fácil

### Priorización

**Alta prioridad (Fase 1-2):**
- Sistema de logging estructurado (crítico para debugging)
- Validación de estado (detecta bugs temprano)

**Media prioridad (Fase 3-4):**
- Inspector de estado (útil para debugging complejo)
- Métricas detalladas (útil para optimización)

**Baja prioridad (Fase 5-6):**
- Sistema de eventos (útil pero no crítico)
- Panel de debugging UI (nice to have)

### Resultado Esperado

Después de implementar el sistema de debugging:
- **Debugging más fácil:** Logs estructurados y herramientas integradas
- **Bugs detectados temprano:** Validación de estado con warnings
- **Performance mejorada:** Métricas detalladas identifican cuellos de botella
- **Mantenibilidad mejorada:** Código más claro, debugging más rápido
- **Zero overhead:** No afecta performance en producción
