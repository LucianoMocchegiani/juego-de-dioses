"""
Endpoints para Agrupaciones
"""
from fastapi import APIRouter, HTTPException
from typing import List
from uuid import UUID

from src.database.connection import get_connection
from src.domains.agrupaciones.schemas import AgrupacionResponse, AgrupacionWithParticles
from src.domains.particles.schemas import ParticleResponse

router = APIRouter(prefix="/bloques", tags=["agrupaciones"])


@router.get("/{bloque_id}/agrupaciones", response_model=List[AgrupacionResponse])
async def list_agrupaciones(bloque_id: UUID):
    async with get_connection() as conn:
        bloque_exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM juego_dioses.bloques WHERE id = $1)",
            bloque_id
        )
        if not bloque_exists:
            raise HTTPException(status_code=404, detail="Bloque no encontrado")
        rows = await conn.fetch("""
            SELECT
                a.id, a.bloque_id, a.nombre, a.tipo, a.descripcion, a.especie,
                a.posicion_x, a.posicion_y, a.posicion_z, a.activa, a.salud,
                a.tiene_nucleo, a.nucleo_conectado, a.ultima_verificacion_nucleo,
                a.creado_por, a.creado_en, a.modificado_en,
                COUNT(p.id) as particulas_count
            FROM juego_dioses.agrupaciones a
            LEFT JOIN juego_dioses.particulas p ON a.id = p.agrupacion_id AND p.extraida = false
            WHERE a.bloque_id = $1
            GROUP BY a.id
            ORDER BY a.creado_en DESC
        """, bloque_id)
        agrupaciones = []
        for row in rows:
            agrupaciones.append(AgrupacionResponse(
                id=row["id"],
                bloque_id=row["bloque_id"],
                nombre=row["nombre"],
                tipo=row["tipo"],
                descripcion=row["descripcion"],
                especie=row["especie"],
                posicion_x=row["posicion_x"],
                posicion_y=row["posicion_y"],
                posicion_z=row["posicion_z"],
                activa=row["activa"],
                salud=float(row["salud"]),
                tiene_nucleo=row["tiene_nucleo"],
                nucleo_conectado=row["nucleo_conectado"],
                ultima_verificacion_nucleo=row["ultima_verificacion_nucleo"],
                creado_por=row["creado_por"],
                creado_en=row["creado_en"],
                modificado_en=row["modificado_en"],
                particulas_count=row["particulas_count"],
            ))
        return agrupaciones


@router.get("/{bloque_id}/agrupaciones/{agrupacion_id}", response_model=AgrupacionWithParticles)
async def get_agrupacion(bloque_id: UUID, agrupacion_id: UUID):
    async with get_connection() as conn:
        agrupacion_row = await conn.fetchrow("""
            SELECT id, bloque_id, nombre, tipo, descripcion, especie,
                   posicion_x, posicion_y, posicion_z, activa, salud,
                   tiene_nucleo, nucleo_conectado, ultima_verificacion_nucleo,
                   creado_por, creado_en, modificado_en
            FROM juego_dioses.agrupaciones
            WHERE id = $1 AND bloque_id = $2
        """, agrupacion_id, bloque_id)
        if not agrupacion_row:
            raise HTTPException(status_code=404, detail="Agrupación no encontrada")
        particulas_rows = await conn.fetch("""
            SELECT p.id, p.bloque_id, p.celda_x, p.celda_y, p.celda_z,
                   p.tipo_particula_id, p.estado_materia_id, p.cantidad, p.temperatura, p.energia,
                   p.extraida, p.agrupacion_id, p.es_nucleo, p.propiedades, p.creado_por,
                   p.creado_en, p.modificado_en,
                   tp.nombre as tipo_nombre, em.nombre as estado_nombre
            FROM juego_dioses.particulas p
            JOIN juego_dioses.tipos_particulas tp ON p.tipo_particula_id = tp.id
            JOIN juego_dioses.estados_materia em ON p.estado_materia_id = em.id
            WHERE p.agrupacion_id = $1 AND p.extraida = false
            ORDER BY p.celda_z, p.celda_y, p.celda_x
        """, agrupacion_id)
        particulas = [ParticleResponse.from_row(row) for row in particulas_rows]
        return AgrupacionWithParticles(
            id=agrupacion_row["id"],
            bloque_id=agrupacion_row["bloque_id"],
            nombre=agrupacion_row["nombre"],
            tipo=agrupacion_row["tipo"],
            descripcion=agrupacion_row["descripcion"],
            especie=agrupacion_row["especie"],
            posicion_x=agrupacion_row["posicion_x"],
            posicion_y=agrupacion_row["posicion_y"],
            posicion_z=agrupacion_row["posicion_z"],
            activa=agrupacion_row["activa"],
            salud=float(agrupacion_row["salud"]),
            tiene_nucleo=agrupacion_row["tiene_nucleo"],
            nucleo_conectado=agrupacion_row["nucleo_conectado"],
            ultima_verificacion_nucleo=agrupacion_row["ultima_verificacion_nucleo"],
            creado_por=agrupacion_row["creado_por"],
            creado_en=agrupacion_row["creado_en"],
            modificado_en=agrupacion_row["modificado_en"],
            particulas_count=len(particulas),
            particulas=particulas,
        )
