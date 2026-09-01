# Plan 7: Dinamik aktivite keşfi — self-host Overpass (OSM)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aktivite seçimini sabit 5'lik `ActivityType` enum'undan çıkarıp, oturumun **gerçek orta
noktası** çevresinde OSM'de fiilen var olan aktivitelerden üretmek. Kullanıcı aklında olmayan bir
şey keşfedebilsin: at binme, sörf, tırmanış, buz pateni, dalış.

**Neden Google/Foursquare değil (KARAR VERİLDİ — yeniden tartışılmaz):**
- **Google Places elendi.** `includedTypes` zorunlu girdidir (max 50 tür/istek), "hepsini ver"
  diyemezsiniz; `maxResultCount` 20 ve sayfalama yok, dolayısıyla çok türlü tek istekten çıkan
  histogram popüler türün lehine bozulur. Daha ağırı: Table A'da **at binme, sörf, tırmanış,
  dalış yok**. Keşfettirmek istediğimiz uzun kuyruğun yarısı taksonomide kavram olarak mevcut değil.
- **Foursquare kısmen elendi.** `fsq_category_ids` opsiyoneldir (kategorisiz geniş arama mümkün) ve
  yanıtta `categories` döner, ama `limit` max **50** ve sayfalama yok. 2000 POI'lik bir dairede
  50'lik örneklem FSQ'nun kendi sıralamasıyla gelir → liste kafe/restoranla dolar, at binme tesisi
  hiç görünmez. Keşif tam da öldürmek istediğimiz yerde ölür.
- **OSM/Overpass seçildi.** `nwr(around:R,lat,lng)["sport"]` tek istekte dairedeki ham etiketleri
  döner; histogramı biz çıkarırız. Sınır yok, anahtar yok, uzun kuyruk gerçekten orada.
  Bedeli **self-host** (public instance'ta üretim kullanımı kullanım politikasına aykırı ve
  rate-limitli) ve OSM'de puan/foto/fiyat olmaması.

**Architecture:** Hexagonal devamı.
`domain.activity` (saf: `ActivityCode`, `AvailableActivity`) ·
`domain.port.ActivityDiscoveryPort` (saf) ·
`application.activity.ActivityDiscovery` (orta nokta + yarıçap + geri düşüş) ·
`adapter.out.osm` (`OverpassClient`, `ActivityCatalog`, `OverpassActivityDiscovery`,
`OsmVenueProvider`) · `adapter.in.web` (yeni GET ucu).

> **Paket notu:** Overpass istemcisi, katalog ve iki tüketicisi **tek bir entegrasyondur**;
> hepsi `adapter.out.osm` altında durur. `OsmVenueProvider`'ı `adapter.out.provider`'a taşımak
> `OverpassClient`'ı hiçbir kazanç olmadan paketler arası public yapardı. `ResilientVenueProvider`
> zaten somut `FoursquareVenueProvider`/`GooglePlacesVenueProvider`'a bağımlı — paketler arası
> somut bağımlılık bu katmanda zaten var olan şekil.

**Tech Stack:** Plan 2 yığını (Unirest, Caffeine, Flyway — hepsi mevcut). **Yeni Java bağımlılığı YOK.**
Yeni **altyapı** bağımlılığı var: self-host Overpass servisi (Task 7).

---

## DURUM: ERTELENDİ (2026-09-01) — bu plan yürütülmüyor

Kullanıcı, maliyeti gördükten sonra ucuz yolu seçti: `ActivityType` enum'u **5 → 15** genişletildi
(Plan 2 kodu üzerinde doğrudan, 123/123 test yeşil). Yeni türlerin tamamı Google Places Table A'dan
doğrulandı ve **yalnız Google'dan** servis edilir; Foursquare eşlemesi bilerek yazılmadı.

**Bu plan neyi hâlâ çözer:** Google taksonomisinde kavram olarak BULUNMAYAN türler —
**at binme, sörf, tırmanış, dalış**. Enum genişletmesi bunları veremez; OSM verebilir.
Bu türler gerçekten istenirse plan buradan açılır.

**Açılırsa sıra:** Task 1-6 **Plan 3'ten ÖNCE** koşar (API sözleşmesini değiştirir; iki arayüzü
değişmek üzere olan sözleşmeye karşı yazmamak için). Task 7 (K8s) Plan 5 Task 3'e bağımlıdır.
Plan 3/4'e kapı satırı **eklenmedi** — erteleme kararı gereği; plan açılırsa ilk iş odur.

