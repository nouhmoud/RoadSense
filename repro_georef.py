import requests
import json

url = "http://127.0.0.1:8088/georef"

payload = {
    "image_filename": "test_image.jpg",
    "gps_data": {
        "latitude": 43.501,
        "longitude": 1.001
    },
    "detections": [
        {
            "box": [100, 100, 200, 200],
            "confidence": 0.85,
            "class_name": "D00",
            "severity_score": 50.0,
            "severity_level": "MOYEN"
        }
    ]
}

try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
