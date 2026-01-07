# Análisis de Arquitectura - Sistema de Logging de Rendimiento (JDG-045)

## Situación Actual

### Backend

**Estructura actual:**
```
backend/src/
├── main.py              # Punto de entrada, configuración de FastAPI
├── services/            # Servicios de negocio
│   ├── celestial_time_service.py
│   ├── temperature_service.py
│   └── ...
├── database/            # Conexión y queries
│   ├── connection.py   # Pool de conexiones asyncpg
│   └── ...
└── config/              # Configuraciones
    ├── celestial_config.py
    └── ...
```

**Problemas identificados:**
1. **Falta de monitoreo de recursos:** No existe sistema para monitorear memoria, CPU, o estado del pool de conexiones
2. **Sin visibilidad de performance:** No hay logs estructurados que permitan identificar problemas de rendimiento o memory leaks
3. **Sin métricas de base de datos:** No se monitorea el estado del pool de conexiones de PostgreSQL (total, idle, waiting)
4. **Dificultad para debugging:** No hay información sobre consumo de recursos cuando ocurren problemas

### Frontend

**Estructura actual:**
```
frontend/src/
├── debug/               # Sistema de debugging existente
│   ├── metrics.js      # Métricas de frame time y sistemas ECS
│   ├── logger.js       # Sistema de logging
│   ├── inspector.js    # Inspector de entidades
│   └── ...
├── interfaces/         # Interfaces de usuario
│   ├── debug-interface.js  # Interfaz F6 para debug
│   └── ...
└── config/
    └── debug-config.js  # Configuración del debugger
```

**Problemas identificados:**
1. **Métricas limitadas:** El sistema actual solo mide frame time y tiempos de sistemas ECS
2. **Sin métricas de memoria:** No se monitorea heap total, heap usado, o límites de memoria
3. **Sin métricas de GPU:** No se obtiene información del renderer de Three.js (draw calls, triangles, etc.)
4. **Sin métricas de CPU:** No se monitorea uso de CPU o load average
5. **Logging no estructurado:** Las métricas no se loguean de forma estructurada para análisis

### Base de Datos

**Estructura actual:**
```
database/
├── init/               # Scripts de inicialización
└── migrations/         # Migraciones
```

**Problemas identificados:**
1. **Sin monitoreo del pool:** No se monitorea el estado del pool de conexiones (total, idle, waiting requests)

## Necesidades Futuras

### Categorías de Métricas

1. **Métricas de Memoria** (estado actual: no implementado):
   - Backend: RSS, heap total, heap usado
   - Frontend: heap total, heap usado, heap limit
   - Requisitos: Formato legible (MB), logging periódico

2. **Métricas de CPU** (estado actual: no implementado):
   - Backend: Load average (1m, 5m, 15m)
   - Frontend: Información de performance (si está disponible)
   - Requisitos: Logging periódico, formato legible

3. **Métricas de GPU** (estado actual: no implementado):
   - Frontend: Información del renderer de Three.js
   - Requisitos: Draw calls, triangles, geometries, textures

4. **Métricas de Base de Datos** (estado actual: no implementado):
   - Backend: Pool de conexiones (total, idle, waiting)
   - Requisitos: Logging periódico, formato estructurado

5. **Métricas de Rendimiento** (estado actual: parcialmente implementado):
   - Frontend: Frame time (ya existe, mejorar)
   - Backend: Tiempo de respuesta de endpoints (futuro)
   - Requisitos: Integración con sistema existente

### Requisitos de Escalabilidad

1. **Fácil agregar nuevas métricas**: El sistema debe permitir agregar nuevas métricas sin modificar código existente
2. **Reutilización de código**: Componentes comunes para formateo y logging
3. **Separación de responsabilidades**: Servicio de monitoreo separado del código de negocio
4. **Extensibilidad**: Sistema debe poder extenderse para métricas futuras (Redis, WebSockets, etc.)
5. **Mantenibilidad**: Código claro y bien documentado
6. **Configurabilidad**: Intervalos, niveles de log, habilitar/deshabilitar métricas

## Arquitectura Propuesta

### Backend - Estructura Modular

