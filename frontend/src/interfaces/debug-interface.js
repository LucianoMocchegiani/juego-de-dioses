/**
 * Interfaz GUI de debugging
 * Se activa con F4 y proporciona una interfaz visual para usar las herramientas de debugging
 */
import { DEBUG_CONFIG } from '../config/debug-config.js';
import { BaseInterface } from './base-interface.js';

export class DebugInterface extends BaseInterface {
    constructor(app, ecs) {
        const config = DEBUG_CONFIG.ui;
        super(app, ecs, {
            enabled: config.enabled && DEBUG_CONFIG.enabled,
            toggleKey: 'F4',
            title: 'Debug Tools',
            color: '#4CAF50'
        });
        
        // Propiedades específicas del debugger
        this.logHistory = []; // Historial de logs para mostrar en la interfaz
        this.maxLogHistory = 500; // Máximo de logs a mantener
        this.logContainer = null; // Contenedor donde se muestran los logs
        this.panelCheckbox = null; // Checkbox para controlar el panel F3
        this.entityFilterId = null; // ID de entidad para filtrar logs visualmente
        
        console.log('[DebugInterface] Constructor llamado, enabled:', this.enabled);
        console.log('[DebugInterface] config.enabled:', config.enabled);
        console.log('[DebugInterface] DEBUG_CONFIG.enabled:', DEBUG_CONFIG.enabled);
        
        if (this.enabled) {
            console.log('[DebugInterface] Inicialización completada');
        } else {
            console.warn('[DebugInterface] Deshabilitado - no se inicializará');
        }
    }
    
    /**
     * Inicializar interfaz (sobrescribe BaseInterface.init)
     */
    init() {
        super.init(); // Crear estructura base
        
        // Crear tabs específicos del debugger
        this.createTabs([
            { id: 'inspector', label: 'Inspector', content: this.createInspectorTab.bind(this) },
            { id: 'metrics', label: 'Métricas', content: this.createMetricsTab.bind(this) },
            { id: 'events', label: 'Eventos', content: this.createEventsTab.bind(this) },
            { id: 'logger', label: 'Logger', content: this.createLoggerTab.bind(this) },
            { id: 'commands', label: 'Comandos', content: this.createCommandsTab.bind(this) }
        ]);
        
        console.log('[DebugInterface] Elemento DOM agregado al body:', this.interfaceElement.id);
        console.log('[DebugInterface] Inicialización completa. Presiona F4 para mostrar.');
        
        // Suscribirse al logger cuando esté disponible (puede que aún no esté inicializado)
        this.setupLoggerSubscription();
    }
    
