# **RoadSense : Système Intelligent de Maintenance Routière**

---

## **Présentation du Projet**

RoadSense est une solution modulaire conçue pour automatiser l'inspection des routes. L'idée est simple : utiliser l'intelligence artificielle pour détecter les dégradations (nids-de-poule, fissures, etc.) à partir de simples photos, puis transformer ces détections en données géographiques exploitables pour planifier les réparations.

Pour rendre le système robuste et évolutif, nous avons fait le choix d'une architecture en microservices. Chaque brique logicielle gère une tâche précise, ce qui permet de les maintenir ou de les améliorer indépendamment.

---

## **Architecture et Microservices**

### **1. Detection Service (Port 8088)**

C'est le "cerveau" visuel du projet.

- **Rôle** : Reçoit l'image brute, fait tourner un modèle YOLOv8 entraîné spécifiquement sur des défauts routiers, et renvoie les coordonnées des objets détectés sur l'image (bounding boxes).
- **Stockage** : Il s'occupe aussi de sauvegarder les images originales et annotées dans un serveur MinIO (S3-like).

### **2. GeoRef Service (Port 8081)**

Une fois qu'un défaut est vu sur l'image, il faut savoir où il se trouve sur la carte.

- **Rôle** : Il récupère les métadonnées GPS de l'image (ou saisies manuellement) et utilise une logique de Map-Matching.
- **Techno** : Il interroge la base PostGIS pour lier l'anomalie au tronçon de route le plus proche. Cela permet de dire "ce nid-de-poule appartient à l'Avenue Mohamed V" plutôt que de donner juste des coordonnées brutes.

### **3. Severity Service (Port 8083)**

Toutes les dégradations ne se valent pas. Une fissure légère n'a pas la même urgence qu'un nid-de-poule profond.

- **Rôle** : Utilise un modèle de machine learning (XGBoost) pour calculer un score de gravité (0 à 100) basé sur la classe du défaut et sa confiance de détection.
- **Résultat** : Classe les défauts par niveaux : Critique, Élevé, Moyen ou Faible.

### **4. Priority Service (Port 3000)**

Comment décider où envoyer les équipes de réparation en premier ?

- **Rôle** : Ce service croise les données de sévérité avec l'importance de la route (trafic, type de voie).
- **Algorithme** : Il génère un Plan d'Intervention Prioritaire, classant les tronçons de route qui nécessitent une action immédiate pour garantir la sécurité des usagers.

### **5. Export Service (Port 8082)**

Pour que les données soient utilisables par les ingénieurs des Travaux Publics.

- **Rôle** : Permet d'extraire les anomalies stockées en base vers des formats standards du monde du SIG (Système d'Information Géographique) comme le GeoJSON ou le KML (Google Earth).

### **6. Dashboard Backend (Port 8084)**

- **Rôle** : Agrège toutes les données stockées en base PostGIS pour fournir des statistiques globales (nombre total de défauts, distribution par type, évolution temporelle) au frontend.

---

## **Interface Utilisateur (RoadSense Dashboard)**

Le frontend a été développé sous React avec un design moderne (Glassmorphism). Il offre deux modes principaux :

- **Analyse en Direct** : On charge une photo, on voit les détections de l'IA en temps réel, le calcul de la position sur la carte et le score de gravité.
- **Vue Globale** : Un tableau de bord avec des graphiques (Chart.js) et une carte interactive (Leaflet) pour visualiser l'état de santé de tout le réseau routier d'un coup d'œil.

---

## **Installation Rapide**

- **Infrastructure** : Docker avec PostGIS et MinIO doit être lancé.
- **Backends** : Lancer le script PowerShell `start_microservices.ps1` à la racine pour démarrer tous les services simultanément.
- **Frontend** : Aller dans `dashboard-frontend` et lancer `npm run dev`.

---

## **API REST Documentée & Endpoints**

RoadSense expose plusieurs APIs RESTful pour permettre l'intégration avec d'autres systèmes. Voici la documentation technique des principaux endpoints disponibles.

### **1. Detection Service (Port 8088)**

Service responsable de l'analyse d'images via YOLOv8.

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/health` | Vérifie l'état du service et si le modèle est chargé. |
| `POST` | `/detect` | Analyse une image envoyée. Retourne un JSON avec les détections et l'image annotée en Base64. Sauvegarde aussi sur MinIO. |
| `POST` | `/detect/image` | Analyse une image et retourne directement le fichier image binaire annoté (utile pour tests visuels). |
| `GET` | `/results` | Liste l'historique des détections stockées (images & JSON) depuis MinIO. |

### **2. GeoRef Service (Port 8081)**

Service de cartographie et Map-Matching.

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/health` | Statut du service. |
| `POST` | `/georef` | Reçoit des coordonnées GPS brutes et des détections, effectue le map-matching et sauvegarde en base PostGIS. |
| `GET` | `/georef/resolve` | Reverse Geocoding : Prend lat et lon en paramètres et retourne le nom de la route ou du quartier. |
| `GET` | `/georef/history` | Récupère l'intégralité des anomalies géoréférencées stockées en base de données. |

### **3. Severity Service (Port 8083)**

Calcul de l'urgence des réparations.

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/health` | Statut du service. |
| `POST` | `/severity/compute` | Calcule un score de gravité (0-100) pour une liste de détections fournie, basé sur la classe et la confiance. |

### **4. Priority Service (Port 3000)**

Gestion des priorités d'intervention (NestJS).

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/priority/list` | Génère la liste des interventions prioritaires en croisant gravité et importance des routes. |
| `GET` | `/priority/reset` | Vide la table des priorités (utile pour réinitialiser la démo). |

### **5. Export Service (Port 8082)**

Export des données pour SIG externes.

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/health` | Statut du service. |
| `GET` | `/export/map` | Télécharge les anomalies au format GeoJSON (Standard Web & QGIS). |
| `GET` | `/export/kml` | Télécharge les anomalies au format KML pour visualisation dans Google Earth. |
| `GET` | `/wfs` | Endpoint compatible WFS 2.0 pour connexion directe depuis QGIS. |

### **6. Dashboard Backend (Port 8084)**

Agrégation de données pour le tableau de bord.

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/health` | Statut du service. |
| `GET` | `/dashboard-stats` | Renvoie les statistiques globales : nombre total de défauts, répartition par type, top zones touchées. |

---

**Développé dans le cadre d'un projet PFA - Focus sur la modularité, l'IA et l'analyse spatiale.**



# Vidéos de Démonstration - RoadSense

## Vidéo 1 : Présentation du Système


https://github.com/user-attachments/assets/c55307f4-08f2-4686-a722-0f00edd18f0a


## Vidéo 2 : Fonctionnalités Avancées


https://github.com/user-attachments/assets/7c9df08d-5cfe-4543-ab74-ca61c87fa416


# ⚠️ <span style="color:red">REMARQUE IMPORTANTE</span>

> ### 🚨 **<span style="color:red">À l'attention du correcteur :</span>**
> 
> **L'explication détaillée du projet est présente depuis le début dans le fichier `README_PROJET.md`. De même, toutes les vidéos de démonstration ont toujours été disponibles dans le dossier `/videos`.**
>
> **Nous avons simplement centralisé ces éléments ici, dans le README principal, pour faciliter votre lecture.**
