/**
 * Componente de Combate
 * 
 * Almacena el estado de combate de una entidad (tipo de ataque, defensa, etc.)
 */
import { COMBAT_CONSTANTS } from '../../config/combat-constants.js';

export class CombatComponent {
    constructor() {
        /**
         * Si está atacando
         * @type {boolean}
         */
        this.isAttacking = false;
        
        /**
         * Tipo de ataque: 'light', 'heavy', 'charged', 'special', null
         * @type {string|null}
         */
        this.attackType = null;
        
        /**
         * Tipo de defensa: 'parry', 'dodge', 'block', null
         * @type {string|null}
         */
        this.defenseType = null;
        
        /**
         * Si el ataque actual puede cancelarse
         * @type {boolean}
         */
        this.canCancel = false;
        
        /**
         * Animación de ataque/defensa que debe ejecutarse
         * @type {string|null}
         */
        this.combatAnimation = null;
        
        /**
         * Acción de combate actualmente en progreso
         * @type {string|null} ID de la acción (ej: 'dodge', 'specialAttack')
         */
        this.activeAction = null;
        
        /**
         * Timestamp de cuando se inició la acción actual
         * @type {number|null} Timestamp en milisegundos
         */
        this.actionStartTime = null;
        
        /**
         * Cooldowns por acción
         * @type {Map<string, number>} Map<actionId, cooldownRemaining>
         */
        this.actionCooldowns = new Map();
        
        /**
         * Si la acción actual tiene i-frames activos
         * @type {boolean}
         */
        this.hasIFrames = false;
    }
    
    /**
     * Iniciar una acción de combate
     * @param {string} actionId - ID de la acción
     */
    startAction(actionId) {
        this.activeAction = actionId;
        this.actionStartTime = performance.now();
        // El sistema se encargará de setear defenseType/attackType según la configuración
    }
    
    /**
     * Finalizar la acción actual
     * Limpia solo los campos relacionados con la acción activa, no todo el estado de combate
     */
    endAction() {
        this.activeAction = null;
        this.actionStartTime = null;
        this.hasIFrames = false;
        // Nota: NO limpia defenseType, attackType, combatAnimation aquí
        // porque pueden necesitar persistir para transiciones o reactivación
    }
    
    /**
     * Verificar si una acción está en cooldown
     * @param {string} actionId - ID de la acción
     * @returns {boolean}
     */
    isOnCooldown(actionId) {
        const remaining = this.actionCooldowns.get(actionId) || 0;
        return remaining > 0;
    }
    
    /**
     * Actualizar cooldowns (llamar cada frame)
     * @param {number} deltaTime - Tiempo transcurrido en segundos
     */
    updateCooldowns(deltaTime) {
        for (const [actionId, remaining] of this.actionCooldowns.entries()) {
            const newRemaining = remaining - deltaTime;
            if (newRemaining <= 0) {
                this.actionCooldowns.delete(actionId);
            } else {
                this.actionCooldowns.set(actionId, newRemaining);
            }
        }
    }
    
    /**
     * Resetear estado de combate
     * NO resetea activeAction si está activo (se resetea cuando la animación termine)
     */
    reset() {
        this.isAttacking = false;
        this.attackType = null;
        
        // Solo resetear defenseType si NO hay acción activa
        if (!this.activeAction) {
            this.defenseType = null;
        }
        
        this.canCancel = false;
        this.combatAnimation = null;
    }
    
    /**
     * Limpiar completamente el estado de combate
     * Útil para limpieza centralizada cuando termina una animación
     */
    clearCombatState() {
        this.activeAction = null;
        this.actionStartTime = null;
        this.defenseType = null;
        this.attackType = null;
        this.combatAnimation = null;
        this.isAttacking = false;
        this.hasIFrames = false;
    }
    
    /**
     * Limpiar defenseType según tipo de acción y estado del input
     * Centraliza la lógica especial para parry (mantener si tecla presionada) y dodge (siempre limpiar)
     * 
     * @param {string} actionId - ID de la acción que terminó
     * @param {Object|null} input - InputComponent o null
     */
    cleanupDefenseType(actionId, input) {
        if (actionId === COMBAT_CONSTANTS.ACTION_IDS.PARRY) {
            // Parry: Solo limpiar si la tecla NO está presionada
            // Si está presionada, mantener para reactivación
            if (!input || !input.wantsToParry) {
                this.defenseType = null;
            }
            // Si está presionada, mantener defenseType = 'parry' para reactivación
        } else if (actionId === COMBAT_CONSTANTS.ACTION_IDS.DODGE) {
            // Dodge: Siempre limpiar (no debe reactivarse automáticamente)
            this.defenseType = null;
        } else {
            // Para otras acciones, limpiar normalmente
            this.defenseType = null;
        }
    }
}

