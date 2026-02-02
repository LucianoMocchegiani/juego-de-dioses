# Análisis de Arquitectura - Preparación para Mesh Builder (Partículas y Diseño) (JDG-064)

## Objetivo del análisis

Identificar **qué falta en el proyecto** (partículas, mundo, diseño) y **qué hay que hacer o adaptar** para integrar una **fase inicial** del constructor in-game (mesh-builder): recetas, piezas mesh, colocación/apilado. Referencia: [Juego de Dioses/Ideas/53-Constructor-In-Game-Recetas-Piezas-Mesh.md](../../../Juego de Dioses/Ideas/53-Constructor-In-Game-Recetas-Piezas-Mesh.md) y carpeta [mesh-builder](../../../Juego de Dioses/mesh-builder/).

---

## Situación Actual

### Backend

**Estructura actual relevante:**
```
backend/src/
├── api/routes/
│   ├── particles.py      # GET partículas por viewport, GET particle-types; validación de posición
│   ├── agrupaciones.py    # GET list agrupaciones, GET agrupación con partículas (sin geometria_agrupacion/modelo_3d)
│   ├── characters.py     # GET character(s) con geometria_agrupacion y modelo_3d
│   └── dimensions.py     # Bloques/dimensiones
├── services/
│   ├── particula_service.py
│   ├── world_bloque.py
│   └── world_bloque_manager.py
├── database/
│   ├── builders/         # TreeBuilder (no escribe geometria_agrupacion), BipedBuilder (sí, para bipeds)
│   ├── creators/
│   └── seed_terrain_*.py # Crean partículas y agrupaciones vía scripts
└── models/schemas.py     # ParticleResponse, AgrupacionResponse (sin geometria/modelo_3d en AgrupacionResponse)
```

**Problemas identificados (para mesh-builder):**

1. **No hay API de escritura para partículas:** Solo GET por viewport. Existe `validate_particle_position` pero no hay endpoint POST para crear/actualizar partículas desde el cliente. El comentario en código indica "cuando se implemente".
2. **No hay API de escritura para agrupaciones desde el juego:** Las agrupaciones se crean solo vía scripts (seed_terrain, seed_character, builders). No hay endpoint POST/PUT para que el cliente cree una agrupación (ej. una "pieza" colocada).
3. **Uso real de `geometria_agrupacion`:** En el código actual **no se usa en el flujo de terreno**. Solo la API de **characters** (bipeds) devuelve `geometria_agrupacion` y `modelo_3d`; el **player-factory** los usa con prioridad `modelo_3d` > `geometria_agrupacion` > default (y en la práctica los personajes usan GLB, así que el fallback a geometria_agrupacion casi no se usa). **TreeBuilder** no escribe `geometria_agrupacion`; los árboles se renderizan como partículas por tipo. **TerrainManager** siempre pasa `null` como `agrupacionesGeometria` al ParticleRenderer, así que el soporte de geometría por agrupación en el renderer nunca se alimenta. Para mesh-builder **no es obligatorio** exponer geometría en GET agrupaciones: la forma puede vivir en la **receta** (campo `forma`) y el frontend obtiene la forma vía GET receta(receta_id).
4. **No existen tablas de recetas ni de piezas:** No hay entidad "receta" (material + proceso + forma) ni "pieza" como blueprint. Todo lo que hay es `tipos_particulas`, `transiciones_particulas`, `agrupaciones` (con geometria/modelo_3d por fila pero sin concepto de "receta reutilizable").
5. **No hay concepto de "proceso" de fabricación:** La tabla `transiciones_particulas` modela cambios de tipo por temperatura/integridad, pero no "proceso" (sustractivo, fundición, forja) ni pérdida de material asociada a una receta.
6. **Tipos de partículas sí están listos para materiales:** `tipos_particulas` tiene densidad, dureza, punto_fusion, etc., adecuados para usarlos como materiales de recetas; falta solo el enlace receta → tipo_particula y proceso.

### Frontend

