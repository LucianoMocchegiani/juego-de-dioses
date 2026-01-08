import * as THREE from 'three';

/**
 * Sistema de Level of Detail (LOD)
 * Reduce calidad de entidades lejanas para mejorar rendimiento
 */
export class LODManager {
    constructor(camera) {
        this.camera = camera;
        this.nearDistance = 20;    // Distancia cercana (alta calidad)
        this.farDistance = 50;     // Distancia lejana (baja calidad)
        this.lodLevels = {
            HIGH: 'high',    // Alta calidad: animaciones completas, todos los polígonos
            LOW: 'low'       // Baja calidad: animaciones simplificadas, menos polígonos
        };
        this.stats = {
            highLODCount: 0,
            lowLODCount: 0,
            totalUpdates: 0
        };
    }
    
    /**
     * Calcular nivel de LOD basado en distancia a la cámara
     * @param {THREE.Vector3} position - Posición del objeto
     * @returns {string} Nivel de LOD ('high' o 'low')
     */
    getLODLevel(position) {
        if (!this.camera) return this.lodLevels.HIGH;
        
        const cameraPos = this.camera.position;
        const distance = position.distanceTo(cameraPos);
        
        if (distance <= this.nearDistance) {
            return this.lodLevels.HIGH;
        } else if (distance <= this.farDistance) {
            // Interpolar entre HIGH y LOW
            const t = (distance - this.nearDistance) / (this.farDistance - this.nearDistance);
            return t < 0.5 ? this.lodLevels.HIGH : this.lodLevels.LOW;
        } else {
            return this.lodLevels.LOW;
        }
    }
    
    /**
     * Actualizar LOD para una entidad
     * @param {number} entityId - ID de la entidad
     * @param {Object} renderComponent - Componente Render de la entidad
     * @param {Object} animationComponent - Componente Animation de la entidad (opcional)
     */
    updateLOD(entityId, renderComponent, animationComponent = null) {
        if (!renderComponent || !renderComponent.mesh) return;
        
        const mesh = renderComponent.mesh;
        const position = mesh.position;
        const lodLevel = this.getLODLevel(position);
        
        this.stats.totalUpdates++;
        
        // Aplicar LOD según nivel
        if (lodLevel === this.lodLevels.LOW) {
            // Baja calidad: simplificar renderizado
            mesh.visible = true; // Mantener visible pero simplificar
            
            // Guardar nivel de LOD actual en el componente de animación
            if (animationComponent) {
                animationComponent.updateFrequency = animationComponent.updateFrequency || 1;
                // Reducir velocidad de actualización de animación (cada 2 frames)
                if (animationComponent.updateFrequency === 1) {
                    animationComponent.updateFrequency = 2;
                }
            }
            
            this.stats.lowLODCount++;
        } else {
            // Alta calidad: renderizado completo
            mesh.visible = true;
            
            if (animationComponent) {
                animationComponent.updateFrequency = animationComponent.updateFrequency || 1;
                // Restaurar actualización cada frame
                animationComponent.updateFrequency = 1;
            }
            
            this.stats.highLODCount++;
        }
        
        // Guardar nivel de LOD actual
        mesh.userData.lodLevel = lodLevel;
    }
    
    /**
     * Obtener estadísticas de uso
     * @returns {Object} Estadísticas de LOD
     */
    getStats() {
        const highLODRate = this.stats.totalUpdates > 0 
            ? (this.stats.highLODCount / this.stats.totalUpdates) * 100 
            : 0;
        const lowLODRate = this.stats.totalUpdates > 0 
            ? (this.stats.lowLODCount / this.stats.totalUpdates) * 100 
            : 0;
        
        return {
            totalUpdates: this.stats.totalUpdates,
            highLODCount: this.stats.highLODCount,
            lowLODCount: this.stats.lowLODCount,
            highLODRate: highLODRate.toFixed(2) + '%',
            lowLODRate: lowLODRate.toFixed(2) + '%',
            efficiency: lowLODRate > 30 ? 'Excelente' : lowLODRate > 10 ? 'Regular' : 'Baja'
        };
    }
    
    /**
     * Resetear estadísticas
     */
    resetStats() {
        this.stats = {
            highLODCount: 0,
            lowLODCount: 0,
            totalUpdates: 0
        };
    }
}
