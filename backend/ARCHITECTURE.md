# BumpInto Backend — Mimari

Son güncelleme: 2026-09-04 · Karşılığı olan kod: Plan 1 + Plan 2 + Plan 9 + Plan 10 + Plan 15 (B-7)
+ Plan 18 (B-8) `done`, 265/265 test yeşil.

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
| Dil / derleyici | Java 25 |
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
com.bumpinto                                   (76 sınıf)
├── BumpintoApplication                        ← kökte duran TEK sınıf (kural 4)
│
├── domain/                                    22 sınıf — saf Java
│   ├── deck/      DecisionEngine · DeckOutcome · ParticipantLikes
│   ├── geo/       GeoPoint · GeoMath · SearchRadius · TravelEstimate
│   ├── port/      SessionStorePort · DeckStorePort · UserStorePort
│   │              VenueProviderPort · SessionEventsPort · SessionEvent
│   ├── session/   Session · SessionStatus · SessionType · Participant · ActivityType
│   │              SessionSummary (liste satırı: sayımlar + karar mekanı)
│   ├── user/      UserProfile (hesap + tercihler)
│   └── venue/     Venue · VenueCandidate
│
├── application/                               12 sınıf — use-case'ler
│   ├── session/   SessionCommands · SessionQueries · SessionExpiry
│   ├── deck/      DeckFlow
│   ├── user/      UserPreferences · UserProfileQueries
│   ├── text/      Ids · Texts
│   └── error/     NotFound · Conflict · Forbidden · NoVenuesFound Exception
│
├── adapter/                                   32 sınıf
│   ├── in/web/           12 — Session/Participant/Deck/Points/Me/Auth controller, ApiDtos, ApiExceptionHandler,
│   │                          SessionViewAssembler, ParticipantTokenDelivery,
│   │                          WebPrincipals, WebSocketConfig
│   └── out/
│       ├── persistence/  15 — *Entity, *Repository, *StoreAdapter
│       ├── provider/      9 — Foursquare · GooglePlaces · ProviderOrchestrator · ProviderQuotaScheduler
│       │                       ProviderQuotaCache · ProviderQuota · QuotaAwareVenueProvider
│       │                       ProviderException · QuotaExceededException
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

### Alan modeli özeti (Plan 15 / B-7)

```
TravelMode     WALK 5 · BIKE 16 · EBIKE 24 · TRANSIT 20 · CAR 72 (km/sa) ; yol = kuş uçuşu × 1,3
Participant    + travelMode (varsayılan CAR: elle konumlar ve geç katılanlar da CAR)
UserProfile    + defaultTravelMode (null = tercih yok)
GeoMath        centroid(points, weights) ; weight = 1/hız  → iki kişide TAM eşit süre noktası
TravelMinutes  between(from, mode, to) = round5( fromCrowKm( distance(approx(from), to), mode ) )
Fairness       { maxMinutes (minimax, birincil), spreadMinutes (max−min, ikincil), longestParticipantId }
DeckOrdering   maxMinutes ↑ → spreadMinutes ↑ → eşitlerde Random(seedOf(session)) ile karışık
               (seedOf = session.id() MSB ^ LSB — 128 bitin ikisi XOR'lanır, id değişmedikçe sabit)
Session        + decidedAt, decisionKind, runoffReason, midpointLabel
DecisionKind   UNANIMOUS | SINGLE_LIKE | RUNOFF | FORCED | PARTIAL
RunoffReason   INTERSECTION | FALLBACK      (INTERSECTION finalist tavanı = 4)
Venue          + category, address, locality, ratingCount, hoursToday, placeLink
SessionView    + midpointLabel, decisionKind, decidedAt, runoffReason, likeCounts (yalnız DECIDED)
ParticipantDto + travelMode, midpointMinutes
VenueDto       + provider, category, address, locality, ratingCount, hoursToday, placeLink, fairness
```

`DecisionEngine` beraberliği hâlâ **puanla** kırar (spec §4.5) — adalet yalnız `venues[]`
sırasını belirler, karar motorunun girdisine girmez (bkz. §14 borç tablosu değil, Plan 15
öz-denetimi: bu iki cümle plan dokümanında çelişiyordu, §4.5 kazandı).

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
| Katılımcı | `bumpinto_pt_{slug}` | `/api` |

