# Configuración Centralizada del Backend

Este módulo centraliza valores de configuración para evitar valores mágicos y facilitar cambios futuros.

## Estructura

```
config/
├── __init__.py              # Exportaciones del módulo
├── celestial_config.py      # Configuración del sistema celestial (sol/luna)
└── README.md                # Este archivo
```

## Uso

### Configuración Celestial

**Archivo:** `celestial_config.py`

Contiene todos los valores relacionados con el sistema de sol/luna y tiempo del juego.

**Importar:**
```python
from src.config import CELESTIAL_CONFIG

# Acceder a valores individuales
velocidad_tiempo = CELESTIAL_CONFIG['VELOCIDAD_TIEMPO']
sol_velocidad_angular = CELESTIAL_CONFIG['SOL_VELOCIDAD_ANGULAR']
```

**Valores disponibles:**

#### Tiempo del Juego
- `VELOCIDAD_TIEMPO`: Multiplicador de velocidad (1.0 = tiempo real, 60.0 = 60x más rápido)
- `TIEMPO_INICIAL`: Tiempo inicial del juego en segundos

#### Sol
- `SOL_CICLO_REAL_SEGUNDOS`: Duración de un ciclo completo del sol (en segundos reales)
- `SOL_VELOCIDAD_ANGULAR`: Velocidad angular del sol (radianes por segundo real)

#### Luna
- `LUNA_CICLO_REAL_SEGUNDOS`: Duración de un ciclo completo de la luna (en segundos reales)
- `LUNA_VELOCIDAD_ANGULAR`: Velocidad angular de la luna (radianes por segundo real)
- `LUNA_DESPLAZAMIENTO_INICIAL`: Desplazamiento angular inicial de la luna (en radianes)

#### Horas del Día
- `HORA_AMANECER`: Hora del amanecer (default: 6.0)
- `HORA_ATARDECER`: Hora del atardecer (default: 18.0)
- `HORAS_POR_DIA`: Horas del día en un ciclo completo (default: 24.0)

#### Intensidad Solar
- `ANGULO_DIA_UMBRAL`: Umbral angular para determinar si es de día (en radianes)

**Ejemplo de uso:**
```python
from src.config import CELESTIAL_CONFIG
from src.services import CelestialTimeService

# Crear servicio con valores de configuración
celestial_service = CelestialTimeService(
    tiempo_inicial=CELESTIAL_CONFIG['TIEMPO_INICIAL'],
    velocidad_tiempo=CELESTIAL_CONFIG['VELOCIDAD_TIEMPO']
)

# O usar valores por defecto (ya usan la configuración)
celestial_service = CelestialTimeService()
```

## Modificar Valores

Para cambiar la velocidad del sol/luna o cualquier otro valor:

1. Editar `celestial_config.py`
2. Modificar el valor deseado (ej: `VELOCIDAD_TIEMPO = 120.0`)
3. Reiniciar el servidor backend

**Nota:** Los valores se calculan automáticamente cuando es posible (ej: velocidades angulares se calculan desde los ciclos).

## Convenciones

- Los valores deben estar en mayúsculas (constantes)
- Los valores deben tener comentarios explicativos
- Los valores calculados deben tener fórmulas claras
- El diccionario `CELESTIAL_CONFIG` debe contener todos los valores exportables

