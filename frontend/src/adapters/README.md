# adapters/

Implementaciones de los ports: HTTP (api-client, http-bloques, http-particles, http-characters, http-celestial, http-agrupaciones). Futuro: WebSocket, storage.

- **http/**: ApiClient + adapters que implementan worldApi, particlesApi, charactersApi, celestialApi, agrupacionesApi.

Quien crea los adapters (bootstrap) los agrupa en un objeto `ports` y lo inyecta en App. App y casos de uso no importan adapters directamente.

Ver: `docs/frontend-estructura-elegida.md`.
