# Análisis de Arquitectura - Sistema de Física Avanzado (JDG-037)

## Situación Actual

### Arquitectura: ECS vs Partículas del Mundo

**IMPORTANTE:** Hay que distinguir dos sistemas diferentes:

1. **ECS (Entity Component System)** - Para entidades DINÁMICAS:
   - Jugadores, NPCs, monstruos
   - Objetos que se mueven (cajas, proyectiles)
   - Entidades que necesitan física, input, animaciones
   - Se actualizan cada frame (60 FPS)
   - Están en memoria (RAM) durante el juego

2. **Partículas del Mundo** - Para voxels del mundo:
   - Suelo, árboles, rocas, estructuras
   - Mayormente estáticas
   - Almacenadas en base de datos (PostgreSQL)
   - Renderizadas con instanced rendering
   - Se cargan por viewport

**Problema actual:** Si una partícula necesita física (caer, ser empujada), no hay sistema claro para manejarla.

### Frontend

**Estructura actual:**
```
frontend/src/ecs/
├── systems/
│   ├── physics-system.js        # Física básica (gravedad, velocidad, aceleración)
│   └── collision-system.js      # Colisiones con partículas sólidas del mundo
├── components/
│   └── physics.js               # Componente de física (velocidad, aceleración, masa)
└── world/
    └── collision-detector.js   # Detector de colisiones con partículas (voxels)
```

**Problemas identificados:**

1. **Física limitada:**
   - Solo gravedad, velocidad y aceleración básicas
   - No hay rotación ni momentos angulares
   - No hay fuerzas aplicadas (empujones, golpes)
   - No hay física de cuerpos rígidos

2. **Colisiones limitadas:**
   - Solo colisiones con partículas sólidas del mundo (voxels)
   - No hay colisiones entre entidades (jugador vs jugador, jugador vs NPC)
   - No hay colisiones con objetos dinámicos (cajas, proyectiles)
   - Detección de colisiones básica (solo verifica celdas ocupadas)

3. **Falta de optimización:**
   - No hay spatial partitioning (grid, quadtree, octree)
   - Cada entidad verifica colisiones individualmente
   - No escala bien con múltiples entidades (50+)

4. **Física solo en cliente:**
   - No hay servidor autoritativo
   - Vulnerable a hacks y exploits
   - No hay sincronización servidor-cliente

5. **Falta de física de objetos:**
   - No hay objetos que se puedan empujar
   - No hay proyectiles con física
   - No hay objetos que caen y ruedan

### Backend

**Estructura actual:**
```
backend/src/
├── api/routes/
│   └── particles.py          # Endpoints para consultar partículas
└── database/
    └── ...                   # Sistema de partículas y agrupaciones
```

**Problemas identificados:**

1. **No hay sistema de física en servidor:**
   - El backend solo sirve datos de partículas
   - No hay validación de física
   - No hay servidor autoritativo

2. **Falta de sincronización:**
   - No hay WebSockets para sincronizar física
   - No hay sistema de predicción y corrección

### Base de Datos

**Estructura actual:**
```
- particulas: Partículas del mundo (voxels)
  - celda_x, celda_y, celda_z (posición)
  - tipo_particula_id (tipo de partícula)
  - estado_materia_id (estado: solido, liquido, gas)
  - cantidad, temperatura, energia
  - propiedades JSONB (flexible)
  
- tipos_particulas:
  - densidad DECIMAL(10,4) (densidad del tipo, no individual)
  
- estados_materia:
  - densidad_estado DECIMAL(10,4) (densidad del estado, no individual)
  - viscosidad, gravedad, flujo, propagacion
  
- agrupaciones: Agrupaciones de partículas (entidades)
```

**Problemas identificados:**

1. **No hay propiedades físicas individuales por partícula:**
   - `densidad` está en `tipos_particulas` (por tipo, no individual)
   - `densidad_estado` está en `estados_materia` (por estado, no individual)
   - No hay `masa` individual por partícula
   - No hay `velocidad` para partículas que se mueven
   - No hay `fuerzas` aplicadas a partículas

2. **No hay sistema para partículas dinámicas:**
   - Si una partícula necesita caer (gravedad), no hay forma de manejarla
   - Si una partícula necesita ser empujada, no hay sistema
   - No hay transición entre partícula estática → partícula dinámica → entidad ECS

3. **No hay datos de física para entidades:**
   - No se almacenan estados físicos de entidades ECS
   - No hay historial de movimientos físicos

## Necesidades Futuras

### Categorías de Funcionalidades Físicas

