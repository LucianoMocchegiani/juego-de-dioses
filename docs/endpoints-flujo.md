# Flujo de endpoints – Juego de Dioses

Documento que describe cada endpoint del backend: qué devuelve, qué tabla(s) usa y cómo se consume en el frontend.

**Base URL API:** `/api/v1`

**Código backend:** Las rutas y DTOs están organizados por dominio en `backend/src/domains/` (bloques, particles, characters, celestial, agrupaciones, shared). La lógica de creación del mundo está en `backend/src/world_creation_engine/`. Ver [domains/README.md](../backend/src/domains/README.md).

---

## 1. Health y API info (sin prefijo `/api/v1`)

### `GET /health`
- **Qué hace:** Health check del servicio y de la base de datos.
- **Respuesta:**
  ```json
  {
    "status": "ok" | "degraded",
    "service": "juego_de_dioses-backend",
    "version": "1.0.0",
    "database": { "status": "ok", "message": "..." }
  }
  ```
- **Uso en frontend:** No se usa directamente en el código actual.

### `GET /api/v1`
- **Qué hace:** Información de la API y lista de endpoints disponibles.
- **Respuesta:** Mensaje, versión, docs y objeto con URLs de ejemplo.
- **Uso en frontend:** No se usa directamente.

---

## 2. Bloques (dimensiones)

Tabla: `juego_dioses.bloques`. Un “bloque” es una dimensión/mundo (ej. terreno demo).

### `GET /api/v1/bloques`
- **Qué hace:** Lista todos los bloques (dimensiones).
- **Respuesta:** Array de `DimensionResponse`:
  - `id`, `nombre`, `ancho_metros`, `alto_metros`, `profundidad_maxima`, `altura_maxima`, `tamano_celda`, `origen_x`, `origen_y`, `origen_z`, `creado_por`, `creado_en`
- **Uso en frontend:**
  - **`app.js` → `loadDemo()`:** `bloquesApi.getDimensions()` para obtener la lista y buscar la dimensión demo por nombre (`DEMO_DIMENSION_NAME`). Con el bloque elegido se llama a `setDimension`, se guarda `currentBloqueId` y se pasa la dimensión a `terrain.loadDimension()`.
  - **`BloquesClient`** (usado por TerrainManager): delega en `BloquesApi.getDimensions()` para `getDimensions()`, `getDimensionByName()` y `getDimensionById()`.

### `GET /api/v1/bloques/{bloque_id}`
- **Qué hace:** Devuelve un bloque por ID.
- **Respuesta:** Un solo `DimensionResponse` (misma estructura que en el listado).
- **Uso en frontend:** `BloquesApi.getDimension(bloqueId)` existe pero no se llama en el flujo principal; sí se usa vía `BloquesClient.getDimensionById(id)` si el terreno lo necesita.

### `GET /api/v1/bloques/world/size`
- **Qué hace:** Calcula el bounding box de **todos** los bloques y devuelve tamaño total del mundo (para que sol/luna orbiten alrededor del mundo completo).
- **Respuesta:** `WorldSizeResponse`:
  - `ancho_total`, `alto_total`, `radio_mundo`, `min_x`, `max_x`, `min_y`, `max_y`, `centro_x`, `centro_y`
- **Uso en frontend:**
  - **`app.js` → `loadDemo()`:** `bloquesApi.getWorldSize()` después de elegir el bloque demo. Con `worldSize` se crea o actualiza `CelestialSystem` y `CelestialRenderer`, y se llama a `celestialSystem.updateWorldCenter(worldSize)` para que las posiciones del sol/luna se ajusten al centro del mundo.

---

## 3. Partículas

Tablas: `juego_dioses.particulas`, `juego_dioses.tipos_particulas`, `juego_dioses.estados_materia`. Las partículas son las celdas del terreno (voxels).

### `GET /api/v1/bloques/{bloque_id}/particles`
- **Query:** `x_min`, `x_max`, `y_min`, `y_max`, `z_min`, `z_max` (viewport en celdas).
- **Qué hace:** Devuelve las partículas **no extraídas** en ese viewport, con tipo y estado de materia (JOIN). No incluye color/geometría (eso va en particle-types).
- **Respuesta:** `ParticlesResponse`:
  - `bloque_id`, `particles` (array de partícula con `id`, `celda_x/y/z`, `tipo_nombre`, `estado_nombre`, `cantidad`, `temperatura`, `agrupacion_id`, etc.), `total`, `viewport`
