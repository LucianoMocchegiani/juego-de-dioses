"""
Clase WorldBloqueManager - Gestiona bloques espaciales del mundo en memoria.

Este manager mantiene un cache de bloques espaciales en memoria para optimizar
el acceso y cálculo de temperatura. Los bloques se crean bajo demanda (lazy loading).
"""

from typing import Dict, Optional, List
from .world_bloque import WorldBloque
from ..database.connection import get_connection


class WorldBloqueManager:
    """Gestiona bloques espaciales del mundo en memoria."""
    
    def __init__(self):
        """
        Inicializa el manager de bloques.
        
        Mantiene dos caches:
        - bloques: Cache de bloques espaciales en memoria
        - bloque_configs: Cache de configuraciones de bloques desde BD
        """
        self.bloques: Dict[str, WorldBloque] = {}  # key: "bloqueId-bloqueX-bloqueY-bloqueZ"
        self.bloque_configs: Dict[str, dict] = {}  # Cache de configuraciones
    
    async def get_bloque_config(self, bloque_id: str) -> Optional[dict]:
        """
        Obtiene configuración de bloque desde BD (con cache).
        
        Args:
            bloque_id: ID de la configuración de bloque (de tabla bloques)
            
        Returns:
            Diccionario con la configuración del bloque o None si no existe
        """
        if bloque_id not in self.bloque_configs:
            async with get_connection() as conn:
                row = await conn.fetchrow(
                    """
                    SELECT * FROM juego_dioses.bloques 
                    WHERE id = $1
                    """,
                    bloque_id
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
        celda_z: int
    ) -> WorldBloque:
        """
        Obtiene bloque espacial para una posición de celda.
        
        Crea el bloque si no existe (lazy loading).
        
        Args:
            bloque_id: ID de la configuración de bloque
            celda_x: Coordenada X de la celda
            celda_y: Coordenada Y de la celda
            celda_z: Coordenada Z de la celda
            
        Returns:
            Instancia de WorldBloque para esa posición
        """
        config = await self.get_bloque_config(bloque_id)
        if not config:
            raise ValueError(f"Bloque config con id {bloque_id} no existe")
        
        tamano_bloque = config.get('tamano_bloque', 40)
        
        # Calcular coordenadas del bloque espacial
        bloque_x = celda_x // tamano_bloque
        bloque_y = celda_y // tamano_bloque
        bloque_z = celda_z // tamano_bloque
        
        key = f"{bloque_id}-{bloque_x}-{bloque_y}-{bloque_z}"
        
        if key not in self.bloques:
            bloque = WorldBloque(
                bloque_id,
                bloque_x,
                bloque_y,
                bloque_z,
                tamano_bloque
            )
            self.bloques[key] = bloque
        
        return self.bloques[key]
    
    async def get_bloque_for_particle(self, particula: dict) -> WorldBloque:
        """
        Obtiene bloque para una partícula.
        
        Args:
            particula: Diccionario con datos de la partícula (debe tener bloque_id, celda_x, celda_y, celda_z)
            
        Returns:
            Instancia de WorldBloque para la partícula
        """
        return await self.get_bloque_for_position(
            particula['bloque_id'],
            particula['celda_x'],
            particula['celda_y'],
            particula['celda_z']
        )
    
    async def get_bloques_in_radius(
        self,
        bloque_id: str,
        celda_x: int,
        celda_y: int,
        celda_z: int,
        radio: int
    ) -> List[WorldBloque]:
        """
        Obtiene todos los bloques dentro de un radio desde una posición.
        
        Args:
            bloque_id: ID de la configuración de bloque
            celda_x: Coordenada X del centro
            celda_y: Coordenada Y del centro
            celda_z: Coordenada Z del centro
            radio: Radio en celdas
            
        Returns:
            Lista de bloques dentro del radio
        """
        config = await self.get_bloque_config(bloque_id)
        if not config:
            raise ValueError(f"Bloque config con id {bloque_id} no existe")
        
        tamano_bloque = config.get('tamano_bloque', 40)
        
        # Obtener bloque central
        bloque_centro = await self.get_bloque_for_position(bloque_id, celda_x, celda_y, celda_z)
        
        # Calcular cuántos bloques abarcar en cada dirección
        radio_bloques = (radio // tamano_bloque) + 1
        
        bloques = []
        
        # Iterar sobre bloques en el radio
        for dx in range(-radio_bloques, radio_bloques + 1):
            for dy in range(-radio_bloques, radio_bloques + 1):
                for dz in range(-radio_bloques, radio_bloques + 1):
                    # Calcular posición de celda para este bloque
                    celda_x_bloque = (bloque_centro.bloque_x + dx) * tamano_bloque
                    celda_y_bloque = (bloque_centro.bloque_y + dy) * tamano_bloque
                    celda_z_bloque = (bloque_centro.bloque_z + dz) * tamano_bloque
                    
                    # Verificar si está dentro del radio
                    distancia_celdas = (
                        (celda_x - celda_x_bloque) ** 2 +
                        (celda_y - celda_y_bloque) ** 2 +
                        (celda_z - celda_z_bloque) ** 2
                    ) ** 0.5
                    
                    if distancia_celdas <= radio:
                        bloque = await self.get_bloque_for_position(
                            bloque_id,
                            celda_x_bloque,
                            celda_y_bloque,
                            celda_z_bloque
                        )
                        bloques.append(bloque)
        
        return bloques
    
    def clear_cache(self) -> None:
        """
        Limpia el cache de bloques y configuraciones.
        
        Útil para liberar memoria o forzar recarga de datos.
        """
        self.bloques.clear()
        self.bloque_configs.clear()
    
    def get_cached_bloques_count(self) -> int:
        """
        Retorna la cantidad de bloques en cache.
        
        Returns:
            Número de bloques en memoria
        """
        return len(self.bloques)

