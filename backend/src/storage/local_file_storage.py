"""
Almacenamiento local en sistema de archivos

Implementación de BaseStorage para almacenar modelos en el sistema de archivos local.
Preparado para migrar a S3 u otros sistemas cambiando solo la implementación.
"""
import os
from pathlib import Path
from typing import Optional
from .storage_interface import BaseStorage


class LocalFileStorage(BaseStorage):
    """Almacenamiento local en sistema de archivos"""
    
    def __init__(self, base_path: str = "static/models"):
        """
        Inicializar almacenamiento local
        
        Args:
            base_path: Ruta base donde se almacenarán los modelos (relativa al directorio del proyecto)
        """
        self.base_path = Path(base_path)
        # Crear directorio si no existe
        self.base_path.mkdir(parents=True, exist_ok=True)
    
    async def save_model(self, file_content: bytes, file_path: str) -> str:
        """
        Guardar modelo en sistema de archivos
        
        Args:
            file_content: Contenido del archivo en bytes
            file_path: Ruta relativa donde guardar (ej: 'characters/humano.glb')
        
        Returns:
            Ruta relativa del archivo guardado
        """
        # Validar ruta para prevenir path traversal
        if '..' in file_path or os.path.isabs(file_path):
            raise ValueError(f"Ruta inválida: {file_path}")
        
        full_path = self.base_path / file_path
        # Crear directorios padre si no existen
        full_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Guardar archivo
        with open(full_path, 'wb') as f:
            f.write(file_content)
        
        # Retornar ruta relativa desde base_path
        return str(full_path.relative_to(self.base_path))
    
    async def get_model_url(self, file_path: str) -> str:
        """
        Obtener URL para acceder al modelo
        
        Args:
            file_path: Ruta relativa del archivo
        
        Returns:
            URL relativa para servir desde FastAPI (/static/models/{ruta})
        """
        # Validar ruta
        if '..' in file_path:
            raise ValueError(f"Ruta inválida: {file_path}")
        
        # URL relativa para servir desde FastAPI
        return f"/static/models/{file_path}"
    
    async def model_exists(self, file_path: str) -> bool:
        """
        Verificar si un modelo existe
        
        Args:
            file_path: Ruta relativa del archivo
        
        Returns:
            True si el modelo existe, False en caso contrario
        """
        # Validar ruta
        if '..' in file_path:
            return False
        
        full_path = self.base_path / file_path
        return full_path.exists() and full_path.is_file()
    
    async def delete_model(self, file_path: str) -> bool:
        """
        Eliminar un modelo
        
        Args:
            file_path: Ruta relativa del archivo
        
        Returns:
            True si se eliminó, False si no existía
        """
        # Validar ruta
        if '..' in file_path:
            return False
        
        full_path = self.base_path / file_path
        if full_path.exists() and full_path.is_file():
            full_path.unlink()
            return True
        return False

