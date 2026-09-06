FROM python:3.12-slim

# osm2pgsql (flex/Lua), psql, curl — hepsi ithal hattinin parcasi
RUN apt-get update && apt-get install -y --no-install-recommends \
      osm2pgsql postgresql-client curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
# flex'teki centroid() cagirilari >= 1.9 ister
RUN osm2pgsql --version 2>&1 | grep -Eq 'version (1\.(9|1[0-9])|2\.)' || (echo "osm2pgsql >= 1.9 gerekli" && exit 1)

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN chmod +x run_import.sh osm_import.sh && mkdir -p /work && chown 1000:1000 /work

USER 1000
ENV PYTHONUNBUFFERED=1 WORK_DIR=/work HOME=/work
ENTRYPOINT ["/app/run_import.sh"]