---

## Ön koşullar ve SIRA (BAĞLAYICI — kilitlenme önlemi)

Plan 2 `done` olmalı.

Bu plan **API sözleşmesini değiştirir** (`activityType` enum → açık kod, yeni GET ucu).
Plan 3 (web) ve Plan 4 (mobil) metinleri eski enum'a göre yazıldı ve henüz yürütülmedi.
Değişmek üzere olan bir sözleşmeye karşı iki arayüz yazmamak için sıra nettir:

**Plan 7 Task 1-6 → Plan 3 → Plan 4 → Plan 5 Task 1-3 → Plan 7 Task 7 → Plan 6 → Plan 5 Task 4**

- Task 1-6 tamamen backend + yerel geliştirme; Plan 5'ten bağımsız koşar.
- **Yalnız Task 7** (K8s manifest'leri) Plan 5 **Task 3'ün** çıktısına dayanır — namespace, imaj ve
  kaynak adlarını oradan alır. Plan 6'daki desenin aynısı.
- Plan açılırsa **ilk iş** Plan 3 ve Plan 4'e bu planı işaret eden kapı satırlarını eklemektir.

---

## Bu plana özel kurallar

- **INDEX güncelle:** başlarken `in-progress`, her görev sonunda `Son adım`, bitince `done`.
- **Git yazma işlemi YOK** — commit adımları kullanıcıya bırakılır.
- Komutlar `rtk` önekiyle; `mvn` komutları `backend/` dizininden.
- Test komutu tam hali (jenv + ryuk ortam notları):
  `JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true rtk mvn -o test`
- Entegrasyon testlerinde **her zaman** `com.bumpinto.support.PostgresContainer.shared()`;
  `new PostgreSQLContainer<>` / `@Container` / `@Testcontainers` KULLANMA (sonuncu ikisi no-op).
- Çalışma anında `Unresolved compilation problem` ya da tuhaf bean hatası görürsen: VSCode Java dil
  sunucusu `target/classes`'a yazmıştır. `rtk mvn -o compile` çalıştır, gerçek hata orada.
- **Overpass'a test içinden ASLA gerçek çağrı yapılmaz.** Ağ testi = flake. Parser testleri kayıtlı
  JSON fixture ile, akış testleri fake port ile.
- Sır DEĞERLERİ asla dosyaya yazılmaz; `.env` OKUNMAZ.
- **Yeni/değişen her HTTP ucu için Bruno isteği** (`backend/.infra/bumpinto-collection/`) —
  AGENTS.md "API Collection Policy". Bu, ucun definition-of-done'ının parçasıdır.

---

## Kapsam kararları (BAĞLAYICI — uygulayan ajan bunları yeniden tartışmaz)

1. **Keşif dinamiktir, sözlük küratörlüdür.** OSM'in ham etiket alanı doğrudan kullanıcıya
   gösterilemez (`amenity=waste_basket`, `leisure=picnic_table` gelir). `ActivityCatalog` elle
   yazılmış bir eşlemedir: OSM etiketi → (kod, TR etiket, sağlayıcı eşlemesi). **Dinamik olan liste
   değil, o dairede o aktivitenin fiilen var olup olmadığı ve kaç mekanla.** Küratörsüz keşif =
   çöp liste; bu bir sınırlama değil ürün gereğidir.

2. **Keşif, orta nokta hesaplandıktan SONRA çalışır.** Host oturumu kurarken daire yoktur (merkez
   katılımcı konumlarından doğar). Yeni uç `GET /api/sessions/{slug}/activities`, `DeckFlow`'un
   kullandığı **aynı** `GeoMath.centroid` + `SearchRadius.baseKm` ile daireyi kurar. Kod
   kopyalanmaz; ortak hesap `application.activity` tarafından çağrılır.

3. **`activityType` oturum kurulumunda ZORUNLU kalır, `find-venues`'de EZİLEBİLİR.**
   Nullability'yi `Session`/`SessionView`/DB'ye yaymamak için. Host ilk niyetini belirtir; keşif
   listesini gördükten sonra `POST /find-venues {"activityCode":"horse_riding"}` ile değiştirir.
   Bu çağrı `sessions.activity_type`'ı da günceller — aksi halde `SessionView` yalan söyler.

4. **`ActivityType` enum'u KALDIRILIR.** Yerine `ActivityCode` value object gelir
   (`^[a-z][a-z0-9_]{1,39}$`). Jackson'ın bedava enum doğrulaması gider; yerine **katalog
   üyeliği doğrulaması** gelir (bilinmeyen kod → 400). Açık uçlu string ASLA kabul edilmez.

5. **Deste kaynağı, seçilen aktivitenin eşlemesine bakar:**
   - Katalog girdisinde FSQ/Google eşlemesi VARSA → mevcut `ResilientVenueProvider` zinciri
     (zengin kart: puan, foto, fiyat).
   - Eşleme YOKSA (uzun kuyruk: sörf, at binme) → `OsmVenueProvider`. Kartta **foto ve puan yok.**
   - `VenueCandidate` bu alanlar için zaten `null` kabul ediyor → **domain değişmez.**

6. **Uzun kuyruk destesinde karar motoru davranışı değişir ve bu KABUL EDİLİR.** `DeckFlow` zaten
   `v.rating() == null ? 0.0` yapıyor; OSM destesinde tüm puanlar 0.0 olur, yani beğeni sayısı tek
   belirleyicidir ve beraberlik daha sık runoff'a gider. Doğru davranış — plana yazılıyor ki
   sonradan "bug" diye raporlanmasın.

7. **Cache: Caffeine, 24 saat TTL.** Postgres tablosu YOK. Overpass self-host olduğu için kota
   derdi yok; cache yalnız gecikme ve dayanıklılık için. OSM verisi günlerce değişmez.
   `ResilientVenueProvider`'daki kuralın aynısı: **boş sonuç ve hata CACHE'LENMEZ.**

8. **Overpass düşerse oturum ÖLMEZ.** Hata/timeout/boş yapılandırma durumunda keşif ucu katalogdaki
   **temel kümeyi** (sağlayıcı eşlemesi olan girdiler) `venueCount = null` ile döner. Keşif kaybolur,
   akış devam eder. `ResilientVenueProvider` felsefesinin aynısı.

9. **`bumpinto.discovery.overpass-url` boşsa keşif kapalıdır** ve temel küme döner. Bu, özelliğin
   bayrağıdır: Overpass'sız yerel geliştirme çalışır. **`AppProps.required(...)` KULLANILMAZ** —
   bu bir sır değil ve eksikliği açılışı engellememelidir.

10. **Yalnız `name` etiketi olan OSM elemanları sayılır.** İsimsiz bir park kart olamaz; sayarsak
    "3 sörf yeri var" deyip boş deste veririz.

11. **Overpass'a yalnız backend erişir** — K8s'te ClusterIP Service, **Ingress YOK**. Dışarı açık
    bir Overpass tek başına bir DoS yüzeyidir.

12. **Yeni uç pahalı bir arka uca dokunur → kendi rate limit politikası olur.** Aksi halde geniş
    `api` kovasına (120/dk) düşer.

---

## Katalog doğrulama kuralı (BAĞLAYICI — bu planın en önemli kuralı)

`ActivityCatalog`'a yazılan **her OSM etiketi** `https://taginfo.openstreetmap.org/tags/<key>=<value>`
üzerinden doğrulanacak ve **global kullanımı > 1000** olacak. Doğrulanamayan / eşiğin altındaki
etiket katalogdan ÇIKARILIR.

**Gerekçe:** Plan 2'de Foursquare kategori ID'leri ölü v3 taksonomisinden alındı ve doğrulanamadı;
bugün hâlâ açık bir risk olarak duruyor (yanlış ID hata vermez, **sessizce yanlış sonuç** verir).
Aynı hata sınıfı burada 30+ etikete çarpılırdı. Ajan, doğruladığı sayıları görev raporuna yazar.

---

## Task 1: Domain — `ActivityCode`, `AvailableActivity`, port; enum'un emekliye ayrılması

**Files:**
- `backend/src/main/java/com/bumpinto/domain/activity/ActivityCode.java` (yeni)
- `backend/src/main/java/com/bumpinto/domain/activity/AvailableActivity.java` (yeni)
- `backend/src/main/java/com/bumpinto/domain/port/ActivityDiscoveryPort.java` (yeni)
- `backend/src/main/java/com/bumpinto/domain/session/ActivityType.java` (SİL)
- `backend/src/main/resources/db/migration/V3__activity_code.sql` (yeni)
- Dokunulacak 8 dosya: `domain/session/Session.java`, `domain/port/VenueProviderPort.java`,
  `application/session/SessionCommands.java`, `adapter/out/persistence/SessionStoreAdapter.java`,
  `adapter/in/web/ApiDtos.java`, `adapter/out/provider/{Foursquare,GooglePlaces,Resilient}VenueProvider.java`

**Step 1: `ActivityCode` value object**
- [ ] `public record ActivityCode(String value)` — compact ctor `^[a-z][a-z0-9_]{1,39}$` doğrular,
      ihlalde `IllegalArgumentException`. `toString()` ham değeri döner.
- [ ] Saf domain: Spring/Jackson anotasyonu YOK (ArchUnit `domainHasNoFramework` bunu zaten kovalar).
- [ ] Test: geçerli/geçersiz kod tablosu (`coffee` ✓, `Coffee` ✗, `1x` ✗, `a` ✗, 40+ karakter ✗).

**Step 2: `AvailableActivity`**
- [ ] `public record AvailableActivity(ActivityCode code, String label, Integer venueCount)`.
- [ ] `venueCount` **nullable** — bilinmiyor (Overpass kapalı/düştü) ile sıfır farklı şeylerdir.

**Step 3: Port**
- [ ] `ActivityDiscoveryPort { List<AvailableActivity> availableAt(GeoPoint center, double radiusKm); }`
- [ ] `domain/port/` altında (mevcut konvansiyon: tüm portlar orada).

**Step 4: Enum'u kaldır (mekanik)**
- [ ] `ActivityType` → `ActivityCode` 8 dosyada. `SessionStoreAdapter`'da
      `ActivityType.valueOf(e.activityType)` → `new ActivityCode(e.activityType)`,
      `s.activityType().name()` → `s.activityType().value()`.
- [ ] `ApiDtos.CreateSessionRequest.activityType` → `@NotBlank @Size(max=40) String activityType`
      (doğrulama katalog üyeliğiyle Task 4'te tamamlanır — **bu adımda TODO bırakma, Task 4'e bağla**).
- [ ] `ApiDtos.SessionView.activityType` → `String` (istemciye kod gider; etiket keşif ucundan gelir).
- [ ] `Foursquare`/`GooglePlaces` provider'larındaki `Map<ActivityType,String>` sabitleri Task 2'de
      `ActivityCatalog`'a taşınacak — **bu adımda sadece derlenir halde tut**, silme.

**Step 5: V3 migration**
- [ ] Eski enum değerlerini yeni kodlara çevir — `lower()` DEĞİL, açık eşleme:
      `COFFEE→coffee, FOOD→food, BAR→bar, WALK→park, ACTIVITY→bowling`.
      (`WALK`/`ACTIVITY` isimleri artık ne aradıklarını anlatmıyor; kod anlatır.)
- [ ] `alter table sessions add constraint sessions_activity_type_format
      check (activity_type ~ '^[a-z][a-z0-9_]{1,39}$')`.
- [ ] Test: migration sonrası bu 5 kodun **hepsi katalogda var** (Task 2 bittiğinde doğrulanır —
      testi şimdi yaz, `@Disabled` DEĞİL; Task 2 onu yeşile çevirir).

**Step 6: Doğrula**
- [ ] `rtk mvn -o test` → mevcut 120 test yeşil (isim değişiklikleri dışında davranış değişmedi).

---

## Task 2: `ActivityCatalog` — küratörlü OSM ↔ aktivite ↔ sağlayıcı eşlemesi

**Files:** `backend/src/main/java/com/bumpinto/adapter/out/osm/ActivityCatalog.java`,
`ActivityDefinition.java`, `+ CatalogTest`

**Step 1: Kayıt tipi**
- [ ] `record ActivityDefinition(ActivityCode code, String label, List<OsmTag> osmTags,
      String fsqCategoryId, String googleType)` — son iki alan **nullable** (uzun kuyrukta yok).
- [ ] `record OsmTag(String key, String value)` — **tam eşleşme, regex YOK.** Regex'li katalog
      hata ayıklanamaz hale gelir ve taginfo ile doğrulanamaz.

**Step 2: Katalog içeriği (~25-35 girdi)**
- [ ] Mevcut 5'i koru (kod ← V3 migration ile aynı): `coffee` (amenity=cafe | FSQ 13032 | cafe),
      `food` (amenity=restaurant | 13065 | restaurant), `bar` (amenity=bar + amenity=pub | 13003 | bar),
      `park` (leisure=park | 16032 | park), `bowling` (leisure=bowling_alley | 10027 | bowling_alley).
- [ ] Uzun kuyruğu ekle — **kullanıcının istediği keşif budur:** at binme, yüzme, sörf, dalış,
      tırmanış, buz pateni, tenis, golf, karting, yelken, plaj, müze, sanat galerisi, sinema,
      tiyatro, hayvanat bahçesi, tema parkı, doğa yürüyüşü/manzara, fitness, bilardo.
- [ ] Her etiket **taginfo'da doğrulanır (>1000 kullanım)**; doğrulanamayan çıkarılır. Sayıları rapora yaz.
- [ ] FSQ/Google eşlemesi **yalnız emin olunan girdilere** yazılır. Emin değilsen `null` bırak —
      `null` "OSM'den getir" demektir ve çalışır; yanlış ID sessizce yanlış sonuç verir.
      **Plan 2'den devralınan 5 FSQ ID'si doğrulanmamıştır; bu planda doğrulanmaz, olduğu gibi taşınır
      ve INDEX'teki açık madde açık kalır.**

**Step 3: Arama**
- [ ] `Optional<ActivityDefinition> byCode(ActivityCode)` ve
      `Optional<ActivityDefinition> byOsmTag(String key, String value)` — ikincisi ters indeksle O(1).
- [ ] `List<ActivityDefinition> baseSet()` → sağlayıcı eşlemesi olanlar (Overpass kapalıyken dönen küme).
- [ ] `@Component`, immutable, statik başlatma.

**Step 4: Testler**
- [ ] Kodlar benzersiz; her kod `ActivityCode` desenine uyar.
- [ ] Bir OSM etiketi **iki farklı aktiviteye** eşlenmez (ters indeks çakışması → belirsiz histogram).
- [ ] Task 1 Step 5'teki "5 migrasyon kodu katalogda" testi **yeşile döner**.
- [ ] `baseSet()` boş değil.

---

## Task 3: `OverpassClient` + `OverpassActivityDiscovery`

**Files:** `adapter/out/osm/OverpassClient.java`, `OverpassActivityDiscovery.java`,
`OverpassException.java`, `infra/config/AppProps.java` (Discovery kaydı), `AppConfig`/`application.yml`

**Step 1: Yapılandırma**
- [ ] `AppProps`'a `record Discovery(String overpassUrl, Duration timeout, int maxElements)`.
      Varsayılanlar: url boş, timeout 8 sn, maxElements 800. **`required(...)` çağırma** (karar 9).
- [ ] `application.yml`: `bumpinto.discovery.overpass-url: ${OVERPASS_URL:}`.

**Step 2: Sorgu**
- [ ] Tek POST, gövde Overpass QL:
      ```
      [out:json][timeout:25];
      (
        nwr(around:R,LAT,LNG)["leisure"];
        nwr(around:R,LAT,LNG)["sport"];
        nwr(around:R,LAT,LNG)["tourism"];
        nwr(around:R,LAT,LNG)["amenity"~"^(cafe|restaurant|bar|pub|cinema|theatre|nightclub|biergarten)$"];
        nwr(around:R,LAT,LNG)["natural"~"^(beach)$"];
      );
      out tags center MAXELEMENTS;
      ```
- [ ] `nwr` node+way+relation demektir. **`out ... center` ZORUNLU:** POI'lerin çoğu (park, spor
      tesisi) node değil way/relation'dır ve `center` olmadan koordinatsız gelir.
