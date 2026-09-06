# Açık hibrit mekan yığını — tasarım

Tarih: 2026-09-06. Durum: kullanıcı incelemesi bekliyor. Maliyet gerekçesi ve fiyat doğrulamaları:
`2026-09-06-google-maps-cost-plan.md` (§7.3 H*). Bu spec o dokümandaki H* paketini ürün ve kod
kararına çevirir. Plan 7 (B-4, self-host Overpass) bu spec'le **geçersizleşir**; INDEX satırı
`superseded` olur.

## 0. Bağlayıcı kararlar (uygulayan ajan yeniden tartışmaz)

1. **Sağlayıcı zinciri tür başına, sıra sabit, kota yalnız eler.** Kalan kota oranına göre
   dinamik seçim YOK (2026-09-06'da düzeltilen hata geri gelmez).
2. **Google Places sağlayıcısı silinmez, inaktif kalır.** Zincire alınırsa harita motoru Google
   olmak zorundadır (Places ToS "No Use With Non-Google Maps"); bu kural açılışta doğrulanır,
   ihlalde uygulama kalkmaz.
3. **Harita motoru MapLibre GL + OpenFreeMap**, yedek Protomaps PMTiles. Google `MapView` kodu
   kalır, motor anahtarıyla seçilir.
4. **Foto ve puan kaynağı Foursquare Premium** (tek çağrı/deste). 09-03'teki "Premium alanları
   çıkar" kararı geri alınır.
5. **Açık taban**: Overture Places + OSM (NL), kendi PostGIS'inde, aylık yenilenir, saklanabilir.
6. **TripAdvisor** yalnız MUSEUM / THEME_PARK / ART için, aşama 1b, curl ölçümü sonrası. Aktif
   ücretli sağlayıcı sayısı en fazla üç.
7. **Photon/Nominatim kendi kümede** (ileri + ters geocode), **OSRM** yaya/bisiklet/araba için
   gerçek süre; toplu taşıma tahmin kalır.
8. **Yeni sağlayıcı eklemek kod tabanının başka yerine dokunmaz**: bir paket, bir YAML eşleme, bir
   env anahtarı, bir sözleşme testi. Sağlayıcı sözleşmesi (§3) bu spec'in asıl ürünüdür.
9. **Puanlar ölçek dönüştürülmez**, sağlayıcı işaretiyle kendi ölçeğinde gösterilir. Adalet sırası
   puana bakmaz (09-03 kararı korunur).
10. **Harita linki API'siz**: koordinat + ulaşım türünden üretilir, her sağlayıcıda aynı.

## 1. Amaç ve kapsam

**Amaç:** Buluşma başına maliyeti 17,5 sentten ~2 sente indirmek, sabit maliyeti sıfırda tutmak ve
bunu yaparken kart kalitesini (foto, puan, saat, popülerlik) düşürmemek. 10k ziyarette ~$33–47/ay,
100k'da ~$250–470/ay (maliyet dokümanı §7.3).

**Kapsam:** sağlayıcı SPI'si ve yönlendirme; Foursquare Premium; açık taban (Overture + OSM) ve
ithal işleri; TripAdvisor (1b); bütçe tablosu; saklama kuralı; harita motoru anahtarı ve MapLibre;
geocode ve rota servisleri; harita linkleri; atıf; `GET /api/config`.

**Kapsam dışı:** kullanıcı fotoğrafı; toplu taşıma rotalama (Valhalla + GTFS); dinamik aktivite
keşfi (plan 7'nin asıl amacı); Google'ı yeniden aktif etme ürün akışı (config ile mümkün, ekran
yok); mobil uygulama (M planları bu spec'i miras alır: `react-native-maps` Google sağlayıcısı
yerine MapLibre React Native); foto karuseli (V7 spec'i FSQ `photos[]` dizisini tüketebilir, ayrı iş).

## 2. Mimari

```
                 ┌──────────────── application.deck.DeckFlow ────────────────┐
                 │  findVenues: tür kümesi → yönlendirme → birleşme → deste   │
                 └────────────────────────┬──────────────────────────────────┘
                                          │ VenueProviderPort (değişmez)
                     ┌────────────────────▼─────────────────────┐
                     │ adapter.out.provider.ProviderOrchestrator │  tür bölme, sıra,
                     │  + BudgetGate + ResultCache + Attribution │  bütçe eleme, log
                     └───┬──────────┬───────────┬───────────┬───┘
                         │          │           │           │      VenueSource SPI (§3)
              ┌──────────▼──┐ ┌─────▼────┐ ┌────▼─────┐ ┌───▼────────┐
              │ foursquare  │ │   open   │ │tripadvisor│ │  google    │ (inaktif)
              │ Premium     │ │ PostGIS  │ │  (1b)     │ │  Nearby    │
              └─────────────┘ └────┬─────┘ └───────────┘ └────────────┘
                                   │ venues_open  ◄── I-2: Overture NL + OSM NL (osm2pgsql), aylık
  RoutingPort ─► OSRM ×3 (car/bicycle/foot)      GeocodePort ─► Nominatim/Photon NL
  web: MapView{maplibre|google} ◄── GET /api/config {mapEngine, tiles, sources[]}
```

Hexagonal düzen korunur: domain saf, portlar `domain.port`, adaptörler `adapter.out.<kaynak>`.
ArchUnit'e üç kural eklenir: `adapter.out.<kaynak>` yalnız `domain.*`, `infra.http`, `infra.config`
görür; orkestratör somut sağlayıcı sınıfı görmez, yalnız SPI'yi; `application` hiçbir sağlayıcı
paketini görmez.

## 3. Sağlayıcı SPI

Bugünkü `QuotaAwareVenueProvider` `VenueSource` adını alır ve şu parçalara ayrılır. Amaç: bir
sağlayıcı yalnız "HTTP isteğini kur, yanıtı adaya çevir" yazsın; kesişen işler (zaman aşımı, 429,
bütçe, önbellek, log, atıf, saklama) tek yerde dursun.

```java
public interface VenueSource {
    VenueSourceDescriptor descriptor();
    CategoryMapping categories();                    // venue-sources/<id>.yml'den yüklenir
    SearchResult search(SearchRequest request);      // yalnız HTTP + eşleme; kota/bütçe DIŞARIDA
}

public record VenueSourceDescriptor(
        String id,                    // "foursquare" — config, yönlendirme, log, DTO.provider
        String attributionKey,        // i18n anahtarı: attribution.foursquare
        String attributionUrl,        // "Powered by" bağlantısı, null olabilir
        Integer ratingScale,          // 10 (FSQ), 5 (TA/Google), null (puan yok)
        RetentionRule retention,      // STRIP_AT_EXPIRY | STRIP_AFTER_24H | KEEP
        boolean requiresKey,
        MapEngine requiredMapEngine,  // Google için GOOGLE, diğerleri ANY
        ZoneId billingZone            // ay sınırı: FSQ/TA UTC, Google America/Los_Angeles
) {}

public record SearchRequest(GeoPoint center, double radiusKm, List<ActivityType> types,
                            int limit) {}
public record SearchResult(List<VenueCandidate> candidates, ProviderQuota quota /* null olabilir */) {}
```

**Kategori eşlemesi veri, kod değil.** `classpath:venue-sources/<id>.yml`:

```yaml
id: foursquare
idPattern: "^[0-9a-f]{24}$"          # biçim koruması; açılışta doğrulanır
categories:
  COFFEE: [4bf58dd8d48988d1e0931735]
  FOOD:   [4d4b7105d754a06374d81259]
  NIGHTLIFE: [4bf58dd8d48988d11f941735, 4bf58dd8d48988d1e5931735]
```

`CategoryMapping` (domain, saf) `ActivityType → List<String>` taşır ve `covers(types)` sorusuna
cevap verir; eksik tür = o sağlayıcı o türü aramaz (bugünkü "kısmi kapsama kabul edilmez" kuralı
tür bölmeyle zaten çözülür, §4). Eşleme değişikliği kod değişikliği değildir; YAML + sözleşme testi.

**Kayıt Spring ile, elle fabrika YOK.** Her sağlayıcı `@Component` + `@Order` +
`@ConditionalOnProperty("bumpinto.venues.sources.<id>.enabled")`. Orkestratör `List<VenueSource>`
alır. Elle yazılmış bir `VenueSourceFactory` ikinci bir kayıt noktası olurdu (unutulacak yer);
Spring bean keşfi zaten fabrikadır. Paylaşılan HTTP işleri (`UnirestInstance`, zaman aşımı, JSON
yardımcıları, 429 sınıflandırma) `adapter.out.provider.VenueSourceSupport` bileşiminde durur;
kalıtım şartı yok.

**Config şeması tek biçim:**

```yaml
bumpinto:
  venues:
    sources:
      foursquare:  { enabled: true,  key: ${FOURSQUARE_API_KEY}, budget: ${FSQ_PREMIUM_MONTHLY_BUDGET:5000} }
      tripadvisor: { enabled: false, key: ${TRIPADVISOR_API_KEY:}, budget: 900 }
      open:        { enabled: true,  budget: 0 }        # 0 = sınırsız (yerel)
      google:      { enabled: false, key: ${GOOGLE_PLACES_API_KEY:}, budget: 1000 }
    route:
      COFFEE: foursquare,open
      FOOD: foursquare,open
      BAR: foursquare,open
      NIGHTLIFE: foursquare,open
      MUSEUM: open            # 1b sonrası: tripadvisor,open
      THEME_PARK: open
      ART: open
      WALK: open
      HIKE: open
      SWIM: open
      FITNESS: open
      CINEMA: open
      GAMES: open
      ADVENTURE: open
      ACTIVITY: open
  map:
    engine: ${MAP_ENGINE:maplibre}   # maplibre | google
```

Her `route.<TYPE>` env ile ezilir (`BUMPINTO_VENUES_ROUTE_SWIM=foursquare,open`), yeniden
başlatma yeter. Açılış doğrulaması (`VenueSourceConfigValidator`, fail-fast): (a) yönlendirmedeki
her id `enabled` bir kaynak; (b) her `ActivityType` için en az bir kaynak; (c) yönlendirmede bir türe
atanmış her kaynağın YAML'ı o türü kapsıyor; (d) `google.enabled=true` ⇒
`map.engine=google`; (e) `requiresKey` ve anahtar boşsa hata (bugünkü `AppProps.required`).

**Yeni sağlayıcı DoD (kontrol listesi, plan görevine kopyalanır):**
1. `adapter.out.<id>` paketi: `<Id>VenueSource` (HTTP + eşleme) ve gerekiyorsa `<Id>Mapper`.
2. `venue-sources/<id>.yml` (idPattern + 15 türden kapsananlar).
3. `application.yml`'de `sources.<id>` bloğu, `docs/CONFIGURATION.md`'de env satırı.
4. Sözleşme testi: anahtar env'de varsa gerçek istek, `@EnabledIfEnvironmentVariable`; en az: biçim
   kontrolü, foto alanı, kota başlıkları/limit davranışı.
5. i18n `attribution.<id>` (tr/en/nl) — UI kodu değişmez (§11).
6. INDEX'e satır; Bruno koleksiyonuna `find-venues` örneği gerekiyorsa güncelleme.

## 4. Yönlendirme ve orkestratör

`ProviderOrchestrator.search(center, radiusKm, types, limit)`:

1. **Tür bölme:** `types` yönlendirme tablosuna göre `Map<sourceIdListesi, List<ActivityType>>`
   kümelerine ayrılır. Aynı listeye giden türler tek istekte birleşir (FSQ'da `fsq_category_ids`
   virgüllü, open'da `IN (...)`).
2. **Küme başına sıra:** listedeki ilk kaynak; bütçesi dolmuşsa (§6) ya da 429 ile EXHAUSTED
   ise ya da boş döndüyse sonraki. Hepsi boşsa küme boş kalır (istisna değil; §4.4 spec'i
   "seçilen ilgi alanından mekan yok" hâlini deste dengesi zaten taşır).
3. **Birleşme:** kümeler `externalId`'ye göre tekilleştirilir (`<sourceId>:<externalId>`
   anahtarı), her aday `activityType` atfını kendi kaynağından alır. Tüm kümeler boşsa
   `NoVenuesFoundException` (bugünkü davranış).
4. **Yarıçap genişletme** `DeckFlow`'da kalır; FSQ 50 adayla ilk turda dolduğu için nadiren koşar.
   Boş sonuç 10 dk "boş" işaretiyle önbelleğe alınır (host tekrar bastığında sağlayıcıya gidilmez;
   maliyet dokümanı §E.2).
5. **Sonuç önbelleği** bugünkü Caffeine 30 dk; anahtar 3 ondalık koordinat → 2 ondalık (~1 km) +
   yarıçap kovası (1/2/5/10/20/40 km) + kanonik tür kümesi. FSQ/TA sonuçları için bu oturum-içi
   önbellek "geçici" kullanım sayılır; 30 dk üstü tutulmaz.
6. **Kalite kapısı** (`DeckFlow` kısa liste): sağlayıcıdan bağımsız ve bugünkü anlamıyla —
   kapalı mekan elenir (Overture `confidence < 0.6`, FSQ `closed_bucket` `LikelyClosed|
   VeryLikelyClosed`, TA'da alan yok), sonra `DECK_MAX` kesimi normalize puana göre
   (`rating / ratingScale`, puansızlar puanlılardan sonra, eşitlik `externalId`). Puan eşiği YOK;
   seyrek bölgede deste küçülmez. Sıra adalet (§4.5) — değişmez.

## 5. Sağlayıcılar

### 5.1 Foursquare — Premium, birincil

- `GET /places/search`, `fields=fsq_place_id,name,latitude,longitude,categories,location,website,
  hours,rating,price,popularity,photos,closed_bucket`, `limit=50`, `radius=min(r, 100000)`, `X-Places-Api-Version`
  sabit. Her çağrı Premium ($18,75/1k, hacimle $11,25); ücretsiz katman yok.
- Eşleme: `photos[0]` → `photoUrl = prefix + "original" + suffix`, `photoRef = photos[0].id`
  (saklanabilir); `rating` 0–10 olduğu gibi, `ratingScale=10`; `price` 1–4 → `priceLevel`;
  `popularity` 0–1 → yeni `VenueCandidate.popularity` (Double, null olabilir); `hours.display` →
  `hoursToday`; `website` → `placeLink`; `location.locality` → `locality`; `location.formatted_address`
  → `address`; `categories[0].name` → `category`. Çok türlü istekte atıf `categories[].id` ile
  YAML'daki listeye geri eşlenir (bugünkü "adla eşleme güvenilmez" notu id ile çözülür).
- 15 türün hepsi için 24 haneli kategori kimliği YAML'da; yalnız yönlendirmede FSQ olan türler
  kullanılır ama eşleme tam olsun ki bir env ile tür FSQ'ya alınabilsin. Kimlikler canlı istekle
  doğrulanır (2026-09-06 yöntemi: yanıt `categories` adlarına bak), sözleşme testi bunu korur.
- Kota: `x-ratelimit-*` başlıkları bugünkü gibi; bütçe §6.

### 5.2 Open — Overture Places + OSM, kendi PostGIS

- Tablo `venues_open(id text pk, source text, name text, geom geometry(Point,4326), category text,
  activity_types text[], confidence real, website text, wikidata_id text, photo_url text,
  opening_hours text, locality text, address text, updated_at timestamptz)`; GiST indeks `geom`,
  GIN indeks `activity_types`.
- Sorgu: `ST_DWithin(geom::geography, :center::geography, :radiusMeters) AND activity_types &&
  :types AND confidence >= :minConfidence ORDER BY ST_Distance LIMIT :limit`. Puan yok, popülerlik
  yok; `photo_url` varsa Wikimedia.
- **İki ithal, tek tablo** (I-2, aylık CronJob, staging + swap):
  - **Overture Places NL** (`overturemaps download --bbox 3.2,50.7,7.3,53.6 --type place`,
    GeoParquet → DuckDB → CSV → `COPY`): ticari POI'ler; `categories.primary` → `activity_types`
    eşlemesi `venue-sources/open.yml`'de (Overture taksonomisi); `confidence` olduğu gibi.
    Lisans CDLA-Permissive-2.0 / Apache 2.0 (FSQ kaynaklı satırlar), atıf: "© Overture Maps
    Foundation" + OSM.
  - **OSM NL** (Geofabrik `.osm.pbf`, `osm2pgsql` flex çıktısı yalnız POI etiketleri: `leisure=park|
    swimming_pool|sports_centre|fitness_centre`, `natural=*` + `route=hiking` alanları, `tourism=museum|
    theme_park|zoo|gallery`, `amenity=cinema|...`): park, yürüyüş, havuz, müze burada daha iyi ve
    `wikidata` / `wikimedia_commons` / `image` etiketleri yalnız burada. `confidence` OSM satırında
    1.0 sayılır (etiketli, insan eliyle).
  - **Tekilleştirme:** aynı ad (normalize) + 50 m içinde → ticari kategoride Overture, boş
    zaman/doğa kategorisinde OSM satırı kazanır; kaybeden satır atılır.
  - **Wikidata foto:** `wikidata_id` olan satırlar için ithal sırasında `wbgetentities` (P18) toplu
    çözülür, `photo_url = https://commons.wikimedia.org/wiki/Special:FilePath/<dosya>?width=1000`.
    Commons lisansı gösterime izin verir; atıf Commons sayfa linkiyle (`placeLink` yoksa oraya).
- PostGIS uzantısı kümedeki Postgres'te açılır (`CREATE EXTENSION postgis`); yoksa I-2 önce onu
  kurar. Ön koşul olarak açık soru §16.3.

### 5.3 TripAdvisor — aşama 1b, cazibe merkezleri

- **Doğrulama 2026-09-06:** eski Content API 31 Ağustos 2026'da kapandı; yerine self-serve
  **Terra API** — ayda **1.000 ücretsiz** çağrı, sonrası kullandıkça öde (fiyat çıkışta gösteriliyor,
  kamuya açık liste yok), gösterimde atıf zorunlu. Uçlar: arama (latLong, attractions) → 10 sonuç,
  foto ve detay ayrı çağrı. Deste başına ~1 + N foto → bütçe **900** ile ayda ~80 deste. Yani TA
  bir maliyet kolu değil, yalnız kalite tamamlayıcısıdır; 1b'nin gerekçesi buna göre daralır.
- Yalnız `route.MUSEUM|THEME_PARK|ART = tripadvisor,open` için. `ratingScale=5`, `retention=
  STRIP_AFTER_24H`, atıf + geri bağlantı zorunlu (`placeLink` = TA sayfası).
- Açılma koşulu: §16.2 ölçümü — Wikidata foto kapsaması bu üç türde %40'ın altındaysa.

### 5.4 Google — inaktif yedek

- Kod kalır; `sources.google.enabled=false` iken bean oluşmaz, anahtar istenmez. Açılırsa
  `map.engine=google` zorunlu (doğrulama §3). Bugünkü Enterprise maskesi ve foto çözümü kalır;
  foto çözümü "yalnız nihai kısa liste" düzeltmesi (maliyet dokümanı §C.1) bu spec'te yapılmaz,
  Google açılırsa o zaman.

## 6. Bütçe ve kota

- Tablo `provider_usage(provider text, month date, calls int, primary key(provider, month))`.
  Artış `UPDATE ... SET calls = calls + 1 WHERE ... RETURNING calls` (yoksa `INSERT ... ON CONFLICT`).
  Replica ve yeniden başlatmadan bağımsız; ay sınırı sağlayıcının faturalama saatinde
  (`descriptor.billingZone`, FSQ/TA için UTC, Google için Pasifik — bugünkü davranış).
  Tavanlar env: FSQ Premium 5.000, TripAdvisor 900, Google 0 (inaktif).
- `BudgetGate` (orkestratörde): `calls >= budget` ise kaynak o ay elenir, tek satır log
  (`quota <id>: 0/<budget> (0%) [BUDGET]`), başka kaynağa geçilir. `budget=0` sınırsız (open).
- Bütçe **güvenlik tavanıdır**, iş tavanı değil: 100k ziyarette 25.000 deste > 5.000 → env
  yükseltilir; tavan dolunca ürün "open"a düşer, çökmez.
- Konsol uyarıları: Foursquare ve TripAdvisor hesaplarında harcama uyarısı (varsa); Google Maps
  anahtarları aşama 2'de kapatılır, Sign-In client id kalır.

## 7. Harita motoru (web)

- `VITE_MAP_ENGINE` kaldırılır; motor **sunucudan** gelir: `GET /api/config` (public, cache 5 dk):

```json
{ "mapEngine": "maplibre",
  "tiles": { "styleUrl": "https://tiles.openfreemap.org/styles/positron" },
  "sources": [ { "id": "foursquare", "attributionKey": "attribution.foursquare",
                 "attributionUrl": "https://foursquare.com", "ratingScale": 10 },
               { "id": "open", "attributionKey": "attribution.open",
                 "attributionUrl": "https://www.openstreetmap.org/copyright", "ratingScale": null } ] }
```

- `MapView` ve `MapPicker` prop arayüzleri değişmez. İki uygulama: `MapView.google.tsx` (bugünkü
  kod, dosya adı değişir) ve `MapView.maplibre.tsx`; `MapView.tsx` motoru `configStore`'dan okur
  ve lazy import eder (yalnız seçilen motorun paketi yüklenir; Maps JS yüklenmez).
- MapLibre: `maplibre-gl`; stil OpenFreeMap `positron` (DS §10'a en yakın açık stil; renk
  düzeltmeleri stil JSON'unu kopyalayıp `paint` ezmekle, W-12'de); pinler `mapPins.ts` HTML'i
  `maplibregl.Marker({element})` ile; kamera `mapCamera.ts` aynen, geçiş `map.easeTo`;
  `MAX_FIT_ZOOM` korunur. Atıf denetimi açık (OpenFreeMap metni otomatik gelir). 390 davranışı
  değişmez (`lgOnly`, ghost'a basınca mount). Tek harita örneği zorunluluğu YOK (MapLibre yük
  başına ücret almaz); bilinen "1024px geçişinde ikinci örnek" kusuru bu geçişte kapatılır
  (`useEffect` temizliğinde `map.remove()`).
- Tile yedeği: `bumpinto.map.tiles.style-url` env ile Protomaps PMTiles'a çevrilir (I-2, isteğe
  bağlı); istemci kodu değişmez.

## 8. Geocode

- Yeni port `GeocodePort.forward(query, biasPoint) → Optional<GeoResult>`; mevcut
  `ReverseGeocodePort` kalır. Adaptör `adapter.out.geocode.NominatimGeocoder` her ikisini de
  uygular; hedef URL config (`bumpinto.geocode.base-url`): kendi kümedeki Nominatim NL
  (`mediagis/nominatim`, Geofabrik NL, ~15 GB disk, ilk ithal saatler sürer) ya da geçiş süresince
  public Nominatim (bugünkü throttle ve UA kuralıyla). Photon (`komoot/photon`) ileri arama için
  daha iyi (yazım hatasına dayanıklı) ama NL indeksi Nominatim DB'sinden üretilir; I-2'de
  Nominatim'den sonra isteğe bağlı ikinci adım. Engine anahtarı: `bumpinto.geocode.engine =
  nominatim | photon`.
- Web: `lib/geocode.ts` doğrudan Nominatim çağrılarını bırakır; `POST /api/geocode {query}` ve
  `POST /api/geocode/reverse {lat,lng}` (katılımcı token'ı ya da hesap; rate limit 10/dk).
  K-B20 ve K-B22 kapanır (throttle backend'de, bloklamayan: `tryAcquire`, doluysa etiket sonraki
  poll'da).

## 9. Rota (OSRM)

- `RoutingPort.durations(List<GeoPoint> sources, List<GeoPoint> destinations, TravelMode mode) →
  Optional<int[][]>` (saniye). Adaptör `adapter.out.routing.OsrmRouting`: profil başına base URL
  (`bumpinto.routing.osrm.car|bicycle|foot`), `GET /table/v1/<profile>/...?sources=..&destinations=..`.
  Hata/zaman aşımı (1 sn) → `Optional.empty()`.
- `TravelMinutes.byParticipant(located, venues)` imzası **mekan listesi** alır: oturum başına, mod
  başına TEK matris (kaynak = yuvarlanmış katılımcı konumları, hedef = kısa liste). EBIKE =
  bicycle süresi × 16/24; TRANSIT haversine tahmini; OSRM boşsa haversine. 5 dk yuvarlama ve
  `Math.max(STEP, ...)` korunur. `VenueDto.travel[].estimated=true` OSRM yoksa (UI "~" önekini
  zaten basıyor; `estimated` yalnız teşhis/analitik).
- Ağırlıklı orta nokta (`SessionCenter`) değişmez: OSRM yalnız dakikaları verir.
- I-2: `osrm/osrm-backend` ×3 (car, bicycle, foot), Geofabrik NL, `osrm-extract/partition/customize`
  bir Job'da, veri PVC'de (~5 GB), aylık yenileme OSM ithaliyle aynı CronJob.

## 10. Harita linkleri

- Domain değer nesnesi `MapLinks.of(lat, lng, name, TravelMode)`:
  - `directions`: `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>&travelmode=
    <walking|bicycling|transit|driving>` (WALK→walking, BIKE/EBIKE→bicycling, TRANSIT→transit,
    CAR→driving). Google Maps URL'leri anahtarsız ve içerik göstermediği için Google dışı veriyle
    kullanılabilir.
  - `apple`: `https://maps.apple.com/?daddr=<lat>,<lng>&dirflg=<w|b|r|d>`.
  - `geo`: `geo:<lat>,<lng>?q=<lat>,<lng>(<name>)`.
- `SessionViewAssembler`: `VenueDto.mapsUrl` = görüntüleyenin kendi ulaşım türüyle `directions`;
  `VenueDto.placeLink` sağlayıcının sitesi (FSQ `website`, TA sayfası, open `website`, yoksa
  Commons sayfası, o da yoksa null). `WinnerCard` `href="#"` durumu kalkar: koordinat her mekanda var.
- Sağlayıcıların ürettiği `mapsUrl` alanı `VenueCandidate`'ten kalkar (Google sağlayıcıda tek
  satır: `googleMapsUri` → `placeLink`).

## 11. Uyum

- **Atıf veri-güdümlü:** `Attribution` bileşeni ekrandaki `VenueDto.provider` kümesini ve harita
  motorunu alır, `/api/config.sources[].attribution` anahtarlarıyla satırları basar; sağlayıcı
  başına kod dalı yok. Sabit satırlar: MapLibre'de "OpenFreeMap © OpenMapTiles Data from
  OpenStreetMap" (harita kütüphanesi basar), open kaynağında "© OpenStreetMap contributors ·
  Overture Maps Foundation", Wikimedia fotosunda Commons sayfa linki. Google açıksa "Google Maps".
- **Puan:** `VenueDto.rating` + `VenueDto.ratingScale`; UI `formatRating(rating, scale)` →
  "8,7 / 10 · Foursquare", "4,3 / 5 · Tripadvisor". Dönüşüm yasak; `byRating` sıralaması ölçek
  normalize eder (`rating/scale`) ama gösterim etmez. Puansız kart "puan yok" hâli (W-6).
- **Saklama** (`RetentionRule`, plan 6 purge işine eklenir):
  - `STRIP_AT_EXPIRY` (foursquare, google; FSQ şartı metadata için 24 saat, oturum TTL'i de 24
    saat — çakışır): oturum `expires_at`'i geçince kazanan dışı satırlarda
    `name, rating, popularity, price_level, hours_today, address, locality, category, photo_url`
    NULL; `external_id`, `photo_ref`, `lat/lng`, `place_link` kalır. Kazanan satır (`decided_venue_id`)
    `name`, `lat/lng`, `place_link` tutar (katılımcıların verdiği kararın kaydı), `photo_url` düşer.
  - `STRIP_AFTER_24H` (tripadvisor): aynı indirgeme, oturum durumu ne olursa olsun çekimden 24 saat
    sonra (`venues.fetched_at`).
  - `KEEP` (open): dokunulmaz.
  - Karar ekranı süresi dolmuş oturumda kazananı ad + yol tarifi linkiyle gösterir, foto monogram.
  - Hukuki okuma borcu (karar dok. 09-03 §2) bu kuralla daralır ama kapanmaz; §16.5.

## 12. API değişiklikleri

- `VenueDto`: `+popularity` (0–1, null), `+ratingScale` (5|10|null), `mapsUrl` anlamı "yol
  tarifi" olarak sabitlenir, `+travel[].estimated` (bool). `photoRef` DTO'ya çıkmaz.
- `GET /api/config` (yeni, public, `Cache-Control: max-age=300`): §7.
- `POST /api/geocode`, `POST /api/geocode/reverse` (yeni; §8).
- `openapi.json` + `api-types.ts` yeniden üretilir; Bruno: `config/get-config.yml`,
  `geocode/forward.yml`, `geocode/reverse.yml`.

## 13. Veri ve migration

- **V10** `provider_usage` + `venues` sütunları: `popularity real`, `rating_scale smallint`,
  `photo_ref text`, `fetched_at timestamptz not null default now()`; `venues.maps_url` kalır ama
  artık assembler üretir (sütun bir sonraki temizlikte düşer).
- **V11** `CREATE EXTENSION IF NOT EXISTS postgis` + `venues_open` (+ indeksler). Uzantı için
  DB kullanıcısının yetkisi I-2 ön koşulu.
- INDEX Flyway sicili düzeltilir: dosyalarda V8 (`multi_activity`) ve V9 (`anchor`) zaten var,
  sicildeki "V6 = B-3, V7 = karusel" ataması bayat; sıradaki **V10 = B-13**, **V11 = I-2/B-13**.
- Config: `GOOGLE_MONTHLY_BUDGET`/`GOOGLE_PHOTO_MONTHLY_BUDGET` → `sources.google.budget`;
  `PROVIDER_*` eski anahtarlar kaldırılır; `docs/CONFIGURATION.md` §7 maliyet bölümü bu spec'e göre
  yeniden yazılır.

## 14. Test

- **Sözleşme testleri gerçek istekle** (feedback kuralı: framework/dış sözleşme dikişleri testsiz
  kalmaz): `FoursquarePremiumContractTest` (alanlar, `photos` biçimi, kategori kimliklerinin
  yanıttaki `categories` adlarıyla uyumu, `x-ratelimit-*`), `TripAdvisorContractTest`,
  `NominatimContractTest` (ileri/ters), `OsrmContractTest` (`table` 2×3), hepsi
  `@EnabledIfEnvironmentVariable`; CI'da anahtar yoksa atlanır, yerelde koşar.
- **Birim:** yönlendirme bölme/birleşme (tür kümeleri, boş küme, tekilleştirme anahtarı), açılış
  doğrulaması (5 kural, her biri kırmızıya düşürülerek), bütçe kapısı (`RETURNING` ile eşzamanlı
  artış — `PostgresContainer.shared()`), saklama indirgemesi (üç kural), `TravelMinutes` OSRM ↔
  haversine düşüşü ve EBIKE katsayısı, `MapLinks` beş mod, `CategoryMapping` YAML yükleme +
  `idPattern`.
- **Open sağlayıcı:** Testcontainers `postgis/postgis` imajı; 5 satırlık fixture ile `ST_DWithin`
  + `activity_types` + `confidence` filtresi.
- **Web:** `MapView.test.tsx` iki motorla parametrik; `Attribution` config-güdümlü satırlar;
  `formatRating` iki ölçek; `configStore` yüklenmeden harita mount olmaz.
- **ArchUnit:** §2'deki üç kural + `noClassesSitInLayerRoots` devam.
- **Uçtan uca (kullanıcıda):** gerçek anahtarla Grup akışı, 390 + 1280, iki motor.

## 15. Aşamalar ve izler

| Aşama | İçerik | İz | Yayınlanabilir mi |
|---|---|---|---|
| 1 | SPI + yönlendirme + `provider_usage` + FSQ Premium + open sağlayıcı (PostGIS, ithal işi) + saklama + `MapLinks` + `/api/config` (motor `google` döner; web bunu aşama 2'ye kadar okumaz) | B-13 + I-2:T1–T2 | Evet: harita Google'da kalır, fatura 17,5¢ → ~2¢/deste |
| 1b | TripAdvisor (§5.3), ölçüme bağlı | B-13 (koşullu görev) | Evet |
| 2 | MapLibre + motor anahtarı + veri-güdümlü atıf + `formatRating` + geocode istemci taşınması | W-12 | Evet: Maps anahtarları kapanır |
| 3 | Nominatim NL (isteğe bağlı Photon) + `/api/geocode` | B-13 son görev + I-2:T3 | Evet |
| 4 | OSRM ×3 + `RoutingPort` + `TravelMinutes` matrisi | B-13 son görev + I-2:T4 | Evet |

Bağımlılıklar: 2, `/api/config`'i (1) bekler; 3 ve 4 birbirinden bağımsız; I-2 ithal işleri
I-1:T1–T3 (imaj/secret adları) ister. Plan 7 (B-4) `superseded`; K-B19, K-B20, K-B22, K-W4
bu spec'e devredilir.

## 16. Açık sorular ve ölçümler (plan yazımından önce)

1. **FSQ Premium curl** (10 dk): NL koordinatında `photos,rating,popularity,hours` ile sonuçların
   yüzde kaçında foto var; `photos` nesnesinin biçimi; konsolda Premium sayacı. Kapsama %60'ın
   altındaysa Wikimedia + monogram payı büyür, fiyat değişmez.
2. **TripAdvisor (Terra API) curl:** Eindhoven/Amsterdam çevresinde `attractions` sonuçlarında
   foto ve puan kapsaması; Wikidata müze kapsamasıyla kıyas → 1b açılır/açılmaz. Terra fiyatı
   kayıt sonrası görünür; 1.000 ücretsizi aşan kullanım planlanmaz.
3. **PostGIS:** kümedeki Postgres'te uzantı kurulabilir mi (yetki, imaj). Değilse `venues_open`
   `lat/lng` + bbox + haversine ile çalışır (yavaş ama NL ölçeğinde yeterli), V11 buna göre.
4. **Geocode indeksi:** Nominatim NL ithal süresi ve disk; Photon NL indeksi için kaynak.
5. **Hukuki okuma:** FSQ "başka hiçbir şey saklanmaz" ile kazanan satırının adını tutma; TA 24 saat.
   Karar: kullanıcı; spec §11'deki kural varsayılan.
6. **OpenFreeMap güvenilirliği:** SLA yok; PMTiles yedeği I-2'de isteğe bağlı görev olarak yazılır,
   ilk kesintide açılır.
7. **Overture kategori eşlemesi:** 15 tür için Overture taksonomisi (2026-06'dan itibaren
   `basic_category` + `taxonomy`), `open.yml`'de; ilk ithalde tür başına sayım raporlanır.

## 17. Maliyet özeti

Deste başına ~1,9 sent (FSQ), 0 (open). 10k ziyaret ≈ $33–47/ay, 100k ≈ $250–470/ay; sabit
maliyet 0, küme diski +~30 GB (Nominatim 15, OSRM 5, PostGIS tabanı 2, tiles yedeği 2).
Ayrıntı ve karşılaştırma: `2026-09-06-google-maps-cost-plan.md` §7.
