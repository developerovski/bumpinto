# Çapalı oturum (sabit buluşma noktası) — tasarım

**Tarih:** 2026-09-05
**Durum:** onaylandı, plana bölünecek (B-10 backend, W-9 web)
**Kaynak karar:** [2026-09-03-map-free-group-decision-ux.md](2026-09-03-map-free-group-decision-ux.md) §7.2 —
"Belli bir nokta modu", o gün açık madde olarak bırakılmıştı.

## 1. Amaç

Host, oturumun merkezini iki yoldan biriyle belirleyebilsin:

- **Orta nokta** (bugünkü davranış): katılımcı konumlarından ağırlıklı centroid.
- **Çapa**: host bir yer seçer (ör. Amsterdam) ve mekanlar oranın çevresinde aranır.

Yanında iki küçük iş: haritadan konum seçme (host'un çapası ve katılımcının kendi konumu için
ortak bileşen) ve mekan kartından Google Haritalar'a çıkış.

## 2. Kararlar ve gerekçeleri

| # | Karar | Gerekçe |
|---|---|---|
| K1 | Çapalı modda katılımcı konumu **isteğe bağlı** | Modun var oluş sebebi sürtünmeyi kaldırmak. Konum zorunlu kalırsa GPS izni sorusu duruyor demektir. Konum veren kişiye yol süresi yine gösterilir. |
| K2 | Çapalı modda arama yarıçapı **sabit** (2 km) | Çapa bir *yer*, bir uzlaşma değil. Mevcut yayılım kuralı ("en uzak katılımcının çeyreği") çapalı modda saçmalar: Amsterdam çapası + dağınık katılımcılar → taban 10 km'ye çakılır, genişleme 40 km'ye gider. Kaydırıcı YAGNI; kırsal çapada `SearchRadius.expandedKm` zaten ×2 açılıyor. |
| K3 | Çapalı oturumda `midpoint` **yuvarlanmaz** | Yuvarlama gizlilik önlemi (özel konumlardan türeyen nokta ~1 km'ye yuvarlanır). Çapa host'un açıkça yazdığı kamu bilgisi; yuvarlamak harita çemberini seçilen yerden kaydırır — koruduğu bir şey yokken görünür bir yalan. |
| K4 | `SessionView` **`anchored: boolean`** alanı alır; ayrı `anchor` alanı **almaz** | `midpoint`'in anlamı "oturumun merkezi" olarak korunursa harita kamerası, çember ve `roundedMidpointMeters` hiç değişmez; yalnız metin dalları bayrağa bakar. `anchor ?? midpoint`'i beş çağrı yerine dağıtmak, W-8'deki `mixedDeck` hatasının aynı sınıfı olurdu. |
| K5 | Çapalı modda deste sırası **puana** geçer | 2 km'lik daire içinde mekanlar arası yol farkı `TravelMinutes.STEP`in (5 dk) altında kalır → `fairnessFirst` her mekanı berabere görür → sıra fiilen tohumlu karışıma düşer. Sessizce dejenere olmasındansa niyetli olsun. |
| K6 | Deste/liste **`FairnessBadge` kapanır**; `TravelChips` ve `WhyHere`'in ADALET ekseni **kalır** | Rozet mekanları *kıyaslar*; çapalı modda 20 kartın hepsinde aynı şeyi yazar, yani sıfır bilgi taşıyıp gürültü üretir. Kişi başı dakikalar ve karar ekranındaki tek mekanlık adalet özeti ise gerçek bilgi — atılmaz. |
| K7 | Harita seçici **açılır katman** | Faturalanan birim `new google.maps.Map()`. Katıl ekranı 390'da bugün hiç harita mount etmiyor (`lgOnly`); varsayılan görünür yapılsaydı maliyet katılım başına oluşurdu. Açılır katmanda maliyet yalnız düğmeye basan kişide. |
| K8 | Google Haritalar çıkışı **yalnız `VenuePopCard`'a** | Pini tıklayan kişi zaten inceleme modunda. Deste kartında olmaz: kaydırma jesti sürerken yanlış dokunma tuzağı ve — asıl sebep — ürün tezi grup uzlaşması; deste ortasında dışarı çıkış oturumu kaybetmenin en kolay yolu. Liste satırlarında da olmaz: 12 satır = 12 çıkış kapısı, ihtiyaç zaten pop kartta karşılanıyor. |

## 3. Alan modeli (backend)

### 3.1 `SessionCenter` — tek merkez kaynağı

Merkez bugün **iki yerde ayrı ayrı** hesaplanıyor: `DeckFlow.findVenues` (85–88) ve
`SessionViewAssembler.toView` (42–49). Aynı ağırlıklı centroid, aynı yarıçap, kopyalanmış.
Bugün eşitler; çapayı iki yere birden eklemek ayrışma riskini ikiye katlar.

```java
// domain/geo/SessionCenter.java
public record SessionCenter(GeoPoint point, double radiusKm, boolean anchored) {

    static final double ANCHOR_RADIUS_KM = 2.0;

    /** Çapa varsa o; yoksa >=2 konumlu katılımcının agirlikli centroid'i; ikisi de yoksa null. */
    public static SessionCenter of(GeoPoint anchor, List<Participant> located) {
        if (anchor != null) {
            return new SessionCenter(anchor, ANCHOR_RADIUS_KM, true);
        }
        if (located.size() < 2) {
            return null;
        }
        List<GeoPoint> points = located.stream().map(Participant::location).toList();
        GeoPoint center = GeoMath.centroid(points,
                located.stream().map(p -> p.travelMode().weight()).toList());
        return new SessionCenter(center, SearchRadius.baseKm(points, center), false);
    }
}
```

`domain.geo`'nun `domain.session.Participant`'a bakması yeni bir bağımlılık değil —
`TravelMinutes.byParticipant` aynı yönde zaten var.

Yeni dosya eşiği (AGENTS.md): bağımsız test edilebilir, tek sorumluluk, **iki** gerçek çağrı
yeri, ve var olan kopyayı siliyor. Geçiyor.

### 3.2 `Session.anchor`

`Session` record'u tek alan büyür: `GeoPoint anchor` (nullable) → 15 bileşen.

`anchorLat`/`anchorLng` diye iki `Double` **eklenmez**: o hâlde "biri dolu biri boş" durumu
tipçe mümkün olurdu. `GeoPoint` bu değişmezi taşıyor.

`midpointLabel` duruyor ve artık "merkezin adı" demek. Çapalı oturumda `find-venues`
beklenmez, **oluşturma anında** istekten yazılır (istemci Nominatim'den "Amsterdam"ı zaten
biliyor, sunucu ikinci kez çözmez). Sonuç: çapa Lobi'de anında görünür.

`midpointLabel` **yeniden adlandırılmaz**: kablodaki alanı değiştirmenin bedeli kozmetik
kazancından büyük. `backend/ARCHITECTURE.md`'ye şu yazılır — *"bu kod tabanında `midpoint`
= oturumun merkezi; çapa onu üretme yollarından biridir."*

### 3.3 Şema — V9

```sql
alter table sessions add column anchor_lat double precision;
alter table sessions add column anchor_lng double precision;
alter table sessions add constraint anchor_both_or_neither
  check ((anchor_lat is null) = (anchor_lng is null));
```

Kısıt, domain'deki `GeoPoint` değişmezini son katmanda da kilitler.

### 3.4 `DeckFlow` — tek dallanma noktası

`findVenues` ve `shuffle` **ikisi de** `DeckOrdering.fairnessFirst` çağırıyor. K5'i iki yere
ayrı ayrı yazmak, birini unutma hatasını davet eder. Tek özel yardımcı:

```java
private <T> List<T> deckOrder(Session session, List<T> canonical,
                              Function<T, GeoPoint> location, List<Participant> located) {
    if (session.anchor() != null) {
        return canonical;   // zaten canonicalOrder (puan, sonra externalId) sırasında
    }
    return DeckOrdering.fairnessFirst(canonical,
            t -> fairnessOf(located, location.apply(t)), seedOf(session));
}
```

Kaynak doğruluk `session.anchor()`tır; `SessionCenter.anchored` ondan **türetilir**.
`shuffle` bir `SessionCenter` kurmadığı için (yalnız bayrağa ihtiyacı var) doğrudan
`session.anchor()`a bakar — iki ayrı doğruluk değil, biri diğerinin türevi.

`findVenues`'un önkoşul kapısı tek satıra iner:

```java
SessionCenter center = SessionCenter.of(session.anchor(), located);
if (center == null) {
    throw new ConflictException("need at least 2 participants with location");
}
```

Çapalı oturumda `center` asla null olmaz → önkoşul kendiliğinden kalkar. Ayrı bir `if` yok.

## 4. Sözleşme

| Alan | Çapasız (bugün) | Çapalı |
|---|---|---|
| `CreateSessionRequest.anchor` | `null` | `AnchorDto{lat, lng, label}`, `@Valid` iç içe |
| `CreateSessionRequest.lat/lng` | `@NotNull` | **nullable** |
| `SessionView.midpoint` | ~1 km'ye yuvarlı | **tam koordinat** |
| `SessionView.anchored` | `false` | `true` *(yeni)* |
| `SessionView.radiusKm` | yayılımdan | sabit 2.0 |
| `SessionView.midpointLabel` | `find-venues`'te çözülür | **oluşturmada** yazılır |
| `find-venues` önkoşulu | ≥2 konumlu katılımcı | yok |
| Deste sırası | adalet öncelikli | puan (K5) |

```java
public record AnchorDto(@NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
                        @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng,
                        @Size(max = 80) String label) {
}
```

### Çapraz doğrulama

`lat/lng` nullable olunca "konum ya da çapa, ikisinden biri şart" kuralı gerekir. Record
gövdesinde:

```java
@AssertTrue(message = "either location or anchor is required")
public boolean isOriginPresent() {
    return (lat != null && lng != null) || anchor != null;
}
```

**Bu, Hibernate Validator'ın record'larda getter kısıtını gerçekten uyguladığını doğrulayan
bir entegrasyon testiyle gelmeli** — çalışmazsa yedek: `SessionCommands` içinde açık kontrol
ve 400. Yedeğe düşülürse plan notu güncellenir.

Bruno koleksiyonu (`backend/.infra/bumpinto-collection/sessions/create-session.yml`) çapalı
varyantla birlikte güncellenir — AGENTS.md "API Collection Policy", uçun tanımının parçası.

## 5. Adalet semantiği

Çapalı modda kapanan tek şey **`FairnessBadge`** (deste kartı, liste satırı, pop kart).
Sebep dürüstlük değil, bilgi yoğunluğu: 2 km'lik daire içinde rozet 20 kartın hepsinde aynı
şeyi yazar.

### 5.1 Bayrağı nasıl taşıyacağız — `anchored` prop'u YOK

`FairnessBadge` dört yerde render ediliyor: `VenueCard` (polaroid ve `row` dalları),
`VenueMeta` (→ `VenueRow` ve `VenuePopCard`), `LikedList`. Dördüne ayrı bir `anchored`
prop'u sürüklemek, W-8'deki `mixedDeck` hatasının birebir aynı sınıfıdır — dördüncüsü
unutulur ve tipleri sıyıran test koşucusu susar.

Dördü de `travel: TravelInfo` nesnesini **zaten** alıyor, ve `useTravelLabels.ts` bu deseni
tam olarak bu gerekçeyle kurmuş ("iki ayrı prop olarak sürüklenirse yüzeyler arasında
ayrışabilir"). Bayrak oraya girer:

```ts
export type TravelInfo = {
  labels: Record<string, string>;
  selfId?: string | null;
  /** Çapalı oturum: FairnessBadge mekanları kıyaslamayı bıraktığı için çizilmez (K6). */
  anchored?: boolean;
};

// useTravelLabels: return { labels, selfId: ..., anchored: view?.anchored ?? false };
```

`FairnessBadge` tek satırla kapanır (`if (props.travel.anchored) return null;`). **Dört
render yerinde tek bir değişiklik yok.** `VenueCard`'ın `props.travel ?? { labels: {} }`
yedeği `anchored`'ı tanımsız bırakır → falsy → bugünkü davranış birebir korunur.

Kalanlar:

- **`TravelChips`** — kişi başı dakika. Konum veren için gerçek bilgi.
- **`WhyHere`'in ADALET ekseni** — tek mekanlık özet, "en uzun 45 dk · fark 33 dk · Ali en
  uzaktan". Kıyas değil, olgu. Kalır.
- **`ParticipantDto.midpointMinutes`** — çapaya dakika. Hesaplanmaya devam eder.

Konum veren hiç kimse yoksa `Fairness` zaten `null` döner ve bu yüzeylerin hepsi kendiliğinden
kararır — yeni bir dal gerekmez (`SessionViewAssembler` bunu bugün de `located.isEmpty()`
ile yapıyor).

## 6. Web

### 6.1 `MapPicker` (yeni organism, tembel yüklenen)

Harita + sürüklenebilir pin + "Burayı seç". `MapView` genişletilmez: o katılımcı/mekan çizip
kamera sığdırıyor, bu tek nokta topluyor; aynı bileşene sıkıştırmak ikisini de bozar. Ortak
olan `loadMaps`/`MAP_ID`, o zaten ayrı dosyada.

Ters geocode **onayda bir kez** çalışır, sürüklemede değil — Nominatim kullanım politikası.

İki çağrı yeri:

1. **`LocationField`** opsiyonel "haritadan seç" düğmesi alır. Tek değişiklik, iki ekran
   kazanır: `JoinForm` (katılımcı) ve `NewSessionPage` (host'un kendi konumu). Harita ancak
   düğmeye basınca mount edilir (K7).
2. **Çapa alanı** — `NewSessionPage`'de "Nerede?" altında `Segmented`:
   `Orta noktada` / `Belli bir yerde`. İkincisi adres girişi + aynı `MapPicker`.

### 6.2 Durum

`newSessionStore` iki alan büyür: `anchorMode: "MIDPOINT" | "ANCHOR"`, `anchor: Loc | null`.
`submit` çapayı isteğe koyar; `anchorMode === "ANCHOR"` iken host'un kendi konumu
zorunlu olmaktan çıkar (`create()`'teki `loc.resolve()` kapısı gevşer).

SOLO'da `count < 2` kapısı da çapalı modda kalkar.

### 6.3 `MidpointCard`

`view.anchored` ise başlık çapa adını yazar ve "herkes ~25–35 dk" aralığı yerine sabit
yarıçap metni gösterilir. Çapasız davranış değişmez.

### 6.4 Google Haritalar çıkışı

Bağlantı zinciri bugün `WinnerCard` içinde satır içi. `lib/venueLink.ts` olarak çıkarılır:

```ts
/** Mekanın kanonik dış bağlantısı: önce kendi sayfası (yorum/fotoğraf), sonra yol tarifi. */
export function venueLink(v: VenueDto): string | null {
  return v.placeLink ?? v.mapsUrl ?? null;
}
```

Zincirin üçüncü halkası (`lat/lng`'den hesaplanan yol tarifi adresi) **düşer**: backend'de
`SessionViewAssembler.directionsUrl` zaten `mapsUrl` boşsa onu üretip DTO'ya koyuyor, yani
istemciye hiçbir zaman boş gelmiyor. İstemcideki dal bu backend'e karşı ölü.

`VenuePopCard` bağlantıyı **kendi satırında** basar, `action` yuvasına girmez — orası
`SelectionCard` ile dolu (onay durumu) ve bağlantı "Kilitle" ile birincillik yarışına
girmemeli: `LinkButton kind="ghost"`.

`t("result.openInMaps")` → `t("venue.openInMaps")` (üç dil), artık sonuç ekranına özel değil.

### 6.5 Harita yükleme sayacı

`lib/maps.ts`'teki `track("maps_js_load")` tekil promise'ın içinde: kullanıcı başına bir kez
atıyor. Faturalanan birim ise harita **örneği**. Sayaç `new google.maps.Map()` çağrısına
taşınır.

Bu bir tasarruf değil, ölçü aleti — ama `MapPicker` ikinci bir örnek yaratabildiği için
eksik sayım büyüyor. Tek satırlık iş, W-9'a girer.

## 7. Maliyet

| İşlem | Maliyet |
|---|---|
| Haritada tıklama / pin sürükleme | 0 — istemci tarafı olay, istek yok |
| Koordinat → yer adı, adres → koordinat | 0 — Nominatim (OSM), Google Geocoding değil |
| `new google.maps.Map()` | Dynamic Maps, örnek başına |

Karışık bir oturum kabaca 5 harita yüklemesi → Essentials'ın aylık 10.000 ücretsiz kotasıyla
~2.000 oturum/ay bedelsiz, sonrası oturum başına ~$0,035. Aynı oturum için yapılan **1**
Places `searchNearby` çağrısı kat kat pahalı; harita tarafı bu tablonun gürültü seviyesinde.

Bu yüzden harita **optimize edilmiyor** (bkz. §9 R3).

## 8. Kapsam dışı

Çapayı oturum ortasında değiştirmek · çapa yarıçap kaydırıcısı · Places Autocomplete ·
mobil (M-*) paritesi · `midpointLabel` yeniden adlandırma · deste ve liste kartlarında
Google Haritalar bağlantısı (K8) · tek harita örneğini sayfalar arasında taşıma (§9 R3).

## 9. Bilinen riskler

- **R1 — `@AssertTrue` record'da.** Hibernate Validator'ın record accessor'larını getter
  kısıtı olarak taradığı doğrulanmadı. Entegrasyon testi zorunlu; düşerse `SessionCommands`
  yedeği (§4).
- **R2 — Çapalı + konumsuz oturumda host katılımcısı.** Konumsuz katılım bugün zaten mümkün
  (`JoinRequest.lat/lng` `@NotNull` değil), ama **host** satırının konumsuz kurulması yeni bir
  kod yolu. Ayrı test.
- **R3 — Var olan harita yükleme sızıntısı, bu işin kapsamı değil.** İki kaynak: (a) her rota
  kendi `MapView`'unu mount ediyor, masaüstü katılımcı yolu Katıl → Bekle → Mekanlar = 3 ayrı
  örnek; (b) `MapView.tsx:148` init effect'i `desktop`'a bağlı ve `useMediaQuery` reaktif —
  pencere 1024px'i geçince yeni harita kuruluyor, temizlik eskisini yıkmıyor. §7'deki sayılar
  düzeltmeyi gerekçelendirmiyor; sayaç (§6.5) çizgi geçilirse haber verecek. `mapOpen` üç
  yerde de tek yönlü olduğu için aç-kapa savurganlığı yok.
- **R4 — `radiusKm` "aranan alan" değil "amaçlanan alan".** `DeckFlow` 6 mekan bulamazsa
  yarıçapı ×2 açıyor ama `SessionView.radiusKm` her okumada yeniden hesaplanıyor ve
  genişlemeyi bilmiyor. Bugün de böyle; çapalı mod bunu değiştirmiyor, yalnız görünür kılıyor.
- **R5 — `Session` record'u 15 bileşene çıkıyor**, 4 el yazımı wither ile. W-8'de not edilen
  kusur sınıfı (yeni alan eklenip bir wither'da unutulursa hiçbir test kırmızıya dönmez)
  büyüyor. Yansımalı wither-korunum testi hâlâ ayrı bir iz adayı.

## 10. Test kapıları

### Backend

- `SessionCenter`: çapalı / çapasız / <2 konumlu (null) — üç dal.
- `find-venues` çapalı oturumda **konumsuz** çalışır.
- Çapalı deste puan sırasında; `shuffle` aynı sırayı korur (idempotentlik).
- `SessionView.midpoint` çapalıda yuvarlanmamış, çapasızda yuvarlanmış.
- `CreateSessionRequest`: konum yok + çapa yok → 400 (R1'in kapısı).
- V9 check kısıtı: yarım çapa yazılamaz.

### Web

- `venueLink` önceliği ve `null` durumu.
- `VenuePopCard` bağlantıyı basar; `action` yuvası doluyken de basar (iki eylem bir arada).
- `anchored` iken `FairnessBadge` çizilmez, `TravelChips` çizilir — **dört render yerinin
  hepsinde** (`VenueCard` polaroid, `VenueCard` row, `VenueMeta`, `LikedList`). §5.1'in tek
  nesneli çözümü bunu yapısal olarak garanti ediyor, ama test kapısı yine de dördünü gezmeli:
  W-8'de kaçan kusur tam olarak "prop bir dalda düşüyor" idi.
- `travel` verilmeyen `VenueCard` (yedek `{ labels: {} }`) bugünkü gibi rozet basar.
- `MapPicker` harita ancak düğmeye basınca mount olur (390'da varsayılan mount YOK).
- `anchorMode === "ANCHOR"` iken host konumsuz oturum kurabilir.

**Kapı komutları:** `mvn -o clean test` (test *sayısı* kontrol edilerek, yalnız BUILD SUCCESS
değil) · `tsc --noEmit` · `pnpm test:web` · `pnpm i18n:check` · `pnpm build:web`.