Oturum yalıtımı **isimden** gelir (`bumpinto_pt_{slug}`), yoldan değil — ve sunucu ayrıca token'ın
o slug'a ait olduğunu doğrular (`ParticipantTokenFilter`). Katılımcı cookie'sinin yolu bir zamanlar
`/api/sessions/{slug}` idi; çıkış isteği (`/api/auth/logout`) o yolun altında olmadığı için tarayıcı
cookie'yi taşımıyor ve silme no-op oluyordu, bu yüzden `/api`'ye genişletildi.

**Genişletmenin bıraktığı miras (2026-09-04'te düzeltildi):** cookie'ler `(ad, domain, path)` ile
saklanır, yani eski yola yazılmış cookie'ler silinmedi ve tarayıcı ikisini birden gönderiyor.
RFC 6265 daha spesifik path'i **öne** koyar, dolayısıyla "ilk eşleşen cookie" tam olarak bayat
olandı: üye kendi oturumunda `participant token required` (403) alıyor ve durum kendiliğinden
düzelmiyordu. İki kural bunu kapatır ve **geri alınmamalıdır**:
`ParticipantTokenFilter` aynı isimli **tüm** cookie'leri sırayla dener (ilkini değil, geçerli
olanı kullanır), `AuthCookies.clearParticipants` ise silme talimatını **iki yola birden** yazar.
Testi: `AccountApiTest.aStaleDuplicateParticipantCookieDoesNotShadowTheValidOne`.

### WebSocket kimliği

Kanal `/api/sessions/{slug}/ws` altındadır. Katılımcı çerezinin path'i (`/api`) bu yolu kapsadığı
için tarayıcı çerezi handshake'e kendiliğinden gönderir; istek
servlet zincirinden geçer, `ParticipantTokenFilter` kimliği kurar ve `anyRequest().authenticated()`
kimliksiz handshake'i 401'ler. `SessionWsHandshake` slug/participantId/sessionId'yi WS oturum
niteliklerine yazar — kopma anında ortada HTTP isteği yoktur, tek kaynak orasıdır.

Abonelik de yetkilendirilir: `WebSocketConfig`'in inbound interceptor'ı yalnız kişinin KENDİ
oturumunun konusuna (`/topic/session/{kendi slug'ı}`) izin verir. Eskiden uç nokta `/ws` idi,
handshake kimliksizdi ve slug'ı bilen herhangi bir istemci kanalı dinleyebiliyordu.

### Filter bean tuzağı (tekrarlamayın)

Spring **her `Filter` bean'ini** servlet zincirine de kaydeder. `SecurityConfig`'in ayrıca
kurduğu bir filtre böylece istek başına **iki kez** çalışır (`ParticipantTokenFilter` için iki DB
okuması demekti). Bu yüzden `ParticipantTokenFilter` ve `RateLimitFilter` bilinçli olarak
`@Component` **değildir**.

### Kamu uçları tek listede

`SecurityConfig.PUBLIC_ENDPOINTS` (yöntem + yol): `POST /api/auth/google`, `POST /api/auth/logout`,
`POST /api/sessions/*/participants`, `GET /api/sessions/*/preview`. Aynı liste hem `permitAll`
hem de bearer resolver tarafından kullanılır: resolver kamu uçlarında **cookie'yi okumaz**
(`Authorization` başlığı yine geçerlidir). Sebep: `BearerTokenAuthenticationFilter` yetkilendirmeden
önce koşar; bayat/geçersiz `bumpinto_at` cookie'si `permitAll`'a rağmen 401 üretiyor, çıkış ve
yeniden giriş kilitleniyordu (`AccountApiTest` bunu tutar). Yeni kamu ucu açarken yalnız bu listeye ekle.

### Rate limit

Politikalar sırayla eşleşir; ilk eşleşen kazanır:

| id | Yöntem | Yol | dk başına |
|---|---|---|---|
| `auth` | POST | `/api/auth/google` | 5 |
| `join` | POST | `/api/sessions/*/participants` | 10 |
| `find` | POST | `/api/sessions/*/find-venues` | 3 |
| `create` | POST | `/api/sessions` | 10 |
| `ws` | GET | `/api/sessions/*/ws` | 240 |
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

Üç parça, tek kota modeli (`ProviderQuota{limit, remaining, resetAt, measuredAt, source}`):

```
                 ┌──────────────────────┐   her 5 dk (bumpinto.quota.refresh)
                 │ ProviderQuotaScheduler│──── measureQuota() ──┐
                 └──────────────────────┘                      ▼
  gerçek arama ── x-ratelimit-* (FSQ) ────────────▶ ProviderQuotaCache ◀── 429 → EXHAUSTED
                                                          │
                 ┌──────────────────────┐   ratio() sırası │
  DeckFlow ────▶ │ ProviderOrchestrator │◀─────────────────┘
                 └──────────────────────┘
                   Foursquare(@Order 1) · GooglePlaces(@Order 2) · …
```

