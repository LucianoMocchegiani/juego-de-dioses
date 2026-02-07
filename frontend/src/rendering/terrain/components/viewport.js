/**
 * Re-export del cálculo de Viewport desde domain para mantener compatibilidad.
 * Este archivo sigue exponiendo la API de `components/viewport` pero delega la
 * implementación pura a `domain/world/viewport.js`. Aquí se inyectan las
 * constantes/config necesarias.
 */
import { Viewport as DomainViewport } from '../../../domain/world/viewport.js';
import { VIEWPORT_MAX_CELLS } from '../../../config/particle-optimization-config.js';

export class Viewport extends DomainViewport {
    constructor() {
        super(VIEWPORT_MAX_CELLS || 1000000);
    }
}

export function calculateViewport(dimension, maxCells = VIEWPORT_MAX_CELLS || 1000000) {
    const vp = new DomainViewport(maxCells);
    return vp.calculateViewport(dimension);
}
