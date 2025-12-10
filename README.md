# Juego de Dioses

Sistema de juego basado en partículas (voxels) donde los jugadores interactúan con un mundo persistente creado y modificado por AIs (Dioses).

**Proyecto**: `juego_de_dioses`

## Arquitectura

- **Backend**: Python 3.11 + FastAPI + Uvicorn
- **Base de Datos**: PostgreSQL 16
- **Cache**: Redis 7
- **WebSockets**: FastAPI WebSockets (nativo)
- **Cálculos**: NumPy + SciPy (para física de partículas)
- **Grafos**: NetworkX (para algoritmos de conectividad BFS/DFS)
- **Containerización**: Docker + Docker Compose

### ¿Por qué Python/FastAPI?

**Mejor para este proyecto:**
- Cálculos matemáticos y físicos (NumPy, SciPy)
- Algoritmos complejos (BFS/DFS para conectividad de núcleos)
- Procesamiento de datos científicos
- FastAPI es muy rápido (comparable a Node.js)
- Async/await nativo
- Librerías maduras para simulaciones físicas

## Requisitos Previos

- Docker >= 20.10
- Docker Compose >= 2.0
- Python >= 3.11 (solo para desarrollo local sin Docker)

## Inicio Rápido

### 1. Levantar el Proyecto

```bash
# Desde la raíz del proyecto (juego-de-dioses/)
docker-compose up -d

# Ver logs del backend
docker-compose logs -f backend
```

**Esto levanta automáticamente:**
- PostgreSQL (puerto 5432)
- Redis (puerto 6379)
- Backend API FastAPI (puerto 8000)
- Frontend (nginx, puerto 8080)

**El backend automáticamente:**
- Crea el pool de conexiones a PostgreSQL
- Ejecuta el seed demo si no existe la dimensión demo
- Crea 400 partículas de hierba + 3 árboles
- Inicia la API en http://localhost:8000

### 2. Verificar que Todo Está Corriendo

```bash
# Ver estado de contenedores
docker-compose ps

# Health check del backend
curl http://localhost:8000/health

# Ver logs del backend (opcional)
docker-compose logs -f backend

# Ver documentación interactiva
# Abrir en navegador: http://localhost:8000/docs
```

### 3. Acceder al Frontend

El frontend ya está levantado con Docker (nginx). Solo abre en navegador:

**http://localhost:8080**

**Nota**: El frontend se sirve automáticamente con nginx cuando ejecutas `docker-compose up -d`. No necesitas levantar nada manualmente.

### 4. Verificar Base de Datos (Opcional)

```bash
# Verificar PostgreSQL
docker-compose exec postgres psql -U juegodioses -d juego_dioses -c "SELECT COUNT(*) FROM juego_dioses.dimensiones;"
```

## Estructura del Proyecto

```
juego_de_dioses/
├── backend/              # Código del backend (Python/FastAPI)
│   ├── src/
│   │   └── main.py      # Punto de entrada
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── database/
│   └── init/            # Scripts SQL de inicialización
│       ├── 01-init-schema.sql
│       ├── 02-seed-data.sql
│       └── 03-functions.sql
├── docker-compose.yml    # Configuración de servicios
├── .env.example         # Variables de entorno de ejemplo
└── README.md
```

## Comandos Útiles

### Docker Compose

```bash
# Levantar servicios
docker-compose up -d

# Detener servicios
docker-compose down

# Reconstruir servicios
docker-compose build --no-cache

# Ver estado de servicios
docker-compose ps

# Acceder a PostgreSQL
docker-compose exec postgres psql -U juegodioses -d juego_dioses

# Acceder a Redis CLI
docker-compose exec redis redis-cli

# Ver logs en tiempo real
docker-compose logs -f
```

### Desarrollo Backend

```bash
# Entrar al contenedor del backend
docker-compose exec backend bash

# Instalar dependencias (dentro del contenedor)
pip install -r requirements.txt

# Ejecutar en modo desarrollo (auto-reload)
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

# O ejecutar directamente
python -m uvicorn src.main:app --reload
```

### Base de Datos

```bash
# Conectarse a PostgreSQL
docker-compose exec postgres psql -U juegodioses -d juego_dioses

# Ejecutar migraciones (cuando estén implementadas)
docker-compose exec backend alembic upgrade head

# Ejecutar seed (cuando esté implementado)
docker-compose exec backend python src/database/seed.py
```

## Puertos

- **Backend API**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs
- **API Docs (ReDoc)**: http://localhost:8000/redoc
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **PgAdmin** (opcional): http://localhost:5050

## PgAdmin (Opcional)

Para gestionar la base de datos con interfaz gráfica:

```bash
# Levantar con perfil tools (incluye PgAdmin)
docker-compose --profile tools up -d

# Acceder a PgAdmin
# URL: http://localhost:5050
# Email: admin@juegodioses.com
# Password: admin123 (cambiar en .env)
```

**Configurar conexión en PgAdmin:**
- Host: `postgres` (nombre del servicio)
- Port: `5432`
- Database: `juego_dioses`
- Username: `juegodioses`
- Password: `juegodioses123` (o el que configuraste en .env)

## Variables de Entorno

Ver `.env.example` para todas las variables disponibles. Las más importantes:

- `POSTGRES_USER`: Usuario de PostgreSQL
- `POSTGRES_PASSWORD`: Contraseña de PostgreSQL
- `POSTGRES_DB`: Nombre de la base de datos
- `JWT_SECRET`: Secreto para JWT (cambiar en producción)
- `CORS_ORIGINS`: Orígenes permitidos para CORS (separados por coma)

## Troubleshooting

### El backend no se conecta a PostgreSQL

```bash
# Verificar que PostgreSQL está corriendo
docker-compose ps postgres

# Ver logs de PostgreSQL
docker-compose logs postgres

# Verificar que el esquema se creó
docker-compose exec postgres psql -U juegodioses -d juego_dioses -c "\dn"
```

### Limpiar todo y empezar de nuevo

```bash
# Detener y eliminar contenedores, volúmenes y redes
docker-compose down -v

# Reconstruir desde cero
docker-compose build --no-cache
docker-compose up -d
```

### Problemas con permisos

```bash
# En Linux/Mac, puede ser necesario ajustar permisos
sudo chown -R $USER:$USER .
```

## Arquitectura de Comunicación

**IMPORTANTE**: Los juegos en tiempo real NO usan solo HTTP.

- **HTTP/REST**: Para autenticación, inventario, consultas (operaciones no críticas)
- **WebSockets**: Para actualizaciones del mundo en tiempo real (cambios de partículas, agrupaciones)
- **Redis Pub/Sub**: Para broadcast a múltiples clientes simultáneamente

## Roadmap

Para ver los próximos pasos y funcionalidades planificadas, consulta [roadmap.md](roadmap.md).

## Notas

- Los scripts SQL en `database/init/` se ejecutan automáticamente al crear el contenedor de PostgreSQL
- El backend se reinicia automáticamente cuando cambias código (gracias a `--reload` de uvicorn)
- Redis está configurado con persistencia (`appendonly yes`)
- FastAPI genera documentación automática en `/docs` (Swagger UI)
- Python con NumPy/SciPy es ideal para cálculos de física de partículas

## Contribuir

1. Crear una rama para tu feature
2. Hacer commit de tus cambios
3. Push a la rama
4. Crear un Pull Request

## Licencia

MIT

