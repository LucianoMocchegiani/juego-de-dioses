# Sistema de Debugging

Sistema completo de debugging y herramientas de desarrollo para el juego.

## Estructura

```
src/
├── dev-exposure.js     # Módulo de exposición de herramientas (raíz)
├── config/
│   └── debug-config.js # Configuración centralizada
├── interfaces/         # Interfaces de desarrollo
│   ├── base-interface.js # Clase base para interfaces
│   ├── debug-panel.js    # Panel de debugging (F3)
│   ├── debug-interface.js # Interfaz GUI de debugging (F4)
│   └── test-interface.js  # Interfaz de testing (F6)
└── debug/              # Herramientas de debugging
    ├── logger.js       # Sistema de logging estructurado
    ├── inspector.js    # Inspector de estado ECS
    ├── metrics.js      # Métricas detalladas de performance
    ├── validator.js    # Validación de estado
    ├── events.js       # Sistema de eventos
    ├── README.md       # Documentación general
    ├── USO-INTERFAZ.md # Guía de uso de la interfaz F4
    └── USO-CONSOLA.md  # Guía de comandos en consola
```

## Componentes

### DebugLogger (`logger.js`)

Sistema de logging estructurado con niveles y contexto.

**Características:**
- Niveles de log: `debug`, `info`, `warn`, `error`
- Timestamps precisos con `performance.now()`
- Contexto estructurado (sistema, mensaje, datos)
- Filtrado por sistema y nivel
- Suscripción para múltiples destinos (UI, archivos, etc.)

**Uso:**
```javascript
import { debugLogger } from './debug/logger.js';

debugLogger.info('CombatSystem', 'Action started', { actionId: 'attack' });
debugLogger.warn('AnimationMixer', 'State not found', { stateId: 'invalid' });
debugLogger.error('System', 'Error occurred', { error });
```

### ECSInspector (`inspector.js`)

Inspector de estado ECS para inspeccionar entidades y componentes en tiempo real.

**Características:**
- Inspeccionar entidades individuales
- Buscar entidades por componente o valor
- Obtener estadísticas del ECS
- Cache para mejorar performance

**Uso:**
```javascript
// En consola del navegador
window.developmentTools.inspector.inspectEntity(playerId);
window.developmentTools.inspector.findEntities({ hasComponent: 'Animation' });
window.developmentTools.inspector.getStats();
```

### DebugMetrics (`metrics.js`)

Sistema de métricas detalladas de performance por sistema.

**Características:**
- Frame time por sistema
- Número de entidades procesadas
- Estadísticas (avg, min, max)
- Sampling opcional para reducir overhead

**Uso:**
```javascript
// En consola del navegador
const stats = window.developmentTools.metrics.getStats();
console.log(stats);
```

### StateValidator (`validator.js`)

Validador de estado para detectar estados inválidos.

**Características:**
- Validar estados de animación
- Validar acciones de combate
- Validar componentes
- Warnings claros cuando hay estados inválidos

**Uso:**
```javascript
import { stateValidator } from './debug/validator.js';

stateValidator.validateAnimationState(stateId, validStates, context);
stateValidator.validateCombatAction(actionId, validActions, context);
```

### DebugEventEmitter (`events.js`)

Sistema de eventos para debugging y timeline.

**Características:**
- Emitir eventos estructurados
- Escuchar eventos específicos
- Historial de eventos con timestamps
- Timeline de eventos

**Uso:**
```javascript
import { debugEvents } from './debug/events.js';

// Emitir evento
debugEvents.emit('combat:action:started', { entityId, actionId });

// Escuchar evento
debugEvents.on('combat:action:started', (event) => {
    console.log('Action started:', event);
});

// Ver historial
debugEvents.getHistory('combat:action:started');
```

### DebugPanel (`interfaces/debug-panel.js`)

Panel de debugging visual en UI, controlable desde la interfaz F4 o con tecla F3.

**Características:**
- Muestra métricas de performance en tiempo real
- Muestra las últimas 10 líneas de logs
- Actualización automática cada segundo
- Control principal desde interfaz F4 (tab Logger)
- Atajo rápido con tecla F3

