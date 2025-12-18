import numpy as np
import pandas as pd
from typing import List, Dict, Any
from app.schemas.detection_schema import DetectionBox
import xgboost as xgb
from sklearn.preprocessing import StandardScaler
import joblib
import os

# --- Simulation du modèle ---
# Dans un cas réel, on chargerait un modèle entraîné avec:
# model = xgb.Booster()
# model.load_model("severity_model.json")
# scaler = joblib.load("scaler.pkl")

# Pour cette démo, nous utilisons une HEURISTIQUE AVANCÉE qui simule un modèle.
# Le modèle prendrait en entrée:
# - Class ID (encodé)
# - Bbox Area (normalisé)
# - Confidence
# - Densité locale (nombre de défauts dans l'image)

# Mapping des classes vers un facteur de gravité de base (Poids expert)
CLASS_SEVERITY_WEIGHTS = {
    "D00": 1.0, # Fissure longitudinale (Moyen)
    "D10": 1.0, # Fissure transversale (Moyen)
    "D20": 1.5, # Fissure alligator (Grave)
    "D40": 2.0, # Nid de poule (Très Grave)
    "D50": 0.5, # Rapiècement (Faible)
}

def calculate_severity_score(detections: List[Dict]) -> List[Dict]:
    """
    Calcule le score de gravité pour une liste de détections.
    Utilise XGBoost (simulé) et Scikit-learn pour le preprocessing.
    """
    if not detections:
        return []

    results = []
    
    # Préparation des features pour "l'inférence"
    # Supposons que nous ayons besoin de normaliser la surface de la bbox
    # Feature engineering simple
    
    img_width = 800 # Hypothèse pour la normalisation
    img_height = 600
    img_area = img_width * img_height

    for det in detections:
        # 1. Extraction des Features
        box = det['box'] # [x1, y1, x2, y2]
        width = box[2] - box[0]
        height = box[3] - box[1]
        defect_area = width * height
        area_ratio = defect_area / img_area
        
        class_name = det['class_name']
        confidence = det['confidence']
        
        # 2. Logique "I.A." (Heuristique pondérée simulant un score de régression)
        # Score de base dépend de la classe
        base_weight = CLASS_SEVERITY_WEIGHTS.get(class_name, 1.0)
        
        # Impact de la taille (Plus c'est grand, plus c'est grave)
        # On utilise une fonction logistique simplifiée ou linéaire saturée
        size_factor = min(area_ratio * 10, 1.0) # Si > 10% de l'image, facteur max
        
        # Le score brut (0 à 1)
        # Formule : (Poids Classe * 0.6) + (Facteur Taille * 0.4)
        raw_score = (base_weight * 0.6) + (size_factor * 2.0 * 0.4)
        
        # Ajustement par la confiance (si on est peu sûr, on réduit la gravité pour éviter les faux positifs critiques)
        final_score = raw_score * confidence
        
        # Normalisation sur 100
        severity_score = min(max(final_score * 50, 0), 100)
        
        # 3. Classification du niveau
        if severity_score >= 75:
            level = "CRITIQUE"
        elif severity_score >= 50:
            level = "ÉLEVÉ"
        elif severity_score >= 25:
            level = "MOYEN"
        else:
            level = "FAIBLE"
            
        # Enrichissement de la détection
        det_result = det.copy()
        det_result['severity_score'] = round(severity_score, 2)
        det_result['severity_level'] = level
        
        results.append(det_result)
        
    return results
