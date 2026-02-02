# Análisis de Arquitectura - Migrar Backend a Estructura por Dominio (estilo Nest) (JDG-065)

## Objetivo del análisis

Evaluar la estructura actual del backend (FastAPI) y proponer una **arquitectura por dominio** similar a NestJS: cada recurso (bloques, particles, characters, celestial, agrupaciones) tendría su propia carpeta con schemas (DTOs) y rutas, mejorando mantenibilidad y escalabilidad sin cambiar el comportamiento de la API.

---

## Situación Actual

### Backend

**Estructura actual:**
```
backend/src/
├── main.py                    # Registra routers desde api.routes
├── api/
│   ├── __init__.py
│   └── routes/
│       ├── __init__.py
│       ├── dimensions.py      # GET /bloques, /bloques/{id}, /bloques/world/size
│       ├── particles.py       # GET /bloques/{id}/particles, /particle-types, /particles/{pid}
│       ├── characters.py      # GET/POST /bloques/{id}/characters, GET .../model
│       ├── celestial.py       # GET /celestial/state, POST /celestial/temperature
│       ├── agrupaciones.py    # GET /bloques/{id}/agrupaciones, /agrupaciones/{aid}
│       └── README.md
├── models/
│   ├── __init__.py
│   ├── schemas.py             # Todos los DTOs: Dimension*, Particle*, Character*, Celestial*, Agrupacion*, estilos, geometría
│   ├── particula_schemas.py   # DTOs extendidos del sistema de partículas (JDG-038)
│   └── README.md
├── database/
├── services/
├── config/
└── storage/
```

**Problemas identificados:**

1. **Schemas centralizados:** Todos los DTOs (DimensionResponse, ParticleResponse, CharacterResponse, CelestialStateResponse, AgrupacionResponse, estilos de partícula, geometría visual, etc.) viven en `models/schemas.py` (~500 líneas) y `models/particula_schemas.py` (~440 líneas). Un cambio en un recurso obliga a tocar un archivo compartido; la descubribilidad por dominio es baja.
2. **Rutas y DTOs desacoplados por ubicación:** Las rutas están en `api/routes/` por recurso, pero los DTOs de ese recurso están en `models/`. No hay una carpeta "módulo" que agrupe rutas + schemas del mismo dominio (como en Nest: `users/` con `users.controller`, `users.service`, `users.dto`).
3. **Imports dispersos:** Cualquier ruta importa desde `src.models.schemas`; si se añade un recurso nuevo (ej. recetas), se añade más peso a los mismos archivos. No hay frontera clara por dominio.
4. **Schemas compartidos sin módulo explícito:** GeometriaVisual, EstilosParticula, MaterialProperties, parse_jsonb_field son usados por varios dominios (particles, characters) pero viven en schemas.py sin un "shared" explícito; al migrar por dominio habría que extraerlos a un módulo común para evitar duplicación o imports circulares.
5. **particula_schemas.py como segundo archivo ad hoc:** Los DTOs de JDG-038 (TipoParticula, Particula, Bloque espacial, TransicionParticula) están en un archivo separado; no hay convención "un dominio = una carpeta con sus DTOs y rutas".

### Frontend

No afectado por este refactor: la API expuesta (URLs y contratos JSON) no cambia. El frontend sigue usando los mismos endpoints.

### Base de Datos

No afectada: el refactor es solo de organización del código backend (rutas y modelos Pydantic).

---

## Necesidades Futuras

### Categorías de entidades/funcionalidades

1. **Dominios actuales (reorganizar):**
   - **bloques:** DimensionResponse, WorldSizeResponse; rutas GET /bloques, /bloques/{id}, /bloques/world/size.
   - **particles:** ParticleResponse, ParticlesResponse, ParticleTypeResponse, ParticleTypesResponse, ParticleViewportQuery; rutas GET /bloques/{id}/particles, /particle-types, /particles/{pid}. Opcionalmente integrar o referenciar particula_schemas (TipoParticula, Particula, etc.).
   - **characters:** CharacterResponse, CharacterCreate, BipedGeometry, Model3D; rutas GET/POST /bloques/{id}/characters, GET .../model.
   - **celestial:** CelestialStateResponse, TemperatureRequest, TemperatureResponse, CelestialPosition; rutas GET /celestial/state, POST /celestial/temperature.
   - **agrupaciones:** AgrupacionResponse, AgrupacionWithParticles; rutas GET /bloques/{id}/agrupaciones, /agrupaciones/{aid}.

