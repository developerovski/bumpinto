# BumpInto Backend — Mimari

Son güncelleme: 2026-09-05 · Karşılığı olan kod: Plan 1 + Plan 2 + Plan 9 + Plan 10 + Plan 15 (B-7)
+ Plan 18 (B-8) + Plan 22 (B-10) `done`, 303/303 test yeşil.

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
com.bumpinto                                   (111 sınıf)
├── BumpintoApplication                        ← kökte duran TEK sınıf (kural 4)
│
├── domain/                                    39 sınıf — saf Java
│   ├── deck/      DecisionEngine · DeckOutcome · ParticipantLikes
│   ├── geo/       GeoPoint · GeoMath · SearchRadius · TravelEstimate
│   │              SessionCenter (merkezin + yarıçapın TEK kaynağı, B-10)
│   ├── port/      SessionStorePort · DeckStorePort · UserStorePort
│   │              VenueProviderPort · SessionEventsPort · SessionEvent ·
│   │              TurnCredentialsPort · VoiceRoomsPort (B-12, ses odası)
│   ├── session/   Session · SessionStatus · SessionType · Participant · ActivityType
│   │              SessionSummary (liste satırı: sayımlar + karar mekanı)
│   ├── user/      UserProfile (hesap + tercihler)
│   ├── venue/     Venue · VenueCandidate
│   └── voice/     VoiceRoom · Seat · IceConfig · EndReason (B-12, ses odası)
│
├── application/                               15 sınıf — use-case'ler
│   ├── session/   SessionCommands · SessionQueries · SessionExpiry ·
│   │              VoiceCommands · SessionGates (host kuralı, B-12)
│   ├── deck/      DeckFlow
│   ├── user/      UserPreferences · UserProfileQueries
│   ├── text/      Ids · Texts
│   └── error/     NotFound · Conflict · Forbidden · NoVenuesFound Exception
│
├── adapter/                                   47 sınıf
│   ├── in/web/           19 — Session/Participant/Deck/Points/Me/Auth/Voice controller, ApiDtos,
│   │                          ApiExceptionHandler, SessionViewAssembler, ParticipantTokenDelivery,
│   │                          WebPrincipals, WebSocketConfig, SessionWsHandshake ·
│   │                          VoiceDestinations · VoiceSignalController · VoiceRoomListener ·
│   │                          VoiceInboundGuard · PresenceListener
│   └── out/
│       ├── persistence/  15 — *Entity, *Repository, *StoreAdapter
│       ├── provider/      8 — Foursquare · GooglePlaces · ProviderOrchestrator
│       │                       ProviderQuotaCache · ProviderQuota · QuotaAwareVenueProvider
│       │                       ProviderException · QuotaExceededException
│       ├── events/        1 — StompSessionEvents
│       ├── turn/          1 — CloudflareTurnCredentials (Cloudflare TURN kimliği)
│       ├── presence/      2 — InMemoryPresence · InMemoryVoiceRooms
│       └── geocode/       1 — NominatimReverseGeocoder
│
└── infra/                                      9 sınıf — iş kuralı YOK
    ├── security/  SecurityConfig · TokenService · GoogleIdVerifier · AuthCookies
    │              ParticipantPrincipal · ParticipantTokenFilter · RateLimitFilter
    └── config/    AppConfig · AppProps
