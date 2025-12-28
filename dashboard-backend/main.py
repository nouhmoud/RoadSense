from fastapi import FastAPI, HTTPException, Depends
from starlette.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uvicorn
import py_eureka_client.eureka_client as eureka_client

# Imports from local app
from app.services.dashboard_service import get_aggregated_stats
from app.db.db_config import init_db, get_db

app = FastAPI(
    title="Dashboard Backend Service",
    description="Microservice for checking aggregated stats from PostGIS.",
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

@app.on_event("startup")
async def startup_event():
    """ Initialize DB connection on startup. """
    try:
        init_db()
    except Exception as e:
        print(f"CRITICAL: PostGIS initialization failed. {e}")
    
    # Eureka Registration
    await eureka_client.init_async(
        eureka_server="http://discovery-service:8761/eureka",
        app_name="roadsense-dashboard-be",
        instance_port=8084
    )

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "dashboard-backend"}

@app.get("/dashboard-stats", summary="Get aggregated dashboard statistics")
async def get_dashboard_statistics(
    db: Session = Depends(get_db)
):
    """
    Returns KPIs and chart data from PostGIS.
    """
    try:
        stats = get_aggregated_stats(db)
        return stats
    except Exception as e:
        print(f"Error fetching dashboard stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8084)