2. **Dominios futuros (ej. recetas – JDG-064):**
   - Recetas tendrían su propia carpeta con RecetaCreate, RecetaResponse y rutas GET/POST recetas, sin ensuciar schemas.py global.

### Requisitos de escalabilidad

1. **Fácil agregar nuevos dominios:** Añadir una carpeta (ej. `domains/recetas/`) con schemas.py y routes.py, y registrar el router en main.py.
2. **Reutilización:** DTOs compartidos (geometría, estilos) en un módulo `shared` importado por los dominios que los necesiten.
3. **Separación de responsabilidades:** Cada dominio contiene solo lo que le corresponde; cambios en un recurso no tocan otros.
4. **Mantenibilidad:** README por dominio o sección en README de api/ explicando la estructura por dominio.
5. **Compatibilidad:** Mismas URLs y mismos response models; cero impacto en clientes (frontend, tests E2E).

---

## Arquitectura Propuesta

### Backend – Estructura por dominio (estilo Nest)

```
backend/src/
├── main.py                           # Registra routers desde api.domains.*
├── api/
│   ├── __init__.py
│   ├── domains/
│   │   ├── __init__.py               # Re-exporta routers o registra aquí
│   │   ├── shared/
│   │   │   ├── __init__.py
│   │   │   └── schemas.py            # parse_jsonb_field, GeometriaVisual, EstilosParticula, MaterialProperties, etc.
│   │   ├── bloques/
│   │   │   ├── __init__.py
│   │   │   ├── schemas.py            # DimensionBase, DimensionCreate, DimensionResponse, WorldSizeResponse
│   │   │   └── routes.py             # router prefix=/bloques
│   │   ├── particles/
│   │   │   ├── __init__.py
│   │   │   ├── schemas.py            # ParticleResponse, ParticlesResponse, ParticleTypeResponse, ParticleTypesResponse, ParticleViewportQuery
│   │   │   └── routes.py             # router prefix=/bloques
│   │   ├── characters/
│   │   │   ├── __init__.py
│   │   │   ├── schemas.py            # CharacterResponse, CharacterCreate, BipedGeometry, Model3D, etc.
│   │   │   └── routes.py             # router prefix=/bloques/{bloque_id}/characters
│   │   ├── celestial/
│   │   │   ├── __init__.py
│   │   │   ├── schemas.py            # CelestialStateResponse, TemperatureRequest/Response, CelestialPosition
│   │   │   └── routes.py             # router sin prefix (GET /celestial/state, POST /celestial/temperature)
│   │   └── agrupaciones/
│   │       ├── __init__.py
│   │       ├── schemas.py            # AgrupacionResponse, AgrupacionWithParticles
│   │       └── routes.py             # router prefix=/bloques
│   └── routes/                       # Eliminar; contenido movido a domains/*/routes.py
├── models/
│   ├── __init__.py                   # Solo README; DTOs en api/domains/
│   ├── README.md                     # Documenta que los DTOs viven en api/domains/
│   └── (schemas.py / particula_schemas.py eliminados; DTOs en api/domains/)
├── database/
├── services/
├── config/
└── storage/
```

### Jerarquía / dependencias entre módulos

- **shared:** No importa de ningún dominio. Contiene helpers (parse_jsonb_field) y modelos reutilizables (GeometriaVisual, EstilosParticula, MaterialProperties, GeometriaParametros, etc.).
- **bloques:** Importa solo de shared si usara geometría/estilos (en la práctica Dimension* no; WorldSizeResponse tampoco). Puede ser el dominio más simple.
- **particles:** Importa de shared (GeometriaVisual, estilos si se usan en ParticleTypeResponse). Particula_schemas puede vivir en particles/schemas.py o en particles/particula_schemas.py según preferencia.
- **characters:** Importa de shared (BipedGeometry usa GeometriaVisual; Model3D). CharacterResponse, CharacterCreate.
- **celestial:** Importa solo CelestialPosition y DTOs de temperatura; puede no depender de shared.
- **agrupaciones:** AgrupacionResponse, AgrupacionWithParticles; si en el futuro se expone geometría por agrupación, importaría de shared. Hoy puede no depender de shared.

