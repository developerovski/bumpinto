# BumpInto Backend — Mimari

Son güncelleme: 2026-09-02 · Karşılığı olan kod: Plan 1 + Plan 2 + Plan 9 `done`, 140/140 test yeşil.

## Bu belge ne değildir

| Ne arıyorsan | Nereye bak |
|---|---|
| Uç nokta sözleşmesi, gövde şekilleri, rate limit | `.infra/bumpinto-collection/` (Bruno; her isteğin `docs:` bloğu) |
| Yapılacak iş, görev listesi | `../docs/superpowers/plans/INDEX.md` |
| Ajan/katkı politikası (git, test, dosya eşiği) | `../AGENTS.md` |
| Ürün gereksinimi | `../docs/superpowers/specs/2026-08-31-bumpinto-mvp-design.md` |

Burada yalnız **yapı** var: katmanlar, bağımlılık yönü, neyin makine tarafından zorlandığı,
ve kod okunarak hızlıca anlaşılmayan **neden**'ler.

---

## 1. Yığın

| | |
|---|---|
| Dil / derleyici | Java 21 |
| Çatı | Spring Boot **4.1.0** (Boot 3 değil — aşağıdaki farklar ısırır) |
| Veri | PostgreSQL 16 + Flyway (`db/migration/V*.sql`) |
| HTTP istemcisi | Unirest (`kong.unirest`) — `RestClient` değil |
| Cache | Caffeine (süreç içi) |
| Rate limit | Bucket4j (süreç içi) |
| Gerçek zamanlı | STOMP over WebSocket, Spring'in `SimpleBroker`'ı |
| API dokümanı | springdoc → `/v3/api-docs` |
| Test | JUnit 5, AssertJ, Testcontainers, ArchUnit, Unirest MockClient |

