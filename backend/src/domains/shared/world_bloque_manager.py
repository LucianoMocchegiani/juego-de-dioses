"""
WorldBloqueManager - Gestor de bloques espaciales en memoria (infra compartida).
Gestor de bloques espaciales en memoria (infra compartida).
"""
from typing import Dict, Optional, List
from src.domains.shared.world_bloque import WorldBloque
from src.database.connection import get_connection


class WorldBloqueManager:
    """Gestiona bloques espaciales del mundo en memoria con cache y lazy loading."""

    def __init__(self):
        self.bloques: Dict[str, WorldBloque] = {}
        self.bloque_configs: Dict[str, dict] = {}

    async def get_bloque_config(self, bloque_id: str) -> Optional[dict]:
        if bloque_id not in self.bloque_configs:
            async with get_connection() as conn:
                row = await conn.fetchrow(
                    "SELECT * FROM juego_dioses.bloques WHERE id = $1",
                    bloque_id,
                )
                if row:
                    self.bloque_configs[bloque_id] = dict(row)
                else:
                    return None
        return self.bloque_configs.get(bloque_id)

    async def get_bloque_for_position(
        self,
        bloque_id: str,
        celda_x: int,
        celda_y: int,
        celda_z: int,
    ) -> WorldBloque:
        config = await self.get_bloque_config(bloque_id)
        if not config:
            raise ValueError(f"Bloque config con id {bloque_id} no existe")
        tamano_bloque = config.get('tamano_bloque', 40)
        bloque_x = celda_x // tamano_bloque
        bloque_y = celda_y // tamano_bloque
        bloque_z = celda_z // tamano_bloque
        key = f"{bloque_id}-{bloque_x}-{bloque_y}-{bloque_z}"
        if key not in self.bloques:
            self.bloques[key] = WorldBloque(
                bloque_id, bloque_x, bloque_y, bloque_z, tamano_bloque
            )
        return self.bloques[key]

    async def get_bloque_for_particle(self, particula: dict) -> WorldBloque:
        return await self.get_bloque_for_position(
            particula['bloque_id'],
            particula['celda_x'],
            particula['celda_y'],
            particula['celda_z'],
        )

    async def get_bloques_in_radius(
        self,
        bloque_id: str,
        celda_x: int,
        celda_y: int,
        celda_z: int,
        radio: int,
    ) -> List[WorldBloque]:
        config = await self.get_bloque_config(bloque_id)
        if not config:
            raise ValueError(f"Bloque config con id {bloque_id} no existe")
        tamano_bloque = config.get('tamano_bloque', 40)
        bloque_centro = await self.get_bloque_for_position(bloque_id, celda_x, celda_y, celda_z)
        radio_bloques = (radio // tamano_bloque) + 1
        bloques = []
        for dx in range(-radio_bloques, radio_bloques + 1):
            for dy in range(-radio_bloques, radio_bloques + 1):
                for dz in range(-radio_bloques, radio_bloques + 1):
                    celda_x_bloque = (bloque_centro.bloque_x + dx) * tamano_bloque
                    celda_y_bloque = (bloque_centro.bloque_y + dy) * tamano_bloque
                    celda_z_bloque = (bloque_centro.bloque_z + dz) * tamano_bloque
                    distancia_celdas = (
                        (celda_x - celda_x_bloque) ** 2
                        + (celda_y - celda_y_bloque) ** 2
                        + (celda_z - celda_z_bloque) ** 2
                    ) ** 0.5
                    if distancia_celdas <= radio:
                        bloque = await self.get_bloque_for_position(
                            bloque_id, celda_x_bloque, celda_y_bloque, celda_z_bloque
                        )
                        bloques.append(bloque)
        return bloques

    def clear_cache(self) -> None:
        self.bloques.clear()
        self.bloque_configs.clear()

    def get_cached_bloques_count(self) -> int:
        return len(self.bloques)