Evitar: que `shared` importe de ningún dominio (evitar ciclos).

### Frontend

Sin cambios; no forma parte de este refactor.

---

## Patrones de Diseño a Usar

### 1. Módulo por dominio (Domain Module / Feature Module)
- **Descripción:** Agrupar por recurso/feature (bloques, particles, characters, etc.) en lugar de por tipo técnico (todas las rutas, todos los DTOs).
- **Aplicación:** Cada carpeta bajo `api/domains/` es un módulo que expone un router y sus DTOs; main.py registra cada router con el mismo prefix que hoy.
- **Beneficios:** Descubribilidad, menor acoplamiento, más fácil añadir dominios (recetas, etc.).

### 2. Shared kernel (DTOs compartidos)
- **Descripción:** Extraer modelos usados por varios dominios a un módulo común (`shared`) para no duplicar y evitar imports circulares.
- **Aplicación:** `api/domains/shared/schemas.py` con parse_jsonb_field, GeometriaVisual, EstilosParticula, MaterialProperties, GeometriaParametros, etc. Los dominios que los necesiten importan desde `api.domains.shared.schemas`.
- **Beneficios:** Una sola fuente de verdad para geometría y estilos; dominios independientes entre sí.

### 3. Eliminación directa (sin re-exports)
- **Descripción:** Tras mover cada dominio a `api/domains/`, se eliminan los archivos antiguos (`api/routes/*.py`, `models/schemas.py`, `models/particula_schemas.py` si se integró). No se dejan re-exports ni deprecación gradual.
- **Aplicación:** Actualizar todos los imports en services, database, main.py, etc., a los nuevos módulos; eliminar `api/routes/dimensions.py`, `particles.py`, etc., y `models/schemas.py` (y particula_schemas si aplica).
- **Beneficios:** Código limpio sin capas de compatibilidad; una sola fuente de verdad por dominio.

---

## Beneficios de la Nueva Arquitectura

1. **Mantenibilidad:** Cambios en characters solo tocan `domains/characters/`; no se mezclan con particles ni bloques.
2. **Escalabilidad:** Añadir recetas (JDG-064) o otros recursos es crear una carpeta nueva con schemas + routes y registrar el router.
3. **Descubribilidad:** Desarrollador que trabaja en "personajes" sabe que todo está en `domains/characters/`.
4. **Alineación con ecosistema:** Estructura similar a Nest (módulo = carpeta con DTOs + controller/routes) facilita onboarding de quien venga de ese mundo.
5. **Contratos API invariantes:** Mismas URLs y mismos JSON; frontend y tests no cambian.

---

## Migración Propuesta

### Fase 1: Crear estructura y módulo shared
- Crear `api/domains/` y `api/domains/shared/`.
- Extraer a `shared/schemas.py`: parse_jsonb_field, GeometriaParametros, GeometriaVisual, MaterialProperties, VisualProperties, EstilosParticula (y cualquier otro modelo usado por más de un dominio). Ajustar imports en `models/schemas.py` para que importen desde shared (o, temporalmente, copiar/pegar y luego eliminar de schemas.py).
- Crear `api/domains/shared/__init__.py` exportando lo necesario.
- Verificar que no haya ciclos: shared no debe importar de ningún dominio.

### Fase 2: Migrar dominio bloques
- Crear `api/domains/bloques/` con schemas.py (DimensionBase, DimensionCreate, DimensionResponse, WorldSizeResponse) y routes.py (contenido actual de api/routes/dimensions.py).
- Actualizar imports en routes.py para usar `from src.api.domains.bloques.schemas import ...`.
- Registrar en main.py el router de bloques desde `api.domains.bloques.routes` con prefix `/api/v1`.
- Comprobar que GET /bloques, GET /bloques/{id}, GET /bloques/world/size respondan igual. Eliminar api/routes/dimensions.py.

### Fase 3: Migrar dominio celestial
- Crear `api/domains/celestial/` con schemas.py (CelestialStateResponse, TemperatureRequest, TemperatureResponse, CelestialPosition) y routes.py (contenido actual de celestial.py).
- Registrar router desde domains.celestial.routes. Comprobar GET /celestial/state y POST /celestial/temperature.

