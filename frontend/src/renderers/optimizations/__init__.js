/**
 * Módulo de optimizaciones de renderizado
 * 
 * Contiene optimizaciones para mejorar el rendimiento del renderizado:
 * - LOD (Level of Detail): Reduce detalle de partículas lejanas
 * - Frustum Culling: Filtra partículas fuera del campo de visión (en utils/culling.js)
 * - Futuro: Occlusion Culling, Chunking Espacial
 */

export { LODManager } from './lod-manager.js';
export { ParticleLimiter } from './particle-limiter.js';