1. **Física de Entidades Dinámicas** (estado actual: básico):
   - Colisiones entre entidades (jugadores, NPCs)
   - Rotación y momentos angulares
   - Fuerzas aplicadas (empujones, golpes, explosiones)
   - Física de cuerpos rígidos

2. **Física de Objetos** (nuevo):
   - Objetos que se pueden empujar (cajas, rocas)
   - Proyectiles con trayectoria física
   - Objetos que caen y ruedan
   - Objetos que se pueden lanzar

3. **Optimización Espacial** (nuevo):
   - Spatial partitioning (grid, quadtree, octree)
   - Broad phase y narrow phase para colisiones
   - Cache inteligente de colisiones

4. **Física Autoritativa** (nuevo):
   - Física en servidor
   - Validación de acciones físicas
   - Sincronización servidor-cliente
   - Predicción del cliente con corrección

### Requisitos de Escalabilidad

1. **Fácil agregar nuevos tipos de física:** Sistema extensible para nuevas interacciones
2. **Reutilización de código:** Componentes y sistemas reutilizables
3. **Separación de responsabilidades:** Física separada de renderizado y lógica de juego
4. **Extensibilidad:** Fácil agregar nuevas fuerzas, colisiones, comportamientos
5. **Mantenibilidad:** Código claro y bien documentado
6. **Rendimiento:** Manejar 50-100+ entidades simultáneas manteniendo 60 FPS

## Arquitectura Propuesta

### Opción 1: Extender Sistema Actual (Custom Physics)

#### Arquitectura: ECS + Partículas Dinámicas

**Concepto clave:** 
- **ECS** maneja entidades dinámicas (jugadores, NPCs, objetos)
- **Partículas dinámicas** se convierten en entidades ECS cuando necesitan física
- **Partículas estáticas** permanecen en BD y solo se usan para colisiones

#### Estructura Propuesta

```
frontend/src/ecs/
├── systems/
│   ├── physics-system.js              # Física básica (extendido)
│   ├── entity-collision-system.js    # Colisiones entre entidades (nuevo)
│   ├── spatial-partitioning-system.js # Optimización espacial (nuevo)
│   ├── particle-physics-system.js     # Física de partículas dinámicas (nuevo)
│   └── collision-system.js           # Colisiones con voxels (mejorado)
├── components/
│   ├── physics.js                    # Componente de física (extendido)
│   ├── rigid-body.js                 # Cuerpo rígido (nuevo)
│   ├── collider.js                   # Collider (nuevo)
│   └── particle-dynamic.js           # Partícula dinámica (nuevo)
└── utils/
    ├── spatial-grid.js               # Grid espacial (nuevo)
    ├── collision-detection.js       # Detección de colisiones (nuevo)
    └── particle-to-entity.js         # Convertir partícula → entidad ECS (nuevo)
```

#### Base de Datos: Propiedades Físicas de Partículas

**Opción A: Agregar campos a tabla `particulas`**
```sql
ALTER TABLE particulas ADD COLUMN IF NOT EXISTS masa DECIMAL(10,4);
ALTER TABLE particulas ADD COLUMN IF NOT EXISTS velocidad_x DECIMAL(10,4) DEFAULT 0;
ALTER TABLE particulas ADD COLUMN IF NOT EXISTS velocidad_y DECIMAL(10,4) DEFAULT 0;
ALTER TABLE particulas ADD COLUMN IF NOT EXISTS velocidad_z DECIMAL(10,4) DEFAULT 0;
ALTER TABLE particulas ADD COLUMN IF NOT EXISTS es_dinamica BOOLEAN DEFAULT false;
```

**Opción B: Usar campo `propiedades` JSONB (más flexible)**
```json
{
  "fisica": {
    "masa": 1.5,
    "velocidad": {"x": 0, "y": 0, "z": -9.8},
    "fuerzas": [{"x": 0, "y": 0, "z": -9.8}],
    "es_dinamica": true
  }
}
```

**Recomendación:** Opción B (JSONB) es más flexible y no requiere migración de BD.

#### Flujo: Partícula Estática → Partícula Dinámica → Entidad ECS

```javascript
// 1. Partícula estática en BD (normal)
const particle = {
  id: "uuid-123",
  celda_x: 10, celda_y: 10, celda_z: 5,
  tipo_particula_id: "tierra",
  estado_materia_id: "solido",
  propiedades: {} // Sin física
};

// 2. Partícula se vuelve dinámica (ej: se rompe, cae)
// Actualizar en BD (o en memoria si está cargada)
particle.propiedades.fisica = {
  masa: 1.0,
  velocidad: { x: 0, y: 0, z: -9.8 },
  es_dinamica: true
};

// 3. Convertir a entidad ECS para física
const entityId = particlePhysicsSystem.createEntityFromParticle(particle);
// Ahora la partícula se maneja como entidad ECS con física

// 4. Cuando se detiene, volver a partícula estática
if (physics.isGrounded && Math.abs(physics.velocity.z) < 0.1) {
  particlePhysicsSystem.convertEntityToParticle(entityId);
  // Guardar nueva posición en BD
}
```

