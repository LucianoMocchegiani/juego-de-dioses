# 07 - Migración de Throttling Manual de Logs al Sistema Integrado

**Fecha de creación**: 2026-01-10  
**Prioridad**: Baja  
**Estado**: Pendiente  
**Tipo**: Refactorización / Limpieza de código

---

## Resumen

Actualmente existe un sistema de throttling integrado en `debugLogger` que permite controlar la frecuencia de logs de forma centralizada. Sin embargo, aún quedan algunos lugares en la aplicación donde se usa throttling manual con variables como `lastXLogTime` y verificaciones de intervalos.

Esta deuda técnica propone migrar todos los throttlings manuales restantes al nuevo sistema integrado en `debugLogger`, centralizando la lógica y eliminando código duplicado.

---

## Contexto Actual

### Sistema de Throttling Integrado

El `debugLogger` ya implementa un sistema de throttling integrado que fue agregado recientemente:

**Ubicación**: `frontend/src/debug/logger.js`

**Características**:
- Throttling por clave única (por defecto: `${system}:${message}`)
- Soporte para claves personalizadas con `throttleKey`
- Rastreo interno con `Map` de `lastLogTimes`
- Aplicable a todos los niveles: `info`, `warn`, `error`, `debug`

**Sintaxis**:
```javascript
debugLogger.info('System', 'Mensaje', data, { throttleMs: 2000 });
debugLogger.warn('System', 'Mensaje', data, { throttleMs: 1000, throttleKey: 'custom-key' });
```

### Throttling Manual Actual

Aún existen lugares donde se usa throttling manual:

**Patrón común**:
```javascript
// En el constructor
this.lastXLogTime = 0;

// En el método
const now = performance.now();
if (!this.lastXLogTime || now - this.lastXLogTime >= INTERVAL) {
    debugLogger.info('System', 'Mensaje', data);
    this.lastXLogTime = now;
}
```

**Problemas con este enfoque**:
1. **Código duplicado**: Cada lugar repite la misma lógica
2. **Variables innecesarias**: Se almacenan variables de estado solo para throttling
3. **Mantenimiento difícil**: Cambios requieren modificar múltiples lugares
4. **Posible inconsistencia**: Diferentes implementaciones pueden tener bugs sutiles

---

## Objetivo

Migrar todos los throttlings manuales al sistema integrado en `debugLogger`, eliminando:
- Variables de estado como `lastXLogTime`
- Lógica condicional de throttling manual
- Código duplicado relacionado con throttling

---

## Áreas de Aplicación

### 1. Sistemas ECS

**Archivos potenciales**:
- `frontend/src/ecs/systems/*.js`
- Cualquier sistema que loguee información periódica

**Ejemplos de búsqueda**:
- Variables que terminan en `LogTime` o `LastLogTime`
- Condiciones con `performance.now()` y comparaciones de intervalo
- Logs dentro de loops de animación sin throttling

### 2. Sistemas de Renderizado

**Archivos potenciales**:
- `frontend/src/core/renderer.js`
- `frontend/src/ecs/systems/render-system.js`
- Sistemas de optimización de rendering

**Ya migrados**:
- ✅ `frontend/src/terrain/renderers/particle-renderer.js` (`lastRenderLog`, `lastNoCameraLog`)
- ✅ `frontend/src/terrain/manager.js` (`lastDebugLogTime`, `lastNoPositionLogTime`, `lastMovementLogTime`)

### 3. Sistemas de Animación

**Archivos potenciales**:
- `frontend/src/ecs/systems/animation-mixer-system.js`
- `frontend/src/ecs/systems/animation-state-system.js`

### 4. Sistemas de Física y Colisiones

**Archivos potenciales**:
- `frontend/src/ecs/systems/physics-system.js`
- `frontend/src/ecs/systems/collision-system.js`

### 5. Sistemas de Entrada y Control

**Archivos potenciales**:
- `frontend/src/core/input-manager.js`
- Sistemas relacionados con input del usuario

### 6. Otros Sistemas

**Archivos potenciales**:
- `frontend/src/app.js`
- Cualquier otro archivo que loguee información periódica

---

## Estrategia de Migración

### Paso 1: Identificación

**Búsqueda de patrones**:
1. Buscar variables que terminen en `LogTime`, `LastLogTime`, `LastLog`
2. Buscar condiciones con `performance.now()` y comparaciones de intervalo
3. Buscar llamadas a `debugLogger.*` dentro de condiciones de throttling manual

**Comandos útiles**:
```bash
# Buscar variables de throttling
grep -r "last.*LogTime\|last.*Log.*=" frontend/src --include="*.js"

# Buscar condiciones de throttling
grep -r "performance\.now()" frontend/src --include="*.js" -A 5 | grep "last.*>="

# Buscar logs dentro de condiciones
grep -r "if.*last.*LogTime" frontend/src --include="*.js" -A 10
```

### Paso 2: Análisis

Para cada ocurrencia encontrada:

1. **Identificar el propósito**: ¿Qué log se está throttling y por qué?
2. **Identificar el intervalo**: ¿Cuál es el intervalo mínimo entre logs?
3. **Identificar la clave**: ¿Necesita una clave personalizada o usa la default?
4. **Verificar dependencias**: ¿Hay otras partes del código que dependan de esta variable?

### Paso 3: Migración

**Proceso estándar**:

1. **Eliminar variable del constructor**:
   ```javascript
   // ANTES
   this.lastXLogTime = 0;
   
   // DESPUÉS
   // (eliminar línea)
   ```

2. **Simplificar lógica de log**:
   ```javascript
   // ANTES
   const now = performance.now();
   if (!this.lastXLogTime || now - this.lastXLogTime >= INTERVAL) {
       debugLogger.info('System', 'Mensaje', data);
       this.lastXLogTime = now;
   }
   
   // DESPUÉS
   debugLogger.info('System', 'Mensaje', data, { throttleMs: INTERVAL });
   ```

3. **Si hay condición adicional** (ej: solo loggear si `distance > threshold`):
   ```javascript
   // ANTES
   const now = performance.now();
   if ((distance >= threshold || shouldRerender) && (!this.lastXLogTime || now - this.lastXLogTime >= INTERVAL)) {
       debugLogger.info('System', 'Mensaje', data);
       this.lastXLogTime = now;
   }
   
   // DESPUÉS
   if (distance >= threshold || shouldRerender) {
       debugLogger.info('System', 'Mensaje', data, { throttleMs: INTERVAL });
   }
   ```

4. **Si se necesita clave personalizada**:
   ```javascript
   // Para agrupar diferentes mensajes bajo el mismo throttling
   debugLogger.warn('System', 'Mensaje 1', data1, { throttleMs: 1000, throttleKey: 'group-key' });
   debugLogger.warn('System', 'Mensaje 2', data2, { throttleMs: 1000, throttleKey: 'group-key' });
   ```

### Paso 4: Verificación

Después de cada migración:

1. **Compilar sin errores**: Verificar que no hay errores de sintaxis
2. **Linter limpio**: Verificar que no hay errores de linter
3. **Pruebas funcionales**: Verificar que el throttling sigue funcionando correctamente
4. **No hay referencias restantes**: Buscar que no queden referencias a la variable eliminada

---

## Ejemplos de Migración

### Ejemplo 1: Throttling Simple

**Antes**:
```javascript
constructor() {
    this.lastDebugLogTime = 0;
}

update() {
    const now = performance.now();
    if (!this.lastDebugLogTime || now - this.lastDebugLogTime >= 5000) {
        debugLogger.info('System', 'Update ejecutado', { count: this.count });
        this.lastDebugLogTime = now;
    }
}
```

**Después**:
```javascript
constructor() {
    // Variable eliminada
}

update() {
    debugLogger.info('System', 'Update ejecutado', { count: this.count }, { throttleMs: 5000 });
}
```

### Ejemplo 2: Throttling con Condición

**Antes**:
```javascript
constructor() {
    this.lastMovementLogTime = 0;
}

update() {
    const distance = this.calculateDistance();
    const now = performance.now();
    if (distance > 0.5 && (!this.lastMovementLogTime || now - this.lastMovementLogTime >= 2000)) {
        debugLogger.info('System', 'Movimiento detectado', { distance });
        this.lastMovementLogTime = now;
    }
}
```

**Después**:
```javascript
constructor() {
    // Variable eliminada
}

update() {
    const distance = this.calculateDistance();
    if (distance > 0.5) {
        debugLogger.info('System', 'Movimiento detectado', { distance }, { throttleMs: 2000 });
    }
}
```

### Ejemplo 3: Throttling con Clave Personalizada

**Antes**:
```javascript
constructor() {
    this.lastErrorLogTime = 0;
}

handleError(error) {
    const now = performance.now();
    if (!this.lastErrorLogTime || now - this.lastErrorLogTime >= 1000) {
        debugLogger.error('System', 'Error procesado', { error: error.message });
        this.lastErrorLogTime = now;
    }
}

handleWarning(warning) {
    // Queremos que errores y warnings compartan el mismo throttling
    const now = performance.now();
    if (!this.lastErrorLogTime || now - this.lastErrorLogTime >= 1000) {
        debugLogger.warn('System', 'Warning procesado', { warning });
        this.lastErrorLogTime = now;
    }
}
```

**Después**:
```javascript
constructor() {
    // Variable eliminada
}

handleError(error) {
    debugLogger.error('System', 'Error procesado', { error: error.message }, { 
        throttleMs: 1000, 
        throttleKey: 'error-warning-group' 
    });
}

handleWarning(warning) {
    // Comparten el mismo throttling usando la misma clave
    debugLogger.warn('System', 'Warning procesado', { warning }, { 
        throttleMs: 1000, 
        throttleKey: 'error-warning-group' 
    });
}
```

---

## Consideraciones Especiales

### 1. Variables Compartidas

Si una variable de throttling se usa para múltiples logs diferentes, cada log debe usar la misma `throttleKey` personalizada:

```javascript
// ANTES
if (!this.lastLogTime || now - this.lastLogTime >= 1000) {
    debugLogger.info('System', 'Log 1', data1);
    debugLogger.warn('System', 'Log 2', data2);
    this.lastLogTime = now;
}

// DESPUÉS
debugLogger.info('System', 'Log 1', data1, { throttleMs: 1000, throttleKey: 'shared-group' });
debugLogger.warn('System', 'Log 2', data2, { throttleMs: 1000, throttleKey: 'shared-group' });
```

### 2. Throttling Condicional Complejo

Si el throttling solo se aplica bajo ciertas condiciones, mover la condición fuera:

```javascript
// ANTES
if (condition && (!this.lastLogTime || now - this.lastLogTime >= INTERVAL)) {
    debugLogger.info('System', 'Mensaje', data);
    this.lastLogTime = now;
}

// DESPUÉS
if (condition) {
    debugLogger.info('System', 'Mensaje', data, { throttleMs: INTERVAL });
}
```

### 3. Variables que También se Usan para Otros Propósitos

Si una variable se usa tanto para throttling como para otras lógicas, mantener la variable pero eliminar solo la parte de throttling:

```javascript
// ANTES
this.lastUpdateTime = 0; // Se usa para throttling Y para calcular deltaTime

update() {
    const now = performance.now();
    const deltaTime = now - this.lastUpdateTime;
    
    if (!this.lastUpdateTime || deltaTime >= 1000) {
        debugLogger.info('System', 'Update', { deltaTime });
    }
    
    this.lastUpdateTime = now;
}

// DESPUÉS (mantener variable si se necesita para deltaTime)
this.lastUpdateTime = 0; // Solo para calcular deltaTime

update() {
    const now = performance.now();
    const deltaTime = now - this.lastUpdateTime;
    
    debugLogger.info('System', 'Update', { deltaTime }, { throttleMs: 1000 });
    
    this.lastUpdateTime = now;
}
```

