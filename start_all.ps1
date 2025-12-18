# Startup Script for Road Defect Detection System
# Launches Backend, Frontend, and Priority Service

Write-Host "Démarrage du système Road Defect Detection..." -ForegroundColor Cyan

# 1. Start Backend (Python FastAPI)
Write-Host "1. Démarrage du Backend (Port 8088)..." -ForegroundColor Green
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd c:\Intel\road-defect-api\backend; .\.venv\Scripts\Activate.ps1; python -m uvicorn app.main:app --reload --port 8088 --host 127.0.0.1" -WindowStyle Minimized

# 2. Start Priority Service (NestJS)
Write-Host "2. Démarrage du Service Priorité (Port 3000)..." -ForegroundColor Green
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd c:\Intel\road-defect-api\priority-service; npm run start:dev" -WindowStyle Minimized

# 3. Start Frontend (Vite)
Write-Host "3. Démarrage du Frontend..." -ForegroundColor Green
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd c:\Intel\road-defect-api\frontend-new; npm run dev"

Write-Host "Tous les services sont lancés !" -ForegroundColor Cyan
Write-Host "Backend: http://127.0.0.1:8088/docs"
Write-Host "Priority: http://127.0.0.1:3000"
Write-Host "Frontend: http://localhost:5173"