#### Jerarquía de Componentes

```
PhysicsComponent (actual)
├── velocity, acceleration, mass
├── useGravity, isGrounded
└── friction

RigidBodyComponent (nuevo)
├── rotation, angularVelocity
├── inertia, torque
└── constraints

ColliderComponent (nuevo)
├── type (box, sphere, capsule)
├── size, offset
└── isTrigger
```

#### Ventajas

- ✅ Control total sobre la implementación
- ✅ Optimizado específicamente para voxels/partículas
- ✅ Sin dependencias externas
- ✅ Más ligero (sin librerías adicionales)
- ✅ Integración perfecta con sistema actual
- ✅ Maneja partículas dinámicas de forma natural (conversión partícula ↔ entidad ECS)
- ✅ Usa propiedades existentes de partículas (densidad, estado)

#### Desventajas

- ❌ Requiere implementar todo desde cero
- ❌ Más tiempo de desarrollo (3-4 semanas)
- ❌ Posibles bugs y edge cases
- ❌ Menos características avanzadas (rotación compleja, joints, etc.)
- ❌ Mantenimiento continuo
- ❌ Necesita calcular masa desde densidad (requiere consultar BD o cache)

#### Consideraciones Importantes

1. **Densidad: ¿En tipo o individual?**
   
   **✅ CORRECTO: Densidad en tipo (valores por defecto)**
   - `tipos_particulas.densidad` → Densidad por defecto del tipo (ej: "tierra" = 1.5)
   - `estados_materia.densidad_estado` → Densidad por defecto del estado (ej: "solido" = 1.0)
   - **Ventaja:** No duplicar datos, todas las partículas de "tierra" tienen densidad 1.5
   - **Desventaja:** ¿Qué pasa si una partícula específica tiene densidad diferente?
   
   **Solución: Sistema de herencia con sobrescritura**
   ```javascript
   // Calcular densidad de partícula:
   function getParticleDensity(particle) {
       // 1. Verificar si tiene densidad personalizada en propiedades
       if (particle.propiedades?.fisica?.densidad !== undefined) {
           return particle.propiedades.fisica.densidad; // Sobrescritura individual
       }
       
       // 2. Usar densidad del estado (más específico)
       if (particle.estado_materia?.densidad_estado) {
           return particle.estado_materia.densidad_estado;
       }
       
       // 3. Usar densidad del tipo (fallback)
       return particle.tipo_particula?.densidad || 1.0;
   }
   ```
   
   **Ejemplo de uso:**
   ```json
   // Partícula normal (usa densidad del tipo)
   {
     "tipo_particula_id": "tierra",  // densidad = 1.5
     "propiedades": {}
   }
   // → masa = 1.5 × 1.0 = 1.5
   
   // Partícula contaminada (densidad diferente)
   {
     "tipo_particula_id": "tierra",  // densidad = 1.5 (por defecto)
     "propiedades": {
       "fisica": {
         "densidad": 2.0  // Sobrescritura individual
       }
     }
   }
   // → masa = 2.0 × 1.0 = 2.0
   ```

2. **Velocidad: ¿En tipo o individual?**
   
   **❌ NO debe estar en tipo**
   - Cada partícula tiene velocidad diferente cuando se mueve
   - La velocidad cambia constantemente (cada frame)
   - No tiene sentido tener velocidad en el tipo
   
   **✅ CORRECTO: Velocidad individual en propiedades JSONB**
   ```json
   {
     "propiedades": {
       "fisica": {
         "velocidad": {"x": 0, "y": 0, "z": -9.8},  // Individual, solo cuando es dinámica
         "es_dinamica": true
       }
     }
   }
   ```

3. **Masa de partículas:**
   - Se calcula dinámicamente: `masa = densidad × volumen (1 celda = 1 unidad)`
   - Densidad viene de: `propiedades.fisica.densidad` → `estados_materia.densidad_estado` → `tipos_particulas.densidad`
   - Cachear valores de densidad para evitar consultas repetidas

4. **Conversión partícula ↔ entidad:**
   - Partícula estática (BD) → Partícula dinámica (propiedades JSONB) → Entidad ECS
   - Cuando se detiene → Entidad ECS → Partícula estática (BD con nueva posición)

5. **Sincronización BD:**
   - Partículas dinámicas se actualizan en BD periódicamente (autosave)
   - No cada frame, solo cuando se detienen o cada X segundos

