"""
Puerta de entrada HTTP para Personajes (Bípedos).

Flujo (Arquitectura Hexagonal):
  1. routes.py (aquí) → adaptador de entrada: recibe HTTP y delega en casos de uso.
  2. application/get_character.py (y otros) → caso de uso: orquesta lógica usando puertos.
  3. application/ports/character_repository.py → puerto (interfaz): contrato que el caso de uso usa.
  4. infrastructure/postgres_character_repository.py → adaptador de salida: implementa el puerto contra Postgres.

Las routes no acceden a BD ni a infraestructura directa; solo inyectan el adaptador y llaman al caso de uso.
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path

from src.domains.characters.application.list_characters import list_characters
from src.domains.characters.application.get_character import get_character
from src.domains.characters.application.get_character_model import get_character_model
from src.domains.characters.application.ports.character_repository import ICharacterRepository
from src.domains.characters.application.ports.character_creation_port import ICharacterCreationPort
from src.domains.characters.infrastructure.postgres_character_repository import PostgresCharacterRepository
from src.domains.characters.infrastructure.entity_creation_adapter import EntityCreationAdapter
from src.domains.characters.schemas import CharacterResponse, CharacterCreate

router = APIRouter(prefix="/bloques/{bloque_id}/characters", tags=["characters"])


def get_character_repository() -> ICharacterRepository:
    """Factory para inyección de dependencias: devuelve el adaptador concreto (Postgres)."""
    return PostgresCharacterRepository()


def get_character_creation_port() -> ICharacterCreationPort:
    """Factory para el puerto de creación: devuelve el adaptador que usa EntityCreator."""
    return EntityCreationAdapter()


def _handle_value_error(e: ValueError) -> None:
    """Convierte ValueError del caso de uso en HTTP 404 (no encontrado) o 400 (validación)."""
    if "no encontrado" in str(e).lower() or "no tiene" in str(e).lower():
        raise HTTPException(status_code=404, detail=str(e))
    raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=List[CharacterResponse])
async def list_characters_route(
    bloque_id: UUID = Path(..., description="ID del bloque"),
    repository: ICharacterRepository = Depends(get_character_repository),
):
    """GET /bloques/{bloque_id}/characters — Lista todos los personajes (bípedos) del bloque."""
    try:
        return await list_characters(repository, bloque_id)
    except ValueError as e:
        _handle_value_error(e)


@router.get("/{character_id}", response_model=CharacterResponse)
async def get_character_route(
    bloque_id: UUID = Path(..., description="ID del bloque"),
    character_id: UUID = Path(..., description="ID del personaje (agrupación)"),
    repository: ICharacterRepository = Depends(get_character_repository),
):
    """GET /bloques/{bloque_id}/characters/{character_id} — Devuelve un personaje por ID."""
    try:
        return await get_character(repository, bloque_id, character_id)
    except ValueError as e:
        _handle_value_error(e)


@router.get("/{character_id}/model")
async def get_character_model_route(
    bloque_id: UUID = Path(..., description="ID del bloque"),
    character_id: UUID = Path(..., description="ID del personaje"),
    repository: ICharacterRepository = Depends(get_character_repository),
):
    """GET /bloques/{bloque_id}/characters/{character_id}/model — URL y metadata del modelo 3D del personaje."""
    try:
        return await get_character_model(repository, bloque_id, character_id)
    except ValueError as e:
        _handle_value_error(e)


@router.post("", response_model=CharacterResponse, status_code=201)
async def create_character(
    character_data: CharacterCreate,
    bloque_id: UUID = Path(..., description="ID del bloque"),
    creation_port: ICharacterCreationPort = Depends(get_character_creation_port),
):
    """POST /bloques/{bloque_id}/characters — Crea un personaje; delega en ICharacterCreationPort (EntityCreationAdapter)."""
    try:
        return await creation_port.create_character(character_data, bloque_id)
    except ValueError as e:
        msg = str(e)
        if "no encontrado" in msg.lower() or "bloque no encontrado" in msg.lower():
            raise HTTPException(status_code=404, detail=msg)
        raise HTTPException(status_code=400, detail=msg)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear personaje: {str(e)}")
