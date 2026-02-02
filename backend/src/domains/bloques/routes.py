"""
Endpoints para Bloques
"""
import math
from fastapi import APIRouter, HTTPException
from typing import List
from uuid import UUID

from src.database.connection import get_connection
from src.domains.bloques.schemas import DimensionResponse, WorldSizeResponse

router = APIRouter(prefix="/bloques", tags=["bloques"])


@router.get("", response_model=List[DimensionResponse])
async def list_dimensions():
    """Listar todos los bloques"""
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

        bloques = []
        for row in rows:
            bloques.append(DimensionResponse(
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
            ))

        return bloques


@router.get("/{bloque_id}", response_model=DimensionResponse)
async def get_dimension(bloque_id: UUID):
    """Obtener un bloque específico por ID"""
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
            raise HTTPException(status_code=404, detail="Bloque no encontrado")

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


@router.get("/world/size", response_model=WorldSizeResponse)
async def get_world_size():
    """
    Obtener el tamaño total del mundo (todos los bloques combinados).
    Calcula el bounding box de todos los bloques para determinar el tamaño total
    del mundo abierto.
    """
    async with get_connection() as conn:
        rows = await conn.fetch("""
            SELECT 
                origen_x,
                origen_y,
                ancho_metros,
                alto_metros
            FROM juego_dioses.bloques
        """)

        if not rows:
            return WorldSizeResponse(
                ancho_total=1000.0,
                alto_total=1000.0,
                radio_mundo=math.sqrt(500.0 * 500.0 + 500.0 * 500.0),
                min_x=0.0,
                max_x=1000.0,
                min_y=0.0,
                max_y=1000.0,
                centro_x=500.0,
                centro_y=500.0
            )

        min_x = float('inf')
        max_x = float('-inf')
        min_y = float('inf')
        max_y = float('-inf')

        for row in rows:
            origen_x = float(row["origen_x"])
            origen_y = float(row["origen_y"])
            ancho = float(row["ancho_metros"])
            alto = float(row["alto_metros"])
            bloque_min_x = origen_x
            bloque_max_x = origen_x + ancho
            bloque_min_y = origen_y
            bloque_max_y = origen_y + alto
            min_x = min(min_x, bloque_min_x)
            max_x = max(max_x, bloque_max_x)
            min_y = min(min_y, bloque_min_y)
            max_y = max(max_y, bloque_max_y)

        ancho_total = max_x - min_x
        alto_total = max_y - min_y
        centro_x = (min_x + max_x) / 2.0
        centro_y = (min_y + max_y) / 2.0
        half_width = ancho_total / 2.0
        half_height = alto_total / 2.0
        radio_mundo = math.sqrt(half_width * half_width + half_height * half_height)

        return WorldSizeResponse(
            ancho_total=ancho_total,
            alto_total=alto_total,
            radio_mundo=radio_mundo,
            min_x=min_x,
            max_x=max_x,
            min_y=min_y,
            max_y=max_y,
            centro_x=centro_x,
            centro_y=centro_y
        )