- [ ] Parser `lat`/`lon` (node) **veya** `center.lat`/`center.lon` (way/relation) okur — ikisi de.
      Bu ayrımı kaçırmak "sonuç var ama hepsi koordinatsız"a yol açar.

**Step 3: `OverpassElement` → histogram**
- [ ] `record OverpassElement(String type, long id, GeoPoint location, Map<String,String> tags)`.
- [ ] `name` etiketi olmayan eleman ATILIR (karar 10).
- [ ] Her eleman katalogdaki ters indekse sorulur; eşleşen aktivitenin sayacı artar.
      Bir eleman birden çok etiketle eşleşirse **bir kez sayılır** (ilk eşleşme; `LinkedHashMap`
      ile katalog sırası deterministik olsun).
- [ ] Sıralama: `venueCount` azalan, eşitlikte katalog sırası. Deterministik olmalı — testte
      sabitlenir.

**Step 4: Cache + geri düşüş**
- [ ] Caffeine, `maximumSize(1000)`, `expireAfterWrite(24h)`.
      Anahtar `ResilientVenueProvider` desenindeki gibi yuvarlanmış:
      `String.format(Locale.ROOT, "%.3f:%.3f:%.1f", lat, lng, radiusKm)`.
- [ ] **Boş sonuç ve hata cache'lenmez.**
- [ ] `overpassUrl` boş **veya** çağrı hata/timeout verirse → `catalog.baseSet()` `venueCount=null`
      ile döner; `log.warn` mesajı **URL veya sır içermez**.

