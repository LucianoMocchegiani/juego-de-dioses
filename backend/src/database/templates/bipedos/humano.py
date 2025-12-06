from typing import List, Tuple, Dict, Any
from src.database.templates.bipedos.base import BipedTemplate


class HumanoTemplate(BipedTemplate):
    """Template para humano"""
    
    def __init__(self):
        super().__init__(
            nombre='Humano',
            altura_cabeza=1,      # 1 nivel de altura para cabeza
            altura_torso=4,       # 4 niveles de altura para torso
            altura_piernas=4,     # 4 niveles de altura para piernas
            ancho_hombros=2,      # 2 celdas de ancho en hombros
            ancho_cadera=2        # 2 celdas de ancho en cadera
        )
    
    def get_posiciones(self, x_centro: int, y_centro: int, z_base: int) -> List[Tuple[int, int, int]]:
        """
        Obtener posiciones del humano
        
        Args:
            x_centro: Coordenada X del centro del personaje
            y_centro: Coordenada Y del centro del personaje
            z_base: Coordenada Z base (nivel del suelo)
        
        Returns:
            Lista de tuplas (x, y, z) con todas las posiciones que forman el humano
        """
        posiciones = []
        
        # Cabeza (esfera en z_base + altura_torso + altura_piernas)
        z_cabeza = z_base + self.altura_torso + self.altura_piernas
        posiciones.append((x_centro, y_centro, z_cabeza))
        
        # Torso (cilindro desde z_base + altura_piernas hasta z_base + altura_piernas + altura_torso)
        for z in range(z_base + self.altura_piernas, z_base + self.altura_piernas + self.altura_torso):
            posiciones.append((x_centro, y_centro, z))
        
        # Brazos (izquierdo y derecho)
        # Brazo izquierdo (en x_centro - 1)
        for z in range(z_base + self.altura_piernas + 1, z_base + self.altura_piernas + self.altura_torso):
            posiciones.append((x_centro - 1, y_centro, z))
        
        # Brazo derecho (en x_centro + 1)
        for z in range(z_base + self.altura_piernas + 1, z_base + self.altura_piernas + self.altura_torso):
            posiciones.append((x_centro + 1, y_centro, z))
        
        # Piernas (izquierda y derecha)
        # Pierna izquierda (en x_centro - 1)
        for z in range(z_base, z_base + self.altura_piernas):
            posiciones.append((x_centro - 1, y_centro, z))
        
        # Pierna derecha (en x_centro + 1)
        for z in range(z_base, z_base + self.altura_piernas):
            posiciones.append((x_centro + 1, y_centro, z))
        
        return posiciones
    
    def get_propiedades_particula(self, parte: str) -> Dict[str, Any]:
        """
        Obtener propiedades por parte del cuerpo
        
        Args:
            parte: Identificador de la parte ('cabeza', 'torso', 'brazo_izquierdo', etc.)
        
        Returns:
            Diccionario con propiedades de la partícula
        """
        return {
            'parte_entidad': parte,
            'raza': 'humano'
        }

