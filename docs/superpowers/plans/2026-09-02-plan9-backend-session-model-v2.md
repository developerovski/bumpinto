# Plan 9: Backend — Oturum Modeli Rev 2 (oturum tipi · Mekanlar durumu · karıştır · elle konum · harita alanları)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web/mobil paritesi spec'inin (rev 2) alan modeli değişikliklerini backend'e taşımak: `SessionType` (GROUP/SOLO), yeni `BROWSING` durumu ("Mekanlar"), host'un `shuffle` ile desteyi açması, Bireysel oturumda elle eklenen konumlar (token'sız `manual` katılımcı), Bireysel/Grup'ta `BROWSING`'de doğrudan mekan seçimi ve harita ekranlarının ihtiyaç duyduğu `SessionView` alanları (`sessionType`, `midpoint`, `radiusKm`, katılımcıda yuvarlanmış konum + şehir etiketi + `manual`).

**Architecture:** Mevcut altıgen düzen korunur (`domain` saf, `application` use-case + `@Transactional`, `adapter` port implementasyonları). Değişiklikler: `domain/session` (enum + record alanları), `domain/port` (2 yeni port metodu, 1 yeni olay), `application/session` + `application/deck` (yeni komutlar, popülasyon kuralı ikiye ayrılır: **geometri** popülasyonu = konumu olan herkes, **oy** popülasyonu = konumu olan ve `manual` olmayanlar), `adapter/in/web` (DTO'lar, yeni `PointsController`, `shuffle` ucu), `adapter/out/persistence` (V3 migration, entity alanları, reorder). Spec: `docs/superpowers/specs/2026-09-01-web-parity-design.md` §3, §8 (BAĞLAYICI — çelişkide spec kazanır).

**Tech Stack:** Java 21, Spring Boot 4.1, Flyway, Spring Data JPA, JUnit 5 + AssertJ + Testcontainers (mevcut `PostgresContainer.shared()`), ArchUnit, Bruno (OpenCollection), openapi-typescript codegen.

---

## Bu plana özel kurallar

- **INDEX güncelle** (başlarken `in-progress`, görev sonlarında `Son adım`, bitince `done`). **Git yazma YOK** — commit kullanıcıda.
- **Her mvn komutu** şu önekle koşar (jenv shim + Rancher ryuk): 
  `JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true rtk mvn -o ...` — aşağıda kısaca `MVN` yazıldı. Komutlar `backend/` dizininden.
- Postgres 5432 doluysa: `bumpinto-postgres-alt` konteyneri 5434'te; testler Testcontainers kullanır, bu yalnız `spring-boot:run` içindir.
- Her entegrasyon testi **`PostgresContainer.shared()`** kullanır; `new PostgreSQLContainer<>` ve `@Container` YASAK (bellek notu: Rancher port-forward flake'i).
- `backend/ARCHITECTURE.md` §5 değişmezleri (ArchUnit) bağlayıcı: `domain` saf kalır; yeni sınıf katman köküne konmaz; SQL yalnız Spring Data.
- **Migration numarası bu planda V3'tür.** B-3 (retention) planının V3'ü **V5**'e taşındı (INDEX notu); B-6 V4'ü kullanır. Flyway `outOfOrder` kapalı kalır.
- Her HTTP ucu Bruno isteğiyle biter (AGENTS.md "API Collection Policy"); OpenCollection formatı, `seq` sıralı, `docs:` bloklu.
- Record alanı eklemek çağrı yerlerini kırar; ilgili görevde **tam liste** `grep` ile çıkarılır ve hepsi aynı görevde düzeltilir — yarım bırakılmış derleme hatasıyla görev kapanmaz.
- Görev kapanış kapısı: `MVN test` → `Tests run: N, Failures: 0, Errors: 0` ve `HexagonalArchitectureTest` yeşil.

---

## Alan modeli özeti (bu plan sonunda)

```
SessionType   GROUP | SOLO
SessionStatus COLLECTING → SUGGESTING → BROWSING → SWIPING → RUNOFF → DECIDED   (EXPIRED hesaplanır, yazılmaz)
                                    SOLO:  BROWSING ──"Bunu seç"──> DECIDED
                                    GROUP: BROWSING ──shuffle────> SWIPING ; BROWSING ──host "Bunu seç"──> DECIDED
Participant   + manual (token yok, oy yok, geometriye dahil) + locationLabel (şehir)
Populations   geometry = hasLocation            → orta nokta, yarıçap, deste
              voting   = hasLocation && !manual → done/total, runoff, karar motoru
```

---

### Task 1: V3 migration + `SessionType` + record alanları (Session, Participant)

**Files:**
- Create: `backend/src/main/resources/db/migration/V3__session_type_manual_points.sql`
- Create: `backend/src/main/java/com/bumpinto/domain/session/SessionType.java`
- Modify: `backend/src/main/java/com/bumpinto/domain/session/Session.java`
- Modify: `backend/src/main/java/com/bumpinto/domain/session/Participant.java`
- Modify: `backend/src/main/java/com/bumpinto/domain/session/SessionStatus.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/SessionEntity.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/ParticipantEntity.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/SessionStoreAdapter.java`
- Modify: `backend/src/main/java/com/bumpinto/application/session/SessionCommands.java` (yalnız `new Session/new Participant` çağrıları — davranış Task 3'te)
- Modify: `backend/src/test/java/com/bumpinto/SchemaMigrationTest.java`
- Modify: tüm `new Session(` / `new Participant(` içeren testler (Step 4'teki grep listesi)

- [ ] **Step 1: Migration** — `V3__session_type_manual_points.sql`

```sql
alter table sessions add column session_type text not null default 'GROUP';

alter table participants add column is_manual boolean not null default false;
alter table participants add column location_label text;
-- Elle eklenen konumun token'ı yoktur. unique(token) NULL'lari ayirt etmez: Postgres'te
-- birden cok NULL ayni unique indexte gecerlidir.
alter table participants alter column token drop not null;
```

- [ ] **Step 2: Domain** — `SessionType.java`

```java
package com.bumpinto.domain.session;

/** GROUP: davet linki + deste. SOLO: host konumlari elle girer, deste yok, haritadan secer. */
public enum SessionType { GROUP, SOLO }
```

`SessionStatus.java`:

```java
package com.bumpinto.domain.session;

/** BROWSING = "Mekanlar": deste hazir, herkes harita+listede gorur, oy yok. */
public enum SessionStatus { COLLECTING, SUGGESTING, BROWSING, SWIPING, RUNOFF, DECIDED, EXPIRED }
```

`Session.java` — `sessionType` alanı `activityType`'tan hemen sonra:

```java
package com.bumpinto.domain.session;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record Session(UUID id, String slug, UUID hostId, String name, ActivityType activityType,
                      SessionType sessionType, SessionStatus status, Instant expiresAt,
                      UUID decidedVenueId, List<UUID> runoffVenueIds) {

    public boolean isExpired(Instant now) {
        return now.isAfter(expiresAt);
    }

    public boolean isSolo() {
        return sessionType == SessionType.SOLO;
    }

    public Session withStatus(SessionStatus newStatus) {
        return new Session(id, slug, hostId, name, activityType, sessionType, newStatus, expiresAt,
                decidedVenueId, runoffVenueIds);
    }

    public Session decided(UUID venueId) {
        return new Session(id, slug, hostId, name, activityType, sessionType, SessionStatus.DECIDED,
                expiresAt, venueId, runoffVenueIds);
    }

    public Session inRunoff(List<UUID> venueIds) {
        return new Session(id, slug, hostId, name, activityType, sessionType, SessionStatus.RUNOFF,
                expiresAt, null, List.copyOf(venueIds));
    }
}
```

`Participant.java` — sona iki alan: `manual`, `locationLabel`:

```java
package com.bumpinto.domain.session;

import com.bumpinto.domain.geo.GeoPoint;
import java.time.Instant;
import java.util.UUID;

/**
 * manual=true: host'un elle ekledigi konum (SOLO). Token'i YOK, kaydirmaz, oy popülasyonuna
 * girmez; yalniz orta nokta / yaricap / deste geometrisine dahildir.
 */
public record Participant(UUID id, UUID sessionId, String displayName, GeoPoint location,
                          boolean host, String token, Instant deckDoneAt,
                          boolean manual, String locationLabel) {

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
        return new Participant(id, sessionId, displayName, newLocation, host, token, deckDoneAt,
                manual, newLabel);
    }

    public Participant doneAt(Instant when) {
        return new Participant(id, sessionId, displayName, location, host, token, when,
                manual, locationLabel);
    }

    @Override
    public String toString() {
        return "Participant[id=" + id + ", sessionId=" + sessionId
                + ", displayName=" + displayName + ", location=" + location
                + ", host=" + host + ", token=" + (token == null ? "null" : "***")
                + ", deckDoneAt=" + deckDoneAt + ", manual=" + manual
                + ", locationLabel=" + locationLabel + "]";
    }
}
```

- [ ] **Step 3: Persistence** — `SessionEntity` alan ekle: `String sessionType;` (`activityType`'ın altına). `ParticipantEntity` alan ekle: `boolean isManual;` ve `String locationLabel;`. `SessionStoreAdapter`:

```java
    @Override public Session saveSession(Session s) {
        SessionEntity e = new SessionEntity();
        e.id = s.id();
        e.slug = s.slug();
        e.hostId = s.hostId();
        e.name = s.name();
        e.activityType = s.activityType().name();
        e.sessionType = s.sessionType().name();
        e.status = s.status().name();
        e.expiresAt = s.expiresAt();
        e.decidedVenueId = s.decidedVenueId();
        e.runoffVenueIds = s.runoffVenueIds().isEmpty() ? null
                : s.runoffVenueIds().stream().map(UUID::toString).collect(Collectors.joining(","));
        sessions.save(e);
        return s;
    }

    @Override public Participant saveParticipant(Participant p) {
        ParticipantEntity e = new ParticipantEntity();
        e.id = p.id();
        e.sessionId = p.sessionId();
        e.displayName = p.displayName();
        e.lat = p.location() == null ? null : p.location().lat();
        e.lng = p.location() == null ? null : p.location().lng();
        e.token = p.token();
        e.deckDoneAt = p.deckDoneAt();
        e.isHost = p.host();
        e.isManual = p.manual();
        e.locationLabel = p.locationLabel();
        participants.save(e);
        return p;
    }

    static Session toSession(SessionEntity e) {
        List<UUID> runoff = e.runoffVenueIds == null ? List.of()
                : Arrays.stream(e.runoffVenueIds.split(",")).map(UUID::fromString).toList();
        return new Session(e.id, e.slug, e.hostId, e.name, ActivityType.valueOf(e.activityType),
                SessionType.valueOf(e.sessionType), SessionStatus.valueOf(e.status), e.expiresAt,
                e.decidedVenueId, runoff);
    }

    static Participant toParticipant(ParticipantEntity e) {
        GeoPoint loc = (e.lat == null || e.lng == null) ? null : new GeoPoint(e.lat, e.lng);
        return new Participant(e.id, e.sessionId, e.displayName, loc, e.isHost, e.token,
                e.deckDoneAt, e.isManual, e.locationLabel);
    }
```

(`import com.bumpinto.domain.session.SessionType;` ekle.)

- [ ] **Step 4: Çağrı yerlerini düzelt** — Run (backend/):
`rtk grep -rn "new Session(\|new Participant(" src/main src/test --include=*.java`

Her `new Session(...)`: 5. argümandan (`ActivityType`) sonra `SessionType.GROUP,` ekle. Her `new Participant(...)` (7 argümanlı): sona `, false, null` ekle. `SessionCommands` içindeki ikisi de aynı kuralla düzelir (davranış Task 3'te değişecek). `Participant.locatedAt(GeoPoint)` çağrısı `SessionCommands.updateLocation`'da: `participant.locatedAt(location, participant.locationLabel())` yap.

- [ ] **Step 5: Şema testi** — `SchemaMigrationTest`'e ekle:

```java
    @Test
    void v3AddsSessionTypeAndManualParticipantColumns() {
        List<String> sessionCols = jdbc.queryForList(
                "select column_name from information_schema.columns where table_name = 'sessions'",
                String.class);
        assertThat(sessionCols).contains("session_type");
        List<String> participantCols = jdbc.queryForList(
                "select column_name from information_schema.columns where table_name = 'participants'",
                String.class);
        assertThat(participantCols).contains("is_manual", "location_label");
        String tokenNullable = jdbc.queryForObject(
                "select is_nullable from information_schema.columns "
                        + "where table_name = 'participants' and column_name = 'token'", String.class);
        assertThat(tokenNullable).isEqualTo("YES");
    }
```

- [ ] **Step 6: Derle + tüm testler** — Run: `MVN test`
Expected: `BUILD SUCCESS`, tüm mevcut testler yeşil (davranış değişmedi, yalnız şekil).

- [ ] **Step 7: INDEX güncelle + Commit (kullanıcı)** — `feat(session): v3 migration, SessionType, manual/locationLabel alanlari`

---

### Task 2: `BROWSING` durumu + `venues_ready` olayı + `shuffle` (TDD)

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/domain/port/SessionEvent.java`
- Modify: `backend/src/main/java/com/bumpinto/domain/port/DeckStorePort.java`
- Modify: `backend/src/main/java/com/bumpinto/application/deck/DeckFlow.java`
- Modify: `backend/src/main/java/com/bumpinto/application/session/SessionQueries.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/DeckStoreAdapter.java`
- Modify: `backend/src/test/java/com/bumpinto/support/FakeStores.java`
- Modify: `backend/src/test/java/com/bumpinto/application/deck/DeckFlowTest.java`
- Modify: `backend/src/test/java/com/bumpinto/adapter/out/persistence/StoreAdapterTest.java`

- [ ] **Step 1: Failing tests** — `DeckFlowTest`'e ekle (mevcut `setUp` aynen; `session` GROUP):

```java
    @Test
    void findVenuesEndsInBrowsingAndPublishesVenuesReady() {
        providerResult.addAll(IntStream.range(0, 8).mapToObj(i -> cand(i, 3.0 + i * 0.2)).toList());
        flow.findVenues("s1", hostUser);
        assertThat(store.sessionBySlug("s1").orElseThrow().status()).isEqualTo(SessionStatus.BROWSING);
        assertThat(events.published).extracting(p -> p.event().type()).containsExactly("venues_ready");
    }

    @Test
    void shuffleOpensDeckWithSameRandomOrderForEveryoneAndPublishesDeckReady() {
        providerResult.addAll(IntStream.range(0, 8).mapToObj(i -> cand(i, 3.0 + i * 0.2)).toList());
        List<Venue> browsing = flow.findVenues("s1", hostUser);
        List<UUID> ratingOrder = browsing.stream().map(Venue::id).toList();

        flow.shuffle("s1", hostUser);

        Session s = store.sessionBySlug("s1").orElseThrow();
        assertThat(s.status()).isEqualTo(SessionStatus.SWIPING);
        List<UUID> deckOrder = deck.venuesOf(s.id()).stream().map(Venue::id).toList();
        assertThat(deckOrder).containsExactlyInAnyOrderElementsOf(ratingOrder);
        assertThat(deckOrder).isNotEqualTo(ratingOrder); // 8 kart, sabit tohum: sira degisir
        assertThat(deck.venuesOf(s.id()).stream().map(Venue::deckOrder).toList())
                .containsExactly(0, 1, 2, 3, 4, 5, 6, 7);
        assertThat(events.published).extracting(p -> p.event().type())
                .containsExactly("venues_ready", "deck_ready");
    }

    @Test
    void shuffleRequiresBrowsingAndHost() {
        assertThatThrownBy(() -> flow.shuffle("s1", hostUser))
                .isInstanceOf(ConflictException.class); // COLLECTING'de deste yok
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        flow.findVenues("s1", hostUser);
        assertThatThrownBy(() -> flow.shuffle("s1", UUID.randomUUID()))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void swipingIsRejectedWhileBrowsing() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        List<Venue> venues = flow.findVenues("s1", hostUser);
        assertThatThrownBy(() -> flow.swipe("s1", host.id(), venues.get(0).id(), true))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("BROWSING");
    }
```

Mevcut testleri güncelle: `findVenuesBuildsDeckSortedByRatingAndPublishes` içinde beklenen statü `BROWSING`, olay `"venues_ready"`. `fullSwipeFlowAutoDecidesWhenEveryoneFinishes` ve `runoffTieStaysOpenUntilHostForces` içinde `findVenues` çağrısından hemen sonra `flow.shuffle("s1", hostUser);` ekle ve mekan id'lerini **shuffle'dan sonra** `deck.venuesOf(session.id())` ile oku (sıra değişti). `deck_progress`/`session_decided` beklentileri aynen kalır.

- [ ] **Step 2: FAIL doğrula** — Run: `MVN test -Dtest=DeckFlowTest` → derleme hatası (`shuffle` yok, `venues_ready` yok).

- [ ] **Step 3: Port + olay**

`SessionEvent.java`'ya ekle:

```java
    /** BROWSING: deste hazir, herkes Mekanlar ekranini gorur; oylama daha basladi. */
    public static SessionEvent venuesReady(int venueCount) {
        return new SessionEvent("venues_ready", Map.of("venueCount", venueCount));
    }
```

`DeckStorePort.java`'ya ekle:

```java
    /** deckOrder'i verilen sirayla 0..n-1 olarak yeniden yazar. Liste oturumun TUM mekanlarini icermeli. */
    void reorderVenues(UUID sessionId, List<UUID> orderedVenueIds);
```

`FakeStores.InMemoryDeckStore`'a ekle:

```java
        @Override public void reorderVenues(UUID sessionId, List<UUID> orderedVenueIds) {
            for (int i = 0; i < orderedVenueIds.size(); i++) {
                UUID id = orderedVenueIds.get(i);
                int order = i;
                venues.replaceAll(v -> v.id().equals(id)
                        ? new Venue(v.id(), v.sessionId(), v.provider(), v.externalId(), v.name(),
                                v.location(), v.rating(), v.priceLevel(), v.photoUrl(), v.mapsUrl(), order)
                        : v);
            }
        }
```

- [ ] **Step 4: DeckFlow** — `findVenues` sonundaki iki satırı değiştir:

```java
        List<Venue> saved = deck.saveVenues(venues);
        store.saveSession(session.withStatus(SessionStatus.BROWSING));
        events.publish(slug, SessionEvent.venuesReady(saved.size()));
        return saved;
```

`shuffle` ekle (`findVenues`'ün altına):

```java
    /**
     * Grup: host "Karistir ve kaydir" der; deste herkes icin AYNI rastgele siraya girer
     * (tohum = oturum id'si — testte ve yeniden yuklemede deterministik). Liste ekrani puan
     * sirasini SessionView'dan okumaya devam eder; deckOrder yalniz desteyi ilgilendirir.
     */
    @Transactional
    public void shuffle(String slug, UUID hostUserId) {
        Session session = requireStatus(slug, SessionStatus.BROWSING);
        requireHost(session, hostUserId);
        if (session.isSolo()) {
            throw new ConflictException("solo session has no deck");
        }
        List<UUID> ids = new ArrayList<>(deck.venuesOf(session.id()).stream().map(Venue::id).toList());
        Collections.shuffle(ids, new Random(session.id().getLeastSignificantBits()));
        deck.reorderVenues(session.id(), ids);
        store.saveSession(session.withStatus(SessionStatus.SWIPING));
        events.publish(slug, SessionEvent.deckReady(ids.size()));
    }
```

(`import java.util.Collections; import java.util.Random;` ekle.)

`SessionQueries.VENUES_VISIBLE`'a `BROWSING` ekle:

```java
    private static final EnumSet<SessionStatus> VENUES_VISIBLE = EnumSet.of(
            SessionStatus.BROWSING, SessionStatus.SWIPING, SessionStatus.RUNOFF, SessionStatus.DECIDED);
```

- [ ] **Step 5: JPA reorder** — `DeckStoreAdapter`'a ekle. `unique (session_id, deck_order)` satır satır denetlenir; tek geçişte takas ihlal eder → önce herkesi +1000 kaydır, flush, sonra nihai sırayı yaz:

```java
    @Override public void reorderVenues(UUID sessionId, List<UUID> orderedVenueIds) {
        List<VenueEntity> rows = venues.findBySessionIdOrderByDeckOrder(sessionId);
        rows.forEach(e -> e.deckOrder += 1000);
        venues.saveAllAndFlush(rows);
        Map<UUID, Integer> target = new HashMap<>();
        for (int i = 0; i < orderedVenueIds.size(); i++) {
            target.put(orderedVenueIds.get(i), i);
        }
        rows.forEach(e -> e.deckOrder = target.get(e.id));
        venues.saveAllAndFlush(rows);
    }
```

(`import java.util.HashMap; import java.util.Map;` ekle.) `StoreAdapterTest`'e (Postgres container'lı) ekle:

```java
    @Test
    void reorderVenuesSwapsOrderWithoutViolatingUniqueIndex() {
        UUID sessionId = seedSessionWithVenues(3); // testte mevcut yardimci yoksa: bir Session + 3 Venue kaydet
        List<Venue> before = deck.venuesOf(sessionId);
        List<UUID> reversed = new ArrayList<>(before.stream().map(Venue::id).toList());
        Collections.reverse(reversed);
        deck.reorderVenues(sessionId, reversed);
        assertThat(deck.venuesOf(sessionId).stream().map(Venue::id).toList()).isEqualTo(reversed);
        assertThat(deck.venuesOf(sessionId).stream().map(Venue::deckOrder).toList())
                .containsExactly(0, 1, 2);
    }
```

`seedSessionWithVenues` testte yoksa şu özel metodu ekle: `saveSession` ile GROUP/COLLECTING bir oturum, ardından `deck.saveVenues` ile deckOrder 0..n-1 üç `Venue` (provider "foursquare", externalId "f"+i, rating 4.0+i*0.1, konum `new GeoPoint(51.5, 5.5)`).

- [ ] **Step 6: PASS doğrula** — Run: `MVN test -Dtest='DeckFlowTest,StoreAdapterTest,SessionQueriesTest'` → `Failures: 0, Errors: 0`.

- [ ] **Step 7: INDEX güncelle + Commit (kullanıcı)** — `feat(deck): BROWSING durumu, venues_ready, shuffle`

---

### Task 3: Oturum tipi + elle konum komutları + oy/geometri popülasyonu (TDD)

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/domain/port/SessionStorePort.java`
- Modify: `backend/src/main/java/com/bumpinto/application/session/SessionCommands.java`
- Modify: `backend/src/main/java/com/bumpinto/application/deck/DeckFlow.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/SessionStoreAdapter.java`
- Modify: `backend/src/test/java/com/bumpinto/support/FakeStores.java`
- Modify: `backend/src/test/java/com/bumpinto/application/session/SessionCommandsTest.java`
- Modify: `backend/src/test/java/com/bumpinto/application/deck/DeckFlowTest.java`

- [ ] **Step 1: Failing tests** — `SessionCommandsTest`'e ekle:

```java
    @Test
    void createSessionCarriesTypeAndHostLocationLabel() {
        SessionCommands.CreateSessionResult r = commands.createSession(UUID.randomUUID(),
                "Ayşe'yle kahve", ActivityType.COFFEE, SessionType.SOLO, DEN_BOSCH, "Mehmet",
                "'s-Hertogenbosch");
        assertThat(r.session().sessionType()).isEqualTo(SessionType.SOLO);
        assertThat(r.hostParticipant().locationLabel()).isEqualTo("'s-Hertogenbosch");
        assertThat(r.hostParticipant().manual()).isFalse();
    }

    @Test
    void addPointCreatesManualParticipantOnlyForSoloHostWhileCollecting() {
        SessionCommands.CreateSessionResult solo = commands.createSession(UUID.randomUUID(), null,
                ActivityType.COFFEE, SessionType.SOLO, DEN_BOSCH, "Mehmet", null);
        Participant ayse = commands.addPoint(solo.session().slug(), solo.session().hostId(),
                "Ayşe", "Someren", SOMEREN);
        assertThat(ayse.manual()).isTrue();
        assertThat(ayse.token()).isNull();
        assertThat(ayse.host()).isFalse();
        assertThat(ayse.locationLabel()).isEqualTo("Someren");
        assertThat(store.participantsOf(solo.session().id())).hasSize(2);

        assertThatThrownBy(() -> commands.addPoint(solo.session().slug(), UUID.randomUUID(),
                "X", null, SOMEREN)).isInstanceOf(ForbiddenException.class);

        SessionCommands.CreateSessionResult group = commands.createSession(UUID.randomUUID(), null,
                ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH, "Mehmet", null);
        assertThatThrownBy(() -> commands.addPoint(group.session().slug(), group.session().hostId(),
                "Ayşe", "Someren", SOMEREN)).isInstanceOf(ConflictException.class);
    }

    @Test
    void removePointDeletesOnlyManualParticipants() {
        SessionCommands.CreateSessionResult solo = commands.createSession(UUID.randomUUID(), null,
                ActivityType.COFFEE, SessionType.SOLO, DEN_BOSCH, "Mehmet", null);
        Participant ayse = commands.addPoint(solo.session().slug(), solo.session().hostId(),
                "Ayşe", "Someren", SOMEREN);
        commands.removePoint(solo.session().slug(), solo.session().hostId(), ayse.id());
        assertThat(store.participantsOf(solo.session().id())).hasSize(1);
        assertThatThrownBy(() -> commands.removePoint(solo.session().slug(), solo.session().hostId(),
                solo.hostParticipant().id())).isInstanceOf(ConflictException.class);
    }

    @Test
    void joinIsRejectedOnSoloSession() {
        SessionCommands.CreateSessionResult solo = commands.createSession(UUID.randomUUID(), null,
                ActivityType.COFFEE, SessionType.SOLO, DEN_BOSCH, "Mehmet", null);
        assertThatThrownBy(() -> commands.join(solo.session().slug(), "Ayşe", SOMEREN, null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("solo");
    }

    @Test
    void updateLocationStoresLabel() {
        SessionCommands.CreateSessionResult r = commands.createSession(UUID.randomUUID(), null,
                ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH, "Mehmet", null);
        Participant kerem = commands.join(r.session().slug(), "Kerem", null, null);
        commands.updateLocation(r.session().slug(), kerem.id(), SOMEREN, "Someren");
        assertThat(store.participants.get(kerem.id()).locationLabel()).isEqualTo("Someren");
    }
```

Mevcut `createSession(...)` / `join(...)` / `updateLocation(...)` çağrılarını yeni imzalara geçir: `createSession(host, name, type, SessionType.GROUP, loc, "Mehmet", null)`, `join(slug, name, loc, null)`, `updateLocation(slug, id, loc, null)`.

`DeckFlowTest`'e ekle:

```java
    @Test
    void manualPointsCountForGeometryButNotForVoting() {
        Participant manual = store.saveParticipant(new Participant(UUID.randomUUID(), session.id(),
                "Kerem", new GeoPoint(51.48, 5.66), false, null, null, true, "Helmond"));
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        flow.findVenues("s1", hostUser);
        flow.shuffle("s1", hostUser);
        List<Venue> venues = deck.venuesOf(session.id());
        UUID fav = venues.get(0).id();
        for (Participant p : List.of(host, ayse)) {
            flow.swipe("s1", p.id(), fav, true);
            flow.finishDeck("s1", p.id());
        }
        // elle konum oy vermedigi halde "herkes bitirdi" sayildi → karar cikti
        assertThat(store.sessionBySlug("s1").orElseThrow().status()).isEqualTo(SessionStatus.DECIDED);
        assertThat(events.published).extracting(p -> p.event().type()).contains("deck_progress");
        assertThat(events.published.stream()
                .filter(p -> p.event().type().equals("deck_progress"))
                .map(p -> p.event().payload().get("total")).toList()).containsOnly(2L);
        assertThatThrownBy(() -> flow.swipe("s1", manual.id(), fav, true))
                .isInstanceOf(ConflictException.class);
    }
```

- [ ] **Step 2: FAIL doğrula** — Run: `MVN test -Dtest='SessionCommandsTest,DeckFlowTest'` → derleme hatası.

- [ ] **Step 3: Port** — `SessionStorePort`'a ekle: `void deleteParticipant(UUID participantId);`
`FakeStores.InMemorySessionStore`:

```java
        @Override public void deleteParticipant(UUID participantId) {
            participants.remove(participantId);
        }
        // participantByToken: token NULL olan (manual) satirlar icin NPE'yi onle
        @Override public Optional<Participant> participantByToken(String token) {
            return participants.values().stream().filter(p -> token.equals(p.token())).findFirst();
        }
```

`SessionStoreAdapter`:

```java
    @Override public void deleteParticipant(UUID participantId) {
        participants.deleteById(participantId);
    }
```

- [ ] **Step 4: SessionCommands** — yeni imzalar ve komutlar:

```java
    @Transactional
    public CreateSessionResult createSession(UUID hostUserId, String name, ActivityType type,
                                             SessionType sessionType, GeoPoint hostLocation,
                                             String hostDisplayName, String hostLocationLabel) {
        Session session = store.saveSession(new Session(UUID.randomUUID(), Ids.slug(), hostUserId,
                Texts.sessionName(name), type, sessionType, SessionStatus.COLLECTING,
                clock.instant().plus(SESSION_TTL), null, List.of()));
        Participant host = store.saveParticipant(new Participant(UUID.randomUUID(), session.id(),
                Texts.displayName(hostDisplayName), hostLocation, true,
                Ids.participantToken(), null, false, Texts.label(hostLocationLabel)));
        return new CreateSessionResult(session, host);
    }

    @Transactional
    public Participant join(String slug, String displayName, GeoPoint location, String locationLabel) {
        Session session = required(slug);
        if (session.isSolo()) {
            throw new ConflictException("solo session has no invite link");
        }
        if (session.status() == SessionStatus.DECIDED) {
            throw new ConflictException("session is closed: " + session.status());
        }
        Participant joined = store.saveParticipant(new Participant(UUID.randomUUID(), session.id(),
                Texts.displayName(displayName), location, false, Ids.participantToken(), null,
                false, Texts.label(locationLabel)));
        events.publish(slug, SessionEvent.participantJoined(store.participantsOf(session.id()).size()));
        return joined;
    }

    @Transactional
    public void updateLocation(String slug, UUID participantId, GeoPoint location, String label) {
        Session session = required(slug);
        Participant participant = store.participantsOf(session.id()).stream()
                .filter(p -> p.id().equals(participantId)).findFirst()
                .orElseThrow(() -> new NotFoundException("participant not in session"));
        store.saveParticipant(participant.locatedAt(location, Texts.label(label)));
    }

    /** SOLO: host elle konum ekler. Token'siz, oy vermeyen katilimci; yalniz COLLECTING'de. */
    @Transactional
    public Participant addPoint(String slug, UUID hostUserId, String displayName,
                                String locationLabel, GeoPoint location) {
        Session session = required(slug);
        requireHost(session, hostUserId);
        if (!session.isSolo()) {
            throw new ConflictException("manual points are only for solo sessions");
        }
        if (session.status() != SessionStatus.COLLECTING) {
            throw new ConflictException("points are frozen after venues are found");
        }
        Participant point = store.saveParticipant(new Participant(UUID.randomUUID(), session.id(),
                Texts.displayName(displayName), location, false, null, null, true,
                Texts.label(locationLabel)));
        events.publish(slug, SessionEvent.participantJoined(store.participantsOf(session.id()).size()));
        return point;
    }

    @Transactional
    public void removePoint(String slug, UUID hostUserId, UUID participantId) {
        Session session = required(slug);
        requireHost(session, hostUserId);
        if (session.status() != SessionStatus.COLLECTING) {
            throw new ConflictException("points are frozen after venues are found");
        }
        Participant point = store.participantsOf(session.id()).stream()
                .filter(p -> p.id().equals(participantId)).findFirst()
                .orElseThrow(() -> new NotFoundException("point not in session"));
        if (!point.manual()) {
            throw new ConflictException("only manual points can be removed");
        }
        store.deleteParticipant(participantId);
    }

    private void requireHost(Session session, UUID userId) {
        if (!session.hostId().equals(userId)) {
            throw new ForbiddenException("only the host can do this");
        }
    }
```

(`import com.bumpinto.application.error.ForbiddenException; import com.bumpinto.domain.session.SessionType;` ekle.)

`Texts.java`'ya ekle (şehir etiketi; null serbest):

```java
    public static String label(String raw) {
        return raw == null || raw.isBlank() ? null : normalize(raw, 80);
    }
```

- [ ] **Step 5: DeckFlow popülasyonları** — `deckPopulation` yerine iki metod; çağrı yerleri:

```java
    /** Geometri popülasyonu: konumu olan HERKES (elle konumlar dahil) — orta nokta, yaricap, deste. */
    private List<Participant> geometryPopulation(UUID sessionId) {
        return store.participantsOf(sessionId).stream().filter(Participant::hasLocation).toList();
    }

    /**
     * Oy popülasyonu: konumu olan ve elle eklenmemis katilimcilar. done/total, runoff finishers ve
     * karar motoru girdisi HEP burayi kullanir — elle konum kaydiramaz, yoksa oturum asla bitmez.
     */
    private List<Participant> votingPopulation(UUID sessionId) {
        return store.participantsOf(sessionId).stream().filter(Participant::votes).toList();
    }
```

- `findVenues`: `geometryPopulation(session.id())`.
- `finishDeck`, `runoffVote`, `evaluate`: `votingPopulation(session.id())`.
- `requireDeckParticipant`: konum kontrolünden sonra `if (participant.manual()) throw new ConflictException("manual points do not swipe");`.

- [ ] **Step 6: PASS doğrula** — Run: `MVN test -Dtest='SessionCommandsTest,DeckFlowTest,TextsTest'` → `Failures: 0, Errors: 0`.

- [ ] **Step 7: INDEX güncelle + Commit (kullanıcı)** — `feat(session): oturum tipi, elle konum, oy/geometri populasyonu`

---

### Task 4: `BROWSING`'de doğrudan seçim ("Bunu seç") — GROUP host ve SOLO (TDD)

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/application/deck/DeckFlow.java`
- Modify: `backend/src/test/java/com/bumpinto/application/deck/DeckFlowTest.java`

- [ ] **Step 1: Failing tests**

```java
    @Test
    void hostPicksVenueDirectlyWhileBrowsing() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        List<Venue> venues = flow.findVenues("s1", hostUser);
        flow.forceDecision("s1", hostUser, venues.get(1).id());
        Session s = store.sessionBySlug("s1").orElseThrow();
        assertThat(s.status()).isEqualTo(SessionStatus.DECIDED);
        assertThat(s.decidedVenueId()).isEqualTo(venues.get(1).id());
        assertThat(events.published).extracting(p -> p.event().type()).contains("session_decided");
    }

    @Test
    void pickWhileBrowsingRejectsForeignVenue() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        flow.findVenues("s1", hostUser);
        assertThatThrownBy(() -> flow.forceDecision("s1", hostUser, UUID.randomUUID()))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("not in this session");
    }

    @Test
    void soloSessionDecidesByPickAndNeverShuffles() {
        Session solo = store.saveSession(new Session(UUID.randomUUID(), "solo", hostUser, null,
                ActivityType.COFFEE, SessionType.SOLO, SessionStatus.COLLECTING,
                Instant.parse("2026-09-02T10:00:00Z"), null, List.of()));
        store.saveParticipant(new Participant(UUID.randomUUID(), solo.id(), "Mehmet", DEN_BOSCH,
                true, "tok-s", null, false, "'s-Hertogenbosch"));
        store.saveParticipant(new Participant(UUID.randomUUID(), solo.id(), "Ayşe", SOMEREN,
                false, null, null, true, "Someren"));
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        List<Venue> venues = flow.findVenues("solo", hostUser);
        assertThat(store.sessionBySlug("solo").orElseThrow().status()).isEqualTo(SessionStatus.BROWSING);
        assertThatThrownBy(() -> flow.shuffle("solo", hostUser)).isInstanceOf(ConflictException.class);
        flow.forceDecision("solo", hostUser, venues.get(0).id());
        assertThat(store.sessionBySlug("solo").orElseThrow().status()).isEqualTo(SessionStatus.DECIDED);
    }
```

- [ ] **Step 2: FAIL doğrula** — Run: `MVN test -Dtest=DeckFlowTest` → `hostPicksVenueDirectlyWhileBrowsing` FAIL ("venue can only be chosen during runoff").

- [ ] **Step 3: forceDecision**

```java
    /**
     * Uc kullanim: (a) BROWSING'de "Bunu sec" — SOLO'nun tek karar yolu, GROUP'ta host kisayolu;
     * (b) RUNOFF beraberligini bozma; (c) SWIPING'de kismi katilimla degerlendirme (venueId null).
     */
    @Transactional
    public void forceDecision(String slug, UUID hostUserId, UUID chosenVenueId) {
        Session session = required(slug);
        requireHost(session, hostUserId);
        if (chosenVenueId != null) {
            switch (session.status()) {
                case BROWSING -> {
                    boolean inSession = deck.venuesOf(session.id()).stream()
                            .anyMatch(v -> v.id().equals(chosenVenueId));
                    if (!inSession) {
                        throw new ConflictException("venue is not in this session");
                    }
                }
                case RUNOFF -> {
                    if (!session.runoffVenueIds().contains(chosenVenueId)) {
                        throw new ConflictException("venue is not a finalist");
                    }
                }
                default -> throw new ConflictException(
                        "venue can only be chosen while browsing or during runoff");
            }
            decide(session, chosenVenueId);
            return;
        }
        if (session.status() != SessionStatus.SWIPING) {
            throw new ConflictException("nothing to force in status " + session.status());
        }
        evaluate(session, true);
    }
```

- [ ] **Step 4: PASS doğrula** — Run: `MVN test -Dtest=DeckFlowTest` → `Failures: 0, Errors: 0`.

- [ ] **Step 5: INDEX güncelle + Commit (kullanıcı)** — `feat(deck): BROWSING'de dogrudan secim (solo + host kisayolu)`

---

### Task 5: API — DTO'lar, `SessionViewAssembler` (yuvarlanmış konum, orta nokta, yarıçap), `PointsController`, `shuffle` ucu

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/ApiDtos.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/SessionViewAssembler.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/SessionController.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/ParticipantController.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/in/web/PointsController.java`
- Create: `backend/src/test/java/com/bumpinto/adapter/in/web/SessionViewAssemblerTest.java`
- Modify: `backend/src/test/java/com/bumpinto/ApiHappyPathTest.java`
- Modify: `backend/src/main/java/com/bumpinto/infra/security/RateLimitFilter.java` (yalnız Step 6 koşulu gerekirse)

- [ ] **Step 1: Failing assembler test** — `SessionViewAssemblerTest.java`

```java
package com.bumpinto.adapter.in.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.bumpinto.application.session.SessionQueries;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionType;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SessionViewAssemblerTest {

    SessionViewAssembler assembler = new SessionViewAssembler();

    Session session(SessionType type) {
        return new Session(UUID.randomUUID(), "s1", UUID.randomUUID(), "Cuma", ActivityType.COFFEE,
                type, SessionStatus.COLLECTING, Instant.parse("2026-09-02T10:00:00Z"), null, List.of());
    }

    Participant person(UUID sessionId, GeoPoint at, String label, boolean manual) {
        return new Participant(UUID.randomUUID(), sessionId, "P", at, false,
                manual ? null : "tok", null, manual, label);
    }

    @Test
    void participantLocationIsRoundedToTwoDecimalsAndCarriesLabelAndManualFlag() {
        Session s = session(SessionType.SOLO);
        Participant p = person(s.id(), new GeoPoint(51.697812, 5.303749), "'s-Hertogenbosch", true);
        ApiDtos.SessionView view = assembler.toView(
                new SessionQueries.SessionSnapshot(s, List.of(p), List.of(), Map.of()));
        ApiDtos.ParticipantDto dto = view.participants().get(0);
        assertThat(dto.approxLocation().lat()).isEqualTo(51.70);
        assertThat(dto.approxLocation().lng()).isEqualTo(5.30);
        assertThat(dto.locationLabel()).isEqualTo("'s-Hertogenbosch");
        assertThat(dto.manual()).isTrue();
        assertThat(view.sessionType()).isEqualTo(SessionType.SOLO);
    }

    @Test
    void midpointAndRadiusAppearOnlyWithTwoLocatedParticipants() {
        Session s = session(SessionType.GROUP);
        Participant a = person(s.id(), new GeoPoint(51.6978, 5.3037), "Den Bosch", false);
        Participant b = person(s.id(), new GeoPoint(51.3855, 5.7120), "Someren", false);
        Participant none = new Participant(UUID.randomUUID(), s.id(), "K", null, false, "t", null,
                false, null);

        ApiDtos.SessionView one = assembler.toView(
                new SessionQueries.SessionSnapshot(s, List.of(a, none), List.of(), Map.of()));
        assertThat(one.midpoint()).isNull();
        assertThat(one.radiusKm()).isNull();
        assertThat(one.participants().get(1).approxLocation()).isNull();

        ApiDtos.SessionView two = assembler.toView(
                new SessionQueries.SessionSnapshot(s, List.of(a, b), List.of(), Map.of()));
        assertThat(two.midpoint().lat()).isBetween(51.38, 51.70);
        assertThat(two.midpoint().lng()).isBetween(5.30, 5.72);
        assertThat(two.radiusKm()).isBetween(1.0, 10.0);
    }
}
```

- [ ] **Step 2: FAIL doğrula** — Run: `MVN test -Dtest=SessionViewAssemblerTest` → derleme hatası.

- [ ] **Step 3: DTO'lar** — `ApiDtos` içinde değiştir/ekle:

```java
    public record CreateSessionRequest(@NotNull ActivityType activityType,
                                       @Size(max = 60) String name,
                                       /** null → GROUP (M-1 mobil istemcisi alani gondermez). */
                                       SessionType sessionType,
                                       @NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
                                       @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng,
                                       @NotBlank @Size(max = 40) String displayName,
                                       @Size(max = 80) String locationLabel) {
    }

    public record JoinRequest(@NotBlank @Size(max = 40) String displayName,
                              @DecimalMin("-90") @DecimalMax("90") Double lat,
                              @DecimalMin("-180") @DecimalMax("180") Double lng,
                              @Size(max = 80) String locationLabel) {
    }

    public record LocationRequest(@NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
                                  @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng,
                                  @Size(max = 80) String label) {
    }

    /** SOLO: host'un elle ekledigi konum. */
    public record PointRequest(@NotBlank @Size(max = 40) String displayName,
                               @Size(max = 80) String locationLabel,
                               @NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
                               @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng) {
    }

    public record GeoPointDto(double lat, double lng) {
    }

    /** approxLocation: 2 ondalik (~1 km) — tam koordinat API'den asla cikmaz (spec §8 gizlilik). */
    public record ParticipantDto(UUID id, String displayName, boolean host, boolean hasLocation,
                                 boolean deckDone, boolean manual, String locationLabel,
                                 GeoPointDto approxLocation) {
    }

    public record SessionView(String slug, String name, ActivityType activityType,
                              SessionType sessionType, SessionStatus status, Instant expiresAt,
                              List<ParticipantDto> participants, List<VenueDto> venues,
                              List<UUID> runoffVenueIds, UUID decidedVenueId,
                              Map<UUID, Long> voteTally,
                              /** Konumu olan >=2 nokta varsa; yoksa null. */
                              GeoPointDto midpoint, Double radiusKm) {
    }
```

(`import com.bumpinto.domain.session.SessionType;` ekle. `VenueDto`, diğerleri aynen.)

- [ ] **Step 4: Assembler**

```java
@Component
public class SessionViewAssembler {

    public ApiDtos.SessionView toView(SessionQueries.SessionSnapshot snap) {
        List<ApiDtos.ParticipantDto> participants = snap.participants().stream()
                .map(p -> new ApiDtos.ParticipantDto(p.id(), p.displayName(), p.host(),
                        p.hasLocation(), p.deckDone(), p.manual(), p.locationLabel(),
                        p.hasLocation() ? approx(p.location()) : null))
                .toList();
        List<Participant> located = snap.participants().stream()
                .filter(Participant::hasLocation).toList();
        // Elle konumlarin yol suresi de gosterilir (Bireysel'de "Ayşe 28′").
        List<ApiDtos.VenueDto> venues = snap.venues().stream().map(v -> {
            Map<UUID, Integer> travel = new LinkedHashMap<>();
            located.forEach(p -> travel.put(p.id(),
                    TravelEstimate.fromCrowKm(GeoMath.distanceKm(p.location(), v.location())).minutes()));
            return new ApiDtos.VenueDto(v.id(), v.name(), v.location().lat(), v.location().lng(),
                    v.rating(), v.priceLevel(), v.photoUrl(), v.mapsUrl(), v.deckOrder(), travel);
        }).toList();
        ApiDtos.GeoPointDto midpoint = null;
        Double radiusKm = null;
        if (located.size() >= 2) {
            List<GeoPoint> points = located.stream().map(Participant::location).toList();
            GeoPoint center = GeoMath.centroid(points);
            midpoint = new ApiDtos.GeoPointDto(center.lat(), center.lng());
            radiusKm = SearchRadius.baseKm(points, center);
        }
        return new ApiDtos.SessionView(snap.session().slug(), snap.session().name(),
                snap.session().activityType(), snap.session().sessionType(),
                snap.session().status(), snap.session().expiresAt(),
                participants, venues, snap.session().runoffVenueIds(),
                snap.session().decidedVenueId(), snap.voteTally(), midpoint, radiusKm);
    }

    /** 2 ondalik = ~1.1 km enlem hassasiyeti. */
    static ApiDtos.GeoPointDto approx(GeoPoint p) {
        return new ApiDtos.GeoPointDto(Math.round(p.lat() * 100) / 100.0,
                Math.round(p.lng() * 100) / 100.0);
    }
}
```

`import com.bumpinto.domain.geo.SearchRadius;` ekle.

- [ ] **Step 5: Controller'lar**

`SessionController.create` gövdesi:

```java
        SessionCommands.CreateSessionResult result = commands.createSession(
                WebPrincipals.hostUserId(jwt), request.name(), request.activityType(),
                request.sessionType() == null ? SessionType.GROUP : request.sessionType(),
                new GeoPoint(request.lat(), request.lng()), request.displayName(),
                request.locationLabel());
```

`SessionController`'a ekle:

```java
    @PostMapping("/{slug}/shuffle")
    ApiDtos.SessionView shuffle(@AuthenticationPrincipal Jwt jwt, @PathVariable String slug) {
        deckFlow.shuffle(slug, WebPrincipals.hostUserId(jwt));
        return assembler.toView(queries.snapshot(slug));
    }
```

`ParticipantController.join`: `commands.join(slug, request.displayName(), location, request.locationLabel())`; `location`: `commands.updateLocation(slug, WebPrincipals.participantId(me), new GeoPoint(request.lat(), request.lng()), request.label())`.

`PointsController.java` (yeni):

```java
package com.bumpinto.adapter.in.web;

import com.bumpinto.application.session.SessionCommands;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.Participant;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** SOLO oturumda host'un elle ekledigi konumlar. Host JWT gerekir. */
@RestController
@RequestMapping("/api/sessions/{slug}/points")
class PointsController {

    private final SessionCommands commands;

    PointsController(SessionCommands commands) {
        this.commands = commands;
    }

    @PostMapping
    ResponseEntity<ApiDtos.ParticipantDto> add(@AuthenticationPrincipal Jwt jwt,
            @PathVariable String slug, @Valid @RequestBody ApiDtos.PointRequest request) {
        Participant point = commands.addPoint(slug, WebPrincipals.hostUserId(jwt),
                request.displayName(), request.locationLabel(),
                new GeoPoint(request.lat(), request.lng()));
        return ResponseEntity.status(HttpStatus.CREATED).body(new ApiDtos.ParticipantDto(
                point.id(), point.displayName(), false, true, false, true, point.locationLabel(),
                SessionViewAssembler.approx(point.location())));
    }

    @DeleteMapping("/{participantId}")
    ResponseEntity<Void> remove(@AuthenticationPrincipal Jwt jwt, @PathVariable String slug,
                                @PathVariable UUID participantId) {
        commands.removePoint(slug, WebPrincipals.hostUserId(jwt), participantId);
        return ResponseEntity.noContent().build();
    }
}
```

- [ ] **Step 5b: Runoff'ta "kim kilitledi"** — W7 sağ bölgesi ("Kim seçti 2/3", kişi başına "Kilitledi" rozeti) oy VERENLERİ ister, neyi seçtiklerini değil. `DeckStorePort`'a ekle: `Set<UUID> voters(UUID sessionId);` — `DeckStoreAdapter`: `votes.findBySessionId(sessionId).stream().map(e -> e.participantId).collect(Collectors.toSet())`; `FakeStores.InMemoryDeckStore`: `votes.values().stream().filter(v -> v.sessionId().equals(sessionId)).map(Vote::participantId).collect(Collectors.toSet())`. `SessionQueries.SessionSnapshot`'a `Set<UUID> voters` alanı (yalnız `RUNOFF`'ta dolu, aksi `Set.of()`); `SessionView`'a `List<UUID> runoffVotedParticipantIds` (assembler `snap.voters()`'ı sıralı listeye çevirir). `SessionViewAssemblerTest`'teki `SessionSnapshot` çağrılarına son argüman `Set.of()` ekle. `DeckFlowTest.runoffTieStaysOpenUntilHostForces` sonuna: `assertThat(deck.voters(session.id())).containsExactlyInAnyOrder(host.id(), ayse.id());`.

- [ ] **Step 6: Rate limit kovası** — Run: `rtk grep -n "Pattern\|matches\|/api/sessions" src/main/java/com/bumpinto/infra/security/RateLimitFilter.java`. Filtre yolları **desenle** (`/api/sessions/**` gibi) seçiyorsa değişiklik yok. **Tam yol** listeliyorsa `/{slug}/shuffle` ve `/{slug}/points` yollarını `find-venues` ile aynı kovaya ekle ve `RateLimitFilterTest`'e bir satır test ekle (aynı kova, aynı limit).

- [ ] **Step 7: ApiHappyPathTest güncelle** — 3. adımdan sonra:

```java
        // 3 — host desteyi kurar: onceki BROWSING ("Mekanlar"), herkes harita+listede gorur
        JsonNode view = json.readTree(viewBody);
        assertThat(view.get("status").asString()).isEqualTo("BROWSING");
        assertThat(view.get("sessionType").asString()).isEqualTo("GROUP");
        assertThat(view.get("venues").size()).isEqualTo(6);
        assertThat(view.get("midpoint").get("lat").asDouble()).isBetween(51.38, 51.70);
        assertThat(view.get("radiusKm").asDouble()).isBetween(1.0, 10.0);
        // katilimci konumu 2 ondalikla doner (yaklasik ~1 km) — tam koordinat sizmaz
        assertThat(view.get("participants").get(1).get("approxLocation").get("lat").asDouble())
                .isEqualTo(51.39);
        // 3b — host "Karistir": SWIPING
        String shuffled = mvc.perform(post("/api/sessions/" + slug + "/shuffle")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(json.readTree(shuffled).get("status").asString()).isEqualTo("SWIPING");
        String favoriteId = json.readTree(shuffled).get("venues").get(0).get("id").asString();
```

Ve aynı sınıfa **SOLO akışı** testi ekle:

```java
    @Test
    void soloSessionPicksFromMapWithoutDeck() throws Exception {
        when(google.verify("gid2"))
                .thenReturn(new GoogleIdVerifier.GoogleUser("solo@bumpinto.test", "Mehmet"));
        when(provider.search(any(), anyDouble(), any(), anyInt())).thenReturn(List.of(
                new VenueCandidate("foursquare", "f1", "Café Berlage", new GeoPoint(51.44, 5.47),
                        4.6, 2, null, "https://maps/1")));
        String accessToken = json.readTree(mvc.perform(post("/api/auth/google")
                        .contentType(JSON).content("{\"idToken\":\"gid2\"}"))
                .andReturn().getResponse().getContentAsString()).get("accessToken").asString();

        String slug = json.readTree(mvc.perform(post("/api/sessions")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(JSON)
                        .content("{\"activityType\":\"COFFEE\",\"sessionType\":\"SOLO\","
                                + "\"lat\":51.6978,\"lng\":5.3037,\"displayName\":\"Mehmet\","
                                + "\"locationLabel\":\"'s-Hertogenbosch\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString()).get("slug").asString();

        // katilim SOLO'da kapali
        mvc.perform(post("/api/sessions/" + slug + "/participants")
                        .contentType(JSON).content("{\"displayName\":\"Ayşe\"}"))
                .andExpect(status().isConflict());

        // elle konum
        String pointBody = mvc.perform(post("/api/sessions/" + slug + "/points")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(JSON)
                        .content("{\"displayName\":\"Ayşe\",\"locationLabel\":\"Someren\","
                                + "\"lat\":51.3855,\"lng\":5.7120}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        assertThat(json.readTree(pointBody).get("manual").asBoolean()).isTrue();

        String browsing = mvc.perform(post("/api/sessions/" + slug + "/find-venues")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode view = json.readTree(browsing);
        assertThat(view.get("status").asString()).isEqualTo("BROWSING");
        String venueId = view.get("venues").get(0).get("id").asString();

        mvc.perform(post("/api/sessions/" + slug + "/shuffle")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isConflict());

        String decided = mvc.perform(post("/api/sessions/" + slug + "/force-decision")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(JSON).content("{\"venueId\":\"" + venueId + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(json.readTree(decided).get("status").asString()).isEqualTo("DECIDED");
        assertThat(json.readTree(decided).get("decidedVenueId").asString()).isEqualTo(venueId);
    }
```

- [ ] **Step 8: PASS doğrula** — Run: `MVN test` → tüm suite yeşil (`HexagonalArchitectureTest` dahil).

- [ ] **Step 9: INDEX güncelle + Commit (kullanıcı)** — `feat(api): sessionType, points, shuffle, approxLocation, midpoint`

---

### Task 6: Bruno koleksiyonu + OpenAPI codegen + ARCHITECTURE.md

**Files:**
- Create: `backend/.infra/bumpinto-collection/sessions/shuffle.yml`
- Create: `backend/.infra/bumpinto-collection/points/folder.yml`
- Create: `backend/.infra/bumpinto-collection/points/add-point.yml`
- Create: `backend/.infra/bumpinto-collection/points/remove-point.yml`
- Modify: `backend/.infra/bumpinto-collection/sessions/create-session.yml` (docs + body)
- Modify: `backend/.infra/bumpinto-collection/sessions/get-session.yml` (docs)
- Modify: `backend/.infra/bumpinto-collection/sessions/force-decision.yml` (docs, seq → 5)
- Modify: `backend/.infra/bumpinto-collection/participants/join-session.yml`, `update-location.yml` (docs: `locationLabel` / `label`)
- Modify: `frontend/shared/openapi.json`, `frontend/shared/src/api-types.ts` (codegen çıktısı)
- Modify: `package.json` (kök; `codegen` portu)
- Modify: `backend/ARCHITECTURE.md` §7

- [ ] **Step 1: `sessions/shuffle.yml`**

```yaml
info:
  name: Shuffle (Karıştır ve kaydır)
  type: http
  seq: 4

http:
  method: POST
  url: "{{baseUrl}}/api/sessions/{{slug}}/shuffle"
  auth:
    type: bearer
    token: "{{accessToken}}"

runtime:
  scripts:
    - type: tests
      code: |-
        test("200 doner", function() {
          expect(res.status).to.equal(200);
        });
        test("SWIPING'e gecer", function() {
          expect(res.body.status).to.equal("SWIPING");
        });

docs:
  type: text/markdown
  content: |-
    Host JWT gerekir. Yalniz `BROWSING` durumunda ve `sessionType=GROUP` icin (aksi 409).
    `deckOrder` herkes icin ayni rastgele siraya yazilir; `deck_ready` olayi yayinlanir.
    Rate limit: find-venues ile ayni kova.
```

`force-decision.yml` içinde `seq: 5` yap ve docs'a ekle: "**BROWSING'de dogrudan secim:** `venueId` verilir; SOLO'nun tek karar yolu, GROUP'ta host kisayolu (mekan oturumda olmali, aksi 409)."

- [ ] **Step 2: `points/`** — `folder.yml`:

```yaml
info:
  name: Points (elle konum · SOLO)
  seq: 3
```

`add-point.yml`:

```yaml
info:
  name: Add Point
  type: http
  seq: 1

http:
  method: POST
  url: "{{baseUrl}}/api/sessions/{{slug}}/points"
  headers:
    - name: content-type
      value: application/json
  body:
    type: json
    data: |-
      {
        "displayName": "Ayşe",
        "locationLabel": "Someren",
        "lat": 51.3855,
        "lng": 5.7120
      }
  auth:
    type: bearer
    token: "{{accessToken}}"

runtime:
  scripts:
    - type: after-response
      code: |-
        if (res.status === 201) {
          bru.setVar("pointId", res.body.id);
        }
    - type: tests
      code: |-
        test("201 doner", function() {
          expect(res.status).to.equal(201);
        });
        test("manual=true", function() {
          expect(res.body.manual).to.equal(true);
        });

docs:
  type: text/markdown
  content: |-
    Host JWT gerekir. Yalniz `sessionType=SOLO` ve `COLLECTING` durumunda (aksi 409).
    Token'siz, oy vermeyen katilimci olusturur; orta nokta ve yaricapa dahildir.
    `displayName` max 40, `locationLabel` max 80, lat/lng aralik disi 400.
```

`remove-point.yml`:

```yaml
info:
  name: Remove Point
  type: http
  seq: 2

http:
  method: DELETE
  url: "{{baseUrl}}/api/sessions/{{slug}}/points/{{pointId}}"
  auth:
    type: bearer
    token: "{{accessToken}}"

runtime:
  scripts:
    - type: tests
      code: |-
        test("204 doner", function() {
          expect(res.status).to.equal(204);
        });

docs:
  type: text/markdown
  content: |-
    Host JWT gerekir. Yalniz elle eklenen (`manual=true`) katilimci silinebilir; host'un kendi
    satiri 409. Mekanlar bulunduktan sonra (COLLECTING disi) 409.
```

- [ ] **Step 3: Mevcut isteklerin docs/body güncellemesi** — `create-session.yml` body'ye `"sessionType": "GROUP",` ve `"locationLabel": "'s-Hertogenbosch"` ekle; docs'a: "`sessionType`: `GROUP` (varsayilan) | `SOLO`. SOLO'da davet linki calismaz, konumlar `points` ile eklenir." `get-session.yml` docs'a yeni alanlar: `sessionType`, `midpoint{lat,lng}` + `radiusKm` (konumlu >=2 nokta varsa), `participants[].approxLocation` (2 ondalik), `locationLabel`, `manual`; durum listesine `BROWSING`. `join-session.yml` body'ye `"locationLabel": "Someren"`; `update-location.yml` body'ye `"label": "Someren"`.

- [ ] **Step 4: OpenAPI codegen** — Kök `package.json` `codegen` betiğindeki port `8080` → `8060` (application.yml `server.port`). Backend'i yerel çalıştır (`SPRING_PROFILES_ACTIVE=local`, gerekirse `DB_URL=jdbc:postgresql://localhost:5434/bumpinto`), sonra kökten:
`export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && rtk pnpm codegen`
Expected: `frontend/shared/src/api-types.ts` içinde `SessionType`, `PointRequest`, `GeoPointDto`, `approxLocation`, `midpoint`, `radiusKm`, `/api/sessions/{slug}/shuffle`, `/api/sessions/{slug}/points` görünür. Ardından `frontend/shared/src/api.ts`'e ekle:

```typescript
    shuffle: (slug: string) =>
      http.post<SessionView>(`/api/sessions/${slug}/shuffle`).then((r) => r.data),
    addPoint: (slug: string, body: Schemas["PointRequest"]) =>
      http.post<ParticipantDto>(`/api/sessions/${slug}/points`, body).then((r) => r.data),
    removePoint: (slug: string, participantId: string) =>
      http.delete(`/api/sessions/${slug}/points/${participantId}`).then(() => undefined),
```

Web derlemesi kırılmamalı: `rtk pnpm --filter @bumpinto/web exec tsc --noEmit` yeşil (ParticipantDto yeni alanları opsiyonel okur).

- [ ] **Step 5: ARCHITECTURE.md §7** — durum makinesi diyagramını güncelle:

```
COLLECTING ──find-venues──> SUGGESTING ──deste kuruldu──> BROWSING ("Mekanlar")
                                │                              │
                     mekan yok  │              GROUP: shuffle  ├──> SWIPING ──> DECIDED / RUNOFF ──> DECIDED
                     (geri döner)              host/SOLO seçim └──> DECIDED
```

"Deste popülasyonu kuralı" bölümünü **geometri / oy** ikilisiyle yeniden yaz (bu planın "Alan modeli özeti" metni). `SessionType` ve elle konum kuralını (token yok, oy yok) ekle. Son güncelleme tarihini değiştir.

- [ ] **Step 6: Kapanış kapısı** — Run: `MVN test` yeşil; Bruno koleksiyonu local ortamda baştan sona koşar (create → points → find-venues → shuffle 409(SOLO)/200(GROUP) → force-decision).

- [ ] **Step 7: INDEX'te B-5 `done` + Commit (kullanıcı)** — `docs(api): bruno + openapi + mimari notlari (rev 2)`

---

## Plan sonu doğrulaması

- [ ] `MVN test` → tüm testler yeşil, `HexagonalArchitectureTest` 4 kural yeşil.
- [ ] `GET /api/sessions/{slug}` GROUP'ta `BROWSING` → `shuffle` → `SWIPING`; SOLO'da `BROWSING` → `force-decision{venueId}` → `DECIDED`.
- [ ] Elle konum: token null, `manual=true`, `deck_progress.total` elle konumları saymıyor.
- [ ] `participants[].approxLocation` 2 ondalık; tam koordinat hiçbir yanıtta yok.
- [ ] Bruno'da 3 yeni istek + 5 güncellenmiş docs; `frontend/shared` codegen güncel; web `tsc` yeşil.
- [ ] Spec §8 kalemleri 4–9 kapandı (1–3 ve 10 → B-6 / I-1).
