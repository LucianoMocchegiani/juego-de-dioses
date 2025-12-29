/**
 * Renderizador WebGL
 */
import * as THREE from 'three';
import { COLOR_CIELO } from '../config/constants.js';

export class Renderer {
    /**
     * @param {HTMLElement} container - Contenedor HTML para el canvas
     */
    constructor(container) {
        this.container = container;
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setClearColor(COLOR_CIELO);
        container.appendChild(this.renderer.domElement);
    }
    
    /**
     * Renderizar escena con cámara
     * @param {THREE.Scene} scene - Escena Three.js
     * @param {THREE.Camera} camera - Cámara Three.js
     */
    render(scene, camera) {
        this.renderer.render(scene, camera);
    }
    
    /**
     * Actualizar tamaño del renderizador
     * @param {number} width - Nuevo ancho
     * @param {number} height - Nuevo alto
     */
    setSize(width, height) {
        this.renderer.setSize(width, height);
    }
    
    /**
     * Actualizar color del cielo basado en la iluminación (como en el mundo real)
     * El color del cielo se deriva del color y la intensidad de la luz del sol
     * @param {Object} celestialSystem - Sistema celestial del frontend
     * @param {Object} lights - Sistema de luces (para obtener color de la luz direccional)
     */
    updateSkyColor(celestialSystem, lights) {
        if (!celestialSystem || !lights || !lights.directionalLight) {
            return;
        }
        
        const sunIntensity = celestialSystem.getSunIntensity();
        const directionalLight = lights.directionalLight;
        
        // Obtener el color actual de la luz direccional (sol)
        const sunColor = directionalLight.color;
        
        // En el mundo real, el color del cielo es causado por la dispersión de la luz
        // Durante el día: el sol es blanco/amarillo, pero el cielo es azul (dispersión de Rayleigh)
        // Durante el atardecer/amanecer: el sol es naranja/rojo, y el cielo refleja esos tonos
        // Durante la noche: sin sol, el cielo es oscuro
        
        let skyColor;
        
        if (sunIntensity > 0.1) {
            // Hay luz solar: calcular color del cielo basado en el color del sol
            // Durante el día, el cielo es azul independientemente del color del sol
            // Pero durante amanecer/atardecer, el cielo refleja los tonos cálidos del sol
            
            // Extraer componentes RGB del color del sol
            const sunR = sunColor.r * 255;
            const sunG = sunColor.g * 255;
            const sunB = sunColor.b * 255;
            
            // Si el sol es cálido (naranja/rojo), el cielo también lo es
            // Si el sol es blanco, el cielo es azul (dispersión)
            const isWarmSun = sunR > sunB && sunR > 150; // Sol cálido (naranja/rojo)
            
            if (isWarmSun) {
                // Amanecer/Atardecer: cielo cálido que refleja el sol
                // Mezclar el color del sol con azul cielo base
                const warmFactor = Math.min(1.0, (sunR - 150) / 100); // 0.0 a 1.0
                const baseSkyBlue = { r: 135, g: 206, b: 235 }; // 0x87CEEB
                const warmSky = {
                    r: Math.round(baseSkyBlue.r + (sunR - baseSkyBlue.r) * warmFactor * 0.5),
                    g: Math.round(baseSkyBlue.g + (sunG - baseSkyBlue.g) * warmFactor * 0.5),
                    b: Math.round(baseSkyBlue.b + (sunB - baseSkyBlue.b) * warmFactor * 0.3)
                };
                skyColor = (warmSky.r << 16) | (warmSky.g << 8) | warmSky.b;
            } else {
                // Día normal: cielo azul (dispersión de Rayleigh)
                // El color del cielo es azul independientemente del color del sol
                skyColor = 0x87CEEB; // Azul cielo
            }
            
            // Ajustar brillo según intensidad solar
            // A mayor intensidad, más brillante el cielo
            const brightness = 0.3 + (sunIntensity * 0.7); // 0.3 a 1.0
            skyColor = this.adjustBrightness(skyColor, brightness);
        } else {
            // Noche: cielo oscuro (sin luz solar)
            // El color base es azul muy oscuro, casi negro
            const nightBrightness = Math.max(0.05, sunIntensity * 0.2); // Mínimo 5% de brillo
            skyColor = this.adjustBrightness(0x191970, nightBrightness); // Azul medianoche oscurecido
        }
        
        this.renderer.setClearColor(skyColor);
    }
    
    /**
     * Ajustar brillo de un color
     * @param {number} color - Color hexadecimal
     * @param {number} brightness - Factor de brillo (0.0 a 1.0)
     * @returns {number} Color con brillo ajustado
     */
    adjustBrightness(color, brightness) {
        const r = ((color >> 16) & 0xFF) * brightness;
        const g = ((color >> 8) & 0xFF) * brightness;
        const b = (color & 0xFF) * brightness;
        return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
    }
    
    /**
     * Interpolar entre dos colores hexadecimales
     * @param {number} color1 - Color inicial (hex)
     * @param {number} color2 - Color final (hex)
     * @param {number} factor - Factor de interpolación (0.0 a 1.0)
     * @returns {number} Color interpolado (hex)
     */
    interpolateColor(color1, color2, factor) {
        // Clamp factor entre 0 y 1
        factor = Math.max(0, Math.min(1, factor));
        
        // Extraer componentes RGB
        const r1 = (color1 >> 16) & 0xFF;
        const g1 = (color1 >> 8) & 0xFF;
        const b1 = color1 & 0xFF;
        
        const r2 = (color2 >> 16) & 0xFF;
        const g2 = (color2 >> 8) & 0xFF;
        const b2 = color2 & 0xFF;
        
        // Interpolar cada componente
        const r = Math.round(r1 + (r2 - r1) * factor);
        const g = Math.round(g1 + (g2 - g1) * factor);
        const b = Math.round(b1 + (b2 - b1) * factor);
        
        // Combinar en color hexadecimal
        return (r << 16) | (g << 8) | b;
    }
    
    /**
     * Obtener el elemento DOM del canvas
     * @returns {HTMLCanvasElement}
     */
    getDomElement() {
        return this.renderer.domElement;
    }
}

