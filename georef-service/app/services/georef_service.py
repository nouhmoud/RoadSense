# app/services/georef_service.py

import os
import uuid
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text
import pandas as pd # Requis par GeoPandas

# Imports des schémas
from app.schemas.georef_schema import GpsCoordinates, DetectionResult, GeoreferencedAnomaly
# Imports des librairies géo-spatiales
import geopandas as gpd
from shapely.geometry import Point, LineString # Ajout de LineString
from shapely.ops import nearest_points # Utile pour trouver le point le plus proche

# --- Nom de la table PostGIS pour les anomalies ---
ANOMALY_TABLE_NAME = "road_anomalies"

# =================================================================
# === 1. CHARGEMENT DU GRAPHE ROUTIER (Simulé) ===
# =================================================================

# Variable globale pour stocker le GeoDataFrame du réseau routier
ROAD_NETWORK_GEODF: gpd.GeoDataFrame = None

def load_road_network():
    """ 
    Charge le réseau routier (GeoDataFrame) en mémoire. 
    Dans un environnement réel, ceci chargerait un fichier ou lirait PostGIS.
    """
    global ROAD_NETWORK_GEODF
    if ROAD_NETWORK_GEODF is not None:
        return

    # --- SIMULATION DE DONNÉES ROUTIÈRES (Lignes) ---
    # Remplacez ceci par la lecture de votre fichier GeoJSON/Shapefile réel.
    data = {
        'road_segment_id': ['Avenue Mohammed V', 'Boulevard des FAR', 'Rue de la Gare'],
        # Coordonnées des lignes (tronçons routiers)
        'geometry': [
            LineString([(1.0, 43.5), (1.001, 43.501), (1.002, 43.502)]),
            LineString([(1.0, 43.6), (1.001, 43.601), (1.002, 43.602)]),
            LineString([(1.1, 43.5), (1.1, 43.501)])
        ]
    }
    
    ROAD_NETWORK_GEODF = gpd.GeoDataFrame(data, crs="EPSG:4326")
    print("INFO: Graphe routier simulé chargé.")

# Appel initial pour charger le réseau au démarrage du module
load_road_network()

# =================================================================
# === 2. LOGIQUE DE MAP-MATCHING (Implémentée) ===
# =================================================================

