"""
Puerta de entrada HTTP para Agrupaciones.

Flujo (Arquitectura Hexagonal):
  routes → casos de uso (get_agrupaciones, get_agrupacion_with_particles) → puerto IAgrupacionRepository → PostgresAgrupacionRepository.
No usa get_connection ni SQL; solo inyecta el adaptador y delega.
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from src.domains.agrupaciones.application.get_agrupaciones import get_agrupaciones
from src.domains.agrupaciones.application.get_agrupacion_with_particles import get_agrupacion_with_particles
from src.domains.agrupaciones.application.ports.agrupacion_repository import IAgrupacionRepository
from src.domains.agrupaciones.infrastructure.postgres_agrupacion_repository import PostgresAgrupacionRepository
from src.domains.agrupaciones.schemas import AgrupacionResponse, AgrupacionWithParticles

router = APIRouter(prefix="/bloques", tags=["agrupaciones"])


def get_agrupacion_repository() -> IAgrupacionRepository:
    """Factory para inyección de dependencias: devuelve el adaptador concreto (Postgres)."""
    return PostgresAgrupacionRepository()


def _handle_value_error(e: ValueError) -> None:
    """Convierte ValueError del caso de uso en HTTP 404 (no encontrado) o 400 (validación)."""
    if "no encontrado" in str(e).lower():
        raise HTTPException(status_code=404, detail=str(e))
    raise HTTPException(status_code=400, detail=str(e))


@router.get("/{bloque_id}/agrupaciones", response_model=List[AgrupacionResponse])
async def list_agrupaciones(
    bloque_id: UUID,
    repository: IAgrupacionRepository = Depends(get_agrupacion_repository),
):
    """GET /bloques/{bloque_id}/agrupaciones — Lista agrupaciones del bloque."""
    try:
        return await get_agrupaciones(repository, bloque_id)
    except ValueError as e:
        _handle_value_error(e)


@router.get("/{bloque_id}/agrupaciones/{agrupacion_id}", response_model=AgrupacionWithParticles)
async def get_agrupacion(
    bloque_id: UUID,
    agrupacion_id: UUID,
    repository: IAgrupacionRepository = Depends(get_agrupacion_repository),
):
    """GET /bloques/{bloque_id}/agrupaciones/{agrupacion_id} — Agrupación con sus partículas."""
    try:
        return await get_agrupacion_with_particles(repository, bloque_id, agrupacion_id)
    except ValueError as e:
        _handle_value_error(e)
