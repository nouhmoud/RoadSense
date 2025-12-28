from minio import Minio
from minio.error import S3Error
import json
import os

# Configuration (matcher les env vars du conteneur ou defaults)
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ROOT_USER", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_ROOT_PASSWORD", "minioadmin")
MINIO_BUCKET = "road-defects"

def init_bucket():
    # Initialiser le client
    client = Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=False
    )

    # 1. Créer le bucket
    found = client.bucket_exists(MINIO_BUCKET)
    if not found:
        client.make_bucket(MINIO_BUCKET)
        print(f"Bucket '{MINIO_BUCKET}' créé avec succès.")
    else:
        print(f"Bucket '{MINIO_BUCKET}' existe déjà.")

    # 2. Définir la politique publique (Lecture seule pour tous)
    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"AWS": ["*"]},
                "Action": ["s3:GetObject"],
                "Resource": [f"arn:aws:s3:::{MINIO_BUCKET}/*"]
            }
        ]
    }
    
    try:
        client.set_bucket_policy(MINIO_BUCKET, json.dumps(policy))
        print(f"Politique publique appliquée au bucket '{MINIO_BUCKET}'.")
    except S3Error as err:
        print(f"Erreur lors de la définition de la politique: {err}")

if __name__ == "__main__":
    try:
        init_bucket()
    except Exception as e:
        print(f"Erreur globale: {e}")
