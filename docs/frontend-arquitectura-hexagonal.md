# Arquitectura Frontend: Hexagonal + DDD (propuesta)

Documento de referencia para estructurar el frontend alineado con el backend (Hexagonal + DDD). Incluye dos opciones (JavaScript y TypeScript) y el detalle carpeta por carpeta con **qué va en cada archivo** y **cómo fluye el código**.

**Resumen ejecutivo:** [frontend-estructura-elegida.md](./frontend-estructura-elegida.md) — Estructura elegida del frontend y del ECS, con árboles y **por qué** se tomó cada decisión (un solo documento explicado).

---

## Índice

1. [Criterios de diseño](#1-criterios-de-diseño)
2. [Árbol JS](#2-árbol-de-carpetas-opción-1--javascript)
3. [Árbol TS](#3-árbol-de-carpetas-opción-2--typescript)
4. [Detalle por carpeta](#4-detalle-por-carpeta-qué-va-dónde-y-cómo-funciona)
   - [main.js, app.js](#41-mainjs-y-appjs)
   - [domain/](#43-domain--lógica-de-negocio-pura)
   - [application/](#44-application--casos-de-uso)
   - [ports/](#45-ports--contratos-interfaces)
   - [adapters/](#46-adapters--implementaciones-de-los-ports)
   - [driving/](#47-driving--quién-dispara-los-flujos-entrada) (incluye [Interfaces y paneles](#477-interfaces-y-paneles-reutilización-y-parametrización))
   - [rendering/](#48-rendering--threejs-ecs-terrain-world)
   - [state/, config/, shared/](#49-state--410-config--411-shared)
5. [Flujo resumido](#5-flujo-resumido-quién-llama-a-quién)
6. [Lista de todo lo contemplado](#6-lista-de-todo-lo-contemplado)
7. [Por qué esta estructura es adecuada](#7-por-qué-esta-estructura-es-adecuada)

---

## Mapeo rápido: archivo actual → ubicación nueva

| Ubicación actual | Ubicación nueva |
|------------------|-----------------|
| `main.js` | `main.js` (solo arranca bootstrap + app.start()) |
| `app.js` | `app.js` (recibe ports inyectados; delega en application y rendering) |
| `api/client.js` | `adapters/http/api-client.js` |
| `api/endpoints/bloques.js` | `adapters/http/http-bloques.js` |
| `api/endpoints/particles.js` | `adapters/http/http-particles.js` |
| `api/endpoints/characters.js` | `adapters/http/http-characters.js` |
| `api/endpoints/celestial.js` | `adapters/http/http-celestial.js` |
| `api/endpoints/agrupaciones.js` | `adapters/http/http-agrupaciones.js` |
| *(nuevo)* | `ports/world-api.js`, `ports/particles-api.js`, etc. |
| *(nuevo)* | `application/load-world.js`, `spawn-player.js`, `sync-celestial.js` |
| *(nuevo)* | `domain/world/`, `domain/particles/`, `domain/character/` |
| `core/scene.js`, camera, controls, lights, renderer, helpers | `rendering/scene/` |
| `core/geometries/registry.js` | `rendering/geometries/registry.js` |
| `core/renderers/base-renderer.js` | `rendering/renderers/base-renderer.js` |
| `core/optimizations/*` | `rendering/optimizations/` |
| `core/input/input-manager.js` | `driving/input/input-manager.js` |
| `core/performance/performance-manager.js` | `rendering/performance/performance-manager.js` |
| `terrain/*` (menos api/) | `rendering/terrain/`; TerrainManager recibe port inyectado |
| `terrain/api/*` | Eliminado; datos vía ports inyectados desde App |
| `ecs/*` | `rendering/ecs/` (igual estructura interna) |
| `world/*` | `rendering/world/` |
| `state/*` | `state/` (igual) |
| `config/*` | `config/` (igual) |
| `utils/math.js`, colors, geometry, helpers | `shared/` |
| `utils/config.js` | `config/` o `shared/` |
| `utils/cursor-manager.js` | `shared/` o `driving/input/` |
| `interfaces/base-interface.js` | `driving/ui/base-interface.js` |
| `interfaces/debug-panel.js` (F3) | `driving/ui/panels/debug-panel.js` |
| `interfaces/test-interface.js` (F6) | `driving/ui/panels/test-interface.js` |
| *(nuevo)* config, personaje, inventario, constructor | `driving/ui/panels/` (todos reutilizan BaseInterface) |
| `debug/*` | `debug/` (raíz) o `driving/debug/` |
| *(nuevo)* | `driving/game/game-bootstrap.js`, `game-loop.js` |

---

## 1. Criterios de diseño

- **Puertos (interfaces)**: todo lo que sea "fuera" (API, WebSockets, storage) se define como contrato; el resto del código depende del contrato, no de la implementación.
- **Dominio**: lógica de negocio pura, sin Three.js, sin fetch, sin DOM.
- **Application (casos de uso)**: orquestan dominio + puertos; no conocen URLs ni implementaciones concretas.
- **Adaptadores**: implementan los puertos (HTTP, futuro WebSocket, storage).
- **Driving (entrada)**: quien dispara los flujos (game loop, UI, input).
- **Rendering**: Three.js, ECS, terrain, world; reciben datos ya preparados y no llaman al API directamente.

---

## 2. Árbol de carpetas (Opción 1 – JavaScript)

```
frontend/src/
├── main.js
├── app.js
├── domain/
│   ├── world/
│   ├── particles/
│   ├── character/
│   └── recipe/
├── application/
│   ├── load-world.js
│   ├── spawn-player.js
│   └── sync-celestial.js
├── ports/
│   ├── world-api.js
│   ├── particles-api.js
│   ├── characters-api.js
│   ├── celestial-api.js
│   ├── agrupaciones-api.js
│   ├── realtime.js
│   ├── auth.js
│   └── recipes-api.js      # Futuro: Ideas 53
├── adapters/
│   ├── http/
│   ├── ws/
│   └── storage/
├── driving/
│   ├── game/
│   ├── ui/
│   │   ├── base-interface.js
│   │   ├── panels/          # F3 debug, F6 dev, config, personaje, inventario, constructor
│   │   ├── screens/
│   │   └── hud/
│   └── input/
├── rendering/
│   ├── scene/
│   ├── ecs/
│   ├── terrain/
│   ├── world/
│   └── optimizations/
├── state/
├── config/
└── shared/
```

---

## 3. Árbol de carpetas (Opción 2 – TypeScript)

Misma estructura; archivos con extensión `.ts`. Los **ports** son `interface` en archivos `.port.ts` (ej. `world-api.port.ts`, `particles-api.port.ts`). El resto igual en nombres y responsabilidades.

---

## 4. Detalle por carpeta: qué va dónde y cómo funciona

### 4.1. `main.js` (raíz de `src/`)

**Qué va aquí**

- Punto de entrada del frontend.
- Crea el contenedor DOM (ej. `#canvas-container`).
- Instancia **solo** el bootstrap (o directamente `App` si el bootstrap vive dentro de `App`).
- Opcional: inicializa cursor manager, focus del contenedor, listeners mínimos (click para focus).

**Quién usa qué**

- Importa: `App` desde `app.js`, y si existe `bootstrap` desde `driving/game/game-bootstrap.js`.
- No importa: API, adapters, domain, rendering (eso lo hace `App` o el bootstrap).

**Flujo**

1. `main.js` lee el DOM.
2. Crea `App(container)` (o llama a `createApp(container)` que devuelve la app ya montada).
3. Llama a `app.start()` o `app.loadDemo()` (según cómo quieras nombrar el flujo inicial).
4. La carga inicial (loading, status, dimension info) puede ser parte de `App` o de un caso de uso llamado desde `main.js`; lo coherente es que `main.js` solo arranque y que `App` delegue en un caso de uso "load demo".

**Archivos actuales**

- Tu `main.js` actual hace: `new App(container)`, `loadDemo()` que llama a `app.loadDemo()`. En la nueva estructura, `loadDemo()` puede ser un caso de uso `loadWorld` invocado desde `App`; `main.js` solo crea `App` y llama a un único método de arranque (ej. `app.start()`).

---

### 4.2. `app.js` (raíz de `src/`)

**Qué va aquí**

- **Orquestador**: recibe los **puertos** (y opcionalmente el store) por constructor o por setter.
- No conoce `fetch`, URLs, ni clases concretas de adapters (`HttpBloquesApi`, etc.).
- Tiene referencia al **store**, a los **casos de uso** (application) y al **game loop / driving** (quien hace el tick).
- Responsabilidades: iniciar escena, ECS, terrain, world; registrar sistemas; suscribirse al store; exponer un método tipo `start()` o `loadDemo()` que delega en un caso de uso.

**Quién usa qué**

- Recibe (inyección): `worldApi`, `particlesApi`, `charactersApi`, `celestialApi`, `agrupacionesApi` (objetos que implementan los ports), `store`.
- Importa: casos de uso (`loadWorld`, `spawnPlayer`, `syncCelestial`), módulos de **rendering** (Scene3D, TerrainManager, ECSManager, etc.), **state** (store, actions, selectors), **config** (constants).
- No importa: `adapters/http/*` ni `api/endpoints/*` (esos se crean en el bootstrap y se inyectan como ports).

**Flujo**

1. Constructor: `App({ worldApi, particlesApi, charactersApi, celestialApi, agrupacionesApi, store })` (o un objeto `ports` que los agrupe).
2. En el constructor (o en `init()`): crea escena, geometry registry, object pools, ECS, input manager, terrain manager (pasándoles lo que necesiten: scene, **ports** en vez de APIs concretas), world (camera controller, collision detector, celestial).
3. `start()` o `loadDemo()`: llama a `loadWorld(ports, store)` (caso de uso). Ese caso de uso usa `worldApi.getDimensions()`, `particlesApi.getParticles()`, etc., actualiza el store y devuelve; luego `App` puede llamar a `spawnPlayer(...)` y arrancar el game loop.
4. El **game loop** (requestAnimationFrame) vive en `driving/game/` y recibe la referencia a `App` o a los sistemas (ECS, terrain, celestial); en cada frame llama a `ecs.update(dt)`, `terrain.update(dt)`, etc.

**Archivos actuales**

- Tu `app.js` actual: concentra creación de `ApiClient`, `BloquesApi`, `ParticlesApi`, etc., Scene, TerrainManager, ECS, InputManager, CollisionDetector, CameraController, CelestialSystem, optimizaciones. En la nueva estructura, la **creación** de los adapters HTTP se hace en un **bootstrap** (ver `driving/game/`); `App` solo recibe los ports ya creados y los pasa a los casos de uso y a TerrainManager / ECS donde haga falta.

---

### 4.3. `domain/` – Lógica de negocio pura

Sin dependencias de Three.js, fetch, DOM. Solo tipos de datos (value objects, modelos) y reglas de validación o cálculo que no dependan del framework.

#### 4.3.1. `domain/world/`

**Qué va aquí**

- **dimension.js**: Representación de una dimensión/bloque (id, nombre, ancho_metros, alto_metros, origen_x, origen_y, etc.). Puede ser un objeto plano o una clase con validaciones. Lo usan los casos de uso y el store.
- **viewport.js**: Viewport (x_min, x_max, y_min, y_max, z_min, z_max) y una función `validateRanges()` que lanza si los rangos son inválidos. Lo usan application y terrain (la parte que no sea Three.js).
- **world-size.js** (opcional): Estructura para el tamaño del mundo (ancho_total, alto_total, radio_mundo, min_x, max_x, etc.). Lo devuelve el port de bloques y lo consume el caso de uso o la UI.

**Quién usa qué**

- Importan: nada de `api/`, `adapters/`, `rendering/`, `driving/`.
- Son importados por: `application/` (load-world, etc.), `state/` (selectors si guardas dimension/viewport en el store), y por **adapters** cuando transforman la respuesta HTTP en estos objetos (opcional: el adapter puede devolver objetos planos y que sea el caso de uso quien los convierta en tipos de domain).

**Archivos actuales**

- No existe hoy un `domain/world/`. Se extrae de: el uso que hace `app.js` y `terrain` de dimensiones y viewport; los DTOs que devuelven `api/endpoints/bloques.js`. Puedes crear `dimension.js` y `viewport.js` con la forma que ya usas (ej. la que viene del backend).

#### 4.3.2. `domain/particles/`

**Qué va aquí**

- **particle-type.js**: Estructura de un tipo de partícula (id, nombre, color, geometria, opacidad). Solo datos.
- **particle.js** (opcional): Estructura de una partícula (id, bloque_id, celdas, tipo, temperatura, etc.). Lo que el backend devuelve y el frontend usa para renderizar o para lógica (ej. colisiones).

**Quién usa qué**

- Importados por: `application/`, `state/`, y por los **adapters** al mapear JSON → objeto de dominio si quieres tipado fuerte en JS (o por los casos de uso si el adapter devuelve JSON crudo).

**Archivos actuales**

- Hoy no hay carpeta `domain/particles/`. Los "tipos" vienen de `api/endpoints/particles.js` y se usan en terrain. Puedes definir aquí la forma canónica de `ParticleType` y `Particle` para que tanto el adapter como el rendering la usen.

#### 4.3.3. `domain/character/`

**Qué va aquí**

- **character-model.js**: Estructura del personaje (id, bloque_id, nombre, tipo, especie, posicion, geometria_agrupacion, modelo_3d). Lo que devuelve el backend y usa el caso de uso "spawn player" y el ECS (PlayerFactory).

**Quién usa qué**

- Importados por: `application/spawn-player.js`, `rendering/ecs/factories/player-factory.js` (si la factory recibe un DTO de dominio y no el JSON crudo).

**Archivos actuales**

- Equivalente a lo que hoy usa `PlayerFactory` y `charactersApi.getCharacter()`; lo centralizas aquí como modelo de dominio.

#### 4.3.4. `domain/recipe/` (futuro – Ideas 53: Constructor In-Game, Recetas, Piezas Mesh)

**Qué va aquí**

- **recipe.js**: Receta (id, nombre, categoria, material_id, proceso, forma [mesh o referencia], metadatos). Coherente con backend: material + proceso + forma → pieza reutilizable. Categorías: armas, herramientas, construcción, estatuas (ver Ideas 53 y mesh-builder/).
- **piece.js**: Pieza colocable (receta_id, posicion, rotacion, bloque_id, agrupacion_id si se guarda como agrupación). Para colocación y apilado en el mundo.
- **material-process.js** (opcional): Reglas material ↔ proceso permitido (sustractivo, fundición, forja, etc.) y pérdida; puede ser datos que el frontend valida antes de enviar al backend.

**Quién usa qué**

- Importados por: casos de uso (createRecipe, placePiece, getRecipes), por la UI del constructor, y por adapters que mapeen la API de recetas a estos tipos. El constructor in-game (panel o pantalla) usa domain/recipe para validar y mostrar opciones; application orquesta llamadas al port de recetas y al port de agrupaciones para colocar piezas.

---

### 4.4. `application/` – Casos de uso

Cada archivo es un flujo: recibe los **ports** que necesita y el **store** (si aplica), orquesta llamadas y actualiza estado. No conocen HTTP ni URLs.

#### 4.4.1. `application/load-world.js`

**Qué va aquí**

- Función `loadWorld(ports, store)` (o `loadWorld({ worldApi, particlesApi }, store)`).
- 1) Llama a `ports.worldApi.getDimensions()` (o el nombre que des al port).
- 2) Busca la dimensión demo por nombre (constante de config).
- 3) Si no hay, lanza error.
- 4) Llama a `ports.particlesApi.getParticleTypes(bloqueId, viewport)` y `ports.particlesApi.getParticles(bloqueId, viewport)` (o un solo método que devuelva ambos si tu port lo agrupa).
- 5) Actualiza el store con `actions.setDimension(store, dimension)`, `actions.setParticles(store, particles)` (o lo que tengas).
- 6) Devuelve `{ dimension, particles, particleTypes }` para que quien lo llame (App) pueda pasar esos datos al TerrainManager y arrancar el mundo.

**Quién usa qué**

- Importa: `domain/world/` (Dimension, Viewport), `state/actions.js`, `config/constants.js` (nombre de dimensión demo).
- Recibe por parámetro: `ports` (worldApi, particlesApi), `store`.
- No importa: adapters, fetch, App, rendering.

**Archivos actuales**

- Equivalente a la lógica que está hoy dentro de `App.loadDemo()`: obtener dimensiones, buscar demo, cargar partículas, actualizar store. Se extrae a este archivo.

#### 4.4.2. `application/spawn-player.js`

**Qué va aquí**

- Función `spawnPlayer(ports, store, ecs, scene, options)`.
- 1) Obtiene bloqueId y opcionalmente characterId del store o de options.
- 2) Llama a `ports.charactersApi.getCharacter(bloqueId, characterId)` o `listCharacters` y toma el primero.
- 3) Con la respuesta (CharacterResponse del backend), llama a la factory del ECS (PlayerFactory) para crear la entidad en la escena.
- 4) Actualiza el store con el playerId y la referencia al bloque actual.
- 5) Devuelve el entityId del jugador.

**Quién usa qué**

- Importa: `domain/character/` (si definiste un tipo), `rendering/ecs/factories/player-factory.js` (o la factory se inyecta).
- Recibe: ports, store, ecs, scene, options.
- No importa: adapters HTTP.

**Archivos actuales**

- Lógica que hoy está en `App.loadDemo()` después de cargar el terreno: crear jugador con PlayerFactory, registrar sistemas que dependen del jugador (RenderSystem, CollisionSystem, WeaponEquipSystem), iniciar cámara y celestial. La parte "obtener datos del personaje y crear entidad" es este caso de uso; la parte "registrar sistemas y arrancar loop" puede estar en App o en driving/game.

#### 4.4.3. `application/sync-celestial.js`

**Qué va aquí**

- Función `syncCelestial(ports, store)`.
- 1) Llama a `ports.celestialApi.getState()`.
- 2) Actualiza el store con el estado celestial (tiempo, sol, luna, fase).
- 3) Opcional: devuelve el estado para que quien lo llame actualice el CelestialSystem/CelestialRenderer.

**Quién usa qué**

- Importa: `state/actions.js`.
- Recibe: ports (celestialApi), store.
- No importa: adapters, rendering.

**Archivos actuales**

- Equivalente a la sincronización que haces en `App` con `celestialApi.getState()` cada X segundos; se extrae a este caso de uso.

#### 4.4.4. Futuros en `application/`

- **connect-realtime.js**: Conectar WebSocket, suscribirse a eventos, actualizar store o notificar a ECS/terrain.
- **login.js**: Llamar a port de auth, guardar token en store o en storage adapter.
- **place-piece.js**: Validar pieza (domain/recipe), llamar a port de agrupaciones o recetas para colocar en el mundo, actualizar store y/o escena (instancia de mesh en rendering).
- **Constructor (Ideas 53):**
  - **create-recipe.js**: Validar material + proceso + forma (límites de triángulos, tamaño; domain/recipe), llamar a `ports.recipesApi.createRecipe(payload)`, actualizar store con la receta creada.
  - **get-recipes.js**: Listar recetas del jugador o públicas; `ports.recipesApi.getRecetas()`, `getReceta(id)`; devolver datos para la UI del constructor.
  - **place-piece.js**: Dado receta_id y posición en mundo, llamar a port (agrupaciones con tipo pieza, o API de piezas); crear instancia de mesh en la escena (rendering) y sincronizar con backend. Reutiliza instancing para muchas piezas del mismo tipo (Ideas 53).

---

### 4.5. `ports/` – Contratos (interfaces)

En **JavaScript** son archivos que **documentan** el contrato (JSDoc) y exportan objetos vacíos o tipos para que los adapters implementen. En **TypeScript** son archivos `*.port.ts` que exportan `interface IWorldApi { ... }`.

#### 4.5.1. `ports/world-api.js` (o `world-api.port.ts`)

**Qué va aquí**

- Contrato: "quien implemente este port debe ofrecer estos métodos".
- En JS: comentario JSDoc o un objeto con métodos que lanzan "not implemented". Ejemplo:

```js
/**
 * Port para acceso a bloques/dimensiones y tamaño del mundo.
 * @typedef {Object} IWorldApi
 * @property {function(): Promise<Dimension[]>} getDimensions
 * @property {function(string): Promise<Dimension|null>} getDimension
 * @property {function(): Promise<WorldSize>} getWorldSize
 */
export const worldApiContract = {};
```

- En TS: `export interface IWorldApi { getDimensions(): Promise<Dimension[]>; getDimension(id: string): Promise<Dimension | null>; getWorldSize(): Promise<WorldSize>; }`

**Quién usa qué**

- Importado por: `application/load-world.js`, `app.js` (para tipar o documentar lo que recibe).
- Implementado por: `adapters/http/http-bloques.js` (o `http-world.js`).

**Archivos actuales**

- Hoy no hay "port"; existe `api/endpoints/bloques.js` (BloquesApi) que ya tiene esos métodos. Ese archivo se movería a `adapters/http/http-bloques.js` y se consideraría la implementación del port `world-api`.

#### 4.5.2. `ports/particles-api.js`

**Qué va aquí**

- Contrato: `getParticles(bloqueId, viewport)`, `getParticleTypes(bloqueId, viewport)`, `getParticleById(bloqueId, particleId)` (si lo usas).
- En TS: `interface IParticlesApi { ... }`.

**Quién usa qué**

- Importado por: `application/load-world.js`, y por quien necesite cargar partículas (TerrainManager recibe el port, no el adapter concreto).
- Implementado por: `adapters/http/http-particles.js`.

**Archivos actuales**

- `api/endpoints/particles.js` → implementación del port; se mueve a `adapters/http/http-particles.js`.

#### 4.5.3. `ports/characters-api.js`

**Qué va aquí**

- Contrato: `getCharacter(bloqueId, characterId)`, `listCharacters(bloqueId)`, `getCharacterModel(bloqueId, characterId)`, `createCharacter(bloqueId, data)`.
- En TS: `interface ICharactersApi { ... }`.

**Quién usa qué**

- Importado por: `application/spawn-player.js`, y por cualquier flujo que cree o muestre personajes.
- Implementado por: `adapters/http/http-characters.js`.

**Archivos actuales**

- `api/endpoints/characters.js` + helpers de `initCharactersApi` → `adapters/http/http-characters.js`.

#### 4.5.4. `ports/celestial-api.js`

**Qué va aquí**

- Contrato: `getState()`, `getTemperature(request)` (si lo usas).
- Implementado por: `adapters/http/http-celestial.js`.

**Archivos actuales**

- `api/endpoints/celestial.js` → `adapters/http/http-celestial.js`.

#### 4.5.5. `ports/agrupaciones-api.js`

**Qué va aquí**

- Contrato: `getAgrupaciones(bloqueId)`, `getAgrupacionWithParticles(bloqueId, agrupacionId)`.
- Implementado por: `adapters/http/http-agrupaciones.js`.

**Archivos actuales**

- `api/endpoints/agrupaciones.js` → `adapters/http/http-agrupaciones.js`.

#### 4.5.6. `ports/realtime.js` (futuro)

**Qué va aquí**

- Contrato: `connect()`, `subscribeWorldUpdates(callback)`, `sendAction(action)`, `disconnect()`.
- Implementado por: `adapters/ws/ws-world-client.js` cuando tengas WebSocket.

#### 4.5.7. `ports/auth.js` (futuro)

**Qué va aquí**

- Contrato: `login(credentials)`, `logout()`, `getSession()`.
- Implementado por: `adapters/http/http-auth.js` y opcionalmente `adapters/storage/browser-storage.js` para token.

#### 4.5.8. `ports/recipes-api.js` (futuro – Ideas 53)

**Qué va aquí**

- Contrato: `getRecetas()`, `getReceta(id)` (devuelve forma/mesh para preview y colocación), `createRecipe(payload)` (material, proceso, forma, categoría). Opcional: `getPiezasColocadas(bloqueId)` para sincronizar piezas ya puestas en el mundo.
- Implementado por: `adapters/http/http-recipes.js`. La colocación de piezas puede usar el port de agrupaciones (agrupación tipo `pieza` con `receta_id`) o un endpoint específico de piezas; el caso de uso placePiece usa este port y/o agrupaciones.

---

### 4.6. `adapters/` – Implementaciones de los ports

Cada adapter conoce fetch, URLs, WebSocket, o localStorage. Implementa exactamente los métodos del port correspondiente.

#### 4.6.1. `adapters/http/api-client.js`

**Qué va aquí**

- Cliente base: constructor recibe `baseUrl`, métodos `request(endpoint, options)`, `get(endpoint)`, `post(endpoint, body)`, `put`, `delete`.
- Igual que tu `api/client.js` actual.

**Quién usa qué**

- Importado por: todos los `adapters/http/http-*.js`.
- Importa: `config` o `shared/config` para `API_BASE_URL` por defecto.

**Archivos actuales**

- `api/client.js` → se mueve aquí.

#### 4.6.2. `adapters/http/http-bloques.js`

**Qué va aquí**

- Clase o objeto que implementa el port `world-api`: `getDimensions()`, `getDimension(id)`, `getWorldSize()`.
- Internamente usa `this.client.get('/bloques')`, `this.client.get(\`/bloques/${id}\`)`, `this.client.get('/bloques/world/size')`.
- Export: `HttpBloquesApi` o `createHttpWorldApi(client)`.

**Quién usa qué**

- Importa: `api-client.js`, y opcionalmente `domain/world/dimension.js` para mapear la respuesta a un tipo de dominio.
- Es usado por: el bootstrap que crea los ports y se los inyecta a App.

**Archivos actuales**

- `api/endpoints/bloques.js` → se mueve aquí y se renombra a `http-bloques.js` (o `http-world.js` si unificas "world" = bloques + world size).

#### 4.6.3. `adapters/http/http-particles.js`

**Qué va aquí**

- Implementa `ports/particles-api`: `getParticles(bloqueId, viewport)`, `getParticleTypes(bloqueId, viewport)`, `getParticleById(bloqueId, particleId)`.
- Usa `this.client.get(...)` con query params para viewport.

**Archivos actuales**

- `api/endpoints/particles.js` → aquí.

#### 4.6.4. `adapters/http/http-characters.js`

**Qué va aquí**

- Implementa `ports/characters-api`: list, get, getModel, create. Incluye la lógica de `initCharactersApi` (getCharacterModelUrl, etc.) si la tienes.

**Archivos actuales**

- `api/endpoints/characters.js` + lo que esté en `api/endpoints/__init__.js` para characters → aquí.

#### 4.6.5. `adapters/http/http-celestial.js`

**Qué va aquí**

- Implementa `ports/celestial-api`: getState(), getTemperature(body).

**Archivos actuales**

- `api/endpoints/celestial.js` → aquí.

#### 4.6.6. `adapters/http/http-agrupaciones.js`

**Qué va aquí**

- Implementa `ports/agrupaciones-api`: getAgrupaciones(bloqueId), getAgrupacionWithParticles(bloqueId, agrupacionId).

**Archivos actuales**

- `api/endpoints/agrupaciones.js` → aquí.

#### 4.6.7. `adapters/ws/ws-world-client.js` (futuro)

**Qué va aquí**

- Implementa `ports/realtime`: connect(), subscribeWorldUpdates(callback), sendAction(action), disconnect(). Internamente usa WebSocket y parsea mensajes.

#### 4.6.8. `adapters/storage/browser-storage.js` (futuro)

**Qué va aquí**

- Implementa un port de storage (getToken, setToken, removeToken) usando localStorage o sessionStorage. Lo usa el adapter de auth o el caso de uso login.

#### 4.6.9. `adapters/http/http-recipes.js` (futuro – Ideas 53)

**Qué va aquí**

- Implementa `ports/recipes-api`: getRecetas(), getReceta(id), createRecipe(payload). Usa el cliente HTTP para los endpoints de recetas del backend. La colocación de piezas en el mundo puede seguir usando el port de agrupaciones (agrupación tipo `pieza` con receta_id) o un endpoint específico; el caso de uso placePiece orquesta recetas + agrupaciones.

---

### 4.7. `driving/` – Quién dispara los flujos (entrada)

"Driving" = adaptadores de entrada: game loop, UI, input. Son los que llaman a los casos de uso o a App.

#### 4.7.1. `driving/game/game-bootstrap.js`

**Qué va aquí**

- Función `createApp(container)` o `bootstrap(container)`.
- 1) Crea `ApiClient` con baseUrl.
- 2) Crea cada adapter HTTP: `HttpBloquesApi(client)`, `HttpParticlesApi(client)`, etc.
- 3) Crea el `Store`.
- 4) Agrupa los adapters en un objeto `ports`: `{ worldApi, particlesApi, charactersApi, celestialApi, agrupacionesApi }`.
- 5) Crea `App` con `new App({ ports, store })` (o inyecta cada port por separado).
- 6) Opcional: llama a `app.init()` para que App cree escena, ECS, terrain, world (o eso lo hace el constructor de App).
- 7) Devuelve `{ app, store, ports }` para que `main.js` pueda llamar a `app.start()`.

