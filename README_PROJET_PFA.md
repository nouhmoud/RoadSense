# Système de Détection et Gestion des Dégradations Routières (PFA)

Ce projet est une plateforme intelligente de monitoring routier combinant Intelligence Artificielle (Vision par Ordinateur), Analyse de Données et Systèmes d'Information Géographique (SIG).

## 🏗️ Architecture du Système
L'application repose sur une architecture micro-services pour garantir la scalabilité et la modularité.

### 1. Backend Central (Python/FastAPI) - Port 8088
C'est le "cerveau" de l'application. 
- **Détection IA** : Utilise le modèle **YOLOv8** pour analyser les images et identifier les types de défauts (nids de poule, fissures, etc.).
- **Géo-Référencement** : Convertit les coordonnées GPS des photos en adresses réelles via une double intégration **Overpass API** et **Nominatim (OSM)**.
- **Stockage Spatial** : Archive les résultats dans une base de données **PostGIS** pour permettre des requêtes géographiques complexes.

### 2. Dashboard Premium (React/Vite) - Port 5173
L'interface utilisateur moderne et interactive.
- **Analyse en Temps Réel** : Interface de téléchargement d'images avec visualisation immédiate des résultats annotés.
- **Vue Globale** : Statistiques agrégées (KPIs), graphiques de distribution des défauts et **Évolution Temporelle** (suivi mensuel des dégradations).
- **Cartographie** : Intégration de Leaflet pour afficher les anomalies sur une carte interactive.

### 3. Service de Priorité (NestJS) - Port 3000
Service d'aide à la décision pour la maintenance.
- **Algorithme de Scoring** : Calcule un score de priorité pour chaque tronçon routier en croisant :
    - Le nombre et la sévérité des défauts détectés.
    - L'importance du trafic sur la route.
- **Objectif** : Générer automatiquement un **Plan d'Intervention Prioritaire** pour optimiser les budgets de réparation.

### 4. Service d'Export SIG - Port 8082
Gère l'interopérabilité avec les outils professionnels.
- **Formats Supportés** : Export des données au format **KML** (pour Google Earth) et **GeoJSON**.
- **Flux WFS** : Permet d'intégrer les données directement dans des logiciels comme **QGIS** ou **ArcGIS**.

### 5. Service de Sévérité (IA)
- Utilise un modèle de Machine Learning (**XGBoost**) pour classer la gravité de chaque anomalie (Critique, Élevé, Moyen, Faible) en fonction de ses caractéristiques visuelles.

---

## 🚀 Comment lancer le projet ?
Pour faciliter la démonstration devant le jury, utilisez le script unifié :
```powershell
.\start_all.ps1
```

---

## � PARTIE 2 : Détails Techniques de l'Implémentation

### 1. Pipeline de Traitement des Données (Workflow)
Voici le cheminement exact d'une donnée, de la capture à l'analyse :
1.  **Ingestion** : L'image est uploadée via le Dashboard React vers le Backend FastAPI.
2.  **Traitement Vision** : YOLOv8 effectue l'inférence. Si un défaut est trouvé, il est encadré (Bounding Box) et classé.
3.  **Analyse de Sévérité** : Les métadonnées de la détection (taille, confiance, classe) sont envoyées au service XGBoost qui retourne un "Score de Gravité".
4.  **Enrichissement Spatial (Map-Matching)** :
    - Extraction des coordonnées GPS (EXIF).
    - Appel à **Overpass API** pour identifier le `road_segment_id` (nom ou réf de la route).
    - Backup sur **Nominatim** pour l'adresse postale si besoin.
5.  **Persistance** : L'anomalie est stockée dans **PostGIS** avec le type `GEOMETRY(Point, 4326)`.

### 2. Algorithme de Calcul des Priorités (Decision Support)
Le service NestJS utilise une formule pondérée pour classer les interventions :
$$PriorityScore = (DefectScore \times 0.7) + (TrafficScore \times 0.3)$$
- **DefectScore** : Moyenne de la gravité des défauts sur un tronçon + bonus multiplicateur selon le nombre total de défauts.
- **TrafficScore** : Donnée simulée ou réelle représentant l'importance de l'axe routier.
*Résultat* : Une liste triée permettant aux décideurs de savoir par où commencer les travaux.

### 3. Structure de la Base de Données (Modèle PostGIS)
Le schéma spatial est optimisé pour les performances :
- `road_anomalies` : 
    - `id` (UUID)
    - `class_name` (Nid de poule, Fissure...)
    - `confidence` (0-1)
    - `road_segment_id` (Nom de la rue/route)
    - `geom` (Point spatial avec index **GIST** pour les recherches rapides).

### 4. Interopérabilité & SIG Professionnel
Le projet respecte les standards de l'OGC :
- **WFS (Web Feature Service)** : Les données sont servies en flux continu. Un ingénieur peut ouvrir **QGIS**, ajouter l'URL de notre service d'export, et voir les points de dégradations se calquer sur ses propres cartes de voirie.
- **Export KML** : Pour une visualisation rapide sur Google Earth Web avec conservation de tous les attributs (nom de route, date, type de défaut).

---

## 🛠️ Technologies & Dépendances
- **Frameworks** : FastAPI (Python 3.11), NestJS (Node.js), React 18
- **Intelligence Artificielle** : PyTorch, Ultralytics YOLOv8, Scikit-learn, XGBoost
- **Analyse Spatiale** : GeoPandas, Shapely, SQLAlchemy-Utils
- **DevOps** : PowerShell Automation Scripts, Axios (Synchronisation inter-services)

