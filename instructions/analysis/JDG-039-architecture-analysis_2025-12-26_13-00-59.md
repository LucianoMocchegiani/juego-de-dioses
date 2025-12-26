# Análisis de Arquitectura - Sistema de Temperatura Ambiental y Sol/Luna Gleason (JDG-039)

## Situación Actual

### Backend

**Estructura actual:**
```
backend/src/services/
├── world_bloque.py          # Clase WorldBloque (bloque espacial)
├── world_bloque_manager.py  # Gestor de bloques (cache y lazy loading)
├── particula_service.py     # Funciones auxiliares para partículas
└── __init__.py
```

**Problemas identificados:**
1. **Falta sistema celestial**: No existe implementación de sol/luna para calcular posición solar y ciclo día/noche
2. **Falta cálculo de temperatura ambiental**: `WorldBloque` no tiene método para calcular temperatura base
3. **Falta servicio de temperatura**: No hay funciones para calcular modificadores (altitud, agua, albedo)
4. **Integración incompleta**: Los bloques no están conectados con sistema de temperatura
5. **Sin ciclo día/noche**: No hay forma de determinar si es día o noche en una posición

### Frontend

**Estructura actual:**
```
frontend/src/
├── world/                   # Servicios de integración del mundo
│   ├── camera-controller.js
│   └── collision-detector.js
└── terrain/                 # Sistema de terreno
    └── manager.js
```

**Problemas identificados:**
1. **Sin visualización celestial**: No hay renderizado de sol/luna en el cielo
2. **Sin iluminación dinámica**: La iluminación no cambia según ciclo día/noche
3. **Sin indicadores de temperatura**: No hay UI para mostrar temperatura ambiental

### Base de Datos

**Estructura actual:**
```sql
-- Tabla bloques (ya existe desde JDG-038)
CREATE TABLE bloques (
    id UUID PRIMARY KEY,
    nombre VARCHAR(100),
    tamano_bloque INTEGER DEFAULT 40,
    ...
);

-- Tabla particulas (ya existe)
CREATE TABLE particulas (
    id UUID PRIMARY KEY,
    bloque_id UUID REFERENCES bloques(id),
    temperatura DECIMAL(10,2) DEFAULT 20.0,
    ...
);
```

**Problemas identificados:**
1. **Sin cache de temperatura**: No hay tabla para cachear temperaturas calculadas por bloque
2. **Sin metadatos celestiales**: No hay tabla para almacenar estado del sol/luna (opcional, puede calcularse en tiempo real)

## Necesidades Futuras

### Categorías de Entidades/Funcionalidades

1. **Sistema Celestial - Backend** (nuevo):
   - CelestialTimeService: Tiempo del juego autoritativo (single source of truth)
   - Funciones de cálculo: Posición solar, fase lunar, intensidad solar
   - Sistema extensible: Preparado para hechizos, estadísticas, eventos según ciclo solar/lunar
   - Requisitos: Sincronización entre servidores, persistencia del tiempo del juego, extensibilidad
   
2. **Sistema Celestial - Frontend** (nuevo):
   - CelestialRenderer: Renderizado visual de sol/luna en Three.js
   - Interpolación suave de movimiento
   - Iluminación dinámica según ciclo día/noche
   - Requisitos: Actualizaciones suaves, sincronización con backend

2. **Sistema de Temperatura Ambiental** (nuevo):
   - TemperatureService: Funciones de cálculo de temperatura
   - Modificadores: Altitud, agua, albedo
   - Integración con CelestialTimeService para temperatura solar
   - Integración con WorldBloque
   - Requisitos: Performance, cache, extensibilidad
   
3. **Sistema de Efectos Celestiales** (futuro):
   - Hooks/eventos para que otros sistemas se suscriban a cambios celestiales
   - Modificadores de hechizos según fase lunar (agua/fuego)
   - Estadísticas de personajes según ciclo solar/lunar
   - Eventos especiales (eclipses, alineaciones)
   - Requisitos: Extensibilidad, sistema de eventos, fácil agregar nuevos efectos