**Boot 4.1 farkları** (planlar Boot 3 varsayarak yazıldı, kod Boot 4'e göre düzeltildi):

- `@DataJpaTest` → `org.springframework.boot.data.jpa.test.autoconfigure`
- `@AutoConfigureTestDatabase`, `@JdbcTest` → `org.springframework.boot.jdbc.test.autoconfigure`
- `@AutoConfigureMockMvc` için `spring-boot-starter-webmvc-test` gerekir
- `spring-boot-starter-oauth2-resource-server` **deprecated** →
  `spring-boot-starter-security-oauth2-resource-server`
- `FlywayAutoConfiguration` → `org.springframework.boot.flyway.autoconfigure`
- Jackson 3: `tools.jackson.databind.ObjectMapper`, `asText()` değil `asString()`

---

## 2. Katmanlar ve bağımlılık kuralı

Altıgen (ports & adapters). **Bağımlılık her zaman içe doğrudur.**

```
   ┌──────────────────────── adapter.in ────────────────────────┐
   │  web (REST controller, DTO, assembler, WebSocket config)   │
   └────────────────────────────┬───────────────────────────────┘
                                │ çağırır
   ┌────────────────────────────▼───────────────────────────────┐
   │  application   use-case orkestrasyonu, transaction sınırı   │
   │                SessionCommands · SessionQueries · DeckFlow  │
   └────────────────────────────┬───────────────────────────────┘
                                │ port arayüzleri üzerinden
   ┌────────────────────────────▼───────────────────────────────┐
   │  domain        SAF Java. Spring yok, JPA yok, HTTP yok.     │
   │                Kurallar, değer nesneleri, port ARAYÜZLERİ   │
   └────────────────────────────▲───────────────────────────────┘
                                │ port'ları IMPLEMENTE eder
   ┌────────────────────────────┴───────────────────────────────┐
   │  adapter.out   persistence (JPA) · provider (HTTP) · events │
   └────────────────────────────────────────────────────────────┘

   infra          çatı kurulumu: security/, config/. İş kuralı BARINDIRMAZ.
```

Pratik sonuç: `domain` derlenebilmek için hiçbir şeye ihtiyaç duymaz. Bir kuralı test etmek için
Spring context ayağa kaldırmak gerekmiyorsa doğru yerdedir.

**Saflık `domain` içindir, `application` için DEĞİL.** `application` sınıfları `@Service` ve
`@Transactional` kullanır ve kullanmalıdır — bu bir kez yanlış anlaşıldı, `createSession`'ın
atomikliği (iki yazma, tek transaction) kaybedildi ve geri alındı. Tekrarlama.

---

## 3. Paket haritası

```
com.bumpinto                                   (69 sınıf)
├── BumpintoApplication                        ← kökte duran TEK sınıf (kural 4)
│
├── domain/                                    19 sınıf — saf Java
│   ├── deck/      DecisionEngine · DeckOutcome · ParticipantLikes
│   ├── geo/       GeoPoint · GeoMath · SearchRadius · TravelEstimate
│   ├── port/      SessionStorePort · DeckStorePort · UserStorePort
│   │              VenueProviderPort · SessionEventsPort · SessionEvent
│   ├── session/   Session · SessionStatus · Participant · ActivityType
│   └── venue/     Venue · VenueCandidate
│
├── application/                               10 sınıf — use-case'ler
│   ├── session/   SessionCommands · SessionQueries · SessionExpiry
│   ├── deck/      DeckFlow
│   ├── text/      Ids · Texts
│   └── error/     NotFound · Conflict · Forbidden · NoVenuesFound Exception
│
├── adapter/                                   30 sınıf
│   ├── in/web/           10 — controller, ApiDtos, ApiExceptionHandler,
│   │                          SessionViewAssembler, ParticipantTokenDelivery,
│   │                          WebPrincipals, WebSocketConfig
│   └── out/
│       ├── persistence/  15 — *Entity, *Repository, *StoreAdapter
│       ├── provider/      4 — Foursquare · GooglePlaces · Resilient · ProviderException
│       └── events/        1 — StompSessionEvents
│
└── infra/                                      9 sınıf — iş kuralı YOK
    ├── security/  SecurityConfig · TokenService · GoogleIdVerifier · AuthCookies
    │              ParticipantPrincipal · ParticipantTokenFilter · RateLimitFilter
    └── config/    AppConfig · AppProps
```

**Gruplama ölçütü ilgi alanıdır, teknik tür değildir.** `domain/session` altında hem `Session`
kaydı hem `SessionStatus` enum'u hem `Participant` durur; bunları "records/", "enums/" diye
ayırmak tek bir kavramı üç pakete dağıtır ve görünürlüğü gereksizce genişletir. Aynı sebeple
`infra.security` tek bir ilgi alanıdır — `infra`'ya yarın eklenecek başka bir şey onun yanına
değil, kendi alt paketine gider.

**Bilinen küçük sapma:** `SessionEvent` bir port değil, `port/` altında duran bir değer nesnesidir.
Port'larla birlikte taşınır, ayrı paket açmaya değmedi.

---

## 4. Yeni kod nereye gider?

| Yazdığın şey | Yeri | Sınama |
|---|---|---|
| Girdiden bağımsız bir kural/hesap | `domain/<kavram>/` | Spring olmadan test edilebiliyor mu? |
| Dış dünyaya bir ihtiyaç (DB, HTTP, mesaj) | `domain/port/` arayüz | Domain "ne" der, "nasıl" demez |
| Birden çok port'u sıraya koyan iş akışı | `application/<kavram>/` | Transaction sınırı burada |
| Yeni HTTP ucu | `adapter/in/web/` + **Bruno isteği** | Bruno'suz uç bitmiş sayılmaz (AGENTS.md) |
| Port implementasyonu | `adapter/out/<teknoloji>/` | Domain tipine çevirerek döner |
| Çatı kurulumu, filtre, `@Bean` | `infra/<ilgi alanı>/` | İş kuralı taşıyorsa yanlış yerdesin |

**Yeni dosya eşiği** AGENTS.md'de: mevcut modüle sığmıyorsa VE bağımsız test edilebilir/tek
sorumluluk ise aç. Katman kökü (`infra/`, `application/`) bir seçenek değildir — ArchUnit kapatır.

---

## 5. Makine ile zorlanan değişmezler

Aşağıdakiler yorum değil, **test**tir (`HexagonalArchitectureTest`). İhlal build'i kırar.

1. **`domainIsPure`** — `domain..` yalnız `domain..` ve `java..`'ya bağımlı olabilir.
2. **`domainHasNoFrameworkDependency`** — `domain..` içinde `org.springframework..`,
   `jakarta..`, `kong.unirest..` yasak.
3. **`sqlOnlyThroughSpringData`** — üretim kodunun tamamında `EntityManager`,
   `EntityManagerFactory`, `JdbcTemplate`, `NamedParameterJdbcTemplate`, `JdbcClient`,
   `DataSource`, `Connection`, `Statement`, `PreparedStatement` yasak.
   *Gerekçe:* SQL injection duruşu. Tırnak "temizleyen" bir yardımcı yazmak yerine, string
   birleştirmeli sorgu yazma **imkânı** derlemede kapatıldı. Sadece `EntityManager` +
   `JdbcTemplate` sayılsaydı `JdbcClient` ve `DataSource` açık kalırdı — kural tüm sınıfı kapsar.
4. **`noClassesSitInLayerRoots`** — `BumpintoApplication` dışında hiçbir sınıf katman kökünde
   duramaz; her sınıf bir ilgi alanı alt paketinde yaşar.
   *Gerekçe:* `infra/` 9 düz sınıfa, `application/` 10 düz sınıfa ulaşmıştı. Kural olmadan
   çöp kutusuna dönüş kaçınılmaz; 2026-09-01 yeniden paketlemesinin sebebi buydu.

---

## 6. Bir isteğin yaşam döngüsü

`POST /api/sessions/{slug}/swipes` örneği:

1. **`RateLimitFilter`** — yol desenine göre kova seçer (aşağıda), aşımda 429.
2. **`ParticipantTokenFilter`** — `X-Participant-Token` başlığını (mobil) ya da cookie'yi (web)
   çözer, token'ın **bu slug'a** ait olduğunu doğrular, `ParticipantPrincipal` kurar.
3. **`BearerTokenAuthenticationFilter`** — kimlik hâlâ yoksa host JWT'sini dener.
4. **`DeckController`** — `@Valid` ile DTO doğrulaması; `WebPrincipals` ile kimlik → id.
5. **`DeckFlow.swipe`** — `@Transactional`; statü kontrolü, üyelik kontrolü, konum ön koşulu.
6. **`DeckStoreAdapter`** — Spring Data ile yazar.
7. **`ApiExceptionHandler`** — `application/error` istisnalarını HTTP koduna çevirir:

| İstisna | Kod |
|---|---|
| `NotFoundException` | 404 |
| `ConflictException` | 409 |
| `ForbiddenException` | 403 |
| `NoVenuesFoundException` | 422 |
| `IllegalArgumentException` | **400** |

Sonuncusu bilinçlidir: değer nesnelerinin (`GeoPoint`, `Texts`, `UUID`) reddettiği girdi bozuk
**istektir**, sunucu hatası değil. Bu eşleme olmasaydı `@Size`/`@DecimalMin`'in yakalayamadığı
uç durumlar 500 olarak sızardı.

---

## 7. Alan modeli

### Oturum durum makinesi

```
COLLECTING ──find-venues──> SUGGESTING ──deste kuruldu──> BROWSING ("Mekanlar")
                                │                              │
                     mekan yok  │              GROUP: shuffle  ├──> SWIPING ──> DECIDED / RUNOFF ──> DECIDED
                     (geri döner)              host/SOLO seçim └──> DECIDED
```

`BROWSING`'de mekanlar herkese görünür ama deste yok; `GROUP` `shuffle` ile `SWIPING`'e geçer,
`SOLO` (veya `GROUP` host kısayolu) `force-decision{venueId}` ile doğrudan `DECIDED`'a gider.
`SWIPING`'den sonrası (tek kazanan → `DECIDED`, berabere → `RUNOFF` → oylama/host seçimi →
`DECIDED`) Plan 1/2'deki gibi değişmedi.

