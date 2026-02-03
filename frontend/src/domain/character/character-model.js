/**
 * Modelo de dominio: Personaje (respuesta del backend para modelo/estado del personaje)
 * Lo que devuelve getCharacterModel y usa spawnPlayer + PlayerFactory.
 * Sin dependencias de Three.js, fetch ni DOM.
 */

/**
 * @typedef {Object} CharacterModel
 * @property {string} id - ID del personaje (agrupación)
 * @property {string} [bloque_id]
 * @property {string} [nombre]
 * @property {string} [tipo]
 * @property {string} [especie]
 * @property {Object} [posicion] - { x, y, z } en celdas
 * @property {string} [geometria_agrupacion]
 * @property {string} [modelo_3d] - URL o identificador del modelo
 * @property {string} [model_url]
 * @property {Object} [metadata]
 */

export const CharacterModel = {};