#### Ejemplo de Implementación

```javascript
// frontend/src/ecs/components/rigid-body.js
export class RigidBodyComponent {
    constructor(options = {}) {
        this.rotation = options.rotation || { x: 0, y: 0, z: 0 };
        this.angularVelocity = options.angularVelocity || { x: 0, y: 0, z: 0 };
        this.inertia = options.inertia || { x: 1, y: 1, z: 1 };
        this.torque = { x: 0, y: 0, z: 0 };
        this.constraints = options.constraints || {
            freezeRotationX: false,
            freezeRotationY: false,
            freezeRotationZ: false
        };
    }
    
    applyTorque(torque) {
        this.torque.x += torque.x;
        this.torque.y += torque.y;
        this.torque.z += torque.z;
    }
    
    resetTorque() {
        this.torque.x = 0;
        this.torque.y = 0;
        this.torque.z = 0;
    }
}

// frontend/src/ecs/components/particle-dynamic.js
export class ParticleDynamicComponent {
    constructor(options = {}) {
        this.particleId = options.particleId; // ID en BD
        this.originalPosition = options.originalPosition || { x: 0, y: 0, z: 0 };
        this.tipoParticulaId = options.tipoParticulaId;
        this.estadoMateriaId = options.estadoMateriaId;
        
        // Calcular masa desde densidad del tipo/estado
        this.mass = options.mass || this.calculateMass();
        
        // Si se detiene, volver a partícula estática
        this.autoConvertToStatic = options.autoConvertToStatic !== false;
        this.staticThreshold = options.staticThreshold || 0.1; // Velocidad mínima para ser estática
    }
    
    calculateMass() {
        // Obtener densidad del tipo de partícula y estado
        // masa = densidad × volumen (1 celda = 1 unidad de volumen)
        const densidad = this.getDensity(); // Desde BD o cache
        return densidad * 1.0; // 1 celda = 1 unidad de volumen
    }
    
    getDensity() {
        // Obtener desde tipos_particulas.densidad o estados_materia.densidad_estado
        // Por ahora, retornar valor por defecto
        return 1.0;
    }
}

// frontend/src/ecs/systems/particle-physics-system.js
export class ParticlePhysicsSystem extends System {
    constructor(particlesApi) {
        super();
        this.requiredComponents = ['Position', 'Physics', 'ParticleDynamic'];
        this.particlesApi = particlesApi;
        this.priority = 1.5; // Después de PhysicsSystem
    }
    
    update(deltaTime) {
        const entities = this.getEntities();
        
        for (const entityId of entities) {
            const position = this.ecs.getComponent(entityId, 'Position');
            const physics = this.ecs.getComponent(entityId, 'Physics');
            const particleDynamic = this.ecs.getComponent(entityId, 'ParticleDynamic');
            
            if (!position || !physics || !particleDynamic) continue;
            
            // Si la partícula se detuvo, convertir a estática
            if (particleDynamic.autoConvertToStatic) {
                const velocityMagnitude = Math.sqrt(
                    physics.velocity.x ** 2 + 
                    physics.velocity.y ** 2 + 
                    physics.velocity.z ** 2
                );
                
                if (velocityMagnitude < particleDynamic.staticThreshold && physics.isGrounded) {
                    // Convertir de vuelta a partícula estática
                    this.convertToStaticParticle(entityId, position);
                }
            }
        }
    }
    
    async convertToStaticParticle(entityId, position) {
        const particleDynamic = this.ecs.getComponent(entityId, 'ParticleDynamic');
        
        // Actualizar partícula en BD con nueva posición
        await this.particlesApi.updateParticle(particleDynamic.particleId, {
            celda_x: Math.floor(position.x),
            celda_y: Math.floor(position.y),
            celda_z: Math.floor(position.z),
            propiedades: {
                ...particleDynamic.originalProperties,
                fisica: null // Remover física
            }
        });
        
        // Remover entidad ECS
        this.ecs.removeEntity(entityId);
    }
    
    createEntityFromParticle(particle) {
        // Crear entidad ECS desde partícula
        const entityId = this.ecs.createEntity();
        
        // Obtener propiedades físicas
        const fisica = particle.propiedades?.fisica || {};
        const masa = fisica.masa || this.calculateMassFromParticle(particle);
        
        // Agregar componentes
        this.ecs.addComponent(entityId, 'Position', {
            x: particle.celda_x,
            y: particle.celda_y,
            z: particle.celda_z
        });
        
        this.ecs.addComponent(entityId, 'Physics', {
            mass: masa,
            useGravity: true,
            isGrounded: false,
            velocity: fisica.velocidad || { x: 0, y: 0, z: 0 }
        });
        
        this.ecs.addComponent(entityId, 'ParticleDynamic', {
            particleId: particle.id,
            originalPosition: {
                x: particle.celda_x,
                y: particle.celda_y,
                z: particle.celda_z
            },
            tipoParticulaId: particle.tipo_particula_id,
            estadoMateriaId: particle.estado_materia_id,
            mass: masa,
            originalProperties: particle.propiedades
        });
        
        return entityId;
    }
    
    calculateMassFromParticle(particle) {
        // Calcular masa desde densidad del tipo/estado
        // Por ahora, retornar valor por defecto
        // TODO: Obtener densidad desde tipos_particulas y estados_materia
        return 1.0;
    }
}
```

