# Análisis de Arquitectura - Sistema de Sombras Dinámicas (JDG-043)

## Situación Actual

### Backend

**Estructura actual:**
```
backend/src/
├── services/
│   └── celestial_time_service.py   # Calcula posiciones del sol/luna
├── config/
│   └── celestial_config.py        # Configuración de órbitas y alturas
└── api/routes/
    └── celestial.py                # Endpoints para estado celestial
```

**Estado actual:**
- ✅ El backend calcula correctamente las posiciones del sol y la luna
- ✅ El backend proporciona el estado celestial completo al frontend
- ✅ No requiere cambios en el backend para este feature

### Frontend

**Estructura actual:**
```
frontend/src/
├── core/
│   ├── renderer.js                 # WebGLRenderer (sin sombras habilitadas)
│   └── lights.js                   # Lights class (DirectionalLight sin sombras)
├── world/
│   └── celestial-system.js         # Sistema celestial del frontend
└── terrain/renderers/
    └── particle-renderer.js        # Renderizador de partículas (sin sombras)
```

**Problemas identificados:**

1. **WebGLRenderer no tiene sombras habilitadas:**
   - `renderer.shadowMap.enabled = false` (por defecto)
   - No se configura ningún tipo de shadow map
   - Las sombras no se calculan ni renderizan

2. **DirectionalLight no proyecta sombras:**
   - `directionalLight.castShadow = false` (por defecto)
   - No se configura `shadowCamera` para limitar el área de sombras
   - No se ajusta la resolución del shadow map

3. **Partículas no reciben/proyectan sombras:**
   - Los materiales de partículas no tienen `receiveShadow` o `castShadow` configurados
   - Los meshes de partículas (InstancedMesh) no tienen sombras habilitadas
   - No hay configuración para optimizar qué partículas proyectan sombras

4. **Falta configuración de rendimiento para sombras:**
   - No hay límites en el área donde se calculan sombras
   - No hay optimización para reducir el costo de sombras
   - No hay configuración para ajustar calidad de sombras según hardware

5. **Falta toggle para activar/desactivar sombras:**
   - No hay forma de deshabilitar sombras desde la interfaz
   - No hay configuración de calidad de sombras

### Base de Datos

**Estado actual:**
- ✅ No requiere cambios en la base de datos

## Necesidades Futuras

### Categorías de Entidades/Funcionalidades

1. **Sistema de Sombras** (nuevo):
   - Sombras dinámicas basadas en posición del sol
   - Sombras que se mueven a lo largo del día
   - Optimización de rendimiento para sombras
   - Configuración de calidad de sombras
   - Toggle para activar/desactivar sombras

2. **Iluminación Avanzada** (futuro):
   - Iluminación indirecta (opcional)
   - Sombras suaves (PCF, VSM)
   - Efectos de luz volumétrica (opcional)

### Requisitos de Escalabilidad

1. **Rendimiento configurable:**
   - Permitir ajustar calidad de sombras según hardware
   - Opción de deshabilitar sombras para hardware limitado
   - LOD para sombras (solo partículas cercanas proyectan sombras)

2. **Extensibilidad:**
   - Fácil agregar nuevos tipos de sombras (soft shadows, contact shadows)
   - Preparado para futuras mejoras de iluminación

3. **Mantenibilidad:**
   - Código claro y bien documentado
   - Separación de responsabilidades (sombras, iluminación)
   - Configuración centralizada

## Arquitectura Propuesta

### Frontend - Estructura Modular

```
frontend/src/
├── core/
│   ├── renderer.js                 # [MODIFICAR] Habilitar sombras en WebGLRenderer
│   └── lights.js                   # [MODIFICAR] Configurar sombras en DirectionalLight
├── world/
│   └── celestial-system.js         # [SIN CAMBIOS] Ya tiene información de posiciones
└── terrain/renderers/
    └── particle-renderer.js        # [MODIFICAR] Habilitar sombras en partículas
└── interfaces/
    └── test-interface.js           # [MODIFICAR] Agregar toggle de sombras en F6
└── config/
    └── constants.js                # [MODIFICAR] Agregar configuración de sombras
```

### Componentes Nuevos (Opcionales)

```
frontend/src/
└── core/
    └── shadow-manager.js           # [NUEVO] Manager para configuración de sombras (opcional)
```

### Jerarquía de Clases