```

**B-14 ile gelen iki paket:** `domain/safety/` rapor + engel domenini (`Report`, `ReportReason`,
`Block`) tutar — güvenlik oturumun değil KİŞİNİN ilgi alanıdır, `domain/session` altına girseydi
oturum kavramına yapışırdı. `adapter/out/apple/` Apple token takasını ve revoke'unu tutar; Apple
sunucusuna giden TEK kapı orasıdır (`AppleTokensPort`), kimlik token'ı DOĞRULAMA ise dış çağrı
olmadığı için `infra/security/AppleIdVerifier`'da kalır (Google'ın eşi).

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
5. **`venueSourcesAreSelfContained`** — `adapter.out.{foursquare,google,open}..` yalnız
   domain, config, `adapter.out.provider`, birbiri ve framework/kütüphane paketlerine bağımlı
   olabilir; başka bir adapter paketine sızamaz (B-13, `VenueSource` SPI ayrışması).
6. **`orchestratorKnowsOnlyTheSpi`** — `ProviderOrchestrator` somut sağlayıcı paketlerine
   (`foursquare`, `google`, `open`) hiç bağımlı olamaz; yalnız `VenueSource` SPI'sini görür.
7. **`applicationDoesNotSeeVenueSources`** — `application..` somut sağlayıcı paketlerine ve
   `adapter.out.provider..`'a bağımlı olamaz; `DeckFlow` yalnız `VenueProviderPort`'u bilir.

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
tavan 40 km**. `DeckFlow` en az 6, en çok 20 mekanlık deste hedefler. Bu taban yalnız
**çapasız** oturum içindir; `Session.anchor` doluysa merkez ve yarıçap çapadan gelir
(yarıçap sabit 2 km) — bkz. §7 "Çapalı oturum ve merkezin tek kaynağı".

### Deste popülasyonu kuralı: geometri / oy ikilisi

İki ayrı katılımcı kümesi vardır ve karıştırılmamalı:

- **Geometri kümesi** — konumu olan **tüm** katılımcılar (elle eklenen `manual=true` noktalar
  dahil). `midpoint`, `radiusKm` ve mekan araması bu kümeden hesaplanır — **çapasız**
  oturumda; `Session.anchor` doluysa `SessionCenter.of` bu kümeye hiç bakmaz, merkez ve
  yarıçap çapadan gelir (bkz. §7 "Çapalı oturum ve merkezin tek kaynağı").
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
Session        + decidedAt, decisionKind, runoffReason, midpointLabel, anchor (null = orta nokta)
SessionCenter  of(anchor, located) → çapa varsa {çapa, 2 km, anchored} ; yoksa {centroid,
               baseKm, false} ; çapa yok + <2 konum → null (çağıran 409'a çevirir)
DecisionKind   UNANIMOUS | SINGLE_LIKE | RUNOFF | FORCED | PARTIAL
RunoffReason   INTERSECTION | FALLBACK      (INTERSECTION finalist tavanı = 4)
Venue          + category, address, locality, ratingCount, hoursToday, placeLink
SessionView    + midpointLabel, decisionKind, decidedAt, runoffReason, likeCounts (yalnız DECIDED)
               + anchored (true → midpoint yuvarlanmaz, radiusKm sabit 2.0)
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

### Çapalı oturum ve merkezin tek kaynağı (B-10, 2026-09-05)

`Session.anchor` (nullable `GeoPoint`) doluysa oturumun merkezi katılımcı orta noktası
değil o noktadır. Üç sonuç:

- **Yarıçap sabit** (`SessionCenter.ANCHOR_RADIUS_KM = 2 km`). Yayılım kuralı çapada
  saçmalar: Amsterdam çapası + dağınık katılımcılar tabanı 10 km'ye çakıp 40 km'ye
  genişletirdi. Kırsal çapada mekan çıkmazsa `SearchRadius.expandedKm` zaten ×2 açıyor.
- **`midpoint` yuvarlanmaz.** Yuvarlama gizlilik önlemidir ve özel konumlardan türeyen
  noktayı korur; çapa host'un açıkça yazdığı kamu bilgisidir, yuvarlamak harita çemberini
  seçilen yerden ~1 km kaydırmaktan başka bir şey yapmaz.
- **Deste sırası puana geçer.** Çapalı oturumda katılımcıların hiçbiri konum vermemiş
  olabilir — `find-venues`in "en az 2 konumlu katılımcı" önkoşulu düştüğü için bu normal
  bir durumdur. O hâlde `Fairness.of(boş harita)` her mekan için `(0, 0)` döner,
  `DeckOrdering.fairnessFirst` desteyi tek bir eşitlik grubu görüp tamamını tohumlu
  karışıma atar. Konum veren katılımcılar olsa bile merkez artık onlardan türemediği için
  adalet sırası çapayı temsil etmez. Bu yüzden çapalıda kanonik (puan) sırası korunur.
  `DeckFlow.deckOrder` bu dallanmayı **tek yerde** yapar — `findVenues` ve `shuffle` ikisi
  de oradan geçer.

Bu kod tabanında **`midpoint` = oturumun merkezi**; çapa onu üretme yollarından biridir.
`SessionView.midpointLabel` alanı da bu yüzden yeniden adlandırılmadı: kablodaki alanı
değiştirmenin bedeli kozmetik kazancından büyük.

`SessionCenter` merkezi hesaplayan **tek** yerdir. Öncesinde `DeckFlow` ve
`SessionViewAssembler` aynı ağırlıklı centroid + yarıçap hesabını kopyalıyordu; çapayı iki
yere birden eklemek ayrışma riskini ikiye çıkarırdı.

**Garanti edilmeyen:** çapalı oturumda seçilen noktanın çevresinde mekan bulunacağı.
Bulunamazsa `NoVenuesFoundException` döner — telafi amaçlı ikinci bir Places çağrısı
yapılmaz (B-9 bütçe kısıtı).

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

**`provider_usage` (V10)** — `(provider, month)` birincil anahtarlı aylık çağrı sayacı;
replica'dan ve pod yeniden başlatmasından **bağımsız** olsun diye DB'ye taşındı (eskiden
süreç-içi sayaçtı). `ProviderUsageAdapter` `REQUIRES_NEW` ile yazar: çağıran işlem geri
alınsa da sayaç kalıcı kalır.

**`venues` (V10)** — Premium alanlar için `popularity real`, `rating_scale smallint`,
`photo_ref text`, `fetched_at timestamptz not null default now()` eklendi; saklama kuralının
kaybeden satırın adını boşaltabilmesi için `name` artık **nullable** (V1'deki `not null` kalktı).

**`venues_open` + PostGIS (V11)** — açık taban (Overture Places NL + OSM NL, aylık ithal) için
`create extension if not exists postgis` ve `geom geometry(Point, 4326)` sütunlu ayrı tablo;
`gist` indeksi `geom::geography`'de, `gin` indeksi `activity_types text[]`'te. Yerel compose
Postgres'i (`postgres:16-alpine`) bu migrasyonu çalıştıramaz — testler ve entegrasyon ortamı
`postgis/postgis:16-3.4` imajını kullanır (bkz. §13).

---

## 10. Dış mekan sağlayıcıları

Her sağlayıcı `VenueSource` SPI'sini uygular (`descriptor()`, `categories()`, `search()`);
somut paketler (`adapter.out.foursquare`, `.google`, `.open`) birbirini görmez (§5 kural
5–7). Her sağlayıcının kendi `venue-sources/<id>.yml`'i vardır; `bumpinto.venues.route`
aktivite türünü sağlayıcı(lar)a **böler** ve her küme için **sabit** bir sıra tanımlar —
kota ORANI ile sıralama YOK (2026-09-06'da geri alındı, bkz. §7 gerekçe geçmişi).

```
  gerçek arama ── x-ratelimit-* ────▶ ProviderQuotaCache ◀── 429 → EXHAUSTED
                                            │
  DeckFlow ─▶ ProviderOrchestrator ◀────────┘  yalnız "tükendi mi"
       │            │
       │        BudgetGate ──▶ provider_usage (billingZone bazlı REQUIRES_NEW yazım)
       ▼
  30 dk sonuç önbelleği (kova yarıçapı) / 10 dk boş-işaret önbelleği
  degraded sonuç (haversine'a düşülmüş, düşük güvenli) ÖNBELLEKLENMEZ
```

- **`BudgetGate`** her çağrıdan önce `provider_usage`'daki `(provider, month)` sayacını okur;
  `descriptor().billingZone()` faturalama ayının başlangıcını belirler. Bütçe dolarsa
  sağlayıcı `open` (ücretsiz/açık taban) katmana düşer, istek atılmaz, uygulama çökmez.
- **`ProviderQuotaCache`** 429 yanıtını `EXHAUSTED` olarak işaretler; sağlayıcı `resetAt`'e
  kadar atlanır. Kota yalnız *eleme* ölçütüdür, sıralama ölçütü değildir.
- **Sonuç önbelleği** yarıçap **kovası** + aktivite türü anahtarlıdır, 30 dk yaşar; **boş**
  sonuç ayrı ve kısa (10 dk) ömürlüdür — seyrek bölgede kalıcı "mekan yok" olmaz. Haversine
  tahminine düşülmüş **degraded** sonuç bilerek önbelleklenmez: gerçek OSRM/servis cevabı
  geldiğinde bir sonraki çağrı onu yakalasın diye.
- **`RetentionRule`** üç kural işletir (spec §11); saatlik `VenueContentRetention` işi
  süresi geçen satırları indirger (`name` V10'dan beri nullable) ve kazanmamış fotoğrafları
  temizler.
- **`MapLinks`** API'siz harita bağlantısı üretir (ör. `https://maps.google.com/?q=lat,lng`) —
  ayrı bir Maps API anahtarı gerektirmez, `MAP_ENGINE` seçiminden bağımsızdır.
- **`RoutingPort`/OSRM** — `OsrmRouting` `/table` matrisini 60 sn önbellekler ve profil
  başına 60 sn geri çekilme uygular (bkz. `backend/src/main/java/com/bumpinto/adapter/out/routing/OsrmRouting.java`,
  B-13 incelemesi); `TRANSIT` için rota servisi yok, her zaman haversine tahminine düşer.

**Yeni sağlayıcı eklemenin DoD'si (6 madde):**

1. `adapter.out.<id>` paketinde `VenueSource` uygulaması.
2. `venue-sources/<id>.yml` tanım dosyası.
3. `application.yml`'de `bumpinto.venues.sources.<id>` bloğu.
4. `docs/CONFIGURATION.md`'ye ilgili anahtar satırı.
5. Sözleşme testi (`@EnabledIfEnvironmentVariable`, gerçek anahtarla koşulur).
6. `attribution.<id>` i18n anahtarı ve `docs/superpowers/plans/INDEX.md`'de satır.

### Çoklu ilgi alanı ve bulk arama (B-9, 2026-09-04)

Bir oturum 1–3 ilgi alanı taşır. Google `searchNearby` `includedTypes` bir dizi kabul ettiği
için seçilen alanların türleri **tek** istekte birleşir: çoklu seçim ek kota harcamaz.

Üç bağlı karar:

1. **`rankPreference: DISTANCE`.** `maxResultCount` 20'de sert tavanlıdır. Popülarite
   sıralamasında şehir merkezinde kafe/bar, `hiking_area`/`museum` gibi seyrek türleri
   kesitin tamamen dışına itiyordu. Mesafe orta nokta ürününde zaten doğru eğilimdir.
   Bu karar **tek aktiviteli** destelerin içeriğini de değiştirir (bilinçli).
2. **Atıf `primaryType` + `types`'tan geri kurulur.** Bu iki alan Essentials katmanıdır;
   mask zaten Enterprise alanlar taşıdığından faturalama katmanını yükseltmezler. Çözülemeyen
   atıf `null` bırakılır — uydurulmaz.
3. **Foursquare kısmi kapsamayla arama yapmaz.** Orchestrator "ilk dolu sonuç kazanır"
   kuralını işletir; FSQ seçimin bir kısmını servis ederse Google devre dışı kalır ve kullanıcı
   seçtiği bir alandan hiç mekân görmez.

**Telafi çağrısı yoktur**: bir alandan hiç mekân gelmezse ikinci istek atılmaz, durum
`SessionView.emptyActivityTypes` ile bildirilir (Places bütçesi sınırlı — kullanıcı kararı
2026-09-04).

**Seçili bir alanın desteye gireceği GARANTİ EDİLMEZ — bilinçli.** Deste kompozisyonunu
dengeleyen bir kova/round-robin katmanı denendi (`DeckFlow.balanced`) ve **geri alındı**:
sağlayıcıya `limit = DECK_MAX = 20` gidiyor, Google `maxResultCount`'u 20'de tavanlıyor,
orchestrator sonuçları birleştirmiyor ve yarıçap döngüsü biriktirmiyor — yani aday sayısı
hiçbir zaman `DECK_MAX`'ı aşmıyor ve **elenecek bir şey yok**. Katmanın tek gözlemlenebilir
etkisi `DeckOrdering.fairnessFirst`'e giden başlangıç sırasını değiştirmekti, ki bu da
`shuffle()`'ın idempotentlik değişmezini bozuyordu (o sıra `canonicalOrder`'dan yeniden
kurulur; `Collections.shuffle` konum bağımlıdır).

