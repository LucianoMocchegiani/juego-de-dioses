"""
Interface para sistemas de almacenamiento de modelos 3D

Usa Strategy pattern para permitir diferentes backends de almacenamiento
(local, S3, etc.) sin cambiar el código de negocio.
"""
from abc import ABC, abstractmethod
from typing import Optional


class BaseStorage(ABC):
    """Interface para sistemas de almacenamiento de modelos 3D"""
    
    @abstractmethod
    async def save_model(self, file_content: bytes, file_path: str) -> str:
        """
        Guardar modelo en almacenamiento
        
        Args:
            file_content: Contenido del archivo en bytes
            file_path: Ruta relativa donde guardar (ej: 'characters/humano.glb')
        
        Returns:
            Ruta relativa del archivo guardado
        """
        pass
    
    @abstractmethod
    async def get_model_url(self, file_path: str) -> str:
        """
        Obtener URL para acceder al modelo
        
        Args:
            file_path: Ruta relativa del archivo
        
        Returns:
            URL completa para acceder al modelo
        """
        pass
    
    @abstractmethod
    async def model_exists(self, file_path: str) -> bool:
        """
        Verificar si un modelo existe
        
        Args:
            file_path: Ruta relativa del archivo
        
        Returns:
            True si el modelo existe, False en caso contrario
        """
        pass
    
    @abstractmethod
    async def delete_model(self, file_path: str) -> bool:
        """
        Eliminar un modelo
        
        Args:
            file_path: Ruta relativa del archivo
        
        Returns:
            True si se eliminó, False si no existía
        """
        pass

