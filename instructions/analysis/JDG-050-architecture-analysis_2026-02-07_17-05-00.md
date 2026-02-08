# Análisis de Arquitectura - Refactorizar renderParticles() (JDG-050)

Fecha: 2026-02-07_17-05-00

## Resumen

Objetivo: Proponer una refactorización segura y gradual de `renderParticles()` en `frontend/src/terrain/renderers/particle-renderer.js` (actualmente ~330 líneas) para mejorar separación de responsabilidades, testabilidad y mantenibilidad sin introducir regresiones funcionales.

## Situación Actual

### Frontend

Estructura relevante:
```
frontend/src/terrain/renderers/particle-renderer.js
frontend/src/rendering/optimizations/         # object-pool, frustum-culling, lod, instancing managers
frontend/src/rendering/geometry/             # geometry registry
frontend/src/ports/                          # contracts for APIs
```

Problemas identificados:
1. `renderParticles()` concentra múltiples responsabilidades: culling, LOD, adaptive limiting, density limiting, agrupación, creación de instanced meshes y construcción de índices.  
2. Método largo (~179–508) difícil de entender y testar.  
3. Logs mezclados con lógica; difícil instrumentar etapas.  
4. Difícil aislar optimizaciones para pruebas unitarias o A/B testing (por ejemplo habilitar/deshabilitar LOD sin tocar el flujo).  
5. Acoplamiento entre agrupación (por geometría/material) y creación de meshes impide reutilizar la agrupación en otros renderers.

## Necesidades Futuras

- Facilitar añadir nuevas optimizaciones (p. ej. culling por distancia, shader-based LOD).  
- Permitir testing unitario de cada etapa (culling, LOD, grouping, instancing).  
- Mantener compatibilidad con consumidores actuales (no cambiar la firma pública de `renderParticles()`).  
- Soportar instrumentación (timings / métricas) por etapa.

## Propuesta de Arquitectura (nivel módulo)

1. Convertir `renderParticles()` en un orquestador de pipeline que llame a helpers privados o módulos colaborativos: cada etapa es una función pura o un servicio con una API clara.  
2. Extraer 3–4 responsabilidades en módulos reutilizables bajo `frontend/src/rendering/optimizations/particles-pipeline/`:
   - culling.js  → aplicar frustum culling
   - lod.js      → aplicar LOD (strategy pluggable)
   - limiter.js  → adaptive limiting / density limiting
   - grouper.js  → agrupar por geometría/material y separar opacos/transparencias
   - instancer.js→ crear InstancedMesh a partir de grupos
3. Mantener un `ParticleRenderer` que actúe como fachada/orquestador: sus `_applyXxx` privados delegan a esos módulos.  
4. Instrumentación: cada etapa emite timing/logs (usar PerformanceManager existente).

Arquitectura propuesta (árbol):
```
frontend/src/terrain/renderers/particle-renderer.js      # ParticleRenderer (orquestador)
frontend/src/rendering/optimizations/particles-pipeline/
├── culling.js
├── lod.js
├── limiter.js
├── grouper.js
└── instancer.js
```

## Patrones y decisiones

- Strategy: para LOD (permitir múltiples algoritmos).  
- Pipeline/Chain of Responsibility: cada etapa recibe y transforma la lista de partículas.  
- Facade: `ParticleRenderer` provee método público `renderParticles()` simple que orquesta y mantiene compatibilidad.  
- Pure functions: donde sea posible (culling, grouping) devolver datos sin efectos secundarios; side-effects limitados a la etapa de instancing (creación y attach a escena).

## Ejemplos de firma (propuestos)

```javascript
// culling.js
export function applyFrustumCulling(particles, camera, cellSize) {
  // devuelve subset de particles
}

// grouper.js
export function buildParticleGroups(particles, tiposEstilos, geometryRegistry) {
  // devuelve Map<groupKey, { geometryId, materialId, particles: [...] }>
}

// instancer.js
export function createInstancedMeshes(groups, scene, cellSize, performanceManager) {
  // crea InstancedMesh y los añade a scene
  // devuelve estructura de index/metadata si es necesario
}
```

