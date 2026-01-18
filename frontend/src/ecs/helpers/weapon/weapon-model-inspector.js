/**
 * Helper para Inspección de Modelos de Armas
 * 
 * Analiza la estructura completa de modelos de armas GLB, incluyendo jerarquía,
 * transformaciones, meshes y grupos.
 */
import * as THREE from 'three';

export class WeaponModelInspector {
    /**
     * Inspeccionar estructura completa de un modelo de arma
     * @param {THREE.Object3D} model - Modelo a inspeccionar
     * @param {string} modelUrl - URL del modelo (para contexto)
     * @param {Object|null} objectPool - Object Pool opcional (optimización JDG-047)
     * @returns {Object} Estructura detallada del modelo
     */
    inspectWeaponModel(model, modelUrl, objectPool = null) {
        const structure = {
            url: modelUrl,
            root: {
                name: model.name || 'unnamed',
                type: model.type,
                uuid: model.uuid,
                position: {
                    x: model.position.x,
                    y: model.position.y,
                    z: model.position.z
                },
                rotation: {
                    x: model.rotation.x,
                    y: model.rotation.y,
                    z: model.rotation.z
                },
                scale: {
                    x: model.scale.x,
                    y: model.scale.y,
                    z: model.scale.z
                },
                visible: model.visible,
                childrenCount: model.children.length
            },
            hierarchy: [], // Jerarquía completa del árbol
            meshes: [],
            groups: [],
            other: [],
            analysis: {
                hasIntermediateGroups: false,
                meshPathToRoot: [],
                totalTransformations: []
            }
        };
        
        // Función recursiva para construir la jerarquía
        const buildHierarchy = (object, parent = null, depth = 0, path = []) => {
            const currentPath = [...path, object.name || object.type || 'unnamed'];
            
            // Obtener objetos del pool o crear nuevos si el pool no está disponible (optimización JDG-047)
            const worldPos = objectPool?.vector3?.acquire() || new THREE.Vector3();
            const worldQuat = objectPool?.quaternion?.acquire() || new THREE.Quaternion();
            const worldRot = objectPool?.euler?.acquire() || new THREE.Euler();
            const worldScale = objectPool?.vector3?.acquire() || new THREE.Vector3();
            
            try {
                // Calcular posición mundial acumulada
                object.getWorldPosition(worldPos);
                object.getWorldQuaternion(worldQuat);
                worldRot.setFromQuaternion(worldQuat); // Convertir quaternion a euler
                object.getWorldScale(worldScale);
            
                const objInfo = {
                    depth: depth,
                    path: currentPath,
                    name: object.name || 'unnamed',
                    type: object.type,
                    uuid: object.uuid,
                    localTransform: {
                        position: {
                            x: object.position.x,
                            y: object.position.y,
                            z: object.position.z
                        },
                        rotation: {
                            x: object.rotation.x,
                            y: object.rotation.y,
                            z: object.rotation.z
                        },
                        scale: {
                            x: object.scale.x,
                            y: object.scale.y,
                            z: object.scale.z
                        }
                    },
                    worldTransform: {
                        position: {
                            x: worldPos.x,
                            y: worldPos.y,
                            z: worldPos.z
                        },
                        rotation: {
                            x: worldRot.x,
                            y: worldRot.y,
                            z: worldRot.z
                        },
                        scale: {
                            x: worldScale.x,
                            y: worldScale.y,
                            z: worldScale.z
                        }
                    },
                    visible: object.visible,
                    parent: parent?.name || parent?.type || 'root',
                    childrenCount: object.children.length,
                    hasTransform: !(
                        object.position.x === 0 && object.position.y === 0 && object.position.z === 0 &&
                        object.rotation.x === 0 && object.rotation.y === 0 && object.rotation.z === 0 &&
                        object.scale.x === 1 && object.scale.y === 1 && object.scale.z === 1
                    )
                };
                
                if (object.isMesh) {
                    objInfo.material = {
                        type: object.material?.constructor?.name || 'none',
                        name: object.material?.name || 'unnamed',
                        color: object.material?.color?.getHexString() || 'none',
                        metalness: object.material?.metalness,
                        roughness: object.material?.roughness,
                        transparent: object.material?.transparent,
                        opacity: object.material?.opacity
                    };
                    
                    objInfo.geometry = {
                        type: object.geometry?.constructor?.name || 'none',
                        vertices: object.geometry?.attributes?.position?.count || 0,
                        faces: object.geometry?.attributes?.position?.count ? 
                            Math.floor(object.geometry.attributes.position.count / 3) : 0
                    };
                    
                    structure.meshes.push(objInfo);
                    structure.analysis.meshPathToRoot.push({
                        meshName: object.name || 'unnamed',
                        path: currentPath,
                        depth: depth,
                        localPosition: objInfo.localTransform.position,
                        worldPosition: objInfo.worldTransform.position,
                        distanceFromOrigin: Math.sqrt(
                            Math.pow(objInfo.localTransform.position.x, 2) + 
                            Math.pow(objInfo.localTransform.position.y, 2) + 
                            Math.pow(objInfo.localTransform.position.z, 2)
                        )
                    });
                } else if (object.isGroup) {
                    // Verificar si es un Group intermedio (no es el root)
                    if (depth > 0) {
                        structure.analysis.hasIntermediateGroups = true;
                    }
                    
                    // Si el Group tiene transformación, puede afectar el origen
                    if (objInfo.hasTransform) {
                        structure.analysis.totalTransformations.push({
                            type: 'Group',
                            name: object.name || 'unnamed',
                            path: currentPath,
                            transform: objInfo.localTransform,
                            note: 'Este Group tiene transformación que puede afectar la posición del mesh'
                        });
                    }
                    
                    structure.groups.push(objInfo);
                } else {
                    structure.other.push(objInfo);
                }
                
                structure.hierarchy.push(objInfo);
                
                // Recursión para hijos
                object.children.forEach(child => {
                    buildHierarchy(child, object, depth + 1, currentPath);
                });
            } finally {
                // SIEMPRE devolver objetos al pool después de usarlos (optimización JDG-047)
                // Esto garantiza que los objetos se liberen incluso si hay errores
                if (objectPool) {
                    objectPool.vector3?.release(worldPos);
                    objectPool.quaternion?.release(worldQuat);
                    objectPool.euler?.release(worldRot);
                    objectPool.vector3?.release(worldScale);
                }
            }
        };
        
        // Construir jerarquía completa
        buildHierarchy(model);
        
        // Análisis final
        structure.analysis.summary = {
            totalObjects: structure.hierarchy.length,
            totalMeshes: structure.meshes.length,
            totalGroups: structure.groups.length,
            maxDepth: Math.max(...structure.hierarchy.map(o => o.depth)),
            hasIntermediateGroups: structure.analysis.hasIntermediateGroups,
            meshesWithTransform: structure.meshes.filter(m => m.hasTransform).length,
            groupsWithTransform: structure.groups.filter(g => g.hasTransform).length,
            warning: structure.analysis.hasIntermediateGroups ? 
                '⚠️ El modelo tiene Groups intermedios que pueden afectar el origen. Verifica las transformaciones.' :
                '✅ El modelo tiene estructura simple (solo root + mesh)'
        };
        
        return structure;
    }
}
