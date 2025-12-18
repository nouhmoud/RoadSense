# Script pour lancer le Service d'Export SIG (Python/FastAPI)
Write-Host "Démarrage du Service d'Export sur le port 8082..." -ForegroundColor Green

# Se déplacer dans le dossier du service
cd c:\Intel\road-defect-api\export-service

# Activer l'environnement virtuel et lancer le service
# Note: On suppose que l'environnement est dans .venv (à adapter si nécessaire)
if (Test-Path ".\.venv\Scripts\Activate.ps1") {
    . .\.venv\Scripts\Activate.ps1
}

python -m uvicorn main:app --reload --port 8082
