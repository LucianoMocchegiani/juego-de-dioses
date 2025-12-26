"""
Endpoints para Partículas
"""
import logging
import asyncpg
from fastapi import APIRouter, HTTPException, Query
from uuid import UUID
from typing import List

from src.database.connection import get_connection
from src.models.schemas import (
    ParticleResponse,
    ParticlesResponse,
    ParticleViewportQuery,
    ParticleTypeResponse,
    ParticleTypesResponse,
    parse_jsonb_field
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bloques", tags=["particles"])

# Tipos de partículas que son indestructibles (no pueden ser extraídas o modificadas)
INDESTRUCTIBLE_TYPES = ['límite']


def is_indestructible(tipo_nombre: str) -> bool:
    """
    Verificar si un tipo de partícula es indestructible.
    
    Args:
        tipo_nombre: Nombre del tipo de partícula
        
    Returns:
        True si el tipo es indestructible, False en caso contrario
    """
    return tipo_nombre in INDESTRUCTIBLE_TYPES


async def validate_particle_position(conn: asyncpg.Connection, bloque_id: UUID, x: int, y: int, z: int) -> bool:
    """
    Validar que la posición de la partícula esté dentro de los límites del bloque.
    
    Valida que las coordenadas (x, y, z) estén dentro de los límites definidos por el bloque:
    - x: 0 <= x < max_x (donde max_x = ancho_metros / tamano_celda)
    - y: 0 <= y < max_y (donde max_y = alto_metros / tamano_celda)
    - z: profundidad_maxima <= z <= altura_maxima
    
    Esta función se usará en:
    - Endpoint POST para crear partículas (cuando se implemente)
    - Validación en batch de creación de partículas
    - Validación en funciones de construcción de terrenos
    
    Args:
        conn: Conexión asyncpg a la base de datos
        bloque_id: UUID del bloque
        x: Coordenada X en celdas
        y: Coordenada Y en celdas
        z: Coordenada Z en celdas
        
        Returns:
        True si la posición es válida, False si está fuera de límites o el bloque no existe
    """
    # Obtener límites del bloque
    bloque = await conn.fetchrow("""
        SELECT ancho_metros, alto_metros, profundidad_maxima, altura_maxima, tamano_celda
        FROM juego_dioses.bloques
        WHERE id = $1
    """, bloque_id)
    
    if not bloque:
        return False
    
    # Calcular límites en celdas (X e Y)
    max_x = int(bloque['ancho_metros'] / bloque['tamano_celda'])
    max_y = int(bloque['alto_metros'] / bloque['tamano_celda'])
    min_z = bloque['profundidad_maxima']
    max_z = bloque['altura_maxima']
    
    # Validar límites
    if x < 0 or x >= max_x:
        return False
    if y < 0 or y >= max_y:
        return False
    if z < min_z or z > max_z:
        return False
    
    return True


@router.get("/{bloque_id}/particle-types", response_model=ParticleTypesResponse)
async def get_particle_types_in_viewport(
    bloque_id: UUID,
    x_min: int = Query(..., ge=0, description="Coordenada X mínima"),
    x_max: int = Query(..., ge=0, description="Coordenada X máxima"),
    y_min: int = Query(..., ge=0, description="Coordenada Y mínima"),
    y_max: int = Query(..., ge=0, description="Coordenada Y máxima"),
    z_min: int = Query(-10, description="Coordenada Z mínima"),
    z_max: int = Query(10, description="Coordenada Z máxima")
):
    """
    Obtener tipos de partículas únicos en un viewport con color y geometría.
    
    Esta query se puede cachear en backend por 5-10 minutos ya que los tipos
    cambian menos frecuentemente que las partículas.
    
    Ventajas:
    - Solo retorna tipos únicos (sin duplicación)
    - 50% menos datos transferidos vs incluir color/geometría en cada partícula
    - Cache eficiente en backend
    
    Retorna:
    - color: Color del tipo (VARCHAR desde BD, puede ser nombre CSS o hex)
    - geometria: Geometría visual (JSONB desde BD, default: {"tipo": "box"})
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
    
    async with get_connection() as conn:
        # Verificar que el bloque existe
        bloque_exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM juego_dioses.bloques WHERE id = $1)",
            bloque_id
        )
        if not bloque_exists:
            raise HTTPException(status_code=404, detail="Bloque no encontrado")
        
        # Obtener IDs de tipos únicos en viewport
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
            logger.debug(f"No particle types found in viewport for bloque {bloque_id}")
            return ParticleTypesResponse(types=[])
        
        # Obtener tipos con color, geometría y opacidad
        tipos = await conn.fetch("""
            SELECT 
                id,
                nombre,
                color,
                geometria,
                opacidad
            FROM juego_dioses.tipos_particulas
            WHERE id = ANY($1::uuid[])
        """, tipo_ids_list)
        
        # Parsear color, geometría y opacidad usando helper y crear objetos ParticleTypeResponse
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
        
        logger.debug(f"Found {len(result)} unique particle types in viewport")
        return ParticleTypesResponse(types=result)


@router.get("/{bloque_id}/particles", response_model=ParticlesResponse)
async def get_particles_by_viewport(
    bloque_id: UUID,
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
    
    # Verificar que el bloque existe
    async with get_connection() as conn:
        bloque_exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM juego_dioses.bloques WHERE id = $1)",
            bloque_id
        )
        
        if not bloque_exists:
            raise HTTPException(status_code=404, detail="Bloque no encontrado")
        
        # Obtener partículas en el viewport (SIN estilos - vienen en query separada)
        rows = await conn.fetch("""
            SELECT 
                p.id,
                p.bloque_id,
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
            WHERE p.bloque_id = $1
              AND p.celda_x BETWEEN $2 AND $3
              AND p.celda_y BETWEEN $4 AND $5
              AND p.celda_z BETWEEN $6 AND $7
              AND p.extraida = false
            ORDER BY p.celda_z, p.celda_y, p.celda_x
        """, bloque_id, x_min, x_max, y_min, y_max, z_min, z_max)
        
        # Contar total
        total = await conn.fetchval("""
            SELECT COUNT(*)
            FROM juego_dioses.particulas
            WHERE bloque_id = $1
              AND celda_x BETWEEN $2 AND $3
              AND celda_y BETWEEN $4 AND $5
              AND celda_z BETWEEN $6 AND $7
              AND extraida = false
        """, bloque_id, x_min, x_max, y_min, y_max, z_min, z_max)
        
        # Logging para debugging
        if not rows:
            logger.warning(f"No particles found for bloque {bloque_id} in viewport")
        else:
            logger.debug(f"Found {len(rows)} particles in viewport")
        
        # Convertir a modelos usando método estático (sin estilos)
        particles = [ParticleResponse.from_row(row) for row in rows]
        
        return ParticlesResponse(
            bloque_id=bloque_id,
            particles=particles,
            total=total,
            viewport=viewport
        )


@router.get("/{bloque_id}/particles/{particle_id}", response_model=ParticleResponse)
async def get_particle(bloque_id: UUID, particle_id: UUID):
    """
    Obtener una partícula específica por ID
    """
    async with get_connection() as conn:
        row = await conn.fetchrow("""
            SELECT 
                p.id,
                p.bloque_id,
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
            WHERE p.id = $1 AND p.bloque_id = $2
        """, particle_id, bloque_id)
        
        if not row:
            raise HTTPException(status_code=404, detail="Partícula no encontrada")
        
        # Usar método estático para conversión (sin estilos)
        return ParticleResponse.from_row(row)