- **Kota sinyali sağlayıcıya göre farklı** (2026-09-02 araştırması): FSQ her yanıtta
  `x-ratelimit-limit/remaining/reset` verir (`HEADER`, bedava); Google **hiç header vermez**,
  kota yalnız Cloud Monitoring'de (servis hesabı ister, dakikalar gecikmeli) → yerel sayaç:
  `bumpinto.quota.google-monthly-budget − bu ayki searchNearby` (`BUDGET`); TripAdvisor'da ne
  header ne API var → yalnız 429 ve yerel sayaç. Orkestratör bu farkı görmez.
- **Scheduler** her aralıkta `measureQuota()` çağırır ama iki fren var, ikisi de para için:
  cache o pencerede gerçek bir yanıtla tazelendiyse prob atılmaz (FSQ probu **ücretli Pro
  çağrısı** — 5 dk'da bir boşuna atmak tek başına aylık ücretsiz 500'ü yer); 429 ile kapatılmış
  sağlayıcı yenilenme anı gelmeden problanmaz. İlk tur da bir aralık sonra (testler API'ye
  vurmasın).
- **Orkestratör** kotası tükenmemiş sağlayıcıları `ratio()` (kalan/limit) büyükten küçüğe
  sıralar; eşitlikte ve kota bilinmiyorken `@Order`. Kotası *bilinen* sağlayıcı bilinmeyenden
  önce gelir. İlk dolu sonuç kazanır; boş/geçici hata → sıradaki. 429 →
  `QuotaExceededException.resetAt()`'e kadar `EXHAUSTED`. FSQ'da kredi-429'u
  (`x-ratelimit-limit: 0`, kendiliğinden dolmaz → 24 saat) ile saatlik-429'u (`reset`
  başlığı) ayrılır. Herkes hata verirse "mekan yok" **denmez**, istisna yukarı gider (500).
- **Yeni sağlayıcı** (TripAdvisor vb.) = `QuotaAwareVenueProvider` uygulayan `@Order(n)` bean'i;
  orkestratör ve scheduler değişmez.
- **Sınır:** cache ve Google sayacı süreç içi. Pod yeniden başlayınca cache boşalır (ilk tur
  doldurur, o arada `@Order`), sayaç sıfırlanır (ay içinde eksik sayar). Çok pod'da paylaşılmaz.

- **15 aktivite türü.** İlk beşinin (`COFFEE FOOD BAR WALK ACTIVITY`) Foursquare kategori
  eşlemesi vardır; kalan onu (`SWIM HIKE FITNESS CINEMA MUSEUM ART NIGHTLIFE THEME_PARK
  ADVENTURE GAMES`) **yalnız Google'dan** gelir.
- **Fotoğraf arama anında çözülür.** FSQ doğrudan CDN adresi verir. Google `searchNearby`
  ise yalnız bir foto *referansı* döner; referansı resme çevirmek API anahtarı ister ve anahtar
  istemciye geçemez. Bu yüzden mekan başına bir `photos/*/media?skipHttpRedirect=true` çağrısı
  yapılır (paralel) ve imzalı CDN adresi `venues.photo_url`'e yazılır — tarayıcı resmi tek
  istekte çeker, arada kendi ucumuz yok. Adresin ömrü sınırlı; dolarsa kart monograma düşer
  (`<img onError>`). Foto hatası aramayı düşürmez, o mekan fotosuz kalır.
- Foursquare eşlemesi olmayan tür için `FoursquareVenueProvider` **HTTP çağrısı yapmadan** boş
  döner. Kategorisiz arama yapılsaydı FSQ filtresiz sonuç dönerdi ve "yüzme" isteyen kullanıcı
  kafe listesi görürdü — sessiz ve fark edilmesi zor bir hata. Testle kilitli.
- Google'da bir aktivite birden çok türe açılır (`includedTypes` OR'lanır), tek istekte daha
  geniş sonuç: `MUSEUM` → `museum` + `art_museum` + `history_museum`.

---

## 11. Olaylar (WebSocket)

STOMP, `/api/sessions/{slug}/ws` uç noktası, konu `/topic/session/{slug}`.

