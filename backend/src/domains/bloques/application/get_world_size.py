"""
Caso de uso: obtener el tamaño total del mundo (todos los bloques combinados).
Recibe el puerto IBloqueRepository; get_world_size_rows en runtime es PostgresBloqueRepository.
"""
import math
from typing import List

from src.domains.bloques.application.ports.bloque_repository import IBloqueRepository
from src.domains.bloques.schemas import WorldSizeResponse


async def get_world_size(repository: IBloqueRepository) -> WorldSizeResponse:
    """
    Calcular el bounding box de todos los bloques para el tamaño total del mundo.
    Si no hay bloques, devuelve valores por defecto (1000x1000).
    """
    # get_world_size_rows en runtime es PostgresBloqueRepository.get_world_size_rows
    rows = await repository.get_world_size_rows()
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
    min_x = float("inf")
    max_x = float("-inf")
    min_y = float("inf")
    max_y = float("-inf")
    for row in rows:
        origen_x = row["origen_x"]
        origen_y = row["origen_y"]
        ancho = row["ancho_metros"]
        alto = row["alto_metros"]
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
