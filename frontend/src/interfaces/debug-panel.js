/**
 * Panel de debugging visual en UI
 */
import { DEBUG_CONFIG } from '../config/debug-config.js';

export class DebugPanel {
    constructor(app, ecs) {
        this.app = app;
        this.ecs = ecs;
        const config = DEBUG_CONFIG.ui;
        this.enabled = config.enabled && DEBUG_CONFIG.enabled;
        this.toggleKey = config.toggleKey || 'F3';
        this.autoUpdateInterval = config.autoUpdateInterval || 1000;
        
        this.visible = false;
        this.panel = null;
        this.updateInterval = null;
        this.inspector = null;
        this.metrics = null;
        this.recentLogs = []; // Últimos logs para mostrar
        this.maxRecentLogs = 10; // Máximo de logs a mostrar
        this.currentTemperature = null; // Temperatura actual del bloque
        this.temperatureError = null; // Error al calcular temperatura
        this.lastTemperatureUpdate = 0; // Timestamp de última actualización de temperatura
        this.temperatureUpdateInterval = 60000; // Actualizar temperatura cada 1 minuto (60000ms)
        this.temperatureUpdateInProgress = false; // Flag para evitar múltiples llamadas simultáneas
        
        if (this.enabled) {
            this.init();
        }
    }
    
