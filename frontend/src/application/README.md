# application/

Casos de uso que orquestan ports y store. Reciben ports y store por parámetro; no conocen adapters ni URLs.

- **load-world.js**: loadWorld(ports, store, options) — Obtiene dimensiones y tamaño del mundo vía worldApi; actualiza store; devuelve { dimension, worldSize }.
- **spawn-player.js**: spawnPlayer(ports, store, ecs, scene, options) — Obtiene personaje (listCharacters/createCharacter) vía charactersApi; llama a PlayerFactory; devuelve entityId.
- **sync-celestial.js**: syncCelestial(ports) — Devuelve estado celestial del backend (celestialApi.getState()); App actualiza CelestialSystem con ese estado.

Quien los llama: App (o driving/game) en start() o loadDemo(). Ver: `docs/frontend-estructura-elegida.md`.