Ejemplo de orquestador (simplificado):
```javascript
renderParticles() {
  const visible = applyFrustumCulling(particles, camera, cellSize);
  const lodApplied = applyLODOptimization(visible, playerPos, camera, cellSize, lodStrategy);
  const limited = applyParticleLimiting(lodApplied, playerPos, camera, cellSize, limiterConfig);
  const groups = buildParticleGroups(limited, tiposEstilos, geometryRegistry);
  const index = createInstancedMeshes(groups, scene, cellSize, performanceManager);
  return index;
}
```

## Migración Propuesta (fases)

Fase 0 — Preparación (30–60 min)
- Añadir pruebas de integración visual básicas (script para reproducir escena de demo).  
- Añadir harness de pruebas unitarias si no existe (jest/mocha + jsdom/three-mock según infra).

Fase 1 — Extracción incremental (2–3 horas)
- Extraer `applyFrustumCulling()` como función pura en `culling.js`.  
- Escribir tests unitarios que comparen salida antes/después usando snapshot (lista de IDs filtrados).  
- Actualizar `renderParticles()` para llamar al nuevo helper (mantener resultados idénticos).

Fase 2 — LOD y Limiter (2–3 horas)
- Extraer `applyLODOptimization()` y `applyParticleLimiting()` con tests.  
- Introducir Strategy para LOD y configuración para limiter.

Fase 3 — Grouping + Instancing (2–4 horas)
- Extraer `buildParticleGroups()` y `createInstancedMeshes()`.  
- Escribir tests unitarios para grouping (grupos generados correctamente) y tests de integración visual para instancing (carga demo, comprobar counts).

Fase 4 — Limpieza y documentación (1 hora)
- Remover código duplicado, mover helpers a `rendering/optimizations/particles-pipeline/`.  
- Actualizar README del módulo `frontend/src/terrain/renderers/README.md` con el nuevo flujo.  
- Ejecutar link-checker y lints.

Total estimado (iterativo): 4–6 horas (coincide con estimación del ticket). Hacer en commits pequeños (1 helper por commit).

## Testing y Verificación

- Unit tests para cada helper (inputs controlados).  
- Snapshots: comparar conteos/IDs de partículas tras cada etapa con la versión original.  
- Integración visual: levantar demo y comprobar que no hay regresiones visuales y counts en consola/metrics.  
- Performance: medir FPS y tiempos por etapa (PerformanceManager) antes y después; asegurar no degradación.  
- Edge cases: sin cámara, sin particles, sin playerPosition, optimizaciones desactivadas.

## Riesgos y mitigaciones

1. Regresiones visuales — Mitigación: tests integration + revisión manual de demo.  
2. Pequeñas diferencias numéricas por reordenamiento — Mitigación: tolerancia en aserciones y pruebas visuales.  
3. Overhead de módulos nuevos — Mitigación: mantener funciones puras y sólo introducir side-effects en instancer; medir performance.  
4. Import paths rotos — Mitigación: commits pequeños, actualizar exports y ejecutar lints.

## Criterios de aceptación (mapa rápido)

- [ ] `renderParticles()` reducido a orquestador (+6 helpers)  
- [ ] Tests unitarios para cada helper con coverage mínima en esas funciones  
- [ ] Integración demo sin regresiones visuales  
- [ ] No errores de lint y PR description listo (`instructions/prs/JDG-050_pr-description_...md`)  
- [ ] PR revisado y mergeado

## Conclusión

La refactorización propuesta aplica principios SOLID y patrones prácticos (Pipeline + Strategy + Facade) para dividir responsabilidades del renderizado de partículas. Recomiendo proceder de forma incremental (Fase 1 → Fase 4) y crear un PR por cada conjunto de helpers extraídos para facilitar revisión y rollback si fuese necesario.

