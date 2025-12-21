# Guía de Uso - Comandos en Consola de Desarrollo

Guía completa para usar las herramientas de debugging desde la consola del navegador.

## Acceso

Abre la consola del navegador (F12) y accede a las herramientas mediante:

```javascript
window.developmentTools
```

Todas las herramientas están disponibles globalmente en modo desarrollo.

## Herramientas Disponibles

### DebugLogger (`window.developmentTools.logger`)

Sistema de logging estructurado.

**Métodos:**
```javascript
// Logging con diferentes niveles
debugTools.logger.debug('Sistema', 'Mensaje', { datos: {} });
debugTools.logger.info('Sistema', 'Mensaje', { datos: {} });
debugTools.logger.warn('Sistema', 'Mensaje', { datos: {} });
debugTools.logger.error('Sistema', 'Mensaje', { datos: {} });

// Cambiar nivel de log
debugTools.logger.level = 'debug'; // 'debug' | 'info' | 'warn' | 'error'

// Configurar filtros
debugTools.logger.setFilters({ system: 'CombatSystem', level: 'warn' });

// Suscribirse a logs (para procesamiento personalizado)
debugTools.logger.subscribe((logEntry) => {
    console.log('Log recibido:', logEntry);
});

// Habilitar/deshabilitar
debugTools.logger.setEnabled(true);
```

**Ejemplos:**
```javascript
// Enviar un log de información
debugTools.logger.info('Test', 'Este es un mensaje de prueba', { test: true });

// Enviar un warning
debugTools.logger.warn('CombatSystem', 'Acción inválida detectada', { actionId: 'invalid' });

// Ver solo logs de un sistema específico
debugTools.logger.setFilters({ system: 'InputManager' });
```

### ECSInspector (`window.developmentTools.inspector`)

Inspeccionar entidades y componentes del ECS.

**Métodos:**
```javascript
// Obtener estadísticas generales del ECS
const stats = debugTools.inspector.getStats();
console.log(stats);
// Retorna: { totalEntities, componentCounts, systems, ... }

// Inspeccionar una entidad específica
const entity = debugTools.inspector.inspectEntity(entityId);
console.log(entity);
// Retorna: { id, components: { ComponentName: {...}, ... } }

// Buscar entidades
const entities = debugTools.inspector.findEntities({ 
    hasComponent: 'Animation' 
});
console.log(entities);
// Retorna: Array de IDs de entidades

// Buscar entidades con múltiples componentes
const entities = debugTools.inspector.findEntities({ 
    hasComponent: ['Animation', 'Combat'] 
});

// Buscar por valor de componente
const entities = debugTools.inspector.findEntities({ 
    component: 'Combat',
    property: 'health',
    value: 100
});
```

**Ejemplos:**
```javascript
// Ver estadísticas del ECS
const stats = debugTools.inspector.getStats();
console.log('Total entidades:', stats.totalEntities);
console.log('Componentes:', stats.componentCounts);

// Inspeccionar la entidad con ID 1
const player = debugTools.inspector.inspectEntity(1);
console.log('Componentes del jugador:', player.components);

// Encontrar todas las entidades con animaciones
const animatedEntities = debugTools.inspector.findEntities({ 
    hasComponent: 'Animation' 
});
console.log('Entidades animadas:', animatedEntities);

// Encontrar entidades con sistema de combate
const combatEntities = debugTools.inspector.findEntities({ 
    hasComponent: 'Combat' 
});
console.log('Entidades de combate:', combatEntities);
```

### DebugMetrics (`window.developmentTools.metrics`)

Métricas detalladas de performance.

**Métodos:**
```javascript
// Obtener estadísticas de performance
const metrics = debugTools.metrics.getStats();
console.log(metrics);
// Retorna: { frameTime: { avg, min, max }, systems: {...} }

// Resetear todas las métricas
debugTools.metrics.reset();

// Configurar sampling (reducir overhead)
debugTools.metrics.sampleRate = 0.1; // Solo cada 10 frames
```

**Ejemplos:**
```javascript
// Ver métricas actuales
const metrics = debugTools.metrics.getStats();
console.log('FPS promedio:', 1000 / metrics.frameTime.avg);
console.log('Frame time:', metrics.frameTime);
console.log('Sistemas:', metrics.systems);

// Ver tiempo de un sistema específico
const animationTime = metrics.systems['AnimationMixerSystem'];
console.log('Tiempo de animación:', animationTime.avgTime, 'ms');

// Resetear y comenzar nueva medición
debugTools.metrics.reset();
```

### StateValidator (`window.developmentTools.validator`)

Validador de estados del juego.

**Métodos:**
```javascript
// Validar estado de animación
debugTools.validator.validateAnimationState(
    stateId, 
    validStates, 
    { entityId, context: '...' }
);

// Validar acción de combate
debugTools.validator.validateCombatAction(
    actionId, 
    validActions, 
    { entityId, context: '...' }
);

// Habilitar/deshabilitar
debugTools.validator.setEnabled(true);
```

**Ejemplos:**
```javascript
// Validar un estado de animación
const isValid = debugTools.validator.validateAnimationState(
    'idle',
    ['idle', 'walk', 'run'],
    { entityId: 1, context: 'AnimationMixer' }
);

if (!isValid) {
    console.warn('Estado inválido detectado');
}
```

### DebugEventEmitter (`window.developmentTools.events`)

Sistema de eventos para debugging.