`EXPIRED` bu diyagramda yok — çünkü **hiç yazılmaz**.

### Tembel expiry (dikkat: en sık yanlış anlaşılan invariant)

`SessionExpiry` tek yer. TTL'i geçmiş oturum, kayıtlı statüsü ne olursa olsun EXPIRED sayılır
ama **DB'ye yazılmaz** — expiry hesaplanan bir durumdur, `GET`'in yan etkisi olmaz.

- `required(...)` — komut tarafı: süresi dolmuşsa `ConflictException`.
- `applied(...)` — okuma tarafı: `SessionView`'da `EXPIRED` raporlanır, kayıt değişmez.

Yeni bir komut ya da sorgu yazarken bu ikisinden birinden geçmiyorsa süresi dolmuş oturum
sızıyor demektir.

### Karar motoru (`DecisionEngine`, saf)

Girdi yalnız **desteyi bitirmiş** katılımcılardır.

1. Herkesin beğendiklerinin kesişimi **tek** ise → `Decided`.
2. Kesişim **≥2** ise → `Runoff` (beğeni sayısı, sonra puan, sonra UUID ile sıralı).
3. Kesişim boşsa → en çok beğenilen ilk 3 → `Runoff` (tek kalırsa `Decided`).
4. Hiç beğeni yoksa → `NoLikes`.

