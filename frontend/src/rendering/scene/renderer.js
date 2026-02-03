/**
 * Renderizador WebGL
 */
import * as THREE from 'three';
import { COLOR_CIELO } from '../../config/constants.js';

export class Renderer {
    constructor(container) {
        this.container = container;
        const width = container.clientWidth;
        const height = container.clientHeight;
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setClearColor(COLOR_CIELO);
        container.appendChild(this.renderer.domElement);
        this.lastSkyColor = null;
        this.lastSunIntensity = null;
        this.skyColorDirty = true;
        this.skyColorChangeThreshold = 0.05;
        this.skyColorUpdates = 0;
        this.skyColorSkips = 0;
    }

    render(scene, camera) {
        this.renderer.render(scene, camera);
    }

    setSize(width, height) {
        this.renderer.setSize(width, height);
    }

    updateSkyColor(celestialSystem, lights) {
        if (!celestialSystem || !lights || !lights.directionalLight) return;
        const sunIntensity = celestialSystem.getSunIntensity();
        const directionalLight = lights.directionalLight;
        const sunColor = directionalLight.color;
        const intensityChanged = this.lastSunIntensity === null || Math.abs(sunIntensity - this.lastSunIntensity) > this.skyColorChangeThreshold;
        const colorChanged = this.lastSkyColor === null ||
            Math.abs(sunColor.r - this.lastSkyColor.r) > this.skyColorChangeThreshold ||
            Math.abs(sunColor.g - this.lastSkyColor.g) > this.skyColorChangeThreshold ||
            Math.abs(sunColor.b - this.lastSkyColor.b) > this.skyColorChangeThreshold;
        if (!intensityChanged && !colorChanged && !this.skyColorDirty) {
            this.skyColorSkips++;
            return;
        }
        this.skyColorUpdates++;
        this.skyColorDirty = false;
        this.lastSunIntensity = sunIntensity;
        this.lastSkyColor = { r: sunColor.r, g: sunColor.g, b: sunColor.b };
        let skyColor;
        if (sunIntensity > 0.1) {
            const sunR = sunColor.r * 255, sunG = sunColor.g * 255, sunB = sunColor.b * 255;
            const isWarmSun = sunR > sunB && sunR > 150;
            if (isWarmSun) {
                const warmFactor = Math.min(1.0, (sunR - 150) / 100);
                const baseSkyBlue = { r: 135, g: 206, b: 235 };
                const warmSky = {
                    r: Math.round(baseSkyBlue.r + (sunR - baseSkyBlue.r) * warmFactor * 0.5),
                    g: Math.round(baseSkyBlue.g + (sunG - baseSkyBlue.g) * warmFactor * 0.5),
                    b: Math.round(baseSkyBlue.b + (sunB - baseSkyBlue.b) * warmFactor * 0.3)
                };
                skyColor = (warmSky.r << 16) | (warmSky.g << 8) | warmSky.b;
            } else {
                skyColor = 0x87CEEB;
            }
            const brightness = 0.3 + (sunIntensity * 0.7);
            skyColor = this.adjustBrightness(skyColor, brightness);
        } else {
            const nightBrightness = Math.max(0.05, sunIntensity * 0.2);
            skyColor = this.adjustBrightness(0x191970, nightBrightness);
        }
        this.renderer.setClearColor(skyColor);
    }

    forceSkyColorUpdate() { this.skyColorDirty = true; }

    getSkyColorStats() {
        const total = this.skyColorUpdates + this.skyColorSkips;
        const skipRate = total > 0 ? (this.skyColorSkips / total) * 100 : 0;
        return { updates: this.skyColorUpdates, skips: this.skyColorSkips, total, skipRate: skipRate.toFixed(2) + '%' };
    }

    adjustBrightness(color, brightness) {
        const r = ((color >> 16) & 0xFF) * brightness;
        const g = ((color >> 8) & 0xFF) * brightness;
        const b = (color & 0xFF) * brightness;
        return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
    }

    interpolateColor(color1, color2, factor) {
        factor = Math.max(0, Math.min(1, factor));
        const r1 = (color1 >> 16) & 0xFF, g1 = (color1 >> 8) & 0xFF, b1 = color1 & 0xFF;
        const r2 = (color2 >> 16) & 0xFF, g2 = (color2 >> 8) & 0xFF, b2 = color2 & 0xFF;
        const r = Math.round(r1 + (r2 - r1) * factor);
        const g = Math.round(g1 + (g2 - g1) * factor);
        const b = Math.round(b1 + (b2 - b1) * factor);
        return (r << 16) | (g << 8) | b;
    }

    getDomElement() { return this.renderer.domElement; }
}
