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
