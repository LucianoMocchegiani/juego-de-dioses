/**
 * Módulo API - Cliente API modular
 * 
 * Contiene el cliente API organizado por recurso:
 * - Cliente base con configuración
 * - Endpoints por recurso (bloques, particles, agrupaciones)
 */

export { ApiClient } from './client.js';
export { BloquesApi, ParticlesApi, AgrupacionesApi } from './endpoints/__init__.js';

