from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict, Any, List

def get_aggregated_stats(db: Session) -> Dict[str, Any]:
    """
    Retrieves aggregated dashboard statistics from PostGIS.
    """
    
    # 1. KPI: Total Detects & Average Confidence
    KPI_QUERY = text("""
        SELECT 
            COUNT(*) as total_count,
            AVG(confidence) as avg_confidence
        FROM road_anomalies;
    """)
    kpi_result = db.execute(KPI_QUERY).fetchone()
    total_count = kpi_result[0] or 0
    avg_confidence = round(float(kpi_result[1] or 0), 2)

    # 2. Chart: Distribution by Class
    CLASS_QUERY = text("""
        SELECT class_name, COUNT(*) as count 
        FROM road_anomalies 
        GROUP BY class_name;
    """)
    class_rows = db.execute(CLASS_QUERY).fetchall()
    class_dist = {row[0]: row[1] for row in class_rows}

    # 3. Chart: Top 5 Worst Roads (Most Defects)
    ROADS_QUERY = text("""
        SELECT road_segment_id, COUNT(*) as count 
        FROM road_anomalies 
        WHERE road_segment_id IS NOT NULL
        GROUP BY road_segment_id 
        ORDER BY count DESC 
        LIMIT 5;
    """)
    road_rows = db.execute(ROADS_QUERY).fetchall()
    top_roads = [{"name": row[0], "count": row[1]} for row in road_rows]

    # 4. Chart: Timeline (Last 6 Months)
    # Note: Requires 'timestamp' column to be TIMESTAMP type.
    TIMELINE_QUERY = text("""
        SELECT TO_CHAR(timestamp, 'YYYY-MM') as month, COUNT(*) as count
        FROM road_anomalies
        GROUP BY month
        ORDER BY month DESC
        LIMIT 6;
    """)
    try:
        timeline_rows = db.execute(TIMELINE_QUERY).fetchall()
        # Sort chronologically for the chart
        timeline_data = sorted([{"month": row[0], "count": row[1]} for row in timeline_rows], key=lambda x: x['month'])
    except Exception:
        # Fallback if timestamp casting fails or column issue
        timeline_data = []

    return {
        "kpi": {
            "total_defects": total_count,
            "avg_confidence": avg_confidence,
            "risk_score": 0 # Placeholder for severity logic if needed
        },
        "charts": {
            "class_distribution": class_dist,
            "top_roads": top_roads,
            "timeline": timeline_data
        }
    }
