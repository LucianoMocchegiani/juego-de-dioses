# Instrucciones para Descargar un Modelo 3D Más Pequeño

## Problema Actual

El modelo **Fox** que se estaba usando es **demasiado grande** (~154-190 metros), y no se puede reducir la escala correctamente. 

## Solución: Descargar un Modelo Más Pequeño

He actualizado el script `download_test_model.py` para permitir descargar diferentes modelos más pequeños y apropiados.

## Modelos Disponibles

### ⭐ RECOMENDADO para Personajes Humanos

**Modelos Humanos (Descarga Manual):**

1. **Human Models Set - Male/Female (Rigged)** - **MEJOR OPCIÓN**
   - Fuente: Sketchfab
   - URL: https://sketchfab.com/3d-models/human-models-set-malefemale-rigged-7311fcfdc03e4234900eeced42a1e669
   - Tamaño: Tamaño humano normal (~1.7m)
   - Escala sugerida: `1.0`
   - Incluye modelos masculino y femenino con rigging
   - Formato: GLB/GLTF
   - Licencia: Verificar en Sketchfab

2. **Human Base Mesh**
   - Fuente: CGTrader
   - URL: https://www.cgtrader.com/free-3d-models/character/anatomy/human-base-mesh-32b3481f-73d9-4d4b-8c53-3eecc3199aba
   - Tamaño: Tamaño humano normal
   - Escala sugerida: `1.0`
   - Formato: GLTF, OBJ, FBX

3. **Human Body Base Mesh 10 Models**
   - Fuente: Sketchfab
   - URL: https://sketchfab.com/3d-models/human-body-base-mesh-10-models-20k-polygons-0b9c1944e8b248efb868192709b0f6a3
   - Tamaño: Tamaño humano normal
   - Escala sugerida: `1.0`
   - Incluye 10 variantes (hombre, mujer, niño, etc.)

### ✅ Modelos Pequeños para Pruebas

1. **Duck (Pato)** - **RECOMENDADO para pruebas rápidas**
   - Tamaño: ~0.5 metros
   - Escala sugerida: `1.0`
   - Ideal para pruebas rápidas
   - Se descarga automáticamente con el script

2. **Avocado (Aguacate)**
   - Tamaño: ~0.1 metros
   - Escala sugerida: `5.0` (hacer más grande)
   - Muy pequeño y ligero

3. **BarramundiFish (Pez)**
   - Tamaño: ~0.3 metros
   - Escala sugerida: `2.0` (hacer más grande)
   - Pequeño y simple

4. **BrainStem**
   - Tamaño: ~1 metro
   - Escala sugerida: `1.0`
   - Bueno para pruebas básicas

### ❌ NO Recomendado

- **Fox (Zorro)**: ~154 metros - MUY GRANDE, no funciona bien con escalas

## Cómo Descargar un Nuevo Modelo

### ⭐ Opción 1: Descargar Modelo Humano Manualmente (RECOMENDADO)

**Para obtener un modelo humano real:**

1. **Ve a Sketchfab:**
   - URL: https://sketchfab.com/3d-models/human-models-set-malefemale-rigged-7311fcfdc03e4234900eeced42a1e669
   - O busca: "human character glb free" en Sketchfab

2. **Filtra por:**
   - Formato: GLB o GLTF
   - Licencia: CC0 (dominio público) o similar
   - Tamaño: Pequeño/Mediano (para descarga rápida)

3. **Descarga el modelo:**
   - Haz clic en "Download"
   - Selecciona formato GLB si está disponible
   - Guarda el archivo

4. **Guarda el modelo:**
   - Renombra el archivo a: `humano_test.glb`
   - Muévelo a: `backend/static/models/characters/humano_test.glb`

**Alternativas:**
- CGTrader: https://www.cgtrader.com/free-3d-models/character/anatomy
- 3DExport: https://glb-gltf.3dexport.com/es (buscar "human")

### Opción 2: Usar el Script para Modelos Pequeños

