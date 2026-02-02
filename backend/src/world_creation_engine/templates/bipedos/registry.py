from typing import Dict, Optional, List
from src.world_creation_engine.templates.bipedos.base import BipedTemplate
from src.world_creation_engine.templates.bipedos.humano import HumanoTemplate

# Registry de todos los templates de bípedos
BIPED_TEMPLATES: Dict[str, BipedTemplate] = {
    'humano': HumanoTemplate(),
}


def get_biped_template(template_id: str) -> Optional[BipedTemplate]:
    """
    Obtener un template de bípedo por ID
    
    Args:
        template_id: ID del template ('humano', 'elfo', 'enano', etc.)
    
    Returns:
        BipedTemplate si existe, None si no existe
    """
    return BIPED_TEMPLATES.get(template_id)


def get_all_biped_templates() -> Dict[str, BipedTemplate]:
    """
    Obtener todos los templates de bípedos
    
    Returns:
        Diccionario con todos los templates (copia para evitar modificaciones)
    """
    return BIPED_TEMPLATES.copy()


def list_biped_template_ids() -> List[str]:
    """
    Listar todos los IDs de templates de bípedos disponibles
    
    Returns:
        Lista de strings con los IDs de los templates
    """
    return list(BIPED_TEMPLATES.keys())

