/**
 * Utilidades para trabajar con bones (huesos) del esqueleto en modelos 3D
 * 
 * Los bones permiten identificar y manipular partes específicas del cuerpo
 * de forma más precisa que los vertex groups, especialmente para animaciones
 * y el sistema de daño por partes.
 */

/**
 * Obtener el esqueleto (skeleton) de un modelo cargado
 * @param {THREE.Group|THREE.Object3D} model - Modelo Three.js cargado
 * @returns {THREE.Skeleton|null} Esqueleto del modelo o null si no tiene
 */
export function getSkeleton(model) {
    let skeleton = null;
    
    model.traverse((child) => {
        if (child.isSkinnedMesh && child.skeleton) {
            skeleton = child.skeleton;
        }
    });
    
    return skeleton;
}

/**
 * Listar todos los bones del esqueleto
 * @param {THREE.Group|THREE.Object3D} model - Modelo Three.js cargado
 * @returns {Array<{name: string, bone: THREE.Bone, index: number}>} Lista de bones con su información
 */
export function listBones(model) {
    const skeleton = getSkeleton(model);
    if (!skeleton) {
        return [];
    }
    
    const bones = [];
    skeleton.bones.forEach((bone, index) => {
        bones.push({
            name: bone.name,
            bone: bone,
            index: index
        });
    });
    
    return bones;
}

/**
 * Buscar un bone por nombre (búsqueda parcial o exacta)
 * @param {THREE.Group|THREE.Object3D} model - Modelo Three.js cargado
 * @param {string} boneName - Nombre del bone a buscar (case-insensitive, puede ser parcial)
 * @returns {THREE.Bone|null} Bone encontrado o null
 */
export function findBone(model, boneName) {
    const skeleton = getSkeleton(model);
    if (!skeleton) {
        return null;
    }
    
    const searchName = boneName.toLowerCase();
    
    for (const bone of skeleton.bones) {
        if (bone.name.toLowerCase() === searchName || 
            bone.name.toLowerCase().includes(searchName)) {
            return bone;
        }
    }
    
    return null;
}

/**
 * Mapear bones comunes a partes del cuerpo para el sistema de daño
 * @param {THREE.Group|THREE.Object3D} model - Modelo Three.js cargado
 * @returns {Object} Mapa de partes del cuerpo a bones
 * 
 * Estructura esperada:
 * {
 *   "head": { bone: THREE.Bone, critical: true },
 *   "torso": { bone: THREE.Bone, critical: true },
 *   "left_arm": { bone: THREE.Bone, critical: false },
 *   "right_arm": { bone: THREE.Bone, critical: false },
 *   "left_leg": { bone: THREE.Bone, critical: false },
 *   "right_leg": { bone: THREE.Bone, critical: false }
 * }
 */
export function mapBonesToBodyParts(model) {
    const skeleton = getSkeleton(model);
    if (!skeleton) {
        return {};
    }
    
    const mapping = {};
    
    // Patrones comunes de nombres de bones según diferentes estándares de rigging
    const bonePatterns = {
        head: ['head', 'head_end', 'headfront', 'neck'],
        torso: ['spine', 'spine1', 'spine2', 'chest', 'hips', 'pelvis'],
        left_arm: ['leftarm', 'left_arm', 'leftshoulder', 'leftshoulderblade'],
        right_arm: ['rightarm', 'right_arm', 'rightshoulder', 'rightshoulderblade'],
        left_leg: ['leftleg', 'left_leg', 'leftupleg', 'leftthigh'],
        right_leg: ['rightleg', 'right_leg', 'rightupleg', 'rightthigh']
    };
    
    // Buscar bones para cada parte del cuerpo
    for (const [partName, patterns] of Object.entries(bonePatterns)) {
        for (const pattern of patterns) {
            const bone = findBone(model, pattern);
            if (bone) {
                mapping[partName] = {
                    bone: bone,
                    critical: partName === 'head' || partName === 'torso',
                    boneName: bone.name
                };
                break; // Usar el primer bone encontrado
            }
        }
    }
    
    return mapping;
}

/**
 * Verificar si un modelo tiene esqueleto (skeleton)
 * @param {THREE.Group|THREE.Object3D} model - Modelo Three.js cargado
 * @returns {boolean} True si tiene esqueleto, False si no
 */
export function hasSkeleton(model) {
    return getSkeleton(model) !== null;
}

/**
 * Obtener el bone raíz del esqueleto (usualmente "Hips" o "Root")
 * @param {THREE.Group|THREE.Object3D} model - Modelo Three.js cargado
 * @returns {THREE.Bone|null} Bone raíz o null
 */
export function getRootBone(model) {
    const skeleton = getSkeleton(model);
    if (!skeleton || skeleton.bones.length === 0) {
        return null;
    }
    
    // El bone raíz suele ser el primero o el que no tiene padre
    for (const bone of skeleton.bones) {
        if (!bone.parent || bone.parent === skeleton.bones[0]) {
            return bone;
        }
    }
    
    return skeleton.bones[0];
}

/**
 * Obtener todos los bones hijos de un bone específico (útil para cortar partes)
 * @param {THREE.Bone} parentBone - Bone padre
 * @returns {Array<THREE.Bone>} Lista de bones hijos
 */
export function getChildBones(parentBone) {
    const children = [];
    
    function traverse(bone) {
        for (const child of bone.children) {
            if (child.isBone) {
                children.push(child);
                traverse(child);
            }
        }
    }
    
    traverse(parentBone);
    return children;
}

/**
 * Desactivar/ocultar una parte del cuerpo desactivando su bone y sus hijos
 * @param {THREE.Bone} bone - Bone a desactivar
 * @param {boolean} visible - True para mostrar, False para ocultar
 */
export function setBoneVisibility(bone, visible) {
    if (!bone) return;
    
    // Desactivar el bone (afecta a todos los meshes que lo usan)
    bone.visible = visible;
    
    // También desactivar hijos recursivamente
    getChildBones(bone).forEach(child => {
        child.visible = visible;
    });
}

/**
 * Listar bones en formato legible para debugging
 * @param {THREE.Group|THREE.Object3D} model - Modelo Three.js cargado
 * @returns {string} String con lista formateada de bones
 */
export function listBonesFormatted(model) {
    const bones = listBones(model);
    if (bones.length === 0) {
        return "⚠ No se encontraron bones en el modelo";
    }
    
    let output = `✓ Modelo tiene ${bones.length} bone(s):\n`;
    bones.forEach(({ name, index }) => {
        output += `  [${index}] ${name}\n`;
    });
    
    return output;
}