**Estructura actual relevante:**
```
frontend/src/
├── terrain/
│   ├── manager.js              # TerrainManager: carga partículas, llama renderer con agrupacionesGeometria = null
│   ├── renderers/particle-renderer.js  # Instancing, LOD, soporta agrupacionesGeometria si se pasa
│   ├── api/particles-client.js  # getParticles, getParticleTypes; updateParticle/deleteParticle = TODO
│   └── systems/
├── api/endpoints/
│   ├── particles.js             # getParticles, getParticleTypes
│   └── agrupaciones.js          # (si existe) list/get agrupaciones
├── ecs/                         # Personajes (bipeds) con modelos GLB desde characters API
└── scene.js
```

**Problemas identificados (para mesh-builder):**

1. **`agrupacionesGeometria` siempre es null:** En `TerrainManager` se llama a `renderParticles(..., null)` para agrupacionesGeometria. El renderer sí soporta un `Map` de geometría por agrupación, pero nunca se alimenta porque la API de agrupaciones no devuelve geometría/modelo_3d para no-character.
2. **No hay modo construcción ni colocación:** No existe UI ni flujo para "colocar pieza en el mundo", snap a grid, ni selección de receta/pieza para colocar.
3. **No hay cliente para crear/actualizar partículas o agrupaciones:** `ParticlesClient.updateParticle` y `deleteParticle` están como TODO y no implementados. No hay cliente para POST agrupación o POST partículas en batch.
4. **Renderizado de agrupaciones no-character:** Los árboles y otras agrupaciones se renderizan como partículas con estilo por tipo. Ni TreeBuilder ni el flujo de terreno usan `geometria_agrupacion`; solo characters/ECS (y ahí prioritariamente modelo_3d GLB).
5. **Falta capa de "piezas colocables":** No hay entidades ECS ni capa de escena dedicada a "objetos colocados por el jugador" (mesh instanciado por receta) separada del terreno de partículas; podría reutilizar agrupaciones con modelo_3d o nueva entidad "placed_piece".

### Base de Datos

**Estructura actual relevante:**
```sql
-- Existe y es adecuado para materiales
tipos_particulas (id, nombre, tipo_fisico, densidad, dureza, punto_fusion, color, geometria JSONB, ...)
transiciones_particulas (tipo_origen_id, tipo_destino_id, condicion_temperatura, valor_temperatura, ...)

-- Existe: partículas por celda
particulas (id, bloque_id, celda_x, celda_y, celda_z, tipo_particula_id, agrupacion_id, ...)

-- Existe: agrupaciones con geometría y modelo 3D
agrupaciones (id, bloque_id, nombre, tipo, geometria_agrupacion JSONB, modelo_3d JSONB, posicion_x/y/z, ...)

bloques (id, tamano_celda, ancho_metros, alto_metros, ...)
```

**Problemas identificados (para mesh-builder):**

1. **No existe tabla `recetas`:** No hay entidad que una: nombre, categoría (arma/herramienta/construcción/estatua), material (tipo_particula_id o derivado), proceso (sustractivo/fundición/forja), forma (mesh o referencia a geometría), pérdida, creador, etc.
2. **No existe tabla `piezas` o `blueprints`:** No hay entidad "pieza" como resultado de una receta (mesh + metadatos reutilizable). Hoy una "pieza" colocada sería una fila en `agrupaciones` con tipo "pieza" o "construccion", pero no hay FK a "receta" ni concepto de "instancia de receta".
3. **Agrupaciones no distinguen "pieza UGC" vs árbol/personaje:** El campo `tipo` es genérico (arbol, biped, etc.). Para mesh-builder convendría tipo "pieza" o "construccion" y, opcionalmente, `receta_id` (FK a recetas) para saber qué receta generó esa colocación.
4. **No hay tabla de procesos de fabricación:** "Proceso" (sustractivo, fundición, forja) podría ser tabla o enum; hoy no existe. La lógica material–proceso está solo en documento de Ideas/53.

---

