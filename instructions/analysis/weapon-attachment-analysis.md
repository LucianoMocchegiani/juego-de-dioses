# Análisis del Problema de Attachment de Armas

## Problema Identificado

El arma se adjunta desde el centro geométrico en lugar del origen configurado en Blender (mango/empuñadura).

## Flujo Actual del Sistema

### 1. Carga del Modelo (`ModelLoader.loadModel`)
- **Input**: URL del modelo GLB
- **Output**: `gltf.scene` (THREE.Group o Scene)
- **Problema potencial**: El `scene` es un contenedor, el origen real puede estar en un mesh hijo

### 2. Cache del Modelo (`ModelCache.get`)
- **Acción**: Clona el modelo con `cached.clone()`
- **Problema potencial**: Al clonar un Group, los hijos mantienen posiciones relativas, pero el origen del Group puede no coincidir con el origen del mesh

### 3. Attachment (`attachWeaponToCharacter`)
- **Acción actual**: Busca el mesh real dentro del scene
- **Problema identificado**: 
  - Si el mesh tiene posición local diferente de (0,0,0) dentro del scene, esa posición se pierde
  - La escala se aplica al mesh, pero si el mesh está dentro de un Group, la transformación puede estar mal

## Problemas Específicos Encontrados

### Problema 1: Posición Local del Mesh dentro del Scene
Si el mesh tiene `position: {x: 0.5, y: 0, z: 0}` dentro del scene, al removerlo del scene y adjuntarlo al bone, esa posición se pierde.

### Problema 2: Escala Aplicada Antes de Encontrar el Mesh
La escala se aplica al mesh real (línea 159), pero si el mesh está dentro de un Group, la escala puede estar afectando la posición relativa.

### Problema 3: Clonado del Modelo
Cuando se clona el modelo para el cache (línea 147 en weapon-equip-system.js), se resetean position/rotation/scale del Group, pero NO de los hijos. Esto puede causar inconsistencias.

### Problema 4: Origen del Mesh vs Origen del Scene
El origen configurado en Blender está en el mesh, pero si el mesh tiene una posición local dentro del scene, el origen visual puede estar desplazado.

## Solución Propuesta

### Opción 1: Crear un Group Nuevo con el Mesh en el Origen
1. Encontrar el mesh real
2. Obtener su posición local dentro del scene
3. Crear un nuevo Group
4. Mover el mesh al nuevo Group con posición compensada
5. Adjuntar el nuevo Group al bone

### Opción 2: Compensar la Posición del Mesh
1. Encontrar el mesh real
2. Obtener su posición local dentro del scene
3. Al adjuntarlo al bone, compensar esa posición

### Opción 3: Usar el Scene Completo pero Ajustar
1. Mantener el scene completo
2. Calcular el offset necesario desde el origen del scene hasta el origen del mesh
3. Aplicar ese offset al adjuntar al bone

## Recomendación

**Opción 2** es la más simple y efectiva:
- Encontrar el mesh real
- Obtener su posición local dentro del scene (si existe)
- Al adjuntarlo al bone, aplicar esa posición como offset inicial
- Esto preserva el origen del mesh configurado en Blender
