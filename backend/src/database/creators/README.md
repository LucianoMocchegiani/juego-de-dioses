# Sistema de Creators

Este documento explica cómo funcionan los creators y el flujo completo de creación de entidades.

## Parte Técnica

### ¿Qué es un Creator?

Un **Creator** es una capa de alto nivel que simplifica la creación de entidades. Actúa como un **Factory** y **Facade**, ocultando la complejidad de:
- Obtener IDs de tipos de partículas y estados de materia
- Seleccionar el builder apropiado
- Insertar partículas en la base de datos

### Arquitectura

```
Template → Creator → Builder → Partículas → Base de Datos
```

### Responsabilidades

1. **Cache de IDs**: Evitar consultas repetidas a la BD
2. **Selección de Builder**: Elegir el builder correcto según la categoría del template
3. **Obtención de IDs**: Buscar IDs de tipos de partículas y estados de materia
4. **Orquestación**: Coordinar todo el proceso de creación
5. **Inserción en BD**: Insertar partículas en batch

## Flujo de Ejecución

### Flujo General: Crear una Entidad

```
1. Usuario llama: creator.create_entity(template, x, y, z, create_agrupacion=True)
   ↓
2. Creator llama a _get_builder(template)
   │   └─ Retorna TreeBuilder(template) si categoria == 'tree'
   ↓
3. Creator crea agrupación (si create_agrupacion=True):
   │   ├─ 3.1. Llama a builder.create_agrupacion(conn, dimension_id, x, y, z)
   │   ├─ 3.2. Builder obtiene metadata: builder.get_agrupacion_metadata()
   │   │   └─ Retorna: {'nombre': 'Roble #1234', 'tipo': 'arbol', 'especie': 'roble'}
   │   ├─ 3.3. Builder inserta en BD: INSERT INTO agrupaciones (...)
   │   └─ 3.4. Builder retorna: agrupacion_id (UUID o None)
   ↓
4. Creator llama a builder.get_particle_type_ids()
   │   └─ Retorna: {'madera_id': 'madera', 'hojas_id': 'hojas'}
   ↓
5. Creator obtiene IDs de tipos de partículas:
   │   Para cada nombre en get_particle_type_ids():
   │   ├─ 5.1. Verifica cache: ¿existe en _particle_type_cache?
   │   ├─ 5.2. Si NO existe:
   │   │   └─ Consulta BD: SELECT id FROM tipos_particulas WHERE nombre = 'madera'
   │   │   └─ Guarda en cache: _particle_type_cache['madera'] = uuid
   │   └─ 5.3. Retorna ID del cache
   ↓
6. Creator llama a builder.get_matter_state_name()
   │   └─ Retorna: 'solido'
   ↓
7. Creator obtiene ID del estado de materia:
   │   ├─ 7.1. Verifica cache: ¿existe en _state_cache?
   │   ├─ 7.2. Si NO existe:
   │   │   └─ Consulta BD: SELECT id FROM estados_materia WHERE nombre = 'solido'
   │   │   └─ Guarda en cache: _state_cache['solido'] = uuid
   │   └─ 7.3. Retorna ID del cache
   ↓
8. Creator llama a builder.create_at_position(..., agrupacion_id, madera_id, hojas_id, solido_id)
   │   └─ Builder retorna lista de tuplas (todas con agrupacion_id asignado)
   ↓
9. Creator inserta partículas en batch:
   │   └─ conn.executemany("INSERT INTO particulas ...", particles)
   │   └─ Todas las partículas tienen agrupacion_id asignado
   ↓
10. Creator retorna número de partículas creadas
```

### Flujo Detallado: create_entity()

#### Paso 1: Obtener Builder

```python
builder = self._get_builder(template)
```

**¿Qué hace?** Selecciona el builder apropiado según la categoría del template.

**Flujo interno:**
```python
def _get_builder(self, template: BaseTemplate) -> BaseBuilder:
    if template.categoria == 'tree':
        return TreeBuilder(template)  # ← Crea TreeBuilder
    elif template.categoria == 'plant':
        return PlantBuilder(template)  # ← Futuro
    else:
        raise ValueError(f"No hay builder para categoría '{template.categoria}'")
```

**Ejemplo:** Si `template.categoria == 'tree'`, retorna un `TreeBuilder` con ese template.

#### Paso 2: Obtener Nombres de Tipos de Partículas

```python
particle_types = builder.get_particle_type_ids()
# Retorna: {'madera': 'madera', 'hojas': 'hojas'}
```

**¿Qué hace?** Pide al builder los nombres de tipos de partículas que necesita.

**Nota:** El builder retorna **nombres**, no IDs. El creator se encarga de buscar los IDs.

#### Paso 3: Obtener IDs de Tipos de Partículas (con Cache)

```python
particle_type_ids = {}
for key, nombre in particle_types.items():
    particle_type_ids[key] = await self._get_particle_type_id(nombre)
```

