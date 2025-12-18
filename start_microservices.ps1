# Startup Script for Road Defect Microservices System

Write-Host "Starting Road Defect Microservices..." -ForegroundColor Cyan

# Common VENV (Reusing backend venv for efficiency in this env)
$VENV_ACTIVATE = "c:\Intel\road-defect-api\backend\.venv\Scripts\Activate.ps1"

# 1. Detection Service (Port 8088)
Write-Host "1. Starting Detection Service (Port 8088)..." -ForegroundColor Green
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", ". $VENV_ACTIVATE; cd c:\Intel\road-defect-api\backend; python -m uvicorn app.main:app --reload --port 8088 --host 127.0.0.1" -WindowStyle Minimized

# 2. GeoRef Service (Port 8081)
Write-Host "2. Starting GeoRef Service (Port 8081)..." -ForegroundColor Green
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", ". $VENV_ACTIVATE; cd c:\Intel\road-defect-api\georef-service; python main.py" -WindowStyle Minimized

# 3. Severity Service (Port 8083)
Write-Host "3. Starting Severity Service (Port 8083)..." -ForegroundColor Green
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", ". $VENV_ACTIVATE; cd c:\Intel\road-defect-api\severity-service; python main.py" -WindowStyle Minimized

# 4. Export Service (Port 8082)
Write-Host "4. Starting Export Service (Port 8082)..." -ForegroundColor Green
# Export service might have its own venv or use global/backend. Assuming backend venv for now or its own if it had one.
# Looking at file list, it has requirements.txt but no venv dir visible in top level list_dir.
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", ". $VENV_ACTIVATE; cd c:\Intel\road-defect-api\export-service; python -m uvicorn main:app --reload --port 8082" -WindowStyle Minimized

# 5. Dashboard Backend (Port 8084)
Write-Host "5. Starting Dashboard Backend (Port 8084)..." -ForegroundColor Green
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", ". $VENV_ACTIVATE; cd c:\Intel\road-defect-api\dashboard-backend; python main.py" -WindowStyle Minimized

# 6. Priority Service (Port 3000)
Write-Host "6. Starting Priority Service (Port 3000)..." -ForegroundColor Green
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd c:\Intel\road-defect-api\priority-service; npm run start:dev" -WindowStyle Minimized

# 7. Dashboard Frontend (Port 5173)
Write-Host "7. Starting Dashboard Frontend..." -ForegroundColor Green
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd c:\Intel\road-defect-api\dashboard-frontend; npm run dev"

Write-Host "All services launched!" -ForegroundColor Cyan
Write-Host "Dashboard: http://localhost:5173"
