# Comparación: Backend actual vs Hexagonal + DDD

Resumen de cómo está organizado el backend hoy y cómo se compara con una arquitectura **Hexagonal (Puertos y Adaptadores)** combinada con **DDD (Domain-Driven Design)**.

---

## 1. Lo que tiene hoy el backend

### Estructura por dominio (estilo módulos / “DDD light”)

- **`src/domains/`**: cada recurso tiene su carpeta con:
  - **schemas.py**: DTOs Pydantic (request/response, modelos de entidad para API).
  - **routes.py**: endpoints FastAPI (HTTP).
  - **service.py** (opcional): lógica de negocio o consultas (particles, celestial).
- **`domains/shared/`**: schemas compartidos (geometría, estilos, helpers).
- **`main.py`** registra los routers de cada dominio con prefijo `/api/v1`.

Es decir: **organización por dominio** (bounded contexts aproximados), pero **sin** capa de aplicación explícita ni puertos para persistencia.

### Hexagonal (parcial)

- **Un puerto claro**: `storage/storage_interface.py` → `BaseStorage` (interface/ABC).
- **Un adaptador**: `storage/local_file_storage.py` → `LocalFileStorage` que implementa ese puerto.
- **Base de datos**: **no** hay puerto. Tanto las **routes** como los **services** usan `get_connection()` y escriben SQL directamente (asyncpg). No existe abstracción tipo “repositorio” ni interfaz de persistencia.

### DDD (parcial)

- **Contextos delimitados**: sí, por carpetas (bloques, particles, characters, celestial, agrupaciones).
- **Entidades ricas**: no. Lo que hay son **schemas Pydantic** (DTOs y modelos de API), no entidades de dominio con identidad y comportamiento.
- **Agregados / value objects / eventos de dominio**: no aparecen de forma explícita.
- **Servicios de dominio**: algo de lógica en `service.py` (particles, celestial), pero acoplada a la BD (usan `get_connection()` directamente).

---

## 2. Hexagonal + DDD “típico” (referencia)

En una arquitectura **Hexagonal + DDD** suele verse:

| Capa / concepto | Descripción breve |
|------------------|-------------------|
| **Dominio** | Entidades, agregados, value objects, eventos de dominio. Sin dependencias de infra ni framework. |
| **Aplicación (casos de uso)** | Interfaces (puertos) que definen *qué* hace el sistema. Los casos de uso orquestan dominio y puertos. |
| **Puertos de entrada** | Interfaces que los drivers (HTTP, CLI, etc.) llaman: por ejemplo `GetParticleTypesUseCase`. |
| **Puertos de salida** | Interfaces que el dominio/aplicación necesitan: por ejemplo `IParticleRepository`, `IStorage`. |
| **Adaptadores de entrada** | Controllers/API (FastAPI) que traducen HTTP → llamada al caso de uso. |
| **Adaptadores de salida** | Implementaciones concretas: `PostgresParticleRepository`, `LocalFileStorage`, etc. |

La regla clave: **el dominio y la aplicación no conocen SQL ni FastAPI**; solo dependen de interfaces (puertos).

---

## 3. Tabla comparativa

| Aspecto | Backend actual | Hexagonal + DDD típico |
|--------|----------------|-------------------------|
| **Estructura por dominio** | Sí (`domains/bloques`, `particles`, etc.) | Sí (bounded contexts) |
| **Puertos de entrada** | No (las routes son el “caso de uso”) | Sí (interfaces de use cases que la API llama) |
| **Puertos de salida (persistencia)** | No; se usa `get_connection()` + SQL directo | Sí (ej. `IParticleRepository`) |
| **Puertos de salida (otros)** | Solo almacenamiento: `BaseStorage` | Sí (repos, mensajería, etc.) |
| **Adaptadores de entrada** | Rutas FastAPI (lógica + HTTP mezclados) | Controllers que solo llaman al caso de uso |
| **Adaptadores de salida (DB)** | No; SQL en routes y services | Repositorios que implementan el puerto |
| **Capa de aplicación (use cases)** | Implícita en routes + service.py | Explícita; orquesta dominio y puertos |
| **Entidades de dominio** | No; solo DTOs Pydantic | Entidades con identidad y comportamiento |
| **Agregados / value objects** | No | Usual en DDD |
| **Inversión de dependencias** | Dominios y services dependen de `database.connection` y SQL | Dominio/app dependen solo de interfaces; la infra implementa |

---

## 4. Conclusión

- El backend aplica **organización por dominio** (carpetas por recurso, schemas y routes por dominio) y **un único puerto hexagonal** (almacenamiento de ficheros).
- **No** sigue hexagonal en persistencia: no hay puertos ni adaptadores para la base de datos; todo usa conexión y SQL directo.
- **No** sigue DDD “completo”: no hay entidades de dominio ricas, ni agregados, ni capa de aplicación explícita con puertos de use cases.

Si se quisiera acercar más a **Hexagonal + DDD** sin reescribir todo, los pasos más útiles serían:

1. Introducir **puertos de salida para persistencia** (por ejemplo `IParticleRepository`, `IBloqueRepository`) e implementarlos como adaptadores que usen `get_connection()` y SQL.
2. Extraer **casos de uso** (puertos de entrada) que las routes llamen, y que a su vez usen los repositorios (puertos de salida).
3. Opcional: ir moviendo lógica de negocio desde DTOs/schemas hacia **entidades de dominio** y servicios de dominio, manteniendo los DTOs solo para entrada/salida de la API.

Este documento sirve como referencia para discutir hasta qué punto se quiere adoptar Hexagonal + DDD en el backend.