Sıralama tamamen deterministiktir (son kırıcı `UUID::compareTo`) — aynı girdi hep aynı çıktı.

### Arama yarıçapı

`SearchRadius.baseKm` = (katılımcıların merkeze en uzak mesafesi × 0.25), **1–10 km** arasına
kırpılır. Yeterli mekan bulunamazsa `expandedKm` ile en fazla 3 kez ikiye katlanır, **mutlak
tavan 40 km**. `DeckFlow` en az 6, en çok 20 mekanlık deste hedefler.

### Deste popülasyonu kuralı: geometri / oy ikilisi

İki ayrı katılımcı kümesi vardır ve karıştırılmamalı:

- **Geometri kümesi** — konumu olan **tüm** katılımcılar (elle eklenen `manual=true` noktalar
  dahil). `midpoint`, `radiusKm` ve mekan araması bu kümeden hesaplanır.
- **Oy kümesi** — deste akışına giren katılımcılar (`manual=false`, konumu olan). `done/total`
  sayımı, runoff finishers ve karar motoru girdisi **hep** bu kümeyi kullanır — aksi halde
  konumsuz veya elle eklenmiş biri yüzünden eksik/yanlış oyla erken karar çıkar.

Konumsuz katılımcı üyedir ama her iki kümenin de dışındadır (409, 403 değil; çözümü
`PUT /location`).

### `SessionType` ve elle konum

`SessionType`: `GROUP` (davet linki + deste, varsayılan) | `SOLO` (yalnız host, davet linki
çalışmaz). SOLO'da host `POST /points` ile başkalarının konumunu elle ekler: token verilmez,
oy vermez (`manual=true`), yalnız geometri kümesindedir. `COLLECTING` dışında veya `GROUP`'ta
eklenemez/silinemez (409); silme yalnız `manual=true` satırlar için, host'un kendi satırı hariç.

---

## 8. Güvenlik mimarisi

### İki ayrı kimlik

| | Host | Katılımcı |
|---|---|---|
| Kaynak | Google ID token → kendi JWT'miz | 32 baytlık rastgele token (`SecureRandom`) |
| Taşıyıcı | `Authorization: Bearer` ya da cookie | `X-Participant-Token` ya da cookie |
| Doğrulayan | `TokenService` (HMAC) | `ParticipantTokenFilter` (DB araması) |
| Yetki | Oturum sahibi işlemleri | Kaydırma, oylama, konum |

`ParticipantTokenFilter` token'ın **istenen slug'a ait olduğunu** doğrular; başka bir oturumun
geçerli token'ı burada işe yaramaz.

### Çift teslimat: `X-Client`

