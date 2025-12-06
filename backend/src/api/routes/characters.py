"""
Endpoints para Personajes (Bípedos)
"""
from fastapi import APIRouter, HTTPException, Path
from typing import List
from uuid import UUID
import json

from src.database.connection import get_connection
from src.database.templates.bipedos.registry import get_biped_template, list_biped_template_ids
from src.database.creators.entity_creator import EntityCreator
from src.models.schemas import CharacterResponse, CharacterCreate, BipedGeometry
from src.models.schemas import parse_jsonb_field

router = APIRouter(prefix="/dimensions/{dimension_id}/characters", tags=["characters"])


@router.get("/{character_id}", response_model=CharacterResponse)
async def get_character(
    dimension_id: UUID = Path(..., description="ID de la dimensión"),
    character_id: UUID = Path(..., description="ID del personaje (agrupación)")
):
    """
    Obtener información de un personaje
    """
    async with get_connection() as conn:
        # Verificar que la dimensión existe
        dim_exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM juego_dioses.dimensiones WHERE id = $1)",
            dimension_id
        )
        
        if not dim_exists:
            raise HTTPException(status_code=404, detail="Dimensión no encontrada")
        
        # Obtener agrupación (incluyendo posición)
        agrupacion = await conn.fetchrow("""
            SELECT id, nombre, tipo, especie, geometria_agrupacion, posicion_x, posicion_y, posicion_z
            FROM juego_dioses.agrupaciones
            WHERE id = $1 AND dimension_id = $2
        """, character_id, dimension_id)
        
        if not agrupacion:
            raise HTTPException(status_code=404, detail="Personaje no encontrado")
        
        # Verificar que es un bípedo
        if agrupacion['tipo'] != 'biped':
            raise HTTPException(status_code=400, detail="La agrupación no es un personaje (bípedo)")
        
        # Los bípedos no tienen partículas físicas, usar posición de la agrupación
        # La posición está en agrupaciones.posicion_x/y/z
        
        # Parsear geometria_agrupacion
        geometria = None
        if agrupacion['geometria_agrupacion']:
            geometria_data = parse_jsonb_field(agrupacion['geometria_agrupacion'])
            if geometria_data:
                try:
                    geometria = BipedGeometry(**geometria_data)
                except Exception as e:
                    # Si hay error parseando, continuar sin geometría
                    print(f"Error parseando geometria_agrupacion: {e}")
        
        return CharacterResponse(
            id=str(agrupacion['id']),
            dimension_id=str(dimension_id),
            nombre=agrupacion['nombre'],
            tipo=agrupacion['tipo'],
            especie=agrupacion['especie'] or '',
            posicion={
                'x': agrupacion['posicion_x'] or 0,
                'y': agrupacion['posicion_y'] or 0,
                'z': agrupacion['posicion_z'] or 0
            },
            geometria_agrupacion=geometria,
            particulas_count=0  # Los bípedos no tienen partículas físicas
        )


@router.get("", response_model=List[CharacterResponse])
async def list_characters(
    dimension_id: UUID = Path(..., description="ID de la dimensión")
):
    """
    Listar todos los personajes en una dimensión
    """
    async with get_connection() as conn:
        # Verificar que la dimensión existe
        dim_exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM juego_dioses.dimensiones WHERE id = $1)",
            dimension_id
        )
        
        if not dim_exists:
            raise HTTPException(status_code=404, detail="Dimensión no encontrada")
        
        # Obtener todas las agrupaciones de tipo 'biped' (incluyendo posición)
        agrupaciones = await conn.fetch("""
            SELECT id, nombre, tipo, especie, geometria_agrupacion, posicion_x, posicion_y, posicion_z
            FROM juego_dioses.agrupaciones
            WHERE dimension_id = $1 AND tipo = 'biped'
            ORDER BY nombre
        """, dimension_id)
        
        characters = []
        for agrupacion in agrupaciones:
            # Los bípedos no tienen partículas físicas, usar posición de la agrupación
            
            # Parsear geometria_agrupacion
            geometria = None
            if agrupacion['geometria_agrupacion']:
                geometria_data = parse_jsonb_field(agrupacion['geometria_agrupacion'])
                if geometria_data:
                    try:
                        geometria = BipedGeometry(**geometria_data)
                    except Exception as e:
                        # Si hay error parseando, continuar sin geometría
                        print(f"Error parseando geometria_agrupacion: {e}")
            
            characters.append(CharacterResponse(
                id=str(agrupacion['id']),
                dimension_id=str(dimension_id),
                nombre=agrupacion['nombre'],
                tipo=agrupacion['tipo'],
                especie=agrupacion['especie'] or '',
                posicion={
                    'x': agrupacion['posicion_x'] or 0,
                    'y': agrupacion['posicion_y'] or 0,
                    'z': agrupacion['posicion_z'] or 0
                },
                geometria_agrupacion=geometria,
                particulas_count=0  # Los bípedos no tienen partículas físicas
            ))
        
        return characters


