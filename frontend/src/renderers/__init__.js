/**
 * Módulo Renderers - Sistema de renderizadores
 * 
 * Contiene el sistema de renderizadores especializados:
 * - Renderizador base abstracto
 * - Renderizador genérico de partículas
 * - Renderizadores especializados (árboles, plantas, etc.)
 * - Registry de renderizadores
 * - Registry de geometrías
 */

export { BaseRenderer } from './base-renderer.js';
export { ParticleRenderer } from './particle-renderer.js';
export { GeometryRegistry } from './geometries/registry.js';

