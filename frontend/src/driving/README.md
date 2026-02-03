# driving/

Quién dispara los flujos: game loop, input, UI. No obtiene datos ni crea entidades; solo actualiza y delega.

- **game/**: game-bootstrap.js (crea ports, store, App con inyección), game-loop.js (runFrame para uso futuro).
- **input/**: InputManager (teclado, ratón). App lo inyecta al ECS (InputSystem).
- **ui/**: Paneles (F3, F6, etc.). Se moverán desde interfaces/ a driving/ui/panels/ al refactorizar app (Paso 8).

Ver: `docs/frontend-estructura-elegida.md`.
