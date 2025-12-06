# Análisis de Arquitectura - Problemas de Posicionamiento y Duplicación de Personajes (JDG-011)

## Situación Actual

### Problemas Identificados

1. **Dos humanoides visibles simultáneamente**
   - Se están creando múltiples personajes en la base de datos
   - Cada recarga de página puede crear un nuevo personaje si no encuentra uno existente
   - No hay mecanismo para eliminar personajes duplicados o para seleccionar uno específico

2. **Personaje respawnea en posición incorrecta**
   - Cuando se carga un personaje existente, se usa su posición de BD (`character.posicion`)
   - Si el personaje fue creado en una posición diferente, respawnea ahí
   - No hay sincronización entre la posición del ECS y la posición en BD
   - Las coordenadas hardcodeadas (45, 45, 1) se usan solo al crear nuevos personajes

3. **Partes del cuerpo separadas (RESUELTO)**
   - ✅ Mapeo de ejes corregido: (x, y, z) juego → (x, z, y) Three.js
   - ✅ Offsets relativos al torso implementados
   - El personaje ahora se ve correctamente unido

### Backend

**Estructura actual:**
```
backend/src/
├── api/routes/characters.py      # Endpoints GET, POST para personajes
├── database/
│   ├── templates/bipedos/        # Templates de bípedos
│   ├── builders/biped_builder.py # Builder que crea partículas y agrupaciones
│   └── creators/entity_creator.py # Factory que crea entidades
└── models/schemas.py             # Schemas Pydantic
```

**Problemas identificados:**
1. **Falta endpoint para actualizar posición**: No hay `PUT/PATCH /characters/{id}` para actualizar posición del personaje
2. **Falta endpoint para eliminar personajes**: No hay `DELETE /characters/{id}` para limpiar personajes duplicados
3. **Posición almacenada en agrupación**: La posición se calcula desde la primera partícula, no hay campo directo de posición en `agrupaciones`
4. **No hay validación de posición única**: Múltiples personajes pueden crearse en la misma posición

### Frontend

**Estructura actual:**
```
frontend/src/
├── app.js                        # Orquestación principal
├── ecs/
│   ├── factories/player-factory.js # Factory que crea entidad de jugador
│   ├── systems/render-system.js   # Sistema que actualiza posición del mesh
│   └── components/position.js     # Componente de posición en ECS
└── api/endpoints/characters.js    # Cliente API para personajes
```

**Problemas identificados:**
1. **Lógica de carga/creación confusa**: 
   - Intenta cargar personaje existente, pero si falla, crea uno nuevo
   - No hay manejo de múltiples personajes existentes
   - No hay persistencia de qué personaje está usando el jugador

2. **Desincronización de posiciones**:
   - `PositionComponent` en ECS usa coordenadas en celdas
   - `character.posicion` de BD también está en celdas
   - Pero cuando se mueve el personaje, la posición en BD no se actualiza
   - Al recargar, vuelve a la posición original de BD

3. **Falta sincronización bidireccional**:
   - Movimiento del jugador → Actualiza `PositionComponent` → Actualiza mesh en Three.js
   - Pero NO actualiza posición en BD
   - Al recargar → Carga posición de BD → Ignora última posición del jugador

4. **No hay identificación del personaje del jugador**:
   - `this.playerId` es el ID de la entidad ECS, no el ID del personaje en BD
   - No se guarda `characterId` para referencia futura
   - No hay forma de saber qué personaje de BD corresponde al jugador actual

### Base de Datos

**Estructura actual:**
```sql
agrupaciones (
    id UUID,
    dimension_id UUID,
    nombre TEXT,
    tipo TEXT,  -- 'biped' para personajes
    especie TEXT,
    geometria_agrupacion JSONB,
    posicion_x INT,  -- Posición X de la agrupación
    posicion_y INT,  -- Posición Y de la agrupación
    posicion_z INT   -- Posición Z de la agrupación
)

particulas (
    id UUID,
    dimension_id UUID,
    agrupacion_id UUID,  -- FK a agrupaciones
    celda_x INT,
    celda_y INT,
    celda_z INT,
    ...
)
```

**Problemas identificados:**
1. **Posición duplicada**: 
   - `agrupaciones.posicion_x/y/z` almacena posición
   - Pero también se calcula desde `particulas.celda_x/y/z`
   - Puede haber inconsistencia entre ambas

