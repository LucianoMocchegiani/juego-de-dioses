/**
 * Adapter HTTP: Characters API (port charactersApi)
 */

export class HttpCharactersApi {
    constructor(client) {
        this.client = client;
    }

    async getCharacter(bloqueId, characterId) {
        const endpoint = `/bloques/${bloqueId}/characters/${characterId}`;
        try {
            return await this.client.get(endpoint);
        } catch (error) {
            throw new Error(`Error al obtener personaje: ${error.message}`);
        }
    }

    async listCharacters(bloqueId) {
        const endpoint = `/bloques/${bloqueId}/characters`;
        try {
            return await this.client.get(endpoint);
        } catch (error) {
            throw new Error(`Error al listar personajes: ${error.message}`);
        }
    }

    async createCharacter(bloqueId, templateId, x, y, z) {
        const endpoint = `/bloques/${bloqueId}/characters`;
        try {
            return await this.client.post(endpoint, {
                template_id: templateId,
                x,
                y,
                z
            });
        } catch (error) {
            throw new Error(`Error al crear personaje: ${error.message}`);
        }
    }

    async getCharacterModel(bloqueId, characterId) {
        const endpoint = `/bloques/${bloqueId}/characters/${characterId}/model`;
        try {
            return await this.client.get(endpoint);
        } catch (error) {
            throw new Error(`Error al obtener modelo del personaje: ${error.message}`);
        }
    }
}
