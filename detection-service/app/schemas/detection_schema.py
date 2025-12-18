from pydantic import BaseModel, Field
from typing import List

# --- Schéma pour une Boîte de Détection (Bounding Box) ---
class DetectionBox(BaseModel):
    """
    Représente les coordonnées d'une détection (bounding box).
    """
    # Liste de 4 entiers: [x1, y1, x2, y2]
    box: List[int] = Field(..., description="Coordonnées de la boîte [x_min, y_min, x_max, y_max]")
    confidence: float = Field(..., description="Niveau de confiance de la détection (0.0 à 1.0)")
    class_id: int = Field(..., description="ID numérique de la classe (e.g., 0, 1, 2)")
    class_name: str = Field(..., description="Nom de la classe (e.g., 'Pothole', 'Crack')")

    class Config:
        json_schema_extra = {
            "example": {
                "box": [150, 200, 300, 450],
                "confidence": 0.9234,
                "class_id": 0,
                "class_name": "Pothole"
            }
        }

# --- Schéma pour la Réponse Complète de Détection ---
class DetectionResponse(BaseModel):
    """
    Représente la réponse complète de l'API après une détection.
    """
    filename: str = Field(..., description="Nom du fichier traité.")
    detections: List[DetectionBox] = Field(..., description="Liste des objets détectés.")
    detection_count: int = Field(..., description="Nombre total de défauts détectés.")
    
    # 🚨 CHAMP BASE64 AJOUTÉ 🚨
    annotated_image_b64: str = Field(None, description="Image annotée encodée en Base64 (pour affichage frontal immédiat).")
    # --------------------------

    minio_image_url: str = Field(None, description="URL d'accès public à l'image annotée stockée dans MinIO.")

# --- Schéma pour le Health Check ---
class HealthCheck(BaseModel):
    """
    Schéma pour vérifier l'état de santé du service.
    """
    status: str = Field("ok", description="État du service")
    model_loaded: bool = Field(False, description="Indique si le modèle YOLOv8 a été chargé.")