2. **No hay campo "es_jugador"**: 
   - No hay forma de marcar qué personaje es el jugador principal
   - Todos los personajes tienen el mismo tratamiento

3. **Múltiples personajes sin control**:
   - Se pueden crear múltiples personajes sin restricción
   - No hay límite de personajes por dimensión
   - No hay forma de identificar cuál es el "activo"

## Necesidades Futuras

### Gestión de Personajes

1. **Un solo personaje jugable por sesión**:
   - Identificar y cargar el personaje del jugador
   - Si no existe, crear uno nuevo
   - Si existen múltiples, seleccionar uno o permitir elegir

2. **Sincronización de posición**:
   - Actualizar posición en BD cuando el jugador se mueve
   - Cargar posición de BD al iniciar sesión
   - Mantener consistencia entre ECS y BD

3. **Persistencia de sesión**:
   - Guardar qué personaje está usando el jugador
   - Puede ser en localStorage del navegador o en BD
   - Permitir continuar desde donde se quedó

### Requisitos de Escalabilidad

1. **Múltiples jugadores (futuro)**:
   - Cada jugador debe tener su propio personaje
   - Sistema de autenticación y sesiones
   - Asociar personajes con usuarios

2. **NPCs (futuro)**:
   - Personajes no jugables que no se mueven por input
   - Diferentes tipos de personajes (jugador vs NPC)
   - Sistema de IA para NPCs

3. **Estado del mundo persistente**:
   - Guardar cambios del mundo (construcciones, movimientos)
   - Sincronizar entre múltiples clientes
   - Sistema de eventos y actualizaciones

## Arquitectura Propuesta

### Backend - Endpoints Adicionales

```
PUT /api/v1/dimensions/{dimension_id}/characters/{character_id}
- Actualizar posición del personaje
- Body: { "x": int, "y": int, "z": int }

DELETE /api/v1/dimensions/{dimension_id}/characters/{character_id}
- Eliminar personaje y sus partículas

GET /api/v1/dimensions/{dimension_id}/characters/player
- Obtener personaje del jugador (marcado como "es_jugador" o el primero)
- Retorna el personaje activo del jugador

POST /api/v1/dimensions/{dimension_id}/characters/{character_id}/set-as-player
- Marcar un personaje como el personaje del jugador
- Actualiza campo "es_jugador" o similar
```

### Base de Datos - Campos Adicionales

```sql
ALTER TABLE juego_dioses.agrupaciones
ADD COLUMN es_jugador BOOLEAN DEFAULT FALSE,
ADD COLUMN usuario_id UUID,  -- Para futuro sistema de usuarios
ADD COLUMN ultima_posicion_x INT,
ADD COLUMN ultima_posicion_y INT,
ADD COLUMN ultima_posicion_z INT,
ADD COLUMN ultima_actualizacion TIMESTAMP DEFAULT NOW();

-- Índice para búsqueda rápida del personaje del jugador
CREATE INDEX idx_agrupaciones_es_jugador 
ON juego_dioses.agrupaciones(dimension_id, es_jugador) 
WHERE es_jugador = TRUE;
```

### Frontend - Gestión de Personaje del Jugador

**Nuevo módulo: `PlayerManager`**

