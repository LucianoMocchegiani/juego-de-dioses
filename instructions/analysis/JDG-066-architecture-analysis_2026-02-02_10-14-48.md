# Análisis de Arquitectura - Migración del backend a Hexagonal + DDD (JDG-066)

## Objetivo del análisis

Evaluar en profundidad si es **rentable** migrar el backend actual hacia una arquitectura **Hexagonal (Puertos y Adaptadores)** combinada con **DDD (Domain-Driven Design)**, considerando:

- La **temática** del proyecto (Juego de Dioses: mundo persistente, partículas, MMO-like, múltiples frontends).
- La **escala futura** descrita en Ideas (mundo centralizado, bloques, recetas, mesh builder, límites de jugadores).
- La **relación** con una posible organización tipo **micro-frontend** en el frontend.
- **Pros y contras** concretos para este proyecto.

**Referencia previa:** `docs/comparacion-hexagonal-ddd.md`.

---

## Situación Actual

### Backend

**Estructura actual:**

```
backend/src/
├── main.py
├── config/
├── database/           # connection.py, get_connection(), seeds
├── domains/            # Por dominio (bloques, particles, characters, celestial, agrupaciones, shared)
│   ├── shared/         # schemas compartidos, performance_monitor, world_bloque*
│   ├── bloques/        # schemas.py, routes.py
│   ├── particles/      # schemas.py, routes.py, service.py
│   ├── characters/     # schemas.py, routes.py
│   ├── celestial/      # schemas.py, routes.py, service.py
│   └── agrupaciones/   # schemas.py, routes.py
├── storage/            # BaseStorage (port), LocalFileStorage (adapter)
└── world_creation_engine/  # templates, builders, creators, terrain_builder
```

**Problemas / características identificadas:**

1. **Persistencia sin puerto:** Routes y services usan `get_connection()` y SQL directo (asyncpg). No hay interfaces de repositorio; cambiar de BD o añadir caché implica tocar muchos archivos.
2. **Sin capa de aplicación explícita:** No hay “casos de uso” como puertos de entrada; la lógica vive en endpoints y en `service.py`, mezclando orquestación y detalles de infra.
3. **Dominios ya organizados (JDG-065):** Bounded contexts por carpeta y recurso; buena base para seguir creciendo sin tocar la estructura de carpetas.
4. **Un puerto hexagonal existente:** `BaseStorage` + `LocalFileStorage`; patrón ya conocido en el proyecto.
5. **Entidades = DTOs:** No hay entidades de dominio con comportamiento; los Pydantic schemas sirven tanto para API como para “modelo”; reglas de negocio repartidas en routes/services.
6. **world_creation_engine:** Usa asyncpg directamente; no está detrás de puertos de persistencia.

### Frontend

- Monolito: una aplicación con ECS, terrain, interfaces, etc. No hay micro-frontends hoy.
- Ideas (18-Arquitectura-Frontend-Agnostic) plantean **múltiples frontends** (Web, Móvil, VR, Texto) y API **descriptiva**, no prescriptiva. No exigen micro-frontend en el frontend web; es una **opción** de organización del cliente.

### Base de Datos

- PostgreSQL; schema en `database/init/`. Consultas repartidas en dominios (routes + services). Sin capa de repositorio.

---

## Necesidades Futuras (según Ideas)

### Categorías de entidades y funcionalidades

1. **Ya en marcha / roadmap cercano:**
   - Partículas, bloques, temperatura, transiciones, integridad (Ideas 29–52).
   - Mesh builder, recetas, piezas (JDG-064, Ideas 53).
   - Personajes, agrupaciones, celestial.

2. **Escala y estilo de producto:**
   - **Mundo persistente centralizado** (13-El-Mundo-del-Juego): “Toda la información del mundo en servidores centralizados”.
   - **Frontend-agnostic** (18): Múltiples frontends consumiendo la misma API descriptiva.
   - **Estado en RAM tipo MMO** (26-Personajes-Particulas-MMO): Cargar en RAM, actualizar en RAM, sincronizar por red, persistir periódicamente.
   - **Límites de rendimiento** (24): Cliente (Three.js) y servidor (jugadores por área, mensajes/seg).
   - **Arquitectura técnica** (14): API Gateway, varios servidores de aplicación, BD, cache (Redis), almacenamiento de objetos.

