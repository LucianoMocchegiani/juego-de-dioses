/**
 * Clase base para interfaces de desarrollo
 * 
 * Proporciona funcionalidad común para interfaces de desarrollo como:
 * - Estructura base (header, sidebar, mainContent)
 * - Manejo de eventos de teclado
 * - Utilidades comunes (escapeHtml, showInfo, showError)
 * - Bloqueo de input del juego
 * - Sistema de tabs genérico
 */
import { cursorManager } from '../shared/cursor-manager.js';

export class BaseInterface {
    /**
     * Crear interfaz base
     * @param {Object} app - Instancia de App
     * @param {Object} ecs - ECS Manager
     * @param {Object} config - Configuración de la interfaz
     * @param {boolean} config.enabled - Si la interfaz está habilitada
     * @param {string} config.toggleKey - Tecla para abrir/cerrar (ej: 'F4', 'F6')
     * @param {string} config.title - Título de la interfaz
     * @param {string} config.color - Color de acento (ej: '#4CAF50', '#2196F3')
     */
    constructor(app, ecs, config) {
        this.app = app;
        this.ecs = ecs;
        this.config = config;
        this.enabled = config.enabled || false;
        this.toggleKey = config.toggleKey || 'F4';
        this.title = config.title || 'Debug Interface';
        this.color = config.color || '#4CAF50';
        
        this.visible = false;
        this.interfaceElement = null;
        this.inputBlocked = false;
        this.sidebar = null;
        this.mainContent = null;
        this.resizeHandle = null;
        this.isResizing = false;
        this.minHeight = 200;
        this.maxHeight = window.innerHeight * 0.9;
        this.resizeWindowHandler = null;
        
        if (this.enabled) {
            try {
                this.init();
            } catch (error) {
                console.error(`[BaseInterface] Error al inicializar:`, error);
            }
        }
    }
    
    /**
     * Inicializar interfaz (debe ser sobrescrito por clases hijas)
     */
    init() {
        this.createBaseStructure();
        this.setupKeyboardListener();
    }
    
    /**
     * Crear estructura base de la interfaz
     */
    createBaseStructure() {
        // Crear contenedor principal
        this.interfaceElement = document.createElement('div');
        // ID específico para DebugInterface (compatibilidad), genérico para otros
        this.interfaceElement.id = this.toggleKey === 'F4' && this.title === 'Debug Tools'
            ? 'debug-interface'
            : `interface-${this.toggleKey.toLowerCase()}`;
        
        // Obtener altura guardada o usar valor por defecto
        const storageKey = `${this.interfaceElement.id}-height`;
        const savedHeight = localStorage.getItem(storageKey);
        const initialHeight = savedHeight ? parseInt(savedHeight, 10) : 400;
        
        // Inicializar altura máxima
        this.maxHeight = window.innerHeight * 0.9;
        
        this.interfaceElement.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: ${initialHeight}px;
            background: rgba(20, 20, 20, 0.75);
            color: #fff;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 13px;
            display: none;
            flex-direction: column;
            z-index: 10001;
            border-top: 3px solid ${this.color};
            box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
        `;
        
        // Crear barra de redimensionamiento
        this.createResizeHandle();
        
        // Crear header
        this.createHeader();
        
        // Crear contenido principal
        const content = document.createElement('div');
        content.style.cssText = 'flex: 1; display: flex; overflow: hidden;';
        
        // Sidebar (opcional, puede ser usado para tabs)
        this.sidebar = document.createElement('div');
        this.sidebar.style.cssText = `
            width: 200px;
            background: rgba(37, 37, 37, 0.85);
            border-right: 1px solid #444;
            padding: 10px 0;
            overflow-y: auto;
        `;
        
        // Área de contenido principal
        this.mainContent = document.createElement('div');
        this.mainContent.style.cssText = 'flex: 1; overflow-y: auto; padding: 15px;';
        // ID específico para compatibilidad con código existente
        this.mainContent.id = this.interfaceElement.id === 'debug-interface' 
            ? 'debug-interface-content' 
            : `${this.interfaceElement.id}-content`;
        
        content.appendChild(this.sidebar);
        content.appendChild(this.mainContent);
        this.interfaceElement.appendChild(content);
        
        document.body.appendChild(this.interfaceElement);
        
        // Actualizar altura máxima cuando cambie el tamaño de la ventana
        this.resizeWindowHandler = () => {
            this.maxHeight = window.innerHeight * 0.9;
            // Ajustar altura actual si excede el nuevo máximo
            const currentHeight = parseInt(window.getComputedStyle(this.interfaceElement).height, 10);
            if (currentHeight > this.maxHeight) {
                this.interfaceElement.style.height = `${this.maxHeight}px`;
                localStorage.setItem(`${this.interfaceElement.id}-height`, this.maxHeight.toString());
            }
        };
        window.addEventListener('resize', this.resizeWindowHandler);
    }
    
    /**
     * Crear barra de redimensionamiento
     */
    createResizeHandle() {
        this.resizeHandle = document.createElement('div');
        this.resizeHandle.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 8px;
            background: ${this.color};
            cursor: ns-resize;
            z-index: 10002;
            opacity: 0.6;
            transition: opacity 0.2s;
        `;
        
        // Efecto hover
        this.resizeHandle.onmouseenter = () => {
            this.resizeHandle.style.opacity = '1';
            this.resizeHandle.style.height = '10px';
        };
        
        this.resizeHandle.onmouseleave = () => {
            if (!this.isResizing) {
                this.resizeHandle.style.opacity = '0.6';
                this.resizeHandle.style.height = '8px';
            }
        };
        
        // Eventos de redimensionamiento
        this.resizeHandle.onmousedown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.isResizing = true;
            this.resizeHandle.style.opacity = '1';
            this.resizeHandle.style.height = '10px';
            
            const startY = e.clientY;
            const startHeight = parseInt(window.getComputedStyle(this.interfaceElement).height, 10);
            
            const onMouseMove = (e) => {
                if (!this.isResizing) return;
                
                const deltaY = startY - e.clientY; // Invertido porque está en la parte inferior
                let newHeight = startHeight + deltaY;
                
                // Limitar altura
                newHeight = Math.max(this.minHeight, Math.min(this.maxHeight, newHeight));
                
                this.interfaceElement.style.height = `${newHeight}px`;
            };
            
            const onMouseUp = () => {
                this.isResizing = false;
                this.resizeHandle.style.opacity = '0.6';
                this.resizeHandle.style.height = '8px';
                
                // Guardar altura en localStorage
                const currentHeight = parseInt(window.getComputedStyle(this.interfaceElement).height, 10);
                localStorage.setItem(`${this.interfaceElement.id}-height`, currentHeight.toString());
                
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };
        
        this.interfaceElement.appendChild(this.resizeHandle);
    }
    
