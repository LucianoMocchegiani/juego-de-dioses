/**
 * Factory para crear entidades de jugador
 * 
 * Crea una entidad de jugador completa con todos los componentes necesarios.
 */
import * as THREE from 'three';
import { PositionComponent, PhysicsComponent, RenderComponent, InputComponent, AnimationComponent, ComboComponent, CombatComponent, WeaponComponent } from '../components/index.js';
import { GeometryRegistry } from '../../renderers/geometries/registry.js';
import { getCharacter, createCharacter } from '../../api/endpoints/characters.js';
import { loadModel3D } from '../../renderers/models/model-utils.js';
import { listBones, mapBonesToBodyParts, hasSkeleton } from '../../renderers/models/bones-utils.js';

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
            color: 0x8B4513, // Color temporal
            metalness: 0.1,
            roughness: 0.8
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
     * @param {string} [options.dimensionId] - ID de la dimensión (necesario si se usa characterId o templateId)
     * @returns {Promise<number>} ID de la entidad creada
     */
    static async createPlayer(options) {
        const { 
            ecs, 
            scene, 
            x = 80, 
            y = 80, 
            z = 1, 
            cellSize = 0.25,
            characterId = null,
            templateId = null,
            dimensionId = null
        } = options;
        
        // Crear entidad
        const playerId = ecs.createEntity();
        
        let character = null;
        let mesh = null;
        
        try {
            // Si hay characterId, cargar desde API
            if (characterId && dimensionId) {
                character = await getCharacter(dimensionId, characterId);
            }
            // Si hay templateId, crear personaje primero
            else if (templateId && dimensionId) {
                character = await createCharacter(dimensionId, templateId, x, y, z);
            }
            
            // Prioridad: modelo_3d > geometria_agrupacion > default
            // IMPORTANTE: Si hay modelo_3d, NO renderizar geometria_agrupacion (evitar doble renderizado)
            if (character?.modelo_3d) {
                try {
                    mesh = await loadModel3D(character.modelo_3d, cellSize);
                    
                    // Verificar bones (esqueleto) para sistema de daño por partes (JDG-014)
                    if (mesh && hasSkeleton(mesh)) {
                        const bodyPartsMap = mapBonesToBodyParts(mesh);
                        if (Object.keys(bodyPartsMap).length > 0) {
                            // Guardar mapeo en userData para sistema de daño
                            mesh.userData.bodyPartsMap = bodyPartsMap;
                        }
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
        ecs.addComponent(playerId, 'Position', new PositionComponent(finalX, finalY, finalZ));
        
        ecs.addComponent(playerId, 'Physics', new PhysicsComponent({
            velocity: { x: 0, y: 0, z: 0 },
            mass: 70,
            useGravity: true,
            isGrounded: false,
            groundFriction: 0.8,
            airFriction: 0.95,
            maxVelocity: { x: 5, y: 10, z: 5 } // Velocidad máxima en celdas/segundo
        }));
        
        // IMPORTANTE: Crear RenderComponent y luego asignar el mesh
        // Esto asegura que la escala original del mesh se preserve
        const renderComponent = new RenderComponent({
            visible: true,
            castShadow: true,
            receiveShadow: true
        });
        renderComponent.setMesh(mesh); // Esto guardará la escala original del mesh
        ecs.addComponent(playerId, 'Render', renderComponent);
        
        ecs.addComponent(playerId, 'Input', new InputComponent());
        
        ecs.addComponent(playerId, 'Animation', new AnimationComponent({
            currentState: 'idle',
            animationSpeed: 1.0
        }));
        
        // Agregar componentes de combate
        ecs.addComponent(playerId, 'Combo', new ComboComponent());
        ecs.addComponent(playerId, 'Combat', new CombatComponent());
        
        // Agregar arma por defecto (espada) para que las acciones de combate funcionen
        ecs.addComponent(playerId, 'Weapon', new WeaponComponent({
            weaponType: 'sword',
            hasShield: false
        }));
        
        return playerId;
    }
}

