"""
Endpoints para Agrupaciones
"""
from fastapi import APIRouter, HTTPException
from typing import List
from uuid import UUID

from src.database.connection import get_connection
from src.models.schemas import AgrupacionResponse, AgrupacionWithParticles

router = APIRouter(prefix="/dimensions", tags=["agrupaciones"])


@router.get("/{dimension_id}/agrupaciones", response_model=List[AgrupacionResponse])
async def list_agrupaciones(dimension_id: UUID):
    """
    Listar todas las agrupaciones en una dimensión
    """
    # Verificar que la dimensión existe
    async with get_connection() as conn:
        dim_exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM juego_dioses.dimensiones WHERE id = $1)",
            dimension_id
        )
        
        if not dim_exists:
            raise HTTPException(status_code=404, detail="Dimensión no encontrada")
        
        # Obtener agrupaciones con conteo de partículas
        rows = await conn.fetch("""
            SELECT 
                a.id,
                a.dimension_id,
                a.nombre,
                a.tipo,
                a.descripcion,
                a.especie,
                a.posicion_x,
                a.posicion_y,
                a.posicion_z,
                a.activa,
                a.salud,
                a.tiene_nucleo,
                a.nucleo_conectado,
                a.ultima_verificacion_nucleo,
                a.creado_por,
                a.creado_en,
                a.modificado_en,
                COUNT(p.id) as particulas_count
            FROM juego_dioses.agrupaciones a
            LEFT JOIN juego_dioses.particulas p ON a.id = p.agrupacion_id AND p.extraida = false
            WHERE a.dimension_id = $1
            GROUP BY a.id
            ORDER BY a.creado_en DESC
        """, dimension_id)
        
        agrupaciones = []
        for row in rows:
            agrupaciones.append(AgrupacionResponse(
                id=row["id"],
                dimension_id=row["dimension_id"],
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
                particulas_count=row["particulas_count"]
            ))
        
        return agrupaciones


@router.get("/{dimension_id}/agrupaciones/{agrupacion_id}", response_model=AgrupacionWithParticles)
async def get_agrupacion(dimension_id: UUID, agrupacion_id: UUID):
    """
    Obtener una agrupación específica con sus partículas
    """
    async with get_connection() as conn:
        # Obtener agrupación
        agrupacion_row = await conn.fetchrow("""
            SELECT 
                id,
                dimension_id,
                nombre,
                tipo,
                descripcion,
                especie,
                posicion_x,
                posicion_y,
                posicion_z,
                activa,
                salud,
                tiene_nucleo,
                nucleo_conectado,
                ultima_verificacion_nucleo,
                creado_por,
                creado_en,
                modificado_en
            FROM juego_dioses.agrupaciones
            WHERE id = $1 AND dimension_id = $2
        """, agrupacion_id, dimension_id)
        
        if not agrupacion_row:
            raise HTTPException(status_code=404, detail="Agrupación no encontrada")
        
        # Obtener partículas de la agrupación
        particulas_rows = await conn.fetch("""
            SELECT 
                p.id,
                p.dimension_id,
                p.celda_x,
                p.celda_y,
                p.celda_z,
                p.tipo_particula_id,
                p.estado_materia_id,
                p.cantidad,
                p.temperatura,
                p.energia,
                p.extraida,
                p.agrupacion_id,
                p.es_nucleo,
                p.propiedades,
                p.creado_por,
                p.creado_en,
                p.modificado_en,
                tp.nombre as tipo_nombre,
                em.nombre as estado_nombre
            FROM juego_dioses.particulas p
            JOIN juego_dioses.tipos_particulas tp ON p.tipo_particula_id = tp.id
            JOIN juego_dioses.estados_materia em ON p.estado_materia_id = em.id
            WHERE p.agrupacion_id = $1 AND p.extraida = false
            ORDER BY p.celda_z, p.celda_y, p.celda_x
        """, agrupacion_id)
        
        # Convertir partículas
        import json
        from src.models.schemas import ParticleResponse
        particulas = []
        for row in particulas_rows:
            # Parsear propiedades JSON si es string
            propiedades = row["propiedades"]
            if isinstance(propiedades, str):
                try:
                    propiedades = json.loads(propiedades) if propiedades else {}
                except:
                    propiedades = {}
            elif propiedades is None:
                propiedades = {}
            
            particulas.append(ParticleResponse(
                id=row["id"],
                dimension_id=row["dimension_id"],
                celda_x=row["celda_x"],
                celda_y=row["celda_y"],
                celda_z=row["celda_z"],
                tipo=row["tipo_nombre"],
                estado=row["estado_nombre"],
                tipo_particula_id=row["tipo_particula_id"],
                estado_materia_id=row["estado_materia_id"],
                cantidad=float(row["cantidad"]),
                temperatura=float(row["temperatura"]),
                energia=float(row["energia"]),
                extraida=row["extraida"],
                agrupacion_id=row["agrupacion_id"],
                es_nucleo=row["es_nucleo"],
                propiedades=propiedades,
                creado_por=row["creado_por"],
                creado_en=row["creado_en"],
                modificado_en=row["modificado_en"]
            ))
        
        return AgrupacionWithParticles(
            id=agrupacion_row["id"],
            dimension_id=agrupacion_row["dimension_id"],
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
            particulas=particulas
        )

