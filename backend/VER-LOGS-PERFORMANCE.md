# Cómo Ver los Logs de Rendimiento del Backend

Este documento explica cómo ver los logs del sistema de monitoreo de rendimiento que se implementó en JDG-045.

## Configuración Actual

El sistema de monitoreo está configurado para:
- **Intervalo de logging**: 30 segundos (configurable con `PERFORMANCE_LOG_INTERVAL`)
- **Nivel de log**: DEBUG (configurable con `PERFORMANCE_LOG_LEVEL`)
- **Habilitado por defecto**: Sí (configurable con `PERFORMANCE_LOG_ENABLED`)

## Ver Logs con Docker Compose

### Opción 1: Ver logs en tiempo real (recomendado)

```bash
# Ver todos los logs del backend
docker-compose logs -f backend

# Ver solo los últimos 100 líneas y seguir
docker-compose logs -f --tail=100 backend

# Filtrar solo logs de rendimiento (buscar "RUNTIME STATS")
docker-compose logs -f backend | grep "RUNTIME STATS"
```

### Opción 2: Ver logs desde el contenedor directamente

```bash
# Entrar al contenedor
docker exec -it juego-de-dioses-backend bash

# Ver logs (si están en un archivo)
# O simplemente ver la salida estándar del proceso
```

### Opción 3: Ver logs históricos

```bash
# Ver últimos 200 líneas
docker-compose logs --tail=200 backend

# Ver logs desde una fecha específica
docker-compose logs --since="2026-01-07T10:00:00" backend
```

## Ver Logs sin Docker (Ejecución Local)

Si ejecutas el backend directamente con Python:

```bash
# Desde el directorio backend/
cd backend
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload --log-level debug
```

Los logs aparecerán directamente en la consola.

## Formato de los Logs

Los logs de rendimiento tienen el siguiente formato:

```
[timestamp] - src.services.performance_monitor_service - DEBUG - [RUNTIME STATS] {
  "timestamp": "2026-01-07T14:35:14.201Z",
  "memory": {
    "rss": "174.06 MB",
    "heapTotal": "N/A",
    "heapUsed": "N/A",
    "percent": "2.45%"
  },
  "cpu": {
    "loadAvg1m": "0.50",
    "loadAvg5m": "0.45",
    "loadAvg15m": "0.40",
    "percent": "5.23%"
  },
  "dbPool": {
    "totalConnections": 2,
    "idleConnections": 2,
    "activeConnections": 0,
    "maxSize": 10,
    "waitingRequests": 0
  }
}
```

## Configuración de Variables de Entorno

Puedes ajustar el comportamiento del monitoreo con variables de entorno:

### En docker-compose.yml

Agregar en la sección `environment` del servicio `backend`:

```yaml
environment:
  # ... otras variables ...
  PERFORMANCE_LOG_INTERVAL: "30"        # Intervalo en segundos
  PERFORMANCE_LOG_ENABLED: "true"       # Habilitar/deshabilitar
  PERFORMANCE_LOG_LEVEL: "DEBUG"        # DEBUG, INFO, WARNING, ERROR
```

### En archivo .env

Crear o editar `.env` en la raíz del proyecto:

```env
PERFORMANCE_LOG_INTERVAL=30
PERFORMANCE_LOG_ENABLED=true
PERFORMANCE_LOG_LEVEL=DEBUG
```

## Filtrar Logs Específicos

### Solo logs de rendimiento

```bash
# Con grep
docker-compose logs -f backend | grep "RUNTIME STATS"

# Con jq (si tienes JSON formateado)
docker-compose logs -f backend | grep "RUNTIME STATS" | jq .
```

### Solo logs de errores

```bash
docker-compose logs -f backend | grep -i "error"
```

### Solo logs del servicio de performance

```bash
docker-compose logs -f backend | grep "performance_monitor_service"
```

## Verificar que el Sistema Está Funcionando

1. **Verificar que el servicio se inició**:
   ```bash
   docker-compose logs backend | grep "Performance monitoring started"
   ```
   Deberías ver: `Performance monitoring started (interval: 30.0s)`

2. **Esperar 30 segundos** y verificar que aparecen logs:
   ```bash
   docker-compose logs --tail=50 backend | grep "RUNTIME STATS"
   ```

3. **Verificar métricas**:
   Los logs deberían aparecer cada 30 segundos con información de:
   - Memoria (RSS, porcentaje)
   - CPU (load average, porcentaje)
   - Pool de conexiones DB (total, idle, active)

## Solución de Problemas

### No aparecen logs

1. **Verificar que el servicio está habilitado**:
   ```bash
   docker-compose exec backend python -c "from src.config.performance_config import PERFORMANCE_CONFIG; print(PERFORMANCE_CONFIG)"
   ```

2. **Verificar nivel de log de uvicorn**:
   Asegúrate de que uvicorn esté configurado con `--log-level debug`

3. **Verificar que psutil está instalado**:
   ```bash
   docker-compose exec backend python -c "import psutil; print('psutil OK')"
   ```

### Logs aparecen pero sin métricas

- Verificar que la base de datos está conectada
- Verificar que psutil puede acceder a métricas del sistema
- Revisar logs de errores: `docker-compose logs backend | grep -i "error"`

## Ejemplo de Uso

```bash
# 1. Iniciar servicios
docker-compose up -d

# 2. Ver logs en tiempo real
docker-compose logs -f backend

# 3. En otra terminal, filtrar solo métricas de rendimiento
docker-compose logs -f backend | grep "RUNTIME STATS"

# 4. Esperar 30 segundos y deberías ver algo como:
# [RUNTIME STATS] {
#   "timestamp": "2026-01-07T14:35:14.201Z",
#   "memory": { ... },
#   "cpu": { ... },
#   "dbPool": { ... }
# }
```

## Notas

- Los logs aparecen cada 30 segundos por defecto
- El nivel DEBUG muestra más información, pero también más ruido
- En producción, considera cambiar a nivel INFO para reducir volumen de logs
- El formato JSON facilita el parsing y análisis posterior