Seyrek türü koruyan tek gerçek mekanizma isteğin **içindedir**: `rankPreference: DISTANCE`.
O da garanti değil — şehir merkezinde 300 m'de 20 kafe varken 4 km'deki `hiking_area` yine
kesitin dışında kalır. Ürün cevabı telafi çağrısı değil, dürüstlüktür: `emptyActivityTypes`
kullanıcıya hangi alandan mekân bulunamadığını söyler.

---

## 11. Olaylar (WebSocket)

STOMP, `/api/sessions/{slug}/ws` uç noktası, konu `/topic/session/{slug}`. Kanal sunucudan
istemciye tek yönlüdür — tek istisna ses sinyali (kural 5).

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
| `voice_started` | `endsAt` |
| `voice_ended` | `reason` (`HOST` \| `TIME_LIMIT` \| `EMPTY`) |
| `voice_roster_changed` | — |
| `blocked` | — |

Tablo `SessionEvent`'in fabrikalarıyla birebirdir; yeni bir olay eklerken buraya da satır düşer.
`voice_roster_changed` yalnız üye kümesi **gerçekten** değiştiğinde yayınlanır — SUBSCRIBE/
UNSUBSCRIBE gürültüsünün tamamı zil çalmaz.

Beş kural:

1. **Commit'ten sonra yayınlanır.** Aktif transaction varsa olay `afterCommit`'e kaydedilir;
   rollback'te hiç gitmez. İstemci var olmayan bir durumu görmez. Use-case'ler saf kalır —
   commit-sonrası mantık adapter'dadır.
