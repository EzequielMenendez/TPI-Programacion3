FROM python:3.12-slim

WORKDIR /app

# Dependencias mínimas del sistema para healthchecks y herramientas de red
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependencias de Python sin caché
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código de la API, migraciones de Alembic y scripts
COPY . .

EXPOSE 8000

# Aplicar migraciones pendientes e iniciar el servidor asincrónico Uvicorn
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]
