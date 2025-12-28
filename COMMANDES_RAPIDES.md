# ⚡ Commandes Rapides - Lancement des Microservices RoadSense

## 🔧 Services Python FastAPI (avec uvicorn)

### Detection Service (Port 8088)
```powershell
cd c:\Intel\road-defect-api\detection-service
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --host 0.0.0.0 --port 8088 --reload
```

### Export Service (Port 8082)
```powershell
cd c:\Intel\road-defect-api\export-service
.\venv\Scripts\Activate.ps1
uvicorn main:app --host 0.0.0.0 --port 8082 --reload
```

---

## 🐍 Services Python (sans uvicorn)

### GeoRef Service (Port 8081)
```powershell
cd c:\Intel\road-defect-api\georef-service
.\venv\Scripts\Activate.ps1
python main.py
```

### Severity Service (Port 8083)
```powershell
cd c:\Intel\road-defect-api\severity-service
.\venv\Scripts\Activate.ps1
python main.py
```

### Dashboard Backend (Port 8084)
```powershell
cd c:\Intel\road-defect-api\dashboard-backend
.\venv\Scripts\Activate.ps1
python main.py
```

---

## 📦 Services Node.js

### Priority Service (Port 3000)
```powershell
cd c:\Intel\road-defect-api\priority-service
npm run start:dev
```

### Dashboard Frontend (Port 5173)
```powershell
cd c:\Intel\road-defect-api\dashboard-frontend
npm run dev
```

---

## 📋 Tableau Récapitulatif

| Service | Port | Type | Commande |
|---------|------|------|----------|
| Detection | 8088 | FastAPI + uvicorn | `uvicorn app.main:app --host 0.0.0.0 --port 8088 --reload` |
| GeoRef | 8081 | FastAPI | `python main.py` |
| Severity | 8083 | FastAPI | `python main.py` |
| Dashboard Backend | 8084 | FastAPI | `python main.py` |
| Export | 8082 | FastAPI + uvicorn | `uvicorn main:app --host 0.0.0.0 --port 8082 --reload` |
| Priority | 3000 | NestJS | `npm run start:dev` |
| Frontend | 5173 | React + Vite | `npm run dev` |

---

## 💡 Notes

- **`--reload`** : Active le rechargement automatique quand le code change
- **`--host 0.0.0.0`** : Permet l'accès depuis d'autres machines (pas seulement localhost)
- Les services avec **uvicorn** sont Detection et Export
- Les autres services Python ont uvicorn intégré dans leur `main.py`
