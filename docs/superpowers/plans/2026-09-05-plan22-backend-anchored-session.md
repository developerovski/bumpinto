# B-10 — Çapalı oturum (backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Host, oturumun merkezini katılımcı orta noktası yerine sabit bir çapaya (ör.
Amsterdam) bağlayabilsin; çapalı oturumda katılımcı konumu isteğe bağlı olsun.

**Architecture:** Merkez bugün `DeckFlow` ve `SessionViewAssembler`'da ayrı ayrı hesaplanıyor.
Yeni `domain/geo/SessionCenter` bu kopyayı tek fonksiyonda birleştirir ve çapayı orada karara
bağlar. `Session` tek nullable `GeoPoint anchor` alanı büyür; çapa varsa merkez odur, yarıçap
sabittir ve `find-venues`'un "≥2 konumlu katılımcı" önkoşulu kendiliğinden düşer.

**Tech Stack:** Java 25, Spring Boot 4.1, Flyway, Hibernate Validator, JUnit 5 + AssertJ,
Testcontainers (Postgres), ArchUnit.

**Kaynak spec:** [2026-09-05-anchored-session-design.md](../specs/2026-09-05-anchored-session-design.md)

---

## Yürütme grupları

Maven **tüm main kaynaklarını** derler: bir tip değişirse hiçbir test koşmaz. Bu yüzden
görevler klasik TDD sırasında değil, **derlemesi yeşil kalan gruplar** hâlinde yürütülür.
Grup içindeki adımlar sırayla; grup sonunda tam test koşusu.

| Grup | Görev | Neden bu sınır |
|---|---|---|
| **G1** | T1, T2 | `Session`'a alan eklemek `toSession` ve 4 wither'ı aynı anda kırar; şema ile entity aynı commit'te olmalı. Kolaylık ctor'u 10 argümanda **kalır** → 17 test çağrı yeri hiç dokunulmadan derlenir. |
| **G2** | T3 | `SessionCenter` saf ekleme; kimse çağırmıyor. Tek başına yeşil. |
| **G3** | T4 | `SessionCenter` iki çağrı yerine adapte edilir. **Davranış aynı kalmalı** (çapa hep null) — mevcut testler bu refactor'ın güvenlik ağı. |
| **G4** | T5, T6, T7 | DTO + doğrulama + controller + commands tek commit: `createSession` imzası değişince `SessionController` ve çağıran testler aynı anda kırılır. |
| **G5** | T8 | Okuma tarafı: `anchored`, tam koordinat, sabit yarıçap. |
| **G6** | T9, T10 | Deste tarafı: önkoşul kalkar, sıra puana geçer, etiket ikinci kez çözülmez. |
| **G7** | T11 | Bruno + ARCHITECTURE.md. |

> **Test sayısını kontrol et, `BUILD SUCCESS`e güvenme.** Bir test dosyası bozulup içi
> boşalsa bile derlenir ve build yeşil raporlar (W-8 dersi). Her grup sonunda koşulan
> testin **sayısını** bir önceki grupla karşılaştır.

**Başlangıç referansı:** `mvn -o clean test` → 286 test, BUILD SUCCESS.

---

## Dosya haritası

**Oluşturulacak**
- `backend/src/main/java/com/bumpinto/domain/geo/SessionCenter.java` — merkezin TEK kaynağı
- `backend/src/test/java/com/bumpinto/domain/geo/SessionCenterTest.java`
- `backend/src/main/resources/db/migration/V9__anchor.sql`

**Değişecek**
- `domain/session/Session.java` — `GeoPoint anchor` (15. bileşen), 4 wither
- `adapter/out/persistence/SessionEntity.java` — `anchorLat`/`anchorLng`
- `adapter/out/persistence/SessionStoreAdapter.java` — `saveSession` + `toSession`
- `adapter/in/web/ApiDtos.java` — `AnchorDto`, `CreateSessionRequest`, `SessionView.anchored`
- `adapter/in/web/SessionController.java` — nullable konum + çapa eşlemesi
- `application/session/SessionCommands.java` — `Anchor` param nesnesi, tam ctor
- `adapter/in/web/SessionViewAssembler.java` — `SessionCenter` + `anchored` + tam koordinat
- `application/deck/DeckFlow.java` — `SessionCenter`, `deckOrder`, etiket koşulu
- `backend/ARCHITECTURE.md`
- `backend/.infra/bumpinto-collection/sessions/create-session.yml`
- `src/test/java/com/bumpinto/domain/session/SessionTest.java`
- `src/test/java/com/bumpinto/ApiHappyPathTest.java`

---

# G1 — Alan ve şema

### Task 1: `Session.anchor` + wither korunumu

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/domain/session/Session.java`
- Test: `backend/src/test/java/com/bumpinto/domain/session/SessionTest.java`

- [ ] **Step 1: Önce kırılan testi yaz** (`SessionTest.java`, sınıfın sonuna ekle)

`sample(...)` yardımcısı 10 argümanlı kolaylık ctor'unu kullanıyor ve o **değişmiyor**;
çapalı örnek için tam ctor'la ayrı bir yardımcı gerekiyor.

```java
    private static Session anchored(GeoPoint anchor) {
        return new Session(UUID.randomUUID(), "abc123", UUID.randomUUID(), "Cuma kahvesi",
                List.of(ActivityType.COFFEE), SessionType.GROUP, SessionStatus.COLLECTING,
                Instant.parse("2026-09-05T10:00:00Z"), null, List.of(),
                null, null, null, "Amsterdam", anchor);
    }

    /** 4 wither de anchor'i elle tasiyor: biri unutulursa capa sessizce duser.
        `withStatus` find-venues'te aramadan HEMEN once cagriliyor — dusen anchor,
        oturumu sessizce orta nokta moduna geri atardi. */
    @Test
    void witherOperationsPreserveAnchor() {
        GeoPoint anchor = new GeoPoint(52.3676, 4.9041);
        Session session = anchored(anchor);
        UUID venue = UUID.randomUUID();
        assertThat(session.withStatus(SessionStatus.SUGGESTING).anchor()).isEqualTo(anchor);
        assertThat(session.withMidpointLabel("Utrecht").anchor()).isEqualTo(anchor);
        assertThat(session.inRunoff(List.of(venue), RunoffReason.INTERSECTION).anchor())
                .isEqualTo(anchor);
        assertThat(session.decided(venue, DecisionKind.FORCED, Instant.now()).anchor())
                .isEqualTo(anchor);
    }

    /** Kolaylik ctor'u capasiz oturum uretir — 17 mevcut cagri yeri bu yuzden derlenir. */
    @Test
    void convenienceConstructorLeavesAnchorNull() {
        assertThat(sample(List.of(ActivityType.COFFEE)).anchor()).isNull();
    }
