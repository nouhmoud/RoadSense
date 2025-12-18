from fastapi import FastAPI, File, UploadFile, HTTPException, Response
from starlette.middleware.cors import CORSMiddleware
import io
import json 
import base64 
import time 
import re 
from typing import List, Dict, Any 

# Imports ABSOLUS 
from app.services.detection_service import perform_detection, load_yolo_model
from app.schemas.detection_schema import DetectionResponse, HealthCheck

# Imports MINIO 
from minio.error import S3Error
from app.services.minio_service import get_minio_client, upload_file_to_minio, list_all_results


# --- FONCTION UTILITAIRE : Nettoyage du nom de fichier ---
def sanitize_filename(filename: str) -> str:
    """ Nettoie le nom de fichier pour un usage sûr dans MinIO (S3). """
    # Enlever l'extension
    base_name = filename.rsplit('.', 1)[0]
    # Remplacer les caractères non alphanumériques (sauf les tirets et les points) par un tiret
    sanitized = re.sub(r'[^\w.-]', '-', base_name)
    # Remplacer les tirets multiples par un seul
    sanitized = re.sub(r'-+', '-', sanitized).strip('-')
    return sanitized if sanitized else "unknown"

# --- Configuration de l'Application ---
app = FastAPI(
    title="Detection Service",
    description="Microservice for YOLOv8 detection and MinIO storage.",
    version="1.3.0"
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 1. Health Check Endpoint ---
@app.get("/health", response_model=HealthCheck, summary="Vérification de l'état du service")
async def health_check():
    """ Vérifie l'état de l'API et le chargement du modèle. """
    model_is_loaded = load_yolo_model() is not None
    return {"status": "ok", "model_loaded": model_is_loaded}


# --- 2. Détection Endpoint (Réponse JSON + Sauvegarde MinIO) ---
@app.post(
    "/detect", 
    summary="Détecter les défauts, retourner les résultats JSON avec Base64, et sauvegarder sur MinIO",
    response_model=DetectionResponse
)
async def detect_and_annotate(
    file: UploadFile = File(...)
):
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="L'image est vide.")

    try:
        # Exécution de la détection (retourne les résultats JSON et l'image annotée en bytes)
        json_results, annotated_image_bytes = perform_detection(image_bytes)
        
        # Encodage de l'image annotée en Base64 pour la réponse JSON (affichage Front-end)
        annotated_image_b64 = base64.b64encode(annotated_image_bytes).decode('utf-8')
        
        # --- LOGIQUE MINIO : Sauvegarde des données ---
        minio_client = get_minio_client()
        timestamp = int(time.time())
        
        # 1. Nettoyage du nom de fichier original pour la sauvegarde
        original_filename_base = sanitize_filename(file.filename or "uploaded_image")
        
        # 2. Sauvegarde de l'image annotée (Format JPG)
        minio_image_filename = f"{original_filename_base}-annotated-{timestamp}.jpg"
        minio_image_url = upload_file_to_minio(
            minio_client,
            annotated_image_bytes,
            minio_image_filename,
            content_type="image/jpeg"
        )
        
        # 3. Sauvegarde des résultats JSON (Format JSON pour l'historique)
        json_data_bytes = json.dumps(json_results, indent=2).encode('utf-8') 
        minio_json_filename = f"{original_filename_base}-results-{timestamp}.json"
        upload_file_to_minio(
            minio_client,
            json_data_bytes,
            minio_json_filename,
            content_type="application/json"
        )
        # --- FIN LOGIQUE MINIO ---
        
        response_data = DetectionResponse(
            filename=file.filename or "uploaded_image",
            detections=json_results,
            detection_count=len(json_results),
            annotated_image_b64=annotated_image_b64, 
            minio_image_url=minio_image_url, 
        )
        
        return response_data

    except S3Error as e:
        raise HTTPException(status_code=500, detail=f"Erreur MinIO: {e.code}. Assurez-vous que MinIO est en cours d'exécution.")
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de traitement interne: {e}")

# --- 3. Endpoint pour l'Image Annotée (Réponse Image) ---
@app.post(
    "/detect/image", 
    summary="Détecter les défauts et retourner l'image annotée",
    response_class=Response
)
async def detect_and_return_image(
    file: UploadFile = File(...)
):
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="L'image est vide.")

    try:
        # Exécution de la détection (on ignore le JSON)
        _, annotated_image_bytes = perform_detection(image_bytes)
        
        # Retourne l'image annotée en tant que réponse binaire
        return Response(content=annotated_image_bytes, media_type="image/jpeg")

    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de traitement interne: {e}")

# --- 4. Endpoint : LISTE DES RÉSULTATS (Historique) ---
@app.get("/results", summary="Récupère la liste de tous les résultats stockés dans MinIO")
async def get_all_detection_results():
    """
    Appelle le service MinIO pour lister tous les fichiers (images et JSON)
    stockés dans le bucket 'road-defects'.
    """
    data = list_all_results()
    
    # On filtre pour ne retourner que les images annotées (fichiers JPG)
    image_results = [item for item in data if item["type"] == "image"]
    
    return {"status": "success", "count": len(image_results), "results": image_results}

# --- Chargement du modèle au démarrage ---
@app.on_event("startup")
async def startup_event():
    """ Charge le modèle YOLOv8 au démarrage. """
    try:
        load_yolo_model()
    except Exception as e:
        print(f"ÉCHEC CRITIQUE: Le modèle n'a pas pu être chargé. {e}")