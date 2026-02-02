"""
Puerta de entrada HTTP para Bloques (dimensiones).

Flujo (Arquitectura Hexagonal):
  routes → casos de uso (get_bloques, get_bloque_by_id, get_world_size) → puerto IBloqueRepository → PostgresBloqueRepository.
No usa get_connection ni SQL; solo inyecta el adaptador y delega.
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from src.domains.bloques.application.get_bloques import get_bloques
from src.domains.bloques.application.get_bloque_by_id import get_bloque_by_id
from src.domains.bloques.application.get_world_size import get_world_size
from src.domains.bloques.application.ports.bloque_repository import IBloqueRepository
from src.domains.bloques.infrastructure.postgres_bloque_repository import PostgresBloqueRepository
from src.domains.bloques.schemas import DimensionResponse, WorldSizeResponse

router = APIRouter(prefix="/bloques", tags=["bloques"])


def get_bloque_repository() -> IBloqueRepository:
    """Factory para inyección de dependencias: devuelve el adaptador concreto (Postgres)."""
    return PostgresBloqueRepository()


@router.get("", response_model=List[DimensionResponse])
async def list_dimensions(
    repository: IBloqueRepository = Depends(get_bloque_repository),
):
    """GET /bloques — Lista todos los bloques (dimensiones)."""
    return await get_bloques(repository)


@router.get("/{bloque_id}", response_model=DimensionResponse)
async def get_dimension(
    bloque_id: UUID,
    repository: IBloqueRepository = Depends(get_bloque_repository),
):
    """GET /bloques/{bloque_id} — Obtener un bloque por ID."""
    try:
        return await get_bloque_by_id(repository, bloque_id)
    except ValueError as e:
        if "no encontrado" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/world/size", response_model=WorldSizeResponse)
async def get_world_size_route(
    repository: IBloqueRepository = Depends(get_bloque_repository),
):
    """GET /bloques/world/size — Tamaño total del mundo (bounding box de todos los bloques)."""
    return await get_world_size(repository)