**Quién usa qué**

- Importa: `adapters/http/*`, `api-client.js`, `state/store.js`, `app.js`.
- No importa: domain, application (App sí los usará internamente).

**Archivos actuales**

- Hoy esa lógica está en el constructor de `App`. Se extrae a este archivo para que main.js solo haga: `const { app } = bootstrap(container); app.start();`.

#### 4.7.2. `driving/game/game-loop.js`

**Qué va aquí**

- Función `runGameLoop(app)` o clase `GameLoop`: requestAnimationFrame, calcula deltaTime, llama a `app.update(deltaTime)` (o a `ecs.update(dt)`, `terrain.update(dt)`, `celestialSystem.update(dt)` si prefieres que App exponga esos sistemas).
- Opcional: sincronización celestial cada X segundos llamando a `syncCelestial(ports, store)` y actualizando el CelestialSystem con el resultado.

**Quién usa qué**

- Importa: `app.js` o los sistemas de rendering (ecs, terrain, world). No importa application ni ports (la sincronización celestial puede recibir ports por parámetro si la llamas desde aquí).

**Archivos actuales**

- El loop está hoy en `App.animate()` o similar. Se puede extraer a `game-loop.js` y que App solo registre ese loop pasándose a sí mismo o los sistemas.

#### 4.7.3. `driving/ui/screens/loading.js`

