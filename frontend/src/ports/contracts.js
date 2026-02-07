/**
 * Contracts (JSDoc typedefs) para los "ports" del frontend.
 * Estos typedefs documentan la forma (métodos y retornos) que deben
 * cumplir las implementaciones (adapters) inyectadas en la aplicación.
 *
 * Nota: Son tipos de documentación (JSDoc) — no exportan lógica en runtime.
 */

/**
 * @typedef {Object} ParticlesPort
 * @property {function(string, Object): Promise<{particles: Array<Object>}>} getParticles
 *   - getParticles(dimensionId, viewport) => Promise con { particles: [...] }
 * @property {function(string, Object): Promise<{types: Array<Object>}>} getParticleTypes
 *   - getParticleTypes(dimensionId, viewport) => Promise con { types: [...] }
 */

/**
 * @typedef {Object} BloquesPort
 * @property {function(): Promise<Array<Object>>} getDimensions
 *   - Devuelve lista de dimensiones/metadatos
 * @property {function(string): Promise<Object>} getDimension
 *   - getDimension(dimensionId) => Promise con datos de la dimensión
 */

/**
 * @typedef {Object} CharactersPort
 * @property {function(string, string): Promise<Object>} getCharacter
 *   - getCharacter(bloqueId, characterId)
 * @property {function(string): Promise<Array<Object>>} listCharacters
 *   - listCharacters(bloqueId)
 * @property {function(Object): Promise<Object>} createCharacter
 *   - createCharacter(payload)
 * @property {function(string, string): Promise<Object>} getCharacterModel
 *   - getCharacterModel(bloqueId, characterId)
 */

/**
 * @typedef {Object} CelestialPort
 * @property {function(): Promise<Object>} getState
 * @property {function(Object): Promise<number>} calculateTemperature
 */

/**
 * @typedef {Object} AgrupacionesPort
 * @property {function(string): Promise<Array<Object>>} getAgrupaciones
 * @property {function(string, string): Promise<Object>} getAgrupacion
 */

// Archivo de solo documentación (JSDoc). No hay exports de runtime.

