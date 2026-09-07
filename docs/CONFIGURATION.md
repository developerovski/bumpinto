# BumpInto — Yapılandırma ve Sırlar

Her anahtarın **nereye** ve **nasıl** konduğu, ortam ortam. Mimari gerekçe için
[`backend/ARCHITECTURE.md`](../backend/ARCHITECTURE.md) §12.

> **Bu dosyaya asla gerçek değer yazılmaz.** Backend `.env` dosyası okumaz; yapılandırma yalnız
> `application*.yml`'den gelir. Değer taşıyan tek yerel dosya `backend/config/application-local.yml`'dir
> (`.gitignore`'da). Prod değerleri yalnızca K8s Secret'ında yaşar ve ortam değişkeni olarak gelir.

---

## 1. Anahtar envanteri

| Değişken | Nedir | Nereden alınır | Sır mı? |
|---|---|---|---|
| `GOOGLE_CLIENT_ID` | OAuth **Web** client id | Google Cloud → Credentials → OAuth client ID → Web application | Hayır (herkese açık), ama yanlışı girişi kırar |
| `TOKEN_SECRET` | Kendi JWT'lerimizin HMAC anahtarı | **Siz üretirsiniz** — `openssl rand -base64 48` | **Evet** |
| `FOURSQUARE_API_KEY` | Places Service Key — **zorunlu**, Premium katman | FSQ Developer Console → proje → Settings → Service API Keys | **Evet** |
| `FSQ_PREMIUM_MONTHLY_BUDGET` | Foursquare Premium aylık çağrı bütçesi (varsayılan `5000`); dolunca `open` katmanına düşülür, uygulama çökmez | Bütçe planınıza göre siz belirlersiniz | Hayır |
| `GOOGLE_PLACES_API_KEY` | Places API (New) sunucu anahtarı — **opsiyonel**; `bumpinto.venues.sources.google.enabled=true` ise zorunlu, o durumda `MAP_ENGINE=google` da şart | Google Cloud → Keys & Credentials → API key | **Evet** |
| `DB_URL` / `DB_USER` / `DB_PASSWORD` | Postgres | — | Parola **evet** |
| `TRUST_FORWARDED_FOR` | XFF'e güven bayrağı | — | Hayır |
| `MAP_ENGINE` | Harita motoru seçimi: `maplibre` (açık, ücretsiz) veya `google` | — | Hayır |
| `MAP_TILES_STYLE_URL` | MapLibre tile stil URL'i (`MAP_ENGINE=maplibre` iken kullanılır) | Tile sağlayıcınızdan | Hayır |
| `GEOCODE_BASE_URL` | Geocode motorunun taban URL'i (kendi Nominatim-uyumlu sunucunuz olabilir) | — | Hayır |
| `OSRM_CAR_URL` / `OSRM_BICYCLE_URL` / `OSRM_FOOT_URL` | Profil başına OSRM `/table` taban URL'i; **boş = haversine tahminine düşülür** | Kendi OSRM sunucunuz | Hayır |
| `NOMINATIM_CONTACT` | Nominatim politikası gereği User-Agent'ta zorunlu iletişim adresi (varsayılan `dev@bumpinto.test`) | Preprod/prod'da gerçek bir adres verin | Hayır |
| `NOMINATIM_MIN_INTERVAL` | Nominatim'e en fazla 1 istek/saniye (ISO süre, varsayılan `PT1S`) | — | Hayır |
| `OVERTURE_RELEASE` | İthal işinin okuduğu Overture sürümü (örn. `2026-08-19.0`); yalnız `venues-open-import` CronJob'ında | https://docs.overturemaps.org/release/ | Hayır |
| `PBF_URL` | Geofabrik NL extract adresi; OSM ithali ve OSRM hazırlığı bunu kullanır | — | Hayır |
| `VOICE_MAX_DURATION` | Ses odasının azami süresi (ISO süre, varsayılan `PT2H`); `endsAt = min(şimdi + bu süre, oturumun bitişi)` | — | Hayır |
| `CLOUDFLARE_TURN_KEY_ID` | Cloudflare Realtime TURN anahtar kimliği | Cloudflare Dashboard → Realtime → TURN keys | Hayır |
| `CLOUDFLARE_TURN_API_TOKEN` | Cloudflare Realtime TURN API token'ı; boşsa/erişilemezse yalnız STUN ile devam edilir (`relay=false`) | Cloudflare Dashboard → Realtime → TURN keys | **Evet** |
| `RETENTION_ENABLED` | **İki** saklama işini birden açar/kapatır (varsayılan `true`): saatlik `VenueContentRetention` (sağlayıcı metadata'sını indirger) ve günlük `SessionPurgeJob` (spec §6 GDPR — süresi dolalı 30 günü geçen oturumları kalıcı siler). Prod'da kapatmak GDPR yükümlülüğünü askıya alır | — | Hayır |
| `SESSION_PURGE_CRON` | Oturum purge'ünün Spring cron ifadesi (6 alan: `saniye dakika saat gün ay haftagünü`, saat dilimi **UTC**); varsayılan `0 30 3 * * *` = her gece 03:30 UTC | — | Hayır |

**`TOKEN_SECRET` en az 32 bayt olmalı** ([TokenService.java:33](../backend/src/main/java/com/bumpinto/infra/security/TokenService.java#L33)) —
kısa olursa uygulama açılışta patlar. Ortam başına farklı üretin: local ≠ preprod ≠ prod.

`NOMINATIM_CONTACT` artık iki yerde kullanılıyor: Nominatim User-Agent'ı **ve** Wikidata/Commons
toplu sorguları (`tools/venues-open/wikidata_photos.py`). Boş bırakılırsa ithal işi açılışta
patlar — Wikimedia politikası gerçek bir iletişim adresi ister.

### Frontend sır taşımaz

`frontend/web/.env.*` dosyaları **depoda takip edilir** çünkü içlerinde yalnız herkese açık değerler var:

```
VITE_API_URL / VITE_WS_URL     ← ortamın backend adresi; dev'de boş (vite proxy, same-origin)
VITE_GOOGLE_CLIENT_ID          ← OAuth Web client id; sır değil, her giriş sayfasına gömülür.
                                  Ortamın alan adı Google Cloud'da "Authorized JavaScript origins"da olmalı.
```

Harita motoru `/api/config`'ten gelir; varsayılan `maplibre` anahtarsızdır. `VITE_GOOGLE_MAPS_KEY` ve
`VITE_GOOGLE_MAPS_MAP_ID` **yalnız** `MAP_ENGINE=google` provasında okunur ve gitignore'daki
`.env.development.local` dosyasında durur. Web'e başka anahtar eklemeniz gereken durum yok; token'lar
HttpOnly cookie'de yaşar.

Harita motoru istemciye SUNUCUDAN gelir: `GET /api/config` (`mapEngine` `maplibre`|`google`,
`tiles.styleUrl`, `sources[]` — spec §7). `maplibre` motorunda Google anahtarı hiç okunmaz ve
Maps JS paketi hiç indirilmez; `google` motorunda anahtar + Map ID çifti gerekir. Uç
ulaşılamazsa istemci MapLibre + OpenFreeMap positron yedeğine düşer (harita yine render olur,
yalnız sağlayıcı atıf satırları boş kalır). Backend tarafında karşılığı `MAP_ENGINE` /
`MAP_TILES_STYLE_URL`. Geocode artık sunucu tarafında (`POST /api/geocode`, `/reverse`) —
istemci Nominatim'e doğrudan gitmez. `.env.*` dosyalarını yalnız KULLANICI düzenler.

---

## 2. Yerel geliştirme

### 2.1 Yerel değerleri yazın

Spring Boot çalışma dizinindeki `./config/` klasörünü kendiliğinden yükler ve classpath'taki
`application-local.yml`'i ezer. Gerçek değerler oraya yazılır, depodaki dosyaya değil:

```bash
mkdir -p backend/config
$EDITOR backend/config/application-local.yml
```

```yaml
bumpinto:
  security:
    google-client-id: <web-client-id>
    token-secret: <rastgele >= 32 bayt; openssl rand -base64 48>
  venues:
    sources:
      foursquare: { key: <Foursquare Service Key> }
```

`backend/config/` `.gitignore`'dadır. Doğrulayın:

```bash
git check-ignore -v backend/config/application-local.yml     # bir satır dönmeli
```

### 2.2 Postgres

```bash
docker compose up -d postgres              # 5432
```

**5432 başka bir projede doluysa** alternatif porta alın ve `backend/config/application-local.yml`'e yazın:

```bash
docker run -d --name bumpinto-postgres-alt -p 5434:5432 \
  -e POSTGRES_DB=bumpinto -e POSTGRES_USER=bumpinto -e POSTGRES_PASSWORD=bumpinto \
  -v bumpinto_pgdata:/var/lib/postgresql/data postgres:16-alpine
# config/application-local.yml:  spring.datasource.url: jdbc:postgresql://localhost:5434/bumpinto
```

### 2.3 Çalıştırın

```bash
cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 25) JENV_VERSION=25 mvn -o spring-boot:run
```

Spring `.env` dosyası okumaz. Öncelik sırası: gerçek ortam değişkeni > `./config/application-local.yml`
> classpath `application-local.yml` > `application.yml`. Kabukta eski bir `FOURSQUARE_API_KEY` export
edilmişse dosyadaki değeri ezer; `env | grep -E 'GOOGLE_|TOKEN_|FOURSQUARE'` boş olmalı.

> **Sırsız da açılır.** `local` profilinde `application-local.yml` sahte default'lar veriyor;
> uygulama ayağa kalkar ama **sağlayıcı çağrıları 401 alır** ve Google girişi çalışmaz.
> Deste testi için gerçek anahtar şart. `preprod`/`prod` profillerinde default yoktur —
> eksik sır = açılış hatası (bilinçli, fail-closed).

### 2.4 Web

```bash
pnpm dev:web        # .env.development boş VITE_API_URL kullanır → Vite proxy backend'e gider
```

### 2.5 Açık veri servisleri (isteğe bağlı)

Varsayılan `docker compose up -d postgres` yalnız PostGIS'i kaldırır; backend geocode ve rota
env'leri boşken public Nominatim'e ve haversine tahminine düşer. Gerçek servisleri istersen:

```bash
# OSRM verisini bir kez hazirla (~20-40 dk, ~6 GB disk)
docker compose --profile geo-prepare run --rm osrm-prepare

# Servisleri kaldir
docker compose --profile geo up -d
```

| Servis | Yerel adres | İlk açılış |
|---|---|---|
| Nominatim NL | `http://localhost:8070` | **1–3 saat** ithal (konteyner log'unda `Import finished`) |
| OSRM car / bicycle / foot | `http://localhost:5001` / `:5002` / `:5003` | hazırlık bitmişse saniyeler |

`backend/config/application-local.yml`'e:

```yaml
bumpinto:
  geocode:
    base-url: http://localhost:8070
  routing:
    osrm:
      car: http://localhost:5001
      bicycle: http://localhost:5002
      foot: http://localhost:5003
```

> **Uyarı:** `postgres` imajı `postgis/postgis:16-3.4`'e geçti. Düz `postgres:16-alpine` ile
> yaratılmış eski `pgdata` hacmi PostGIS taşımaz; `docker compose down -v` ile **yerel veriyi
> silerek** yeniden yaratman gerekir.

---

## 3. Nereye KOYMAYACAKSINIZ

| Yanlış | Neden |
|---|---|
| `GOOGLE_PLACES_API_KEY`'i web/mobil pakete koymak | Sunucu anahtarıdır; istemciye giden her şey okunabilir. Faturayı yabancılar öder. |
| iOS/Android OAuth client id'sini `GOOGLE_CLIENT_ID`'ye yazmak | Backend tek audience kabul eder ve Google `aud`'a **Web** client id'sini yazar → `audience mismatch`. |
| OAuth **client secret** aramak | Gerekmez. Yalnız Google'ın imzaladığı id_token doğrulanıyor, token takası yok. |
| Değerleri `application*.yml`'ye yazmak | Bu dosyalar depoda. Placeholder kalır, değer ortamdan gelir. |
| Prod sırlarını K8s manifest'ine yazmak | Manifest yalnız secret **adını** referanslar. Bkz. §5. |
| Aynı `TOKEN_SECRET`'ı her ortamda kullanmak | Preprod token'ı prod'da geçerli olur. |

---

## 4. Mobil (Plan 4 — henüz yazılmadı)

Üç OAuth client id oluşturulur, ama **yalnız biri backend'e gider**:

| Client | Nereye |
|---|---|
| **Web application** | `GOOGLE_CLIENT_ID` (backend) **ve** Expo'da `webClientId` |
| **iOS** (bundle id) | Yalnız Expo `iosClientId` |
| **Android** (package + SHA-1) | Yalnız Expo `androidClientId` |

Native id'ler backend'e hiç girmez — sebebi §3'teki `audience mismatch` satırı.
Google id_token cihazda saklanmaz; yalnız `/api/auth/google` takasında kullanılır.

---

## 5. preprod / prod (Plan 5)

Sırlar K8s Secret'ında yaşar; manifest yalnız adı referanslar
(`envFrom: [{ secretRef: { name: bumpinto-backend } }]`).

**Bu komutu kullanıcı çalıştırır, ajan değil:**

```bash
kubectl -n bumpinto create secret generic bumpinto-backend \
  --from-literal=DB_URL='jdbc:postgresql://...' \
  --from-literal=DB_USER='...' \
  --from-literal=DB_PASSWORD='...' \
  --from-literal=TOKEN_SECRET='<openssl rand -base64 48 çıktısı>' \
  --from-literal=GOOGLE_CLIENT_ID='<web-client-id>' \
  --from-literal=FOURSQUARE_API_KEY='<service-key>' \
  --from-literal=GOOGLE_PLACES_API_KEY='<places-key>'
```

Prod'a çıkmadan:

- Places anahtarına **IP restriction** ekleyin (cluster egress IP'si). Local'de "None"
  bırakmak kabul; prod'da değil.
- `TRUST_FORWARDED_FOR=true` **yalnızca** ingress'in `X-Forwarded-For`'u ezdiğini
  doğruladıktan sonra. Aksi halde rate limit baypas edilir.
- Google Cloud'da **bütçe uyarısı** kurun (§7).

---

## 6. Anahtar sızarsa

1. **Google Places:** Keys & Credentials → anahtarı sil, yenisini üret, kısıtla. Eski anahtar anında ölür.
2. **Foursquare:** Console → Service API Keys → revoke → yeni üret.
3. **`TOKEN_SECRET`:** yenisini üretip Secret'ı güncelleyin. **Tüm kimlikler düşer** —
   aynı sır hem hesap hem KATILIMCI token'larını imzalar (V6'dan beri katılımcı token'ı da
   imzalı bir JWT'dir, DB'de saklanmaz) ve oturum İÇİNDEKİ yetki de artık bu token'dan gelir:
   rotasyon anında host da kendi oturumunu yönetemez hâle gelir.
   **Hesabı olan** herkes toparlanır: yeniden giriş yapıp oturumu bir kez okur, sunucu
   katılımcı çerezini yeniden basar (koltuk sahipliği `participants.user_id` ile durur, V7) —
   koltuk korunur, mükerrer satır açılmaz. Mobilde aynı onarım katılım ucundan gelir: kimlik
   taşıyan katılım ikinci koltuk açmaz, aynı koltuğu ve taze token'ı döndürür.
   **ANONİM** katılan davetlinin ise kurtaracağı bir kimlik yoktur: yeniden katılır ve ikinci
   bir satır açar (orta noktayı bozar). Bu yüzden rotasyonu canlı oturum yokken yapın —
   oturum TTL'i 24 saat.
4. Her durumda: `kubectl rollout restart deployment/bumpinto-backend`.

---

## 7. Maliyet

Deste başına maliyet **~1,9¢**: `findVenues` deste kurarken tek bir Foursquare Premium
çağrısı yapar, sonrasını (shuffle, poll, runoff) onbellek ve yerel hesap karşılar. Açık
(open) katmana düşüldüğünde taban maliyet **$0**'dır — yalnız Premium çağrılar ücretlidir.

Kaba aylık tahmin (deste = ziyaret): **10k ziyaret ≈ $33–47/ay**, **100k ziyaret ≈
$250–470/ay**. Kaynak ve hesap detayı:
`docs/superpowers/specs/2026-09-06-google-maps-cost-plan.md` §7.3.

`FSQ_PREMIUM_MONTHLY_BUDGET` bir **güvenlik tavanıdır**, sert kesme değil: dolunca
`BudgetGate` sağlayıcıyı `open` katmana düşürür, uygulama çökmez ve arama boş dönmez —
yalnız sonuç kalitesi düşer. Google şu an **inaktif** (`bumpinto.venues.sources.google.enabled=false`
varsayılan); açılırsa `GOOGLE_PLACES_API_KEY` ve `MAP_ENGINE=google` şart olur.

W-12'den sonra harita motoru MapLibre + OpenFreeMap → Dynamic Maps örnek maliyeti **sıfır**;
Maps JS anahtarları tamamen kapatılabilir (Sign-In istemci kimliği kalır).

Frenler (dördü birlikte harcamayı sınırlar):

- `find-venues` uç noktasında **3/dk** rate limit.
- Arama sonuçları **30 dakika** onbelleklenir (aynı yarıçap kovası + aktivite türü).
- Boş sonuç **10 dakika** ayrı ve kısa ömürlü işaretlenir (seyrek bölgede kalıcı "mekan yok"
  olmaz).
- Aylık harcama `provider_usage` tablosunda tutulur; `BudgetGate` her çağrıdan önce bunu
  okur.

### 7.1 Açık taban (I-2 sonrası)

`venues_open` tablosu aylık `venues-open-import` CronJob'ıyla Overture Places NL + OSM NL'den
yeniden üretilir; sorgusu ücretsizdir ve kotası yoktur (`sources.open.budget = 0`). Ücretli
sağlayıcı yalnız Foursquare Premium'dur (`FSQ_PREMIUM_MONTHLY_BUDGET`). Sabit maliyet: küme
diskinde ~30 GB (bkz. `deploy/k8s/README.md`). Ayrıntılı maliyet:
`docs/superpowers/specs/2026-09-06-open-hybrid-venue-stack-design.md` §17.

---

## 8. Doğrulama kontrol listesi

Anahtarları koyduktan sonra bir kez koşun — ikisi de kapatılmamış borç:

- [ ] **Uygulama gerçek sırlarla açılıyor**
      `cd backend && mvn -o spring-boot:run` (değerler `backend/config/application-local.yml`'de)
- [ ] **Foursquare kategori ID'leri doğru.** `FoursquarePremiumContractTest`'i **gerçek
      anahtarla** koşun (`@EnabledIfEnvironmentVariable`) — yaklaşık 17 Premium çağrı, **~$0,32**
      maliyet. Yanlış ID hata vermez, yalnızca yanlış mekan listeler; testin yakaladığı budur.

- [ ] **Google çok-türlü `includedTypes` OR davranışı.** Yanlışsa sonuç **boş** döner:

      ```bash
      curl -s -X POST 'https://places.googleapis.com/v1/places:searchNearby' \
        -H 'Content-Type: application/json' -H "X-Goog-Api-Key: $GOOGLE_PLACES_API_KEY" \
        -H 'X-Goog-FieldMask: places.displayName,places.types' \
        -d '{"includedTypes":["swimming_pool","water_park"],"maxResultCount":10,
             "locationRestriction":{"circle":{"center":{"latitude":41.0082,"longitude":28.9784},
             "radius":5000}}}' | jq
      ```

      Hem havuz hem su parkı geliyorsa OR ✓. Boş dönerse `GooglePlacesVenueProvider.TYPES`
      tek türe indirilmeli.

- [ ] Sonuçlar `docs/superpowers/plans/INDEX.md`'deki açık maddelere işlendi.
