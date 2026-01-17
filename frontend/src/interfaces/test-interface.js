/**
 * Interfaz de Test Tools
 * Se activa con F6 y proporciona herramientas de testing organizadas por secciones
 */
import { BaseInterface } from './base-interface.js';
import { isDevelopment } from '../dev-exposure.js';
import { ANIMATION_FILES } from '../config/animation-config.js';
import { WEAPON_MODELS } from '../config/weapon-models-config.js';
import { equipWeapon, getEquippedWeapon } from '../utils/weapon-utils.js';

export class TestInterface extends BaseInterface {
    constructor(app, ecs) {
        super(app, ecs, {
            enabled: isDevelopment(),
            toggleKey: 'F6',
            title: 'Test Tools',
            color: '#2196F3' // Azul para diferenciarlo del debugger (verde)
        });
        
        // Estado para sección de animaciones
        this.animations = ANIMATION_FILES || {};
        this.animationSearchTerm = '';
        this.animationListContainer = null;
        this.expandedFolders = new Set();
        
        // Estado para sección de armas
        this.weaponListContainer = null;
        this.currentWeaponDisplay = null;
        this.weaponsContainer = null;
    }
    
    /**
     * Inicializar interfaz (sobrescribe BaseInterface.init)
     */
    init() {
        if (!this.enabled) {
            return;
        }
        
        super.init(); // Crear estructura base
        
        // Crear tabs exactamente como DebugInterface
        this.createTabs([
            { id: 'animations', label: '🎬 Animaciones', content: this.createAnimacionesTab.bind(this) },
            { id: 'weapons', label: '⚔️ Armas', content: this.createArmasTab.bind(this) }
        ]);
        
        console.log('[TestTools] Inicialización completa. Presiona F6 para mostrar.');
    }
    
    /**
     * Crear tab de Animaciones
     * @returns {HTMLElement} Contenido del tab
     */
    createAnimacionesTab() {
        return this.createTabContainer('Lista de Animaciones', () => {
            const elements = [];
            
            if (!this.animations || typeof this.animations !== 'object') {
                elements.push(this.createNoResultsMessage('Error: No se pudieron cargar las animaciones. Verifica la consola.'));
                return elements;
            }
            
            const animationCount = Object.keys(this.animations).length;
            elements.push(this.createInfoParagraph(`Total de animaciones: ${animationCount}`));
            
            // Campo de búsqueda
            const searchContainer = this.createSectionContainer({ margin: '0 0 15px 0' });
            const searchInput = this.createInput({
                placeholder: 'Buscar animación por nombre, archivo o carpeta...',
                width: '100%',
                maxWidth: '500px',
                onChange: (value) => {
                    this.animationSearchTerm = value.toLowerCase();
                    this.renderAnimationList();
                }
            });
            searchInput.style.maxWidth = '500px';
            searchInput.style.padding = '8px 12px';
            searchInput.style.borderRadius = '4px';
            searchContainer.appendChild(searchInput);
            elements.push(searchContainer);
            
            // Contenedor de lista
            this.animationListContainer = this.createFlexContainer({ direction: 'column', gap: '8px' });
            elements.push(this.animationListContainer);
            
            // Renderizar lista inicial
            requestAnimationFrame(() => {
                this.renderAnimationList();
            });
            
            return elements;
        });
    }
    
    /**
     * Organizar animaciones por carpetas
     */
    organizeAnimationsByFolder(animations) {
        const organized = {};
        const uncategorized = [];
        
        Object.entries(animations).forEach(([name, path]) => {
            const pathParts = path.split('/');
            const bipedIndex = pathParts.indexOf('biped');
            const animationsIndex = pathParts.indexOf('animations');
            
            if (animationsIndex !== -1 && animationsIndex < pathParts.length - 1) {
                const category = pathParts[animationsIndex + 1];
                if (!organized[category]) {
                    organized[category] = [];
                }
                organized[category].push({ name, path });
            } else if (bipedIndex !== -1 && bipedIndex < pathParts.length - 1) {
                const category = pathParts[bipedIndex + 1];
                if (!organized[category]) {
                    organized[category] = [];
                }
                organized[category].push({ name, path });
            } else {
                uncategorized.push({ name, path });
            }
        });
        
        return { organized, uncategorized };
    }
    