    /**
     * Inicializar panel
     */
    init() {
        // Crear panel HTML
        this.panel = document.createElement('div');
        this.panel.id = 'debug-panel';
        this.panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 400px;
            max-height: 80vh;
            background: rgba(0, 0, 0, 0.9);
            color: #0f0;
            padding: 15px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            overflow-y: auto;
            z-index: 10000;
            display: none;
            border: 2px solid #0f0;
            border-radius: 5px;
            box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
        `;
        document.body.appendChild(this.panel);
        
        // Toggle con tecla (opcional, puede ser deshabilitado si se controla desde la interfaz)
        // Mantenemos F3 como atajo rápido, pero el control principal está en F4
        document.addEventListener('keydown', (e) => {
            if (e.key === this.toggleKey) {
                e.preventDefault();
                this.toggle();
            }
        });
        
        // Suscribirse al logger para recibir logs
        this.setupLoggerSubscription();
    }
    
    /**
     * Configurar suscripción al logger
     */
    setupLoggerSubscription() {
        // Intentar suscribirse inmediatamente
        if (window.developmentTools?.logger) {
            window.developmentTools.logger.subscribe(this.handleLogEntry.bind(this));
            return;
        }
        
        // Si no está disponible, intentar después de un breve delay
        setTimeout(() => {
            if (window.developmentTools?.logger) {
                window.developmentTools.logger.subscribe(this.handleLogEntry.bind(this));
            } else {
                // Si aún no está disponible, intentar cada 100ms hasta 5 segundos
                let attempts = 0;
                const maxAttempts = 50;
                const checkInterval = setInterval(() => {
                    attempts++;
                    if (window.developmentTools?.logger) {
                        window.developmentTools.logger.subscribe(this.handleLogEntry.bind(this));
                        clearInterval(checkInterval);
                    } else if (attempts >= maxAttempts) {
                        clearInterval(checkInterval);
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
        this.recentLogs.push(logEntry);
        
        // Mantener solo los últimos N logs
        if (this.recentLogs.length > this.maxRecentLogs) {
            this.recentLogs.shift(); // Remover el más antiguo
        }
        
        // Si el panel está visible, actualizar
        if (this.visible) {
            this.update();
        }
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
     * Establecer inspector y métricas
     * @param {ECSInspector} inspector - Inspector de ECS
     * @param {DebugMetrics} metrics - Métricas de debugging
     */
    setTools(inspector, metrics) {
        this.inspector = inspector;
        this.metrics = metrics;
    }
    
    /**
     * Toggle visibilidad del panel
     */
    toggle() {
        this.visible = !this.visible;
        this.panel.style.display = this.visible ? 'block' : 'none';
        
        if (this.visible) {
            this.update();
            this.startAutoUpdate();
        } else {
            this.stopAutoUpdate();
        }
    }
    
    /**
     * Actualizar contenido del panel
     */
    update() {
        if (!this.visible || !this.panel) return;
        
        // Actualizar temperatura de forma asíncrona (solo si ha pasado el intervalo de 1 minuto)
        // No llamar si ya hay una actualización en progreso
        const now = Date.now();
        const shouldUpdate = !this.temperatureUpdateInProgress && 
                            (!this.lastTemperatureUpdate || (now - this.lastTemperatureUpdate) >= this.temperatureUpdateInterval);
        
        if (shouldUpdate) {
            this.updateTemperature();
        }
        
        // Obtener métricas
        const metrics = this.metrics?.getStats();
        const stats = this.inspector?.getStats();
        const fps = this.app.performanceManager?.fps || 0;
        
        // Construir HTML
        let html = `
            <div style="margin-bottom: 10px; border-bottom: 1px solid #0f0; padding-bottom: 5px;">
                <h3 style="margin: 0; color: #0f0;">Debug Panel (${this.toggleKey} to toggle)</h3>
            </div>
        `;
        
        // Player Position
        let positionHtml = '';
        if (this.app?.playerId && this.ecs) {
            try {
                const PositionComponent = this.ecs.getComponent(this.app.playerId, 'Position');
                if (PositionComponent) {
                    const x = PositionComponent.x.toFixed(2);
                    const y = PositionComponent.y.toFixed(2);
                    const z = PositionComponent.z.toFixed(2);
                    positionHtml = `
                        <div style="margin-bottom: 15px;">
                            <h4 style="margin: 0 0 5px 0; color: #0f0;">Player Position</h4>
                            <div style="margin-left: 10px;">
                                <div>X: <span style="color: #0ff;">${x}</span></div>
                                <div>Y: <span style="color: #0ff;">${y}</span></div>
                                <div>Z: <span style="color: #0ff;">${z}</span></div>
                            </div>
                        </div>
                    `;
                }
            } catch (e) {
                // Si no se puede obtener la posición, simplemente no mostrar
            }
        }
        
        html += positionHtml;
        
        // Game Time (Horario de juego)
        let gameTimeHtml = '';
        if (this.app?.celestialSystem) {
            try {
                const hour = this.app.celestialSystem.getCurrentHour();
                const isDaytime = this.app.celestialSystem.isDaytime();
                
                // Formatear hora en formato HH:MM
                const hours = Math.floor(hour);
                const minutes = Math.floor((hour - hours) * 60);
                const hoursStr = hours.toString().padStart(2, '0');
                const minutesStr = minutes.toString().padStart(2, '0');
                const timeString = `${hoursStr}:${minutesStr}`;
                
                // Color según si es de día o noche
                const timeColor = isDaytime ? '#ff0' : '#0ff';
                const timeLabel = isDaytime ? 'Day' : 'Night';
                
                gameTimeHtml = `
                    <div style="margin-bottom: 15px;">
                        <h4 style="margin: 0 0 5px 0; color: #0f0;">Game Time</h4>
                        <div style="margin-left: 10px;">
                            <div>Time: <span style="color: ${timeColor};">${timeString}</span> (<span style="color: ${timeColor};">${timeLabel}</span>)</div>
                        </div>
                    </div>
                `;
            } catch (e) {
                // Si no se puede obtener el horario, simplemente no mostrar
            }
        }
        html += gameTimeHtml;
        
        // Temperature (con data-section para actualización parcial)
        let temperatureHtml = '';
        if (this.currentTemperature !== null) {
            const tempColor = this.currentTemperature > 20 ? '#ff0' : this.currentTemperature > 0 ? '#0ff' : '#0ff';
            temperatureHtml = `
                <div data-section="temperature" style="margin-bottom: 15px;">
                    <h4 style="margin: 0 0 5px 0; color: #0f0;">Temperature</h4>
                    <div style="margin-left: 10px;">
                        <div>Current: <span style="color: ${tempColor};">${this.currentTemperature.toFixed(2)}°C</span></div>
                    </div>
                </div>
            `;
        } else if (this.temperatureError) {
            temperatureHtml = `
                <div data-section="temperature" style="margin-bottom: 15px;">
                    <h4 style="margin: 0 0 5px 0; color: #0f0;">Temperature</h4>
                    <div style="margin-left: 10px; color: #f00;">
                        Error: ${this.escapeHtml(this.temperatureError)}
                    </div>
                </div>
            `;
        } else {
            temperatureHtml = `
                <div data-section="temperature" style="margin-bottom: 15px;">
                    <h4 style="margin: 0 0 5px 0; color: #0f0;">Temperature</h4>
                    <div style="margin-left: 10px; color: #888;">
                        Calculating...
                    </div>
                </div>
            `;
        }
        html += temperatureHtml;
        
        // Performance
        html += `
            <div style="margin-bottom: 15px;">
                <h4 style="margin: 0 0 5px 0; color: #0f0;">Performance</h4>
                <div style="margin-left: 10px;">
                    <div>FPS: <span style="color: ${fps >= 60 ? '#0f0' : fps >= 30 ? '#ff0' : '#f00'}">${fps}</span></div>
        `;
        
        if (metrics) {
            html += `
                    <div>Avg Frame Time: ${metrics.frameTime.avg.toFixed(2)}ms</div>
                    <div>Min: ${metrics.frameTime.min.toFixed(2)}ms | Max: ${metrics.frameTime.max.toFixed(2)}ms</div>
                    <div style="margin-top: 5px;"><strong>Systems:</strong></div>
            `;
            
            for (const [name, systemStats] of Object.entries(metrics.systems)) {
                html += `
                    <div style="margin-left: 10px; font-size: 11px;">
                        ${name}: ${systemStats.avgTime.toFixed(2)}ms (${systemStats.avgEntities.toFixed(0)} entities)
                    </div>
                `;
            }
        }
        
        html += `
                </div>
            </div>
        `;
        
        // Recent Logs (últimas 10 líneas)
        if (this.recentLogs.length > 0) {
            html += `
                <div style="margin-bottom: 15px;">
                    <h4 style="margin: 0 0 5px 0; color: #0f0;">Recent Logs (F4 for details)</h4>
                    <div style="margin-left: 10px; font-size: 10px; max-height: 250px; overflow: hidden;">
            `;
            
            // Colores según nivel
            const levelColors = {
                debug: '#888',
                info: '#0f0',
                warn: '#ff0',
                error: '#f00'
            };
            
            // Mostrar solo los últimos logs
            const logsToShow = this.recentLogs.slice(-this.maxRecentLogs);
            logsToShow.forEach(logEntry => {
                const time = new Date(logEntry.timestampISO).toLocaleTimeString();
                const levelColor = levelColors[logEntry.level] || '#fff';
                const system = this.escapeHtml(logEntry.system);
                const message = this.escapeHtml(logEntry.message);
                
                html += `
                    <div style="margin-bottom: 3px; border-bottom: 1px solid #333; padding-bottom: 2px;">
                        <span style="color: #666;">[${time}]</span>
                        <span style="color: #888;">[${system}]</span>
                        <span style="color: ${levelColor};">[${logEntry.level.toUpperCase()}]</span>
                        <span style="color: #fff;">${message}</span>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        this.panel.innerHTML = html;
    }
    
