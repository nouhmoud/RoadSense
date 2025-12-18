# 🚀 Guide de Démarrage - Microservices Road Defect Detection

Ce guide explique comment lancer chaque microservice individuellement dans son propre terminal.

Pré-requis :
- Avoir **Python 3.10+** installé.
- Avoir **Node.js** installé.
- Avoir **PostgreSQL/PostGIS** et **MinIO** en cours d'exécution.

---

## 🏗️ 1. Infrastructure (Base de données & Stockage)
Assurez-vous que vos services d'infrastructure tournent.
- **PostgreSQL** (Port 5433 ou 5432)
- **MinIO** (Port 9000)

---

## 📷 2. Detection Service (Port 8088)
*Anciennement `backend`. Gère la détection YOLO et le stockage MinIO.*

**Dans un terminal PowerShell :**
```powershell
cd c:\Intel\road-defect-api\detection-service
# Activation de l'environnement virtuel existant (si présent)
.\.venv\Scripts\Activate.ps1
# Lancement
python -m uvicorn app.main:app --reload --port 8088 --host 127.0.0.1
```

---

## 🗺️ 3. GeoRef Service (Port 8081)
*Nouveau service. Gère le map-matching et l'historique géospatial.*

**Dans un terminal PowerShell :**
```powershell
cd c:\Intel\road-defect-api\georef-service
# On réutilise le venv du detection-service pour simplifier (ou créez-en un nouveau)
..\detection-service\.venv\Scripts\Activate.ps1
# Lancement
python main.py
```

---

## ⚖️ 4. Severity Service (Port 8083)
*Nouveau service. Gère le calcul de gravité des défauts.*

**Dans un terminal PowerShell :**
```powershell
cd c:\Intel\road-defect-api\severity-service
# On réutilise le venv du detection-service
..\detection-service\.venv\Scripts\Activate.ps1
# Lancement
python main.py
```

---

## 📊 5. Dashboard Backend (Port 8084)
*Service léger pour les statistiques du tableau de bord.*

**Dans un terminal PowerShell :**
```powershell
cd c:\Intel\road-defect-api\dashboard-backend
..\detection-service\.venv\Scripts\Activate.ps1
python main.py
```

---

## 🌍 6. Export Service (Port 8082)
*Gère les exports GeoJSON et KML.*

**Dans un terminal PowerShell :**
```powershell
cd c:\Intel\road-defect-api\export-service
..\detection-service\.venv\Scripts\Activate.ps1
python -m uvicorn main:app --reload --port 8082
```

---

## 🚦 7. Priority Service (Port 3000)
*Service NestJS pour la gestion des priorités.*

**Dans un terminal PowerShell :**
```powershell
cd c:\Intel\road-defect-api\priority-service
npm run start:dev
```

---

## 🖥️ 8. Dashboard Frontend (Port 5173)
*Interface Utilisateur React.*

**Dans un terminal PowerShell :**
```powershell
cd c:\Intel\road-defect-api\dashboard-frontend
npm run dev
```

---

## 💡 Notes Importantes
- Si vous avez des erreurs "ModuleNotFoundError", assurez-vous que l'environnement virtuel est bien activé (`Activate.ps1`).
- Le Frontend est accessible à l'adresse : **http://localhost:5173**
