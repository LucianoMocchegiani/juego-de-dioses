# Guía de Uso - Interfaz de Debugging (F4)

Guía completa para usar la interfaz gráfica de debugging del juego.

## Activación

Presiona **F4** para abrir/cerrar la interfaz de debugging.

**Características:**
- Interfaz transparente que permite ver el juego detrás
- Bloqueo automático del input del juego cuando está abierta
- Puedes escribir y usar todos los controles normalmente dentro de la interfaz
- Presiona **F4** nuevamente para cerrar

## Tabs Disponibles

### 1. Inspector

Inspeccionar entidades y componentes del ECS en tiempo real.

**Funciones:**
- **Obtener Estadísticas del ECS**: Muestra un resumen completo del estado del ECS
  - Total de entidades
  - Conteo de componentes por tipo
  - Lista de sistemas registrados

- **Buscar entidades por componente**: Encuentra todas las entidades que tienen un componente específico
  - Ejemplo: Buscar "Animation" para ver todas las entidades con animaciones
  - Ejemplo: Buscar "Combat" para ver todas las entidades con sistema de combate

- **Inspeccionar entidad por ID**: Ver todos los componentes y datos de una entidad específica
  - Ingresa el ID numérico de la entidad
  - Muestra todos sus componentes con sus valores actuales

**Uso:**
1. Abre el tab "Inspector"
2. Usa los botones o campos de entrada según lo que necesites
3. Los resultados se muestran en formato JSON con un botón para copiar

### 2. Métricas

Ver métricas detalladas de performance del juego.

**Funciones:**
- **Obtener Métricas**: Muestra estadísticas de performance
  - Frame time promedio, mínimo y máximo
  - Tiempo de ejecución por sistema
  - Número de entidades procesadas por sistema

- **Resetear Métricas**: Limpia todas las métricas acumuladas y comienza de nuevo

- **Auto-refresh**: Activa actualización automática cada 2 segundos
  - Útil para monitorear performance en tiempo real
  - Desactívalo cuando no lo necesites para ahorrar recursos

**Uso:**
1. Abre el tab "Métricas"
2. Haz clic en "Obtener Métricas" para ver estadísticas actuales
3. Activa "Auto-refresh" si quieres monitoreo continuo
4. Usa "Resetear Métricas" para comenzar una nueva medición

### 3. Eventos

Ver y filtrar el historial de eventos del sistema de debugging.

**Funciones:**
- **Ver Historial de Eventos**: Muestra todos los eventos registrados
  - Incluye timestamp, nombre del evento y datos asociados
  - Útil para entender la secuencia de eventos en el juego

- **Filtrar por nombre de evento**: Busca eventos específicos
  - Ejemplo: "combat:action:started" para ver solo eventos de inicio de combate
  - Los resultados se muestran filtrados

- **Limpiar Historial**: Elimina todos los eventos del historial
  - Útil cuando el historial se vuelve muy grande

**Uso:**
1. Abre el tab "Eventos"
2. Haz clic en "Ver Historial de Eventos" para ver todos los eventos
3. Usa el campo de filtro para buscar eventos específicos
4. Usa "Limpiar Historial" cuando necesites resetear

### 4. Logger

Gestionar el sistema de logging y ver logs en tiempo real.

**Funciones:**
- **Control del Debug Panel (F3)**: Checkbox para activar/desactivar el panel F3
  - El panel F3 muestra métricas y logs de forma compacta
  - Se sincroniza automáticamente si usas F3 como atajo

- **Nivel de log**: Cambiar el nivel mínimo de logs a mostrar
  - **DEBUG**: Muestra todos los logs (más verboso)
  - **INFO**: Muestra info, warnings y errores
  - **WARN**: Muestra solo warnings y errores
  - **ERROR**: Muestra solo errores

- **Probar logger**: Enviar un mensaje de prueba al logger
  - Útil para verificar que el logger funciona correctamente
  - El mensaje aparecerá en los logs en tiempo real

- **Logs en Tiempo Real**: Área que muestra los últimos logs automáticamente
  - Se actualiza en tiempo real cuando ocurren eventos
  - Muestra hasta 500 logs
  - Colores según nivel: debug (gris), info (verde), warn (naranja), error (rojo)
  - Botón "Limpiar" para borrar todos los logs mostrados

**Uso:**
1. Abre el tab "Logger"
2. Activa/desactiva el Debug Panel (F3) según necesites
3. Cambia el nivel de log según la verbosidad que necesites
4. Observa los logs en tiempo real en la sección inferior
5. Usa "Limpiar" para resetear los logs mostrados

### 5. Comandos

Ejecutar comandos JavaScript personalizados y comandos rápidos predefinidos.

**Funciones:**
- **Comandos Rápidos**: Botones predefinidos para acciones comunes
  - Estadísticas ECS
  - Métricas
  - Historial Eventos
  - Buscar Animation
  - Buscar Combat
  - Resetear Métricas
  - Limpiar Eventos

- **Comando personalizado**: Área de texto para escribir código JavaScript
  - Permite copiar y pegar código
  - Ejecuta código en el contexto del juego
  - Útil para debugging avanzado o pruebas rápidas

**Variables disponibles en comandos:**
- `debugTools` - Todas las herramientas de debugging
- `app` - Instancia de App
- `ecs` - ECS Manager
- `inspector`, `metrics`, `logger`, `validator`, `events`, `panel`, `interface` - Acceso directo a herramientas

**Ejemplos de comandos:**
```javascript
// Ver estadísticas del ECS
inspector.getStats()

// Ver métricas
metrics.getStats()

// Enviar un log
logger.info("Test", "Mensaje de prueba")

// Ver historial de eventos
events.getHistory()

// Inspeccionar una entidad
inspector.inspectEntity(1)

// Buscar entidades con un componente
inspector.findEntities({ hasComponent: "Animation" })
```

**Uso:**
1. Abre el tab "Comandos"
2. Haz clic en cualquier comando rápido para ejecutarlo
3. O escribe tu propio comando en el área de texto
4. Haz clic en "Ejecutar" para ejecutar comandos personalizados
5. Los resultados se muestran en formato JSON con botón para copiar

## Características Generales

### Copiar Resultados
Todos los resultados se muestran en formato JSON con un botón "Copiar" que permite copiar el resultado al portapapeles.

### Bloqueo de Input
Cuando la interfaz está abierta, el input del juego se bloquea automáticamente. Esto significa que:
- El personaje no se moverá
- Las animaciones no se activarán
- Puedes escribir normalmente en los campos de la interfaz
- F4 sigue funcionando para cerrar la interfaz

### Transparencia
La interfaz es semi-transparente para que puedas ver el juego detrás mientras debuggeas.

## Atajos de Teclado

- **F4**: Abrir/cerrar la interfaz de debugging
- **F3**: Atajo rápido para el Debug Panel (también controlable desde F4 → Logger)

## Consejos de Uso

1. **Monitoreo continuo**: Usa el Debug Panel (F3) para monitoreo continuo mientras juegas
2. **Debugging detallado**: Usa la interfaz F4 para análisis más profundo
3. **Logs en tiempo real**: Mantén el tab Logger abierto para ver qué está pasando
4. **Comandos personalizados**: Usa el tab Comandos para pruebas rápidas sin escribir en la consola
5. **Copia resultados**: Usa el botón "Copiar" para guardar resultados y analizarlos después