**¿Qué hace?** Para cada nombre, busca el ID en la BD (usando cache si está disponible).

**Flujo de `_get_particle_type_id()`:**

```python
async def _get_particle_type_id(self, nombre: str) -> str:
    # 1. Verificar cache
    if nombre not in self._particle_type_cache:
        # 2. Si NO está en cache, consultar BD
        tipo_id = await self.conn.fetchval(
            "SELECT id FROM juego_dioses.tipos_particulas WHERE nombre = $1",
            nombre
        )
        if not tipo_id:
            raise ValueError(f"Tipo de partícula '{nombre}' no encontrado")
        # 3. Guardar en cache
        self._particle_type_cache[nombre] = tipo_id
    # 4. Retornar del cache
    return self._particle_type_cache[nombre]
```

**Ejemplo:**
- Primera llamada con `'madera'`: Consulta BD → Guarda en cache → Retorna UUID
- Segunda llamada con `'madera'`: Retorna directamente del cache (más rápido)

**Resultado:**
```python
particle_type_ids = {
    'madera': UUID("abc-123..."),
    'hojas': UUID("def-456...")
}
```

#### Paso 4: Obtener ID del Estado de Materia (con Cache)

```python
matter_state_name = builder.get_matter_state_name()
# Retorna: 'solido'

estado_materia_id = await self._get_state_id(matter_state_name)
```

**¿Qué hace?** Obtiene el ID del estado de materia necesario (usando cache).

**Flujo de `_get_state_id()`:**

```python
async def _get_state_id(self, nombre: str) -> str:
    # 1. Verificar cache
    if nombre not in self._state_cache:
        # 2. Si NO está en cache, consultar BD
        state_id = await self.conn.fetchval(
            "SELECT id FROM juego_dioses.estados_materia WHERE nombre = $1",
            nombre
        )
        if not state_id:
            raise ValueError(f"Estado de materia '{nombre}' no encontrado")
        # 3. Guardar en cache
        self._state_cache[nombre] = state_id
    # 4. Retornar del cache
    return self._state_cache[nombre]
```

**Resultado:**
```python
estado_materia_id = UUID("ghi-789...")
```

#### Paso 5: Crear Partículas usando Builder

```python
particles = await builder.create_at_position(
    self.conn,
    self.dimension_id,
    x, y, z,
    solido_id=estado_materia_id,
    **particle_type_ids  # madera_id=..., hojas_id=...
)
```

**¿Qué hace?** Delega al builder la creación de partículas, pasándole todos los IDs necesarios.

**El builder retorna:**
```python
[
    (dim_id, 10, 20, -1, madera_id, solido_id, ...),
    (dim_id, 10, 20, 0, madera_id, solido_id, ...),
    (dim_id, 9, 19, 25, hojas_id, solido_id, ...),
    ...
]
```

#### Paso 6: Insertar Partículas en Batch

```python
if particles:
    await self.conn.executemany("""
        INSERT INTO juego_dioses.particulas
        (dimension_id, celda_x, celda_y, celda_z, tipo_particula_id, estado_materia_id,
         cantidad, temperatura, energia, extraida, agrupacion_id, es_nucleo, propiedades)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
        ON CONFLICT (dimension_id, celda_x, celda_y, celda_z) DO UPDATE
        SET tipo_particula_id = EXCLUDED.tipo_particula_id,
            temperatura = EXCLUDED.temperatura,
            propiedades = EXCLUDED.propiedades
    """, particles)
```

**¿Qué hace?** Inserta todas las partículas en una sola operación batch (muy eficiente).

**Ventajas del batch insert:**
- Una sola consulta SQL en lugar de cientos
- Mucho más rápido que insertar una por una
- Transaccional: si falla una, fallan todas

#### Paso 7: Retornar Resultado

```python
return len(particles)
```

**¿Qué hace?** Retorna el número de partículas creadas.

## Ejemplo Completo: Crear un Roble

### Input

```python
template = RobleTemplate()
x, y, z = 10, 20, 0
creator = EntityCreator(conn, dimension_id)
```

### Proceso Paso a Paso

#### 1. Llamada Inicial

```python
particulas_creadas = await creator.create_entity(template, 10, 20, 0)
```

#### 2. Obtener Builder

```python
# Internamente:
builder = TreeBuilder(template)  # template.categoria == 'tree'
```

#### 3. Obtener Nombres de Tipos

```python
# Internamente:
particle_types = {'madera': 'madera', 'hojas': 'hojas'}
```

#### 4. Obtener ID de 'madera' (Primera Vez)

```python
# Internamente:
# Cache vacío → Consulta BD
tipo_id = await conn.fetchval("SELECT id FROM tipos_particulas WHERE nombre = 'madera'")
# tipo_id = UUID("abc-123-def-456...")
# Guarda en cache: _particle_type_cache['madera'] = tipo_id
```

#### 5. Obtener ID de 'hojas' (Primera Vez)