- `X-Client: web` → token'lar **HttpOnly cookie**'ye yazılır, gövdede DÖNMEZ (XSS ile okunamaz).
- `X-Client: mobile` (varsayılan) → token gövdede döner (cookie jar'ı olmayan istemciler).

Tek yer: `ParticipantTokenDelivery` / `AuthCookies`. Host token'ı ve katılımcı token'ı **aynı**
kuraldan geçer — host da bir katılımcıdır.

Cookie'ler `HttpOnly` + `SameSite=Lax`; `secure` bayrağı profilden gelir (local `false`, prod `true`).
**Yol ve isim kapsamlıdır** — bu bir güvenlik tercihidir, kozmetik değil:

| Cookie | İsim | Path |
|---|---|---|
| Host erişimi | `bumpinto_at` | `/api` |
| Katılımcı | `bumpinto_pt_{slug}` | `/api/sessions/{slug}` |

Katılımcı cookie'si oturum başına ayrı isim ve ayrı yol taşır: tarayıcı onu yalnız o oturumun
yollarına gönderir, ve aynı kullanıcı birden çok oturuma katıldığında cookie'ler birbirini ezmez.

### Filter bean tuzağı (tekrarlamayın)

Spring **her `Filter` bean'ini** servlet zincirine de kaydeder. `SecurityConfig`'in ayrıca
kurduğu bir filtre böylece istek başına **iki kez** çalışır (`ParticipantTokenFilter` için iki DB
okuması demekti). Bu yüzden `ParticipantTokenFilter` ve `RateLimitFilter` bilinçli olarak
`@Component` **değildir**.

### Rate limit

Politikalar sırayla eşleşir; ilk eşleşen kazanır:

| id | Yöntem | Yol | dk başına |
|---|---|---|---|
| `auth` | POST | `/api/auth/google` | 5 |
| `join` | POST | `/api/sessions/*/participants` | 10 |
| `find` | POST | `/api/sessions/*/find-venues` | 3 |
| `create` | POST | `/api/sessions` | 10 |
| `api` | * | `/api/**` | 120 |
| `fallback` | * | her şey | 240 |

`fallback` ayarlanmış bir politika değil, **emniyet ağıdır**: eşleme bir gün kaçırılırsa saldırgan
sınırsıza değil 240'a düşer (fail-closed). Yeni bir pahalı uç eklerken kendi politikasını `api`'den
**önce** eklemeyi unutma — yoksa 120'lik geniş kovaya düşer.

`TRUST_FORWARDED_FOR` varsayılanı **`false`**. `X-Forwarded-For` istemci tarafından uydurulabilir;
yalnızca header'ı **ezerek yeniden yazan** bir ingress arkasında `true` yapılır (Plan 5'te
doğrulanacak).

### Bilinçli tercihler

- **CSRF kapalı** — cookie'ler `SameSite=Lax` + origin-kısıtlı credentialed CORS, ve API'de
  tarayıcı form-post akışı yok.
- **Stateless oturum** — sunucuda HTTP session tutulmaz.
- **`Participant.toString()` token'ı maskeler.** Bir gün biri `log.debug("p={}", participant)`
  yazacak. Aynı koruma token taşıyan DTO'larda da var (`ApiDtos.masked`).

---

## 9. Kalıcılık

- Entity'ler **paket-private** ve adapter'larının yanında durur; domain'e sızmazlar.
- Entity ↔ domain çevrimi **elle** yazılır (`SessionStoreAdapter.toSession` gibi). Otomatik
  eşleyici yok: iki tarafın ayrı evrilmesi kasıtlıdır.
- Repository'ler **top-level** arayüzlerdir (`SessionRepository`, `ParticipantRepository`, …).
  İç içe (`Jpa.Sessions`) sürüm kaldırıldı: `@EnableJpaRepositories(considerNestedRepositories)`
  gerektiriyordu, o da uygulama kökünde koşulsuz bir JPA import'u yaratıp JPA'yı ilgisiz slice
  testlerine sızdırıyordu. **`@EnableJpaRepositories` geri eklenmez.**
- Zaman damgaları DB default'undan gelir (`@Generated(event = INSERT)`, `updatable = false`).
- Şema yalnız Flyway ile değişir (`db/migration/V*.sql`). `ddl-auto` kullanılmaz.

