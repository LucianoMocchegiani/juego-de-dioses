"""
Adaptador que implementa ICharacterCreationPort usando EntityCreator y get_connection().
Solo este módulo (junto con postgres_character_repository) usa get_connection en el dominio characters.
"""
from uuid import UUID

from src.database.connection import get_connection
from src.world_creation_engine.templates.bipedos.registry import get_biped_template, list_biped_template_ids
from src.world_creation_engine.creators.entity_creator import EntityCreator
from src.domains.characters.application.ports.character_creation_port import ICharacterCreationPort
from src.domains.characters.schemas import CharacterCreate, CharacterResponse, BipedGeometry, Model3D
from src.domains.shared.schemas import parse_jsonb_field


class EntityCreationAdapter(ICharacterCreationPort):
    """Implementa creación de personajes con EntityCreator(conn)."""

    async def create_character(
        self,
        character_data: CharacterCreate,
        bloque_id: UUID,
    ) -> CharacterResponse:
        """Valida bloque y template; crea entidad con EntityCreator; lee la agrupación recién creada y devuelve CharacterResponse."""
        async with get_connection() as conn:
            bloque_exists = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM juego_dioses.bloques WHERE id = $1)",
                bloque_id,
            )
            if not bloque_exists:
                raise ValueError("Bloque no encontrado")
            if character_data.x < 0 or character_data.y < 0:
                raise ValueError("Las coordenadas x e y deben ser mayores o iguales a 0")
            template = get_biped_template(character_data.template_id)
            if not template:
                available = list_biped_template_ids()
                raise ValueError(
                    f"Template '{character_data.template_id}' no encontrado. "
                    f"Templates disponibles: {', '.join(available)}"
                )
            creator = EntityCreator(conn, bloque_id)
            await creator.create_entity(
                template,
                character_data.x,
                character_data.y,
                character_data.z,
                create_agrupacion=True,
            )
            agrupacion = await conn.fetchrow("""
                SELECT id, nombre, tipo, especie, geometria_agrupacion, modelo_3d, posicion_x, posicion_y, posicion_z
                FROM juego_dioses.agrupaciones
                WHERE bloque_id = $1 AND tipo = 'biped'
                ORDER BY creado_en DESC
                LIMIT 1
            """, bloque_id)
            if not agrupacion:
                raise RuntimeError("Error al crear personaje: agrupación no encontrada")
            geometria = None
            if agrupacion["geometria_agrupacion"]:
                geometria_data = parse_jsonb_field(agrupacion["geometria_agrupacion"])
                if geometria_data:
                    try:
                        geometria = BipedGeometry(**geometria_data)
                    except Exception:
                        pass
            modelo_3d = None
            if agrupacion["modelo_3d"]:
                modelo_3d_data = parse_jsonb_field(agrupacion["modelo_3d"])
                if modelo_3d_data:
                    try:
                        modelo_3d = Model3D(**modelo_3d_data)
                    except Exception:
                        pass
            return CharacterResponse(
                id=str(agrupacion["id"]),
                bloque_id=str(bloque_id),
                nombre=agrupacion["nombre"],
                tipo=agrupacion["tipo"],
                especie=agrupacion["especie"] or "",
                posicion={
                    "x": agrupacion["posicion_x"] or character_data.x,
                    "y": agrupacion["posicion_y"] or character_data.y,
                    "z": agrupacion["posicion_z"] or character_data.z,
                },
                geometria_agrupacion=geometria,
                modelo_3d=modelo_3d,
                particulas_count=0,
            )
