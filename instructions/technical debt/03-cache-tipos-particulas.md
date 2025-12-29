# Technical Debt: Cache de Tipos de Partículas

**Fecha**: 2025-12-28  
**Ticket Relacionado**: JDG-041  
**Prioridad**: Alta  
**Estado**: Pendiente

## Contexto

Durante la implementación del sistema de conservación de calor (JDG-041), se identificó que `get_tipo_particula_por_nombre()` realiza una consulta a la base de datos **cada vez que se llama**, lo cual es ineficiente ya que los tipos de partículas son datos estáticos que raramente cambian.

## Situación Actual

**Implementación actual**: Consultas directas a PostgreSQL en múltiples lugares

### 1. Funciones de Servicio (sin cache)

```python
# backend/src/services/particula_service.py

# Función 1: Por ID
async def get_tipo_particula(tipo_id: str) -> Optional[Dict[str, Any]]:
    async with get_connection() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM juego_dioses.tipos_particulas WHERE id = $1",
            tipo_id
        )
        return dict(row) if row else None

# Función 2: Por nombre
async def get_tipo_particula_por_nombre(nombre: str) -> Optional[Dict[str, Any]]:
    async with get_connection() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM juego_dioses.tipos_particulas WHERE nombre = $1",
            nombre
        )
        return dict(row) if row else None
```

### 2. Consultas Directas en Seeds/Builders

```python
# backend/src/database/terrain_builder.py
tipo_limite_id = await conn.fetchval(
    "SELECT id FROM juego_dioses.tipos_particulas WHERE nombre = 'límite'"
)

# backend/src/database/seed_terrain_test_1.py (múltiples consultas)
hierba_id = await conn.fetchval("SELECT id FROM juego_dioses.tipos_particulas WHERE nombre = 'hierba'")
tierra_id = await conn.fetchval("SELECT id FROM juego_dioses.tipos_particulas WHERE nombre = 'tierra'")
piedra_id = await conn.fetchval("SELECT id FROM juego_dioses.tipos_particulas WHERE nombre = 'piedra'")
agua_id = await conn.fetchval("SELECT id FROM juego_dioses.tipos_particulas WHERE nombre = 'agua'")

# backend/src/database/seed_terrain_test_2.py (mismo patrón)
# ... múltiples consultas similares ...
```

### 3. Cache Local Parcial (solo IDs)

```python
# backend/src/database/creators/entity_creator.py
# ✅ Ya tiene cache local, pero solo para IDs (no datos completos)
class EntityCreator:
    def __init__(self):
        self._particle_type_cache: Dict[str, str] = {}  # Solo guarda ID
    
    async def _get_particle_type_id(self, nombre: str) -> str:
        if nombre not in self._particle_type_cache:
            tipo_id = await self.conn.fetchval(
                "SELECT id FROM juego_dioses.tipos_particulas WHERE nombre = $1",
                nombre
            )
            self._particle_type_cache[nombre] = tipo_id
        return self._particle_type_cache[nombre]
```

### 4. JOINs en Queries (no optimizables con cache simple)

```python
# backend/src/api/routes/particles.py
# JOIN para obtener datos junto con partículas (caso especial)
SELECT p.*, tp.nombre, tp.color, tp.geometria, tp.opacidad
FROM juego_dioses.particulas p
JOIN juego_dioses.tipos_particulas tp ON p.tipo_particula_id = tp.id
```

**Problemas identificados:**

1. **Performance:**
   - ❌ Consulta a BD en cada llamada (~5-20ms por consulta)
   - ❌ Se llama múltiples veces en el mismo request (ej: calcular temperatura)
   - ❌ Latencia acumulada en operaciones que requieren múltiples tipos
   - ❌ Seeds ejecutan múltiples consultas redundantes

2. **Carga en BD:**
   - ❌ Consultas repetitivas para los mismos datos
   - ❌ Desperdicio de recursos de BD
   - ❌ Escalabilidad limitada (más requests = más carga)

