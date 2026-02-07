# ports/

Contratos (interfaces) para todo lo externo: API, WebSockets, storage. El resto del código depende del contrato, no de la implementación.

Las implementaciones HTTP viven en `adapters/http/`. App y casos de uso reciben un objeto `ports` con estas APIs inyectado (creado en bootstrap).

## Contratos formales (JSDoc)

Se han agregado typedefs formales para los ports en:

```
frontend/src/ports/contracts.js
```

Estos typedefs documentan la forma esperada de los ports (métodos y retornos) que los adapters deben implementar (ej. `HttpParticlesApi`, `HttpBloquesApi`, etc.). Cuando implementes adapters, usa `@implements` en la JSDoc para facilitar la revisión.

## Bootstrap e Inyección

El objeto `ports` se crea en el bootstrap del juego (`frontend/src/driving/game/game-bootstrap.js`) y se inyecta en `App`. No instancies adapters desde módulos de dominio o rendering.

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
