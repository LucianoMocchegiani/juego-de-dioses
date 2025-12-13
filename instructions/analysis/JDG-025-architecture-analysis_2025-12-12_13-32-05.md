# Análisis de Arquitectura - Sistema de Equipamiento y Visualización de Armas (JDG-025)

## Situación Actual

### Backend

**Estructura actual:**
```
backend/
└── static/
    └── models/
        └── weapons/
            ├── sword.glb
            ├── axe.glb
            ├── two-handed-axe.glb (3.8MB - requiere optimización)
            ├── hammer.glb
            ├── two-handed-hammer.glb
            └── spear.glb
```

**Estado:**
- Los modelos GLB de armas ya están disponibles
- La ruta `/static/models/weapons/` está configurada en nginx y funciona correctamente
- No hay endpoints de API específicos para armas (no son necesarios inicialmente)
- No hay base de datos para armas todavía (se manejará en el frontend inicialmente)

**Problemas identificados:**
1. El archivo `two-handed-axe.glb` es muy pesado (3.8MB) - puede requerir optimización
2. No hay estructura de datos para almacenar información de armas (stats, tipo, etc.)
3. No hay sistema de inventario para gestionar múltiples armas

### Frontend

**Estructura actual:**
```
frontend/src/
├── ecs/
│   ├── components/
│   │   └── weapon.js          # WeaponComponent existente (básico)
│   ├── systems/
│   │   ├── combat-system.js   # Usa WeaponComponent para animaciones
│   │   └── combo-system.js    # Usa WeaponComponent para animaciones
│   └── factories/
│       └── player-factory.js  # Crea player sin arma equipada
├── config/
│   └── weapon-animations-config.js  # Mapeo de tipo de arma a animaciones
└── renderers/
    └── models/
        └── model-utils.js     # Utilidades para cargar modelos GLB
```

**Estado:**
- `WeaponComponent` existe pero es básico (solo almacena tipo de arma, no modelo)
- El sistema de animaciones por tipo de arma está implementado y funcionando
- No existe sistema para cargar y visualizar modelos de armas
- No existe sistema de attachment (dónde pegar las armas al personaje)
- No existe forma de equipar/desequipar armas

**Problemas identificados:**
1. **Falta de sistema de carga de armas**: No hay código para cargar modelos GLB de armas
2. **Falta de sistema de attachment**: No hay forma de adjuntar armas al modelo del personaje
3. **WeaponComponent incompleto**: No almacena información sobre el modelo a cargar
4. **Sin gestión de instancias**: No hay sistema para reutilizar modelos de armas cargados
5. **Sin soporte para bones**: No hay código para usar bones del esqueleto para attachment
6. **Sin offsets por tipo**: No hay configuración de offsets específicos por tipo de arma

### Base de Datos

**Estructura actual:**
```
No hay tablas relacionadas con armas todavía.
```

**Estado:**
- No hay necesidad de base de datos inicialmente
- Las armas se manejarán en memoria en el frontend
- Futuro: se necesitará inventario de armas, stats, durabilidad, etc.

**Problemas identificados:**
1. No hay schema para armas (no crítico para MVP)
2. No hay inventario de armas (futuro)

## Necesidades Futuras

### Categorías de Funcionalidades

1. **Equipamiento Básico (MVP)**:
   - Cargar modelo de arma desde archivo GLB
   - Adjuntar arma al personaje en posición correcta
   - Visualizar arma en el personaje
   - Cambiar tipo de arma en WeaponComponent
   - Integrar con sistema de animaciones existente

2. **Gestión de Armas (Futuro)**:
   - Inventario de múltiples armas
   - Almacenar armas en base de datos
   - Estadísticas de armas (daño, durabilidad, efectos)
   - Sistema de crafting/mejora de armas

3. **Attachment Avanzado (Futuro)**:
   - Soporte para bones del esqueleto
   - Múltiples puntos de attachment (mano derecha, izquierda, espalda, cintura)
   - Animaciones de equipamiento/desequipamiento
   - Armas con partes móviles

## Arquitectura Propuesta

### Frontend - Estructura Modular

```
frontend/src/
├── ecs/
│   ├── components/
│   │   └── weapon.js                    # Extendido con info de modelo
│   ├── systems/
│   │   └── weapon-render-system.js      # NUEVO: Renderiza armas equipadas
│   └── factories/
│       └── player-factory.js            # Modificado: Soporte para arma inicial
├── config/
│   └── weapon-models-config.js          # NUEVO: Configuración de rutas de modelos
├── utils/
│   └── weapon-attachment.js             # NUEVO: Utilidades de attachment
└── renderers/
    └── models/
        └── model-cache.js               # Extendido: Cache para modelos de armas
```

### Sistema de Componentes

