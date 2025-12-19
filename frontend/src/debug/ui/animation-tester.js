/**
 * Interfaz de Prueba de Animaciones
 * Se activa con F6 y permite listar y probar todas las animaciones disponibles
 */
import { BaseInterface } from './base-interface.js';
import { ANIMATION_FILES } from '../../config/animation-config.js';
import { isDevelopment } from '../dev-exposure.js';

export class AnimationTester extends BaseInterface {
    constructor(app, ecs) {
        super(app, ecs, {
            enabled: isDevelopment(),
            toggleKey: 'F6',
            title: 'Animation Tester',
            color: '#2196F3' // Azul para diferenciarlo del debugger (verde)
        });
        
        // Verificar que ANIMATION_FILES esté disponible
        if (!ANIMATION_FILES || typeof ANIMATION_FILES !== 'object') {
            console.error('[AnimationTester] ANIMATION_FILES no está disponible o no es un objeto:', ANIMATION_FILES);
            this.animations = {};
        } else {
            this.animations = ANIMATION_FILES;
            console.log('[AnimationTester] Animaciones cargadas:', Object.keys(this.animations).length);
        }
        
        this.searchTerm = '';
        this.listContainer = null;
        this.expandedFolders = new Set(); // Carpetas expandidas por defecto
    }
    
    /**
     * Inicializar interfaz (sobrescribe BaseInterface.init)
     */
    init() {
        if (!this.enabled) {
            return;
        }
        
        super.init(); // Crear estructura base
        
        // Ocultar sidebar ya que no usamos tabs
        if (this.sidebar) {
            this.sidebar.style.display = 'none';
        }
        
        // Expandir mainContent para usar todo el ancho
        if (this.mainContent) {
            this.mainContent.style.width = '100%';
        }
        
        // Crear lista de animaciones después de un pequeño delay para asegurar que el DOM esté listo
        // Usar requestAnimationFrame para asegurar que el DOM esté completamente renderizado
        requestAnimationFrame(() => {
            if (this.mainContent) {
                this.createAnimationList();
            }
        });
    }
    
    /**
     * Toggle visibilidad (sobrescribe BaseInterface.toggle)
     */
    toggle() {
        const wasVisible = this.visible;
        super.toggle();
        
        // Si se está abriendo (no estaba visible antes y ahora sí), asegurar que la lista esté creada
        if (!wasVisible && this.visible) {
            // Esperar un momento para que el DOM se actualice
            setTimeout(() => {
                if (this.mainContent && (!this.listContainer || this.listContainer.children.length === 0)) {
                    console.log('[AnimationTester] Recreando lista al abrir interfaz');
                    this.createAnimationList();
                }
            }, 50);
        }
    }
    
    /**
     * Crear lista de animaciones
     */
    createAnimationList() {
        if (!this.mainContent) {
            console.error('[AnimationTester] mainContent no disponible');
            return;
        }
        
        if (!this.animations || typeof this.animations !== 'object') {
            console.error('[AnimationTester] animations no disponible o inválido:', this.animations);
            this.mainContent.appendChild(this.createNoResultsMessage('Error: No se pudieron cargar las animaciones. Verifica la consola.'));
            this.mainContent.querySelector('div').style.color = '#f44336';
            return;
        }
        
        const animationCount = Object.keys(this.animations).length;
        console.log('[AnimationTester] Total de animaciones:', animationCount);
        
        this.mainContent.innerHTML = '';
        this.mainContent.appendChild(this.createTitle('Lista de Animaciones'));
        this.mainContent.appendChild(this.createInfoParagraph(`Total de animaciones: ${animationCount}`));
        
        // Campo de búsqueda
        const searchInput = this.createInput({
            placeholder: 'Buscar animación por nombre, archivo o carpeta...',
            width: '100%',
            maxWidth: '500px',
            onChange: (value) => {
                this.searchTerm = value.toLowerCase();
                this.renderAnimationList();
            }
        });
        searchInput.style.maxWidth = '500px';
        searchInput.style.padding = '8px 12px';
        searchInput.style.borderRadius = '4px';
        
        const searchContainer = this.createSectionContainer({ margin: '0 0 15px 0' });
        searchContainer.appendChild(searchInput);
        this.mainContent.appendChild(searchContainer);
        
        // Contenedor de lista
        this.listContainer = this.createFlexContainer({ direction: 'column', gap: '8px' });
        this.mainContent.appendChild(this.listContainer);
        this.renderAnimationList();
    }
    
    /**
     * Organizar animaciones por carpetas
     * @param {Object} animations - Objeto con nombre -> ruta
     * @returns {Object} { organized: { folderName: [{name, path}] }, uncategorized: [{name, path}] }
     */
    organizeAnimationsByFolder(animations) {
        const organized = {};
        const uncategorized = [];
        
        Object.entries(animations).forEach(([name, path]) => {
            // Extraer estructura de carpetas de la ruta
            // Nueva estructura: 'biped/male/animations/shield-and-one-hand-weapon/Left_Slash_withSkin.glb'
            // → ['biped', 'male', 'animations', 'shield-and-one-hand-weapon', 'Left_Slash_withSkin.glb']
            const pathParts = path.split('/');
            const bipedIndex = pathParts.indexOf('biped');
            const animationsIndex = pathParts.indexOf('animations');
            
            if (animationsIndex !== -1 && animationsIndex < pathParts.length - 1) {
                // Nueva estructura: biped/male/animations/{category}/
                const category = pathParts[animationsIndex + 1];
                if (!organized[category]) {
                    organized[category] = [];
                }
                organized[category].push({ name, path });
            } else if (bipedIndex !== -1 && bipedIndex < pathParts.length - 1) {
                // Estructura antigua: animations/biped/{category}/ (compatibilidad)
                const category = pathParts[bipedIndex + 1];
                if (!organized[category]) {
                    organized[category] = [];
                }
                organized[category].push({ name, path });
            } else {
                // Animación sin categorizar (en la raíz o fuera de biped/)
                uncategorized.push({ name, path });
            }
        });
        
        return { organized, uncategorized };
    }
    
