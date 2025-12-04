"""
Endpoints para Partículas
"""
from fastapi import APIRouter, HTTPException, Query
from uuid import UUID

from src.database.connection import get_connection
from src.models.schemas import (
    ParticleResponse,
    ParticlesResponse,
    ParticleViewportQuery
)

router = APIRouter(prefix="/dimensions", tags=["particles"])


@router.get("/{dimension_id}/particles", response_model=ParticlesResponse)
async def get_particles_by_viewport(
    dimension_id: UUID,
    x_min: int = Query(..., ge=0, description="Coordenada X mínima"),
    x_max: int = Query(..., ge=0, description="Coordenada X máxima"),
    y_min: int = Query(..., ge=0, description="Coordenada Y mínima"),
    y_max: int = Query(..., ge=0, description="Coordenada Y máxima"),
    z_min: int = Query(-10, description="Coordenada Z mínima"),
    z_max: int = Query(10, description="Coordenada Z máxima")
):
    """
    Obtener partículas en un viewport específico
    
    Retorna todas las partículas dentro del rango especificado (x_min a x_max, y_min a y_max, z_min a z_max)
    """
    # Validar viewport
    viewport = ParticleViewportQuery(
        x_min=x_min,
        x_max=x_max,
        y_min=y_min,
        y_max=y_max,
        z_min=z_min,
        z_max=z_max
    )
    viewport.validate_ranges()
    
    # Verificar que la dimensión existe
    async with get_connection() as conn:
        dim_exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM juego_dioses.dimensiones WHERE id = $1)",
            dimension_id
        )
        
        if not dim_exists:
            raise HTTPException(status_code=404, detail="Dimensión no encontrada")
        
        # Obtener partículas en el viewport
        rows = await conn.fetch("""
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
            WHERE p.dimension_id = $1
              AND p.celda_x BETWEEN $2 AND $3
              AND p.celda_y BETWEEN $4 AND $5
              AND p.celda_z BETWEEN $6 AND $7
              AND p.extraida = false
            ORDER BY p.celda_z, p.celda_y, p.celda_x
        """, dimension_id, x_min, x_max, y_min, y_max, z_min, z_max)
        
        # Contar total
        total = await conn.fetchval("""
            SELECT COUNT(*)
            FROM juego_dioses.particulas
            WHERE dimension_id = $1
              AND celda_x BETWEEN $2 AND $3
              AND celda_y BETWEEN $4 AND $5
              AND celda_z BETWEEN $6 AND $7
              AND extraida = false
        """, dimension_id, x_min, x_max, y_min, y_max, z_min, z_max)
        
        # Convertir a modelos
        import json
        particles = []
        for row in rows:
            # Parsear propiedades JSON si es string
            propiedades = row["propiedades"]
            if isinstance(propiedades, str):
                try:
                    propiedades = json.loads(propiedades) if propiedades else {}
                except:
                    propiedades = {}
            elif propiedades is None:
                propiedades = {}
            
            particles.append(ParticleResponse(
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
        
        return ParticlesResponse(
            dimension_id=dimension_id,
            particles=particles,
            total=total,
            viewport=viewport
        )


@router.get("/{dimension_id}/particles/{particle_id}", response_model=ParticleResponse)
async def get_particle(dimension_id: UUID, particle_id: UUID):
    """
    Obtener una partícula específica por ID
    """
    async with get_connection() as conn:
        row = await conn.fetchrow("""
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
            WHERE p.id = $1 AND p.dimension_id = $2
        """, particle_id, dimension_id)
        
        if not row:
            raise HTTPException(status_code=404, detail="Partícula no encontrada")
        
        return ParticleResponse(
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
            propiedades=row["propiedades"] if row["propiedades"] else {},
            creado_por=row["creado_por"],
            creado_en=row["creado_en"],
            modificado_en=row["modificado_en"]
        )