2. **En-iyi-çaba.** Yayın hatası yakalanır ve loglanır, çağırana sızmaz. Sızsaydı commit başarılı
   olduğu halde istemci 500 görür ve aynı transaction'ın kalan kancaları atlanırdı. İstemci
   yeniden bağlandığında durumu `GET` ile tazeler.
3. **Kopmada İKİ yayın vardır.** Kopma anındaki `presence_changed` "hâlâ online" der — kişi grace
   penceresi içindedir. Durum ancak pencere geçince değişir ve o an kendiliğinden hiçbir şey
   yayınlanmaz; tek zille istemci değişikliği ancak 30 sn'lik emniyet poll'ünde görürdü. Bu yüzden
   `PresenceListener` grace bitiminde ikinci bir zil zamanlar (`TaskScheduler`). Zamanlanmış zil
   kaldırılırsa "çıkan kişi ekranda online kalıyor" hatası geri gelir; testi
   `PresenceOverWebSocketTest.aClosingSocketNotifiesTheOnesStillInTheRoom`.
4. **Presence süreç içidir.** `InMemoryPresence` tek pod'un hafızasında yaşar: çok pod'da
   paylaşılmaz, restart'ta boşalır (ilk reconnect doldurur) ve 2 sn'lik grace penceresi yalnızca
   sayfa yenilemesini yutar (kullanıcı kararı 2026-09-04: sekme kapanınca kişi ANINDA çevrimdışı
   görünmeli; ilk 45 sn'lik değer bunu öldürüyordu). `ProviderQuotaCache` ile aynı sınıf borç.
   Kimlik `SessionConnectEvent`'ten okunur, `SessionConnectedEvent`'ten **değil**: ikincisi broker'ın
   CONNECT_ACK'idir ve handshake niteliklerini taşımaz (`PresenceListener`).
   Grace penceresinin anlamlı olması **heartbeat'e bağlıdır**: `TaskScheduler` verilmezse STOMP
   heartbeat'i sessizce kapanır ve kopukluk yalnız TCP zaman aşımıyla (saatler) anlaşılır — sekme
   kapatmak FIN gönderir ama kapak kapanması göndermez. 10 sn çift yönlü heartbeat bunu ~20 sn'ye
   bağlar (`WebSocketConfig.configureMessageBroker`) — yani "anında" yalnız temiz kapanışlar için
   geçerlidir, ağ kaybında üst sınır heartbeat'tir.
   Presence yalnız **geri alınabilir giriş** kararlarını kapatır (`shuffle`); deste bitişi gibi
   geri alınamaz kararlar satıra bakmaya devam eder — bir ağ dalgalanması kalıcı bir kararı
   erken tetiklememelidir.
5. **Ses kanalı tek istisnadır — istemci burada SEND de yapar.** İstemci SEND'i yalnız
   `/app/sessions/{slug}/voice/signal` adresine (kendi slug'ı) geçer, **başka hiçbir adrese değil**
   ve asla `/topic` altına değil. `VoiceSignalController` gövdeyi (`from` sunucu tarafından
   damgalanır; `type`, `sdp?`, `candidate?`) hedefin özel konusuna
   `/topic/session/{slug}/voice/{participantId}` iletir, saklamaz. Özel konuya yalnız sahibi abone
   olabilir ve **abone olmak ses üyeliğidir** (`VoiceRoomListener`): SUBSCRIBE koltuk açar,
   UNSUBSCRIBE o koltuğu, DISCONNECT soketin tüm koltuklarını düşürür. Inbound interceptor
   `VoiceInboundGuard` hedefleri tam eşleşmeyle denetler ve soket başına bütçe uygular
   (SUBSCRIBE+UNSUBSCRIBE 20/dk, SEND 240/dk; aşımda sessizce düşer). Yük 16 KB'a, `candidate`
   alanı en fazla 16 alana kırpılıdır; taşıma çerçevesi 32 KB'a (Tomcat'in metin tamponu
   `WebSocketConfig`'te bir `ServletServerContainerFactoryBean` ile 32 KB'a çıkarılmıştır).
   Oda `InMemoryVoiceRooms`'da yaşar (presence ile aynı süreç içi borç: Caffeine + `Clock` +
   `TaskScheduler`); `endsAt = min(şimdi + azami süre, oturumun bitişi)`, süre dolunca zamanlayıcı
   odayı kapatır ve tahliye kendi zamanlayıcısını iptal eder. Bu `TaskScheduler` Spring Boot'un
   otomatik kurduğu `messageBrokerTaskScheduler` bean'idir (havuz = CPU çekirdek sayısı) — oda
   süre dolumu ve `PresenceListener`'ın grace zili bu havuzu paylaşır; STOMP heartbeat'i ise
   `WebSocketConfig.heartbeatScheduler()`'ın kendi tek iş parçacıklı (bean OLMAYAN)
   zamanlayıcısındadır, ikisi karışmaz. Grace zilinde oturumda kimse
   kalmadıysa `PresenceListener` `endIfEmpty` ile odayı kapatır. Host kuralı
   `SessionGates.requireHost`'ta paylaşılır (`SessionCommands`, `DeckFlow`, `VoiceCommands`).
   TURN kimliği `CloudflareTurnCredentials`'tan gelir; Cloudflare'e ulaşılamazsa yalnız STUN ile
   (`relay=false`) devam edilir. Karar dokümanı:
   `docs/superpowers/specs/2026-09-06-voice-chat-design.md`.

