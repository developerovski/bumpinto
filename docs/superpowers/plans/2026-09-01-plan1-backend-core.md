# Plan 1: Backend İskelet + Alan Çekirdeği + Karar Motoru

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Boot eden bir Spring Boot uygulaması + test edilmiş saf alan çekirdeği (geo hesapları, karar motoru) + Flyway ile kurulmuş Postgres şeması.

**Architecture:** DDD + hexagonal (ports & adapters). Bu planda saf domain çekirdeği — `com.bumpinto.domain.geo` ve `com.bumpinto.domain.deck` (framework importu yasak, ArchUnit zorlar) — + uygulama iskeleti + DB şeması. Application/adapter katmanları Plan 2'de. Spec: `docs/superpowers/specs/2026-08-31-bumpinto-mvp-design.md` (§3 geo, §4 karar motoru, §5 veri modeli).

**Tech Stack:** Java 21, Spring Boot 4.1.0 (Maven), PostgreSQL 16, Flyway, JUnit 5 + AssertJ, Testcontainers, ArchUnit. Plan 2+: Spring Security, Unirest.

---

## Bu plana özel kurallar (AGENTS.md uyarlaması)

- **INDEX güncelle:** göreve başlarken ve her görev sonunda
  `docs/superpowers/plans/INDEX.md` içindeki bu planın satırını güncelle
  (Durum / Son adım / Not). Kurallar INDEX.md'nin başında.
- **Git yazma işlemi YOK.** Ajan `git add/commit` ÇALIŞTIRMAZ. Her görevin sonundaki
  "Commit (kullanıcı)" adımında dur, kullanıcıya önerilen mesajı bildir, onun commit
  etmesini bekle (veya onayıyla atla).
- **Komutlar rtk ile:** `mvn`, `docker` komutlarını `rtk` önekiyle çalıştır
  (ör. `rtk mvn -q test`). Hook zaten yeniden yazıyorsa dokunma.
- Aksi belirtilmedikçe tüm `mvn` komutları `backend/` dizininden çalıştırılır.

## Mimari kararlar (bağlayıcı — kullanıcı talimatı, 2026-09-01)

