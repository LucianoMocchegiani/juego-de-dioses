"""
Puerto para obtener la configuración de un bloque por ID (Hexagonal).
WorldBloqueManager depende de esta interfaz en lugar de get_connection().
Cualquier adaptador (p. ej. PostgresBloqueRepository) puede implementarla.
"""
from typing import Optional, Protocol


class IBloqueConfigProvider(Protocol):
    """Proporciona la fila de configuración de un bloque (dict) por ID."""

    async def get_config(self, bloque_id: str) -> Optional[dict]:
        """
        Devuelve la fila del bloque como dict (todas las columnas) o None si no existe.
        """
        ...
