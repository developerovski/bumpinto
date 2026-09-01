# Plan 5: CI + Docker + K8s Deploy

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Her push'ta test koşan CI, Docker imajları ve kullanıcının bare-metal K8s kümesine deploy manifest'leri.

**Architecture:** İki bağımsız pipeline (backend / frontend, path filtreli). İmajlar GHCR'a gider. K8s: `bumpinto` namespace — backend Deployment + web (nginx) Deployment + Ingress. Postgres kullanıcının kümesindeki mevcut kurulumdur (bu plan onu yönetmez — bağlantı Secret ile verilir).

**Ön koşul:** Plan 2 ve 3 `done` (Plan 4'e paralel yürüyebilir). GHCR erişimi ve kubeconfig kullanıcıda.

---

## Bu plana özel kurallar

- **INDEX güncelle**; **git yazma YOK**; komutlar `rtk` ile.
- Secret DEĞERLERİ asla dosyaya yazılmaz — manifest'ler yalnızca isim referanslar;
  `kubectl create secret` komutlarını KULLANICI çalıştırır.

---

### Task 1: GitHub Actions

**Files:**
- Create: `.github/workflows/backend.yml`
- Create: `.github/workflows/frontend.yml`

- [ ] **Step 1: backend.yml**

```yaml
name: backend

on:
  push:
    branches: [main]
    paths: ["backend/**", ".github/workflows/backend.yml"]
  pull_request:
    paths: ["backend/**"]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "21"
          cache: maven
      - name: Test (Testcontainers dahil)
        working-directory: backend
        run: mvn -B -q verify

  image:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      packages: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: backend
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/backend:latest
            ghcr.io/${{ github.repository }}/backend:${{ github.sha }}
```

- [ ] **Step 2: frontend.yml**

```yaml
name: frontend

on:
  push:
    branches: [main]
    paths: ["frontend/**", "package.json", "pnpm-*.yaml", ".github/workflows/frontend.yml"]
  pull_request:
    paths: ["frontend/**"]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @bumpinto/web exec tsc --noEmit
      - run: pnpm test:web
      - run: pnpm build:web

  image:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      packages: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: frontend/web/Dockerfile
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/web:latest
            ghcr.io/${{ github.repository }}/web:${{ github.sha }}
```

- [ ] **Step 3: Doğrulama** — kullanıcı push'lar; iki workflow da yeşil olmalı.
(Ajan push'layamaz — INDEX'e `blocked: kullanıcı push bekleniyor` yazıp bekle.)

- [ ] **Step 4: INDEX güncelle + Commit (kullanıcı)** — `ci: backend ve frontend pipelinelari`

---

### Task 2: Dockerfile'lar + tam yerel compose

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`
- Create: `frontend/web/Dockerfile`
- Create: `frontend/web/nginx.conf`
- Modify: `docker-compose.yml` (tam yığın)

- [ ] **Step 1: backend/Dockerfile** (multi-stage)

```dockerfile
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/backend-*.jar app.jar
EXPOSE 8080
USER 1000
ENTRYPOINT ["java", "-jar", "app.jar"]
```

`backend/.dockerignore`:

```
target/
```

- [ ] **Step 2: frontend/web/Dockerfile** (workspace bağlamı repo kökü!)

```dockerfile
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY frontend/shared ./frontend/shared
COPY frontend/web ./frontend/web
RUN pnpm install --frozen-lockfile && pnpm build:web

FROM nginx:1.27-alpine
COPY frontend/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/frontend/web/dist /usr/share/nginx/html
EXPOSE 80
```

- [ ] **Step 3: nginx.conf** (SPA fallback; API'yi Ingress yönlendirir)

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location = /healthz {
        return 200 "ok";
    }
}
```

- [ ] **Step 4: docker-compose.yml'i tam yığına genişlet** (mevcut postgres servisi korunur)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: bumpinto
      POSTGRES_USER: bumpinto
      POSTGRES_PASSWORD: bumpinto
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    build: ./backend
    depends_on: [postgres]
    environment:
      DB_URL: jdbc:postgresql://postgres:5432/bumpinto
      DB_USER: bumpinto
      DB_PASSWORD: bumpinto
      SPRING_PROFILES_ACTIVE: local
      TOKEN_SECRET: ${TOKEN_SECRET:-local-only-secret-change-me-0123456789}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:-dev-client-id}
      FOURSQUARE_API_KEY: ${FOURSQUARE_API_KEY:-}
      GOOGLE_PLACES_API_KEY: ${GOOGLE_PLACES_API_KEY:-}
    ports:
      - "8080:8080"

  web:
    build:
      context: .
      dockerfile: frontend/web/Dockerfile
    ports:
      - "5173:80"

volumes:
  pgdata:
```

- [ ] **Step 5: Doğrula** — Run: `rtk docker compose up --build -d` →
`curl -s localhost:8080/v3/api-docs | head -c 100` JSON döner; `curl -s localhost:5173/healthz` → ok.

- [ ] **Step 6: INDEX güncelle + Commit (kullanıcı)** — `build: docker imajlari + tam compose`

---

### Task 3: K8s manifest'leri

**Files:**
- Create: `deploy/k8s/namespace.yaml`
- Create: `deploy/k8s/backend.yaml`
- Create: `deploy/k8s/web.yaml`
- Create: `deploy/k8s/ingress.yaml`
- Create: `deploy/k8s/README.md`

- [ ] **Step 1: namespace.yaml**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: bumpinto
```

