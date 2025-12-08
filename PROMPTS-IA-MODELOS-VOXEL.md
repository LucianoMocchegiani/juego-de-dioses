# Prompts para Generar Modelos 3D con IA - Estilo Voxel

## Estilo Objetivo
Modelos que coincidan con el mundo voxel/partículas: blocky, pixelado, low-poly, geométrico, similar a Minecraft o voxel art. **Importante**: Los modelos pueden usar diversas formas geométricas (cubos, cilindros, esferas, prismas, etc.), no solo cubos, similar a cómo los árboles del juego combinan troncos cilíndricos con copas esféricas.

---

## 🎯 Prompts para Rodin (https://rodin.io/)

### Modelo Humano Base (T-Pose)
```
human character, low poly, voxel art style, blocky geometric, game ready, T-pose, 
arms extended, legs straight, diverse geometric shapes: cubes, cylinders, spheres, prisms, 
head as sphere or cube, arms as cylinders or rectangular prisms, 
legs as cylinders or rectangular prisms, torso as rectangular prism or cylinder, 
minimal details, stylized, no textures, single color or simple colors, 
Minecraft-like aesthetic, pixelated appearance, geometric edges, 
modular design, suitable for limb damage system, vertex groups ready
```

**Explicación:**
Este es el prompt base recomendado para empezar. Genera un modelo humano en estilo voxel con características balanceadas:
- **Estilo**: Voxel art con estética Minecraft, usando formas geométricas variadas (no solo cubos)
- **Formas**: Combina cubos, cilindros, esferas y prismas, similar a cómo los árboles usan troncos cilíndricos y copas esféricas
- **Complejidad**: Bajo polígono pero con formas reconocibles y variadas
- **Uso**: Ideal para tu primer intento, balance entre estilo y funcionalidad
- **Ventajas**: Más fácil de trabajar, partes del cuerpo claramente definidas, más interesante visualmente
- **Cuándo usarlo**: Cuando quieres un modelo que se vea bien, mantenga el estilo voxel, y use formas variadas como el resto del mundo

### Modelo Humano - Variación 1 (Más Blocky)
```
voxel human character, blocky geometric style, made of diverse geometric shapes, 
T-pose stance, game asset, low poly count, geometric shapes only: cubes, cylinders, spheres, prisms, 
no smooth surfaces, geometric edges, Minecraft character style, 
simple colors, modular body parts, head as sphere or cube, 
arms as cylinders or rectangular prisms, legs as cylinders or rectangular prisms, 
torso as rectangular prism or cylinder, suitable for vertex group separation
```

**Explicación:**
Este prompt genera un modelo blocky usando formas geométricas variadas, alineado con el estilo del mundo:
- **Estilo**: Blocky pero con formas variadas (cubos, cilindros, esferas, prismas), sin superficies suaves
- **Formas**: Similar a los árboles: puede usar cilindros para brazos/piernas, esferas para cabeza, prismas para torso
- **Complejidad**: Muy bajo polígono, formas geométricas puras pero diversas
- **Uso**: Ideal si quieres que el personaje use las mismas formas geométricas que el resto del mundo
- **Ventajas**: Coincide perfectamente con el estilo del mundo (como los árboles), muy fácil de separar en partes, más interesante que solo cubos
- **Desventajas**: Puede requerir más trabajo para definir vertex groups si las formas son muy variadas
- **Cuándo usarlo**: Si quieres máxima coherencia visual con tu mundo de partículas voxel usando formas variadas

### Modelo Humano - Variación 2 (Estilo Híbrido)
```
low poly human character, voxel-inspired, slightly rounded but blocky, 
T-pose, game ready, stylized proportions, diverse geometric shapes, 
head as sphere or rounded cube, torso as cylinder or rectangular prism, 
arms and legs as cylinders or rounded prisms, simple hands and feet as spheres or cubes, 
minimal polygon count, clean geometry, vertex groups friendly, 
modular design, easy to separate body parts, geometric variety
```

**Explicación:**
Este prompt genera un modelo híbrido que combina estilo voxel con formas geométricas variadas y ligeramente redondeadas:
- **Estilo**: Voxel-inspired pero con formas variadas (esferas, cilindros, prismas), más estilizado
- **Formas**: Usa esferas para cabeza, cilindros para extremidades, prismas para torso - similar a los árboles
- **Complejidad**: Bajo polígono pero con proporciones más realistas y formas interesantes
- **Uso**: Si quieres un modelo que se vea más "profesional" pero mantenga el estilo voxel con formas variadas
- **Ventajas**: Mejor apariencia visual, mantiene modularidad, más fácil de animar, más interesante que solo cubos
- **Desventajas**: Puede requerir más trabajo para vertex groups si las formas son muy complejas
- **Cuándo usarlo**: Si prefieres un balance entre calidad visual y estilo voxel con formas geométricas variadas

