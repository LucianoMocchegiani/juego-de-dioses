# Inicio Rápido - Juego de Dioses

## Orden de Levantamiento

### Paso 1: Levantar Backend (Docker)

Desde la raíz del proyecto:

```bash
docker-compose up -d
```

Esto levanta:
- PostgreSQL (puerto 5432)
- Redis (puerto 6379)  
- Backend API FastAPI (puerto 8000)
- Frontend (nginx, puerto 8080)

**Verificar que está corriendo:**
```bash
# Ver estado de contenedores
docker-compose ps

# Ver logs del backend
docker-compose logs -f backend

# Health check
curl http://localhost:8000/health
```

**El backend automáticamente:**
- Crea la conexión a PostgreSQL
- Ejecuta el seed demo (crea dimensión con terreno y árboles)
- Inicia la API en http://localhost:8000

### Paso 2: Verificar Backend

```bash
# Health check
curl http://localhost:8000/health

# Ver documentación interactiva
# Abrir: http://localhost:8000/docs
```

### Paso 3: Acceder al Frontend

El frontend ya está levantado con Docker (nginx). Solo abre en navegador:

**http://localhost:8080**

**Nota**: No necesitas levantar nada manualmente. El frontend se sirve automáticamente con nginx cuando ejecutas `docker-compose up -d`.

## Resumen de Puertos

- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Frontend**: http://localhost:8080
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Comandos Útiles

### Backend

```bash
# Ver logs
docker-compose logs -f backend

# Reiniciar backend
docker-compose restart backend

# Detener todo
docker-compose down

# Detener y eliminar volúmenes (limpiar BD)
docker-compose down -v
```

### Frontend

El frontend corre automáticamente con Docker (nginx). No necesitas comandos adicionales.

Si necesitas ver logs:
```bash
docker-compose logs -f frontend
```

## Troubleshooting

### Backend no responde

```bash
# Ver logs
docker-compose logs backend

# Verificar que PostgreSQL está corriendo
docker-compose ps postgres

# Reconstruir backend
docker-compose build --no-cache backend
docker-compose up -d backend
```

### Frontend no carga datos

1. Verificar que el backend está corriendo: http://localhost:8000/health
2. Abrir consola del navegador (F12) para ver errores
3. Verificar CORS en el backend (debe permitir *)

### Seed demo no se ejecutó

```bash
# Ejecutar manualmente
docker-compose exec backend python src/database/seed_demo.py
```