4. **Integración con Bloques** (extensión):
   - WorldBloque: Método calcular_temperatura()
   - WorldBloqueManager: Gestión de temperatura de bloques
   - Requisitos: Compatibilidad con sistema existente

### Requisitos de Escalabilidad

1. **Fácil agregar nuevos modificadores**: Arquitectura modular que permita agregar viento, nubes, humedad
2. **Reutilización de código**: Funciones de cálculo reutilizables entre diferentes contextos
3. **Separación de responsabilidades**: Sistema celestial separado de sistema de temperatura
4. **Extensibilidad**: Fácil agregar más cuerpos celestes (múltiples soles, lunas)
5. **Mantenibilidad**: Código claro y documentado para futuras modificaciones

## Arquitectura Propuesta

### Backend - Estructura Modular

```
backend/src/services/
├── __init__.py
├── world_bloque.py              # (existente) Extender con calcular_temperatura()
├── world_bloque_manager.py      # (existente) Sin cambios
├── particula_service.py         # (existente) Sin cambios
├── celestial_time_service.py    # (nuevo) Sistema celestial autoritativo
│   ├── CelestialTimeService    # Gestión del tiempo del juego y cálculos celestiales
│   ├── get_sun_angle()          # Función: ángulo del sol según tiempo
│   ├── get_luna_angle()         # Función: ángulo de la luna según tiempo
│   ├── get_luna_phase()         # Función: fase lunar según tiempo
│   ├── get_sun_intensity_at()   # Función: intensidad solar en posición
│   ├── is_daytime_at()          # Función: es de día en posición
│   └── get_celestial_state()    # Función: estado completo celestial (para otros sistemas)
└── temperature_service.py       # (nuevo) Cálculo de temperatura ambiental
    ├── calculate_solar_temperature()
    ├── get_altitude_modifier()
    ├── get_water_modifier()
    ├── get_albedo_modifier()
    └── calculate_cell_temperature()
```

### Frontend - Estructura Modular

```
frontend/src/
├── world/
│   ├── camera-controller.js
│   ├── collision-detector.js
│   └── celestial-renderer.js    # (nuevo) Renderizado de sol/luna
│       ├── CelestialRenderer    # Clase para renderizar sol/luna
│       ├── SolMesh              # Mesh del sol en Three.js
│       └── LunaMesh             # Mesh de la luna en Three.js
└── systems/
    └── celestial-system.js      # (nuevo) Sistema celestial del frontend
        ├── CelestialSystem      # Calcula posición visual desde tiempo del juego
        ├── SolSystem            # Calcula posición visual del sol
        └── LunaSystem           # Calcula posición visual de la luna
```

### Jerarquía de Clases

**Backend:**

```
CelestialTimeService
├── tiempo_juego: float          # Tiempo del juego en segundos (autoritativo)
├── velocidad_tiempo: float      # Multiplicador de velocidad
├── update(delta_time)           # Actualizar tiempo del juego
├── get_sun_angle() -> float     # Ángulo del sol según tiempo
├── get_luna_angle() -> float    # Ángulo de la luna según tiempo
├── get_luna_phase() -> float    # Fase lunar según tiempo
├── get_sun_intensity_at(x, y) -> float  # Intensidad solar en posición
├── is_daytime_at(x, y) -> bool  # Es de día en posición
└── get_celestial_state() -> dict  # Estado completo (para otros sistemas)
    └── {
        "time": float,
        "sun_angle": float,
        "luna_angle": float,
        "luna_phase": float,
        "current_hour": float,
        "is_daytime": bool (promedio mundial)
    }

TemperatureService (módulo de funciones)
├── calculate_solar_temperature(celda_x, celda_y, celestial_time_service) -> float
├── get_altitude_modifier(altitud_z) -> float
├── get_water_modifier(celda_x, celda_y, celda_z, particulas_cercanas) -> float
├── get_albedo_modifier(tipo_particula) -> float
└── calculate_cell_temperature(celda_x, celda_y, celda_z, bloque_id, celestial_time_service) -> float

WorldBloque (extendido)
├── ... (métodos existentes)
└── calcular_temperatura(celestial_time_service, temperature_service) -> float
```

