/**
 * Aplicación principal - Visualizador 3D de partículas
 */
import ApiClient from './api.js';
import { Scene3D } from './scene.js';
import {
    VIEWPORT_MAX_CELLS_X,
    VIEWPORT_MAX_CELLS_Y,
    DEMO_DIMENSION_NAME
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
        
        // Buscar dimensión demo por nombre exacto (definido en constantes)
        const demoDimension = dimensions.find(d => 
            d.nombre && d.nombre === DEMO_DIMENSION_NAME
        );
        
        if (!demoDimension) {
            throw new Error(`No se encontró la dimensión demo: "${DEMO_DIMENSION_NAME}". Dimensiones disponibles: ${dimensions.map(d => d.nombre).join(', ')}`);
        }
        
        currentDimension = demoDimension;
        dimensionInfoEl.textContent = `Dimensión: ${demoDimension.nombre} (${demoDimension.ancho_metros}m x ${demoDimension.alto_metros}m)`;
        
        // 2. Definir viewport basado en las dimensiones de la dimensión
        // Convertir metros a celdas (asumiendo tamano_celda)
        const celdas_x = Math.floor(demoDimension.ancho_metros / demoDimension.tamano_celda);
        const celdas_y = Math.floor(demoDimension.alto_metros / demoDimension.tamano_celda);
        
        // Viewport optimizado: cargar área completa horizontal pero limitar profundidad
        // Calcular dinámicamente cuántos niveles Z podemos cargar sin exceder el límite del backend
        // IMPORTANTE: Los rangos son inclusivos, así que x_max - x_min + 1 = número de celdas
        const xMax = Math.min(celdas_x - 1, VIEWPORT_MAX_CELLS_X - 1); // -1 porque es inclusivo
        const yMax = Math.min(celdas_y - 1, VIEWPORT_MAX_CELLS_Y - 1);
        const xRange = xMax - 0 + 1; // Número real de celdas en X (inclusivo)
        const yRange = yMax - 0 + 1; // Número real de celdas en Y (inclusivo)
        const maxCells = 500000; // Límite del backend
        const maxZRange = Math.floor(maxCells / (xRange * yRange)); // Máximo de niveles Z
        
        // Centrar en superficie (z=0) y cargar hacia arriba y abajo
        const zCenter = 0;
        let zMin = Math.max(
            demoDimension.profundidad_maxima || -8, 
            zCenter - Math.floor(maxZRange / 2)
        );
        let zMax = Math.min(
            demoDimension.altura_maxima || 10, 
            zCenter + Math.ceil(maxZRange / 2) - 1 // -1 porque es inclusivo
        );
        
        // Verificar que no exceda el límite (con margen de seguridad)
        let zRange = zMax - zMin + 1;
        let totalCells = xRange * yRange * zRange;
        if (totalCells > maxCells) {
            // Ajustar zMax hacia abajo si excede
            const maxAllowedZRange = Math.floor(maxCells / (xRange * yRange));
            zMax = zMin + maxAllowedZRange - 1;
            zRange = zMax - zMin + 1;
            totalCells = xRange * yRange * zRange;
            console.warn(`Viewport ajustado para no exceder límite: ${totalCells} celdas (Z: ${zMin} a ${zMax})`);
        }
        
        const viewport = {
            x_min: 0,
            x_max: xMax,
            y_min: 0,
            y_max: yMax,
            z_min: zMin,
            z_max: zMax
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
        
        // 6. Ajustar grilla y ejes al tamaño del terreno
        scene.updateHelpers(demoDimension.ancho_metros, demoDimension.alto_metros);
        
        // 7. Centrar cámara
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

