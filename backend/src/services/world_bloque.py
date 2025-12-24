    """
Clase WorldBloque - Representa un bloque espacial del mundo en memoria.

Un bloque espacial es una zona del mundo (40x40x40 celdas por defecto) que se usa
para organizar partículas, calcular temperatura ambiental, y optimizar renderizado.
"""

from typing import Set
from datetime import datetime


class WorldBloque:
    """Representa un bloque espacial del mundo en memoria."""
    
    def __init__(
        self,
        bloque_id: str,
        bloque_x: int,
        bloque_y: int,
        bloque_z: int,
        tamano_bloque: int = 40
    ):
        """
        Inicializa un bloque espacial.
        
        Args:
            bloque_id: ID de la configuración de bloque (de tabla bloques)
            bloque_x: Coordenada X del bloque espacial
            bloque_y: Coordenada Y del bloque espacial
            bloque_z: Coordenada Z del bloque espacial
            tamano_bloque: Tamaño del bloque en celdas (default: 40)
        """
        self.bloque_id = bloque_id  # ID de configuración (de tabla bloques)
        self.bloque_x = bloque_x
        self.bloque_y = bloque_y
        self.bloque_z = bloque_z
        self.tamano_bloque = tamano_bloque
        
        # Partículas en este bloque
        self.particulas: Set[str] = set()  # IDs de partículas
        
        # Temperatura
        self.temperatura_base = 20.0
        self.modificador_altitud = 0.0
        self.modificador_agua = 0.0
        self.modificador_albedo = 0.0
        self.ultima_actualizacion_temperatura = datetime.now()
        self.necesita_recalcular_temperatura = False
        
        # Eventos activos
        self.eventos_activos: Set[str] = set()
        
        # Jugadores en este bloque
        self.jugadores: Set[str] = set()
        
        # Renderizado
        self.needs_rerender = False
    
    async def calcular_temperatura(self, celestial_system) -> None:
        """
        Calcula la temperatura del bloque basándose en factores ambientales.
        
        Esta función se implementará completamente en fases siguientes cuando
        se implementen los sistemas de temperatura ambiental y sol/luna.
        
        Args:
            celestial_system: Sistema de sol/luna para calcular temperatura solar
        """
        centro_x = self.bloque_x * self.tamano_bloque + (self.tamano_bloque / 2)
        centro_y = self.bloque_y * self.tamano_bloque + (self.tamano_bloque / 2)
        centro_z = self.bloque_z * self.tamano_bloque + (self.tamano_bloque / 2)
        
        # Temperatura solar (se implementará en fase siguiente)
        # temp_solar = celestial_system.get_temperature_at(centro_x, centro_y)
        temp_solar = 20.0  # Placeholder hasta implementar sistema sol/luna
        
        # Modificadores (se implementarán en fase siguiente)
        # from .temperature_helpers import (
        #     get_altitude_modifier,
        #     get_water_modifier,
        #     get_albedo_modifier
        # )
        # 
        # self.modificador_altitud = get_altitude_modifier(centro_z)
        # self.modificador_agua = await get_water_modifier(centro_x, centro_y, centro_z, self)
        # self.modificador_albedo = await get_albedo_modifier(centro_x, centro_y, centro_z, self)
        
        # Placeholders hasta implementar funciones auxiliares
        self.modificador_altitud = 0.0
        self.modificador_agua = 0.0
        self.modificador_albedo = 0.0
        
        # Temperatura final
        self.temperatura_base = (
            temp_solar + 
            self.modificador_altitud + 
            self.modificador_agua + 
            self.modificador_albedo
        )
        
        self.ultima_actualizacion_temperatura = datetime.now()
        self.necesita_recalcular_temperatura = False
    
    def get_temperatura(self) -> float:
        """
        Retorna la temperatura base del bloque.
        
        Returns:
            Temperatura en grados Celsius
        """
        return self.temperatura_base
    
    def get_key(self) -> str:
        """
        Retorna la clave única del bloque.
        
        Returns:
            Clave en formato "bloqueId-bloqueX-bloqueY-bloqueZ"
        """
        return f"{self.bloque_id}-{self.bloque_x}-{self.bloque_y}-{self.bloque_z}"
    
    def agregar_particula(self, particula_id: str) -> None:
        """
        Agrega una partícula al bloque.
        
        Args:
            particula_id: ID de la partícula a agregar
        """
        self.particulas.add(particula_id)
        self.necesita_recalcular_temperatura = True  # Albedo puede cambiar
    
    def remover_particula(self, particula_id: str) -> None:
        """
        Remueve una partícula del bloque.
        
        Args:
            particula_id: ID de la partícula a remover
        """
        self.particulas.discard(particula_id)
        self.necesita_recalcular_temperatura = True  # Albedo puede cambiar
    
    def agregar_jugador(self, jugador_id: str) -> None:
        """
        Agrega un jugador al bloque.
        
        Args:
            jugador_id: ID del jugador
        """
        self.jugadores.add(jugador_id)
    
    def remover_jugador(self, jugador_id: str) -> None:
        """
        Remueve un jugador del bloque.
        
        Args:
            jugador_id: ID del jugador
        """
        self.jugadores.discard(jugador_id)

