/**
 * Módulo World - Servicios de Integración del Mundo
 * 
 * Servicios que integran múltiples sistemas para manejar aspectos del mundo virtual:
 * - CameraController: Control de cámara que sigue al jugador
 * - CollisionDetector: Detección de colisiones con terreno
 * - CelestialSystem: Sistema celestial del frontend (calcula posiciones visuales desde estado del backend)
 * - CelestialRenderer: Renderizador de sol/luna en Three.js
 */

export { CameraController } from './camera-controller.js';
export { CollisionDetector } from './collision-detector.js';
export { CelestialSystem } from './celestial-system.js';
export { CelestialRenderer } from './celestial-renderer.js';
