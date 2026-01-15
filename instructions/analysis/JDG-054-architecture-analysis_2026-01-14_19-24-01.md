# Análisis de Arquitectura - Desplazamiento No Deseado Durante Transiciones de Combate Stance a Ataques (JDG-054)

## Situación Actual

### Frontend

**Estructura actual:**

```
frontend/src/ecs/
├── systems/
│   ├── animation-mixer-system.js    # Reproduce animaciones GLB usando AnimationMixer
│   ├── physics-system.js             # Maneja posición y física del personaje
│   └── animation-state-system.js    # Determina qué animación reproducir
├── components/
│   ├── render.js                    # Almacena referencia al mesh
│   └── position.js                  # Almacena posición del personaje
└── config/
    └── animation-config.js           # Configuración de estados de animación
```

**Flujo actual de animaciones:**

1. **AnimationStateSystem** determina qué animación reproducir basado en estado del juego
2. **AnimationMixerSystem.playAnimation()** reproduce la animación usando `THREE.AnimationMixer`
3. **AnimationMixer** aplica las transformaciones de bones del esqueleto directamente al modelo
4. **PhysicsSystem** maneja la posición del personaje basada en física e input
5. **RenderComponent** mantiene referencia al mesh que se renderiza

**Problemas identificados:**

1. **Root Motion no compensado**: Las animaciones GLB de combate (ataques, parry) pueden tener movimiento del root bone (Hips/Root) que se está aplicando directamente al mesh, causando desplazamiento no deseado.

2. **Falta de extracción de root motion**: El sistema actual no extrae ni compensa el movimiento del root bone durante las animaciones. Three.js aplica todas las transformaciones de bones, incluyendo el root, directamente.

3. **Inconsistencia entre tipos de animación**: Las animaciones de movimiento (walk, run, jump) no presentan este problema, lo que sugiere que:
   - O no tienen root motion en las animaciones GLB
   - O el root motion está configurado de manera diferente
   - O hay alguna diferencia en cómo se aplican

4. **Transición de vuelta a combat_stance**: Al terminar la animación de ataque/parry y volver a `combat_stance`, el personaje se "transporta" de vuelta a la posición original, indicando que:
   - El root bone vuelve a su posición original en `combat_stance`
   - Pero la posición del mesh ya fue desplazada por el root motion del ataque
   - No hay compensación para mantener la posición del personaje fija

5. **Falta de control sobre root bone**: El sistema actual no tiene forma de:
   - Detectar si una animación tiene root motion
   - Extraer el movimiento del root bone
   - Compensar ese movimiento para mantener la posición del personaje fija

### Base de Datos

No aplica - este es un problema puramente de frontend relacionado con animaciones GLB.

## Necesidades Futuras

### Requisitos de la Solución

1. **Detección de root motion**: El sistema debe poder detectar si una animación tiene movimiento del root bone.

2. **Extracción de root motion**: Si una animación tiene root motion, el sistema debe extraer ese movimiento del root bone.

3. **Compensación de posición**: El sistema debe compensar el movimiento del root bone para mantener la posición del personaje fija durante animaciones de combate.

4. **Configuración por animación**: Debe ser posible configurar qué animaciones requieren compensación de root motion (ataques, parry) y cuáles no (walk, run, jump).

5. **Preservar animaciones con movimiento intencional**: Algunas animaciones (como dodge) pueden requerir movimiento intencional del root bone, por lo que la compensación debe ser opcional.

6. **No romper funcionalidad existente**: La solución no debe afectar animaciones que funcionan correctamente (walk, run, jump).

## Arquitectura Propuesta

### Solución: Sistema de Extracción y Compensación de Root Motion

**Principio**: Extraer el movimiento del root bone durante animaciones de combate y compensarlo para mantener la posición del personaje fija.

### Flujo Propuesto

```
1. AnimationMixerSystem.playAnimation():
   ├── Detectar si la animación requiere compensación de root motion
   ├── Si requiere compensación:
   │   ├── Guardar posición inicial del root bone
   │   ├── Configurar callback para extraer movimiento del root bone cada frame
   │   └── Compensar movimiento del root bone aplicando transformación inversa al mesh
   └── Si no requiere compensación:
       └── Reproducir animación normalmente (como actualmente)

2. AnimationMixerSystem.update() (cada frame):
   ├── Si hay animación activa con compensación de root motion:
   │   ├── Obtener posición actual del root bone
   │   ├── Calcular delta desde posición inicial
   │   ├── Aplicar transformación inversa al mesh para compensar
   │   └── Actualizar posición inicial del root bone para próximo frame
   └── Actualizar mixer normalmente
```

### Cambios en AnimationMixerSystem

**Ubicación**: `frontend/src/ecs/systems/animation-mixer-system.js`

**Cambio propuesto - Agregar configuración de root motion:**

```javascript
// En animation-config.js o como constante
export const ROOT_MOTION_CONFIG = {
    // Animaciones que requieren compensación de root motion
    requiresCompensation: [
        'attack',
        'heavy_attack',
        'charged_attack',
        'special_attack',
        'combo_attack',
        'parry'
    ],
    // Animaciones que NO requieren compensación (tienen movimiento intencional)
    allowsRootMotion: [
        'dodge',
        'roll_dodge'
    ]
};
```

