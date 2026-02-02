# Cómo funciona el backend ahora (Hexagonal + DDD)

Resumen de la arquitectura actual y flujo de varios endpoints para entender el patrón.

---

## 1. Idea general

- **Routes** = adaptador de **entrada** (HTTP). Solo traduce: request → parámetros para el caso de uso; respuesta del caso de uso → HTTP (o excepción).
- **Casos de uso** (application/) = orquestan la lógica: reciben un **puerto** (repositorio u otro servicio) inyectado y lo usan. No conocen SQL ni FastAPI.
- **Puertos** (application/ports/) = interfaces (ABC o Protocol). Definen *qué* hace el sistema (listar, obtener por id, crear, etc.).
- **Infrastructure** = adaptadores de **salida**. Implementan los puertos con PostgreSQL (`get_connection()` y SQL). Solo aquí y en `database/` se usa `get_connection()`.

**Regla:** Ningún `routes.py` ni caso de uso importa `get_connection` ni escribe SQL. La inyección se hace con `Depends(get_*_repository)` o `Depends(get_*_port)`.

---

## 2. Flujo A: endpoint simple (solo lectura)

**Ejemplo: `GET /api/v1/bloques` — listar todos los bloques**

```
Cliente HTTP
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  routes.py (bloques)                                             │
│  - list_dimensions(repository = Depends(get_bloque_repository))  │
│  - return await get_bloques(repository)                          │
└─────────────────────────────────────────────────────────────────┘
    │
    │  repository es PostgresBloqueRepository (inyectado por FastAPI)
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  application/get_bloques.py (caso de uso)                        │
│  - get_bloques(repository: IBloqueRepository)                     │
│  - return await repository.list_all()                            │
└─────────────────────────────────────────────────────────────────┘
    │
    │  repository implementa IBloqueRepository
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  infrastructure/postgres_bloque_repository.py                    │
│  - list_all() → async with get_connection() as conn → SQL        │
│  - devuelve List[DimensionResponse]                              │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
  Respuesta HTTP 200 + JSON (lista de bloques)
```

**Resumen:** HTTP → route → caso de uso → **puerto** (repositorio) → adaptador Postgres → misma respuesta hacia atrás. La ruta no sabe que existe PostgreSQL.

---

## 3. Flujo B: endpoint con lógica de negocio y otro puerto

**Ejemplo: `POST /api/v1/celestial/temperature` — calcular temperatura en una celda**

El caso de uso necesita **dos** dependencias: el servicio de tiempo celestial (estado en memoria) y el repositorio de partículas (para vecinos y tipos).

```
Cliente HTTP (body: bloque_id, x, y, z, tipo_particula_superficie?)
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  routes.py (celestial)                                           │
│  - calculate_temperature_route(                                  │
│      request,                                                    │
│      service = Depends(get_celestial_service),                   │
│      particle_repo = Depends(get_particle_repository)            │
│    )                                                             │
│  - return await calculate_temperature_use_case(                 │
│        service, request, particle_repo                          │
│    )                                                             │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  application/calculate_temperature.py (caso de uso)              │
│  - calculate_temperature_use_case(service, request, particle_repo)│
│  - Valida bloque_id (UUID)                                       │
│  - temperatura = await calculate_cell_temperature(               │
│        ..., celestial_time_service=service,                     │
│        particle_repo=particle_repo, ...                          │
│    )  ← celestial.service (lógica de temperatura)               │
│  - return TemperatureResponse(temperatura=..., x=..., y=..., z=)│
└─────────────────────────────────────────────────────────────────┘
    │
    │  calculate_cell_temperature usa particle_repo para:
    │  - get_particles_near(...)  (vecinos para modificadores)
    │  - get_particle_type_by_name(...)  (conductividad, albedo)
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  celestial/service.py                                            │
│  - calculate_cell_temperature(..., particle_repo, ...)           │
│  - temp_solar, mod_altitud, mod_albedo, mod_particulas           │
│  - Todo usando particle_repo (no particles.service ni get_connection)
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
  Respuesta HTTP 200 + JSON { temperatura, x, y, z }
```

