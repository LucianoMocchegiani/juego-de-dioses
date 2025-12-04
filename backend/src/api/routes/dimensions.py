"""
Endpoints para Dimensiones
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List
from uuid import UUID

from src.database.connection import get_connection
from src.models.schemas import DimensionResponse

router = APIRouter(prefix="/dimensions", tags=["dimensions"])


@router.get("", response_model=List[DimensionResponse])
async def list_dimensions():
    """
    Listar todas las dimensiones
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
            FROM juego_dioses.dimensiones
            ORDER BY creado_en DESC
        """)
        
        if not rows:
            return []
        
        dimensions = []
        for row in rows:
            dimensions.append(DimensionResponse(
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
        
        return dimensions


@router.get("/{dimension_id}", response_model=DimensionResponse)
async def get_dimension(dimension_id: UUID):
    """
    Obtener una dimensión específica por ID
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
            FROM juego_dioses.dimensiones
            WHERE id = $1
        """, dimension_id)
        
        if not row:
            raise HTTPException(status_code=404, detail="Dimensión no encontrada")
        
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

