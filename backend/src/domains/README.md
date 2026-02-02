# API por Dominio (Hexagonal + DDD)

Estructura por dominio: cada recurso tiene su carpeta bajo `domains/` con **schemas** (DTOs), **routes** (adaptador HTTP), y donde aplica **application/** (casos de uso) e **infrastructure/** (adaptadores de persistencia). Los schemas compartidos están en **shared/**.

**Regla Hexagonal:** Ningún archivo en `domain/` ni `application/` importa `asyncpg`, `get_connection`, `FastAPI` o `APIRouter`. Solo `infrastructure/` y `routes.py` conocen infra; `routes.py` solo traduce HTTP ↔ casos de uso.

**Separación de responsabilidades:**
- **`domains/<nombre>/`** = domain/ (opcional), application/ports/ (interfaces), application/ (casos de uso), infrastructure/ (PostgresXxxRepository), schemas.py, routes.py.
- **`domains/shared/`** = Schemas compartidos (geometría, estilos, parse_jsonb_field), PerformanceMonitorService, WorldBloque, WorldBloqueManager (inyección de IBloqueConfigProvider), puertos IBloqueConfigProvider e ITemperatureCalculator.
- **`world_creation_engine/`** = Motor de creación del mundo (templates, builders, creators). La ruta create_character usa el puerto ICharacterCreationPort (EntityCreationAdapter usa EntityCreator internamente).

## Estructura por dominio (Hexagonal + DDD)

```
domains/
├── shared/          # Sin persistencia propia; schemas y helpers
├── bloques/          # IBloqueRepository, casos de uso, PostgresBloqueRepository
├── particles/        # IParticleRepository, casos de uso, PostgresParticleRepository
├── agrupaciones/     # IAgrupacionRepository, casos de uso, PostgresAgrupacionRepository
├── characters/       # ICharacterRepository + ICharacterCreationPort; create_character vía EntityCreationAdapter
└── celestial/        # Casos de uso (state, temperature); tarea background temperatura usa IParticleRepository
```

Cada dominio que migró tiene:
- **application/ports/** — Puerto de salida (ej. `IBloqueRepository`).
- **application/** — Casos de uso (ej. `get_bloques`, `get_bloque_by_id`).
- **infrastructure/** — Adaptador (ej. `PostgresBloqueRepository`) que usa `get_connection()` y SQL.
- **routes.py** — `Depends(get_*_repository)` y llamada a casos de uso; sin SQL ni `get_connection`.

## Endpoints

| Recurso      | Prefijo | Rutas principales |
|-------------|---------|-------------------|
| Bloques     | `/api/v1` | `GET /bloques`, `GET /bloques/{id}`, `GET /bloques/world/size` |
| Partículas  | `/api/v1` | `GET /bloques/{id}/particles`, `GET /bloques/{id}/particle-types` |
| Agrupaciones| `/api/v1` | `GET /bloques/{id}/agrupaciones`, `GET /bloques/{id}/agrupaciones/{aid}` |
| Characters  | `/api/v1` | `GET/POST /bloques/{id}/characters`, `GET .../characters/{id}/model` |
| Celestial   | `/api/v1` | `GET /celestial/state`, `POST /celestial/temperature` |

## Imports

- DTOs: `from src.domains.<dominio>.schemas import ...`
- Compartidos: `from src.domains.shared.schemas import ...`
- Puertos: `from src.domains.<dominio>.application.ports.<nombre>_repository import I...Repository`
- Casos de uso: `from src.domains.<dominio>.application.<nombre> import ...`
- Adaptadores: `from src.domains.<dominio>.infrastructure.postgres_<nombre>_repository import Postgres...Repository`