3. **Inconsistencia:**
   - ⚠️ Algunos lugares tienen cache local (`entity_creator.py`)
   - ⚠️ Otros lugares consultan directamente
   - ⚠️ No hay cache centralizado

4. **Datos estáticos:**
   - ✅ Los tipos de partículas **no cambian frecuentemente**
   - ✅ Son datos de referencia (similar a catálogos)
   - ✅ Perfectos para cache centralizado

**Uso actual identificado:**

1. **Funciones de servicio:**
   - `get_tipo_particula_por_nombre()`: Usado en `temperature_service.py` (múltiples veces)
   - `get_tipo_particula()`: Potencialmente usado en otros lugares

2. **Seeds y builders:**
   - `seed_terrain_test_1.py`: 4+ consultas directas
   - `seed_terrain_test_2.py`: 4+ consultas directas
   - `terrain_builder.py`: 1 consulta directa
   - `entity_creator.py`: Ya tiene cache local (solo IDs)

3. **APIs:**
   - `particles.py`: JOIN en queries (caso especial, no optimizable con cache simple)

## Impacto en Performance

**Ejemplo real:**
```python
# Al calcular temperatura de un bloque con 100 partículas de agua:
# - get_water_modifier() busca 100 partículas
# - Para cada partícula, llama get_tipo_particula_por_nombre('agua')
# - Resultado: 100 consultas a BD para el mismo tipo
# - Tiempo: 100 * 10ms = 1000ms (1 segundo solo en consultas)
```

**Con cache:**
- Primera llamada: 10ms (consulta a BD + guardar en cache)
- Siguientes 99 llamadas: <0.1ms (lectura de memoria)
- Tiempo total: ~10ms (100x más rápido)

## Propuesta: Cache Centralizado en Memoria

**Implementación sugerida:**

### 1. Cache Global Centralizado

