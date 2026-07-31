# 3.13-slim: matches the CI python version (test what you ship) and keeps the
# image small. libsndfile1 + ffmpeg are needed by soundfile/librosa at runtime.
FROM python:3.13-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends libsndfile1 ffmpeg libpq5 gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

# .dockerignore keeps .env, .venv, test.db, uploads, and outputs out of the image.
COPY . .

# Run as a non-root user — a compromised app process shouldn't own the container.
RUN useradd --create-home appuser \
    && mkdir -p app/outputs/sessions \
    && chown -R appuser:appuser /usr/src/app
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