- **Spring Boot 4.x** — yazım anında 4.1.0; kurulum sırasında en güncel 4.x patch'i
  kullan. Boot 4 notu: `spring-boot-starter-web` deprecated — yerine
  `spring-boot-starter-webmvc` (bu planın pom'u zaten öyle).
- **DDD + Hexagonal (ports & adapters).** Hedef paket düzeni:

```text
com.bumpinto
├── domain            → saf çekirdek: value object'ler, domain service'ler,
│                       port arayüzleri. Spring/Jakarta/JPA importu YASAK
│                       (ArchUnit zorlar — Task 8). Bu planda: domain.geo, domain.deck
├── application       → use case servisleri, transaction sınırı        (Plan 2)
├── adapter
│   ├── in.web        → REST controller + STOMP                        (Plan 2)
│   └── out
│       ├── persistence → JPA/JDBC adaptörleri                         (Plan 2)
│       └── provider    → Foursquare/Google adaptörleri (Unirest)      (Plan 2)
└── infra             → konfigürasyon, güvenlik                        (Plan 2)
```

  Bağımlılık yönü daima içeri: `adapter → application → domain`. Asla tersi.
- **Dış HTTP: Unirest** (`com.konghq:unirest-java-core`) — yalnızca
  `adapter.out.provider` içinde yaşar, domain'e sızmaz. (Not: Spring'in yerleşik
  standardı RestClient'tır; Unirest bilinçli kullanıcı kararıdır.) Plan 2'de eklenir —
  bu planda dış HTTP çağrısı yok, YAGNI.
- **Güvenlik: Spring Security** — Plan 2'de: Google Sign-In JWT doğrulaması +
  katılımcı token filtresi; tüm uçlar varsayılan kilitli, public uçlar açıkça
  `permitAll`. Bu planda HTTP ucu olmadığı için henüz eklenmez.
- **Clean code:** AGENTS.md bağlayıcı — küçük odaklı sınıflar, açık adlandırma, kısa
  yorum, GOD class yasak. Domain kodu immutable (record), sessiz fallback yerine
  exception.

## Ön koşullar (kullanıcı hazırlar)

- [ ] Repo git değilse: kullanıcı `git init` yapar (ajan yapamaz).
- [ ] Java 21 (`java -version`), Maven 3.9+ (`mvn -version`), Docker (Testcontainers için) kurulu.

---

### Task 1: Maven iskeleti + boot smoke testi

**Files:**
- Create: `backend/pom.xml`
- Create: `backend/.gitignore`
- Create: `backend/src/main/java/com/bumpinto/BumpintoApplication.java`
- Create: `backend/src/main/resources/application.yml`
- Test: `backend/src/test/java/com/bumpinto/ApplicationSmokeTest.java`

- [x] **Step 1: pom.xml'i yaz**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>4.1.0</version>
    <relativePath/>
  </parent>

  <groupId>com.bumpinto</groupId>
  <artifactId>backend</artifactId>
  <version>0.1.0-SNAPSHOT</version>
  <name>bumpinto-backend</name>

  <properties>
    <java.version>21</java.version>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-webmvc</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-test</artifactId>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
      </plugin>
    </plugins>
  </build>
</project>
```

- [x] **Step 2: .gitignore'u yaz**

```gitignore
target/
.idea/
*.iml
.DS_Store
```

- [x] **Step 3: Uygulama sınıfını yaz**

```java
package com.bumpinto;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BumpintoApplication {

    public static void main(String[] args) {
        SpringApplication.run(BumpintoApplication.class, args);
    }
}
```

- [x] **Step 4: application.yml'i yaz**

```yaml
spring:
  application:
    name: bumpinto-backend

server:
  port: 8080
```

- [x] **Step 5: Smoke testi yaz**

```java
package com.bumpinto;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class ApplicationSmokeTest {

    @Test
    void contextLoads() {
    }
}
```

- [x] **Step 6: Testi çalıştır**

Run: `rtk mvn -q test`
Expected: `BUILD SUCCESS`, `Tests run: 1, Failures: 0`

- [ ] **Step 7: Commit (kullanıcı)**

Önerilen mesaj: `feat(backend): spring boot iskeleti ve smoke test`

---

### Task 2: GeoPoint + haversine mesafe (TDD)

**Files:**
- Create: `backend/src/main/java/com/bumpinto/domain/geo/GeoPoint.java`
- Create: `backend/src/main/java/com/bumpinto/domain/geo/GeoMath.java`
- Test: `backend/src/test/java/com/bumpinto/domain/geo/GeoMathTest.java`

Not: koordinat alan adları DB şemasıyla tutarlı olsun diye `lat` / `lng` (lon değil).

- [x] **Step 1: Failing testi yaz**

```java
package com.bumpinto.domain.geo;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class GeoMathTest {

    // Kurucu hikaye: 's-Hertogenbosch <-> Someren
    static final GeoPoint DEN_BOSCH = new GeoPoint(51.6978, 5.3037);
    static final GeoPoint SOMEREN = new GeoPoint(51.3855, 5.7120);

    @Test
    void distanceBetweenDenBoschAndSomerenIsAbout45Km() {
        double km = GeoMath.distanceKm(DEN_BOSCH, SOMEREN);
        assertThat(km).isCloseTo(44.8, org.assertj.core.data.Offset.offset(0.5));
    }

    @Test
    void distanceToSelfIsZero() {
        assertThat(GeoMath.distanceKm(DEN_BOSCH, DEN_BOSCH)).isCloseTo(0.0,
                org.assertj.core.data.Offset.offset(1e-9));
    }
}
```

- [x] **Step 2: Testin FAIL ettiğini doğrula**

Run: `rtk mvn -q test -Dtest=GeoMathTest`
Expected: derleme hatası — `cannot find symbol: class GeoPoint` (sınıflar henüz yok). Bu beklenen kırmızı.

- [x] **Step 3: Minimal implementasyonu yaz**

`GeoPoint.java`:

```java
package com.bumpinto.domain.geo;

public record GeoPoint(double lat, double lng) {

    public GeoPoint {
        if (lat < -90 || lat > 90) {
            throw new IllegalArgumentException("lat out of range: " + lat);
        }
        if (lng < -180 || lng > 180) {
            throw new IllegalArgumentException("lng out of range: " + lng);
        }
    }
}
```

`GeoMath.java`:

```java
package com.bumpinto.domain.geo;

import java.util.List;

public final class GeoMath {

    private static final double EARTH_RADIUS_KM = 6371.0;

    private GeoMath() {
    }

    public static double distanceKm(GeoPoint a, GeoPoint b) {
        double dLat = Math.toRadians(b.lat() - a.lat());
        double dLng = Math.toRadians(b.lng() - a.lng());
        double lat1 = Math.toRadians(a.lat());
        double lat2 = Math.toRadians(b.lat());
        double h = Math.pow(Math.sin(dLat / 2), 2)
                + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(dLng / 2), 2);
        return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
    }
}
```

- [x] **Step 4: Testin PASS ettiğini doğrula**

Run: `rtk mvn -q test -Dtest=GeoMathTest`
Expected: `Tests run: 2, Failures: 0`

- [ ] **Step 5: Commit (kullanıcı)**

Önerilen mesaj: `feat(geo): GeoPoint ve haversine mesafe`

---

### Task 3: Küresel centroid (TDD)

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/domain/geo/GeoMath.java` (metot ekle)
- Test: `backend/src/test/java/com/bumpinto/domain/geo/GeoMathTest.java` (test ekle)

