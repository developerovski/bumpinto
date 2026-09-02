# BumpInto

Buluşma orta noktası uygulaması: oturum kur → davet linki → mekan destesini kaydır → ortak karar.

## Nereye bakmalı

| İhtiyaç | Dosya |
|---|---|
| **Anahtarları nereye koyacağım** (Google, Foursquare, DB) | [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md) |
| Backend nasıl kurulmuş — katmanlar, güvenlik, zorlanan kurallar | [`backend/ARCHITECTURE.md`](backend/ARCHITECTURE.md) |
| API referansı (uç noktalar, gövdeler, rate limit) | `backend/.infra/bumpinto-collection/` (Bruno) |
| Ne yapıldı, sırada ne var | [`docs/superpowers/plans/INDEX.md`](docs/superpowers/plans/INDEX.md) |
| Ürün gereksinimi | [`docs/superpowers/specs/`](docs/superpowers/specs/) |
| AI ajanları için politika | [`AGENTS.md`](AGENTS.md) |

Arayüz tasarımının kaynağı **Claude Design**'dır (repodaki kod değil) — proje id'leri Plan 3 ve
Plan 4'ün "UI Kaynağı" bölümlerinde.

## Hızlı başlangıç

```bash
# 1) Sırlar
cp backend/.env.example backend/.env.local && $EDITOR backend/.env.local

# 2) Veritabanı
docker compose up -d postgres

# 3) Backend
set -a && source backend/.env.local && set +a
cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 mvn -o spring-boot:run

# 4) Web (repo kökünden, ayrı terminal)
pnpm install && pnpm dev:web
```

Testler ve ortama özgü tuzaklar (jenv, Testcontainers/ryuk, bayat `target/classes`):
[`backend/ARCHITECTURE.md` §15](backend/ARCHITECTURE.md).

## Yapı

```text
backend/     Spring Boot 4.1 · Java 25 · Postgres + Flyway · hexagonal
frontend/
  shared/    OpenAPI'den üretilen tipli axios client
  web/       React + Vite — katılım tarafı (giriş yok)
  mobile/    Expo RN — host uygulaması (Plan 4)
docs/        spec, planlar, yapılandırma
```