**Qué va aquí**

- Lógica o componente de pantalla de carga: mostrar/ocultar spinner, mensaje de error. Puede ser solo funciones que reciben el contenedor DOM y el store, y reaccionan a cambios de estado (loading, error).

**Archivos actuales**

- Hoy está en `main.js` (loadingEl, statusEl, dimensionInfoEl, particlesCountEl) y en la función `loadDemo()`. Puedes extraer a `driving/ui/screens/loading.js` las funciones `showLoading()`, `hideLoading()`, `showError(msg)`, `showDimensionInfo(text)`.

#### 4.7.4. `driving/ui/screens/gameplay.js` (opcional)

**Qué va aquí**

- Si en el futuro separas pantallas (menú vs juego), aquí iría la lógica de la pantalla de juego: canvas visible, HUD visible, teclas para pausar/abrir menú. Por ahora puede estar todo en App o en main.

#### 4.7.5. `driving/ui/hud/status-bar.js` (opcional)

**Qué va aquí**

- Actualizar elementos del HUD (partículas count, nombre de dimensión, vida, etc.) a partir del store. Puede ser una función `updateStatusBar(store, elements)` llamada desde App o desde el game loop cuando cambie el estado.

**Archivos actuales**

- Lo que hoy actualizas en `main.js` (dimensionInfoEl, particlesCountEl) puede vivir aquí.

