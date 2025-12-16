/**
 * Configuración de Modelos de Armas
 * 
 * Define la ruta del modelo GLB, punto de attachment, offsets, rotación y escala
 * para cada tipo de arma disponible.
 * 
 * El personaje debe tener esqueleto (skeleton) para que el sistema de attachment funcione.
 * Bones disponibles para attachment:
 * - RightHand - Bone de la mano derecha (para armas principales)
 * - LeftHand - Bone de la mano izquierda (para escudos o armas secundarias)
 * 
 * IMPORTANTE - Origen del Modelo:
 * Los modelos de armas deben tener su origen (0,0,0) en el punto de agarre (empuñadura).
 * Esto se configura en Blender moviendo el origen del objeto al punto donde se agarra el arma.
 * 
 * Si el origen está correctamente configurado:
 * - offset: { x: 0, y: 0, z: 0 } (sin offset necesario)
 * - rotation: { x: 0, y: 0, z: 0 } (sin rotación adicional)
 * 
 * Si necesitas ajustes finos, puedes usar offset y rotation para micro-ajustes.
 */
export const WEAPON_MODELS = {
    sword: {
        path: 'weapons/sword.glb',
        attachmentPoint: 'RightHand',  // Bone de la mano derecha
        offset: { x: 0, y: 10, z: 0 },  // Sin offset - el origen del modelo está en la empuñadura
        rotation: { x: 0, y: -50, z: 0 },  // Sin rotación adicional
        scale: 50  // Escala normal - ajustar según el tamaño del modelo
    },
    axe: {
        path: 'weapons/axe.glb',
        attachmentPoint: 'RightHand',  // Bone de la mano derecha
        offset: { x: 0.05, y: 0, z: 0.1 },
        rotation: { x: 0, y: 0, z: 0 },  // Rotación en grados (se convierte a radianes)
        scale: 1.0
    },
    'two-handed-axe': {
        path: 'weapons/two-handed-axe.glb',
        attachmentPoint: 'RightHand',  // Para armas de dos manos, usar RightHand
        offset: { x: 0, y: 0, z: 0.1 },
        rotation: { x: 0, y: 0, z: 0 },  // Rotación en grados (se convierte a radianes)
        scale: 1.0
    },
    hammer: {
        path: 'weapons/hammer.glb',
        attachmentPoint: 'RightHand',  // Bone de la mano derecha
        offset: { x: 0.05, y: 0, z: 0.1 },
        rotation: { x: 0, y: 0, z: 0 },  // Rotación en grados (se convierte a radianes)
        scale: 1.0
    },
    'two-handed-hammer': {
        path: 'weapons/two-handed-hammer.glb',
        attachmentPoint: 'RightHand',  // Para armas de dos manos, usar RightHand
        offset: { x: 0, y: 0, z: 0.1 },
        rotation: { x: 0, y: 0, z: 0 },  // Rotación en grados (se convierte a radianes)
        scale: 1.0
    },
    spear: {
        path: 'weapons/spear.glb',
        attachmentPoint: 'RightHand',  // Bone de la mano derecha
        offset: { x: 0.05, y: 0, z: 0.1 },
        rotation: { x: 0, y: 0, z: 0 },  // Rotación en grados (se convierte a radianes)
        scale: 1.0
    }
};