    /**
     * Actualizar temperatura del bloque actual
     * Solo actualiza si han pasado al menos `temperatureUpdateInterval` ms (1 minuto) desde la última actualización
     */
    async updateTemperature() {
        // Verificar condiciones básicas
        if (!this.app?.playerId || !this.app?.currentBloqueId || !this.app?.celestialApi || !this.ecs) {
            this.currentTemperature = null;
            this.temperatureError = null;
            return;
        }
        
        // Verificar si ya hay una actualización en progreso
        if (this.temperatureUpdateInProgress) {
            return; // Ya hay una llamada en curso, no hacer otra
        }
        
        const now = Date.now();
        
        // Verificar si necesitamos actualizar (máximo 1 vez por minuto)
        // Si ya tenemos temperatura y no ha pasado el intervalo, no actualizar
        if (this.currentTemperature !== null && this.lastTemperatureUpdate > 0 && (now - this.lastTemperatureUpdate) < this.temperatureUpdateInterval) {
            return; // No actualizar, usar temperatura cacheada
        }
        
        // Marcar que hay una actualización en progreso
        this.temperatureUpdateInProgress = true;
        
        try {
            // Obtener posición del jugador
            const PositionComponent = this.ecs.getComponent(this.app.playerId, 'Position');
            if (!PositionComponent) {
                this.currentTemperature = null;
                this.temperatureError = 'No se pudo obtener la posición del jugador';
                this.lastTemperatureUpdate = now; // Actualizar timestamp para no intentar de nuevo inmediatamente
                return;
            }
            
            // Calcular temperatura en la posición del jugador
            const temperatureData = await this.app.celestialApi.calculateTemperature(
                PositionComponent.x,
                PositionComponent.y,
                PositionComponent.z,
                this.app.currentBloqueId
            );
            
            this.currentTemperature = temperatureData.temperatura;
            this.temperatureError = null;
            this.lastTemperatureUpdate = now; // Actualizar timestamp solo después de éxito
            
            // Actualizar el panel si está visible (sin llamar a updateTemperature de nuevo)
            if (this.visible && this.panel) {
                // Solo actualizar el HTML, no llamar a updateTemperature()
                this.renderTemperature();
            }
        } catch (error) {
            this.currentTemperature = null;
            this.temperatureError = error.message || 'Error al calcular temperatura';
            this.lastTemperatureUpdate = now; // Actualizar timestamp incluso en error para no intentar de nuevo inmediatamente
            
            // Actualizar el panel para mostrar el error (sin llamar a updateTemperature de nuevo)
            if (this.visible && this.panel) {
                this.renderTemperature();
            }
        } finally {
            // Siempre liberar el flag, incluso si hay error
            this.temperatureUpdateInProgress = false;
        }
    }
    
