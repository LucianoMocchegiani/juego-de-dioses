# Relación Partículas - Metros

## Conceptos Fundamentales

**IMPORTANTE:** En el sistema, las celdas son partículas, no metros. Cada partícula ocupa un espacio físico en el mundo.

## Tamaño de Partícula

- **Tamaño de celda por defecto**: `0.25 metros` (25 centímetros)
- **Área de una partícula**: `0.25m × 0.25m = 0.0625 m²`

## Conversiones

### Lineal (1 dimensión)

- **1 metro = 4 partículas** (1m ÷ 0.25m = 4)
- **1 partícula = 0.25 metros** (25 centímetros)

**Ejemplos:**
- 4 partículas en línea = 1 metro
- 8 partículas en línea = 2 metros
- 16 partículas en línea = 4 metros

### Área (2 dimensiones)

- **1 metro cuadrado = 16 partículas** (4×4 partículas)
- **4 partículas (2×2) = 0.25 m²** (0.5m × 0.5m)
- **9 partículas (3×3) = 0.5625 m²** (0.75m × 0.75m)
- **16 partículas (4×4) = 1 m²** (1m × 1m)

**Ejemplos:**
- 4 partículas (2×2) = 0.5m × 0.5m = 0.25 m²
- 9 partículas (3×3) = 0.75m × 0.75m = 0.5625 m²
- 16 partículas (4×4) = 1m × 1m = 1 m²
- 25 partículas (5×5) = 1.25m × 1.25m = 1.5625 m²

### Volumen (3 dimensiones)

- **1 metro cúbico = 64 partículas** (4×4×4 partículas)
- **8 partículas (2×2×2) = 0.125 m³** (0.5m × 0.5m × 0.5m)
- **27 partículas (3×3×3) = 0.421875 m³** (0.75m × 0.75m × 0.75m)
- **64 partículas (4×4×4) = 1 m³** (1m × 1m × 1m)

## Reglas para Construcción

### Árboles

- **Mínimo**: 4 partículas (2×2) = 0.5m × 0.5m
  - Los árboles NO pueden ser del grosor de una sola partícula
  - El mínimo realista es 2×2 partículas (4 partículas)
  
- **Pequeños**: 4 partículas (2×2) = 0.5m × 0.5m
- **Medianos**: 4-9 partículas (2×2 o 3×3) = 0.5m-0.75m
- **Grandes**: 9-16 partículas (3×3 o 4×4) = 0.75m-1m
- **Muy grandes**: 16+ partículas (4×4 o más) = 1m+ de grosor

### Plantas Pequeñas

- **Pueden ser menos de 4 partículas** (1×1 o 1×2)
- Ejemplos: hierba, flores, arbustos pequeños
- 1 partícula = 0.25m × 0.25m (aceptable para plantas muy pequeñas)

## Ejemplos Prácticos

### Terreno de 40m × 40m

- **En partículas**: 160 × 160 partículas
- **Cálculo**: 40m ÷ 0.25m = 160 partículas por lado
- **Total de partículas en superficie**: 160 × 160 = 25,600 partículas

### Árbol Pequeño

- **Grosor tronco**: 2×2 = 4 partículas = 0.5m × 0.5m
- **Área del tronco**: 0.25 m²

### Árbol Muy Grande

- **Grosor tronco**: 4×4 = 16 partículas = 1m × 1m
- **Área del tronco**: 1 m²

## Fórmulas Útiles

```python
# Convertir metros a partículas (lineal)
particulas = metros / 0.25

# Convertir partículas a metros (lineal)
metros = particulas * 0.25

# Convertir metros cuadrados a partículas (área)
particulas_por_lado = (metros_cuadrados ** 0.5) / 0.25
particulas_totales = particulas_por_lado ** 2

# Convertir partículas a metros cuadrados (área)
metros_por_lado = particulas_por_lado * 0.25
metros_cuadrados = metros_por_lado ** 2
```

## Notas Importantes

1. **Las celdas son partículas**: No confundir con metros. Cada celda es una partícula física.
2. **Mínimo para árboles**: 4 partículas (2×2). No usar 1 partícula para troncos de árboles.
3. **Plantas pequeñas**: Pueden usar menos de 4 partículas si es apropiado.
4. **Escalabilidad**: Los árboles más grandes deben tener troncos proporcionalmente más gruesos.

## Referencias en el Código

- `DEFAULT_CELL_SIZE = 0.25` (frontend/src/constants.js)
- `tamano_celda DECIMAL(5,2) DEFAULT 0.25` (database/init/01-init-schema.sql)
- `grosor_tronco` en `TreeTemplate` (backend/src/database/tree_templates.py)