6. **Engel iki farklı kural üretir.** Roster'da engel TEK YÖNLÜDÜR: `ParticipantDto.blocked`
   yalnız engelleyene `true` gelir, engellenen hiçbir işaret görmez (engel bir mesaj değildir).
   Ses odasında engel ÇİFT YÖNLÜDÜR: `VoiceRoomListener` SUBSCRIBE anında `VoiceAdmission`'a
   sorar ve engelli çift aynı odaya alınmaz; `VoiceSignalController` ikinci savunma katmanı
   olarak engelli hedefe sinyal taşımaz. `VoiceInboundGuard` bu işe karışmaz — gövdedeki hedefi
   görmez, yalnız adres ve soket bütçesi denetler. Anonim koltuk engeli (`user_id` null) yalnız
   o oturum boyunca yaşar.

---

## 12. Yapılandırma ve sırlar

`AppProps` (`@ConfigurationProperties("bumpinto")`) — `security`, `apple`, `cors`, `cookies`,
`rateLimit`, `geocode`, `voice` (azami süre), `turn` (Cloudflare anahtarı; `api-token` sır),
`venues`, `map`, `routing`, `retention`. Sır taşıyan alanlar `toString()`'de maskelenir.

**`bumpinto.apple`** — Sign in with Apple (App Store 4.8). `services-id` web akışının `aud`'u ve
token uçlarında `client_id`; `bundle-id` native iOS akışının `aud`'u (Apple orada Services ID
değil bundle id basar — bu yüzden audience TEK değil, liste); `team-id` + `key-id` + `private-key`
(`AuthKey_*.p8` PEM, **sır**) ES256 client secret'ını imzalar. Boş bırakılabilir: uygulama açılır,
`POST /api/auth/apple` 503 `apple_not_configured` döner — Turn ile aynı fail-open düşüncesi,
çünkü Apple girişi yerelde anahtar ister, Google girişi istemez ve açılış kapısı tüm yerel
geliştirmeyi kırardı. Prod'da ZORUNLU.