```
Renderer (core/renderer.js)
├── WebGLRenderer
│   └── shadowMap (habilitar y configurar)
│
Lights (core/lights.js)
├── AmbientLight
└── DirectionalLight
    ├── castShadow (habilitar)
    └── shadow (DirectionalLightShadow)
        ├── camera (OrthographicCamera para shadow map)
        └── map (ShadowMap)
│
ParticleRenderer (terrain/renderers/particle-renderer.js)
└── InstancedMesh
    ├── receiveShadow (habilitar)
    └── castShadow (habilitar opcionalmente para optimización)
│
TestInterface (interfaces/test-interface.js)
└── Tab Configuración
    └── Toggle de sombras
```

## Patrones de Diseño a Usar

### 1. Configuration Pattern
- **Descripción:** Centralizar configuración de sombras en constantes o clase de configuración
- **Cómo se aplica:** Crear constantes para calidad de sombras, resolución de shadow map, etc.
- **Beneficios:** Fácil ajustar rendimiento, mantener consistencia

### 2. Manager Pattern (Opcional)
- **Descripción:** Clase ShadowManager para gestionar configuración de sombras
- **Cómo se aplica:** Centralizar lógica de configuración de sombras
- **Beneficios:** Separación de responsabilidades, fácil testing

## Beneficios de la Nueva Arquitectura

1. **Realismo visual mejorado:**
   - Las sombras dinámicas hacen el mundo más inmersivo
   - Las sombras se mueven según el ciclo día/noche

2. **Rendimiento configurable:**
   - Se puede ajustar calidad de sombras según hardware
   - Se puede deshabilitar sombras si es necesario
   - Optimizaciones específicas para sombras

3. **Extensibilidad:**
   - Fácil agregar nuevos tipos de sombras
   - Preparado para futuras mejoras de iluminación

4. **Mantenibilidad:**
   - Código claro y bien organizado
   - Configuración centralizada
   - Separación de responsabilidades

## Migración Propuesta

### Fase 1: Habilitar Sombras Básicas

**Objetivo:** Habilitar sombras en el renderizador y luz direccional

**Pasos:**
1. Modificar `core/renderer.js`:
   - Habilitar `renderer.shadowMap.enabled = true`
   - Configurar `renderer.shadowMap.type = THREE.PCFSoftShadowMap`
   - Configurar resolución inicial (512x512 o 1024x1024)

2. Modificar `core/lights.js`:
   - Habilitar `directionalLight.castShadow = true`
   - Configurar `directionalLight.shadow.camera` (OrthographicCamera)
   - Ajustar `directionalLight.shadow.mapSize` (512, 1024, 2048)
   - Configurar `directionalLight.shadow.camera.left/right/top/bottom` para limitar área

3. Agregar configuración en `config/constants.js`:
   - Constantes para resolución de shadow map
   - Constantes para área de sombras
   - Constantes para tipo de sombra

4. Testing:
   - Verificar que las sombras aparecen
   - Verificar rendimiento (FPS)
   - Ajustar resolución si es necesario

### Fase 2: Habilitar Sombras en Partículas

**Objetivo:** Hacer que las partículas reciban y proyecten sombras

**Pasos:**
1. Modificar `terrain/renderers/particle-renderer.js`:
   - En `createMaterial()`, asegurar que materiales tengan `receiveShadow = true`
   - En creación de InstancedMesh, habilitar `castShadow` y `receiveShadow`
   - Considerar optimización: solo partículas cercanas proyectan sombras

2. Testing:
   - Verificar que las partículas reciben sombras
   - Verificar que las partículas proyectan sombras
   - Verificar rendimiento con muchas partículas

### Fase 3: Agregar Toggle en F6

**Objetivo:** Permitir activar/desactivar sombras desde la interfaz

**Pasos:**
1. Modificar `interfaces/test-interface.js`:
   - Agregar tab "Configuración" en F6
   - Agregar checkbox para activar/desactivar sombras
   - Implementar métodos para obtener y establecer estado de sombras

2. Testing:
   - Verificar que el toggle funciona correctamente
   - Verificar que el estado se mantiene al abrir/cerrar F6

### Fase 4: Optimización y Ajustes

**Objetivo:** Optimizar rendimiento y ajustar calidad visual

**Pasos:**
1. Ajustar resolución de shadow map según rendimiento
2. Limitar área de sombras (shadowCamera)
3. Considerar LOD para sombras (solo partículas cercanas)
4. Ajustar parámetros de sombras suaves
5. Testing de rendimiento final

## Consideraciones Técnicas

### Frontend

1. **Rendimiento de sombras:**
   - Las sombras pueden ser costosas (especialmente con muchas partículas)
   - Resolución de shadow map afecta rendimiento (512 < 1024 < 2048)
   - Área de sombras (shadowCamera) afecta rendimiento
   - Considerar deshabilitar sombras en partículas lejanas

