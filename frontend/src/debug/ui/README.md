# Debug UI

Herramientas visuales para debugging.

## DebugPanel

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

**Información mostrada:**
- **Performance**: FPS actual, frame time promedio/mínimo/máximo, tiempo de ejecución por sistema, número de entidades procesadas por sistema
- **Recent Logs**: Últimas 10 líneas de logs en tiempo real (F4 para más detalles)

## DebugInterface

Interfaz GUI de debugging, activable con tecla F4.

**Características:**
- Interfaz visual con tabs organizados
- Botones para acciones comunes
- Campos de entrada con placeholders
- Resultados formateados en JSON
- Botón para copiar resultados
- Comandos rápidos predefinidos
- Área de comandos personalizados (permite copiar/pegar)

**Uso:**
Presionar `F4` para mostrar/ocultar la interfaz.

**Tabs disponibles:**
- **Inspector**: Inspeccionar entidades y componentes, buscar entidades, ver estadísticas del ECS
- **Métricas**: Ver métricas de performance, resetear métricas, auto-refresh
- **Eventos**: Ver historial de eventos, filtrar por nombre, limpiar historial
- **Logger**: Cambiar nivel de log, probar logger, controlar Debug Panel (F3), ver logs en tiempo real
- **Comandos**: Comandos rápidos predefinidos y área para comandos personalizados

**Características adicionales:**
- Interfaz transparente para ver el juego detrás
- Bloqueo automático de input del juego cuando está abierta
- Logs en tiempo real con colores según nivel
- Resultados formateados en JSON con botón para copiar

**Variables disponibles:**
- `debugTools` - Todas las herramientas de debugging
- `app` - Instancia de App
- `ecs` - ECS Manager
- `inspector`, `metrics`, `logger`, `validator`, `events`, `panel` - Acceso directo

**Ejemplos:**
```
inspector.getStats()
metrics.getStats()
logger.info("Test", "Mensaje")
events.getHistory()
```