@router.post("", response_model=CharacterResponse, status_code=201)
async def create_character(
    character_data: CharacterCreate,
    dimension_id: UUID = Path(..., description="ID de la dimensión")
):
    """
    Crear un personaje desde un template
    """
    async with get_connection() as conn:
        # Verificar que la dimensión existe
        dim_exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM juego_dioses.dimensiones WHERE id = $1)",
            dimension_id
        )
        
        if not dim_exists:
            raise HTTPException(status_code=404, detail="Dimensión no encontrada")
        
        # Validar posición
        if character_data.x < 0 or character_data.y < 0:
            raise HTTPException(
                status_code=400,
                detail="Las coordenadas x e y deben ser mayores o iguales a 0"
            )
        
        # Obtener template
        template = get_biped_template(character_data.template_id)
        if not template:
            available_templates = list_biped_template_ids()
            raise HTTPException(
                status_code=404, 
                detail=f"Template '{character_data.template_id}' no encontrado. Templates disponibles: {', '.join(available_templates)}"
            )
        
        # Crear personaje usando EntityCreator
        creator = EntityCreator(conn, dimension_id)
        try:
            # Los bípedos no crean partículas físicas, solo agrupación
            await creator.create_entity(
                template,
                character_data.x,
                character_data.y,
                character_data.z,
                create_agrupacion=True
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al crear personaje: {str(e)}")
        
        # Obtener la agrupación creada (última creada en esta dimensión de tipo biped)
        # Incluir posición en la consulta
        agrupacion = await conn.fetchrow("""
            SELECT id, nombre, tipo, especie, geometria_agrupacion, posicion_x, posicion_y, posicion_z
            FROM juego_dioses.agrupaciones
            WHERE dimension_id = $1 AND tipo = 'biped'
            ORDER BY creado_en DESC
            LIMIT 1
        """, dimension_id)
        
        if not agrupacion:
            raise HTTPException(status_code=500, detail="Error al crear personaje: agrupación no encontrada")
        
        # Los bípedos no tienen partículas físicas, usar posición de la agrupación
        
        # Parsear geometria_agrupacion
        geometria = None
        if agrupacion['geometria_agrupacion']:
            geometria_data = parse_jsonb_field(agrupacion['geometria_agrupacion'])
            if geometria_data:
                try:
                    geometria = BipedGeometry(**geometria_data)
                except Exception as e:
                    # Si hay error parseando, continuar sin geometría
                    print(f"Error parseando geometria_agrupacion: {e}")
        
        return CharacterResponse(
            id=str(agrupacion['id']),
            dimension_id=str(dimension_id),
            nombre=agrupacion['nombre'],
            tipo=agrupacion['tipo'],
            especie=agrupacion['especie'] or '',
            posicion={
                'x': agrupacion['posicion_x'] or character_data.x,
                'y': agrupacion['posicion_y'] or character_data.y,
                'z': agrupacion['posicion_z'] or character_data.z
            },
            geometria_agrupacion=geometria,
            particulas_count=0  # Los bípedos no tienen partículas físicas
        )