**Cambio propuesto - Agregar extracción de root motion:**

```javascript
playAnimation(mixer, clips, state, mesh) {
    // ... código existente de reproducción de animación ...
    
    // Verificar si esta animación requiere compensación de root motion
    const animationName = this.getAnimationNameForState(state);
    const requiresCompensation = ROOT_MOTION_CONFIG.requiresCompensation.includes(animationName);
    
    if (requiresCompensation) {
        // Obtener root bone del esqueleto
        const skeleton = this.getSkeleton(mesh);
        const rootBone = this.getRootBone(skeleton);
        
        if (rootBone) {
            // Guardar posición inicial del root bone
            mesh.userData.rootMotionInitialPosition = rootBone.position.clone();
            mesh.userData.rootMotionInitialRotation = rootBone.rotation.clone();
            mesh.userData.rootMotionCompensation = true;
        }
    } else {
        // Limpiar flags si no requiere compensación
        mesh.userData.rootMotionCompensation = false;
    }
    
    // ... resto del código existente ...
}

update(deltaTime) {
    // ... código existente ...
    
    // Aplicar compensación de root motion si es necesario
    for (const entityId of entities) {
        const render = this.ecs.getComponent(entityId, ECS_CONSTANTS.COMPONENT_NAMES.RENDER);
        if (!render || !render.mesh) continue;
        
        const mesh = render.mesh;
        
        if (mesh.userData.rootMotionCompensation) {
            const skeleton = this.getSkeleton(mesh);
            const rootBone = this.getRootBone(skeleton);
            
            if (rootBone && mesh.userData.rootMotionInitialPosition) {
                // Calcular delta del root bone
                const deltaPosition = rootBone.position.clone().sub(mesh.userData.rootMotionInitialPosition);
                const deltaRotation = rootBone.rotation.clone().sub(mesh.userData.rootMotionInitialRotation);
                
                // Aplicar compensación inversa al mesh
                mesh.position.sub(deltaPosition);
                mesh.rotation.sub(deltaRotation);
                
                // Resetear posición del root bone a la inicial (para próximo frame)
                rootBone.position.copy(mesh.userData.rootMotionInitialPosition);
                rootBone.rotation.copy(mesh.userData.rootMotionInitialRotation);
            }
        }
        
        // Actualizar mixer
        if (mesh.userData.animationMixer) {
            mesh.userData.animationMixer.update(deltaTime);
        }
    }
}
```

### Alternativa: Solución en Blender

**Si el problema está en las animaciones mismas:**

1. **Verificar animaciones en Blender**: Abrir las animaciones GLB problemáticas en Blender y verificar si el root bone (Hips/Root) se está moviendo durante la animación.

2. **Corregir en Blender**: Si el root bone se mueve cuando no debería:
   - Seleccionar el root bone en todas las animaciones de combate
   - Asegurar que la posición y rotación del root bone estén fijas (no animadas)
   - Solo animar los bones hijos (spine, arms, legs, etc.)
   - Re-exportar las animaciones GLB

3. **Ventajas de solución en Blender**:
   - Solución más limpia y permanente
   - No requiere código adicional
   - Las animaciones quedan correctas desde el origen

4. **Desventajas de solución en Blender**:
   - Requiere trabajo manual en Blender
   - Puede requerir re-exportar todas las animaciones de combate
   - Si las animaciones vienen de un asset store, puede no ser posible modificarlas

## Patrones de Diseño a Usar

### 1. Configuration Pattern
- **Descripción**: Usar configuración externa para controlar comportamiento
- **Cómo se aplica**: `ROOT_MOTION_CONFIG` determina qué animaciones requieren compensación
- **Beneficios**: Fácil agregar nuevas animaciones, fácil cambiar comportamiento sin tocar código

### 2. Strategy Pattern (si se implementa en código)
- **Descripción**: Diferentes estrategias para manejar root motion según el tipo de animación
- **Cómo se aplica**: Estrategia de "compensar" vs "permitir" root motion según configuración
- **Beneficios**: Flexibilidad para diferentes tipos de animaciones

### 3. Observer Pattern (implícito en Three.js)
- **Descripción**: AnimationMixer notifica cambios en bones cada frame
- **Cómo se aplica**: El sistema observa cambios en root bone y compensa
- **Beneficios**: Integración natural con Three.js

## Beneficios de la Nueva Arquitectura

1. **Consistencia visual**: El personaje permanece en la misma posición durante combate
2. **Mejor experiencia de usuario**: No hay "teletransporte" o desplazamiento desorientador
3. **Flexibilidad**: Configuración permite diferentes comportamientos por animación
4. **Mantenibilidad**: Lógica clara y centralizada
5. **Extensibilidad**: Fácil agregar nuevas animaciones con diferentes comportamientos de root motion

## Migración Propuesta

### Fase 1: Diagnóstico

**Paso 1**: Verificar si el problema está en las animaciones GLB
- Abrir animaciones problemáticas en Blender
- Verificar si el root bone (Hips/Root) se mueve durante la animación
- Comparar con animaciones que funcionan correctamente (walk, run)