**WeaponComponent (Extendido):**
```javascript
export class WeaponComponent {
    constructor(options = {}) {
        this.weaponType = options.weaponType || 'generic';
        this.weaponId = options.weaponId || null;
        this.modelPath = options.modelPath || null;  // NUEVO: Ruta del modelo GLB
        this.modelInstance = null;                    // NUEVO: Instancia del modelo cargado
        this.attachmentPoint = options.attachmentPoint || 'right_hand';  // NUEVO
        this.offset = options.offset || { x: 0, y: 0, z: 0 };  // NUEVO
        this.rotation = options.rotation || { x: 0, y: 0, z: 0 };  // NUEVO
        this.scale = options.scale || 1.0;  // NUEVO
        this.hasShield = options.hasShield || false;
    }
}
```

**WeaponRenderSystem (Nuevo):**
```javascript
export class WeaponRenderSystem extends System {
    constructor(ecs, scene, modelLoader) {
        super();
        this.ecs = ecs;
        this.scene = scene;
        this.modelLoader = modelLoader;
        this.weaponCache = new Map();  // Cache de modelos de armas
        this.requiredComponents = ['Render', 'Weapon'];
    }
    
    update(deltaTime) {
        // Para cada entidad con WeaponComponent:
        // 1. Verificar si tiene arma equipada
        // 2. Cargar modelo si no está cargado
        // 3. Adjuntar modelo al personaje
        // 4. Actualizar posición/orientación según attachment point
    }
}
```

### Sistema de Attachment

**Estrategia de Attachment:**

1. **Si el personaje tiene bones/esqueleto:**
   - Buscar bone de "hand_r" o "right_hand" o similar
   - Adjuntar arma como child del bone
   - Para armas de dos manos, usar bone del torso o calcular posición entre manos

2. **Si el personaje NO tiene bones:**
   - Usar offsets relativos al mesh del personaje
   - Calcular posición basada en el bounding box del personaje
   - Para armas de dos manos, usar offset más al centro

**Utilidades de Attachment:**
```javascript
// weapon-attachment.js
export function attachWeaponToCharacter(weaponModel, characterMesh, attachmentConfig) {
    // attachmentConfig: { point: 'right_hand', offset: {...}, rotation: {...} }
    
    if (hasSkeleton(characterMesh)) {
        // Usar bones
        const bone = findBone(characterMesh, attachmentConfig.point);
        if (bone) {
            weaponModel.parent = bone;
            // Aplicar offsets y rotaciones
        }
    } else {
        // Usar offsets relativos
        characterMesh.add(weaponModel);
        // Aplicar offsets y rotaciones relativos al mesh
    }
}
```

### Configuración de Modelos

**weapon-models-config.js:**
```javascript
export const WEAPON_MODELS = {
    sword: {
        path: 'weapons/sword.glb',
        attachmentPoint: 'right_hand',
        offset: { x: 0.05, y: 0, z: 0.1 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 1.0
    },
    axe: {
        path: 'weapons/axe.glb',
        attachmentPoint: 'right_hand',
        offset: { x: 0.05, y: 0, z: 0.1 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 1.0
    },
    'two-handed-axe': {
        path: 'weapons/two-handed-axe.glb',
        attachmentPoint: 'center',  // O 'torso' para armas de dos manos
        offset: { x: 0, y: 0.5, z: 0.1 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 1.0
    },
    // ... más armas
};
```

### Cache de Modelos

**Estrategia de Cache:**
- Cargar modelo GLB una vez por tipo de arma
- Clonar instancia del modelo cacheado para cada personaje
- Esto permite reutilizar el mismo modelo para múltiples personajes
- Reducir carga de memoria y tiempo de carga

## Patrones de Diseño a Usar

### 1. System Pattern (ECS)
- **Descripción**: WeaponRenderSystem procesa todas las entidades con WeaponComponent
- **Cómo se aplica**: Sistema que actualiza armas equipadas cada frame
- **Beneficios**: Separación de responsabilidades, fácil de extender

### 2. Cache Pattern
- **Descripción**: Cachear modelos GLB cargados para reutilización
- **Cómo se aplica**: Map que almacena modelos por ruta, clonar para nuevas instancias
- **Beneficios**: Reducir carga de memoria, mejorar rendimiento

### 3. Strategy Pattern (para Attachment)
- **Descripción**: Diferentes estrategias de attachment según tipo de personaje
- **Cómo se aplica**: Attachment por bones vs. attachment por offsets
- **Beneficios**: Flexibilidad para diferentes tipos de personajes

### 4. Factory Pattern (para Equipamiento)
- **Descripción**: Función helper para equipar armas
- **Cómo se aplica**: `equipWeapon(entityId, weaponType)` que maneja toda la lógica
- **Beneficios**: Encapsular complejidad, fácil de usar

## Beneficios de la Nueva Arquitectura

1. **Separación de Responsabilidades**: Sistema dedicado para renderizado de armas
2. **Reutilización**: Cache de modelos permite múltiples instancias
3. **Flexibilidad**: Soporte para diferentes tipos de attachment
4. **Extensibilidad**: Fácil agregar nuevos tipos de armas
5. **Mantenibilidad**: Código organizado y bien estructurado
6. **Performance**: Cache reduce carga de memoria y tiempo de carga

