# Módulo Services

Este módulo contiene servicios para gestionar bloques espaciales, partículas, y operaciones relacionadas con el mundo del juego.

## Estructura

```
services/
├── __init__.py                  # Exportaciones del módulo
├── world_bloque.py              # Clase WorldBloque (bloque espacial en memoria)
├── world_bloque_manager.py      # Gestor de bloques espaciales (cache y lazy loading)
├── particula_service.py         # Funciones auxiliares para consultar partículas
├── celestial_time_service.py    # Servicio de tiempo celestial (sol/luna, fases)
├── temperature_service.py        # Servicio de temperatura ambiental
└── README.md                     # Este archivo
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

# Calcular temperatura (requiere servicio de tiempo celestial)
from src.services.celestial_time_service import CelestialTimeService

celestial_time_service = CelestialTimeService()
await celestial_time_service.update(0.1)  # Actualizar con delta_time

temperatura = await bloque.calcular_temperatura(
    celestial_time_service=celestial_time_service,
    tipo_particula_superficie="tierra"  # Opcional: tipo de partícula dominante
)
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

### CelestialTimeService

**Archivo**: `celestial_time_service.py`

Servicio autoritativo que gestiona el tiempo del juego y cálculos celestiales. El backend controla el tiempo como single source of truth, y el frontend recibe este tiempo para calcular posiciones visuales.

Este servicio está diseñado para ser extensible y soportar:
- Cálculos de temperatura (actual)
- Modificadores de hechizos según fase lunar (futuro)
- Estadísticas de personajes según ciclo solar/lunar (futuro)
- Eventos especiales (eclipses, alineaciones) (futuro)

#### Componentes

- **CelestialTimeService**: Gestiona tiempo del juego y calcula ángulos solares/lunares
- **get_celestial_state()**: Proporciona estado completo para otros sistemas
- **get_sun_intensity_at()**: Intensidad solar en posición (para temperatura y efectos futuros)
- **is_daytime_at()**: Determina si es de día (para efectos futuros)

**Ejemplo de uso**:
```python
from src.services import CelestialTimeService

celestial_service = CelestialTimeService(velocidad_tiempo=60.0)
celestial_service.update(delta_time=1.0)

# Obtener ángulo del sol
angulo_sol = celestial_service.get_sun_angle()

# Obtener fase lunar
fase_lunar = celestial_service.get_luna_phase()

# Obtener estado completo (para otros sistemas)
estado = celestial_service.get_celestial_state()

# Ejemplo futuro: Modificador de hechizos según fase lunar
def calcular_modificador_hechizo_agua(celestial_service):
    fase = celestial_service.get_luna_phase()
    if fase >= 0.45 and fase <= 0.55:  # Luna llena
        return 1.5  # +50% poder
    return 1.0
```

**Notas**:
- El tiempo del juego se actualiza con `update(delta_time)` donde `delta_time` es el tiempo transcurrido en segundos reales
- La velocidad del tiempo se puede configurar en el constructor (`velocidad_tiempo`)
- Los cálculos usan proyección Gleason (mundo plano 2D/3D)
- El sol completa un ciclo cada 24 horas de juego
- La luna completa un ciclo cada 28 días de juego

### TemperatureService

**Archivo**: `temperature_service.py`

Calcula temperatura ambiental según múltiples factores ambientales usando la proyección Gleason.

#### Funciones

- **calculate_solar_temperature()**: Temperatura base según latitud (distancia del centro) y posición del sol
- **get_altitude_modifier()**: Modificador por altitud (gradiente adiabático: -6.5°C/1000m)
- **get_water_modifier()**: Modificador por proximidad al agua/hielo (lee temperatura real de partículas)
- **get_albedo_modifier()**: Modificador por tipo de superficie (albedo desde BD)
- **calculate_cell_temperature()**: Función principal que integra todos los modificadores
- **update_particle_temperature()**: Actualiza temperatura de una partícula según temperatura ambiental e inercia_termica
- **get_particle_temperature_modifier()**: Modificador genérico por partículas de tipos específicos (agua, hielo, lava, etc.)

**Ejemplo de uso**:
```python
from src.services import calculate_cell_temperature, CelestialTimeService

celestial_service = CelestialTimeService()
celestial_service.update(delta_time=1.0)