```
backend/src/
├── services/
│   └── performance_monitor_service.py  # Nuevo servicio de monitoreo
├── config/
│   └── performance_config.py            # Configuración de monitoreo
└── main.py                              # Integrar servicio en startup
```

**Servicio de Monitoreo:**
- `PerformanceMonitorService`: Servicio principal que recopila y loguea métricas
- Métodos:
  - `start()`: Iniciar monitoreo en background task
  - `stop()`: Detener monitoreo
  - `collect_metrics()`: Recopilar todas las métricas
  - `format_metrics()`: Formatear métricas para logging
  - `log_metrics()`: Loguear métricas con formato estructurado

**Configuración:**
- `PERFORMANCE_LOG_INTERVAL`: Intervalo de logging (default: 30 segundos)
- `PERFORMANCE_LOG_ENABLED`: Habilitar/deshabilitar logging
- `PERFORMANCE_LOG_LEVEL`: Nivel de log (default: DEBUG)

### Frontend - Estructura Modular

```
frontend/src/
├── debug/
│   ├── metrics.js                      # Extender con nuevas métricas
│   ├── performance-logger.js           # Nuevo módulo para logging
│   └── ...
├── config/
│   └── debug-config.js                 # Agregar configuración de performance
└── interfaces/
    └── debug-interface.js              # Mostrar métricas en UI
```

**Extensión del Sistema Existente:**
- Extender `DebugMetrics` para incluir métricas de memoria, GPU, CPU
- Crear `PerformanceLogger` para logging estructurado
- Integrar con interfaz de debug existente (F6)

### Jerarquía de Clases

**Backend:**
```
PerformanceMonitorService
├── collect_memory_metrics() -> Dict
├── collect_cpu_metrics() -> Dict
├── collect_db_pool_metrics() -> Dict
├── format_metrics() -> str (JSON)
└── log_metrics() -> None
```

**Frontend:**
```
DebugMetrics (existente)
├── getMemoryMetrics() -> Object (nuevo)
├── getGPUMetrics() -> Object (nuevo)
├── getCPUMetrics() -> Object (nuevo)
└── getStats() -> Object (extender)

PerformanceLogger (nuevo)
├── logMetrics() -> void
└── formatMetrics() -> string (JSON)
```

## Patrones de Diseño a Usar

### 1. Singleton (Backend)
- **Descripción:** El servicio de monitoreo debe ser único y accesible globalmente
- **Cómo se aplica:** `PerformanceMonitorService` como singleton en `main.py`
- **Beneficios:** Evita múltiples instancias, facilita acceso desde cualquier parte

### 2. Observer Pattern (Frontend)
- **Descripción:** El sistema de métricas notifica cambios a la interfaz de debug
- **Cómo se aplica:** `DebugMetrics` notifica a `DebugInterface` cuando hay nuevas métricas
- **Beneficios:** Desacoplamiento entre recolección de métricas y visualización

### 3. Strategy Pattern (Formateo)
- **Descripción:** Diferentes estrategias de formateo (JSON, texto, etc.)
- **Cómo se aplica:** `format_metrics()` puede usar diferentes formatters
- **Beneficios:** Fácil cambiar formato sin modificar lógica de recolección

### 4. Factory Pattern (Métricas)
- **Descripción:** Factory para crear diferentes tipos de métricas
- **Cómo se aplica:** Métodos factory para crear métricas de memoria, CPU, GPU
- **Beneficios:** Fácil agregar nuevos tipos de métricas

## Beneficios de la Nueva Arquitectura

1. **Visibilidad de recursos:** Permite identificar problemas de rendimiento y memory leaks
2. **Debugging mejorado:** Logs estructurados facilitan análisis y troubleshooting
3. **Optimización basada en datos:** Métricas reales permiten optimizar donde realmente importa
4. **Monitoreo proactivo:** Detectar problemas antes de que afecten a usuarios
5. **Integración con sistema existente:** Extiende el debugger del frontend sin romper funcionalidad
6. **Configurabilidad:** Sistema flexible que se puede habilitar/deshabilitar según necesidad

## Migración Propuesta