- [x] **Step 1: Failing testleri GeoMathTest'e ekle**

```java
    @Test
    void centroidOfTwoPointsIsNearArithmeticMidpointForSmallSpans() {
        GeoPoint c = GeoMath.centroid(java.util.List.of(DEN_BOSCH, SOMEREN));
        assertThat(c.lat()).isCloseTo(51.5417, org.assertj.core.data.Offset.offset(0.01));
        assertThat(c.lng()).isCloseTo(5.5079, org.assertj.core.data.Offset.offset(0.01));
    }

    @Test
    void centroidOfSinglePointIsItself() {
        GeoPoint c = GeoMath.centroid(java.util.List.of(DEN_BOSCH));
        assertThat(c.lat()).isCloseTo(DEN_BOSCH.lat(), org.assertj.core.data.Offset.offset(1e-9));
        assertThat(c.lng()).isCloseTo(DEN_BOSCH.lng(), org.assertj.core.data.Offset.offset(1e-9));
    }

    @Test
    void centroidOfEmptyListThrows() {
        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> GeoMath.centroid(java.util.List.of()))
                .isInstanceOf(IllegalArgumentException.class);
    }
```

- [x] **Step 2: FAIL doğrula**

Run: `rtk mvn -q test -Dtest=GeoMathTest`
Expected: derleme hatası — `cannot find symbol: method centroid`

- [x] **Step 3: centroid metodunu GeoMath'e ekle**

```java
    public static GeoPoint centroid(List<GeoPoint> points) {
        if (points == null || points.isEmpty()) {
            throw new IllegalArgumentException("points must not be empty");
        }
        double x = 0;
        double y = 0;
        double z = 0;
        for (GeoPoint p : points) {
            double lat = Math.toRadians(p.lat());
            double lng = Math.toRadians(p.lng());
            x += Math.cos(lat) * Math.cos(lng);
            y += Math.cos(lat) * Math.sin(lng);
            z += Math.sin(lat);
        }
        int n = points.size();
        x /= n;
        y /= n;
        z /= n;
        double lng = Math.atan2(y, x);
        double hyp = Math.sqrt(x * x + y * y);
        double lat = Math.atan2(z, hyp);
        return new GeoPoint(Math.toDegrees(lat), Math.toDegrees(lng));
    }
```

- [x] **Step 4: PASS doğrula**

Run: `rtk mvn -q test -Dtest=GeoMathTest`
Expected: `Tests run: 5, Failures: 0`

- [ ] **Step 5: Commit (kullanıcı)**

Önerilen mesaj: `feat(geo): kuresel centroid`

---

### Task 4: Arama yarıçapı + genişletme politikası (TDD)

**Files:**
- Create: `backend/src/main/java/com/bumpinto/domain/geo/SearchRadius.java`
- Test: `backend/src/test/java/com/bumpinto/domain/geo/SearchRadiusTest.java`

Politika (spec §3 "Coğrafi hesaplar" maddesini somutlar):
taban = clamp(0.25 × merkeze-en-uzak-katılımcı-km, 1, 10); genişletme attempt∈{0..3} için taban×2^attempt, mutlak tavan 40 km.

- [x] **Step 1: Failing testi yaz**

