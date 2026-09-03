# Plan 15 (B-7): Backend — Adalet çekirdeği · ulaşım türü · karar şeffaflığı · orta nokta etiketi · sağlayıcı alanları ve bütçe

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Haritasız değerlendirme spec'inin (`docs/superpowers/specs/2026-09-03-map-free-group-decision-ux.md`)
backend ön koşulunu (§5.A 1–7 + §4 kararları 1–5, 5b, 9) uygulamak: her katılımcı için **ulaşım
türü** ve mod-uyumlu dakika, mekan başına **adalet** ölçüsü (`maxMinutes` / `spreadMinutes`),
**adalet öncelikli deste sırası**, karar şeffaflığı (`decisionKind` / `decidedAt` / `runoffReason` /
`likeCounts`) ve oy gizliliği, orta noktanın **kasaba kelimesi** (Nominatim), sağlayıcıların
kategori/adres/yorum sayısı/saat/bağlantı alanları ve **açılış maliyet modeli** (Google Nearby
1.000/ay + Place Photo 1.000 görsel/ay sert tavan, Foursquare Premium alanlardan iniş).

**Architecture:** Mevcut altıgen düzen korunur (`domain` saf, `application` use-case +
`@Transactional`, `adapter` port implementasyonları). Değişiklikler: `domain/geo` (yeni `TravelMode`,
`Fairness`, `TravelMinutes`; `TravelEstimate` ve `GeoMath.centroid` mod/ağırlık alır),
`domain/deck` (yeni `DeckOrdering`; `DeckOutcome` karar türü ve runoff nedeni taşır),
`domain/session` (yeni `DecisionKind`, `RunoffReason`; `Session` + `Participant` alanları),
`domain/venue` (`Venue`/`VenueCandidate` yeni alanlar), `domain/port` (yeni `ReverseGeocodePort`),
`application/deck` + `application/session` (adalet sırası, karar türü yazımı, oy gizliliği),
`adapter/in/web` (DTO'lar + assembler), `adapter/out/geocode` (yeni Nominatim adapteri),
`adapter/out/provider` (alan maskesi, FSQ iniş, foto bütçesi), `adapter/out/persistence` (V5 + entity).

**Tech Stack:** Java 21, Spring Boot 4.1, Flyway, Spring Data JPA, Unirest 4.10 (+ `MockClient`),
Caffeine, JUnit 5 + AssertJ + Testcontainers (`PostgresContainer.shared()`), ArchUnit, Bruno
(OpenCollection), openapi-typescript codegen.

**Spec:** `docs/superpowers/specs/2026-09-03-map-free-group-decision-ux.md` §4 (1–5, 5b, 9) ve §5.A
(1–7 + §5.A.5 içindeki açılış maliyet modeli) **BAĞLAYICI** — çelişkide spec kazanır.

---

## Flyway numarası (INDEX kural 9 — orkestratör güncelleyecek)

- **Bu plan V5'i alır:** `V5__fairness_travel_mode.sql` — aşağıdaki TÜM kolonlar **tek** migration'da.
- **B-3 (plan6, "Ek A" retention) V5 → V6'ya kayar.**
- **Mekan foto karuseli spec'i (`2026-09-02-venue-photo-carousel-design.md`) V5 → V7'ye kayar.**
- Sicilin yeni hâli: V1–V2 mevcut · V3 = B-5 · V4 = B-6 · **V5 = B-7** · V6 = B-3 · V7 = foto karuseli.
- `outOfOrder` hep kapalı. **INDEX'i bu plan düzenlemez** — kural 9 güncellemesi orkestratörde.

---

## Bu plana özel kurallar

- **INDEX güncelle** (başlarken `in-progress`, görev sonlarında `Son adım`, bitince `done`).
  **Git yazma YOK** — hiçbir adımda `git commit` çalıştırma; commit'i kullanıcı atar. Plan içindeki
  "Commit önerisi" satırları kullanıcıya öneridir, ajanın koşacağı komut değildir.
- **`git checkout` / `git restore` / `git show ... >` YASAK.** Dosya geri almak gerekiyorsa
  kullanıcıya söyle; çalışma ağacını git ile geri sarma.
- **Her mvn komutu** şu önekle koşar (jenv shim + Rancher ryuk):
  `JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true rtk mvn -o ...`
  — aşağıda kısaca `MVN` yazıldı. Komutlar `backend/` dizininden.
- **VSCode bayat sınıf tuzağı:** "Unresolved compilation problem" / var olmayan bir imzadan şikayet
  eden garip hatalarda önce `MVN -o compile` koş (VSCode'un `target/classes`'a yazdığı eski sınıflar
  Maven'in gördüğüyle çakışır), sonra testi tekrar dene.
- Postgres 5432 doluysa: `bumpinto-postgres-alt` konteyneri 5434'te; testler Testcontainers kullanır,
  bu yalnız `spring-boot:run` içindir.
- Her entegrasyon testi **`PostgresContainer.shared()`** kullanır; `new PostgreSQLContainer<>` ve
  `@Container` YASAK.
- `backend/ARCHITECTURE.md` §5 değişmezleri (ArchUnit) bağlayıcı: `domain` saf kalır (Spring/JPA/HTTP
  importu yok); yeni sınıf katman köküne konmaz; SQL yalnız Spring Data.
- **Record alanı eklemek çağrı yerlerini kırar.** Bu planda kırılmayı azaltmak için `Session`,
  `Participant`, `Venue`, `VenueCandidate`, `UserProfile` kayıtlarına **eski imzayı koruyan kolaylık
  kurucusu** eklenir (yeni alanlar varsayılana düşer). Yine de her görevde
  `rtk grep -rn "new <Record>(" src/main src/test --include=*.java` ile tam liste çıkarılır ve
  anlamı değişen çağrılar (özellikle test kurgusu) aynı görevde düzeltilir.
- Her HTTP ucu / gövde değişikliği Bruno isteğiyle biter (`AGENTS.md` "API Collection Policy");
  OpenCollection formatı, `seq` sıralı, `docs:` bloklu, sırrı dosyaya yazma.
- Görev kapanış kapısı: `MVN test` → `Tests run: N, Failures: 0, Errors: 0` ve
  `HexagonalArchitectureTest` yeşil.

---

## Alan modeli özeti (bu plan sonunda)

```
TravelMode     WALK 5 · BIKE 16 · EBIKE 24 · TRANSIT 20 · CAR 72 (km/sa) ; yol = kuş uçuşu × 1,3
Participant    + travelMode (varsayılan CAR: elle konumlar ve geç katılanlar da CAR)
UserProfile    + defaultTravelMode (null = tercih yok)
GeoMath        centroid(points, weights) ; weight = 1/hız  → iki kişide TAM eşit süre noktası
TravelMinutes  between(from, mode, to) = round5( fromCrowKm( distance(approx(from), to), mode ) )
Fairness       { maxMinutes (minimax, birincil), spreadMinutes (max−min, ikincil), longestParticipantId }
DeckOrdering   maxMinutes ↑ → spreadMinutes ↑ → eşitlerde Random(session.id().hashCode()) ile karışık
Session        + decidedAt, decisionKind, runoffReason, midpointLabel
DecisionKind   UNANIMOUS | SINGLE_LIKE | RUNOFF | FORCED | PARTIAL
RunoffReason   INTERSECTION | FALLBACK      (INTERSECTION finalist tavanı = 4)
Venue          + category, address, ratingCount, hoursToday, placeLink
SessionView    + midpointLabel, decisionKind, decidedAt, runoffReason, likeCounts (yalnız DECIDED)
VenueDto       + provider, category, address, ratingCount, hoursToday, placeLink, fairness
```

---

## UI etkisi (W-6 haritalaması)

| Yeni alan | Nereden | W-6'da nerede kullanılır |
|---|---|---|
| `ParticipantDto.travelMode` | Task 1b | Roster satırı ulaşım ikonu (PersonSimpleWalk/Bicycle/Lightning+Bicycle/Train/Car), orta nokta notu "… Ahmet'e yakın: bisikletle geliyor" (§4.5b) |
| `MeResponse.defaultTravelMode` | Task 1b | Profil "Nasıl geliyorsun?" varsayılanı; Katıl formu ön-doldurma (W-6a.0) |
| `ParticipantDto.midpointMinutes` | Task 1c | Lobi/Bekle orta nokta kartı `herkes ~25–35 dk` — aralık bu değerlerin min/max'ı; roster satırı `{{şehir}} · ~{{dk}} dk` (§5.C) |
| `VenueDto.travelMinutes` (herkes, 5 dk yuvarlı) | Task 1c | TravelChips — 3. kişi asla düşmez, "Sen" kalın, "~" öneki (§4.3) |
| `VenueDto.locality` | Task 4a/4b | Kart meta satırındaki semt kelimesi (`★ 4.6 · €€ · Best`) — orta noktanın şehrinden farklıysa basılır (§4.9) |
| `VenueDto.fairness.spreadMinutes` | Task 1c | Chips sonundaki `fark N dk`; rozet `Herkese ~aynı` (≤ 10 dk) (§4.2) |
| `VenueDto.fairness.maxMinutes` | Task 1c | Runoff kartı `toplam/en uzun` satırı; Karar "Neden burası?" ADALET ekseni (§5.C) |
| `VenueDto.fairness.longestParticipantId` | Task 1c | `{{ad}} için uzak` rozeti; Karar HandNote "Kerem en uzaktan geliyor" |
| deste/liste sırası (adalet öncelikli) | Task 1c | Deste HandNote "önce herkese en adil olanlar"; Liste Segmented `Herkese adil · Puan` varsayılanı |
| `SessionView.decisionKind` | Task 2 | Karar eyebrow: `HEPİNİZ AYNI YERİ BEĞENDİ` yalnız UNANIMOUS; `Oylamayla 2–1`; `{{adlar}} olmadan` (PARTIAL) |
| `SessionView.decidedAt` | Task 2 | Karar ekranında "Karar verildi · HH:mm"; yakınsama açılışının bir kez çalması |
| `SessionView.runoffReason` | Task 2 | Runoff kopyası: INTERSECTION vs FALLBACK ("Henüz ortak nokta yok — en çok beğenilen 3 mekan finalde") |
| `SessionView.likeCounts` | Task 2 | Karar sonrası "kaç kişi beğendi" ve "Yedek plan" satırı (yalnız DECIDED) |
| `SessionView.midpointLabel` | Task 3 | Lobi/Bekle orta nokta kartı `Eindhoven civarı · ≤ 9 km`; semt kelimesi (§5.C) |
| `VenueDto.category` | Task 4a | Uyum satırı `Kahve için: espresso bar` / amber `Kahve değil: fırın` (§4.6) |
| `VenueDto.address` | Task 4a | Kart meta `★ 4.6 · €€ · Best`; Karar YER ekseni `Kleine Berg 16, Eindhoven merkez` |
| `VenueDto.ratingCount` | Task 4a | Puanın yanına sosyal kanıt (`4.6 · 312`) — 4,3–4,7 gürültüsünü kırar (§3) |
| `VenueDto.hoursToday` | Task 4a | Veri gelince `Bugün 08–22`; veri yoksa satır **yok** (§4.9 "Açık" gösterilmez) |
| `VenueDto.placeLink` | Task 4a/4b | Karar "Google Maps'te aç"; harita kaldırılan yüzeylerde tek dokunuş çıkış |
| `VenueDto.provider` | Task 4a/4b | Kart altı atıf: "Google Maps" / "Powered by Foursquare" (§2 politika) |
| `photoUrl == null` (foto bütçesi bitti) | Task 5 | Monogram fallback — kart tasarımı zaten fotosuz hâli destekliyor |
| `midpointLabel` atfı | Task 3 | Footer "© OpenStreetMap contributors" (W-6a.9 borcu) |

---

### Task 1a: V5 migration + `TravelMode` + mod-uyumlu `TravelEstimate` + ağırlıklı `GeoMath.centroid` (TDD)

**Files:**
- Create: `backend/src/main/resources/db/migration/V5__fairness_travel_mode.sql`
- Create: `backend/src/main/java/com/bumpinto/domain/geo/TravelMode.java`
- Modify: `backend/src/main/java/com/bumpinto/domain/geo/TravelEstimate.java`
- Modify: `backend/src/main/java/com/bumpinto/domain/geo/GeoMath.java`
- Modify: `backend/src/main/java/com/bumpinto/domain/session/Participant.java`
- Modify: `backend/src/main/java/com/bumpinto/domain/user/UserProfile.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/ParticipantEntity.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/UserEntity.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/SessionStoreAdapter.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/UserStoreAdapter.java`
- Modify: `backend/src/test/java/com/bumpinto/domain/geo/TravelEstimateTest.java`
- Modify: `backend/src/test/java/com/bumpinto/domain/geo/GeoMathTest.java`
- Modify: `backend/src/test/java/com/bumpinto/SchemaMigrationTest.java`

- [ ] **Step 1: Migration** — `V5__fairness_travel_mode.sql` (bu planın TEK migration'ı; Task 2–4
  kolonları da burada, çünkü Flyway sicili plana tek numara verir)

```sql
-- B-7: adalet cekirdegi + ulasim turu + karar seffafligi + saglayici alanlari.
-- Varsayilan CAR: elle eklenen konumlar ve gec katilanlar da araba sayilir (spec §4.5b).
alter table participants add column travel_mode text not null default 'CAR';
-- null = tercih yok; Katil formu yine CAR ile acilir.
alter table users add column default_travel_mode text;

-- Karar seffafligi (spec §5.A.2). Gecmis oturumlar null kalir: karar turu bilinmiyor demektir.
alter table sessions add column decided_at     timestamptz;
alter table sessions add column decision_kind  text;
alter table sessions add column runoff_reason  text;
-- Orta noktanin kasaba kelimesi (Nominatim, spec §5.A.4). Bir kez find-venues'te yazilir.
alter table sessions add column midpoint_label text;

-- Saglayici alanlari (spec §5.A.5). Hepsi opsiyonel: saglayici vermezse null, UI satiri gizler.
alter table venues add column category     text;
-- address = tam kisa adres ("Kleine Berg 16, Eindhoven"); locality = YALNIZ kasaba/semt kelimesi
-- ("Eindhoven", "Strijp-S") — kart meta satiri bunu basar, adresi degil (spec §4.9).
alter table venues add column address      text;
alter table venues add column locality     text;
alter table venues add column rating_count int;
alter table venues add column place_link   text;
alter table venues add column hours_today  text;
```

- [ ] **Step 2: Failing tests** — `TravelEstimateTest`'e ekle:

```java
    @Test
    void everyModeUsesItsOwnSpeedWithTheSameDetourFactor() {
        // 10 km kus ucusu → 13 km yol; dakika = 13 / hiz * 60
        assertThat(TravelEstimate.fromCrowKm(10, TravelMode.WALK).minutes()).isEqualTo(156);
        assertThat(TravelEstimate.fromCrowKm(10, TravelMode.BIKE).minutes()).isEqualTo(49);
        assertThat(TravelEstimate.fromCrowKm(10, TravelMode.EBIKE).minutes()).isEqualTo(33);
        assertThat(TravelEstimate.fromCrowKm(10, TravelMode.TRANSIT).minutes()).isEqualTo(39);
        assertThat(TravelEstimate.fromCrowKm(10, TravelMode.CAR).minutes()).isEqualTo(11);
        assertThat(TravelEstimate.fromCrowKm(10, TravelMode.CAR).roadKm()).isEqualTo(13.0);
    }

    @Test
    void modelessCallStaysCarSoOldCallSitesKeepTheirNumbers() {
        assertThat(TravelEstimate.fromCrowKm(10))
                .isEqualTo(TravelEstimate.fromCrowKm(10, TravelMode.CAR));
        assertThat(TravelEstimate.fromCrowKm(10).mode()).isEqualTo(TravelMode.CAR);
    }
```

`GeoMathTest`'e ekle (spec §4.5b'nin "iki kişide eşit süre noktasını tam verir" özelliği):

```java
    /**
     * Ozellik testi: aginlik = 1/hiz secildiginde iki nokta arasindaki agirlikli orta nokta,
     * iki kisinin de AYNI surede vardigi noktadir. Ayni boylamda iki nokta secildi: buyuk
     * cember dogru parcasi meridyen oldugu icin cebirsel beklenti tam tutar.
     */
    @Test
    void weightedCentroidOfTwoPeopleIsTheEqualTimePoint() {
        GeoPoint a = new GeoPoint(51.30, 5.50); // e-bisiklet
        GeoPoint b = new GeoPoint(51.70, 5.50); // araba
        GeoPoint mid = GeoMath.centroid(List.of(a, b),
                List.of(TravelMode.EBIKE.weight(), TravelMode.CAR.weight()));

        double minutesA = TravelEstimate.fromCrowKm(GeoMath.distanceKm(a, mid),
                TravelMode.EBIKE).minutes();
        double minutesB = TravelEstimate.fromCrowKm(GeoMath.distanceKm(b, mid),
                TravelMode.CAR).minutes();
        assertThat(minutesA).isCloseTo(minutesB, within(1.0)); // yuvarlama payi

        // Nokta YAVAS olana yakin durur: e-bisikletli mesafenin 1/4'unu, arabali 3/4'unu gider.
        assertThat(GeoMath.distanceKm(a, mid) / GeoMath.distanceKm(a, b))
                .isCloseTo(0.25, within(0.01));
    }

    @Test
    void centroidWithoutWeightsIsUnchangedAndBadWeightsAreRejected() {
        List<GeoPoint> points = List.of(new GeoPoint(51.30, 5.50), new GeoPoint(51.70, 5.50));
        assertThat(GeoMath.centroid(points))
                .isEqualTo(GeoMath.centroid(points, List.of(1.0, 1.0)));
        assertThatThrownBy(() -> GeoMath.centroid(points, List.of(1.0)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> GeoMath.centroid(points, List.of(1.0, 0.0)))
                .isInstanceOf(IllegalArgumentException.class);
    }
```

(`import static org.assertj.core.api.Assertions.within;`,
`import static org.assertj.core.api.Assertions.assertThatThrownBy;`,
`import com.bumpinto.domain.geo.TravelMode;` — aynı pakette olduğu için import gerekmez.)

- [ ] **Step 3: FAIL doğrula** — Run: `MVN test -Dtest='TravelEstimateTest,GeoMathTest'`
Expected: derleme hatası (`TravelMode` yok, `centroid(List,List)` yok).

- [ ] **Step 4: `TravelMode`**

```java
package com.bumpinto.domain.geo;

/**
 * Katilimcinin geldigi ulasim turu ve kaba ortalama hizi (km/sa) — spec §4.5b.
 *
 * <p>Sayilar OSRM gelene kadarki koprudur: yurume 5, bisiklet 16, e-bisiklet 24, toplu tasima
 * ~20 (bekleme dahil, en zayif tahmin), araba 72. Hepsi ayni ×1,3 yol katsayisini kullanir;
 * OSRM gelince araba/bisiklet/yaya gercek olur, toplu tasima tahmin kalir.
 *
 * <p>{@link #weight()} agirlikli orta nokta icindir: agirlik = 1/hiz, yani YAVAS olan orta
 * noktayi kendine ceker. Iki kiside bu tam olarak "esit sure" noktasini verir.
 */
public enum TravelMode {

    WALK(5.0), BIKE(16.0), EBIKE(24.0), TRANSIT(20.0), CAR(72.0);

    private final double kmh;

    TravelMode(double kmh) {
        this.kmh = kmh;
    }

    public double kmh() {
        return kmh;
    }

    public double weight() {
        return 1.0 / kmh;
    }
}
```

- [ ] **Step 5: `TravelEstimate`** — mod alan bir kayda dönüşür; modsuz çağrı CAR kalır

```java
package com.bumpinto.domain.geo;

public record TravelEstimate(int minutes, double roadKm, TravelMode mode) {

    private static final double ROAD_FACTOR = 1.3;

    /** Modsuz cagri = CAR: eski cagri yerleri sayilarini aynen korur. */
    public static TravelEstimate fromCrowKm(double crowKm) {
        return fromCrowKm(crowKm, TravelMode.CAR);
    }

    public static TravelEstimate fromCrowKm(double crowKm, TravelMode mode) {
        if (crowKm < 0) {
            throw new IllegalArgumentException("crowKm must be >= 0");
        }
        if (mode == null) {
            throw new IllegalArgumentException("mode must not be null");
        }
        double road = crowKm * ROAD_FACTOR;
        int minutes = (int) Math.round(road / mode.kmh() * 60);
        return new TravelEstimate(minutes, Math.round(road * 10) / 10.0, mode);
    }
}
```

- [ ] **Step 6: `GeoMath.centroid` ağırlıklı** — mevcut metod ağırlıksız sarmalayıcıya döner

```java
    public static GeoPoint centroid(List<GeoPoint> points) {
        return centroid(points, null);
    }

    /**
     * Agirlikli kuresel merkez. {@code weights} null ise esit agirlik (eski davranis).
     * Agirlik = 1/hiz (bkz. {@link TravelMode#weight()}): yavas gelen orta noktayi kendine
     * ceker. Iki noktada sonuc TAM esit sure noktasidir; uc ve fazlasinda yaklasiktir
     * (spec §4.5b bunu boyle kabul ediyor).
     */
    public static GeoPoint centroid(List<GeoPoint> points, List<Double> weights) {
        if (points == null || points.isEmpty()) {
            throw new IllegalArgumentException("points must not be empty");
        }
        if (weights != null && weights.size() != points.size()) {
            throw new IllegalArgumentException("weights must match points");
        }
        double x = 0;
        double y = 0;
        double z = 0;
        double total = 0;
        for (int i = 0; i < points.size(); i++) {
            GeoPoint p = points.get(i);
            double w = weights == null ? 1.0 : weights.get(i);
            if (w <= 0) {
                throw new IllegalArgumentException("weights must be > 0");
            }
            double lat = Math.toRadians(p.lat());
            double lng = Math.toRadians(p.lng());
            x += w * Math.cos(lat) * Math.cos(lng);
            y += w * Math.cos(lat) * Math.sin(lng);
            z += w * Math.sin(lat);
            total += w;
        }
        x /= total;
        y /= total;
        z /= total;
        double lng = Math.atan2(y, x);
        double hyp = Math.sqrt(x * x + y * y);
        double lat = Math.atan2(z, hyp);
        return new GeoPoint(Math.toDegrees(lat), Math.toDegrees(lng));
    }
```

- [ ] **Step 7: `Participant.travelMode`** — kanonik kurucunun **sonuna** alan, eski 9 argümanlı
imza kolaylık kurucusu olarak kalır (çağrı yerleri kırılmaz, hepsi CAR'a düşer)

```java
package com.bumpinto.domain.session;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;

import java.time.Instant;
import java.util.UUID;

/**
 * manual=true: host'un elle ekledigi konum (SOLO). Token'i YOK, kaydirmaz, oy popülasyonuna
 * girmez; yalniz orta nokta / yaricap / deste geometrisine dahildir.
 *
 * <p>travelMode: spec §4.5b. Varsayilan CAR — elle konumlar ve gec katilanlar da CAR sayilir.
 */
public record Participant(UUID id, UUID sessionId, String displayName, GeoPoint location,
                          boolean host, String token, Instant deckDoneAt,
                          boolean manual, String locationLabel, TravelMode travelMode) {

    public Participant {
        if (travelMode == null) {
            travelMode = TravelMode.CAR;
        }
    }

    /** Eski imza: mod verilmeyen her yer CAR'dir. */
    public Participant(UUID id, UUID sessionId, String displayName, GeoPoint location,
                       boolean host, String token, Instant deckDoneAt,
                       boolean manual, String locationLabel) {
        this(id, sessionId, displayName, location, host, token, deckDoneAt, manual, locationLabel,
                TravelMode.CAR);
    }

    public boolean hasLocation() {
        return location != null;
    }

    public boolean deckDone() {
        return deckDoneAt != null;
    }

    /** Oy popülasyonu: konumu olan ve elle eklenmemis katilimci. */
    public boolean votes() {
        return hasLocation() && !manual;
    }

    public Participant locatedAt(GeoPoint newLocation, String newLabel) {
        return locatedAt(newLocation, newLabel, travelMode);
    }

    public Participant locatedAt(GeoPoint newLocation, String newLabel, TravelMode newMode) {
        return new Participant(id, sessionId, displayName, newLocation, host, token, deckDoneAt,
                manual, newLabel, newMode == null ? travelMode : newMode);
    }

    public Participant doneAt(Instant when) {
        return new Participant(id, sessionId, displayName, location, host, token, when,
                manual, locationLabel, travelMode);
    }

    /**
     * token bir sirdir: default record toString'i onu log'a ve hata mesajina sizdirir
     * (bir gun biri log.debug("p={}", participant) yazar). Saf Java — domain saf kalir.
     */
    @Override
    public String toString() {
        return "Participant[id=" + id + ", sessionId=" + sessionId
                + ", displayName=" + displayName + ", location=" + location
                + ", host=" + host + ", token=" + (token == null ? "null" : "***")
                + ", deckDoneAt=" + deckDoneAt + ", manual=" + manual
                + ", locationLabel=" + locationLabel + ", travelMode=" + travelMode + "]";
    }
}
```

- [ ] **Step 8: `UserProfile.defaultTravelMode`**

```java
package com.bumpinto.domain.user;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.session.ActivityType;
import java.util.UUID;

/** Kullanicinin hesap profili + tercihleri. Tum tercih alanlari opsiyoneldir (null = ayarlanmamis). */
public record UserProfile(UUID id, String email, String name, GeoPoint defaultLocation,
                          String defaultLocationLabel, ActivityType defaultActivity,
                          String language, TravelMode defaultTravelMode) {

    /** Eski imza: ulasim tercihi yok. */
    public UserProfile(UUID id, String email, String name, GeoPoint defaultLocation,
                       String defaultLocationLabel, ActivityType defaultActivity, String language) {
        this(id, email, name, defaultLocation, defaultLocationLabel, defaultActivity, language, null);
    }

    public UserProfile withPreferences(String newName, GeoPoint location, String label,
                                       ActivityType activity, String lang, TravelMode mode) {
        return new UserProfile(id, email, newName == null ? name : newName, location, label,
                activity, lang, mode);
    }
}
```

- [ ] **Step 9: Persistence** — `ParticipantEntity`'ye `String travelMode;`, `UserEntity`'ye
`String defaultTravelMode;` ekle. `SessionStoreAdapter`:

```java
        e.isManual = p.manual();
        e.locationLabel = p.locationLabel();
        e.travelMode = p.travelMode().name();
```

ve `toParticipant`:

```java
    static Participant toParticipant(ParticipantEntity e) {
        GeoPoint loc = (e.lat == null || e.lng == null) ? null : new GeoPoint(e.lat, e.lng);
        return new Participant(e.id, e.sessionId, e.displayName, loc, e.isHost, e.token,
                e.deckDoneAt, e.isManual, e.locationLabel,
                e.travelMode == null ? TravelMode.CAR : TravelMode.valueOf(e.travelMode));
    }
```

(`import com.bumpinto.domain.geo.TravelMode;` ekle.) `UserStoreAdapter`'da profil yazma/okumaya
`defaultTravelMode` ekle — yazarken `p.defaultTravelMode() == null ? null : p.defaultTravelMode().name()`,
okurken `e.defaultTravelMode == null ? null : TravelMode.valueOf(e.defaultTravelMode)`.

- [ ] **Step 10: Şema testi** — `SchemaMigrationTest`'e ekle:

```java
    @Test
    void v5AddsTravelModeFairnessAndProviderColumns() {
        assertThat(columnsOf("participants")).contains("travel_mode");
        assertThat(columnsOf("users")).contains("default_travel_mode");
        assertThat(columnsOf("sessions"))
                .contains("decided_at", "decision_kind", "runoff_reason", "midpoint_label");
        assertThat(columnsOf("venues"))
                .contains("category", "address", "locality", "rating_count", "place_link",
                        "hours_today");
        String def = jdbc.queryForObject(
                "select column_default from information_schema.columns "
                        + "where table_name = 'participants' and column_name = 'travel_mode'",
                String.class);
        assertThat(def).contains("CAR");
    }

    private List<String> columnsOf(String table) {
        return jdbc.queryForList(
                "select column_name from information_schema.columns where table_name = ?",
                String.class, table);
    }
```

(Sınıfta zaten benzer bir yardımcı varsa onu kullan, ikincisini ekleme.)

- [ ] **Step 11: PASS doğrula** — Run: `MVN test -Dtest='TravelEstimateTest,GeoMathTest,SchemaMigrationTest,StoreAdapterTest'`
Expected: `Failures: 0, Errors: 0`.

- [ ] **Step 12: Tüm suite** — Run: `MVN test`
Expected: `BUILD SUCCESS` (kolaylık kurucuları sayesinde davranış değişmedi).

- [ ] **Step 13: INDEX güncelle + Commit önerisi (kullanıcı)**

```
feat(geo): TravelMode, mod-uyumlu TravelEstimate, agirlikli centroid, V5 migration

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

---

### Task 1b: Ulaşım türü API yüzeyi — Katıl / konum / elle nokta / `/api/me` (TDD)

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/ApiDtos.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/SessionViewAssembler.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/SessionController.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/ParticipantController.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/PointsController.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/MeController.java`
- Modify: `backend/src/main/java/com/bumpinto/application/session/SessionCommands.java`
- Modify: `backend/src/main/java/com/bumpinto/application/user/UserPreferences.java`
- Modify: `backend/src/test/java/com/bumpinto/application/session/SessionCommandsTest.java`
- Modify: `backend/src/test/java/com/bumpinto/application/user/UserPreferencesTest.java`
- Modify: `backend/src/test/java/com/bumpinto/AccountApiTest.java`
- Create: `backend/.infra/bumpinto-collection/sessions/…` (Step 8, mevcut dosyalar güncellenir)

- [ ] **Step 1: Failing tests** — `SessionCommandsTest`'e ekle:

```java
    @Test
    void joinCarriesTravelModeAndDefaultsToCar() {
        SessionCommands.CreateSessionResult r = commands.createSession(UUID.randomUUID(), null,
                ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH, "Mehmet", null, TravelMode.BIKE);
        assertThat(r.hostParticipant().travelMode()).isEqualTo(TravelMode.BIKE);

        Participant kerem = commands.join(r.session().slug(), "Kerem", SOMEREN, "Someren",
                TravelMode.EBIKE);
        assertThat(kerem.travelMode()).isEqualTo(TravelMode.EBIKE);

        // Mod verilmeyen katilim CAR: "gec katilanlar da CAR" (spec §4.5b)
        Participant ayse = commands.join(r.session().slug(), "Ayşe", SOMEREN, "Someren", null);
        assertThat(ayse.travelMode()).isEqualTo(TravelMode.CAR);
    }

    @Test
    void updateLocationCanChangeTravelModeAndNullKeepsIt() {
        SessionCommands.CreateSessionResult r = commands.createSession(UUID.randomUUID(), null,
                ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH, "Mehmet", null, null);
        Participant kerem = commands.join(r.session().slug(), "Kerem", null, null, TravelMode.WALK);

        commands.updateLocation(r.session().slug(), kerem.id(), SOMEREN, "Someren", null);
        assertThat(store.participants.get(kerem.id()).travelMode()).isEqualTo(TravelMode.WALK);

        commands.updateLocation(r.session().slug(), kerem.id(), SOMEREN, "Someren",
                TravelMode.TRANSIT);
        assertThat(store.participants.get(kerem.id()).travelMode()).isEqualTo(TravelMode.TRANSIT);
    }

    @Test
    void manualPointsAreAlwaysCar() {
        SessionCommands.CreateSessionResult solo = commands.createSession(UUID.randomUUID(), null,
                ActivityType.COFFEE, SessionType.SOLO, DEN_BOSCH, "Mehmet", null, TravelMode.BIKE);
        Participant ayse = commands.addPoint(solo.session().slug(), solo.session().hostId(),
                "Ayşe", "Someren", SOMEREN);
        assertThat(ayse.travelMode()).isEqualTo(TravelMode.CAR);
    }
```

`UserPreferencesTest`'e ekle:

```java
    @Test
    void defaultTravelModeIsStoredAndClearable() {
        UserProfile saved = prefs.update(userId, null, null, null, null, null, TravelMode.EBIKE);
        assertThat(saved.defaultTravelMode()).isEqualTo(TravelMode.EBIKE);
        assertThat(prefs.update(userId, null, null, null, null, null, null).defaultTravelMode())
                .isNull();
    }
```

`AccountApiTest`'e ekle (PUT + GET `/api/me` gidiş-dönüşü):

```java
    @Test
    void meRoundTripsDefaultTravelMode() throws Exception {
        String token = signIn();
        mvc.perform(put("/api/me").header("Authorization", "Bearer " + token)
                        .contentType(JSON).content("{\"defaultTravelMode\":\"EBIKE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.defaultTravelMode").value("EBIKE"));
        mvc.perform(get("/api/me").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.defaultTravelMode").value("EBIKE"));
    }
```

(`signIn()` sınıfta mevcut değilse, testin diğer metotlarındaki oturum açma bloğunu birebir kopyala —
yeni bir yardımcı çıkarmak bu görevin işi değil.)

- [ ] **Step 2: FAIL doğrula** — Run: `MVN test -Dtest='SessionCommandsTest,UserPreferencesTest,AccountApiTest'`
Expected: derleme hatası (yeni parametreler yok).

- [ ] **Step 3: DTO'lar** — `ApiDtos` içinde değiştir/ekle (`import com.bumpinto.domain.geo.TravelMode;`):

```java
    public record CreateSessionRequest(@NotNull ActivityType activityType,
                                       @Size(max = 60) String name,
                                       /** null → GROUP (M-1 mobil istemcisi alani gondermez). */
                                       SessionType sessionType,
                                       @NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
                                       @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng,
                                       @NotBlank @Size(max = 40) String displayName,
                                       @Size(max = 80) String locationLabel,
                                       /** null → CAR (spec §4.5b varsayilani). */
                                       TravelMode travelMode) {
    }

    public record JoinRequest(@NotBlank @Size(max = 40) String displayName,
                              @DecimalMin("-90") @DecimalMax("90") Double lat,
                              @DecimalMin("-180") @DecimalMax("180") Double lng,
                              @Size(max = 80) String locationLabel,
                              TravelMode travelMode) {
    }

    /** travelMode null = mevcut tercihi KORU (konum guncellemesi modu silmez). */
    public record LocationRequest(@NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
                                  @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng,
                                  @Size(max = 80) String label,
                                  TravelMode travelMode) {
    }

    /** approxLocation: 2 ondalik (~1 km) — tam koordinat API'den asla cikmaz (spec §8 gizlilik). */
    public record ParticipantDto(UUID id, String displayName, boolean host, boolean hasLocation,
                                 boolean deckDone, boolean manual, String locationLabel,
                                 GeoPointDto approxLocation, TravelMode travelMode) {
    }

    public record MeResponse(UUID id, String email, String displayName,
                             LocationPrefDto defaultLocation, ActivityType defaultActivity,
                             String language, TravelMode defaultTravelMode, StatsDto stats) {
    }

    /** Tam degistirme: null = o tercihi temizle (displayName haric: null = degistirme). */
    public record UpdateMeRequest(@Size(max = 40) String displayName,
                                  @Valid LocationPrefDto defaultLocation,
                                  ActivityType defaultActivity,
                                  String language,
                                  TravelMode defaultTravelMode) {
    }
```

`PointRequest` **değişmez**: elle konumlar her zaman CAR (spec §4.5b).

- [ ] **Step 4: `SessionCommands`** — üç imza mod alır:

```java
    @Transactional
    public CreateSessionResult createSession(UUID hostUserId, String name, ActivityType type,
                                             SessionType sessionType, GeoPoint hostLocation,
                                             String hostDisplayName, String hostLocationLabel,
                                             TravelMode hostTravelMode) {
        Session session = store.saveSession(new Session(UUID.randomUUID(), Ids.slug(), hostUserId,
                Texts.sessionName(name), type, sessionType, SessionStatus.COLLECTING,
                clock.instant().plus(SESSION_TTL), null, List.of()));
        Participant host = store.saveParticipant(new Participant(UUID.randomUUID(), session.id(),
                Texts.displayName(hostDisplayName), hostLocation, true,
                Ids.participantToken(), null, false, Texts.label(hostLocationLabel),
                hostTravelMode == null ? TravelMode.CAR : hostTravelMode));
        return new CreateSessionResult(session, host);
    }

    @Transactional
    public Participant join(String slug, String displayName, GeoPoint location,
                            String locationLabel, TravelMode travelMode) {
        Session session = required(slug);
        if (session.isSolo()) {
            throw new ConflictException("solo session has no invite link");
        }
        if (session.status() == SessionStatus.DECIDED) {
            throw new ConflictException("session is closed: " + session.status());
        }
        Participant joined = store.saveParticipant(new Participant(UUID.randomUUID(), session.id(),
                Texts.displayName(displayName), location, false, Ids.participantToken(), null,
                false, Texts.label(locationLabel),
                travelMode == null ? TravelMode.CAR : travelMode));
        events.publish(slug, SessionEvent.participantJoined(store.participantsOf(session.id()).size()));
        return joined;
    }

    @Transactional
    public void updateLocation(String slug, UUID participantId, GeoPoint location, String label,
                               TravelMode travelMode) {
        Session session = required(slug);
        Participant participant = store.participantsOf(session.id()).stream()
                .filter(p -> p.id().equals(participantId)).findFirst()
                .orElseThrow(() -> new NotFoundException("participant not in session"));
        String resolvedLabel = label == null ? participant.locationLabel() : Texts.label(label);
        store.saveParticipant(participant.locatedAt(location, resolvedLabel, travelMode));
    }
```

`addPoint` gövdesi değişmez; `new Participant(...)` çağrısı 9 argümanlı kolaylık kurucusunu
kullandığı için elle konum zaten CAR olur — bunu javadoc'a yaz:
`/** … Elle konum HER ZAMAN CAR sayilir (spec §4.5b). */`

(`import com.bumpinto.domain.geo.TravelMode;` ekle.)

- [ ] **Step 5: `UserPreferences`**

```java
    @Transactional
    public UserProfile update(UUID userId, String name, GeoPoint defaultLocation, String label,
                              ActivityType defaultActivity, String language, TravelMode travelMode) {
        UserProfile current = users.profileOf(userId)
                .orElseThrow(() -> new NotFoundException("user not found"));
        if (language != null && !LANGUAGES.contains(language)) {
            throw new IllegalArgumentException("unsupported language: " + language);
        }
        String newName = name == null ? null : Texts.displayName(name);
        return users.saveProfile(current.withPreferences(newName, defaultLocation,
                Texts.label(label), defaultActivity, language, travelMode));
    }
```

(`import com.bumpinto.domain.geo.TravelMode;` ekle.)

- [ ] **Step 6: Controller'lar**

`SessionController.create` gövdesinde son argümanı ekle:

```java
        SessionCommands.CreateSessionResult result = commands.createSession(
                WebPrincipals.hostUserId(jwt), request.name(), request.activityType(),
                request.sessionType() == null ? SessionType.GROUP : request.sessionType(),
                new GeoPoint(request.lat(), request.lng()), request.displayName(),
                request.locationLabel(), request.travelMode());
```

`ParticipantController`:

```java
        Participant joined = commands.join(slug, request.displayName(), location,
                request.locationLabel(), request.travelMode());
```

```java
        commands.updateLocation(slug, me.of(auth, slug),
                new GeoPoint(request.lat(), request.lng()), request.label(), request.travelMode());
```

`MeController`:

```java
        prefs.update(id, request.displayName(),
                location == null ? null : new GeoPoint(location.lat(), location.lng()),
                location == null ? null : location.label(),
                request.defaultActivity(), request.language(), request.defaultTravelMode());
```

```java
        return new ApiDtos.MeResponse(profile.id(), profile.email(), profile.name(), location,
                profile.defaultActivity(), profile.language(), profile.defaultTravelMode(),
                new ApiDtos.StatsDto(me.stats().sessionsHosted(), me.stats().friendsMet()));
```

`PointsController.add` yanıtında `ParticipantDto`'nun yeni son alanı:

```java
        return ResponseEntity.status(HttpStatus.CREATED).body(new ApiDtos.ParticipantDto(
                point.id(), point.displayName(), false, true, false, true, point.locationLabel(),
                SessionViewAssembler.approx(point.location()), point.travelMode()));
```

- [ ] **Step 7: Assembler** — `ParticipantDto` üretimine modu ekle:

```java
        List<ApiDtos.ParticipantDto> participants = snap.participants().stream()
                .map(p -> new ApiDtos.ParticipantDto(p.id(), p.displayName(), p.host(),
                        p.hasLocation(), p.deckDone(), p.manual(), p.locationLabel(),
                        p.hasLocation() ? approx(p.location()) : null, p.travelMode()))
                .toList();
```

- [ ] **Step 8: Bruno** — dört dosya güncellenir (yeni uç yok, gövdeler değişti):

`sessions/create-session.yml` — body'ye `"travelMode": "CAR",` ekle; `docs:` sonuna:
`` `travelMode`: `WALK|BIKE|EBIKE|TRANSIT|CAR`; alan yoksa `CAR`. Yol suresi bu moda gore hesaplanir. ``

`participants/join-session.yml` — body'ye `"travelMode": "EBIKE"` ekle; `docs:` sonuna:
`` `travelMode` opsiyonel; verilmezse `CAR` (gec katilan da CAR — spec §4.5b). ``

`participants/update-location.yml` — body'ye `"travelMode": "BIKE"` ekle; `docs:` sonuna:
`` `travelMode` null gonderilirse mevcut tercih KORUNUR; konum guncellemesi modu silmez. ``

`me/update-me.yml` — body'ye `"defaultTravelMode": "EBIKE"` ekle; `docs:` sonuna:
`` `defaultTravelMode` null = tercihi temizle. `GET /api/me` ayni alani doner; istemci Katil formunu bununla on-doldurur. ``
`me/get-me.yml` `docs:` sonuna: `` Yanit `defaultTravelMode` alanini tasir (null = tercih yok). ``

- [ ] **Step 9: PASS doğrula** — Run: `MVN test`
Expected: `Failures: 0, Errors: 0`; `HexagonalArchitectureTest` yeşil.

- [ ] **Step 10: INDEX güncelle + Commit önerisi (kullanıcı)**

```
feat(api): katilim/konum/profil ucları travelMode alir, ParticipantDto modu tasir

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

---

### Task 1c: Adalet çekirdeği — `TravelMinutes` · `Fairness` · `DeckOrdering` · adalet öncelikli deste (TDD)

**Files:**
- Create: `backend/src/main/java/com/bumpinto/domain/geo/TravelMinutes.java`
- Create: `backend/src/main/java/com/bumpinto/domain/geo/Fairness.java`
- Create: `backend/src/main/java/com/bumpinto/domain/deck/DeckOrdering.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/ApiDtos.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/SessionViewAssembler.java`
- Modify: `backend/src/main/java/com/bumpinto/application/deck/DeckFlow.java`
- Create: `backend/src/test/java/com/bumpinto/domain/deck/DeckOrderingTest.java`
- Modify: `backend/src/test/java/com/bumpinto/adapter/in/web/SessionViewAssemblerTest.java`
- Modify: `backend/src/test/java/com/bumpinto/application/deck/DeckFlowTest.java`
- Modify: `backend/src/test/java/com/bumpinto/support/FakeStores.java`

- [ ] **Step 1: Failing tests** — `DeckOrderingTest.java` (yeni):

```java
package com.bumpinto.domain.deck;

import static org.assertj.core.api.Assertions.assertThat;

import com.bumpinto.domain.geo.Fairness;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class DeckOrderingTest {

    static final UUID P = UUID.fromString("00000000-0000-0000-0000-0000000000aa");

    record Item(String name, int max, int spread) {
    }

    static Fairness fairnessOf(Item i) {
        return new Fairness(i.max(), i.spread(), P);
    }

    static List<String> names(List<Item> items, long seed) {
        return DeckOrdering.fairnessFirst(items, DeckOrderingTest::fairnessOf, seed).stream()
                .map(Item::name).toList();
    }

    @Test
    void primaryKeyIsLongestTripThenSpread() {
        List<Item> items = List.of(new Item("uzak", 50, 5), new Item("adil", 25, 5),
                new Item("yakin-ama-dengesiz", 25, 20));
        assertThat(names(items, 42L)).containsExactly("adil", "yakin-ama-dengesiz", "uzak");
    }

    @Test
    void equalFairnessIsShuffledDeterministicallyBySeed() {
        List<Item> items = List.of(new Item("a", 25, 5), new Item("b", 25, 5),
                new Item("c", 25, 5), new Item("d", 25, 5));
        List<String> first = names(items, 7L);
        assertThat(names(items, 7L)).isEqualTo(first);           // ayni tohum → ayni sira
        assertThat(first).containsExactlyInAnyOrder("a", "b", "c", "d");
        assertThat(names(items, 99L)).isNotEqualTo(first);        // farkli tohum → farkli sira
    }

    @Test
    void shuffleNeverCrossesAFairnessGroup() {
        List<Item> items = List.of(new Item("uzak1", 50, 0), new Item("uzak2", 50, 0),
                new Item("adil1", 20, 0), new Item("adil2", 20, 0));
        assertThat(names(items, 3L).subList(0, 2)).containsExactlyInAnyOrder("adil1", "adil2");
        assertThat(names(items, 3L).subList(2, 4)).containsExactlyInAnyOrder("uzak1", "uzak2");
    }

    @Test
    void fairnessOfEmptyMapIsZeroAndLongestIsTheSlowestParticipant() {
        assertThat(Fairness.of(Map.of())).isEqualTo(new Fairness(0, 0, null));
        UUID a = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID b = UUID.fromString("00000000-0000-0000-0000-000000000002");
        Map<UUID, Integer> minutes = new java.util.LinkedHashMap<>();
        minutes.put(a, 20);
        minutes.put(b, 45);
        Fairness f = Fairness.of(minutes);
        assertThat(f.maxMinutes()).isEqualTo(45);
        assertThat(f.spreadMinutes()).isEqualTo(25);
        assertThat(f.longestParticipantId()).isEqualTo(b);
    }
}
```

`SessionViewAssemblerTest`'e ekle:

```java
    @Test
    void everyParticipantGetsRoundedMinutesFromTheirApproxLocationAndMode() {
        Session s = session(SessionType.GROUP);
        Participant walker = new Participant(UUID.randomUUID(), s.id(), "Yaya",
                new GeoPoint(51.44123, 5.47456), false, "t1", null, false, "Eindhoven",
                TravelMode.WALK);
        Participant driver = new Participant(UUID.randomUUID(), s.id(), "Suruc",
                new GeoPoint(51.69781, 5.30374), false, "t2", null, false, "Den Bosch",
                TravelMode.CAR);
        Venue v = venue(s.id(), new GeoPoint(51.44, 5.47));

        ApiDtos.SessionView view = assembler.toView(new SessionQueries.SessionSnapshot(
                s, List.of(walker, driver), List.of(v), Map.of(), Map.of(), Map.of()), null);

        Map<UUID, Integer> minutes = view.venues().get(0).travelMinutes();
        assertThat(minutes).containsOnlyKeys(walker.id(), driver.id());
        assertThat(minutes.values()).allMatch(m -> m % 5 == 0 && m >= 5); // 5 dk basamagi
        // Yaya mekanin dibinde: en kucuk basamak; surucu Den Bosch'tan geliyor: daha uzun
        assertThat(minutes.get(walker.id())).isEqualTo(5);
        assertThat(minutes.get(driver.id())).isGreaterThan(minutes.get(walker.id()));

        ApiDtos.FairnessDto fairness = view.venues().get(0).fairness();
        assertThat(fairness.maxMinutes()).isEqualTo(minutes.get(driver.id()));
        assertThat(fairness.spreadMinutes())
                .isEqualTo(minutes.get(driver.id()) - minutes.get(walker.id()));
        assertThat(fairness.longestParticipantId()).isEqualTo(driver.id());
    }

    @Test
    void minutesComeFromTheRoundedLocationForTheViewerToo() {
        // Gizlilik (spec §4.4): tek kod yolu. Ayni yuvarlama kutusundaki iki farkli tam
        // koordinat AYNI dakikayi verir — viewer icin de.
        Session s = session(SessionType.GROUP);
        Venue v = venue(s.id(), new GeoPoint(51.44, 5.47));
        Participant exact = new Participant(UUID.randomUUID(), s.id(), "A",
                new GeoPoint(51.6978, 5.3037), false, "t1", null, false, null, TravelMode.CAR);
        Participant nudged = new Participant(UUID.randomUUID(), s.id(), "B",
                new GeoPoint(51.7019, 5.2962), false, "t2", null, false, null, TravelMode.CAR);

        Map<UUID, Integer> minutes = assembler.toView(new SessionQueries.SessionSnapshot(
                s, List.of(exact, nudged), List.of(v), Map.of(), Map.of(), Map.of()), null)
                .venues().get(0).travelMinutes();
        assertThat(minutes.get(exact.id())).isEqualTo(minutes.get(nudged.id()));
    }

    /**
     * Orta nokta dakikasi: Lobi/Bekle kartinin "herkes ~25–35 dk" araligi bu degerlerin
     * min/max'idir. Ayni boylamda iki kisi, e-bisiklet vs araba → agirlikli orta nokta esit
     * sure noktasidir, yani iki dakika da AYNI cikar (5 dk yuvarlamayla).
     */
    @Test
    void midpointMinutesAreEqualForTwoPeopleWithDifferentSpeeds() {
        Session s = session(SessionType.GROUP);
        Participant slow = new Participant(UUID.randomUUID(), s.id(), "E-bisiklet",
                new GeoPoint(51.30, 5.50), false, "t1", null, false, null, TravelMode.EBIKE);
        Participant fast = new Participant(UUID.randomUUID(), s.id(), "Araba",
                new GeoPoint(51.70, 5.50), false, "t2", null, false, null, TravelMode.CAR);

        List<ApiDtos.ParticipantDto> rows = assembler.toView(new SessionQueries.SessionSnapshot(
                s, List.of(slow, fast), List.of(), Map.of(), Map.of(), Map.of()), null)
                .participants();

        assertThat(rows.get(0).midpointMinutes()).isEqualTo(rows.get(1).midpointMinutes());
        assertThat(rows.get(0).midpointMinutes()).isNotNull();
        assertThat(rows.get(0).midpointMinutes() % 5).isZero();
    }

    @Test
    void midpointMinutesIsNullWithoutAMidpointOrWithoutALocation() {
        Session s = session(SessionType.GROUP);
        Participant lonely = person(s.id(), new GeoPoint(51.44, 5.47), "Eindhoven", false);
        Participant nowhere = new Participant(UUID.randomUUID(), s.id(), "K", null, false, "t",
                null, false, null);

        // Tek konumlu katilimci → orta nokta yok → dakika yok
        assertThat(assembler.toView(new SessionQueries.SessionSnapshot(
                s, List.of(lonely), List.of(), Map.of(), Map.of(), Map.of()), null)
                .participants().get(0).midpointMinutes()).isNull();

        // Iki konumlu + konumsuz bir kisi → konumsuzun dakikasi yok, digerlerininki var
        List<ApiDtos.ParticipantDto> rows = assembler.toView(new SessionQueries.SessionSnapshot(
                s, List.of(lonely, person(s.id(), new GeoPoint(51.69, 5.30), "Den Bosch", false),
                        nowhere), List.of(), Map.of(), Map.of(), Map.of()), null).participants();
        assertThat(rows.get(0).midpointMinutes()).isNotNull();
        assertThat(rows.get(2).midpointMinutes()).isNull();
    }
```

Sınıfa yardımcı ekle:

```java
    Venue venue(UUID sessionId, GeoPoint at) {
        return new Venue(UUID.randomUUID(), sessionId, "google", "g1", "Café", at, 4.6, 2,
                null, null, 0);
    }
```

(`import com.bumpinto.domain.geo.TravelMode; import com.bumpinto.domain.venue.Venue;` ekle.
`SessionSnapshot`'ın 6. argümanı `likeCounts` Task 2'de gelir — **bu görevde** 5 argümanlı çağrı
kullan ve Task 2'de hepsine `Map.of()` ekle. Yukarıdaki 6 argümanlı kullanım Task 2 sonrası hâlidir;
Task 1c'de son `Map.of()`'u yazma.)

`DeckFlowTest`'te mevcut iki testi **değiştir**:

```java
    @Test
    void findVenuesOrdersDeckByFairnessNotRating() {
        // host Den Bosch (51.6978, 5.3037), ayse Someren (51.3855, 5.7120) — ikisi de CAR.
        // "adil" ikisinin ortasinda, "uzak" Den Bosch'un kuzeyinde; puanlar TERS verildi.
        providerResult.addAll(List.of(
                candAt(0, 3.0, new GeoPoint(51.54, 5.51)),   // adil, dusuk puan
                candAt(1, 4.9, new GeoPoint(51.95, 5.30)),   // uzak, yuksek puan
                candAt(2, 4.5, new GeoPoint(51.52, 5.49)),
                candAt(3, 4.4, new GeoPoint(51.55, 5.53)),
                candAt(4, 4.3, new GeoPoint(51.53, 5.52)),
                candAt(5, 4.2, new GeoPoint(51.56, 5.50))));
        flow.findVenues("s1", hostUser);

        List<Venue> deckOrder = deck.venuesOf(session.id());
        assertThat(deckOrder.get(deckOrder.size() - 1).externalId()).isEqualTo("x1"); // uzak sonda
        assertThat(deckOrder.stream().map(Venue::deckOrder).toList())
                .containsExactly(0, 1, 2, 3, 4, 5);
    }

    @Test
    void shuffleKeepsFairnessOrderForEveryoneAndPublishesDeckReady() {
        providerResult.addAll(IntStream.range(0, 8).mapToObj(i -> cand(i, 3.0 + i * 0.2)).toList());
        flow.findVenues("s1", hostUser);
        List<UUID> browsingOrder = deck.venuesOf(session.id()).stream().map(Venue::id).toList();

        flow.shuffle("s1", hostUser);

        Session s = store.sessionBySlug("s1").orElseThrow();
        assertThat(s.status()).isEqualTo(SessionStatus.SWIPING);
        // Sira ADALET tarafindan belirlenir; shuffle onu yeniden uygular (konumlar degismis
        // olabilir) — herkes ayni sirayi gorur, tekrar cagirmak sirayi degistirmez.
        assertThat(deck.venuesOf(s.id()).stream().map(Venue::id).toList())
                .isEqualTo(browsingOrder);
        assertThat(deck.venuesOf(s.id()).stream().map(Venue::deckOrder).toList())
                .containsExactly(0, 1, 2, 3, 4, 5, 6, 7);
        assertThat(events.published).extracting(p -> p.event().type())
                .containsExactly("venues_ready", "deck_ready");
    }
```

`DeckFlowTest`'e yardımcı ekle (mevcut `cand(i, rating)` aynen kalır):

```java
    static VenueCandidate candAt(int i, double rating, GeoPoint at) {
        return new VenueCandidate("foursquare", "x" + i, "Mekan " + i, at, rating, 2, null,
                "https://maps/" + i);
    }
```

- [ ] **Step 2: FAIL doğrula** — Run: `MVN test -Dtest='DeckOrderingTest,SessionViewAssemblerTest,DeckFlowTest'`
Expected: derleme hatası (`Fairness`, `DeckOrdering`, `FairnessDto` yok).

- [ ] **Step 3: `TravelMinutes`** — dakikanın **tek** kaynağı

```java
package com.bumpinto.domain.geo;

/**
 * Katilimci → mekan dakikasi. Spec §4.4 + §4.5b: dakika HER ZAMAN yuvarlanmis konumdan
 * (viewer dahil, tek kod yolu) ve kisinin ulasim moduyla hesaplanir, sonra 5 dk basamagina
 * yuvarlanir. Chips, adalet rozeti ve deste sirasi ayni sayiyi kullanir.
 */
public final class TravelMinutes {

    /** Spec §4.3: "~" onekiyle gosterilen yalanci hassasiyetsiz basamak. */
    public static final int STEP = 5;

    private TravelMinutes() {
    }

    public static int between(GeoPoint from, TravelMode mode, GeoPoint to) {
        int raw = TravelEstimate.fromCrowKm(GeoMath.distanceKm(approx(from), to), mode).minutes();
        int rounded = Math.round(raw / (float) STEP) * STEP;
        // "~0 dk" diye bir sey yok: konum zaten ~1 km yuvarlanmis, en kucuk basamak bir adimdir.
        return Math.max(STEP, rounded);
    }

    /** 2 ondalik = ~1.1 km enlem hassasiyeti (spec §8 gizlilik kutusu). */
    public static GeoPoint approx(GeoPoint p) {
        return new GeoPoint(Math.round(p.lat() * 100) / 100.0, Math.round(p.lng() * 100) / 100.0);
    }
}
```

- [ ] **Step 4: `Fairness`**

```java
package com.bumpinto.domain.geo;

import java.util.Map;
import java.util.UUID;

/**
 * Bir mekanin adalet olcusu (spec §4.1): birincil **en uzun yol** (minimax — en magduru en az
 * magdur eden), ikincil **fark** (max − min). Ekranda yazilan sayi farktir; sira ve rozet
 * ikisini birden kullanir. Toplam yol BILEREK yok: yuku tek kisiye yigar.
 *
 * @param longestParticipantId en uzun yolu olan kisi ("{{ad}} icin uzak" rozeti); esitlikte
 *                             haritanin ilk anahtari — cagiran LinkedHashMap verirse sonuc
 *                             deterministiktir.
 */
public record Fairness(int maxMinutes, int spreadMinutes, UUID longestParticipantId) {

    public static Fairness of(Map<UUID, Integer> minutesByParticipant) {
        if (minutesByParticipant == null || minutesByParticipant.isEmpty()) {
            return new Fairness(0, 0, null);
        }
        int max = Integer.MIN_VALUE;
        int min = Integer.MAX_VALUE;
        UUID longest = null;
        for (Map.Entry<UUID, Integer> e : minutesByParticipant.entrySet()) {
            if (e.getValue() > max) {
                max = e.getValue();
                longest = e.getKey();
            }
            if (e.getValue() < min) {
                min = e.getValue();
            }
        }
        return new Fairness(max, max - min, longest);
    }
}
```

- [ ] **Step 5: `DeckOrdering`**

```java
package com.bumpinto.domain.deck;

import com.bumpinto.domain.geo.Fairness;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Random;
import java.util.function.Function;

/**
 * Deste ve liste sirasi (spec §4.5, kullanici karari 2026-09-03): birincil **en uzun yol**
 * artan, ikincil **fark** artan, esitlerde oturum tohumlu karisik — herkes AYNI sirayi gorur.
 *
 * <p>Neden "bant" yerine tam esitlik: dakikalar {@code TravelMinutes.STEP} = 5 dk basamagina
 * zaten yuvarlanmis geliyor, yani bir "5 dk bandi" tek bir yuvarlanmis degerdir. Bandi
 * maxMinutes ile tanimlayip icini tumden karistirsaydik ikincil anahtar (fark) yok olurdu;
 * bu yuzden karistirma yalniz (maxMinutes, spreadMinutes) ciftinde esit — yani gercekten
 * ayirt edilemez — mekanlar arasinda yapilir.
 */
public final class DeckOrdering {

    private DeckOrdering() {
    }

    public static <T> List<T> fairnessFirst(List<T> items, Function<T, Fairness> fairnessOf,
                                            long seed) {
        List<T> sorted = new ArrayList<>(items);
        sorted.sort(Comparator
                .comparingInt((T t) -> fairnessOf.apply(t).maxMinutes())
                .thenComparingInt(t -> fairnessOf.apply(t).spreadMinutes()));
        Random random = new Random(seed);
        List<T> out = new ArrayList<>(sorted.size());
        int i = 0;
        while (i < sorted.size()) {
            Fairness head = fairnessOf.apply(sorted.get(i));
            int j = i + 1;
            while (j < sorted.size() && sameGroup(head, fairnessOf.apply(sorted.get(j)))) {
                j++;
            }
            List<T> group = new ArrayList<>(sorted.subList(i, j));
            Collections.shuffle(group, random);
            out.addAll(group);
            i = j;
        }
        return List.copyOf(out);
    }

    private static boolean sameGroup(Fairness a, Fairness b) {
        return a.maxMinutes() == b.maxMinutes() && a.spreadMinutes() == b.spreadMinutes();
    }
}
```

- [ ] **Step 6: DTO'lar** — `ApiDtos`:

```java
    /**
     * Mekanin adalet ozeti (spec §4.1–4.2). {@code spreadMinutes} ekranda yazilan sayidir
     * ("fark N dk"); rozet kurali: fark <= 10 → "Herkese ~aynı".
     */
    public record FairnessDto(int maxMinutes, int spreadMinutes, UUID longestParticipantId) {
    }

    public record VenueDto(UUID id, String name, double lat, double lng, Double rating,
                           Integer priceLevel, String photoUrl, String mapsUrl, int deckOrder,
                           Map<UUID, Integer> travelMinutes, FairnessDto fairness) {
    }

    /**
     * midpointMinutes: kisinin YUVARLANMIS konumundan agirlikli orta noktaya, kendi
     * {@code travelMode}'uyla, 5 dk basamaginda. Konumu yoksa ya da konumlu katilimci
     * 2'den azsa (orta nokta yok) null. Lobi/Bekle orta nokta karti "herkes ~25–35 dk"
     * araligini bu degerlerin min/max'indan yazar (spec §5.C).
     */
    public record ParticipantDto(UUID id, String displayName, boolean host, boolean hasLocation,
                                 boolean deckDone, boolean manual, String locationLabel,
                                 GeoPointDto approxLocation, TravelMode travelMode,
                                 Integer midpointMinutes) {
    }
```

(Task 4a `VenueDto`'ya sağlayıcı alanlarını ekleyecek — şimdilik bu şekil. `PointsController.add`
yanıtındaki `ParticipantDto` kurulumuna son argüman `null` eklenir: elle nokta eklenirken orta
nokta henüz hesaplanmamıştır.)

- [ ] **Step 7: Assembler** — dakikalar tek kod yolundan, adalet her mekana

`toView` gövdesinin **sırası değişir**: orta nokta artık katılımcı DTO'larından ÖNCE hesaplanır,
çünkü `midpointMinutes` ona bağlıdır.

```java
    public ApiDtos.SessionView toView(SessionQueries.SessionSnapshot snap, Authentication auth) {
        List<Participant> located = snap.participants().stream()
                .filter(Participant::hasLocation).toList();

        // Orta nokta ONCE: katilimci satirlarindaki midpointMinutes buna dayanir.
        ApiDtos.GeoPointDto midpoint = null;
        Double radiusKm = null;
        GeoPoint center = null;
        if (located.size() >= 2) {
            List<GeoPoint> points = located.stream().map(Participant::location).toList();
            // Hiza TERS agirlik (spec §4.5b): yavas gelen orta noktayi kendine ceker.
            List<Double> weights = located.stream().map(p -> p.travelMode().weight()).toList();
            center = GeoMath.centroid(points, weights);
            midpoint = approx(center);
            radiusKm = Math.round(SearchRadius.baseKm(points, center) * 10) / 10.0;
        }
        GeoPoint midpointFor = center;

        List<ApiDtos.ParticipantDto> participants = snap.participants().stream()
                .map(p -> new ApiDtos.ParticipantDto(p.id(), p.displayName(), p.host(),
                        p.hasLocation(), p.deckDone(), p.manual(), p.locationLabel(),
                        p.hasLocation() ? approx(p.location()) : null, p.travelMode(),
                        // Orta nokta yoksa ya da kisinin konumu yoksa satir cizilmez → null.
                        midpointFor == null || !p.hasLocation() ? null
                                : TravelMinutes.between(p.location(), p.travelMode(), midpointFor)))
                .toList();
```

```java
        List<ApiDtos.VenueDto> venues = snap.venues().stream().map(v -> {
            // Konumu olan HERKES (viewer ve elle konumlar dahil): 3. kisi asla dusmez (§4.3),
            // dakika yuvarlanmis konumdan gelir (§4.4).
            Map<UUID, Integer> travel = new LinkedHashMap<>();
            located.forEach(p -> travel.put(p.id(),
                    TravelMinutes.between(p.location(), p.travelMode(), v.location())));
            Fairness fairness = Fairness.of(travel);
            return new ApiDtos.VenueDto(v.id(), v.name(), v.location().lat(), v.location().lng(),
                    v.rating(), v.priceLevel(), v.photoUrl(), v.mapsUrl(), v.deckOrder(), travel,
                    new ApiDtos.FairnessDto(fairness.maxMinutes(), fairness.spreadMinutes(),
                            fairness.longestParticipantId()));
        }).toList();
```

Metodun **eski** `List<ApiDtos.ParticipantDto> participants = …`, `List<Participant> located = …`
ve `if (located.size() >= 2) { … }` blokları **silinir** — yukarıdaki yeni sıra onların yerine
geçer. `approx` tek kaynaktan gelir:

```java
    /** 2 ondalik = ~1.1 km enlem hassasiyeti (tek kaynak: TravelMinutes.approx). */
    static ApiDtos.GeoPointDto approx(GeoPoint p) {
        GeoPoint rounded = TravelMinutes.approx(p);
        return new ApiDtos.GeoPointDto(rounded.lat(), rounded.lng());
    }
```

(`import com.bumpinto.domain.geo.Fairness; import com.bumpinto.domain.geo.TravelMinutes;` ekle;
`TravelEstimate` importu artık gereksizse kaldır.)

- [ ] **Step 8: `DeckFlow` adalet sırası** — orta nokta ağırlıklı, deste sırası adalet öncelikli

`findVenues` içinde merkez hesabı:

```java
        List<Participant> located = geometryPopulation(session.id());
        if (located.size() < 2) {
            throw new ConflictException("need at least 2 participants with location");
        }
        List<GeoPoint> points = located.stream().map(Participant::location).toList();
        GeoPoint center = GeoMath.centroid(points,
                located.stream().map(p -> p.travelMode().weight()).toList());
        double baseKm = SearchRadius.baseKm(points, center);
```

Aday sıralaması — puan hâlâ **hangi** 20 mekanın deste'ye gireceğini seçer, **sıra** adalet olur:

```java
        Map<String, VenueCandidate> unique = new LinkedHashMap<>();
        found.forEach(c -> unique.putIfAbsent(c.externalId(), c));
        // Puan = kalite kapisi (hangi DECK_MAX mekan destede olacak).
        List<VenueCandidate> shortlist = unique.values().stream()
                .sorted(Comparator.comparing(VenueCandidate::rating,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(DECK_MAX)
                .toList();
        // Sira = adalet (spec §4.5): en uzun yol → fark → esitlerde oturum tohumlu karisik.
        List<VenueCandidate> ordered = DeckOrdering.fairnessFirst(shortlist,
                c -> fairnessOf(located, c.location()), session.id().hashCode());
```

`shuffle` gövdesi (rastgelelik yerine adaletin yeniden uygulanması):

```java
    /**
     * Grup: host "Karistir ve kaydir" der; deste herkes icin AYNI ADALET sirasina girer
     * (spec §4.5, kullanici karari 2026-09-03 — eski "tumden rastgele" kurali dustu).
     * Yeniden uygulanmasinin sebebi BROWSING sirasinda konum/ulasim modu degismis olabilmesi;
     * degismemisse sira aynen kalir (idempotent).
     *
     * <p>UI fiili DEGISMEDI: dugme hala "Karistir ve kaydir" der ve ucun adi hala
     * {@code POST /{slug}/shuffle}'dir — degisen yalnizca siranin nereden geldigidir.
     * Yeniden adlandirma W-6 kapsamina girmez.
     */
    @Transactional
    public void shuffle(String slug, UUID hostUserId) {
        Session session = required(slug);
        requireHost(session, hostUserId);
        if (session.status() != SessionStatus.BROWSING) {
            throw new ConflictException("expected BROWSING but was " + session.status());
        }
        if (session.isSolo()) {
            throw new ConflictException("solo session has no deck");
        }
        List<Participant> located = geometryPopulation(session.id());
        List<UUID> ids = DeckOrdering.fairnessFirst(deck.venuesOf(session.id()),
                        v -> fairnessOf(located, v.location()), session.id().hashCode())
                .stream().map(Venue::id).toList();
        deck.reorderVenues(session.id(), ids);
        store.saveSession(session.withStatus(SessionStatus.SWIPING));
        events.publish(slug, SessionEvent.deckReady(ids.size()));
    }
```

Ortak yardımcı (`votingPopulation`'ın altına):

```java
    /** Mekan basina adalet: assembler ile AYNI dakika kodunu kullanir (tek kaynak). */
    private static Fairness fairnessOf(List<Participant> located, GeoPoint venue) {
        Map<UUID, Integer> minutes = new LinkedHashMap<>();
        located.forEach(p -> minutes.put(p.id(),
                TravelMinutes.between(p.location(), p.travelMode(), venue)));
        return Fairness.of(minutes);
    }
```

(`import com.bumpinto.domain.deck.DeckOrdering; import com.bumpinto.domain.geo.Fairness;
import com.bumpinto.domain.geo.TravelMinutes;` ekle; artık kullanılmayan
`import java.util.Collections; import java.util.Random;` **kaldır**.)

- [ ] **Step 9: PASS doğrula** — Run: `MVN test`
Expected: `Failures: 0, Errors: 0`. `ApiHappyPathTest`'te shuffle sonrası mekan sırası değiştiği
için `favoriteId` seçimi hâlâ `venues[0]`'dan okunur — kırılırsa mekanı **id ile** değil sıradaki
ilk eleman olarak almaya devam et, beklenen sabit bir isim varsa güncelle.

- [ ] **Step 10: Bruno** — `sessions/get-session.yml` `docs:` bloğuna ekle:

```
`venues[].travelMinutes`: katilimci id -> ~dakika (5 dk basamagi, yuvarlanmis konumdan,
kisinin `travelMode`'una gore). KONUMU OLAN HERKES icindir — istegi yapan dahil.
`venues[].fairness`: `{ maxMinutes, spreadMinutes, longestParticipantId }` (spec §4.1).
`participants[].midpointMinutes`: kisinin yuvarlanmis konumundan agirlikli ORTA NOKTAYA,
kendi `travelMode`'uyla, 5 dk basaminda; konumu yoksa ya da konumlu katilimci 2'den azsa null.
Lobi/Bekle karti "herkes ~min–max dk" araligini bu alandan yazar.
**Alan adlari W-6 ile sozlesme:** katilimci/oturum uclarinda `travelMode`
(`POST /participants`, `PUT /location`, `POST /sessions`), profil ucunda `defaultTravelMode`
(`GET`/`PUT /api/me`). Baska bir ad kullanilmaz.
`venues[]` sirasi (`deckOrder`) ADALET onceliklidir: en uzun yol artan → fark artan →
esitlerde oturum tohumlu sabit karisim. Herkes ayni sirayi gorur.
```

`sessions/shuffle.yml` `docs:` bloğunda "herkes icin ayni rastgele sira" cümlesini şununla değiştir:
"deckOrder adalet sirasina yeniden yazilir (idempotent); konum/ulasim modu degistiyse sira tazelenir."

- [ ] **Step 11: INDEX güncelle + Commit önerisi (kullanıcı)**

```
feat(deck): adalet cekirdegi (TravelMinutes, Fairness, DeckOrdering) ve adalet oncelikli deste

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

---

### Task 2a: Karar türü ve runoff nedeni — domain + karar motoru (TDD)

**Files:**
- Create: `backend/src/main/java/com/bumpinto/domain/session/DecisionKind.java`
- Create: `backend/src/main/java/com/bumpinto/domain/session/RunoffReason.java`
- Modify: `backend/src/main/java/com/bumpinto/domain/session/Session.java`
- Modify: `backend/src/main/java/com/bumpinto/domain/deck/DeckOutcome.java`
- Modify: `backend/src/main/java/com/bumpinto/domain/deck/DecisionEngine.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/SessionEntity.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/SessionStoreAdapter.java`
- Modify: `backend/src/test/java/com/bumpinto/domain/deck/DecisionEngineTest.java`
- Modify: `backend/src/test/java/com/bumpinto/adapter/out/persistence/StoreAdapterTest.java`

- [ ] **Step 1: Failing tests** — `DecisionEngineTest`'te mevcut beklentileri güncelle ve ekle:

```java
    @Test
    void singleCommonVenueIsDecidedWithoutRunoff() {
        DeckOutcome out = engine.decide(List.of(
                done(Set.of(V1, V2)),
                done(Set.of(V1, V3)),
                done(Set.of(V1))), RATINGS);
        assertThat(out).isEqualTo(new DeckOutcome.Decided(V1, DecisionKind.UNANIMOUS));
    }

    @Test
    void intersectionRunoffCarriesItsReasonAndCapsFinalistsAtFour() {
        UUID v5 = UUID.fromString("00000000-0000-0000-0000-000000000005");
        Map<UUID, Double> ratings = Map.of(V1, 4.0, V2, 4.5, V3, 4.9, V4, 3.0, v5, 4.8);
        Set<UUID> all = Set.of(V1, V2, V3, V4, v5);
        DeckOutcome out = engine.decide(List.of(done(all), done(all)), ratings);

        assertThat(out).isInstanceOf(DeckOutcome.Runoff.class);
        DeckOutcome.Runoff runoff = (DeckOutcome.Runoff) out;
        assertThat(runoff.reason()).isEqualTo(RunoffReason.INTERSECTION);
        // Tavan 4 (spec §4 notu); esitlik PUANLA kirilir → en dusuk puanli V4 (3.0) elenir.
        assertThat(runoff.venueIds()).hasSize(4).doesNotContain(V4);
        assertThat(runoff.venueIds().get(0)).isEqualTo(V3); // 4.9 en yuksek
    }

    @Test
    void fallbackRunoffCarriesFallbackReason() {
        DeckOutcome out = engine.decide(List.of(
                done(Set.of(V1)),
                done(Set.of(V2))), RATINGS);
        assertThat(out).isInstanceOf(DeckOutcome.Runoff.class);
        assertThat(((DeckOutcome.Runoff) out).reason()).isEqualTo(RunoffReason.FALLBACK);
    }

    @Test
    void singleLikedVenueOutsideIntersectionIsSingleLike() {
        DeckOutcome out = engine.decide(List.of(
                done(Set.of(V1)),
                done(Set.of())), RATINGS);
        assertThat(out).isEqualTo(new DeckOutcome.Decided(V1, DecisionKind.SINGLE_LIKE));
    }
```

Diğer mevcut testlerdeki `new DeckOutcome.Decided(X)` beklentilerini `new DeckOutcome.Decided(X,
DecisionKind.UNANIMOUS)` ya da `SINGLE_LIKE` ile güncelle (kesişimden geliyorsa UNANIMOUS, tek
beğeniden geliyorsa SINGLE_LIKE); `new DeckOutcome.Runoff(List.of(...))` beklentilerini
`venueIds()` + `reason()` üzerinden iki ayrı assert'e çevir.

`StoreAdapterTest`'e ekle:

```java
    @Test
    void decisionMetadataRoundTrips() {
        Session s = store.saveSession(new Session(UUID.randomUUID(), "meta", hostUserId, "Cuma",
                ActivityType.COFFEE, SessionType.GROUP, SessionStatus.COLLECTING,
                Instant.parse("2026-09-04T10:00:00Z"), null, List.of()));
        UUID venueId = seedVenue(s.id());
        Instant when = Instant.parse("2026-09-03T18:20:00Z");
        store.saveSession(s.withMidpointLabel("Eindhoven")
                .decided(venueId, DecisionKind.RUNOFF, when));

        Session back = store.sessionBySlug("meta").orElseThrow();
        assertThat(back.decidedAt()).isEqualTo(when);
        assertThat(back.decisionKind()).isEqualTo(DecisionKind.RUNOFF);
        assertThat(back.midpointLabel()).isEqualTo("Eindhoven");
        assertThat(back.runoffReason()).isNull();

        store.saveSession(back.inRunoff(List.of(venueId), RunoffReason.FALLBACK));
        assertThat(store.sessionBySlug("meta").orElseThrow().runoffReason())
                .isEqualTo(RunoffReason.FALLBACK);
    }
```

(`seedVenue(sessionId)` sınıfta yoksa mevcut `seedSessionWithVenues` yardımcısını kullan ya da
`deck.saveVenues(List.of(new Venue(...)))` ile tek mekan kaydet.)

- [ ] **Step 2: FAIL doğrula** — Run: `MVN test -Dtest='DecisionEngineTest,StoreAdapterTest'`
Expected: derleme hatası.

- [ ] **Step 3: Enum'lar**

```java
package com.bumpinto.domain.session;

/**
 * Kararin NASIL cikttigi (spec §5.A.2) — Karar ekraninin eyebrow'u buradan yazilir.
 *
 * <p>UNANIMOUS: herkesin begeni kesisiminde TEK mekan kaldi ("HEPINIZ AYNI YERI BEGENDI").
 * SINGLE_LIKE: kesisim bostu, toplamda yalniz bir mekan begenilmisti.
 * RUNOFF: finalistler arasinda oylama bir kazanan cikardi.
 * FORCED: host bir mekani dogrudan sectib (BROWSING "Bunu sec" ya da runoff beraberligini bozma).
 * PARTIAL: host "{{adlar}} olmadan devam et" dedi; deste bitmeyenler sayilmadan degerlendirildi.
 */
public enum DecisionKind { UNANIMOUS, SINGLE_LIKE, RUNOFF, FORCED, PARTIAL }
```

```java
package com.bumpinto.domain.session;

/**
 * Runoff'a NEDEN dusuldugu (spec §5.A.2). INTERSECTION: herkesin begendigi birden cok mekan var
 * (guzel sorun). FALLBACK: ortak nokta YOK, en cok begenilenler finale kaldi — Runoff kopyasi
 * bu iki durumda farkli yazilir ("Henuz ortak nokta yok — …").
 */
public enum RunoffReason { INTERSECTION, FALLBACK }
```

- [ ] **Step 4: `Session`** — dört yeni alan + eski 10 argümanlı imza kolaylık kurucusu

```java
package com.bumpinto.domain.session;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record Session(UUID id, String slug, UUID hostId, String name, ActivityType activityType,
                      SessionType sessionType, SessionStatus status, Instant expiresAt,
                      UUID decidedVenueId, List<UUID> runoffVenueIds,
                      /** Karar ani; DECIDED disinda null. */
                      Instant decidedAt, DecisionKind decisionKind, RunoffReason runoffReason,
                      /** Orta noktanin kasaba kelimesi; find-venues'te bir kez yazilir. */
                      String midpointLabel) {

    /** Eski imza: karar meta'si ve orta nokta etiketi henuz yok. */
    public Session(UUID id, String slug, UUID hostId, String name, ActivityType activityType,
                   SessionType sessionType, SessionStatus status, Instant expiresAt,
                   UUID decidedVenueId, List<UUID> runoffVenueIds) {
        this(id, slug, hostId, name, activityType, sessionType, status, expiresAt, decidedVenueId,
                runoffVenueIds, null, null, null, null);
    }

    public boolean isExpired(Instant now) {
        return now.isAfter(expiresAt);
    }

    public boolean isSolo() {
        return sessionType == SessionType.SOLO;
    }

    public Session withStatus(SessionStatus newStatus) {
        return new Session(id, slug, hostId, name, activityType, sessionType, newStatus, expiresAt,
                decidedVenueId, runoffVenueIds, decidedAt, decisionKind, runoffReason, midpointLabel);
    }

    public Session withMidpointLabel(String label) {
        return new Session(id, slug, hostId, name, activityType, sessionType, status, expiresAt,
                decidedVenueId, runoffVenueIds, decidedAt, decisionKind, runoffReason, label);
    }

    /** runoffReason KORUNUR: "runoff'tan cikan karar" izini karar sonrasi da anlatir. */
    public Session decided(UUID venueId, DecisionKind kind, Instant when) {
        return new Session(id, slug, hostId, name, activityType, sessionType, SessionStatus.DECIDED,
                expiresAt, venueId, runoffVenueIds, when, kind, runoffReason, midpointLabel);
    }

    public Session inRunoff(List<UUID> venueIds, RunoffReason reason) {
        return new Session(id, slug, hostId, name, activityType, sessionType, SessionStatus.RUNOFF,
                expiresAt, null, List.copyOf(venueIds), null, null, reason, midpointLabel);
    }
}
```

- [ ] **Step 5: `DeckOutcome` + `DecisionEngine`**

```java
package com.bumpinto.domain.deck;

import com.bumpinto.domain.session.DecisionKind;
import com.bumpinto.domain.session.RunoffReason;

import java.util.List;
import java.util.UUID;

public sealed interface DeckOutcome {

    /** kind: UNANIMOUS (kesisimde tek mekan) ya da SINGLE_LIKE (toplamda tek begeni). */
    record Decided(UUID venueId, DecisionKind kind) implements DeckOutcome {
    }

    record Runoff(List<UUID> venueIds, RunoffReason reason) implements DeckOutcome {
    }

    record NoLikes() implements DeckOutcome {
    }
}
```

`DecisionEngine` — sıralama ve **beraberlik kuralı DEĞİŞMEDİ** (beğeni sayısı → puan → id);
tek yenilik finalist tavanı ve neden/tür etiketleri:

```java
public final class DecisionEngine {

    public static final int FALLBACK_RUNOFF_SIZE = 3;
    /**
     * Kesisim runoff'unda finalist tavani (spec §4 notu): herkesin begendigi 9 mekan varsa
     * 9 kartlik bir oylama ekrani karar degil ikinci bir deste olurdu. Elemenin olcusu
     * DEGISMEDI: begeni sayisi → PUAN → id.
     */
    public static final int INTERSECTION_RUNOFF_MAX = 4;

    public DeckOutcome decide(List<ParticipantLikes> participants, Map<UUID, Double> venueRatings) {
        List<ParticipantLikes> finishers = participants.stream()
                .filter(ParticipantLikes::deckDone)
                .toList();
        if (finishers.isEmpty()) {
            throw new IllegalArgumentException("at least one participant must have finished the deck");
        }

        Map<UUID, Long> likeCounts = finishers.stream()
                .flatMap(p -> p.likedVenueIds().stream())
                .collect(Collectors.groupingBy(v -> v, Collectors.counting()));

        Set<UUID> intersection = new HashSet<>(finishers.get(0).likedVenueIds());
        for (ParticipantLikes p : finishers) {
            intersection.retainAll(p.likedVenueIds());
        }

        Comparator<UUID> byLikesThenRating = Comparator
                .comparingLong((UUID v) -> likeCounts.getOrDefault(v, 0L)).reversed()
                .thenComparing(Comparator.comparingDouble(
                        (UUID v) -> venueRatings.getOrDefault(v, 0.0)).reversed())
                .thenComparing(UUID::compareTo);

        if (intersection.size() == 1) {
            return new DeckOutcome.Decided(intersection.iterator().next(), DecisionKind.UNANIMOUS);
        }
        if (intersection.size() >= 2) {
            return new DeckOutcome.Runoff(intersection.stream()
                    .sorted(byLikesThenRating)
                    .limit(INTERSECTION_RUNOFF_MAX)
                    .toList(), RunoffReason.INTERSECTION);
        }

        List<UUID> top = likeCounts.keySet().stream()
                .sorted(byLikesThenRating)
                .limit(FALLBACK_RUNOFF_SIZE)
                .toList();
        if (top.isEmpty()) {
            return new DeckOutcome.NoLikes();
        }
        if (top.size() == 1) {
            return new DeckOutcome.Decided(top.get(0), DecisionKind.SINGLE_LIKE);
        }
        return new DeckOutcome.Runoff(top, RunoffReason.FALLBACK);
    }
}
```

(`import com.bumpinto.domain.session.DecisionKind;
import com.bumpinto.domain.session.RunoffReason;` ekle.)

- [ ] **Step 6: Persistence** — `SessionEntity`'ye ekle:

```java
    Instant decidedAt;
    String decisionKind;
    String runoffReason;
    String midpointLabel;
```

`SessionStoreAdapter.saveSession` içine:

```java
        e.decidedAt = s.decidedAt();
        e.decisionKind = s.decisionKind() == null ? null : s.decisionKind().name();
        e.runoffReason = s.runoffReason() == null ? null : s.runoffReason().name();
        e.midpointLabel = s.midpointLabel();
```

`toSession`:

```java
        return new Session(e.id, e.slug, e.hostId, e.name, ActivityType.valueOf(e.activityType),
                SessionType.valueOf(e.sessionType), SessionStatus.valueOf(e.status), e.expiresAt,
                e.decidedVenueId, runoff, e.decidedAt,
                e.decisionKind == null ? null : DecisionKind.valueOf(e.decisionKind),
                e.runoffReason == null ? null : RunoffReason.valueOf(e.runoffReason),
                e.midpointLabel);
```

(`import com.bumpinto.domain.session.DecisionKind; import com.bumpinto.domain.session.RunoffReason;`
ekle.)

- [ ] **Step 7: PASS doğrula** — Run: `MVN test -Dtest='DecisionEngineTest,StoreAdapterTest'` →
`Failures: 0, Errors: 0`. Ardından `MVN test` — `DeckFlow`'daki `decided(...)`/`inRunoff(...)`
çağrıları derlenmiyorsa **Task 2b'de** düzeltilecek; bu adımda yalnızca o iki satırı geçici olarak
`DecisionKind.FORCED` / `RunoffReason.FALLBACK` ile derlenir hâle **getirme** — doğrudan 2b'ye geç.

- [ ] **Step 8: INDEX güncelle + Commit önerisi (kullanıcı)**

```
feat(deck): DecisionKind/RunoffReason, kesisim runoff finalist tavani 4, Session karar meta alanlari

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

---

### Task 2b: Karar meta'sının yazılması + oy gizliliği + `likeCounts` (TDD)

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/application/deck/DeckFlow.java`
- Modify: `backend/src/main/java/com/bumpinto/application/session/SessionQueries.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/ApiDtos.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/SessionViewAssembler.java`
- Modify: `backend/src/test/java/com/bumpinto/application/deck/DeckFlowTest.java`
- Modify: `backend/src/test/java/com/bumpinto/application/session/SessionQueriesTest.java`
- Modify: `backend/src/test/java/com/bumpinto/adapter/in/web/SessionViewAssemblerTest.java`
- Modify: `backend/src/test/java/com/bumpinto/ApiHappyPathTest.java`

- [ ] **Step 1: Failing tests** — `DeckFlowTest`'e ekle:

```java
    @Test
    void unanimousDecisionRecordsKindAndTimestamp() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        flow.findVenues("s1", hostUser);
        flow.shuffle("s1", hostUser);
        UUID fav = deck.venuesOf(session.id()).get(0).id();
        for (Participant p : List.of(host, ayse)) {
            flow.swipe("s1", p.id(), fav, true);
            flow.finishDeck("s1", p.id());
        }
        Session s = store.sessionBySlug("s1").orElseThrow();
        assertThat(s.status()).isEqualTo(SessionStatus.DECIDED);
        assertThat(s.decisionKind()).isEqualTo(DecisionKind.UNANIMOUS);
        assertThat(s.decidedAt()).isEqualTo(clock.instant());
    }

    @Test
    void runoffRecordsItsReasonAndTheWinningVoteIsKindRunoff() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1), cand(2, 4.0)));
        flow.findVenues("s1", hostUser);
        flow.shuffle("s1", hostUser);
        List<Venue> venues = deck.venuesOf(session.id());
        // Ortak nokta yok → FALLBACK runoff
        flow.swipe("s1", host.id(), venues.get(0).id(), true);
        flow.swipe("s1", ayse.id(), venues.get(1).id(), true);
        flow.finishDeck("s1", host.id());
        flow.finishDeck("s1", ayse.id());

        Session inRunoff = store.sessionBySlug("s1").orElseThrow();
        assertThat(inRunoff.status()).isEqualTo(SessionStatus.RUNOFF);
        assertThat(inRunoff.runoffReason()).isEqualTo(RunoffReason.FALLBACK);
        assertThat(inRunoff.decisionKind()).isNull();

        UUID finalist = inRunoff.runoffVenueIds().get(0);
        flow.runoffVote("s1", host.id(), finalist);
        flow.runoffVote("s1", ayse.id(), finalist);

        Session decided = store.sessionBySlug("s1").orElseThrow();
        assertThat(decided.decisionKind()).isEqualTo(DecisionKind.RUNOFF);
        assertThat(decided.runoffReason()).isEqualTo(RunoffReason.FALLBACK); // iz korunur
        assertThat(decided.decidedAt()).isEqualTo(clock.instant());
    }

    @Test
    void hostPickIsForcedAndPartialEvaluationIsPartial() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        List<Venue> venues = flow.findVenues("s1", hostUser);
        flow.forceDecision("s1", hostUser, venues.get(0).id());
        assertThat(store.sessionBySlug("s1").orElseThrow().decisionKind())
                .isEqualTo(DecisionKind.FORCED);
    }

    @Test
    void forcedPartialEvaluationIsMarkedPartial() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        flow.findVenues("s1", hostUser);
        flow.shuffle("s1", hostUser);
        UUID fav = deck.venuesOf(session.id()).get(0).id();
        flow.swipe("s1", host.id(), fav, true);
        flow.finishDeck("s1", host.id());     // ayse bitirmedi
        flow.forceDecision("s1", hostUser, null);
        Session s = store.sessionBySlug("s1").orElseThrow();
        assertThat(s.status()).isEqualTo(SessionStatus.DECIDED);
        assertThat(s.decisionKind()).isEqualTo(DecisionKind.PARTIAL);
    }
```

`SessionQueriesTest`'e ekle:

```java
    @Test
    void voteTallyIsHiddenUntilEveryFinisherHasVoted() {
        // 2 bitiren, 1 oy → sayim GIZLI (bandwagon yok); "kim kilitledi" ayri alandan gorunur.
        seedRunoffWithTwoFinishers();
        deck.castVote(session.id(), finalistA, host.id());
        assertThat(queries.snapshot("s1").voteTally()).isEmpty();

        deck.castVote(session.id(), finalistA, ayse.id());
        assertThat(queries.snapshot("s1").voteTally()).isNotEmpty();
    }

    @Test
    void likeCountsAppearOnlyAfterDecision() {
        seedSwipingWithLikes();
        assertThat(queries.snapshot("s1").likeCounts()).isEmpty();
        store.saveSession(store.sessionBySlug("s1").orElseThrow()
                .decided(likedVenueId, DecisionKind.UNANIMOUS, Instant.parse("2026-09-03T18:00:00Z")));
        assertThat(queries.snapshot("s1").likeCounts()).containsEntry(likedVenueId, 2L);
    }
```

(`seedRunoffWithTwoFinishers` / `seedSwipingWithLikes` sınıfta yoksa mevcut kurgu bloklarını
kopyalayarak iki özel yardımcı yaz — `FakeStores` üzerinden oturum + iki katılımcı (`deckDoneAt`
dolu) + mekan + swipe/oy kaydı.)

`SessionViewAssemblerTest`'e ekle:

```java
    @Test
    void runoffResponseCarriesWhoLockedButNeverWhatOthersPicked() throws Exception {
        Session s = new Session(UUID.randomUUID(), "s1", UUID.randomUUID(), "Cuma",
                ActivityType.COFFEE, SessionType.GROUP, SessionStatus.RUNOFF,
                Instant.parse("2026-09-04T10:00:00Z"), null, List.of(V1),
                null, null, RunoffReason.INTERSECTION, "Eindhoven");
        Participant me = person(s.id(), new GeoPoint(51.44, 5.47), "Eindhoven", false);
        Participant other = person(s.id(), new GeoPoint(51.69, 5.30), "Den Bosch", false);

        ApiDtos.SessionView view = assembler.toView(new SessionQueries.SessionSnapshot(
                s, List.of(me, other), List.of(), Map.of(), Map.of(me.id(), V1, other.id(), V1),
                Map.of()), authFor(me));

        assertThat(view.runoffVotedParticipantIds()).containsExactlyInAnyOrder(me.id(), other.id());
        assertThat(view.viewer().runoffVoteVenueId()).isEqualTo(V1);
        assertThat(view.voteTally()).isEmpty();
        assertThat(view.runoffReason()).isEqualTo(RunoffReason.INTERSECTION);
        assertThat(view.midpointLabel()).isEqualTo("Eindhoven");
        // Regresyon kapisi: govdede baskasinin secimi HIC gecmez.
        String body = new ObjectMapper().writeValueAsString(view);
        assertThat(body).doesNotContain("runoffVotes");
    }
```

(`authFor(participant)` sınıfta zaten var olan `UsernamePasswordAuthenticationToken` +
`ParticipantPrincipal` kurgusudur; yoksa aynı kurguyu küçük bir yardımcıya çıkar. `V1` sabitini
sınıfa ekle. **Bu görevde tüm `SessionSnapshot` çağrılarına 6. argüman `Map.of()` (likeCounts)
eklenir.**)

- [ ] **Step 2: FAIL doğrula** — Run: `MVN test -Dtest='DeckFlowTest,SessionQueriesTest,SessionViewAssemblerTest'`
Expected: derleme hatası.

- [ ] **Step 3: `DeckFlow`** — karar türünü yazan tek yol

```java
    private void decide(Session session, UUID venueId, DecisionKind kind) {
        store.saveSession(session.decided(venueId, kind, clock.instant()));
        events.publish(session.slug(), SessionEvent.sessionDecided(venueId));
    }
```

`forceDecision` içinde seçim yolu → `decide(session, chosenVenueId, DecisionKind.FORCED);`

`runoffVote` içinde kazanan → `decide(session, winners.get(0), DecisionKind.RUNOFF);`

`evaluate`:

```java
        DeckOutcome outcome = engine.decide(participantLikes, ratings);
        switch (outcome) {
            // Host "onlarsiz devam et" dediyse karar turu PARTIAL'dir: motor ne derse desin
            // ekranda "{{adlar}} olmadan" yazar (spec §5.B.5).
            case DeckOutcome.Decided d ->
                    decide(session, d.venueId(), interactive ? DecisionKind.PARTIAL : d.kind());
            case DeckOutcome.Runoff r -> {
                store.saveSession(session.inRunoff(r.venueIds(), r.reason()));
                events.publish(session.slug(), SessionEvent.runoffStarted(r.venueIds().size()));
            }
            case DeckOutcome.NoLikes ignored -> {
                if (interactive) {
                    throw new ConflictException("no likes at all — try another category");
                }
                events.publish(session.slug(), new SessionEvent("no_likes", Map.of()));
            }
        }
```

(`import com.bumpinto.domain.session.DecisionKind;` ekle.)

- [ ] **Step 4: `SessionQueries`** — sayım kapısı + `likeCounts`

```java
    /**
     * {@code runoffVotes}: katilimci -> sectigi mekan; yalniz RUNOFF'ta dolu. ANAHTARLARI
     * herkese acilir ("kim kilitledi"), DEGERLERI yalniz kisinin KENDI secimini geri vermek
     * icin kullanilir — API govdesine baskasinin secimi girmez (assembler'da kapali).
     */
    public record SessionSnapshot(Session session, List<Participant> participants,
                                  List<Venue> venues, Map<UUID, Long> voteTally,
                                  Map<UUID, UUID> runoffVotes, Map<UUID, Long> likeCounts) {
    }
```

```java
    public SessionSnapshot snapshot(String slug) {
        Session stored = store.sessionBySlug(slug)
                .orElseThrow(() -> new NotFoundException("session not found: " + slug));
        Session session = SessionExpiry.applied(stored, clock.instant());
        List<Participant> participants = store.participantsOf(session.id());
        List<Venue> venues = VENUES_VISIBLE.contains(session.status())
                ? deck.venuesOf(session.id()) : List.of();

        // Sayim aciklama kapisi (spec §3: acik sayim bandwagon yaratir, gizli-sonra-acilis
        // dogru): karar verildiyse ya da oy verecek herkes verdiyse acilir.
        long finishers = participants.stream().filter(p -> p.votes() && p.deckDone()).count();
        boolean everyoneVoted = session.status() == SessionStatus.RUNOFF && finishers > 0
                && deck.votersCount(session.id()) >= finishers;
        Map<UUID, Long> tally = session.status() == SessionStatus.DECIDED || everyoneVoted
                ? deck.voteTally(session.id()) : Map.of();

        Map<UUID, UUID> runoffVotes = session.status() == SessionStatus.RUNOFF
                ? deck.votesByParticipant(session.id()) : Map.of();

        // likeCounts YALNIZ DECIDED sonrasi (K-B11): oylama surerken kimin neyi begendigi
        // sayilarindan geri okunabilirdi.
        Map<UUID, Long> likeCounts = session.status() == SessionStatus.DECIDED
                ? tallyLikes(participants, deck.likesByParticipant(session.id())) : Map.of();

        return new SessionSnapshot(session, participants, venues, tally, runoffVotes, likeCounts);
    }

    /** Mekan -> desteyi bitirmis kac oy popülasyonu uyesi begendi. */
    private static Map<UUID, Long> tallyLikes(List<Participant> participants,
                                              Map<UUID, Set<UUID>> likesByParticipant) {
        Set<UUID> counted = participants.stream()
                .filter(p -> p.votes() && p.deckDone())
                .map(Participant::id)
                .collect(Collectors.toSet());
        return likesByParticipant.entrySet().stream()
                .filter(e -> counted.contains(e.getKey()))
                .flatMap(e -> e.getValue().stream())
                .collect(Collectors.groupingBy(v -> v, Collectors.counting()));
    }
```

(`import java.util.Set; import java.util.stream.Collectors;` ekle.)

- [ ] **Step 5: DTO + assembler**

`ApiDtos.SessionView`'a dört alan (sonuna):

```java
    public record SessionView(String slug, String name, ActivityType activityType,
                              SessionType sessionType, SessionStatus status, Instant expiresAt,
                              List<ParticipantDto> participants, List<VenueDto> venues,
                              List<UUID> runoffVenueIds, UUID decidedVenueId,
                              Map<UUID, Long> voteTally,
                              /** Konumu olan >=2 nokta varsa; yoksa null. */
                              GeoPointDto midpoint, Double radiusKm,
                              List<UUID> runoffVotedParticipantIds,
                              /** Istegi yapanin bu oturumdaki satiri; uye degilse null. */
                              ViewerDto viewer,
                              /** Orta noktanin kasaba kelimesi; yoksa null (Task 3). */
                              String midpointLabel,
                              DecisionKind decisionKind, Instant decidedAt,
                              RunoffReason runoffReason,
                              /** Mekan -> begeni sayisi; YALNIZ DECIDED'da dolu. */
                              Map<UUID, Long> likeCounts) {
    }
```

(`import com.bumpinto.domain.session.DecisionKind;
import com.bumpinto.domain.session.RunoffReason;` ekle.)

`SessionViewAssembler.toView` dönüşü:

```java
        return new ApiDtos.SessionView(snap.session().slug(), snap.session().name(),
                snap.session().activityType(), snap.session().sessionType(),
                snap.session().status(), snap.session().expiresAt(),
                participants, venues, snap.session().runoffVenueIds(),
                snap.session().decidedVenueId(), snap.voteTally(), midpoint, radiusKm,
                snap.runoffVotes().keySet().stream().sorted().toList(),
                WebPrincipals.viewerOf(snap, auth),
                snap.session().midpointLabel(), snap.session().decisionKind(),
                snap.session().decidedAt(), snap.session().runoffReason(), snap.likeCounts());
```

- [ ] **Step 6: `ApiHappyPathTest`** — karar sonrası gövde kapısı; mevcut karar assert'inin yanına:

```java
        JsonNode decidedView = json.readTree(decided);
        assertThat(decidedView.get("decisionKind").asString()).isEqualTo("UNANIMOUS");
        assertThat(decidedView.get("decidedAt").isNull()).isFalse();
        assertThat(decidedView.get("likeCounts").size()).isGreaterThan(0);
        assertThat(decided).doesNotContain("runoffVotes");
```

- [ ] **Step 7: PASS doğrula** — Run: `MVN test` → `Failures: 0, Errors: 0`.

- [ ] **Step 8: Bruno** — `sessions/get-session.yml` `docs:` bloğuna ekle:

```
`decisionKind`: `UNANIMOUS|SINGLE_LIKE|RUNOFF|FORCED|PARTIAL` (yalniz DECIDED'da dolu).
`decidedAt`: karar ani (ISO-8601, yalniz DECIDED).
`runoffReason`: `INTERSECTION|FALLBACK` — runoff'a neden dusuldugu; karar sonrasi da korunur.
`likeCounts`: mekan -> begeni sayisi, YALNIZ DECIDED sonrasi dolu (oylama surerken gizli).
`voteTally`: DECIDED'da ya da oy verecek HERKES oy verdiginde dolar; aksi halde bos —
"kim kilitledi" bilgisi `runoffVotedParticipantIds`'ten, kendi secimin `viewer.runoffVoteVenueId`'den
okunur. Baskasinin ne sectigi API'de HIC yoktur.
```

`deck/runoff-vote.yml` `docs:` sonuna: "Yanit sayimi ancak son oy dustugunde acilir (bandwagon
onlemi); o ana dek `voteTally` bos gelir." `sessions/force-decision.yml` `docs:` sonuna:
"`venueId` verilirse `decisionKind=FORCED`; `venueId` null (kismi degerlendirme) ise `PARTIAL`."

- [ ] **Step 9: INDEX güncelle + Commit önerisi (kullanıcı)**

```
feat(session): karar turu/ani/runoff nedeni yazimi, likeCounts yalniz DECIDED, sayim kapisi

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

---

### Task 3: Orta nokta etiketi — `ReverseGeocodePort` + Nominatim adapteri (TDD)

**Files:**
- Create: `backend/src/main/java/com/bumpinto/domain/port/ReverseGeocodePort.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/geocode/NominatimReverseGeocoder.java`
- Create: `backend/src/test/java/com/bumpinto/adapter/out/geocode/NominatimReverseGeocoderTest.java`
- Modify: `backend/src/main/java/com/bumpinto/infra/config/AppProps.java`
- Modify: `backend/src/main/resources/application.yml`
- Modify: `backend/src/main/java/com/bumpinto/application/deck/DeckFlow.java`
- Modify: `backend/src/test/java/com/bumpinto/support/FakeStores.java` (yeni `FakeReverseGeocoder`)
- Modify: `backend/src/test/java/com/bumpinto/application/deck/DeckFlowTest.java`
- Modify: `backend/src/test/java/com/bumpinto/adapter/out/provider/FoursquareVenueProviderTest.java`
  (`props()` yardımcısı — yeni `AppProps` alanı)

> **Not (W-6 borcu):** Nominatim kullanımı `© OpenStreetMap contributors` atfını **zorunlu** kılar.
> Backend veriyi üretir, atıf yükümlülüğü arayüzdedir: W-6a.9 footer satırı bu görevle **açılır**,
> kapanışı W-6'dadır. Katılımcı `locationLabel`'ı bu planda **istemci tarafında** kalır (Katıl formu
> hâlâ kendi etiketi gönderiyor); sunucuya taşınması B-7 kapsamı dışı, K-B görevi olarak INDEX'e yazılır.

- [ ] **Step 1: Failing tests** — `NominatimReverseGeocoderTest.java` (yeni)

```java
package com.bumpinto.adapter.out.geocode;

import static org.assertj.core.api.Assertions.assertThat;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.infra.config.AppProps;
import kong.unirest.core.HttpMethod;
import kong.unirest.core.MockClient;
import kong.unirest.core.Unirest;
import kong.unirest.core.UnirestInstance;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class NominatimReverseGeocoderTest {

    static final String REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

    static AppProps props(Duration minInterval) {
        return new AppProps(new AppProps.Security("cid", "secret", Duration.ofHours(12)),
                new AppProps.Providers("fsq-key", "g-key"),
                new AppProps.Cors(List.of()), new AppProps.Cookies(false, ""),
                new AppProps.RateLimit(false),
                new AppProps.Quota(Duration.ofMinutes(5), 1000, 1000),
                new AppProps.Geocode("ops@bumpinto.test", minInterval));
    }

    static NominatimReverseGeocoder geocoder(UnirestInstance http, Duration minInterval) {
        return new NominatimReverseGeocoder(http, props(minInterval));
    }

    @Test
    void readsTownNameAndSendsMandatoryUserAgentAndZoom() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, REVERSE_URL)
                .thenReturn("""
                        {"address":{"town":"Someren","county":"Noord-Brabant","country":"Nederland"}}
                        """);

        assertThat(geocoder(http, Duration.ZERO).label(new GeoPoint(51.3855, 5.7120)))
                .contains("Someren");

        mock.assertThat(HttpMethod.GET, REVERSE_URL)
                .hasHeaderContaining("User-Agent", "BumpInto")
                .hasHeaderContaining("User-Agent", "ops@bumpinto.test")
                .hasQueryParam("zoom", "10")
                .hasQueryParam("format", "jsonv2");
    }

    /** Anahtar YUVARLANMIS konum: ayni ~1 km kutusundaki ikinci istek aga CIKMAZ. */
    @Test
    void cachesByApproxLocation() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, REVERSE_URL)
                .thenReturn("""
                        {"address":{"city":"Eindhoven"}}
                        """);
        NominatimReverseGeocoder geocoder = geocoder(http, Duration.ZERO);

        assertThat(geocoder.label(new GeoPoint(51.44123, 5.47456))).contains("Eindhoven");
        assertThat(geocoder.label(new GeoPoint(51.43987, 5.47021))).contains("Eindhoven");

        mock.assertThat(HttpMethod.GET, REVERSE_URL).hasBeenCalledTimes(1);
    }

    @Test
    void throttlesToAtMostOneRequestPerInterval() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, REVERSE_URL)
                .thenReturn("""
                        {"address":{"village":"Nuenen"}}
                        """);
        NominatimReverseGeocoder geocoder = geocoder(http, Duration.ofMillis(200));

        long start = System.nanoTime();
        geocoder.label(new GeoPoint(51.47, 5.55));
        geocoder.label(new GeoPoint(51.60, 5.20)); // farkli kutu → cache kacisi
        long elapsedMs = (System.nanoTime() - start) / 1_000_000;

        assertThat(elapsedMs).isGreaterThanOrEqualTo(180);
    }

    @Test
    void failureIsSilentAndNotCached() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, REVERSE_URL).thenReturn("").withStatus(503);

        assertThat(geocoder(http, Duration.ZERO).label(new GeoPoint(51.44, 5.47)))
                .isEqualTo(Optional.empty());
    }
}
```

- [ ] **Step 2: FAIL doğrula** — Run: `MVN test -Dtest=NominatimReverseGeocoderTest`
Expected: derleme hatası (`AppProps.Geocode`, adapter yok).

- [ ] **Step 3: Port**

```java
package com.bumpinto.domain.port;