**Step 5: Testler (ağ YOK)**
- [ ] `src/test/resources/overpass/istanbul-sample.json` — elle kısaltılmış gerçekçi yanıt:
      node + way(center) + isimsiz eleman + katalogda olmayan etiket, hepsi bir arada.
- [ ] Parser testi: isimsiz eleman elendi, way center'dan koordinat aldı, bilinmeyen etiket
      sayılmadı, histogram beklenen sırada.
- [ ] Geri düşüş testi: url boş → `baseSet()`, `venueCount` hepsi `null`.
- [ ] Hata testi: client istisna atıyor (stub) → `baseSet()`, istisna DIŞARI SIZMAZ.
- [ ] Cache testi: iki çağrı, client bir kez çağrıldı; boş sonuç sonrası ikinci çağrı client'a gitti.

---

## Task 4: Keşif use-case + `GET /api/sessions/{slug}/activities` + rate limit + Bruno

**Files:** `application/activity/ActivityDiscovery.java`, `adapter/in/web/SessionController.java`,
`ApiDtos.java`, `infra/security/RateLimitFilter.java`,
`backend/.infra/bumpinto-collection/sessions/list-activities.yml`

**Step 1: Use-case**
- [ ] `@Service ActivityDiscovery(SessionStorePort store, ActivityDiscoveryPort discovery, Clock clock)`.
- [ ] `List<AvailableActivity> forSession(String slug)`:
      `SessionExpiry.required(...)` → konumlu katılımcılar → `GeoMath.centroid` →
      `SearchRadius.baseKm` → `discovery.availableAt(...)`.