### Fase 1: Backend - Servicio de Monitoreo
- Crear `PerformanceMonitorService` con recolección básica de métricas
- Integrar con `main.py` para iniciar en background task
- Implementar logging estructurado (JSON)
- Testing básico

### Fase 2: Backend - Métricas Específicas
- Implementar recolección de métricas de memoria (psutil)
- Implementar recolección de métricas de CPU (psutil)
- Implementar recolección de métricas de DB pool (asyncpg)
- Testing de cada métrica

### Fase 3: Frontend - Extensión del Debugger
- Extender `DebugMetrics` con nuevas métricas
- Implementar recolección de métricas de memoria (performance.memory)
- Implementar recolección de métricas de GPU (Three.js renderer)
- Integrar con interfaz de debug existente

### Fase 4: Frontend - Logging Estructurado
- Crear `PerformanceLogger` para logging estructurado
- Integrar con sistema de debugger
- Testing y optimización

## Consideraciones Técnicas

### Backend

1. **Compatibilidad**: 
   - `psutil` puede no estar disponible, implementar fallback o advertencia
   - El sistema debe funcionar aunque algunas métricas no estén disponibles

2. **Base de datos**: 
   - Usar `asyncpg.Pool.get_stats()` para métricas del pool
   - Manejar casos donde el pool no esté inicializado

3. **APIs**: 
   - Usar logging estándar de Python para consistencia
   - Formato JSON para facilitar parsing y análisis

4. **Testing**: 
   - Tests unitarios para cada tipo de métrica
   - Tests de integración para el servicio completo
   - Verificar que no degrada rendimiento

5. **Performance**: 
   - El logging debe ejecutarse en background task (no bloquear)
   - Intervalo configurable para no saturar logs
   - Sampling opcional para reducir overhead

### Frontend

1. **Renderizado**: 
   - Las métricas no deben ejecutarse en cada frame
   - Usar `requestAnimationFrame` o intervalos para actualización periódica

2. **Optimización**: 
   - Sampling para reducir overhead
   - Actualizar UI solo cuando hay cambios significativos

3. **Extensibilidad**: 
   - Sistema debe permitir agregar nuevas métricas fácilmente
   - Integración con sistema de debugger existente

4. **Compatibilidad**: 
   - `performance.memory` puede no estar disponible en todos los navegadores
   - El sistema debe funcionar con fallbacks

5. **Testing**: 
   - Tests para cada tipo de métrica
   - Verificar que no degrada FPS del juego

## Ejemplo de Uso Futuro

**Backend:**
```python
# En main.py
from src.services.performance_monitor_service import PerformanceMonitorService

app = FastAPI()

# Iniciar monitoreo
monitor = PerformanceMonitorService(
    interval=30,  # segundos
    enabled=True
)
monitor.start()

# Logs automáticos cada 30 segundos:
# [RUNTIME STATS] {"timestamp":"...","memory":{"rss":"174.06 MB",...},"dbPool":{...},"cpu":{...}}
```

**Frontend:**
```javascript
// En debug-interface.js
import { DebugMetrics } from '../debug/metrics.js';

const metrics = new DebugMetrics(ecs);

// Métricas disponibles:
const stats = metrics.getStats();
// {
//   frameTime: { avg: 16.67, min: 15.0, max: 20.0 },
//   memory: { heapTotal: "97.20 MB", heapUsed: "92.29 MB" },
//   gpu: { drawCalls: 150, triangles: 50000 },
//   systems: { ... }
// }
```

## Conclusión

La implementación de un sistema de logging de rendimiento estructurado mejorará significativamente la capacidad de monitorear y optimizar el juego. La arquitectura propuesta:

- **Extiende sistemas existentes** en lugar de crear nuevos, minimizando impacto
- **Es configurable y flexible**, permitiendo habilitar/deshabilitar según necesidad
- **Proporciona visibilidad completa** de recursos (RAM, GPU, CPU, DB)
- **Usa formato estructurado** (JSON) para facilitar análisis y parsing
- **Tiene mínimo overhead** mediante sampling y configuración de intervalos

La implementación se divide en fases claras, comenzando por el backend (más simple) y luego extendiendo el frontend (más complejo por integración con sistema existente).
