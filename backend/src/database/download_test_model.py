"""
Script para descargar modelos GLB de prueba desde el repositorio de glTF Sample Models

Este script permite descargar diferentes modelos 3D para probar el sistema.
El modelo Fox es muy grande (154m), por lo que se recomienda usar modelos más pequeños.
"""
import urllib.request
import urllib.error
from pathlib import Path
import sys

# Modelos disponibles del repositorio glTF Sample Models y otros repositorios
MODELOS_DISPONIBLES = {
    "humano_simple": {
        "nombre": "Human Simple (Humano Simple) - DESCARGA MANUAL",
        "url": None,  # Requiere descarga manual
        "descripcion": "Modelo de humano simple. Debes descargarlo manualmente desde Sketchfab o similar.",
        "tamaño_aprox": "~1.7 metros (tamaño humano normal)",
        "escala_recomendada": 1.0,
        "instrucciones": "Ver INSTRUCCIONES-DESCARGAR-MODELO.md para enlaces directos"
    },
    "duck": {
        "nombre": "Duck (Pato)",
        "url": "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb",
        "descripcion": "Modelo pequeño de un pato (~0.5m). Ideal para pruebas rápidas.",
        "tamaño_aprox": "~0.5 metros",
        "escala_recomendada": 1.0
    },
    "brainstem": {
        "nombre": "BrainStem",
        "url": "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BrainStem/glTF-Binary/BrainStem.glb",
        "descripcion": "Modelo pequeño y simple (~1m). Bueno para pruebas básicas.",
        "tamaño_aprox": "~1 metro",
        "escala_recomendada": 1.0
    },
    "barramundi": {
        "nombre": "BarramundiFish (Pez)",
        "url": "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BarramundiFish/glTF-Binary/BarramundiFish.glb",
        "descripcion": "Modelo de pez pequeño (~0.3m). Muy pequeño y ligero.",
        "tamaño_aprox": "~0.3 metros",
        "escala_recomendada": 2.0
    },
    "avocado": {
        "nombre": "Avocado (Aguacate)",
        "url": "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Avocado/glTF-Binary/Avocado.glb",
        "descripcion": "Modelo muy pequeño de aguacate (~0.1m). Perfecto para pruebas.",
        "tamaño_aprox": "~0.1 metros",
        "escala_recomendada": 5.0
    },
    "fox": {
        "nombre": "Fox (Zorro) - NO RECOMENDADO",
        "url": "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Fox/glTF-Binary/Fox.glb",
        "descripcion": "Modelo MUY GRANDE (~154m). No recomendado para personajes.",
        "tamaño_aprox": "~154 metros (MUY GRANDE)",
        "escala_recomendada": 0.001
    }
}

def listar_modelos():
    """Listar modelos disponibles"""
    print("\n📋 Modelos disponibles:")
    print("=" * 60)
    for key, modelo in MODELOS_DISPONIBLES.items():
        print(f"\n{key}:")
        print(f"  Nombre: {modelo['nombre']}")
        print(f"  Tamaño aproximado: {modelo['tamaño_aprox']}")
        print(f"  Descripción: {modelo['descripcion']}")
    print("\n" + "=" * 60)

