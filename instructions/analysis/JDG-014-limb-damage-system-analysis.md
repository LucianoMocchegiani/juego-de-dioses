# JDG-014 - Sistema de Daño por Partes del Cuerpo (Limb Damage System)

## Fecha
2025-12-08

## Objetivo
Implementar un sistema donde cada parte del cuerpo (cabeza, brazos, piernas, torso) puede ser cortada/dañada, afectando el gameplay y permitiendo que las partes cortadas sean objetos físicos recogibles.

## Requisitos

### Funcionalidades Core
1. **Modelo único con grupos de vértices**: Cada parte del cuerpo es un grupo de vértices nombrado
2. **Sistema híbrido de núcleos**: 
   - Núcleo principal (torso) = vida total
   - Núcleos secundarios (cabeza, brazos, piernas) = partes críticas
3. **Partes cortadas como objetos físicos**: Cuando se corta una parte, se convierte en objeto independiente en el suelo
4. **Regeneración**: Las partes pueden regenerarse, haciendo desaparecer las partes cortadas del suelo
5. **Animaciones de corte**: Animación visual cuando se corta una parte
6. **Partes recogibles**: Las partes cortadas pueden ser recogidas/usadas

### Efectos de Gameplay
- **Cabeza cortada** → Muerte instantánea
- **Torso dañado** → Muerte instantánea
- **Piernas cortadas** → Inmovilización o reducción de velocidad
- **Brazos cortados** → No puede atacar

## Arquitectura Propuesta

### 1. Estructura de Datos en BD

#### Campo `partes_criticas` en `modelo_3d` JSONB:

```json
{
  "modelo_3d": {
    "tipo": "glb",
    "ruta": "characters/humano.glb",
    "escala": 1.0,
    "partes_criticas": {
      "cabeza": {
        "grupo_vertices": "head",
        "nucleo_id": "uuid-cabeza",
        "efecto_destruccion": "muerte",
        "es_critica": true,
        "puede_regenerar": true,
        "tiempo_regeneracion": 30000  // ms
      },
      "brazo_izquierdo": {
        "grupo_vertices": "left_arm",
        "nucleo_id": "uuid-brazo-izq",
        "efecto_destruccion": "no_atacar",
        "es_critica": false,
        "puede_regenerar": true,
        "tiempo_regeneracion": 20000
      },
      "brazo_derecho": {
        "grupo_vertices": "right_arm",
        "nucleo_id": "uuid-brazo-der",
        "efecto_destruccion": "no_atacar",
        "es_critica": false,
        "puede_regenerar": true,
        "tiempo_regeneracion": 20000
      },
      "pierna_izquierda": {
        "grupo_vertices": "left_leg",
        "nucleo_id": "uuid-pierna-izq",
        "efecto_destruccion": "reducir_velocidad",
        "reduccion_velocidad": 0.5,
        "es_critica": false,
        "puede_regenerar": true,
        "tiempo_regeneracion": 25000
      },
      "pierna_derecha": {
        "grupo_vertices": "right_leg",
        "nucleo_id": "uuid-pierna-der",
        "efecto_destruccion": "reducir_velocidad",
        "reduccion_velocidad": 0.5,
        "es_critica": false,
        "puede_regenerar": true,
        "tiempo_regeneracion": 25000
      },
      "torso": {
        "grupo_vertices": "torso",
        "nucleo_id": "uuid-torso",
        "efecto_destruccion": "muerte",
        "es_critica": true,
        "puede_regenerar": false
      }
    }
  }
}
```

### 2. Sistema de Núcleos Híbrido

#### Estructura de Núcleos:
```
Personaje (Agrupación)
├── Núcleo Principal (torso)
│   └── Si se destruye → Muerte
├── Núcleo Secundario (cabeza)
│   └── Si se destruye → Muerte + Cortar cabeza
├── Núcleo Secundario (brazo izquierdo)
│   └── Si se destruye → Cortar brazo + No atacar
├── Núcleo Secundario (brazo derecho)
│   └── Si se destruye → Cortar brazo + No atacar
├── Núcleo Secundario (pierna izquierda)
│   └── Si se destruye → Cortar pierna + Reducir velocidad
└── Núcleo Secundario (pierna derecha)
    └── Si se destruye → Cortar pierna + Reducir velocidad
```

