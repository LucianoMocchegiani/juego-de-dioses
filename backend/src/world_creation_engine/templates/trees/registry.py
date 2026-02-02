from typing import Dict, Optional, List
import random
from src.world_creation_engine.templates.trees.base import TreeTemplate
from src.world_creation_engine.templates.trees.roble import RobleTemplate
from src.world_creation_engine.templates.trees.palmera import PalmeraTemplate
from src.world_creation_engine.templates.trees.paraiso import ParaisoTemplate

# Registry de todos los templates de árboles
TREE_TEMPLATES: Dict[str, TreeTemplate] = {
    'roble': RobleTemplate(),
    'palmera': PalmeraTemplate(),
    'paraiso': ParaisoTemplate(),
}


def get_tree_template(template_id: str) -> Optional[TreeTemplate]:
    """
    Obtener un template de árbol por ID
    
    Args:
        template_id: ID del template ('roble', 'palmera', 'paraiso')
    
    Returns:
        TreeTemplate si existe, None si no existe
    """
    return TREE_TEMPLATES.get(template_id)


def get_all_tree_templates() -> Dict[str, TreeTemplate]:
    """
    Obtener todos los templates de árboles
    
    Returns:
        Diccionario con todos los templates (copia para evitar modificaciones)
    """
    return TREE_TEMPLATES.copy()


def get_random_tree_template() -> TreeTemplate:
    """
    Obtener un template de árbol aleatorio según densidades
    
    Returns:
        TreeTemplate seleccionado aleatoriamente según sus densidades
    """
    templates = list(TREE_TEMPLATES.values())
    weights = [t.densidad for t in templates]
    
    # Normalizar pesos
    total_weight = sum(weights)
    if total_weight == 0:
        # Si no hay pesos, seleccionar aleatoriamente
        return random.choice(templates)
    
    normalized_weights = [w / total_weight for w in weights]
    return random.choices(templates, weights=normalized_weights)[0]


def list_tree_template_ids() -> List[str]:
    """
    Listar todos los IDs de templates de árboles disponibles
    
    Returns:
        Lista de strings con los IDs de los templates
    """
    return list(TREE_TEMPLATES.keys())

