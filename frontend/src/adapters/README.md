# adapters/

Implementaciones de los ports: HTTP (api-client, http-bloques, http-particles, http-characters, http-celestial, http-agrupaciones). Futuro: WebSocket, storage.

## Notas importantes

- Los adapters implementan los contratos definidos en `frontend/src/ports/contracts.js` (typedefs JSDoc). Cuando crees un nuevo adapter, añade `@implements` en la JSDoc y asegúrate de cumplir las firmas.
- Los adapters HTTP viven en `adapters/http/`. Existen implementaciones como `HttpParticlesApi`, `HttpBloquesApi`, etc.
- El bootstrap del juego (por ejemplo `frontend/src/driving/game/game-bootstrap.js`) crea las instancias de adapters, las agrupa en un objeto `ports` y las inyecta en `App`. Ningún módulo de dominio o rendering debe instanciar adapters directamente; siempre use los ports inyectados.

Ver también: `frontend/src/ports/contracts.js` y `docs/frontend-estructura-elegida.md`.
