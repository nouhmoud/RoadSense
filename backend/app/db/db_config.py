# app/db/db_config.py

import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# --- Variables d'Environnement PostGIS ---
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
POSTGRES_DB = os.getenv("POSTGRES_DB", "geodb")
# NOTE: Le HOST doit correspondre à votre configuration (ex: 'localhost' si non Docker Compose)
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost") 
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5433")

# URL de connexion à PostgreSQL/PostGIS
DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

# Création du moteur SQLAlchemy (Utilisez l'URL ci-dessus)
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """ 
    Initialise la base de données : vérifie la connexion 
    et s'assure que l'extension PostGIS est activée.
    """
    try:
        with engine.connect() as connection:
            # Vérifier si l'extension postgis est activée.
            # Suppression de l'affectation à 'result' pour éviter l'avertissement SonarLint.
            connection.execute(
                text("SELECT PostGIS_Version();")
            )
            print("INFO: Connexion PostGIS réussie. Extension active.")

    except Exception as e:
        print(f"ERREUR CRITIQUE: Échec de la connexion ou de l'initialisation PostGIS. Assurez-vous que le service 'postgis' est démarré. Erreur: {e}")
        # Si vous voulez que l'API plante sans DB : raise e
        
# Dépendance pour FastAPI
def get_db():
    """ 
    Générateur de dépendance pour FastAPI : ouvre et ferme une session DB. 
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        # Assure la fermeture de la session après chaque requête
        db.close()