3. **Posible crecimiento:**
   - Recetas, constructor in-game, UGC (53).
   - Más dominios (economía, gobernanza, Dioses/IA como jugadores, etc.).
   - Múltiples equipos o integraciones (otros clientes, móvil, etc.).

### Requisitos de escalabilidad (relevantes para el análisis)

- **Añadir dominios sin romper otros:** La estructura por dominio actual lo facilita; Hexagonal+DDD lo refuerza con puertos claros.
- **Cambiar o duplicar persistencia:** Hoy es costoso (SQL en todas partes). Con repositorios (puertos) sería más barato (ej. cache, réplicas, o cambio de BD en un adaptador).
- **Testabilidad:** Lógica de negocio acoplada a BD y HTTP dificulta tests unitarios; casos de uso + repos inyectados la facilitan.
- **Múltiples frontends:** No dependen del patrón interno del backend; sí se benefician de una API estable y bien delimitada por contexto (que Hexagonal+DDD suele reforzar).

---

## Pros y contras de Hexagonal + DDD en Juego de Dioses

### Pros

| Beneficio | Explicación en este proyecto |
|-----------|------------------------------|
| **Testabilidad** | Casos de uso y repositorios inyectables permiten tests sin BD ni HTTP; hoy es difícil mockear `get_connection()` en cada ruta. |
| **Sustitución de persistencia** | Ideas 26 y 48: estado en RAM + persistencia periódica; un puerto “estado del mundo” o repositorios por agregado permitirían un adaptador “en memoria” para simulación y otro “PostgreSQL” para persistir. |
| **Múltiples frontends** | API por contexto (bloques, particles, characters, etc.) ya existe; Hexagonal+DDD no la cambia pero sí clarifica “qué es negocio” (casos de uso) y “qué es infra” (adaptadores). |
| **Escalabilidad de equipo** | Dominios con puertos claros permiten repartir trabajo (ej. “equipo partículas” toca solo su dominio y sus adaptadores). |
| **Coherencia con storage** | Ya hay un puerto (`BaseStorage`); extender el mismo patrón a persistencia reduce sorpresas y facilita onboarding. |
| **Futuro MMO-like** | Si se introduce “mundo en RAM” (26), tener repositorios como puertos permite un adaptador que lee/escribe en estructuras en RAM sin que el resto del backend dependa de asyncpg. |

### Contras

| Coste / riesgo | Explicación en este proyecto |
|----------------|------------------------------|
| **Curva de aprendizaje y tiempo** | Equipo pequeño; más capas (casos de uso, repos) = más archivos y convenciones; tiempo que no se dedica a features (partículas, mesh builder, recetas). |
| **Overhead inicial** | Muchos endpoints son CRUD simples; crear use case + repository por cada uno puede parecer excesivo hasta que el dominio crezca. |
| **Riesgo de sobreingeniería** | DDD “completo” (agregados, value objects, eventos de dominio) puede ser demasiado para un MVP o para dominios que son sobre todo lectura/escritura. |
| **Migración gradual** | Migrar todo de golpe es inviable; hay que elegir dominios y endpoints prioritarios y dejar el resto para después, con convivencia de estilos. |

---

## Rentabilidad según temática y escala

### ¿Es rentable en nuestro proyecto?

**Conclusión: rentable de forma incremental y selectiva**, no “big bang”.

