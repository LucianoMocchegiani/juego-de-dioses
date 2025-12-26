"""
Clase WorldBloque - Representa un bloque espacial del mundo en memoria.

Un bloque espacial es una zona del mundo (40x40x40 celdas por defecto) que se usa
para organizar partículas, calcular temperatura ambiental, y optimizar renderizado.
"""

from typing import Set, Optional
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
    
    async def calcular_temperatura(
        self,
        celestial_time_service: 'CelestialTimeService',
        tipo_particula_superficie: Optional[str] = None
    ) -> float:
        """
        Calcula la temperatura del bloque basándose en factores ambientales.
        
        Args:
            celestial_time_service: Servicio de tiempo celestial (autoritativo)
            tipo_particula_superficie: Nombre del tipo de partícula dominante en la superficie
        
        Returns:
            Temperatura ambiental en grados Celsius
        """
        from src.services.temperature_service import calculate_cell_temperature
        
        # Calcular temperatura en el centro del bloque
        centro_x = (self.bloque_x + 0.5) * self.tamano_bloque
        centro_y = (self.bloque_y + 0.5) * self.tamano_bloque
        centro_z = (self.bloque_z + 0.5) * self.tamano_bloque
        
        # Calcular temperatura usando el servicio de temperatura
        temperatura = await calculate_cell_temperature(
            celda_x=centro_x,
            celda_y=centro_y,
            celda_z=centro_z,
            bloque_id=self.bloque_id,
            celestial_time_service=celestial_time_service,
            tipo_particula_superficie=tipo_particula_superficie
        )
        
        # Almacenar temperatura calculada
        self.temperatura_base = temperatura
        
        # Actualizar timestamp
        self.ultima_actualizacion_temperatura = datetime.now()
        self.necesita_recalcular_temperatura = False
        
        return temperatura
    
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