    /**
     * Crear item de carpeta expandible/colapsable
     */
    createFolderItem(folderName, animations, isExpanded = false) {
        const folderContainer = document.createElement('div');
        folderContainer.style.cssText = 'margin: 5px 0;';
        
        const folderButton = document.createElement('button');
        const icon = isExpanded ? '📂' : '📁';
        folderButton.textContent = `${icon} ${folderName} (${animations.length})`;
        folderButton.style.cssText = `
            width: 100%;
            padding: 10px;
            background: rgba(45, 45, 45, 0.5);
            border: 1px solid #444;
            text-align: left;
            cursor: pointer;
            color: #fff;
            font-weight: bold;
            border-radius: 4px;
            transition: background 0.2s;
        `;
        
        folderButton.onmouseenter = () => {
            folderButton.style.background = 'rgba(55, 55, 55, 0.7)';
        };
        folderButton.onmouseleave = () => {
            folderButton.style.background = 'rgba(45, 45, 45, 0.5)';
        };
        
        const animationsContainer = document.createElement('div');
        animationsContainer.style.cssText = `
            margin-left: 20px;
            margin-top: 5px;
            display: ${isExpanded ? 'block' : 'none'};
        `;
        
        animations.forEach(({ name, path }) => {
            const animationItem = this.createListItem({
                columns: [
                    { content: name, style: 'flex: 0 0 200px; color: #fff; font-weight: bold; font-size: 13px;' },
                    { content: path, style: 'flex: 1; color: #aaa; font-family: monospace; font-size: 11px; word-break: break-all;' }
                ],
                actions: [{ text: 'Reproducir', onClick: () => this.playAnimation(name), variant: 'small' }]
            });
            animationsContainer.appendChild(animationItem);
        });
        
        folderButton.onclick = () => {
            const isCurrentlyExpanded = animationsContainer.style.display !== 'none';
            animationsContainer.style.display = isCurrentlyExpanded ? 'none' : 'block';
            const newIcon = isCurrentlyExpanded ? '📁' : '📂';
            folderButton.textContent = `${newIcon} ${folderName} (${animations.length})`;
            
            if (isCurrentlyExpanded) {
                this.expandedFolders.delete(folderName);
            } else {
                this.expandedFolders.add(folderName);
            }
        };
        
        folderContainer.appendChild(folderButton);
        folderContainer.appendChild(animationsContainer);
        
        return folderContainer;
    }
    
    /**
     * Renderizar lista de animaciones
     */
    renderAnimationList() {
        if (!this.animationListContainer) return;
        
        // Recargar animaciones desde ANIMATION_FILES para obtener las últimas actualizaciones
        this.animations = ANIMATION_FILES || {};
        
        if (!this.animations || typeof this.animations !== 'object') return;
        
        this.animationListContainer.innerHTML = '';
        
        const { organized, uncategorized } = this.organizeAnimationsByFolder(this.animations);
        const searchTerm = this.animationSearchTerm.toLowerCase();
        const hasSearch = searchTerm.length > 0;
        
        Object.entries(organized)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([folderName, animations]) => {
                const filtered = animations.filter(({ name, path }) => {
                    if (!hasSearch) return true;
                    return name.toLowerCase().includes(searchTerm) || 
                           path.toLowerCase().includes(searchTerm) ||
                           folderName.toLowerCase().includes(searchTerm);
                });
                
                if (filtered.length > 0) {
                    const shouldExpand = !hasSearch || this.expandedFolders.has(folderName) || folderName.toLowerCase().includes(searchTerm);
                    this.animationListContainer.appendChild(
                        this.createFolderItem(folderName, filtered, shouldExpand)
                    );
                }
            });
        
        if (uncategorized.length > 0) {
            const filteredUncategorized = uncategorized.filter(({ name, path }) => {
                if (!hasSearch) return true;
                return name.toLowerCase().includes(searchTerm) || 
                       path.toLowerCase().includes(searchTerm);
            });
            
            if (filteredUncategorized.length > 0) {
                const uncategorizedTitle = document.createElement('div');
                uncategorizedTitle.textContent = '📁 Sin categorizar';
                uncategorizedTitle.style.cssText = 'margin: 15px 0 5px 0; color: #ff9800; font-weight: bold; font-size: 14px;';
                this.animationListContainer.appendChild(uncategorizedTitle);
                
                filteredUncategorized.forEach(({ name, path }) => {
                    this.animationListContainer.appendChild(this.createListItem({
                        columns: [
                            { content: name, style: 'flex: 0 0 200px; color: #fff; font-weight: bold; font-size: 13px;' },
                            { content: path, style: 'flex: 1; color: #aaa; font-family: monospace; font-size: 11px; word-break: break-all;' }
                        ],
                        actions: [{ text: 'Reproducir', onClick: () => this.playAnimation(name), variant: 'small' }]
                    }));
                });
            }
        }
        
