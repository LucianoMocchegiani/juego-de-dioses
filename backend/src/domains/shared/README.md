# Shared

Schemas, helpers y **servicios cross-cutting** compartidos. No debe importar de ningún dominio para evitar ciclos.

**Schemas (schemas.py):**
- **`parse_jsonb_field`**: parseo seguro de campos JSONB de asyncpg.
- **`MaterialProperties`**, **`GeometriaParametros`**, **`GeometriaVisual`**, **`VisualProperties`**, **`EstilosParticula`**: geometría y estilos de partículas/agrupaciones.

**Servicios de infra (cross-cutting):**
- **`PerformanceMonitorService`** (performance_monitor.py): monitoreo de rendimiento (CPU, memoria, pool BD).
- **`WorldBloque`** (world_bloque.py): bloque espacial en memoria (40x40x40 celdas).
- **`WorldBloqueManager`** (world_bloque_manager.py): gestor de bloques espaciales con cache y lazy loading.