1. **Temática (mundo persistente, partículas, MMO-like):**
   - El **estado en RAM** (Ideas 26, 48) encaja con **puertos de persistencia**: un mismo “contrato” (repositorio) puede tener adaptador PostgreSQL (persistencia) y adaptador en memoria (simulación o servidor de juego). Eso sí es rentable a medio plazo.
   - **Partículas y bloques** tienen lógica de negocio (temperatura, transiciones, inercia) que se beneficiaría de estar en casos de uso y, opcionalmente, en entidades de dominio, para testear sin BD.
   - **Múltiples frontends** (Ideas 18) no exigen Hexagonal en backend, pero una API bien delimitada por dominio (que ya tenemos) + casos de uso claros reducen acoplamiento y facilitan evolución.

2. **Escala (Ideas, roadmap):**
   - **Corto plazo (MVP, partículas, mesh builder):** Migración full Hexagonal+DDD en todo el backend no es rentable; retrasaría features sin beneficio inmediato.
   - **Medio plazo (más dominios, posible “mundo en RAM”, más desarrolladores):** Introducir **puertos de persistencia (repositorios)** y **casos de uso** en 1–2 dominios piloto (p. ej. particles, bloques) sí es rentable: mejor testabilidad y base para un futuro adaptador “en memoria”.
   - **Largo plazo (varios equipos, más clientes):** Hexagonal+DDD bien aplicado reduce conflictos y acoplamiento; la rentabilidad aumenta si el equipo y los dominios crecen.

3. **Recomendación de alcance:**
   - **Sí rentable:** Puertos de salida para persistencia (repositorios) y casos de uso (puertos de entrada) en dominios que tengan o vayan a tener lógica relevante (particles, bloques, quizá celestial). Hacerlo dominio a dominio, sin reescribir todo.
   - **Rentable con moderación:** Entidades de dominio “ricas” solo donde la lógica sea compleja (ej. reglas de transición de partículas, integridad); no en todos los recursos.
   - **No prioritario ahora:** Agregados estrictos, eventos de dominio, CQRS; valorar más adelante si la complejidad lo justifica.

---

## Relación entre Hexagonal+DDD (backend) y micro-frontend (frontend)

### ¿Tienen que ver?

**Sí, pero de forma indirecta.**

- **Micro-frontend** es una decisión de **organización del frontend**: dividir la UI en aplicaciones o fragmentos independientes (por ruta, por módulo, por equipo), que se integran en un shell común. No obliga a cambiar el backend.
- **Hexagonal+DDD** es una decisión de **organización del backend**: dominios, puertos y adaptadores. No obliga a que el frontend sea micro-frontend.

**Relación práctica:**

1. **API por contexto:** El backend ya expone recursos por dominio (bloques, particles, characters, celestial, agrupaciones). Eso encaja con micro-frontends por “área” (ej. un micro-frontend “mundo/terreno”, otro “personaje”, otro “celestial”). La migración a Hexagonal+DDD no cambia las URLs ni los contratos; refuerza la **estabilidad** de esos contextos porque la lógica queda detrás de casos de uso y no dispersa en routes.
2. **Contratos estables:** Si en el futuro un equipo “Terreno” y otro “Personaje” desarrollan micro-frontends distintos, ambos consumen la misma API. Tener casos de uso y repositorios en backend ayuda a **evolucionar** la API por dominio sin romper contratos, porque el “núcleo” (dominio + aplicación) está bien delimitado.
3. **Conclusión:** Micro-frontend es **independiente** del patrón de organización del backend. Adoptar Hexagonal+DDD en backend **no es requisito** para micro-frontend, pero **sí es compatible** y facilita mantener APIs por contexto estables. Se pueden decidir por separado; si se hace micro-frontend más adelante, el backend ya organizado por dominio (y opcionalmente por puertos) encaja bien.

---

## Arquitectura propuesta (si se opta por migración incremental)

### Backend – Evolución hacia Hexagonal + DDD (por fases)

No se propone reemplazar todo de golpe. Estructura **objetivo** por dominio (ej. particles):

