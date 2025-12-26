/**
 * Punto de entrada principal - Visualizador 3D de partículas
 */
import { App } from './app.js';
import { exposeAppOnly } from './dev-exposure.js';
import { cursorManager } from './utils/cursor-manager.js';

// Elementos del DOM
const loadingEl = document.getElementById('loading');
const dimensionInfoEl = document.getElementById('dimension-info');
const particlesCountEl = document.getElementById('particles-count');
const statusEl = document.getElementById('status');

// Inicializar aplicación
const container = document.getElementById('canvas-container');
const app = new App(container);

// Inicializar gestor de cursor
cursorManager.init(container);

// Exponer app básico globalmente (solo desarrollo)
// Las herramientas completas se exponen después en app.js cuando todo está inicializado
exposeAppOnly(app);

// Asegurar que el contenedor tenga focus para capturar eventos de teclado
container.focus();

// Mantener focus cuando se hace click en el contenedor
container.addEventListener('click', () => {
    container.focus();
});

/**
 * Cargar y renderizar dimensión demo
 */
async function loadDemo() {
    try {
        statusEl.textContent = 'Cargando...';
        statusEl.className = '';
        loadingEl.style.display = 'block';
        
        // Cargar demo usando la App
        const result = await app.loadDemo();
        
        // Actualizar UI
        dimensionInfoEl.textContent = `Bloque: ${result.dimension.nombre} (${result.dimension.ancho_metros}m x ${result.dimension.alto_metros}m)`;
        particlesCountEl.textContent = `Partículas: ${result.particlesCount}`;
        
        // Ocultar loading y mostrar éxito
        loadingEl.style.display = 'none';
        statusEl.textContent = 'Cargado correctamente';
        statusEl.className = 'success';
        
    } catch (error) {
        // console.error('Error cargando demo:', error);
        loadingEl.textContent = `Error: ${error.message}`;
        loadingEl.className = 'error';
        statusEl.textContent = `Error: ${error.message}`;
        statusEl.className = 'error';
    }
}

// Cargar demo al iniciar
loadDemo();

