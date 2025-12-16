/**
 * Interfaz GUI de debugging
 * Se activa con F4 y proporciona una interfaz visual para usar las herramientas de debugging
 */
import { DEBUG_CONFIG } from '../config.js';

export class DebugInterface {
    constructor(app, ecs) {
        this.app = app;
        this.ecs = ecs;
        const config = DEBUG_CONFIG.ui;
        this.enabled = config.enabled && DEBUG_CONFIG.enabled;
        this.toggleKey = 'F4';
        
        this.visible = false;
        this.interfaceElement = null;
        this.inputBlocked = false;
        this.logHistory = []; // Historial de logs para mostrar en la interfaz
        this.maxLogHistory = 500; // Máximo de logs a mantener
        this.logContainer = null; // Contenedor donde se muestran los logs
        this.panelCheckbox = null; // Checkbox para controlar el panel F3
        this.entityFilterId = null; // ID de entidad para filtrar logs visualmente
        
        console.log('[DebugInterface] Constructor llamado, enabled:', this.enabled);
        console.log('[DebugInterface] config.enabled:', config.enabled);
        console.log('[DebugInterface] DEBUG_CONFIG.enabled:', DEBUG_CONFIG.enabled);
        
        if (this.enabled) {
            try {
                this.init();
                console.log('[DebugInterface] Inicialización completada');
            } catch (error) {
                console.error('[DebugInterface] Error al inicializar:', error);
            }
        } else {
            console.warn('[DebugInterface] Deshabilitado - no se inicializará');
        }
    }
    