### Fase 4: Migrar dominio particles
- Crear `api/domains/particles/` con schemas.py (ParticleResponse, ParticlesResponse, ParticleTypeResponse, ParticleTypesResponse, ParticleViewportQuery; y si se integra, tipos de particula_schemas). routes.py con contenido actual de particles.py; importar DTOs desde shared donde aplique.
- Registrar router. Comprobar GET /bloques/{id}/particles y GET /bloques/{id}/particle-types.

### Fase 5: Migrar dominio characters
- Crear `api/domains/characters/` con schemas.py (CharacterResponse, CharacterCreate, BipedGeometry, Model3D, BipedGeometryPart, etc.; importar GeometriaVisual desde shared). routes.py con contenido actual de characters.py.
- Registrar router. Comprobar GET/POST /bloques/{id}/characters y GET .../model.

### Fase 6: Migrar dominio agrupaciones
- Crear `api/domains/agrupaciones/` con schemas.py (AgrupacionResponse, AgrupacionWithParticles) y routes.py. Registrar router. Comprobar GET /bloques/{id}/agrupaciones y GET /bloques/{id}/agrupaciones/{aid}.

### Fase 7: Actualizar consumidores y limpiar
- Actualizar todos los imports en `database/`, `services/`, `main.py` que usen `src.models.schemas` para que apunten a los nuevos módulos (domains.*.schemas o domains.shared.schemas).
- Eliminar `models/schemas.py` y actualizar cualquier referencia restante a los nuevos módulos (domains.*.schemas, domains.shared.schemas).
- Decidir qué hacer con `models/particula_schemas.py`: integrar en particles/schemas.py o mantener como particles/particula_schemas.py y documentarlo.
- Actualizar README de `backend/src/models/` y de `backend/src/api/` (o crear README en api/domains/) explicando la estructura por dominio.

---

## Consideraciones Técnicas

### Backend
1. **Compatibilidad:** Mismas URLs y mismos response_model; OpenAPI (/docs) debe seguir mostrando los mismos esquemas. No cambiar nombres de campos ni tipos en los Pydantic.
2. **Imports circulares:** shared no debe importar dominios. Si un dominio necesita otro (evitar si es posible), usar import local dentro de la función o reestructurar.
3. **Testing:** Tests de API existentes deben seguir pasando sin cambios en las aserciones (mismos status y cuerpos). Ejecutar tests después de cada fase.
4. **main.py:** Mantener el mismo orden de registro de routers y los mismos prefijos (prefix="/api/v1" y el prefix de cada router: /bloques, etc.).

### Frontend
- No hay cambios; la API es la misma.

### Base de datos
- No hay cambios; solo organización de código Python.

---

## Ejemplo de Uso Futuro (añadir dominio recetas)

```python
# api/domains/recetas/schemas.py
from pydantic import BaseModel
from uuid import UUID
from typing import Optional, Any

class RecetaCreate(BaseModel):
    nombre: str
    categoria: str
    tipo_particula_id: UUID
    proceso: str
    forma: Optional[dict] = None

class RecetaResponse(BaseModel):
    id: UUID
    nombre: str
    categoria: str
    tipo_particula_id: UUID
    proceso: str
    forma: Optional[dict] = None
    # ...

# api/domains/recetas/routes.py
from fastapi import APIRouter
from src.api.domains.recetas.schemas import RecetaCreate, RecetaResponse

router = APIRouter(prefix="/bloques", tags=["recetas"])

@router.get("/{bloque_id}/recetas/{receta_id}", response_model=RecetaResponse)
async def get_receta(bloque_id: UUID, receta_id: UUID): ...

# main.py
from src.api.domains import recetas
app.include_router(recetas.routes.router, prefix="/api/v1")
```

---

## Conclusión

La migración a **estructura por dominio** (carpeta por recurso con schemas + routes) mejora mantenibilidad y escalabilidad del backend sin cambiar el contrato de la API. La extracción de un módulo **shared** evita duplicación y ciclos. La migración se hace por fases (shared → bloques → celestial → particles → characters → agrupaciones) eliminando directamente los archivos antiguos (`api/routes/*.py`, `models/schemas.py`) sin re-exports ni deprecación. El análisis sirve como base para el plan de acción (JDG-065-action-plan) y para implementar el ticket JDG-065 paso a paso.