#### Mapeo en BD:
- Cada parte crítica tiene su propio `nucleo_id` en `partes_criticas`
- El núcleo principal (torso) se almacena en el `nucleus_id` de la agrupación
- Los núcleos secundarios se crean como agrupaciones hijas o en tabla separada

### 3. Componentes Frontend

#### Nuevo Componente: `LimbDamageComponent`
```javascript
{
  partes: {
    cabeza: { cortada: false, nucleo_id: "uuid", mesh: THREE.Mesh },
    brazo_izquierdo: { cortada: false, nucleo_id: "uuid", mesh: THREE.Mesh },
    // ... etc
  },
  efectos_activos: {
    no_atacar: false,
    velocidad_reducida: 0.0,
    muerto: false
  },
  partes_en_suelo: [] // Array de objetos físicos
}
```

#### Nuevo Sistema: `LimbDamageSystem`
- Detecta cuando un núcleo secundario se destruye
- Ejecuta animación de corte
- Separa el mesh de la parte del modelo principal
- Crea objeto físico en el suelo
- Aplica efectos de gameplay
- Maneja regeneración

#### Nuevo Sistema: `LimbRegenerationSystem`
- Detecta cuando una parte puede regenerarse
- Espera tiempo de regeneración
- Restaura el mesh de la parte
- Elimina objeto físico del suelo si existe
- Restaura efectos de gameplay

### 4. Separación Visual de Partes

#### Proceso de Corte:
1. **Detectar destrucción de núcleo secundario**
2. **Encontrar grupo de vértices** en el modelo Three.js
3. **Extraer mesh de la parte**:
   ```javascript
   // Encontrar mesh por nombre de grupo
   const parteMesh = model.getObjectByName('head');
   
   // Clonar mesh
   const parteCortada = parteMesh.clone();
   
   // Obtener posición y rotación actual
   const worldPosition = new THREE.Vector3();
   const worldQuaternion = new THREE.Quaternion();
   parteMesh.getWorldPosition(worldPosition);
   parteMesh.getWorldQuaternion(worldQuaternion);
   
   // Remover del modelo original
   parteMesh.visible = false; // O remover completamente
   
   // Crear objeto físico
   const objetoFisico = crearObjetoFisico(parteCortada, worldPosition, worldQuaternion);
   ```
4. **Aplicar animación de corte** (rotación, trayectoria, física)
5. **Agregar a escena como objeto independiente**

### 5. Animación de Corte

#### Opciones:
1. **Física simple**: Aplicar velocidad/rotación inicial y dejar que la física lo maneje
2. **Animación keyframe**: Animación predefinida de caída/rotación
3. **Híbrido**: Animación inicial + física después

#### Implementación sugerida:
```javascript
function animarCorte(parteMesh, direccionCorte) {
  // 1. Aplicar velocidad inicial basada en dirección del corte
  const velocidad = new THREE.Vector3()
    .copy(direccionCorte)
    .multiplyScalar(5); // Velocidad de corte
  
  // 2. Aplicar rotación aleatoria
  const rotacionAleatoria = new THREE.Vector3(
    (Math.random() - 0.5) * 2,
    (Math.random() - 0.5) * 2,
    (Math.random() - 0.5) * 2
  ).normalize();
  
  // 3. Aplicar física (usar Three.js o librería de física)
  // Por ahora, animación simple con tween
  const tween = new TWEEN.Tween(parteMesh.position)
    .to({
      x: parteMesh.position.x + velocidad.x,
      y: parteMesh.position.y - 2, // Caer por gravedad
      z: parteMesh.position.z + velocidad.z
    }, 1000)
    .easing(TWEEN.Easing.Quadratic.Out)
    .start();
  
  // 4. Rotación continua
  const rotacionTween = new TWEEN.Tween(parteMesh.rotation)
    .to({
      x: parteMesh.rotation.x + rotacionAleatoria.x * Math.PI,
      y: parteMesh.rotation.y + rotacionAleatoria.y * Math.PI,
      z: parteMesh.rotation.z + rotacionAleatoria.z * Math.PI
    }, 1000)
    .start();
}
```

### 6. Objetos Físicos en el Suelo