```java
package com.bumpinto.domain.geo;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SearchRadiusTest {

    static final GeoPoint DEN_BOSCH = new GeoPoint(51.6978, 5.3037);
    static final GeoPoint SOMEREN = new GeoPoint(51.3855, 5.7120);

    @Test
    void baseRadiusIsQuarterOfMaxDistanceToCentroid() {
        GeoPoint centroid = GeoMath.centroid(List.of(DEN_BOSCH, SOMEREN));
        double base = SearchRadius.baseKm(List.of(DEN_BOSCH, SOMEREN), centroid);
        // iki nokta ~44.8 km; merkeze uzaklık ~22.4; 0.25x = ~5.6
        assertThat(base).isCloseTo(5.6, org.assertj.core.data.Offset.offset(0.2));
    }

    @Test
    void baseRadiusHasFloorOfOneKm() {
        GeoPoint centroid = GeoMath.centroid(List.of(DEN_BOSCH));
        assertThat(SearchRadius.baseKm(List.of(DEN_BOSCH), centroid)).isEqualTo(1.0);
    }

    @Test
    void baseRadiusIsCappedAtTenKm() {
        GeoPoint groningen = new GeoPoint(53.2194, 6.5665); // Den Bosch'a ~180 km
        GeoPoint centroid = GeoMath.centroid(List.of(DEN_BOSCH, groningen));
        assertThat(SearchRadius.baseKm(List.of(DEN_BOSCH, groningen), centroid)).isEqualTo(10.0);
    }

    @Test
    void expansionDoublesPerAttemptAndIsCappedAtForty() {
        assertThat(SearchRadius.expandedKm(5.0, 0)).isEqualTo(5.0);
        assertThat(SearchRadius.expandedKm(5.0, 1)).isEqualTo(10.0);
        assertThat(SearchRadius.expandedKm(5.0, 2)).isEqualTo(20.0);
        assertThat(SearchRadius.expandedKm(5.0, 3)).isEqualTo(40.0);
        assertThat(SearchRadius.expandedKm(10.0, 3)).isEqualTo(40.0); // 80 -> 40 tavan
    }

    @Test
    void expansionAttemptOutOfRangeThrows() {
        assertThatThrownBy(() -> SearchRadius.expandedKm(5.0, 4))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SearchRadius.expandedKm(5.0, -1))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
```

- [x] **Step 2: FAIL doğrula**

Run: `rtk mvn -q test -Dtest=SearchRadiusTest`
Expected: derleme hatası — `cannot find symbol: class SearchRadius`

- [x] **Step 3: Implementasyonu yaz**

```java
package com.bumpinto.domain.geo;

import java.util.List;

public final class SearchRadius {

    static final double MIN_KM = 1.0;
    static final double BASE_MAX_KM = 10.0;
    static final double ABSOLUTE_MAX_KM = 40.0;
    static final int MAX_EXPANSIONS = 3;
    private static final double SPREAD_FACTOR = 0.25;

    private SearchRadius() {
    }

    public static double baseKm(List<GeoPoint> participants, GeoPoint centroid) {
        double maxDist = participants.stream()
                .mapToDouble(p -> GeoMath.distanceKm(p, centroid))
                .max()
                .orElseThrow(() -> new IllegalArgumentException("participants must not be empty"));
        return clamp(maxDist * SPREAD_FACTOR, MIN_KM, BASE_MAX_KM);
    }

    public static double expandedKm(double baseKm, int attempt) {
        if (attempt < 0 || attempt > MAX_EXPANSIONS) {
            throw new IllegalArgumentException("attempt must be in 0.." + MAX_EXPANSIONS);
        }
        return Math.min(baseKm * Math.pow(2, attempt), ABSOLUTE_MAX_KM);
    }

    private static double clamp(double value, double lo, double hi) {
        return Math.max(lo, Math.min(hi, value));
    }
}
```

- [x] **Step 4: PASS doğrula**

Run: `rtk mvn -q test -Dtest=SearchRadiusTest`
Expected: `Tests run: 5, Failures: 0`

- [ ] **Step 5: Commit (kullanıcı)**

Önerilen mesaj: `feat(geo): arama yaricapi ve genisletme politikasi`

---

### Task 5: Yol süresi heuristiği (TDD)

**Files:**
- Create: `backend/src/main/java/com/bumpinto/domain/geo/TravelEstimate.java`
- Test: `backend/src/test/java/com/bumpinto/domain/geo/TravelEstimateTest.java`

Heuristik (spec §3): yol km = kuş uçuşu × 1.3; süre = yol km / 72 km/s (NL şehirlerarası ortalama). Dış API yok.

- [x] **Step 1: Failing testi yaz**

```java
package com.bumpinto.domain.geo;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TravelEstimateTest {

    @Test
    void thirtyOnePointFiveCrowKmBecomesFortyOneRoadKmAndThirtyFourMinutes() {
        TravelEstimate e = TravelEstimate.fromCrowKm(31.5);
        assertThat(e.roadKm()).isEqualTo(41.0);   // 31.5 * 1.3 = 40.95 -> 41.0 (1 ondalik)
        assertThat(e.minutes()).isEqualTo(34);    // 40.95 / 72 * 60 = 34.1 -> 34
    }

    @Test
    void zeroDistanceIsZeroMinutes() {
        TravelEstimate e = TravelEstimate.fromCrowKm(0);
        assertThat(e.roadKm()).isEqualTo(0.0);
        assertThat(e.minutes()).isEqualTo(0);
    }

    @Test
    void negativeDistanceThrows() {
        assertThatThrownBy(() -> TravelEstimate.fromCrowKm(-1))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
```

- [x] **Step 2: FAIL doğrula**

Run: `rtk mvn -q test -Dtest=TravelEstimateTest`
Expected: derleme hatası — `cannot find symbol: class TravelEstimate`

- [x] **Step 3: Implementasyonu yaz**

```java
package com.bumpinto.domain.geo;

public record TravelEstimate(int minutes, double roadKm) {

    private static final double ROAD_FACTOR = 1.3;
    private static final double AVG_SPEED_KMH = 72.0;

    public static TravelEstimate fromCrowKm(double crowKm) {
        if (crowKm < 0) {
            throw new IllegalArgumentException("crowKm must be >= 0");
        }
        double road = crowKm * ROAD_FACTOR;
        int minutes = (int) Math.round(road / AVG_SPEED_KMH * 60);
        return new TravelEstimate(minutes, Math.round(road * 10) / 10.0);
    }
}
```

- [x] **Step 4: PASS doğrula**

Run: `rtk mvn -q test -Dtest=TravelEstimateTest`
Expected: `Tests run: 3, Failures: 0`

- [ ] **Step 5: Commit (kullanıcı)**

Önerilen mesaj: `feat(geo): yol suresi heuristigi`

---

### Task 6: Karar motoru (TDD) — spec §4'ün kalbi

**Files:**
- Create: `backend/src/main/java/com/bumpinto/domain/deck/ParticipantLikes.java`
- Create: `backend/src/main/java/com/bumpinto/domain/deck/DeckOutcome.java`
- Create: `backend/src/main/java/com/bumpinto/domain/deck/DecisionEngine.java`
- Test: `backend/src/test/java/com/bumpinto/domain/deck/DecisionEngineTest.java`