## Migración Propuesta

### Fase 1: Extender WeaponComponent
- Agregar campos: `modelPath`, `modelInstance`, `attachmentPoint`, `offset`, `rotation`, `scale`
- Actualizar código existente que usa WeaponComponent
- **Archivos**: `frontend/src/ecs/components/weapon.js`

### Fase 2: Crear Configuración de Modelos
- Crear `weapon-models-config.js` con configuración de todas las armas
- Definir offsets y rotaciones para cada tipo de arma
- **Archivos**: `frontend/src/config/weapon-models-config.js`

### Fase 3: Crear Utilidades de Attachment
- Crear `weapon-attachment.js` con funciones de attachment
- Implementar attachment por bones y por offsets
- **Archivos**: `frontend/src/utils/weapon-attachment.js`

### Fase 4: Crear WeaponRenderSystem
- Crear sistema que procesa armas equipadas
- Integrar carga de modelos, cache, y attachment
- Registrar sistema en `app.js`
- **Archivos**: `frontend/src/ecs/systems/weapon-render-system.js`, `frontend/src/app.js`

### Fase 5: Integrar con PlayerFactory
- Agregar opción para equipar arma inicial al crear player
- Integrar con sistema de renderizado de armas
- **Archivos**: `frontend/src/ecs/factories/player-factory.js`

### Fase 6: Sistema de Pruebas
- Crear mecanismo para equipar/cambiar armas (temporal o permanente)
- Puede ser mediante teclas (1-6 para diferentes armas) o UI
- **Archivos**: `frontend/src/utils/weapon-tester.js` (temporal)

### Fase 7: Testing y Ajustes
- Probar todas las armas disponibles
- Ajustar offsets y rotaciones según necesidad
- Optimizar modelo `two-handed-axe.glb` si es necesario
- Verificar integración con animaciones

## Consideraciones Técnicas

### Backend

1. **Compatibilidad**: La ruta `/static/models/weapons/` ya funciona, no requiere cambios
2. **Optimización**: Considerar optimizar `two-handed-axe.glb` (3.8MB es grande)
3. **Futuro**: Endpoints de API para inventario de armas (no necesario ahora)

### Frontend

1. **Renderizado**: 
   - Las armas deben renderizarse después del personaje
   - Considerar orden de renderizado para sombras
   - Asegurar que las armas se actualicen con las transformaciones del personaje

2. **Optimización**:
   - Cache de modelos GLB
   - Clonar modelos en lugar de cargarlos múltiples veces
   - Considerar LOD si hay muchas armas en escena

3. **Extensibilidad**:
   - Fácil agregar nuevos tipos de armas (solo agregar a config)
   - Fácil cambiar estrategia de attachment
   - Preparado para sistema de inventario futuro

### Coordenadas y Transformaciones

**Mapeo de Ejes:**
- Juego: X=izq/der, Y=adelante/atrás, Z=arriba/abajo
- Three.js: X=izq/der, Y=arriba/abajo, Z=adelante/atrás

**Offsets:**
- Los offsets deben estar en el sistema de coordenadas de Three.js
- Considerar escala del personaje al aplicar offsets
- Ajustar offsets según tamaño del modelo del arma

## Ejemplo de Uso Futuro

```javascript
// Equipar arma a un personaje
import { equipWeapon } from '../utils/weapon-utils.js';

const playerId = await PlayerFactory.createPlayer({...});
equipWeapon(playerId, 'sword');

// El WeaponRenderSystem automáticamente:
// 1. Carga el modelo sword.glb
// 2. Lo adjunta al personaje en la mano derecha
// 3. Actualiza WeaponComponent
// 4. Las animaciones usan el tipo 'sword'

// Cambiar arma
equipWeapon(playerId, 'two-handed-axe');
// Desequipa espada y equipa hacha de dos manos

// Desequipar arma
equipWeapon(playerId, null);
// Remueve el arma y vuelve a 'generic'
```

## Conclusión

La arquitectura propuesta separa claramente las responsabilidades:
- **WeaponComponent**: Almacena información del arma
- **WeaponRenderSystem**: Maneja visualización y attachment
- **weapon-attachment.js**: Lógica de attachment reutilizable
- **weapon-models-config.js**: Configuración centralizada

Esta estructura permite:
- Implementación incremental (fase por fase)
- Fácil extensión para nuevas armas
- Preparación para sistema de inventario futuro
- Buen rendimiento mediante cache
- Flexibilidad para diferentes tipos de personajes

La implementación es de complejidad media-alta debido a:
- Necesidad de manejar diferentes tipos de attachment
- Ajustes manuales de offsets/rotaciones
- Integración con sistema de animaciones existente
- Testing exhaustivo de cada tipo de arma

