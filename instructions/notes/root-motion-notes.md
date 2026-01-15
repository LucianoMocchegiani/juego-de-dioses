# Notas sobre Root Motion Compensation (JDG-054)

## Contexto

Durante la implementación de JDG-054 (Desplazamiento No Deseado Durante Transiciones de Combate), se intentó implementar un sistema de compensación de root motion para evitar que el personaje se desplace durante animaciones.

## Comportamiento Observado

### 1. Movimiento del Root Bone

- El root bone (usualmente "Hips") se mueve durante las animaciones
- Los deltas observados son muy pequeños: ~0.000001 a 0.000008 unidades
- El movimiento es en espacio **local** del modelo (no en espacio del mundo)

### 2. Intentos de Compensación

#### Intento 1: Compensar el Mesh Directamente
- **Problema**: `RenderSystem` (priority 3) sobrescribe la posición del mesh cada frame basándose en el componente `Position`
- **Resultado**: La compensación se perdía inmediatamente

#### Intento 2: Compensar el Componente Position
- **Enfoque**: Convertir el delta del root bone (espacio local) a celdas y aplicar al componente `Position`
- **Resultado**: La compensación funcionaba matemáticamente (cambio aplicado = -delta), pero el desplazamiento visual persistía

#### Intento 3: Usar Posición en Espacio del Mundo
- **Enfoque**: Usar `getWorldPosition()` para obtener la posición del root bone en espacio del mundo
- **Problema**: `getWorldPosition()` incluye las transformaciones del mesh padre, causando que "todo se mueva alrededor"
- **Resultado**: Comportamiento errático con efectos visuales severos:
  - **Efecto de "terremoto"**: Todo el modelo y la escena vibraban de forma constante
  - **Visión doble titilante**: El personaje y los objetos alrededor aparecían duplicados o con efecto de "ghosting"
  - **Movimiento circular errático**: El modelo se movía en patrones circulares o espirales
  - **Inestabilidad general**: La escena completa se volvía inestable visualmente
- **Causa técnica**: `getWorldPosition()` calcula la posición considerando todas las transformaciones de la jerarquía (mesh → modelo → escena), lo que crea un feedback loop cuando se intenta compensar, ya que cada frame recalcula la posición basándose en transformaciones que ya incluyen compensaciones previas

### 3. Hallazgos Clave

1. **El root bone se mueve muy poco**: Los deltas son casi insignificantes (~0.000001)
2. **La compensación matemática funciona**: El cambio aplicado al mesh/Position es correcto
3. **El desplazamiento visual persiste**: Esto sugiere que el problema NO es el root bone
4. **El problema podría estar en otro lugar**:
   - Cómo Three.js aplica las transformaciones del skeleton al mesh
   - Interacción entre `AnimationMixerSystem` y `RenderSystem`
   - Transformaciones acumuladas en el mesh o en el modelo completo

## Posibles Causas del Desplazamiento

1. **Transformaciones del Skeleton**: El skeleton completo podría estar aplicando transformaciones que no se reflejan solo en el root bone
2. **Interpolación de Animaciones**: La interpolación entre frames podría estar causando micro-desplazamientos
3. **Sistema de Física**: `PhysicsSystem` podría estar aplicando movimiento residual
4. **RenderSystem**: La forma en que se actualiza la posición del mesh podría estar causando desfases

## Soluciones Futuras Propuestas

### Opción 1: Deshabilitar Root Motion en Blender
- Editar las animaciones GLB directamente en Blender
- Asegurar que el root bone no se mueva durante las animaciones
- **Ventaja**: Solución en la fuente
- **Desventaja**: Requiere editar todas las animaciones

### Opción 2: Sistema de "Snap to Ground"
- Después de que termina una animación, corregir la posición basándose en:
  - Colisiones con el terreno
  - Posición inicial guardada antes de la animación
  - Sistema de física
- **Ventaja**: No requiere editar animaciones
- **Desventaja**: Podría causar "saltos" visuales

### Opción 3: Investigar Transformaciones del Skeleton
- Analizar cómo Three.js aplica las transformaciones del skeleton completo
- Verificar si hay otros bones que se mueven además del root bone
- Usar herramientas de debugging (F6) para visualizar el skeleton completo
- **Ventaja**: Solución más precisa
- **Desventaja**: Requiere investigación profunda

### Opción 4: Sistema de "Animation Events"
- Detectar cuando termina una animación usando eventos
- Corregir la posición basándose en:
  - Posición guardada antes de la animación
  - Estado del sistema de física
  - Colisiones
- **Ventaja**: Solución flexible y extensible
- **Desventaja**: Requiere implementar sistema de eventos

## Código Deshabilitado

El código de compensación está comentado en `animation-mixer-system.js` (líneas ~740-800) con documentación sobre por qué se deshabilitó.

## Referencias

- **Ticket**: JDG-054 - Desplazamiento No Deseado Durante Transiciones de Combate
- **Análisis**: `JDG-054-architecture-analysis_2026-01-14_19-24-01.md`
- **Plan de Acción**: `JDG-054-action-plan_2026-01-14_20-22-54.md`

## Notas Adicionales

- El desplazamiento es más notorio en animaciones de combate (ataques, parry)
- No ocurre en animaciones de movimiento (walk, run, jump) - posiblemente porque el movimiento es intencional
- El desplazamiento es lateral (hacia la derecha) y luego "teletransporte" de vuelta a la posición original
- Verificado en Blender: las animaciones NO tienen root motion problemático en el archivo GLB

## Efectos Visuales del Intento 3 (getWorldPosition)

Cuando se intentó usar `getWorldPosition()` para compensar el root motion, se observaron efectos visuales muy problemáticos:

### Síntomas Observados

1. **Efecto de "Terremoto"**:
   - Todo el modelo y la escena vibraban constantemente
   - La vibración era visible en todos los objetos de la escena
   - El efecto era similar a un terremoto o temblor constante

2. **Visión Doble Titilante**:
   - El personaje aparecía duplicado o con efecto de "ghosting"
   - Los objetos alrededor también mostraban este efecto
   - El titileo era muy rápido, creando una sensación de visión doble

3. **Movimiento Circular Errático**:
   - El modelo se movía en patrones circulares o espirales
   - No seguía una dirección lógica
   - El movimiento era impredecible y caótico

4. **Inestabilidad General**:
   - La escena completa se volvía inestable visualmente
   - Era imposible jugar o interactuar con el juego
   - El efecto era inmediato y muy notorio

### Causa Técnica

El problema ocurre porque `getWorldPosition()` calcula la posición considerando **todas las transformaciones de la jerarquía completa**:
- Mesh → Modelo → Escena
- Cuando se intenta compensar usando esta posición, se crea un **feedback loop**:
  1. El mixer mueve el root bone
  2. `getWorldPosition()` calcula la posición incluyendo transformaciones del mesh
  3. Se compensa el componente Position
  4. `RenderSystem` actualiza el mesh basándose en Position
  5. En el siguiente frame, `getWorldPosition()` incluye la compensación anterior
  6. Se vuelve a compensar, pero ahora incluyendo la compensación previa
  7. Esto crea una acumulación exponencial de errores

### Lección Aprendida

**NUNCA usar `getWorldPosition()` para compensación de root motion** cuando:
- El mesh tiene transformaciones padre
- Se está compensando el componente Position que afecta al mesh
- Hay múltiples sistemas actualizando la posición (RenderSystem, PhysicsSystem, etc.)

La compensación debe hacerse en **espacio local** del modelo, no en espacio del mundo.
