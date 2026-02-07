# ports/

Contratos (interfaces) para todo lo externo: API, WebSockets, storage. El resto del código depende del contrato, no de la implementación.

- **worldApi**: getDimensions(), getDimension(bloqueId), getWorldSize().
- **particlesApi**: getParticles(bloqueId, viewport), getParticleTypes(bloqueId, viewport).
- **charactersApi**: getCharacter(bloqueId, characterId), listCharacters(bloqueId), createCharacter(...), getCharacterModel(bloqueId, characterId).
- **celestialApi**: getState(), calculateTemperature(...).
- **agrupacionesApi**: getAgrupaciones(bloqueId), getAgrupacion(bloqueId, agrupacionId).

Las implementaciones HTTP viven en `adapters/http/`. App y casos de uso reciben un objeto `ports` con estas APIs inyectado (creado en bootstrap).

Ver: `docs/frontend-estructura-elegida.md`.

## Contratos formales (JSDoc)

Se han agregado typedefs formales para los ports en:

```
frontend/src/ports/contracts.js
```

Estos typedefs documentan la forma esperada de los ports (métodos y retornos)
que los adapters deben implementar (ej. `HttpParticlesApi`, `HttpBloquesApi`, etc.).
Usar estos contratos como referencia al implementar adapters o al inyectar ports
en `createPortsAndStore()` (bootstrap).
