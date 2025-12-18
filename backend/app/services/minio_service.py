# Contenu supposé de app/services/minio_service.py

from minio import Minio
from minio.error import S3Error
from datetime import datetime
from io import BytesIO
import json
from collections import defaultdict # NOUVEL IMPORT

MINIO_ENDPOINT = "127.0.0.1:9000"  # Adapter si besoin
MINIO_ACCESS_KEY = "minioadmin"
MINIO_SECRET_KEY = "minioadmin"
MINIO_BUCKET = "road-defects"
MINIO_SECURE = False

def get_minio_client() -> Minio:
    # ... (fonction inchangée)
    """ Initialise et retourne le client MinIO. """
    return Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=MINIO_SECURE
    )

def upload_file_to_minio(client: Minio, file_bytes: bytes, filename: str, content_type: str) -> str:
    # ... (fonction inchangée)
    """ Téléverse un fichier sur MinIO et retourne l'URL d'accès public. """
    try:
        data_stream = BytesIO(file_bytes)
        client.put_object(
            MINIO_BUCKET,
            filename,
            data_stream,
            len(file_bytes),
            content_type=content_type
        )
        
        # Comme le bucket est public (configuration passée), nous générons l'URL d'accès direct
        url = f"http://{MINIO_ENDPOINT}/{MINIO_BUCKET}/{filename}"
        return url
        
    except S3Error as err:
        print(f"Erreur MinIO lors de l'upload: {err}")
        raise

def list_all_results(bucket_name: str = MINIO_BUCKET) -> list:
    # ... (fonction inchangée)
    """ Liste tous les objets dans le bucket MinIO. """
    client = get_minio_client()
    results = []
    
    try:
        objects = client.list_objects(bucket_name, recursive=True)
        
        for obj in objects:
            if obj.is_dir or obj.size == 0:
                continue

            url = f"http://{MINIO_ENDPOINT}/{bucket_name}/{obj.object_name}"
            
            results.append({
                "filename": obj.object_name,
                "size": obj.size,
                "last_modified": obj.last_modified.isoformat() if obj.last_modified else None,
                "url": url,
                "type": "image" if obj.object_name.endswith(".jpg") else "json" if obj.object_name.endswith(".json") else "other"
            })
            
    except S3Error as e:
        print(f"Erreur MinIO lors du listage: {e}")
        return []
        
    return results

# =========================================================================
# === NOUVELLES FONCTIONS POUR LE DASHBOARD ===
# =========================================================================

def get_minio_object_data(client: Minio, filename: str, bucket_name: str = MINIO_BUCKET) -> dict:
    """ Télécharge le contenu d'un objet MinIO et le parse en JSON. """
    try:
        data = client.get_object(bucket_name, filename)
        # Lire les données binaires et les décoder en UTF-8
        json_bytes = data.read()
        return json.loads(json_bytes.decode('utf-8'))
    except S3Error as e:
        print(f"Erreur MinIO lors de la récupération de {filename}: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"Erreur de décodage JSON pour {filename}: {e}")
        return None
    except Exception as e:
        print(f"Erreur inattendue pour {filename}: {e}")
        return None

def aggregate_detection_stats() -> dict:
    """
    Lit tous les fichiers de résultats JSON dans MinIO et agrège les statistiques 
    par classe de défaut.
    """
    client = get_minio_client()
    
    # 1. Lister tous les objets
    all_objects = list_all_results(MINIO_BUCKET)
    
    # 2. Filtrer les fichiers JSON de résultats (ceux créés par l'API)
    json_results_files = [
        obj for obj in all_objects 
        if obj.get("type") == "json" and "results-" in obj.get("filename", "")
    ]
    
    total_analyses = len(json_results_files)
    total_detections = 0
    defect_counts = defaultdict(int)
    
    for obj in json_results_files:
        filename = obj["filename"]
        
        # 3. Récupérer et parser le contenu du fichier JSON
        result_data = get_minio_object_data(client, filename)
        
        if result_data and isinstance(result_data, list):
            # 4. Agréger les données de détection
            for detection in result_data:
                # La structure de detection est supposée être:
                # {"box": [x, y, w, h], "confidence": 0.95, "class": "D10", ...}
                class_name = detection.get("class")
                if class_name:
                    defect_counts[class_name] += 1
                    total_detections += 1

    return {
        "status": "success",
        "total_analyses": total_analyses,
        "total_detections": total_detections,
        "defect_counts": dict(defect_counts)
    }