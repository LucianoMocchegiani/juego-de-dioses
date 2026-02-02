# Dominio Characters

DTOs y rutas de **personajes (bípedos)**. Endpoints: `GET/POST /api/v1/bloques/{id}/characters`, `GET .../characters/{id}/model`.

## Estructura Hexagonal + DDD

- **domain/** — (opcional) Entidades de dominio en el futuro.
- **application/ports/** — Puerto de salida: `ICharacterRepository` (bloque_exists, list_bipeds, get_biped, get_model_metadata).
- **application/** — Casos de uso: `list_characters`, `get_character`, `get_character_model`.
- **infrastructure/** — Adaptadores: `PostgresCharacterRepository` (list/get/model), `EntityCreationAdapter` (create_character; usa `get_connection()` y EntityCreator).
- **schemas.py** — DTOs: `CharacterResponse`, `CharacterCreate`, `BipedGeometry`, `Model3D`.
- **routes.py** — list/get/get_model/create_character usan Depends y puertos; sin `get_connection` en routes. create_character usa `ICharacterCreationPort` (EntityCreationAdapter).

Imports: `from src.domains.characters import ...`
