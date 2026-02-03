# domain/

Modelos de dominio y value objects. Sin dependencias de Three.js, fetch ni DOM.

- **world/**: Dimension, Viewport (formas que devuelve el backend para bloques y viewport).
- **particles/**: ParticleType (tipos de partícula).
- **character/**: CharacterModel (personaje para spawn y factory).

Usado por: application (casos de uso), adapters (al mapear JSON → dominio), rendering/ecs/factories.

Ver: `docs/frontend-estructura-elegida.md`.