temperatura = await calculate_cell_temperature(
    celda_x=100.0,
    celda_y=200.0,
    celda_z=50.0,
    bloque_id="bloque-uuid",
    celestial_time_service=celestial_service,
    tipo_particula_superficie="tierra"  # Opcional: para calcular albedo
)
```

**Factores de temperatura**:

1. **Temperatura solar base**:
   - Centro (radio 0) = Polo Norte = -20°C base
   - Ecuador (radio ~50%) = 30°C base (máximo)
   - Borde (radio 100%) = Polo Sur = -40°C base
   - Ajuste día/noche: Día +15°C, Noche -10°C (diferencia de 25°C)

2. **Modificador por altitud**:
   - Gradiente adiabático: -6.5°C por cada 1000 unidades de altura

3. **Modificador por proximidad al agua/hielo**:
   - Lee temperatura real de partículas de agua/hielo
   - Calcula modificador basado en diferencia de temperatura
   - Considera conductividad_termica del tipo de partícula
   - Propagación de calor según distancia (ley del cuadrado inverso)
   - Máximo efecto dentro de 5 celdas

4. **Modificador por albedo**:
   - Albedo alto (superficies claras) = reflejan luz = más frío
   - Albedo bajo (superficies oscuras) = absorben luz = más caliente
   - Valores almacenados en `tipos_particulas.albedo` (0.0-1.0)
   - Escala: -10°C a +10°C según albedo

**Sistema de Conservación de Calor (JDG-041)**:

- **update_particle_temperature()**: Actualiza temperatura de partículas con `inercia_termica > 0`
  - El cambio de temperatura depende de `inercia_termica` (agua: 4.0 cambia lentamente, metal: 0.5 cambia rápido)
  - Se ejecuta periódicamente en background task (cada 5 minutos)
  - Las partículas absorben temperatura del ambiente y la conservan

- **get_particle_temperature_modifier()**: Función genérica para calcular modificador por partículas
  - Funciona para cualquier tipo de partícula (agua, hielo, lava, etc.)
  - Lee temperatura real de partículas y calcula diferencia con temperatura ambiental
  - Considera `conductividad_termica` y distancia para propagación de calor

- **get_particulas_con_inercia()**: Obtiene partículas que necesitan actualización de temperatura
  - Filtra por `inercia_termica > 0`
  - Retorna información necesaria para actualización (temperatura, tipo, propiedades)

**Notas**:
- La temperatura final se limita entre -50°C y 60°C
- El albedo se obtiene desde la base de datos (`tipos_particulas.albedo`)
- La búsqueda de agua usa `get_particulas_vecinas()` con radio configurable (default: 10 celdas)
- Todos los cálculos usan coordenadas en celdas (float)
- El sistema de conservación de calor se ejecuta en background task (ver `celestial.py`)

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

## Endpoints de API

Los servicios de tiempo celestial y temperatura están expuestos a través de endpoints REST:

### Tiempo Celestial

- **`GET /api/v1/celestial/state`**: Obtener estado completo del tiempo celestial
  - Retorna: `CelestialStateResponse` con tiempo, ángulos solares/lunares, fase lunar, hora actual, etc.

### Temperatura

- **`POST /api/v1/celestial/temperature`**: Calcular temperatura en una posición
  - Request: `TemperatureRequest` con coordenadas (x, y, z), bloque_id, y tipo_particula_superficie (opcional)
  - Retorna: `TemperatureResponse` con temperatura calculada

**Ejemplo de uso desde frontend**:
```javascript
// Obtener estado celestial
const response = await fetch('/api/v1/celestial/state');
const state = await response.json();
console.log(`Hora: ${state.current_hour}, Fase lunar: ${state.luna_phase}`);

// Calcular temperatura
const tempResponse = await fetch('/api/v1/celestial/temperature', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    x: 100.0,
    y: 200.0,
    z: 50.0,
    bloque_id: 'bloque-uuid',
    tipo_particula_superficie: 'tierra'
  })
});
const temp = await tempResponse.json();
console.log(`Temperatura: ${temp.temperatura}°C`);
```

## Referencias

- **Diseño del sistema de partículas**: `Juego de Dioses/Ideas/29-Diseno-Final-Particulas.md`
- **Sistema de bloques**: `Juego de Dioses/Ideas/36-Sistema-Bloques-Unificado.md`
- **Funciones auxiliares**: `Juego de Dioses/Ideas/35-Funciones-Auxiliares-Sistema-Particulas.md`
- **Sistema de temperatura y sol/luna (JDG-039)**: `instructions/tickets/JDG-039_work-ticket_*.md`
- **Análisis de arquitectura**: `instructions/analysis/JDG-039-architecture-analysis_*.md`
- **Plan de acción**: `instructions/tasks/JDG-039-action-plan_*.md`
- **Modelos Pydantic**: `backend/src/models/README.md`
- **Schema de base de datos**: `database/init/01-init-schema.sql`
- **Endpoints de API**: `backend/src/api/routes/celestial.py`

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