def perform_map_matching(gps_point: GpsCoordinates) -> tuple[float, float, str]:
    """
    Effectue le Map-Matching via OpenStreetMap (Nominatim).
    
    PARAMÈTRES:
        gps_point: Coordonnées GPS brutes de l'image.
        
    RETOURNE:
        (latitude_matched, longitude_matched, road_segment_id)
    """
    import requests
    import time

    lat = gps_point.latitude
    lon = gps_point.longitude
    
    headers = {
        'User-Agent': 'RoadDefectApp/1.2 (pfa-projet-contact@example.com)',
        'Accept-Language': 'fr' # Force le français pour les noms
    }

    # --- ÉTAPE 1 : Tenter via OVERPASS API (Plus précis pour les routes) ---
    try:
        OVERPASS_URL = "https://overpass-api.de/api/interpreter"
        # Cherche la route (highway) la plus proche dans un rayon de 50m
        query = f"""
        [out:json][timeout:5];
        way(around:50,{lat},{lon})[highway];
        out tags;
        """
        over_res = requests.post(OVERPASS_URL, data={'data': query}, headers=headers, timeout=5)
        if over_res.status_code == 200:
            over_data = over_res.json()
            elements = over_data.get('elements', [])
            if elements:
                # On prend le premier élément (souvent le plus proche ou principal)
                tags = elements[0].get('tags', {})
                road_name = tags.get('name') or tags.get('ref') # ref = ex: N1, R301
                if road_name:
                    return lat, lon, road_name
    except Exception as e:
        print(f"DEBUG: Overpass failed, falling back to Nominatim: {e}")

    # --- ÉTAPE 2 : FALLBACK NOMINATIM (Si Overpass échoue) ---
    try:
        NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
        time.sleep(0.1) # Courtoisie
        
        params = {
            'lat': lat, 'lon': lon,
            'format': 'json', 'zoom': 18,
            'addressdetails': 1, 'namedetails': 1
        }
        
        response = requests.get(NOMINATIM_URL, params=params, headers=headers, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            address = data.get('address', {})
            
            road_name = (address.get('road') or address.get('street') or 
                         address.get('suburb') or address.get('neighbourhood'))
            
            if not road_name:
                road_name = data.get('display_name', '').split(',')[0]
                
            if not road_name or road_name.strip() == "":
                road_name = f"Zone {lat:.4f}, {lon:.4f}"
                
            return lat, lon, road_name
            
        else:
            return lat, lon, f"Coord ({lat:.4f}, {lon:.4f})"

    except Exception as e:
        print(f"ERREUR OSM: {e}")
        return lat, lon, f"Offline ({lat:.4f}, {lon:.4f})"


# =================================================================
# === 3. LOGIQUE D'INSERTION POSTGIS (Mise à jour) ===
# =================================================================

def create_anomaly_table(db: Session):
    # ... (code inchangé pour la création de table) ...
    create_table_sql = f"""
    CREATE TABLE IF NOT EXISTS {ANOMALY_TABLE_NAME} (
        anomaly_id VARCHAR(50) PRIMARY KEY,
        class_name VARCHAR(10) NOT NULL,
        confidence REAL,
        road_segment_id VARCHAR(50),
        timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        geom GEOMETRY(Point, 4326)
    );
    """
    
    create_index_sql = f"CREATE INDEX IF NOT EXISTS idx_geom_anomalies ON {ANOMALY_TABLE_NAME} USING GIST (geom);"
    
    try:
        db.execute(text(create_table_sql))
        db.execute(text(create_index_sql))
        db.commit()
        # print(f"INFO: Table PostGIS '{ANOMALY_TABLE_NAME}' vérifiée/créée.")
    except Exception as e:
        print(f"ERREUR: Impossible de créer/vérifier la table PostGIS : {e}")
        raise e


def perform_georeferencing(
    db: Session, 
    gps_data: GpsCoordinates, 
    detections: List[DetectionResult]
) -> List[GeoreferencedAnomaly]:
    """
    Service principal de géoréférencement.
    """
    
    # 1. Assurer que la table est créée
    create_anomaly_table(db)
    
    anomalies_to_insert = []
    
    for i, det in enumerate(detections):
        
        # 2. Map-Matching (APPEL À LA VRAIE LOGIQUE)
        matched_lat, matched_lon, segment_id = perform_map_matching(gps_data)
        
        # 3. Création de l'objet GeoreferencedAnomaly
        anomaly = GeoreferencedAnomaly(
            anomaly_id=str(uuid.uuid4()),
            class_name=det.class_name,
            latitude=matched_lat,
            longitude=matched_lon,
            road_segment_id=segment_id,
        )
        anomalies_to_insert.append(anomaly)
        
        # 4. Préparation de l'insertion PostGIS
        insert_sql = text(f"""
            INSERT INTO {ANOMALY_TABLE_NAME} 
            (anomaly_id, class_name, confidence, road_segment_id, geom) 
            VALUES 
            (:anomaly_id, :class_name, :confidence, :road_segment_id, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326));
        """)
        
        try:
            db.execute(insert_sql, {
                "anomaly_id": anomaly.anomaly_id,
                "class_name": anomaly.class_name,
                "confidence": det.confidence,
                "road_segment_id": segment_id,
                "lon": matched_lon,
                "lat": matched_lat
            })
            db.commit()
            
        except Exception as e:
            db.rollback()
            # Log de l'erreur d'insertion spécifique, mais on continue le traitement des autres
            print(f"ERREUR lors de l'insertion de l'anomalie {anomaly.anomaly_id}: {e}")
            
    return anomalies_to_insert

def get_all_georeferenced_anomalies(db: Session) -> List[Dict[str, Any]]:
    """
    Récupère toutes les anomalies géoréférencées depuis PostGIS.
    """
    create_anomaly_table(db)

    # Récupérer les données brutes + les coordonnées extraites via ST_X/ST_Y
    sql = text(f"""
        SELECT 
            anomaly_id, 
            class_name, 
            confidence, 
            road_segment_id, 
            timestamp, 
            ST_X(geom) as longitude, 
            ST_Y(geom) as latitude 
        FROM {ANOMALY_TABLE_NAME}
        ORDER BY timestamp DESC
    """)
    
    try:
        result = db.execute(sql).fetchall()
        anomalies = []
        for row in result:
            # Most robust: access by index
            anomalies.append({
                "anomaly_id": str(row[0]),
                "class_name": str(row[1]),
                "confidence": float(row[2]),
                "road_segment_id": str(row[3]),
                "timestamp": str(row[4]),
                "longitude": float(row[5]),
                "latitude": float(row[6])
            })
        return anomalies
    except Exception as e:
        print(f"ERREUR lors de la récupération de l'historique géoréférencé: {e}")
        return []