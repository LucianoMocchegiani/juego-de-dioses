"""
Juego de Dioses - Backend API
Sistema de partículas y agrupaciones con FastAPI
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
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
        
        # Verificar si existe la dimensión demo, si no, ejecutar seed demo
        from src.database.connection import get_connection
        async with get_connection() as conn:
            demo_exists = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM juego_dioses.dimensiones WHERE nombre = 'Demo - Terreno con Arboles')"
            )
            if not demo_exists:
                print("Dimensión demo no encontrada. Ejecutando seed demo...")
                from src.database.seed_demo import seed_demo
                await seed_demo()
            else:
                print("Dimensión demo ya existe.")
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
from src.api.routes import dimensions, particles, agrupaciones, characters

app.include_router(dimensions.router, prefix="/api/v1")
app.include_router(particles.router, prefix="/api/v1")
app.include_router(agrupaciones.router, prefix="/api/v1")
app.include_router(characters.router, prefix="/api/v1")

@app.get("/api/v1")
async def api_info():
    return {
        "message": "Juego de Dioses API v1",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "dimensions": "/api/v1/dimensions",
            "particles": "/api/v1/dimensions/{id}/particles",
            "agrupaciones": "/api/v1/dimensions/{id}/agrupaciones",
            "characters": "/api/v1/dimensions/{id}/characters"
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

