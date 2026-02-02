"""
Endpoints para Personajes (Bípedos)
"""
from fastapi import APIRouter, HTTPException, Path
from typing import List
from uuid import UUID

from src.database.connection import get_connection
from src.world_creation_engine.templates.bipedos.registry import get_biped_template, list_biped_template_ids
from src.world_creation_engine.creators.entity_creator import EntityCreator
from src.domains.characters.schemas import CharacterResponse, CharacterCreate, BipedGeometry, Model3D
from src.domains.shared.schemas import parse_jsonb_field

router = APIRouter(prefix="/bloques/{bloque_id}/characters", tags=["characters"])


@router.get("/{character_id}", response_model=CharacterResponse)
async def get_character(
    bloque_id: UUID = Path(..., description="ID del bloque"),
    character_id: UUID = Path(..., description="ID del personaje (agrupación)"),
):
    async with get_connection() as conn:
        bloque_exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM juego_dioses.bloques WHERE id = $1)",
            bloque_id
        )
        if not bloque_exists:
            raise HTTPException(status_code=404, detail="Bloque no encontrado")
        agrupacion = await conn.fetchrow("""
            SELECT id, nombre, tipo, especie, geometria_agrupacion, modelo_3d, posicion_x, posicion_y, posicion_z
            FROM juego_dioses.agrupaciones
            WHERE id = $1 AND bloque_id = $2
        """, character_id, bloque_id)
        if not agrupacion:
            raise HTTPException(status_code=404, detail="Personaje no encontrado")
        if agrupacion['tipo'] != 'biped':
            raise HTTPException(status_code=400, detail="La agrupación no es un personaje (bípedo)")
        geometria = None
        if agrupacion['geometria_agrupacion']:
            geometria_data = parse_jsonb_field(agrupacion['geometria_agrupacion'])
            if geometria_data:
                try:
                    geometria = BipedGeometry(**geometria_data)
                except Exception:
                    pass
        modelo_3d = None
        if agrupacion['modelo_3d']:
            modelo_3d_data = parse_jsonb_field(agrupacion['modelo_3d'])
            if modelo_3d_data:
                try:
                    modelo_3d = Model3D(**modelo_3d_data)
                except Exception:
                    pass
        return CharacterResponse(
            id=str(agrupacion['id']),
            bloque_id=str(bloque_id),
            nombre=agrupacion['nombre'],
            tipo=agrupacion['tipo'],
            especie=agrupacion['especie'] or '',
            posicion={
                'x': agrupacion['posicion_x'] or 0,
                'y': agrupacion['posicion_y'] or 0,
                'z': agrupacion['posicion_z'] or 0,
            },
            geometria_agrupacion=geometria,
            modelo_3d=modelo_3d,
            particulas_count=0,
        )


@router.get("", response_model=List[CharacterResponse])
async def list_characters(bloque_id: UUID = Path(..., description="ID del bloque")):
    async with get_connection() as conn:
        bloque_exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM juego_dioses.bloques WHERE id = $1)",
            bloque_id
        )
        if not bloque_exists:
            raise HTTPException(status_code=404, detail="Bloque no encontrado")
        agrupaciones = await conn.fetch("""
            SELECT id, nombre, tipo, especie, geometria_agrupacion, modelo_3d, posicion_x, posicion_y, posicion_z
            FROM juego_dioses.agrupaciones
            WHERE bloque_id = $1 AND tipo = 'biped'
            ORDER BY creado_en DESC
        """, bloque_id)
        characters = []
        for agrupacion in agrupaciones:
            geometria = None
            if agrupacion['geometria_agrupacion']:
                geometria_data = parse_jsonb_field(agrupacion['geometria_agrupacion'])
                if geometria_data:
                    try:
                        geometria = BipedGeometry(**geometria_data)
                    except Exception:
                        pass
            modelo_3d = None
            if agrupacion['modelo_3d']:
                modelo_3d_data = parse_jsonb_field(agrupacion['modelo_3d'])
                if modelo_3d_data:
                    try:
                        modelo_3d = Model3D(**modelo_3d_data)
                    except Exception:
                        pass
            characters.append(CharacterResponse(
                id=str(agrupacion['id']),
                bloque_id=str(bloque_id),
                nombre=agrupacion['nombre'],
                tipo=agrupacion['tipo'],
                especie=agrupacion['especie'] or '',
                posicion={
                    'x': agrupacion['posicion_x'] or 0,
                    'y': agrupacion['posicion_y'] or 0,
                    'z': agrupacion['posicion_z'] or 0,
                },
                geometria_agrupacion=geometria,
                modelo_3d=modelo_3d,
                particulas_count=0,
            ))
        return characters