**Paso 2**: Determinar enfoque
- Si el root bone se mueve en Blender → Solución en Blender
- Si el root bone NO se mueve en Blender → Solución en código (extracción de root motion)

### Fase 2A: Solución en Blender (si aplica)

**Paso 1**: Corregir animaciones en Blender
- Seleccionar root bone en cada animación de combate
- Fijar posición y rotación del root bone
- Solo animar bones hijos
- Re-exportar animaciones GLB

**Paso 2**: Probar en el juego
- Cargar animaciones corregidas
- Verificar que no hay desplazamiento
- Verificar que las animaciones se ven correctas

### Fase 2B: Solución en Código (si aplica)

**Paso 1**: Agregar configuración de root motion
- Crear `ROOT_MOTION_CONFIG` en `animation-config.js`
- Listar animaciones que requieren compensación

**Paso 2**: Implementar extracción de root motion
- Agregar métodos para obtener root bone
- Agregar lógica de compensación en `playAnimation()`
- Agregar lógica de compensación en `update()`

**Paso 3**: Probar y ajustar
- Probar con animaciones de combate
- Ajustar compensación si es necesario
- Verificar que no afecta otras animaciones

## Consideraciones Técnicas

### Frontend

1. **Performance**: 
   - Extracción de root motion requiere cálculos cada frame
   - Impacto mínimo: solo para animaciones de combate
   - O(1) para obtener root bone y calcular delta

2. **Compatibilidad**:
   - No rompe código existente
   - Solo agrega lógica condicional
   - Mantiene comportamiento actual cuando no hay compensación

3. **Extensibilidad**:
   - Fácil agregar nuevas animaciones a la configuración
   - Fácil cambiar comportamiento por animación

4. **Three.js AnimationMixer**:
   - AnimationMixer aplica transformaciones directamente a bones
   - No hay API nativa para extraer root motion
   - Requiere acceso manual al root bone y compensación

5. **Root Bone**:
   - El root bone suele ser "Hips" o "Root" en esqueletos estándar
   - Puede variar según el modelo
   - Necesita función para encontrar el root bone dinámicamente

### Dependencias entre Sistemas

```
AnimationStateSystem
    ↓ determina qué animación reproducir
AnimationMixerSystem
    ↓ reproduce animación
    ↓ (si requiere compensación) extrae root motion
    ↓ compensa movimiento del root bone
PhysicsSystem
    ↓ maneja posición del personaje (no afectado por root motion)
RenderComponent
    ↓ renderiza mesh (con compensación aplicada)
```

## Ejemplo de Uso

### Configuración de Root Motion

```javascript
// frontend/src/config/animation-config.js
export const ROOT_MOTION_CONFIG = {
    // Animaciones que requieren compensación (root bone no debe moverse)
    requiresCompensation: [
        'attack',
        'heavy_attack',
        'charged_attack',
        'special_attack',
        'combo_attack',
        'parry'
    ],
    // Animaciones que permiten root motion (movimiento intencional)
    allowsRootMotion: [
        'dodge',
        'roll_dodge'
    ]
};
```

### Comportamiento Resultante

1. **Jugador presiona ataque desde combat_stance**:
   - `AnimationMixerSystem` detecta que `attack` requiere compensación
   - Guarda posición inicial del root bone
   - Reproduce animación de ataque
   - Cada frame, extrae movimiento del root bone y compensa aplicando transformación inversa al mesh
   - El personaje permanece en la misma posición durante el ataque

2. **Animación termina y vuelve a combat_stance**:
   - El root bone vuelve a su posición original
   - Como se compensó durante la animación, el mesh ya está en la posición correcta
   - No hay "teletransporte" o salto de posición

3. **Jugador hace dodge**:
   - `AnimationMixerSystem` detecta que `dodge` permite root motion
   - No se aplica compensación
   - El personaje se mueve según la animación (comportamiento intencional)

## Conclusión

La solución propuesta depende de la causa raíz del problema:

**Si el problema está en las animaciones GLB (root bone se mueve en Blender):**
- **Recomendación**: Corregir las animaciones en Blender
- **Ventajas**: Solución más limpia, no requiere código adicional
- **Desventajas**: Requiere trabajo manual, puede no ser posible si las animaciones vienen de asset store

**Si el problema está en cómo Three.js aplica las animaciones:**
- **Recomendación**: Implementar sistema de extracción y compensación de root motion
- **Ventajas**: Solución en código, no requiere modificar animaciones
- **Desventajas**: Requiere código adicional, puede tener impacto en performance

**Recomendación final**: 
1. Primero diagnosticar abriendo las animaciones en Blender para determinar la causa
2. Si es problema de animaciones, corregir en Blender
3. Si no es problema de animaciones, implementar compensación en código
4. Como medida de seguridad, implementar compensación en código incluso si se corrigen las animaciones (defensa en profundidad)

**Riesgos:**
- Bajo riesgo si se corrige en Blender
- Medio riesgo si se implementa en código (requiere testing cuidadoso)
- Debe verificarse que no afecta animaciones que funcionan correctamente
