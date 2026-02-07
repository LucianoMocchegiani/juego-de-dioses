# domain/

Modelos de dominio y value objects. Sin dependencias de Three.js, fetch ni DOM.

- **world/**: Dimension, Viewport (formas que devuelve el backend para bloques y viewport).
- **particles/**: ParticleType (tipos de partícula).
- **character/**: CharacterModel (personaje para spawn y factory).
- **world/**: Dimension, Viewport (modelos y ahora implementación pura de Viewport en domain/world/viewport.js).
  - `Viewport` ahora contiene la implementación pura (sin dependencias de config) usada por los systems.
  - `rendering/terrain/components/viewport.js` reexporta y adapta la implementación con constantes de config.

Usado por: application (casos de uso), adapters (al mapear JSON → dominio), rendering/ecs/factories.

Ver: `docs/frontend-estructura-elegida.md`.
