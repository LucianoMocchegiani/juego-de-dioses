/**
 * Controlador de Cámara
 * 
 * Controla la cámara para seguir a una entidad en modo tercera persona o primera persona.
 */
import * as THREE from 'three';

export class CameraController {
    /**
     * @param {Object} camera - Objeto Camera del core
     * @param {Object} scene - Objeto Scene3D del core
     * @param {number} cellSize - Tamaño de celda en metros (para conversión de coordenadas)
     */
    constructor(camera, scene, cellSize = 0.25) {
        this.camera = camera;
        this.scene = scene;
        this.cellSize = cellSize;
        
        /**
         * Modo de cámara
         * @type {'first-person' | 'third-person'}
         */
        this.mode = 'third-person';
        
        /**
         * ID de la entidad objetivo
         * @type {number|null}
         */
        this.targetEntityId = null;
        
        /**
         * Offset para tercera persona (en metros)
         * @type {Object}
         */
        this.offset = { x: 0, y: 1.25, z: 2.5 }; // Detrás y arriba del jugador
        
        /**
         * Factor de suavizado (0-1, menor = más suave)
         * @type {number}
         */
        this.smoothing = 0.1;
    }
    
    /**
     * Establecer entidad objetivo
     * @param {number} entityId - ID de la entidad a seguir
     */
    setTarget(entityId) {
        this.targetEntityId = entityId;
    }
    
    /**
     * Establecer modo de cámara
     * @param {'first-person' | 'third-person'} mode - Modo de cámara
     */
    setMode(mode) {
        this.mode = mode;
    }
    
    /**
     * Actualizar posición de la cámara
     * @param {Object} ecs - ECSManager
     */
    update(ecs) {
        if (!this.targetEntityId || !ecs) return;
        
        const position = ecs.getComponent(this.targetEntityId, 'Position');
        if (!position) return;
        
        // Convertir coordenadas de celdas a metros
        const targetX = position.x * this.cellSize;
        const targetY = position.z * this.cellSize; // Z en celdas es altura en Three.js
        const targetZ = position.y * this.cellSize;
        
        if (this.mode === 'third-person') {
            // Cámara detrás y arriba del jugador
            const cameraX = targetX + this.offset.x;
            const cameraY = targetY + this.offset.y;
            const cameraZ = targetZ + this.offset.z;
            
            // Suavizado usando lerp
            const currentPos = this.camera.camera.position;
            const targetPos = new THREE.Vector3(cameraX, cameraY, cameraZ);
            currentPos.lerp(targetPos, this.smoothing);
            
            // Mirar al jugador
            this.camera.camera.lookAt(targetX, targetY, targetZ);
        } else if (this.mode === 'first-person') {
            // Cámara en la posición del jugador (futuro)
            const cameraX = targetX;
            const cameraY = targetY + 0.5; // Altura de los ojos
            const cameraZ = targetZ;
            
            // Suavizado
            const currentPos = this.camera.camera.position;
            const targetPos = new THREE.Vector3(cameraX, cameraY, cameraZ);
            currentPos.lerp(targetPos, this.smoothing);
            
            // La rotación se manejaría con input del mouse (futuro)
        }
    }
}