**Frontend:**

```
CelestialSystem (frontend)
├── gameTime: number             # Tiempo del juego recibido del backend
├── celestialState: object       # Estado celestial completo
├── solSystem: SolSystem         # Calcula posición visual del sol
├── lunaSystem: LunaSystem       # Calcula posición visual de la luna
├── update(celestialState)       # Actualizar desde estado del backend
├── get_sun_position() -> (x, y) # Posición visual del sol
├── get_luna_position() -> (x, y) # Posición visual de la luna
├── get_luna_phase() -> float    # Fase lunar (para efectos visuales)
└── is_daytime_at(x, y) -> bool  # Es de día en posición (para efectos)

CelestialRenderer
├── celestialSystem: CelestialSystem
├── solMesh: THREE.Mesh          # Mesh del sol en Three.js
├── lunaMesh: THREE.Mesh         # Mesh de la luna en Three.js
├── update(celestialState)       # Actualizar posición visual
└── update_lighting()            # Actualizar iluminación según día/noche
```

### Frontend - Estructura Modular

```
frontend/src/
├── world/
│   ├── camera-controller.js
│   ├── collision-detector.js
│   └── celestial-renderer.js    # (nuevo, futuro) Renderizado de sol/luna
└── terrain/
    └── manager.js
```

**Nota:** El frontend no se modifica en este ticket, pero se prepara la estructura para futuras implementaciones.

## Patrones de Diseño a Usar

### 1. Service Pattern
- **Descripción**: Separar lógica de negocio en servicios independientes
- **Cómo se aplica**: `TemperatureService` como módulo de funciones, `CelestialSystem` como servicio orquestador
- **Beneficios**: Separación de responsabilidades, fácil testing, reutilización

### 2. Strategy Pattern
- **Descripción**: Diferentes algoritmos para calcular modificadores de temperatura
- **Cómo se aplica**: Cada modificador (altitud, agua, albedo) es una función independiente que puede intercambiarse
- **Beneficios**: Extensibilidad, fácil agregar nuevos modificadores

### 3. Observer Pattern (futuro)
- **Descripción**: Otros sistemas se suscriben a cambios celestiales
- **Cómo se aplica**: Sistema de eventos para notificar cambios de fase lunar, ciclo día/noche
- **Beneficios**: Desacoplamiento, fácil agregar nuevos efectos (hechizos, estadísticas)

### 4. Strategy Pattern (futuro)
- **Descripción**: Diferentes efectos según fase lunar o ciclo solar
- **Cómo se aplica**: Modificadores de hechizos según fase lunar (agua más fuerte en luna llena, fuego en luna nueva)
- **Beneficios**: Extensibilidad para nuevos efectos sin modificar código existente

### 5. Singleton Pattern (opcional)
- **Descripción**: Una única instancia de `CelestialTimeService` por servidor
- **Cómo se aplica**: `CelestialTimeService` se instancia una vez y se reutiliza
- **Beneficios**: Consistencia, sincronización del tiempo del juego

### 6. Factory Pattern (futuro)
- **Descripción**: Crear diferentes tipos de cuerpos celestes
- **Cómo se aplica**: Factory para crear soles/lunas con diferentes configuraciones
- **Beneficios**: Extensibilidad para múltiples soles/lunas

## Beneficios de la Nueva Arquitectura

1. **Modularidad**: Cada sistema (celestial, temperatura) es independiente y puede evolucionar por separado
2. **Extensibilidad**: 
   - Fácil agregar nuevos modificadores de temperatura sin modificar código existente
   - Sistema celestial preparado para efectos futuros (hechizos, estadísticas, eventos)
   - Nombres genéricos que no limitan el uso a solo temperatura