```python
# backend/src/services/particula_service.py

# Cache global en memoria (por nombre y por ID)
_tipos_particulas_cache_by_name: Dict[str, Dict[str, Any]] = {}
_tipos_particulas_cache_by_id: Dict[str, Dict[str, Any]] = {}
_cache_lock = asyncio.Lock()  # Para thread-safety

async def get_tipo_particula_por_nombre(nombre: str) -> Optional[Dict[str, Any]]:
    """
    Obtiene un tipo de partícula por su nombre (con cache).
    
    Primera llamada: consulta BD y guarda en cache
    Siguientes llamadas: retorna desde cache (ultra-rápido)
    """
    nombre_lower = nombre.lower()
    
    # 1. Verificar cache
    if nombre_lower in _tipos_particulas_cache_by_name:
        return _tipos_particulas_cache_by_name[nombre_lower]
    
    # 2. Consultar BD (solo si no está en cache)
    async with _cache_lock:  # Thread-safety
        # Double-check (otro thread pudo haber agregado mientras esperábamos)
        if nombre_lower in _tipos_particulas_cache_by_name:
            return _tipos_particulas_cache_by_name[nombre_lower]
        
        async with get_connection() as conn:
            row = await conn.fetchrow(
                """
                SELECT * FROM juego_dioses.tipos_particulas
                WHERE nombre = $1
                """,
                nombre
            )
            
            if row:
                tipo_data = dict(row)
                tipo_id = str(tipo_data['id'])
                nombre_lower = tipo_data['nombre'].lower()
                
                # Guardar en ambos caches
                _tipos_particulas_cache_by_name[nombre_lower] = tipo_data
                _tipos_particulas_cache_by_id[tipo_id] = tipo_data
                
                return tipo_data
            
            return None

async def get_tipo_particula(tipo_id: str) -> Optional[Dict[str, Any]]:
    """
    Obtiene un tipo de partícula por su ID (con cache).
    
    Primera llamada: consulta BD y guarda en cache
    Siguientes llamadas: retorna desde cache (ultra-rápido)
    """
    # 1. Verificar cache
    if tipo_id in _tipos_particulas_cache_by_id:
        return _tipos_particulas_cache_by_id[tipo_id]
    
    # 2. Consultar BD (solo si no está en cache)
    async with _cache_lock:
        if tipo_id in _tipos_particulas_cache_by_id:
            return _tipos_particulas_cache_by_id[tipo_id]
        
        async with get_connection() as conn:
            row = await conn.fetchrow(
                """
                SELECT * FROM juego_dioses.tipos_particulas
                WHERE id = $1
                """,
                tipo_id
            )
            
            if row:
                tipo_data = dict(row)
                tipo_id_str = str(tipo_data['id'])
                nombre_lower = tipo_data['nombre'].lower()
                
                # Guardar en ambos caches
                _tipos_particulas_cache_by_name[nombre_lower] = tipo_data
                _tipos_particulas_cache_by_id[tipo_id_str] = tipo_data
                
                return tipo_data
            
            return None

async def get_tipo_particula_id_por_nombre(nombre: str) -> Optional[str]:
    """
    Helper: Obtener solo el ID de un tipo por nombre (ultra-rápido con cache).
    
    Útil para seeds y builders que solo necesitan el ID.
    """
    tipo = await get_tipo_particula_por_nombre(nombre)
    return str(tipo['id']) if tipo else None

async def invalidate_tipo_particula_cache(nombre: str = None, tipo_id: str = None):
    """
    Invalidar cache de tipos de partículas.
    
    Útil cuando se actualiza un tipo de partícula en la BD.
    
    Args:
        nombre: Nombre del tipo a invalidar
        tipo_id: ID del tipo a invalidar
        Si ambos son None, invalida todo el cache
    """
    async with _cache_lock:
        if nombre:
            nombre_lower = nombre.lower()
            tipo_data = _tipos_particulas_cache_by_name.pop(nombre_lower, None)
            if tipo_data:
                _tipos_particulas_cache_by_id.pop(str(tipo_data['id']), None)
        elif tipo_id:
            tipo_data = _tipos_particulas_cache_by_id.pop(tipo_id, None)
            if tipo_data:
                _tipos_particulas_cache_by_name.pop(tipo_data['nombre'].lower(), None)
        else:
            _tipos_particulas_cache_by_name.clear()
            _tipos_particulas_cache_by_id.clear()

async def preload_tipos_particulas_cache():
    """
    Precargar todos los tipos de partículas en cache.
    
    Útil al iniciar el servidor para evitar "cold start" delays.
    """
    async with get_connection() as conn:
        rows = await conn.fetch(
            """
            SELECT * FROM juego_dioses.tipos_particulas
            """
        )
        
        async with _cache_lock:
            for row in rows:
                tipo_data = dict(row)
                tipo_id = str(tipo_data['id'])
                nombre_lower = tipo_data['nombre'].lower()
                
                # Guardar en ambos caches
                _tipos_particulas_cache_by_name[nombre_lower] = tipo_data
                _tipos_particulas_cache_by_id[tipo_id] = tipo_data
```

### 2. Refactorizar Seeds/Builders para Usar Cache

**Antes:**
```python
# ❌ Consulta directa
hierba_id = await conn.fetchval(
    "SELECT id FROM juego_dioses.tipos_particulas WHERE nombre = 'hierba'"
)
```

**Después:**
```python
# ✅ Usar función con cache
from src.services.particula_service import get_tipo_particula_id_por_nombre

hierba_id = await get_tipo_particula_id_por_nombre('hierba')
```

### 3. Migrar entity_creator.py a Cache Centralizado

**Antes:**
```python
# ❌ Cache local (solo IDs)
self._particle_type_cache: Dict[str, str] = {}
```

**Después:**
```python
# ✅ Usar cache centralizado
from src.services.particula_service import get_tipo_particula_id_por_nombre

async def _get_particle_type_id(self, nombre: str) -> str:
    tipo_id = await get_tipo_particula_id_por_nombre(nombre)
    if not tipo_id:
        raise ValueError(f"Tipo de partícula '{nombre}' no encontrado")
    return tipo_id
```

