/**
 * Aplicación principal - Visualizador 3D de partículas
 */
import ApiClient from './api.js';
import { Scene3D } from './scene.js';
import {
    VIEWPORT_MAX_CELLS_X,
    VIEWPORT_MAX_CELLS_Y,
    VIEWPORT_DEFAULT_Z_MIN,
    VIEWPORT_DEFAULT_Z_MAX
} from './constants.js';

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
        
        // Buscar dimensión demo (cualquier dimensión que contenga "Demo" en el nombre)
        const demoDimension = dimensions.find(d => d.nombre && d.nombre.toLowerCase().includes('demo'));
        
        if (!demoDimension) {
            throw new Error('No se encontró la dimensión demo');
        }
        
        currentDimension = demoDimension;
        dimensionInfoEl.textContent = `Dimensión: ${demoDimension.nombre} (${demoDimension.ancho_metros}m x ${demoDimension.alto_metros}m)`;
        
        // 2. Definir viewport basado en las dimensiones de la dimensión
        // Convertir metros a celdas (asumiendo tamano_celda)
        const celdas_x = Math.floor(demoDimension.ancho_metros / demoDimension.tamano_celda);
        const celdas_y = Math.floor(demoDimension.alto_metros / demoDimension.tamano_celda);
        
        const viewport = {
            x_min: 0,
            x_max: Math.min(celdas_x, VIEWPORT_MAX_CELLS_X),
            y_min: 0,
            y_max: Math.min(celdas_y, VIEWPORT_MAX_CELLS_Y),
            z_min: Math.max(demoDimension.profundidad_maxima || VIEWPORT_DEFAULT_Z_MIN, VIEWPORT_DEFAULT_Z_MIN),
            z_max: Math.min(demoDimension.altura_maxima || VIEWPORT_DEFAULT_Z_MAX, VIEWPORT_DEFAULT_Z_MAX)
        };
        
        // 3. Cargar partículas Y tipos en paralelo
        const [particlesData, typesData] = await Promise.all([
            api.getParticles(demoDimension.id, viewport),
            api.getParticleTypes(demoDimension.id, viewport)
        ]);
        
        currentParticles = particlesData.particles;
        particlesCountEl.textContent = `Partículas: ${particlesData.total}`;
        
        // 4. Cachear tipos antes de renderizar
        typesData.types.forEach(tipo => {
            if (tipo.estilos) {
                scene.cacheStyle(tipo.nombre, tipo.estilos);
            }
        });
        
        // 5. Renderizar partículas (tipos ya cacheados)
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