3. **Testabilidad**: Funciones puras de cálculo fáciles de testear unitariamente
4. **Performance**: Cálculos eficientes con posibilidad de cache
5. **Mantenibilidad**: Código organizado y documentado, fácil de entender y modificar
6. **Reutilización**: 
   - Funciones de temperatura pueden usarse en diferentes contextos (partículas, bloques, zonas)
   - Sistema celestial puede usarse para múltiples propósitos (temperatura, hechizos, estadísticas)
7. **Preparado para el futuro**: Arquitectura diseñada pensando en funcionalidades futuras (hechizos según fase lunar, estadísticas según ciclo solar)

## Migración Propuesta

### Fase 1: Sistema Celestial
- Crear `celestial_system.py` con `SolSystem`, `LunaSystem`, `CelestialSystem`
- Implementar movimiento circular y cálculo de posición
- Implementar fases lunares
- Testing unitario de cada componente

### Fase 2: Funciones de Temperatura
- Crear `temperature_service.py` con funciones de cálculo
- Implementar `calculate_solar_temperature()` con proyección Gleason
- Implementar modificadores: altitud, agua, albedo
- Implementar `calculate_cell_temperature()` que integra todo
- Testing unitario de cada función

### Fase 3: Integración con Bloques
- Extender `WorldBloque` con método `calcular_temperatura()`
- Integrar `CelestialSystem` y `TemperatureService`
- Actualizar `WorldBloqueManager` si es necesario
- Testing de integración

### Fase 4: Testing y Ajustes
- Testing end-to-end del sistema completo
- Verificar cálculos con casos de prueba
- Optimizar performance si es necesario
- Documentación completa

## Consideraciones Técnicas

### Backend

1. **Compatibilidad**: 
   - Mantener compatibilidad con sistema de bloques existente (JDG-038)
   - No romper APIs existentes
   - Extender sin modificar comportamiento actual

2. **Base de datos**: 
   - No requiere cambios en schema (temperatura se calcula en tiempo real)
   - Opcional: Tabla de cache de temperatura por bloque (futuro)

3. **APIs**: 
   - No requiere nuevos endpoints en este ticket
   - Futuro: Endpoint para obtener temperatura en posición

4. **Testing**: 
   - Unit tests para cada función de cálculo
   - Integration tests para sistema completo
   - Tests de casos edge (coordenadas extremas, sin agua, etc.)

### Frontend

1. **Renderizado**: 
   - No se implementa en este ticket
   - Preparar estructura para futura visualización

2. **Optimización**: 
   - Los cálculos se hacen en backend
   - Frontend solo recibe datos calculados

3. **Extensibilidad**: 
   - Estructura preparada para agregar renderizado de sol/luna
   - Preparado para iluminación dinámica

## Ejemplo de Uso Futuro

**Backend:**

```python
# Inicializar sistema celestial (autoritativo)
from src.services.celestial_time_service import CelestialTimeService

celestial_service = CelestialTimeService(velocidad_tiempo=60.0)  # 60x más rápido
celestial_service.update(delta_time=1.0)

# Calcular temperatura en una posición
from src.services.temperature_service import calculate_cell_temperature

temperatura = await calculate_cell_temperature(
    celda_x=100,
    celda_y=200,
    celda_z=50,
    bloque_id="bloque-uuid",
    celestial_time_service=celestial_service
)

# Obtener bloque y calcular temperatura
bloque = await world_bloque_manager.get_bloque_for_position(
    bloque_id="bloque-uuid",
    celda_x=100,
    celda_y=200,
    celda_z=50
)
temperatura_bloque = await bloque.calcular_temperatura(
    celestial_time_service=celestial_service
)

# Obtener estado celestial completo (para otros sistemas)
estado_celestial = celestial_service.get_celestial_state()
# {
#     "time": 86400.0,
#     "sun_angle": 1.57,
#     "luna_angle": 3.14,
#     "luna_phase": 0.5,  # Luna llena
#     "current_hour": 12.0,
#     "is_daytime": True
# }

# Ejemplo futuro: Modificador de hechizos según fase lunar
def calcular_modificador_hechizo_agua(celestial_service):
    fase_lunar = celestial_service.get_luna_phase()
    # Luna llena (0.5) = +50% poder, Luna nueva (0.0) = -25% poder
    if fase_lunar >= 0.45 and fase_lunar <= 0.55:  # Luna llena
        return 1.5  # +50%
    elif fase_lunar <= 0.05 or fase_lunar >= 0.95:  # Luna nueva
        return 0.75  # -25%
    else:
        return 1.0  # Normal

# Ejemplo futuro: Modificador de estadísticas según ciclo solar
def calcular_modificador_estadisticas(celestial_service, posicion_x, posicion_y):
    es_dia = celestial_service.is_daytime_at(posicion_x, posicion_y)
    if es_dia:
        return {"fuerza": 1.1, "velocidad": 1.05}  # Bonificaciones diurnas
    else:
        return {"sigilo": 1.2, "magia": 1.1}  # Bonificaciones nocturnas
```