## Alternativa: Cache con TTL

**Si se necesita invalidación automática:**

```python
from datetime import datetime, timedelta

_tipos_particulas_cache: Dict[str, Tuple[Dict[str, Any], datetime]] = {}
CACHE_TTL = timedelta(hours=1)  # Cache válido por 1 hora

async def get_tipo_particula_por_nombre(nombre: str) -> Optional[Dict[str, Any]]:
    nombre_lower = nombre.lower()
    now = datetime.now()
    
    # Verificar cache y TTL
    if nombre_lower in _tipos_particulas_cache:
        tipo_data, cached_at = _tipos_particulas_cache[nombre_lower]
        if now - cached_at < CACHE_TTL:
            return tipo_data
        # TTL expirado, remover del cache
        _tipos_particulas_cache.pop(nombre_lower, None)
    
    # Consultar BD y actualizar cache
    # ... (mismo código que arriba)
```

## Ventajas de la Solución

1. **Performance:**
   - ✅ Acceso ultra-rápido desde memoria (<0.1ms)
   - ✅ Reduce carga en BD significativamente
   - ✅ Mejora tiempo de respuesta de cálculos de temperatura

2. **Escalabilidad:**
   - ✅ Soporta más requests simultáneos
   - ✅ Menos carga en BD = mejor escalabilidad
   - ✅ Menos latencia en operaciones críticas

3. **Simplicidad:**
   - ✅ Implementación simple (dict en memoria)
   - ✅ Sin dependencias externas
   - ✅ Fácil de mantener

## Desventajas

1. **Memoria:**
   - ⚠️ Consume RAM del proceso Python
   - ⚠️ Mitigación: Tipos de partículas son pocos (~50-100 tipos)

2. **Invalidación:**
   - ⚠️ Cache puede quedar obsoleto si se actualiza BD directamente
   - ⚠️ Mitigación: Función `invalidate_tipo_particula_cache()` para invalidar manualmente

3. **Multi-instance:**
   - ⚠️ Cache no compartido entre múltiples instancias del servidor
   - ⚠️ Mitigación: Para multi-instance, considerar Redis (futuro)

## Acciones Recomendadas

### Corto Plazo (JDG-041)

1. **Implementar cache centralizado:**
   - Agregar dicts globales `_tipos_particulas_cache_by_name` y `_tipos_particulas_cache_by_id`
   - Modificar `get_tipo_particula_por_nombre()` para usar cache
   - Modificar `get_tipo_particula()` para usar cache
   - Agregar helper `get_tipo_particula_id_por_nombre()` para IDs
   - Agregar función `invalidate_tipo_particula_cache()`

2. **Precargar cache al startup:**
   - Llamar `preload_tipos_particulas_cache()` en `main.py`
   - Evitar "cold start" delays

3. **Testing:**
   - Verificar que cache funciona correctamente
   - Verificar que invalidación funciona
   - Medir mejora de performance

### Medio Plazo (Post JDG-041)

1. **Refactorizar seeds y builders:**
   - Migrar `seed_terrain_test_1.py` a usar `get_tipo_particula_id_por_nombre()`
   - Migrar `seed_terrain_test_2.py` a usar `get_tipo_particula_id_por_nombre()`
   - Migrar `terrain_builder.py` a usar `get_tipo_particula_id_por_nombre()`
   - Migrar `entity_creator.py` a cache centralizado (eliminar cache local)

### Medio Plazo

1. **Invalidación automática:**
   - Si se implementa API para actualizar tipos, invalidar cache automáticamente
   - Considerar TTL si es necesario

2. **Métricas:**
   - Agregar métricas de hit/miss del cache
   - Monitorear performance

### Largo Plazo (si se requiere multi-instance)

1. **Migrar a Redis:**
   - Similar a `01-cache-bloques-redis-vs-memoria.md`
   - Cache compartido entre instancias
   - TTL automático

## Impacto en Código Existente

### Archivos a Modificar

