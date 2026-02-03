# Estructura elegida del frontend y del ECS

Este documento resume la **estructura elegida** para el frontend (Hexagonal + DDD) y para el ECS dentro de rendering, y explica **por qué** se tomó cada decisión. Sirve como referencia única cuando se implemente o refactorice el código.

**Documento de detalle completo:** [frontend-arquitectura-hexagonal.md](./frontend-arquitectura-hexagonal.md) (árbol carpeta por carpeta, flujos, mapeo de archivos actuales).

---

## Índice

1. [Estructura global del frontend](#1-estructura-global-del-frontend)
2. [Estructura de `rendering/`](#2-estructura-de-rendering)
3. [Estructura elegida del ECS](#3-estructura-elegida-del-ecs)
4. [Cómo encaja el ECS con el resto de la app](#4-cómo-encaja-el-ecs-con-el-resto-de-la-app)
5. [Por qué esta estructura](#5-por-qué-esta-estructura)
6. [Terrain, world, state, config: ¿desde cero o así están bien?](#6-terrain-world-state-config-desde-cero-o-así-están-bien)

---

## 1. Estructura global del frontend

### Árbol de `src/`

```
src/
├── main.js
├── app.js
├── domain/           # world, particles, character, recipe
├── application/     # load-world, spawn-player, sync-celestial, …
├── ports/            # worldApi, particlesApi, charactersApi, celestialApi, realtime, auth, recipes-api
├── adapters/         # http/, ws/, storage/
├── driving/
│   ├── game/         # bootstrap, game loop
│   ├── input/        # InputManager
│   └── ui/           # base-interface, panels/, screens/, hud/
├── rendering/
│   ├── loaders/      # ModelLoader, ModelCache, model-utils (fuera del ECS)
│   ├── ecs/          # core, components, domains, factories
│   ├── scene/        # Scene3D, cámara, luces, renderer
│   ├── terrain/      # TerrainManager, partículas, LOD
│   ├── world/        # CameraController, CollisionDetector, CelestialSystem/Renderer
│   ├── optimizations/
│   ├── geometries/
│   └── renderers/
├── state/            # store, actions, selectors
├── config/           # constants, animation-config, combat-*, input-*, ecs-constants, …
└── shared/           # math, geometry, colors, helpers
```

### Por qué esta organización global

| Decisión | Por qué |
|----------|---------|
| **Hexagonal (ports + adapters)** | El frontend se alinea con el backend: todo lo “externo” (API, WebSockets, storage) se define como **contrato** (ports). El resto del código depende del contrato, no de la implementación. Así se pueden cambiar HTTP por WebSocket o mocks en tests sin tocar application ni rendering. |
| **domain/ sin Three ni fetch** | La lógica de negocio (world, particles, character, recipe) no depende de frameworks. Se puede reutilizar, testear y razonar sin ejecutar el juego. Los DTOs y value objects viven aquí; application y factories los usan. |
| **application/ = casos de uso** | Quién orquesta es una capa explícita: loadWorld, spawnPlayer, syncCelestial. Reciben **ports** y **store** (y cuando toca, **ecs**, **scene**). No conocen URLs ni implementaciones; solo “obtener datos” y “crear entidad”. Facilita tests con mocks y evita que App o rendering llamen al API directamente. |
| **driving/ = quién dispara** | Game loop, input y UI son “entrada”: quien dispara los flujos. Separarlos de application y rendering deja claro que el **game loop** solo llama a `ecs.update(dt)`, `terrain.update(dt)`, etc.; no obtiene datos ni crea entidades. Input y UI viven aquí; App inyecta InputManager al ECS. |
| **rendering/ = todo lo 3D** | Escena, ECS, terreno, mundo, loaders y optimizaciones están en un solo lugar. Quien pinta o actualiza la escena no llama al API; recibe datos ya preparados (por App o por casos de uso). |
| **state/ y config/ en la raíz** | Store (estado global) y config (constantes) son transversales: application escribe, UI y App leen. ECS no importa state; sí importa config. Mantenerlos en la raíz evita dependencias circulares y deja una sola fuente de verdad para parametrización. |
| **shared/ sin state ni driving** | Utilidades puras (math, geometry, colors) sin dependencias de framework ni de “quién dispara”. domain, application, rendering y adapters las usan; no al revés. |

---

## 2. Estructura de `rendering/`

### Árbol de `rendering/`

```
rendering/
├── loaders/          # Fuera del ECS: carga de assets 3D (GLB/GLTF)
├── ecs/              # Motor ECS: core, components, domains, factories
├── scene/            # Scene3D, cámara, luces, renderer
├── terrain/          # TerrainManager, partículas, LOD, renderers de partículas
├── world/            # CameraController, CollisionDetector, CelestialSystem, CelestialRenderer
├── optimizations/    # FrameScheduler, LOD, pools, spatial grid
├── geometries/       # GeometryRegistry
└── renderers/        # BaseRenderer (terrain, etc.)
```

### Por qué esta organización en rendering

| Decisión | Por qué |
|----------|---------|
| **loaders/ fuera del ECS** | ModelLoader, ModelCache y utilidades de mesh son **infraestructura de rendering**, no parte del motor ECS. Si vivieran dentro de `ecs/`, el nombre “models” chocaría con “modelos de dominio” (domain/character). Al ponerlos en `rendering/loaders/`, el ECS solo **consume** esos loaders (vía factories y sistemas de render/weapon); no los “posee”. |
| **ecs/ como una carpeta más** | El ECS es un módulo dentro de rendering: entidades, componentes y sistemas. Scene, terrain y world son **hermanos** del ECS; no dependen del ECS salvo world (cámara y colisiones leen posición del jugador del ECS). Así se evita que todo el 3D esté mezclado en una sola carpeta. |
| **scene/, terrain/, world/ separados** | **Scene**: contenedor Three.js (escena, cámara, luces). **Terrain**: partículas, LOD, viewport; recibe un **port** de particles inyectado por App, no llama al API directamente. **World**: cámara que sigue al jugador, colisiones con terreno, sol/luna. Cada uno tiene una responsabilidad clara; el game loop los actualiza en orden. |
| **optimizations/ y geometries/ compartidos** | FrameScheduler, LOD, pools pueden inyectarse al ECS o al terrain según quien los necesite. GeometryRegistry lo usan terrain y opcionalmente ECS. Estar en rendering (no dentro de ecs) permite reutilizarlos sin acoplar ECS a terrain. |

---

## 3. Estructura elegida del ECS

La estructura del ECS se eligió pensando “desde cero”: núcleo mínimo, dominios por carpeta, loaders fuera, factories en el borde.

### Principios

1. **Núcleo mínimo**: solo lo que define “qué es un ECS” (entidades, componentes, queries, ejecución de sistemas). Sin lógica de juego.
2. **Dominios por carpeta**: cada feature (animación, combate, input, física, colisión, render, armas) es **un dominio**. Sistemas, state machine, condiciones, combos y helpers viven **dentro** de esa carpeta. No hay `conditions/`, `states/` ni `combos/` sueltos en la raíz del ECS.
3. **Componentes = datos puros**: una sola carpeta `components/` en la raíz del ECS; no se reparten por dominio.
4. **Carga de assets fuera del ECS**: ya cubierto en rendering/loaders/.
5. **Factories en el borde**: crean entidades desde datos externos (DTOs); dependen de core, components y rendering/loaders/.

### Árbol de `rendering/ecs/`

```
rendering/
  loaders/                    # Fuera del ECS
    model-loader.js
    model-cache.js
    model-utils.js
    bones-utils.js
    vertex-groups-utils.js

  ecs/
    core/                     # Núcleo del motor ECS
      world.js                # (o manager.js) entidades, componentes, queries, cache, run systems
      system.js                # clase base System
      query.js                 # (opcional)

    components/               # Solo datos; un archivo por componente
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
        systems/               # AnimationStateSystem, AnimationMixerSystem
        state-machine/         # StateRegistry, AnimationState, conditions/, condition-factory
        helpers/
      combat/
        systems/               # CombatSystem, ComboSystem
        combos/                # ComboManager, ComboChain, InputBuffer
        helpers/
      input/
        systems/
        helpers/
      physics/
        systems/
        helpers/
      collision/
        systems/
        helpers/
      render/
        systems/
      weapon/
        systems/
        helpers/

    factories/                 # Creación de entidades desde datos externos
      player-factory.js
      index.js
```

### Por qué esta organización del ECS

| Decisión | Por qué |
|----------|---------|
| **core/ mínimo** | Solo world (o manager), system base y opcionalmente query. Define la API del ECS (crear entidad, añadir componente, query, run systems). Cualquier lógica de juego va en domains/, no en core. Así el núcleo es estable y testeable por separado. |
| **components/ en la raíz** | Los componentes son **datos compartidos** entre varios dominios (p. ej. Position, Physics los usan input, physics, collision, render). Si se repartieran por dominio, habría dependencias cruzadas. Una sola carpeta de componentes evita eso y deja claro que “componente = dato puro”. |
| **domains/ por feature** | En la estructura anterior, `conditions/`, `states/` y `combos/` estaban en la raíz del ECS y era difícil saber a qué “feature” pertenecían. Agrupando por dominio: **animación** incluye systems + state-machine (states + conditions) + helpers; **combate** incluye systems + combos + helpers. Para entender “cómo funciona la animación” solo se abre `domains/animation/`. |
| **state-machine dentro de animation** | Las condiciones (Input, Physics, Movement, Combo, Combat, Water) son **solo para transiciones de animación**. No son condiciones genéricas del ECS. Por eso viven en `domains/animation/state-machine/conditions/`. StateRegistry y AnimationState también; AnimationStateSystem los usa. |
| **combos dentro de combat** | ComboManager, ComboChain e InputBuffer son lógica de **combate** (secuencias de inputs). Por eso viven en `domains/combat/combos/`. ComboSystem y CombatSystem están en el mismo dominio. |
| **helpers dentro de cada dominio** | Cada sistema puede tener lógica auxiliar (resolvers, validadores, aplicadores). Esa lógica vive en `domains/<nombre>/helpers/` para no mezclar helpers de animación con los de combate en una carpeta global. Un dominio no importa helpers de otro; se comunican solo por componentes. |
| **factories/ en la raíz del ECS** | Las factories crean entidades desde fuera (p. ej. PlayerFactory recibe datos del personaje del caso de uso spawnPlayer). Dependen de core, components y rendering/loaders/. No dependen de domains (los sistemas procesan las entidades después). Estar en la raíz de ecs/ deja claro que son el “borde” entre application y ECS. |

### Reglas de dependencias del ECS

- **core**: no importa domains ni components (solo define la API).
- **components**: no importan core ni domains; solo datos y quizá config.
- **domains/<nombre>**: puede importar core, components, config, shared, rendering/scene/, y **dentro del mismo dominio** (systems → state-machine/combos/helpers). Un dominio **no** importa otro dominio.
- **factories**: importan core, components, rendering/loaders/. No importan domains.
- **rendering/loaders/**: no conoce ECS; solo carga y cachea recursos 3D.

---

## 4. Cómo encaja el ECS con el resto de la app

El ECS no vive solo: está dentro de `rendering/` y se relaciona con App, application, driving, state y config.

### Quién hace qué con el ECS

| Capa | Relación con el ECS |
|------|---------------------|
| **main.js** | No toca el ECS. Solo arranca App y llama `app.start()`. |
| **app.js** | **Crea** el ECS (World), scene, loaders, terrain, world, inputManager. **Registra** sistemas en el ECS e inyecta scene, inputManager, collisionDetector, etc. **Llama** a casos de uso pasándoles `ecs` y `scene` (p. ej. `spawnPlayer(ports, store, ecs, scene)`). No actualiza el ECS en cada frame; eso lo hace el game loop. |
| **application/** | **Alimenta** el ECS: `spawnPlayer` obtiene datos del personaje (ports/store), llama a `PlayerFactory` con esos datos y el ECS crea la entidad. Los casos de uso reciben `ecs` y `scene` por parámetro cuando deben crear entidades. |
| **ports/ y adapters/** | El ECS no los conoce. Solo application y App los usan; los datos llegan al ECS vía factories o store. |
| **driving/game/** | **Actualiza** el ECS cada frame: `ecs.update(deltaTime)`. |
| **driving/input/** | App instancia InputManager y lo **inyecta** en el ECS (InputSystem). El ECS lee input; no crea ni posee el InputManager. |
| **driving/ui/** | Paneles (F3, F6, estado personaje) pueden **leer** el ECS para inspección. No modifican el ECS. |
| **rendering/loaders/** | **Hermano** del ECS. Factories y sistemas de render/weapon importan loaders. |
| **rendering/scene/** | El ECS **añade** objetos a la escena (RenderSystem, PlayerFactory). App crea la escena y la pasa al ECS. |
| **rendering/terrain/** | **Hermano** del ECS. Se actualiza por separado en el game loop. |
| **rendering/world/** | **Consume** datos del ECS: CameraController y CollisionDetector reciben la entidad del jugador o su posición. |
| **state/** | El ECS no importa el store. Application escribe; UI y App leen. |
| **config/ y shared/** | El ECS **importa** config y shared para sistemas, helpers y factories. |

### Flujo resumido (quién toca el ECS)

1. **App constructor / bootstrap**: crea scene, loaders, ecs (World), terrain, world, inputManager. Registra sistemas en el ECS inyectando scene, inputManager, collisionDetector, etc. No crea entidades todavía.
2. **App.start()**: llama `loadWorld(ports, store)` → store y terrain; luego `spawnPlayer(ports, store, ecs, scene)` → caso de uso usa ports, obtiene datos del personaje, llama `PlayerFactory(ecs, scene, loaders, characterData)` → se crea la entidad jugador en el ECS.
3. **Game loop** (driving/game/): cada frame `ecs.update(dt)`, `terrain.update(dt)`, `cameraController.update(dt)`, `celestialRenderer.update(dt)`, etc.
4. **Paneles (F3, F6)**: si inspeccionan entidades, reciben la referencia al `ecs` desde App y solo leen (queries, getComponent).

---

## 5. Por qué esta estructura

### Frontend global (Hexagonal + capas)

- **Alineación con el backend:** Puertos = contratos; adapters = implementaciones (HTTP, WebSocket); casos de uso sin conocer URLs; dominio sin Three ni fetch. Misma mentalidad que Hexagonal + DDD del backend.
- **Testabilidad:** Casos de uso y App reciben ports inyectados; en tests se inyectan mocks. Las UIs leen store y config; se pueden probar con store/config de prueba.
- **Escalabilidad:** Nuevas features (auth, realtime, inventario, constructor) = nuevos ports + casos de uso + opcionalmente UI en driving/ui/. No requiere reestructurar.
- **Reutilización de UI:** Una sola BaseInterface para F3, F6, config, personaje, inventario y constructor. Config como única fuente de parametrización.

### Rendering (loaders fuera del ECS, ecs/scene/terrain/world hermanos)

- **Responsabilidad clara:** Loaders = infraestructura de assets. ECS = motor de entidades/componentes/sistemas. Scene, terrain y world = contenedor, partículas y cámara/colisiones/cielo. Cada uno tiene un sitio y no se mezcla con “modelos de dominio”.
- **Sin confusión de nombres:** “models” dentro del ECS sonaba a domain; al sacarlos a rendering/loaders/ queda claro que son carga de GLB/GLTF.

### ECS (dominios por carpeta, núcleo mínimo, factories en el borde)

- **Un dominio = una carpeta:** Para animación o combate, todo está junto (systems, state-machine/combos, helpers). No hay que saltar entre carpetas sueltas como conditions/, states/, combos/.
- **Ninguna carpeta genérica en la raíz del ECS:** conditions, states y combos quedan acotados a animation y combat.
- **Escalabilidad del ECS:** Un nuevo dominio (p. ej. daño por partes del cuerpo) = `domains/limb-damage/` con sus systems y helpers, sin tocar core ni la raíz.
- **Dependencias controladas:** Un dominio no importa otro; se comunican por componentes. Core no conoce domains. Factories solo crean entidades; los sistemas las procesan después.

---

## 6. Terrain, world, state, config: ¿desde cero o así están bien?

No hace falta repensarlos desde cero. La estructura actual de **terrain**, **world**, **state** y **config** es coherente y suficiente; solo conviene refinarlos si crecen mucho.

### Terrain (`rendering/terrain/`)

**Estructura actual (y elegida):** manager + components + systems + renderers + optimizations + utils. TerrainManager recibe el **port** de particles inyectado por App; no llama al API directamente.

| ¿Desde cero? | Conclusión |
|--------------|------------|
| **No hace falta.** | Terrain ya tiene un patrón claro: un “motor” (manager) que orquesta componentes, sistemas y renderers de partículas, con optimizaciones y utilidades aparte. No mezcla responsabilidades como el ECS antiguo (conditions/states/combos sueltos). Es un solo “dominio” (terreno/partículas), no varios features como animación vs combate. |
| **Cuándo repensar** | Si terrain crece mucho (p. ej. varios tipos de terreno, agua, vegetación, redes de navegación), se podría agrupar en subcarpetas por subdominio (terrain/particles/, terrain/lod/, terrain/culling/) o por tipo de contenido. Hoy no es necesario. |

**Resumen:** Así como está está bien. Port inyectado, manager + systems + renderers; sin cambios de estructura.

---

### World (`rendering/world/`)

**Estructura actual (y elegida):** cuatro módulos en plano: camera-controller, collision-detector, celestial-system, celestial-renderer.

| ¿Desde cero? | Conclusión |
|--------------|------------|
| **No hace falta.** | Cada archivo tiene una responsabilidad clara: cámara sigue al jugador, colisiones con terreno, lógica sol/luna, render del cielo. Son pocos archivos y no compiten por el mismo concepto (no hay “conditions” o “states” genéricos). |
| **Cuándo repensar** | Si se añaden más sistemas de “mundo” (clima, ciclo día/noche más complejo, audio por zona), se podría agrupar en subcarpetas (world/camera/, world/collision/, world/celestial/, world/weather/). Con cuatro archivos, plano está bien. |

**Resumen:** Estructura plana está bien. Sin rediseño desde cero.

---

### State (`state/`)

**Estructura actual (y elegida):** store + actions + selectors (y opcionalmente slices o subdividir por dominio).

| ¿Desde cero? | Conclusión |
|--------------|------------|
| **No hace falta.** | Un store global con actions y selectors es un patrón estándar. Application escribe (loadWorld, spawnPlayer actualizan store); UI y App leen vía selectors. El ECS no importa el store; eso evita acoplamiento. |
| **Cuándo repensar** | Si el store se vuelve muy grande, se puede dividir en “slices” (worldSlice, playerSlice, uiSlice) o en módulos (state/world/, state/player/, state/ui/) que exporten acciones y selectores. No es obligatorio hoy. |

**Resumen:** Store + actions + selectors está bien. Sin rediseño desde cero.

---

### Config (`config/`)

**Estructura actual (y elegida):** carpeta plana con archivos: constants, animation-config, animation-constants, combat-*, combo-config, input-*, ecs-constants, particle-optimization-config, weapon-*, debug-config, etc.

| ¿Desde cero? | Conclusión |
|--------------|------------|
| **No hace falta.** | Config son datos; no hay lógica mezclada. Una carpeta plana es fácil de buscar (animation-config, combat-*, ecs-constants). Agrupar por dominio (config/animation/, config/combat/, config/ecs/) podría reflejar los dominios del ECS pero añade un nivel de indirección sin mucho beneficio con el tamaño actual. |
| **Cuándo repensar** | Si hay muchas decenas de archivos de config, agrupar por dominio (config/animation/, config/combat/, config/ecs/, config/terrain/) puede ayudar. Hoy plano es suficiente. |

**Resumen:** Config plana está bien. Sin rediseño desde cero.

---

### Tabla resumen

| Módulo | ¿Desde cero? | Estructura elegida | Cuándo revisar |
|--------|--------------|--------------------|----------------|
| **terrain** | No | manager + components + systems + renderers + optimizations + utils; port inyectado | Si crece (varios tipos de terreno, agua, etc.) → subcarpetas por subdominio |
| **world** | No | Plano: camera-controller, collision-detector, celestial-system, celestial-renderer | Si crece (clima, tiempo, audio) → subcarpetas world/camera/, world/celestial/, etc. |
| **state** | No | store + actions + selectors | Si el store crece mucho → slices o state/world/, state/player/, etc. |
| **config** | No | Carpeta plana con archivos por tema (animation, combat, ecs, input, …) | Si hay muchas decenas de archivos → config/animation/, config/combat/, etc. |

**Conclusión:** Terrain, world, state y config **así como están documentados están bien**. No hace falta repensarlos desde cero como al ECS; el ECS era el que tenía carpetas mezcladas (conditions, states, combos, models) y responsabilidades poco claras. Terrain, world, state y config ya tienen un rol y una forma claros; solo conviene ajustar si el proyecto crece.

---

**Resumen:** La estructura elegida separa **orquestación** (App, application), **entrada** (driving), **negocio** (domain), **contratos** (ports), **implementaciones externas** (adapters) y **renderizado** (rendering con loaders, ecs, scene, terrain, world). Dentro de rendering, el ECS tiene un **núcleo mínimo**, **componentes compartidos** y **dominios por feature** (animación, combate, input, etc.), con **loaders fuera** y **factories en el borde**. **Terrain, world, state y config** se dejan como están (manager + systems para terrain; plano para world; store + actions + selectors para state; config plana); no hace falta repensarlos desde cero, solo refinarlos si crecen. Así se mantiene un patrón claro, testeable y alineado con el backend.
