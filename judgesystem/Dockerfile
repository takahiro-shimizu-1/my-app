FROM python:3.12-slim AS base

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY pyproject.toml .
RUN pip install --no-cache-dir ".[all]"

# Copy application
COPY src/ src/
COPY data/ data/

# Production stage
FROM base AS production
ENV PYTHONUNBUFFERED=1
ENTRYPOINT ["judgesystem"]

# Development stage
FROM base AS development
RUN pip install --no-cache-dir ".[dev]"
COPY tests/ tests/
CMD ["pytest", "-v"]
