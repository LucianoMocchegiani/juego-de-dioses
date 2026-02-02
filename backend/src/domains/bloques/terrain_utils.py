"""
Consultas de altura del terreno en un bloque (dimensión).
"""
from typing import Optional
import asyncpg
from uuid import UUID


async def get_terrain_height(
    conn: asyncpg.Connection,
    dimension_id: UUID,
    x: int,
    y: int
) -> Optional[int]:
    """
    Obtener la altura máxima del terreno (Z más alto) en una posición X, Y específica.

    Busca la partícula con mayor Z (altura) en la posición (x, y) que no esté extraída.
    Si no hay partículas en esa posición, retorna None.

    Args:
        conn: Conexión a la base de datos
        dimension_id: ID de la dimensión
        x: Coordenada X en celdas
        y: Coordenada Y en celdas

    Returns:
        Altura máxima (Z) del terreno en esa posición, o None si no hay partículas
    """
    max_z = await conn.fetchval("""
        SELECT MAX(celda_z)
        FROM juego_dioses.particulas
        WHERE bloque_id = $1
          AND celda_x = $2
          AND celda_y = $3
          AND extraida = false
    """, dimension_id, x, y)

    return max_z


async def get_terrain_height_area(
    conn: asyncpg.Connection,
    dimension_id: UUID,
    x: int,
    y: int,
    radius: int = 1
) -> Optional[int]:
    """
    Obtener la altura máxima del terreno en un área alrededor de una posición.

    Busca la partícula con mayor Z en un área de (2*radius + 1) × (2*radius + 1) celdas
    centrada en (x, y). Esto es útil para terrenos irregulares.

    Args:
        conn: Conexión a la base de datos
        dimension_id: ID de la dimensión
        x: Coordenada X central en celdas
        y: Coordenada Y central en celdas
        radius: Radio del área a buscar (default: 1, busca 3×3)

    Returns:
        Altura máxima (Z) del terreno en el área, o None si no hay partículas
    """
    max_z = await conn.fetchval("""
        SELECT MAX(celda_z)
        FROM juego_dioses.particulas
        WHERE bloque_id = $1
          AND celda_x BETWEEN ($2::INTEGER - $4::INTEGER) AND ($2::INTEGER + $4::INTEGER)
          AND celda_y BETWEEN ($3::INTEGER - $4::INTEGER) AND ($3::INTEGER + $4::INTEGER)
          AND extraida = false
    """, dimension_id, x, y, radius)

    return max_z
