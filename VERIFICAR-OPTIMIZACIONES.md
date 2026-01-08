# Cómo Verificar que las Optimizaciones JDG-047 Están Funcionando

Este documento explica cómo verificar que las optimizaciones implementadas están siendo utilizadas correctamente.

## Método Rápido: Función de Verificación Automática

Abre la consola del navegador (F12) y ejecuta:

```javascript
checkOptimizations()
```

Esto mostrará un reporte completo del estado de todas las optimizaciones.

## Método Detallado: Verificar Cada Optimización

### 1. Verificar Object Pool

**En la consola del navegador:**

```javascript
// Ver estadísticas de todos los pools
window.app.objectPool.vector3.getStats()
window.app.objectPool.quaternion.getStats()
window.app.objectPool.euler.getStats()
window.app.objectPool.matrix4.getStats()

// Ver estadísticas combinadas
const pools = window.app.objectPool;
let totalCreated = 0, totalReused = 0;
for (const pool of Object.values(pools)) {
    const stats = pool.getStats();
    totalCreated += stats.totalCreated;
    totalReused += stats.totalReused;
}
const reuseRate = (totalReused / (totalCreated + totalReused)) * 100;
console.log(`Tasa de reutilización global: ${reuseRate.toFixed(2)}%`);
```

**Qué buscar:**
- ✅ **Tasa de reutilización > 50%**: El pool se está usando bien
- ✅ **Total creados aumenta**: Se están usando objetos del pool
- ✅ **Total reutilizados aumenta**: Los objetos se están reutilizando

**Prueba práctica:**
1. Ejecuta `checkOptimizations()` para ver estadísticas iniciales
2. Equipa/desequipa un arma varias veces: `equipWeapon('sword')`, `equipWeapon(null)`
3. Ejecuta `checkOptimizations()` de nuevo
4. Deberías ver que `totalReused` aumenta, especialmente en `vector3` y `euler`

### 2. Verificar Cache de Sistemas ECS

**En la consola del navegador:**

```javascript
// Verificar estado del cache
window.app.ecs.sortedSystems !== null  // Debe ser true después del primer frame
window.app.ecs.systemsDirty  // Debe ser false después del primer frame
window.app.ecs.cacheStats  // Ver estadísticas de uso

// Verificar que el cache tiene los sistemas ordenados
window.app.ecs.sortedSystems?.length === window.app.ecs.systems.length
```

**Qué buscar:**
- ✅ **`sortedSystems` no es null**: El cache existe
- ✅ **`systemsDirty` es false**: El cache es válido
- ✅ **Tasa de hit > 90%**: El cache se está usando eficientemente

**Prueba práctica:**
1. Ejecuta `checkOptimizations()` para ver estadísticas iniciales
2. Espera unos segundos (deja el juego corriendo)
3. Ejecuta `checkOptimizations()` de nuevo
4. Deberías ver que `cacheHits` aumenta mucho más que `cacheMisses`

### 3. Verificar Dirty Flag del Cielo

**En la consola del navegador:**

```javascript
// Ver estadísticas del dirty flag
window.app.scene.renderer.getSkyColorStats()

// Ver valores actuales
window.app.scene.renderer.lastSunIntensity
window.app.scene.renderer.lastSkyColor
window.app.scene.renderer.skyColorDirty
```

**Qué buscar:**
- ✅ **`skipRate > 50%`**: El dirty flag está evitando actualizaciones innecesarias
- ✅ **`skips` aumenta**: Se están saltando actualizaciones cuando no hay cambios
- ✅ **`updates` solo aumenta cuando el sol cambia**: El sistema funciona correctamente

**Prueba práctica:**
1. Ejecuta `checkOptimizations()` para ver estadísticas iniciales
2. Espera 10-20 segundos (deja el juego corriendo)
3. Ejecuta `checkOptimizations()` de nuevo
4. Deberías ver que `skips` es mucho mayor que `updates` (porque el sol cambia lentamente)

## Monitoreo en Tiempo Real

### Monitorear Object Pool

```javascript
// Monitorear cada 5 segundos
const monitor = monitorObjectPool(5);

// Para detener:
monitor.stop();
// o simplemente:
clearInterval(window._objectPoolMonitor);
```

Esto mostrará estadísticas actualizadas cada 5 segundos.

## Verificación Visual en el Juego

### Object Pool
- **Antes**: Al equipar armas, podrías ver stutters (pausas) por garbage collection
- **Después**: Equipar armas debería ser más fluido sin stutters

### Cache de Sistemas
- No hay diferencia visual, pero el FPS debería ser ligeramente mejor (1-2 FPS)

### Dirty Flag del Cielo
- No hay diferencia visual, pero el FPS debería ser ligeramente mejor (1-2 FPS)
- El color del cielo debe seguir cambiando correctamente con el movimiento del sol

## Métricas de FPS

Para medir el impacto en FPS:

1. Abre la interfaz de debug (F4)
2. Ve a la pestaña "Métricas de Performance"
3. Activa "Auto-refresh cada 3 segundos"
4. Anota el FPS promedio
5. Desactiva temporalmente las optimizaciones (no recomendado, solo para comparar)
6. Compara los FPS

**Impacto esperado:**
- Object Pool: +5-10 FPS (especialmente al equipar/des equipar armas)
- Cache de sistemas: +1-2 FPS
- Dirty flag cielo: +1-2 FPS
- **Total: +7-14 FPS**

## Troubleshooting

### Object Pool no se usa
- Verifica que `window.app.objectPool` existe
- Verifica que `weapon-equip-system.js` está usando el pool (busca `objectPool?.vector3?.acquire()`)

### Cache de sistemas no funciona
- Verifica que `ecs.sortedSystems` no es null después de unos segundos
- Si `systemsDirty` siempre es true, puede haber un problema con `registerSystem()` o `unregisterSystem()`

### Dirty flag no funciona
- Verifica que `renderer.lastSunIntensity` y `renderer.lastSkyColor` existen
- Si `skipRate` es muy bajo, puede que el threshold sea muy pequeño

## Comandos Útiles

```javascript
// Ver todo de un vistazo
checkOptimizations()

// Ver solo object pool
Object.values(window.app.objectPool).map(p => p.getStats())

// Ver solo cache ECS
window.app.ecs.cacheStats

// Ver solo cielo
window.app.scene.renderer.getSkyColorStats()

// Resetear estadísticas (si es necesario)
window.app.scene.renderer.skyColorUpdates = 0
window.app.scene.renderer.skyColorSkips = 0
window.app.ecs.cacheStats = { totalUpdates: 0, cacheHits: 0, cacheMisses: 0 }
```