#### 4.7.6. `driving/input/input-manager.js`

**Qué va aquí**

- Gestión de teclado y ratón: registra listeners, expone métodos tipo `isKeyPressed()`, `getMouseDelta()`, etc. No sabe nada de ECS ni de casos de uso; solo input crudo.

**Quién usa qué**

- Importado por: App (que lo pasa al InputSystem del ECS) y por cualquier pantalla que necesite input (menú, constructor).
- No importa: API, domain, application.

**Archivos actuales**

- `core/input/input-manager.js` → se mueve aquí. Sigue siendo el mismo archivo; solo cambia la ubicación para dejar claro que es "entrada" (driving).

---

#### 4.7.7. Interfaces y paneles: reutilización y parametrización

Todas las UIs que se abren con tecla (F3, F6, etc.) o como pantallas (configuración, personaje, inventario, constructor) comparten una **base común** y leen/escriben **config** y **state**. Así se parametriza lo necesario (config + constants) y se evita duplicar lógica de paneles.

**Base reutilizable**

- **`driving/ui/base-interface.js`** (o `driving/ui/panels/base-interface.js`): Clase base para todas las interfaces que se abren con tecla (F3, F4, F6, etc.). Proporciona: estructura (header, sidebar, mainContent), tecla de toggle, bloqueo de input del juego cuando la UI está abierta, utilidades (escapeHtml, showInfo, showError), sistema de tabs. Cada panel concreto (debug, config, personaje, inventario, constructor) **extiende** esta base y solo implementa su contenido y su tecla.
- **Archivos actuales:** `interfaces/base-interface.js` → aquí. Todas las demás interfaces heredan de ella.

**Parametrización: config y constants**

- **`config/`** y **`config/constants.js`** (y el resto de archivos en config/) son la **fuente de verdad** para todo lo parametrizable: nombres de dimensión demo, URLs, límites de partículas, opciones de debug, etc. Las interfaces **no** tienen valores hardcodeados; leen de config (y opcionalmente del store). La **interfaz de configuración** (ver abajo) permite al usuario cambiar en tiempo de ejecución lo que esté permitido (ej. volumen, teclas, visibilidad de HUD) y puede persistir en localStorage o enviar a un caso de uso que actualice config/store.
- Así: una sola capa de parametrización (config + constants), reutilizada por gameplay, por todas las UIs y por el constructor.

**Paneles por tecla y por contexto**

| Tecla / contexto | Ubicación propuesta | Contenido | Reutiliza |
|------------------|---------------------|-----------|-----------|
| **F3** | `driving/ui/panels/debug-panel.js` | Debug visual: métricas (FPS, draw calls, RAM, GPU), distintas pestañas o secciones (rendimiento, ECS, terreno, etc.). | BaseInterface, config (debug-config), state (selectors) |
| **F6** | `driving/ui/panels/test-interface.js` (o `dev-tools-panel.js`) | Herramientas de desarrollo: testing de animaciones, inspector de entidades, validadores, lo que hoy está en F6. | BaseInterface, config, state, opcionalmente App/ECS para inspección |
| **Configuración** | `driving/ui/panels/config-panel.js` | UI para parametrizar: opciones de cámara, teclas, volumen, límites de partículas (si se permiten en runtime), visibilidad de HUD, etc. Lee/escribe config o store. Puede abrirse con una tecla (ej. Escape + C) o desde menú. | BaseInterface, config, constants, state |
| **Estado del personaje** | `driving/ui/panels/character-state-panel.js` | Vida, stamina, estado actual (animación, combate), equipo, posición. Solo lectura desde store/ECS o lectura desde port si los datos vienen del servidor. | BaseInterface, state (selectors), opcionalmente ECS para datos en vivo |
| **Inventario** | `driving/ui/panels/inventory-panel.js` | Lista de ítems, equipamiento, uso de objetos. Llama a casos de uso (useItem, equip, unequip) que usan ports (inventario API). Datos del inventario en store o desde port. | BaseInterface, state, application (useItem, equip, etc.), ports (inventory-api cuando exista) |
| **Constructor (Ideas 53)** | `driving/ui/panels/constructor-panel.js` (o `screens/constructor.js`) | Modo taller/editor in-game: elegir material, proceso, forma (mesh), guardar receta, colocar piezas en el mundo. Usa domain/recipe, application (createRecipe, placePiece), ports (recipes-api, agrupaciones). Puede ser una pantalla completa más que un panel flotante. | BaseInterface o pantalla dedicada, config (límites de mesh), domain/recipe, application, ports |

**Estructura de carpetas sugerida para UI**

```
driving/ui/
├── base-interface.js          # Clase base (toggle, estructura, tabs, bloqueo input)
├── panels/
│   ├── debug-panel.js         # F3 – métricas y debug
│   ├── test-interface.js      # F6 – herramientas dev (animaciones, inspector)
│   ├── config-panel.js        # Configuración parametrizable
│   ├── character-state-panel.js
│   ├── inventory-panel.js
│   └── constructor-panel.js   # Futuro: Ideas 53
├── screens/
│   ├── loading.js
│   ├── gameplay.js
│   └── constructor-screen.js  # Pantalla completa del constructor (futuro)
└── hud/
    ├── status-bar.js          # Partículas, dimensión, etc.
    └── character-hud.js       # Vida, stamina, etc. (opcional)
```

**Por qué esta organización**

- **Una sola base** (BaseInterface): todas las UIs que se abren por tecla comparten estructura, teclado y bloqueo de input; solo cambia el contenido y la tecla. Se evita duplicar lógica en F3, F6, config, personaje, inventario, constructor.
- **Config + constants como única parametrización**: las UIs leen de ahí; la interfaz de configuración es la que permite cambiar lo permitido en runtime. El constructor (Ideas 53) también usará config para límites (triángulos, tamaño) y constants para materiales/procesos.
- **Paneles y pantallas separados**: los paneles son overlays (F3, F6, config, personaje, inventario); el constructor puede ser un panel o una pantalla completa según cómo lo diseñes. En ambos casos reutilizan la misma base y los mismos casos de uso/ports.

**Archivos actuales**

