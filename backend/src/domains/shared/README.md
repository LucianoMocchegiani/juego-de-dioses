# Shared

Schemas, helpers y **servicios cross-cutting** compartidos. No debe importar de ningún dominio para evitar ciclos.

**Schemas (schemas.py):**
- **`parse_jsonb_field`**: parseo seguro de campos JSONB de asyncpg.
- **`MaterialProperties`**, **`GeometriaParametros`**, **`GeometriaVisual`**, **`VisualProperties`**, **`EstilosParticula`**: geometría y estilos de partículas/agrupaciones.

**Puertos (ports/):**
- **`IBloqueConfigProvider`**: puerto para obtener configuración de un bloque por ID (dict). Usado por `WorldBloqueManager`; lo implementa p. ej. `PostgresBloqueRepository` del dominio bloques.

**Servicios de infra (cross-cutting):**
- **`PerformanceMonitorService`** (performance_monitor.py): monitoreo de rendimiento (CPU, memoria, pool BD).
- **`WorldBloque`** (world_bloque.py): bloque espacial en memoria (40x40x40 celdas). `calcular_temperatura` depende de `celestial.service.calculate_cell_temperature`; en el futuro se prefiere inyectar un puerto `ITemperatureCalculator`.
- **`WorldBloqueManager`** (world_bloque_manager.py): gestor de bloques espaciales con cache y lazy loading. **Requiere inyección** de un `IBloqueConfigProvider` (p. ej. `WorldBloqueManager(bloque_repository)`); no usa `get_connection()`.