## Necesidades Futuras (para fase inicial del mesh-builder)

### Categorías de entidades/funcionalidades

1. **Recetas (nuevo)**  
   - Entidad: receta = nombre, categoría, material (tipo_particula_id o material_derivado), proceso, forma (geometría o mesh), pérdida, creador.  
   - Requisitos: persistencia en BD, API CRUD (como mínimo crear y listar), validación material–proceso según Ideas/53.

2. **Piezas colocadas (extensión de agrupaciones)**  
   - Entidad: pieza colocada = agrupación con tipo "pieza", receta_id, posición, bloque_id.  
   - Requisitos: poder crear desde cliente (POST). Para renderizar: la **forma** puede obtenerse desde **GET receta(receta_id)** (campo `forma`), sin necesidad de duplicar geometría en la agrupación ni de exponer `geometria_agrupacion` en GET agrupaciones. Opcionalmente se puede copiar forma a agrupacion al crear la pieza si más adelante se prefiere no hacer GET receta por cada pieza (trade-off: duplicación vs. una petición más).

3. **Partículas creadas por colocación/construcción**  
   - Requisitos: API para crear/actualizar partículas en batch (o por celda) para soportar "colocar bloque de tierra" o "consumir materiales"; validación de posición y límites.

4. **Forma de las piezas (desde receta, no desde agrupaciones)**  
   - La forma (mesh/geometría) de una pieza colocada puede vivir **solo en la receta** (campo `forma`). GET receta devuelve `forma`; el frontend, para cada agrupación con receta_id, obtiene la forma vía GET receta y renderiza. **No es necesario** exponer `geometria_agrupacion` ni `modelo_3d` en la API genérica de agrupaciones para mesh-builder.

5. **Proceso de fabricación (dato)**  
   - Requisitos: modelo de "proceso" (tabla o enum) y reglas material–proceso en backend para validar recetas; pérdida por proceso (valores o fórmula) según Ideas/53.

### Requisitos de escalabilidad

1. **Añadir categorías de receta sin romper:** Diseño de recetas que permita categoría (arma, herramienta, construcción, estatua) y subcategoría sin cambiar esquema cada vez.
2. **Reutilización:** Receta → muchas piezas colocadas (instancias); un mesh por receta, N instancias en escena (instancing).
3. **Separación:** Lógica de "qué se puede fabricar" (material, proceso, pérdida) en backend; frontend solo editor de forma y envío de receta/pieza.
4. **Extensibilidad:** Futuro soporte para comercialización de recetas (ownership, permisos) sin reescribir el modelo de recetas.

---

## Arquitectura propuesta (preparación para fase inicial)

### Base de datos – extensiones mínimas

```
-- Nueva tabla: recetas (fase inicial simplificada)
recetas (
  id UUID PK,
  nombre VARCHAR(255),
  categoria VARCHAR(50),        -- 'arma'|'herramienta'|'construccion'|'estatua'
  subcategoria VARCHAR(100),   -- opcional: 'ladrillo', 'espada', ...
  tipo_particula_id UUID FK tipos_particulas,  -- material
  proceso VARCHAR(50),          -- 'sustractivo'|'fundicion'|'forja'|...
  forma JSONB,                  -- geometría o referencia a mesh (igual que geometria_agrupacion o modelo_3d)
  perdida_porcentaje DECIMAL,
  creador_id UUID,              -- opcional
  creado_en TIMESTAMP
);

-- Extensión agrupaciones (opcional para fase inicial)
ALTER TABLE agrupaciones ADD COLUMN receta_id UUID REFERENCES recetas(id);
-- Así una pieza colocada es una agrupación con tipo='pieza' y receta_id no null.
```

- **Procesos:** Pueden ser enum o tabla pequeña `procesos_fabricacion (id, nombre)` y FK en recetas. Para fase inicial, `proceso VARCHAR(50)` es suficiente.
- **Piezas colocadas:** Usar `agrupaciones` con `tipo = 'pieza'` y `receta_id`. La forma se obtiene de la receta (GET receta devuelve `forma`); no es obligatorio duplicar en agrupacion.geometria_agrupacion.