- `interfaces/base-interface.js` → `driving/ui/base-interface.js` (o `panels/base-interface.js`).
- `interfaces/debug-panel.js` (F3) → `driving/ui/panels/debug-panel.js`.
- `interfaces/test-interface.js` (F6) → `driving/ui/panels/test-interface.js`.
- `interfaces/debug-interface.js` → puede fusionarse con debug-panel o quedar como wrapper; se ubica en `driving/ui/panels/`.
- Config panel, character-state-panel, inventory-panel, constructor-panel: **nuevos**; se crean cuando implementes esas features, reutilizando BaseInterface y config/state.

---

### 4.8. `rendering/` – Three.js, ECS, terrain, world

Todo lo que pinta o actualiza la escena 3D. Reciben datos ya obtenidos (por App o por casos de uso) y no llaman al API directamente; si necesitan datos, los reciben por parámetro o del store.

#### 4.8.1. `rendering/scene/`

**Qué va aquí**

- **scene.js**: Clase Scene3D (container) que crea la escena Three.js, cámara, renderer, controls, luces, helpers. Métodos: `getScene()`, `getCamera()`, `getRenderer()`, `resize()`.
- **camera.js**, **controls.js**, **lights.js**, **renderer.js**, **helpers.js**: Lo que hoy está en `core/` y es puro Three.js (sin lógica de negocio). Se mueven aquí como parte de la "escena".

**Quién usa qué**

- Importan: Three.js, y opcionalmente `config/constants.js` para tamaños o colores.
- Son importados por: App, TerrainManager, ECS (RenderSystem), CelestialRenderer.

**Archivos actuales**

- `core/scene.js` → `rendering/scene/scene.js` (o mantener nombre `scene.js` dentro de `rendering/scene/`).
- `core/camera.js`, `core/controls.js`, `core/lights.js`, `core/renderer.js`, `core/helpers.js` → `rendering/scene/camera.js`, etc.

#### 4.8.2. `rendering/ecs/`

**Qué va aquí**

- Todo el ECS actual: `manager.js`, `system.js`, `components/`, `systems/`, `helpers/`, `conditions/`, `factories/`, `models/`, `states/`, `combos/`.
- Estructura interna se mantiene: `ecs/manager.js`, `ecs/components/*.js`, `ecs/systems/*.js`, etc. Solo la carpeta raíz pasa de `src/ecs/` a `src/rendering/ecs/`.

**Quién usa qué**

- ECS importa: Three.js, config (animations, combat, input), `rendering/scene/` (para añadir objetos a la escena), `shared/` (math, geometry, colors). No importa: ports, adapters, application.
- App importa ECSManager, sistemas, PlayerFactory; les inyecta inputManager, scene, y los datos del personaje (que vienen del caso de uso spawnPlayer).

**Archivos actuales**

- `ecs/*` completo → `rendering/ecs/*`. Sin cambios de nombres internos.

---

#### 4.8.2.1. Estructura interna del ECS: patrones y clarificación

El ECS es la parte más densa del frontend: entidades, componentes, sistemas, helpers por dominio, condiciones de animación, máquina de estados, combos y carga de modelos 3D conviven bajo la misma carpeta. Sin un patrón explícito, resulta mezclado y difícil de razonar. Esta subsección describe la estructura actual, los problemas y un patrón propuesto para dar orden sin imponer un refactor grande de golpe.

**Estructura actual (resumen)**

| Carpeta        | Contenido real                                                                 | Rol conceptual |
|----------------|---------------------------------------------------------------------------------|----------------|
| `manager.js`, `system.js` | Núcleo: registro de entidades, componentes, queries, cache, clase base System   | **Núcleo ECS** |
| `components/`  | Datos puros: Position, Physics, Render, Input, Animation, Combo, Combat, Weapon | **Componentes** |
| `systems/`     | Lógica por frame: Input, Physics, Collision, AnimationState, AnimationMixer, Combo, Combat, Render, WeaponEquip | **Sistemas** |
| `helpers/`     | Lógica auxiliar por dominio: `animation/`, `collision/`, `combat/`, `input/`, `physics/`, `weapon/` | **Helpers de sistemas** |
| `conditions/`  | Condiciones para **transiciones de animación** (Input, Physics, Movement, Combo, Combat, Water) | **State machine (animación)** |
| `states/`      | `StateRegistry`, `AnimationState`: determina estado de animación activo según contexto | **State machine (animación)** |
| `combos/`      | `ComboManager`, `ComboChain`, `InputBuffer`: detección y ejecución de secuencias de combate | **Lógica de combate** |
| `models/`      | `ModelLoader`, `ModelCache`, `model-utils`: carga de GLB/GLTF y utilidades de mesh | **Assets / infraestructura de render** |
| `factories/`   | Creación de entidades (p. ej. `PlayerFactory`) desde DTOs o datos de aplicación | **Creación de entidades** |

**Problemas que genera la mezcla**

1. **Nombre `models/`**: suena a “modelos de dominio” (como en `domain/character/`), pero es **carga de assets 3D**. Puede confundir con la capa de dominio. En la documentación (y opcionalmente en código) conviene tratarlo como “assets” o “loaders” del ECS.
2. **`conditions/` y `states/` sueltos en la raíz**: son **solo para la máquina de estados de animación**. No son “condiciones genéricas del ECS”. Quedan más claros si se documentan (o se agrupan) como parte del “módulo de animación”.
3. **`combos/` en la raíz**: es lógica de **combate** (secuencias de inputs). Tiene sentido conceptualmente junto a CombatSystem y a condiciones de tipo combo; puede documentarse como submódulo de “combate” aunque la carpeta siga en la raíz.
4. **Falta de capas explícitas**: no está escrito qué puede depender de qué (p. ej. sistemas usan helpers y opcionalmente conditions/states/combos; components no importan nada de ECS; models solo sirven a factories y a sistemas de render/weapon).

**Patrón propuesto (sin obligar a mover carpetas ya)**

- **Núcleo ECS**: `manager.js`, `system.js`, `components/`, `systems/`. Regla: componentes = solo datos; sistemas = lógica por frame; no llaman a API ni a `application/`.
- **Helpers por dominio**: `helpers/<dominio>/` (animation, collision, combat, input, physics, weapon). Cada sistema puede usar uno o varios helpers de su dominio; un helper puede ser compartido por varios sistemas.
- **Módulo de animación (conceptual)**: `states/` + `conditions/`. StateRegistry usa ConditionFactory para evaluar transiciones; AnimationStateSystem usa StateRegistry. En la doc se puede nombrar como “state machine de animación” y opcionalmente agrupar en algo tipo `ecs/animation/` (states + conditions) en una fase posterior.
- **Módulo de combate (conceptual)**: `combos/` + CombatSystem + condiciones de tipo combo/combat. ComboSystem y AnimationStateSystem usan combos y condiciones de combate. Se documenta como “combate + combos” aunque las carpetas sigan en la raíz.
- **Assets del ECS**: `models/` (ModelLoader, ModelCache, model-utils). Usados por PlayerFactory, RenderSystem, WeaponEquipSystem. En la doc referenciar como “carga de modelos 3D / assets del ECS” para no confundir con `domain/`.
- **Creación de entidades**: `factories/`. Reciben datos ya resueltos (p. ej. por `spawnPlayer`) y crean entidades y componentes en el ECS; pueden usar `models/` para instanciar mesh.

**Reglas de dependencias (recomendadas)**

- **components**: no importan otros módulos del ECS (solo tipos/config si hace falta).
- **systems**: pueden importar `helpers/`, `states/`, `conditions/`, `combos/`, `config/`, `rendering/scene/`, `shared/`. No importan `application/`, `ports/`, `adapters/`.
- **helpers**: pueden importar `config/`, `shared/`, otros helpers del mismo dominio. No importan systems ni manager.
- **conditions / states / combos**: pueden importar `config/` y tipos de componentes (por nombre) si hace falta; no deben depender de sistemas ni de manager.
- **models (assets)**: usados por factories y por sistemas que instancian mesh (Render, WeaponEquip). No conocen entidades ni componentes.
- **factories**: importan `models/`, `components`, manager (para crear entidades). Reciben datos externos (por ejemplo DTO de personaje) y devuelven entityId o entidad registrada.

**Opciones de reordenación futura (opcional)**