    /**
     * Configurar suscripción al logger
     */
    setupLoggerSubscription() {
        const subscribe = () => {
            if (window.developmentTools?.logger) {
                window.developmentTools.logger.subscribe(this.handleLogEntry.bind(this));
                return true;
            }
            return false;
        };
        
        if (subscribe()) return;
        
        setTimeout(() => {
            if (subscribe()) return;
            
            let attempts = 0;
            const maxAttempts = 50;
            const checkInterval = setInterval(() => {
                if (subscribe() || ++attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    if (attempts >= maxAttempts) {
                        console.warn('[DebugInterface] No se pudo suscribir al logger');
                    }
                }
            }, 100);
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
     * Agregar un log al contenedor visual (usando helper reutilizable)
     * @param {Object} logEntry - Entrada de log
     */
    appendLogToContainer(logEntry) {
        const logElement = this.createLogEntry(logEntry, () => {
            this.copyLogToClipboard(logEntry);
        });
        
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
        // Usar helper de formateo
        const logText = this.formatLogEntryText(logEntry);
        
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
        
        // Formatear todos los logs usando helper
        const logsText = logsToCopy.map(logEntry => this.formatLogEntryText(logEntry)).join('\n');
        
        navigator.clipboard.writeText(logsText).then(() => {
            this.showInfo(this.logContainer.parentElement, `${logsToCopy.length} logs copiados al portapapeles`);
        }).catch(err => {
            console.error('Error al copiar logs:', err);
            this.showError(this.logContainer.parentElement, 'Error al copiar logs');
        });
    }
    
    
    
    /**
     * Crear tab de Inspector
     * @returns {HTMLElement} Contenido del tab
     */
    createInspectorTab() {
        return this.createTabContainer('Inspector de Estado ECS', () => [
            // Botón para obtener estadísticas usando patrón reutilizable
            this.createActionResultPattern({
                buttonText: 'Obtener Estadísticas del ECS',
                onAction: () => window.developmentTools?.inspector?.getStats(),
                resultTitle: 'Estadísticas del ECS',
                onError: () => 'Inspector no disponible'
            }),
            // Buscar entidades
            this.createSearchSection({
                labelText: 'Buscar entidades por componente:',
                placeholder: 'Ej: Animation, Combat, Input',
                buttonText: 'Buscar',
                inputWidth: '300px',
                onSearch: (component) => {
                    const results = window.developmentTools?.inspector?.findEntities({ hasComponent: component });
                    if (results) {
                        this.showResult(this.mainContent, `Entidades con componente '${component}'`, results);
                    } else {
                        this.showError(this.mainContent, 'Inspector no disponible');
                    }
                }
            }),
            // Inspeccionar entidad específica
            (() => {
                const inspectSection = this.createSearchSection({
                    labelText: 'Inspeccionar entidad por ID:',
                    placeholder: 'ID de entidad (ej: 1)',
                    buttonText: 'Inspeccionar',
                    inputWidth: '200px',
                    onSearch: (value) => {
                        const entityId = parseInt(value);
                        if (!isNaN(entityId)) {
                            const result = window.developmentTools?.inspector?.inspectEntity(entityId);
                            if (result) {
                                this.showResult(this.mainContent, `Entidad ${entityId}`, result);
                            } else {
                                this.showError(this.mainContent, `Entidad ${entityId} no encontrada o inspector no disponible`);
                            }
                        }
                    }
                });
                const inspectInput = inspectSection.querySelector('input');
                if (inspectInput) inspectInput.type = 'number';
                return inspectSection;
            })()
        ]);
    }
    
    /**
     * Crear tab de Métricas
     * @returns {HTMLElement} Contenido del tab
     */
    createMetricsTab() {
        const container = this.createTabContainer('Métricas de Performance', () => {
            const elements = [];
            
            // Botón para obtener métricas usando patrón reutilizable
            const metricsAction = this.createActionResultPattern({
                buttonText: 'Obtener Métricas',
                onAction: () => window.developmentTools?.metrics?.getStats(),
                resultTitle: 'Métricas de Performance',
                onError: () => 'Métricas no disponibles'
            });
            elements.push(metricsAction);
            
            // Botón para resetear
            const resetBtn = this.createButton('Resetear Métricas', () => {
                window.developmentTools?.metrics?.reset();
                this.showInfo(container, 'Métricas reseteadas');
            }, { variant: 'warning', margin: '0 0 0 10px' });
            elements.push(resetBtn);
            
            // Auto-refresh
            let autoRefreshInterval = null;
            const { container: autoRefreshContainer } = this.createCheckbox({
                labelText: 'Auto-refresh cada 2 segundos',
                checked: false,
                containerStyle: 'margin-top: 15px;',
                onChange: (checked) => {
                    if (checked) {
                        autoRefreshInterval = setInterval(() => {
                            const metrics = window.developmentTools?.metrics?.getStats();
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
                }
            });
            elements.push(autoRefreshContainer);
            
            return elements;
        });
        
        return container;
    }
    
    /**
     * Crear tab de Eventos
     * @returns {HTMLElement} Contenido del tab
     */
    createEventsTab() {
        return this.createTabContainer('Sistema de Eventos', () => [
            // Ver historial usando patrón reutilizable
            this.createActionResultPattern({
                buttonText: 'Ver Historial de Eventos',
                onAction: () => window.developmentTools?.events?.getHistory(),
                resultTitle: 'Historial de Eventos',
                onError: () => 'Eventos no disponibles'
            }),
            // Filtrar por evento
            this.createSearchSection({
                labelText: 'Filtrar por nombre de evento:',
                placeholder: 'Ej: combat:action:started',
                buttonText: 'Filtrar',
                inputWidth: '300px',
                onSearch: (eventName) => {
                    const filtered = window.developmentTools?.events?.getHistory(eventName);
                    if (filtered) {
                        this.showResult(this.mainContent, `Eventos: ${eventName}`, filtered);
                    } else {
                        this.showError(this.mainContent, 'Eventos no disponibles');
                    }
                }
            }),
            // Limpiar historial
            this.createButton('Limpiar Historial', () => {
                window.developmentTools?.events?.clearHistory();
                this.showInfo(this.mainContent, 'Historial limpiado');
            }, { variant: 'danger', margin: '15px 0 0 0' })
        ]);
    }
    
    /**
     * Crear tab de Logger
     * @returns {HTMLElement} Contenido del tab
     */
    createLoggerTab() {
        const container = this.createTabContainer('Sistema de Logging', () => {
            const elements = [];
            
            // Control del Debug Panel (F3)
            const panelSection = this.createSectionContainer({
                margin: '0 0 20px 0',
                padding: '10px',
                background: 'rgba(45, 45, 45, 0.5)',
                borderRadius: '5px'
            });
            
            const initialPanelState = window.developmentTools?.panel?.visible || false;
            const { checkbox: panelCheck, container: panelCheckContainer } = this.createCheckbox({
                labelText: 'Mostrar Debug Panel (F3)',
                checked: initialPanelState
            });
            this.panelCheckbox = panelCheck;
            
            if (window.developmentTools?.panel) {
                const originalToggle = window.developmentTools.panel.toggle.bind(window.developmentTools.panel);
                window.developmentTools.panel.toggle = () => {
                    originalToggle();
                    if (this.panelCheckbox) {
                        this.panelCheckbox.checked = window.developmentTools.panel.visible;
                    }
                };
            }
            
            panelCheck.onchange = (e) => {
                if (window.developmentTools?.panel) {
                    if (e.target.checked && !window.developmentTools.panel.visible) {
                        window.developmentTools.panel.toggle();
                    } else if (!e.target.checked && window.developmentTools.panel.visible) {
                        window.developmentTools.panel.toggle();
                    }
                }
            };
            
            panelSection.appendChild(panelCheckContainer);
            elements.push(panelSection);
            
            // Control de nivel
            const levelSection = this.createSectionContainer({ margin: '0 0 20px 0' });
            levelSection.appendChild(this.createLabel('Nivel de log:'));
            levelSection.appendChild(this.createSelect({
                options: ['debug', 'info', 'warn', 'error'],
                selected: window.developmentTools?.logger?.level || 'info',
                width: '200px',
                onChange: (value) => {
                    if (window.developmentTools?.logger) {
                        window.developmentTools.logger.level = value;
                        this.showInfo(container, `Nivel de log cambiado a: ${value}`);
                    }
                }
            }));
            elements.push(levelSection);
            
            // Filtro por entidad
            const entityFilterSection = this.createSectionContainer({ margin: '0 0 20px 0' });
            entityFilterSection.appendChild(this.createLabel('Filtrar logs por entidad (ID):'));
            
            const entityFilterControls = this.createFlexContainer({ margin: '0 0 10px 0' });
            const entitySelect = this.createSelect({
                options: [],
                selected: '',
                width: '250px',
                placeholder: 'Todas las entidades',
                onChange: (selectedId) => {
                    if (selectedId) {
                        this.entityFilterId = parseInt(selectedId);
                        this.refreshLogsDisplay();
                        this.showInfo(container, `Mostrando solo logs de entidad: ${this.entityFilterId}`);
                    } else {
                        this.entityFilterId = null;
                        this.refreshLogsDisplay();
                        this.showInfo(container, 'Filtro de entidad limpiado');
                    }
                }
            });
            entityFilterControls.appendChild(entitySelect);
            entityFilterControls.appendChild(this.createButton('Limpiar filtro', () => {
                entitySelect.value = '';
                this.entityFilterId = null;
                this.refreshLogsDisplay();
                this.showInfo(container, 'Filtro de entidad limpiado');
            }, { variant: 'secondary', color: '#666' }));
            entityFilterControls.appendChild(this.createButton('Ver entidades disponibles', () => {
                this.showAvailableEntities(container);
            }, { variant: 'secondary' }));
            
            entityFilterSection.appendChild(entityFilterControls);
            // Actualizar lista de entidades después de crear el select
            setTimeout(() => this.updateEntityList(entitySelect), 0);
            elements.push(entityFilterSection);
            
            // Probar logger
            elements.push(this.createSearchSection({
                labelText: 'Probar logger:',
                placeholder: 'Mensaje de prueba',
                buttonText: 'Probar',
                inputWidth: '300px',
                onSearch: (message) => {
                    if (window.developmentTools?.logger) {
                        window.developmentTools.logger.info('DebugInterface', message, { test: true });
                        this.showInfo(container, `Mensaje enviado: "${message}"`);
                    }
                }
            }));
            
            // Área de logs
            const logsSection = this.createSectionContainer({
                margin: '30px 0 0 0',
                borderTop: '1px solid #444'
            });
            logsSection.appendChild(this.createSectionHeader({
                title: 'Logs en Tiempo Real',
                titleSize: 'h4',
                buttons: [
                    { text: 'Copiar todos', onClick: () => this.copyAllLogsToClipboard(), variant: 'primary' },
                    { text: 'Limpiar', onClick: () => { this.logHistory = []; if (this.logContainer) this.logContainer.innerHTML = ''; }, variant: 'danger' }
                ]
            }));
            this.logContainer = this.createLogContainer();
            this.refreshLogsDisplay();
            logsSection.appendChild(this.logContainer);
            elements.push(logsSection);
            
            return elements;
        });
        
        return container;
    }
    
    /**
     * Refrescar la visualización de logs aplicando filtros
     */
    refreshLogsDisplay() {
        if (!this.logContainer) return;
        
        this.logContainer.innerHTML = '';
        
        this.logHistory.forEach(logEntry => {
            if (this.entityFilterId !== null) {
                const logEntityId = logEntry.data?.entityId;
                if (logEntityId === undefined || logEntityId !== this.entityFilterId) return;
            }
            this.appendLogToContainer(logEntry);
        });
        
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }
    
    /**
     * Actualizar la lista de entidades disponibles en el selector
     * @param {HTMLSelectElement} selectElement - Elemento select
     */
    updateEntityList(selectElement) {
        if (!selectElement || !window.developmentTools?.inspector) return;
        
        try {
            const entities = this.ecs.query();
            const entityArray = Array.from(entities).sort((a, b) => a - b);
            const currentValue = selectElement.value;
            
            // Preservar placeholder
            const placeholder = selectElement.querySelector('option[value=""]');
            selectElement.innerHTML = '';
            if (placeholder) {
                selectElement.appendChild(placeholder);
            } else {
                const opt = document.createElement('option');
                opt.value = '';
                opt.textContent = 'Todas las entidades';
                selectElement.appendChild(opt);
            }
            
            // Agregar entidades
            entityArray.forEach(id => {
                const opt = document.createElement('option');
                opt.value = id.toString();
                opt.textContent = `Entidad ${id}`;
                selectElement.appendChild(opt);
            });
            
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
        if (!window.developmentTools?.inspector) {
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
            
            const entitiesInfo = entityArray.map(id => {
                const info = window.developmentTools.inspector.inspectEntity(id);
                return {
                    id,
                    components: info ? Object.keys(info.components) : [],
                    componentCount: info ? info.componentCount : 0
                };
            });
            
            this.showResult(container, 'Entidades Disponibles', {
                total: entityArray.length,
                entities: entitiesInfo
            });
        } catch (error) {
            this.showError(container, `Error: ${error.message}`);
        }
    }
    
    /**
     * Crear tab de Comandos
     * @returns {HTMLElement} Contenido del tab
     */
    createCommandsTab() {
        const container = this.createTabContainer('Comandos Rápidos', () => {
            const elements = [];
            
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
                const btn = this.createButton(cmd.label, () => {
                    try {
                        const result = this.evaluateCommand(cmd.command);
                        this.showResult(container, `Resultado: ${cmd.label}`, result);
                    } catch (error) {
                        this.showError(container, `Error: ${error.message}`);
                    }
                }, { 
                    variant: 'secondary', 
                    margin: '0 0 10px 0',
                    display: 'block',
                    width: '100%',
                    maxWidth: '400px',
                    textAlign: 'left'
                });
                elements.push(btn);
            });
            
            // Área de comando personalizado
            const customSection = this.createSectionContainer({
                margin: '30px 0 0 0',
                borderTop: '1px solid #444'
            });
            
            customSection.appendChild(this.createLabel('Comando personalizado (permite copiar/pegar):'));
            const textarea = this.createTextarea({
                placeholder: 'Ej: inspector.inspectEntity(1)\nEj: metrics.getStats()\nEj: logger.info("Test", "Mensaje")',
                width: '100%',
                maxWidth: '600px',
                minHeight: '100px'
            });
            customSection.appendChild(textarea);
            customSection.appendChild(this.createButton('Ejecutar', () => {
                const command = textarea.value.trim();
                if (command) {
                    try {
                        const result = this.evaluateCommand(command);
                        this.showResult(container, 'Resultado del comando', result);
                    } catch (error) {
                        this.showError(container, `Error: ${error.message}`);
                    }
                }
            }, { variant: 'primary', margin: '10px 0 0 0' }));
            
            elements.push(customSection);
            return elements;
        });
        
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
            debugTools: window.developmentTools,
            app: this.app,
            ecs: this.ecs,
            inspector: window.developmentTools?.inspector,
            metrics: window.developmentTools?.metrics,
            logger: window.developmentTools?.logger,
            validator: window.developmentTools?.validator,
            events: window.developmentTools?.events,
            panel: window.developmentTools?.panel
        };
        
        const func = new Function(...Object.keys(context), `return ${command}`);
        return func(...Object.values(context));
    }
    
    /**
     * Mostrar resultado (usando helper reutilizable)
     * @param {HTMLElement} container - Contenedor donde mostrar
     * @param {string} title - Título del resultado
     * @param {*} data - Datos a mostrar
     * @param {boolean} replace - Si reemplazar resultado anterior
     */
    showResult(container, title, data, replace = false) {
        this.createResultBox({
            title,
            data,
            replace,
            container
        });
    }
    
    /**
     * Destruir interfaz (sobrescribe BaseInterface.destroy)
     */
    destroy() {
        // Desuscribirse del logger
        if (window.developmentTools?.logger) {
            window.developmentTools.logger.unsubscribe(this.handleLogEntry.bind(this));
        }
        
        // Llamar destroy de la clase base
        super.destroy();
    }
}
