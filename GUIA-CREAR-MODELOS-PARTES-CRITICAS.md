# Guía: Crear Modelos con Partes Críticas

## Objetivo
Crear modelos 3D humanos con grupos de vértices para implementar sistema de daño por partes del cuerpo.

## Opción 1: Blender (Recomendado - Gratis)

### Paso 1: Instalar Blender
1. Descargar desde: https://www.blender.org/download/
2. Instalar (gratis, open source)

### Paso 2: Obtener Modelo Base

#### Opción A: Usar Mixamo (Más fácil)
1. Ir a https://www.mixamo.com/
2. Crear cuenta gratuita
3. Buscar modelo humano (ej: "Remy" o "Y Bot")
4. Descargar en formato FBX o T-Pose
5. Importar en Blender: `File > Import > FBX`

#### Opción B: Crear desde cero
1. En Blender, eliminar cubo por defecto
2. Agregar modelo humano básico: `Add > Mesh > Human (Rigify)`
3. O usar addon "Human Generator"

#### Opción C: Usar IA para generar base
- **Rodin**: https://rodin.io/ - Genera modelos 3D desde texto
- **Meshy AI**: https://www.meshy.ai/ - Genera modelos desde imágenes
- **Luma AI**: https://lumalabs.ai/ - Fotogrametría 3D
- **Nota**: Estos modelos necesitarán post-procesamiento en Blender

### Paso 3: Crear Grupos de Vértices

1. **Seleccionar modo Edit** (presionar `Tab` o click en "Edit Mode")

2. **Seleccionar vértices de la cabeza**:
   - Presionar `A` para deseleccionar todo
   - Usar `B` (box select) o `C` (circle select) para seleccionar vértices de la cabeza
   - O usar `L` (select linked) para seleccionar toda la cabeza si está separada

3. **Crear grupo "head"**:
   - En el panel derecho, ir a "Vertex Groups"
   - Click en "+" para crear nuevo grupo
   - Nombrarlo `head`
   - Click en "Assign" para asignar vértices seleccionados

4. **Repetir para cada parte**:
   - `left_arm` - Brazo izquierdo
   - `right_arm` - Brazo derecho
   - `torso` - Torso
   - `left_leg` - Pierna izquierda
   - `right_leg` - Pierna derecha

### Paso 4: Verificar Grupos

1. Seleccionar cada grupo en "Vertex Groups"
2. Click en "Select" para verificar que los vértices correctos están asignados
3. Ajustar si es necesario

### Paso 5: Exportar a GLTF/GLB

1. **Seleccionar el modelo** (presionar `A` en Object Mode)

2. **Exportar**:
   - `File > Export > glTF 2.0 (.glb/.gltf)`
   - En "Include", asegurarse que "Vertex Groups" esté marcado
   - Elegir formato: `.glb` (binario, recomendado)
   - Guardar como `humano_partes_criticas.glb`

3. **Verificar exportación**:
   - Los grupos de vértices se exportan como "morph targets" o "vertex groups" en GLTF
   - Puedes verificar en https://gltf-viewer.donmccurdy.com/

### Paso 6: Optimizar Modelo (Opcional)

1. **Reducir polígonos**:
   - `Modifiers > Add Modifier > Decimate`
   - Ajustar ratio (0.5 = 50% de polígonos)
   - Aplicar modificador

2. **Optimizar texturas**:
   - Reducir tamaño de texturas
   - Usar formatos comprimidos (WebP, KTX2)

## Opción 2: Usar IA para Generar Modelo Base

### Rodin (Recomendado)
1. Ir a https://rodin.io/
2. Crear cuenta
3. Generar modelo con prompt: "human character, low poly, game ready, T-pose"
4. Descargar modelo
5. Importar en Blender
6. Seguir Pasos 3-6 de Opción 1 para crear grupos de vértices

### Meshy AI
1. Ir a https://www.meshy.ai/
2. Subir imagen de referencia o usar generación desde texto
3. Descargar modelo
4. Importar en Blender
5. Seguir Pasos 3-6 de Opción 1

### Luma AI
1. Ir a https://lumalabs.ai/
2. Crear modelo desde fotos (fotogrametría)
3. Descargar modelo
4. Importar en Blender
5. Seguir Pasos 3-6 de Opción 1

## Opción 3: Modelos Pre-hechos

### Ready Player Me
- https://readyplayer.me/
- Avatares personalizables
- Exportar a GLTF
- **Nota**: Puede requerir modificación en Blender para grupos de vértices

### VRoid Studio
- https://vroid.com/studio
- Modelos estilo anime
- Exportar a VRM (convertir a GLTF con herramienta)

## Verificación en Three.js

Una vez exportado, verificar que los grupos se cargan correctamente:

```javascript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
loader.load('humano_partes_criticas.glb', (gltf) => {
  const model = gltf.scene;
  
  // Verificar que el modelo tiene grupos
  model.traverse((child) => {
    if (child.isMesh) {
      console.log('Mesh encontrado:', child.name);
      // Los grupos de vértices pueden estar en:
      // - child.morphTargetInfluences (morph targets)
      // - child.userData (datos personalizados)
      // - child.geometry.groups (grupos de geometría)
    }
  });
  
  // Buscar partes por nombre (si se nombraron en Blender)
  const cabeza = model.getObjectByName('head');
  const brazoIzq = model.getObjectByName('left_arm');
  // etc.
});
```

## Estructura de Nombres Recomendada

En Blender, nombrar los objetos/meshes así:
- `head` - Cabeza
- `left_arm` - Brazo izquierdo
- `right_arm` - Brazo derecho
- `torso` - Torso
- `left_leg` - Pierna izquierda
- `right_leg` - Pierna derecha

O usar prefijo:
- `parte_head`
- `parte_left_arm`
- etc.

## Troubleshooting

### Los grupos no se exportan
- Verificar que "Vertex Groups" está marcado en opciones de exportación
- Asegurarse que los vértices están asignados al grupo
- Probar exportar como `.gltf` en lugar de `.glb` para debug

### No puedo seleccionar partes separadas
- Si el modelo es un solo mesh, necesitas separarlo:
  1. Seleccionar vértices de una parte
  2. `P` (separate) > `Selection`
  3. Ahora tienes dos objetos separados
  4. Crear grupos de vértices en cada uno

### El modelo es muy pesado
- Usar Decimate modifier para reducir polígonos
- Optimizar texturas
- Usar LOD (Level of Detail) para diferentes distancias

## Recursos

- **Blender Tutorial**: https://www.youtube.com/results?search_query=blender+vertex+groups
- **Mixamo**: https://www.mixamo.com/
- **GLTF Viewer**: https://gltf-viewer.donmccurdy.com/
- **Three.js GLTFLoader Docs**: https://threejs.org/docs/#examples/en/loaders/GLTFLoader

## Próximos Pasos

Una vez creado el modelo:
1. Subirlo a `backend/static/models/characters/`
2. Actualizar schema `Model3D` para incluir `partes_criticas`
3. Implementar sistema de carga de grupos de vértices en frontend
4. Implementar sistema de daño por partes