    /**
     * Crear header de la interfaz
     */
    createHeader() {
        const header = document.createElement('div');
        header.style.cssText = `
            background: #2d2d2d;
            padding: 10px 15px;
            border-bottom: 1px solid #444;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        const title = document.createElement('h3');
        title.textContent = this.title;
        title.style.cssText = `margin: 0; color: ${this.color}; font-size: 16px;`;
        header.appendChild(title);
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = `Cerrar (${this.toggleKey})`;
        closeBtn.style.cssText = `
            background: #f44336;
            color: white;
            border: none;
            padding: 5px 15px;
            cursor: pointer;
            border-radius: 3px;
            font-size: 12px;
        `;
        closeBtn.onclick = () => this.toggle();
        header.appendChild(closeBtn);
        
        this.interfaceElement.appendChild(header);
    }
    
    /**
     * Crear sistema de tabs genérico
     * @param {Array} tabs - Array de objetos { id, label, content }
     * @param {string} tabs[].id - ID único del tab
     * @param {string} tabs[].label - Etiqueta visible del tab
     * @param {Function} tabs[].content - Función que retorna el contenido del tab
     */
    createTabs(tabs) {
        if (!this.sidebar || !this.mainContent) {
            console.error('[BaseInterface] Sidebar o mainContent no inicializados');
            return;
        }
        
        let activeTab = tabs[0]?.id || null;
        
        tabs.forEach(tab => {
            const tabButton = document.createElement('button');
            tabButton.textContent = tab.label;
            tabButton.style.cssText = `
                width: 100%;
                padding: 12px 15px;
                background: transparent;
                color: #ccc;
                border: none;
                text-align: left;
                cursor: pointer;
                font-size: 13px;
                border-left: 3px solid transparent;
                transition: all 0.2s;
            `;
            
            tabButton.onmouseenter = () => {
                if (activeTab !== tab.id) {
                    tabButton.style.background = '#333';
                }
            };
            
            tabButton.onmouseleave = () => {
                if (activeTab !== tab.id) {
                    tabButton.style.background = 'transparent';
                }
            };
            
            tabButton.onclick = () => {
                // Actualizar tab activo
                activeTab = tab.id;
                this.sidebar.querySelectorAll('button').forEach(btn => {
                    btn.style.background = 'transparent';
                    btn.style.borderLeft = '3px solid transparent';
                    btn.style.color = '#ccc';
                });
                tabButton.style.background = '#1a1a1a';
                tabButton.style.borderLeft = `3px solid ${this.color}`;
                tabButton.style.color = this.color;
                
                // Mostrar contenido del tab
                this.mainContent.innerHTML = '';
                const content = tab.content();
                if (content) {
                    this.mainContent.appendChild(content);
                }
            };
            
            this.sidebar.appendChild(tabButton);
            
            // Activar primer tab
            if (tab.id === tabs[0].id) {
                tabButton.click();
            }
        });
    }
    
    /**
     * Configurar listener de teclado para toggle
     */
    setupKeyboardListener() {
        document.addEventListener('keydown', (e) => {
            if (e.key === this.toggleKey) {
                e.preventDefault();
                e.stopPropagation();
                this.toggle();
            }
        }, true); // Usar capture phase
    }
    
    /**
     * Toggle visibilidad de la interfaz
     */
    toggle() {
        this.visible = !this.visible;
        if (this.interfaceElement) {
            this.interfaceElement.style.display = this.visible ? 'flex' : 'none';
            
            // Bloquear/desbloquear input del juego
            if (this.visible) {
                this.blockGameInput();
                // Mostrar cursor cuando se abre la interfaz
                cursorManager.show();
            } else {
                this.unblockGameInput();
                // Ocultar cursor cuando se cierra la interfaz
                cursorManager.hide();
            }
        }
    }
    
    /**
     * Bloquear input del juego
     */
    blockGameInput() {
        if (this.app?.inputManager) {
            // Deshabilitar el InputManager directamente
            this.app.inputManager.enabled = false;
            
            // Limpiar todas las teclas presionadas del InputManager
            this.app.inputManager.keysPressed.clear();
            this.app.inputManager.keysDown.clear();
            this.app.inputManager.keysUp.clear();
            this.app.inputManager.mouseButtonsPressed.clear();
            this.app.inputManager.mouseButtonsDown.clear();
            this.app.inputManager.mouseButtonsUp.clear();
            
            // También agregar listeners en fase de captura como respaldo
            document.addEventListener('keydown', this.blockInputHandler, { capture: true, passive: false });
            document.addEventListener('keyup', this.blockInputHandler, { capture: true, passive: false });
            document.addEventListener('mousedown', this.blockInputHandler, { capture: true, passive: false });
            document.addEventListener('mouseup', this.blockInputHandler, { capture: true, passive: false });
            document.addEventListener('mousemove', this.blockInputHandler, { capture: true, passive: false });
            document.addEventListener('wheel', this.blockInputHandler, { capture: true, passive: false });
            
            this.inputBlocked = true;
        }
    }
    
    /**
     * Desbloquear input del juego
     */
    unblockGameInput() {
        if (this.inputBlocked) {
            // Habilitar el InputManager nuevamente
            if (this.app?.inputManager) {
                this.app.inputManager.enabled = true;
                
                // Limpiar estado del InputManager
                this.app.inputManager.keysPressed.clear();
                this.app.inputManager.keysDown.clear();
                this.app.inputManager.keysUp.clear();
            }
            
            // Remover listeners de bloqueo
            document.removeEventListener('keydown', this.blockInputHandler, { capture: true });
            document.removeEventListener('keyup', this.blockInputHandler, { capture: true });
            document.removeEventListener('mousedown', this.blockInputHandler, { capture: true });
            document.removeEventListener('mouseup', this.blockInputHandler, { capture: true });
            document.removeEventListener('mousemove', this.blockInputHandler, { capture: true });
            document.removeEventListener('wheel', this.blockInputHandler, { capture: true });
            
            this.inputBlocked = false;
        }
    }
    
    /**
     * Handler para bloquear eventos de input cuando la interfaz está visible
     */
    blockInputHandler = (event) => {
        // Permitir la tecla de toggle para cerrar la interfaz
        if (event.key === this.toggleKey) {
            const activeElement = document.activeElement;
            if (!activeElement || activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
                // Si hay un input activo, no permitir toggle (para que se pueda escribir)
                return;
            }
            // Si no hay input activo, permitir toggle
            return;
        }
        
        // Si el evento viene de dentro de la interfaz (inputs, botones, etc.), permitirlo
        if (this.interfaceElement && this.interfaceElement.contains(event.target)) {
            return;
        }
        
        // Si el elemento activo es un input dentro de la interfaz, permitir
        const activeElement = document.activeElement;
        if (activeElement && this.interfaceElement && this.interfaceElement.contains(activeElement)) {
            return;
        }
        
        // Bloquear TODOS los demás eventos antes de que lleguen al InputManager
        event.stopImmediatePropagation();
        event.preventDefault();
        
        // También limpiar el estado del InputManager para esta tecla específica
        if (this.app?.inputManager && event.type.startsWith('key')) {
            this.app.inputManager.keysPressed.delete(event.code);
            this.app.inputManager.keysDown.delete(event.code);
        }
    };
    
    /**
     * Escapar HTML para prevenir XSS
     * @param {string} text - Texto a escapar
     * @returns {string} Texto escapado
     */
    escapeHtml(text) {
        if (text === null || text === undefined) {
            return '';
        }
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Obtener o crear contenedor fijo para notificaciones en la parte inferior
     * @returns {HTMLElement} Contenedor de notificaciones
     */
    getNotificationContainer() {
        let container = document.getElementById('base-interface-notifications');
        if (!container) {
            // Agregar estilos CSS para animaciones si no existen
            if (!document.getElementById('base-interface-notification-styles')) {
                const style = document.createElement('style');
                style.id = 'base-interface-notification-styles';
                style.textContent = `
                    @keyframes slideUp {
                        from {
                            transform: translateY(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateY(0);
                            opacity: 1;
                        }
                    }
                    @keyframes slideDown {
                        from {
                            transform: translateY(0);
                            opacity: 1;
                        }
                        to {
                            transform: translateY(100%);
                            opacity: 0;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
            
            container = document.createElement('div');
            container.id = 'base-interface-notifications';
            container.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 10002;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: 90%;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        return container;
    }
    
    /**
     * Mostrar mensaje de información
     * @param {HTMLElement} container - Contenedor donde mostrar el mensaje (ignorado, se usa contenedor fijo)
     * @param {string} message - Mensaje a mostrar
     */
    showInfo(container, message) {
        const notificationContainer = this.getNotificationContainer();
        const infoBox = document.createElement('div');
        infoBox.style.cssText = `
            padding: 15px 20px;
            background: #1a2a1a;
            border: 1px solid ${this.color};
            border-radius: 5px;
            color: ${this.color};
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            pointer-events: auto;
            animation: slideUp 0.3s ease-out;
        `;
        infoBox.textContent = `Info: ${message}`;
        notificationContainer.appendChild(infoBox);
        
        // Auto-remover después de 3 segundos
        setTimeout(() => {
            if (infoBox.parentNode) {
                infoBox.style.animation = 'slideDown 0.3s ease-out';
                setTimeout(() => {
                    if (infoBox.parentNode) {
                        infoBox.remove();
                    }
                }, 300);
            }
        }, 3000);
    }
    
    /**
     * Mostrar mensaje de error
     * @param {HTMLElement} container - Contenedor donde mostrar el mensaje (ignorado, se usa contenedor fijo)
     * @param {string} message - Mensaje de error
     */
    showError(container, message) {
        const notificationContainer = this.getNotificationContainer();
        const errorBox = document.createElement('div');
        errorBox.style.cssText = `
            padding: 15px 20px;
            background: #2a1a1a;
            border: 1px solid #f44336;
            border-radius: 5px;
            color: #f44336;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            pointer-events: auto;
            animation: slideUp 0.3s ease-out;
        `;
        errorBox.textContent = `Error: ${message}`;
        notificationContainer.appendChild(errorBox);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (errorBox.parentNode) {
                errorBox.style.animation = 'slideDown 0.3s ease-out';
                setTimeout(() => {
                    if (errorBox.parentNode) {
                        errorBox.remove();
                    }
                }, 300);
            }
        }, 5000);
    }
    
    /**
     * Crear botón reutilizable con estilos consistentes
     * @param {string} text - Texto del botón
     * @param {Function} onClick - Función a ejecutar al hacer click
     * @param {Object} options - Opciones de estilo
     * @param {string} [options.variant='primary'] - Variante: 'primary', 'secondary', 'danger', 'small'
     * @param {string} [options.color] - Color personalizado (sobrescribe la variante)
     * @param {string} [options.margin] - Margen personalizado (ej: '10px 0')
     * @param {string} [options.display] - Display CSS (ej: 'block')
     * @param {string} [options.width] - Ancho (ej: '100%')
     * @param {string} [options.maxWidth] - Ancho máximo (ej: '400px')
     * @param {string} [options.textAlign] - Alineación de texto (ej: 'left')
     * @returns {HTMLButtonElement} Botón creado
     */
    createButton(text, onClick, options = {}) {
        const {
            variant = 'primary',
            color = null,
            margin = null,
            display = null,
            width = null,
            maxWidth = null,
            textAlign = null
        } = options;
        
        const button = document.createElement('button');
        button.textContent = text;
        
        // Colores por variante
        const variantColors = {
            primary: this.color, // Usa el color de la interfaz
            secondary: '#2196F3', // Azul
            danger: '#f44336', // Rojo
            warning: '#ff9800', // Naranja
            small: this.color // Para botones pequeños, usa el color de la interfaz
        };
        
        const bgColor = color || variantColors[variant] || this.color;
        const hoverColor = this.darkenColor(bgColor, 0.15);
        
        // Estilos base
        const baseStyles = {
            primary: {
                padding: '10px 20px',
                fontSize: '14px',
                borderRadius: '5px'
            },
            secondary: {
                padding: '8px 15px',
                fontSize: '12px',
                borderRadius: '3px'
            },
            danger: {
                padding: '10px 20px',
                fontSize: '14px',
                borderRadius: '5px'
            },
            warning: {
                padding: '10px 20px',
                fontSize: '14px',
                borderRadius: '5px'
            },
            small: {
                padding: '6px 15px',
                fontSize: '12px',
                borderRadius: '4px'
            }
        };
        
        const style = baseStyles[variant] || baseStyles.primary;
        
        button.style.cssText = `
            background: ${bgColor};
            color: white;
            border: none;
            padding: ${style.padding};
            cursor: pointer;
            border-radius: ${style.borderRadius};
            font-size: ${style.fontSize};
            white-space: nowrap;
            transition: background 0.2s;
            ${margin ? `margin: ${margin};` : ''}
            ${display ? `display: ${display};` : ''}
            ${width ? `width: ${width};` : ''}
            ${maxWidth ? `max-width: ${maxWidth};` : ''}
            ${textAlign ? `text-align: ${textAlign};` : ''}
        `;
        
        // Hover effects
        button.onmouseenter = () => {
            button.style.background = hoverColor;
        };
        
        button.onmouseleave = () => {
            button.style.background = bgColor;
        };
        
        // Click handler
        if (onClick) {
            button.onclick = onClick;
        }
        
        return button;
    }
    
    /**
     * Oscurecer un color hexadecimal
     * @param {string} hex - Color en formato hexadecimal (ej: '#2196F3')
     * @param {number} amount - Cantidad a oscurecer (0-1)
     * @returns {string} Color oscurecido
     */
    darkenColor(hex, amount) {
        // Remover # si existe
        hex = hex.replace('#', '');
        
        // Convertir a RGB
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        // Oscurecer
        const newR = Math.max(0, Math.floor(r * (1 - amount)));
        const newG = Math.max(0, Math.floor(g * (1 - amount)));
        const newB = Math.max(0, Math.floor(b * (1 - amount)));
        
        // Convertir de vuelta a hex
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }
    
    /**
     * Crear título de sección reutilizable
     * @param {string} text - Texto del título
     * @returns {HTMLHeadingElement} Elemento h3 con estilos
     */
    createTitle(text) {
        const title = document.createElement('h3');
        title.textContent = text;
        title.style.cssText = `margin-top: 0; color: ${this.color};`;
        return title;
    }
    
    /**
     * Crear input reutilizable
     * @param {Object} options - Opciones del input
     * @param {string} [options.type='text'] - Tipo de input
     * @param {string} [options.placeholder=''] - Placeholder
     * @param {string|number} [options.value=''] - Valor inicial
     * @param {string} [options.width='300px'] - Ancho
     * @param {Function} [options.onChange] - Callback al cambiar valor
     * @returns {HTMLInputElement} Input creado
     */
    createInput(options = {}) {
        const {
            type = 'text',
            placeholder = '',
            value = '',
            width = '300px',
            onChange = null
        } = options;
        
        const input = document.createElement('input');
        input.type = type;
        input.placeholder = placeholder;
        input.value = value;
        input.style.cssText = `
            width: ${width};
            padding: 8px;
            background: #333;
            border: 1px solid #555;
            color: #fff;
            border-radius: 3px;
            font-size: 13px;
        `;
        
        if (onChange) {
            if (type === 'number') {
                input.onchange = (e) => onChange(e.target.value);
            } else {
                input.oninput = (e) => onChange(e.target.value);
            }
        }
        
        return input;
    }
    
    /**
     * Crear label reutilizable
     * @param {string} text - Texto del label
     * @returns {HTMLLabelElement} Label creado
     */
    createLabel(text) {
        const label = document.createElement('label');
        label.textContent = text;
        label.style.cssText = 'display: block; margin-bottom: 5px; color: #ccc;';
        return label;
    }
    
    /**
     * Crear sección de búsqueda/filtro reutilizable (label + input + botón)
     * @param {Object} config - Configuración
     * @param {string} config.labelText - Texto del label
     * @param {string} config.placeholder - Placeholder del input
     * @param {string} config.buttonText - Texto del botón
     * @param {Function} config.onSearch - Callback al hacer búsqueda (recibe el valor del input)
     * @param {string} [config.inputWidth='300px'] - Ancho del input
     * @returns {HTMLElement} Contenedor de la sección
     */
    createSearchSection(config) {
        const {
            labelText,
            placeholder,
            buttonText,
            onSearch,
            inputWidth = '300px'
        } = config;
        
        const section = document.createElement('div');
        section.style.cssText = 'margin-top: 20px;';
        
        // Label
        const label = this.createLabel(labelText);
        section.appendChild(label);
        
        // Contenedor para input y botón
        const controlsContainer = document.createElement('div');
        controlsContainer.style.cssText = 'display: flex; align-items: center; gap: 10px; flex-wrap: wrap;';
        
        // Input
        const input = this.createInput({
            placeholder,
            width: inputWidth,
            onChange: null // No onChange, solo cuando se presiona el botón
        });
        controlsContainer.appendChild(input);
        
        // Botón
        const searchBtn = this.createButton(buttonText, () => {
            const value = input.value.trim();
            if (value && onSearch) {
                onSearch(value);
            }
        }, { variant: 'secondary' });
        controlsContainer.appendChild(searchBtn);
        
        section.appendChild(controlsContainer);
        return section;
    }
    
    /**
     * Crear sección con título y contenido
     * @param {string} titleText - Texto del título
     * @param {HTMLElement|Function} content - Contenido o función que retorna contenido
     * @returns {HTMLElement} Contenedor de la sección
     */
    createSection(titleText, content) {
        const section = document.createElement('div');
        section.style.cssText = 'margin-top: 20px;';
        
        if (titleText) {
            const title = this.createTitle(titleText);
            section.appendChild(title);
        }
        
        if (typeof content === 'function') {
            const contentElement = content();
            if (contentElement) {
                section.appendChild(contentElement);
            }
        } else if (content) {
            section.appendChild(content);
        }
        
        return section;
    }
    
    /**
     * Crear select/dropdown reutilizable
     * @param {Object} options - Opciones del select
     * @param {Array|Object} options.options - Array de strings o array de {value, label}
     * @param {string} [options.selected] - Valor seleccionado inicialmente
     * @param {string} [options.width='200px'] - Ancho del select
     * @param {Function} [options.onChange] - Callback al cambiar valor
     * @param {string} [options.placeholder] - Opción placeholder (primera opción)
     * @returns {HTMLSelectElement} Select creado
     */
    createSelect(options = {}) {
        const {
            options: selectOptions = [],
            selected = null,
            width = '200px',
            onChange = null,
            placeholder = null
        } = options;
        
        const select = document.createElement('select');
        select.style.cssText = `
            padding: 8px;
            background: #333;
            border: 1px solid #555;
            color: #fff;
            border-radius: 3px;
            width: ${width};
            font-size: 13px;
            cursor: pointer;
        `;
        
        // Agregar placeholder si existe
        if (placeholder) {
            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = placeholder;
            select.appendChild(placeholderOption);
        }
        
        // Agregar opciones
        selectOptions.forEach(opt => {
            const option = document.createElement('option');
            if (typeof opt === 'string') {
                option.value = opt;
                option.textContent = opt.toUpperCase();
            } else {
                option.value = opt.value;
                option.textContent = opt.label || opt.value;
            }
            
            if (selected !== null && option.value === String(selected)) {
                option.selected = true;
            }
            
            select.appendChild(option);
        });
        
        if (onChange) {
            select.onchange = (e) => onChange(e.target.value);
        }
        
        return select;
    }
    
    /**
     * Crear checkbox con label reutilizable
     * @param {Object} config - Configuración
     * @param {string} config.labelText - Texto del label
     * @param {boolean} [config.checked=false] - Estado inicial
     * @param {Function} [config.onChange] - Callback al cambiar estado
     * @param {string} [config.containerStyle] - Estilos adicionales para el contenedor
     * @returns {Object} Objeto con { checkbox, label, container }
     */
    createCheckbox(config) {
        const {
            labelText,
            checked = false,
            onChange = null,
            containerStyle = null
        } = config;
        
        const container = document.createElement('div');
        if (containerStyle) {
            container.style.cssText = containerStyle;
        }
        
        const label = document.createElement('label');
        label.style.cssText = 'display: flex; align-items: center; color: #ccc; cursor: pointer;';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = checked;
        checkbox.style.cssText = 'margin-right: 8px; width: 18px; height: 18px; cursor: pointer;';
        
        if (onChange) {
            checkbox.onchange = (e) => onChange(e.target.checked);
        }
        
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(` ${labelText}`));
        container.appendChild(label);
        
        return { checkbox, label, container };
    }
    