import com.bumpinto.domain.geo.GeoPoint;

import java.util.Optional;

/**
 * Bir koordinati insanin soyleyecegi kelimeye cevirir ("Eindhoven", "Someren").
 * Haritanin turetilemeyen TEK bilgisi budur (spec §0): kalan her sey kisi basi dakikadan
 * uretilir. Basarisizlik NORMALDIR — cagiran null etiketle devam eder.
 */
public interface ReverseGeocodePort {

    Optional<String> label(GeoPoint point);
}
```

- [ ] **Step 4: `AppProps.Geocode`** — kayda alan ekle (en sona) ve iç record'u tanımla:

```java
public record AppProps(Security security, Providers providers, Cors cors, Cookies cookies,
                       RateLimit rateLimit, Quota quota, Geocode geocode) {
```

```java
    /**
     * Nominatim kullanim politikasi (operations.osmfoundation.org/policies/nominatim):
     * uygulamayi ve ILETISIM ADRESINI tasiyan bir User-Agent ZORUNLU, saniyede en fazla 1
     * istek, sonuclar onbelleklenir. Ucu de burada: {@code contact} User-Agent'a girer,
     * {@code minInterval} throttle'i besler, onbellek adapterdedir.
     */
    public record Geocode(String contact, Duration minInterval) {
    }
```

`application.yml`'e ekle:

```yaml
  geocode:
    # Nominatim politikasi: User-Agent'ta gercek bir iletisim adresi ZORUNLU.
    contact: ${NOMINATIM_CONTACT:dev@bumpinto.test}
    min-interval: ${NOMINATIM_MIN_INTERVAL:PT1S}
```

- [ ] **Step 5: Adapter**

```java
package com.bumpinto.adapter.out.geocode;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMinutes;
import com.bumpinto.domain.port.ReverseGeocodePort;
import com.bumpinto.infra.config.AppProps;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import kong.unirest.core.HttpResponse;
import kong.unirest.core.JsonNode;
import kong.unirest.core.UnirestInstance;
import kong.unirest.core.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Orta noktanin kasaba/semt kelimesi (spec §5.A.4). Politika geregi (bkz. {@link AppProps.Geocode}):
 * iletisim adresli User-Agent, saniyede <=1 istek, sonuc onbellekli. {@code zoom=10} kasaba
 * duzeyidir — sokak adresi ISTEMIYORUZ, hem gereksiz hem gizlilik acisindan fazla.
 *
 * <p>Onbellek anahtari YUVARLANMIS konumdur (~1 km): ayni sehirdeki iki oturum tek istek eder,
 * ve tam koordinat hicbir zaman ucuncu tarafa gitmez.
 *
 * <p>Atif borcu: bu veriyi gosteren her yuzeyde "© OpenStreetMap contributors" (W-6a.9).
 */
@Component
public class NominatimReverseGeocoder implements ReverseGeocodePort {

    private static final Logger log = LoggerFactory.getLogger(NominatimReverseGeocoder.class);
    private static final String REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
    private static final String APP_VERSION = "0.1";
    /** Nominatim adres anahtarlari kaba→ince degil, YER TURUNE gore gelir; ilk dolan kazanir. */
    private static final List<String> LABEL_KEYS =
            List.of("city", "town", "village", "municipality", "suburb", "county");
    /** Cozumsuz sonucu da onbellege koyariz; sentinel bos dizedir (Caffeine null saklamaz). */
    private static final String MISS = "";

    private final UnirestInstance http;
    private final String userAgent;
    private final Duration minInterval;
    private final Cache<String, String> cache = Caffeine.newBuilder()
            .maximumSize(10_000)
            .expireAfterWrite(Duration.ofDays(30))
            .build();
    private final Object gate = new Object();
    private long nextAllowedNanos;

    public NominatimReverseGeocoder(UnirestInstance http, AppProps props) {
        this.http = http;
        String contact = AppProps.required("NOMINATIM_CONTACT", props.geocode().contact());
        this.userAgent = "BumpInto/" + APP_VERSION + " (" + contact + ")";
        this.minInterval = props.geocode().minInterval();
        this.nextAllowedNanos = System.nanoTime();
    }

    @Override
    public Optional<String> label(GeoPoint point) {
        GeoPoint approx = TravelMinutes.approx(point);
        String key = String.format(Locale.ROOT, "%.2f,%.2f", approx.lat(), approx.lng());
        String cached = cache.getIfPresent(key);
        if (cached != null) {
            return cached.isEmpty() ? Optional.empty() : Optional.of(cached);
        }
        String label = fetch(approx);
        if (label != null) {
            cache.put(key, label);
            return Optional.of(label);
        }
        // Basarisizligi onbellege KOYMA: aga bagli gecici hata kalici bir bosluga donusmesin.
        return Optional.empty();
    }

    private String fetch(GeoPoint approx) {
        throttle();
        try {
            HttpResponse<JsonNode> response = http.get(REVERSE_URL)
                    .header("User-Agent", userAgent)
                    .header("Accept", "application/json")
                    .queryString("format", "jsonv2")
                    .queryString("zoom", 10)
                    .queryString("lat", approx.lat())
                    .queryString("lon", approx.lng())
                    .asJson();
            if (!response.isSuccess() || response.getBody() == null) {
                log.warn("nominatim reverse returned {}", response.getStatus());
                return null;
            }
            JSONObject root = response.getBody().getObject();
            if (!root.has("address")) {
                return null;
            }
            JSONObject address = root.getJSONObject("address");
            for (String key : LABEL_KEYS) {
                String value = address.optString(key, "");
                if (!value.isBlank()) {
                    return value;
                }
            }
            return null;
        } catch (RuntimeException e) {
            // Etiket bir SUS payidir: orta nokta kartinda satir gizlenir, oturum akar.
            log.warn("nominatim reverse failed: {}", e.getMessage());
            return null;
        }
    }

    /** En fazla 1 istek / {@code minInterval} — politika kurali, tek surec icinde yeterli. */
    private void throttle() {
        synchronized (gate) {
            long waitNanos = nextAllowedNanos - System.nanoTime();
            if (waitNanos > 0) {
                try {
                    Thread.sleep(waitNanos / 1_000_000, (int) (waitNanos % 1_000_000));
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
            nextAllowedNanos = System.nanoTime() + minInterval.toNanos();
        }
    }
}
```

- [ ] **Step 6: `DeckFlow`** — etiket bir kez, `find-venues` içinde

Kurucuya `ReverseGeocodePort geocoder` ekle (alan + atama). `findVenues` sonundaki kayıt:

```java
        List<Venue> saved = deck.saveVenues(venues);
        // Etiket BIR KEZ burada cozulur: orta nokta bundan sonra degismez (konumlar donuyor)
        // ve her SessionView okumasinda ag istegi atmak politikaya da mantiga da aykiri olurdu.
        String label = geocoder.label(center).orElse(null);
        store.saveSession(session.withStatus(SessionStatus.BROWSING).withMidpointLabel(label));
        events.publish(slug, SessionEvent.venuesReady(saved.size()));
        return saved;
```

(`import com.bumpinto.domain.port.ReverseGeocodePort;` ekle. Ağ çağrısı `@Transactional` içinde:
`findVenues` zaten sağlayıcı çağrılarını aynı işlemde yapıyor — yeni bir sapma değil.)

- [ ] **Step 7: Test sahtesi** — `FakeStores`'a ekle:

```java
    /** Sabit etiket; testler `label` alanini degistirerek "cozulemedi" halini kurar. */
    public static class FakeReverseGeocoder implements ReverseGeocodePort {
        public String label = "Eindhoven";
        public int calls;

        @Override public Optional<String> label(GeoPoint point) {
            calls++;
            return Optional.ofNullable(label);
        }
    }
```

`DeckFlowTest` kurulumunda `new DeckFlow(store, deck, provider, events, engine, clock)` çağrısına
`geocoder` argümanını ekle ve testi ekle:

```java
    @Test
    void findVenuesResolvesMidpointLabelOnceAndSurvivesGeocoderFailure() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        flow.findVenues("s1", hostUser);
        assertThat(store.sessionBySlug("s1").orElseThrow().midpointLabel()).isEqualTo("Eindhoven");
        assertThat(geocoder.calls).isEqualTo(1);

        flow.shuffle("s1", hostUser);
        assertThat(geocoder.calls).isEqualTo(1); // etiket bir kez cozulur
    }

    @Test
    void midpointLabelStaysNullWhenGeocoderCannotResolve() {
        geocoder.label = null;
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        flow.findVenues("s1", hostUser);
        assertThat(store.sessionBySlug("s1").orElseThrow().midpointLabel()).isNull();
    }
```

`FoursquareVenueProviderTest.props()`'a yeni `AppProps` alanlarını ekle (bütün provider testleri
bu yardımcıyı kullanıyor):

```java
    static AppProps props() {
        return new AppProps(new AppProps.Security("cid", "secret", Duration.ofHours(12)),
                new AppProps.Providers("fsq-key", "g-key"),
                new AppProps.Cors(List.of()), new AppProps.Cookies(false, ""),
                new AppProps.RateLimit(false),
                new AppProps.Quota(Duration.ofMinutes(5), 1000, 1000),
                new AppProps.Geocode("ops@bumpinto.test", Duration.ZERO));
    }
```

(`Quota`'nın üçüncü alanı Task 5'te geliyor; bu görevde henüz iki alanlıysa `new AppProps.Quota(
Duration.ofMinutes(5), 1000)` yaz ve Task 5'te güncelle.)

- [ ] **Step 8: PASS doğrula** — Run: `MVN test` → `Failures: 0, Errors: 0`;
`HexagonalArchitectureTest` yeşil (yeni adapter `adapter/out/geocode` altında, katman kökünde değil).

- [ ] **Step 9: Bruno** — `sessions/find-venues.yml` `docs:` sonuna:

```
Orta noktanin kasaba kelimesi burada BIR KEZ cozulur (Nominatim, `zoom=10`, yuvarlanmis
koordinattan) ve `sessions.midpoint_label`'a yazilir; `GET /api/sessions/{slug}` bunu
`midpointLabel` olarak doner. Cozulemezse null — akis etkilenmez.
Atif: bu alani gosteren her ekranda "© OpenStreetMap contributors".
```

`sessions/get-session.yml` `docs:` sonuna: `` `midpointLabel`: orta noktanin kasaba/semt kelimesi (null olabilir). ``

- [ ] **Step 10: INDEX güncelle + Commit önerisi (kullanıcı)**

```
feat(geocode): ReverseGeocodePort + Nominatim adapteri, find-venues'te midpointLabel

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

---

### Task 4a: Mekan alan modeli + Google Places maskesi (TDD)

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/domain/venue/VenueCandidate.java`
- Modify: `backend/src/main/java/com/bumpinto/domain/venue/Venue.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/VenueEntity.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/DeckStoreAdapter.java`
- Modify: `backend/src/main/java/com/bumpinto/application/deck/DeckFlow.java` (Venue kurulumu)
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/provider/GooglePlacesVenueProvider.java`
- Modify: `backend/src/test/java/com/bumpinto/support/FakeStores.java` (reorder tüm alanları taşısın)
- Modify: `backend/src/test/java/com/bumpinto/adapter/out/provider/GooglePlacesVenueProviderTest.java`
- Modify: `backend/src/test/java/com/bumpinto/adapter/out/persistence/StoreAdapterTest.java`

> **Maliyet notu (spec §2 + §5.A.5):** Google faturası maskedeki **en yüksek katmana** göre kesilir.
> Maske bugün zaten `rating` + `priceLevel` içerdiği için çağrı **Enterprise**; eklenen beş alan
> aynı katmanda olduğundan **marjinal $0**. Adres alanını çıkarmak katmanı düşürmez.

- [ ] **Step 1: Failing tests** — `GooglePlacesVenueProviderTest`'e ekle:

```java
    @Test
    void mapsSameTierEnterpriseFieldsToCandidate() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, NEARBY_URL)
                .thenReturn("""
                        {"places":[{"id":"g1","displayName":{"text":"Espresso Bar"},
                          "location":{"latitude":51.44,"longitude":5.47},
                          "rating":4.6,"userRatingCount":312,
                          "businessStatus":"OPERATIONAL",
                          "primaryTypeDisplayName":{"text":"Espresso bar"},
                          "shortFormattedAddress":"Kleine Berg 16, Eindhoven",
                          "regularOpeningHours":{"weekdayDescriptions":[
                            "Monday: 8:00 AM – 6:00 PM","Tuesday: 8:00 AM – 6:00 PM",
                            "Wednesday: 8:00 AM – 6:00 PM","Thursday: 8:00 AM – 6:00 PM",
                            "Friday: 8:00 AM – 10:00 PM","Saturday: 9:00 AM – 10:00 PM",
                            "Sunday: 10:00 AM – 6:00 PM"]},
                          "addressComponents":[
                            {"longText":"16","types":["street_number"]},
                            {"longText":"Strijp-S","types":["sublocality_level_1","sublocality"]},
                            {"longText":"Eindhoven","types":["locality","political"]}],
                          "googleMapsUri":"https://maps/g1"}]}
                        """);

        VenueCandidate c = provider(http)
                .search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10).get(0);

        assertThat(c.category()).isEqualTo("Espresso bar");
        assertThat(c.address()).isEqualTo("Kleine Berg 16, Eindhoven");
        assertThat(c.locality()).isEqualTo("Eindhoven"); // locality, sublocality'yi yener
        assertThat(c.ratingCount()).isEqualTo(312);
        // NOW = 2026-09-02, sali → weekdayDescriptions[1]
        assertThat(c.hoursToday()).isEqualTo("Tuesday: 8:00 AM – 6:00 PM");
        assertThat(c.placeLink()).isEqualTo("https://maps/g1");

        mock.assertThat(HttpMethod.POST, NEARBY_URL)
                .hasHeaderContaining("X-Goog-FieldMask", "places.primaryTypeDisplayName")
                .hasHeaderContaining("X-Goog-FieldMask", "places.businessStatus")
                .hasHeaderContaining("X-Goog-FieldMask", "places.shortFormattedAddress")
                .hasHeaderContaining("X-Goog-FieldMask", "places.userRatingCount")
                .hasHeaderContaining("X-Goog-FieldMask", "places.regularOpeningHours")
                .hasHeaderContaining("X-Goog-FieldMask", "places.addressComponents");
    }

    @Test
    void localityFallsBackToSublocalityWhenGoogleOmitsTheCity() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, NEARBY_URL)
                .thenReturn("""
                        {"places":[{"id":"g3","displayName":{"text":"Kiosk"},
                          "location":{"latitude":51.44,"longitude":5.47},
                          "addressComponents":[
                            {"longText":"Strijp-S","types":["sublocality_level_1","sublocality"]}]}]}
                        """);

        assertThat(provider(http).search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10)
                .get(0).locality()).isEqualTo("Strijp-S");
    }

    @Test
    void closedPlacesAreDroppedSilentlyAndPhotosStayAligned() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, NEARBY_URL)
                .thenReturn("""
                        {"places":[
                          {"id":"kapali","displayName":{"text":"Kapanmis"},
                           "location":{"latitude":51.44,"longitude":5.47},
                           "businessStatus":"CLOSED_PERMANENTLY",
                           "photos":[{"name":"places/kapali/photos/REF0"}]},
                          {"id":"acik","displayName":{"text":"Acik"},
                           "location":{"latitude":51.45,"longitude":5.48},
                           "businessStatus":"OPERATIONAL",
                           "photos":[{"name":"places/acik/photos/REF1"}]}]}
                        """);
        mock.expect(HttpMethod.GET, "https://places.googleapis.com/v1/places/acik/photos/REF1/media")
                .thenReturn("""
                        {"photoUri":"https://lh3/acik=w1000"}
                        """);

        List<VenueCandidate> out = provider(http)
                .search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10);

        assertThat(out).hasSize(1);
        assertThat(out.get(0).externalId()).isEqualTo("acik");
        assertThat(out.get(0).photoUrl()).isEqualTo("https://lh3/acik=w1000");
    }

    @Test
    void placeLinkFallsBackToPlaceIdSearchUrlWhenGoogleOmitsTheUri() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, NEARBY_URL)
                .thenReturn("""
                        {"places":[{"id":"g9","displayName":{"text":"Café Berlage"},
                          "location":{"latitude":51.44,"longitude":5.47}}]}
                        """);

        VenueCandidate c = provider(http)
                .search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10).get(0);
        assertThat(c.placeLink()).isEqualTo(
                "https://www.google.com/maps/search/?api=1&query=Caf%C3%A9+Berlage&query_place_id=g9");
    }
```

`StoreAdapterTest`'e ekle:

```java
    @Test
    void venueProviderFieldsRoundTrip() {
        UUID sessionId = seedSession();
        Venue v = new Venue(UUID.randomUUID(), sessionId, "google", "g1", "Espresso Bar",
                new GeoPoint(51.44, 5.47), 4.6, 2, null, "https://maps/g1", 0,
                "Espresso bar", "Kleine Berg 16, Eindhoven", "Eindhoven", 312,
                "Tuesday: 8:00 AM – 6:00 PM", "https://maps/g1");
        deck.saveVenues(List.of(v));
        assertThat(deck.venuesOf(sessionId).get(0)).isEqualTo(v);
    }
```

- [ ] **Step 2: FAIL doğrula** — Run: `MVN test -Dtest='GooglePlacesVenueProviderTest,StoreAdapterTest'`
Expected: derleme hatası.

- [ ] **Step 3: `VenueCandidate`** — beş alan, eski 8 argümanlı imza korunur

```java
package com.bumpinto.domain.venue;

import com.bumpinto.domain.geo.GeoPoint;

/**
 * Saglayicidan gelen ham aday. Yeni alanlar (spec §5.A.5) OPSIYONELDIR: saglayici vermezse
 * null kalir ve UI o satiri hic cizmez — "veri yokken bos etiket" bu urunde yasak (§4.9).
 *
 * @param category    saglayicinin kendi kategori kelimesi ("espresso bar"), uyum satiri icin
 * @param address     TAM kisa adres ("Kleine Berg 16, Eindhoven") — Karar ekraninin YER ekseni
 * @param locality    YALNIZ kasaba/semt kelimesi ("Eindhoven", "Strijp-S") — kart meta satiri
 *                    bunu basar; orta noktanin sehrinden farkliysa anlam tasir (spec §4.9)
 * @param ratingCount yorum sayisi — 4,3–4,7 arasi puan gurultusunu kiran sosyal kanit
 * @param hoursToday  BUGUNUN saat metni, saglayicinin verdigi bicimde; UI kisaltir
 * @param placeLink   mekanin kanonik dis baglantisi (Maps URL ya da FSQ'da site)
 */
public record VenueCandidate(String provider, String externalId, String name, GeoPoint location,
                             Double rating, Integer priceLevel, String photoUrl, String mapsUrl,
                             String category, String address, String locality, Integer ratingCount,
                             String hoursToday, String placeLink) {

    /** Eski imza: zenginlestirilmemis aday (testler ve OSM taban saglayicisi icin). */
    public VenueCandidate(String provider, String externalId, String name, GeoPoint location,
                          Double rating, Integer priceLevel, String photoUrl, String mapsUrl) {
        this(provider, externalId, name, location, rating, priceLevel, photoUrl, mapsUrl,
                null, null, null, null, null, null);
    }
}
```

- [ ] **Step 4: `Venue`**

```java
package com.bumpinto.domain.venue;

import com.bumpinto.domain.geo.GeoPoint;

import java.util.UUID;

public record Venue(UUID id, UUID sessionId, String provider, String externalId, String name,
                    GeoPoint location, Double rating, Integer priceLevel, String photoUrl,
                    String mapsUrl, int deckOrder,
                    String category, String address, String locality, Integer ratingCount,
                    String hoursToday, String placeLink) {

    /** Eski imza: saglayici alanlari olmadan (eski satirlar ve testler). */
    public Venue(UUID id, UUID sessionId, String provider, String externalId, String name,
                 GeoPoint location, Double rating, Integer priceLevel, String photoUrl,
                 String mapsUrl, int deckOrder) {
        this(id, sessionId, provider, externalId, name, location, rating, priceLevel, photoUrl,
                mapsUrl, deckOrder, null, null, null, null, null, null);
    }

    public Venue withDeckOrder(int newOrder) {
        return new Venue(id, sessionId, provider, externalId, name, location, rating, priceLevel,
                photoUrl, mapsUrl, newOrder, category, address, locality, ratingCount, hoursToday,
                placeLink);
    }
}
```

- [ ] **Step 5: Persistence** — `VenueEntity`'ye ekle:

```java
    String category;
    String address;
    String locality;
    Integer ratingCount;
    String hoursToday;
    String placeLink;
```

`DeckStoreAdapter.saveVenues` eşlemesine beş satır ekle (`e.category = v.category();` …) ve
`venuesOf`'u tam kurucuya geçir:

```java
    @Override public List<Venue> venuesOf(UUID sessionId) {
        return venues.findBySessionIdOrderByDeckOrder(sessionId).stream()
                .map(e -> new Venue(e.id, e.sessionId, e.provider, e.externalId, e.name,
                        new GeoPoint(e.lat, e.lng), e.rating, e.priceLevel, e.photoUrl,
                        e.mapsUrl, e.deckOrder, e.category, e.address, e.locality, e.ratingCount,
                        e.hoursToday, e.placeLink))
                .toList();
    }
```

**`FakeStores.InMemoryDeckStore.reorderVenues` alan KAYBEDIYOR** — 11 argümanlı kurucuyla yeniden
kuruyor. `withDeckOrder` ile değiştir:

```java
        @Override public void reorderVenues(UUID sessionId, List<UUID> orderedVenueIds) {
            for (int i = 0; i < orderedVenueIds.size(); i++) {
                UUID id = orderedVenueIds.get(i);
                int order = i;
                venues.replaceAll(v -> v.id().equals(id) ? v.withDeckOrder(order) : v);
            }
        }
```

- [ ] **Step 6: `DeckFlow`** — Venue kurulumunda yeni alanları taşı:

```java
        for (int i = 0; i < ordered.size(); i++) {
            VenueCandidate c = ordered.get(i);
            venues.add(new Venue(UUID.randomUUID(), session.id(), c.provider(), c.externalId(),
                    c.name(), c.location(), c.rating(), c.priceLevel(), c.photoUrl(),
                    c.mapsUrl(), i, c.category(), c.address(), c.locality(), c.ratingCount(),
                    c.hoursToday(), c.placeLink()));
        }
```

- [ ] **Step 7: `GooglePlacesVenueProvider`** — maske, filtre, eşleme

Maske (aynı Enterprise katmanı, marjinal $0):

```java
                .header("X-Goog-FieldMask",
                        "places.id,places.displayName,places.location,places.rating,"
                                + "places.priceLevel,places.googleMapsUri,places.photos,"
                                + "places.primaryTypeDisplayName,places.businessStatus,"
                                + "places.shortFormattedAddress,places.userRatingCount,"
                                + "places.regularOpeningHours,places.addressComponents")
```

`places.addressComponents` **Essentials** katmanindadir — maske zaten Enterprise oldugu icin
faturaya etkisi **$0** (fatura en yuksek katmana gore kesilir, ek katman eklemez).

Ayrıştırma — **önce ele, sonra foto çöz** (kapanmış mekan için foto kotası harcanmasın):

```java
        JSONArray places = root.getJSONArray("places");
        // businessStatus OPERATIONAL degilse mekan SESSIZCE elenir (spec §5.A.5): kapanmis
        // bir kafeyi listelemek urunun tek isini — bulusmayi — bozar. Alan yoksa kabul edilir.
        List<JSONObject> open = new ArrayList<>(places.length());
        for (int i = 0; i < places.length(); i++) {
            JSONObject p = places.getJSONObject(i);
            String status = p.optString("businessStatus", "OPERATIONAL");
            if ("OPERATIONAL".equals(status)) {
                open.add(p);
            }
        }
        List<String> photos = resolvePhotos(open);
        List<VenueCandidate> out = new ArrayList<>(open.size());
        for (int i = 0; i < open.size(); i++) {
            JSONObject p = open.get(i);
            JSONObject loc = p.getJSONObject("location");
            String id = p.getString("id");
            String name = p.getJSONObject("displayName").getString("text");
            String mapsUri = p.has("googleMapsUri") ? p.getString("googleMapsUri") : null;
            out.add(new VenueCandidate("google", id, name,
                    new GeoPoint(loc.getDouble("latitude"), loc.getDouble("longitude")),
                    p.has("rating") ? p.getDouble("rating") : null,
                    p.has("priceLevel") ? priceLevel(p.getString("priceLevel")) : null,
                    photos.get(i), mapsUri,
                    text(p, "primaryTypeDisplayName"),
                    p.has("shortFormattedAddress") ? p.getString("shortFormattedAddress") : null,
                    locality(p),
                    p.has("userRatingCount") ? p.getInt("userRatingCount") : null,
                    hoursToday(p),
                    mapsUri != null ? mapsUri : placeIdLink(id, name)));
        }
        return out;
```

`resolvePhotos` imzasını listeye çevir:

```java
    private List<String> resolvePhotos(List<JSONObject> places) {
        List<CompletableFuture<String>> pending = new ArrayList<>(places.size());
        for (JSONObject place : places) {
            pending.add(resolveFirstPhoto(place));
        }
        return pending.stream().map(CompletableFuture::join).toList();
    }
```

Yeni yardımcılar:

```java
    /** {"text": "..."} sarmalayicili Google alanlari (displayName, primaryTypeDisplayName). */
    private static String text(JSONObject place, String field) {
        if (!place.has(field)) {
            return null;
        }
        String value = place.getJSONObject(field).optString("text", "");
        return value.isBlank() ? null : value;
    }

    /**
     * Kasaba/semt kelimesi: {@code addressComponents} icinde {@code locality} tipini arar,
     * yoksa {@code sublocality}. Kart meta satirinda TAM adres degil bu kelime yazilir
     * (spec §4.9); tam adres {@code shortFormattedAddress} olarak ayrica tasinir.
     */
    static String locality(JSONObject place) {
        if (!place.has("addressComponents")) {
            return null;
        }
        JSONArray components = place.getJSONArray("addressComponents");
        String sublocality = null;
        for (int i = 0; i < components.length(); i++) {
            JSONObject component = components.getJSONObject(i);
            if (!component.has("types")) {
                continue;
            }
            JSONArray types = component.getJSONArray("types");
            String name = component.optString("longText", "");
            if (name.isBlank()) {
                continue;
            }
            for (int t = 0; t < types.length(); t++) {
                String type = types.getString(t);
                if ("locality".equals(type)) {
                    return name;
                }
                if (sublocality == null && type.startsWith("sublocality")) {
                    sublocality = name;
                }
            }
        }
        return sublocality;
    }

    /**
     * weekdayDescriptions PAZARTESI ile baslar (Places API New). Sunucu saatiyle bugunun
     * satirini aliriz; oturum 24 saat yasadigi icin gun donmesi kabul edilebilir bir kaymadir.
     */
    private String hoursToday(JSONObject place) {
        if (!place.has("regularOpeningHours")) {
            return null;
        }
        JSONObject hours = place.getJSONObject("regularOpeningHours");
        if (!hours.has("weekdayDescriptions")) {
            return null;
        }
        JSONArray descriptions = hours.getJSONArray("weekdayDescriptions");
        int index = clock.instant().atZone(ZoneOffset.UTC).getDayOfWeek().getValue() - 1;
        if (index < 0 || index >= descriptions.length()) {
            return null;
        }
        String value = descriptions.getString(index);
        return value.isBlank() ? null : value;
    }

    /**
     * API'siz, kalici Maps baglantisi. Place ID SURESIZ saklanabilir (Google Service Terms),
     * bu yuzden bu adres bir onbellek ihlali degildir.
     */
    static String placeIdLink(String placeId, String name) {
        return "https://www.google.com/maps/search/?api=1&query="
                + URLEncoder.encode(name, StandardCharsets.UTF_8)
                + "&query_place_id=" + URLEncoder.encode(placeId, StandardCharsets.UTF_8);
    }
```

(`import java.net.URLEncoder; import java.nio.charset.StandardCharsets;
import kong.unirest.core.json.JSONObject;` — sonuncusu zaten var.)

- [ ] **Step 8: PASS doğrula** — Run: `MVN test` → `Failures: 0, Errors: 0`.

- [ ] **Step 9: INDEX güncelle + Commit önerisi (kullanıcı)**

```
feat(venue): kategori/adres/yorum sayisi/saat/baglanti alanlari + Google ayni katman maskesi

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

---

### Task 4b: Foursquare Pro'ya iniş + `VenueDto` sağlayıcı alanları + `mapsUrl` fallback (TDD)

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/provider/FoursquareVenueProvider.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/ApiDtos.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/SessionViewAssembler.java`
- Modify: `backend/src/test/java/com/bumpinto/adapter/out/provider/FoursquareVenueProviderTest.java`
- Modify: `backend/src/test/java/com/bumpinto/adapter/in/web/SessionViewAssemblerTest.java`
- Modify: `backend/src/test/java/com/bumpinto/ApiHappyPathTest.java`

- [ ] **Step 1: Failing tests** — `FoursquareVenueProviderTest`'te mevcut ayrıştırma testini
**değiştir** ve ekle:

```java
    @Test
    void requestsOnlyProFieldsAndMapsCategoryAndLocality() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, SEARCH_URL)
                .thenReturn("""
                        {"results":[{"fsq_place_id":"f1","name":"Café Berlage",
                          "latitude":51.44,"longitude":5.47,
                          "categories":[{"name":"Coffee Shop"},{"name":"Café"}],
                          "location":{"locality":"Eindhoven","neighborhood":["Bergen"]},
                          "website":"https://berlage.nl"}]}
                        """);

        VenueCandidate c = provider(http)
                .search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10).get(0);

        assertThat(c.category()).isEqualTo("Coffee Shop");
        assertThat(c.address()).isEqualTo("Eindhoven");
        assertThat(c.locality()).isEqualTo("Eindhoven");
        assertThat(c.placeLink()).isEqualTo("https://berlage.nl");
        // Premium alanlar isteğe hic girmiyor → yanit gelse bile bunlar null
        assertThat(c.rating()).isNull();
        assertThat(c.priceLevel()).isNull();
        assertThat(c.photoUrl()).isNull();
        assertThat(c.ratingCount()).isNull();

        mock.assertThat(HttpMethod.GET, SEARCH_URL)
                .hasQueryParam("fields",
                        "fsq_place_id,name,latitude,longitude,categories,location,website");
    }

    @Test
    void addressFallsBackToNeighbourhoodWhenLocalityIsMissing() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, SEARCH_URL)
                .thenReturn("""
                        {"results":[{"fsq_place_id":"f2","name":"Kiosk",
                          "latitude":51.44,"longitude":5.47,
                          "location":{"neighborhood":["Strijp-S"]}}]}
                        """);

        VenueCandidate c = provider(http)
                .search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10).get(0);
        assertThat(c.address()).isEqualTo("Strijp-S");
        assertThat(c.locality()).isEqualTo("Strijp-S");
        assertThat(c.category()).isNull();
        assertThat(c.placeLink()).isNull();
    }
```

`SessionViewAssemblerTest`'e ekle:

```java
    @Test
    void venueDtoCarriesProviderFieldsAndFallsBackToDirectionsUrl() {
        Session s = session(SessionType.GROUP);
        Participant a = person(s.id(), new GeoPoint(51.44, 5.47), "Eindhoven", false);
        Participant b = person(s.id(), new GeoPoint(51.69, 5.30), "Den Bosch", false);
        Venue v = new Venue(UUID.randomUUID(), s.id(), "foursquare", "f1", "Café Berlage",
                new GeoPoint(51.4412, 5.4712), null, null, null, null, 0,
                "Coffee Shop", "Eindhoven", "Eindhoven", null, null, "https://berlage.nl");

        ApiDtos.VenueDto dto = assembler.toView(new SessionQueries.SessionSnapshot(
                s, List.of(a, b), List.of(v), Map.of(), Map.of(), Map.of()), null).venues().get(0);

        assertThat(dto.provider()).isEqualTo("foursquare");
        assertThat(dto.category()).isEqualTo("Coffee Shop");
        assertThat(dto.address()).isEqualTo("Eindhoven");
        assertThat(dto.locality()).isEqualTo("Eindhoven");
        assertThat(dto.ratingCount()).isNull();
        assertThat(dto.hoursToday()).isNull();
        assertThat(dto.placeLink()).isEqualTo("https://berlage.nl");
        // mapsUrl bos → yol tarifi baglantisi turetilir (spec §5.A.6; "Yol tarifi al" olu kalmaz)
        assertThat(dto.mapsUrl())
                .isEqualTo("https://www.google.com/maps/dir/?api=1&destination=51.4412,5.4712");
    }
```

- [ ] **Step 2: FAIL doğrula** — Run: `MVN test -Dtest='FoursquareVenueProviderTest,SessionViewAssemblerTest'`
Expected: derleme/beklenti hatası.

- [ ] **Step 3: Foursquare** — Premium alanlar isteğe girmez

```java
    /**
     * Pro alanlari (spec §5.A.5, acilis maliyet modeli): `rating`, `price` ve `photos`
     * PREMIUM'du ve her aramayi pahali kiliyordu — cikarildi. Puan/fiyat/foto artik FSQ
     * oturumlarinda NULL'dur; kart "puan yok" haliyle cizilir. `categories` uyum satirini,
     * `location` semt kelimesini, `website` tek dokunusluk cikisi verir.
     */
    private static final String FIELDS =
            "fsq_place_id,name,latitude,longitude,categories,location,website";
```

Sonuç ayrıştırma bloğunu değiştir:

```java
        JSONArray results = root.getJSONArray("results");
        List<VenueCandidate> out = new ArrayList<>();
        for (int i = 0; i < results.length(); i++) {
            JSONObject r = results.getJSONObject(i);
            double lat = r.getDouble("latitude");
            double lng = r.getDouble("longitude");
            String website = r.optString("website", "");
            out.add(new VenueCandidate("foursquare", r.getString("fsq_place_id"),
                    r.getString("name"), new GeoPoint(lat, lng),
                    null, null, null,
                    "https://maps.google.com/?q=" + lat + "," + lng,
                    // FSQ tam sokak adresi Premium'da; elimizdeki tek yer kelimesi locality.
                    // address ve locality AYNI degeri tasir — UI ikisini de kart meta'sinda kullanir.
                    firstCategory(r), locality(r), locality(r), null, null,
                    website.isBlank() ? null : website));
        }
        return out;
```

Yardımcılar:

```java
    /** Ilk kategori uyum satirini besler ("Kahve icin: Coffee Shop"). */
    private static String firstCategory(JSONObject place) {
        if (!place.has("categories") || place.getJSONArray("categories").isEmpty()) {
            return null;
        }
        String name = place.getJSONArray("categories").getJSONObject(0).optString("name", "");
        return name.isBlank() ? null : name;
    }

    /**
     * Semt kelimesi: once `locality` (sehir), yoksa ilk `neighborhood`. Sokak adresi
     * ISTEMIYORUZ — kartta yer alan sey "neresi" degil "hangi semt".
     */
    private static String locality(JSONObject place) {
        if (!place.has("location")) {
            return null;
        }
        JSONObject location = place.getJSONObject("location");
        String city = location.optString("locality", "");
        if (!city.isBlank()) {
            return city;
        }
        if (location.has("neighborhood") && !location.getJSONArray("neighborhood").isEmpty()) {
            String hood = location.getJSONArray("neighborhood").getString(0);
            return hood.isBlank() ? null : hood;
        }
        return null;
    }
```

(Artık kullanılmayan `Math.round(... / 2.0 ...)` ölçekleme satırını **sil** — sağlayıcı puanlarının
karıştırılması zaten "misrepresent" riskiydi (§2); FSQ puanı hiç istenmediği için sorun kökten kalkar.)

- [ ] **Step 4: `VenueDto`** — sağlayıcı alanları

```java
    /**
     * mapsUrl: saglayici vermezse yol tarifi adresine duser (spec §5.A.6) — "Yol tarifi al"
     * butonu hicbir oturumda olu kalmaz. placeLink: mekanin kendi sayfasi (Maps ya da site).
     */
    public record VenueDto(UUID id, String name, double lat, double lng, Double rating,
                           Integer priceLevel, String photoUrl, String mapsUrl, int deckOrder,
                           Map<UUID, Integer> travelMinutes, FairnessDto fairness,
                           String provider, String category, String address, String locality,
                           Integer ratingCount, String hoursToday, String placeLink) {
    }
```

`address` tam kısa adrestir (Karar ekranı YER ekseni); `locality` **yalnız** kasaba/semt
kelimesidir (kart meta satırı, orta noktanın şehrinden farklıysa anlam taşır — spec §4.9).

- [ ] **Step 5: Assembler** — alanları taşı + fallback

```java
            return new ApiDtos.VenueDto(v.id(), v.name(), v.location().lat(), v.location().lng(),
                    v.rating(), v.priceLevel(), v.photoUrl(), directionsUrl(v), v.deckOrder(),
                    travel,
                    new ApiDtos.FairnessDto(fairness.maxMinutes(), fairness.spreadMinutes(),
                            fairness.longestParticipantId()),
                    v.provider(), v.category(), v.address(), v.locality(), v.ratingCount(),
                    v.hoursToday(), v.placeLink());
```

```java
    /** Saglayici mapsUrl vermediyse API'siz yol tarifi adresi (spec §5.A.6). */
    private static String directionsUrl(Venue v) {
        if (v.mapsUrl() != null && !v.mapsUrl().isBlank()) {
            return v.mapsUrl();
        }
        return "https://www.google.com/maps/dir/?api=1&destination="
                + v.location().lat() + "," + v.location().lng();
    }
```

(`import com.bumpinto.domain.venue.Venue;` ekle.)

- [ ] **Step 6: `ApiHappyPathTest`** — mekan gövdesinin yeni şekli; mevcut mekan assert'lerinin
yanına:

```java
        JsonNode firstVenue = view.get("venues").get(0);
        assertThat(firstVenue.get("provider").asString()).isEqualTo("foursquare");
        assertThat(firstVenue.get("mapsUrl").isNull()).isFalse();
        assertThat(firstVenue.get("fairness").get("maxMinutes").asInt()).isPositive();
```

- [ ] **Step 7: PASS doğrula** — Run: `MVN test` → `Failures: 0, Errors: 0`.

- [ ] **Step 8: Bruno** — `sessions/get-session.yml` `docs:` bloğuna ekle:

```
`venues[].provider`: `google` | `foursquare` — kart altindaki atif satirini belirler
("Google Maps" / "Powered by Foursquare"; saglayici puanlari KARISTIRILMAZ).
`venues[].category` / `address` / `ratingCount` / `hoursToday` / `placeLink`: hepsi opsiyonel;
null gelen alanin satiri UI'da HIC cizilmez.
Foursquare oturumlarinda `rating`, `priceLevel`, `photoUrl` ve `ratingCount` null'dur
(Premium alanlar acilis maliyet modelinde istenmez).
`mapsUrl` saglayici vermezse `https://www.google.com/maps/dir/?api=1&destination=lat,lng`
olarak turetilir.
```

- [ ] **Step 9: INDEX güncelle + Commit önerisi (kullanıcı)**

```
feat(provider): FSQ Pro alanlarina inis, VenueDto saglayici alanlari, mapsUrl fallback

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

---

### Task 5: Bütçe tavanları — Nearby 1.000/ay sert tavan + Place Photo 1.000 görsel/ay (TDD)

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/infra/config/AppProps.java`
- Modify: `backend/src/main/resources/application.yml`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/provider/GooglePlacesVenueProvider.java`
- Modify: `backend/src/test/java/com/bumpinto/adapter/out/provider/GooglePlacesVenueProviderTest.java`
- Modify: `backend/src/test/java/com/bumpinto/adapter/out/provider/FoursquareVenueProviderTest.java` (`props()`)
- Modify: `backend/ARCHITECTURE.md`

> **Yapılandırma adı doğrulandı:** bütçe sayacı bugün `bumpinto.quota.google-monthly-budget`
> (`AppProps.Quota.googleMonthlyBudget`) ile besleniyor ve `ProviderQuota.Source.BUDGET` üretiyor.
> **`backend/CONFIGURATION.md` YOK** (dizinde yalnız `ARCHITECTURE.md` var) — yapılandırma notu
> `ARCHITECTURE.md`'ye yazılır, yeni bir doküman açılmaz.

- [ ] **Step 1: Failing tests** — `GooglePlacesVenueProviderTest`'e ekle:

```java
    static AppProps budget(int searches, int photos) {
        return new AppProps(new AppProps.Security("cid", "secret", Duration.ofHours(12)),
                new AppProps.Providers("fsq-key", "g-key"),
                new AppProps.Cors(List.of()), new AppProps.Cookies(false, ""),
                new AppProps.RateLimit(false),
                new AppProps.Quota(Duration.ofMinutes(5), searches, photos),
                new AppProps.Geocode("ops@bumpinto.test", Duration.ZERO));
    }

    @Test
    void nearbyBudgetIsAHardCapNotJustAReport() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, NEARBY_URL)
                .thenReturn("""
                        {"places":[{"id":"g1","displayName":{"text":"Tek"},
                          "location":{"latitude":51.44,"longitude":5.47}}]}
                        """);
        GooglePlacesVenueProvider provider = new GooglePlacesVenueProvider(http, budget(1, 10),
                Clock.fixed(NOW, ZoneOffset.UTC));

        assertThat(provider.search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10))
                .hasSize(1);
        // Butce bitti: ikinci arama aga CIKMAZ, orkestrator baska saglayiciya gecsin diye
        // QuotaExceededException atilir.
        assertThatThrownBy(() -> provider.search(new GeoPoint(51.5, 5.5), 5.0,
                ActivityType.COFFEE, 10))
                .isInstanceOf(QuotaExceededException.class);
        mock.assertThat(HttpMethod.POST, NEARBY_URL).hasBeenCalledTimes(1);
        assertThat(provider.measureQuota().remaining()).isZero();
    }

    @Test
    void photoBudgetExhaustionLeavesVenuesWithoutPhotosButKeepsTheSearch() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, NEARBY_URL)
                .thenReturn("""
                        {"places":[
                          {"id":"g1","displayName":{"text":"Bir"},
                           "location":{"latitude":51.44,"longitude":5.47},
                           "photos":[{"name":"places/g1/photos/REF1"}]},
                          {"id":"g2","displayName":{"text":"Iki"},
                           "location":{"latitude":51.45,"longitude":5.48},
                           "photos":[{"name":"places/g2/photos/REF2"}]}]}
                        """);
        mock.expect(HttpMethod.GET, "https://places.googleapis.com/v1/places/g1/photos/REF1/media")
                .thenReturn("""
                        {"photoUri":"https://lh3/g1=w1000"}
                        """);
        GooglePlacesVenueProvider provider = new GooglePlacesVenueProvider(http, budget(10, 1),
                Clock.fixed(NOW, ZoneOffset.UTC));

        List<VenueCandidate> out = provider.search(new GeoPoint(51.5, 5.5), 5.0,
                ActivityType.COFFEE, 10);

        assertThat(out).hasSize(2);
        assertThat(out.get(0).photoUrl()).isEqualTo("https://lh3/g1=w1000");
        assertThat(out.get(1).photoUrl()).isNull(); // butce bitti → monogram fallback
    }
```

`FoursquareVenueProviderTest.props()` içindeki `Quota`'yı üç alanlı hâle getir:
`new AppProps.Quota(Duration.ofMinutes(5), 1000, 1000)`.

- [ ] **Step 2: FAIL doğrula** — Run: `MVN test -Dtest=GooglePlacesVenueProviderTest`
Expected: derleme hatası (`Quota` üçüncü alanı yok) ve sert tavan yok.

- [ ] **Step 3: `AppProps.Quota`**

```java
    /**
     * Saglayici kota takibi.
     *
     * @param refresh                  scheduler araligi; cache bundan tazeyse prob atilmaz
     * @param googleMonthlyBudget      Nearby Search icin SERT aylik tavan. Google'in kota
     *                                 telemetrisi yok (header yok, Cloud Monitoring gecikmeli
     *                                 ve servis hesabi ister); kota = bu butce − yerel sayac.
     *                                 Acilis modeli (spec §5.A.5): 1.000/ay = ucretsiz katman,
     *                                 sonrasi $35/1000 (maske Enterprise). Asilirsa arama
     *                                 yapilmaz, orkestrator Foursquare'e duser.
     * @param googlePhotoMonthlyBudget Place Photo medya cagrilari icin AYRI sert tavan
     *                                 (farkli SKU: 1.000 ucretsiz/ay, sonrasi $7/1000 —
     *                                 oturum basina en buyuk kalem). Bitince foto cozulmez,
     *                                 photoUrl null gelir ve kart monograma duser.
     */
    public record Quota(Duration refresh, int googleMonthlyBudget, int googlePhotoMonthlyBudget) {
    }
```

`application.yml`:

```yaml
  quota:
    refresh: ${PROVIDER_QUOTA_REFRESH:PT5M}
    # Acilis maliyet modeli (spec §5.A.5): ikisi de Google'in ucretsiz aylik katmani.
    google-monthly-budget: ${GOOGLE_MONTHLY_BUDGET:1000}
    google-photo-monthly-budget: ${GOOGLE_PHOTO_MONTHLY_BUDGET:1000}
```

- [ ] **Step 4: `GooglePlacesVenueProvider`** — iki ayrı sayaç, iki ayrı SKU

Alanlar:

```java
    private final int monthlyBudget;
    private final int photoMonthlyBudget;
    private final AtomicReference<YearMonth> period = new AtomicReference<>();
    private final AtomicLong calls = new AtomicLong();
    /** AYRI SKU: foto medya cagrilari searchNearby kotasindan sayilmaz. */
    private final AtomicLong photoCalls = new AtomicLong();
    private static final Logger log = LoggerFactory.getLogger(GooglePlacesVenueProvider.class);
```

Kurucuda: `this.photoMonthlyBudget = props.quota().googlePhotoMonthlyBudget();`

Ay dönüşü ikisini birden sıfırlasın:

```java
    @Override
    public ProviderQuota measureQuota() {
        Instant now = clock.instant();
        YearMonth month = YearMonth.from(now.atZone(ZoneOffset.UTC));
        if (!month.equals(period.getAndSet(month))) {
            calls.set(0);
            photoCalls.set(0);
        }
        long used = calls.get();
        return new ProviderQuota(ID, monthlyBudget, Math.max(0, monthlyBudget - used),
                nextMonth(month), now, ProviderQuota.Source.BUDGET);
    }
```

`search` başında sert tavan:

```java
        JSONObject body = requestBody(center, radiusKm, type, limit);
        ProviderQuota quota = measureQuota(); // ay donduyse sayaclari sifirlar
        if (quota.remaining() <= 0) {
            // Butce SERT tavandir: istek hic atilmaz, orkestrator siradaki saglayiciya gecer.
            log.info("quota {}: {}/{} (0%) resets {} [{}]", ID, 0L, monthlyBudget,
                    quota.resetAt(), ProviderQuota.Source.BUDGET);
            throw new QuotaExceededException("google nearby monthly budget spent",
                    quota.resetAt());
        }
        calls.incrementAndGet();
```

Foto bütçesi — `resolvePhotos` bütçeyi paylaştırır:

```java
    /**
     * Her mekanin ILK fotosu icin imzali CDN adresi — {@code places[i]} ile ayni sirada,
     * fotosuz/cozulemeyen/BUTCESI KALMAYAN mekanda {@code null} (istemcide monogram).
     */
    private List<String> resolvePhotos(List<JSONObject> places) {
        long remaining = Math.max(0, photoMonthlyBudget - photoCalls.get());
        List<CompletableFuture<String>> pending = new ArrayList<>(places.size());
        for (JSONObject place : places) {
            if (firstPhotoName(place) == null) {
                pending.add(CompletableFuture.completedFuture(null));
                continue;
            }
            if (remaining <= 0) {
                pending.add(CompletableFuture.completedFuture(null));
                continue;
            }
            remaining--;
            photoCalls.incrementAndGet();
            pending.add(resolveFirstPhoto(place));
        }
        long used = photoCalls.get();
        if (used >= photoMonthlyBudget) {
            log.info("quota google-photos: 0/{} (0%) — venues fall back to monogram",
                    photoMonthlyBudget);
        } else {
            log.info("quota google-photos: {}/{} ({}%)", photoMonthlyBudget - used,
                    photoMonthlyBudget,
                    Math.round((photoMonthlyBudget - used) * 100.0 / photoMonthlyBudget));
        }
        return pending.stream().map(CompletableFuture::join).toList();
    }
```

(`import org.slf4j.Logger; import org.slf4j.LoggerFactory;` ekle. Sayaç `resolveFirstPhoto`
başarısız olsa da artar: harcanan çağrı harcanmıştır — Google ücretsiz denemeyi geri vermez.)

- [ ] **Step 5: `ARCHITECTURE.md`** — "Yapılandırma" bölümüne (yoksa §7'nin altına yeni bir alt
başlık) şu tabloyu ekle:

```markdown
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
```

- [ ] **Step 6: PASS doğrula** — Run: `MVN test` → `Failures: 0, Errors: 0`.

- [ ] **Step 7: INDEX güncelle + Commit önerisi (kullanıcı)**

```
feat(quota): Nearby sert aylik tavan + ayri Place Photo butcesi, ARCHITECTURE notu

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

---

### Task 6: Kapanış — OpenAPI + `frontend/shared` codegen + Bruno + tam suite

**Files:**
- Modify: `frontend/shared/openapi.json`
- Modify: `frontend/shared/src/api-types.ts` (codegen çıktısı)
- Modify: `frontend/shared/src/api.ts`
- Modify: `backend/.infra/bumpinto-collection/**` (önceki görevlerde açılan düzenlemelerin denetimi)
- Modify: `backend/ARCHITECTURE.md` (§7 alan modeli notu)
- Modify: `docs/superpowers/plans/INDEX.md` (durum alanı; kural 9'u **orkestratör** günceller)

- [ ] **Step 1: Tam suite + ArchUnit** — Run (backend/): `MVN test`
Expected: `Tests run: N, Failures: 0, Errors: 0`; `HexagonalArchitectureTest` 4 kural yeşil
(`domain` saf: `TravelMode`, `Fairness`, `TravelMinutes`, `DeckOrdering`, `ReverseGeocodePort`
hiçbir Spring/JPA/HTTP sınıfı import etmiyor).

- [ ] **Step 2: OpenAPI + codegen** — Backend'i yerel çalıştır
(`SPRING_PROFILES_ACTIVE=local`, gerekirse `DB_URL=jdbc:postgresql://localhost:5434/bumpinto`),
sonra kökten:
`export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && rtk pnpm codegen`
Expected: `frontend/shared/src/api-types.ts` içinde **hepsi** görünür:
`TravelMode`, `FairnessDto`, `DecisionKind`, `RunoffReason`,
`SessionView.midpointLabel` / `decisionKind` / `decidedAt` / `runoffReason` / `likeCounts`,
`VenueDto.fairness` / `provider` / `category` / `address` / `ratingCount` / `hoursToday` / `placeLink`,
`ParticipantDto.travelMode`, `MeResponse.defaultTravelMode`, `UpdateMeRequest.defaultTravelMode`,
`JoinRequest.travelMode`, `LocationRequest.travelMode`, `CreateSessionRequest.travelMode`.

- [ ] **Step 3: `frontend/shared/src/api.ts`** — imzalar yeni alanları geçirebilsin:

```typescript
    join: (slug: string, body: Schemas["JoinRequest"]) =>
      http.post<JoinResponse>(`/api/sessions/${slug}/participants`, body).then((r) => r.data),
    updateLocation: (slug: string, body: Schemas["LocationRequest"]) =>
      http.put(`/api/sessions/${slug}/location`, body).then(() => undefined),
    updateMe: (body: Schemas["UpdateMeRequest"]) =>
      http.put<MeResponse>("/api/me", body).then((r) => r.data),
```

(Var olan imzalar zaten `Schemas[...]` kullanıyorsa dokunma — yalnız elle yazılmış gövde tipleri
varsa `Schemas[...]`'a çevir.)

Expected: `rtk pnpm --filter @bumpinto/web exec tsc --noEmit` yeşil (yeni alanların hepsi
opsiyonel/okunur; W-6 bunları kullanmaya başlayana kadar web derlemesi kırılmaz).

- [ ] **Step 4: Bruno koleksiyonu denetimi** — Run (backend/):
`rtk grep -rn "travelMode\|fairness\|decisionKind\|midpointLabel\|likeCounts" .infra/bumpinto-collection`
Expected: Task 1b/1c/2b/3/4b'de belirtilen dosyaların hepsi eşleşiyor:
`sessions/create-session.yml`, `sessions/get-session.yml`, `sessions/find-venues.yml`,
`sessions/shuffle.yml`, `sessions/force-decision.yml`, `participants/join-session.yml`,
`participants/update-location.yml`, `deck/runoff-vote.yml`, `me/get-me.yml`, `me/update-me.yml`.
Eksik varsa **şimdi** yaz — `seq` sırasını bozma, `docs:` bloğu olmadan istek bırakma.

- [ ] **Step 5: Bruno uçtan uca koşusu** — local ortamda sırayla:
`google-login → create-session (travelMode:BIKE) → join-session (travelMode:EBIKE) →
find-venues → get-session (midpointLabel + fairness + deckOrder) → shuffle → swipe → deck-done →
runoff-vote → get-session (voteTally + likeCounts)`.
Expected: her istek kendi `tests` bloğunu geçer; `get-session` RUNOFF'ta `voteTally` boş,
DECIDED'da dolu ve `likeCounts` dolu.

- [ ] **Step 6: `ARCHITECTURE.md` §7** — "Alan modeli özeti" bölümünü bu planın başındaki blokla
güncelle (TravelMode, Fairness, DeckOrdering, DecisionKind, RunoffReason, yeni Venue alanları) ve
son güncelleme tarihini `2026-09-03` yap.

- [ ] **Step 7: INDEX'te B-7 `done` + Commit önerisi (kullanıcı)**

```
docs(api): openapi + shared codegen + bruno koleksiyonu (B-7 adalet/ulasim turu)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

---

## Plan sonu doğrulaması

- [ ] `MVN test` → tüm testler yeşil, `HexagonalArchitectureTest` 4 kural yeşil.
- [ ] `V5__fairness_travel_mode.sql` tek migration; `SchemaMigrationTest` 12 yeni kolonu görüyor;
      `participants.travel_mode` varsayılanı `'CAR'` ve `not null`.
- [ ] İki kişilik oturumda (A e-bisiklet, B araba) `GET /api/sessions/{slug}` → orta nokta A'ya
      yakın, iki kişinin `travelMinutes` değerleri **eşit** (5 dk yuvarlamayla).
- [ ] `venues[]` sırası adalet öncelikli; aynı oturum iki kez okunduğunda **aynı** sıra; `shuffle`
      sırayı bozmuyor.
- [ ] `travelMinutes` konumu olan **herkes** için dolu (viewer dahil) ve hepsi yuvarlanmış konumdan;
      aynı ~1 km kutusundaki iki farklı koordinat aynı dakikayı veriyor.
- [ ] RUNOFF yanıtında `voteTally` boş, `runoffVotedParticipantIds` dolu, `viewer.runoffVoteVenueId`
      yalnız kendi seçimi; gövdede `runoffVotes` dizesi **yok**.
- [ ] DECIDED yanıtında `decisionKind`, `decidedAt`, `likeCounts` dolu; runoff'tan gelindiyse
      `runoffReason` korunuyor.
- [ ] Kesişim runoff'unda finalist sayısı ≤ 4; beraberlik **puanla** kırılıyor (kural değişmedi).
- [ ] `midpointLabel` find-venues'te bir kez çözülüyor, ikinci çağrı ağ isteği atmıyor,
      çözülemezse null ve akış sürüyor.
- [ ] Google maskesi beş yeni alanı istiyor; `businessStatus != OPERATIONAL` mekanlar deste'ye
      girmiyor; `placeLink` boşsa place-id arama adresine düşüyor.
- [ ] Foursquare isteğinde `rating`/`price`/`photos` **yok**; FSQ mekanlarında bu üçü null.
- [ ] `mapsUrl` boş gelen mekanda API yol tarifi adresi döndürüyor ("Yol tarifi al" ölü değil).
- [ ] Nearby bütçesi bitince istek atılmıyor (`QuotaExceededException`); foto bütçesi bitince
      `photoUrl` null, arama sürüyor; `quota …` log satırları mevcut biçimle uyumlu.
- [ ] `frontend/shared` codegen güncel; web `tsc --noEmit` yeşil.
- [ ] Bruno'da 10 güncellenmiş istek; koleksiyon local'de baştan sona koşuyor.
- [ ] Spec §5.A kalemleri 1–7 kapandı; §5.A.8 (Clarity/GA4 üç olay) **bu planın dışında** — W-6/I-1.

---

## Öz-denetim (spec §4 / §5.A karşılaştırması)

| Spec kalemi | Nerede kapandı | Not |
|---|---|---|
| §4.1 Adalet metriği (minimax + fark) | Task 1c `Fairness` | Ekrandaki sayı `spreadMinutes`, sıra + rozet ikisi |
| §4.2 Tek rozet kuralı | Task 1c `FairnessDto` | Eşik (10 dk) ve metin **UI'da** (W-6); backend sayıyı verir |
| §4.3 TravelChips (herkes görünür) | Task 1c assembler | `travelMinutes` konumu olan herkes için dolu |
| §4.4 Gizlilik (yuvarlanmış konum, viewer dahil) | Task 1c `TravelMinutes` | Tek kod yolu; regresyon testi var |
| §4.5 Adalet öncelikli sıra | Task 1c `DeckOrdering` | "5 dk bandı" → eşit (max, fark) çifti; gerekçe kodda |
| §4.5b Ulaşım türü + ağırlıklı orta nokta | Task 1a + 1b | Eşit-süre özellik testi; elle konum ve geç katılan CAR |
| §4.6 Uyum satırı (kategori) | Task 4a/4b `category` | "beklenen küme dışı → amber" kuralı UI'da (W-6) |
| §4.9 "Açık" gösterilmez, veri gelince saat | Task 4a `hoursToday` | Ham metin saklanır; biçimlendirme UI'da |
| §5.A.1 Assembler dakika + adalet util'i | Task 1c | — |
| §5.A.2 decisionKind/decidedAt/runoffReason/likeCounts | Task 2a + 2b | — |
| §5.A.3 Oy gizliliği + finalist tavanı 4 | Task 2a + 2b | `runoffVotes` zaten B-5'te kapanmıştı; regresyon testi eklendi |
| §5.A.4 midpointLabel + Nominatim | Task 3 | Atıf borcu W-6a.9'a bağlandı |
| §5.A.5 Sağlayıcı alanları + açılış maliyet modeli | Task 4a + 4b + 5 | — |
| §5.A.6 mapsUrl fallback | Task 4b assembler | — |
| §5.A.7 travelMode + centroid + deckOrder | Task 1a/1b/1c | — |

**Koda oturtulamayan kalemler (bilerek dışarıda):**

1. **§5.A.3'ün "DecisionEngine sıralaması beğeni → adalet → puan" cümlesi.** Karar motoru
   (`DecisionEngine`) yalnız `likeCounts` ve `venueRatings` alıyor; adalet ise katılımcı konumu +
   ulaşım modu gerektiriyor ve `domain/deck` bunları görmüyor. Spec **§4.5** aynı konuda "karar
   motoru beraberliği spec'teki gibi **puanla** kırar" diyor — iki cümle çelişiyor, §4.5 daha yeni
   (2026-09-03 revizyonu) ve daha açık. **Karar (koordinatör, 2026-09-03): §4.5 kazanır** —
   beraberlik **puanla** kırılır, adalet yalnız **sırayı** belirler; doküman düzeltmesi
   koordinatörde. Bu plan başka bir iş çıkarmaz.
2. **§5.A.8 (Clarity/GA4 üç olay: "Haritada gör" dokunuşu, Maps JS yüklemesi, aşama geçişi).**
   Backend'de karşılığı yok — olaylar istemcide üretilir; iz W-6 / I-1.
3. **§7.2 "Belli bir nokta" modu (çapa konum).** Kullanıcı kararı hâlâ açık ("alanlar B-7'de mi?"),
   verilen görev listesinde yok; şema ve akış etkisi (yarıçap, adalet rozetlerinin kapanması)
   ayrı bir tasarım turu ister. Bu plan **kapsamına almadı** — INDEX'e aday olarak yazılmalı.
4. **Katılımcı `locationLabel`'ının sunucuya taşınması.** Spec §5.A.4 yalnız orta nokta etiketini
   istiyor ("istemci Nominatim'i bırakır" cümlesi orta nokta bağlamında); katılımcı etiketi hâlâ
   Katıl formundan geliyor. Task 3'te açıkça not edildi, K-B görevi.
5. **Foto önbelleği / carousel'in "30 gün cache" varsayımı (§7.5, §8).** Hukuki okuma kullanıcıda;
   bu plan yalnız **bütçeyi** sınırlıyor (Task 5), önbellek politikasına dokunmuyor.

**Yer tutucu taraması:** planda `TBD`, `...`, "benzer şekilde", "vs." ile geçiştirilen kod adımı
yok; her `Files:` yolu mutlak repo yolu; her adımda `Run` + `Expected` var; tüm commit satırları
"Commit önerisi (kullanıcı)" biçiminde ve `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`
ile bitiyor.

**Tip tutarlılığı:** `TravelMode` (domain) → `ApiDtos` alanlarında **aynı enum** kullanılıyor
(codegen string birleşimi üretir); `Fairness` (domain) ile `FairnessDto` (web) alan adları birebir;
`DecisionKind`/`RunoffReason` domain enum'ları doğrudan `SessionView`'da; `likeCounts` ve
`voteTally` ikisi de `Map<UUID, Long>`; `travelMinutes` `Map<UUID, Integer>` (dakika tam sayı);
`ratingCount` `Integer` (null olabilir) ↔ `rating_count int`; `hoursToday`/`category`/`address`/
`placeLink` `String` ↔ `text`; `decidedAt` `Instant` ↔ `timestamptz`.
