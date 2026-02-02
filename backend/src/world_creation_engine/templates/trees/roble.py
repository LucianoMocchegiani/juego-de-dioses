from src.world_creation_engine.templates.trees.base import TreeTemplate


class RobleTemplate(TreeTemplate):
    """Template para árbol de roble"""
    
    def __init__(self):
        super().__init__(
            nombre='Roble',
            grosor_tronco=3,  # 3x3 = 9 partículas = 0.75m × 0.75m
            altura_min=20,    # 20 niveles
            altura_max=25,    # 25 niveles
            copa_tamano=5,    # Radio de 5 celdas
            copa_niveles=4,   # 4 niveles de copa
            raiz_tamano=4,    # Raíces se extienden 4 celdas
            raiz_profundidad=4,  # 4 niveles bajo tierra
            densidad=0.10
        )

