# JDG-007 - Guía de Verificación y Medición de Mejoras

## Objetivo
Verificar que todas las optimizaciones funcionan correctamente y medir mejoras de rendimiento. El objetivo es alcanzar **60 FPS estables** en demo 40x40m (~400k partículas).

## Pre-requisitos
1. Backend ejecutándose (Docker Compose o directamente)
2. Base de datos con dimensión demo: "Demo - Bioma Bosque 40x40 con Acuífero"
3. Frontend ejecutándose (servidor de desarrollo o build)
4. Navegador con consola abierta (F12)

---

## Paso 1: Verificar que el Demo se Carga Correctamente

### Acciones:
1. Abrir la aplicación en el navegador
2. Abrir la consola del navegador (F12)
3. Verificar que no hay errores en la consola
4. Verificar que el demo se carga correctamente

### Resultados Esperados:
- ✅ No hay errores en consola
- ✅ Se muestra el terreno 3D
- ✅ Se pueden ver partículas renderizadas
- ✅ La cámara se puede mover (rotar, zoom, pan)

### Logs Esperados en Consola:
```
Performance: FPS: [número], Draw Calls: [número]
```

---

## Paso 2: Verificar Frustum Culling

### Acciones:
1. Observar los logs en consola al cargar el demo
2. Buscar el mensaje: `Frustum culling: [total] -> [visibles] partículas (reducción: [%]%)`
3. Rotar la cámara (arrastrar con mouse)
4. Observar si el mensaje de frustum culling aparece cuando la cámara se mueve
5. Verificar que el número de partículas visibles cambia según la orientación de la cámara

### Resultados Esperados:
- ✅ Al cargar, se muestra un mensaje de frustum culling con reducción de partículas
- ✅ La reducción debería ser significativa (50-80% de partículas filtradas)
- ✅ Al rotar la cámara, el número de partículas visibles cambia
- ✅ El FPS mejora cuando hay menos partículas visibles

### Métricas a Registrar:
- **Partículas totales**: [número]
- **Partículas visibles iniciales**: [número]
- **Reducción porcentual**: [%]
- **Partículas visibles después de rotar cámara**: [número]

---

## Paso 3: Verificar LOD (Level of Detail)

### Acciones:
1. Acercar la cámara a un grupo de partículas (zoom in con rueda del mouse)
2. Alejar la cámara (zoom out)
3. Observar si hay cambios en el detalle de las partículas
4. Verificar en consola si hay logs relacionados con LOD (opcional, si se implementó logging)

### Resultados Esperados:
- ✅ Las partículas cercanas tienen más detalle (más polígonos)
- ✅ Las partículas lejanas tienen menos detalle (menos polígonos)
- ✅ No hay "pop-in" visible (transiciones suaves)
- ✅ El FPS mejora cuando hay más partículas lejanas (con LOD bajo)

### Métricas a Registrar:
- **FPS con cámara cercana**: [número]
- **FPS con cámara lejana**: [número]
- **Observaciones visuales**: [texto]

---

## Paso 4: Medir FPS Antes y Después

### Acciones:
1. Observar los logs de FPS en consola
2. Esperar 5-10 segundos para que el FPS se estabilice
3. Registrar el FPS promedio
4. Mover la cámara (rotar, zoom, pan) y observar si el FPS se mantiene estable
5. Registrar FPS durante diferentes movimientos de cámara

### Resultados Esperados:
- ✅ **FPS mínimo: >= 60 FPS** (objetivo principal)
- ✅ FPS estable durante movimiento de cámara
- ✅ No hay caídas bruscas de FPS (< 30 FPS)

### Métricas a Registrar:
- **FPS promedio (cámara estática)**: [número]
- **FPS promedio (cámara en movimiento)**: [número]
- **FPS mínimo observado**: [número]
- **FPS máximo observado**: [número]

---

## Paso 5: Contar Draw Calls

### Acciones:
1. Observar los logs de "Draw Calls" en consola
2. Registrar el número de draw calls al cargar el demo
3. Comparar con el número esperado (debería ser menor que el número de grupos de geometría+material)

### Resultados Esperados:
- ✅ Draw calls < número de tipos de partículas diferentes
- ✅ Draw calls reducido en al menos 50% comparado con implementación sin optimizaciones
- ✅ Draw calls se mantiene estable durante movimiento de cámara

