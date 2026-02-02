"""
Adaptador de persistencia: implementa IBloqueRepository contra Postgres.
Las llamadas del caso de uso (get_bloques, get_bloque_by_id, get_world_size) terminan aquí.
"""
from typing import List, Optional
from uuid import UUID

from src.database.connection import get_connection
from src.domains.bloques.application.ports.bloque_repository import IBloqueRepository
from src.domains.bloques.schemas import DimensionResponse


class PostgresBloqueRepository(IBloqueRepository):
    """Implementación concreta del puerto: lee bloques en juego_dioses.bloques."""

    async def list_all(self) -> List[DimensionResponse]:
        """SELECT todos los bloques; ORDER BY creado_en DESC; mapea a DimensionResponse."""
        async with get_connection() as conn:
            rows = await conn.fetch("""
                SELECT 
                    id,
                    nombre,
                    ancho_metros,
                    alto_metros,
                    profundidad_maxima,
                    altura_maxima,
                    tamano_celda,
                    origen_x,
                    origen_y,
                    origen_z,
                    creado_por,
                    creado_en
                FROM juego_dioses.bloques
                ORDER BY creado_en DESC
            """)
            if not rows:
                return []
            return [
                DimensionResponse(
                    id=row["id"],
                    nombre=row["nombre"],
                    ancho_metros=float(row["ancho_metros"]),
                    alto_metros=float(row["alto_metros"]),
                    profundidad_maxima=row["profundidad_maxima"],
                    altura_maxima=row["altura_maxima"],
                    tamano_celda=float(row["tamano_celda"]),
                    origen_x=float(row["origen_x"]),
                    origen_y=float(row["origen_y"]),
                    origen_z=row["origen_z"],
                    creado_por=row["creado_por"],
                    creado_en=row["creado_en"]
                )
                for row in rows
            ]

    async def get_by_id(self, bloque_id: UUID) -> Optional[DimensionResponse]:
        """SELECT bloque por id; devuelve DimensionResponse o None si no existe."""
        async with get_connection() as conn:
            row = await conn.fetchrow("""
                SELECT 
                    id,
                    nombre,
                    ancho_metros,
                    alto_metros,
                    profundidad_maxima,
                    altura_maxima,
                    tamano_celda,
                    origen_x,
                    origen_y,
                    origen_z,
                    creado_por,
                    creado_en
                FROM juego_dioses.bloques
                WHERE id = $1
            """, bloque_id)
            if not row:
                return None
            return DimensionResponse(
                id=row["id"],
                nombre=row["nombre"],
                ancho_metros=float(row["ancho_metros"]),
                alto_metros=float(row["alto_metros"]),
                profundidad_maxima=row["profundidad_maxima"],
                altura_maxima=row["altura_maxima"],
                tamano_celda=float(row["tamano_celda"]),
                origen_x=float(row["origen_x"]),
                origen_y=float(row["origen_y"]),
                origen_z=row["origen_z"],
                creado_por=row["creado_por"],
                creado_en=row["creado_en"]
            )

    async def get_world_size_rows(self) -> List[dict]:
        async with get_connection() as conn:
            rows = await conn.fetch("""
                SELECT 
                    origen_x,
                    origen_y,
                    ancho_metros,
                    alto_metros
                FROM juego_dioses.bloques
            """)
            return [
                {
                    "origen_x": float(r["origen_x"]),
                    "origen_y": float(r["origen_y"]),
                    "ancho_metros": float(r["ancho_metros"]),
                    "alto_metros": float(r["alto_metros"]),
                }
                for r in rows
            ]

    async def get_config(self, bloque_id: str) -> Optional[dict]:
        """SELECT * del bloque por id; devuelve fila como dict para WorldBloqueManager (cache de config)."""
        async with get_connection() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM juego_dioses.bloques WHERE id = $1",
                bloque_id,
            )
            if not row:
                return None
            return dict(row)
