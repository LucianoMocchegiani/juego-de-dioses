/**
 * Bootstrap del juego: crea ApiClient, adapters HTTP, objeto ports, store y App.
 * main.js llama createApp(container) y luego app.loadDemo() / app.startAnimation().
 */
import { ApiClient } from '../../adapters/http/api-client.js';
import { HttpBloquesApi, HttpParticlesApi, HttpCharactersApi, HttpCelestialApi, HttpAgrupacionesApi } from '../../adapters/http/index.js';
import { Store } from '../../state/store.js';
import { App } from '../../app.js';

/**
 * Crear ports y store para inyectar en App.
 * @returns {{ ports: Object, store: Store, apiClient: ApiClient }}
 */
export function createPortsAndStore() {
    const apiClient = new ApiClient();
    const worldApi = new HttpBloquesApi(apiClient);
    const particlesApi = new HttpParticlesApi(apiClient);
    const charactersApi = new HttpCharactersApi(apiClient);
    const celestialApi = new HttpCelestialApi(apiClient);
    const agrupacionesApi = new HttpAgrupacionesApi(apiClient);

    const ports = {
        worldApi,
        bloquesApi: worldApi,
        particlesApi,
        charactersApi,
        celestialApi,
        agrupacionesApi
    };

    const store = new Store();
    return { ports, store, apiClient };
}

/**
 * Crear App con ports y store inyectados.
 * @param {HTMLElement} container - Contenedor del canvas
 * @returns {App}
 */
export function createApp(container) {
    const { ports, store } = createPortsAndStore();
    return new App(container, { ports, store });
}
