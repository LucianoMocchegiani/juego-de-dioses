"""
Script para descargar modelos humanos desde diferentes fuentes

Este script intenta descargar modelos humanos desde varias fuentes públicas.
Si no encuentra URLs directas, proporciona instrucciones claras.
"""
import urllib.request
import urllib.error
from pathlib import Path
import sys

# Fuentes de modelos humanos (algunas requieren descarga manual)
FUENTES_HUMANOS = {
    "mixamo": {
        "nombre": "Mixamo (Adobe) - RECOMENDADO",
        "url_base": "https://www.mixamo.com/",
        "descripcion": "Modelos humanos gratuitos con animaciones. Requiere cuenta gratuita.",
        "instrucciones": [
            "1. Ve a https://www.mixamo.com/",
            "2. Crea una cuenta gratuita (si no tienes)",
            "3. Busca 'character' en la búsqueda",
            "4. Elige un personaje (ej: 'Remy', 'YBot', 'Sofia')",
            "5. Haz clic en 'Download'",
            "6. Selecciona formato: 'glTF' o 'FBX'",
            "7. Descarga y guarda como: backend/static/models/characters/humano_test.glb"
        ],
        "url_directa": None  # No hay URLs directas públicas
    },
    "sketchfab": {
        "nombre": "Sketchfab",
        "url_base": "https://sketchfab.com/3d-models/human-models-set-malefemale-rigged-7311fcfdc03e4234900eeced42a1e669",
        "descripcion": "Modelos humanos con rigging. Algunos son gratuitos.",
        "instrucciones": [
            "1. Ve a Sketchfab y busca 'human character glb free'",
            "2. Filtra por licencia: CC0 (dominio público)",
            "3. Descarga el modelo GLB",
            "4. Guarda como: backend/static/models/characters/humano_test.glb"
        ],
        "url_directa": None
    }
}

def mostrar_instrucciones():
    """Mostrar instrucciones para descargar modelos humanos"""
    print("\n" + "="*70)
    print("📋 INSTRUCCIONES PARA DESCARGAR MODELO HUMANO")
    print("="*70)
    
    for key, fuente in FUENTES_HUMANOS.items():
        print(f"\n🔹 {fuente['nombre']}")
        print(f"   {fuente['descripcion']}")
        print(f"   URL: {fuente['url_base']}")
        print(f"\n   Pasos:")
        for paso in fuente['instrucciones']:
            print(f"   {paso}")
    
    print("\n" + "="*70)
    print("💡 RECOMENDACIÓN: Usa Mixamo (Adobe) - Es gratis y tiene modelos excelentes")
    print("="*70 + "\n")

def intentar_descargar_desde_alternativas():
    """Intentar descargar desde fuentes alternativas si están disponibles"""
    script_dir = Path(__file__).parent.parent.parent
    output_dir = script_dir / "static" / "models" / "characters"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "humano_test.glb"
    
    # URLs alternativas para probar (si existen modelos públicos)
    urls_alternativas = [
        # Nota: Estas URLs pueden no existir, pero las intentamos
        # "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Xbot.glb",
    ]
    
    print("\n🔍 Intentando descargar desde fuentes alternativas...\n")
    
    for url in urls_alternativas:
        try:
            print(f"Intentando: {url}")
            urllib.request.urlretrieve(url, output_path)
            file_size = output_path.stat().st_size
            print(f"✓ Modelo descargado exitosamente!")
            print(f"  Tamaño: {file_size / 1024:.2f} KB")
            return True
        except Exception as e:
            print(f"  ❌ No disponible: {e}")
            continue
    
    return False

def main():
    """Función principal"""
    print("\n" + "="*70)
    print("🤖 DESCARGADOR DE MODELOS HUMANOS")
    print("="*70)
    
    # Intentar descargar desde alternativas
    if intentar_descargar_desde_alternativas():
        print("\n✅ Modelo descargado exitosamente!")
        print("   Archivo: backend/static/models/characters/humano_test.glb")
        print("\n📝 Próximos pasos:")
        print("   1. Verifica que el modelo se ve correctamente")
        print("   2. Actualiza la escala en la BD si es necesario:")
        print("      docker-compose exec backend python src/database/update_character_scale.py")
        return
    
    # Si no se pudo descargar automáticamente, mostrar instrucciones
    print("\n⚠️  No se encontraron URLs directas para descargar modelos humanos automáticamente.")
    print("   Los modelos humanos generalmente están en plataformas que requieren descarga manual.\n")
    
    mostrar_instrucciones()
    
    print("\n💡 ALTERNATIVA RÁPIDA:")
    print("   Puedes usar temporalmente el modelo 'Duck' que ya descargamos.")
    print("   Es pequeño y funciona bien para pruebas mientras consigues un modelo humano.\n")

if __name__ == "__main__":
    main()

