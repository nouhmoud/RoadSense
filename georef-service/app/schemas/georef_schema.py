# app/schemas/georef_schema.py

from pydantic import BaseModel, Field
from typing import List, Dict, Any

# --- Schéma d'Entrée : Les données GPS et les détections brutes ---
# L'entrée est le résultat de l'analyse YOLO (fissures) PLUS la position GPS de l'image.

class GpsCoordinates(BaseModel):
    """ Coordonnées GPS de l'image analysée. """
    latitude: float = Field(..., description="Latitude WGS84 de l'emplacement de la photo.")
    longitude: float = Field(..., description="Longitude WGS84 de l'emplacement de la photo.")
    
class DetectionResult(BaseModel):
    """ Représente une détection individuelle telle que retournée par YOLOv8. """
    box: List[int] = Field(..., description="Coordonnées de la boîte englobante (bounding box).")
    confidence: float = Field(..., description="Score de confiance de la détection.")
    class_name: str = Field(..., description="Nom de la classe du défaut (ex: D00, D10).")

class GeorefRequest(BaseModel):
    """ Corps de la requête POST /georef. """
    image_filename: str = Field(..., description="Nom du fichier image analysé.")
    gps_data: GpsCoordinates
    detections: List[DetectionResult] = Field(..., description="Liste des défauts détectés par le service DetectionFissures.")


# --- Schéma de Sortie : Les entités géoréférencées ---
# Après map-matching et insertion dans PostGIS.

class GeoreferencedAnomaly(BaseModel):
    """ Représente une anomalie géoréférencée, prête à être stockée dans PostGIS. """
    anomaly_id: str = Field(..., description="ID unique de l'anomalie.")
    class_name: str = Field(..., description="Nom de la classe du défaut (ex: D00).")
    latitude: float = Field(..., description="Latitude géoréférencée (ajustée sur la route).")
    longitude: float = Field(..., description="Longitude géoréférencée (ajustée sur la route).")
    road_segment_id: str = Field(..., description="ID du tronçon routier associé (issue du map-matching).")
    
class GeorefResponse(BaseModel):
    """ Réponse complète du service de géoréférencement. """
    status: str = "success"
    processed_detections_count: int = Field(..., description="Nombre de détections qui ont été géoréférencées.")
    anomalies: List[GeoreferencedAnomaly]
    message: str = "Géoreférencement terminé et données stockées dans PostGIS."