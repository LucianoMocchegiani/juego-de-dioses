# Loaders de assets 3D

Infraestructura de carga de modelos 3D (GLB/GLTF), no "modelos de dominio". Ubicada en `rendering/` según la estructura elegida; antes estaba en `ecs/models/`.

## Archivos

- **model-loader.js** – Carga de modelos con GLTFLoader (Factory).
- **model-cache.js** – Cache global de modelos cargados (Singleton).
- **model-utils.js** – `loadModel3D()`: carga desde BD y aplica transformaciones.
- **bones-utils.js** – Utilidades de esqueleto (findBone, mapBonesToBodyParts, etc.).
- **vertex-groups-utils.js** – (ELIMINADO) Utilidades para vertex groups (deprecated — eliminado en limpieza de documentación).

## Consumidores

- `ecs/factories/player-factory.js` – loadModel3D, bones.
- `ecs/systems/weapon-equip-system.js` – ModelLoader, ModelCache.
- `ecs/systems/animation-mixer-system.js` – mapBonesToBodyParts.
- `utils/weapon-attachment.js` – findBone, hasSkeleton, listBones.

Importar desde `rendering/loaders/` o `rendering/loaders/index.js`.
