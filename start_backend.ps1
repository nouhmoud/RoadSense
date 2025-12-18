$env:PYTHONPATH = "backend"
$env:POSTGRES_HOST = "localhost"
$env:MINIO_ENDPOINT = "localhost:9000"

# Activation de l'environnement virtuel existant
if (Test-Path "backend\venv_new\Scripts\Activate.ps1") {
    . "backend\venv_new\Scripts\Activate.ps1"
}
else {
    Write-Host "Attention: venv_new non trouvé. Tentative d'utilisation de python global."
}

# Installation des dépendances manquantes (au cas où)
Write-Host "Vérification des dépendances..."
pip install xgboost scikit-learn pandas

# Lancement de l'application
# On suppose que l'utilisateur est à la racine du workspace c:\Intel\road-defect-api
Write-Host "Lancement du backend FastAPI sur http://127.0.0.1:8088..."
cd backend
python -m uvicorn app.main:app --reload --port 8088 --host 127.0.0.1