#### Crear Agrupación para Parte Cortada:
```javascript
async function crearParteCortada(parteMesh, posicion, rotacion) {
  // 1. Crear nueva agrupación en BD para la parte cortada
  const parteCortadaId = await crearAgrupacionParteCortada({
    tipo: 'parte_cortada',
    modelo_3d: {
      tipo: 'glb',
      ruta: 'characters/partes/head.glb', // O usar el mesh clonado
      escala: 1.0
    },
    posicion: posicion,
    rotacion: rotacion,
    puede_recogerse: true,
    parte_original: 'cabeza'
  });
  
  // 2. Crear entidad ECS para la parte cortada
  const entidad = ecs.createEntity({
    id: parteCortadaId,
    render: {
      mesh: parteMesh,
      visible: true
    },
    physics: {
      tipo: 'estatico', // O 'dinamico' si queremos que se mueva
      colision: true
    },
    recogible: {
      tipo: 'parte_cuerpo',
      parte: 'cabeza',
      puede_usarse: true
    }
  });
  
  return entidad;
}
```

### 7. Sistema de Recogida

#### Componente: `PickableComponent`
```javascript
{
  tipo: 'parte_cuerpo',
  parte: 'cabeza',
  puede_usarse: true,
  uso: 'regenerar' // O 'consumir', 'equipar', etc.
}
```

#### Sistema: `PickupSystem`
- Detecta colisión entre jugador y objeto recogible
- Muestra UI de "Presiona E para recoger"
- Al recoger, agrega a inventario o aplica efecto inmediato
- Elimina objeto del mundo

### 8. Regeneración

#### Proceso:
1. **Timer de regeneración**: Cada parte tiene `tiempo_regeneracion`
2. **Verificar condiciones**: 
   - `puede_regenerar: true`
   - Tiempo transcurrido >= `tiempo_regeneracion`
   - Núcleo secundario no está destruido (se regeneró)
3. **Restaurar mesh**:
   ```javascript
   // Hacer visible la parte nuevamente
   parteMesh.visible = true;
   
   // Restaurar posición/rotación original
   parteMesh.position.copy(posicionOriginal);
   parteMesh.rotation.copy(rotacionOriginal);
   ```
4. **Eliminar objeto físico del suelo** si existe
5. **Restaurar efectos de gameplay**

## Consideraciones Técnicas

### Performance
- Limitar número de partes cortadas en el mundo
- Usar instancing si múltiples partes del mismo tipo
- Pool de objetos para reutilizar partes cortadas

### Sincronización
- Partes cortadas deben sincronizarse entre clientes (WebSocket)
- Estado de regeneración debe ser consistente

### Física
- Considerar usar librería de física (Cannon.js, Ammo.js) para objetos físicos
- O implementar física simple con Three.js

## Dependencias

- **Three.js**: Ya existe
- **TWEEN.js** (opcional): Para animaciones suaves
- **Cannon.js / Ammo.js** (opcional): Para física avanzada

## Fases de Implementación

### Fase 1: Estructura Base
- [ ] Agregar campo `partes_criticas` a schema `Model3D`
- [ ] Crear `LimbDamageComponent`
- [ ] Crear `LimbDamageSystem` básico
- [ ] Modificar `PlayerFactory` para cargar grupos de vértices

### Fase 2: Sistema de Corte
- [ ] Implementar detección de destrucción de núcleos secundarios
- [ ] Implementar separación visual de partes
- [ ] Implementar animación de corte básica

### Fase 3: Objetos Físicos
- [ ] Crear sistema de objetos físicos en el suelo
- [ ] Implementar creación de agrupaciones para partes cortadas
- [ ] Integrar con sistema de partículas

### Fase 4: Efectos de Gameplay
- [ ] Implementar efectos (muerte, no atacar, reducir velocidad)
- [ ] Integrar con sistema de movimiento
- [ ] Integrar con sistema de combate

### Fase 5: Regeneración
- [ ] Implementar sistema de regeneración
- [ ] Timer de regeneración
- [ ] Restauración de partes

### Fase 6: Recogida
- [ ] Implementar sistema de recogida
- [ ] UI de interacción
- [ ] Inventario o efectos inmediatos

## Referencias

- Three.js Groups: https://threejs.org/docs/#api/en/objects/Group
- Three.js Object3D.getObjectByName(): https://threejs.org/docs/#api/en/core/Object3D.getObjectByName
- GLTF Specification: https://www.khronos.org/gltf/
- Blender Vertex Groups: https://docs.blender.org/manual/en/latest/modeling/meshes/properties/vertex_groups.html

