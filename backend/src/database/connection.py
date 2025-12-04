"""
Módulo de conexión a PostgreSQL
Pool de conexiones async con asyncpg
"""
import asyncpg
import os
from typing import Optional
from contextlib import asynccontextmanager

# Variables de entorno para conexión
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "postgres")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", 5432))
POSTGRES_USER = os.getenv("POSTGRES_USER", "juegodioses")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "juegodioses123")
POSTGRES_DB = os.getenv("POSTGRES_DB", "juego_dioses")

# Pool de conexiones global
_pool: Optional[asyncpg.Pool] = None


async def create_pool() -> asyncpg.Pool:
    """
    Crear pool de conexiones a PostgreSQL
    """
    global _pool
    
    if _pool is None:
        _pool = await asyncpg.create_pool(
            host=POSTGRES_HOST,
            port=POSTGRES_PORT,
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            database=POSTGRES_DB,
            min_size=2,
            max_size=10,
            command_timeout=60
        )
        print(f"Pool de conexiones PostgreSQL creado: {POSTGRES_DB}@{POSTGRES_HOST}:{POSTGRES_PORT}")
    
    return _pool


async def close_pool():
    """
    Cerrar pool de conexiones
    """
    global _pool
    
    if _pool is not None:
        await _pool.close()
        _pool = None
        print("Pool de conexiones PostgreSQL cerrado")


async def get_pool() -> asyncpg.Pool:
    """
    Obtener pool de conexiones (crear si no existe)
    """
    if _pool is None:
        return await create_pool()
    return _pool


@asynccontextmanager
async def get_connection():
    """
    Context manager para obtener una conexión del pool
    Uso:
        async with get_connection() as conn:
            result = await conn.fetch("SELECT * FROM ...")
    """
    pool = await get_pool()
    async with pool.acquire() as connection:
        yield connection


async def health_check() -> dict:
    """
    Verificar salud de la conexión a PostgreSQL
    Retorna: {"status": "ok" | "error", "message": str}
    """
    try:
        async with get_connection() as conn:
            # Ejecutar query simple para verificar conexión
            result = await conn.fetchval("SELECT 1")
            if result == 1:
                # Verificar que el esquema existe
                schema_exists = await conn.fetchval(
                    "SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = 'juego_dioses')"
                )
                if schema_exists:
                    return {
                        "status": "ok",
                        "message": "PostgreSQL conectado y esquema 'juego_dioses' existe"
                    }
                else:
                    return {
                        "status": "warning",
                        "message": "PostgreSQL conectado pero esquema 'juego_dioses' no existe"
                    }
            else:
                return {
                    "status": "error",
                    "message": "PostgreSQL conectado pero query de prueba falló"
                }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error conectando a PostgreSQL: {str(e)}"
        }

