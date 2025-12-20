# Rapport Technique Détaillé : Projet RoadSense
## Système Intelligent de Détection et de Gestion des Défauts Routiers

---

## 1. Introduction
RoadSense est une solution logicielle avancée conçue pour automatiser l'inspection des infrastructures routières. Le projet utilise l'Intelligence Artificielle, le Cloud Storage et les Systèmes d'Information Géographique (SIG) pour identifier, localiser et prioriser les réparations routières de manière efficace.

---

## 2. Architecture Globale (Microservices)
Le projet a été restructuré d'une architecture monolithique vers une architecture de **microservices conteneurisés**, garantissant scalabilité et modularité.

### 2.1 Liste des Composants
1.  **Frontend (React/Vite)** : Interface utilisateur "Premium" avec support Dark/Light mode, animations Framer Motion et cartes Leaflet.
2.  **Detection Service (FastAPI/Python)** : Noyau d'IA utilisant YOLOv8 pour la détection d'objets en temps réel.
3.  **Severity Service (FastAPI/Python)** : Moteur d'analyse utilisant XGBoost pour évaluer la dangerosité de chaque défaut.
4.  **GeoRef Service (FastAPI/Python)** : Module de géo-indexation utilisant les API Overpass et Nominatim pour le map-matching.
5.  **Dashboard Backend (FastAPI/Python)** : Service d'agrégation de données pour les statistiques globales du tableau de bord.
6.  **Priority Service (NestJS/TypeScript)** : Algorithme multicritère pour la planification des interventions.
7.  **Export Service (FastAPI/Python)** : Générateur de fichiers SIG (KML, GeoJSON).
8.  **Infrastructure (Docker)** :
    *   **PostGIS** : Base de données relationnelle et spatiale.
    *   **MinIO** : Serveur de stockage d'objets (S3-compatible) pour les images.

---

## 3. Détails Techniques des Services

### 3.1 Détection (Vision par Ordinateur)
*   **Modèle** : YOLOv8 (You Only Look Once).
*   **Capacs** : Détection de nids-de-poule (Potholes), fissures (Cracks), et bouches d'égout ouvertes (Open Manholes).
*   **Traitement** : Les images sont traitées, annotées avec des rectangles de détection (bounding boxes) et sauvegardées en Base64 pour le rendu immédiat ou sur MinIO pour l'historique.

### 3.2 Sévérité (Machine Learning)
*   **Algorithme** : XGBoost Classifier.
*   **Critères** : Surface du défaut, type de défaut, et score de confiance de l'IA.
*   **Sortie** : Classification en 4 niveaux (FAIBLE, MOYEN, ÉLEVÉ, CRITIQUE).

### 3.3 Géo-Référencement & Map-Matching
*   **Logique** : Prend les coordonnées GPS (extraites des métadonnées EXIF ou saisies manuellement).
*   **Overpass API** : Recherche la route la plus proche dans le graphe OpenStreetMap original.
*   **Nominatim** : Fallback pour obtenir une adresse postale lisible si la route n'est pas nommée.
*   **Stockage** : Utilisation du type `GEOMETRY(Point, 4326)` pour des requêtes spatiales ultra-rapides.

### 3.4 Planification de Priorité
*   **Algorithme** : `Priority = (DefectScore * 0.7) + (TrafficScore * 0.3)`.
*   **Dynamicité** : Le service détecte automatiquement les nouveaux segments de route et les ajoute au plan sans configuration manuelle.
*   **Critères de pondération** : Les nids-de-poule et égouts ouverts ont un poids de sévérité supérieur aux fissures.

---

## 4. Base de Données & Stockage (Schémas)

### 4.1 Table `road_anomalies` (PostGIS)
| Colonne | Type | Description |
| :--- | :--- | :--- |
| `anomaly_id` | UUID | Identifiant unique. |
| `class_name` | VARCHAR(50) | Type de défaut (Pothole, etc.). |
| `confidence` | FLOAT | Score de confiance de l'IA. |
| `road_segment_id` | VARCHAR(100) | Nom de la rue ou coordonnées. |
| `geom` | GEOMETRY | Point géographique (SRID 4326). |
| `timestamp` | DATETIME | Date de détection. |

### 4.2 Stockage MinIO
*   **Bucket** : `road-defects` (configuré en accès Public).
*   **Organisation** : Stockage des images originales et des images annotées par l'IA.

---

## 5. Déploiement & DevOps
*   **Conteneurisation** : Docker & Docker Compose.
*   **Réseau** : Réseau interne Docker permettant la communication DNS entre services (ex: `http://georef:8081`).
*   **Volumes** : Persistance des données PostgreSQL et MinIO sur l'hôte.
*   **Optimisation** : Dockerfiles multi-stage et installation PyTorch CPU-only pour réduire la taille des images.

---

## 6. Guide d'Utilisation Rapide
1.  Lancer le système : `docker-compose up -d`.
2.  Accéder au Frontend : `http://localhost:5173`.
3.  Analyser : Importer une photo → Valider le GPS → Résultat instantané.
4.  Consulter : Voir l'historique et le plan de priorité mis à jour dynamiquement.

---
*Rapport généré par le système d'assistance technique RoadSense - Décembre 2025*
