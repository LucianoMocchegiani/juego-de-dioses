from typing import List, Tuple, Dict, Optional, Any
from uuid import UUID
import asyncpg
import json
import random
from src.database.builders.base import BaseBuilder
from src.database.templates.trees.base import TreeTemplate


class TreeBuilder(BaseBuilder):
    """Builder para crear árboles usando TreeTemplate"""
    
    def __init__(self, template: TreeTemplate):
        if not isinstance(template, TreeTemplate):
            raise ValueError(f"TreeBuilder requiere TreeTemplate, recibió {type(template)}")
        super().__init__(template)
        self.template: TreeTemplate = template  # Type hint específico
    
    async def create_at_position(
        self,
        conn: asyncpg.Connection,
        dimension_id: UUID,
        x: int,
        y: int,
        z: int,
        madera_id: str = None,
        hojas_id: str = None,
        solido_id: str = None,
        agrupacion_id: Optional[UUID] = None,
        **kwargs
    ) -> List[Tuple]:
        """
        Crear árbol en posición específica
        
        Args:
            conn: Conexión a la base de datos
            dimension_id: ID de la dimensión
            x, y, z: Posición donde crear el árbol
            madera_id: ID del tipo de partícula 'madera'
            hojas_id: ID del tipo de partícula 'hojas'
            solido_id: ID del estado de materia 'solido'
            agrupacion_id: ID de la agrupación (opcional, se asigna a todas las partículas)
        
        Returns:
            Lista de tuplas (dimension_id, x, y, z, tipo_id, estado_id, cantidad, temp, energia, extraida, agrupacion_id, es_nucleo, propiedades)
        """
        if not all([madera_id, hojas_id, solido_id]):
            raise ValueError("Faltan IDs de tipos de partículas o estados de materia")
        
        particles = []
        altura_tronco = self.template.get_altura_aleatoria()
        
        # 1. Crear raíces
        posiciones_raices = self.template.get_posiciones_raices(x, y, z)
        for rx, ry, rz in posiciones_raices:
            particles.append((
                dimension_id, rx, ry, rz,
                madera_id, solido_id, 1.0, 18.0, 0.0, False,
                agrupacion_id, False, json.dumps(self.template.get_propiedades_particula('raiz'))
            ))
        
        # 2. Crear tronco
        posiciones_tronco = self.template.get_posiciones_tronco(x, y)
        for z_level in range(z, z + altura_tronco):
            for tx, ty in posiciones_tronco:
                particles.append((
                    dimension_id, tx, ty, z_level,
                    madera_id, solido_id, 1.0, 20.0, 0.0, False,
                    agrupacion_id, False, json.dumps(self.template.get_propiedades_particula('tronco'))
                ))
        
        # 3. Crear copa
        z_copa_base = z + altura_tronco
        posiciones_copa = self.template.get_posiciones_copa(x, y, z_copa_base)
        for cx, cy, cz in posiciones_copa:
            particles.append((
                dimension_id, cx, cy, cz,
                hojas_id, solido_id, 1.0, 22.0, 0.0, False,
                agrupacion_id, False, json.dumps(self.template.get_propiedades_particula('hojas'))
            ))
        
        return particles
    
    def get_particle_type_ids(self) -> Dict[str, str]:
        """
        Obtener nombres de tipos de partículas necesarios para árboles
        
        Returns:
            Diccionario con nombres de tipos de partículas (no IDs)
            Las claves deben coincidir con los nombres de parámetros esperados por create_at_position()
            (con sufijo '_id' agregado por EntityCreator)
            NOTA: No incluye estados de materia (como 'solido'), esos se manejan por separado
        """
        return {
            'madera_id': 'madera',  # Tipo de partícula para tronco y raíces
            'hojas_id': 'hojas'     # Tipo de partícula para copa
        }
    
    def get_matter_state_name(self) -> str:
        """
        Obtener el nombre del estado de materia necesario para árboles
        
        Returns:
            Nombre del estado de materia (todos los árboles son sólidos)
        """
        return 'solido'
    
    async def create_agrupacion(
        self,
        conn: asyncpg.Connection,
        dimension_id: UUID,
        x: int,
        y: int,
        z: int
    ) -> Optional[UUID]:
        """
        Crear agrupación para este árbol
        
        Args:
            conn: Conexión a la base de datos
            dimension_id: ID de la dimensión
            x, y, z: Posición donde crear el árbol
        
        Returns:
            UUID de la agrupación creada
        """
        metadata = self.get_agrupacion_metadata()
        agrupacion_id = await conn.fetchval("""
            INSERT INTO juego_dioses.agrupaciones
            (bloque_id, nombre, tipo, especie, posicion_x, posicion_y, posicion_z)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        """, dimension_id, metadata['nombre'], metadata['tipo'], 
            metadata.get('especie'), x, y, z)
        return agrupacion_id
    
    def get_agrupacion_metadata(self) -> Dict[str, Any]:
        """
        Obtener metadata para crear agrupación de árbol
        
        Returns:
            Diccionario con metadata de la agrupación
        """
        return {
            'nombre': f"{self.template.nombre} #{random.randint(1000, 9999)}",
            'tipo': 'arbol',
            'especie': self.template.nombre.lower()
        }

