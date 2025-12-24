/**
 * Factory para crear entidades de jugador
 * 
 * Crea una entidad de jugador completa con todos los componentes necesarios.
 */
import * as THREE from 'three';
import { PositionComponent, PhysicsComponent, RenderComponent, InputComponent, AnimationComponent, ComboComponent, CombatComponent, WeaponComponent } from '../components/index.js';
import { GeometryRegistry } from '../../core/geometries/registry.js';
import { getCharacter, createCharacter } from '../../api/endpoints/characters.js';
import { loadModel3D } from '../models/model-utils.js';
import { listBones, mapBonesToBodyParts, hasSkeleton, listBonesFormatted } from '../models/bones-utils.js';
import { ECS_CONSTANTS } from '../../config/ecs-constants.js';
import { ANIMATION_CONSTANTS } from '../../config/animation-constants.js';
import { COMBAT_CONSTANTS } from '../../config/combat-constants.js';
import { debugLogger } from '../../debug/logger.js';

/**
 * Construir mesh Three.js desde geometria_agrupacion
 * @param {Object} geometria_agrupacion - Geometría de agrupación desde BD
 * @param {number} cellSize - Tamaño de celda en metros
 * @returns {THREE.Group} Grupo con todas las partes del personaje
 */
function buildMeshFromGeometry(geometria_agrupacion, cellSize) {
    const group = new THREE.Group();
    const geometryRegistry = new GeometryRegistry();
    
    if (!geometria_agrupacion || !geometria_agrupacion.partes) {
        // Fallback a mesh simple si no hay geometría
        return createDefaultMesh(cellSize);
    }
    
    // Los offsets están en coordenadas absolutas desde el suelo (z=0)
    // Pero el RenderSystem posiciona el grupo en Y = position.z * cellSize
    // Necesitamos que los offsets sean relativos a la posición base del personaje
    // Encontrar el offset mínimo (suelo) para usarlo como referencia
    let minOffsetY = Infinity;
    for (const parteDef of Object.values(geometria_agrupacion.partes)) {
        if (parteDef.offset && parteDef.offset.z !== undefined) {
            minOffsetY = Math.min(minOffsetY, parteDef.offset.z);
        }
    }
    // Si no encontramos offsets, usar 0
    const baseOffsetY = minOffsetY !== Infinity ? minOffsetY : 0;
    
    // Iterar sobre cada parte
    for (const [parteNombre, parteDef] of Object.entries(geometria_agrupacion.partes)) {
        const { geometria, offset, rotacion } = parteDef;
        
        if (!geometria || !geometria.tipo) {
            continue; // Saltar partes sin geometría válida
        }
        
        // Crear geometría Three.js
        let geometry;
        try {
            geometry = geometryRegistry.create(
                geometria.tipo,
                geometria.parametros || {},
                cellSize
            );
        } catch (error) {
            // console.warn(`Error creando geometría ${geometria.tipo} para parte ${parteNombre}:`, error);
            continue; // Saltar esta parte si hay error
        }
        
        // Crear material (temporal, puede mejorarse con estilos de BD)
        const material = new THREE.MeshStandardMaterial({
            color: ANIMATION_CONSTANTS.DEFAULT_MESH.BODY.COLOR,
            metalness: ANIMATION_CONSTANTS.DEFAULT_MESH.MATERIAL.METALNESS,
            roughness: ANIMATION_CONSTANTS.DEFAULT_MESH.MATERIAL.ROUGHNESS
        });
        
        // Crear mesh
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Aplicar offset relativo a la posición base (suelo del personaje)
        // Mapear ejes: juego (x,y,z) -> Three.js (x,z,y)
        // Juego: X=izq/der, Y=adelante/atrás, Z=arriba/abajo
        // Three.js: X=izq/der, Y=arriba/abajo, Z=adelante/atrás
        if (offset) {
            // Convertir offsets absolutos a relativos desde la base
            const posX = offset.x || 0;
            const posY = (offset.z || 0) - baseOffsetY; // Z del juego -> Y de Three.js (altura relativa)
            const posZ = offset.y || 0; // Y del juego -> Z de Three.js (profundidad)
            
            mesh.position.set(posX, posY, posZ);
        }
        
        // Aplicar rotación (convertir grados a radianes)
        // Mapear rotaciones igual que posiciones
        if (rotacion) {
            mesh.rotation.set(
                ((rotacion.x || 0) * Math.PI) / 180,  // X igual
                ((rotacion.z || 0) * Math.PI) / 180, // Z del juego -> Y de Three.js
                ((rotacion.y || 0) * Math.PI) / 180  // Y del juego -> Z de Three.js
            );
        }
        
        group.add(mesh);
    }
    
    return group;
}