### Backend – estructura sugerida

```
backend/src/
├── api/routes/
│   ├── particles.py     # AÑADIR: POST crear/actualizar partículas (batch o por celda) con validación
│   ├── agrupaciones.py  # AÑADIR: POST crear agrupación (pieza con receta_id). No es necesario que GET agrupaciones devuelva geometria/modelo_3d; la forma viene de GET receta(receta_id).forma
│   ├── recetas.py       # NUEVO: GET list, GET by id, POST crear receta (validación material–proceso)
│   └── ...
├── services/
│   ├── receta_service.py  # NUEVO (opcional): validar material–proceso, calcular pérdida
│   └── ...
└── models/
    └── schemas.py        # AÑADIR: RecetaCreate, RecetaResponse (con campo forma). AgrupacionResponse con receta_id opcional; geometria_agrupacion/modelo_3d no necesarios para piezas (forma desde receta)
```

- **Prioridad para fase inicial:**  
- Tabla `recetas` con campo `forma` (JSONB) + endpoint POST/GET recetas (GET devuelve forma para que el frontend renderice piezas).  
- POST agrupación (pieza colocada) con receta_id y posición; no es obligatorio rellenar geometria_agrupacion en agrupación (la forma se obtiene de la receta).  
- POST partículas (aunque sea un endpoint mínimo para "colocar celdas") si la fase inicial incluye colocación de bloques de partículas.

### Frontend – adaptaciones sugeridas

```
frontend/src/
├── terrain/
│   ├── manager.js       # ADAPTAR: Obtener agrupaciones con geometría (nuevo endpoint o mismo con query param) y pasar agrupacionesGeometria al renderer
│   └── ...
├── api/endpoints/
│   ├── recetas.js       # NUEVO: getRecetas, getReceta, createReceta
│   ├── agrupaciones.js  # AÑADIR: createAgrupacion (pieza colocada)
│   └── particles.js     # AÑADIR (cuando backend exista): createParticles, updateParticle
└── (futuro) mesh-builder/ o construction/  # Modo constructor: UI editor, colocación, snap (fase posterior)
```

- **Prioridad para fase inicial:**  
  - Para piezas: GET agrupaciones (con receta_id), GET receta(receta_id) para obtener forma, y renderizar piezas (capa propia o instancing por receta). No es necesario usar agrupacionesGeometria del ParticleRenderer si se prefiere una capa separada de "piezas colocadas".  
  - Cliente API para recetas y para crear agrupación (pieza).  
  - No es obligatorio en fase inicial tener el editor in-game completo; puede ser "colocar pieza desde lista de recetas" primero.

---

## Patrones de diseño a usar

1. **Registry / catálogo de recetas:** Listar recetas por categoría; el cliente elige receta y pide "colocar" → backend crea agrupación con forma de esa receta.
2. **Validación en backend:** Reglas material–proceso (tabla o servicio) según Ideas/53; no confiar solo en frontend.
3. **Instancing:** Una receta = un mesh; N piezas colocadas = N instancias del mismo mesh (ya usado en particle-renderer; reutilizar concepto para piezas).
4. **Separación lectura/escritura:** GET partículas/agrupaciones ya existen; añadir escritura (POST) sin cambiar contratos de lectura.

---

## Migración propuesta (fases)

### Fase 1: Datos y API (preparación)

- Crear tabla `recetas` (y opcional `procesos_fabricacion` o enum).
- Añadir `receta_id` a `agrupaciones` (nullable).
- GET receta por id que devuelva `forma` (geometría/mesh) para que el frontend renderice piezas; GET agrupaciones solo necesita devolver receta_id y posición para piezas (no es obligatorio incluir geometria_agrupacion en la respuesta).
- Endpoint POST receta (validación básica: material existe, proceso permitido).
- Endpoint POST agrupación (crear "pieza colocada" con receta_id y posición; no es obligatorio rellenar geometria en agrupación, la forma se obtiene de GET receta).

