# Script PowerShell pour lancer tous les services RoadSense
# Usage: .\start_all_services.ps1

Write-Host "🚀 Démarrage de RoadSense - Système de Maintenance Routière" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

# Vérifier que Docker est lancé
Write-Host "🔍 Vérification de Docker..." -ForegroundColor Yellow
try {
    docker info | Out-Null
    Write-Host "✅ Docker est opérationnel`n" -ForegroundColor Green
}
catch {
    Write-Host "❌ ERREUR: Docker n'est pas lancé!" -ForegroundColor Red
    Write-Host "   Veuillez démarrer Docker Desktop et réessayer.`n" -ForegroundColor Red
    exit 1
}

# Démarrer l'infrastructure (PostGIS + MinIO)
Write-Host "📦 Démarrage de l'infrastructure (PostGIS + MinIO)..." -ForegroundColor Yellow
docker-compose up db minio -d

# Attendre que les services soient prêts
Write-Host "⏳ Attente de la disponibilité de la base de données..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Fonction pour lancer un service Python FastAPI
function Start-PythonService {
    param(
        [string]$ServiceName,
        [string]$Port,
        [string]$Path,
        [string]$Command
    )
    
    Write-Host "🔧 Démarrage de $ServiceName (Port $Port)..." -ForegroundColor Yellow
    
    # Créer un nouveau terminal PowerShell pour le service
    Start-Process powershell -ArgumentList @"
        -NoExit -Command "
        cd '$Path'
        Write-Host '=== $ServiceName ===' -ForegroundColor Cyan
        if (-Not (Test-Path 'venv')) {
            Write-Host 'Création de l''environnement virtuel...' -ForegroundColor Yellow
            python -m venv venv
        }
        .\venv\Scripts\Activate.ps1
        Write-Host 'Installation des dépendances...' -ForegroundColor Yellow
        pip install -q -r requirements.txt
        Write-Host '✅ $ServiceName démarré sur le port $Port' -ForegroundColor Green
        $Command
        "
"@
}

# Fonction pour lancer un service Node.js
function Start-NodeService {
    param(
        [string]$ServiceName,
        [string]$Port,
        [string]$Path,
        [string]$Command
    )
    
    Write-Host "🔧 Démarrage de $ServiceName (Port $Port)..." -ForegroundColor Yellow
    
    Start-Process powershell -ArgumentList @"
        -NoExit -Command "
        cd '$Path'
        Write-Host '=== $ServiceName ===' -ForegroundColor Cyan
        if (-Not (Test-Path 'node_modules')) {
            Write-Host 'Installation des dépendances npm...' -ForegroundColor Yellow
            npm install
        }
        Write-Host '✅ $ServiceName démarré sur le port $Port' -ForegroundColor Green
        $Command
        "
"@
}

# Obtenir le chemin racine du projet
$RootPath = $PSScriptRoot

# Démarrer tous les microservices backend
Start-PythonService -ServiceName "Detection Service" -Port "8088" `
    -Path "$RootPath\detection-service" `
    -Command "uvicorn app.main:app --host 0.0.0.0 --port 8088 --reload"

Start-Sleep -Seconds 2

Start-PythonService -ServiceName "GeoRef Service" -Port "8081" `
    -Path "$RootPath\georef-service" `
    -Command "python main.py"

Start-Sleep -Seconds 2

Start-PythonService -ServiceName "Severity Service" -Port "8083" `
    -Path "$RootPath\severity-service" `
    -Command "python main.py"

Start-Sleep -Seconds 2

Start-PythonService -ServiceName "Dashboard Backend" -Port "8084" `
    -Path "$RootPath\dashboard-backend" `
    -Command "python main.py"

Start-Sleep -Seconds 2

Start-PythonService -ServiceName "Export Service" -Port "8082" `
    -Path "$RootPath\export-service" `
    -Command "uvicorn main:app --host 0.0.0.0 --port 8082 --reload"

Start-Sleep -Seconds 2

Start-NodeService -ServiceName "Priority Service" -Port "3000" `
    -Path "$RootPath\priority-service" `
    -Command "npm run start:dev"

Start-Sleep -Seconds 3

# Démarrer le frontend
Start-NodeService -ServiceName "Dashboard Frontend" -Port "5173" `
    -Path "$RootPath\dashboard-frontend" `
    -Command "npm run dev"

Start-Sleep -Seconds 5

# Résumé
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "✅ Tous les services RoadSense sont en cours de démarrage!" -ForegroundColor Green
Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "📊 État des Services:" -ForegroundColor Yellow
Write-Host "  🔹 Infrastructure Docker  : http://localhost:9001 (MinIO Console)" -ForegroundColor White
Write-Host "  🔹 Detection Service      : http://localhost:8088" -ForegroundColor White
Write-Host "  🔹 GeoRef Service         : http://localhost:8081" -ForegroundColor White
Write-Host "  🔹 Severity Service       : http://localhost:8083" -ForegroundColor White
Write-Host "  🔹 Dashboard Backend      : http://localhost:8084" -ForegroundColor White
Write-Host "  🔹 Export Service         : http://localhost:8082" -ForegroundColor White
Write-Host "  🔹 Priority Service       : http://localhost:3000" -ForegroundColor White
Write-Host "  🎨 Dashboard Frontend     : http://localhost:5173`n" -ForegroundColor Cyan

Write-Host "⏳ Attente du démarrage complet (30 secondes)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host "🌐 Ouverture du Dashboard..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host "`n✨ Le système RoadSense est prêt!`n" -ForegroundColor Green
Write-Host "💡 Pour arrêter l'infrastructure Docker:" -ForegroundColor Yellow
Write-Host "   docker-compose down`n" -ForegroundColor White
