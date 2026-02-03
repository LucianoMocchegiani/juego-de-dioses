/**
 * Punto de entrada de la capa rendering.
 * Re-exporta scene, optimizations, geometries, renderers y performance.
 */

export { Scene3D, Camera, Controls, Lights, Helpers, Renderer } from './scene/index.js';
export { ObjectPool } from './optimizations/object-pool.js';
export { FrustumCuller } from './optimizations/frustum-culling.js';
export { LODManager } from './optimizations/lod-manager.js';
export { RenderBatcher } from './optimizations/render-batcher.js';
export { InstancingManager } from './optimizations/instancing-manager.js';
export { FrameScheduler } from './optimizations/frame-scheduler.js';
export { SpatialGrid } from './optimizations/spatial-partition.js';
export { GeometryRegistry } from './geometries/registry.js';
export { BaseRenderer } from './renderers/base-renderer.js';
export { PerformanceManager } from './performance/performance-manager.js';
