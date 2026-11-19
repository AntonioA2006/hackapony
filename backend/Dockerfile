FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PHOTOS_PATH=/data/photos \
    PORT=8000

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p /data/photos

EXPOSE 8000

# La API no migra ni carga el paquete INEGI al arrancar.
# En Compose lo hace el servicio `migrate`: `alembic upgrade head && python -m scripts.load_inegi_seed`.
# En un hosting de un solo contenedor, ese mismo comando es el release y este CMD es el start.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
