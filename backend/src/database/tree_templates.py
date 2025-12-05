"""
Plantillas de árboles con diferentes configuraciones
Cada plantilla define: grosor del tronco, altura, tamaño de copa, y raíces
"""
from typing import Dict, List, Tuple
import random
import math


class TreeTemplate:
    """Plantilla para un tipo de árbol"""
    
    def __init__(
        self,
        nombre: str,
        grosor_tronco: int,  # Tamaño del tronco en celdas (1 = 1x1, 2 = 2x2, 3 = 3x3)
        altura_min: int,  # Altura mínima del tronco en celdas
        altura_max: int,  # Altura máxima del tronco en celdas
        copa_tamano: int,  # Tamaño de la copa (radio en celdas)
        copa_niveles: int,  # Número de niveles de copa
        raiz_tamano: int,  # Tamaño de las raíces (radio en celdas)
        raiz_profundidad: int,  # Profundidad de las raíces (niveles bajo tierra)
        densidad: float = 0.15  # Densidad de árboles de este tipo
    ):
        self.nombre = nombre
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
        offset_tronco = self.grosor_tronco // 2
        
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
                        import random
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


# Plantillas de árboles predefinidas
# IMPORTANTE: Las celdas son partículas, no metros
# - Cada celda = 0.25m × 0.25m = 0.0625 m²
# - 4 partículas en línea = 1 metro (4 × 0.25m = 1m)
# - 16 partículas (4×4) = 1 metro cuadrado (1m × 1m)
# - Mínimo para árboles: 4 partículas (2×2) = 0.5m × 0.5m
# - Para plantas pequeñas puede ser menos de 4 partículas
TREE_TEMPLATES = {
    'arbol_pequeno': TreeTemplate(
        nombre='Árbol Pequeño',
        grosor_tronco=2,  # 2x2 = 4 partículas (mínimo para árboles) = 0.5m × 0.5m
        altura_min=10,  # 2 × 5 = 10 niveles
        altura_max=15,  # 3 × 5 = 15 niveles
        copa_tamano=3,  # Radio de 3 celdas (aumentado de 2)
        copa_niveles=3,  # Aumentado de 2 a 3 niveles
        raiz_tamano=2,  # Raíces se extienden 2 celdas
        raiz_profundidad=2,  # 2 niveles bajo tierra
        densidad=0.20
    ),
    
    'arbol_mediano': TreeTemplate(
        nombre='Árbol Mediano',
        grosor_tronco=2,  # 2x2 = 4 partículas = 0.5m × 0.5m
        altura_min=15,  # 3 × 5 = 15 niveles
        altura_max=20,  # 4 × 5 = 20 niveles
        copa_tamano=4,  # Radio de 4 celdas (aumentado de 3)
        copa_niveles=3,  # Aumentado de 2 a 3 niveles
        raiz_tamano=3,  # Raíces se extienden 3 celdas
        raiz_profundidad=3,  # 3 niveles bajo tierra
        densidad=0.15
    ),
    
    'arbol_grande': TreeTemplate(
        nombre='Árbol Grande',
        grosor_tronco=3,  # 3x3 = 9 partículas = 0.75m × 0.75m
        altura_min=20,  # 4 × 5 = 20 niveles
        altura_max=25,  # 5 × 5 = 25 niveles
        copa_tamano=5,  # Radio de 5 celdas (aumentado de 4)
        copa_niveles=4,  # Aumentado de 3 a 4 niveles
        raiz_tamano=4,  # Raíces se extienden 4 celdas
        raiz_profundidad=4,  # 4 niveles bajo tierra
        densidad=0.10
    ),
    
    'arbol_muy_grande': TreeTemplate(
        nombre='Árbol Muy Grande',
        grosor_tronco=4,  # 4x4 = 16 partículas = 1m × 1m (1 metro cuadrado)
        altura_min=25,  # 5 × 5 = 25 niveles
        altura_max=30,  # 6 × 5 = 30 niveles
        copa_tamano=6,  # Radio de 6 celdas (aumentado de 5)
        copa_niveles=4,  # Aumentado de 3 a 4 niveles
        raiz_tamano=5,  # Raíces se extienden 5 celdas
        raiz_profundidad=5,  # 5 niveles bajo tierra
        densidad=0.05
    )
}


def get_random_tree_template() -> TreeTemplate:
    """Obtener una plantilla de árbol aleatoria según sus densidades"""
    templates = list(TREE_TEMPLATES.values())
    weights = [t.densidad for t in templates]
    
    # Normalizar pesos
    total_weight = sum(weights)
    normalized_weights = [w / total_weight for w in weights]
    
    return random.choices(templates, weights=normalized_weights)[0]


def get_all_tree_templates() -> Dict[str, TreeTemplate]:
    """Obtener todas las plantillas de árboles"""
    return TREE_TEMPLATES

