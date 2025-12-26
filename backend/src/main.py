"""
Juego de Dioses - Backend API
Sistema de partículas y agrupaciones con FastAPI
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path
import uvicorn
from dotenv import load_dotenv
import os

# Cargar variables de entorno
load_dotenv()

# Manager de conexiones WebSocket
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

# Importar módulo de base de datos
from src.database.connection import create_pool, close_pool, health_check as db_health_check

# Lifespan events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Iniciando Juego de Dioses Backend...")
    print("WebSocket disponible")
    
    # Crear pool de conexiones a PostgreSQL
    try:
        await create_pool()
        health = await db_health_check()
        print(f"Base de datos: {health['message']}")
        
        # Ejecutar seeds en segundo plano para no bloquear el inicio de la aplicación
        import asyncio
        from src.database.connection import get_connection
        
        async def run_seeds():
            """Ejecutar seeds en segundo plano"""
            try:
                async with get_connection() as conn:
                    # Verificar terreno test 2 (por defecto)
                    demo_exists = await conn.fetchval(
                        "SELECT EXISTS(SELECT 1 FROM juego_dioses.bloques WHERE nombre = 'Terreno Test 2 - Lago y Montaña')"
                    )
                    if not demo_exists:
                        print("Dimensión demo (Terreno Test 2 - Lago y Montaña) no encontrada. Ejecutando seed terrain test 2...")
                        from src.database.seed_terrain_test_2 import seed_terrain_test_2
                        await seed_terrain_test_2()
                    else:
                        print("Dimensión demo (Terreno Test 2 - Lago y Montaña) ya existe.")
                    
                    # Verificar terreno test 1 (bosque denso)
                    test1_exists = await conn.fetchval(
                        "SELECT EXISTS(SELECT 1 FROM juego_dioses.bloques WHERE nombre = 'Terreno Test 1 - Bosque Denso')"
                    )
                    if not test1_exists:
                        print("Dimensión test 1 (Terreno Test 1 - Bosque Denso) no encontrada. Ejecutando seed terrain test 1...")
                        from src.database.seed_terrain_test_1 import seed_terrain_test_1
                        await seed_terrain_test_1()
                    else:
                        print("Dimensión test 1 (Terreno Test 1 - Bosque Denso) ya existe.")
                    
                    # Actualizar rutas de modelos a estructura biped/male/ si es necesario
                    # Este script es idempotente: solo actualiza registros que necesitan cambios
                    print("Verificando y actualizando rutas de modelos a estructura biped/male/...")
                    from src.database.seed_biped_structure import migrate_model_paths
                    await migrate_model_paths()
            except Exception as e:
                print(f"Error ejecutando seeds en segundo plano: {e}")
        
        # Ejecutar seeds en segundo plano (no bloquea el startup)
        asyncio.create_task(run_seeds())
        print("Seeds iniciados en segundo plano. La aplicación está lista para recibir peticiones.")
        
        # Iniciar servicio de tiempo celestial en segundo plano (no bloquea)
        from src.api.routes.celestial import start_celestial_service_background_task
        asyncio.create_task(start_celestial_service_background_task())
        print("Servicio de tiempo celestial iniciado en segundo plano.")
    except Exception as e:
        print(f"Error inicializando base de datos: {e}")
    
    yield
    
    # Shutdown
    print("Cerrando conexiones...")
    await close_pool()

# Crear aplicación FastAPI
app = FastAPI(
    title="Juego de Dioses API",
    description="Sistema de partículas y agrupaciones",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/health")
async def health_check():
    # Verificar salud de la base de datos
    db_health = await db_health_check()
    
    return {
        "status": "ok" if db_health["status"] == "ok" else "degraded",
        "service": "juego_de_dioses-backend",
        "version": "1.0.0",
        "database": db_health
    }

# API Routes
from src.api.routes import dimensions, particles, agrupaciones, characters, celestial

app.include_router(dimensions.router, prefix="/api/v1")
app.include_router(particles.router, prefix="/api/v1")
app.include_router(agrupaciones.router, prefix="/api/v1")
app.include_router(characters.router, prefix="/api/v1")
app.include_router(celestial.router, prefix="/api/v1")

# Servir archivos estáticos de modelos 3D
static_models_path = Path("static/models")
static_models_path.mkdir(parents=True, exist_ok=True)
app.mount("/static/models", StaticFiles(directory=str(static_models_path)), name="models")

@app.get("/api/v1")
async def api_info():
    return {
        "message": "Juego de Dioses API v1",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "bloques": "/api/v1/bloques",
            "particles": "/api/v1/bloques/{id}/particles",
            "agrupaciones": "/api/v1/bloques/{id}/agrupaciones",
            "characters": "/api/v1/bloques/{id}/characters",
            "celestial_state": "/api/v1/celestial/state",
            "celestial_temperature": "/api/v1/celestial/temperature"
        }
    }

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Procesar mensaje
            if data.startswith("world:subscribe"):
                await manager.send_personal_message(
                    f"Subscribed to world: {data}",
                    websocket
                )
            else:
                await manager.send_personal_message(
                    f"Message received: {data}",
                    websocket
                )
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )

