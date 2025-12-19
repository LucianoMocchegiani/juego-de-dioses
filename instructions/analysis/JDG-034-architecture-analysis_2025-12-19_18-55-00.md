# Análisis de Arquitectura - Refactorización de Scripts de Seed de Terrenos (JDG-034)

## Situación Actual

### Backend

**Estructura actual:**
```
backend/src/database/
├── seed_demo.py                    # Bioma bosque con acuífero y muchos árboles
├── seed_terrain_test_2.py          # Terreno simple con lago, montaña y pocos árboles
├── seed_biped_structure.py         # Script de migración de rutas
└── seed_character_with_model.py    # Script manual para crear personajes
```

**Problemas identificados:**

1. **Nomenclatura inconsistente**: 
   - `seed_demo.py` tiene nombre genérico que no indica su propósito específico (bosque con acuífero)
   - `seed_terrain_test_2.py` existe pero tiene función `seed_human_test()` (nombre inconsistente)
   - No hay una convención clara de nomenclatura para scripts de seed

2. **Confusión sobre qué script crea qué dimensión**:
   - Ambos scripts crean dimensiones con el mismo nombre: "Terreno de Prueba - Primer Humano"
   - Esto causa conflictos y confusión sobre cuál script se debe usar
   - El frontend espera una dimensión específica pero no hay claridad sobre cuál script la crea

3. **Referencias dispersas**:
   - `main.py` importa `seed_demo` pero debería importar el script correcto según configuración
   - `seed_character_with_model.py` hace referencia a `seed_demo.py` pero debería referenciar el script activo
   - Documentación en múltiples lugares menciona scripts con nombres antiguos

4. **Falta de claridad sobre propósito**:
   - `seed_demo.py` crea un bosque denso (muchos árboles) con acuífero
   - `seed_terrain_test_2.py` crea un terreno simple (lago, montaña, 3-5 árboles)
   - No está claro cuál es el "demo" principal que se debe usar

### Frontend

**Estructura actual:**
```
frontend/src/
├── constants.js                    # Define DEMO_DIMENSION_NAME
└── app.js                          # Carga dimensión por nombre
```

**Problemas identificados:**

1. **Constante hardcodeada**:
   - `DEMO_DIMENSION_NAME` está hardcodeada como "Terreno de Prueba - Primer Humano"
   - No hay forma de cambiar fácilmente qué terreno cargar sin modificar código
   - No distingue entre los dos tipos de terrenos disponibles

### Base de Datos

**Estructura actual:**
```
juego_dioses.dimensiones
├── nombre: "Terreno de Prueba - Primer Humano"  # Usado por ambos scripts
└── ...
```

**Problemas identificados:**

1. **Nombres de dimensiones duplicados**:
   - Ambos scripts intentan crear dimensiones con el mismo nombre
   - Esto causa conflictos y requiere borrado manual antes de recrear
   - No hay forma de tener ambos terrenos disponibles simultáneamente

## Necesidades Futuras

### Categorías de Terrenos de Prueba

1. **Terreno Test 1 - Bosque Denso** (actual `seed_demo.py`):
   - Características: Acuífero subterráneo, muchos árboles (bosque denso)
   - Uso: Testing de sistemas complejos, renderizado de muchos objetos
   - Nombre dimensión propuesto: "Terreno Test 1 - Bosque Denso"

2. **Terreno Test 2 - Lago y Montaña** (actual `seed_terrain_test_2.py`):
   - Características: Lago, montaña pequeña, 3-5 árboles
   - Uso: Testing básico, creación de personajes, pruebas de interacción
   - Nombre dimensión propuesto: "Terreno Test 2 - Lago y Montaña"
   - **Este será el terreno por defecto usado por el frontend**

### Requisitos de Escalabilidad

1. **Fácil agregar nuevos terrenos**: Sistema de nomenclatura clara (`seed_terrain_test_N.py`)
2. **Separación clara de propósitos**: Cada script tiene un nombre descriptivo
3. **Configuración centralizada**: Un lugar para definir qué terreno usar por defecto
4. **Compatibilidad**: Mantener funcionalidad existente mientras se refactoriza
5. **Documentación**: Actualizar todas las referencias para evitar inconsistencias

## Arquitectura Propuesta

### Backend - Estructura Modular

```
backend/src/database/
├── seed_terrain_test_1.py          # Bosque denso con acuífero (antes seed_demo.py)
│   └── seed_terrain_test_1()       # Función renombrada
├── seed_terrain_test_2.py          # Lago, montaña, pocos árboles (ya existe)
│   └── seed_terrain_test_2()       # Función renombrada desde seed_human_test()
├── seed_biped_structure.py         # Sin cambios
└── seed_character_with_model.py    # Actualizar referencias
```

**Configuración en `main.py`:**
```python
# Definir qué terreno usar por defecto
DEFAULT_TERRAIN_SEED = 'seed_terrain_test_2'  # Terreno simple con lago/montaña

# En lifespan:
from src.database.seed_terrain_test_2 import seed_terrain_test_2
await seed_terrain_test_2()
```

### Convención de Nombres

**Scripts:**
- `seed_terrain_test_N.py` donde N es un número secuencial
- Función: `seed_terrain_test_N()` que coincide con el nombre del archivo

