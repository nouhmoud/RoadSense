from ultralytics import YOLO
import os
from PIL import Image
import io
import numpy as np

# Le chemin du modèle est calculé en remontant d'un niveau (..) depuis 'services'
# puis en allant dans 'models' pour trouver 'best.pt'
MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'models', 'best.pt')

model = None
# Les noms des classes basés sur l'index de votre modèle
CLASS_NAMES = ['Pothole', 'Crack', 'Open_Manhole'] 

def load_yolo_model():
    """
    Charge le modèle YOLOv8 une seule fois.
    """
    global model
    if model is None:
        try:
            print(f"Chargement du modèle depuis: {MODEL_PATH}")
            model = YOLO(MODEL_PATH)
            print("Modèle YOLOv8 chargé avec succès.")
            return model
        except Exception as e:
            print(f"Erreur lors du chargement du modèle YOLOv8: {e}")
            raise RuntimeError(f"Impossible de charger le modèle: {e}")
    return model

def perform_detection(image_bytes: bytes):
    """
    Effectue la détection sur l'image fournie en bytes.
    """
    try:
        yolo_model = load_yolo_model()

        # Charger l'image depuis les bytes
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # Effectuer la prédiction avec le seuil de confiance de 0.35
        results = yolo_model.predict(
            source=image,
            conf=0.35, 
            iou=0.7,   
            verbose=False,
            imgsz=640 
        )
        
        result = results[0]

        # Préparer la réponse JSON
        json_results = []
        
        if result.boxes is not None:
            for box in result.boxes:
                x1, y1, x2, y2 = [round(x) for x in box.xyxy[0].tolist()]
                confidence = round(box.conf[0].item(), 4)
                class_id = int(box.cls[0].item())
                class_name = result.names.get(class_id, CLASS_NAMES[class_id] if class_id < len(CLASS_NAMES) else f"Unknown_Class_{class_id}")
                
                json_results.append({
                    "box": [x1, y1, x2, y2],
                    "confidence": confidence,
                    "class_id": class_id,
                    "class_name": class_name
                })

        # Préparer l'image annotée
        annotated_image = result.plot() 
        # Convertir BGR (YOLO/OpenCV) en RGB (PIL)
        annotated_image_pil = Image.fromarray(annotated_image[..., ::-1])
        
        # Sauvegarder l'image annotée en bytes (JPEG)
        img_byte_arr = io.BytesIO()
        annotated_image_pil.save(img_byte_arr, format='JPEG')
        annotated_image_bytes = img_byte_arr.getvalue()

        return json_results, annotated_image_bytes
    
    except RuntimeError as e:
        raise e
    except Exception as e:
        print(f"Erreur lors de la détection: {e}")
        return [], b''