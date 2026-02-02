"""
Adaptador de persistencia: implementa ICharacterRepository contra Postgres.

Es la capa que realmente habla con la BD. El caso de uso (get_character, list_characters, etc.)
llama al puerto ICharacterRepository; en runtime FastAPI inyecta esta clase desde routes,
así que las llamadas a get_biped/list_bipeds/etc. terminan aquí y ejecutan las queries.
"""
from typing import Any, Dict, List, Optional
from uuid import UUID

from src.database.connection import get_connection
from src.domains.characters.application.ports.character_repository import ICharacterRepository
from src.domains.characters.schemas import CharacterResponse, BipedGeometry, Model3D
from src.domains.shared.schemas import parse_jsonb_field


def _row_to_character_response(row, bloque_id: UUID) -> CharacterResponse:
    """Convierte una fila de agrupaciones (dict/Record) en CharacterResponse; parsea geometria_agrupacion y modelo_3d JSONB."""
    geometria = None
    if row.get("geometria_agrupacion"):
        geometria_data = parse_jsonb_field(row["geometria_agrupacion"])
        if geometria_data:
            try:
                geometria = BipedGeometry(**geometria_data)
            except Exception:
                pass
    modelo_3d = None
    if row.get("modelo_3d"):
        modelo_3d_data = parse_jsonb_field(row["modelo_3d"])
        if modelo_3d_data:
            try:
                modelo_3d = Model3D(**modelo_3d_data)
            except Exception:
                pass
    return CharacterResponse(
        id=str(row["id"]),
        bloque_id=str(bloque_id),
        nombre=row["nombre"],
        tipo=row["tipo"],
        especie=row["especie"] or "",
        posicion={
            "x": row["posicion_x"] or 0,
            "y": row["posicion_y"] or 0,
            "z": row["posicion_z"] or 0,
        },
        geometria_agrupacion=geometria,
        modelo_3d=modelo_3d,
        particulas_count=0,
    )


class PostgresCharacterRepository(ICharacterRepository):
    """Implementación concreta del puerto: persiste/lee personajes en juego_dioses.agrupaciones."""

    async def bloque_exists(self, bloque_id: UUID) -> bool:
        """Consulta EXISTS en juego_dioses.bloques para el bloque_id."""
        async with get_connection() as conn:
            return await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM juego_dioses.bloques WHERE id = $1)",
                bloque_id
            )

    async def list_bipeds(self, bloque_id: UUID) -> List[CharacterResponse]:
        """SELECT de agrupaciones con bloque_id y tipo='biped', orden por creado_en DESC; mapea filas a CharacterResponse."""
        async with get_connection() as conn:
            rows = await conn.fetch("""
                SELECT id, nombre, tipo, especie, geometria_agrupacion, modelo_3d, posicion_x, posicion_y, posicion_z
                FROM juego_dioses.agrupaciones
                WHERE bloque_id = $1 AND tipo = 'biped'
                ORDER BY creado_en DESC
            """, bloque_id)
            return [_row_to_character_response(r, bloque_id) for r in rows]

    async def get_biped(
        self, bloque_id: UUID, character_id: UUID
    ) -> Optional[CharacterResponse]:
        """SELECT una agrupación por id y bloque_id; devuelve None si no existe o no es tipo biped."""
        async with get_connection() as conn:
            row = await conn.fetchrow("""
                SELECT id, nombre, tipo, especie, geometria_agrupacion, modelo_3d, posicion_x, posicion_y, posicion_z
                FROM juego_dioses.agrupaciones
                WHERE id = $1 AND bloque_id = $2
            """, character_id, bloque_id)
            if not row:
                return None
            if row["tipo"] != "biped":
                return None
            return _row_to_character_response(row, bloque_id)

    async def get_model_metadata(
        self, bloque_id: UUID, character_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """Lee modelo_3d (JSONB) de la agrupación; devuelve dict con model_url y metadata o None si no hay modelo válido."""
        async with get_connection() as conn:
            row = await conn.fetchrow("""
                SELECT modelo_3d
                FROM juego_dioses.agrupaciones
                WHERE id = $1 AND bloque_id = $2 AND tipo = 'biped'
            """, character_id, bloque_id)
            if not row or not row["modelo_3d"]:
                return None
            modelo_3d_data = parse_jsonb_field(row["modelo_3d"])
            if not modelo_3d_data:
                return None
            try:
                modelo_3d = Model3D(**modelo_3d_data)
            except Exception:
                return None
            return {
                "model_url": f"/static/models/{modelo_3d.ruta}",
                "metadata": modelo_3d.dict(),
            }
