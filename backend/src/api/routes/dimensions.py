"""
Endpoints para Bloques
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List
from uuid import UUID

from src.database.connection import get_connection
from src.models.schemas import DimensionResponse

router = APIRouter(prefix="/bloques", tags=["bloques"])


@router.get("", response_model=List[DimensionResponse])
async def list_dimensions():
    """
    Listar todos los bloques
    """
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
    """
    Obtener un bloque específico por ID
    """
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

