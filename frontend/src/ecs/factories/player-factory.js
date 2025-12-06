/**
 * Factory para crear entidades de jugador
 * 
 * Crea una entidad de jugador completa con todos los componentes necesarios.
 */
import * as THREE from 'three';
import { PositionComponent, PhysicsComponent, RenderComponent, InputComponent, AnimationComponent } from '../components/index.js';

export class PlayerFactory {
    /**
     * Crear entidad de jugador
     * @param {Object} options - Opciones para crear el jugador
     * @param {ECSManager} options.ecs - ECS Manager
     * @param {THREE.Scene} options.scene - Escena de Three.js
     * @param {number} [options.x] - Posición X inicial (en celdas)
     * @param {number} [options.y] - Posición Y inicial (en celdas)
     * @param {number} [options.z] - Posición Z inicial (en celdas)
     * @param {number} [options.cellSize] - Tamaño de celda en metros
     * @returns {number} ID de la entidad creada
     */
    static createPlayer(options) {
        const { ecs, scene, x = 80, y = 80, z = 1, cellSize = 0.25 } = options;
        
        // Crear entidad
        const playerId = ecs.createEntity();
        
        // Crear mesh del jugador (primitivo simple)
        const group = new THREE.Group();
        
        // Cuerpo (cilindro)
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.0, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.5;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);
        
        // Cabeza (esfera)
        const headGeometry = new THREE.SphereGeometry(0.25, 8, 8);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFDBB3 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.25;
        head.castShadow = true;
        head.receiveShadow = true;
        group.add(head);
        
        // Escalar según tamaño de celda
        group.scale.set(cellSize, cellSize, cellSize);
        
        // Agregar a la escena
        scene.add(group);
        
        // Agregar componentes
        ecs.addComponent(playerId, 'Position', new PositionComponent(x, y, z));
        
        ecs.addComponent(playerId, 'Physics', new PhysicsComponent({
            velocity: { x: 0, y: 0, z: 0 },
            mass: 70,
            useGravity: true,
            isGrounded: false,
            groundFriction: 0.8,
            airFriction: 0.95,
            maxVelocity: { x: 5, y: 10, z: 5 } // Velocidad máxima en celdas/segundo
        }));
        
        ecs.addComponent(playerId, 'Render', new RenderComponent({
            mesh: group,
            visible: true,
            castShadow: true,
            receiveShadow: true
        }));
        
        ecs.addComponent(playerId, 'Input', new InputComponent());
        
        ecs.addComponent(playerId, 'Animation', new AnimationComponent({
            currentState: 'idle',
            animationSpeed: 1.0
        }));
        
        return playerId;
    }
}