```javascript
// frontend/src/managers/player-manager.js
export class PlayerManager {
    constructor(charactersApi, dimensionId) {
        this.charactersApi = charactersApi;
        this.dimensionId = dimensionId;
        this.characterId = null; // ID del personaje en BD
        this.playerEntityId = null; // ID de la entidad ECS
    }
    
    async loadOrCreatePlayer() {
        // 1. Intentar cargar personaje del jugador desde BD
        let character = await this.getPlayerCharacter();
        
        // 2. Si no existe, crear uno nuevo
        if (!character) {
            character = await this.createNewPlayer();
        }
        
        // 3. Guardar characterId para referencia futura
        this.characterId = character.id;
        
        // 4. Guardar en localStorage para persistencia
        localStorage.setItem('playerCharacterId', character.id);
        
        return character;
    }
    
    async getPlayerCharacter() {
        // Intentar cargar desde localStorage primero
        const savedId = localStorage.getItem('playerCharacterId');
        if (savedId) {
            try {
                return await this.charactersApi.getCharacter(this.dimensionId, savedId);
            } catch (error) {
                // Si no existe, buscar el marcado como jugador
                console.warn('Personaje guardado no encontrado, buscando alternativo');
            }
        }
        
        // Buscar personaje marcado como jugador
        const characters = await this.charactersApi.listCharacters(this.dimensionId);
        return characters.find(c => c.es_jugador) || characters[0] || null;
    }
    
    async createNewPlayer(x, y, z) {
        // Crear nuevo personaje y marcarlo como jugador
        const character = await this.charactersApi.createCharacter(
            this.dimensionId, 
            'humano', 
            x, 
            y, 
            z
        );
        
        // Marcar como jugador
        await this.charactersApi.setAsPlayer(this.dimensionId, character.id);
        
        return character;
    }
    
    async updatePosition(x, y, z) {
        if (!this.characterId) return;
        
        // Actualizar posición en BD periódicamente (no cada frame)
        // Usar throttling para no saturar la API
        await this.charactersApi.updateCharacterPosition(
            this.dimensionId,
            this.characterId,
            x,
            y,
            z
        );
    }
}
```

**Modificar `PlayerFactory`**

```javascript
// frontend/src/ecs/factories/player-factory.js
static async createPlayer(options) {
    const { 
        ecs, scene, 
        character,  // Recibir character completo del PlayerManager
        cellSize = 0.25
    } = options;
    
    const playerId = ecs.createEntity();
    const mesh = buildMeshFromGeometry(character.geometria_agrupacion, cellSize);
    scene.add(mesh);
    
    // Usar posición del personaje de BD
    const { x, y, z } = character.posicion;
    
    ecs.addComponent(playerId, 'Position', new PositionComponent(x, y, z));
    // ... resto de componentes
    
    return playerId;
}
```

**Modificar `RenderSystem` para sincronizar posición**

```javascript
// frontend/src/ecs/systems/render-system.js
update(deltaTime) {
    // ... código existente ...
    
    // Sincronizar posición con BD periódicamente (cada 1 segundo)
    if (this.lastSyncTime === undefined) {
        this.lastSyncTime = Date.now();
    }
    
    const now = Date.now();
    if (now - this.lastSyncTime > 1000) { // Cada 1 segundo
        this.syncPositionToDB(entityId, position);
        this.lastSyncTime = now;
    }
}

async syncPositionToDB(entityId, position) {
    // Solo sincronizar si es el personaje del jugador
    if (entityId === this.playerManager?.playerEntityId) {
        await this.playerManager.updatePosition(
            position.x,
            position.y,
            position.z
        );
    }
}
```

## Patrones de Diseño a Usar

### 1. Manager Pattern
- **Descripción**: Clase que gestiona el estado y operaciones de un recurso específico
- **Aplicación**: `PlayerManager` gestiona el ciclo de vida del personaje del jugador
- **Beneficios**: 
  - Separación de responsabilidades
  - Fácil de testear
  - Reutilizable

### 2. Repository Pattern (implícito)
- **Descripción**: Abstracción de acceso a datos
- **Aplicación**: `CharactersApi` actúa como repositorio para personajes
- **Beneficios**:
  - Desacopla lógica de negocio de acceso a datos
  - Fácil de mockear en tests

### 3. Observer Pattern (futuro)
- **Descripción**: Notificar cambios de estado
- **Aplicación**: Notificar cuando el personaje se mueve para actualizar BD
- **Beneficios**:
  - Desacoplamiento entre sistemas
  - Extensible para múltiples observadores

### 4. Throttling/Debouncing
- **Descripción**: Limitar frecuencia de operaciones
- **Aplicación**: Actualizar posición en BD cada 1 segundo, no cada frame
- **Beneficios**:
  - Reduce carga en API
  - Mejora rendimiento

## Beneficios de la Nueva Arquitectura

1. **Un solo personaje por sesión**: 
   - Elimina confusión de múltiples personajes
   - Clarifica qué personaje controla el jugador

2. **Sincronización de posición**:
   - El jugador continúa desde donde se quedó
   - Posición persistente entre sesiones

3. **Escalabilidad**:
   - Preparado para múltiples jugadores
   - Fácil agregar NPCs
   - Sistema extensible

4. **Mantenibilidad**:
   - Código más organizado
   - Responsabilidades claras
   - Fácil de debuggear

