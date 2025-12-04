/**
 * Aplicación principal - Visualizador 3D de partículas
 */
import ApiClient from './api.js';
import { Scene3D } from './scene.js';

// Elementos del DOM
const loadingEl = document.getElementById('loading');
const dimensionInfoEl = document.getElementById('dimension-info');
const particlesCountEl = document.getElementById('particles-count');
const statusEl = document.getElementById('status');

// Inicializar API client
const api = new ApiClient();

// Inicializar escena 3D
const container = document.getElementById('canvas-container');
const scene = new Scene3D(container);

// Estado de la aplicación
let currentDimension = null;
let currentParticles = [];

/**
 * Cargar y renderizar dimensión demo
 */
async function loadDemo() {
    try {
        statusEl.textContent = 'Cargando...';
        statusEl.className = '';
        
        // 1. Obtener dimensiones
        const dimensions = await api.getDimensions();
        
        // Buscar dimensión demo
        const demoDimension = dimensions.find(d => d.nombre === 'Demo - Terreno con Arboles');
        
        if (!demoDimension) {
            throw new Error('No se encontró la dimensión demo');
        }
        
        currentDimension = demoDimension;
        dimensionInfoEl.textContent = `Dimensión: ${demoDimension.nombre} (${demoDimension.ancho_metros}m x ${demoDimension.alto_metros}m)`;
        
        // 2. Obtener partículas
        const viewport = {
            x_min: 0,
            x_max: 20,
            y_min: 0,
            y_max: 20,
            z_min: -2,
            z_max: 5
        };
        
        const particlesData = await api.getParticles(demoDimension.id, viewport);
        currentParticles = particlesData.particles;
        
        particlesCountEl.textContent = `Partículas: ${particlesData.total}`;
        
        // 3. Renderizar partículas
        scene.renderParticles(currentParticles, demoDimension.tamano_celda);
        
        // 4. Centrar cámara
        const centerX = (viewport.x_max + viewport.x_min) / 2 * demoDimension.tamano_celda;
        const centerY = (viewport.y_max + viewport.y_min) / 2 * demoDimension.tamano_celda;
        const centerZ = (viewport.z_max + viewport.z_min) / 2 * demoDimension.tamano_celda;
        scene.centerCamera(centerX, centerY, centerZ);
        
        // 5. Ocultar loading y mostrar éxito
        loadingEl.style.display = 'none';
        statusEl.textContent = 'Cargado correctamente';
        statusEl.className = 'success';
        
        // Iniciar animación
        scene.animate();
        
    } catch (error) {
        console.error('Error cargando demo:', error);
        loadingEl.textContent = `Error: ${error.message}`;
        loadingEl.className = 'error';
        statusEl.textContent = `Error: ${error.message}`;
        statusEl.className = 'error';
    }
}

// Cargar demo al iniciar
loadDemo();

