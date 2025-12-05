#!/usr/bin/env python3
"""Script para verificar plantillas de árboles"""
from src.database.tree_templates import TREE_TEMPLATES, get_random_tree_template
import random

print("=== Plantillas cargadas ===")
for k, v in TREE_TEMPLATES.items():
    pos = v.get_posiciones_tronco(10, 10)
    print(f"{k}:")
    print(f"  - Grosor: {v.grosor_tronco}x{v.grosor_tronco}")
    print(f"  - Posiciones para centro (10,10): {pos}")
    print(f"  - Cantidad: {len(pos)}")
    print()

print("=== Test get_random_tree_template ===")
random.seed(42)
for i in range(5):
    t = get_random_tree_template()
    pos = t.get_posiciones_tronco(10, 10)
    print(f"{t.nombre}: grosor={t.grosor_tronco}, posiciones={len(pos)}")

