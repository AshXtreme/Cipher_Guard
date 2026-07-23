# Stage 1: Build dependencies
FROM python:3.11-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Final minimal production image
FROM python:3.11-slim

WORKDIR /app

# Create non-root user and group
RUN groupadd -g 10001 cipherguard && \
    useradd -u 10000 -g cipherguard -s /bin/sh cipherguard

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Copy application source code
COPY backend/ ./backend/
COPY data/ ./data/

# Adjust permissions
RUN chown -R cipherguard:cipherguard /app

# Switch to non-root user
USER cipherguard

ENV PYTHONUNBUFFERED=1
ENV PORT=8000

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000"]
