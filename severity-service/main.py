from fastapi import FastAPI, HTTPException
from starlette.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
import uvicorn

# Imports from local app
from app.services.severity_service import calculate_severity_score
# Using generic Dict for input to avoid strict dependency on DetectionSchema if not fully needed, 
# or we can use the schema if validation is required.
# For simplicity and flexibility in microservices, we often accept Dicts or define local schemas.
# Here we will accept List[Dict] as in the original code.

app = FastAPI(
    title="Severity Service",
    description="Microservice for calculating defect severity using XGBoost/Heuristics.",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "severity-service"}

@app.post(
    "/severity/compute",
    summary="Compute severity score for detections",
    response_model=List[Dict[str, Any]]
)
async def compute_severity(
    detections: List[Dict[str, Any]]
):
    """
    Calculates severity (Score 0-100 and Level) for a list of detections.
    """
    try:
        results = calculate_severity_score(detections)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Severity computation error: {e}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8083)