**1. Funciones de servicio (alta prioridad):**
- `backend/src/services/particula_service.py`
  - Modificar `get_tipo_particula()` - Agregar cache
  - Modificar `get_tipo_particula_por_nombre()` - Agregar cache
  - Agregar `get_tipo_particula_id_por_nombre()` - Helper para IDs
  - Agregar `preload_tipos_particulas_cache()` - Precarga
  - Agregar `invalidate_tipo_particula_cache()` - Invalidación

**2. Startup (alta prioridad):**
- `backend/src/main.py` - Agregar precarga de cache al startup

**3. Seeds y builders (media prioridad):**
- `backend/src/database/seed_terrain_test_1.py` - Reemplazar consultas directas
- `backend/src/database/seed_terrain_test_2.py` - Reemplazar consultas directas
- `backend/src/database/terrain_builder.py` - Reemplazar consulta directa
- `backend/src/database/creators/entity_creator.py` - Migrar a cache centralizado

**4. Sin cambios (usa funciones existentes):**
- `backend/src/services/temperature_service.py` - Sin cambios (usa función existente)
- `backend/src/api/routes/particles.py` - JOINs no se optimizan con cache simple

**Compatibilidad:**
- ✅ Misma firma de función (no rompe código existente)
- ✅ Mismo comportamiento (solo más rápido)
- ✅ Transparente para código que usa la función
- ✅ Seeds pueden migrarse gradualmente

## Referencias

- `backend/src/services/particula_service.py` (línea 193) - Implementación actual
- `backend/src/services/temperature_service.py` (línea 172) - Uso en cálculos de temperatura
- `instructions/technical debt/01-cache-bloques-redis-vs-memoria.md` - Patrón similar para bloques

## Notas Adicionales

- **Prioridad Alta:** Afecta performance de cálculos de temperatura (JDG-041)
- **Impacto:** Mejora significativa en tiempo de respuesta
- **Riesgo:** Bajo (implementación simple, fácil de revertir)
- **Esfuerzo:** Bajo-Medio (1-2 horas de implementación)

## Ejemplos de Mejora Esperada

### Ejemplo 1: Cálculo de Temperatura (JDG-041)

**Antes (sin cache):**
```
Calcular temperatura de bloque con 50 partículas de agua:
- 50 llamadas a get_tipo_particula_por_nombre('agua')
- 50 consultas a BD × 10ms = 500ms
```

**Después (con cache):**
```
Calcular temperatura de bloque con 50 partículas de agua:
- 1 llamada a get_tipo_particula_por_nombre('agua') → BD (10ms)
- 49 llamadas desde cache × 0.01ms = 0.5ms
- Total: ~10.5ms (50x más rápido)
```

### Ejemplo 2: Seed de Terreno

**Antes (sin cache):**
```
seed_terrain_test_1.py ejecuta:
- 4 consultas directas a BD (hierba, tierra, piedra, agua)
- 4 × 10ms = 40ms solo en consultas de tipos
```

**Después (con cache precargado):**
```
seed_terrain_test_1.py ejecuta:
- 4 llamadas a get_tipo_particula_id_por_nombre()
- 4 × 0.01ms (desde cache) = 0.04ms
- Total: ~0.04ms (1000x más rápido)
```

### Ejemplo 3: Entity Creator

**Antes (cache local solo IDs):**
```
EntityCreator crea 100 entidades con tipo 'madera':
- Primera vez: consulta BD (10ms) + guarda en cache local
- Siguientes 99: desde cache local (0.01ms cada una)
- Total: ~11ms
```

**Después (cache centralizado):**
```
EntityCreator crea 100 entidades con tipo 'madera':
- Primera vez: consulta BD (10ms) + guarda en cache centralizado
- Siguientes 99: desde cache centralizado (0.01ms cada una)
- Total: ~11ms (similar, pero cache compartido con otros servicios)
```

**Ventaja adicional:** Si otro servicio ya consultó 'madera', EntityCreator no necesita consultar BD.