- **Uso en frontend:**
  - **`TerrainManager`:** En `loadDimension()` y en `loadParticlesAroundPlayer()` usa `ParticlesClient.getParticles(dimension.id, viewport)`, que llama a este endpoint. Las partículas se cachean en `currentParticles`, se combinan con los tipos (colores/geometrías) y se pasan a `ParticleRenderer.renderParticles()` para crear los meshes del terreno (instancing por tipo).

### `GET /api/v1/bloques/{bloque_id}/particle-types`
- **Query:** Mismo viewport que particles: `x_min`, `x_max`, `y_min`, `y_max`, `z_min`, `z_max`.
- **Qué hace:** Devuelve los **tipos de partícula únicos** que aparecen en ese viewport, con `color`, `geometria` (JSONB) y `opacidad` desde `tipos_particulas`. Reduce datos al no repetir estilos por cada partícula.
- **Respuesta:** `ParticleTypesResponse`: `{ "types": [ { "id", "nombre", "color", "geometria", "opacidad" }, ... ] }`
- **Uso en frontend:**
  - **`TerrainManager`:** Se llama en paralelo con particles: `getParticleTypes(dimension.id, viewport)`. Los tipos se cachean en `StyleSystem` y se convierten a un `Map` nombre → estilos (`tiposEstilos`) para que `ParticleRenderer` sepa color y geometría de cada tipo al dibujar.

### `GET /api/v1/bloques/{bloque_id}/particles/{particle_id}`
- **Qué hace:** Una partícula por ID (misma estructura que en el listado por viewport).
- **Uso en frontend:** No se usa en el código actual (el terreno trabaja por viewport y cache).

---

## 4. Personajes (characters)

Tabla: `juego_dioses.agrupaciones` (solo filas con `tipo = 'biped'`). Los personajes son agrupaciones de tipo bípedo; no tienen partículas físicas, usan `posicion_x/y/z` y opcionalmente `modelo_3d` (GLB).

### `GET /api/v1/bloques/{bloque_id}/characters`
- **Qué hace:** Lista todos los personajes del bloque (agrupaciones tipo `biped`), con posición y `modelo_3d`/`geometria_agrupacion`.
- **Respuesta:** Array de `CharacterResponse`:
  - `id`, `bloque_id`, `nombre`, `tipo`, `especie`, `posicion` (x,y,z), `geometria_agrupacion`, `modelo_3d`, `particulas_count` (0 para bípedos)
- **Uso en frontend:** `CharactersApi.listCharacters(bloqueId)` está disponible; no se usa en el flujo principal (el jugador se crea o se carga por ID/template).

### `GET /api/v1/bloques/{bloque_id}/characters/{character_id}`
- **Qué hace:** Un personaje por ID (misma fuente: agrupación biped).
- **Respuesta:** Un `CharacterResponse` (igual estructura que en el listado).
- **Uso en frontend:**
  - **`PlayerFactory.createPlayer()`:** Si se pasa `characterId` y `bloqueId`, se llama `getCharacter(bloqueId, characterId)`. Con la respuesta se usa `modelo_3d` (cargar GLB con `loadModel3D`) o, si falla o no hay modelo, `geometria_agrupacion` (mesh desde `buildMeshFromGeometry`) o mesh por defecto. La posición del personaje viene de `character.posicion`.

### `POST /api/v1/bloques/{bloque_id}/characters`
- **Body:** `CharacterCreate`: `template_id`, `x`, `y`, `z`.
- **Qué hace:** Crea un personaje desde un template (p. ej. `"humano"`) usando `EntityCreator`; inserta una fila en `agrupaciones` (tipo biped, con posición y modelo según template). No crea partículas.
- **Respuesta:** El `CharacterResponse` del personaje recién creado.
- **Uso en frontend:**
  - **`PlayerFactory.createPlayer()`:** Si se pasa `templateId` y `bloqueId`, se llama `createCharacter(bloqueId, templateId, x, y, z)`. La respuesta se usa igual que en get: modelo 3D o geometría y posición para crear la entidad y el mesh del jugador.

### `GET /api/v1/bloques/{bloque_id}/characters/{character_id}/model`
- **Qué hace:** Devuelve solo la URL del modelo 3D y metadatos del personaje (ruta, escala, offset, rotación). Lee `modelo_3d` (JSONB) de la agrupación.
- **Respuesta:** `{ "model_url": "/static/models/...", "metadata": { ... } }`
- **Uso en frontend:** `CharactersApi.getCharacterModel(bloqueId, characterId)` existe; la carga de modelo en `PlayerFactory` se hace con los datos de `getCharacter` (que ya incluye `modelo_3d`), no con este endpoint. Este endpoint sirve para obtener solo el modelo si en el futuro se quiere evitar traer el personaje completo.

---

## 5. Celestial (tiempo y temperatura)