### 4. Throttling en Loops de Animación

Los logs dentro de loops de animación que se ejecutan cada frame deben tener throttling:

```javascript
// ANTES
animate() {
    const now = performance.now();
    if (!this.lastFPSLogTime || now - this.lastFPSLogTime >= 1000) {
        debugLogger.info('Renderer', 'FPS', { fps: this.fps });
        this.lastFPSLogTime = now;
    }
}

// DESPUÉS
animate() {
    debugLogger.info('Renderer', 'FPS', { fps: this.fps }, { throttleMs: 1000 });
}
```

---

## Criterios de Éxito

1. **Eliminación completa**: No quedan variables `lastXLogTime` o similares en el código
2. **Funcionalidad preservada**: El throttling sigue funcionando igual que antes
3. **Código más limpio**: Menos líneas de código, más legible
4. **Consistencia**: Todos los throttlings usan el mismo sistema
5. **Sin regresiones**: No hay nuevos bugs introducidos

---

## Beneficios Esperados

1. **Código más limpio**: Eliminación de ~20-50 líneas de código duplicado
2. **Mantenibilidad**: Cambios futuros en un solo lugar
3. **Consistencia**: Todos los throttlings funcionan de la misma manera
4. **Menos variables de estado**: Menos memoria y menos complejidad
5. **Facilidad de uso**: Más fácil agregar throttling a nuevos logs

---

## Riesgos y Mitigaciones

### Riesgo 1: Cambio de comportamiento
**Descripción**: El throttling podría comportarse diferente si hay bugs en la migración

**Mitigación**:
- Probar cada migración individualmente
- Verificar que los logs aparezcan con la misma frecuencia
- Comparar comportamiento antes/después

### Riesgo 2: Claves duplicadas
**Descripción**: Si se usa la clave por defecto (`${system}:${message}`), logs diferentes con el mismo mensaje compartirían throttling

**Mitigación**:
- Si dos logs diferentes deben tener throttling independiente, usar `throttleKey` diferentes
- Revisar que los logs relacionados compartan throttling cuando sea apropiado

### Riesgo 3: Variables usadas para otros propósitos
**Descripción**: Algunas variables podrían usarse también para otras lógicas además de throttling

**Mitigación**:
- Revisar cuidadosamente cada variable antes de eliminarla
- Si se usa para otros propósitos, mantenerla pero eliminar solo la parte de throttling

---

## Orden de Prioridad Sugerido

1. **Alta prioridad**: Logs en loops de animación (más frecuentes)
2. **Media prioridad**: Logs en sistemas que se ejecutan frecuentemente
3. **Baja prioridad**: Logs ocasionales o en sistemas raramente ejecutados

---

## Plan de Implementación Recomendado

### Fase 1: Auditoría (30 min)
1. Buscar todos los throttlings manuales
2. Documentar cada uno con:
   - Ubicación
   - Propósito
   - Intervalo usado
   - Dependencias

### Fase 2: Migración por Archivo (1-2 horas)
1. Empezar por un archivo
2. Migrar todos los throttlings de ese archivo
3. Probar y verificar
4. Pasar al siguiente archivo

### Fase 3: Verificación Final (30 min)
1. Buscar referencias restantes a variables eliminadas
2. Ejecutar linter
3. Pruebas funcionales
4. Verificar que no hay regresiones

---

## Referencias

- **Sistema de throttling integrado**: `frontend/src/debug/logger.js`
- **Ejemplos migrados**: 
  - `frontend/src/terrain/manager.js`
  - `frontend/src/terrain/renderers/particle-renderer.js`
- **Configuración de intervalos**: `frontend/src/config/particle-optimization-config.js` (LOG_INTERVALS)

---

## Notas Adicionales

- Esta migración puede hacerse de forma incremental, archivo por archivo
- No es crítico hacerlo de inmediato, pero mejorará la mantenibilidad del código
- Puede combinarse con otras refactorizaciones menores en los mismos archivos
- Es una buena oportunidad para revisar si algunos logs son realmente necesarios