```python
# Internamente:
# Cache vacío → Consulta BD
tipo_id = await conn.fetchval("SELECT id FROM tipos_particulas WHERE nombre = 'hojas'")
# tipo_id = UUID("def-456-ghi-789...")
# Guarda en cache: _particle_type_cache['hojas'] = tipo_id
```

#### 6. Obtener ID de 'solido' (Primera Vez)

```python
# Internamente:
# Cache vacío → Consulta BD
state_id = await conn.fetchval("SELECT id FROM estados_materia WHERE nombre = 'solido'")
# state_id = UUID("ghi-789-jkl-012...")
# Guarda en cache: _state_cache['solido'] = state_id
```

#### 7. Crear Partículas

```python
# Internamente:
particles = await builder.create_at_position(
    conn, dimension_id, 10, 20, 0,
    madera_id=UUID("abc-123..."),
    hojas_id=UUID("def-456..."),
    solido_id=UUID("ghi-789...")
)
# Retorna: [tupla1, tupla2, ..., tupla387]
```

#### 8. Insertar en BD

```python
# Internamente:
await conn.executemany("INSERT INTO particulas ...", particles)
# Inserta 387 partículas en una sola operación
```

#### 9. Retornar Resultado

```python
# Retorna:
387  # Número de partículas creadas
```

### Segunda Llamada (Cache en Acción)

Si creamos otro árbol inmediatamente después:

```python
particulas_creadas = await creator.create_entity(template2, 15, 25, 0)
```

**Diferencia:** Los IDs ya están en cache, no se consulta la BD:
- `_get_particle_type_id('madera')` → Retorna del cache (instantáneo)
- `_get_particle_type_id('hojas')` → Retorna del cache (instantáneo)
- `_get_state_id('solido')` → Retorna del cache (instantáneo)

**Resultado:** Mucho más rápido que la primera llamada.

## Ventajas del Sistema

### 1. Simplificación

**Sin Creator:**
```python
# Tienes que hacer todo manualmente:
madera_id = await conn.fetchval("SELECT id FROM tipos_particulas WHERE nombre = 'madera'")
hojas_id = await conn.fetchval("SELECT id FROM tipos_particulas WHERE nombre = 'hojas'")
solido_id = await conn.fetchval("SELECT id FROM estados_materia WHERE nombre = 'solido'")
builder = TreeBuilder(template)
particles = await builder.create_at_position(..., madera_id, hojas_id, solido_id)
await conn.executemany("INSERT ...", particles)
```

**Con Creator:**
```python
# Una sola línea:
particulas_creadas = await creator.create_entity(template, x, y, z)
```

### 2. Cache Automático

- Primera creación: 3 consultas a BD (madera, hojas, solido)
- Siguientes creaciones: 0 consultas (usa cache)
- **Ahorro:** 100 árboles = 3 consultas en lugar de 300

### 3. Extensibilidad

Agregar una nueva categoría solo requiere:
1. Crear el builder (ej: `PlantBuilder`)
2. Agregar una línea en `_get_builder()`

No necesitas modificar código existente.

## Métodos Clave

### `_get_particle_type_id(nombre)`

**Responsabilidad:** Obtener ID de tipo de partícula con cache.

**Flujo:**
1. Verificar cache
2. Si no existe, consultar BD
3. Guardar en cache
4. Retornar ID

### `_get_state_id(nombre)`

**Responsabilidad:** Obtener ID de estado de materia con cache.

**Flujo:**
1. Verificar cache
2. Si no existe, consultar BD
3. Guardar en cache
4. Retornar ID

### `_get_builder(template)`

**Responsabilidad:** Seleccionar builder apropiado según categoría.

**Flujo:**
1. Verificar `template.categoria`
2. Retornar builder correspondiente
3. Lanzar error si no hay builder para esa categoría

### `create_entity(template, x, y, z, create_agrupacion=True)`

**Responsabilidad:** Orquestar todo el proceso de creación.

**Parámetros:**
- `template`: Template de la entidad a crear
- `x, y, z`: Posición donde crear la entidad
- `create_agrupacion`: Si True, crear agrupación antes de crear partículas (default: True)

**Flujo:**
1. Obtener builder
2. Crear agrupación (si `create_agrupacion=True` y el builder lo soporta)
3. Obtener IDs necesarios (con cache)
4. Crear partículas (usando builder, pasando `agrupacion_id`)
5. Insertar en BD (batch)
6. Retornar número de partículas

## Extender el Sistema

### Agregar Soporte para Plantas

```python
# En _get_builder():
elif template.categoria == 'plant':
    return PlantBuilder(template)
```

**¡Eso es todo!** El resto del sistema funciona automáticamente.

## Notas Importantes

1. **Cache por instancia**: Cada `EntityCreator` tiene su propio cache
2. **Cache persiste**: El cache se mantiene durante toda la vida del creator
3. **Batch insert**: Todas las partículas se insertan en una sola operación
4. **Separación de responsabilidades**: Creator orquesta, Builder crea, Template define

