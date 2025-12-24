# Módulo Services

Este módulo contiene servicios para gestionar bloques espaciales, partículas, y operaciones relacionadas con el mundo del juego.

## Estructura

```
services/
├── __init__.py              # Exportaciones del módulo
├── world_bloque.py          # Clase WorldBloque (bloque espacial en memoria)
├── world_bloque_manager.py  # Gestor de bloques espaciales (cache y lazy loading)
├── particula_service.py     # Funciones auxiliares para consultar partículas
└── README.md               # Este archivo
```

## Componentes Principales

### WorldBloque

**Archivo**: `world_bloque.py`

Representa un bloque espacial del mundo en memoria. Un bloque espacial es una zona del mundo (40x40x40 celdas por defecto) que se usa para:
- Organizar partículas espacialmente
- Calcular temperatura ambiental
- Optimizar renderizado
- Gestionar comunicación entre jugadores

**Características**:
- Almacena IDs de partículas en el bloque
- Calcula temperatura base con modificadores (altitud, agua, albedo)
- Gestiona eventos activos y jugadores presentes
- Flag para indicar si necesita re-renderizado

**Ejemplo de uso**:
```python
from src.services import WorldBloque

bloque = WorldBloque(
    bloque_id="bloque-config-uuid",
    bloque_x=0,
    bloque_y=0,
    bloque_z=0,
    tamano_bloque=40
)

# Calcular temperatura (requiere sistema celestial)
await bloque.calcular_temperatura(celestial_system)
temperatura = bloque.get_temperatura()
```

### WorldBloqueManager

**Archivo**: `world_bloque_manager.py`

Gestiona bloques espaciales del mundo en memoria con cache y lazy loading.

**Características**:
- Cache en memoria de bloques espaciales
- Cache de configuraciones de bloques desde BD
- Lazy loading: los bloques se crean bajo demanda
- Métodos para obtener bloques por posición o partícula
- Métodos para obtener bloques en un radio

**Ejemplo de uso**:
```python
from src.services import WorldBloqueManager

manager = WorldBloqueManager()

# Obtener bloque para una posición (se crea si no existe)
bloque = await manager.get_bloque_for_position(
    bloque_id="bloque-config-uuid",
    celda_x=100,
    celda_y=200,
    celda_z=50
)

# Obtener bloque para una partícula
bloque = await manager.get_bloque_for_particle(particula_dict)

# Obtener todos los bloques en un radio
bloques = await manager.get_bloques_in_radius(
    bloque_config_id="bloque-config-uuid",
    center_x=100,
    center_y=200,
    center_z=50,
    radius_cells=10
)
```

**Nota sobre cache**: Actualmente usa cache en memoria (dicts). Ver `instructions/technical debt/01-cache-bloques-redis-vs-memoria.md` para consideraciones sobre migración a Redis.

### ParticulaService

**Archivo**: `particula_service.py`

Funciones auxiliares para consultar y manipular partículas desde la base de datos.

#### Funciones de Consulta de Partículas

- **`get_particula(particula_id)`**: Obtiene una partícula por ID (incluye datos del tipo)
- **`get_particula_en_posicion(bloque_id, x, y, z)`**: Obtiene partícula en posición exacta
- **`get_particulas_vecinas(bloque_id, x, y, z, radio)`**: Obtiene partículas en radio esférico
- **`get_particulas_cercanas(...)`**: Alias de `get_particulas_vecinas`

#### Funciones de Consulta de Tipos

- **`get_tipo_particula(tipo_id)`**: Obtiene tipo de partícula por ID
- **`get_tipo_particula_por_nombre(nombre)`**: Obtiene tipo de partícula por nombre

#### Funciones de Cálculo

- **`calcular_distancia(x1, y1, z1, x2, y2, z2)`**: Distancia euclidiana entre dos puntos
- **`calcular_distancia_particulas(p1, p2)`**: Distancia entre dos partículas
- **`evaluar_temperatura(temp, operador, valor, histeresis)`**: Evalúa condiciones de temperatura con histeresis

