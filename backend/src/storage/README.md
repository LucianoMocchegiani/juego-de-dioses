# Sistema de Almacenamiento de Modelos 3D

Este módulo proporciona un sistema flexible para almacenar modelos 3D usando Strategy pattern, permitiendo cambiar fácilmente entre diferentes backends de almacenamiento (local, S3, etc.) sin modificar el código de negocio.

## Estructura

```
storage/
├── __init__.py              # Exports principales
├── storage_interface.py      # Interface BaseStorage
├── local_file_storage.py     # Implementación local
└── README.md                # Este archivo
```

## Componentes

### BaseStorage (Interface)

Interface abstracta que define los métodos necesarios para cualquier sistema de almacenamiento:

- `save_model(file_content, file_path)`: Guardar modelo
- `get_model_url(file_path)`: Obtener URL del modelo
- `model_exists(file_path)`: Verificar si existe
- `delete_model(file_path)`: Eliminar modelo

### LocalFileStorage

Implementación para almacenamiento local en sistema de archivos:

- Almacena modelos en `static/models/` (configurable)
- Valida rutas para prevenir path traversal
- Crea directorios automáticamente si no existen

## Uso

```python
from src.storage import LocalFileStorage

# Crear instancia
storage = LocalFileStorage(base_path="static/models")

# Guardar modelo
ruta = await storage.save_model(file_content, "characters/humano.glb")

# Verificar si existe
existe = await storage.model_exists("characters/humano.glb")

# Obtener URL
url = await storage.get_model_url("characters/humano.glb")
# Retorna: "/static/models/characters/humano.glb"
```

## Migración a S3

Para migrar a S3, simplemente crear una nueva implementación:

```python
# storage/s3_storage.py
class S3Storage(BaseStorage):
    def __init__(self, bucket_name: str, region: str):
        self.bucket = boto3.resource('s3').Bucket(bucket_name)
        self.region = region
    
    async def save_model(self, file_content: bytes, file_path: str) -> str:
        self.bucket.put_object(Key=file_path, Body=file_content)
        return file_path
    
    async def get_model_url(self, file_path: str) -> str:
        return f"https://{self.bucket.name}.s3.{self.region}.amazonaws.com/{file_path}"
    
    # ... otros métodos
```

Y cambiar solo la instanciación:

```python
# Antes
storage = LocalFileStorage()

# Después
storage = S3Storage(bucket_name="models", region="us-east-1")
```

El resto del código no necesita cambios.

## Seguridad

- **Validación de rutas**: Previene path traversal (`..`)
- **Rutas relativas**: Solo acepta rutas relativas, no absolutas
- **Validación de tipos**: Validar tipos de archivo en capa superior

## Estructura de Directorios

```
static/models/
├── characters/
│   ├── humano.glb
│   ├── humano_v2.glb
│   └── elfo.glb
└── objects/
    └── ...
```

## Referencias

- Strategy Pattern: https://refactoring.guru/design-patterns/strategy
- FastAPI Static Files: https://fastapi.tiangolo.com/tutorial/static-files/