    /**
     * Crear item de carpeta expandible/colapsable
     * @param {string} folderName - Nombre de la carpeta
     * @param {Array} animations - Array de {name, path}
     * @param {boolean} isExpanded - Si la carpeta está expandida
     * @returns {HTMLElement} Elemento de carpeta
     */
    createFolderItem(folderName, animations, isExpanded = false) {
        const folderContainer = document.createElement('div');
        folderContainer.style.cssText = 'margin: 5px 0;';
        
        // Botón de carpeta (expandir/colapsar)
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
        
        // Hover effect
        folderButton.onmouseenter = () => {
            folderButton.style.background = 'rgba(55, 55, 55, 0.7)';
        };
        folderButton.onmouseleave = () => {
            folderButton.style.background = 'rgba(45, 45, 45, 0.5)';
        };
        
        // Contenedor de animaciones (inicialmente oculto si no está expandido)
        const animationsContainer = document.createElement('div');
        animationsContainer.style.cssText = `
            margin-left: 20px;
            margin-top: 5px;
            display: ${isExpanded ? 'block' : 'none'};
        `;
        
        // Agregar animaciones
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
        
        // Toggle expand/collapse
        folderButton.onclick = () => {
            const isCurrentlyExpanded = animationsContainer.style.display !== 'none';
            animationsContainer.style.display = isCurrentlyExpanded ? 'none' : 'block';
            const newIcon = isCurrentlyExpanded ? '📁' : '📂';
            folderButton.textContent = `${newIcon} ${folderName} (${animations.length})`;
            
            // Guardar estado
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
     * Renderizar lista de animaciones (filtrada por búsqueda, organizada por carpetas)
     */
    renderAnimationList() {
        if (!this.listContainer || !this.animations || typeof this.animations !== 'object') return;
        
        this.listContainer.innerHTML = '';
        
        // Organizar animaciones por carpetas
        const { organized, uncategorized } = this.organizeAnimationsByFolder(this.animations);
        
        // Aplicar filtro de búsqueda si existe
        const searchTerm = this.searchTerm.toLowerCase();
        const hasSearch = searchTerm.length > 0;
        
        // Renderizar carpetas organizadas
        Object.entries(organized)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([folderName, animations]) => {
                // Filtrar animaciones por búsqueda
                const filtered = animations.filter(({ name, path }) => {
                    if (!hasSearch) return true;
                    return name.toLowerCase().includes(searchTerm) || 
                           path.toLowerCase().includes(searchTerm) ||
                           folderName.toLowerCase().includes(searchTerm);
                });
                
                if (filtered.length > 0) {
                    // Expandir por defecto si no hay búsqueda, o si la búsqueda coincide con la carpeta
                    const shouldExpand = !hasSearch || this.expandedFolders.has(folderName) || folderName.toLowerCase().includes(searchTerm);
                    this.listContainer.appendChild(
                        this.createFolderItem(folderName, filtered, shouldExpand)
                    );
                }
            });
        
        // Renderizar sección "Sin categorizar" si hay animaciones
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
                this.listContainer.appendChild(uncategorizedTitle);
                
                filteredUncategorized.forEach(({ name, path }) => {
                    this.listContainer.appendChild(this.createListItem({
                        columns: [
                            { content: name, style: 'flex: 0 0 200px; color: #fff; font-weight: bold; font-size: 13px;' },
                            { content: path, style: 'flex: 1; color: #aaa; font-family: monospace; font-size: 11px; word-break: break-all;' }
                        ],
                        actions: [{ text: 'Reproducir', onClick: () => this.playAnimation(name), variant: 'small' }]
                    }));
                });
            }
        }
        
        // Mensaje si no hay resultados
        if (this.listContainer.children.length === 0) {
            this.listContainer.appendChild(this.createNoResultsMessage(
                hasSearch 
                    ? `No se encontraron animaciones que coincidan con "${this.searchTerm}"`
                    : 'No se encontraron animaciones'
            ));
        }
    }
    
    /**
     * Reproducir animación en el personaje
     * @param {string} animationName - Nombre de la animación
     */
    playAnimation(animationName) {
        if (!this.app || !this.app.playerId || !this.app.ecs) {
            this.showError(this.listContainer, 'Personaje no disponible. Asegúrate de que el juego esté cargado.');
            return;
        }
        
        // Obtener AnimationMixerSystem
        const animationMixerSystem = this.app.ecs.systems.find(
            system => system.constructor.name === 'AnimationMixerSystem'
        );
        
        if (!animationMixerSystem) {
            this.showError(this.listContainer, 'AnimationMixerSystem no encontrado.');
            return;
        }
        
        // Reproducir animación
        const success = animationMixerSystem.playAnimationByName(
            this.app.playerId,
            animationName
        );
        
        if (success) {
            this.showInfo(this.listContainer, `Reproduciendo: ${animationName}`);
        } else {
            this.showError(this.listContainer, `Error al reproducir animación: ${animationName}. Verifica que el mixer esté inicializado y que la animación esté cargada.`);
        }
    }
}
