from typing import List, Tuple, Dict, Any
import random
import math
from src.world_creation_engine.templates.base import BaseTemplate


class TreeTemplate(BaseTemplate):
    """Clase base para templates de árboles"""
    
    def __init__(
        self,
        nombre: str,
        grosor_tronco: int,
        altura_min: int,
        altura_max: int,
        copa_tamano: int,
        copa_niveles: int,
        raiz_tamano: int,
        raiz_profundidad: int,
        densidad: float = 0.15
    ):
        super().__init__(nombre, 'tree')
        self.grosor_tronco = grosor_tronco
        self.altura_min = altura_min
        self.altura_max = altura_max
        self.copa_tamano = copa_tamano
        self.copa_niveles = copa_niveles
        self.raiz_tamano = raiz_tamano
        self.raiz_profundidad = raiz_profundidad
        self.densidad = densidad
    
    def get_altura_aleatoria(self) -> int:
        """Obtener altura aleatoria del tronco"""
        return random.randint(self.altura_min, self.altura_max)
    
    def get_posiciones_tronco(self, x_centro: int, y_centro: int) -> List[Tuple[int, int]]:
        """
        Obtener posiciones (x, y) que forman el tronco
        El tronco se centra en (x_centro, y_centro)
        """
        posiciones = []
        offset = self.grosor_tronco // 2
        
        for dx in range(-offset, self.grosor_tronco - offset):
            for dy in range(-offset, self.grosor_tronco - offset):
                posiciones.append((x_centro + dx, y_centro + dy))
        
        return posiciones
    
    def get_posiciones_copa(self, x_centro: int, y_centro: int, z_base: int) -> List[Tuple[int, int, int]]:
        """
        Obtener posiciones (x, y, z) que forman la copa
        z_base es el nivel superior del tronco (donde empieza la copa)
        Optimizado: densidad reducida para mejor rendimiento
        """
        posiciones = []
        
        for z in range(z_base, z_base + self.copa_niveles):
            # Factor de densidad: más denso cerca del centro, más disperso en los bordes
            # Nivel base (z_base): 100% densidad en centro, 80% en bordes
            # Niveles superiores: densidad reducida progresivamente
            nivel_relativo = z - z_base
            densidad_base = 1.0 - (nivel_relativo * 0.15)  # Reduce 15% por nivel
            
            for dx in range(-self.copa_tamano, self.copa_tamano + 1):
                for dy in range(-self.copa_tamano, self.copa_tamano + 1):
                    # Distancia desde el centro
                    distancia = (dx*dx + dy*dy) ** 0.5
                    
                    # Solo incluir si está dentro del radio de la copa
                    if distancia <= self.copa_tamano:
                        # Calcular densidad según distancia del centro
                        if distancia <= 1:
                            densidad = 1.0  # Centro: siempre lleno
                        elif distancia <= self.copa_tamano * 0.5:
                            densidad = 0.9 * densidad_base  # Zona media: 90%
                        else:
                            densidad = 0.7 * densidad_base  # Bordes: 70%
                        
                        # Aplicar densidad aleatoria
                        if random.random() <= densidad:
                            posiciones.append((x_centro + dx, y_centro + dy, z))
        
        return posiciones
    
    def get_posiciones_raices(self, x_centro: int, y_centro: int, z_superficie: int) -> List[Tuple[int, int, int]]:
        """
        Obtener posiciones (x, y, z) que forman las raíces
        z_superficie es el nivel de la superficie (típicamente 0)
        """
        posiciones = []
        
        # Raíces principales (más gruesas cerca del tronco)
        for z in range(z_superficie - self.raiz_profundidad, z_superficie):
            # Raíz central (debajo del tronco) - más gruesa en la base
            grosor_raiz = max(1, self.grosor_tronco - (z_superficie - z) // 2)
            offset = grosor_raiz // 2
            
            for dx in range(-offset, grosor_raiz - offset):
                for dy in range(-offset, grosor_raiz - offset):
                    posiciones.append((x_centro + dx, y_centro + dy, z))
            
            # Raíces extendidas (más delgadas, alejándose del tronco)
            if z < z_superficie - 1:  # No en la capa más superficial
                # Crear 4-6 raíces principales extendiéndose desde el tronco
                num_raices = random.randint(4, 6)
                for i in range(num_raices):
                    angulo = (2 * 3.14159 * i) / num_raices
                    
                    # Extender raíz desde el tronco
                    for distancia in range(1, self.raiz_tamano + 1):
                        # Calcular posición usando ángulo
                        rx = int(x_centro + distancia * math.cos(angulo))
                        ry = int(y_centro + distancia * math.sin(angulo))
                        
                        # Raíz delgada (1 celda) que se va adelgazando
                        if distancia <= self.raiz_tamano // 2:
                            posiciones.append((rx, ry, z))
                        
                        # Agregar algunas ramificaciones laterales
                        if distancia > 2 and random.random() < 0.3:
                            # Ramificación en dirección perpendicular
                            perp_angulo = angulo + (3.14159 / 2 if random.random() < 0.5 else -3.14159 / 2)
                            rrx = int(rx + math.cos(perp_angulo))
                            rry = int(ry + math.sin(perp_angulo))
                            posiciones.append((rrx, rry, z))
        
        return posiciones
    
    def get_posiciones(self, x_centro: int, y_centro: int, z_base: int) -> List[Tuple[int, int, int]]:
        """
        Implementación de método abstracto: obtener todas las posiciones del árbol
        Combina tronco, copa y raíces
        
        Args:
            x_centro: Coordenada X del centro del árbol
            y_centro: Coordenada Y del centro del árbol
            z_base: Coordenada Z base (nivel del suelo, típicamente 0)
        
        Returns:
            Lista de tuplas (x, y, z) con todas las posiciones que forman el árbol
        """
        posiciones = []
        altura_tronco = self.get_altura_aleatoria()
        
        # Raíces
        posiciones.extend(self.get_posiciones_raices(x_centro, y_centro, z_base))
        
        # Tronco
        posiciones_tronco = self.get_posiciones_tronco(x_centro, y_centro)
        for z in range(z_base, z_base + altura_tronco):
            for tx, ty in posiciones_tronco:
                posiciones.append((tx, ty, z))
        
        # Copa
        z_copa_base = z_base + altura_tronco
        posiciones.extend(self.get_posiciones_copa(x_centro, y_centro, z_copa_base))
        
        return posiciones
    
    def get_propiedades_particula(self, parte: str) -> Dict[str, Any]:
        """
        Obtener propiedades de partícula según la parte del árbol
        
        Args:
            parte: Identificador de la parte ('tronco', 'hojas', 'raiz')
        
        Returns:
            Diccionario con propiedades de la partícula
        """
        if parte == 'tronco':
            return {'parte': 'tronco', 'tipo': self.nombre}
        elif parte == 'hojas':
            return {'parte': 'hojas', 'tipo': self.nombre}
        elif parte == 'raiz':
            return {'parte': 'raiz', 'tipo': self.nombre}
        else:
            return {'parte': parte, 'tipo': self.nombre}