    /**
     * Inicializar interfaz
     */
    init() {
        // Crear contenedor principal
        this.interfaceElement = document.createElement('div');
        this.interfaceElement.id = 'debug-interface';
        this.interfaceElement.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 400px;
            background: rgba(20, 20, 20, 0.75);
            color: #fff;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 13px;
            display: none;
            flex-direction: column;
            z-index: 10001;
            border-top: 3px solid #4CAF50;
            box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
        `;
        
        // Crear header
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
        title.textContent = 'Debug Tools';
        title.style.cssText = 'margin: 0; color: #4CAF50; font-size: 16px;';
        header.appendChild(title);
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Cerrar (F4)';
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
        
        // Crear contenido principal (tabs)
        const content = document.createElement('div');
        content.style.cssText = 'flex: 1; display: flex; overflow: hidden;';
        
        // Sidebar con tabs
        const sidebar = document.createElement('div');
        sidebar.style.cssText = `
            width: 200px;
            background: rgba(37, 37, 37, 0.85);
            border-right: 1px solid #444;
            padding: 10px 0;
            overflow-y: auto;
        `;
        
        // Área de contenido
        const mainContent = document.createElement('div');
        mainContent.style.cssText = 'flex: 1; overflow-y: auto; padding: 15px;';
        mainContent.id = 'debug-interface-content';
        
        content.appendChild(sidebar);
        content.appendChild(mainContent);
        this.interfaceElement.appendChild(content);
        
        // Crear tabs
        this.createTabs(sidebar, mainContent);
        
        document.body.appendChild(this.interfaceElement);
        console.log('[DebugInterface] Elemento DOM agregado al body:', this.interfaceElement.id);
        
        // Toggle con F4 (usar capture phase para que funcione incluso cuando el input está bloqueado)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F4') {
                e.preventDefault();
                e.stopPropagation();
                console.log('[DebugInterface] F4 presionado, visible actual:', this.visible);
                this.toggle();
            }
        }, true); // Usar capture phase
        
        console.log('[DebugInterface] Inicialización completa. Presiona F4 para mostrar.');
        
        // Suscribirse al logger cuando esté disponible (puede que aún no esté inicializado)
        this.setupLoggerSubscription();
    }
    
    /**
     * Configurar suscripción al logger
     */
    setupLoggerSubscription() {
        // Intentar suscribirse inmediatamente
        if (window.debugTools?.logger) {
            window.debugTools.logger.subscribe(this.handleLogEntry.bind(this));
            return;
        }
        
        // Si no está disponible, intentar después de un breve delay
        setTimeout(() => {
            if (window.debugTools?.logger) {
                window.debugTools.logger.subscribe(this.handleLogEntry.bind(this));
            } else {
                // Si aún no está disponible, intentar cada 100ms hasta 5 segundos
                let attempts = 0;
                const maxAttempts = 50;
                const checkInterval = setInterval(() => {
                    attempts++;
                    if (window.debugTools?.logger) {
                        window.debugTools.logger.subscribe(this.handleLogEntry.bind(this));
                        clearInterval(checkInterval);
                    } else if (attempts >= maxAttempts) {
                        clearInterval(checkInterval);
                        console.warn('[DebugInterface] No se pudo suscribir al logger');
                    }
                }, 100);
            }
        }, 100);
    }
    
    /**
     * Manejar entrada de log del logger
     * @param {Object} logEntry - Entrada de log { timestamp, level, system, message, data }
     */
    handleLogEntry(logEntry) {
        // Agregar al historial
        this.logHistory.push(logEntry);
        
        // Limitar tamaño del historial
        if (this.logHistory.length > this.maxLogHistory) {
            this.logHistory.shift(); // Remover el más antiguo
        }
        
        // Si el contenedor de logs existe y está visible, actualizar
        if (this.logContainer) {
            // Filtrar por entityId si hay un filtro activo
            if (this.entityFilterId !== null) {
                const logEntityId = logEntry.data?.entityId;
                if (logEntityId === undefined || logEntityId !== this.entityFilterId) {
                    return; // No mostrar este log
                }
            }
            this.appendLogToContainer(logEntry);
        }
    }
    
    /**
     * Agregar un log al contenedor visual
     * @param {Object} logEntry - Entrada de log
     */
    appendLogToContainer(logEntry) {
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
        
        // Contenedor para el contenido del log
        const logContent = document.createElement('div');
        logContent.style.cssText = 'flex: 1;';
        
        // Color según nivel
        const levelColors = {
            debug: '#888',
            info: '#4CAF50',
            warn: '#ff9800',
            error: '#f44336'
        };
        
        const time = new Date(logEntry.timestampISO).toLocaleTimeString();
        const levelColor = levelColors[logEntry.level] || '#fff';
        
        // Extraer entityId si existe para mostrarlo
        const entityId = logEntry.data?.entityId;
        const entityIdDisplay = entityId !== undefined ? 
            `<span style="color: #9C27B0; font-weight: bold;">[Entity:${entityId}]</span>` : 
            '';
        
        logContent.innerHTML = `
            <span style="color: #666;">[${time}]</span>
            <span style="color: #888;">[${logEntry.system}]</span>
            ${entityIdDisplay}
            <span style="color: ${levelColor}; font-weight: bold;">[${logEntry.level.toUpperCase()}]</span>
            <span style="color: #fff;">${this.escapeHtml(logEntry.message)}</span>
            ${logEntry.data && Object.keys(logEntry.data).length > 0 ? 
                `<span style="color: #888; margin-left: 10px;">${this.escapeHtml(JSON.stringify(logEntry.data))}</span>` : 
                ''}
        `;
        
        // Botón para copiar este log
        const copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copiar';
        copyBtn.style.cssText = `
            background: #2196F3;
            color: white;
            border: none;
            padding: 4px 8px;
            cursor: pointer;
            border-radius: 3px;
            font-size: 10px;
            white-space: nowrap;
        `;
        copyBtn.onclick = () => {
            this.copyLogToClipboard(logEntry);
        };
        
        logElement.appendChild(logContent);
        logElement.appendChild(copyBtn);
        
        this.logContainer.appendChild(logElement);
        
        // Auto-scroll al final si está cerca del final
        const isNearBottom = this.logContainer.scrollHeight - this.logContainer.scrollTop <= this.logContainer.clientHeight + 50;
        if (isNearBottom) {
            this.logContainer.scrollTop = this.logContainer.scrollHeight;
        }
    }
    
    /**
     * Copiar un log individual al portapapeles
     * @param {Object} logEntry - Entrada de log
     */
    copyLogToClipboard(logEntry) {
        const time = new Date(logEntry.timestampISO).toLocaleTimeString();
        const entityId = logEntry.data?.entityId;
        const entityIdText = entityId !== undefined ? `[Entity:${entityId}] ` : '';
        const dataText = logEntry.data && Object.keys(logEntry.data).length > 0 ? 
            ` ${JSON.stringify(logEntry.data)}` : '';
        
        const logText = `[${time}] [${logEntry.system}] ${entityIdText}[${logEntry.level.toUpperCase()}] ${logEntry.message}${dataText}`;
        
        navigator.clipboard.writeText(logText).then(() => {
            this.showInfo(this.logContainer.parentElement, 'Log copiado al portapapeles');
        }).catch(err => {
            console.error('Error al copiar log:', err);
            this.showError(this.logContainer.parentElement, 'Error al copiar log');
        });
    }
    
    /**
     * Copiar todos los logs al portapapeles
     */
    copyAllLogsToClipboard() {
        if (!this.logHistory || this.logHistory.length === 0) {
            this.showInfo(this.logContainer.parentElement, 'No hay logs para copiar');
            return;
        }
        
        // Filtrar logs si hay filtro de entidad activo
        let logsToCopy = this.logHistory;
        if (this.entityFilterId !== null) {
            logsToCopy = this.logHistory.filter(logEntry => {
                const logEntityId = logEntry.data?.entityId;
                return logEntityId !== undefined && logEntityId === this.entityFilterId;
            });
        }
        
        if (logsToCopy.length === 0) {
            this.showInfo(this.logContainer.parentElement, 'No hay logs para copiar con el filtro actual');
            return;
        }
        
        // Formatear todos los logs
        const logsText = logsToCopy.map(logEntry => {
            const time = new Date(logEntry.timestampISO).toLocaleTimeString();
            const entityId = logEntry.data?.entityId;
            const entityIdText = entityId !== undefined ? `[Entity:${entityId}] ` : '';
            const dataText = logEntry.data && Object.keys(logEntry.data).length > 0 ? 
                ` ${JSON.stringify(logEntry.data)}` : '';
            
            return `[${time}] [${logEntry.system}] ${entityIdText}[${logEntry.level.toUpperCase()}] ${logEntry.message}${dataText}`;
        }).join('\n');
        
        navigator.clipboard.writeText(logsText).then(() => {
            this.showInfo(this.logContainer.parentElement, `${logsToCopy.length} logs copiados al portapapeles`);
        }).catch(err => {
            console.error('Error al copiar logs:', err);
            this.showError(this.logContainer.parentElement, 'Error al copiar logs');
        });
    }
    
    /**
     * Escapar HTML para prevenir XSS
     * @param {string} text - Texto a escapar
     * @returns {string} Texto escapado
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Crear tabs de la interfaz
     * @param {HTMLElement} sidebar - Sidebar donde se muestran los tabs
     * @param {HTMLElement} mainContent - Área de contenido principal
     */
    createTabs(sidebar, mainContent) {
        const tabs = [
            { id: 'inspector', label: 'Inspector', content: this.createInspectorTab.bind(this) },
            { id: 'metrics', label: 'Métricas', content: this.createMetricsTab.bind(this) },
            { id: 'events', label: 'Eventos', content: this.createEventsTab.bind(this) },
            { id: 'logger', label: 'Logger', content: this.createLoggerTab.bind(this) },
            { id: 'commands', label: 'Comandos', content: this.createCommandsTab.bind(this) }
        ];
        
        let activeTab = tabs[0].id;
        
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
                sidebar.querySelectorAll('button').forEach(btn => {
                    btn.style.background = 'transparent';
                    btn.style.borderLeft = '3px solid transparent';
                    btn.style.color = '#ccc';
                });
                tabButton.style.background = '#1a1a1a';
                tabButton.style.borderLeft = '3px solid #4CAF50';
                tabButton.style.color = '#4CAF50';
                
                // Mostrar contenido del tab
                mainContent.innerHTML = '';
                const content = tab.content();
                mainContent.appendChild(content);
            };
            
            sidebar.appendChild(tabButton);
            
            // Activar primer tab
            if (tab.id === tabs[0].id) {
                tabButton.click();
            }
        });
    }
    
    /**
     * Crear tab de Inspector
     * @returns {HTMLElement} Contenido del tab
     */
    createInspectorTab() {
        const container = document.createElement('div');
        
        const title = document.createElement('h3');
        title.textContent = 'Inspector de Estado ECS';
        title.style.cssText = 'margin-top: 0; color: #4CAF50;';
        container.appendChild(title);
        
        // Botón para obtener estadísticas
        const statsBtn = document.createElement('button');
        statsBtn.textContent = 'Obtener Estadísticas del ECS';
        statsBtn.style.cssText = `
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            cursor: pointer;
            border-radius: 5px;
            margin-bottom: 15px;
            font-size: 14px;
        `;
        statsBtn.onclick = () => {
            const stats = window.debugTools?.inspector?.getStats();
            if (stats) {
                this.showResult(container, 'Estadísticas del ECS', stats);
            } else {
                this.showError(container, 'Inspector no disponible');
            }
        };
        container.appendChild(statsBtn);
        
        // Buscar entidades
        const searchSection = document.createElement('div');
        searchSection.style.cssText = 'margin-top: 20px;';
        
        const searchLabel = document.createElement('label');
        searchLabel.textContent = 'Buscar entidades por componente:';
        searchLabel.style.cssText = 'display: block; margin-bottom: 5px; color: #ccc;';
        searchSection.appendChild(searchLabel);
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Ej: Animation, Combat, Input';
        searchInput.style.cssText = `
            width: 300px;
            padding: 8px;
            background: #333;
            border: 1px solid #555;
            color: #fff;
            border-radius: 3px;
            margin-right: 10px;
        `;
        searchSection.appendChild(searchInput);
        
        const searchBtn = document.createElement('button');
        searchBtn.textContent = 'Buscar';
        searchBtn.style.cssText = `
            background: #2196F3;
            color: white;
            border: none;
            padding: 8px 15px;
            cursor: pointer;
            border-radius: 3px;
        `;
        searchBtn.onclick = () => {
            const component = searchInput.value.trim();
            if (component) {
                const results = window.debugTools?.inspector?.findEntities({ hasComponent: component });
                if (results) {
                    this.showResult(container, `Entidades con componente '${component}'`, results);
                } else {
                    this.showError(container, 'Inspector no disponible');
                }
            }
        };
        searchSection.appendChild(searchBtn);
        container.appendChild(searchSection);
        
        // Inspeccionar entidad específica
        const inspectSection = document.createElement('div');
        inspectSection.style.cssText = 'margin-top: 20px;';
        
        const inspectLabel = document.createElement('label');
        inspectLabel.textContent = 'Inspeccionar entidad por ID:';
        inspectLabel.style.cssText = 'display: block; margin-bottom: 5px; color: #ccc;';
        inspectSection.appendChild(inspectLabel);
        
        const inspectInput = document.createElement('input');
        inspectInput.type = 'number';
        inspectInput.placeholder = 'ID de entidad (ej: 1)';
        inspectInput.style.cssText = `
            width: 200px;
            padding: 8px;
            background: #333;
            border: 1px solid #555;
            color: #fff;
            border-radius: 3px;
            margin-right: 10px;
        `;
        inspectSection.appendChild(inspectInput);
        
        const inspectBtn = document.createElement('button');
        inspectBtn.textContent = 'Inspeccionar';
        inspectBtn.style.cssText = `
            background: #2196F3;
            color: white;
            border: none;
            padding: 8px 15px;
            cursor: pointer;
            border-radius: 3px;
        `;
        inspectBtn.onclick = () => {
            const entityId = parseInt(inspectInput.value);
            if (!isNaN(entityId)) {
                const result = window.debugTools?.inspector?.inspectEntity(entityId);
                if (result) {
                    this.showResult(container, `Entidad ${entityId}`, result);
                } else {
                    this.showError(container, `Entidad ${entityId} no encontrada o inspector no disponible`);
                }
            }
        };
        inspectSection.appendChild(inspectBtn);
        container.appendChild(inspectSection);
        
        return container;
    }
    
    /**
     * Crear tab de Métricas
     * @returns {HTMLElement} Contenido del tab
     */
    createMetricsTab() {
        const container = document.createElement('div');
        
        const title = document.createElement('h3');
        title.textContent = 'Métricas de Performance';
        title.style.cssText = 'margin-top: 0; color: #4CAF50;';
        container.appendChild(title);
        
        // Botón para obtener métricas
        const metricsBtn = document.createElement('button');
        metricsBtn.textContent = 'Obtener Métricas';
        metricsBtn.style.cssText = `
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            cursor: pointer;
            border-radius: 5px;
            margin-bottom: 15px;
            font-size: 14px;
        `;
        metricsBtn.onclick = () => {
            const metrics = window.debugTools?.metrics?.getStats();
            if (metrics) {
                this.showResult(container, 'Métricas de Performance', metrics);
            } else {
                this.showError(container, 'Métricas no disponibles');
            }
        };
        container.appendChild(metricsBtn);
        
        // Botón para resetear métricas
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Resetear Métricas';
        resetBtn.style.cssText = `
            background: #ff9800;
            color: white;
            border: none;
            padding: 10px 20px;
            cursor: pointer;
            border-radius: 5px;
            margin-left: 10px;
            font-size: 14px;
        `;
        resetBtn.onclick = () => {
            window.debugTools?.metrics?.reset();
            this.showInfo(container, 'Métricas reseteadas');
        };
        container.appendChild(resetBtn);
        
        // Auto-refresh
        const autoRefreshLabel = document.createElement('label');
        autoRefreshLabel.style.cssText = 'display: flex; align-items: center; margin-top: 15px; color: #ccc; cursor: pointer;';
        
        const autoRefreshCheck = document.createElement('input');
        autoRefreshCheck.type = 'checkbox';
        autoRefreshCheck.style.cssText = 'margin-right: 8px;';
        
        let autoRefreshInterval = null;
        autoRefreshCheck.onchange = (e) => {
            if (e.target.checked) {
                autoRefreshInterval = setInterval(() => {
                    const metrics = window.debugTools?.metrics?.getStats();
                    if (metrics) {
                        this.showResult(container, 'Métricas de Performance (Auto-refresh)', metrics, true);
                    }
                }, 2000);
            } else {
                if (autoRefreshInterval) {
                    clearInterval(autoRefreshInterval);
                    autoRefreshInterval = null;
                }
            }
        };
        
        autoRefreshLabel.appendChild(autoRefreshCheck);
        autoRefreshLabel.appendChild(document.createTextNode(' Auto-refresh cada 2 segundos'));
        container.appendChild(autoRefreshLabel);
        
        return container;
    }
    
    /**
     * Crear tab de Eventos
     * @returns {HTMLElement} Contenido del tab
     */
    createEventsTab() {
        const container = document.createElement('div');
        
        const title = document.createElement('h3');
        title.textContent = 'Sistema de Eventos';
        title.style.cssText = 'margin-top: 0; color: #4CAF50;';
        container.appendChild(title);
        
        // Ver historial
        const historyBtn = document.createElement('button');
        historyBtn.textContent = 'Ver Historial de Eventos';
        historyBtn.style.cssText = `
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            cursor: pointer;
            border-radius: 5px;
            margin-bottom: 15px;
            font-size: 14px;
        `;
        historyBtn.onclick = () => {
            const history = window.debugTools?.events?.getHistory();
            if (history) {
                this.showResult(container, 'Historial de Eventos', history);
            } else {
                this.showError(container, 'Eventos no disponibles');
            }
        };
        container.appendChild(historyBtn);
        
        // Filtrar por evento
        const filterSection = document.createElement('div');
        filterSection.style.cssText = 'margin-top: 20px;';
        
        const filterLabel = document.createElement('label');
        filterLabel.textContent = 'Filtrar por nombre de evento:';
        filterLabel.style.cssText = 'display: block; margin-bottom: 5px; color: #ccc;';
        filterSection.appendChild(filterLabel);
        
        const filterInput = document.createElement('input');
        filterInput.type = 'text';
        filterInput.placeholder = 'Ej: combat:action:started';
        filterInput.style.cssText = `
            width: 300px;
            padding: 8px;
            background: #333;
            border: 1px solid #555;
            color: #fff;
            border-radius: 3px;
            margin-right: 10px;
        `;
        filterSection.appendChild(filterInput);
        
        const filterBtn = document.createElement('button');
        filterBtn.textContent = 'Filtrar';
        filterBtn.style.cssText = `
            background: #2196F3;
            color: white;
            border: none;
            padding: 8px 15px;
            cursor: pointer;
            border-radius: 3px;
        `;
        filterBtn.onclick = () => {
            const eventName = filterInput.value.trim();
            if (eventName) {
                const filtered = window.debugTools?.events?.getHistory(eventName);
                if (filtered) {
                    this.showResult(container, `Eventos: ${eventName}`, filtered);
                } else {
                    this.showError(container, 'Eventos no disponibles');
                }
            }
        };
        filterSection.appendChild(filterBtn);
        container.appendChild(filterSection);
        
        // Limpiar historial
        const clearBtn = document.createElement('button');
        clearBtn.textContent = 'Limpiar Historial';
        clearBtn.style.cssText = `
            background: #f44336;
            color: white;
            border: none;
            padding: 10px 20px;
            cursor: pointer;
            border-radius: 5px;
            margin-top: 15px;
            font-size: 14px;
        `;
        clearBtn.onclick = () => {
            window.debugTools?.events?.clearHistory();
            this.showInfo(container, 'Historial limpiado');
        };
        container.appendChild(clearBtn);
        
        return container;
    }
    
    /**
     * Crear tab de Logger
     * @returns {HTMLElement} Contenido del tab
     */
    createLoggerTab() {
        const container = document.createElement('div');
        
        const title = document.createElement('h3');
        title.textContent = 'Sistema de Logging';
        title.style.cssText = 'margin-top: 0; color: #4CAF50;';
        container.appendChild(title);
        
        // Control del Debug Panel (F3)
        const panelSection = document.createElement('div');
        panelSection.style.cssText = 'margin-bottom: 20px; padding: 10px; background: rgba(45, 45, 45, 0.5); border-radius: 5px;';
        
        const panelLabel = document.createElement('label');
        panelLabel.style.cssText = 'display: flex; align-items: center; color: #ccc; cursor: pointer;';
        
        const panelCheck = document.createElement('input');
        panelCheck.type = 'checkbox';
        panelCheck.style.cssText = 'margin-right: 8px; width: 18px; height: 18px; cursor: pointer;';
        
        // Guardar referencia al checkbox
        this.panelCheckbox = panelCheck;
        
        // Verificar estado inicial del panel
        if (window.debugTools?.panel) {
            panelCheck.checked = window.debugTools.panel.visible;
            
            // Sincronizar cuando el panel cambia desde F3
            const originalToggle = window.debugTools.panel.toggle.bind(window.debugTools.panel);
            window.debugTools.panel.toggle = () => {
                originalToggle();
                if (this.panelCheckbox) {
                    this.panelCheckbox.checked = window.debugTools.panel.visible;
                }
            };
        }
        
        panelCheck.onchange = (e) => {
            if (window.debugTools?.panel) {
                if (e.target.checked && !window.debugTools.panel.visible) {
                    window.debugTools.panel.toggle();
                } else if (!e.target.checked && window.debugTools.panel.visible) {
                    window.debugTools.panel.toggle();
                }
            }
        };
        
        panelLabel.appendChild(panelCheck);
        panelLabel.appendChild(document.createTextNode(' Mostrar Debug Panel (F3)'));
        panelSection.appendChild(panelLabel);
        container.appendChild(panelSection);
        
        // Control de nivel
        const levelSection = document.createElement('div');
        levelSection.style.cssText = 'margin-bottom: 20px;';
        
        const levelLabel = document.createElement('label');
        levelLabel.textContent = 'Nivel de log:';
        levelLabel.style.cssText = 'display: block; margin-bottom: 5px; color: #ccc;';
        levelSection.appendChild(levelLabel);
        
        const levelSelect = document.createElement('select');
        levelSelect.style.cssText = `
            padding: 8px;
            background: #333;
            border: 1px solid #555;
            color: #fff;
            border-radius: 3px;
            width: 200px;
        `;
        ['debug', 'info', 'warn', 'error'].forEach(level => {
            const option = document.createElement('option');
            option.value = level;
            option.textContent = level.toUpperCase();
            if (level === window.debugTools?.logger?.level) {
                option.selected = true;
            }
            levelSelect.appendChild(option);
        });
        levelSelect.onchange = (e) => {
            if (window.debugTools?.logger) {
                window.debugTools.logger.level = e.target.value;
                this.showInfo(container, `Nivel de log cambiado a: ${e.target.value}`);
            }
        };
        levelSection.appendChild(levelSelect);
        container.appendChild(levelSection);
        
        // Filtro por entidad (filtrado visual, no afecta la generación de logs)
        const entityFilterSection = document.createElement('div');
        entityFilterSection.style.cssText = 'margin-bottom: 20px;';
        
        const entityFilterLabel = document.createElement('label');
        entityFilterLabel.textContent = 'Filtrar logs por entidad (ID):';
        entityFilterLabel.style.cssText = 'display: block; margin-bottom: 5px; color: #ccc;';
        entityFilterSection.appendChild(entityFilterLabel);
        
        // Contenedor para selector y botones
        const entityFilterControls = document.createElement('div');
        entityFilterControls.style.cssText = 'display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px;';
        
        // Selector de entidades
        const entitySelect = document.createElement('select');
        entitySelect.style.cssText = `
            width: 250px;
            padding: 8px;
            background: #333;
            border: 1px solid #555;
            color: #fff;
            border-radius: 3px;
        `;
        entitySelect.innerHTML = '<option value="">Todas las entidades</option>';
        entitySelect.onchange = (e) => {
            const selectedId = e.target.value;
            if (selectedId) {
                const entityId = parseInt(selectedId);
                this.entityFilterId = entityId;
                this.refreshLogsDisplay();
                this.showInfo(container, `Mostrando solo logs de entidad: ${entityId}`);
            } else {
                this.entityFilterId = null;
                this.refreshLogsDisplay();
                this.showInfo(container, 'Filtro de entidad limpiado');
            }
        };
        entityFilterControls.appendChild(entitySelect);
        
        const clearEntityFilterBtn = document.createElement('button');
        clearEntityFilterBtn.textContent = 'Limpiar filtro';
        clearEntityFilterBtn.style.cssText = `
            background: #666;
            color: white;
            border: none;
            padding: 8px 15px;
            cursor: pointer;
            border-radius: 3px;
            font-size: 12px;
        `;
        clearEntityFilterBtn.onclick = () => {
            entitySelect.value = '';
            this.entityFilterId = null;
            this.refreshLogsDisplay();
            this.showInfo(container, 'Filtro de entidad limpiado');
        };
        entityFilterControls.appendChild(clearEntityFilterBtn);
        
        const viewEntitiesBtn = document.createElement('button');
        viewEntitiesBtn.textContent = 'Ver entidades disponibles';
        viewEntitiesBtn.style.cssText = `
            background: #2196F3;
            color: white;
            border: none;
            padding: 8px 15px;
            cursor: pointer;
            border-radius: 3px;
            font-size: 12px;
        `;
        viewEntitiesBtn.onclick = () => {
            this.showAvailableEntities(container);
        };
        entityFilterControls.appendChild(viewEntitiesBtn);
        
        entityFilterSection.appendChild(entityFilterControls);
        
        // Cargar entidades al crear el tab
        this.updateEntityList(entitySelect, null);
        
        container.appendChild(entityFilterSection);
        
        // Probar logger
        const testSection = document.createElement('div');
        testSection.style.cssText = 'margin-top: 20px;';
        
        const testLabel = document.createElement('label');
        testLabel.textContent = 'Probar logger:';
        testLabel.style.cssText = 'display: block; margin-bottom: 5px; color: #ccc;';
        testSection.appendChild(testLabel);
        
        const testInput = document.createElement('input');
        testInput.type = 'text';
        testInput.placeholder = 'Mensaje de prueba';
        testInput.style.cssText = `
            width: 300px;
            padding: 8px;
            background: #333;
            border: 1px solid #555;
            color: #fff;
            border-radius: 3px;
            margin-right: 10px;
        `;
        testSection.appendChild(testInput);
        
        const testBtn = document.createElement('button');
        testBtn.textContent = 'Probar';
        testBtn.style.cssText = `
            background: #2196F3;
            color: white;
            border: none;
            padding: 8px 15px;
            cursor: pointer;
            border-radius: 3px;
        `;
        testBtn.onclick = () => {
            const message = testInput.value.trim();
            if (message && window.debugTools?.logger) {
                window.debugTools.logger.info('DebugInterface', message, { test: true });
                this.showInfo(container, `Mensaje enviado: "${message}"`);
            }
        };
        testSection.appendChild(testBtn);
        container.appendChild(testSection);
        
        // Área de logs en tiempo real
        const logsSection = document.createElement('div');
        logsSection.style.cssText = 'margin-top: 30px; padding-top: 20px; border-top: 1px solid #444;';
        
        const logsHeader = document.createElement('div');
        logsHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;';
        
        const logsTitle = document.createElement('h4');
        logsTitle.textContent = 'Logs en Tiempo Real';
        logsTitle.style.cssText = 'margin: 0; color: #4CAF50; font-size: 14px;';
        logsHeader.appendChild(logsTitle);
        
        // Contenedor para botones
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText = 'display: flex; gap: 10px;';
        
        const copyAllBtn = document.createElement('button');
        copyAllBtn.textContent = 'Copiar todos';
        copyAllBtn.style.cssText = `
            background: #4CAF50;
            color: white;
            border: none;
            padding: 5px 15px;
            cursor: pointer;
            border-radius: 3px;
            font-size: 12px;
        `;
        copyAllBtn.onclick = () => {
            this.copyAllLogsToClipboard();
        };
        buttonsContainer.appendChild(copyAllBtn);
        
        const clearLogsBtn = document.createElement('button');
        clearLogsBtn.textContent = 'Limpiar';
        clearLogsBtn.style.cssText = `
            background: #f44336;
            color: white;
            border: none;
            padding: 5px 15px;
            cursor: pointer;
            border-radius: 3px;
            font-size: 12px;
        `;
        clearLogsBtn.onclick = () => {
            this.logHistory = [];
            if (this.logContainer) {
                this.logContainer.innerHTML = '';
            }
        };
        buttonsContainer.appendChild(clearLogsBtn);
        
        logsHeader.appendChild(buttonsContainer);
        logsSection.appendChild(logsHeader);
        
        // Contenedor de logs
        this.logContainer = document.createElement('div');
        this.logContainer.style.cssText = `
            background: #0a0a0a;
            border: 1px solid #444;
            border-radius: 3px;
            padding: 10px;
            max-height: 400px;
            overflow-y: auto;
            font-family: 'Courier New', monospace;
            font-size: 11px;
        `;
        
        // Cargar logs existentes (ya se filtrarán automáticamente si hay filtro activo)
        this.refreshLogsDisplay();
        
        logsSection.appendChild(this.logContainer);
        container.appendChild(logsSection);
        
        return container;
    }
    
    /**
     * Refrescar la visualización de logs aplicando filtros
     */
    refreshLogsDisplay() {
        if (!this.logContainer) return;
        
        // Limpiar contenedor
        this.logContainer.innerHTML = '';
        
        // Filtrar y mostrar logs
        this.logHistory.forEach(logEntry => {
            // Aplicar filtro de entidad si está activo
            if (this.entityFilterId !== null) {
                const logEntityId = logEntry.data?.entityId;
                if (logEntityId === undefined || logEntityId !== this.entityFilterId) {
                    return; // Saltar este log
                }
            }
            this.appendLogToContainer(logEntry);
        });
        
        // Scroll al final
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }
    
    /**
     * Actualizar la lista de entidades disponibles en el selector
     * @param {HTMLSelectElement} selectElement - Elemento select
     */
    updateEntityList(selectElement) {
        if (!selectElement || !window.debugTools?.inspector) return;
        
        try {
            const entities = this.ecs.query();
            const entityArray = Array.from(entities).sort((a, b) => a - b);
            
            // Guardar valor actual
            const currentValue = selectElement.value;
            
            // Limpiar opciones (excepto la primera)
            selectElement.innerHTML = '<option value="">Todas las entidades</option>';
            
            // Agregar entidades
            entityArray.forEach(entityId => {
                const option = document.createElement('option');
                option.value = entityId.toString();
                option.textContent = `Entidad ${entityId}`;
                selectElement.appendChild(option);
            });
            
            // Restaurar valor si existe
            if (currentValue && entityArray.includes(parseInt(currentValue))) {
                selectElement.value = currentValue;
            }
        } catch (error) {
            console.error('Error al actualizar lista de entidades:', error);
        }
    }
    
    /**
     * Mostrar entidades disponibles en un resultado
     * @param {HTMLElement} container - Contenedor donde mostrar el resultado
     */
    showAvailableEntities(container) {
        if (!window.debugTools?.inspector) {
            this.showError(container, 'Inspector no disponible');
            return;
        }
        
        try {
            const entities = this.ecs.query();
            const entityArray = Array.from(entities).sort((a, b) => a - b);
            
            if (entityArray.length === 0) {
                this.showInfo(container, 'No hay entidades disponibles');
                return;
            }
            
            // Obtener información de cada entidad
            const entitiesInfo = entityArray.map(entityId => {
                const info = window.debugTools.inspector.inspectEntity(entityId);
                return {
                    id: entityId,
                    components: info ? Object.keys(info.components) : [],
                    componentCount: info ? info.componentCount : 0
                };
            });
            
            const result = {
                total: entityArray.length,
                entities: entitiesInfo
            };
            
            this.showResult(container, 'Entidades Disponibles', result);
        } catch (error) {
            this.showError(container, `Error: ${error.message}`);
        }
    }
    
    /**
     * Crear tab de Comandos
     * @returns {HTMLElement} Contenido del tab
     */
    createCommandsTab() {
        const container = document.createElement('div');
        
        const title = document.createElement('h3');
        title.textContent = 'Comandos Rápidos';
        title.style.cssText = 'margin-top: 0; color: #4CAF50;';
        container.appendChild(title);
        
        // Comandos predefinidos
        const commands = [
            { label: 'Estadísticas ECS', command: 'inspector.getStats()' },
            { label: 'Métricas', command: 'metrics.getStats()' },
            { label: 'Historial Eventos', command: 'events.getHistory()' },
            { label: 'Buscar Animation', command: 'inspector.findEntities({ hasComponent: "Animation" })' },
            { label: 'Buscar Combat', command: 'inspector.findEntities({ hasComponent: "Combat" })' },
            { label: 'Resetear Métricas', command: 'metrics.reset()' },
            { label: 'Limpiar Eventos', command: 'events.clearHistory()' }
        ];
        
        commands.forEach(cmd => {
            const btn = document.createElement('button');
            btn.textContent = cmd.label;
            btn.style.cssText = `
                display: block;
                width: 100%;
                max-width: 400px;
                background: #2196F3;
                color: white;
                border: none;
                padding: 12px 20px;
                cursor: pointer;
                border-radius: 5px;
                margin-bottom: 10px;
                text-align: left;
                font-size: 14px;
            `;
            btn.onmouseenter = () => {
                btn.style.background = '#1976D2';
            };
            btn.onmouseleave = () => {
                btn.style.background = '#2196F3';
            };
            btn.onclick = () => {
                try {
                    const result = this.evaluateCommand(cmd.command);
                    this.showResult(container, `Resultado: ${cmd.label}`, result);
                } catch (error) {
                    this.showError(container, `Error: ${error.message}`);
                }
            };
            container.appendChild(btn);
        });
        
        // Área de comando personalizado
        const customSection = document.createElement('div');
        customSection.style.cssText = 'margin-top: 30px; padding-top: 20px; border-top: 1px solid #444;';
        
        const customLabel = document.createElement('label');
        customLabel.textContent = 'Comando personalizado (permite copiar/pegar):';
        customLabel.style.cssText = 'display: block; margin-bottom: 5px; color: #ccc;';
        customSection.appendChild(customLabel);
        
        const customInput = document.createElement('textarea');
        customInput.placeholder = 'Ej: inspector.inspectEntity(1)\nEj: metrics.getStats()\nEj: logger.info("Test", "Mensaje")';
        customInput.style.cssText = `
            width: 100%;
            max-width: 600px;
            min-height: 100px;
            padding: 10px;
            background: #333;
            border: 1px solid #555;
            color: #fff;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            resize: vertical;
        `;
        customSection.appendChild(customInput);
        
        const customBtn = document.createElement('button');
        customBtn.textContent = 'Ejecutar';
        customBtn.style.cssText = `
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            cursor: pointer;
            border-radius: 5px;
            margin-top: 10px;
            font-size: 14px;
        `;
        customBtn.onclick = () => {
            const command = customInput.value.trim();
            if (command) {
                try {
                    const result = this.evaluateCommand(command);
                    this.showResult(container, 'Resultado del comando', result);
                } catch (error) {
                    this.showError(container, `Error: ${error.message}`);
                }
            }
        };
        customSection.appendChild(customBtn);
        container.appendChild(customSection);
        
        return container;
    }
    
    /**
     * Evaluar comando JavaScript
     * @param {string} command - Comando a evaluar
     * @returns {*} Resultado
     */
    evaluateCommand(command) {
        const context = {
            window: window,
            console: console,
            debugTools: window.debugTools,
            app: this.app,
            ecs: this.ecs,
            inspector: window.debugTools?.inspector,
            metrics: window.debugTools?.metrics,
            logger: window.debugTools?.logger,
            validator: window.debugTools?.validator,
            events: window.debugTools?.events,
            panel: window.debugTools?.panel
        };
        
        const func = new Function(...Object.keys(context), `return ${command}`);
        return func(...Object.values(context));
    }
    
    /**
     * Mostrar resultado
     * @param {HTMLElement} container - Contenedor donde mostrar
     * @param {string} title - Título del resultado
     * @param {*} data - Datos a mostrar
     * @param {boolean} replace - Si reemplazar resultado anterior
     */
    showResult(container, title, data, replace = false) {
        if (replace) {
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
            border: 1px solid #4CAF50;
            border-radius: 5px;
        `;
        
        const resultTitle = document.createElement('h4');
        resultTitle.textContent = title;
        resultTitle.style.cssText = 'margin: 0 0 10px 0; color: #4CAF50;';
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
        const copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copiar';
        copyBtn.style.cssText = `
            background: #2196F3;
            color: white;
            border: none;
            padding: 5px 10px;
            cursor: pointer;
            border-radius: 3px;
            margin-top: 10px;
            font-size: 12px;
        `;
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
                copyBtn.textContent = 'Copiado!';
                setTimeout(() => {
                    copyBtn.textContent = 'Copiar';
                }, 2000);
            });
        };
        resultBox.appendChild(copyBtn);
        
        container.appendChild(resultBox);
        
        // Scroll al resultado
        resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    /**
     * Mostrar error
     * @param {HTMLElement} container - Contenedor
     * @param {string} message - Mensaje de error
     */
    showError(container, message) {
        const errorBox = document.createElement('div');
        errorBox.style.cssText = `
            margin-top: 20px;
            padding: 15px;
            background: #2a1a1a;
            border: 1px solid #f44336;
            border-radius: 5px;
            color: #f44336;
        `;
        errorBox.textContent = `Error: ${message}`;
        container.appendChild(errorBox);
        
        setTimeout(() => {
            errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }
    
    /**
     * Mostrar información
     * @param {HTMLElement} container - Contenedor
     * @param {string} message - Mensaje
     */
    showInfo(container, message) {
        const infoBox = document.createElement('div');
        infoBox.style.cssText = `
            margin-top: 20px;
            padding: 15px;
            background: #1a2a1a;
            border: 1px solid #4CAF50;
            border-radius: 5px;
            color: #4CAF50;
        `;
        infoBox.textContent = `Info: ${message}`;
        container.appendChild(infoBox);
        
        setTimeout(() => {
            infoBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
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
     * Handler para bloquear eventos de input cuando la interfaz está visible (fase de captura)
     */
    blockInputHandler = (event) => {
        // Permitir F4 para cerrar la interfaz (pero solo si no viene de un input)
        if (event.key === 'F4') {
            const activeElement = document.activeElement;
            if (!activeElement || activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
                // Si hay un input activo, no permitir F4 (para que se pueda escribir)
                return;
            }
            // Si no hay input activo, permitir F4
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
     * Toggle visibilidad
     */
    toggle() {
        this.visible = !this.visible;
        console.log('[DebugInterface] Toggle - nuevo estado visible:', this.visible);
        if (this.interfaceElement) {
            this.interfaceElement.style.display = this.visible ? 'flex' : 'none';
            console.log('[DebugInterface] Display actualizado:', this.interfaceElement.style.display);
            
            // Bloquear/desbloquear input del juego
            if (this.visible) {
                this.blockGameInput();
            } else {
                this.unblockGameInput();
            }
        } else {
            console.error('[DebugInterface] ERROR: interfaceElement es null!');
        }
    }
    
    /**
     * Destruir interfaz
     */
    destroy() {
        // Desbloquear input antes de destruir
        this.unblockGameInput();
        
        // Desuscribirse del logger
        if (window.debugTools?.logger) {
            window.debugTools.logger.unsubscribe(this.handleLogEntry.bind(this));
        }
        
        if (this.interfaceElement && this.interfaceElement.parentNode) {
            this.interfaceElement.parentNode.removeChild(this.interfaceElement);
        }
    }
}