    /**
     * Crear textarea reutilizable
     * @param {Object} options - Opciones del textarea
     * @param {string} [options.placeholder=''] - Placeholder
     * @param {string} [options.value=''] - Valor inicial
     * @param {string} [options.width='100%'] - Ancho
     * @param {string} [options.maxWidth] - Ancho máximo
     * @param {string} [options.minHeight='100px'] - Altura mínima
     * @param {Function} [options.onChange] - Callback al cambiar valor
     * @returns {HTMLTextAreaElement} Textarea creado
     */
    createTextarea(options = {}) {
        const {
            placeholder = '',
            value = '',
            width = '100%',
            maxWidth = null,
            minHeight = '100px',
            onChange = null
        } = options;
        
        const textarea = document.createElement('textarea');
        textarea.placeholder = placeholder;
        textarea.value = value;
        textarea.style.cssText = `
            width: ${width};
            ${maxWidth ? `max-width: ${maxWidth};` : ''}
            min-height: ${minHeight};
            padding: 10px;
            background: #333;
            border: 1px solid #555;
            color: #fff;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            resize: vertical;
        `;
        
        if (onChange) {
            textarea.oninput = (e) => onChange(e.target.value);
        }
        
        return textarea;
    }
    
    /**
     * Crear caja de resultado reutilizable (título + contenido JSON + botón copiar)
     * @param {Object} config - Configuración
     * @param {string} config.title - Título del resultado
     * @param {*} config.data - Datos a mostrar (se serializan a JSON)
     * @param {boolean} [config.replace=false] - Si reemplazar resultado anterior en contenedor
     * @param {HTMLElement} [config.container] - Contenedor donde agregar (si no se proporciona, retorna el elemento)
     * @returns {HTMLElement} Elemento resultBox creado
     */
    createResultBox(config) {
        const {
            title,
            data,
            replace = false,
            container = null
        } = config;
        
        // Si hay contenedor y replace, eliminar resultado anterior
        if (container && replace) {
            const existing = container.querySelector('.result-box');
            if (existing) {
                existing.remove();
            }
        }
        
        const resultBox = document.createElement('div');
        resultBox.className = 'result-box';
        resultBox.style.cssText = `
            margin-top: 20px;
            padding: 15px;
            background: #1a1a1a;
            border: 1px solid ${this.color};
            border-radius: 5px;
        `;
        
        const resultTitle = document.createElement('h4');
        resultTitle.textContent = title;
        resultTitle.style.cssText = `margin: 0 0 10px 0; color: ${this.color};`;
        resultBox.appendChild(resultTitle);
        
        const resultContent = document.createElement('pre');
        resultContent.style.cssText = `
            margin: 0;
            padding: 10px;
            background: #0a0a0a;
            border-radius: 3px;
            overflow-x: auto;
            color: #0f0;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            max-height: 400px;
            overflow-y: auto;
        `;
        resultContent.textContent = JSON.stringify(data, null, 2);
        resultBox.appendChild(resultContent);
        
        // Botón para copiar
        const copyBtn = this.createButton('Copiar', () => {
            navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
                copyBtn.textContent = 'Copiado!';
                setTimeout(() => {
                    copyBtn.textContent = 'Copiar';
                }, 2000);
            });
        }, { variant: 'secondary', margin: '10px 0 0 0' });
        resultBox.appendChild(copyBtn);
        
        if (container) {
            container.appendChild(resultBox);
            // Scroll al resultado
            resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
        return resultBox;
    }
    
    /**
     * Crear item de lista reutilizable
     * @param {Object} config - Configuración
     * @param {Array} config.columns - Array de { content, style } para columnas
     * @param {Array} [config.actions] - Array de botones de acción { text, onClick, variant }
     * @param {Function} [config.onHover] - Callback al hacer hover
     * @returns {HTMLElement} Item de lista creado
     */
    createListItem(config) {
        const {
            columns = [],
            actions = [],
            onHover = null
        } = config;
        
        const item = document.createElement('div');
        item.style.cssText = `
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 12px;
            background: rgba(45, 45, 45, 0.5);
            border: 1px solid #444;
            border-radius: 4px;
            transition: background 0.2s;
        `;
        
        if (onHover) {
            item.onmouseenter = () => {
                item.style.background = 'rgba(55, 55, 55, 0.7)';
                onHover(true);
            };
            item.onmouseleave = () => {
                item.style.background = 'rgba(45, 45, 45, 0.5)';
                onHover(false);
            };
        } else {
            // Hover por defecto
            item.onmouseenter = () => {
                item.style.background = 'rgba(55, 55, 55, 0.7)';
            };
            item.onmouseleave = () => {
                item.style.background = 'rgba(45, 45, 45, 0.5)';
            };
        }
        
        // Agregar columnas
        columns.forEach(col => {
            const colDiv = document.createElement('div');
            colDiv.textContent = col.content || '';
            colDiv.style.cssText = col.style || 'flex: 1; color: #fff;';
            item.appendChild(colDiv);
        });
        
        // Agregar acciones (botones)
        actions.forEach(action => {
            const btn = this.createButton(action.text, action.onClick, {
                variant: action.variant || 'small'
            });
            item.appendChild(btn);
        });
        
        return item;
    }
    
    /**
     * Crear header de sección con título y botones opcionales
     * @param {Object} config - Configuración
     * @param {string} config.title - Título del header
     * @param {Array} [config.buttons] - Array de botones { text, onClick, variant }
     * @param {string} [config.titleSize='h4'] - Tamaño del título (h3, h4, h5)
     * @returns {HTMLElement} Header creado
     */
    createSectionHeader(config) {
        const {
            title,
            buttons = [],
            titleSize = 'h4'
        } = config;
        
        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;';
        
        const titleElement = document.createElement(titleSize);
        titleElement.textContent = title;
        titleElement.style.cssText = `margin: 0; color: ${this.color}; font-size: ${titleSize === 'h3' ? '16px' : titleSize === 'h4' ? '14px' : '12px'};`;
        header.appendChild(titleElement);
        
        if (buttons.length > 0) {
            const buttonsContainer = document.createElement('div');
            buttonsContainer.style.cssText = 'display: flex; gap: 10px;';
            
            buttons.forEach(btnConfig => {
                const btn = this.createButton(btnConfig.text, btnConfig.onClick, {
                    variant: btnConfig.variant || 'secondary'
                });
                buttonsContainer.appendChild(btn);
            });
            
            header.appendChild(buttonsContainer);
        }
        
        return header;
    }
    
    /**
     * Formatear entrada de log para mostrar
     * @param {Object} logEntry - Entrada de log { timestampISO, level, system, message, data }
     * @returns {string} HTML formateado del log
     */
    formatLogEntry(logEntry) {
        const levelColors = {
            debug: '#888',
            info: '#4CAF50',
            warn: '#ff9800',
            error: '#f44336'
        };
        
        const time = new Date(logEntry.timestampISO).toLocaleTimeString();
        const levelColor = levelColors[logEntry.level] || '#fff';
        
        // Extraer entityId si existe
        const entityId = logEntry.data?.entityId;
        const entityIdDisplay = entityId !== undefined ? 
            `<span style="color: #9C27B0; font-weight: bold;">[Entity:${entityId}]</span>` : 
            '';
        
        const dataText = logEntry.data && Object.keys(logEntry.data).length > 0 ? 
            `<span style="color: #888; margin-left: 10px;">${this.escapeHtml(JSON.stringify(logEntry.data))}</span>` : 
            '';
        
        return `
            <span style="color: #666;">[${time}]</span>
            <span style="color: #888;">[${logEntry.system}]</span>
            ${entityIdDisplay}
            <span style="color: ${levelColor}; font-weight: bold;">[${logEntry.level.toUpperCase()}]</span>
            <span style="color: #fff;">${this.escapeHtml(logEntry.message)}</span>
            ${dataText}
        `;
    }
    
    /**
     * Formatear entrada de log para texto plano (copiar)
     * @param {Object} logEntry - Entrada de log
     * @returns {string} Texto plano formateado
     */
    formatLogEntryText(logEntry) {
        const time = new Date(logEntry.timestampISO).toLocaleTimeString();
        const entityId = logEntry.data?.entityId;
        const entityIdText = entityId !== undefined ? `[Entity:${entityId}] ` : '';
        const dataText = logEntry.data && Object.keys(logEntry.data).length > 0 ? 
            ` ${JSON.stringify(logEntry.data)}` : '';
        
        return `[${time}] [${logEntry.system}] ${entityIdText}[${logEntry.level.toUpperCase()}] ${logEntry.message}${dataText}`;
    }
    
    /**
     * Formatear JSON para mostrar
     * @param {*} data - Datos a formatear
     * @param {number} [indent=2] - Indentación
     * @returns {string} JSON formateado
     */
    formatJSON(data, indent = 2) {
        return JSON.stringify(data, null, indent);
    }
    
    /**
     * Crear contenedor de logs reutilizable
     * @param {Object} options - Opciones
     * @param {number} [options.maxHeight='400px'] - Altura máxima
     * @returns {HTMLElement} Contenedor de logs
     */
    createLogContainer(options = {}) {
        const {
            maxHeight = '400px'
        } = options;
        
        const container = document.createElement('div');
        container.style.cssText = `
            background: #0a0a0a;
            border: 1px solid #444;
            border-radius: 3px;
            padding: 10px;
            max-height: ${maxHeight};
            overflow-y: auto;
            font-family: 'Courier New', monospace;
            font-size: 11px;
        `;
        
        return container;
    }
    
    /**
     * Crear item de log reutilizable
     * @param {Object} logEntry - Entrada de log
     * @param {Function} onCopy - Callback al copiar log
     * @returns {HTMLElement} Item de log creado
     */
    createLogEntry(logEntry, onCopy) {
        const logElement = document.createElement('div');
        logElement.style.cssText = `
            padding: 6px 10px;
            border-bottom: 1px solid #333;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            line-height: 1.4;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        const logContent = document.createElement('div');
        logContent.style.cssText = 'flex: 1;';
        logContent.innerHTML = this.formatLogEntry(logEntry);
        
        const copyBtn = this.createButton('Copiar', onCopy, { 
            variant: 'secondary', 
            margin: '0' 
        });
        copyBtn.style.fontSize = '10px';
        copyBtn.style.padding = '4px 8px';
        
        logElement.appendChild(logContent);
        logElement.appendChild(copyBtn);
        
        return logElement;
    }
    
    /**
     * Crear mensaje de "sin resultados" reutilizable
     * @param {string} message - Mensaje a mostrar
     * @returns {HTMLElement} Elemento de mensaje
     */
    createNoResultsMessage(message) {
        const noResults = document.createElement('div');
        noResults.textContent = message;
        noResults.style.cssText = 'color: #888; padding: 20px; text-align: center;';
        return noResults;
    }
    
    /**
     * Crear párrafo de información reutilizable
     * @param {string} text - Texto del párrafo
     * @param {string} [margin='5px 0 15px 0'] - Margen
     * @returns {HTMLParagraphElement} Párrafo creado
     */
    createInfoParagraph(text, margin = '5px 0 15px 0') {
        const info = document.createElement('p');
        info.textContent = text;
        info.style.cssText = `color: #aaa; margin: ${margin};`;
        return info;
    }
    
    /**
     * Crear contenedor de sección con estilos comunes
     * @param {Object} options - Opciones
     * @param {string} [options.margin='20px 0'] - Margen
     * @param {string} [options.padding] - Padding
     * @param {string} [options.background] - Color de fondo
     * @param {string} [options.borderTop] - Borde superior (ej: '1px solid #444')
     * @param {string} [options.borderRadius] - Radio de borde (ej: '5px')
     * @returns {HTMLElement} Contenedor de sección
     */
    createSectionContainer(options = {}) {
        const {
            margin = '20px 0',
            padding = null,
            background = null,
            borderTop = null,
            borderRadius = null
        } = options;
        
        const section = document.createElement('div');
        let style = `margin: ${margin};`;
        if (padding) style += ` padding: ${padding};`;
        if (background) style += ` background: ${background};`;
        if (borderTop) style += ` border-top: ${borderTop};`;
        if (borderTop && padding === null) style += ` padding-top: 20px;`;
        if (borderRadius) style += ` border-radius: ${borderRadius};`;
        
        section.style.cssText = style;
        return section;
    }
    
    /**
     * Crear contenedor flex para controles
     * @param {Object} options - Opciones
     * @param {string} [options.gap='10px'] - Espacio entre elementos
     * @param {string} [options.margin] - Margen
     * @param {string} [options.direction='row'] - Dirección (row/column)
     * @returns {HTMLElement} Contenedor flex
     */
    createFlexContainer(options = {}) {
        const {
            gap = '10px',
            margin = null,
            direction = 'row'
        } = options;
        
        const container = document.createElement('div');
        let style = `display: flex; flex-direction: ${direction}; align-items: center; gap: ${gap}; flex-wrap: wrap;`;
        if (margin) style += ` margin: ${margin};`;
        container.style.cssText = style;
        return container;
    }
    
    /**
     * Crear patrón "Acción + Resultado" reutilizable
     * Crea un botón que ejecuta una acción y muestra el resultado
     * @param {Object} config - Configuración
     * @param {string} config.buttonText - Texto del botón
     * @param {Function} config.onAction - Función que retorna los datos a mostrar
     * @param {string} config.resultTitle - Título del resultado
     * @param {Function} [config.onError] - Función de error personalizada
     * @param {string} [config.buttonVariant='primary'] - Variante del botón
     * @param {string} [config.margin] - Margen del botón
     * @returns {HTMLElement} Contenedor con botón
     */
    createActionResultPattern(config) {
        const {
            buttonText,
            onAction,
            resultTitle,
            onError = null,
            buttonVariant = 'primary',
            margin = '0 0 15px 0'
        } = config;
        
        const container = document.createElement('div');
        
        const btn = this.createButton(buttonText, () => {
            try {
                const data = onAction();
                if (data !== null && data !== undefined) {
                    this.showResult(container, resultTitle, data);
                } else {
                    const errorMsg = onError ? onError() : 'No hay datos disponibles';
                    this.showError(container, errorMsg);
                }
            } catch (error) {
                const errorMsg = onError ? onError(error) : `Error: ${error.message}`;
                this.showError(container, errorMsg);
            }
        }, { variant: buttonVariant, margin });
        
        container.appendChild(btn);
        return container;
    }
    
    /**
     * Crear contenedor de tab base (título + contenido)
     * @param {string} title - Título del tab
     * @param {Array|Function} content - Array de elementos o función que retorna elementos
     * @returns {HTMLElement} Contenedor del tab
     */
    createTabContainer(title, content) {
        const container = document.createElement('div');
        container.appendChild(this.createTitle(title));
        
        if (typeof content === 'function') {
            const elements = content();
            if (Array.isArray(elements)) {
                elements.forEach(el => container.appendChild(el));
            } else if (elements) {
                container.appendChild(elements);
            }
        } else if (Array.isArray(content)) {
            content.forEach(el => container.appendChild(el));
        } else if (content) {
            container.appendChild(content);
        }
        
        return container;
    }
    
    /**
     * Destruir interfaz
     */
    destroy() {
        // Desbloquear input antes de destruir
        this.unblockGameInput();
        
        // Remover event listener de resize
        if (this.resizeWindowHandler) {
            window.removeEventListener('resize', this.resizeWindowHandler);
            this.resizeWindowHandler = null;
        }
        
        if (this.interfaceElement && this.interfaceElement.parentNode) {
            this.interfaceElement.parentNode.removeChild(this.interfaceElement);
        }
    }
}