// frontend/src/ecs/systems/entity-collision-system.js
export class EntityCollisionSystem extends System {
    constructor(spatialGrid) {
        super();
        this.requiredComponents = ['Position', 'Collider'];
        this.spatialGrid = spatialGrid;
        this.priority = 2.5; // Después de PhysicsSystem
    }
    
    update(deltaTime) {
        const entities = this.getEntities();
        
        // Broad phase: encontrar pares de colisión usando spatial grid
        const collisionPairs = this.spatialGrid.getCollisionPairs(entities);
        
        // Narrow phase: verificar colisiones precisas
        for (const [entityA, entityB] of collisionPairs) {
            if (this.checkCollision(entityA, entityB)) {
                this.resolveCollision(entityA, entityB);
            }
        }
    }
    
    checkCollision(entityA, entityB) {
        const posA = this.ecs.getComponent(entityA, 'Position');
        const colliderA = this.ecs.getComponent(entityA, 'Collider');
        const posB = this.ecs.getComponent(entityB, 'Position');
        const colliderB = this.ecs.getComponent(entityB, 'Collider');
        
        // Verificar colisión según tipo de collider
        if (colliderA.type === 'box' && colliderB.type === 'box') {
            return this.checkBoxBoxCollision(posA, colliderA, posB, colliderB);
        }
        // ... otros tipos de colisión
    }
    
    resolveCollision(entityA, entityB) {
        // Resolver colisión (impulso, separación, etc.)
        const physicsA = this.ecs.getComponent(entityA, 'Physics');
        const physicsB = this.ecs.getComponent(entityB, 'Physics');
        
        // Calcular impulso
        const relativeVelocity = {
            x: physicsB.velocity.x - physicsA.velocity.x,
            y: physicsB.velocity.y - physicsA.velocity.y,
            z: physicsB.velocity.z - physicsA.velocity.z
        };
        
        // Aplicar impulso (simplificado)
        const impulse = 0.5; // Factor de impulso
        physicsA.velocity.x += relativeVelocity.x * impulse;
        physicsB.velocity.x -= relativeVelocity.x * impulse;
        // ... similar para Y y Z
    }
}
```

### Opción 2: Integrar Cannon.js

#### Estructura Propuesta

```
frontend/src/ecs/
├── systems/
│   ├── physics-system.js              # Wrapper de Cannon.js
│   ├── cannon-physics-system.js        # Sistema de física con Cannon.js (nuevo)
│   └── collision-system.js             # Colisiones con voxels (mejorado)
├── components/
│   ├── physics.js                     # Componente de física (extendido)
│   └── cannon-body.js                 # Wrapper de Cannon.js body (nuevo)
└── physics/
    ├── cannon-world.js                 # Mundo de física Cannon.js (nuevo)
    └── voxel-terrain.js                # Terreno de voxels para Cannon.js (nuevo)
```

#### Integración con Cannon.js

```javascript
// frontend/src/physics/cannon-world.js
import * as CANNON from 'cannon';

