# ports/

Contratos (interfaces) para todo lo externo: API, WebSockets, storage. El resto del código depende del contrato, no de la implementación.

- **worldApi**: getDimensions(), getDimension(bloqueId), getWorldSize().
- **particlesApi**: getParticles(bloqueId, viewport), getParticleTypes(bloqueId, viewport).
- **charactersApi**: getCharacter(bloqueId, characterId), listCharacters(bloqueId), createCharacter(...), getCharacterModel(bloqueId, characterId).
- **celestialApi**: getState(), calculateTemperature(...).
- **agrupacionesApi**: getAgrupaciones(bloqueId), getAgrupacion(bloqueId, agrupacionId).

Las implementaciones HTTP viven en `adapters/http/`. App y casos de uso reciben un objeto `ports` con estas APIs inyectado (creado en bootstrap).

Ver: `docs/frontend-estructura-elegida.md`.