### Modelo Humano - Variación 3 (Estilo Minimalista)
```
geometric human figure, voxel art, extremely low poly, 
T-pose, made of simple geometric shapes, cube head, 
rectangular body parts, blocky arms and legs, 
no details, clean edges, game asset, 
modular structure, easy to modify, vertex groups ready
```

**Explicación:**
Este prompt genera el modelo más minimalista y simple posible:
- **Estilo**: Extremadamente simple, solo formas geométricas básicas, sin detalles
- **Complejidad**: Mínimo polígono posible (ideal para performance)
- **Uso**: Si priorizas rendimiento sobre apariencia, o quieres un estilo muy minimalista
- **Ventajas**: Muy ligero, carga rápido, fácil de modificar, perfecto para prototipos
- **Desventajas**: Puede verse demasiado simple o "placeholder"
- **Cuándo usarlo**: Para prototipos rápidos, testing, o si el rendimiento es crítico

---

## 🎨 Prompts para Meshy AI (https://www.meshy.ai/)

### Modelo Humano Base
```
A low poly voxel art human character in T-pose, blocky geometric style, 
game ready asset, made of diverse geometric shapes: cubes, cylinders, spheres, prisms, 
head as sphere or cube, arms as cylinders or prisms, legs as cylinders or prisms, 
torso as prism or cylinder, Minecraft-like aesthetic, simple colors, modular body parts, 
head, torso, arms, and legs clearly separated, 
suitable for vertex group assignment, clean geometry, geometric variety
```

**Explicación:**
Prompt optimizado específicamente para Meshy AI, con sintaxis que funciona mejor en esta herramienta:
- **Estilo**: Voxel art balanceado, similar al prompt base de Rodin
- **Complejidad**: Bajo polígono con partes claramente separadas
- **Uso**: Versión alternativa del prompt base, pero optimizado para Meshy
- **Ventajas**: Funciona bien con el algoritmo de Meshy, genera modelos consistentes
- **Cuándo usarlo**: Si estás usando Meshy AI y el prompt base no da buenos resultados

### Modelo Humano - Estilo Pixel Art 3D
```
3D pixel art human character, voxel style, T-pose, 
blocky and geometric, low polygon count, 
simple shapes, cube-based design, game character, 
modular body structure, easy to separate parts, 
vertex groups ready, stylized proportions
```

**Explicación:**
Este prompt enfatiza el estilo "pixel art 3D", que es una variante del voxel art con estética retro:
- **Estilo**: Pixel art 3D, más estilizado que voxel puro, con estética retro
- **Complejidad**: Bajo polígono pero con proporciones estilizadas
- **Uso**: Si quieres un estilo más "artístico" o retro, diferente al Minecraft clásico
- **Ventajas**: Estilo único, visualmente interesante, mantiene modularidad
- **Desventajas**: Puede no coincidir perfectamente con el mundo voxel puro
- **Cuándo usarlo**: Si quieres experimentar con un estilo visual diferente pero compatible

---

## 🚀 Prompts para Luma AI (https://lumalabs.ai/)

**Nota**: Luma funciona mejor con imágenes de referencia. Usa estos prompts si tienes modo texto:

```
low poly voxel human character, T-pose, blocky geometric style, 
game asset, Minecraft-like, simple shapes, modular design
```

**Explicación:**
Prompt simplificado para Luma AI, ya que esta herramienta funciona mejor con imágenes:
- **Estilo**: Voxel básico, prompt corto porque Luma prefiere referencias visuales
- **Complejidad**: Bajo polígono, formas simples
- **Uso**: Solo si Luma tiene modo texto, pero es mejor usar una imagen de referencia
- **Ventajas**: Prompt corto y directo
- **Desventajas**: Luma no es ideal para generación desde texto puro
- **Cuándo usarlo**: Si tienes una imagen de referencia de un modelo voxel y quieres que Luma la mejore o modifique
- **Recomendación**: Mejor usar Rodin o Meshy para generación desde texto

---

