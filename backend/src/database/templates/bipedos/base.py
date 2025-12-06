from typing import List, Tuple, Dict, Any
from src.database.templates.base import BaseTemplate


class BipedTemplate(BaseTemplate):
    """Clase base para templates de bípedos (personajes)"""
    
    def __init__(
        self,
        nombre: str,
        altura_cabeza: int,
        altura_torso: int,
        altura_piernas: int,
        ancho_hombros: int,
        ancho_cadera: int
    ):
        super().__init__(nombre, 'biped')
        self.altura_cabeza = altura_cabeza
        self.altura_torso = altura_torso
        self.altura_piernas = altura_piernas
        self.ancho_hombros = ancho_hombros
        self.ancho_cadera = ancho_cadera
    
    def get_posiciones(self, x_centro: int, y_centro: int, z_base: int) -> List[Tuple[int, int, int]]:
        """
        Obtener todas las posiciones (x, y, z) que forman el bípedo
        Debe ser implementado por cada template específico
        
        Args:
            x_centro: Coordenada X del centro de la entidad
            y_centro: Coordenada Y del centro de la entidad
            z_base: Coordenada Z base (nivel del suelo)
        
        Returns:
            Lista de tuplas (x, y, z) con todas las posiciones que forman el bípedo
        """
        raise NotImplementedError("get_posiciones debe ser implementado por subclases")
    
    def get_propiedades_particula(self, parte: str) -> Dict[str, Any]:
        """
        Obtener propiedades de partícula para una parte específica del cuerpo
        
        Args:
            parte: Identificador de la parte ('cabeza', 'torso', 'brazo_izquierdo', 'brazo_derecho', 'pierna_izquierda', 'pierna_derecha')
        
        Returns:
            Diccionario con propiedades de la partícula (se serializará a JSON)
        """
        return {
            'parte_entidad': parte
        }