```

Dosyanın import bloğuna ekle:

```java
import com.bumpinto.domain.geo.GeoPoint;
```

- [ ] **Step 2: Derlenmediğini gör**

Run: `cd backend && mvn -o -q test-compile`
Expected: FAIL — `constructor Session cannot be applied to given types` (15 argüman verildi,
14 bekleniyor) ve `cannot find symbol: method anchor()`.

- [ ] **Step 3: `Session`'a alanı ekle**

`Session.java`'yı şu hâle getir (yalnız gösterilen satırlar değişiyor):

```java
public record Session(UUID id, String slug, UUID hostId, String name,
                      List<ActivityType> activityTypes,
                      SessionType sessionType, SessionStatus status, Instant expiresAt,
                      UUID decidedVenueId, List<UUID> runoffVenueIds,
                      /** Karar ani; DECIDED disinda null. */
                      Instant decidedAt, DecisionKind decisionKind, RunoffReason runoffReason,
                      /** Merkezin adi; capasizsa find-venues'te, capaliysa olusturmada yazilir. */
                      String midpointLabel,
                      /** Host'un sabit bulusma noktasi; null ise orta nokta modu. */
                      GeoPoint anchor) {
```

Import ekle: `import com.bumpinto.domain.geo.GeoPoint;`

Kolaylık ctor'u **10 argümanda kalır**, yeni alan için `null` geçer:

```java
    /** Eski imza: karar meta'si, merkez etiketi ve capa henuz yok. */
    public Session(UUID id, String slug, UUID hostId, String name,
                   List<ActivityType> activityTypes,
                   SessionType sessionType, SessionStatus status, Instant expiresAt,
                   UUID decidedVenueId, List<UUID> runoffVenueIds) {
        this(id, slug, hostId, name, activityTypes, sessionType, status, expiresAt, decidedVenueId,
                runoffVenueIds, null, null, null, null, null);
    }
```

Dört wither'ın hepsine `anchor` eklenir:

```java
    public Session withStatus(SessionStatus newStatus) {
        return new Session(id, slug, hostId, name, activityTypes, sessionType, newStatus,
                expiresAt, decidedVenueId, runoffVenueIds, decidedAt, decisionKind, runoffReason,
                midpointLabel, anchor);
    }

    public Session withMidpointLabel(String label) {
        return new Session(id, slug, hostId, name, activityTypes, sessionType, status, expiresAt,
                decidedVenueId, runoffVenueIds, decidedAt, decisionKind, runoffReason, label,
                anchor);
    }

    /** runoffReason KORUNUR: "runoff'tan cikan karar" izini karar sonrasi da anlatir. */
    public Session decided(UUID venueId, DecisionKind kind, Instant when) {
        Objects.requireNonNull(kind, "kind");
        Objects.requireNonNull(when, "when");
        return new Session(id, slug, hostId, name, activityTypes, sessionType,
                SessionStatus.DECIDED, expiresAt, venueId, runoffVenueIds, when, kind,
                runoffReason, midpointLabel, anchor);
    }

    public Session inRunoff(List<UUID> venueIds, RunoffReason reason) {
        Objects.requireNonNull(reason, "reason");
        return new Session(id, slug, hostId, name, activityTypes, sessionType,
                SessionStatus.RUNOFF, expiresAt, null, List.copyOf(venueIds), null, null, reason,
                midpointLabel, anchor);
    }
```

- [ ] **Step 4: Hâlâ derlenmediğini gör — `toSession` kaldı**

Run: `cd backend && mvn -o -q test-compile`
Expected: FAIL, tek hata — `SessionStoreAdapter.java:145` `constructor Session cannot be
applied to given types`. Bu Task 2'de kapanır; T1 ve T2 aynı commit'e gider.

---

### Task 2: Kalıcılık — `anchor_lat`/`anchor_lng` ve V9

**Files:**
- Create: `backend/src/main/resources/db/migration/V9__anchor.sql`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/SessionEntity.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/SessionStoreAdapter.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/out/persistence/StoreAdapterTest.java`

- [ ] **Step 1: Göç dosyasını yaz**

`V9__anchor.sql`:

```sql
alter table sessions add column anchor_lat double precision;
alter table sessions add column anchor_lng double precision;

-- Yarim capa (biri dolu biri bos) domain'de GeoPoint ile imkansiz; kisit ayni degismezi
-- son katmanda da kilitler.
alter table sessions add constraint anchor_both_or_neither
  check ((anchor_lat is null) = (anchor_lng is null));
```

- [ ] **Step 2: Entity'ye alanları ekle**

`SessionEntity.java` — `String midpointLabel;` satırının altına:

```java
    Double anchorLat;
    Double anchorLng;
```

- [ ] **Step 3: Adapter'ın iki yönünü de yaz**

`SessionStoreAdapter.saveSession` içinde `e.midpointLabel = s.midpointLabel();` satırının
altına:

```java
        e.anchorLat = s.anchor() == null ? null : s.anchor().lat();
        e.anchorLng = s.anchor() == null ? null : s.anchor().lng();
```

`toSession` içinde `return new Session(...)` çağrısını şu hâle getir:

```java
        GeoPoint anchor = e.anchorLat == null ? null : new GeoPoint(e.anchorLat, e.anchorLng);
        return new Session(e.id, e.slug, e.hostId, e.name, activities,
                SessionType.valueOf(e.sessionType), SessionStatus.valueOf(e.status), e.expiresAt,
                e.decidedVenueId, runoff, e.decidedAt,
                e.decisionKind == null ? null : DecisionKind.valueOf(e.decisionKind),
                e.runoffReason == null ? null : RunoffReason.valueOf(e.runoffReason),
                e.midpointLabel, anchor);
```

`GeoPoint` importu dosyada zaten var.

- [ ] **Step 4: Gidiş-dönüş testini yaz** (`StoreAdapterTest.java`, sınıfın sonuna)

```java
    /** Capa yazilip okunur; yarim capa domain'de zaten uretilemez (GeoPoint), kisit son kapi. */
    @Test
    void anchorSurvivesRoundTrip() {
        GeoPoint anchor = new GeoPoint(52.3676, 4.9041);
        Session saved = sessions.saveSession(new Session(UUID.randomUUID(), "anchor1",
                UUID.randomUUID(), "Amsterdam kahvesi", List.of(ActivityType.COFFEE),
                SessionType.GROUP, SessionStatus.COLLECTING,
                Instant.now().plus(Duration.ofHours(24)), null, List.of(),
                null, null, null, "Amsterdam", anchor));

        Session read = sessions.sessionBySlug(saved.slug()).orElseThrow();
        assertThat(read.anchor()).isEqualTo(anchor);
        assertThat(read.midpointLabel()).isEqualTo("Amsterdam");
    }

    /** Capasiz oturum null okur — "0,0" gibi bir yalan koordinat uretilmez. */
    @Test
    void missingAnchorReadsBackAsNull() {
        Session saved = sessions.saveSession(new Session(UUID.randomUUID(), "anchor0",
                UUID.randomUUID(), "Orta nokta", List.of(ActivityType.COFFEE),
                SessionType.GROUP, SessionStatus.COLLECTING,
                Instant.now().plus(Duration.ofHours(24)), null, List.of()));

        assertThat(sessions.sessionBySlug(saved.slug()).orElseThrow().anchor()).isNull();
    }
```

Gerekirse import ekle: `import com.bumpinto.domain.geo.GeoPoint;`,
`import java.time.Duration;`, `import java.time.Instant;`.

- [ ] **Step 5: G1'i koş**

Run: `cd backend && mvn -o clean test`
Expected: PASS, **289 test** (286 + `witherOperationsPreserveAnchor`,
`convenienceConstructorLeavesAnchorNull`, `anchorSurvivesRoundTrip`,
`missingAnchorReadsBackAsNull` = 290; sayı 290 çıkmalı).

> Sayı 290 değilse dur ve neden fazladan/eksik test olduğunu bul — devam etme.

- [ ] **Step 6: Commit (T1 + T2 birlikte)**

```
feat(session): sessions can carry a fixed anchor point

Session gains a nullable GeoPoint anchor (15th component) plus V9 columns
with a both-or-neither check constraint. The 10-arg convenience constructor
keeps its arity so existing call sites compile untouched.
```

---

# G2 — Merkezin tek kaynağı

### Task 3: `SessionCenter`

**Files:**
- Create: `backend/src/main/java/com/bumpinto/domain/geo/SessionCenter.java`
- Create: `backend/src/test/java/com/bumpinto/domain/geo/SessionCenterTest.java`

- [ ] **Step 1: Önce testi yaz**

`SessionCenterTest.java`:

```java
package com.bumpinto.domain.geo;

import com.bumpinto.domain.session.Participant;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class SessionCenterTest {

    private static Participant at(double lat, double lng) {
        return new Participant(UUID.randomUUID(), UUID.randomUUID(), "Ali",
                new GeoPoint(lat, lng), false, null, false, null, TravelMode.CAR, null);
    }

    /** Capa varsa merkez ODUR: katilimcilar nerede olursa olsun cekmez. */
    @Test
    void anchorWinsOverParticipants() {
        GeoPoint amsterdam = new GeoPoint(52.3676, 4.9041);
        SessionCenter center = SessionCenter.of(amsterdam,
                List.of(at(51.6978, 5.3037), at(51.3855, 5.7120)));

        assertThat(center.point()).isEqualTo(amsterdam);
        assertThat(center.anchored()).isTrue();
    }

    /** Capali yaricap SABIT: yayilim kurali capayi 40 km'ye kadar sisirirdi. */
    @Test
    void anchoredRadiusIsFixedRegardlessOfSpread() {
        GeoPoint amsterdam = new GeoPoint(52.3676, 4.9041);
        SessionCenter near = SessionCenter.of(amsterdam,
                List.of(at(52.36, 4.90), at(52.37, 4.91)));
        SessionCenter far = SessionCenter.of(amsterdam,
                List.of(at(50.85, 4.35), at(53.22, 6.57)));

        assertThat(near.radiusKm()).isEqualTo(far.radiusKm());
    }

    /** Capa yoksa bugunku kural: agirlikli centroid + yayilim yaricapi. */
    @Test
    void withoutAnchorFallsBackToWeightedCentroid() {
        List<Participant> located = List.of(at(51.0, 5.0), at(52.0, 5.0));
        SessionCenter center = SessionCenter.of(null, located);

        assertThat(center.anchored()).isFalse();
        assertThat(center.point().lat()).isBetween(51.4, 51.6);
        assertThat(center.radiusKm()).isPositive();
    }

    /** Capa yok + 2'den az konum = merkez YOK. Cagiran bunu 409'a cevirir. */
    @Test
    void withoutAnchorAndTooFewLocationsReturnsNull() {
        assertThat(SessionCenter.of(null, List.of())).isNull();
        assertThat(SessionCenter.of(null, List.of(at(51.0, 5.0)))).isNull();
    }

    /** Capali oturum HIC konum olmadan da merkeze sahiptir — onkosul boylece duser. */
    @Test
    void anchoredCenterExistsWithNoParticipants() {
        SessionCenter center = SessionCenter.of(new GeoPoint(52.3676, 4.9041), List.of());

        assertThat(center).isNotNull();
        assertThat(center.anchored()).isTrue();
    }
}
```

- [ ] **Step 2: Testin derlenmediğini gör**

Run: `cd backend && mvn -o -q test-compile`
Expected: FAIL — `cannot find symbol: class SessionCenter`.

- [ ] **Step 3: `SessionCenter`'ı yaz**

```java
package com.bumpinto.domain.geo;

import com.bumpinto.domain.session.Participant;

import java.util.List;

/**
 * Oturumun merkezi ve arama yaricapi — TEK kaynak. Once DeckFlow ve SessionViewAssembler
 * ayni hesabi kopyalayarak yapiyordu; capa iki yere birden eklenseydi ayrisma riski ikiye
 * cikardi.
 */
public record SessionCenter(GeoPoint point, double radiusKm, boolean anchored) {

    /**
     * Capali oturumun sabit yaricapi. Capa bir YER'dir, bir uzlasma degil: yayilim kurali
     * ("en uzak katilimcinin ceyregi") Amsterdam capasi + daginik katilimcilarda tabani
     * 10 km'ye cakip 40 km'ye kadar genisletirdi. Kirsal capada mekan cikmazsa
     * {@link SearchRadius#expandedKm} zaten x2 aciyor.
     */
    static final double ANCHOR_RADIUS_KM = 2.0;

    /** Capa varsa o; yoksa >=2 konumlu katilimcinin agirlikli centroid'i; ikisi de yoksa null. */
    public static SessionCenter of(GeoPoint anchor, List<Participant> located) {
        if (anchor != null) {
            return new SessionCenter(anchor, ANCHOR_RADIUS_KM, true);
        }
        if (located.size() < 2) {
            return null;
        }
        List<GeoPoint> points = located.stream().map(Participant::location).toList();
        // Hiza TERS agirlik (spec §4.5b): yavas gelen orta noktayi kendine ceker.
        GeoPoint center = GeoMath.centroid(points,
                located.stream().map(p -> p.travelMode().weight()).toList());
        return new SessionCenter(center, SearchRadius.baseKm(points, center), false);
    }
}
```

- [ ] **Step 4: Testleri koş**

Run: `cd backend && mvn -o clean test`
Expected: PASS, **295 test** (290 + 5 yeni).

- [ ] **Step 5: ArchUnit'in itiraz etmediğini doğrula**

`domain.geo` → `domain.session` yönü yeni değil (`TravelMinutes.byParticipant` aynısını
yapıyor), ama kural dosyası değişmiş olabilir.

Run: `cd backend && mvn -o test -Dtest=ArchitectureTest`
Expected: PASS. Kırmızıysa DUR — `SessionCenter.of` `List<GeoPoint>` + `List<Double>` alan
bir imzaya çevrilir ve ağırlık hesabı çağıranda kalır; plan notu güncellenir.

- [ ] **Step 6: Commit**

```
feat(geo): add SessionCenter as the single source of session center

Anchor wins; otherwise the weighted centroid with the spread radius; null
when neither is available. Not wired in yet.
```

---

# G3 — Kopyayı sil

### Task 4: `SessionCenter`'ı iki çağrı yerine adapte et

Bu görev **davranış değiştirmez** — çapa hâlâ hiçbir yerde set edilmiyor. Mevcut testler
refactor'ın güvenlik ağıdır; sayı düşerse veya kırmızı çıkarsa refactor yanlıştır.

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/SessionViewAssembler.java:39-50`
- Modify: `backend/src/main/java/com/bumpinto/application/deck/DeckFlow.java:85-94`

- [ ] **Step 1: `SessionViewAssembler.toView` başını değiştir**

`List<Participant> located = ...` satırından sonraki blok şu olur:

```java
        // Orta nokta ONCE: katilimci satirlarindaki midpointMinutes buna dayanir.
        SessionCenter center = SessionCenter.of(snap.session().anchor(), located);
        ApiDtos.GeoPointDto midpoint = center == null ? null : approx(center.point());
        Double radiusKm = center == null ? null : Math.round(center.radiusKm() * 10) / 10.0;
        GeoPoint midpointFor = center == null ? null : center.point();
```

`GeoMath` ve `SearchRadius` importları bu dosyada başka kullanılmıyorsa silinir;
`import com.bumpinto.domain.geo.SessionCenter;` eklenir.

> Bu adımda `anchored` dalı **yok**: çapa hep null olduğu için `approx` davranışı bugünküyle
> birebir aynı. Tam koordinat T8'de gelir.

- [ ] **Step 2: `DeckFlow.findVenues` başını değiştir**

`List<Participant> located = geometryPopulation(session.id());` satırından sonraki blok:

```java
        SessionCenter center = SessionCenter.of(session.anchor(), located);
        if (center == null) {
            throw new ConflictException("need at least 2 participants with location");
        }
        store.saveSession(session.withStatus(SessionStatus.SUGGESTING));

        List<VenueCandidate> found = List.of();
        for (int attempt = 0; attempt <= SearchRadius.MAX_EXPANSIONS; attempt++) {
            found = provider.search(center.point(),
                    SearchRadius.expandedKm(center.radiusKm(), attempt),
                    session.activityTypes(), DECK_MAX);
            if (found.size() >= DECK_MIN) {
                break;
            }
        }
```

Eski `if (located.size() < 2) throw ...`, `List<GeoPoint> points = ...`,
`GeoPoint center = GeoMath.centroid(...)` ve `double baseKm = ...` satırları silinir.

Aşağıdaki `geocoder.label(center)` çağrısı `geocoder.label(center.point())` olur.

`import com.bumpinto.domain.geo.SessionCenter;` eklenir; `GeoMath` importu artık
kullanılmıyorsa silinir.

- [ ] **Step 3: Davranışın değişmediğini kanıtla**

Run: `cd backend && mvn -o clean test`
Expected: PASS, **295 test** — G2 ile AYNI sayı, sıfır yeni test. Yeni test eklenmedi çünkü
bu bir refactor; davranışı zaten mevcut `DeckFlowTest` ve `SessionViewAssemblerTest`
koruyor.

> Sayı 295'ten farklıysa ya da herhangi bir test kırmızıysa refactor davranışı değiştirmiş
> demektir. Devam etme, farkı bul.

- [ ] **Step 4: Commit**

```
refactor(geo): route DeckFlow and SessionViewAssembler through SessionCenter

Removes the duplicated weighted-centroid + radius computation. No behaviour
change: anchor is still always null.
```

---

# G4 — API yüzeyi

### Task 5: `AnchorDto` + `CreateSessionRequest` çapraz doğrulaması

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/ApiDtos.java:41-59`
- Test: `backend/src/test/java/com/bumpinto/ApiHappyPathTest.java`

- [ ] **Step 1: Önce doğrulama testini yaz** (`ApiHappyPathTest.java`, yeni `@Test`)

Bu test **R1'in kapısı**: Hibernate Validator'ın record gövdesindeki `@AssertTrue`
getter'ını gerçekten tarayıp taramadığını ölçer.

```java
    /** Konum da capa da yoksa 400. R1: bu test Hibernate Validator'in record uzerinde
        @AssertTrue getter'ini tariyor olmasina BAGLI — kirmizi kalirsa yedek yol
        SessionCommands icinde acik kontroldur (plan T5 Step 5). */
    @Test
    void createWithoutLocationOrAnchorIsRejected() throws Exception {
        when(googleVerifier.verify("gid")).thenReturn(
                new GoogleIdVerifier.GoogleUser("sub-1", "a@b.c", "Mehmet", null));
        String loginBody = mvc.perform(post("/api/auth/google")
                        .contentType(JSON).content("{\"idToken\":\"gid\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String accessToken = json.readTree(loginBody).get("accessToken").asString();

        mvc.perform(post("/api/sessions")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(JSON)
                        .content("{\"activityTypes\":[\"COFFEE\"],\"displayName\":\"Mehmet\"}"))
                .andExpect(status().isBadRequest());
    }

```

> Uçtan uca çapalı akış (201 + `anchored:true`) **G5'te** yazılır (T7 Step 6). Bilerek
> kırmızı bir test commit etmiyoruz: her grup kendi içinde tam yeşil kapanır.

- [ ] **Step 2: Testin kırmızı olduğunu gör**

Run: `cd backend && mvn -o test -Dtest=ApiHappyPathTest`
Expected: FAIL — `createWithoutLocationOrAnchorIsRejected` 400 yerine 500 alır
(`request.lat()` null → `new GeoPoint(null, null)` unboxing NPE).

- [ ] **Step 3: `AnchorDto` ve `CreateSessionRequest`'i yaz**

`ApiDtos.java` içinde `CreateSessionRequest`'in HEMEN ÜSTÜNE:

```java
    /**
     * Host'un sabit bulusma noktasi. Lat/lng birlikte zorunlu — yarim capa yok.
     * {@code label} istemcinin Nominatim'den okudugu ad; sunucu ikinci kez cozmez.
     */
    public record AnchorDto(@NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
                            @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng,
                            @Size(max = 80) String label) {
    }
```

`CreateSessionRequest`'i şu hâle getir:

```java
    public record CreateSessionRequest(
                                       /**
                                        * 1-3 ilgi alani, TEKRARSIZ; siralama host'un secim
                                        * sirasidir. Tekrar serbest birakilsaydi cache anahtari
                                        * "COFFEE+COFFEE" olur ve ayni arama ikinci kez satin
                                        * alinirdi — Places butcesi bu isin ana kisiti.
                                        */
                                       @NotEmpty @Size(max = 3) @UniqueElements
                                       List<ActivityType> activityTypes,
                                       @Size(max = 60) String name,
                                       /** null → GROUP (M-1 mobil istemcisi alani gondermez). */
                                       SessionType sessionType,
                                       /** Capa varsa opsiyonel; bkz. {@link #isOriginPresent()}. */
                                       @DecimalMin("-90") @DecimalMax("90") Double lat,
                                       @DecimalMin("-180") @DecimalMax("180") Double lng,
                                       @NotBlank @Size(max = 40) String displayName,
                                       @Size(max = 80) String locationLabel,
                                       /** null → CAR (spec §4.5b varsayilani). */
                                       TravelMode travelMode,
                                       /** null → orta nokta modu (bugunku davranis). */
                                       @Valid AnchorDto anchor) {

        /**
         * Konum ya da capa: ikisinden biri sart. Capali oturumda host kendi konumunu
         * vermeyebilir (isteyen verir, yol suresi ona gosterilir); capasiz oturumda merkez
         * konumlardan turedigi icin host konumu zorunludur.
         */
        @AssertTrue(message = "either location or anchor is required")
        public boolean isOriginPresent() {
            return (lat != null && lng != null) || anchor != null;
        }
    }
```

Import ekle: `import jakarta.validation.constraints.AssertTrue;`

- [ ] **Step 4: Sadece doğrulama testini koş**

Run: `cd backend && mvn -o test -Dtest=ApiHappyPathTest#createWithoutLocationOrAnchorIsRejected`
Expected: PASS (400). T6'daki controller değişikliği olmadan bile 400 dönmeli — doğrulama
controller gövdesinden ÖNCE çalışır.

- [ ] **Step 5: Kırmızıysa yedek yola geç (R1)**

Test hâlâ 500 veriyorsa Hibernate Validator record getter'ını taramıyor demektir. O
zaman `@AssertTrue` metodunu **sil** ve `SessionCommands.createSession`'ın ilk satırına
açık kontrolü koy:

```java
        // @AssertTrue record uzerinde islemedi (R1): dogrulama uygulama katmanina duser.
        // IllegalArgumentException BILEREK secildi — ApiExceptionHandler onu 400'e esliyor
        // ("deger nesnelerinin reddettigi girdi bozuk ISTEKTIR"), yani ayri bir istisna
        // sinifi acmaya gerek yok.
        if (hostLocation == null && anchor == null) {
            throw new IllegalArgumentException("either location or anchor is required");
        }
```

`application/error/` altında `ValidationException` **yoktur** ve açılmaz: 400 yolu
`ApiExceptionHandler.badRequest(IllegalArgumentException)` üzerinden zaten var. Bu yola
düşülürse bu plan dosyasına not düşülür.

---

### Task 6: `SessionCommands.Anchor` + controller eşlemesi

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/application/session/SessionCommands.java:54-68`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/SessionController.java:60-66`

- [ ] **Step 1: `SessionCommands`'a param nesnesi ve alan yazımını ekle**

`CreateSessionResult` record'unun yanına:

```java
    /**
     * Host'un sabit bulusma noktasi; null ise orta nokta modu. Nokta ve etiket TEK nesnede:
     * ayri iki parametre olsalardi "koordinat var, ad yok" hali sessizce olusabilirdi ve
     * createSession zaten 8 parametreli.
     */
    public record Anchor(GeoPoint point, String label) {
    }
```

`createSession` imzası ve gövdesi:

```java
    @Transactional
    public CreateSessionResult createSession(UUID hostUserId, String name,
                                             List<ActivityType> types,
                                             SessionType sessionType, GeoPoint hostLocation,
                                             String hostDisplayName, String hostLocationLabel,
                                             TravelMode hostTravelMode, Anchor anchor) {
        // Kolaylik ctor'u degil TAM ctor: capali oturumda merkezin adi find-venues'i
        // BEKLEMEDEN yazilir, boylece Lobi'de capa aninda gorunur ve sunucu istemcinin
        // zaten cozdugu adi ikinci kez geocode etmez.
        Session session = store.saveSession(new Session(UUID.randomUUID(), Ids.slug(), hostUserId,
                Texts.sessionName(name), types, sessionType, SessionStatus.COLLECTING,
                clock.instant().plus(SESSION_TTL), null, List.of(),
                null, null, null,
                anchor == null ? null : Texts.label(anchor.label()),
                anchor == null ? null : anchor.point()));
        // null -> CAR: Participant'in compact ctor'u zaten coerce eder, burada tekrar etmiyoruz.
        Participant host = store.saveParticipant(new Participant(UUID.randomUUID(), session.id(),
                Texts.displayName(hostDisplayName), hostLocation, true,
                null, false, Texts.label(hostLocationLabel), hostTravelMode, hostUserId));
        return new CreateSessionResult(session, host);
    }
```

- [ ] **Step 2: Controller'ı değiştir**

`SessionController.java`, `commands.createSession(...)` çağrısı:

```java
        // Capali oturumda lat/lng gelmeyebilir: dogrudan new GeoPoint(...) unboxing NPE
        // atardi (500), oysa dogru cevap konumsuz host'tur.
        GeoPoint hostLocation = request.lat() == null || request.lng() == null
                ? null : new GeoPoint(request.lat(), request.lng());
        SessionCommands.Anchor anchor = request.anchor() == null ? null
                : new SessionCommands.Anchor(
                        new GeoPoint(request.anchor().lat(), request.anchor().lng()),
                        request.anchor().label());
        SessionCommands.CreateSessionResult result = commands.createSession(
                WebPrincipals.accountId(jwt), request.name(), request.activityTypes(),
                request.sessionType() == null ? SessionType.GROUP : request.sessionType(),
                hostLocation, request.displayName(),
                request.locationLabel(), request.travelMode(), anchor);
```

- [ ] **Step 3: Derle ve kırılan çağrı yerlerini bul**

Run: `cd backend && mvn -o -q test-compile`
Expected: `createSession` çağıran her test dosyasında hata. Her birine son argüman olarak
`null` eklenir (çapasız oturum = bugünkü davranış).

Kırılan yerleri listele: `grep -rn "createSession(" src/test`

- [ ] **Step 4: G4'ü koş**

Run: `cd backend && mvn -o clean test`
Expected: PASS, **296 test** (295 + `createWithoutLocationOrAnchorIsRejected`). Kırmızı
test YOK.

- [ ] **Step 5: Commit (T5 + T6)**

```
feat(api): accept an optional anchor when creating a session

lat/lng become optional when an anchor is present; AnchorDto keeps the
point whole. The anchor label is stored at creation so the lobby shows it
before venues exist.
```

---

# G5 — Okuma tarafı

### Task 7: `SessionView.anchored` + çapada tam koordinat

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/ApiDtos.java:159-177`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/SessionViewAssembler.java:39-50, 77-87`
- Test: `backend/src/test/java/com/bumpinto/adapter/in/web/SessionViewAssemblerTest.java`

- [ ] **Step 1: Önce testi yaz** (`SessionViewAssemblerTest.java`, sınıfın sonuna)

```java
    /** Capa host'un ACIKCA yazdigi kamu bilgisi: yuvarlamak harita cemberini secilen
        yerden ~1 km kaydirirdi ve korudugu bir sey yok. */
    @Test
    void anchoredMidpointIsExactAndFlagged() {
        GeoPoint amsterdam = new GeoPoint(52.36761, 4.90412);
        Session s = new Session(UUID.randomUUID(), "s1", UUID.randomUUID(), "Cuma",
                List.of(ActivityType.COFFEE), SessionType.GROUP, SessionStatus.COLLECTING,
                Instant.now().plusSeconds(3600), null, List.of(),
                null, null, null, "Amsterdam", amsterdam);

        ApiDtos.SessionView view = assembler.toView(snapshotOf(s, List.of()), null);

        assertThat(view.anchored()).isTrue();
        assertThat(view.midpoint().lat()).isEqualTo(52.36761);
        assertThat(view.midpoint().lng()).isEqualTo(4.90412);
        assertThat(view.radiusKm()).isEqualTo(2.0);
    }

    /** Capasiz oturumda yuvarlama AYNEN durur — gizlilik kurali degismedi. */
    @Test
    void unanchoredMidpointStaysRounded() {
        Session s = new Session(UUID.randomUUID(), "s2", UUID.randomUUID(), "Cuma",
                List.of(ActivityType.COFFEE), SessionType.GROUP, SessionStatus.COLLECTING,
                Instant.now().plusSeconds(3600), null, List.of());

        ApiDtos.SessionView view = assembler.toView(
                snapshotOf(s, List.of(participantAt(51.6978, 5.3037),
                        participantAt(51.3855, 5.7120))), null);

        assertThat(view.anchored()).isFalse();
        // 2 ondalik = ~1 km (TravelMinutes.approx)
        assertThat(view.midpoint().lat()).isEqualTo(Math.round(view.midpoint().lat() * 100) / 100.0);
    }
```

> `snapshotOf(...)` ve `participantAt(...)` dosyada zaten var mı kontrol et
> (`grep -n "private static.*snapshot\|participantAt" SessionViewAssemblerTest.java`).
> Yoksa mevcut testlerin anlık görüntü kurma biçimini birebir taklit ederek ekle —
> yeni bir kurgu icat etme.

- [ ] **Step 2: Kırmızı olduğunu gör**

Run: `cd backend && mvn -o test -Dtest=SessionViewAssemblerTest`
Expected: FAIL — `cannot find symbol: method anchored()`.

- [ ] **Step 3: DTO'ya alanı ekle**

`ApiDtos.SessionView`'un SONUNA, `emptyActivityTypes`'tan sonra:

```java
                              /** Merkez host'un sectigi sabit nokta mi (orta nokta degil). */
                              boolean anchored) {
```

- [ ] **Step 4: Assembler'ı bitir**

`toView` başındaki blok (T4'te `SessionCenter`'a geçmişti) son hâlini alır:

```java
        SessionCenter center = SessionCenter.of(snap.session().anchor(), located);
        // Capali merkez YUVARLANMAZ: yuvarlama gizlilik onlemidir ve capa kamu bilgisidir.
        ApiDtos.GeoPointDto midpoint = center == null ? null
                : center.anchored()
                        ? new ApiDtos.GeoPointDto(center.point().lat(), center.point().lng())
                        : approx(center.point());
        Double radiusKm = center == null ? null : Math.round(center.radiusKm() * 10) / 10.0;
        GeoPoint midpointFor = center == null ? null : center.point();
```

`return new ApiDtos.SessionView(...)` çağrısının son argümanı olarak
`emptyActivityTypes(snap)`'tan sonra ekle:

```java
                emptyActivityTypes(snap), center != null && center.anchored());
```

- [ ] **Step 5: Uçtan uca çapalı akışı yaz** (`ApiHappyPathTest.java`)

Artık sözleşmenin her parçası yerinde; bu test çapalı oturumu baştan sona kanıtlar.

```java
    /** Capa varsa host konumu ZORUNLU DEGIL: 201 doner, capa goruntude okunur ve etiket
        find-venues'i beklemeden Lobi'de gorunur. */
    @Test
    void createWithAnchorAndNoHostLocationSucceeds() throws Exception {
        when(googleVerifier.verify("gid")).thenReturn(
                new GoogleIdVerifier.GoogleUser("sub-1", "a@b.c", "Mehmet", null));
        String loginBody = mvc.perform(post("/api/auth/google")
                        .contentType(JSON).content("{\"idToken\":\"gid\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String accessToken = json.readTree(loginBody).get("accessToken").asString();

        String createBody = mvc.perform(post("/api/sessions")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(JSON)
                        .content("{\"activityTypes\":[\"COFFEE\"],\"displayName\":\"Mehmet\","
                                + "\"anchor\":{\"lat\":52.3676,\"lng\":4.9041,"
                                + "\"label\":\"Amsterdam\"}}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        JsonNode created = json.readTree(createBody);

        String viewBody = mvc.perform(get("/api/sessions/" + created.get("slug").asString())
                        .header(ParticipantTokenFilter.HEADER,
                                created.get("participantToken").asString()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode view = json.readTree(viewBody);
        assertThat(view.get("anchored").asBoolean()).isTrue();
        assertThat(view.get("midpointLabel").asString()).isEqualTo("Amsterdam");
        // Yuvarlanmamis: capa kamu bilgisi (spec K3)
        assertThat(view.get("midpoint").get("lat").asDouble()).isEqualTo(52.3676);
        assertThat(view.get("radiusKm").asDouble()).isEqualTo(2.0);
    }
```

- [ ] **Step 6: G5'i koş**

Run: `cd backend && mvn -o clean test`
Expected: PASS, **299 test** (296 + 2 assembler + 1 uçtan uca).

- [ ] **Step 7: Commit**

```
feat(api): expose SessionView.anchored and skip rounding for anchors

Rounding protects participant privacy; an anchor is public, so rounding it
would only shift the map circle off the chosen place.
```

---

# G6 — Deste tarafı

### Task 8: Çapalı destede sıra puana geçer

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/application/deck/DeckFlow.java:104-122, 161-175`
- Test: `backend/src/test/java/com/bumpinto/application/deck/DeckFlowTest.java`

- [ ] **Step 1: Önce testi yaz** (`DeckFlowTest.java`, sınıfın sonuna)

```java
    /** Capali destede 2 km'lik daire icinde mekanlar arasi yol farki TravelMinutes.STEP'in
        (5 dk) altinda kalir: fairnessFirst her mekani berabere gorup sirayi tohumlu karisima
        birakirdi. Sessizce dejenere olmasindansa acikca puan sirasi. */
    @Test
    void anchoredDeckIsOrderedByRating() {
        Session anchored = store.saveSession(new Session(UUID.randomUUID(), "anch", hostUser,
                null, List.of(ActivityType.COFFEE), SessionType.GROUP,
                SessionStatus.COLLECTING, Instant.now().plusSeconds(3600), null, List.of(),
                null, null, null, "Amsterdam", new GeoPoint(52.3676, 4.9041)));
        Participant host = store.saveParticipant(new Participant(UUID.randomUUID(),
                anchored.id(), "Mehmet", new GeoPoint(51.6978, 5.3037), true, null, false,
                null, TravelMode.CAR, hostUser));

        List<Venue> deck = flow.findVenues(anchored.slug(), host.id());

        assertThat(deck).isNotEmpty();
        assertThat(deck).extracting(Venue::rating).isSortedAccordingTo(
                Comparator.nullsLast(Comparator.reverseOrder()));
    }

    /** Capali oturumda HIC konumlu katilimci olmasa da deste kurulur — onkosul duser. */
    @Test
    void anchoredSessionFindsVenuesWithoutAnyLocation() {
        Session anchored = store.saveSession(new Session(UUID.randomUUID(), "anch0", hostUser,
                null, List.of(ActivityType.COFFEE), SessionType.GROUP,
                SessionStatus.COLLECTING, Instant.now().plusSeconds(3600), null, List.of(),
                null, null, null, "Amsterdam", new GeoPoint(52.3676, 4.9041)));
        Participant host = store.saveParticipant(new Participant(UUID.randomUUID(),
                anchored.id(), "Mehmet", null, true, null, false, null, TravelMode.CAR,
                hostUser));

        assertThat(flow.findVenues(anchored.slug(), host.id())).isNotEmpty();
    }

    /** Capasiz oturumda onkosul AYNEN durur. */
    @Test
    void unanchoredSessionStillNeedsTwoLocations() {
        Session plain = store.saveSession(new Session(UUID.randomUUID(), "plain", hostUser,
                null, List.of(ActivityType.COFFEE), SessionType.GROUP,
                SessionStatus.COLLECTING, Instant.now().plusSeconds(3600), null, List.of()));
        Participant host = store.saveParticipant(new Participant(UUID.randomUUID(), plain.id(),
                "Mehmet", new GeoPoint(51.6978, 5.3037), true, null, false, null,
                TravelMode.CAR, hostUser));

        assertThatThrownBy(() -> flow.findVenues(plain.slug(), host.id()))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("at least 2 participants");
    }
```

Gerekirse import ekle: `java.util.Comparator`,
`static org.assertj.core.api.Assertions.assertThatThrownBy`.

> `store`, `flow`, `hostUser` alan adları dosyada zaten var; farklıysa mevcut testlerdeki
> adları kullan, yeni kurgu icat etme.

- [ ] **Step 2: Kırmızı olduğunu gör**

Run: `cd backend && mvn -o test -Dtest=DeckFlowTest`
Expected: `anchoredDeckIsOrderedByRating` FAIL (sıra adalet kuralından geliyor),
diğer ikisi PASS (T4'teki `SessionCenter` önkoşulu zaten kaldırdı).

- [ ] **Step 3: `deckOrder` yardımcısını ekle**

`DeckFlow.java`, `canonicalOrder`'ın hemen üstüne:

```java
    /**
     * Deste sirasi. Capali oturumda ADALET AYIRT ETMEZ: 2 km'lik daire icinde mekanlar arasi
     * yol farki TravelMinutes.STEP'in (5 dk) altinda kalir, fairnessFirst hepsini berabere
     * gorur ve sira tohumlu karisima duser. O yuzden capalida kanonik (puan) sirasi korunur.
     *
     * <p>findVenues ve shuffle IKISI de buradan gecer: dallanmayi iki yere ayri yazmak,
     * birini unutup destenin iki cagri arasinda farkli siralanmasina yol acardi.
     */
    private <T> List<T> deckOrder(Session session, List<T> canonical,
                                  Function<T, GeoPoint> location, List<Participant> located) {
        if (session.anchor() != null) {
            return canonical;
        }
        return DeckOrdering.fairnessFirst(canonical,
                t -> fairnessOf(located, location.apply(t)), seedOf(session));
    }
```

- [ ] **Step 4: İki çağrı yerini de değiştir**

`findVenues` içinde:

```java
        // Sira = adalet (spec §4.5) ya da capalida puan — tek karar noktasi deckOrder.
        List<VenueCandidate> ordered = deckOrder(session, shortlist,
                VenueCandidate::location, located);
```

`shuffle` içinde:

```java
        List<UUID> ids = deckOrder(session, canonical, Venue::location, located)
                .stream().map(Venue::id).toList();
```

- [ ] **Step 5: Testleri koş**

Run: `cd backend && mvn -o test -Dtest=DeckFlowTest`
Expected: PASS, üçü de yeşil.

---

### Task 9: Çapalı oturumda etiket ikinci kez çözülmez

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/application/deck/DeckFlow.java:124-127`
- Test: `backend/src/test/java/com/bumpinto/application/deck/DeckFlowTest.java`

- [ ] **Step 1: Önce testi yaz**

```java
    /** Capali oturumda etiket olusturmada yazildi: find-venues onu EZMEZ ve gereksiz bir
        ters-geocode agi cagrisi yapmaz. */
    @Test
    void anchoredSessionKeepsCreationLabelAndSkipsGeocode() {
        Session anchored = store.saveSession(new Session(UUID.randomUUID(), "anchlbl", hostUser,
                null, List.of(ActivityType.COFFEE), SessionType.GROUP,
                SessionStatus.COLLECTING, Instant.now().plusSeconds(3600), null, List.of(),
                null, null, null, "Amsterdam", new GeoPoint(52.3676, 4.9041)));
        Participant host = store.saveParticipant(new Participant(UUID.randomUUID(),
                anchored.id(), "Mehmet", null, true, null, false, null, TravelMode.CAR,
                hostUser));

        flow.findVenues(anchored.slug(), host.id());

        assertThat(store.sessionBySlug("anchlbl").orElseThrow().midpointLabel())
                .isEqualTo("Amsterdam");
        verify(geocoder, never()).label(any());
    }
```

Gerekirse import ekle: `static org.mockito.Mockito.verify`,
`static org.mockito.Mockito.never`, `static org.mockito.ArgumentMatchers.any`.

> `geocoder` alanının test sınıfındaki adı farklıysa mevcut adı kullan
> (`grep -n "ReverseGeocodePort" DeckFlowTest.java`). Gerçek bir mock değilse (stub sınıf
> ise) `verify` yerine o stub'ın çağrı sayacını kullan.

- [ ] **Step 2: Kırmızı olduğunu gör**

Run: `cd backend && mvn -o test -Dtest=DeckFlowTest#anchoredSessionKeepsCreationLabelAndSkipsGeocode`
Expected: FAIL — `geocoder.label(...)` çağrıldı ve etiket ezildi.

- [ ] **Step 3: Etiket koşulunu yaz**

`findVenues` içinde `String label = geocoder.label(center.point()).orElse(null);` satırını
şununla değiştir:

```java
        // Etiket ZATEN varsa (capali oturumda olusturmada yazildi) dokunulmaz: hem ag
        // cagrisi bosa gider hem de host'un yazdigi ad ters-geocode ciktisiyla ezilirdi.
        // Capasiz oturumda alan bu noktada hep null oldugu icin davranis degismez.
        String label = session.midpointLabel() != null ? session.midpointLabel()
                : geocoder.label(center.point()).orElse(null);
```

- [ ] **Step 4: G6'yı koş**

Run: `cd backend && mvn -o clean test`
Expected: PASS, **303 test**.

- [ ] **Step 5: Commit (T8 + T9)**

```
feat(deck): anchored decks order by rating and keep their creation label

Inside a 2 km circle fairness cannot discriminate between venues, so the
ordering is made explicit instead of degenerating into a seeded shuffle.
Both findVenues and shuffle branch in one place.
```

---

# G7 — Belgeler

### Task 10: Bruno + ARCHITECTURE.md

**Files:**
- Modify: `backend/.infra/bumpinto-collection/sessions/create-session.yml`
- Modify: `backend/ARCHITECTURE.md`

- [ ] **Step 1: Bruno `docs:` bloğunu güncelle**

`create-session.yml` içindeki `docs.content`'e, `lat`/`lng` satırının altına ekle:

```markdown
    `lat`/`lng` ile `anchor` arasinda EN AZ BIRI zorunlu; ikisi de yoksa 400 doner.

    `anchor`: `{ "lat": 52.3676, "lng": 4.9041, "label": "Amsterdam" }` — host'un sabit
    bulusma noktasi. Verilirse merkez ORTA NOKTA DEGIL bu noktadir, arama yaricapi 2 km'ye
    sabitlenir, `find-venues`in "en az 2 konumlu katilimci" onkosulu DUSER ve
    `SessionView.anchored` `true` doner. `label` istemcinin cozdugu addir; sunucu ikinci kez
    geocode etmez ve `midpointLabel` olarak olusturmada yazilir.

    Capali oturumda host kendi konumunu vermeyebilir (`lat`/`lng` atlanir); veren host icin
    yol suresi yine hesaplanir.
```

- [ ] **Step 2: Gövdeye `anchor`'ı yorumlu örnek olarak EKLEME**

İkinci bir create isteği dosyası **açılmaz**: koleksiyon yukarıdan aşağı koşuyor ve ikinci
bir `POST /api/sessions` `slug` değişkenini ezerek zinciri kırardı. Çapalı varyant yalnız
`docs:` içinde anlatılır. Bu bilinçli bir istisnadır ve sebebi burada yazılıdır.

- [ ] **Step 3: `ARCHITECTURE.md`'ye bölüm ekle**

```markdown
## Çapalı oturum ve merkezin tek kaynağı (B-10, 2026-09-05)

`Session.anchor` (nullable `GeoPoint`) doluysa oturumun merkezi katılımcı orta noktası
değil o noktadır. Üç sonuç:

- **Yarıçap sabit** (`SessionCenter.ANCHOR_RADIUS_KM = 2 km`). Yayılım kuralı çapada
  saçmalar: Amsterdam çapası + dağınık katılımcılar tabanı 10 km'ye çakıp 40 km'ye
  genişletirdi. Kırsal çapada mekan çıkmazsa `SearchRadius.expandedKm` zaten ×2 açıyor.
- **`midpoint` yuvarlanmaz.** Yuvarlama gizlilik önlemidir ve özel konumlardan türeyen
  noktayı korur; çapa host'un açıkça yazdığı kamu bilgisidir, yuvarlamak harita çemberini
  seçilen yerden ~1 km kaydırmaktan başka bir şey yapmaz.
- **Deste sırası puana geçer.** 2 km'lik daire içinde mekanlar arası yol farkı
  `TravelMinutes.STEP`in (5 dk) altında kalır; `DeckOrdering.fairnessFirst` hepsini berabere
  görür ve sıra tohumlu karışıma düşer. `DeckFlow.deckOrder` bu dallanmayı **tek yerde**
  yapar — `findVenues` ve `shuffle` ikisi de oradan geçer.

Bu kod tabanında **`midpoint` = oturumun merkezi**; çapa onu üretme yollarından biridir.
`SessionView.midpointLabel` alanı da bu yüzden yeniden adlandırılmadı: kablodaki alanı
değiştirmenin bedeli kozmetik kazancından büyük.

`SessionCenter` merkezi hesaplayan **tek** yerdir. Öncesinde `DeckFlow` ve
`SessionViewAssembler` aynı ağırlıklı centroid + yarıçap hesabını kopyalıyordu; çapayı iki
yere birden eklemek ayrışma riskini ikiye çıkarırdı.

**Garanti edilmeyen:** çapalı oturumda seçilen noktanın çevresinde mekan bulunacağı.
Bulunamazsa `NoVenuesFoundException` döner — telafi amaçlı ikinci bir Places çağrısı
yapılmaz (B-9 bütçe kısıtı).
```

- [ ] **Step 4: Tam koşu**

Run: `cd backend && mvn -o clean test`
Expected: PASS, **303 test**.

- [ ] **Step 5: Commit**

```
docs(backend): record the anchored-session decisions and the Bruno contract
```

---

## Öz-inceleme notları

**Spec kapsaması:** §3.1 → T3; §3.2 → T1, T6; §3.3 → T2; §3.4 → T4, T8; §4 → T5, T6, T7;
§5 → W-9 (frontend); §9 R1 → T5 Step 5; §9 R2 → T8 `anchoredSessionFindsVenuesWithoutAnyLocation`;
§9 R5 → T1 `witherOperationsPreserveAnchor`; §10 backend kapıları → T1–T9.

**Kapsam dışı bırakılan spec maddesi:** §9 R3 (harita yükleme sızıntısı) ve R4
(`radiusKm` genişlemeyi bilmiyor) bilinçli olarak dokunulmadı; ikisi de bu işten önce
vardı ve spec bunu yazıyor.

**Beklenen test sayısı yolu:** 286 → 290 (G1) → 295 (G2) → 295 (G3, refactor) → 296 (G4)
→ 299 (G5) → 303 (G6) → 303 (G7). **Hiçbir grup kırmızı test commit etmez.**
