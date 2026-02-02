"""
Servicio de partículas: consultas y lógica de inercia.
"""
from typing import Optional, List, Dict, Any
import math
from src.database.connection import get_connection


async def get_particula(particula_id: str) -> Optional[Dict[str, Any]]:
    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            SELECT p.*, tp.nombre as tipo_nombre, tp.tipo_fisico, tp.densidad,
                   tp.conductividad_termica, tp.inercia_termica, tp.conductividad_electrica, tp.magnetismo
            FROM juego_dioses.particulas p
            JOIN juego_dioses.tipos_particulas tp ON p.tipo_particula_id = tp.id
            WHERE p.id = $1
            """,
            particula_id
        )
        return dict(row) if row else None


async def get_particula_en_posicion(
    bloque_id: str, celda_x: int, celda_y: int, celda_z: int
) -> Optional[Dict[str, Any]]:
    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            SELECT p.*, tp.nombre as tipo_nombre, tp.tipo_fisico
            FROM juego_dioses.particulas p
            JOIN juego_dioses.tipos_particulas tp ON p.tipo_particula_id = tp.id
            WHERE p.bloque_id = $1 AND p.celda_x = $2 AND p.celda_y = $3 AND p.celda_z = $4
            ORDER BY p.celda_z DESC, p.creado_en ASC
            LIMIT 1
            """,
            bloque_id, celda_x, celda_y, celda_z
        )
        return dict(row) if row else None


async def get_particulas_vecinas(
    bloque_id: str, celda_x: int, celda_y: int, celda_z: int, radio: int = 1
) -> List[Dict[str, Any]]:
    async with get_connection() as conn:
        rows = await conn.fetch(
            """
            SELECT p.*, tp.nombre as tipo_nombre, tp.tipo_fisico
            FROM juego_dioses.particulas p
            JOIN juego_dioses.tipos_particulas tp ON p.tipo_particula_id = tp.id
            WHERE p.bloque_id = $1
            AND ABS(p.celda_x - $2) <= $5 AND ABS(p.celda_y - $3) <= $5 AND ABS(p.celda_z - $4) <= $5
            AND (POWER(p.celda_x - $2, 2) + POWER(p.celda_y - $3, 2) + POWER(p.celda_z - $4, 2)) <= POWER($5, 2)
            ORDER BY POWER(p.celda_x - $2, 2) + POWER(p.celda_y - $3, 2) + POWER(p.celda_z - $4, 2)
            """,
            bloque_id, celda_x, celda_y, celda_z, radio
        )
        return [dict(row) for row in rows]


async def get_particulas_cercanas(
    bloque_id: str, celda_x: int, celda_y: int, celda_z: int, radio: int
) -> List[Dict[str, Any]]:
    return await get_particulas_vecinas(bloque_id, celda_x, celda_y, celda_z, radio)


async def get_tipo_particula(tipo_id: str) -> Optional[Dict[str, Any]]:
    async with get_connection() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM juego_dioses.tipos_particulas WHERE id = $1", tipo_id
        )
        return dict(row) if row else None


async def get_tipo_particula_por_nombre(nombre: str) -> Optional[Dict[str, Any]]:
    async with get_connection() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM juego_dioses.tipos_particulas WHERE nombre = $1", nombre
        )
        return dict(row) if row else None


def calcular_distancia(
    x1: int, y1: int, z1: int, x2: int, y2: int, z2: int
) -> float:
    return math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2)


def calcular_distancia_particulas(
    particula1: Dict[str, Any], particula2: Dict[str, Any]
) -> float:
    return calcular_distancia(
        particula1['celda_x'], particula1['celda_y'], particula1['celda_z'],
        particula2['celda_x'], particula2['celda_y'], particula2['celda_z']
    )


def evaluar_temperatura(
    temperatura: float, operador: str, valor: float, histeresis: float = 0.0
) -> bool:
    valor_ajustado = valor
    if operador in ('<', '<='):
        valor_ajustado = valor - histeresis
    elif operador in ('>', '>='):
        valor_ajustado = valor + histeresis
    if operador == '<':
        return temperatura < valor_ajustado
    elif operador == '<=':
        return temperatura <= valor_ajustado
    elif operador == '>':
        return temperatura > valor_ajustado
    elif operador == '>=':
        return temperatura >= valor_ajustado
    elif operador == '==':
        return abs(temperatura - valor) < 0.1
    raise ValueError(f"Operador no válido: {operador}. Use: '<', '<=', '>', '>=', '=='")


async def get_transiciones(tipo_particula_id: str) -> List[Dict[str, Any]]:
    async with get_connection() as conn:
        rows = await conn.fetch(
            """
            SELECT * FROM juego_dioses.transiciones_particulas
            WHERE tipo_origen_id = $1 AND activa = true
            ORDER BY prioridad DESC
            """,
            tipo_particula_id
        )
        return [dict(row) for row in rows]
