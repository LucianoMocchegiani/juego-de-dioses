from abc import ABC, abstractmethod
from typing import List, Tuple, Dict, Any


class BaseTemplate(ABC):
    """Clase base abstracta para todos los templates de entidades"""
    
    def __init__(self, nombre: str, categoria: str):
        self.nombre = nombre
        self.categoria = categoria  # 'tree', 'plant', 'animal', 'race'
    
    @abstractmethod
    def get_posiciones(self, x_centro: int, y_centro: int, z_base: int) -> List[Tuple[int, int, int]]:
        """
        Obtener todas las posiciones (x, y, z) que forman esta entidad
        Debe ser implementado por cada template específico
        
        Args:
            x_centro: Coordenada X del centro de la entidad
            y_centro: Coordenada Y del centro de la entidad
            z_base: Coordenada Z base (nivel del suelo o punto de referencia)
        
        Returns:
            Lista de tuplas (x, y, z) con todas las posiciones que forman la entidad
        """
        pass
    
    @abstractmethod
    def get_propiedades_particula(self, parte: str) -> Dict[str, Any]:
        """
        Obtener propiedades de partícula para una parte específica de la entidad
        
        Args:
            parte: Identificador de la parte ('tronco', 'hojas', 'raiz', 'cuerpo', 'cabeza', etc.)
        
        Returns:
            Diccionario con propiedades de la partícula (se serializará a JSON)
        """
        pass
    
    def get_metadata(self) -> Dict[str, Any]:
        """
        Obtener metadata del template (para debugging, logging, etc.)
        
        Returns:
            Diccionario con información del template
        """
        return {
            'nombre': self.nombre,
            'categoria': self.categoria
        }

