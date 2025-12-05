/**
 * Módulo API - Cliente API modular
 * 
 * Contiene el cliente API organizado por recurso:
 * - Cliente base con configuración
 * - Endpoints por recurso (dimensions, particles, agrupaciones)
 */

export { ApiClient } from './client.js';
export { DimensionsApi, ParticlesApi, AgrupacionesApi } from './endpoints/__init__.js';

