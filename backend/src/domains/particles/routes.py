"""
Endpoints para Partículas
"""
import logging
import asyncpg
from fastapi import APIRouter, HTTPException, Query
from uuid import UUID
from typing import List

from src.database.connection import get_connection
from src.domains.particles.schemas import (
    ParticleResponse,
    ParticlesResponse,
    ParticleViewportQuery,
    ParticleTypeResponse,
    ParticleTypesResponse,
)
from src.domains.shared.schemas import parse_jsonb_field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bloques", tags=["particles"])

INDESTRUCTIBLE_TYPES = ['límite']


def is_indestructible(tipo_nombre: str) -> bool:
    return tipo_nombre in INDESTRUCTIBLE_TYPES


async def validate_particle_position(conn: asyncpg.Connection, bloque_id: UUID, x: int, y: int, z: int) -> bool:
    bloque = await conn.fetchrow("""
        SELECT ancho_metros, alto_metros, profundidad_maxima, altura_maxima, tamano_celda
        FROM juego_dioses.bloques
        WHERE id = $1
    """, bloque_id)
    if not bloque:
        return False
    max_x = int(bloque['ancho_metros'] / bloque['tamano_celda'])
    max_y = int(bloque['alto_metros'] / bloque['tamano_celda'])
    min_z = bloque['profundidad_maxima']
    max_z = bloque['altura_maxima']
    if x < 0 or x >= max_x or y < 0 or y >= max_y or z < min_z or z > max_z:
        return False
    return True


@router.get("/{bloque_id}/particle-types", response_model=ParticleTypesResponse)
async def get_particle_types_in_viewport(
    bloque_id: UUID,
    x_min: int = Query(..., ge=0),
    x_max: int = Query(..., ge=0),
    y_min: int = Query(..., ge=0),
    y_max: int = Query(..., ge=0),
    z_min: int = Query(-10),
    z_max: int = Query(10),
):
    viewport = ParticleViewportQuery(x_min=x_min, x_max=x_max, y_min=y_min, y_max=y_max, z_min=z_min, z_max=z_max)
    viewport.validate_ranges()
    async with get_connection() as conn:
        bloque_exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM juego_dioses.bloques WHERE id = $1)",
            bloque_id
        )
        if not bloque_exists:
            raise HTTPException(status_code=404, detail="Bloque no encontrado")
        tipo_ids_rows = await conn.fetch("""
            SELECT DISTINCT p.tipo_particula_id
            FROM juego_dioses.particulas p
            WHERE p.bloque_id = $1
              AND p.celda_x BETWEEN $2 AND $3
              AND p.celda_y BETWEEN $4 AND $5
              AND p.celda_z BETWEEN $6 AND $7
              AND p.extraida = false
        """, bloque_id, x_min, x_max, y_min, y_max, z_min, z_max)
        tipo_ids_list = [row['tipo_particula_id'] for row in tipo_ids_rows]
        if not tipo_ids_list:
            return ParticleTypesResponse(types=[])
        tipos = await conn.fetch("""
            SELECT id, nombre, color, geometria, opacidad
            FROM juego_dioses.tipos_particulas
            WHERE id = ANY($1::uuid[])
        """, tipo_ids_list)
        result = []
        for row in tipos:
            geometria = parse_jsonb_field(row['geometria'])
            opacidad = float(row['opacidad']) if row['opacidad'] is not None else None
            result.append(ParticleTypeResponse(
                id=str(row['id']),
                nombre=row['nombre'],
                color=row['color'] if row['color'] else None,
                geometria=geometria if geometria else None,
                opacidad=opacidad
            ))
        return ParticleTypesResponse(types=result)


@router.get("/{bloque_id}/particles", response_model=ParticlesResponse)
async def get_particles_by_viewport(
    bloque_id: UUID,
    x_min: int = Query(..., ge=0),
    x_max: int = Query(..., ge=0),
    y_min: int = Query(..., ge=0),
    y_max: int = Query(..., ge=0),
    z_min: int = Query(-10),
    z_max: int = Query(10),
):
    viewport = ParticleViewportQuery(x_min=x_min, x_max=x_max, y_min=y_min, y_max=y_max, z_min=z_min, z_max=z_max)
    viewport.validate_ranges()
    async with get_connection() as conn:
        bloque_exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM juego_dioses.bloques WHERE id = $1)",
            bloque_id
        )
        if not bloque_exists:
            raise HTTPException(status_code=404, detail="Bloque no encontrado")
        rows = await conn.fetch("""
            SELECT
                p.id, p.bloque_id, p.celda_x, p.celda_y, p.celda_z,
                p.tipo_particula_id, p.estado_materia_id, p.cantidad, p.temperatura, p.energia,
                p.extraida, p.agrupacion_id, p.es_nucleo, p.propiedades, p.creado_por,
                p.creado_en, p.modificado_en,
                tp.nombre as tipo_nombre, em.nombre as estado_nombre
            FROM juego_dioses.particulas p
            JOIN juego_dioses.tipos_particulas tp ON p.tipo_particula_id = tp.id
            JOIN juego_dioses.estados_materia em ON p.estado_materia_id = em.id
            WHERE p.bloque_id = $1
              AND p.celda_x BETWEEN $2 AND $3
              AND p.celda_y BETWEEN $4 AND $5
              AND p.celda_z BETWEEN $6 AND $7
              AND p.extraida = false
            ORDER BY p.celda_z, p.celda_y, p.celda_x
        """, bloque_id, x_min, x_max, y_min, y_max, z_min, z_max)
        total = await conn.fetchval("""
            SELECT COUNT(*)
            FROM juego_dioses.particulas
            WHERE bloque_id = $1
              AND celda_x BETWEEN $2 AND $3
              AND celda_y BETWEEN $4 AND $5
              AND celda_z BETWEEN $6 AND $7
              AND extraida = false
        """, bloque_id, x_min, x_max, y_min, y_max, z_min, z_max)
        particles = [ParticleResponse.from_row(row) for row in rows]
        return ParticlesResponse(bloque_id=bloque_id, particles=particles, total=total, viewport=viewport)


@router.get("/{bloque_id}/particles/{particle_id}", response_model=ParticleResponse)
async def get_particle(bloque_id: UUID, particle_id: UUID):
    async with get_connection() as conn:
        row = await conn.fetchrow("""
            SELECT
                p.id, p.bloque_id, p.celda_x, p.celda_y, p.celda_z,
                p.tipo_particula_id, p.estado_materia_id, p.cantidad, p.temperatura, p.energia,
                p.extraida, p.agrupacion_id, p.es_nucleo, p.propiedades, p.creado_por,
                p.creado_en, p.modificado_en,
                tp.nombre as tipo_nombre, em.nombre as estado_nombre
            FROM juego_dioses.particulas p
            JOIN juego_dioses.tipos_particulas tp ON p.tipo_particula_id = tp.id
            JOIN juego_dioses.estados_materia em ON p.estado_materia_id = em.id
            WHERE p.id = $1 AND p.bloque_id = $2
        """, particle_id, bloque_id)
        if not row:
            raise HTTPException(status_code=404, detail="Partícula no encontrada")
        return ParticleResponse.from_row(row)