## 🎮 Prompts Específicos por Parte del Cuerpo

### Cabeza (Head)
```
voxel cube head, low poly, blocky, geometric, 
simple face, game asset, Minecraft style, 
square edges, minimal details, single color or simple colors
```

**Explicación:**
Prompt para generar solo la cabeza del personaje como parte separada:
- **Uso**: Si quieres generar las partes del cuerpo por separado y luego unirlas en Blender
- **Ventajas**: Control total sobre cada parte, fácil de modificar individualmente
- **Cuándo usarlo**: Si prefieres un enfoque modular, generando cada parte por separado
- **Nota**: Después de generar todas las partes, necesitarás unirlas en Blender y crear vertex groups

### Brazo (Arm)
```
voxel rectangular arm, low poly, blocky geometric, 
T-pose position, game asset, simple shape, 
cube-based, modular design, easy to attach/detach
```

**Explicación:**
Prompt para generar un brazo como parte separada:
- **Uso**: Generar brazo izquierdo o derecho por separado
- **Ventajas**: Puedes generar múltiples variaciones y elegir la mejor
- **Cuándo usarlo**: Si quieres un enfoque modular, generando cada parte individualmente
- **Nota**: Necesitarás generar dos (izquierdo y derecho) o generar uno y espejarlo en Blender

### Torso
```
voxel rectangular torso, low poly, blocky geometric, 
game asset, simple shape, cube-based, 
modular design, connection points for limbs
```

**Explicación:**
Prompt para generar el torso como parte central:
- **Uso**: Parte central del cuerpo donde se conectan brazos, piernas y cabeza
- **Ventajas**: Puedes diseñar puntos de conexión específicos para cada extremidad
- **Cuándo usarlo**: Si quieres un enfoque modular, generando cada parte por separado
- **Nota**: El torso es la parte más importante, asegúrate que tenga buena geometría para conectar las otras partes

### Pierna (Leg)
```
voxel rectangular leg, low poly, blocky geometric, 
T-pose position, game asset, simple shape, 
cube-based, modular design, easy to attach/detach
```

**Explicación:**
Prompt para generar una pierna como parte separada:
- **Uso**: Generar pierna izquierda o derecha por separado
- **Ventajas**: Control individual sobre cada parte
- **Cuándo usarlo**: Si quieres un enfoque modular, generando cada parte individualmente
- **Nota**: Similar a los brazos, necesitarás generar dos o espejar una en Blender

---

## 🎨 Prompts con Estilo Específico del Mundo

### Modelo que Coincida con Tu Mundo Voxel
```
human character, voxel art style, blocky geometric, 
matches voxel particle world, low poly game asset, 
T-pose, cube-based body parts, square edges, 
simple colors matching green terrain and blue water aesthetic, 
Minecraft-like, pixelated appearance, modular design, 
vertex groups ready, suitable for limb damage system, 
stylized proportions, game ready, clean geometry
```

**Explicación:**
Este prompt está específicamente diseñado para que el modelo coincida visualmente con tu mundo de partículas voxel:
- **Estilo**: Voxel art que coincide con el mundo (verde terreno, azul agua)
- **Complejidad**: Bajo polígono, formas geométricas simples
- **Uso**: Si quieres máxima coherencia visual entre el personaje y el entorno
- **Ventajas**: El personaje se verá como parte natural del mundo voxel
- **Características especiales**: Menciona colores del mundo (verde, azul) para mejor integración
- **Cuándo usarlo**: Cuando quieres que el personaje se integre perfectamente con el mundo existente

### Modelo con Colores del Mundo
```
voxel human character, low poly, blocky geometric, T-pose, 
colors: earth tones, greens, browns, simple palette, 
matches voxel world aesthetic, game asset, 
cube-based design, modular body parts, 
vertex groups ready, clean edges
```

**Explicación:**
Este prompt enfatiza los colores para que coincidan con la paleta del mundo:
- **Estilo**: Voxel art con paleta de colores específica (tierras, verdes, marrones)
- **Complejidad**: Bajo polígono, diseño modular
- **Uso**: Si quieres que el personaje use la misma paleta de colores que el mundo
- **Ventajas**: Mejor integración visual, personaje se camufla o destaca según necesites
- **Cuándo usarlo**: Cuando la paleta de colores es importante para la coherencia visual
- **Nota**: Puedes ajustar los colores según tu paleta específica (ej: "blues, grays" para otro estilo)

---