| Olay | Yük |
|---|---|
| `participant_joined` | `participantCount` |
| `participant_left` | `participantCount` |
| `presence_changed` | — |
| `location_updated` | — |
| `venues_ready` | `venueCount` |
| `deck_ready` | `venueCount` |
| `deck_progress` | `done`, `total` |
| `runoff_started` | `finalistCount` |
| `runoff_voted` | `voted`, `voters` |
| `runoff_tie` | `finalistCount` |
| `no_likes` | *(boş)* |
| `session_decided` | `venueId` |

Tablo `SessionEvent`'in fabrikalarıyla birebirdir; yeni bir olay eklerken buraya da satır düşer.

Üç kural:

1. **Commit'ten sonra yayınlanır.** Aktif transaction varsa olay `afterCommit`'e kaydedilir;
   rollback'te hiç gitmez. İstemci var olmayan bir durumu görmez. Use-case'ler saf kalır —
   commit-sonrası mantık adapter'dadır.
2. **En-iyi-çaba.** Yayın hatası yakalanır ve loglanır, çağırana sızmaz. Sızsaydı commit başarılı
   olduğu halde istemci 500 görür ve aynı transaction'ın kalan kancaları atlanırdı. İstemci
   yeniden bağlandığında durumu `GET` ile tazeler.
3. **Presence süreç içidir.** `InMemoryPresence` tek pod'un hafızasında yaşar: çok pod'da
   paylaşılmaz, restart'ta boşalır (ilk reconnect doldurur) ve 45 sn'lik grace penceresi yüzünden
   gerçekten ayrılan biri bir süre daha "burada" görünür. `ProviderQuotaCache` ile aynı sınıf borç.
   Kimlik `SessionConnectEvent`'ten okunur, `SessionConnectedEvent`'ten **değil**: ikincisi broker'ın
   CONNECT_ACK'idir ve handshake niteliklerini taşımaz (`PresenceListener`).
   Grace penceresinin anlamlı olması **heartbeat'e bağlıdır**: `TaskScheduler` verilmezse STOMP
   heartbeat'i sessizce kapanır ve kopukluk yalnız TCP zaman aşımıyla (saatler) anlaşılır — sekme
   kapatmak FIN gönderir ama kapak kapanması göndermez. 10 sn çift yönlü heartbeat bunu ~20 sn'ye
   bağlar (`WebSocketConfig.configureMessageBroker`).
   Presence yalnız **geri alınabilir giriş** kararlarını kapatır (`shuffle`); deste bitişi gibi
   geri alınamaz kararlar satıra bakmaya devam eder — bir ağ dalgalanması kalıcı bir kararı
   erken tetiklememelidir.

---

## 12. Yapılandırma ve sırlar

`AppProps` (`@ConfigurationProperties("bumpinto")`) — `security`, `providers`, `cors`, `cookies`,
`rateLimit`, `quota`, `geocode`. Sır taşıyan alanlar `toString()`'de maskelenir.

**`bumpinto.geocode`** (`NominatimReverseGeocoder`, `adapter/out/geocode`) — orta noktanın kasaba
kelimesi (spec §5.A.4). `contact` (`NOMINATIM_CONTACT`, varsayılan `dev@bumpinto.test`) Nominatim
politikasının zorunlu kıldığı User-Agent iletişim adresidir; `min-interval` (`NOMINATIM_MIN_INTERVAL`,
varsayılan `PT1S`) saniyede en fazla 1 istek kuralını besler. Sonuç Caffeine ile (~1 km yuvarlanmış
konum anahtarlı, 30 gün) önbelleklenir — başarılı ama adressiz yanıt da (nameless box) MISS olarak
önbelleğe girer; transport/HTTP hatası girmez (kesinti geçicidir, bir sonraki çağrı yeniden dener).
Başarısızlık `Optional.empty()` döner. Çağrı süresi `min-interval` (1 sn throttle) + HTTP timeout
ile sınırlıdır — **bilinen sınır:** throttle bloklayıcıdır (`Thread.sleep`), findVenues'i çağıran
thread'i bu kadar bekletebilir; takip: async çözüm ya da `tryAcquire` ile zaman aşımında pes etme.
Atıf yükümlülüğü: bu veriyi gösteren her yüzeyde "© OpenStreetMap contributors" (W-6a.9 borcu).

**Fail-closed açılış.** `application.yml`'de `GOOGLE_CLIENT_ID`, `TOKEN_SECRET`,
`FOURSQUARE_API_KEY`, `GOOGLE_PLACES_API_KEY` için **default yoktur**; local default'lar yalnız
`application-local.yml`'dedir. `AppProps.required(...)` üç durumu birden reddeder: null, boş, ve
**çözülmemiş placeholder** (`${X}` — env yoksa Boot değeri olduğu gibi bırakır). Üçüncüsü şart:
yalnız uzunluk kontrolü olsaydı, adı uzun bir env değişkeni eksik olduğunda uygulama literal
`${...}` dizesini HMAC anahtarı olarak kullanarak sessizce ayağa kalkardı.

