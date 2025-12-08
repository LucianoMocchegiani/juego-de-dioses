/**
 * Utilidades para trabajar con vertex groups en modelos 3D
 * 
 * Los vertex groups permiten identificar y manipular partes específicas
 * de un modelo (ej: cabeza, brazos, piernas) para el sistema de daño por partes.
 */

/**
 * Verificar vertex groups en un modelo cargado
 * @param {THREE.Group|THREE.Object3D} model - Modelo Three.js cargado
 * @returns {Object} Mapa de vertex groups encontrados con sus meshes asociados
 */
export function getVertexGroups(model) {
    const groups = {};
    
    model.traverse((child) => {
        if (child.isMesh && child.geometry) {
            // Los vertex groups pueden estar en diferentes lugares según cómo se exportó:
            // 1. child.userData (si Blender los exportó como userData)
            // 2. child.geometry.groups (grupos de geometría de Three.js)
            // 3. child.name (si los meshes tienen nombres que coinciden con los grupos)
            
            // Verificar userData
            if (child.userData && child.userData.vertexGroups) {
                Object.assign(groups, child.userData.vertexGroups);
            }
            
            // Verificar grupos de geometría
            if (child.geometry.groups && child.geometry.groups.length > 0) {
                child.geometry.groups.forEach((group, index) => {
                    // Los grupos pueden tener nombres si se exportaron correctamente
                    if (group.name) {
                        groups[group.name] = {
                            mesh: child,
                            groupIndex: index,
                            start: group.start,
                            count: group.count
                        };
                    }
                });
            }
            
            // Verificar nombre del mesh (si coincide con vertex groups)
            const vertexGroupNames = ['head', 'torso', 'left_arm', 'right_arm', 'left_leg', 'right_leg'];
            if (child.name && vertexGroupNames.includes(child.name.toLowerCase())) {
                groups[child.name.toLowerCase()] = {
                    mesh: child,
                    source: 'mesh_name'
                };
            }
        }
    });
    
    return groups;
}

/**
 * Verificar si un modelo tiene vertex groups disponibles
 * @param {THREE.Group|THREE.Object3D} model - Modelo Three.js cargado
 * @returns {boolean} True si tiene vertex groups, False si no
 */
export function hasVertexGroups(model) {
    const groups = getVertexGroups(model);
    return Object.keys(groups).length > 0;
}

/**
 * Obtener mesh de una parte específica del cuerpo
 * @param {THREE.Group|THREE.Object3D} model - Modelo Three.js cargado
 * @param {string} partName - Nombre de la parte (head, torso, left_arm, etc.)
 * @returns {THREE.Mesh|null} Mesh de la parte o null si no se encuentra
 */
export function getPartMesh(model, partName) {
    const groups = getVertexGroups(model);
    const part = groups[partName.toLowerCase()];
    
    if (part && part.mesh) {
        return part.mesh;
    }
    
    // Fallback: buscar por nombre del mesh
    let foundMesh = null;
    model.traverse((child) => {
        if (child.isMesh && child.name && child.name.toLowerCase() === partName.toLowerCase()) {
            foundMesh = child;
        }
    });
    
    return foundMesh;
}

/**
 * Listar todos los vertex groups disponibles en el modelo
 * @param {THREE.Group|THREE.Object3D} model - Modelo Three.js cargado
 * @returns {Array<string>} Lista de nombres de vertex groups encontrados
 */
export function listVertexGroups(model) {
    const groups = getVertexGroups(model);
    return Object.keys(groups);
}