Kurallar (spec §4): yalnızca desteyi bitirenler sayılır; kesişim 1 → Decided;
kesişim 2+ → Runoff (beğeni sayısı, sonra rating'e göre sıralı); kesişim 0 →
en çok beğenilen 3 mekan Runoff'a (hiç beğeni yoksa NoLikes). Plan kararı:
fallback tek adaya inerse runoff anlamsız → doğrudan Decided.

- [x] **Step 1: Domain tiplerini yaz (test bunlara derleniyor)**

`ParticipantLikes.java`:

```java
package com.bumpinto.domain.deck;

import java.util.Set;
import java.util.UUID;

public record ParticipantLikes(UUID participantId, boolean deckDone, Set<UUID> likedVenueIds) {
}
```

`DeckOutcome.java`:

```java
package com.bumpinto.domain.deck;

import java.util.List;
import java.util.UUID;

public sealed interface DeckOutcome {

    record Decided(UUID venueId) implements DeckOutcome {
    }

    record Runoff(List<UUID> venueIds) implements DeckOutcome {
    }

    record NoLikes() implements DeckOutcome {
    }
}
```

- [x] **Step 2: Failing testi yaz**

```java
package com.bumpinto.domain.deck;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DecisionEngineTest {

    static final UUID V1 = UUID.fromString("00000000-0000-0000-0000-000000000001");
    static final UUID V2 = UUID.fromString("00000000-0000-0000-0000-000000000002");
    static final UUID V3 = UUID.fromString("00000000-0000-0000-0000-000000000003");
    static final UUID V4 = UUID.fromString("00000000-0000-0000-0000-000000000004");

    static final Map<UUID, Double> RATINGS = Map.of(V1, 4.0, V2, 4.5, V3, 4.9, V4, 3.0);

    final DecisionEngine engine = new DecisionEngine();

    static ParticipantLikes done(Set<UUID> likes) {
        return new ParticipantLikes(UUID.randomUUID(), true, likes);
    }

    static ParticipantLikes notDone(Set<UUID> likes) {
        return new ParticipantLikes(UUID.randomUUID(), false, likes);
    }

    @Test
    void singleCommonVenueIsDecidedWithoutRunoff() {
        DeckOutcome out = engine.decide(List.of(
                done(Set.of(V1, V2)),
                done(Set.of(V1, V3)),
                done(Set.of(V1))), RATINGS);
        assertThat(out).isEqualTo(new DeckOutcome.Decided(V1));
    }

    @Test
    void multipleCommonVenuesGoToRunoffOrderedByLikesThenRating() {
        // V1 ve V2 kesisimde (2'ser begeni); esitligi rating kirar: V2 (4.5) > V1 (4.0)
        DeckOutcome out = engine.decide(List.of(
                done(Set.of(V1, V2)),
                done(Set.of(V1, V2, V3))), RATINGS);
        assertThat(out).isEqualTo(new DeckOutcome.Runoff(List.of(V2, V1)));
    }

    @Test
    void emptyIntersectionFallsBackToTopThreeByLikesThenRating() {
        // begeniler: V1=2, V2=2, V3=1, V4=1; kesisim bos
        DeckOutcome out = engine.decide(List.of(
                done(Set.of(V1, V2, V3)),
                done(Set.of(V1, V2, V4)),
                done(Set.of())), RATINGS);
        // siralama: V2(2,4.5), V1(2,4.0), V3(1,4.9) — V4(1,3.0) elenir
        assertThat(out).isEqualTo(new DeckOutcome.Runoff(List.of(V2, V1, V3)));
    }

    @Test
    void unfinishedParticipantsAreIgnored() {
        DeckOutcome out = engine.decide(List.of(
                done(Set.of(V1)),
                done(Set.of(V1)),
                notDone(Set.of(V4))), RATINGS);
        assertThat(out).isEqualTo(new DeckOutcome.Decided(V1));
    }

    @Test
    void noLikesAtAllYieldsNoLikes() {
        DeckOutcome out = engine.decide(List.of(
                done(Set.of()),
                done(Set.of())), RATINGS);
        assertThat(out).isEqualTo(new DeckOutcome.NoLikes());
    }

    @Test
    void fallbackWithSingleCandidateIsDecidedNotRunoff() {
        // kesisim bos ({V1} n {} = {}), toplamda tek aday V1 -> dogrudan karar
        DeckOutcome out = engine.decide(List.of(
                done(Set.of(V1)),
                done(Set.of())), RATINGS);
        assertThat(out).isEqualTo(new DeckOutcome.Decided(V1));
    }

    @Test
    void noFinishedParticipantThrows() {
        assertThatThrownBy(() -> engine.decide(List.of(notDone(Set.of(V1))), RATINGS))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
```

- [x] **Step 3: FAIL doğrula**

Run: `rtk mvn -q test -Dtest=DecisionEngineTest`
Expected: derleme hatası — `cannot find symbol: class DecisionEngine`

- [x] **Step 4: DecisionEngine'i yaz**

```java
package com.bumpinto.domain.deck;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

public final class DecisionEngine {

    public static final int FALLBACK_RUNOFF_SIZE = 3;

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
            return new DeckOutcome.Decided(intersection.iterator().next());
        }
        if (intersection.size() >= 2) {
            return new DeckOutcome.Runoff(intersection.stream().sorted(byLikesThenRating).toList());
        }

        List<UUID> top = likeCounts.keySet().stream()
                .sorted(byLikesThenRating)
                .limit(FALLBACK_RUNOFF_SIZE)
                .toList();
        if (top.isEmpty()) {
            return new DeckOutcome.NoLikes();
        }
        if (top.size() == 1) {
            return new DeckOutcome.Decided(top.get(0));
        }
        return new DeckOutcome.Runoff(top);
    }
}
```

- [x] **Step 5: PASS doğrula**

Run: `rtk mvn -q test -Dtest=DecisionEngineTest`
Expected: `Tests run: 7, Failures: 0`

- [x] **Step 6: Tüm testleri çalıştır**

Run: `rtk mvn -q test`
Expected: `Tests run: 21, Failures: 0` (1 smoke + 5 geo + 5 radius + 3 travel + 7 engine)

- [ ] **Step 7: Commit (kullanıcı)**

Önerilen mesaj: `feat(deck): karar motoru — kesisim/runoff/fallback kurallari`

---

### Task 7: Flyway şeması + Testcontainers boot testi

**Files:**
- Modify: `backend/pom.xml` (bağımlılık ekle)
- Modify: `backend/src/main/resources/application.yml` (datasource)
- Create: `backend/src/main/resources/db/migration/V1__init.sql`
- Create: `docker-compose.yml` (repo kökü — lokal geliştirme DB'si)
- Delete: `backend/src/test/java/com/bumpinto/ApplicationSmokeTest.java` (DB'siz boot artık mümkün değil; yerine aşağıdaki test geçiyor)
- Test: `backend/src/test/java/com/bumpinto/SchemaMigrationTest.java`

- [x] **Step 1: pom.xml'e bağımlılıkları ekle** (`<dependencies>` içine)

```xml
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-jdbc</artifactId>
    </dependency>
    <dependency>
      <groupId>org.flywaydb</groupId>
      <artifactId>flyway-core</artifactId>
    </dependency>
    <dependency>
      <groupId>org.flywaydb</groupId>
      <artifactId>flyway-database-postgresql</artifactId>
    </dependency>
    <dependency>
      <groupId>org.postgresql</groupId>
      <artifactId>postgresql</artifactId>
      <scope>runtime</scope>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-testcontainers</artifactId>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.testcontainers</groupId>
      <artifactId>junit-jupiter</artifactId>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.testcontainers</groupId>
      <artifactId>postgresql</artifactId>
      <scope>test</scope>
    </dependency>
```

- [x] **Step 2: application.yml'e datasource ekle** (dosyanın tam yeni hali)

```yaml
spring:
  application:
    name: bumpinto-backend
  datasource:
    url: ${DB_URL:jdbc:postgresql://localhost:5432/bumpinto}
    username: ${DB_USER:bumpinto}
    password: ${DB_PASSWORD:bumpinto}
  flyway:
    enabled: true

server:
  port: 8080
```

- [x] **Step 3: V1__init.sql'i yaz** (spec §5 veri modeli; katılımcı konumu nullable — linke tıklayıp konum vermemiş "Bekliyor" durumu için)

```sql
create table users (
    id            uuid primary key,
    email         text        not null unique,
    name          text        not null,
    auth_provider text        not null,
    created_at    timestamptz not null default now()
);

create table sessions (
    id            uuid primary key,
    slug          text        not null unique,
    host_id       uuid        not null references users (id),
    activity_type text        not null,
    status        text        not null,
    expires_at    timestamptz not null,
    created_at    timestamptz not null default now()
);

create table participants (
    id           uuid primary key,
    session_id   uuid        not null references sessions (id) on delete cascade,
    display_name text        not null,
    lat          double precision,
    lng          double precision,
    token        text        not null unique,
    joined_at    timestamptz not null default now(),
    deck_done_at timestamptz
);

create table venues (
    id          uuid primary key,
    session_id  uuid             not null references sessions (id) on delete cascade,
    provider    text             not null,
    external_id text             not null,
    name        text             not null,
    lat         double precision not null,
    lng         double precision not null,
    rating      numeric(2, 1),
    price_level smallint,
    photo_url   text,
    maps_url    text,
    deck_order  int              not null,
    unique (session_id, external_id),
    unique (session_id, deck_order)
);

create table swipes (
    session_id     uuid        not null references sessions (id) on delete cascade,
    venue_id       uuid        not null references venues (id) on delete cascade,
    participant_id uuid        not null references participants (id) on delete cascade,
    liked          boolean     not null,
    swiped_at      timestamptz not null default now(),
    primary key (venue_id, participant_id)
);

create table votes (
    session_id     uuid        not null references sessions (id) on delete cascade,
    venue_id       uuid        not null references venues (id) on delete cascade,
    participant_id uuid        not null references participants (id) on delete cascade,
    voted_at       timestamptz not null default now(),
    primary key (session_id, participant_id)
);

create index idx_participants_session on participants (session_id);
create index idx_venues_session on venues (session_id);
create index idx_swipes_session on swipes (session_id);
```

- [x] **Step 4: docker-compose.yml'i repo köküne yaz**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: bumpinto
      POSTGRES_USER: bumpinto
      POSTGRES_PASSWORD: bumpinto
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

- [x] **Step 5: Eski smoke testi sil, yeni boot+şema testini yaz**

`ApplicationSmokeTest.java` dosyasını sil. Yerine:

```java
package com.bumpinto;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Testcontainers
class SchemaMigrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void flywayCreatesAllSixTables() {
        List<String> tables = jdbc.queryForList(
                "select table_name from information_schema.tables where table_schema = 'public'",
                String.class);
        assertThat(tables).contains("users", "sessions", "participants", "venues", "swipes", "votes");
    }
}
```

- [x] **Step 6: Testleri çalıştır (Docker açık olmalı)**

Run: `rtk mvn -q test`
Expected: `BUILD SUCCESS`; `SchemaMigrationTest` dahil tüm testler geçer. İlk çalıştırma postgres imajını çeker (yavaş olabilir).

- [ ] **Step 7: Lokal boot'u elle doğrula (opsiyonel ama önerilir)**

Run (repo kökünden): `rtk docker compose up -d postgres`
Run (backend/ içinden): `rtk mvn -q spring-boot:run`
Expected: log'da `Successfully applied 1 migration` ve `Started BumpintoApplication`. Ctrl+C ile durdur.

- [ ] **Step 8: Commit (kullanıcı)**

Önerilen mesaj: `feat(db): flyway v1 semasi + testcontainers boot testi`

---

### Task 8: ArchUnit — hexagonal bağımlılık koruması

**Files:**
- Modify: `backend/pom.xml` (bağımlılık ekle)
- Test: `backend/src/test/java/com/bumpinto/HexagonalArchitectureTest.java`

- [x] **Step 1: pom.xml'e ArchUnit'i ekle** (`<dependencies>` içine)

```xml
    <dependency>
      <groupId>com.tngtech.archunit</groupId>
      <artifactId>archunit-junit5</artifactId>
      <version>1.4.0</version>
      <scope>test</scope>
    </dependency>
```

- [x] **Step 2: Mimari kural testini yaz**

```java
package com.bumpinto;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

@AnalyzeClasses(packages = "com.bumpinto", importOptions = ImportOption.DoNotIncludeTests.class)
class HexagonalArchitectureTest {

    @ArchTest
    static final ArchRule domainIsPure = classes()
            .that().resideInAPackage("com.bumpinto.domain..")
            .should().onlyDependOnClassesThat()
            .resideInAnyPackage("com.bumpinto.domain..", "java..");

    @ArchTest
    static final ArchRule domainHasNoFrameworkDependency = noClasses()
            .that().resideInAPackage("com.bumpinto.domain..")
            .should().dependOnClassesThat()
            .resideInAnyPackage("org.springframework..", "jakarta..", "kong.unirest..");
}
```

- [x] **Step 3: Testin PASS ettiğini doğrula**

Run: `rtk mvn -q test -Dtest=HexagonalArchitectureTest`
Expected: `Tests run: 2, Failures: 0`

- [x] **Step 4: Korumanın gerçekten çalıştığını kanıtla (kırmızıyı gör)**

`DecisionEngine.decide` metodunun ilk satırına geçici olarak şunu ekle:

```java
        Class<?> ignored = org.springframework.boot.SpringApplication.class;
```

Run: `rtk mvn -q test -Dtest=HexagonalArchitectureTest`
Expected: FAIL — `domainHasNoFrameworkDependency` kuralı ihlali raporlar.

Satırı sil, tekrar çalıştır: PASS.

- [ ] **Step 5: Commit (kullanıcı)**

Önerilen mesaj: `test(arch): archunit ile hexagonal bagimlilik korumasi`

---

## Plan sonu doğrulaması

- [x] `rtk mvn -q test` → tümü yeşil (`BUILD SUCCESS`)
- [x] Spec eşlemesi: §3 geo hesapları → Task 2-5; §4 karar motoru → Task 6; §5 veri modeli → Task 7; hexagonal koruma → Task 8. REST/servis/Unirest sağlayıcıları/Spring Security/STOMP bilinçli olarak Plan 2'de.
- [ ] Kullanıcıya bildir: Plan 1 bitti, Plan 2 (application + adapter katmanları: API, Spring Security, Unirest provider'lar, realtime) yazılmaya hazır.
