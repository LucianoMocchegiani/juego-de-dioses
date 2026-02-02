"""
Motor de creación del mundo: templates, builders, creators y construcción de terreno.
Usan database.connection cuando necesitan persistir. Domains = API; este módulo = lógica de creación.
"""
from .templates.base import BaseTemplate
from .builders.base import BaseBuilder
from .creators.entity_creator import EntityCreator
from .terrain_builder import create_boundary_layer

__all__ = ["BaseTemplate", "BaseBuilder", "EntityCreator", "create_boundary_layer"]
