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

# Migraciones + servidor. En hosting gratuito (una sola instancia, sin pre-deploy) es aceptable migrar al arrancar;
# con varias réplicas, mover `alembic upgrade head` a un job de despliegue (arquitectura §3, H7).
CMD ["sh", "-c", "alembic upgrade head && python -m scripts.load_inegi_seed && uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'"]