```bash
# Desde la raíz del proyecto (juego-de-dioses/)
docker-compose exec backend bash -c "cd /app && python src/database/download_test_model.py duck"
```

O si prefieres ejecutarlo localmente (si tienes Python instalado):

```bash
cd backend
python src/database/download_test_model.py duck
```

**Modelos disponibles con el script:**
- `duck` - Pato pequeño (~0.5m)
- `avocado` - Aguacate muy pequeño (~0.1m)
- `barramundi` - Pez pequeño (~0.3m)
- `brainstem` - Modelo simple (~1m)

### Opción 3: Descargar desde glTF Sample Models

1. Ve a: https://github.com/KhronosGroup/glTF-Sample-Models/tree/master/2.0
2. Elige un modelo pequeño (Duck, Avocado, BarramundiFish, BrainStem)
3. Descarga el archivo `.glb` desde la carpeta `glTF-Binary/`
4. Guárdalo en: `backend/static/models/characters/humano_test.glb`

**Ejemplo para Duck:**
- URL: https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb
- Guardar como: `backend/static/models/characters/humano_test.glb`

## Después de Descargar

### 1. Verificar que el Modelo se Descargó

```bash
# Verificar que existe
ls -lh backend/static/models/characters/humano_test.glb
```

### 2. Actualizar la Escala en la Base de Datos

Si ya tienes un personaje creado con el modelo Fox, actualiza la escala:

```bash
# Ejecutar script de actualización de escala
docker-compose exec backend bash -c "cd /app && python src/database/update_character_scale.py"
```

O manualmente en la BD:

```sql
-- Buscar personaje con modelo_3d
SELECT id, modelo_3d 
FROM juego_dioses.agrupaciones 
WHERE tipo = 'biped' AND modelo_3d IS NOT NULL 
ORDER BY creado_en DESC 
LIMIT 1;

-- Actualizar escala según el modelo:
-- Duck: escala = 1.0
-- Avocado: escala = 5.0
-- BarramundiFish: escala = 2.0
-- BrainStem: escala = 1.0

UPDATE juego_dioses.agrupaciones
SET modelo_3d = jsonb_set(
    modelo_3d, 
    '{escala}', 
    '1.0'::jsonb
)
WHERE id = '<id-del-personaje>';
```

### 3. Crear un Nuevo Personaje con el Modelo

```bash
# Ejecutar script de seed
docker-compose exec backend bash -c "cd /app && python src/database/seed_character_with_model.py"
```

**Nota:** Asegúrate de actualizar la escala en `seed_character_with_model.py` según el modelo que descargaste (línea 71).

## Verificar que Funciona

1. Reiniciar el backend (si es necesario):
   ```bash
   docker-compose restart backend
   ```

2. Abrir el frontend en: http://localhost:8080

3. Verificar en la consola del navegador que el modelo se carga correctamente

4. Verificar que el tamaño del modelo es apropiado (no debería ser gigante)

## Troubleshooting

### El modelo sigue siendo muy grande

- Verifica que descargaste un modelo pequeño (Duck, Avocado, etc.)
- Verifica que la escala en la BD es correcta (1.0 para Duck)
- Limpia el cache del navegador (Ctrl+Shift+R)
- Verifica los logs del backend para ver si hay errores

### El modelo no se carga

- Verifica que el archivo existe en `backend/static/models/characters/humano_test.glb`
- Verifica que el backend está sirviendo archivos estáticos correctamente
- Revisa la consola del navegador para ver errores de carga
- Verifica que la ruta en `modelo_3d` es correcta: `"characters/humano_test.glb"`

### Quiero probar otro modelo

Simplemente descarga otro modelo y guárdalo como `humano_test.glb` (reemplazando el anterior), o modifica el script para usar otro nombre de archivo.

## Referencias

- Repositorio glTF Sample Models: https://github.com/KhronosGroup/glTF-Sample-Models
- Script de descarga: `backend/src/database/download_test_model.py`
- Script de seed: `backend/src/database/seed_character_with_model.py`