@router.get("/{character_id}/model")
async def get_character_model(
    bloque_id: UUID = Path(..., description="ID del bloque"),
    character_id: UUID = Path(..., description="ID del personaje"),
):
    async with get_connection() as conn:
        bloque_exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM juego_dioses.bloques WHERE id = $1)",
            bloque_id
        )
        if not bloque_exists:
            raise HTTPException(status_code=404, detail="Bloque no encontrado")
        agrupacion = await conn.fetchrow("""
            SELECT modelo_3d
            FROM juego_dioses.agrupaciones
            WHERE id = $1 AND bloque_id = $2 AND tipo = 'biped'
        """, character_id, bloque_id)
        if not agrupacion:
            raise HTTPException(status_code=404, detail="Personaje no encontrado")
        if not agrupacion['modelo_3d']:
            raise HTTPException(status_code=404, detail="Personaje no tiene modelo 3D")
        modelo_3d_data = parse_jsonb_field(agrupacion['modelo_3d'])
        if not modelo_3d_data:
            raise HTTPException(status_code=404, detail="Modelo 3D no válido")
        try:
            modelo_3d = Model3D(**modelo_3d_data)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error parseando modelo_3d: {str(e)}")
        return {"model_url": f"/static/models/{modelo_3d.ruta}", "metadata": modelo_3d.dict()}


@router.post("", response_model=CharacterResponse, status_code=201)
async def create_character(
    character_data: CharacterCreate,
    bloque_id: UUID = Path(..., description="ID del bloque"),
):
    async with get_connection() as conn:
        bloque_exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM juego_dioses.bloques WHERE id = $1)",
            bloque_id
        )
        if not bloque_exists:
            raise HTTPException(status_code=404, detail="Bloque no encontrado")
        if character_data.x < 0 or character_data.y < 0:
            raise HTTPException(status_code=400, detail="Las coordenadas x e y deben ser mayores o iguales a 0")
        template = get_biped_template(character_data.template_id)
        if not template:
            available_templates = list_biped_template_ids()
            raise HTTPException(
                status_code=404,
                detail=f"Template '{character_data.template_id}' no encontrado. Templates disponibles: {', '.join(available_templates)}",
            )
        creator = EntityCreator(conn, bloque_id)
        try:
            await creator.create_entity(
                template,
                character_data.x,
                character_data.y,
                character_data.z,
                create_agrupacion=True,
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al crear personaje: {str(e)}")
        agrupacion = await conn.fetchrow("""
            SELECT id, nombre, tipo, especie, geometria_agrupacion, modelo_3d, posicion_x, posicion_y, posicion_z
            FROM juego_dioses.agrupaciones
            WHERE bloque_id = $1 AND tipo = 'biped'
            ORDER BY creado_en DESC
            LIMIT 1
        """, bloque_id)
        if not agrupacion:
            raise HTTPException(status_code=500, detail="Error al crear personaje: agrupación no encontrada")
        geometria = None
        if agrupacion['geometria_agrupacion']:
            geometria_data = parse_jsonb_field(agrupacion['geometria_agrupacion'])
            if geometria_data:
                try:
                    geometria = BipedGeometry(**geometria_data)
                except Exception:
                    pass
        modelo_3d = None
        if agrupacion['modelo_3d']:
            modelo_3d_data = parse_jsonb_field(agrupacion['modelo_3d'])
            if modelo_3d_data:
                try:
                    modelo_3d = Model3D(**modelo_3d_data)
                except Exception:
                    pass
        return CharacterResponse(
            id=str(agrupacion['id']),
            bloque_id=str(bloque_id),
            nombre=agrupacion['nombre'],
            tipo=agrupacion['tipo'],
            especie=agrupacion['especie'] or '',
            posicion={
                'x': agrupacion['posicion_x'] or character_data.x,
                'y': agrupacion['posicion_y'] or character_data.y,
                'z': agrupacion['posicion_z'] or character_data.z,
            },
            geometria_agrupacion=geometria,
            modelo_3d=modelo_3d,
            particulas_count=0,
        )