**Hesap silme semantiği (R-B2).** Erişim ANINDA kapanır (`users.deleted_at` → `profileOf` boş
döner), fiziksel satır 30 günde gider (`users.purge_after`; süpürmeyi `RetentionJob` yapar).
Host olduğu oturumlar silinir — sahipsiz kalamazlar; başkasının oturumundaki koltuklar SİLİNMEZ,
anonimleşir, yoksa o oturumun orta noktası, deste geometrisi ve oy popülasyonu geriye dönük
değişir. `users`'a bakan FK'lar bu fiziksel silmeyi kaldırabilecek şekilde tanımlıdır:
`reports.reporter_user_id` `on delete set null` (moderasyon izi kalır, kişisel bağ kopar),
`blocks.*_user_id` `on delete cascade`.

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

### Sağlayıcı bütçeleri, harita, geocode, rota (B-13'ten sonra)

`bumpinto.providers.*` ve `bumpinto.quota.*` **kalktı**; yerini şunlar aldı:

| Ayar | Varsayılan | Ne yapar |
|---|---|---|
| `bumpinto.venues.sources.<id>.enabled` | sağlayıcıya göre | O sağlayıcıyı açar/kapatır (ör. `foursquare`, `google`). |
| `bumpinto.venues.sources.<id>.key` | — | Sağlayıcının API anahtarı (`FOURSQUARE_API_KEY` vb.). |
| `bumpinto.venues.sources.<id>.budget` | sağlayıcıya göre | `BudgetGate`'in okuduğu aylık çağrı tavanı (`provider_usage` üzerinden); dolunca `open` katmana düşülür, çökmez. |
| `bumpinto.map.engine` (`MAP_ENGINE`) | `maplibre` | `maplibre` veya `google`; `google` seçilirse `GOOGLE_PLACES_API_KEY` zorunlu olur. |
| `bumpinto.geocode.base-url` (`GEOCODE_BASE_URL`) | Nominatim genel adresi | Kendi Nominatim-uyumlu sunucunuz olabilir. |
| `bumpinto.routing.osrm.*` (`OSRM_CAR_URL`/`OSRM_BICYCLE_URL`/`OSRM_FOOT_URL`) | boş | Profil başına OSRM `/table` taban URL'i; boş = haversine tahmini. |
| `bumpinto.retention.enabled` (`RETENTION_ENABLED`) | `true` | Saatlik `VenueContentRetention` işini açar/kapatır. |

Sayaçlar artık `provider_usage` tablosunda (bkz. §9), süreç içi **değil**: pod yeniden
başlasa da ay içi sayım kalıcıdır. Foursquare tarafında Premium alanlar (`rating`, `price`,
`photos`) artık **isteniyor** (V10, spec §5.1); `open` katmana düşüldüğünde bu alanlar
boş kalır ve kart bunu açıkça söyler.

---

## 13. Test mimarisi

303 test. Katman katman:

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

**İmaj `postgis/postgis:16-3.4`'tür** (düz `postgres` değil): V11 `create extension postgis`
çalıştırır, düz Postgres bu migrasyonu geçemez. Geliştiricinin yerel `docker compose`
Postgres'i (`postgres:16-alpine`) bilerek düz bırakıldı — testler ve OpenAPI/tip üretimi gibi
tek seferlik işler kendi PostGIS container'ını (`DockerImageName.parse("postgis/postgis:16-3.4")
.asCompatibleSubstituteFor("postgres")`) ayrı bir porttan açar, geliştiricinin verisine dokunmaz.

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
