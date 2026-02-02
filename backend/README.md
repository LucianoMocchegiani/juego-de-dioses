# Backend - Juego de Dioses

API REST en Python 3.11 + FastAPI + Uvicorn. La lógica está organizada por **dominios** con arquitectura **Hexagonal + DDD** (puertos, casos de uso, adaptadores de persistencia).

---

## Estructura principal

```
backend/
├── src/
│   ├── main.py              # Punto de entrada FastAPI, lifespan, registro de routers
│   ├── domains/              # API por dominio (Hexagonal + DDD)
│   │   ├── README.md         # Estructura por dominio, reglas, endpoints
│   │   ├── bloques/          # Bloques (dimensiones), world size
│   │   ├── particles/        # Partículas por viewport, tipos, temperatura
│   │   ├── characters/       # Personajes (bípedos), create/list/get/model
│   │   ├── celestial/       # Tiempo celestial, temperatura ambiental
│   │   ├── agrupaciones/     # Agrupaciones (árboles, estructuras, etc.)
│   │   └── shared/          # Schemas compartidos, WorldBloque, puertos compartidos
│   ├── world_creation_engine/  # Motor de creación (templates, builders, EntityCreator)
│   ├── database/            # Conexión PostgreSQL, seeds, migraciones
│   ├── config/              # Configuración (celestial, performance)
│   └── storage/             # Almacenamiento de archivos (modelos 3D)
├── requirements.txt
├── .env.example
└── Dockerfile
```

---

## Cómo funciona (Hexagonal + DDD)

- **routes.py** = Adaptador de entrada HTTP. Solo traduce request → caso de uso/puerto y respuesta → HTTP. No usa `get_connection` ni SQL.
- **application/** = Casos de uso que orquestan con **puertos** (interfaces) inyectados.
- **application/ports/** = Interfaces (IBloqueRepository, IParticleRepository, ICharacterCreationPort, etc.).
- **infrastructure/** = Adaptadores que implementan los puertos con PostgreSQL. Solo aquí (y en `database/`) se usa `get_connection()`.

Ver en el repo raíz:

- [docs/flujo-endpoints-hexagonal-ddd.md](../docs/flujo-endpoints-hexagonal-ddd.md) — Flujo de peticiones con ejemplos.

---

## Documentación por módulo

| Módulo | README |
|--------|--------|
| Dominios (API) | [src/domains/README.md](src/domains/README.md) |
| Bloques | [src/domains/bloques/README.md](src/domains/bloques/README.md) |
| Partículas | [src/domains/particles/README.md](src/domains/particles/README.md) |
| Characters | [src/domains/characters/README.md](src/domains/characters/README.md) |
| Celestial | [src/domains/celestial/README.md](src/domains/celestial/README.md) |
| Agrupaciones | [src/domains/agrupaciones/README.md](src/domains/agrupaciones/README.md) |
| Shared | [src/domains/shared/README.md](src/domains/shared/README.md) |
| World Creation Engine | [src/world_creation_engine/README.md](src/world_creation_engine/README.md) |
| Database | [src/database/README.md](src/database/README.md) |
| Config | [src/config/README.md](src/config/README.md) |
| Storage | [src/storage/README.md](src/storage/README.md) |

---

## Ejecución

Ver [../README.md](../README.md) para inicio rápido con Docker. Para verificación sin Docker: [../docs/verificacion-backend.md](../docs/verificacion-backend.md).
