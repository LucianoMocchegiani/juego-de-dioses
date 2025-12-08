"""
Sistema de almacenamiento de modelos 3D

Proporciona interfaces y implementaciones para almacenar modelos 3D,
preparado para migrar de almacenamiento local a S3 u otros sistemas.
"""
from .storage_interface import BaseStorage
from .local_file_storage import LocalFileStorage

__all__ = ['BaseStorage', 'LocalFileStorage']