**Resumen:** La ruta inyecta **servicio** y **repositorio**. El caso de uso llama a la lógica de temperatura (celestial.service) pasándole el repo; esa lógica usa solo el puerto `IParticleRepository`. La base de datos solo se toca dentro de `PostgresParticleRepository`.

---

## 4. Flujo C: endpoint de escritura con puerto de creación

**Ejemplo: `POST /api/v1/bloques/{bloque_id}/characters` — crear personaje**

Aquí no hay “caso de uso” separado: el **puerto** es “crear personaje” y el **adaptador** encapsula toda la lógica (EntityCreator + SQL). La ruta solo llama al puerto.

```
Cliente HTTP (body: CharacterCreate — template_id, x, y, z)
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  routes.py (characters)                                          │
│  - create_character(                                            │
│      character_data, bloque_id,                                  │
│      creation_port = Depends(get_character_creation_port)        │
│    )                                                             │
│  - return await creation_port.create_character(                  │
│        character_data, bloque_id                                 │
│    )                                                             │
│  - Excepciones → HTTP 404/400/500                                │
└─────────────────────────────────────────────────────────────────┘
    │
    │  creation_port es EntityCreationAdapter (implementa ICharacterCreationPort)
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  infrastructure/entity_creation_adapter.py                       │
│  - create_character(character_data, bloque_id)                   │
│  - async with get_connection() as conn:                          │
│      - Comprueba bloque existe                                   │
│      - Valida template (get_biped_template)                      │
│      - EntityCreator(conn, bloque_id).create_entity(...)         │
│      - SELECT agrupación recién creada                          │
│      - Construye CharacterResponse                               │
│  - return CharacterResponse                                      │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
  Respuesta HTTP 201 + JSON (personaje creado)
```

**Resumen:** La ruta **no** usa `get_connection` ni conoce EntityCreator. Solo llama a `ICharacterCreationPort.create_character`. El adaptador es el único que abre conexión y usa EntityCreator; si mañana la creación se hace con otro motor, se cambia solo el adaptador.

---

## 5. Flujo D: lectura con vista (partículas por viewport)

**Ejemplo: `GET /api/v1/bloques/{bloque_id}/particles?x_min=0&x_max=10&...`**

```
Cliente HTTP (query: x_min, x_max, y_min, y_max, z_min, z_max)
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  routes.py (particles)                                           │
│  - get_particles_by_viewport_route(bloque_id, x_min, x_max, ...   │
│      repository = Depends(get_particle_repository))              │
│  - viewport = ParticleViewportQuery(...)                         │
│  - return await get_particles_by_viewport(repository, bloque_id, │
│        viewport)                                                 │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  application/get_particles_by_viewport.py (caso de uso)          │
│  - get_particles_by_viewport(repository, bloque_id, viewport)    │
│  - if not await repository.bloque_exists(bloque_id): raise ...   │
│  - return await repository.get_by_viewport(bloque_id, viewport)  │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  infrastructure/postgres_particle_repository.py                  │
│  - get_by_viewport() → get_connection() → SELECT ... WHERE     │
│    celda_x BETWEEN ... AND celda_y BETWEEN ...                   │
│  - return List[ParticleResponse]                                 │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
  Respuesta HTTP 200 + JSON (lista de partículas en el viewport)
```

---

## 6. Resumen por capa

| Capa            | Responsabilidad                         | Conoce HTTP? | Conoce SQL/DB?   |
|-----------------|------------------------------------------|-------------|------------------|
| **routes.py**   | Traducir HTTP ↔ llamada a caso de uso/puerto | Sí          | No               |
| **application/**| Casos de uso que orquestan con puertos   | No          | No               |
| **ports/**      | Interfaces (qué hacer)                  | No          | No               |
| **infrastructure/** | Implementar puertos con Postgres/get_connection | No       | Sí               |
| **domain/**     | (Opcional) entidades de dominio          | No          | No               |

La **inyección** se hace en la ruta con `Depends(get_*_repository)` o `Depends(get_*_port)`. FastAPI crea una instancia del adaptador (por ejemplo `PostgresBloqueRepository()`) y la pasa al caso de uso o al handler. Así el flujo de un endpoint queda: **HTTP → Route → Caso de uso / Puerto → Adaptador → BD**, y la lógica de negocio no depende de la base de datos ni del framework web.
