FROM python:3.12-slim

# Keep output immediate
ENV PYTHONUNBUFFERED=1
RUN pip install --no-cache-dir "fastapi>=0.124.0" "uvicorn[standard]>=0.22.0"

WORKDIR /app

# Copy app sources
COPY backend/ backend/
COPY frontend/ frontend/

# Expose port
EXPOSE 8000

# Ensure data directory exists at /app/data (sibling to backend/ and frontend/)
RUN mkdir -p /app/data
VOLUME ["/app/data"]

# Run the ASGI server
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