def download_test_model(modelo_key="duck", output_filename="humano_test.glb"):
    """
    Descargar modelo GLB de prueba
    
    Args:
        modelo_key: Clave del modelo a descargar (default: "duck")
        output_filename: Nombre del archivo de salida (default: "humano_test.glb")
    """
    
    if modelo_key not in MODELOS_DISPONIBLES:
        print(f"❌ Modelo '{modelo_key}' no encontrado.")
        print("\nModelos disponibles:")
        for key in MODELOS_DISPONIBLES.keys():
            print(f"  - {key}")
        return False
    
    modelo_info = MODELOS_DISPONIBLES[modelo_key]
    model_url = modelo_info.get("url")
    
    # Verificar si requiere descarga manual
    if model_url is None:
        print(f"\n⚠️  El modelo '{modelo_info['nombre']}' requiere descarga manual.")
        print(f"\n📋 Instrucciones:")
        print(f"   1. Ve a una de estas fuentes:")
        print(f"      - Sketchfab: https://sketchfab.com/3d-models/human-models-set-malefemale-rigged-7311fcfdc03e4234900eeced42a1e669")
        print(f"      - 3DExport: https://glb-gltf.3dexport.com/es")
        print(f"      - CGTrader: https://www.cgtrader.com/free-3d-models/character/anatomy")
        print(f"   2. Busca 'human character glb' o 'humanoid gltf'")
        print(f"   3. Descarga un modelo GLB")
        print(f"   4. Guárdalo como: backend/static/models/characters/{output_filename}")
        print(f"\n💡 Recomendación: Busca modelos con licencia CC0 o similar para uso libre.")
        return False
    
    # Ruta de destino (relativa al directorio del script)
    script_dir = Path(__file__).parent.parent.parent
    output_dir = script_dir / "static" / "models" / "characters"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    output_path = output_dir / output_filename
    
    print(f"\n📥 Descargando modelo: {modelo_info['nombre']}")
    print(f"   Tamaño aproximado: {modelo_info['tamaño_aprox']}")
    print(f"   URL: {model_url}")
    print(f"   Guardando en: {output_path}")
    
    try:
        # Descargar modelo usando urllib
        print("\n⏳ Descargando... (esto puede tomar unos segundos)")
        urllib.request.urlretrieve(model_url, output_path)
        
        file_size = output_path.stat().st_size
        print(f"\n✓ Modelo descargado exitosamente!")
        print(f"  Tamaño del archivo: {file_size / 1024:.2f} KB")
        print(f"  Ruta completa: {output_path.absolute()}")
        print(f"\n💡 Nota: Este es el modelo '{modelo_info['nombre']}' de glTF Sample Models.")
        print(f"   {modelo_info['descripcion']}")
        print(f"\n📝 Para usar este modelo, actualiza la escala en la BD:")
        print(f"   - Humano Simple: escala {modelo_info.get('escala_recomendada', 1.0)} (tamaño humano normal)")
        print(f"   - Duck: escala 1.0 (tamaño normal)")
        print(f"   - BrainStem: escala 1.0")
        print(f"   - BarramundiFish: escala 2.0 (hacer más grande)")
        print(f"   - Avocado: escala 5.0 (hacer más grande)")
        print(f"   - Fox: escala 0.001 (MUY pequeño, no recomendado)")
        
        return True
        
    except urllib.error.URLError as e:
        print(f"\n❌ Error descargando modelo: {e}")
        print(f"\n💡 Alternativa: Puedes descargar manualmente un modelo GLB y")
        print(f"   guardarlo en: {output_path.absolute()}")
        return False
    except Exception as e:
        print(f"\n❌ Error inesperado: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    # Si se pasa un argumento, usarlo como modelo
    if len(sys.argv) > 1:
        modelo_key = sys.argv[1].lower()
        output_filename = sys.argv[2] if len(sys.argv) > 2 else "humano_test.glb"
        download_test_model(modelo_key, output_filename)
    else:
        # Mostrar lista y pedir selección
        listar_modelos()
        print("\n💡 Uso:")
        print("   python download_test_model.py <modelo_key> [output_filename]")
        print("\n   Ejemplos:")
        print("   python download_test_model.py humano_simple  # ⭐ RECOMENDADO para personajes")
        print("   python download_test_model.py duck")
        print("   python download_test_model.py avocado humano_test.glb")
        print("   python download_test_model.py brainstem")
        print("\n   Por defecto se descarga 'humano_simple' si no se especifica.")
        print("\n⏳ Descargando modelo por defecto (humano_simple)...")
        download_test_model("humano_simple", "humano_test.glb")

