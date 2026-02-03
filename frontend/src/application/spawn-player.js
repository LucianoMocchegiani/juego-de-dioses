/**
 * Caso de uso: spawnear jugador
 * Obtiene datos del personaje (ports.charactersApi), pasa el port a PlayerFactory y devuelve entityId.
 */
import { selectors } from '../state/selectors.js';
import { PlayerFactory } from '../rendering/ecs/factories/player-factory.js';

const DEFAULT_START_X = 45;
const DEFAULT_START_Y = 45;
const DEFAULT_START_Z = 1;

/**
 * Spawnear jugador en el ECS
 * @param {Object} ports - Puertos inyectados (charactersApi)
 * @param {Object} store - Store de estado
 * @param {Object} ecs - ECSManager
 * @param {THREE.Scene} scene - Escena Three.js (scene.scene si se pasa Scene3D)
 * @param {Object} [options] - Opciones (x, y, z, etc.)
 * @returns {Promise<number>} ID de la entidad del jugador
 */
export async function spawnPlayer(ports, store, ecs, scene, options = {}) {
    const dimension = selectors.getCurrentDimension(store.getState());
    if (!dimension) {
        throw new Error('spawnPlayer: no hay dimensión en el store. Ejecutar loadWorld antes.');
    }

    const threeScene = scene?.scene ?? scene;
    if (!threeScene) {
        throw new Error('spawnPlayer: se requiere escena Three.js');
    }

    let characterId = null;
    try {
        const characters = await ports.charactersApi.listCharacters(dimension.id);
        if (characters && characters.length > 0) {
            characterId = characters[0].id;
        }
    } catch (_) {
        // Sin personajes existentes; se creará uno nuevo
    }

    const x = options.x ?? DEFAULT_START_X;
    const y = options.y ?? DEFAULT_START_Y;
    const z = options.z ?? DEFAULT_START_Z;

    const playerId = await PlayerFactory.createPlayer({
        ecs,
        scene: threeScene,
        x,
        y,
        z,
        cellSize: dimension.tamano_celda,
        characterId: characterId || null,
        templateId: characterId ? null : 'humano',
        bloqueId: dimension.id,
        charactersApi: ports.charactersApi
    });

    return playerId;
}