### Fase 2: Partículas y colocación

- Endpoint POST (o PATCH) partículas: crear/actualizar celdas con validación de posición (reusar `validate_particle_position`).
- Frontend: cliente para crear agrupación (pieza) y, si aplica, cliente para crear partículas.
- Frontend: para agrupaciones con receta_id, GET receta para obtener forma y pintar piezas (instancing por receta); no depende de que GET agrupaciones devuelva geometria_agrupacion.

### Fase 3: Editor in-game (mesh-builder propiamente dicho)

- UI de constructor: elegir material, proceso, definir forma (mesh/voxel simplificado), guardar receta.
- Modo colocación: elegir receta, snap a grid, colocar pieza (POST agrupación + quizá partículas de soporte).
- Límites y validación según mesh-builder/limites-y-reglas.md.

---

## Consideraciones técnicas

### Backend

1. **Compatibilidad:** Recetas y piezas como extensión; no eliminar ni romper agrupaciones/partículas existentes.  
2. **Base de datos:** Migración con `ADD COLUMN` y nueva tabla; índices por `recetas.categoria`, `agrupaciones.receta_id`.  
3. **APIs:** GET agrupaciones puede seguir sin devolver geometria_agrupacion; la forma de las piezas se obtiene de GET receta(receta_id).forma.  
4. **Seguridad:** Validar tamaño de forma (JSONB), límites de triángulos/vértices si se almacena mesh; no confiar en cliente.

### Frontend

1. **Renderizado:** Reutilizar instancing y LOD del particle-renderer para piezas; o capa separada de "objetos colocados" si se prefiere no mezclar con partículas.  
2. **Rendimiento:** Límites por zona (máx. piezas visibles) según limites-y-reglas.md; LOD por distancia para piezas grandes (estatuas).  
3. **Extensibilidad:** Preparar para que el editor de forma (mesh/voxel) sea un módulo que consuma recetas y envíe POST receta / POST agrupación.

---

## Resumen: qué hacer o adaptar para fase inicial

| Área | Qué falta | Qué hacer o adaptar |
|------|-----------|----------------------|
| **BD** | Tabla recetas; receta_id en agrupaciones | Migración: crear `recetas`, añadir `receta_id` a `agrupaciones`. |
| **Backend** | API escritura agrupaciones; API recetas con campo forma | POST agrupación (pieza con receta_id); GET/POST recetas (GET devuelve forma). No es necesario exponer geometria_agrupacion en GET agrupaciones. |
| **Frontend** | Cliente recetas y colocación; renderizar piezas desde forma de receta | Cliente getReceta (obtiene forma), createReceta, createAgrupacion. Para piezas: GET agrupaciones con receta_id + GET receta por id para forma; renderizar (instancing por receta). No depende de agrupacionesGeometria. |
| **Diseño** | Proceso y material–proceso como dato | Tabla o enum proceso; validación en backend según Ideas/53; pérdida por proceso en recetas. |

---

## Conclusión

El juego ya tiene **partículas**, **tipos_particulas**, **agrupaciones** (con columnas geometria_agrupacion y modelo_3d en BD, pero **solo usadas por la API de characters** y player-factory como fallback; el flujo de terreno no las usa). Para una **fase inicial** del mesh-builder falta sobre todo:

1. **Modelo de recetas y piezas** (tabla recetas con campo `forma`, vínculo receta–agrupación vía receta_id).  
2. **APIs de escritura** (crear agrupación como pieza, crear receta). GET receta debe devolver `forma` para que el frontend dibuje piezas; **no es necesario** exponer geometria_agrupacion en GET agrupaciones.  
3. **Validación material–proceso** y **proceso** como dato en backend.

Con eso se puede preparar el juego para "recetas guardadas" y "piezas colocadas" sin tener aún el editor in-game completo; el editor puede llegar en una fase siguiente apoyado en esta base.
