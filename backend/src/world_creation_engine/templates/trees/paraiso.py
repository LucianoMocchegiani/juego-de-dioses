from src.world_creation_engine.templates.trees.base import TreeTemplate


class ParaisoTemplate(TreeTemplate):
    """Template para árbol paraíso"""
    
    def __init__(self):
        super().__init__(
            nombre='Paraíso',
            grosor_tronco=2,
            altura_min=15,
            altura_max=20,
            copa_tamano=4,
            copa_niveles=3,
            raiz_tamano=3,
            raiz_profundidad=3,
            densidad=0.15
        )

