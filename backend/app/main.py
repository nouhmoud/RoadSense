from fastapi import FastAPI, File, UploadFile, HTTPException, Response, Depends # Ajout de Depends
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
from app.services.minio_service import get_minio_client, upload_file_to_minio, list_all_results, aggregate_detection_stats 

# =========================================================================
# === IMPORTS DU SERVICE GEOREF (Final) ===
# =========================================================================
from app.schemas.georef_schema import GeorefRequest, GeorefResponse, GeoreferencedAnomaly
from app.services.georef_service import perform_georeferencing, get_all_georeferenced_anomalies # Import confirmé
from app.db.db_config import init_db, get_db # Import de la configuration DB
from sqlalchemy.orm import Session # Import de Session pour l'injection de dépendance
# =========================================================================


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
    title="Road Defect Detection API (YOLOv8)",
    description="API pour la détection de défauts routiers et le stockage sur MinIO. Intègre le service de géoréférencement (GeoRef) avec PostGIS.",
    version="1.2.0" # Version mise à jour
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

# --- 5. ENDPOINT : STATISTIQUES DU TABLEAU DE BORD (ACTIVÉ) ---
# --- 5. ENDPOINT : STATISTIQUES DU TABLEAU DE BORD (SQL) ---
from app.services.dashboard_service import get_aggregated_stats

@app.get("/dashboard-stats", summary="Récupère les statistiques agrégées (SQL)")
async def get_dashboard_statistics(
    db: Session = Depends(get_db)
):
    """
    Retourne les KPIS et données de graphiques depuis PostGIS.
    """
    try:
        stats = get_aggregated_stats(db)
        return stats
    except Exception as e:
        print(f"Erreur stats dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
# =========================================================================
# === 6. ENDPOINT : GÉORÉFÉRENCEMENT (POST /georef) (CORRIGÉ) ===
# =========================================================================

@app.post(
    "/georef", 
    summary="Géoréférencer les défauts détectés et les stocker dans PostGIS",
    response_model=GeorefResponse
)
async def georeference_anomalies(
    request: GeorefRequest,
    db: Session = Depends(get_db) # <--- INJECTION DE DÉPENDANCE POSTGIS
):
    """
    Associe les défauts (détections) et les coordonnées GPS à un tronçon routier 
    (Map-Matching) et stocke le résultat dans PostGIS.
    """
    
    if not request.detections:
        return GeorefResponse(
            processed_detections_count=0, 
            anomalies=[], 
            message="Aucune détection fournie pour le géoréférencement."
        )

    try:
        # APPEL AU VRAI SERVICE DE GÉORÉFÉRENCEMENT
        anomalies_list = perform_georeferencing(db, request.gps_data, request.detections)
        
        return GeorefResponse(
            processed_detections_count=len(anomalies_list),
            anomalies=anomalies_list,
            message=f"{len(anomalies_list)} détections géoréférencées et stockées dans PostGIS."
        )

    except Exception as e:
        # Cette erreur inclura toute erreur de Map-Matching, de PostGIS, ou de librairies géo-spatiales.
        raise HTTPException(status_code=500, detail=f"Erreur de géoréférencement interne: {e}")


@app.get(
    "/georef/history",
    summary="Récupérer l'historique complet des anomalies géoréférencées (PostGIS)",
    response_model=List[Dict[str, Any]]
)
async def get_georef_history(
    db: Session = Depends(get_db)
):
    """
    Retourne la liste de toutes les anomalies stockées dans PostGIS avec leurs coordonnées lat/lon.
    """
    return get_all_georeferenced_anomalies(db)


# =========================================================================
# === 7. ENDPOINT : CALCUL DE GRAVITÉ (POST /severity/compute) ===
# =========================================================================
from app.services.severity_service import calculate_severity_score

@app.post(
    "/severity/compute",
    summary="Calculer le score de gravité pour des détections",
    response_model=List[Dict[str, Any]]
)
async def compute_severity(
    detections: List[Dict[str, Any]]
):
    """
    Calcule la gravité (Score 0-100 et Niveau) pour une liste de détections.
    Utilise le service SeverityService (XGBoost/Heuristique).
    """
    try:
        results = calculate_severity_score(detections)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de calcul de gravité: {e}")

# --- Chargement du modèle au démarrage ---
@app.on_event("startup")
async def startup_event():
    """ Charge le modèle YOLOv8 et initialise PostGIS au démarrage. """
    try:
        load_yolo_model()
        init_db() # <--- INITIALISATION DE POSTGIS
    except Exception as e:
        print(f"ÉCHEC CRITIQUE: Le modèle n'a pas pu être chargé ou l'initialisation de PostGIS a échoué. {e}")