## Migración Propuesta

### Fase 1: Backend - Endpoints Adicionales
- [ ] Agregar `PUT /characters/{id}` para actualizar posición
- [ ] Agregar `DELETE /characters/{id}` para eliminar personajes
- [ ] Agregar `GET /characters/player` para obtener personaje del jugador
- [ ] Agregar `POST /characters/{id}/set-as-player` para marcar como jugador
- [ ] Agregar campo `es_jugador` a tabla `agrupaciones`
- [ ] Crear migración SQL para nuevos campos

### Fase 2: Frontend - PlayerManager
- [ ] Crear `PlayerManager` con lógica de carga/creación
- [ ] Integrar `PlayerManager` en `App`
- [ ] Modificar `PlayerFactory` para recibir `character` completo
- [ ] Agregar sincronización de posición en `RenderSystem`
- [ ] Implementar throttling para actualizaciones de posición

### Fase 3: Limpieza y Testing
- [ ] Script para eliminar personajes duplicados
- [ ] Marcar un personaje existente como jugador
- [ ] Testing de sincronización de posición
- [ ] Testing de persistencia entre sesiones

### Fase 4: Mejoras Adicionales
- [ ] Sistema de selección de personaje si hay múltiples
- [ ] UI para gestionar personajes
- [ ] Logs de depuración mejorados

## Consideraciones Técnicas

### Backend

1. **Compatibilidad**: 
   - Los nuevos endpoints son opcionales
   - Código existente sigue funcionando
   - Migración gradual posible

2. **Base de datos**: 
   - Campo `es_jugador` puede ser NULL (retrocompatible)
   - Índice mejora performance de búsqueda
   - No requiere migración de datos existentes

3. **APIs**: 
   - Endpoints RESTful estándar
   - Validación con Pydantic
   - Manejo de errores apropiado

4. **Testing**: 
   - Tests unitarios para nuevos endpoints
   - Tests de integración para flujo completo
   - Tests de sincronización de posición

### Frontend

1. **Renderizado**: 
   - No afecta renderizado existente
   - Sincronización en background
   - Throttling evita impacto en FPS

2. **Optimización**: 
   - Actualizaciones de BD cada 1 segundo (no cada frame)
   - localStorage para persistencia local
   - Cache de characterId para evitar búsquedas repetidas

3. **Extensibilidad**: 
   - `PlayerManager` puede extenderse para múltiples jugadores
   - Fácil agregar más funcionalidades (inventario, stats, etc.)
   - Preparado para sistema de autenticación

## Ejemplo de Uso Futuro

```javascript
// frontend/src/app.js
async loadDemo() {
    // ... código existente ...
    
    // Inicializar PlayerManager
    this.playerManager = new PlayerManager(this.charactersApi, demoDimension.id);
    
    // Cargar o crear personaje del jugador
    const character = await this.playerManager.loadOrCreatePlayer();
    
    // Crear entidad ECS con personaje cargado
    this.playerId = await PlayerFactory.createPlayer({
        ecs: this.ecs,
        scene: this.scene.scene,
        character: character,  // Pasar character completo
        cellSize: demoDimension.tamano_celda
    });
    
    // Guardar referencia para sincronización
    this.playerManager.playerEntityId = this.playerId;
    
    // Configurar RenderSystem para sincronizar
    this.renderSystem.setPlayerManager(this.playerManager);
    
    // ... resto del código ...
}
```

## Conclusión

Los problemas identificados (dos humanoides, respawneo en posición incorrecta) se deben a:

1. **Falta de gestión del personaje del jugador**: No hay forma de identificar qué personaje es el del jugador
2. **Falta de sincronización bidireccional**: La posición se actualiza en ECS pero no en BD
3. **Creación indiscriminada de personajes**: Cada recarga puede crear un nuevo personaje

La solución propuesta introduce:
- **PlayerManager**: Gestiona el ciclo de vida del personaje del jugador
- **Endpoints adicionales**: Para actualizar posición y gestionar personajes
- **Sincronización periódica**: Actualiza posición en BD cada 1 segundo
- **Persistencia**: Usa localStorage para recordar qué personaje está usando el jugador

Esta arquitectura es escalable, mantenible y preparada para futuras funcionalidades como múltiples jugadores y NPCs.