**Frontend:**

```javascript
// Recibir tiempo del juego del backend (via WebSocket o API)
const gameTime = await fetch('/api/v1/game/time').then(r => r.json());

// Inicializar sistema celestial del frontend
import { CelestialSystem } from './systems/celestial-system.js';
import { CelestialRenderer } from './world/celestial-renderer.js';

const celestialSystem = new CelestialSystem();
celestialSystem.update(gameTime.current_time);

// Renderizar sol/luna
const celestialRenderer = new CelestialRenderer(scene, celestialSystem);
celestialRenderer.update(gameTime.current_time);

// En el loop de animación
function animate() {
    // Actualizar desde tiempo del backend (sincronización periódica)
    if (shouldSyncTime()) {
        celestialSystem.update(gameTime.current_time);
    }
    
    // Renderizar con interpolación suave
    celestialRenderer.update(gameTime.current_time);
    
    requestAnimationFrame(animate);
}
```

## Conclusión

La arquitectura propuesta separa claramente las responsabilidades entre backend y frontend:

**Backend (Autoritativo):**
- **CelestialTimeService**: Tiempo del juego como single source of truth
- **Funciones de cálculo**: Posición solar/lunar, fase lunar, intensidad solar (para temperatura y futuros efectos)
- **Sistema de Temperatura**: Calcula temperatura ambiental con modificadores
- **Integración con Bloques**: Conecta sistemas con el sistema de bloques existente
- **Extensibilidad**: Preparado para efectos futuros (hechizos, estadísticas, eventos)

**Frontend (Visual):**
- **CelestialSystem**: Calcula posición visual desde estado celestial del backend
- **CelestialRenderer**: Renderiza sol/luna en Three.js con interpolación suave
- **Iluminación dinámica**: Actualiza iluminación según ciclo día/noche
- **Efectos visuales**: Preparado para efectos futuros (partículas de hechizos, indicadores de estadísticas)

**Ventajas de esta arquitectura:**
- **Autoritativo**: Backend controla el tiempo del juego (anti-cheat)
- **Sincronizado**: Todos los clientes ven el mismo tiempo
- **Performante**: Frontend renderiza sin latencia de red
- **Modular**: Cada componente es independiente
- **Extensible**: 
  - Fácil agregar nuevos modificadores de temperatura
  - Sistema celestial preparado para efectos futuros (hechizos, estadísticas)
  - Nombres genéricos que no limitan el uso
- **Mantenible**: Código organizado y documentado
- **Testeable**: Funciones puras fáciles de testear
- **Preparado para el futuro**: Arquitectura diseñada pensando en funcionalidades futuras

**Casos de uso futuros preparados:**
- Hechizos de agua más fuertes en luna llena
- Hechizos de fuego más fuertes en luna nueva
- Estadísticas de personajes según ciclo día/noche
- Eventos especiales (eclipses, alineaciones)
- Modificadores de spawn de criaturas según fase lunar
- Bonificaciones de recursos según ciclo solar

La implementación se realiza en fases incrementales, permitiendo testing y validación en cada etapa.