- [ ] **Merkez hesabı `DeckFlow` ile birebir aynı olmalı**, aksi halde keşifte görünen aktivite
      deste kurulurken boş çıkar. `DeckFlow.deckPopulation` ile aynı filtre: `Participant::hasLocation`.
- [ ] Konumlu katılımcı < 2 → `ConflictException("need at least 2 participants with location")`
      (`DeckFlow.findVenues` ile birebir aynı mesaj ve sınıf).
- [ ] `@Transactional(readOnly = true)`.

**Step 2: Uç**
- [ ] `GET /api/sessions/{slug}/activities` → `List<ApiDtos.ActivityDto>`.
- [ ] `record ActivityDto(String code, String label, Integer venueCount)`.
- [ ] Yetki: **oturum üyeliği yeterli, host şartı YOK** — keşif herkesin görmesi gereken bilgi.
      `GET /{slug}` ile aynı erişim seviyesi.

**Step 3: `CreateSessionRequest` doğrulaması tamamlanır**
- [ ] `SessionCommands.createSession` katalogda olmayan kodu reddeder → 400
      (`application.error` altındaki mevcut istisna sınıflarından uygun olanı; yeni sınıf açma).
- [ ] Test: `{"activityType":"definitely_not_a_thing"}` → 400, gövdede kod ismi echo edilmez.