export class CannonPhysicsWorld {
    constructor() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, 0, -9.8); // Z es altura
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 10;
        
        // Mapa de entidades a cuerpos de Cannon
        this.entityBodies = new Map();
    }
    
    createBody(entityId, shape, mass = 1) {
        const body = new CANNON.Body({ mass });
        body.addShape(shape);
        this.world.add(body);
        this.entityBodies.set(entityId, body);
        return body;
    }
    
    update(deltaTime) {
        this.world.step(deltaTime);
    }
    
    syncToECS(ecs) {
        // Sincronizar posiciones de Cannon.js a ECS
        for (const [entityId, body] of this.entityBodies) {
            const position = ecs.getComponent(entityId, 'Position');
            const physics = ecs.getComponent(entityId, 'Physics');
            
            if (position && physics) {
                // Sincronizar posición
                position.x = body.position.x;
                position.y = body.position.y;
                position.z = body.position.z;
                
                // Sincronizar velocidad
                physics.velocity.x = body.velocity.x;
                physics.velocity.y = body.velocity.y;
                physics.velocity.z = body.velocity.z;
            }
        }
    }
    
    syncFromECS(ecs) {
        // Sincronizar posiciones de ECS a Cannon.js
        for (const [entityId, body] of this.entityBodies) {
            const position = ecs.getComponent(entityId, 'Position');
            
            if (position) {
                body.position.set(position.x, position.y, position.z);
            }
        }
    }
}
```

#### Ventajas

- ✅ Librería madura y estable
- ✅ Física 3D completa (cuerpos rígidos, rotación, momentos, joints)
- ✅ Buena documentación y ejemplos
- ✅ Comunidad activa
- ✅ Menos tiempo de desarrollo (2-3 semanas)

#### Desventajas

- ❌ Dependencia externa (~200KB)
- ❌ Puede ser más pesada de lo necesario
- ❌ Integración con sistema de partículas/voxels puede ser compleja
- ❌ Overhead de mantener dos sistemas (ECS + Cannon.js)

### Opción 3: Integrar Rapier

#### Estructura Propuesta

```
frontend/src/ecs/
├── systems/
│   ├── physics-system.js              # Wrapper de Rapier
│   ├── rapier-physics-system.js       # Sistema de física con Rapier (nuevo)
│   └── collision-system.js            # Colisiones con voxels (mejorado)
├── components/
│   ├── physics.js                    # Componente de física (extendido)
│   └── rapier-body.js                 # Wrapper de Rapier body (nuevo)
└── physics/
    ├── rapier-world.js                # Mundo de física Rapier (nuevo)
    └── voxel-terrain.js                # Terreno de voxels para Rapier (nuevo)
```

#### Integración con Rapier

```javascript
// frontend/src/physics/rapier-world.js
import('@dimforge/rapier3d').then(RAPIER => {
    export class RapierPhysicsWorld {
        constructor() {
            this.world = new RAPIER.World({ x: 0, y: 0, z: -9.8 });
            
            // Mapa de entidades a cuerpos de Rapier
            this.entityBodies = new Map();
        }
        
        createBody(entityId, shape, mass = 1) {
            const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
                .setMass(mass);
            const body = this.world.createRigidBody(bodyDesc);
            
            const colliderDesc = RAPIER.ColliderDesc.cuboid(shape.halfExtents.x, shape.halfExtents.y, shape.halfExtents.z);
            const collider = this.world.createCollider(colliderDesc, body.handle);
            
            this.entityBodies.set(entityId, body);
            return body;
        }
        
        update(deltaTime) {
            this.world.step();
        }
        
        syncToECS(ecs) {
            // Similar a Cannon.js
        }
        
        syncFromECS(ecs) {
            // Similar a Cannon.js
        }
    }
});
```

#### Ventajas

- ✅ Muy rápida (escrita en Rust, compilada a WASM)
- ✅ Moderna y bien mantenida
- ✅ Excelente rendimiento con muchas entidades (50-100+)
- ✅ API limpia y moderna
- ✅ Menos tiempo de desarrollo (2-3 semanas)

#### Desventajas

- ❌ Dependencia externa
- ❌ WASM puede tener overhead de inicialización
- ❌ Menos madura que Cannon.js (aunque está creciendo rápido)
- ❌ Integración con voxels puede requerir trabajo adicional
- ❌ Overhead de mantener dos sistemas (ECS + Rapier)

### Opción 4: Híbrido (Custom + Librería)

#### Estructura Propuesta

```
frontend/src/ecs/
├── systems/
│   ├── physics-system.js              # Física básica (custom, para voxels)
│   ├── entity-physics-system.js       # Física de entidades (Cannon.js/Rapier)
│   ├── entity-collision-system.js     # Colisiones entre entidades (librería)
│   └── collision-system.js            # Colisiones con voxels (custom)
├── components/
│   ├── physics.js                     # Componente de física (custom)
│   ├── entity-physics.js              # Componente de física de entidades (librería)
│   └── collider.js                    # Collider (librería)
└── physics/
    ├── custom-physics.js               # Física custom para voxels
    └── [cannon|rapier]-world.js        # Mundo de física para entidades