```
domains/particles/
├── domain/                    # (opcional, fase posterior)
│   ├── entities.py            # Entidades de dominio si se necesitan
│   └── value_objects.py       # Value objects si aplica
├── application/               # Casos de uso (puertos de entrada)
│   ├── ports/
│   │   └── particle_repository.py   # Puerto de salida (interface)
│   ├── get_particle_types.py  # Caso de uso
│   └── get_particles_by_viewport.py
├── infrastructure/            # Adaptadores de salida
│   └── postgres_particle_repository.py  # Implementación con get_connection()
├── schemas.py                # DTOs (Pydantic) para API
└── routes.py                 # Adaptador de entrada: HTTP → caso de uso
```

- **Fase 1:** Introducir **repositorios** (puertos de salida) en un dominio piloto; routes y services siguen existiendo pero delegan en el repositorio. No obligatorio extraer casos de uso aún.
- **Fase 2:** Extraer **casos de uso** (puertos de entrada) que las routes llamen; los casos de uso usan los repositorios. Inyección de dependencias (FastAPI `Depends`) para el repositorio.
- **Fase 3 (opcional):** Donde la lógica sea compleja, introducir **entidades de dominio** y mover reglas desde services/casos de uso al dominio.

### Jerarquía de dependencias

```
routes (HTTP) → application/use cases → domain (opcional)
                     ↓
              ports (repository interface)
                     ↑
              infrastructure (PostgresParticleRepository)
```

- `database/connection` solo es usado por `infrastructure/`.
- Dominio y aplicación no importan FastAPI ni asyncpg.

---

## Patrones de diseño a usar

### 1. Puerto (Port) / Adaptador (Adapter) – Hexagonal

- **Puertos de salida:** Interfaces de repositorio (ej. `IParticleRepository`, `IBloqueRepository`). El “núcleo” (casos de uso) depende de la interfaz, no de PostgreSQL.
- **Adaptadores de salida:** Clases que implementan esas interfaces usando `get_connection()` y SQL.
- **Puertos de entrada:** Casos de uso (funciones o clases con método `execute()`). Las routes son adaptadores de entrada que traducen HTTP a llamada al caso de uso.

### 2. Repository

- Encapsula acceso a persistencia por agregado o entidad. Interface en aplicación, implementación en infraestructura. Facilita tests (mock) y cambio de almacenamiento (ej. en memoria para MMO).

### 3. Dependency Injection (FastAPI Depends)

- Inyectar el repositorio concreto en el caso de uso desde `main.py` o desde el router del dominio, para no instanciar `PostgresParticleRepository` dentro del caso de uso.

### 4. (Opcional) Domain Entity / Value Object

- Solo donde la lógica de negocio justifique entidades con comportamiento (ej. reglas de transición de partículas, validaciones de integridad). No imprescindible en todos los dominios.

---

## Beneficios de la nueva arquitectura (resumen)

1. **Testabilidad:** Casos de uso y repositorios testeables con mocks; menos dependencia de BD en tests.
2. **Preparación para “mundo en RAM”:** Un mismo puerto de repositorio puede tener implementación PostgreSQL y otra en memoria (Ideas 26, 48).
3. **Evolución de la API:** Cambios en persistencia o en reglas de negocio localizados en dominio/aplicación o en adaptadores, sin tocar todo.
4. **Coherencia:** Mismo patrón que `BaseStorage` aplicado a persistencia.
5. **Escalabilidad de equipo:** Dominios con contratos claros (puertos) facilitan trabajo en paralelo y onboarding.

---

## Migración propuesta (incremental)

### Fase 1: Puertos de persistencia (repositorios) en un dominio piloto

- Elegir **particles** (o bloques) como piloto.
- Definir `IParticleRepository` (o equivalente) con los métodos que hoy usan routes/service (ej. `get_by_viewport`, `get_types_in_viewport`).
- Implementar `PostgresParticleRepository` que use `get_connection()` y el SQL actual.
- Sustituir en routes/service las llamadas directas a la BD por llamadas al repositorio (inyectado).
- **Criterio de aceptación:** Mismas respuestas API; tests que usen un mock del repositorio para al menos un caso de uso.

### Fase 2: Casos de uso en el mismo dominio