        if (this.animationListContainer.children.length === 0) {
            this.animationListContainer.appendChild(this.createNoResultsMessage(
                hasSearch 
                    ? `No se encontraron animaciones que coincidan con "${this.animationSearchTerm}"`
                    : 'No se encontraron animaciones'
            ));
        }
    }
    
    /**
     * Reproducir animación en el personaje
     */
    playAnimation(animationName) {
        if (!this.app || !this.app.playerId || !this.app.ecs) {
            this.showError(this.animationListContainer || this.mainContent, 'Personaje no disponible. Asegúrate de que el juego esté cargado.');
            return;
        }
        
        const animationMixerSystem = this.app.ecs.systems.find(
            system => system.constructor.name === 'AnimationMixerSystem'
        );
        
        if (!animationMixerSystem) {
            this.showError(this.animationListContainer || this.mainContent, 'AnimationMixerSystem no encontrado.');
            return;
        }
        
        const success = animationMixerSystem.playAnimationByName(
            this.app.playerId,
            animationName
        );
        
        if (success) {
            this.showInfo(this.animationListContainer || this.mainContent, `Reproduciendo: ${animationName}`);
        } else {
            this.showError(this.animationListContainer || this.mainContent, `Error al reproducir animación: ${animationName}. Verifica que el mixer esté inicializado y que la animación esté cargada.`);
        }
    }
    
    /**
     * Crear tab de Armas
     * @returns {HTMLElement} Contenido del tab
     */
    createArmasTab() {
        return this.createTabContainer('Gestión de Armas', () => {
            const elements = [];
            
            // Guardar referencia al contenedor
            this.weaponsContainer = this.mainContent;
            
            // Sección de arma actual
            const currentWeaponSection = this.createSectionContainer({ margin: '0 0 20px 0', padding: '15px', background: 'rgba(45, 45, 45, 0.3)', borderTop: '1px solid #444' });
            const currentWeaponTitle = document.createElement('div');
            currentWeaponTitle.textContent = 'Arma Equipada:';
            currentWeaponTitle.style.cssText = 'font-weight: bold; margin-bottom: 10px; color: #fff;';
            currentWeaponSection.appendChild(currentWeaponTitle);
            
            const currentWeaponDisplay = document.createElement('div');
            currentWeaponDisplay.id = 'weapons-section-current-weapon-display';
            currentWeaponDisplay.style.cssText = 'color: #4CAF50; font-size: 14px; font-weight: bold;';
            currentWeaponSection.appendChild(currentWeaponDisplay);
            this.currentWeaponDisplay = currentWeaponDisplay;
            
            elements.push(currentWeaponSection);
            
            // Lista de armas disponibles
            const weaponsTitle = document.createElement('div');
            weaponsTitle.textContent = 'Armas Disponibles:';
            weaponsTitle.style.cssText = 'font-weight: bold; margin: 20px 0 10px 0; color: #fff;';
            elements.push(weaponsTitle);
            
            this.weaponListContainer = this.createFlexContainer({ direction: 'column', gap: '10px' });
            elements.push(this.weaponListContainer);
            
            // Renderizar lista inicial
            requestAnimationFrame(() => {
                this.updateCurrentWeaponDisplay();
                this.renderWeaponsList();
            });
            
            return elements;
        });
    }
    
    /**
     * Renderizar lista de armas disponibles
     */
    renderWeaponsList() {
        if (!this.weaponListContainer) return;
        
        this.weaponListContainer.innerHTML = '';
        
        const weapons = Object.keys(WEAPON_MODELS);
        const currentWeapon = this.getCurrentWeapon();
        
        if (weapons.length === 0) {
            this.weaponListContainer.appendChild(
                this.createNoResultsMessage('No hay armas disponibles')
            );
            return;
        }
        
        weapons.forEach(weaponType => {
            const weaponConfig = WEAPON_MODELS[weaponType];
            const isEquipped = currentWeapon === weaponType;
            
            const weaponItem = document.createElement('div');
            weaponItem.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px;
                background: ${isEquipped ? 'rgba(76, 175, 80, 0.2)' : 'rgba(45, 45, 45, 0.3)'};
                border: 1px solid ${isEquipped ? '#4CAF50' : '#555'};
                border-radius: 4px;
                margin-bottom: 8px;
            `;
            
            const weaponInfo = document.createElement('div');
            weaponInfo.style.cssText = 'flex: 1;';
            
            const weaponName = document.createElement('div');
            weaponName.textContent = this.formatWeaponName(weaponType);
            weaponName.style.cssText = `font-weight: bold; color: ${isEquipped ? '#4CAF50' : '#fff'}; margin-bottom: 4px;`;
            weaponInfo.appendChild(weaponName);
            
            const weaponPath = document.createElement('div');
            weaponPath.textContent = weaponConfig.path;
            weaponPath.style.cssText = 'color: #aaa; font-family: monospace; font-size: 11px; word-break: break-all;';
            weaponInfo.appendChild(weaponPath);
            
            weaponItem.appendChild(weaponInfo);
            
            if (isEquipped) {
                const equippedBadge = document.createElement('span');
                equippedBadge.textContent = '✓ Equipada';
                equippedBadge.style.cssText = 'color: #4CAF50; font-weight: bold; margin-right: 10px;';
                weaponItem.appendChild(equippedBadge);
            } else {
                const equipBtn = this.createButton('Equipar', () => {
                    const success = equipWeapon(this.app.ecs, this.app.playerId, weaponType);
                    if (success) {
                        this.updateCurrentWeaponDisplay();
                        this.renderWeaponsList();
                        this.showInfo(this.weaponsContainer || this.mainContent, `Arma "${this.formatWeaponName(weaponType)}" equipada`);
                    } else {
                        this.showError(this.weaponsContainer || this.mainContent, `Error al equipar arma "${weaponType}"`);
                    }
                }, { variant: 'primary', margin: '0' });
                weaponItem.appendChild(equipBtn);
            }
            
            this.weaponListContainer.appendChild(weaponItem);
        });
        
        // Botón para desequipar
        if (currentWeapon) {
            const unequipSection = this.createSectionContainer({ margin: '20px 0 0 0', padding: '10px', borderTop: '1px solid #444' });
            const unequipBtn = this.createButton('Desequipar Arma', () => {
                const success = equipWeapon(this.app.ecs, this.app.playerId, null);
                if (success) {
                    this.updateCurrentWeaponDisplay();
                    this.renderWeaponsList();
                    this.showInfo(this.weaponsContainer || this.mainContent, 'Arma desequipada');
                } else {
                    this.showError(this.weaponsContainer || this.mainContent, 'Error al desequipar arma');
                }
            }, { variant: 'danger', margin: '0', display: 'block', width: '100%' });
            unequipSection.appendChild(unequipBtn);
            this.weaponListContainer.appendChild(unequipSection);
        }
    }
    
    /**
     * Obtener arma equipada actualmente
     */
    getCurrentWeapon() {
        if (!this.app || !this.app.playerId || !this.app.ecs) {
            return null;
        }
        return getEquippedWeapon(this.app.ecs, this.app.playerId);
    }
    
    /**
     * Actualizar display del arma actual
     */
    updateCurrentWeaponDisplay() {
        if (!this.currentWeaponDisplay) {
            this.currentWeaponDisplay = document.getElementById('weapons-section-current-weapon-display');
        }
        
        if (!this.currentWeaponDisplay) return;
        
        const currentWeapon = this.getCurrentWeapon();
        
        if (currentWeapon) {
            this.currentWeaponDisplay.textContent = this.formatWeaponName(currentWeapon);
            this.currentWeaponDisplay.style.color = '#4CAF50';
        } else {
            this.currentWeaponDisplay.textContent = 'Ninguna';
            this.currentWeaponDisplay.style.color = '#888';
        }
    }
    
    /**
     * Formatear nombre del arma para display
     */
    formatWeaponName(weaponType) {
        return weaponType
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
}
