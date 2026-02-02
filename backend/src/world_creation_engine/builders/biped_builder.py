from typing import List, Tuple, Dict, Optional, Any
from uuid import UUID
import asyncpg
import json
from src.world_creation_engine.builders.base import BaseBuilder
from src.world_creation_engine.templates.bipedos.base import BipedTemplate
from src.domains.characters.schemas import Model3D


class BipedBuilder(BaseBuilder):
    """Builder para crear bípedos usando BipedTemplate"""
    
    def __init__(self, template: BipedTemplate, modelo_3d: Optional[Model3D] = None):
        if not isinstance(template, BipedTemplate):
            raise ValueError(f"BipedBuilder requiere BipedTemplate, recibió {type(template)}")
        super().__init__(template)
        self.template: BipedTemplate = template  # Type hint específico
        self.modelo_3d: Optional[Model3D] = modelo_3d  # Modelo 3D opcional
    
    async def create_at_position(
        self,
        conn: asyncpg.Connection,
        dimension_id: UUID,
        x: int,
        y: int,
        z: int,
        cuerpo_id: str = None,
        solido_id: str = None,
        agrupacion_id: Optional[UUID] = None,
        **kwargs
    ) -> List[Tuple]:
        """
        Crear bípedo en posición específica
        
        NOTA: Los bípedos (personajes) NO se crean como partículas físicas en el mapa.
        Solo se crea la agrupación con geometria_agrupacion, y el mesh se renderiza
        desde el frontend usando esa geometría.
        
        Esto es porque los personajes son entidades dinámicas que se mueven constantemente,
        y crear/actualizar partículas físicas sería ineficiente.
        
        Args:
            conn: Conexión a la base de datos
            dimension_id: ID de la dimensión
            x, y, z: Posición donde crear el bípedo
            cuerpo_id: ID del tipo de partícula (ignorado, no se usan partículas)
            solido_id: ID del estado de materia (ignorado, no se usan partículas)
            agrupacion_id: ID de la agrupación (ignorado, se crea en create_agrupacion)
        
        Returns:
            Lista vacía (no se crean partículas físicas)
        """
        # Los bípedos no se crean como partículas físicas en el mapa
        # Solo se crea la agrupación con geometria_agrupacion (en create_agrupacion)
        # El mesh se renderiza desde el frontend usando esa geometría
        return []
    
    def get_particle_type_ids(self) -> Dict[str, str]:
        """
        Obtener nombres de tipos de partículas necesarios para bípedos
        
        NOTA: Este método se mantiene por compatibilidad con EntityCreator,
        pero los valores retornados no se usan porque create_at_position()
        retorna lista vacía (no se crean partículas físicas).
        
        Returns:
            Diccionario con nombres de tipos de partículas (no IDs)
            Las claves deben coincidir con los nombres de parámetros esperados por create_at_position()
            (con sufijo '_id' agregado por EntityCreator)
        """
        # Retornar diccionario vacío o con valores dummy ya que no se usan
        return {}
    
    def get_matter_state_name(self) -> str:
        """
        Obtener el nombre del estado de materia necesario para bípedos
        
        NOTA: Este método se mantiene por compatibilidad con EntityCreator,
        pero el valor retornado no se usa porque create_at_position()
        retorna lista vacía (no se crean partículas físicas).
        
        Returns:
            Nombre del estado de materia (todos los bípedos son sólidos)
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
        Crear agrupación con geometria_agrupacion para el bípedo
        
        Args:
            conn: Conexión a la base de datos
            dimension_id: ID de la dimensión
            x, y, z: Posición donde crear el bípedo
        
        Returns:
            UUID de la agrupación creada
        """
        metadata = self.get_agrupacion_metadata()
        
        # Obtener tamano_celda de la dimensión
        tamano_celda_raw = await conn.fetchval("""
            SELECT tamano_celda FROM juego_dioses.bloques WHERE id = $1
        """, dimension_id)
        
        # Convertir Decimal a float para JSON serialization
        if tamano_celda_raw:
            tamano_celda = float(tamano_celda_raw)
        else:
            tamano_celda = 0.25  # Default si no se encuentra
        
        # Construir geometria_agrupacion
        geometria = self._build_geometria_agrupacion(tamano_celda)
        
        # Incluir modelo_3d si está disponible
        modelo_3d_json = None
        if self.modelo_3d:
            modelo_3d_json = json.dumps(self.modelo_3d.dict())
        
        agrupacion_id = await conn.fetchval("""
            INSERT INTO juego_dioses.agrupaciones
            (bloque_id, nombre, tipo, especie, geometria_agrupacion, modelo_3d, posicion_x, posicion_y, posicion_z)
            VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9)
            RETURNING id
        """, dimension_id, metadata['nombre'], metadata['tipo'], metadata['especie'], 
            json.dumps(geometria), modelo_3d_json, x, y, z)
        
        return agrupacion_id
    
    def _build_geometria_agrupacion(self, tamano_celda: float) -> Dict[str, Any]:
        """
        Construir estructura de geometria_agrupacion
        
        Args:
            tamano_celda: Tamaño de celda en metros de la dimensión
        
        Returns:
            Diccionario con estructura de geometria_agrupacion
        """
        # Calcular offsets y alturas en metros
        altura_total_torso = self.template.altura_torso * tamano_celda
        altura_total_piernas = self.template.altura_piernas * tamano_celda
        altura_total_cabeza = self.template.altura_cabeza * tamano_celda
        
        # Z base del torso (centro de las piernas)
        z_torso_base = altura_total_piernas
        z_torso_centro = z_torso_base + altura_total_torso / 2
        z_cabeza_base = z_torso_base + altura_total_torso
        
        return {
            "tipo": "biped",
            "partes": {
                "cabeza": {
                    "geometria": {
                        "tipo": "sphere",
                        "parametros": {"radius": 0.25, "segments": 8}
                    },
                    "offset": {"x": 0, "y": 0, "z": z_cabeza_base + altura_total_cabeza / 2}
                },
                "torso": {
                    "geometria": {
                        "tipo": "cylinder",
                        "parametros": {
                            "radiusTop": 0.3,
                            "radiusBottom": 0.3,
                            "height": altura_total_torso,
                            "segments": 8
                        }
                    },
                    "offset": {"x": 0, "y": 0, "z": z_torso_centro}
                },
                "brazo_izquierdo": {
                    "geometria": {
                        "tipo": "cylinder",
                        "parametros": {
                            "radiusTop": 0.1,
                            "radiusBottom": 0.1,
                            "height": (self.template.altura_torso - 1) * tamano_celda,
                            "segments": 8
                        }
                    },
                    "offset": {"x": -0.4, "y": 0, "z": z_torso_centro},
                    "rotacion": {"x": 0, "y": 0, "z": 90}
                },
                "brazo_derecho": {
                    "geometria": {
                        "tipo": "cylinder",
                        "parametros": {
                            "radiusTop": 0.1,
                            "radiusBottom": 0.1,
                            "height": (self.template.altura_torso - 1) * tamano_celda,
                            "segments": 8
                        }
                    },
                    "offset": {"x": 0.4, "y": 0, "z": z_torso_centro},
                    "rotacion": {"x": 0, "y": 0, "z": 90}
                },
                "pierna_izquierda": {
                    "geometria": {
                        "tipo": "cylinder",
                        "parametros": {
                            "radiusTop": 0.15,
                            "radiusBottom": 0.15,
                            "height": altura_total_piernas,
                            "segments": 8
                        }
                    },
                    "offset": {"x": -0.25, "y": 0, "z": altura_total_piernas / 2}
                },
                "pierna_derecha": {
                    "geometria": {
                        "tipo": "cylinder",
                        "parametros": {
                            "radiusTop": 0.15,
                            "radiusBottom": 0.15,
                            "height": altura_total_piernas,
                            "segments": 8
                        }
                    },
                    "offset": {"x": 0.25, "y": 0, "z": altura_total_piernas / 2}
                }
            }
        }
    
    def get_agrupacion_metadata(self) -> Dict[str, Any]:
        """
        Obtener metadata para crear agrupación de bípedo
        
        Returns:
            Diccionario con metadata de la agrupación
        """
        return {
            'nombre': f"{self.template.nombre}",
            'tipo': 'biped',
            'especie': self.template.nombre.lower()
        }