```

#### Ventajas

- ✅ Custom physics para partículas/voxels (optimizado)
- ✅ Librería para entidades dinámicas (completo)
- ✅ Mejor de ambos mundos
- ✅ Flexibilidad para optimizar cada parte

#### Desventajas

- ❌ Más complejo de mantener
- ❌ Dos sistemas de física diferentes
- ❌ Posibles inconsistencias entre sistemas
- ❌ Más tiempo de desarrollo (3-4 semanas)
- ❌ Más código que mantener

## Patrones de Diseño a Usar

### 1. Strategy Pattern
- Diferentes estrategias de detección de colisiones (broad phase, narrow phase)
- Diferentes algoritmos de resolución de colisiones

### 2. Factory Pattern
- Crear diferentes tipos de colliders (box, sphere, capsule)
- Crear diferentes tipos de cuerpos rígidos

### 3. Observer Pattern
- Notificar eventos de colisión
- Notificar eventos de física (caída, impacto, etc.)

### 4. Spatial Partitioning
- Grid espacial para optimizar colisiones
- Quadtree/Octree para áreas grandes

## Beneficios de la Nueva Arquitectura

1. **Física completa:** Soporte para todas las interacciones físicas necesarias en un MMO
2. **Rendimiento:** Optimización para manejar 50-100+ entidades simultáneas
3. **Extensibilidad:** Fácil agregar nuevos tipos de física e interacciones
4. **Mantenibilidad:** Código organizado y bien estructurado
5. **Escalabilidad:** Sistema que puede crecer con el juego

## Migración Propuesta

### Fase 1: Decisión y Preparación
- Evaluar opciones y decidir implementación
- Preparar estructura de archivos
- Instalar dependencias (si se usa librería)

### Fase 2: Implementación Core
- Implementar/extender sistema de física
- Implementar colisiones entre entidades
- Implementar spatial partitioning

### Fase 3: Integración
- Integrar con sistema ECS existente
- Integrar con sistema de colisiones con voxels
- Testing básico

### Fase 4: Optimización y Testing
- Optimizar rendimiento
- Testing exhaustivo
- Corrección de bugs

### Fase 5: Servidor Autoritativo (Opcional)
- Implementar física en servidor
- Implementar sincronización servidor-cliente
- Testing de sincronización

## Consideraciones Técnicas

### Frontend

1. **Rendimiento:**
   - Spatial partitioning es crítico para rendimiento
   - Cache de colisiones reduce cálculos repetidos
   - Timestep fijo para física estable

2. **Integración:**
   - Mantener compatibilidad con sistema actual
   - Integrar con sistema de partículas/voxels
   - Integrar con sistema de renderizado

3. **Extensibilidad:**
   - Sistema modular para agregar nuevas fuerzas
   - Sistema de eventos para notificar colisiones
   - API clara para extender funcionalidad

### Backend (Si se implementa servidor autoritativo)

1. **Física en servidor:**
   - Usar misma librería que frontend (si es posible)
   - Validar todas las acciones físicas
   - Prevenir exploits

2. **Sincronización:**
   - WebSockets para actualizaciones en tiempo real
   - Predicción del cliente con corrección del servidor
   - Delta compression para reducir ancho de banda

3. **Rendimiento:**
   - Optimizar para múltiples jugadores simultáneos
   - Spatial partitioning en servidor también
   - Cache de estados físicos

## Ejemplo de Uso Futuro

```javascript
// Crear entidad con física
const playerId = ecs.createEntity();
ecs.addComponent(playerId, 'Position', { x: 0, y: 0, z: 10 });
ecs.addComponent(playerId, 'Physics', { 
    mass: 70,
    useGravity: true 
});
ecs.addComponent(playerId, 'RigidBody', {
    rotation: { x: 0, y: 0, z: 0 }
});
ecs.addComponent(playerId, 'Collider', {
    type: 'capsule',
    size: { radius: 0.3, height: 1.8 }
});

// Aplicar fuerza
const physics = ecs.getComponent(playerId, 'Physics');
physics.applyForce({ x: 10, y: 0, z: 0 }); // Empujón

// Aplicar torque
const rigidBody = ecs.getComponent(playerId, 'RigidBody');
rigidBody.applyTorque({ x: 0, y: 5, z: 0 }); // Rotación

// Verificar colisión
const collisionSystem = ecs.getSystem('EntityCollisionSystem');
const collidingEntities = collisionSystem.getCollidingEntities(playerId);
```

## Respuestas a Preguntas Clave

### ¿Todo se hace dentro del ECS solamente?

**NO.** Hay que distinguir dos sistemas:

1. **ECS (Entity Component System)** - Solo para entidades DINÁMICAS:
   - Jugadores, NPCs, monstruos
   - Objetos que se mueven (cajas, proyectiles)
   - **Partículas que se vuelven dinámicas** (se convierten en entidades ECS temporalmente)

2. **Partículas del Mundo** - Voxels del mundo:
   - Mayormente estáticas (suelo, árboles, rocas)
   - Almacenadas en base de datos
   - Solo se usan para colisiones con entidades ECS
   - **Si una partícula necesita física, se convierte en entidad ECS**

**Flujo:**
```
Partícula Estática (BD) 
  → Se rompe/cae 
  → Partícula Dinámica (propiedades JSONB con física) 
  → Entidad ECS (física activa)
  → Se detiene 
  → Partícula Estática (BD con nueva posición)