- [ ] **Step 2: backend.yaml**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: bumpinto
spec:
  replicas: 1 # >1 için Redis (STOMP relay + cache) gerekir — spec §3, bilinçli tek pod
  selector:
    matchLabels: { app: backend }
  template:
    metadata:
      labels: { app: backend }
    spec:
      containers:
        - name: backend
          image: ghcr.io/DEGISTIR_KULLANICI/bumpinto/backend:latest
          ports: [{ containerPort: 8080 }]
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: prod # preprod kümesinde/overlay'inde: preprod
          envFrom:
            - secretRef: { name: bumpinto-backend }
          readinessProbe:
            httpGet: { path: /v3/api-docs, port: 8080 }
            initialDelaySeconds: 15
          resources:
            requests: { cpu: 250m, memory: 512Mi }
            limits: { memory: 1Gi }
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: bumpinto
spec:
  selector: { app: backend }
  ports: [{ port: 80, targetPort: 8080 }]
```

- [ ] **Step 3: web.yaml**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: bumpinto
spec:
  replicas: 2
  selector:
    matchLabels: { app: web }
  template:
    metadata:
      labels: { app: web }
    spec:
      containers:
        - name: web
          image: ghcr.io/DEGISTIR_KULLANICI/bumpinto/web:latest
          ports: [{ containerPort: 80 }]
          readinessProbe:
            httpGet: { path: /healthz, port: 80 }
          resources:
            requests: { cpu: 50m, memory: 64Mi }
---
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: bumpinto
spec:
  selector: { app: web }
  ports: [{ port: 80 }]
```

- [ ] **Step 4: ingress.yaml** (nginx ingress + cert-manager varsayımı — kullanıcının kümesine göre uyarlanır)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: bumpinto
  namespace: bumpinto
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600" # WS
spec:
  ingressClassName: nginx
  tls:
    - hosts: [bumpinto.app, api.bumpinto.app]
      secretName: bumpinto-tls
  rules:
    - host: bumpinto.app
      http:
        paths:
          - path: /
            pathType: Prefix
            backend: { service: { name: web, port: { number: 80 } } }
    - host: api.bumpinto.app
      http:
        paths:
          - path: /
            pathType: Prefix
            backend: { service: { name: backend, port: { number: 80 } } }
```

- [ ] **Step 5: deploy/k8s/README.md** (kullanıcının çalıştıracağı komutlar)

```markdown
# Deploy

Secret'ı SEN oluşturursun (değerler asla repoya girmez):

    kubectl -n bumpinto create secret generic bumpinto-backend \
      --from-literal=DB_URL='jdbc:postgresql://<pg-host>:5432/bumpinto' \
      --from-literal=DB_USER='bumpinto' \
      --from-literal=DB_PASSWORD='<sifre>' \
      --from-literal=TOKEN_SECRET='<en-az-32-bayt-rastgele>' \
      --from-literal=GOOGLE_CLIENT_ID='<web-client-id>' \
      --from-literal=FOURSQUARE_API_KEY='<key>' \
      --from-literal=GOOGLE_PLACES_API_KEY='<key>'

Uygulama:

    kubectl apply -f deploy/k8s/

Notlar:
- İmaj yollarındaki DEGISTIR_KULLANICI → GitHub kullanıcı/org adın.
- Postgres kümendeki mevcut kurulum; Flyway migration'ı backend açılışta uygular.
- Backend replicas=1: yatay ölçek için önce Redis (cache + STOMP relay) — spec §3.
- Preprod ortamı: aynı manifest'ler `bumpinto-preprod` namespace + `preprod.bumpinto.app`
  / `api.preprod.bumpinto.app` host'ları + `SPRING_PROFILES_ACTIVE=preprod` ile uygulanır;
  web imajı `pnpm build:web:preprod` çıktısından üretilir.
- Web build'i API'yi same-origin bekler; ayrı api.bumpinto.app kullanıyorsan web
  imajını `VITE_API_URL=https://api.bumpinto.app` ve `VITE_WS_URL=wss://api.bumpinto.app/ws`
  build-arg'larıyla üret (Dockerfile'a ARG eklenerek — tek satırlık iş, ihtiyaçta).
```

- [ ] **Step 6: Kuru doğrulama** — Run: `rtk kubectl apply --dry-run=client -f deploy/k8s/`
Expected: 5 kaynak `created (dry run)`.

- [ ] **Step 7: INDEX güncelle + Commit (kullanıcı)** — `deploy: k8s manifestleri`

---

### Task 4: Yayın kontrol listesi + kapanış

- [ ] **Step 1: Kullanıcıyla yayın kontrol listesini geç** (ajan listeyi sunar, kullanıcı işaretler):
  - [ ] Domain DNS → ingress IP (bumpinto.app, api.bumpinto.app)
  - [ ] Google OAuth client'ları (web + iOS + Android) ve doğru redirect/bundle kimlikleri
  - [ ] Foursquare + Google Places API anahtarları ve kota alarmları
  - [ ] `kubectl apply` + secret oluşturma yapıldı; `/v3/api-docs` dışarıdan yanıt veriyor
  - [ ] Web'den uçtan uca gerçek akış: kur → katıl → kaydır → karar
  - [ ] EAS internal build TestFlight/APK dağıtıldı (Plan 4 Task 7)
- [ ] **Step 2: INDEX'te Plan 5'i `done` yap; tüm planlar `done` ise kullanıcıya MVP'nin
  tamamlandığını raporla + Commit (kullanıcı)** — `deploy: yayin kontrol listesi`

---

## Plan sonu doğrulaması

- [ ] Spec §8 Deploy bölümüyle birebir: Docker → bare-metal K8s, GH Actions (rtk),
  web statik + backend container, EAS.
- [ ] Secret hijyeni: hiçbir gerçek değer repoda değil; AGENTS.md `.env` kuralı korunuyor.