    /**
     * Renderizar solo la sección de temperatura en el panel
     * (evita llamar a updateTemperature() desde update())
     */
    renderTemperature() {
        if (!this.panel) return;
        
        // Buscar el elemento de temperatura en el panel
        const tempSection = this.panel.querySelector('[data-section="temperature"]');
        if (!tempSection) return;
        
        // Actualizar solo el contenido de temperatura
        let temperatureHtml = '';
        if (this.currentTemperature !== null) {
            const tempColor = this.currentTemperature > 20 ? '#ff0' : this.currentTemperature > 0 ? '#0ff' : '#0ff';
            temperatureHtml = `
                <div style="margin-bottom: 15px;">
                    <h4 style="margin: 0 0 5px 0; color: #0f0;">Temperature</h4>
                    <div style="margin-left: 10px;">
                        <div>Current: <span style="color: ${tempColor};">${this.currentTemperature.toFixed(2)}°C</span></div>
                    </div>
                </div>
            `;
        } else if (this.temperatureError) {
            temperatureHtml = `
                <div style="margin-bottom: 15px;">
                    <h4 style="margin: 0 0 5px 0; color: #0f0;">Temperature</h4>
                    <div style="margin-left: 10px; color: #f00;">
                        Error: ${this.escapeHtml(this.temperatureError)}
                    </div>
                </div>
            `;
        } else {
            temperatureHtml = `
                <div style="margin-bottom: 15px;">
                    <h4 style="margin: 0 0 5px 0; color: #0f0;">Temperature</h4>
                    <div style="margin-left: 10px; color: #888;">
                        Calculating...
                    </div>
                </div>
            `;
        }
        
        tempSection.innerHTML = temperatureHtml;
    }
    
    /**
     * Iniciar actualización automática
     */
    startAutoUpdate() {
        this.stopAutoUpdate(); // Asegurar que no hay múltiples intervals
        this.updateInterval = setInterval(() => this.update(), this.autoUpdateInterval);
    }
    
    /**
     * Detener actualización automática
     */
    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    /**
     * Destruir panel
     */
    destroy() {
        this.stopAutoUpdate();
        
        // Desuscribirse del logger
        if (window.developmentTools?.logger) {
            window.developmentTools.logger.unsubscribe(this.handleLogEntry.bind(this));
        }
        
        if (this.panel && this.panel.parentNode) {
            this.panel.parentNode.removeChild(this.panel);
        }
    }
}
