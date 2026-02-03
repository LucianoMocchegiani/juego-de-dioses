/**
 * Loaders de assets 3D (GLB/GLTF). Infraestructura de carga, no "modelos de dominio".
 */
export { ModelLoader } from './model-loader.js';
export { ModelCache } from './model-cache.js';
export { loadModel3D } from './model-utils.js';
export {
    getSkeleton,
    findBone,
    hasSkeleton,
    listBones,
    listBonesFormatted,
    mapBonesToBodyParts,
    setBoneVisibility
} from './bones-utils.js';
export { getVertexGroups } from './vertex-groups-utils.js';