**Step 4: Rate limit**
- [ ] `defaultPolicies()`'e: `new Policy("activities", "GET",
      Pattern.compile("^/api/sessions/[^/]+/activities$"), 10)` — `api` (120) politikasından
      **ÖNCE** gelmeli (liste sırayla eşleşiyor).
- [ ] Mutasyon doğrulaması: politikayı listeden çıkar → testin KIRMIZI olduğunu gör → geri koy.
      Sırayı bozup `api`'nin arkasına al → testin KIRMIZI olduğunu gör → geri koy.

**Step 5: Bruno**
- [ ] `sessions/list-activities.yml` — OpenCollection biçimi (`info`/`http`/`runtime`), `seq`
      `get-session`'dan sonra / `find-venues`'den önce.
- [ ] `after-response` script'i ilk aktivitenin kodunu `bru.setVar("activityCode", ...)` ile yazar
      → `find-venues` bunu kullanır, koleksiyon baştan sona akmaya devam eder.
- [ ] `docs:` bloğu: yetki seviyesi, rate limit (10/dk), `venueCount: null` anlamı.

---

## Task 5: `OsmVenueProvider` + yönlendirme + `find-venues` ezme

**Files:** `adapter/out/osm/OsmVenueProvider.java`,
`adapter/out/provider/ResilientVenueProvider.java`, `application/deck/DeckFlow.java`,
`adapter/in/web/SessionController.java`, `ApiDtos.java`, Bruno `find-venues.yml`

**Step 1: `OsmVenueProvider implements VenueProviderPort`**
- [ ] Aynı `OverpassClient`'ı kullanır ama **seçilen aktivitenin etiketleriyle daraltılmış** sorgu
      atar (tüm daireyi çekip filtrelemek israf).
- [ ] `VenueCandidate(provider="osm", externalId="node/123456", name, location,
      rating=null, priceLevel=null, photoUrl=null, mapsUrl="https://maps.google.com/?q=lat,lng")`.
      `mapsUrl` biçimi `FoursquareVenueProvider` ile birebir aynı (kullanıcının harita
      uygulamasında açılır; osm.org linki çoğu telefonda tarayıcıda kalır).
- [ ] `externalId` `type/id` bileşik olmalı: node 123 ve way 123 farklı nesnelerdir,
      `DeckFlow` tekilleştirmeyi `externalId` üzerinden yapıyor.

**Step 2: Yönlendirme**
- [ ] `ResilientVenueProvider.searchWithFallback`: katalog girdisinde FSQ/Google eşlemesi yoksa
      **doğrudan** `OsmVenueProvider`. Varsa mevcut zincir (FSQ → Google), ve o da boş dönerse
      son çare OSM.
- [ ] Cache anahtarı `ActivityCode.value()` içerdiği için değişiklik gerektirmez — **doğrula**,
      `type` alanı `toString()` üzerinden anahtara giriyordu.

**Step 3: `find-venues` ezme**
- [ ] `POST /{slug}/find-venues` gövdesi opsiyonel: `record FindVenuesRequest(String activityCode)`.
- [ ] `DeckFlow.findVenues(slug, hostUserId, ActivityCode override)` — `override != null` ise
      katalogda doğrula, `session.withActivity(override)` ile **kaydet**, sonra ara.
- [ ] `Session` kaydına `withActivity(ActivityCode)` ekle (mevcut `withStatus`/`decided`/`inRunoff` deseni).
- [ ] Gövde yoksa davranış **bugünküyle birebir aynı** — geriye dönük uyumlu.

**Step 4: Testler**
- [ ] Fake port ile: eşlemesiz aktivite → OSM'e gitti, FSQ hiç çağrılmadı.
- [ ] Eşlemeli aktivite → FSQ çağrıldı, OSM çağrılmadı.
- [ ] `find-venues` ezmesi `sessions.activity_type`'ı güncelledi ve `SessionView` yeni kodu döndü.
- [ ] Gövdesiz `find-venues` eski davranışı korudu.
- [ ] OSM destesi: `rating` null → `DeckFlow` 0.0'a çevirdi, karar motoru çalıştı (karar 6).
- [ ] Bruno `find-venues.yml` gövdeye `{{activityCode}}` ekler.

---

## Task 6: Yerel geliştirme — docker-compose Overpass

**Files:** `backend/.infra/docker-compose.overpass.yml`, `backend/.infra/README.md` (veya mevcut doküman)

**Step 1: Compose servisi**
- [ ] `wiktorn/overpass-api` (sabit sürüm etiketi — `latest` KULLANMA).
- [ ] `OVERPASS_MODE=init`, `OVERPASS_PLANET_URL=https://download.geofabrik.de/europe/turkey-latest.osm.pbf`,
      `OVERPASS_DIFF_URL=https://download.geofabrik.de/europe/turkey-updates/`,
      `OVERPASS_META=no` (attic veri gereksiz, disk ve import süresini ciddi düşürür),
      `OVERPASS_SPACE` cömert (bkz. Task 7 Step 1).
