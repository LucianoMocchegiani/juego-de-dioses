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
            placeholder: 'Buscar animación por nombre o archivo...',
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
     * Renderizar lista de animaciones (filtrada por búsqueda)
     */
    renderAnimationList() {
        if (!this.listContainer || !this.animations || typeof this.animations !== 'object') return;
        
        this.listContainer.innerHTML = '';
        
        const filtered = Object.entries(this.animations).filter(([name, file]) => {
            if (!this.searchTerm) return true;
            return name.toLowerCase().includes(this.searchTerm) || file.toLowerCase().includes(this.searchTerm);
        });
        
        if (filtered.length === 0) {
            this.listContainer.appendChild(this.createNoResultsMessage(
                this.searchTerm 
                    ? `No se encontraron animaciones que coincidan con "${this.searchTerm}"`
                    : 'No se encontraron animaciones'
            ));
            return;
        }
        
        filtered.forEach(([name, file]) => {
            this.listContainer.appendChild(this.createListItem({
                columns: [
                    { content: name, style: 'flex: 0 0 200px; color: #fff; font-weight: bold; font-size: 13px;' },
                    { content: file, style: 'flex: 1; color: #aaa; font-family: monospace; font-size: 11px; word-break: break-all;' }
                ],
                actions: [{ text: 'Reproducir', onClick: () => this.playAnimation(name), variant: 'small' }]
            }));
        });
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