### Métricas a Registrar:
- **Draw calls iniciales**: [número]
- **Draw calls durante movimiento**: [número]
- **Número de tipos de partículas**: [número]

---

## Paso 6: Verificar que No Hay Degradación Visual

### Acciones:
1. Observar la calidad visual general del terreno
2. Verificar que las partículas se renderizan correctamente
3. Verificar que no hay artefactos visuales (partículas faltantes, colores incorrectos, etc.)
4. Verificar que las partículas transparentes (agua) se renderizan correctamente

### Resultados Esperados:
- ✅ Calidad visual aceptable
- ✅ No hay artefactos visuales evidentes
- ✅ Partículas transparentes se renderizan correctamente (agua visible)
- ✅ No hay "pop-in" o "pop-out" visible de partículas

### Observaciones a Registrar:
- **Calidad visual general**: [Excelente/Buena/Aceptable/Mala]
- **Artefactos visuales**: [Sí/No] - [descripción si hay]
- **Partículas transparentes**: [Correcto/Incorrecto]

---

## Paso 7: Verificar Optimizaciones de Ordenamiento

### Acciones:
1. Observar el tiempo de carga del demo
2. Verificar que no hay lag durante el renderizado inicial
3. Verificar que el ordenamiento se hace una sola vez (revisar código si es necesario)

### Resultados Esperados:
- ✅ Tiempo de carga razonable (< 5 segundos para 400k partículas)
- ✅ No hay lag durante renderizado inicial
- ✅ Ordenamiento eficiente (una sola vez)

### Métricas a Registrar:
- **Tiempo de carga**: [segundos]
- **Tiempo de renderizado inicial**: [segundos]

---

## Paso 8: Verificar Material Pooling

### Acciones:
1. Verificar que los materiales se reutilizan (revisar código si es necesario)
2. Observar que no hay creación excesiva de materiales

### Resultados Esperados:
- ✅ Materiales se reutilizan (no se crean materiales duplicados)
- ✅ Reducción en uso de memoria

---

## Resumen de Métricas

### Métricas Clave a Registrar:

| Métrica | Valor Esperado | Valor Observado | ✅/❌ |
|---------|---------------|-----------------|------|
| **FPS promedio** | >= 60 FPS | [número] | |
| **FPS mínimo** | >= 30 FPS | [número] | |
| **Partículas totales** | ~400k | [número] | |
| **Reducción frustum culling** | 50-80% | [%] | |
| **Draw calls** | < tipos partículas | [número] | |
| **Tiempo de carga** | < 5 seg | [segundos] | |
| **Calidad visual** | Aceptable o mejor | [texto] | |

---

## Criterios de Éxito

### ✅ Éxito Total:
- FPS >= 60 FPS en demo 40x40m
- Frustum culling funciona (reducción 50-80%)
- LOD funciona (cambio de detalle visible)
- Draw calls reducido en al menos 50%
- Sin degradación visual significativa

### ⚠️ Éxito Parcial:
- FPS >= 45 FPS pero < 60 FPS
- Todas las optimizaciones funcionan
- **Acción**: Considerar optimizaciones adicionales (Paso 12)

### ❌ Falla:
- FPS < 45 FPS
- Optimizaciones no funcionan correctamente
- Degradación visual significativa
- **Acción**: Revisar implementación y corregir errores

---

## Próximos Pasos

### Si FPS >= 60:
✅ **Paso 11 completado exitosamente**
→ Proceder a generar descripción del Pull Request

### Si FPS < 60 pero >= 45:
⚠️ **Paso 11 completado parcialmente**
→ Proceder al Paso 12: Optimizaciones Adicionales

### Si FPS < 45:
❌ **Paso 11 falló**
→ Revisar implementación y corregir errores antes de continuar

---

## Notas Adicionales

- Los logs de performance aparecen cada segundo en consola
- El frustum culling solo muestra logs cuando hay reducción significativa
- El LOD puede no ser muy visible si todas las partículas están a distancia similar
- Las métricas pueden variar según el hardware del sistema

---

**Fecha de verificación**: [fecha]
**Verificado por**: [nombre]
**Resultado**: [✅ Éxito / ⚠️ Parcial / ❌ Falla]