/**
 * Crear mesh por defecto (fallback)
 * @param {number} cellSize - Tamaño de celda en metros
 * @returns {THREE.Group} Grupo con mesh por defecto
 */
function createDefaultMesh(cellSize) {
    const group = new THREE.Group();
    
    // Cuerpo (cilindro)
    const bodyGeometry = new THREE.CylinderGeometry(
        ANIMATION_CONSTANTS.DEFAULT_MESH.BODY.RADIUS,
        ANIMATION_CONSTANTS.DEFAULT_MESH.BODY.RADIUS,
        ANIMATION_CONSTANTS.DEFAULT_MESH.BODY.HEIGHT,
        ANIMATION_CONSTANTS.DEFAULT_MESH.BODY.SEGMENTS
    );
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: ANIMATION_CONSTANTS.DEFAULT_MESH.BODY.COLOR,
        metalness: ANIMATION_CONSTANTS.DEFAULT_MESH.MATERIAL.METALNESS,
        roughness: ANIMATION_CONSTANTS.DEFAULT_MESH.MATERIAL.ROUGHNESS
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = ANIMATION_CONSTANTS.DEFAULT_MESH.BODY.POSITION_Y;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    
    // Cabeza (esfera)
    const headGeometry = new THREE.SphereGeometry(
        ANIMATION_CONSTANTS.DEFAULT_MESH.HEAD.RADIUS,
        ANIMATION_CONSTANTS.DEFAULT_MESH.HEAD.SEGMENTS,
        ANIMATION_CONSTANTS.DEFAULT_MESH.HEAD.SEGMENTS
    );
    const headMaterial = new THREE.MeshStandardMaterial({
        color: ANIMATION_CONSTANTS.DEFAULT_MESH.HEAD.COLOR,
        metalness: ANIMATION_CONSTANTS.DEFAULT_MESH.MATERIAL.METALNESS,
        roughness: ANIMATION_CONSTANTS.DEFAULT_MESH.MATERIAL.ROUGHNESS
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = ANIMATION_CONSTANTS.DEFAULT_MESH.HEAD.POSITION_Y;
    head.castShadow = true;
    head.receiveShadow = true;
    group.add(head);
    
    // Escalar según tamaño de celda
    group.scale.set(cellSize, cellSize, cellSize);
    return group;
}

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
     * @param {string} [options.characterId] - ID del personaje existente en BD
     * @param {string} [options.templateId] - ID del template para crear personaje (ej: 'humano')
     * @param {string} [options.bloqueId] - ID del bloque (necesario si se usa characterId o templateId)
     * @param {string} [options.initialWeapon] - Tipo de arma inicial (ej: 'sword', 'axe', etc.) o null para usar valor por defecto
     * @returns {Promise<number>} ID de la entidad creada
     */
    static async createPlayer(options) {
        const { 
            ecs, 
            scene, 
            x = ANIMATION_CONSTANTS.DEFAULT_SPAWN.X, 
            y = ANIMATION_CONSTANTS.DEFAULT_SPAWN.Y, 
            z = ANIMATION_CONSTANTS.DEFAULT_SPAWN.Z, 
            cellSize = ANIMATION_CONSTANTS.DEFAULT_SPAWN.CELL_SIZE,
            characterId = null,
            templateId = null,
            bloqueId = null,
            initialWeapon = null
        } = options;
        
        // Crear entidad
        const playerId = ecs.createEntity();
        
        let character = null;
        let mesh = null;
        
        try {
            // Si hay characterId, cargar desde API
            if (characterId && bloqueId) {
                character = await getCharacter(bloqueId, characterId);
            }
            // Si hay templateId, crear personaje primero
            else if (templateId && bloqueId) {
                character = await createCharacter(bloqueId, templateId, x, y, z);
            }
            
            // Prioridad: modelo_3d > geometria_agrupacion > default
            // IMPORTANTE: Si hay modelo_3d, NO renderizar geometria_agrupacion (evitar doble renderizado)
            if (character?.modelo_3d) {
                try {
                    mesh = await loadModel3D(character.modelo_3d, cellSize);
                    
                    // Verificar bones (esqueleto) para sistema de daño por partes (JDG-014)
                    if (mesh && hasSkeleton(mesh)) {
                        // Loguear bones disponibles para debugging
                        const bonesList = listBones(mesh);
                        const bonesFormatted = listBonesFormatted(mesh);
                        
                        debugLogger.info('PlayerFactory', 'Bones disponibles en el personaje:', {
                            totalBones: bonesList.length,
                            bones: bonesList.map(b => ({ name: b.name, index: b.index })),
                            formatted: bonesFormatted
                        });
                        
                        const bodyPartsMap = mapBonesToBodyParts(mesh);
                        if (Object.keys(bodyPartsMap).length > 0) {
                            // Guardar mapeo en userData para sistema de daño
                            mesh.userData.bodyPartsMap = bodyPartsMap;
                            
                            debugLogger.debug('PlayerFactory', 'Mapeo de bones a partes del cuerpo:', {
                                bodyParts: Object.keys(bodyPartsMap).map(part => ({
                                    part,
                                    boneName: bodyPartsMap[part].boneName,
                                    critical: bodyPartsMap[part].critical
                                }))
                            });
                        }
                    } else {
                        debugLogger.warn('PlayerFactory', 'El personaje no tiene esqueleto (skeleton)');
                    }
                } catch (error) {
                    // Fallback a geometria_agrupacion
                    if (character?.geometria_agrupacion) {
                        mesh = buildMeshFromGeometry(character.geometria_agrupacion, cellSize);
                    } else {
                        mesh = createDefaultMesh(cellSize);
                    }
                }
            } else if (character?.geometria_agrupacion) {
                mesh = buildMeshFromGeometry(character.geometria_agrupacion, cellSize);
            } else {
                mesh = createDefaultMesh(cellSize);
            }
        } catch (error) {
            mesh = createDefaultMesh(cellSize);
        }
        
        // Agregar a la escena
        if (mesh) {
            scene.add(mesh);
        }
        
        // Usar posición del personaje si está disponible
        const finalX = character?.posicion?.x ?? x;
        const finalY = character?.posicion?.y ?? y;
        const finalZ = character?.posicion?.z ?? z;
        
        // Agregar componentes
        ecs.addComponent(playerId, ECS_CONSTANTS.COMPONENT_NAMES.POSITION, new PositionComponent(finalX, finalY, finalZ));
        
        ecs.addComponent(playerId, ECS_CONSTANTS.COMPONENT_NAMES.PHYSICS, new PhysicsComponent({
            velocity: {
                x: ANIMATION_CONSTANTS.COLLISION.POSITION_CORRECTION.VELOCITY_RESET,
                y: ANIMATION_CONSTANTS.COLLISION.POSITION_CORRECTION.VELOCITY_RESET,
                z: ANIMATION_CONSTANTS.COLLISION.POSITION_CORRECTION.VELOCITY_RESET
            },
            mass: ANIMATION_CONSTANTS.PLAYER_PHYSICS.MASS,
            useGravity: true,
            isGrounded: false,
            groundFriction: ANIMATION_CONSTANTS.PLAYER_PHYSICS.GROUND_FRICTION,
            airFriction: ANIMATION_CONSTANTS.PLAYER_PHYSICS.AIR_FRICTION,
            maxVelocity: ANIMATION_CONSTANTS.PLAYER_PHYSICS.MAX_VELOCITY
        }));
        
        // IMPORTANTE: Crear RenderComponent y luego asignar el mesh
        // Esto asegura que la escala original del mesh se preserve
        const renderComponent = new RenderComponent({
            visible: true,
            castShadow: true,
            receiveShadow: true
        });
        renderComponent.setMesh(mesh); // Esto guardará la escala original del mesh
        ecs.addComponent(playerId, ECS_CONSTANTS.COMPONENT_NAMES.RENDER, renderComponent);
        
        ecs.addComponent(playerId, ECS_CONSTANTS.COMPONENT_NAMES.INPUT, new InputComponent());
        
        ecs.addComponent(playerId, ECS_CONSTANTS.COMPONENT_NAMES.ANIMATION, new AnimationComponent({
            currentState: ANIMATION_CONSTANTS.STATE_IDS.IDLE,
            animationSpeed: ANIMATION_CONSTANTS.PLAYER_PHYSICS.ANIMATION_SPEED
        }));
        
        // Agregar componentes de combate
        ecs.addComponent(playerId, ECS_CONSTANTS.COMPONENT_NAMES.COMBO, new ComboComponent());
        ecs.addComponent(playerId, ECS_CONSTANTS.COMPONENT_NAMES.COMBAT, new CombatComponent());
        
        // Agregar arma inicial o por defecto (espada) para que las acciones de combate funcionen
        // El WeaponEquipSystem se encargará de cargar y visualizar el arma automáticamente
        const weaponType = initialWeapon || COMBAT_CONSTANTS.WEAPON_TYPES.SWORD;
        ecs.addComponent(playerId, ECS_CONSTANTS.COMPONENT_NAMES.WEAPON, new WeaponComponent({
            weaponType: weaponType,
            hasShield: false
        }));
        
        return playerId;
    }
}