Sır **değerleri** hiçbir dosyaya yazılmaz. Manifest'ler yalnız isim referanslar; `kubectl create
secret` komutlarını kullanıcı çalıştırır.

### Sağlayıcı bütçeleri (B-7, açılış maliyet modeli)

| Ayar | Varsayılan | Ne yapar |
|---|---|---|
| `bumpinto.quota.google-monthly-budget` (`GOOGLE_MONTHLY_BUDGET`) | 1000 | Nearby Search için **sert** aylık tavan. Aşılırsa istek atılmaz, `QuotaExceededException` ile orkestratör Foursquare'e düşer. Maske `rating`+`priceLevel` içerdiği için çağrı Enterprise katmanındadır (1.000 ücretsiz/ay, sonrası $35/1000). |
| `bumpinto.quota.google-photo-monthly-budget` (`GOOGLE_PHOTO_MONTHLY_BUDGET`) | 1000 | Place Photo medya çağrıları — **ayrı SKU** (1.000 ücretsiz/ay, sonrası $7/1000). Bitince foto çözülmez, `photoUrl` null gelir, kart monograma düşer; arama etkilenmez. |
| `bumpinto.geocode.contact` (`NOMINATIM_CONTACT`) | dev@bumpinto.test | Nominatim politikası gereği User-Agent'ta zorunlu iletişim adresi. Preprod/prod'da gerçek adres verilmelidir. |
| `bumpinto.geocode.min-interval` (`NOMINATIM_MIN_INTERVAL`) | PT1S | Nominatim'e en fazla 1 istek/saniye. |

Sayaçlar süreç içidir: pod yeniden başlarsa sıfırlanır ve ay içinde **eksik** sayabilir (borç).
Foursquare tarafında Premium alanlar (`rating`, `price`, `photos`) istenmez; FSQ oturumlarında
puan/fiyat/foto **yoktur** ve kart bunu açıkça söyler.

---

## 13. Test mimarisi

265 test. Katman katman:

| Tür | Kapsam | Örnek |
|---|---|---|
| Saf birim | Spring yok, IO yok | `DecisionEngineTest`, `GeoMathTest`, `SearchRadiusTest` |
| Use-case | Fake port'lar (`support/FakeStores`) | `DeckFlowTest`, `SessionCommandsTest` |
| Slice | Tek katman + Testcontainers/MockMvc | `PersistenceSliceTest`, `WebSecuritySliceTest` |
| Uçtan uca | Tam context | `ApiHappyPathTest` · `AccountApiTest` |
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
| Google yedeğinde deste kurulumu mekan başına bir Places Photo çağrısı ekliyor (20 mekan = 20 ücretli istek), kullanıcı hepsini görmese de | Places Photo maliyeti | Ölçülüp gerekirse foto yalnız ilk N kart için çözülür |
| Foursquare Premium alanları (`rating,price,photos`) kredi ister; hesapta kredi yok (2026-09-02). Pro alanlar çalışıyor ama kartın ihtiyacı premium olanlar | FSQ her aramada kredi-429 → 24 saat kapalı; fiilen hep Google | Kredi alınır ya da FSQ yalnız Pro alanlarla keşif + Google detay (iki çağrı/mekan) |
| Kota cache'i ve Google sayacı süreç içi | Restart'ta cache boş, sayaç eksik; çok pod'da paylaşılmaz | Redis/DB'ye taşımak (Plan 5 notundaki broker/kova ile aynı iş) |
| Rate limit ve olay yayını süreç içi | Çok pod'da kova ve broker paylaşılmaz | Bucket4j-Redis + harici broker (Plan 5 notu) |
| Spec §6'nın 30 günlük kalıcı silme gereksinimi | GDPR | **Plan 6** yazıldı, yürütülmedi |
| Google taksonomisinde olmayan türler (at binme, sörf, tırmanış, dalış) | Bu aktiviteler hiç sunulamıyor | **Plan 7** yazıldı, `deferred` |
| `GET /api/sessions` son 20 oturumla sınırlı, sayfalama yok (`UserProfileQueries.LIST_LIMIT`) | 20+ oturumu olan host eskilerini göremez | cursor + `hasMore` — B-7 adayı |

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
