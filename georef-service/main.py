from fastapi import FastAPI, HTTPException, Depends
from starlette.middleware.cors import CORSMiddleware
from typing import List, Dict, Any

# Imports from local app
from app.schemas.georef_schema import GeorefRequest, GeorefResponse, GeoreferencedAnomaly
from app.services.georef_service import perform_georeferencing, get_all_georeferenced_anomalies
from app.db.db_config import init_db, get_db
from sqlalchemy.orm import Session
import py_eureka_client.eureka_client as eureka_client

app = FastAPI(
    title="GeoRef Service",
    description="Microservice for map-matching and storing road defects in PostGIS.",
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
    """ Initialize PostGIS on startup. """
    try:
        init_db()
    except Exception as e:
        print(f"CRITICAL: PostGIS initialization failed. {e}")
    
    # Eureka Registration
    await eureka_client.init_async(
        eureka_server="http://discovery-service:8761/eureka",
        app_name="roadsense-georef",
        instance_port=8081
    )

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "georef-service"}

@app.post(
    "/georef", 
    summary="Georeference detected defects and store in PostGIS",
    response_model=GeorefResponse
)
async def georeference_anomalies(
    request: GeorefRequest,
    db: Session = Depends(get_db)
):
    """
    Map-matches detections to the road network (OSM) and stores them in PostGIS.
    """
    if not request.detections:
        return GeorefResponse(
            processed_detections_count=0, 
            anomalies=[], 
            message="No detections provided."
        )

    try:
        anomalies_list = perform_georeferencing(db, request.gps_data, request.detections)
        
        return GeorefResponse(
            processed_detections_count=len(anomalies_list),
            anomalies=anomalies_list,
            message=f"{len(anomalies_list)} detections georeferenced and stored."
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Georeferencing error: {e}")

from app.schemas.georef_schema import GpsCoordinates
from app.services.georef_service import perform_map_matching

@app.get(
    "/georef/resolve",
    summary="Resolve GPS coordinates to a road/zone name",
    response_model=Dict[str, str]
)
async def resolve_coordinates(
    lat: float,
    lon: float
):
    """
    Reverse geocoding: takes lat/lon and returns the estimated road/zone name.
    """
    try:
        # Create a temporary GpsCoordinates object
        gps_point = GpsCoordinates(latitude=lat, longitude=lon)
        # Reuse existing map matching logic
        _, _, road_name = perform_map_matching(gps_point)
        return {"road_name": road_name}
    except Exception as e:
        print(f"Resolve error: {e}")
        # Return a fallback if it fails, don't crash the UI request
        return {"road_name": f"Unknown ({lat}, {lon})"}

@app.get(
    "/georef/history",
    summary="Get full history of georeferenced anomalies (PostGIS)",
    response_model=List[Dict[str, Any]]
)
async def get_georef_history(
    db: Session = Depends(get_db)
):
    """
    Returns all anomalies stored in PostGIS.
    """
    return get_all_georeferenced_anomalies(db)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)
