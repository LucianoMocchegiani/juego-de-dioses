from typing import Optional
from uuid import UUID
import asyncpg
from src.database.templates.base import BaseTemplate
from src.database.builders.base import BaseBuilder
from src.database.builders.tree_builder import TreeBuilder
from src.database.builders.biped_builder import BipedBuilder


class EntityCreator:
    """Creator genérico que simplifica la creación de entidades"""
    
    def __init__(self, conn: asyncpg.Connection, dimension_id: UUID):
        self.conn = conn
        self.dimension_id = dimension_id
        self._particle_type_cache = {}
        self._state_cache = {}
    
    async def _get_particle_type_id(self, nombre: str) -> str:
        """
        Obtener ID de tipo de partícula (con cache)
        
        Args:
            nombre: Nombre del tipo de partícula (ej: 'madera', 'hojas')
        
        Returns:
            UUID del tipo de partícula
        
        Raises:
            ValueError: Si el tipo de partícula no existe
        """
        if nombre not in self._particle_type_cache:
            tipo_id = await self.conn.fetchval(
                "SELECT id FROM juego_dioses.tipos_particulas WHERE nombre = $1",
                nombre
            )
            if not tipo_id:
                raise ValueError(f"Tipo de partícula '{nombre}' no encontrado")
            self._particle_type_cache[nombre] = tipo_id
        return self._particle_type_cache[nombre]
    
    async def _get_state_id(self, nombre: str) -> str:
        """
        Obtener ID de estado de materia (con cache)
        
        Args:
            nombre: Nombre del estado de materia (ej: 'solido', 'liquido')
        
        Returns:
            UUID del estado de materia
        
        Raises:
            ValueError: Si el estado de materia no existe
        """
        if nombre not in self._state_cache:
            state_id = await self.conn.fetchval(
                "SELECT id FROM juego_dioses.estados_materia WHERE nombre = $1",
                nombre
            )
            if not state_id:
                raise ValueError(f"Estado de materia '{nombre}' no encontrado")
            self._state_cache[nombre] = state_id
        return self._state_cache[nombre]
    
    def _get_builder(self, template: BaseTemplate) -> BaseBuilder:
        """
        Obtener builder apropiado según el template
        
        Args:
            template: Template de la entidad a crear
        
        Returns:
            Builder apropiado para el template
        
        Raises:
            ValueError: Si no hay builder para la categoría del template
        """
        if template.categoria == 'tree':
            return TreeBuilder(template)
        elif template.categoria == 'biped':
            return BipedBuilder(template)
        # Futuro: elif template.categoria == 'plant': return PlantBuilder(template)
        # Futuro: elif template.categoria == 'animal': return AnimalBuilder(template)
        else:
            raise ValueError(f"No hay builder para categoría '{template.categoria}'")
    
    async def create_entity(
        self,
        template: BaseTemplate,
        x: int,
        y: int,
        z: int,
        create_agrupacion: bool = True
    ) -> int:
        """
        Crear una entidad usando un template
        
        Args:
            template: Template de la entidad a crear
            x, y, z: Posición donde crear la entidad
            create_agrupacion: Si True, crear agrupación para la entidad (default: True)
        
        Returns:
            Número de partículas creadas
        
        Raises:
            ValueError: Si faltan tipos de partículas o estados de materia
        """
        builder = self._get_builder(template)
        
        # Crear agrupación si está habilitado y el builder lo soporta
        agrupacion_id = None
        if create_agrupacion:
            agrupacion_id = await builder.create_agrupacion(
                self.conn,
                self.dimension_id,
                x, y, z
            )
        
        # Obtener nombres de tipos de partículas necesarios
        particle_types = builder.get_particle_type_ids()
        particle_type_ids = {}
        for key, nombre in particle_types.items():
            particle_type_ids[key] = await self._get_particle_type_id(nombre)
        
        # Obtener estado de materia (separado de tipos de partículas)
        matter_state_name = builder.get_matter_state_name()
        estado_materia_id = await self._get_state_id(matter_state_name)
        
        # Crear partículas usando el builder
        # El builder recibe los IDs de tipos de partículas, el ID del estado de materia y el agrupacion_id
        particles = await builder.create_at_position(
            self.conn,
            self.dimension_id,
            x, y, z,
            solido_id=estado_materia_id,  # Nombre del parámetro para compatibilidad con TreeBuilder
            agrupacion_id=agrupacion_id,  # ID de agrupación (None si no se creó)
            **particle_type_ids
        )
        
        # Insertar en batch
        if particles:
            await self.conn.executemany("""
                INSERT INTO juego_dioses.particulas
                (dimension_id, celda_x, celda_y, celda_z, tipo_particula_id, estado_materia_id,
                 cantidad, temperatura, energia, extraida, agrupacion_id, es_nucleo, propiedades)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
                ON CONFLICT (dimension_id, celda_x, celda_y, celda_z) DO UPDATE
                SET tipo_particula_id = EXCLUDED.tipo_particula_id,
                    temperatura = EXCLUDED.temperatura,
                    propiedades = EXCLUDED.propiedades,
                    agrupacion_id = EXCLUDED.agrupacion_id
            """, particles)
        
        return len(particles)

