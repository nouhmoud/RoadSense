from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import json

app = FastAPI(
    title="ExportSIG Service",
    description="Microservice for exporting road defect data to GIS formats (GeoJSON).",
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

# Database Configuration
DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
DB_PORT = os.getenv("POSTGRES_PORT", "5433")
DB_NAME = os.getenv("POSTGRES_DB", "geodb")
DB_USER = os.getenv("POSTGRES_USER", "postgres")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")

def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        return conn
    except Exception as e:
        print(f"Database connection failed: {e}")
        raise HTTPException(status_code=500, detail="Database connection failed")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "export-service"}

@app.get("/export/map", summary="Export road anomalies as GeoJSON")
def export_map_geojson():
    """
    Exports all active road anomalies as a GeoJSON FeatureCollection.
    Compatible with QGIS, ArcGIS, and web maps.
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # We use ST_AsGeoJSON to let PostGIS handle the geometry serialization
        query = """
            SELECT 
                anomaly_id,
                class_name,
                confidence,
                road_segment_id,
                timestamp,
                ST_AsGeoJSON(geom)::json as geometry
            FROM road_anomalies;
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        
        features = []
        for row in rows:
            feature = {
                "type": "Feature",
                "geometry": row["geometry"],
                "properties": {
                    "anomaly_id": row["anomaly_id"],
                    "class_name": row["class_name"],
                    "confidence": row["confidence"],
                    "road_segment_id": row["road_segment_id"],
                    "timestamp": str(row["timestamp"])
                }
            }
            features.append(feature)
            
        geojson_response = {
            "type": "FeatureCollection",
            "name": "Road Defects",
            "crs": { 
                "type": "name", 
                "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } 
            },
            "features": features
        }
        
        return Response(
            content=json.dumps(geojson_response),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=road_defects.geojson"}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/export/kml", summary="Export road anomalies as KML (Google Earth)")
def export_map_kml():
    """
    Exports road anomalies as KML for Google Earth.
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        query = """
            SELECT 
                anomaly_id, class_name, confidence, road_segment_id, timestamp, 
                ST_X(geom) as lon, ST_Y(geom) as lat 
            FROM road_anomalies;
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        
        kml_header = """<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Road Defects</name>
"""
        kml_body = ""
        for row in rows:
            color = "ff0000ff" # Red (KML is aabbggrr)
            if row['class_name'] == 'Crack': color = "ff00ffff" # Yellow
            
            kml_body += f"""
    <Placemark>
      <name>{row['class_name']}</name>
      <description>
        <![CDATA[
          <b>Use ID:</b> {row['road_segment_id']}<br>
          <b>Confidence:</b> {row['confidence']}<br>
          <b>Time:</b> {row['timestamp']}
        ]]>
      </description>
      <Style>
        <IconStyle>
          <color>{color}</color>
          <scale>1.1</scale>
        </IconStyle>
      </Style>
      <Point>
        <coordinates>{row['lon']},{row['lat']}</coordinates>
      </Point>
    </Placemark>
"""
        kml_footer = """  </Document>
</kml>"""
        
        return Response(
            content=kml_header + kml_body + kml_footer, 
            media_type="application/vnd.google-earth.kml+xml",
            headers={"Content-Disposition": "attachment; filename=road_defects.kml"}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/wfs", summary="Simple WFS 2.0 GetFeature Endpoint")
def wfs_service(
    service: str = "WFS",
    version: str = "2.0.0",
    request: str = "GetCapabilities",
    typename: str = None
):
    """
    Simulates a basic WFS service for QGIS connection.
    Supports GetCapabilities and GetFeature (returns GeoJSON).
    """
    # Force GeoJSON export for GetFeature requests as it's efficient and QGIS supports it
    if request.lower() == "getfeature":
        return export_map_geojson()
        
    # Basic Capabilities Response
    capabilities_xml = """<?xml version="1.0" encoding="UTF-8"?>
<wfs:WFS_Capabilities version="2.0.0" xmlns:wfs="http://www.opengis.net/wfs/2.0" xmlns:ows="http://www.opengis.net/ows/1.1">
  <ows:ServiceIdentification>
    <ows:Title>Road Defect WFS</ows:Title>
  </ows:ServiceIdentification>
  <wfs:FeatureTypeList>
    <wfs:FeatureType>
      <wfs:Name>road_defects</wfs:Name>
      <wfs:Title>Road Defects</wfs:Title>
      <wfs:DefaultCRS>urn:ogc:def:crs:EPSG::4326</wfs:DefaultCRS>
    </wfs:FeatureType>
  </wfs:FeatureTypeList>
</wfs:WFS_Capabilities>
"""
    return Response(content=capabilities_xml, media_type="text/xml")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8082)