- Agrupar **states/** y **conditions/** bajo algo como `ecs/animation/` (state-machine + conditions) para dejar claro que pertenecen solo a animación.
- Renombrar **models/** a **assets/** o **loaders/** dentro de `rendering/ecs/` para evitar la confusión con “modelos de dominio”.
- Si crece más lógica de combate (por ejemplo daño por partes del cuerpo), valorar un **ecs/combat/** que agrupe combos, condiciones de combate y helpers de combat.

Con esto, la estructura actual sigue siendo válida; la documentación y estas reglas dan un patrón claro (núcleo vs. módulos de animación/combate vs. assets vs. factories) y un camino para reordenar más adelante si se desea.

---

#### 4.8.2.2. Si se hiciera desde cero: estructura ideal del ECS

Pensando sin ataduras al código actual: cómo quedaría el ECS si se diseñara de cero con un patrón claro y sin carpetas “mezcladas”.

**Principios**

1. **Núcleo mínimo**: solo lo que define “qué es un ECS” (entidades, componentes, queries, ejecución de sistemas). Nada de lógica de juego.
2. **Dominios por carpeta**: cada “feature” del juego (animación, combate, input, física, colisión, render, armas) es **un dominio**. Todo lo que pertenece a ese dominio (sistemas, state machine, condiciones, combos, helpers) vive **dentro** de esa carpeta. No hay `conditions/` ni `states/` ni `combos/` sueltos en la raíz.
3. **Componentes = datos puros**: una sola carpeta `components/` en la raíz del ECS; no se duplican ni se reparten por dominio.
4. **Carga de assets fuera del ECS**: ModelLoader, ModelCache, utilidades de mesh no son “modelos de dominio” ni parte del motor ECS; son **infraestructura de rendering**. Van en `rendering/loaders/` (o `rendering/assets/`), y el ECS solo los **usa** vía factories o sistemas que instancian mesh.
5. **Factories en el borde**: crean entidades a partir de datos externos (DTOs); dependen del núcleo ECS, de components y de los loaders de rendering.

**Árbol ideal (desde cero)**

```
rendering/
  loaders/                          # Fuera del ECS: carga de assets 3D
    model-loader.js
    model-cache.js
    model-utils.js
    bones-utils.js
    vertex-groups-utils.js

  ecs/
    core/                           # Núcleo mínimo del motor ECS
      world.js                      # (o manager.js) entidades, componentes, queries, cache, run systems
      system.js                     # clase base System
      query.js                      # (opcional) si las queries se extraen del world

    components/                     # Solo datos; un archivo por componente
      position.js
      physics.js
      render.js
      input.js
      animation.js
      combo.js
      combat.js
      weapon.js
      index.js

    domains/
      animation/
        systems/
          animation-state-system.js
          animation-mixer-system.js
        state-machine/              # State machine de animación (antes states/ + conditions/)
          state-registry.js
          animation-state.js
          conditions/
            base-condition.js
            input-condition.js
            physics-condition.js
            movement-condition.js
            combo-condition.js
            combat-condition.js
            water-condition.js
          condition-factory.js
        helpers/
          animation-resolver.js
          animation-player.js
          combat-animation-handler.js
          animation-loader.js

      combat/
        systems/
          combat-system.js
          combo-system.js
        combos/                     # Lógica de combos (antes combos/ en raíz)
          combo-manager.js
          combo-chain.js
          input-buffer.js
        helpers/
          combat-action-config-applier.js
          combat-action-validator.js
          combat-action-input-checker.js
          combat-animation-state-cache.js

      input/
        systems/
          input-system.js
        helpers/
          movement-direction-calculator.js
          jump-handler.js
          input-action-checker.js
          combat-input-processor.js

      physics/
        systems/
          physics-system.js
        helpers/
          physics-velocity-limiter.js
          physics-friction-applier.js
          combat-movement-applier.js
          physics-timestep-manager.js

      collision/
        systems/
          collision-system.js
        helpers/
          collision-detector-helper.js
          collision-cache-manager.js
          terrain-bounds-checker.js
          liquid-detector.js

      render/
        systems/
          render-system.js

      weapon/
        systems/
          weapon-equip-system.js
        helpers/
          weapon-attachment-manager.js
          weapon-model-inspector.js
          weapon-model-loader.js

    factories/                      # Creación de entidades desde datos externos
      player-factory.js
      index.js
```

**Qué cambia respecto a la estructura actual**

| Hoy (raíz de ecs/)     | Desde cero                                      |
|------------------------|--------------------------------------------------|
| `manager.js`, `system.js` | `core/world.js`, `core/system.js`               |
| `conditions/` en raíz   | Dentro de `domains/animation/state-machine/conditions/` |
| `states/` en raíz      | Dentro de `domains/animation/state-machine/`    |
| `combos/` en raíz      | Dentro de `domains/combat/combos/`              |
| `helpers/animation/`, etc. | Dentro de `domains/<dominio>/helpers/`     |
| `systems/*.js` en raíz | Dentro de `domains/<dominio>/systems/`           |
| `models/` dentro de ecs | **Fuera**: `rendering/loaders/` (model-loader, model-cache, model-utils, bones, vertex-groups) |
| `factories/`           | Igual en `ecs/factories/`; usan `rendering/loaders/` |

**Reglas de dependencias (ideal)**

- **core**: no importa domains ni components (solo define la API del world y la base System).
- **components**: no importan core ni domains; solo datos y quizá config.
- **domains/&lt;nombre&gt;/**: puede importar `core`, `components`, `config`, `shared`, `rendering/scene/`, y **dentro del mismo dominio** (systems → state-machine/combos/helpers). Un dominio **no** importa otro dominio (evitar acoplamiento entre animation y combat salvo por componentes compartidos).
- **factories**: importan `core`, `components`, `rendering/loaders/`. No importan domains (las factories solo crean entidades y componentes; los sistemas los procesan después).
- **rendering/loaders/**: no conoce ECS; solo carga y cachea recursos 3D. Lo usan factories y, si hace falta, sistemas de render/weapon que necesiten cargar mesh bajo demanda.

**Ventajas de esta estructura**

- **Un dominio = una carpeta**: para animación, combate, input, etc., todo está junto. No hay que saltar entre `states/`, `conditions/` y `systems/` para entender “cómo funciona la animación”.
- **Ninguna carpeta “genérica” en la raíz**: conditions, states y combos dejan de ser nombres sueltos; quedan acotados a animation y combat.
- **Loaders fuera del ECS**: se elimina la confusión entre “modelos de dominio” y “carga de GLB”; el ECS solo consume esos loaders.
- **Escalabilidad**: un nuevo dominio (p. ej. “daño por partes del cuerpo”) sería `domains/limb-damage/` con sus systems y helpers, sin tocar la raíz.

Esta es la estructura a la que se podría tender en un refactor largo; el apartado 4.8.2.1 sigue describiendo la actual y cómo vivir con ella hasta entonces.

---

#### 4.8.2.3. Estructura fuera del ECS: cómo encaja con el resto de la app

El ECS no vive solo: está **dentro** de `rendering/` y se relaciona con App, application, driving, state y config. Esta subsección muestra la estructura global (fuera del ECS) y cómo cada capa se conecta al ECS.

**Árbol de `src/` (visión global)**

El ECS es una subcarpeta de `rendering/`. Quien orquesta todo es `app.js`; quien obtiene datos es `application/`; quien dispara el frame es `driving/game/`.

```
src/
├── main.js
├── app.js                    # Orquestador: crea rendering (scene, ecs, terrain, world), llama casos de uso, arranca game loop
├── domain/                   # Modelos puros (world, particles, character). ECS no los importa; application y factories los usan
├── application/              # Casos de uso (loadWorld, spawnPlayer, syncCelestial). Alimentan store y ECS (vía factories)
├── ports/                    # Contratos (worldApi, particlesApi, charactersApi, …). ECS no los ve; App/application los usan
├── adapters/                 # HTTP, WebSocket. ECS no los ve
├── driving/
│   ├── game/                 # Bootstrap, game loop. Llama ecs.update(dt), terrain.update(dt), world, etc.
│   ├── input/                # InputManager (teclado, ratón). App lo inyecta al ECS (InputSystem)
│   └── ui/                   # Paneles (F3, F6, personaje, …). Pueden leer store o inspeccionar ECS (solo lectura)
├── rendering/                # Todo lo 3D: escena, ECS, terreno, mundo, loaders
│   ├── loaders/              # Fuera del ECS: ModelLoader, ModelCache, model-utils. Usados por ecs/factories y por sistemas
│   ├── ecs/                  # ← ECS vive aquí (core, components, domains, factories)
│   ├── scene/                # Scene3D, cámara, luces, renderer. ECS añade objetos a la escena
│   ├── terrain/              # TerrainManager, partículas, LOD. Hermano del ECS; no depende del ECS
│   ├── world/                # CameraController, CollisionDetector, CelestialSystem/Renderer. Usan posición del jugador (ECS)
│   ├── optimizations/        # FrameScheduler, LOD, pools. App los puede inyectar al ECS o al terrain
│   ├── geometries/           # GeometryRegistry. Terrain y opcionalmente ECS lo usan
│   └── renderers/            # BaseRenderer (terrain, etc.). ECS pinta vía RenderSystem + scene
├── state/                    # Store, actions, selectors. Application escribe; UI y App leen; ECS no importa state
├── config/                   # Constantes (animación, combate, input, ECS). ECS y driving los importan
└── shared/                   # math, geometry, colors. ECS y rendering los importan
```

**Relación de cada capa con el ECS**

| Capa | Relación con el ECS |
|------|---------------------|
| **main.js** | No toca el ECS. Solo arranca App y llama `app.start()`. |
| **app.js** | **Crea** el ECS (World/ECSManager), scene, terrain, world, loaders, inputManager. **Registra** sistemas en el ECS y les inyecta scene, inputManager, collisionDetector, etc. **Llama** a casos de uso pasándoles `ecs` y `scene` (p. ej. `spawnPlayer(ports, store, ecs, scene)`). **No** actualiza el ECS en cada frame; eso lo hace el game loop. |
| **application/** | **Alimenta** el ECS: `spawnPlayer` obtiene datos del personaje (ports/store), llama a `PlayerFactory` con esos datos y el ECS crea la entidad. `loadWorld` no toca el ECS; solo store y terrain. Los casos de uso reciben `ecs` y `scene` por parámetro cuando deben crear entidades. |
| **ports/ y adapters/** | El ECS **no los conoce**. Solo application y App los usan para obtener datos; luego esos datos llegan al ECS vía factories o store. |
| **driving/game/** | **Actualiza** el ECS cada frame: `ecs.update(deltaTime)`. Opcionalmente pasa FrameScheduler u otras optimizaciones si el ECS las usa. |
| **driving/input/** | App instancia InputManager y lo **inyecta** en el ECS (p. ej. en InputSystem). El ECS lee input; no crea ni posee el InputManager. |
| **driving/ui/** | Paneles (F3, F6, estado personaje) pueden **leer** el ECS para inspección (entidades, componentes). No modifican el ECS; solo consultan. |
| **rendering/loaders/** | **Hermano** del ECS. Las factories del ECS y los sistemas que cargan mesh (Render, WeaponEquip) importan loaders. El ECS no “contiene” los loaders. |
| **rendering/scene/** | El ECS **añade** objetos a la escena (RenderSystem, PlayerFactory). App crea la escena y la pasa al ECS al registrar sistemas o al llamar a factories. |
| **rendering/terrain/** | **Hermano** del ECS. No depende del ECS; TerrainManager y ECS se actualizan por separado en el game loop. |
| **rendering/world/** | **Consume** datos del ECS: CameraController y CollisionDetector reciben la entidad del jugador o su posición (que vive en el ECS). App los crea y les pasa la referencia al jugador o al ECS para leer posición. |
| **state/** | El ECS **no importa** el store. Application escribe en el store (p. ej. playerId después de spawnPlayer); la UI lee el store. Si hace falta, App puede leer store y pasar datos al ECS, pero el ECS no suscribe al store. |
| **config/ y shared/** | El ECS **importa** config (animación, combate, ECS constants) y shared (math, geometry) para sistemas, helpers y factories. |

**Flujo resumido (quién toca el ECS)**

1. **Bootstrap / App constructor**: crea `scene`, `loaders`, `ecs` (World), `terrain`, `world` (camera, collision, celestial), `inputManager`. Registra sistemas en el ECS inyectando scene, inputManager, collisionDetector, etc. No crea entidades todavía.
2. **App.start()**: llama `loadWorld(ports, store)` → actualiza store y terrain; luego llama `spawnPlayer(ports, store, ecs, scene)` → caso de uso usa ports, obtiene datos del personaje, llama `PlayerFactory(ecs, scene, loaders, characterData)` → se crea la entidad jugador en el ECS.
3. **App** (o bootstrap) arranca el **game loop** en `driving/game/`: cada frame `ecs.update(dt)`, `terrain.update(dt)`, `cameraController.update(dt)`, `celestialRenderer.update(dt)`, etc.
4. **Paneles (F3, F6)**: si inspeccionan entidades, reciben la referencia al `ecs` desde App y solo leen (queries, getComponent). No llaman a `ecs.update` ni crean entidades.

Con esto queda claro: el ECS es un **módulo dentro de rendering/**; lo crea y configura **App**, lo alimentan los **casos de uso** vía **factories**, lo actualiza el **game loop** en driving, y lo consumen **world** (cámara, colisiones) y opcionalmente la **UI** de debug. Fuera del ECS, **loaders** son hermanos suyos (también bajo rendering), no parte del motor ECS.

#### 4.8.3. `rendering/terrain/`

**Qué va aquí**

- TerrainManager y todo lo que hoy está en `terrain/`: `manager.js`, `components/`, `systems/`, `renderers/particle-renderer.js`, `optimizations/` (particle-limiter, lod-manager, adaptive-limiter), `utils/` (culling, sorting).
- **Importante**: TerrainManager ya no debe usar `this.particlesApi` directamente; en su lugar recibe un **port** `particlesApi` (inyectado). Así, quien crea TerrainManager (App o bootstrap) le pasa el port; TerrainManager llama a `particlesApi.getParticles()` sin saber si es HTTP o mock.
- Los "clientes" que hoy están en `terrain/api/` (bloques-client, particles-client) se eliminan: el terreno usa el port inyectado; los adapters HTTP viven en `adapters/http/`.

**Quién usa qué**

- TerrainManager importa: Scene (Three), GeometryRegistry, port de particles (inyectado), port de bloques si lo usa para world size, PerformanceManager, `domain/world/viewport.js` si validas viewport.
- App (o bootstrap) crea TerrainManager pasando `scene.getScene()`, `ports.particlesApi`, `ports.worldApi`, `geometryRegistry`, `performanceManager`.

**Archivos actuales**

- `terrain/manager.js` → `rendering/terrain/manager.js`.
- `terrain/components/`, `terrain/systems/`, `terrain/renderers/`, `terrain/optimizations/`, `terrain/utils/` → mismo contenido en `rendering/terrain/`.
- `terrain/api/bloques-client.js`, `terrain/api/particles-client.js` → se eliminan; la obtención de datos la hace App/casos de uso con los ports, y TerrainManager recibe los datos o el port (recomendado: inyectar el port para que TerrainManager pueda pedir partículas por viewport cuando se mueve la cámara).

#### 4.8.4. `rendering/world/`

**Qué va aquí**

- **camera-controller.js**: Sigue al jugador, actualiza posición de cámara. Recibe la entidad del jugador (o su posición) y la cámara.
- **collision-detector.js**: Colisiones con terreno (líquidos, sólidos). Recibe terreno/partículas y posición del jugador.
- **celestial-system.js**: Lógica del sol/luna (ángulos, fase). Recibe tiempo o estado celestial (del store o del caso de uso syncCelestial).
- **celestial-renderer.js**: Pinta el cielo, sol, luna en la escena. Recibe CelestialSystem y la escena/cámara.

**Quién usa qué**

- Importan: Three.js, y opcionalmente config. No importan: ports, adapters, application.
- Son importados por: App, que los instancia después de tener escena y jugador.

**Archivos actuales**

- `world/camera-controller.js`, `world/collision-detector.js`, `world/celestial-system.js`, `world/celestial-renderer.js` → `rendering/world/` con los mismos nombres.

#### 4.8.5. `rendering/optimizations/`

**Qué va aquí**

- ObjectPool, FrustumCuller, LODManager (el de core, no el de terrain), FrameScheduler, SpatialGrid, InstancingManager, RenderBatcher. Todo lo que es optimización de renderizado o de CPU para el frame.

**Quién usa qué**

- Importan: Three.js, config. Son importados por: App (que los crea y los pasa a ECS o a terrain donde corresponda).

**Archivos actuales**

- `core/optimizations/*` → `rendering/optimizations/*`.

#### 4.8.6. `rendering/geometries/registry.js`

**Qué va aquí**

- GeometryRegistry: registro de geometrías (box, sphere, etc.) para reutilizar en partículas y en otros objetos. Sin dependencias de API.

**Archivos actuales**

- `core/geometries/registry.js` → `rendering/geometries/registry.js` (o lo dejas bajo `rendering/scene/` si lo consideras parte de la escena; ambos son válidos).

#### 4.8.7. `rendering/renderers/base-renderer.js`

**Qué va aquí**

- Clase base abstracta para renderizadores (por si tienes más de un tipo de renderer). Usado por ParticleRenderer u otros.

**Archivos actuales**

- `core/renderers/base-renderer.js` → `rendering/renderers/base-renderer.js`.

---

### 4.9. `state/`

**Qué va aquí**

- **store.js**: Store genérico (getState, setState, subscribe). Sin cambios de concepto.
- **actions.js**: Funciones que actualizan el store (setLoading, setError, setDimension, setParticles, setPlayerId, setCelestialState, etc.). Algunas acciones pueden llamar a casos de uso (ej. si quieres que "click en jugar" dispare loadWorld desde una acción); lo más limpio es que las acciones solo muten estado y que los casos de uso se llamen desde App o desde driving.
- **selectors.js**: Funciones que leen del store (getDimension, getParticles, getLoading, getError, getPlayerId). Usadas por UI o por App para decidir qué mostrar.

**Quién usa qué**

- Importados por: App, application (casos de uso), driving/ui (pantallas, HUD). No importan: adapters, rendering (excepto si una acción dispara un efecto que al final toca la escena; mejor evitar).

**Archivos actuales**

- `state/store.js`, `state/actions.js`, `state/selectors.js` → se quedan donde están o se mueven a la raíz de `state/` si ya están ahí. Sin cambio de responsabilidad.

---

### 4.10. `config/`

**Qué va aquí**

- Constantes y configuraciones: `constants.js` (DEMO_DIMENSION_NAME, API_BASE_URL si no está en utils/config), `animation-config.js`, `animation-constants.js`, `combat-*.js`, `combo-config.js`, `input-*.js`, `particle-optimization-config.js`, `weapon-*.js`, `debug-config.js`, `ecs-constants.js`.

**Quién usa qué**

- Importados por: domain (poco), application (constants), adapters (API_BASE_URL), rendering (ECS, terrain, world), driving. No tienen dependencias de lógica de negocio; solo datos.

**Archivos actuales**

- `config/*` → se mantienen en `config/` tal cual. Opcional: `utils/config.js` (API_BASE_URL) puede quedarse en utils o moverse a config; si lo mueves, actualiza imports en adapters.

---

### 4.11. `shared/`

**Qué va aquí**

- Utilidades puras: **math.js**, **geometry.js**, **colors.js**, **helpers.js** (los que no dependan de Three ni del DOM). Opcional: **cursor-manager.js** si es genérico (gestión de cursor del canvas); si es muy específico de "gameplay", puede vivir en driving/input.
- **weapon-attachment.js**, **weapon-utils.js**: Si son solo cálculos/geometría, aquí; si dependen del ECS o del modelo 3D, pueden quedarse en `rendering/ecs/helpers/weapon/`.

**Quién usa qué**

- Importados por: domain, application, rendering, adapters (poco). No importan: ports, state, driving.

**Archivos actuales**

- `utils/math.js`, `utils/geometry.js`, `utils/colors.js`, `utils/helpers.js` → `shared/`. `utils/cursor-manager.js` → `shared/` o `driving/input/`. `utils/config.js` → `config/` o se deja en `shared/` si prefieres. `utils/weapon-attachment.js`, `utils/weapon-utils.js` → `shared/` o dentro de `rendering/ecs/helpers/weapon/` según dependencias.

---

### 4.12. Debug, interfaces, performance, tipos

#### 4.12.1. `debug/` (opcional: mantener en raíz o mover a `driving/debug/`)

**Qué va aquí**

- **logger.js**, **metrics.js**, **performance-logger.js**, **inspector.js**, **validator.js**, **events.js**, y los README/USO-*.md. Herramientas de desarrollo que no forman parte del flujo hexagonal pero se usan desde App o desde driving.

**Dónde va**

- Puedes dejar `debug/` en la raíz de `src/` (como ahora) o moverla a `driving/debug/` para indicar que es "entrada" de desarrollo. App o bootstrap las importan e inicializan.

#### 4.12.2. `interfaces/` (UI de debug / testing)

**Qué va aquí**

- **base-interface.js**, **debug-interface.js**, **debug-panel.js**, **test-interface.js**: Paneles F4, F6, etc. Son parte de la "UI" de entrada (driving).

**Dónde va**

- Se pueden mover a `driving/ui/panels/` o mantener como `interfaces/` en la raíz. Si quieres consistencia, `driving/ui/panels/debug-panel.js`, etc.

#### 4.12.3. `core/performance/performance-manager.js`

**Qué va aquí**

- Gestión de métricas de rendimiento (FPS, draw calls). No es un port; es una utilidad de observabilidad.

**Dónde va**

- Puede quedarse en `rendering/performance/performance-manager.js` (porque afecta al loop de render) o en `debug/` si lo consideras solo desarrollo. Recomendación: `rendering/performance/performance-manager.js` para que App lo importe desde rendering.

#### 4.12.4. `types.js` (raíz)

**Qué va aquí**

- En JS: definiciones JSDoc de tipos globales (Particle, Dimension, etc.) para que el IDE y los documentos tengan tipo. En TS: se sustituye por tipos en `domain/` y en `ports/*.port.ts`.

**Dónde va**

- En JS: mantener `types.js` en la raíz o mover a `domain/types.js` (re-exportando desde domain). En TS: no hace falta un solo archivo; cada módulo exporta sus tipos.

---

### 4.13. `scene.js` (raíz actual) y `dev-exposure.js`

- **scene.js**: Si es un re-export de `core/scene.js` o un alias, al mover core a `rendering/scene/` este archivo puede ser un re-export desde `rendering/scene/scene.js` o eliminarse y que todo importe desde `rendering/scene/`.
- **dev-exposure.js**: Expone App o herramientas en `window` para desarrollo. Puede quedarse en la raíz o moverse a `driving/debug/dev-exposure.js`. Lo importa `main.js`.

---

## 5. Flujo resumido: quién llama a quién

1. **main.js** → crea contenedor, llama a **bootstrap(container)** (o `new App(container)` si el bootstrap está dentro de App).
2. **Bootstrap** → crea ApiClient, adapters HTTP, Store, **ports** (objeto con worldApi, particlesApi, etc.), **App(ports, store)**. Devuelve app.
3. **main.js** → llama **app.start()**.
4. **App.start()** → llama caso de uso **loadWorld(ports, store)**. loadWorld usa ports.worldApi y ports.particlesApi, actualiza store, devuelve datos. App con esos datos inicializa TerrainManager (o le inyecta los ports y llama a TerrainManager.loadDimension(dimension, particles)). Luego llama **spawnPlayer(ports, store, ecs, scene)**. Luego registra **game loop** (requestAnimationFrame) que cada frame llama a ecs.update(dt), terrain.update(dt), celestial.update(dt), etc. Opcional: cada X segundos llama **syncCelestial(ports, store)** y actualiza CelestialSystem.
5. **TerrainManager** → cuando necesita partículas (viewport cambió), llama a **particlesApi.getParticles(bloqueId, viewport)**. No sabe que es HTTP; solo usa el port inyectado.
6. **ECS** → InputSystem usa InputManager (inyectado). RenderSystem, CollisionSystem, etc. usan escena y datos; no llaman al API.
7. **UI (loading, HUD)** → lee store vía selectors y actualiza DOM. Opcionalmente reacciona a store.subscribe().

---

## 6. Lista de todo lo contemplado

Checklist de lo que la estructura propuesta contempla y dónde encaja:

| Ítem | Dónde | Notas |
|------|--------|--------|
| **Backend Hexagonal + DDD** | Alineación | Puertos en front = contratos; adapters = HTTP/WS; casos de uso orquestan; dominio sin framework. |
| **Config y constants** | `config/` | Única fuente de parametrización; todas las UIs y el juego leen de aquí. |
| **Interfaz de configuración** | `driving/ui/panels/config-panel.js` | Parametriza en runtime lo permitido (teclas, volumen, HUD, límites); reutiliza BaseInterface. |
| **F3 – Debug** | `driving/ui/panels/debug-panel.js` | Métricas (FPS, draw calls, RAM, GPU), varias secciones; BaseInterface + debug-config. |
| **F6 – Herramientas desarrollo** | `driving/ui/panels/test-interface.js` | Animaciones, inspector de entidades, validadores; BaseInterface. |
| **Base reutilizable para UIs** | `driving/ui/base-interface.js` | Una sola clase base para F3, F6, config, personaje, inventario, constructor; toggle, estructura, tabs, bloqueo input. |
| **Estado del personaje** | `driving/ui/panels/character-state-panel.js` | Vida, stamina, animación, equipo; lee store/ECS; BaseInterface. |
| **Inventario** | `driving/ui/panels/inventory-panel.js` | Ítems, equipar, usar; casos de uso + port inventario (futuro); BaseInterface. |
| **Constructor In-Game (Ideas 53)** | `domain/recipe/`, `application/create-recipe.js`, `place-piece.js`, `ports/recipes-api.js`, `driving/ui/panels/constructor-panel.js` o `screens/constructor-screen.js` | Recetas (material + proceso + forma), piezas mesh colocables/apilables, instancing; dominio + casos de uso + port + UI que reutiliza BaseInterface o pantalla dedicada. |
| **Recetas comercializables (futuro)** | Mismo port + store/backend | Sin cambio de estructura; solo extensión de API y casos de uso. |
| **WebSockets / tiempo real** | `ports/realtime.js`, `adapters/ws/` | Un port más; App inyecta realtime en vez de (o además de) HTTP para datos en vivo. |
| **Auth (JWT, login)** | `ports/auth.js`, `adapters/http`, `adapters/storage`, `application/login.js` | Caso de uso login; token en store o storage adapter. |
| **Múltiples pantallas** | `driving/ui/screens/` | loading, gameplay, constructor; cada una puede mostrar/ocultar canvas y paneles. |
| **HUD (estado, partículas, dimensión)** | `driving/ui/hud/` | status-bar, character-hud; leen store/selectors. |
| **Testing con mocks** | Ports implementados por mocks | Los casos de uso reciben ports inyectados; en tests se inyectan mocks que implementan el mismo contrato. |

---

## 7. Por qué esta estructura es adecuada

- **Reutilización de UI:** Una sola `BaseInterface` para F3, F6, config, personaje, inventario y constructor evita duplicar lógica de paneles (toggle, estructura, bloqueo de input, tabs). Cada nueva pantalla o panel solo implementa contenido y tecla/entrada.
- **Una sola parametrización:** `config/` + `constants` son la única fuente de verdad; las interfaces (incluida la de configuración) y el juego leen de ahí. El constructor (Ideas 53) usa los mismos límites y constantes (materiales, procesos) sin hardcodear en la UI.
- **Escalabilidad de pantallas:** `driving/ui/screens/` y `driving/ui/panels/` separan overlays (F3, F6, config, personaje, inventario) de pantallas completas (loading, gameplay, constructor). El constructor puede ser panel o pantalla sin cambiar el resto de la arquitectura.
- **Constructor (Ideas 53) encaja sin forzar:** Dominio (`domain/recipe/`) define receta y pieza; casos de uso (`createRecipe`, `getRecetas`, `placePiece`) orquestan ports; un port `recipes-api` (y agrupaciones para colocación) mantiene el mismo patrón que bloques/partículas; la UI del constructor usa la misma base que el resto de paneles y la misma config para límites (triángulos, tamaño). Instancing de piezas en `rendering/` (terrain o módulo específico de piezas) reutiliza la filosofía actual de partículas.
- **Alineación con el backend:** Puertos = contratos; adapters = implementaciones (HTTP hoy, WebSocket después); casos de uso sin conocer URLs; dominio sin Three ni fetch. Misma mentalidad que Hexagonal + DDD del backend.
- **Testabilidad:** Casos de uso y App reciben ports inyectados; en tests se inyectan mocks. Las UIs leen store y config; se pueden probar con store/config de prueba.
- **Futuro: inventario, auth, realtime:** Cada uno es un port más y uno o varios casos de uso; no requiere reestructurar. Las interfaces de personaje e inventario ya tienen sitio en `driving/ui/panels/` y consumen store y ports.

Con esto tienes cada archivo ubicado, el flujo claro, las interfaces (config, F3, F6, personaje, inventario, constructor) contempladas con reutilización, y el constructor in-game (Ideas 53) integrado en domain, application, ports y UI. Si quieres, en un siguiente paso podemos bajar al detalle de un solo flujo (por ejemplo loadWorld + spawnPlayer o createRecipe + placePiece) con los nombres exactos de funciones y parámetros para tu código actual.
