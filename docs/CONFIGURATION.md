# BumpInto — Yapılandırma ve Sırlar

Her anahtarın **nereye** ve **nasıl** konduğu, ortam ortam. Mimari gerekçe için
[`backend/ARCHITECTURE.md`](../backend/ARCHITECTURE.md) §12.

> **Bu dosyaya asla gerçek değer yazılmaz.** Değer taşıyan tek yerel dosya `backend/.env.local`'dir
> ve `.gitignore` onu yoksayar. Prod değerleri yalnızca K8s Secret'ında yaşar.

---

## 1. Anahtar envanteri

| Değişken | Nedir | Nereden alınır | Sır mı? |
|---|---|---|---|
| `GOOGLE_CLIENT_ID` | OAuth **Web** client id | Google Cloud → Credentials → OAuth client ID → Web application | Hayır (herkese açık), ama yanlışı girişi kırar |
| `TOKEN_SECRET` | Kendi JWT'lerimizin HMAC anahtarı | **Siz üretirsiniz** — `openssl rand -base64 48` | **Evet** |
| `FOURSQUARE_API_KEY` | Places Service Key | FSQ Developer Console → proje → Settings → Service API Keys | **Evet** |
| `GOOGLE_PLACES_API_KEY` | Places API (New) sunucu anahtarı | Google Cloud → Keys & Credentials → API key | **Evet** |
| `DB_URL` / `DB_USER` / `DB_PASSWORD` | Postgres | — | Parola **evet** |
| `TRUST_FORWARDED_FOR` | XFF'e güven bayrağı | — | Hayır |
| `PROVIDER_QUOTA_REFRESH` | Kota scheduler aralığı (ISO süre, varsayılan `PT5M`) | — | Hayır |
| `GOOGLE_MONTHLY_BUDGET` | Nearby Search için **sert** aylık tavan (varsayılan `1000` — açılış maliyet modeli §5.A.5: Google'ın ücretsiz aylık katmanı, sonrası $35/1000). Google kota telemetrisi vermediği için kota = bütçe − yerel sayaç; aşılırsa istek atılmaz, orkestratör Foursquare'e düşer | Cloud Console → Maps Platform → Quotas'taki ücretsiz hakkına ya da harcamak istediğine göre | Hayır |
| `GOOGLE_PHOTO_MONTHLY_BUDGET` | Place Photo medya çağrıları için **ayrı SKU**'lu sert tavan (varsayılan `1000` — 1.000 ücretsiz/ay, sonrası $7/1000). Bitince foto çözülmez, `photoUrl` null gelir, kart monograma düşer; arama etkilenmez | Cloud Console → Maps Platform → Quotas | Hayır |
| `NOMINATIM_CONTACT` | Nominatim politikası gereği User-Agent'ta zorunlu iletişim adresi (varsayılan `dev@bumpinto.test`) | Preprod/prod'da gerçek bir adres verin | Hayır |
| `NOMINATIM_MIN_INTERVAL` | Nominatim'e en fazla 1 istek/saniye (ISO süre, varsayılan `PT1S`) | — | Hayır |

**`TOKEN_SECRET` en az 32 bayt olmalı** ([TokenService.java:33](../backend/src/main/java/com/bumpinto/infra/security/TokenService.java#L33)) —
kısa olursa uygulama açılışta patlar. Ortam başına farklı üretin: local ≠ preprod ≠ prod.

### Frontend hiçbir anahtar taşımaz

`frontend/web/.env.*` dosyaları **depoda takip edilir** çünkü içlerinde yalnız public URL var:

```
VITE_API_URL / VITE_WS_URL     ← sadece bunlar, sır değil
```

`.gitignore` bu üç dosya için özel negasyon taşır. Web'e anahtar eklemeniz gereken **hiçbir**
durum yok — web katılım tarafıdır, giriş yapmaz, token'lar HttpOnly cookie'de yaşar.

---

## 2. Yerel geliştirme

### 2.1 Şablonu kopyalayın

```bash
cp backend/.env.example backend/.env.local
$EDITOR backend/.env.local          # değerleri doldurun
```

`.env.local` `.gitignore` tarafından yakalanır (`.env.*` deseni). Doğrulayın:

```bash
git check-ignore -v backend/.env.local     # bir satır dönmeli
```

### 2.2 Postgres

```bash
docker compose up -d postgres              # 5432
```

**5432 başka bir projede doluysa** alternatif porta alın ve `.env.local`'e `DB_URL` ekleyin:

```bash
docker run -d --name bumpinto-postgres-alt -p 5434:5432 \
  -e POSTGRES_DB=bumpinto -e POSTGRES_USER=bumpinto -e POSTGRES_PASSWORD=bumpinto \
  -v bumpinto_pgdata:/var/lib/postgresql/data postgres:16-alpine
# .env.local: DB_URL=jdbc:postgresql://localhost:5434/bumpinto
```

### 2.3 Çalıştırın

```bash
set -a && source backend/.env.local && set +a
cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 25) JENV_VERSION=25 mvn -o spring-boot:run
```

`set -a` kabuk değişkenlerini otomatik **export** eder — Spring yalnız gerçek ortam
değişkenlerini görür, `.env` dosyalarını kendiliğinden okumaz. Bu satır olmadan değerler
uygulamaya ulaşmaz.

> **Sırsız da açılır.** `local` profilinde `application-local.yml` sahte default'lar veriyor;
> uygulama ayağa kalkar ama **sağlayıcı çağrıları 401 alır** ve Google girişi çalışmaz.
> Deste testi için gerçek anahtar şart. `preprod`/`prod` profillerinde default yoktur —
> eksik sır = açılış hatası (bilinçli, fail-closed).

### 2.4 Web

```bash
pnpm dev:web        # .env.development boş VITE_API_URL kullanır → Vite proxy backend'e gider
```

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
3. **`TOKEN_SECRET`:** yenisini üretip Secret'ı güncelleyin. **Tüm oturumlar düşer** —
   mevcut JWT'ler doğrulanamaz. Kullanıcılar yeniden giriş yapar; katılımcı token'ları
   DB'de olduğu için etkilenmez.
4. Her durumda: `kubectl rollout restart deployment/bumpinto-backend`.

---

## 7. Maliyet

Google Places faturalandırma hesabı ister (ücretsiz kotada kalsanız bile).

Kodumuza özel riskler:

- `find-venues` yeterli mekan bulamazsa yarıçapı 3 kez ikiye katlıyor → **tek çağrı en fazla
  4 Nearby Search isteği**. Yeni 10 aktivite türünde Foursquare devre dışı olduğu için her
  seferinde Google'a gidiliyor.
- Google yedeğinde her Nearby Search sonucu için **mekan başına bir Places Photo isteği**
  yapılıyor (foto adresi arama anında çözülüyor). 20 mekan = 20 foto isteği.
- Sağlayıcı seçimi kotaya göre (`ProviderOrchestrator`): 429 dönen sağlayıcı yenilenme anına
  kadar dışarıda (FSQ kredi-429'u: 24 saat; saatlik: `x-ratelimit-reset`). Scheduler 5 dk'da
  bir kota ölçer ama FSQ probu **ücretli bir Pro çağrısıdır**; gerçek arama olan pencerede
  atlanır, 429'lu sağlayıcı problanmaz. Trafiksiz bir ortamda yine de saatte 12 prob = ayda
  ~8.600 Pro çağrısı → ücretsiz 500'ü aşar. Trafiksiz ortamda `PROVIDER_QUOTA_REFRESH=PT1H` ver.

Frenler: rate limit 3/dk ve 30 dakikalık sonuç cache'i (foto adresleri sonuçla birlikte
saklandığı için onları da kapsar).

Yine de **bütçe uyarısı kurun** ve anahtarı yalnız Places API (New) ile kısıtlayın.

---

## 8. Doğrulama kontrol listesi

Anahtarları koyduktan sonra bir kez koşun — ikisi de kapatılmamış borç:

- [ ] **Uygulama gerçek sırlarla açılıyor**
      `set -a && source backend/.env.local && set +a && mvn -o spring-boot:run`
- [ ] **Foursquare kategori ID'leri doğru.** 5 ID ölü v3 taksonomisinden geldi; yanlışsa
      **hata vermez, yanlış mekan listeler.** Ters yönden doğrulayın:

      ```bash
      curl -s -H "Authorization: Bearer $FOURSQUARE_API_KEY" \
        -H "X-Places-Api-Version: 2025-06-17" \
        "https://places-api.foursquare.com/places/search?ll=41.0082,28.9784&radius=800&limit=50&fields=name,categories" \
      | jq -r '.results[].categories[] | "\(.fsq_category_id)  \(.name)"' | sort | uniq -c | sort -rn
      ```

      Beklenen: **13032** kahve · **13065** yemek · **13003** bar · **16032** park · **10027** bowling.
      Listede yoksa ID yanlıştır → `FoursquareVenueProvider.CATEGORIES` düzeltilmeli.

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