**Bilinen basitleştirme:** `sessions.runoff_venue_ids` bir CSV `text` kolonudur. Finalist sayısı
en fazla 3 olduğu için ayrı tablo açılmadı; sorgulanmıyor, yalnız okunup yazılıyor.

---

## 10. Dış mekan sağlayıcıları

`ResilientVenueProvider` (`@Primary`) zinciri yönetir:

```
Foursquare ──boş/hata──> Google Places ──> sonuç
```

- **Cache:** Caffeine, 30 dk, anahtar `lat:lng:radius:type:limit`.
  **Boş sonuç ve hata cache'lenmez** — seyrek bölgedeki geçici bir boşluk 30 dk "mekan yok"a
  dönüşürdü.
- **15 aktivite türü.** İlk beşinin (`COFFEE FOOD BAR WALK ACTIVITY`) Foursquare kategori
  eşlemesi vardır; kalan onu (`SWIM HIKE FITNESS CINEMA MUSEUM ART NIGHTLIFE THEME_PARK
  ADVENTURE GAMES`) **yalnız Google'dan** gelir. Kartlarında fotoğraf yoktur (foto FSQ'dan
  geliyordu); puan, fiyat ve harita linki vardır.
- Foursquare eşlemesi olmayan tür için `FoursquareVenueProvider` **HTTP çağrısı yapmadan** boş
  döner. Kategorisiz arama yapılsaydı FSQ filtresiz sonuç dönerdi ve "yüzme" isteyen kullanıcı
  kafe listesi görürdü — sessiz ve fark edilmesi zor bir hata. Testle kilitli.
- Google'da bir aktivite birden çok türe açılır (`includedTypes` OR'lanır), tek istekte daha
  geniş sonuç: `MUSEUM` → `museum` + `art_museum` + `history_museum`.

---

## 11. Olaylar (WebSocket)

STOMP, `/ws` uç noktası, konu `/topic/session/{slug}`.

| Olay | Yük |
|---|---|
| `participant_joined` | `participantCount` |
| `participant_left` | `participantCount` |
| `venues_ready` | `venueCount` |
| `deck_ready` | `venueCount` |
| `deck_progress` | `done`, `total` |
| `runoff_started` | `finalistCount` |
| `session_decided` | `venueId` |

İki kural:

1. **Commit'ten sonra yayınlanır.** Aktif transaction varsa olay `afterCommit`'e kaydedilir;
   rollback'te hiç gitmez. İstemci var olmayan bir durumu görmez. Use-case'ler saf kalır —
   commit-sonrası mantık adapter'dadır.
2. **En-iyi-çaba.** Yayın hatası yakalanır ve loglanır, çağırana sızmaz. Sızsaydı commit başarılı
   olduğu halde istemci 500 görür ve aynı transaction'ın kalan kancaları atlanırdı. İstemci
   yeniden bağlandığında durumu `GET` ile tazeler.

---

## 12. Yapılandırma ve sırlar

`AppProps` (`@ConfigurationProperties("bumpinto")`) — `security`, `providers`, `cors`, `cookies`,
`rateLimit`. Sır taşıyan alanlar `toString()`'de maskelenir.

**Fail-closed açılış.** `application.yml`'de `GOOGLE_CLIENT_ID`, `TOKEN_SECRET`,
`FOURSQUARE_API_KEY`, `GOOGLE_PLACES_API_KEY` için **default yoktur**; local default'lar yalnız
`application-local.yml`'dedir. `AppProps.required(...)` üç durumu birden reddeder: null, boş, ve
**çözülmemiş placeholder** (`${X}` — env yoksa Boot değeri olduğu gibi bırakır). Üçüncüsü şart:
yalnız uzunluk kontrolü olsaydı, adı uzun bir env değişkeni eksik olduğunda uygulama literal
`${...}` dizesini HMAC anahtarı olarak kullanarak sessizce ayağa kalkardı.

