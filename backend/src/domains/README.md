# API por Dominio

Estructura por dominio: cada recurso tiene su carpeta bajo `domains/` (en `src`) con **schemas** (DTOs) y **routes** (router FastAPI). Los schemas compartidos están en `shared/`. Aquí vive la **lógica de API**: endpoints, respuestas HTTP, servicios que sirven a las rutas.

**Separación de responsabilidades:**
- **`domains/`** = API: endpoints, schemas, respuestas. Servicios por dominio en **`domains/<dominio>/service.py`** (celestial, particles). Lo cross-cutting (PerformanceMonitorService, WorldBloque, WorldBloqueManager) está en **`domains/shared/`**.
- **`world_creation_engine/`** = motor de creación del mundo (templates, builders, creators). Los dominios y los seeds llaman al engine cuando necesitan crear entidades en el mundo.

## Estructura

```
domains/
├── shared/          # Schemas compartidos (geometría, estilos, parse_jsonb_field)
├── bloques/          # Bloques (dimensiones/mundos): GET /bloques, /bloques/{id}, /bloques/world/size
├── particles/        # Partículas: GET /bloques/{id}/particles, /bloques/{id}/particle-types
├── agrupaciones/     # Agrupaciones: GET /bloques/{id}/agrupaciones, /bloques/{id}/agrupaciones/{aid}
├── characters/       # Personajes (bípedos): GET/POST /bloques/{id}/characters, .../model
└── celestial/        # Tiempo celestial: GET /celestial/state, POST /celestial/temperature
```

Todos los routers se registran en `main.py` con prefijo `/api/v1`. Las URLs y contratos JSON no cambian respecto a la versión anterior.

## Endpoints

| Recurso      | Prefijo | Rutas principales |
|-------------|---------|-------------------|
| Bloques     | `/api/v1` | `GET /bloques`, `GET /bloques/{id}`, `GET /bloques/world/size` |
| Partículas  | `/api/v1` | `GET /bloques/{id}/particles`, `GET /bloques/{id}/particle-types` |
| Agrupaciones| `/api/v1` | `GET /bloques/{id}/agrupaciones`, `GET /bloques/{id}/agrupaciones/{aid}` |
| Characters  | `/api/v1` | `GET/POST /bloques/{id}/characters`, `GET .../characters/{id}/model` |
| Celestial   | `/api/v1` | `GET /celestial/state`, `POST /celestial/temperature` |

## Imports

- DTOs de un dominio: `from src.domains.<dominio>.schemas import ...`
- Compartidos: `from src.domains.shared.schemas import parse_jsonb_field, GeometriaVisual, ...`
- Servicios (lógica de negocio): `from src.domains.<dominio>.service import ...` (p. ej. celestial: CelestialTimeService, calculate_cell_temperature; particles: get_particulas_con_inercia, get_particulas_vecinas)