**Uso:**
- Desde la interfaz: Abrir F4 → tab Logger → checkbox "Mostrar Debug Panel (F3)"
- Atajo rápido: Presionar `F3` para mostrar/ocultar el panel

### BaseInterface (`interfaces/base-interface.js`)

Clase base para interfaces de desarrollo que proporciona funcionalidad común.

**Características:**
- Estructura base reutilizable (header, sidebar, mainContent)
- Sistema de tabs genérico
- Helpers reutilizables para creación de UI
- Sistema de notificaciones fijas (no causan scroll automático)
- Bloqueo automático de input del juego

**Sistema de Notificaciones:**
- Notificaciones aparecen en la parte inferior de la pantalla de forma fija
- No causan scroll automático, ideal para listas grandes
- Animaciones suaves de entrada y salida
- Auto-remoción automática

### DebugInterface (`interfaces/debug-interface.js`)

Interfaz GUI de debugging, activable con tecla F4.

**Características:**
- Interfaz visual con tabs organizados
- Botones para acciones comunes
- Campos de entrada con placeholders
- Resultados formateados en JSON con botón para copiar
- Comandos rápidos predefinidos
- Área de comandos personalizados (permite copiar/pegar)
- Notificaciones fijas en la parte inferior (no causan scroll)

**Uso:**
Presionar `F4` para mostrar/ocultar la interfaz.

**Tabs disponibles:**
- **Inspector**: Inspeccionar entidades, buscar por componente, ver estadísticas
- **Métricas**: Ver métricas de performance, resetear, auto-refresh
- **Eventos**: Ver historial, filtrar eventos, limpiar historial
- **Logger**: Cambiar nivel de log, probar logger, controlar Debug Panel (F3), ver logs en tiempo real
- **Comandos**: Comandos rápidos y área para comandos personalizados

### TestInterface (`interfaces/test-interface.js`)

Interfaz de herramientas de testing, activable con tecla F6.

**Características:**
- Prueba de animaciones
- Gestión de armas (equipar/desequipar)
- Visualización organizada por categorías

**Uso:**
Presionar `F6` para mostrar/ocultar la interfaz.

## Configuración

Todas las herramientas se pueden habilitar/deshabilitar desde `config/debug-config.js` o en runtime:

```javascript
debugLogger.setEnabled(true);
stateValidator.setEnabled(true);
debugEvents.setEnabled(true);
```

## Performance

Todas las herramientas son completamente opcionales y no afectan el performance cuando están deshabilitadas. En producción, todas están deshabilitadas por defecto.

## Integración

Las herramientas se integran automáticamente mediante `dev-exposure.js` cuando estamos en modo desarrollo:

```javascript
// En app.js
import { initDevelopmentTools, exposeDevelopmentTools, isDevelopment } from './dev-exposure.js';

// Inicializar herramientas
const developmentTools = initDevelopmentTools(app);

// Exponer globalmente
exposeDevelopmentTools(app, { developmentTools });
```

El módulo `dev-exposure.js` (ubicado en la raíz de `src/`) centraliza:
- La detección de entorno de desarrollo
- La inicialización de todas las herramientas
- La exposición global en `window.developmentTools`

## Acceso desde Consola

Todas las herramientas están disponibles globalmente en desarrollo:

```javascript
// En consola del navegador
window.developmentTools.logger       // DebugLogger
window.developmentTools.inspector    // ECSInspector
window.developmentTools.metrics      // DebugMetrics
window.developmentTools.validator    // StateValidator
window.developmentTools.events       // DebugEventEmitter
window.developmentTools.panel        // DebugPanel
window.developmentTools.interface    // DebugInterface
window.developmentTools.testInterface // TestInterface
```

**O usa la interfaz GUI (F4):**
- Presiona `F4` para abrir la interfaz
- Navega por los tabs (Inspector, Métricas, Eventos, Logger, Comandos)
- Usa los botones para acciones comunes
- Usa el área de comandos personalizados para ejecutar código JavaScript
- Copia resultados con el botón "Copiar"
