# 🧑 Descargar Modelo Humano - Guía Rápida

## ⚡ Opción Más Rápida: Mixamo (Adobe) - RECOMENDADO

Mixamo es **gratis** y tiene modelos humanos excelentes con animaciones.

### Pasos:

1. **Ve a Mixamo**: https://www.mixamo.com/
2. **Crea cuenta gratuita** (si no tienes una)
3. **Busca personajes**:
   - En la barra de búsqueda, escribe: `character`
   - O busca modelos específicos como: `Remy`, `YBot`, `Sofia`, `Brian`
4. **Elige un personaje** y haz clic en él
5. **Descarga**:
   - Haz clic en el botón **"Download"** (arriba a la derecha)
   - Selecciona formato: **"glTF"** (no FBX)
   - Opcional: Puedes agregar animaciones si quieres
   - Haz clic en **"Download"**
6. **Guarda el archivo**:
   - El archivo descargado será un `.zip`
   - Extrae el `.zip`
   - Busca el archivo `.glb` dentro
   - Renombra y mueve a: `backend/static/models/characters/humano_test.glb`

### Modelos Recomendados en Mixamo:
- **Remy** - Personaje masculino simple
- **YBot** - Personaje básico con buen rigging
- **Sofia** - Personaje femenino
- **Brian** - Personaje masculino

---

## 📦 Opción 2: Sketchfab

1. **Ve a Sketchfab**: https://sketchfab.com
2. **Busca**: `human character glb free`
3. **Filtra por**:
   - Licencia: **CC0** (dominio público) o **CC-BY** (requiere atribución)
   - Formato: **GLB**
4. **Descarga** el modelo
5. **Guarda como**: `backend/static/models/characters/humano_test.glb`

### Modelo Recomendado:
- **Human Models Set**: https://sketchfab.com/3d-models/human-models-set-malefemale-rigged-7311fcfdc03e4234900eeced42a1e669

---

## 🔧 Después de Descargar

### 1. Verificar que el archivo existe:
```bash
ls -lh backend/static/models/characters/humano_test.glb
```

### 2. Actualizar escala en la BD:
```bash
docker-compose exec backend bash -c "cd /app && python src/database/update_character_scale.py"
```

O manualmente en SQL:
```sql
UPDATE juego_dioses.agrupaciones
SET modelo_3d = jsonb_set(modelo_3d, '{escala}', '1.0'::jsonb)
WHERE tipo = 'biped' AND modelo_3d IS NOT NULL;
```

### 3. Reiniciar backend:
```bash
docker-compose restart backend
```

### 4. Probar en el frontend:
- Abre: http://localhost:8080
- Verifica que el modelo humano se carga correctamente

---

## 💡 Nota Importante

Los modelos humanos generalmente tienen un tamaño de **~1.7 metros** (tamaño humano normal), por lo que la escala debería ser **1.0** en la mayoría de los casos.

Si el modelo se ve muy grande o muy pequeño, ajusta la escala:
- Muy grande: escala `0.5` o `0.8`
- Muy pequeño: escala `1.5` o `2.0`

---

## 🆘 Problemas Comunes

### El modelo no se carga
- Verifica que el archivo existe en `backend/static/models/characters/humano_test.glb`
- Verifica que el formato es `.glb` (no `.gltf` separado)
- Revisa la consola del navegador para ver errores

### El modelo se ve muy grande/pequeño
- Ajusta la escala en la BD (ver arriba)
- Limpia el cache del navegador (Ctrl+Shift+R)

### No encuentro modelos gratuitos
- Mixamo siempre es gratis (solo requiere cuenta)
- Sketchfab tiene muchos modelos CC0 (dominio público)
- Busca "human character glb free" en Google

