/**
 * Módulo Core - Núcleo de Three.js
 * 
 * Contiene la infraestructura base compartida:
 * - Escena base, cámara, controles, renderizador, luces, helpers
 * - Registry de geometrías
 * - Renderizadores base
 * - Gestión de performance
 * - Input centralizado
 */

export { Scene3D } from './scene.js';
export { Camera } from './camera.js';
export { Controls } from './controls.js';
export { GeometryRegistry } from './geometries/registry.js';
export { BaseRenderer } from './renderers/base-renderer.js';
export { PerformanceManager } from './performance/performance-manager.js';
export { InputManager } from './input/input-manager.js';
export { Renderer } from './renderer.js';
export { Lights } from './lights.js';
export { Helpers } from './helpers.js';

