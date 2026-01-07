"""
Configuración del Sistema de Monitoreo de Rendimiento
"""
import os

# Intervalo de logging en segundos
PERFORMANCE_LOG_INTERVAL = float(os.getenv("PERFORMANCE_LOG_INTERVAL", "30.0"))  # Default: 30 segundos

# Habilitar/deshabilitar logging de rendimiento
PERFORMANCE_LOG_ENABLED = os.getenv("PERFORMANCE_LOG_ENABLED", "true").lower() == "true"

# Nivel de log para métricas de rendimiento
PERFORMANCE_LOG_LEVEL = os.getenv("PERFORMANCE_LOG_LEVEL", "INFO").upper()  # DEBUG, INFO, WARNING, ERROR

# Diccionario de configuración
PERFORMANCE_CONFIG = {
    'LOG_INTERVAL': PERFORMANCE_LOG_INTERVAL,
    'LOG_ENABLED': PERFORMANCE_LOG_ENABLED,
    'LOG_LEVEL': PERFORMANCE_LOG_LEVEL
}