- Extraer 1–2 flujos (ej. “obtener partículas por viewport”, “obtener tipos de partícula”) a funciones o clases de caso de uso que reciban el repositorio por parámetro.
- Las routes solo parsean request, llaman al caso de uso y devuelven el response.
- **Criterio de aceptación:** Routes sin SQL ni `get_connection()`; lógica de orquestación en aplicación.

### Fase 3: Repetir en otros dominios (bloques, celestial, etc.)

- Aplicar Fase 1 y 2 dominio a dominio según prioridad y carga de lógica de negocio.
- No es obligatorio migrar todos los endpoints; se puede dejar algunos en “estilo actual” hasta que se toquen.

### Fase 4 (opcional): Entidades de dominio

- Solo donde la lógica sea relevante (ej. transiciones de partículas, validaciones de integridad). Mover reglas desde service/caso de uso a entidades o value objects.
- Mantener DTOs Pydantic para la API; entidades de dominio son internas al núcleo.

---

## Consideraciones técnicas

### Backend

- **Compatibilidad:** La API expuesta (URLs, JSON) no debe cambiar; la migración es interna.
- **Inyección:** Usar FastAPI `Depends()` para inyectar el repositorio concreto en cada router o en el caso de uso.
- **Testing:** Añadir tests unitarios de casos de uso con repositorio mock; los tests de integración pueden seguir usando BD real contra el adaptador PostgreSQL.
- **world_creation_engine:** En una fase posterior se puede hacer que use repositorios en lugar de asyncpg directo, o dejarlo como “orquestador” que llama a servicios de dominio que sí usan repositorios.

### Frontend

- No hay impacto directo. La decisión de micro-frontend es independiente; la API por contexto ya existe y se mantiene.

### Base de datos

- Sin cambios de schema por esta migración. Solo se encapsula el acceso detrás de repositorios.

---

## Ejemplo de uso futuro (después de Fase 1 y 2)

```python
# application/get_particles_by_viewport.py
async def get_particles_by_viewport(
    repository: IParticleRepository,
    bloque_id: UUID,
    viewport: ParticleViewportQuery,
) -> ParticlesResponse:
    viewport.validate_ranges()
    particles = await repository.get_by_viewport(bloque_id, viewport)
    total = await repository.count_by_viewport(bloque_id, viewport)
    return ParticlesResponse(bloque_id=bloque_id, particles=particles, total=total, viewport=viewport)

# routes.py
@router.get("/{bloque_id}/particles", response_model=ParticlesResponse)
async def get_particles_by_viewport(
    bloque_id: UUID,
    viewport: ParticleViewportQuery = Depends(),
    use_case: GetParticlesByViewport = Depends(get_particles_by_viewport_use_case),
):
    return await use_case(bloque_id, viewport)
```

- El caso de uso no conoce HTTP ni SQL; solo el puerto `IParticleRepository`.
- El adaptador PostgreSQL implementa ese puerto; en el futuro podría existir un adaptador “in memory” para el mundo en RAM.

---

## Conclusión

- **Rentabilidad:** Sí, de forma **incremental y selectiva**. No es rentable una migración “big bang” ni DDD completo en todos los dominios ahora.
- **Recomendación:**  
  - Introducir **puertos de persistencia (repositorios)** y **casos de uso** en 1–2 dominios piloto (p. ej. particles, bloques), en el orden Fase 1 → Fase 2.  
  - Extender a otros dominios según prioridad (Fase 3).  
  - Considerar **entidades de dominio** solo donde la lógica lo justifique (Fase 4 opcional).
- **Micro-frontend:** Es una decisión del **frontend**; no depende del patrón del backend. Hexagonal+DDD en backend **complementa** una futura organización en micro-frontends al mantener APIs por contexto estables y bien delimitadas.
- **Próximo paso:** Si se aprueba esta dirección, crear tickets o tareas por fase (por ejemplo: JDG-066-1 Fase 1 particles, JDG-066-2 Fase 2 particles) e implementar de forma incremental sin bloquear el roadmap de partículas, mesh builder o recetas.