Sır **değerleri** hiçbir dosyaya yazılmaz. Manifest'ler yalnız isim referanslar; `kubectl create
secret` komutlarını kullanıcı çalıştırır.

---

## 13. Test mimarisi

123 test. Katman katman:

| Tür | Kapsam | Örnek |
|---|---|---|
| Saf birim | Spring yok, IO yok | `DecisionEngineTest`, `GeoMathTest`, `SearchRadiusTest` |
| Use-case | Fake port'lar (`support/FakeStores`) | `DeckFlowTest`, `SessionCommandsTest` |
| Slice | Tek katman + Testcontainers/MockMvc | `PersistenceSliceTest`, `WebSecuritySliceTest` |
| Uçtan uca | Tam context | `ApiHappyPathTest` |
| Mimari | ArchUnit | `HexagonalArchitectureTest` |

**Testcontainers kuralı (BAĞLAYICI):** her zaman `com.bumpinto.support.PostgresContainer.shared()`.
`new PostgreSQLContainer<>` açma; `@Container` / `@Testcontainers` **kullanma** — bu singleton'la
ikisi de no-op'tur. Sebep: Rancher Desktop'ın host port yönlendirmesi container "started" olduktan
sonra kısa süre dalgalanır (bir bağlantıyı kabul edip sonrakini reddeder) ve ~%20 flake üretiyordu.
`PostgresContainer` art arda 3 başarılı JDBC bağlantısı görene kadar bekler.

**Doğrulama disiplini:** güvenlik ya da invariant koruyan bir test yazıldığında **mutasyonla
doğrulanır** — korumayı boz, testin kırmızıya döndüğünü gör, geri koy. "Test yeşil" tek başına
testin bir şey tuttuğunu kanıtlamaz.

---

## 14. Bilinen borçlar

| Borç | Etki | Kapanışı |
|---|---|---|
| Foursquare kategori ID'leri (5 tane) ölü v3 taksonomisinden geldi, doğrulanamadı — FSQ taksonomiyi yalnız Observable iframe'inde yayınlıyor | Yanlış ID hata vermez, **sessizce yanlış mekan** listeler | Gerçek anahtarla tek bir smoke call — kullanıcı |
| Google'ın çok türlü `includedTypes` OR davranışı canlı API'de doğrulanmadı | Yanlışsa sonuç **boş** döner (gürültülü, sessiz değil) | Aynı smoke call |
| Yeni 10 aktivite türünün kartlarında fotoğraf yok | Görsel kalite düşer | Google Photos API çağrısı (ek maliyet) ya da FSQ eşlemesi |
| Rate limit ve olay yayını süreç içi | Çok pod'da kova ve broker paylaşılmaz | Bucket4j-Redis + harici broker (Plan 5 notu) |
| Spec §6'nın 30 günlük kalıcı silme gereksinimi | GDPR | **Plan 6** yazıldı, yürütülmedi |
| Google taksonomisinde olmayan türler (at binme, sörf, tırmanış, dalış) | Bu aktiviteler hiç sunulamıyor | **Plan 7** yazıldı, `deferred` |

---

## 15. Yerel çalıştırma

```bash
# Postgres (repo kökünden)
docker compose up -d postgres

# Test — env öneki ZORUNLU
cd backend
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test

# Uygulama
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 mvn -o spring-boot:run
```

- `jenv` shim `JAVA_HOME`'u ezer → önek olmadan yanlış JDK ile derlenir.
- Rancher Desktop'ta ryuk sidecar ölüyor → `TESTCONTAINERS_RYUK_DISABLED=true` şart.
- `-o` offline; bağımlılık eklediysen ilk çalıştırmayı `-o` **olmadan** yap.

### Çalışma anında `Unresolved compilation problem` görürsen

Spring wiring bozuk değildir. VSCode'un Java dil sunucusu `target/classes`'a kendi derlemesini
yazıyor ve Maven'ın artımlı derlemesi bunu her zaman ezmiyor. Belirti bazen bean yaratma hatası
içinde "Constructor threw exception" olarak da çıkar.

```bash
mvn -o compile     # gerçek derleme hatası burada görünür
mvn -o clean test  # artımlı derleme değişikliği görmüyorsa
```

Bu iki kez saatler yedi. Spring tarafında sebep arama.