Sin tabla directa; usa `CelestialTimeService` en memoria (actualizado en background) y, para temperatura, posición en el mundo y opcionalmente tipo de partícula en superficie.

### `GET /api/v1/celestial/state`
- **Qué hace:** Devuelve el estado actual del ciclo día/noche (ángulos sol/luna, fase lunar, hora, posiciones 3D del sol y la luna).
- **Respuesta:** `CelestialStateResponse`:
  - `time`, `sun_angle`, `luna_angle`, `luna_phase`, `current_hour`, `is_daytime`, `sun_position`, `luna_position`
- **Uso en frontend:**
  - **`app.js`:** En `syncCelestialState()` se llama `celestialApi.getState()` y se pasa el resultado a `celestialSystem.update(state)`. Eso se hace al cargar el demo y cada N segundos en el loop (`celestialSyncInterval`). `CelestialSystem` usa el estado para interpolación y para que `CelestialRenderer` y el sistema de luces dibujen sol/luna y ajusten iluminación y color del cielo.

### `POST /api/v1/celestial/temperature`
- **Body:** `TemperatureRequest`: `x`, `y`, `z` (celdas), `bloque_id`, opcional `tipo_particula_superficie`.
- **Qué hace:** Calcula la temperatura ambiental en esa posición según el tiempo celestial y la altura.
- **Respuesta:** `TemperatureResponse`: `temperatura`, `x`, `y`, `z`.
- **Uso en frontend:**
  - **`debug-panel.js`:** En la sección de temperatura del panel de debug se usa `celestialApi.calculateTemperature(x, y, z, bloqueId, ...)` para mostrar la temperatura en la posición actual del jugador.

---

## 6. Agrupaciones

Tabla: `juego_dioses.agrupaciones` (todas las agrupaciones, no solo bípedos). Incluye árboles, estructuras, etc., con o sin partículas asociadas.

### `GET /api/v1/bloques/{bloque_id}/agrupaciones`
- **Qué hace:** Lista todas las agrupaciones del bloque con conteo de partículas (LEFT JOIN partículas no extraídas). No devuelve geometría ni modelo 3D.
- **Respuesta:** Array de `AgrupacionResponse`: `id`, `bloque_id`, `nombre`, `tipo`, `descripcion`, `especie`, `posicion_x/y/z`, `activa`, `salud`, `tiene_nucleo`, `nucleo_conectado`, `particulas_count`, fechas, etc.
- **Uso en frontend:** `AgrupacionesApi.getAgrupaciones(bloqueId)` está definido y exportado, pero **no se usa** en ningún componente actual. Los personajes se obtienen vía `/characters`, no vía `/agrupaciones`.

### `GET /api/v1/bloques/{bloque_id}/agrupaciones/{agrupacion_id}`
- **Qué hace:** Una agrupación por ID más todas sus partículas (no extraídas).
- **Respuesta:** `AgrupacionWithParticles` (agrupación + array `particulas`).
- **Uso en frontend:** `AgrupacionesApi.getAgrupacion(bloqueId, agrupacionId)` está definido pero **no se usa** en el frontend actual. El terreno no pide geometría de agrupaciones para renderizar (TerrainManager pasa `agrupacionesGeometria: null` al renderer).

---

## Resumen de flujo por pantalla

| Acción | Endpoints usados |
|--------|-------------------|
| Cargar demo | `GET /bloques` → elegir dimensión; `GET /bloques/world/size` → celestial; `GET /bloques/{id}/particles` + `GET /bloques/{id}/particle-types` → terreno |
| Ciclo día/noche | `GET /celestial/state` (inicial y periódico) |
| Crear jugador | `POST /bloques/{id}/characters` (template) o `GET /bloques/{id}/characters/{id}` (existente) |
| Temperatura en debug | `POST /celestial/temperature` |
| Carga dinámica de terreno | Mismo `particles` + `particle-types` con viewport centrado en el jugador |

---

## Notas para futuras fases (recetas / mesh-builder)

- **Personajes** son la única parte del frontend que lee de la tabla `agrupaciones` (vía `/characters`).
- **Partículas** tienen `agrupacion_id` pero el listado de partículas no expande agrupaciones; el terreno no usa `geometria_agrupacion`.
- Los endpoints de **agrupaciones** están listos para uso (p. ej. listar árboles u otras entidades) pero hoy no se usan en la UI.
- Para recetas y piezas mesh (JDG-064), se espera añadir `recetas` y `receta_id` en agrupaciones y nuevos endpoints (GET/POST recetas, POST agrupaciones para piezas colocadas); el frontend obtendría la forma de las piezas desde recetas, no desde `geometria_agrupacion`.