## 📝 Prompts para Modificar Modelos Existentes

Si ya tienes un modelo y quieres convertirlo a estilo voxel:

### Convertir a Voxel
```
convert this model to voxel art style, make it blocky and geometric, 
low poly, cube-based, square edges, Minecraft-like aesthetic, 
preserve body part separation, maintain T-pose, 
simplify to basic shapes, remove smooth surfaces
```

**Explicación:**
Este prompt es para convertir un modelo existente (que ya tengas) al estilo voxel:
- **Uso**: Si ya tienes un modelo humano (de Mixamo, Blender, etc.) y quieres convertirlo a voxel
- **Ventajas**: Mantiene la estructura del modelo original pero cambia el estilo
- **Cuándo usarlo**: Si encontraste un modelo perfecto pero no está en estilo voxel
- **Proceso**: Sube el modelo existente a la herramienta IA y usa este prompt
- **Nota**: Asegúrate que el modelo original tenga partes separadas para que se preserven

### Estilizar a Voxel
```
stylize this character to voxel art, blocky geometric style, 
low poly, cube-based body parts, square edges, 
preserve modular structure, game ready, 
maintain vertex groups, simple colors
```

**Explicación:**
Similar al anterior pero más suave, "estiliza" en lugar de "convertir":
- **Uso**: Si quieres una conversión más sutil, manteniendo más características del original
- **Ventajas**: Conserva más detalles del modelo original mientras aplica estilo voxel
- **Cuándo usarlo**: Si el modelo original es bueno pero quieres solo ajustar el estilo
- **Diferencia con "Convertir"**: Este es más suave, "Convertir" es más agresivo
- **Nota**: Específicamente menciona "maintain vertex groups" para preservar la estructura modular

---

## 🎯 Prompts Específicos para Tu Caso de Uso

### Modelo para Sistema de Daño por Partes
```
voxel human character, low poly, blocky geometric, T-pose, 
game ready asset, modular body design, 
clearly separated body parts: head, torso, left arm, right arm, left leg, right leg, 
each part as distinct geometric shape: head as sphere or cube, 
arms as cylinders or prisms, legs as cylinders or prisms, torso as prism or cylinder, 
diverse geometric shapes: cubes, cylinders, spheres, prisms, 
vertex groups ready, easy to separate visually, 
suitable for limb damage system, clean geometry, 
Minecraft-like aesthetic, simple colors, geometric variety
```

**Explicación:**
Este es el prompt más específico para tu caso de uso: sistema de daño por partes del cuerpo:
- **Estilo**: Voxel art con énfasis en modularidad y separación de partes
- **Complejidad**: Bajo polígono, partes claramente definidas
- **Uso**: Específicamente diseñado para el sistema de corte de extremidades
- **Ventajas**: Enfatiza que cada parte debe ser fácil de separar visualmente
- **Características clave**: Menciona explícitamente las 6 partes (cabeza, torso, 2 brazos, 2 piernas)
- **Cuándo usarlo**: Este es el prompt ideal para tu sistema de daño por partes
- **Recomendación**: Este debería ser tu primer intento si vas a implementar el sistema de corte

### Modelo Optimizado para Corte
```
low poly voxel human, blocky geometric style, T-pose, 
modular design with clear separation points between body parts, 
head as sphere or cube, arms as cylinders or rectangular prisms, 
legs as cylinders or rectangular prisms, torso as rectangular prism or cylinder, 
diverse geometric shapes: cubes, cylinders, spheres, prisms, 
each part can be easily detached, vertex groups ready, 
game asset, Minecraft-like, simple geometric shapes, 
clean edges, suitable for limb cutting system, geometric variety
```

**Explicación:**
Este prompt es aún más específico que el anterior, enfocándose en los "puntos de separación":
- **Estilo**: Voxel art extremadamente modular, con puntos de corte claros
- **Complejidad**: Muy bajo polígono, formas geométricas puras
- **Uso**: Si el prompt anterior no genera suficientes puntos de separación claros
- **Ventajas**: Enfatiza que cada parte debe poder desprenderse fácilmente
- **Características clave**: Menciona explícitamente "clear separation points" y "easily detached"
- **Cuándo usarlo**: Si necesitas que las partes se separen visualmente de forma muy clara
- **Diferencia con el anterior**: Este es más extremo en modularidad, el anterior es más balanceado

---

## 🔧 Parámetros Adicionales (si la herramienta los soporta)

