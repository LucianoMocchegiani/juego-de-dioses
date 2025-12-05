from typing import List, Tuple
from src.database.templates.trees.base import TreeTemplate
import random


class PalmeraTemplate(TreeTemplate):
    """Template para palmera"""
    
    def __init__(self):
        super().__init__(
            nombre='Palmera',
            grosor_tronco=2,  # Tronco delgado
            altura_min=25,     # Muy alta
            altura_max=30,
            copa_tamano=3,    # Copa pequeña en la parte superior
            copa_niveles=2,   # Pocos niveles de copa
            raiz_tamano=3,
            raiz_profundidad=3,
            densidad=0.05
        )
    
    def get_posiciones_copa(self, x_centro: int, y_centro: int, z_base: int) -> List[Tuple[int, int, int]]:
        """
        Sobrescribir para copa de palmera (solo en la parte superior)
        La palmera tiene hojas solo en la parte más alta
        """
        posiciones = []
        
        # Solo generar copa en los últimos niveles (más concentrada arriba)
        for z in range(z_base, z_base + self.copa_niveles):
            nivel_relativo = z - z_base
            # Mayor densidad en el nivel superior
            densidad_base = 1.0 - (nivel_relativo * 0.2)  # Reduce 20% por nivel
            
            for dx in range(-self.copa_tamano, self.copa_tamano + 1):
                for dy in range(-self.copa_tamano, self.copa_tamano + 1):
                    distancia = (dx*dx + dy*dy) ** 0.5
                    
                    if distancia <= self.copa_tamano:
                        # Palmera: copa más compacta y densa en el centro
                        if distancia <= 1:
                            densidad = 1.0 * densidad_base  # Centro: siempre lleno
                        elif distancia <= self.copa_tamano * 0.6:
                            densidad = 0.85 * densidad_base  # Zona media: 85%
                        else:
                            densidad = 0.6 * densidad_base  # Bordes: 60% (más dispersa)
                        
                        if random.random() <= densidad:
                            posiciones.append((x_centro + dx, y_centro + dy, z))
        
        return posiciones

