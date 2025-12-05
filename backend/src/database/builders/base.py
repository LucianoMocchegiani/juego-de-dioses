from abc import ABC, abstractmethod
from typing import List, Tuple, Dict, Any
from uuid import UUID
import asyncpg
from src.database.templates.base import BaseTemplate


class BaseBuilder(ABC):
    """Clase base abstracta para todos los builders de entidades"""
    
    def __init__(self, template: BaseTemplate):
        self.template = template
    
    @abstractmethod
    async def create_at_position(
        self,
        conn: asyncpg.Connection,
        dimension_id: UUID,
        x: int,
        y: int,
        z: int,
        **kwargs
    ) -> List[Tuple]:
        """
        Crear entidad en una posición específica
        
        Args:
            conn: Conexión a la base de datos
            dimension_id: ID de la dimensión
            x, y, z: Posición donde crear la entidad
            **kwargs: Argumentos adicionales específicos del builder (ej: madera_id, hojas_id, etc.)
        
        Returns:
            Lista de tuplas para insertar en base de datos
            Formato: (dimension_id, x, y, z, tipo_id, estado_id, cantidad, temp, energia, extraida, agrupacion_id, es_nucleo, propiedades)
        """
        pass
    
    @abstractmethod
    def get_particle_type_ids(self) -> Dict[str, str]:
        """
        Obtener nombres de tipos de partículas necesarios para esta entidad
        Este método retorna los nombres (no IDs) que luego se buscarán en la BD
        
        Returns:
            Diccionario con claves como 'tronco', 'hojas', 'cuerpo', etc. y valores como nombres de tipos de partículas
            Ejemplo: {'madera': 'madera', 'hojas': 'hojas'}
            NOTA: No incluye estados de materia, esos se obtienen con get_matter_state_name()
        """
        pass
    
    def get_matter_state_name(self) -> str:
        """
        Obtener el nombre del estado de materia necesario para esta entidad
        
        Returns:
            Nombre del estado de materia (por defecto 'solido', puede sobrescribirse)
        """
        return 'solido'
    
    def validate_position(self, x: int, y: int, z: int, max_x: int, max_y: int) -> bool:
        """
        Validar que la posición está dentro de los límites de la dimensión
        
        Args:
            x, y, z: Coordenadas a validar
            max_x, max_y: Límites máximos de la dimensión
        
        Returns:
            True si la posición es válida, False en caso contrario
        """
        return 0 <= x < max_x and 0 <= y < max_y