```

### ¿Las partículas necesitan peso, densidad y otras cualidades?

**SÍ, pero con diseño inteligente:**

#### 1. Densidad: En tipo (por defecto) + Sobrescritura individual

**✅ CORRECTO: Densidad en tipo como valor por defecto**
- `tipos_particulas.densidad` → Todas las partículas de "tierra" tienen densidad 1.5
- `estados_materia.densidad_estado` → Todas las partículas "sólidas" tienen densidad 1.0
- **Ventaja:** No duplicar datos, eficiente

**✅ PERO: Permitir sobrescritura individual**
- Si una partícula específica necesita densidad diferente, se guarda en `propiedades.fisica.densidad`
- Sistema de herencia: `propiedades.fisica.densidad` → `estados_materia.densidad_estado` → `tipos_particulas.densidad`

**Ejemplo:**
```javascript
// Partícula normal
{
  tipo_particula_id: "tierra",  // densidad = 1.5
  propiedades: {}
}
// → densidad = 1.5 (del tipo)

// Partícula contaminada (densidad diferente)
{
  tipo_particula_id: "tierra",  // densidad = 1.5 (por defecto)
  propiedades: {
    fisica: {
      densidad: 2.0  // Sobrescritura individual
    }
  }
}
// → densidad = 2.0 (sobrescritura)
```

#### 2. Velocidad: NO en tipo, solo individual

**❌ NO debe estar en tipo**
- Cada partícula tiene velocidad diferente cuando se mueve
- La velocidad cambia constantemente (cada frame)
- No tiene sentido tener velocidad en el tipo

**✅ CORRECTO: Velocidad individual en propiedades JSONB**
- Solo cuando la partícula se vuelve dinámica
- Se guarda en `propiedades.fisica.velocidad`
- Se actualiza cada frame en ECS, se guarda en BD periódicamente

#### 3. Masa: Se calcula dinámicamente

- No se guarda en BD (se calcula cuando se necesita)
- `masa = densidad × volumen (1 celda = 1 unidad)`
- Densidad viene del sistema de herencia explicado arriba

#### 4. Fuerzas: Solo individual

- Se guardan en `propiedades.fisica.fuerzas` cuando se aplican
- No tiene sentido en tipo (cada partícula recibe fuerzas diferentes)

#### Resumen: ¿Qué va en tipo vs individual?

| Propiedad | En Tipo | Individual | Razón |
|-----------|---------|------------|-------|
| **Densidad** | ✅ Por defecto | ✅ Sobrescritura | Todas las "tierra" tienen densidad similar, pero puede variar |
| **Velocidad** | ❌ NO | ✅ Solo individual | Cada partícula se mueve diferente |
| **Masa** | ❌ NO | ✅ Calculada | Se calcula desde densidad × volumen |
| **Fuerzas** | ❌ NO | ✅ Solo individual | Cada partícula recibe fuerzas diferentes |
| **Estado físico** | ✅ Por defecto | ✅ Sobrescritura | "Solido" tiene propiedades por defecto, pero puede variar |

**Ventajas de este enfoque:**
- ✅ No requiere migración de BD (usa JSONB existente)
- ✅ Partículas estáticas no tienen overhead de física
- ✅ Solo partículas dinámicas usan ECS (eficiente)
- ✅ Conversión automática entre estados

## Conclusión

**Recomendación:** 

Para un MMO con 50-100+ jugadores simultáneos, recomiendo **Opción 3 (Rapier)** por:
- Excelente rendimiento (crítico para MMO)
- API moderna y limpia
- Buen balance entre características y rendimiento
- Escalabilidad para futuro crecimiento

**Alternativa:** Si se prefiere más control y optimización específica para voxels, **Opción 1 (Custom)** es viable pero requiere más tiempo de desarrollo. Esta opción maneja mejor la conversión partícula ↔ entidad ECS.

**No recomiendo Opción 4 (Híbrido)** a menos que haya requisitos muy específicos que justifiquen la complejidad adicional.

**Próximos pasos:**
1. Decidir opción de implementación
2. Implementar sistema de conversión partícula ↔ entidad ECS (si Opción 1)
3. Agregar propiedades físicas a partículas (JSONB)
4. Crear plan de acción detallado
5. Implementar en fases incrementales
6. Testing exhaustivo antes de producción

