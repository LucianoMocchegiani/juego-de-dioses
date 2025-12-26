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
     * @param {InputManager} inputManager - InputManager para detectar mouse
     */
    constructor(camera, scene, cellSize = 0.25, inputManager = null) {
        this.camera = camera;
        this.scene = scene;
        this.cellSize = cellSize;
        this.inputManager = inputManager;
        
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
         * Ángulos de rotación de la cámara (en radianes)
         * @type {Object}
         */
        this.rotation = {
            horizontal: 0, // Rotación horizontal (alrededor del eje Y)
            vertical: Math.PI / 6 // Rotación vertical (ángulo de inclinación, 30 grados)
        };
        
        /**
         * Distancia de la cámara al objetivo (en metros)
         * @type {number}
         */
        this.distance = 10.0; // Aumentado para ver mejor modelos pequeños (el modelo tiene 0.19m)
        
        /**
         * Distancia mínima y máxima de la cámara (en metros)
         * @type {Object}
         */
        this.distanceLimits = {
            min: 1.0,  // Mínimo: 1 metro
            max: 20.0  // Máximo: 20 metros
        };
        
        /**
         * Velocidad de zoom (cuánto cambia la distancia por scroll)
         * @type {number}
         */
        this.zoomSpeed = 0.5;
        
        /**
         * Altura de la cámara sobre el objetivo (en metros)
         * @type {number}
         */
        this.height = 1.25;
        
        /**
         * Sensibilidad del mouse cuando el cursor está oculto (jugando)
         * @type {number}
         */
        this.mouseSensitivity = 0.008; // Sensibilidad para rotación de cámara en juego
        
        /**
         * Sensibilidad del mouse cuando el cursor está visible (en menús)
         * @type {number}
         */
        this.menuMouseSensitivity = 0.002; // Sensibilidad más baja para menús (más control)
        
        /**
         * Límites de rotación vertical (en radianes)
         * @type {Object}
         */
        this.verticalLimits = {
            min: -Math.PI / 3, // -60 grados
            max: Math.PI / 3   // +60 grados
        };
        
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
        
        // Zoom con rueda del mouse
        if (this.inputManager) {
            const wheelDelta = this.inputManager.getWheelDelta();
            if (wheelDelta !== 0) {
                // Ajustar distancia (wheelDelta positivo = acercar, negativo = alejar)
                this.distance += wheelDelta * this.zoomSpeed;
                
                // Limitar distancia
                this.distance = Math.max(
                    this.distanceLimits.min,
                    Math.min(this.distanceLimits.max, this.distance)
                );
            }
        }
        
        // Verificar si ALT está presionado (cualquier lado)
        const isAltPressed = this.inputManager && (
            this.inputManager.isKeyPressed('AltLeft') || 
            this.inputManager.isKeyPressed('AltRight')
        );
        
        // Verificar si el cursor está visible (interfaces abiertas)
        const isCursorVisible = document.body.classList.contains('cursor-visible');
        
        // Usar sensibilidad diferente según si el cursor está visible o no
        // En menús (cursor visible): sensibilidad más baja para mejor control
        // En juego (cursor oculto): sensibilidad normal para rotación fluida
        const currentSensitivity = isCursorVisible ? this.menuMouseSensitivity : this.mouseSensitivity;
        
        // Rotar cámara con movimiento del mouse (sin necesidad de click derecho)
        // Solo rotar si el cursor está oculto (no hay interfaces abiertas)
        if (this.inputManager && !isCursorVisible) {
            const mouseDelta = this.inputManager.getMouseDelta();
            
            // Solo rotar si hay movimiento del mouse
            if (mouseDelta.x !== 0 || mouseDelta.y !== 0) {
                // Rotación horizontal (alrededor del eje Y)
                this.rotation.horizontal -= mouseDelta.x * currentSensitivity;
                
                // Rotación vertical (inclinación)
                this.rotation.vertical += mouseDelta.y * currentSensitivity;
                
                // Limitar rotación vertical
                this.rotation.vertical = Math.max(
                    this.verticalLimits.min,
                    Math.min(this.verticalLimits.max, this.rotation.vertical)
                );
            }
        }
        
        // Actualizar rotación del personaje para que siempre mire en la dirección de la cámara
        // (se actualiza cada frame, no solo cuando se mueve el mouse)
        // EXCEPCIÓN: Si ALT está presionado, NO rotar el personaje (para ajuste manual de cámara)
        const shouldRotateCharacter = !isAltPressed;
        
        const render = ecs.getComponent(this.targetEntityId, 'Render');
        if (render && shouldRotateCharacter) {
            // La rotación horizontal de la cámara es la dirección en la que mira el personaje
            render.rotationY = this.rotation.horizontal;
        }
        
        if (this.mode === 'third-person') {
            // Calcular posición de la cámara usando esfera (órbita alrededor del jugador)
            const horizontalDistance = this.distance * Math.cos(this.rotation.vertical);
            const verticalDistance = this.distance * Math.sin(this.rotation.vertical);
            
            // Posición de la cámara en coordenadas esféricas
            const cameraX = targetX + horizontalDistance * Math.sin(this.rotation.horizontal);
            const cameraY = targetY + this.height + verticalDistance;
            const cameraZ = targetZ + horizontalDistance * Math.cos(this.rotation.horizontal);
            
            // Suavizado usando lerp
            const currentPos = this.camera.camera.position;
            const targetPos = new THREE.Vector3(cameraX, cameraY, cameraZ);
            currentPos.lerp(targetPos, this.smoothing);
            
            // Mirar al jugador
            this.camera.camera.lookAt(targetX, targetY + this.height * 0.5, targetZ);
        } else if (this.mode === 'first-person') {
            // Cámara en la posición del jugador
            const cameraX = targetX;
            const cameraY = targetY + 0.5; // Altura de los ojos
            const cameraZ = targetZ;
            
            // Suavizado
            const currentPos = this.camera.camera.position;
            const targetPos = new THREE.Vector3(cameraX, cameraY, cameraZ);
            currentPos.lerp(targetPos, this.smoothing);
            
            // Rotación de cámara en primera persona
            this.camera.camera.rotation.y = this.rotation.horizontal;
            this.camera.camera.rotation.x = this.rotation.vertical;
        }
    }
}