**Métodos:**
```javascript
// Emitir un evento
debugTools.events.emit('evento:nombre', { datos: {} });

// Escuchar eventos
const unsubscribe = debugTools.events.on('evento:nombre', (event) => {
    console.log('Evento recibido:', event);
});

// Dejar de escuchar
unsubscribe();

// Ver historial de eventos
const history = debugTools.events.getHistory();
console.log(history);

// Ver historial filtrado
const filtered = debugTools.events.getHistory('combat:action:started');
console.log(filtered);

// Limpiar historial
debugTools.events.clearHistory();

// Habilitar/deshabilitar
debugTools.events.setEnabled(true);
```

**Ejemplos:**
```javascript
// Emitir un evento personalizado
debugTools.events.emit('test:custom', { 
    message: 'Evento de prueba',
    timestamp: Date.now()
});

// Escuchar eventos de combate
const unsubscribe = debugTools.events.on('combat:action:started', (event) => {
    console.log('Acción de combate iniciada:', event);
    console.log('Entidad:', event.data.entityId);
    console.log('Acción:', event.data.actionId);
});

// Ver todos los eventos de combate
const combatEvents = debugTools.events.getHistory('combat:action:started');
console.log('Eventos de combate:', combatEvents);

// Ver todos los eventos
const allEvents = debugTools.events.getHistory();
console.log('Total de eventos:', allEvents.length);
```

### DebugPanel (`window.developmentTools.panel`)

Panel visual de debugging (F3).

**Métodos:**
```javascript
// Mostrar/ocultar panel
debugTools.panel.toggle();

// Verificar si está visible
console.log(debugTools.panel.visible); // true | false
```

**Ejemplos:**
```javascript
// Mostrar el panel
debugTools.panel.toggle();

// Verificar estado
if (debugTools.panel.visible) {
    console.log('Panel está visible');
}
```

### DebugInterface (`window.developmentTools.interface`)

Interfaz gráfica de debugging (F4).

**Métodos:**
```javascript
// Mostrar/ocultar interfaz
debugTools.interface.toggle();

// Verificar si está visible
console.log(debugTools.interface.visible); // true | false
```

**Ejemplos:**
```javascript
// Abrir la interfaz
debugTools.interface.toggle();

// Verificar estado
if (debugTools.interface.visible) {
    console.log('Interfaz está abierta');
}
```

## Acceso Directo a Variables

También puedes acceder directamente a las instancias principales:

```javascript
// Acceso directo (sin window.developmentTools)
const app = window.developmentTools.app;        // Instancia de App
const ecs = window.developmentTools.ecs;        // ECS Manager

// O usar los atajos
const inspector = window.developmentTools.inspector;
const metrics = window.developmentTools.metrics;
const logger = window.developmentTools.logger;
const validator = window.developmentTools.validator;
const events = window.developmentTools.events;
const panel = window.developmentTools.panel;
const interface = window.developmentTools.interface;
```

## Ejemplos de Uso Avanzado

### Monitoreo Continuo de Performance

```javascript
// Configurar métricas con sampling
debugTools.metrics.sampleRate = 0.1; // Cada 10 frames

// Monitorear cada segundo
setInterval(() => {
    const stats = debugTools.metrics.getStats();
    console.log('FPS:', 1000 / stats.frameTime.avg);
    console.log('Sistemas más lentos:', 
        Object.entries(stats.systems)
            .sort((a, b) => b[1].avgTime - a[1].avgTime)
            .slice(0, 3)
    );
}, 1000);
```

### Buscar Problemas de Performance

```javascript
// Ver qué sistemas están tomando más tiempo
const metrics = debugTools.metrics.getStats();
const slowSystems = Object.entries(metrics.systems)
    .filter(([name, stats]) => stats.avgTime > 5) // Más de 5ms
    .sort((a, b) => b[1].avgTime - a[1].avgTime);

console.log('Sistemas lentos:', slowSystems);
```

### Inspeccionar Estado del Juego

```javascript
// Ver todas las entidades y sus componentes
const stats = debugTools.inspector.getStats();
console.log('Total entidades:', stats.totalEntities);

// Inspeccionar cada entidad
for (let i = 1; i <= stats.totalEntities; i++) {
    const entity = debugTools.inspector.inspectEntity(i);
    if (entity) {
        console.log(`Entidad ${i}:`, Object.keys(entity.components));
    }
}
```

### Filtrar Logs por Sistema

```javascript
// Ver solo logs del sistema de combate
debugTools.logger.setFilters({ system: 'CombatSystem' });

// Ver solo warnings y errores
debugTools.logger.level = 'warn';

// Ver todos los logs
debugTools.logger.level = 'debug';
debugTools.logger.setFilters({});
```

### Escuchar Eventos Específicos

```javascript
// Escuchar todos los eventos de combate
debugTools.events.on('combat:action:started', (event) => {
    console.log('Combate iniciado:', event.data);
});

debugTools.events.on('combat:action:ended', (event) => {
    console.log('Combate terminado:', event.data);
});

// Ver historial después de un tiempo
setTimeout(() => {
    const combatHistory = debugTools.events.getHistory('combat:action:started');
    console.log('Total de combates:', combatHistory.length);
}, 10000);
```

## Consejos

1. **Usa la interfaz F4 para operaciones comunes**: Es más fácil y visual
2. **Usa la consola para scripting**: Para automatización o análisis complejo
3. **Combina ambas**: Abre F4 para ver resultados visuales y usa la consola para comandos rápidos
4. **Monitorea performance**: Usa métricas para identificar cuellos de botella
5. **Filtra logs**: Reduce el ruido configurando filtros apropiados
6. **Limpia historiales**: Resetea métricas y eventos cuando comiences una nueva sesión de testing