2. **Configuración de sombras:**
   - `shadowMap.type`: `THREE.BasicShadowMap` (rápido, duro), `THREE.PCFShadowMap` (suave, más lento), `THREE.PCFSoftShadowMap` (muy suave, más lento)
   - `shadowMap.width/height`: Resolución del shadow map (512, 1024, 2048)
   - `shadow.camera.left/right/top/bottom`: Área donde se calculan sombras

3. **InstancedMesh y sombras:**
   - InstancedMesh puede tener limitaciones con sombras en Three.js
   - Verificar compatibilidad y considerar alternativas si es necesario

4. **Compatibilidad:**
   - Asegurar que funciona con sistema celestial existente
   - No romper iluminación actual
   - Mantener compatibilidad con sistema de partículas

5. **Testing:**
   - Testing visual (verificar que sombras se ven correctamente)
   - Testing de rendimiento (medir FPS con/sin sombras)
   - Testing de transiciones (día/noche)

## Ejemplo de Uso Futuro

### Configuración de Sombras

```javascript
// En config/constants.js
export const SHADOW_MAP_ENABLED = true;
export const SHADOW_MAP_TYPE = 'PCFSoftShadowMap';
export const SHADOW_MAP_SIZE = 1024;
export const SHADOW_CAMERA_LEFT = -200;
export const SHADOW_CAMERA_RIGHT = 200;
export const SHADOW_CAMERA_TOP = 200;
export const SHADOW_CAMERA_BOTTOM = -200;
export const SHADOW_CAMERA_NEAR = 0.1;
export const SHADOW_CAMERA_FAR = 500;

// En core/renderer.js
constructor(container) {
    // ... código existente ...
    
    // Habilitar sombras
    this.renderer.shadowMap.enabled = SHADOW_MAP_ENABLED;
    this.renderer.shadowMap.type = shadowMapTypes[SHADOW_MAP_TYPE];
}

// En core/lights.js
setup(scene) {
    // ... código existente ...
    
    // Configurar sombras en luz direccional
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = SHADOW_MAP_SIZE;
    this.directionalLight.shadow.mapSize.height = SHADOW_MAP_SIZE;
    
    // Limitar área de sombras
    this.directionalLight.shadow.camera.left = SHADOW_CAMERA_LEFT;
    this.directionalLight.shadow.camera.right = SHADOW_CAMERA_RIGHT;
    this.directionalLight.shadow.camera.top = SHADOW_CAMERA_TOP;
    this.directionalLight.shadow.camera.bottom = SHADOW_CAMERA_BOTTOM;
    this.directionalLight.shadow.camera.near = SHADOW_CAMERA_NEAR;
    this.directionalLight.shadow.camera.far = SHADOW_CAMERA_FAR;
}
```

### Habilitar Sombras en Partículas

```javascript
// En terrain/renderers/particle-renderer.js
createMaterial(estilo) {
    // ... código existente ...
    
    const material = new THREE.MeshStandardMaterial({ 
        // ... propiedades existentes ...
        receiveShadow: true, // Recibir sombras
    });
    
    return material;
}

// Al crear InstancedMesh
const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
instancedMesh.receiveShadow = true; // Recibir sombras
instancedMesh.castShadow = true; // Proyectar sombras (opcional para optimización)
```

### Toggle de Sombras en F6

```javascript
// En interfaces/test-interface.js
createConfigTab() {
    // ... código existente ...
    
    // Checkbox para activar/desactivar sombras
    const shadowCheckbox = document.createElement('input');
    shadowCheckbox.type = 'checkbox';
    shadowCheckbox.checked = this.getShadowsEnabled();
    shadowCheckbox.addEventListener('change', (e) => {
        this.setShadowsEnabled(e.target.checked);
    });
}
```

## Conclusión

Este análisis propone una arquitectura escalable y mantenible para implementar sombras dinámicas. La implementación se divide en fases incrementales que permiten:

1. **Habilitar sombras básicas** primero (Fase 1)
2. **Extender sombras a partículas** (Fase 2)
3. **Agregar toggle en F6** (Fase 3)
4. **Optimizar y ajustar** (Fase 4)

La arquitectura propuesta:
- ✅ Mantiene compatibilidad con código existente
- ✅ Permite optimización de rendimiento
- ✅ Es extensible para futuras mejoras
- ✅ Separa responsabilidades claramente
- ✅ No requiere cambios en el backend

**Recomendación:** Implementar en fases incrementales, empezando con sombras básicas y mejorando gradualmente. Esto permite validar rendimiento y ajustar según necesidad. **Nota importante:** Verificar compatibilidad con InstancedMesh, ya que puede tener limitaciones con sombras en Three.js.