**Dimensiones:**
- "Terreno Test 1 - Bosque Denso" (para `seed_terrain_test_1`)
- "Terreno Test 2 - Lago y Montaña" (para `seed_terrain_test_2`)

**Frontend:**
- Actualizar `DEMO_DIMENSION_NAME` para usar "Terreno Test 2 - Lago y Montaña"

## Patrones de Diseño a Usar

### 1. Naming Convention Pattern
- **Descripción**: Convención de nombres consistente y descriptiva
- **Cómo se aplica**: Todos los scripts de seed de terrenos siguen el patrón `seed_terrain_test_N.py`
- **Beneficios**: Fácil descubrimiento, claridad de propósito, escalabilidad

### 2. Configuration Pattern
- **Descripción**: Centralizar configuración en un lugar accesible
- **Cómo se aplica**: `DEFAULT_TERRAIN_SEED` en `main.py` define qué terreno usar
- **Beneficios**: Fácil cambiar terreno por defecto sin buscar referencias dispersas

## Beneficios de la Nueva Arquitectura

1. **Claridad**: Nombres descriptivos indican exactamente qué hace cada script
2. **Escalabilidad**: Fácil agregar `seed_terrain_test_3.py`, `seed_terrain_test_4.py`, etc.
3. **Mantenibilidad**: Referencias actualizadas y documentación consistente
4. **Flexibilidad**: Pueden existir múltiples terrenos simultáneamente sin conflictos
5. **Configurabilidad**: Fácil cambiar qué terreno usar por defecto

## Migración Propuesta

### Fase 1: Renombrar Scripts y Funciones

1. **Renombrar `seed_demo.py` → `seed_terrain_test_1.py`**:
   - Renombrar archivo
   - Renombrar función `seed_demo()` → `seed_terrain_test_1()`
   - Cambiar nombre de dimensión a "Terreno Test 1 - Bosque Denso"

2. **Actualizar `seed_terrain_test_2.py`**:
   - Renombrar función `seed_human_test()` → `seed_terrain_test_2()`
   - Cambiar nombre de dimensión a "Terreno Test 2 - Lago y Montaña"
   - Actualizar docstring

### Fase 2: Actualizar Referencias

3. **Actualizar `main.py`**:
   - Cambiar import de `seed_demo` a `seed_terrain_test_2`
   - Actualizar nombre de dimensión en query a "Terreno Test 2 - Lago y Montaña"

4. **Actualizar `seed_character_with_model.py`**:
   - Cambiar referencia de `seed_demo.py` a script apropiado
   - Actualizar mensajes de error

5. **Actualizar `frontend/src/constants.js`**:
   - Cambiar `DEMO_DIMENSION_NAME` a "Terreno Test 2 - Lago y Montaña"

### Fase 3: Actualizar Documentación

6. **Actualizar READMEs**:
   - `backend/src/database/README.md`: Actualizar sección de Seed Demo
   - `README.md` (root): Actualizar comandos de ejecución
   - Cualquier otra documentación que mencione `seed_demo`

7. **Verificar consistencia**:
   - Buscar todas las referencias a nombres antiguos
   - Actualizar instrucciones, PRs, y documentación relacionada

## Consideraciones Técnicas

### Backend

1. **Compatibilidad**: 
   - Mantener funcionalidad existente durante migración
   - Ambos scripts deben poder ejecutarse independientemente

2. **Base de datos**:
   - Cambiar nombres de dimensiones evitará conflictos
   - Scripts idempotentes deben verificar y eliminar dimensiones antiguas si existen

3. **Testing**:
   - Verificar que ambos scripts se ejecutan correctamente
   - Verificar que dimensiones se crean con nombres correctos
   - Verificar que frontend carga el terreno correcto

### Frontend

1. **Renderizado**:
   - Verificar que el nuevo nombre de dimensión se carga correctamente
   - No debería requerir cambios en lógica de renderizado

2. **Configuración**:
   - Constante `DEMO_DIMENSION_NAME` debe coincidir con nombre en BD
   - Considerar hacer esto configurable en el futuro

## Ejemplo de Uso Futuro

```python
# main.py
from src.database.seed_terrain_test_2 import seed_terrain_test_2

async with get_connection() as conn:
    demo_exists = await conn.fetchval(
        "SELECT EXISTS(SELECT 1 FROM juego_dioses.dimensiones WHERE nombre = 'Terreno Test 2 - Lago y Montaña')"
    )
    if not demo_exists:
        print("Dimensión demo no encontrada. Ejecutando seed terrain test 2...")
        await seed_terrain_test_2()
```

```javascript
// frontend/src/constants.js
export const DEMO_DIMENSION_NAME = 'Terreno Test 2 - Lago y Montaña';
```

## Conclusión

La refactorización propuesta establece una nomenclatura clara y consistente para los scripts de seed de terrenos, eliminando ambigüedades sobre qué script crea qué dimensión. El cambio principal es:

- `seed_demo.py` → `seed_terrain_test_1.py` (bosque denso)
- `seed_terrain_test_2.py` (lago y montaña) - ya existe, solo renombrar función
- Terreno Test 2 será el por defecto usado por el frontend

Esto prepara el sistema para escalar agregando más terrenos de prueba en el futuro (`seed_terrain_test_3.py`, etc.) mientras mantiene claridad sobre el propósito de cada uno.