### Para Rodin:
- **Style**: Voxel Art, Low Poly, Game Asset
- **Complexity**: Low
- **Poly Count**: 100-500 (muy bajo)
- **Textures**: None o Simple Colors
- **Pose**: T-Pose

### Para Meshy:
- **Style**: Voxel, Low Poly, Geometric
- **Detail Level**: Low
- **Color**: Simple, Single Color o Minimal Palette

---

## 📋 Checklist de Características Deseadas

Al generar el modelo, asegúrate que tenga:
- [ ] Estilo voxel/blocky que coincida con el mundo
- [ ] T-pose (brazos extendidos, piernas rectas)
- [ ] Partes del cuerpo claramente separadas
- [ ] Bajo conteo de polígonos (100-500)
- [ ] Formas geométricas simples (cubos, rectángulos)
- [ ] Bordes cuadrados, no suaves
- [ ] Colores simples o sin texturas
- [ ] Diseño modular (fácil separar partes)
- [ ] Listo para vertex groups

---

## 🎨 Ejemplos de Estilos Visuales

### Estilo 1: Minecraft Clásico
- Completamente blocky
- Cubos perfectos
- Colores planos
- Sin detalles

### Estilo 2: Voxel Art Moderno
- Blocky pero con proporciones realistas
- Formas geométricas simples
- Colores simples
- Ligeramente estilizado

### Estilo 3: Low Poly Voxel
- Muy bajo polígono
- Formas geométricas básicas
- Estilo híbrido
- Limpio y minimalista

---

## 💡 Tips para Mejores Resultados

1. **Itera**: Prueba variaciones del prompt
2. **Especifica estilo**: Siempre menciona "voxel", "blocky", "low poly"
3. **Menciona T-pose**: Importante para vertex groups
4. **Pide modularidad**: Menciona "modular design", "easy to separate"
5. **Especifica uso**: "game asset", "vertex groups ready", "limb damage system"
6. **Colores simples**: "simple colors", "no textures", "single color"

---

## 🚀 Próximos Pasos Después de Generar

1. **Descargar modelo** en formato GLB o FBX
2. **Importar en Blender**
3. **Verificar estructura** (partes separadas)
4. **Crear vertex groups** si no están
5. **Exportar a GLB** con vertex groups
6. **Probar en Three.js** que se cargan correctamente

---

## 📚 Recursos

- **Rodin**: https://rodin.io/
- **Meshy AI**: https://www.meshy.ai/
- **Luma AI**: https://lumalabs.ai/
- **Blender**: https://www.blender.org/
- **GLTF Viewer**: https://gltf-viewer.donmccurdy.com/

---

## 🎯 Prompt Recomendado (Todo-en-Uno)

**Para Rodin o Meshy:**
```
voxel human character, low poly, blocky geometric style, T-pose, 
game ready asset, Minecraft-like aesthetic, diverse geometric body parts, 
head as sphere or cube, arms and legs as cylinders or rectangular prisms, 
torso as rectangular prism or cylinder, geometric variety: cubes, cylinders, spheres, prisms, 
clearly separated body parts, modular design, easy to separate visually, 
vertex groups ready, suitable for limb damage system, 
simple colors, no textures, geometric edges, clean geometry, 
low polygon count (100-500), stylized proportions, matches voxel particle world, 
similar to trees with cylindrical trunks and spherical crowns
```

**Explicación:**
Este es el prompt "todo-en-uno" que combina todas las características necesarias:
- **Estilo**: Voxel art completo con formas geométricas variadas (no solo cubos)
- **Formas**: Similar a los árboles del juego: cilindros para extremidades, esferas para cabeza, prismas para torso
- **Complejidad**: Bajo polígono (100-500 polígonos) para buen rendimiento
- **Uso**: Prompt definitivo que incluye todo: estilo, modularidad, vertex groups, sistema de daño, formas variadas
- **Ventajas**: No necesitas combinar prompts, este tiene todo, incluye variedad geométrica como el resto del mundo
- **Características**: Incluye conteo de polígonos específico, menciona coincidencia con el mundo y similitud con árboles
- **Cuándo usarlo**: Este es el prompt recomendado para empezar, tiene todo lo que necesitas incluyendo formas variadas
- **Recomendación**: Úsalo como base y ajusta según los resultados que obtengas. Este prompt genera modelos que usan formas geométricas diversas como los árboles (cilindros, esferas, prismas), no solo cubos

