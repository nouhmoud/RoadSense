FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for GeoPandas and PostGIS (GDAL, PROJ, GEOS)
RUN apt-get update && apt-get install -y \
    gdal-bin \
    libgdal-dev \
    python3-gdal \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8081

CMD ["python", "main.py"]