- [ ] Adlandırılmış volume; `12345:80` port eşlemesi.
- [ ] README: **ilk import saatler sürer** (Türkiye extract'i 614 MB pbf), bir kez yapılır,
      volume korunduğu sürece tekrarlanmaz.

**Step 2: Geliştirici deneyimi**
- [ ] `OVERPASS_URL=http://localhost:12345/api/interpreter` örneği README'de.
- [ ] **Overpass'sız çalışmanın desteklendiği açıkça yazılır** (karar 9): değişken verilmezse
      keşif kapalı, temel küme döner, tüm testler yeşil kalır.
- [ ] Doğrula: compose olmadan `rtk mvn -o test` tamamen yeşil.

---

## Task 7: K8s — self-host Overpass (Plan 5 Task 3'e BAĞIMLI)

> **Bu görev Plan 5 Task 3 tamamlanmadan BAŞLAMAZ.** Namespace, imaj ve kaynak adları oradan alınır.

**Files:** Plan 5'in manifest dizini — `overpass-statefulset.yaml`, `overpass-service.yaml`,
`overpass-init-job.yaml`, backend Deployment'a env eklemesi

**Step 1: Depolama boyutlandırma**
- [ ] Türkiye extract'i **614 MB pbf**. Overpass DB'si bunun katı büyüklüğünde olur; `OVERPASS_META=no`
      ile bile birkaç GB. **20 GiB PVC ile başla.**
- [ ] İlk import sonrası **gerçek boyutu ölç** (`du -sh /db`) ve bu plana + Plan 5'in kapasite
      notuna yaz. Tahmini kalıcılaştırma — ölçülen sayıyı yaz.

**Step 2: StatefulSet**
- [ ] `replicas: 1` (paylaşılan bir DB dizini, yatay ölçeklenmez).
- [ ] Readiness probe `/api/status`, ilk import uzun sürdüğü için cömert `initialDelaySeconds`
      + `failureThreshold`.
- [ ] Kaynak limitleri: import sırasındaki tepe kullanım normal çalışmadan yüksektir — limit'i
      ölçülen tepe değere göre koy, tahminle değil.

**Step 3: Import Job'ı**
- [ ] İlk doldurma **ayrı bir Job**'dır, pod startup'ında DEĞİL. `OVERPASS_MODE=init` ile bir kez
      çalışır; StatefulSet dolu volume'ü devralır.
- [ ] Aksi halde her yeniden başlatma saatlerce import'a girer ve servis CrashLoop'a benzer.

**Step 4: Ağ ve erişim**
- [ ] ClusterIP Service, **Ingress YOK** (karar 11).
- [ ] Mümkünse NetworkPolicy: yalnız backend pod'larından giriş.
- [ ] Backend Deployment'a `OVERPASS_URL=http://overpass:80/api/interpreter`.
      **Bu bir sır değildir** — ConfigMap'e gider, Secret'a değil.

**Step 5: Güncelleme ve doğrulama**
- [ ] Diff güncellemeleri açık (`OVERPASS_DIFF_URL`) — OSM verisi bayatlarsa keşif yanlışlar.
- [ ] `kubectl exec` ile tek bir `around` sorgusu koştur, sonuç döndüğünü gör.
- [ ] Backend'den keşif ucunu çağır, `venueCount` **null olmayan** sonuç geldiğini doğrula
      (null gelirse geri düşüşe düşmüştür — yapılandırma hatalı demektir).

---

## Kapanış kontrol listesi

- [ ] `rtk mvn -o clean test` → **tamamen yeşil**, `-o` olmadan da bir kez koş.
- [ ] ArchUnit 4 kural geçiyor (`domain.activity` saf; `adapter.out.osm` katman kökünde değil).
- [ ] Sıfır TODO, sıfır ölü kod, sıfır `@Disabled`.
- [ ] Bruno koleksiyonu: yeni uç eklendi, `list-activities` → `find-venues` değişken zinciri akıyor.
- [ ] Katalogdaki her OSM etiketinin taginfo sayısı raporda.
- [ ] INDEX `done` + tek satır özet.
- [ ] **Plan 3 ve Plan 4'ün kapı satırları** bu plan `done` olunca işaretlenebilir hale gelir.

## Bu planın bilerek YAPMADIKLARI

- **Postgres cache tablosu yok** — Overpass self-host, kota derdi yok; Caffeine yeterli (karar 7).
- **Overpass için ikinci sağlayıcı yok** — düşerse temel kümeye düşer (karar 8), zincir kurulmaz.
- **Türkiye dışı extract yok** — kapsam Türkiye. Yurt dışı bir oturum temel kümeye düşer.
  Genişletme = `OVERPASS_PLANET_URL` + daha büyük PVC; kod değişmez.
- **Kullanıcı tanımlı aktivite yok** — katalog küratörlüdür (karar 1).
- **FSQ kategori ID'leri bu planda doğrulanmaz** — INDEX'teki açık madde açık kalır (Task 2 Step 2).
