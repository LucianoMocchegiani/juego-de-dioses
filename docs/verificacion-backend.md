# Verificación del backend

Cómo comprobar que el backend arranca bien y que la API responde.

## 1. Sin Docker (rápido: imports y app)

Desde la raíz del repo:

```powershell
cd juego-de-dioses\backend
$env:PYTHONPATH = (Get-Location).Path
python -c "from src.main import app; print('OK: app carga')"
```

Si ves `OK: app carga`, los imports de `src/domains/` y `src/world_creation_engine/` están bien. Si falla, el traceback indicará el módulo que falta o el error.

Para levantar el servidor en local (necesitas PostgreSQL y variables de entorno):

```powershell
cd juego-de-dioses\backend
$env:PYTHONPATH = (Get-Location).Path
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 2. Con Docker (recomendado para comprobar todo)

El `docker-compose` monta `./backend` en el contenedor, así que el código que se ejecuta es el de tu carpeta (incluido `src/domains/`, `src/world_creation_engine/`, etc.). No hace falta quitar la caché de Docker para que use el código nuevo.

Para estar seguros de que no hay capas viejas de imagen, puedes reconstruir el backend **sin caché** y levantar solo backend y dependencias:

```powershell
cd juego-de-dioses
docker compose build --no-cache backend
docker compose up postgres redis backend
```

O, si ya tienes todo levantado y solo quieres reiniciar el backend con el código actual:

```powershell
cd juego-de-dioses
docker compose up -d postgres redis
docker compose up backend
```

(`backend` usa `--reload`, así que los cambios en código se recargan solos mientras el contenedor esté arriba.)

---

## 3. Comprobar que la API responde

Con el backend en marcha (local o Docker):

1. **Health**
   - `GET http://localhost:8000/health`
   - Debe devolver `"status": "ok"` (o `"degraded"` si la BD no está).

2. **Info API**
   - `GET http://localhost:8000/api/v1`
   - Debe devolver el JSON con `endpoints` (bloques, particles, characters, celestial, etc.).

3. **OpenAPI**
   - Abrir en el navegador: `http://localhost:8000/docs`
   - Debe verse la misma lista de rutas que antes (bloques, particles, agrupaciones, characters, celestial).

4. **Un endpoint por dominio** (con BD y datos de demo):
   - `GET http://localhost:8000/api/v1/bloques` → lista de bloques.
   - `GET http://localhost:8000/api/v1/celestial/state` → estado celestial.

Si todo eso responde bien, la estructura por dominio (`src/domains/`) y el motor de creación (`src/world_creation_engine/`) están funcionando correctamente. No es necesario levantar sin caché de Docker salvo que quieras forzar una imagen limpia; con el volumen montado, el código que corre es siempre el de `./backend`.