#### Funciones de Transiciones

- **`get_transiciones(tipo_particula_id)`**: Obtiene transiciones posibles (ordenadas por prioridad)

**Ejemplo de uso**:
```python
from src.services import (
    get_particula,
    get_particulas_vecinas,
    get_tipo_particula_por_nombre,
    calcular_distancia,
    evaluar_temperatura,
    get_transiciones
)

# Obtener partícula por ID
particula = await get_particula("particula-uuid")

# Obtener partículas vecinas en radio de 5 celdas
vecinas = await get_particulas_vecinas(
    bloque_id="bloque-uuid",
    celda_x=100,
    celda_y=200,
    celda_z=50,
    radio=5
)

# Obtener tipo de partícula por nombre
tipo_fuego = await get_tipo_particula_por_nombre("fuego")

# Calcular distancia entre dos puntos
distancia = calcular_distancia(100, 200, 50, 105, 205, 52)

# Evaluar condición de temperatura con histeresis
debe_congelar = evaluar_temperatura(-3.0, '<', 0.0, 2.0)  # True

# Obtener transiciones posibles para un tipo
transiciones = await get_transiciones("tipo-agua-uuid")
```

## Conceptos Importantes

### Bloques Espaciales

Los bloques espaciales dividen el mundo en zonas de 40x40x40 celdas (por defecto) para:
- **Temperatura**: Cada bloque tiene una temperatura base calculada según factores ambientales
- **Renderizado**: Solo se renderizan bloques visibles (culling)
- **Comunicación**: Jugadores en el mismo bloque pueden comunicarse
- **Optimización**: Reduce la complejidad de búsquedas espaciales

### Cache y Lazy Loading

El `WorldBloqueManager` usa:
- **Cache L1 (memoria)**: Diccionarios de Python para acceso rápido
- **Lazy loading**: Los bloques se crean solo cuando se necesitan
- **Cache de configuraciones**: Las configuraciones de bloques se cachean desde BD

**Consideración futura**: Ver `instructions/technical debt/01-cache-bloques-redis-vs-memoria.md` para migración a Redis si se requiere escalabilidad horizontal.

### Consultas Parametrizadas

Todas las funciones de `particula_service.py` usan consultas parametrizadas para seguridad SQL:
```python
# ✅ Correcto (parametrizado)
await conn.fetchrow("SELECT * FROM particulas WHERE id = $1", particula_id)

# ❌ Incorrecto (vulnerable a SQL injection)
await conn.fetchrow(f"SELECT * FROM particulas WHERE id = '{particula_id}'")
```

## Referencias

- **Diseño del sistema de partículas**: `Juego de Dioses/Ideas/29-Diseno-Final-Particulas.md`
- **Sistema de bloques**: `Juego de Dioses/Ideas/36-Sistema-Bloques-Unificado.md`
- **Funciones auxiliares**: `Juego de Dioses/Ideas/35-Funciones-Auxiliares-Sistema-Particulas.md`
- **Modelos Pydantic**: `backend/src/models/README.md`
- **Schema de base de datos**: `database/init/01-init-schema.sql`

## Testing

Para probar los servicios:

```python
# Ejemplo de test para WorldBloqueManager
import pytest
from src.services import WorldBloqueManager

@pytest.mark.asyncio
async def test_get_bloque_for_position():
    manager = WorldBloqueManager()
    bloque = await manager.get_bloque_for_position(
        bloque_id="test-uuid",
        celda_x=0,
        celda_y=0,
        celda_z=0
    )
    assert bloque.bloque_x == 0
    assert bloque.bloque_y == 0
    assert bloque.bloque_z == 0
```

## Notas de Implementación

- Todos los servicios son asíncronos (async/await)
- Las funciones retornan diccionarios o instancias de clases
- Los errores de BD se propagan sin capturar (dejar que FastAPI los maneje)
- Las consultas usan el esquema `juego_dioses` explícitamente

