# Plan 2: Backend Application + Adapter Katmanları (API, Security, Unirest, STOMP)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plan 1'in domain çekirdeğini gerçek bir API'ye dönüştürmek: oturum yaşam döngüsü uçları, Spring Security (Google JWT + katılımcı token), Unirest ile mekan sağlayıcıları, STOMP olayları ve uçtan uca happy-path testi.

**Architecture:** Hexagonal devamı — `domain.session` modeli + portlar (saf), `application` use-case servisleri, `adapter.out.persistence` (JPA), `adapter.out.provider` (Unirest), `adapter.in.web` (REST + STOMP), `infra` (security/config). Bağımlılık yönü daima içeri; Plan 1 Task 8'deki ArchUnit kuralları yeşil kalmalı.

**Tech Stack:** Plan 1 + spring-boot-starter-data-jpa, spring-boot-starter-security, spring-boot-starter-oauth2-resource-server, spring-boot-starter-websocket, spring-boot-starter-cache + Caffeine, Unirest (`com.konghq:unirest-java-core` + `unirest-mocks`), springdoc-openapi.

**Ön koşul:** Plan 1 `done` (INDEX.md'ye bak). Docker çalışıyor.

---

## Bu plana özel kurallar

- **INDEX güncelle:** başlarken `in-progress`, her görev sonunda `Son adım`, bitince `done`
  (`docs/superpowers/plans/INDEX.md`).
- **Git yazma işlemi YOK** — commit adımları kullanıcıya bırakılır.
- Komutlar `rtk` önekiyle; `mvn` komutları `backend/` dizininden.
- Sürüm notu: bağımlılık sürümleri yazım anı içindir (`unirest 4.5.0`, `springdoc 3.0.1`,
  `archunit 1.4.0`); kurulumda en güncel uyumlu minor'a yükselt.
- API anahtarları asla koda/log'a yazılmaz; `.env` okunmaz — env değişkenleri kullanıcıdan istenir.

## Uç nokta sözleşmesi (bu planın ürettiği API)

```text
POST   /api/auth/google                       public        Google id_token doğrula → backend access token
                                                            (X-Client: web → HttpOnly cookie; mobile → body)
POST   /api/sessions                          host JWT      oturum kur (host katılımcı olarak eklenir)
GET    /api/sessions/{slug}                   token|JWT     oturum görünümü (durum bazlı alanlar)
POST   /api/sessions/{slug}/participants      public        katıl → participantToken döner
PUT    /api/sessions/{slug}/location          token         konum güncelle
POST   /api/sessions/{slug}/find-venues       host JWT      orta nokta + deste kur → SWIPING
POST   /api/sessions/{slug}/swipes            token         {venueId, liked}
DELETE /api/sessions/{slug}/swipes/{venueId}  token         geri al
POST   /api/sessions/{slug}/deck-done         token         desteyi bitir (hepsi bitince karar motoru)
POST   /api/sessions/{slug}/force-decision    host JWT      kısmi katılımla değerlendir / runoff beraberliğini boz
POST   /api/sessions/{slug}/runoff-votes      token         {venueId} tek seçim
GET    /v3/api-docs                           public        OpenAPI (codegen için)
WS     /ws  → /topic/session/{slug}           public        olaylar: participant_joined, deck_ready,
                                                            deck_progress, runoff_started, session_decided
```

## Güvenlik mimarisi (BAĞLAYICI — kullanıcı talimatı 2026-09-01)

- **Backend kendi access token'ını basar** (HMAC-SHA256 JWT, `TOKEN_SECRET`, TTL 12h).
  Google id_token YALNIZCA `/api/auth/google`'da doğrulanır; API'nin geri kalanı
  backend token'ı kabul eder.
- **Web hassas bilgi tutmaz:** access token → `bumpinto_at` HttpOnly cookie
  (`Path=/api`); katılımcı token → `bumpinto_pt_{slug}` HttpOnly cookie
  (`Path=/api/sessions/{slug}` — çoklu oturum çakışmaz). Body'de token dönmez
  (`X-Client: web`). Axios `withCredentials: true` ile çağırır.
- **Mobil:** token response body'de döner; Expo SecureStore'da saklanır,
  `Authorization: Bearer` header'ıyla gönderilir.
- **CORS:** profil bazlı origin allowlist + `allowCredentials: true`; header'lar
  yalnız `Authorization, Content-Type, X-Participant-Token, X-Client`.
- **CSRF:** ayrı token YOK — bilinçli karar: cookie'ler `SameSite=Lax` (bumpinto.app
  ↔ api.bumpinto.app aynı site) + origin-kısıtlı credentialed CORS. API'de tarayıcı
  form-post akışı yok. Bu gerekçe koddan silinmez.
- **Rate limit:** Bucket4j + Caffeine, IP anahtarlı, uç bazlı politikalar
  (auth 5/dk, join 10/dk, find-venues 3/dk, create 10/dk, diğer /api 120/dk);
  aşımda 429 + `Retry-After`. Çoklu pod'da Redis backend'ine geçilir (Task 10).
- **SQL injection duruşu:** koruma parametrik sorgulardır — tüm erişim Spring Data
  türetilmiş/JPQL sorgularından geçer ve bu ArchUnit kuralıyla ZORLANIR
  (`EntityManager`/`JdbcTemplate` production kodda yasak). Girdi hijyeni ayrı katman:
  `Texts` normalizer + DTO `@Size` sınırları. Tırnak/keyword "temizleyici" bilinçli
  olarak YOK — meşru veriyi bozar ('s-Hertogenbosch), güvenlik sağlamaz (OWASP).
- **Profiller:** `local` / `preprod` / `prod` — cookie `Secure` bayrağı, CORS origin
  listesi ve log seviyesi profile göre. `SPRING_PROFILES_ACTIVE` ile seçilir;
  default `local`.

---

### Task 1: V2 migration + JPA persistence katmanı

**Files:**
- Modify: `backend/pom.xml` (data-jpa ekle)
- Create: `backend/src/main/resources/db/migration/V2__session_extras.sql`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/persistence/SessionEntity.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/persistence/ParticipantEntity.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/persistence/VenueEntity.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/persistence/SwipeEntity.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/persistence/VoteEntity.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/persistence/UserEntity.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/persistence/Jpa.java` (Spring Data arayüzleri)
- Test: `backend/src/test/java/com/bumpinto/adapter/out/persistence/PersistenceSliceTest.java`

Not: entity alanları package-private, getter yok — yalnızca aynı paketteki adapter okur
(Task 4). Hibernate field-access ile çalışır; API dışına entity sızmaz.

- [ ] **Step 1: pom.xml'e ekle**

```xml
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
```

- [ ] **Step 2: V2__session_extras.sql**

```sql
alter table sessions add column name text;
alter table sessions add column decided_venue_id uuid references venues (id);
alter table sessions add column runoff_venue_ids text;
alter table participants add column is_host boolean not null default false;
```

- [ ] **Step 3: Failing slice testini yaz**

```java
package com.bumpinto.adapter.out.persistence;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.AutoConfigureTestDatabase;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class PersistenceSliceTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired Jpa.Users users;
    @Autowired Jpa.Sessions sessions;
    @Autowired Jpa.Participants participants;

    @Test
    void sessionAndParticipantRoundTrip() {
        UserEntity u = UserEntity.of(UUID.randomUUID(), "m@x.dev", "Mehmet", "google");
        users.save(u);

        SessionEntity s = new SessionEntity();
        s.id = UUID.randomUUID();
        s.slug = "x7k2m";
        s.hostId = u.id;
        s.name = "Cuma kahvesi";
        s.activityType = "COFFEE";
        s.status = "COLLECTING";
        s.expiresAt = Instant.now().plusSeconds(3600);
        sessions.save(s);

        ParticipantEntity p = new ParticipantEntity();
        p.id = UUID.randomUUID();
        p.sessionId = s.id;
        p.displayName = "Mehmet";
        p.lat = 51.6978;
        p.lng = 5.3037;
        p.token = "tok-1";
        p.isHost = true;
        participants.save(p);

        assertThat(sessions.findBySlug("x7k2m")).isPresent();
        assertThat(participants.findByToken("tok-1")).isPresent();
        assertThat(participants.findBySessionId(s.id)).hasSize(1);
    }
}
```

- [ ] **Step 4: FAIL doğrula** — Run: `rtk mvn -q test -Dtest=PersistenceSliceTest` → derleme hatası (entity'ler yok).

- [ ] **Step 5: Entity'leri yaz**

`SessionEntity.java`:

```java
package com.bumpinto.adapter.out.persistence;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "sessions")
class SessionEntity {
    @Id UUID id;
    String slug;
    UUID hostId;
    String name;
    String activityType;
    String status;
    Instant expiresAt;
    Instant createdAt;
    UUID decidedVenueId;
    String runoffVenueIds; // csv
}
```

`ParticipantEntity.java`:

```java
package com.bumpinto.adapter.out.persistence;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "participants")
class ParticipantEntity {
    @Id UUID id;
    UUID sessionId;
    String displayName;
    Double lat;
    Double lng;
    String token;
    Instant joinedAt;
    Instant deckDoneAt;
    boolean isHost;
}
```

`VenueEntity.java`:

```java
package com.bumpinto.adapter.out.persistence;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "venues")
class VenueEntity {
    @Id UUID id;
    UUID sessionId;
    String provider;
    String externalId;
    String name;
    double lat;
    double lng;
    Double rating;
    Integer priceLevel;
    String photoUrl;
    String mapsUrl;
    int deckOrder;
}
```

`SwipeEntity.java`:

```java
package com.bumpinto.adapter.out.persistence;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "swipes")
@IdClass(SwipeEntity.Key.class)
class SwipeEntity {
    @Id UUID venueId;
    @Id UUID participantId;
    UUID sessionId;
    boolean liked;
    Instant swipedAt;

    static class Key implements Serializable {
        UUID venueId;
        UUID participantId;

        Key() {
        }

        Key(UUID venueId, UUID participantId) {
            this.venueId = venueId;
            this.participantId = participantId;
        }

        @Override public boolean equals(Object o) {
            return o instanceof Key k && venueId.equals(k.venueId) && participantId.equals(k.participantId);
        }

        @Override public int hashCode() {
            return venueId.hashCode() * 31 + participantId.hashCode();
        }
    }
}
```

`VoteEntity.java`:

```java
package com.bumpinto.adapter.out.persistence;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "votes")
@IdClass(VoteEntity.Key.class)
class VoteEntity {
    @Id UUID sessionId;
    @Id UUID participantId;
    UUID venueId;
    Instant votedAt;

    static class Key implements Serializable {
        UUID sessionId;
        UUID participantId;

        Key() {
        }

        Key(UUID sessionId, UUID participantId) {
            this.sessionId = sessionId;
            this.participantId = participantId;
        }

        @Override public boolean equals(Object o) {
            return o instanceof Key k && sessionId.equals(k.sessionId) && participantId.equals(k.participantId);
        }

        @Override public int hashCode() {
            return sessionId.hashCode() * 31 + participantId.hashCode();
        }
    }
}
```

`UserEntity.java`:

```java
package com.bumpinto.adapter.out.persistence;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "users")
class UserEntity {
    @Id UUID id;
    String email;
    String name;
    String authProvider;

    static UserEntity of(UUID id, String email, String name, String provider) {
        UserEntity u = new UserEntity();
        u.id = id;
        u.email = email;
        u.name = name;
        u.authProvider = provider;
        return u;
    }
}
```

`Jpa.java`:

```java
package com.bumpinto.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public final class Jpa {

    private Jpa() {
    }

    public interface Users extends JpaRepository<UserEntity, UUID> {
        Optional<UserEntity> findByEmail(String email);
    }

    public interface Sessions extends JpaRepository<SessionEntity, UUID> {
        Optional<SessionEntity> findBySlug(String slug);
    }

    public interface Participants extends JpaRepository<ParticipantEntity, UUID> {
        List<ParticipantEntity> findBySessionId(UUID sessionId);
        Optional<ParticipantEntity> findByToken(String token);
    }

    public interface Venues extends JpaRepository<VenueEntity, UUID> {
        List<VenueEntity> findBySessionIdOrderByDeckOrder(UUID sessionId);
    }

    public interface Swipes extends JpaRepository<SwipeEntity, SwipeEntity.Key> {
        List<SwipeEntity> findBySessionId(UUID sessionId);
    }

    public interface Votes extends JpaRepository<VoteEntity, VoteEntity.Key> {
        List<VoteEntity> findBySessionId(UUID sessionId);
    }
}
```

- [ ] **Step 6: PASS doğrula** — Run: `rtk mvn -q test -Dtest=PersistenceSliceTest` → `Tests run: 1, Failures: 0`. Ayrıca `rtk mvn -q test -Dtest=HexagonalArchitectureTest` hâlâ yeşil (entity'ler adapter'da, domain temiz).

- [ ] **Step 7: INDEX güncelle + Commit (kullanıcı)** — `feat(persistence): jpa entityleri, v2 migration`

---

### Task 2: Domain session modeli + portlar (saf)

**Files:**
- Create: `backend/src/main/java/com/bumpinto/domain/session/ActivityType.java`
- Create: `backend/src/main/java/com/bumpinto/domain/session/SessionStatus.java`
- Create: `backend/src/main/java/com/bumpinto/domain/session/Session.java`
- Create: `backend/src/main/java/com/bumpinto/domain/session/Participant.java`
- Create: `backend/src/main/java/com/bumpinto/domain/venue/Venue.java`
- Create: `backend/src/main/java/com/bumpinto/domain/venue/VenueCandidate.java`
- Create: `backend/src/main/java/com/bumpinto/domain/port/SessionStorePort.java`
- Create: `backend/src/main/java/com/bumpinto/domain/port/DeckStorePort.java`
- Create: `backend/src/main/java/com/bumpinto/domain/port/VenueProviderPort.java`
- Create: `backend/src/main/java/com/bumpinto/domain/port/UserStorePort.java`
- Create: `backend/src/main/java/com/bumpinto/domain/port/SessionEventsPort.java`
- Create: `backend/src/main/java/com/bumpinto/domain/port/SessionEvent.java`

Saf tipler — test etmeye değer davranış yok (Task 3'te use-case'lerle test edilir);
ArchUnit saflığı korur.

- [ ] **Step 1: Tipleri yaz**

`ActivityType.java`:

```java
package com.bumpinto.domain.session;

public enum ActivityType { COFFEE, FOOD, BAR, WALK, ACTIVITY }
```

`SessionStatus.java`:

```java
package com.bumpinto.domain.session;

public enum SessionStatus { COLLECTING, SUGGESTING, SWIPING, RUNOFF, DECIDED, EXPIRED }
```

`Session.java`:

```java
package com.bumpinto.domain.session;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record Session(UUID id, String slug, UUID hostId, String name, ActivityType activityType,
                      SessionStatus status, Instant expiresAt, UUID decidedVenueId,
                      List<UUID> runoffVenueIds) {

    public Session withStatus(SessionStatus newStatus) {
        return new Session(id, slug, hostId, name, activityType, newStatus, expiresAt,
                decidedVenueId, runoffVenueIds);
    }

    public Session decided(UUID venueId) {
        return new Session(id, slug, hostId, name, activityType, SessionStatus.DECIDED, expiresAt,
                venueId, runoffVenueIds);
    }

    public Session inRunoff(List<UUID> venueIds) {
        return new Session(id, slug, hostId, name, activityType, SessionStatus.RUNOFF, expiresAt,
                null, List.copyOf(venueIds));
    }
}
```

`Participant.java`:

```java
package com.bumpinto.domain.session;

import com.bumpinto.domain.geo.GeoPoint;

import java.time.Instant;
import java.util.UUID;

public record Participant(UUID id, UUID sessionId, String displayName, GeoPoint location,
                          boolean host, String token, Instant deckDoneAt) {

    public boolean hasLocation() {
        return location != null;
    }

    public boolean deckDone() {
        return deckDoneAt != null;
    }

    public Participant locatedAt(GeoPoint newLocation) {
        return new Participant(id, sessionId, displayName, newLocation, host, token, deckDoneAt);
    }

    public Participant doneAt(Instant when) {
        return new Participant(id, sessionId, displayName, location, host, token, when);
    }
}
```

`Venue.java`:

```java
package com.bumpinto.domain.venue;

import com.bumpinto.domain.geo.GeoPoint;

import java.util.UUID;

public record Venue(UUID id, UUID sessionId, String provider, String externalId, String name,
                    GeoPoint location, Double rating, Integer priceLevel, String photoUrl,
                    String mapsUrl, int deckOrder) {
}
```

`VenueCandidate.java`:

```java
package com.bumpinto.domain.venue;

import com.bumpinto.domain.geo.GeoPoint;

public record VenueCandidate(String provider, String externalId, String name, GeoPoint location,
                             Double rating, Integer priceLevel, String photoUrl, String mapsUrl) {
}
```

`SessionStorePort.java`:

```java
package com.bumpinto.domain.port;

import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SessionStorePort {
    Session saveSession(Session session);
    Optional<Session> sessionBySlug(String slug);
    Participant saveParticipant(Participant participant);
    List<Participant> participantsOf(UUID sessionId);
    Optional<Participant> participantByToken(String token);
}
```

`DeckStorePort.java`:

```java
package com.bumpinto.domain.port;

import com.bumpinto.domain.venue.Venue;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

public interface DeckStorePort {
    List<Venue> saveVenues(List<Venue> venues);
    List<Venue> venuesOf(UUID sessionId);
    void saveSwipe(UUID sessionId, UUID venueId, UUID participantId, boolean liked);
    void deleteSwipe(UUID venueId, UUID participantId);
    Map<UUID, Set<UUID>> likesByParticipant(UUID sessionId);
    void castVote(UUID sessionId, UUID venueId, UUID participantId);
    Map<UUID, Long> voteTally(UUID sessionId);
    long votersCount(UUID sessionId);
}
```

`VenueProviderPort.java`:

```java
package com.bumpinto.domain.port;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.VenueCandidate;

import java.util.List;

public interface VenueProviderPort {
    List<VenueCandidate> search(GeoPoint center, double radiusKm, ActivityType type, int limit);
}
```

`UserStorePort.java`:

```java
package com.bumpinto.domain.port;

import java.util.UUID;

public interface UserStorePort {
    UUID upsertByEmail(String email, String name);
}
```

`SessionEvent.java`:

```java
package com.bumpinto.domain.port;

import java.util.Map;
import java.util.UUID;

public record SessionEvent(String type, Map<String, Object> payload) {

    public static SessionEvent participantJoined(int count) {
        return new SessionEvent("participant_joined", Map.of("participantCount", count));
    }

    public static SessionEvent deckReady(int venueCount) {
        return new SessionEvent("deck_ready", Map.of("venueCount", venueCount));
    }

    public static SessionEvent deckProgress(long done, long total) {
        return new SessionEvent("deck_progress", Map.of("done", done, "total", total));
    }

    public static SessionEvent runoffStarted(int finalistCount) {
        return new SessionEvent("runoff_started", Map.of("finalistCount", finalistCount));
    }

    public static SessionEvent sessionDecided(UUID venueId) {
        return new SessionEvent("session_decided", Map.of("venueId", venueId.toString()));
    }
}
```

`SessionEventsPort.java`:

```java
package com.bumpinto.domain.port;

public interface SessionEventsPort {
    void publish(String slug, SessionEvent event);
}
```

- [ ] **Step 2: Derleme + ArchUnit yeşil** — Run: `rtk mvn -q test -Dtest=HexagonalArchitectureTest` → `Tests run: 2, Failures: 0`

- [ ] **Step 3: INDEX güncelle + Commit (kullanıcı)** — `feat(domain): session/venue modeli ve portlar`

---

### Task 3: Application — SessionCommands (TDD, fake portlarla)

**Files:**
- Create: `backend/src/main/java/com/bumpinto/application/Ids.java`
- Create: `backend/src/main/java/com/bumpinto/application/NotFoundException.java`
- Create: `backend/src/main/java/com/bumpinto/application/ConflictException.java`
- Create: `backend/src/main/java/com/bumpinto/application/Texts.java`
- Create: `backend/src/main/java/com/bumpinto/application/SessionCommands.java`
- Test: `backend/src/test/java/com/bumpinto/application/TextsTest.java`
- Test: `backend/src/test/java/com/bumpinto/application/FakeStores.java`
- Test: `backend/src/test/java/com/bumpinto/application/SessionCommandsTest.java`

- [ ] **Step 1: Fake store'ları yaz** (Task 8'de de kullanılacak — tek kaynak)

```java
package com.bumpinto.application;

import com.bumpinto.domain.port.DeckStorePort;
import com.bumpinto.domain.port.SessionEvent;
import com.bumpinto.domain.port.SessionEventsPort;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.venue.Venue;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

public class FakeStores {

    public static class InMemorySessionStore implements SessionStorePort {
        public final Map<UUID, Session> sessions = new HashMap<>();
        public final Map<UUID, Participant> participants = new HashMap<>();

        @Override public Session saveSession(Session s) {
            sessions.put(s.id(), s);
            return s;
        }

        @Override public Optional<Session> sessionBySlug(String slug) {
            return sessions.values().stream().filter(s -> s.slug().equals(slug)).findFirst();
        }

        @Override public Participant saveParticipant(Participant p) {
            participants.put(p.id(), p);
            return p;
        }

        @Override public List<Participant> participantsOf(UUID sessionId) {
            return participants.values().stream()
                    .filter(p -> p.sessionId().equals(sessionId)).toList();
        }

        @Override public Optional<Participant> participantByToken(String token) {
            return participants.values().stream().filter(p -> p.token().equals(token)).findFirst();
        }
    }

    public record Published(String slug, SessionEvent event) {
    }

    public static class RecordingEvents implements SessionEventsPort {
        public final List<Published> published = new ArrayList<>();

        @Override public void publish(String slug, SessionEvent event) {
            published.add(new Published(slug, event));
        }
    }

    public static class InMemoryDeckStore implements DeckStorePort {
        public final List<Venue> venues = new ArrayList<>();
        public final Map<UUID, Map<UUID, Boolean>> swipes = new HashMap<>(); // participant -> venue -> liked
        public final Map<UUID, UUID> votes = new HashMap<>();                // participant -> venue

        @Override public List<Venue> saveVenues(List<Venue> vs) {
            venues.addAll(vs);
            return vs;
        }

        @Override public List<Venue> venuesOf(UUID sessionId) {
            return venues.stream().filter(v -> v.sessionId().equals(sessionId)).toList();
        }

        @Override public void saveSwipe(UUID sessionId, UUID venueId, UUID participantId, boolean liked) {
            swipes.computeIfAbsent(participantId, k -> new HashMap<>()).put(venueId, liked);
        }

        @Override public void deleteSwipe(UUID venueId, UUID participantId) {
            Map<UUID, Boolean> m = swipes.get(participantId);
            if (m != null) m.remove(venueId);
        }

        @Override public Map<UUID, Set<UUID>> likesByParticipant(UUID sessionId) {
            return swipes.entrySet().stream().collect(Collectors.toMap(
                    Map.Entry::getKey,
                    e -> e.getValue().entrySet().stream()
                            .filter(Map.Entry::getValue).map(Map.Entry::getKey)
                            .collect(Collectors.toCollection(HashSet::new))));
        }

        @Override public void castVote(UUID sessionId, UUID venueId, UUID participantId) {
            votes.put(participantId, venueId);
        }

        @Override public Map<UUID, Long> voteTally(UUID sessionId) {
            return votes.values().stream()
                    .collect(Collectors.groupingBy(v -> v, Collectors.counting()));
        }

        @Override public long votersCount(UUID sessionId) {
            return votes.size();
        }
    }
}
```

- [ ] **Step 2: Failing testi yaz**

```java
package com.bumpinto.application;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.SessionStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SessionCommandsTest {

    static final GeoPoint DEN_BOSCH = new GeoPoint(51.6978, 5.3037);
    static final GeoPoint SOMEREN = new GeoPoint(51.3855, 5.7120);

    FakeStores.InMemorySessionStore store;
    FakeStores.RecordingEvents events;
    SessionCommands commands;

    @BeforeEach
    void setUp() {
        store = new FakeStores.InMemorySessionStore();
        events = new FakeStores.RecordingEvents();
        commands = new SessionCommands(store, events,
                Clock.fixed(Instant.parse("2026-09-01T10:00:00Z"), ZoneOffset.UTC));
    }

    @Test
    void createSessionStartsCollectingWithHostAsParticipant() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), "Cuma kahvesi", ActivityType.COFFEE, DEN_BOSCH, "Mehmet");

        assertThat(r.session().status()).isEqualTo(SessionStatus.COLLECTING);
        assertThat(r.session().slug()).hasSize(8);
        assertThat(r.session().expiresAt()).isEqualTo(Instant.parse("2026-09-02T10:00:00Z"));
        assertThat(r.hostParticipant().host()).isTrue();
        assertThat(r.hostParticipant().hasLocation()).isTrue();
        assertThat(r.hostParticipant().token()).isNotBlank();
    }

    @Test
    void joinAddsParticipantAndPublishesEvent() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, ActivityType.COFFEE, DEN_BOSCH, "Mehmet");

        Participant ayse = commands.join(r.session().slug(), "Ayşe", SOMEREN);

        assertThat(ayse.token()).isNotEqualTo(r.hostParticipant().token());
        assertThat(store.participantsOf(r.session().id())).hasSize(2);
        assertThat(events.published).hasSize(1);
        assertThat(events.published.get(0).event().type()).isEqualTo("participant_joined");
    }

    @Test
    void joinUnknownSlugThrowsNotFound() {
        assertThatThrownBy(() -> commands.join("yok", "X", null))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void updateLocationSetsCoordinates() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, ActivityType.COFFEE, DEN_BOSCH, "Mehmet");
        Participant kerem = commands.join(r.session().slug(), "Kerem", null);
        assertThat(kerem.hasLocation()).isFalse();

        commands.updateLocation(r.session().slug(), kerem.id(), SOMEREN);

        assertThat(store.participants.get(kerem.id()).hasLocation()).isTrue();
    }
}
```

- [ ] **Step 3: FAIL doğrula** — Run: `rtk mvn -q test -Dtest=SessionCommandsTest` → derleme hatası.

- [ ] **Step 4: Implementasyonu yaz**

`Ids.java`:

```java
package com.bumpinto.application;

import java.security.SecureRandom;

public final class Ids {

    private static final String SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private Ids() {
    }

    public static String slug() {
        StringBuilder sb = new StringBuilder(8);
        for (int i = 0; i < 8; i++) {
            sb.append(SLUG_ALPHABET.charAt(RANDOM.nextInt(SLUG_ALPHABET.length())));
        }
        return sb.toString();
    }

    public static String participantToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
```

`NotFoundException.java`:

```java
package com.bumpinto.application;

public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }
}
```

`ConflictException.java`:

```java
package com.bumpinto.application;

public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
```

`SessionCommands.java`:

```java
package com.bumpinto.application;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.SessionEvent;
import com.bumpinto.domain.port.SessionEventsPort;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Service
public class SessionCommands {

    static final Duration SESSION_TTL = Duration.ofHours(24);

    private final SessionStorePort store;
    private final SessionEventsPort events;
    private final Clock clock;

    public SessionCommands(SessionStorePort store, SessionEventsPort events, Clock clock) {
        this.store = store;
        this.events = events;
        this.clock = clock;
    }

    public record CreateSessionResult(Session session, Participant hostParticipant) {
    }

    @Transactional
    public CreateSessionResult createSession(UUID hostUserId, String name, ActivityType type,
                                             GeoPoint hostLocation, String hostDisplayName) {
        Session session = store.saveSession(new Session(UUID.randomUUID(), Ids.slug(), hostUserId,
                Texts.sessionName(name), type, SessionStatus.COLLECTING,
                clock.instant().plus(SESSION_TTL), null, List.of()));
        Participant host = store.saveParticipant(new Participant(UUID.randomUUID(), session.id(),
                Texts.displayName(hostDisplayName), hostLocation, true,
                Ids.participantToken(), null));
        return new CreateSessionResult(session, host);
    }

    @Transactional
    public Participant join(String slug, String displayName, GeoPoint location) {
        Session session = required(slug);
        if (session.status() == SessionStatus.DECIDED || session.status() == SessionStatus.EXPIRED) {
            throw new ConflictException("session is closed: " + session.status());
        }
        Participant joined = store.saveParticipant(new Participant(UUID.randomUUID(), session.id(),
                Texts.displayName(displayName), location, false, Ids.participantToken(), null));
        events.publish(slug, SessionEvent.participantJoined(store.participantsOf(session.id()).size()));
        return joined;
    }

    @Transactional
    public void updateLocation(String slug, UUID participantId, GeoPoint location) {
        Session session = required(slug);
        Participant participant = store.participantsOf(session.id()).stream()
                .filter(p -> p.id().equals(participantId)).findFirst()
                .orElseThrow(() -> new NotFoundException("participant not in session"));
        store.saveParticipant(participant.locatedAt(location));
    }

    Session required(String slug) {
        return store.sessionBySlug(slug)
                .orElseThrow(() -> new NotFoundException("session not found: " + slug));
    }
}
```

`Texts.java` (girdi hijyeni — SQL injection koruması DEĞİL, o iş parametrik
sorgularda; bkz. Güvenlik mimarisi):

```java
package com.bumpinto.application;

public final class Texts {

    private Texts() {
    }

    public static String displayName(String raw) {
        return normalize(raw, 40);
    }

    public static String sessionName(String raw) {
        return raw == null ? null : normalize(raw, 60);
    }

    // Kontrol karakterlerini söker, boşlukları toplar, uzunluğu sınırlar.
    // Tırnak/SQL keyword TEMİZLEMEZ — 's-Hertogenbosch geçerli veridir.
    private static String normalize(String raw, int maxLength) {
        if (raw == null) {
            throw new IllegalArgumentException("name is required");
        }
        String cleaned = raw.strip()
                .replaceAll("\\p{Cntrl}", "")
                .replaceAll("\\s{2,}", " ");
        if (cleaned.isEmpty()) {
            throw new IllegalArgumentException("name must not be blank");
        }
        return cleaned.length() <= maxLength ? cleaned : cleaned.substring(0, maxLength);
    }
}
```

`TextsTest.java`:

```java
package com.bumpinto.application;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TextsTest {

    @Test
    void stripsControlCharsCollapsesWhitespaceAndCapsLength() {
        assertThat(Texts.displayName("  Meh\u0000met   Şerefoğlu  ")).isEqualTo("Mehmet Şerefoğlu");
        assertThat(Texts.displayName("x".repeat(45))).hasSize(40);
    }

    @Test
    void keepsLegitimatePunctuation() {
        // tırnak ayıklama bilinçli olarak YOK — injection parametrik sorgularla engellenir
        assertThat(Texts.displayName("'s-Hertogenbosch'lu Ayşe")).isEqualTo("'s-Hertogenbosch'lu Ayşe");
    }

    @Test
    void blankNameIsRejected() {
        assertThatThrownBy(() -> Texts.displayName("   ")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> Texts.displayName(null)).isInstanceOf(IllegalArgumentException.class);
    }
}
```

Clock bean'i Task 5'teki `AppConfig` içinde tanımlanacak (`Clock.systemUTC()`).

- [ ] **Step 5: PASS doğrula** — Run: `rtk mvn -q test -Dtest='SessionCommandsTest,TextsTest'` → `Tests run: 7, Failures: 0`

- [ ] **Step 6: INDEX güncelle + Commit (kullanıcı)** — `feat(application): oturum kurma/katilma/konum use-caseleri`

---

### Task 4: Persistence adapter'ları (portların JPA implementasyonu)

**Files:**
- Create: `backend/src/main/java/com/bumpinto/adapter/out/persistence/SessionStoreAdapter.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/persistence/DeckStoreAdapter.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/persistence/UserStoreAdapter.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/out/persistence/StoreAdapterTest.java`

- [ ] **Step 1: Failing testi yaz**

```java
package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.venue.Venue;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
@Import({SessionStoreAdapter.class, DeckStoreAdapter.class, UserStoreAdapter.class})
class StoreAdapterTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired SessionStoreAdapter sessions;
    @Autowired DeckStoreAdapter deck;
    @Autowired UserStoreAdapter users;

    @Test
    void fullRoundTripThroughPorts() {
        UUID hostUser = users.upsertByEmail("m@x.dev", "Mehmet");
        assertThat(users.upsertByEmail("m@x.dev", "Mehmet")).isEqualTo(hostUser); // idempotent

        Session s = sessions.saveSession(new Session(UUID.randomUUID(), "slugtest", hostUser,
                "Cuma", ActivityType.COFFEE, SessionStatus.COLLECTING,
                Instant.now().plusSeconds(600), null, List.of()));
        Participant host = sessions.saveParticipant(new Participant(UUID.randomUUID(), s.id(),
                "Mehmet", new GeoPoint(51.6978, 5.3037), true, "tok-h", null));

        assertThat(sessions.sessionBySlug("slugtest")).isPresent();
        assertThat(sessions.participantByToken("tok-h")).isPresent();

        Venue v = new Venue(UUID.randomUUID(), s.id(), "foursquare", "fsq1", "Café Berlage",
                new GeoPoint(51.44, 5.47), 4.6, 2, null, "https://maps", 0);
        deck.saveVenues(List.of(v));
        deck.saveSwipe(s.id(), v.id(), host.id(), true);

        Map<UUID, Set<UUID>> likes = deck.likesByParticipant(s.id());
        assertThat(likes.get(host.id())).containsExactly(v.id());

        deck.castVote(s.id(), v.id(), host.id());
        assertThat(deck.voteTally(s.id())).containsEntry(v.id(), 1L);
        assertThat(deck.votersCount(s.id())).isEqualTo(1);

        Session runoff = sessions.saveSession(s.inRunoff(List.of(v.id())));
        assertThat(sessions.sessionBySlug("slugtest").orElseThrow().runoffVenueIds())
                .containsExactly(v.id());
        assertThat(runoff.status()).isEqualTo(SessionStatus.RUNOFF);
    }
}
```

- [ ] **Step 2: FAIL doğrula** — Run: `rtk mvn -q test -Dtest=StoreAdapterTest` → derleme hatası.

- [ ] **Step 3: Adapter'ları yaz**

`SessionStoreAdapter.java`:

```java
package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class SessionStoreAdapter implements SessionStorePort {

    private final Jpa.Sessions sessions;
    private final Jpa.Participants participants;

    public SessionStoreAdapter(Jpa.Sessions sessions, Jpa.Participants participants) {
        this.sessions = sessions;
        this.participants = participants;
    }

    @Override public Session saveSession(Session s) {
        SessionEntity e = new SessionEntity();
        e.id = s.id();
        e.slug = s.slug();
        e.hostId = s.hostId();
        e.name = s.name();
        e.activityType = s.activityType().name();
        e.status = s.status().name();
        e.expiresAt = s.expiresAt();
        e.decidedVenueId = s.decidedVenueId();
        e.runoffVenueIds = s.runoffVenueIds().isEmpty() ? null
                : s.runoffVenueIds().stream().map(UUID::toString).collect(Collectors.joining(","));
        sessions.save(e);
        return s;
    }

    @Override public Optional<Session> sessionBySlug(String slug) {
        return sessions.findBySlug(slug).map(SessionStoreAdapter::toSession);
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
        participants.save(e);
        return p;
    }

    @Override public List<Participant> participantsOf(UUID sessionId) {
        return participants.findBySessionId(sessionId).stream()
                .map(SessionStoreAdapter::toParticipant).toList();
    }

    @Override public Optional<Participant> participantByToken(String token) {
        return participants.findByToken(token).map(SessionStoreAdapter::toParticipant);
    }

    static Session toSession(SessionEntity e) {
        List<UUID> runoff = e.runoffVenueIds == null ? List.of()
                : Arrays.stream(e.runoffVenueIds.split(",")).map(UUID::fromString).toList();
        return new Session(e.id, e.slug, e.hostId, e.name, ActivityType.valueOf(e.activityType),
                SessionStatus.valueOf(e.status), e.expiresAt, e.decidedVenueId, runoff);
    }

    static Participant toParticipant(ParticipantEntity e) {
        GeoPoint loc = (e.lat == null || e.lng == null) ? null : new GeoPoint(e.lat, e.lng);
        return new Participant(e.id, e.sessionId, e.displayName, loc, e.isHost, e.token, e.deckDoneAt);
    }
}
```

`DeckStoreAdapter.java`:

```java
package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.DeckStorePort;
import com.bumpinto.domain.venue.Venue;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class DeckStoreAdapter implements DeckStorePort {

    private final Jpa.Venues venues;
    private final Jpa.Swipes swipes;
    private final Jpa.Votes votes;

    public DeckStoreAdapter(Jpa.Venues venues, Jpa.Swipes swipes, Jpa.Votes votes) {
        this.venues = venues;
        this.swipes = swipes;
        this.votes = votes;
    }

    @Override public List<Venue> saveVenues(List<Venue> list) {
        venues.saveAll(list.stream().map(v -> {
            VenueEntity e = new VenueEntity();
            e.id = v.id();
            e.sessionId = v.sessionId();
            e.provider = v.provider();
            e.externalId = v.externalId();
            e.name = v.name();
            e.lat = v.location().lat();
            e.lng = v.location().lng();
            e.rating = v.rating();
            e.priceLevel = v.priceLevel();
            e.photoUrl = v.photoUrl();
            e.mapsUrl = v.mapsUrl();
            e.deckOrder = v.deckOrder();
            return e;
        }).toList());
        return list;
    }

    @Override public List<Venue> venuesOf(UUID sessionId) {
        return venues.findBySessionIdOrderByDeckOrder(sessionId).stream()
                .map(e -> new Venue(e.id, e.sessionId, e.provider, e.externalId, e.name,
                        new GeoPoint(e.lat, e.lng), e.rating, e.priceLevel, e.photoUrl,
                        e.mapsUrl, e.deckOrder))
                .toList();
    }

    @Override public void saveSwipe(UUID sessionId, UUID venueId, UUID participantId, boolean liked) {
        SwipeEntity e = new SwipeEntity();
        e.sessionId = sessionId;
        e.venueId = venueId;
        e.participantId = participantId;
        e.liked = liked;
        e.swipedAt = Instant.now();
        swipes.save(e);
    }

    @Override public void deleteSwipe(UUID venueId, UUID participantId) {
        swipes.deleteById(new SwipeEntity.Key(venueId, participantId));
    }

    @Override public Map<UUID, Set<UUID>> likesByParticipant(UUID sessionId) {
        return swipes.findBySessionId(sessionId).stream().collect(Collectors.groupingBy(
                e -> e.participantId,
                Collectors.flatMapping(
                        e -> e.liked ? java.util.stream.Stream.of(e.venueId) : java.util.stream.Stream.empty(),
                        Collectors.toCollection(HashSet::new))));
    }

    @Override public void castVote(UUID sessionId, UUID venueId, UUID participantId) {
        VoteEntity e = new VoteEntity();
        e.sessionId = sessionId;
        e.participantId = participantId;
        e.venueId = venueId;
        e.votedAt = Instant.now();
        votes.save(e);
    }

    @Override public Map<UUID, Long> voteTally(UUID sessionId) {
        return votes.findBySessionId(sessionId).stream()
                .collect(Collectors.groupingBy(e -> e.venueId, Collectors.counting()));
    }

    @Override public long votersCount(UUID sessionId) {
        return votes.findBySessionId(sessionId).size();
    }
}
```

`UserStoreAdapter.java`:

```java
package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.port.UserStorePort;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class UserStoreAdapter implements UserStorePort {

    private final Jpa.Users users;

    public UserStoreAdapter(Jpa.Users users) {
        this.users = users;
    }

    @Override public UUID upsertByEmail(String email, String name) {
        return users.findByEmail(email)
                .map(u -> u.id)
                .orElseGet(() -> users.save(UserEntity.of(UUID.randomUUID(), email, name, "google")).id);
    }
}
```

- [ ] **Step 4: PASS doğrula** — Run: `rtk mvn -q test -Dtest=StoreAdapterTest` → `Tests run: 1, Failures: 0`

- [ ] **Step 5: INDEX güncelle + Commit (kullanıcı)** — `feat(persistence): port adapterleri`

---

### Task 5: Security — kendi token'ımız, cookie/SecureStore ayrımı, CORS, profiller

**Files:**
- Modify: `backend/pom.xml`
- Modify: `backend/src/main/resources/application.yml`
- Create: `backend/src/main/resources/application-local.yml`
- Create: `backend/src/main/resources/application-preprod.yml`
- Create: `backend/src/main/resources/application-prod.yml`
- Create: `backend/src/main/java/com/bumpinto/infra/AppProps.java`
- Create: `backend/src/main/java/com/bumpinto/infra/AppConfig.java`
- Create: `backend/src/main/java/com/bumpinto/infra/TokenService.java`
- Create: `backend/src/main/java/com/bumpinto/infra/GoogleIdVerifier.java`
- Create: `backend/src/main/java/com/bumpinto/infra/AuthCookies.java`
- Create: `backend/src/main/java/com/bumpinto/infra/ParticipantPrincipal.java`
- Create: `backend/src/main/java/com/bumpinto/infra/ParticipantTokenFilter.java`
- Create: `backend/src/main/java/com/bumpinto/infra/SecurityConfig.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/in/web/AuthController.java`
- Test: `backend/src/test/java/com/bumpinto/infra/TokenServiceTest.java`
- Test: `backend/src/test/java/com/bumpinto/infra/ParticipantTokenFilterTest.java`

- [ ] **Step 1: pom.xml'e ekle**

```xml
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.security</groupId>
      <artifactId>spring-security-test</artifactId>
      <scope>test</scope>
    </dependency>
```

- [ ] **Step 2: application.yml + profil dosyaları**

`application.yml` (tam yeni hali — ortak):

```yaml
spring:
  application:
    name: bumpinto-backend
  profiles:
    default: local
  datasource:
    url: ${DB_URL:jdbc:postgresql://localhost:5432/bumpinto}
    username: ${DB_USER:bumpinto}
    password: ${DB_PASSWORD:bumpinto}
  flyway:
    enabled: true

server:
  port: 8080

bumpinto:
  security:
    google-client-id: ${GOOGLE_CLIENT_ID:dev-client-id}
    token-secret: ${TOKEN_SECRET:local-only-secret-change-me-0123456789}
    token-ttl: 12h
  providers:
    foursquare-key: ${FOURSQUARE_API_KEY:}
    google-key: ${GOOGLE_PLACES_API_KEY:}
```

`application-local.yml`:

```yaml
bumpinto:
  cors:
    allowed-origins:
      - http://localhost:5173
      - http://localhost:8081
  cookies:
    secure: false
    domain: ""
```

`application-preprod.yml`:

```yaml
bumpinto:
  cors:
    allowed-origins:
      - https://preprod.bumpinto.app
  cookies:
    secure: true
    domain: ""

logging:
  level:
    com.bumpinto: DEBUG
```

`application-prod.yml`:

```yaml
bumpinto:
  cors:
    allowed-origins:
      - https://bumpinto.app
  cookies:
    secure: true
    domain: ""
```

Not: preprod/prod'da `TOKEN_SECRET` env'den GELMEK ZORUNDA (≥32 bayt) — default yalnız
local. K8s secret'ına Plan 5 ekler.

- [ ] **Step 3: Failing token testini yaz**

```java
package com.bumpinto.infra;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TokenServiceTest {

    static final AppProps PROPS = new AppProps(
            new AppProps.Security("cid", "0123456789abcdef0123456789abcdef", Duration.ofHours(12)),
            new AppProps.Providers("", ""),
            new AppProps.Cors(List.of()),
            new AppProps.Cookies(false, ""));

    final TokenService tokens = new TokenService(PROPS, Clock.systemUTC());

    @Test
    void issueAndParseRoundTrip() {
        UUID userId = UUID.randomUUID();
        String token = tokens.issueAccessToken(userId, "m@x.dev");

        Jwt jwt = tokens.decoder().decode(token);
        assertThat(jwt.getSubject()).isEqualTo(userId.toString());
        assertThat(jwt.getClaimAsString("email")).isEqualTo("m@x.dev");
        assertThat(jwt.getExpiresAt()).isAfter(Instant.now().plus(Duration.ofHours(11)));
    }

    @Test
    void tamperedTokenIsRejected() {
        String token = tokens.issueAccessToken(UUID.randomUUID(), "m@x.dev");
        assertThatThrownBy(() -> tokens.decoder().decode(token + "x"))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void shortSecretIsRejectedAtConstruction() {
        AppProps weak = new AppProps(
                new AppProps.Security("cid", "kisa", Duration.ofHours(1)),
                PROPS.providers(), PROPS.cors(), PROPS.cookies());
        assertThatThrownBy(() -> new TokenService(weak, Clock.systemUTC()))
                .isInstanceOf(IllegalStateException.class);
    }
}
```

- [ ] **Step 4: FAIL doğrula** — Run: `rtk mvn -q test -Dtest=TokenServiceTest` → derleme hatası.

- [ ] **Step 5: Infra sınıflarını yaz**

`AppProps.java`:

```java
package com.bumpinto.infra;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;
import java.util.List;

@ConfigurationProperties(prefix = "bumpinto")
public record AppProps(Security security, Providers providers, Cors cors, Cookies cookies) {

    public record Security(String googleClientId, String tokenSecret, Duration tokenTtl) {
    }

    public record Providers(String foursquareKey, String googleKey) {
    }

    public record Cors(List<String> allowedOrigins) {
    }

    public record Cookies(boolean secure, String domain) {
    }
}
```

`AppConfig.java`:

```java
package com.bumpinto.infra;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

@Configuration
@EnableConfigurationProperties(AppProps.class)
public class AppConfig {

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }
}
```

`TokenService.java` (backend'in KENDİ access token'ı — HMAC JWT):

```java
package com.bumpinto.infra;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.stereotype.Component;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

@Component
public class TokenService {

    private final JwtEncoder encoder;
    private final JwtDecoder decoder;
    private final AppProps props;
    private final Clock clock;

    public TokenService(AppProps props, Clock clock) {
        byte[] secret = props.security().tokenSecret().getBytes(StandardCharsets.UTF_8);
        if (secret.length < 32) {
            throw new IllegalStateException("TOKEN_SECRET must be at least 32 bytes");
        }
        SecretKeySpec key = new SecretKeySpec(secret, "HmacSHA256");
        this.encoder = new NimbusJwtEncoder(new ImmutableSecret<>(key));
        this.decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        this.props = props;
        this.clock = clock;
    }

    public String issueAccessToken(UUID userId, String email) {
        Instant now = clock.instant();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(userId.toString())
                .claim("email", email)
                .issuedAt(now)
                .expiresAt(now.plus(props.security().tokenTtl()))
                .build();
        return encoder.encode(JwtEncoderParameters
                .from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }

    public JwtDecoder decoder() {
        return decoder;
    }
}
```

`GoogleIdVerifier.java` (Google id_token YALNIZ burada doğrulanır):

```java
package com.bumpinto.infra;

import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class GoogleIdVerifier {

    private final JwtDecoder googleDecoder;

    public GoogleIdVerifier(AppProps props) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder
                .withJwkSetUri("https://www.googleapis.com/oauth2/v3/certs").build();
        OAuth2TokenValidator<Jwt> audienceCheck = jwt -> {
            List<String> aud = jwt.getAudience();
            return aud != null && aud.contains(props.security().googleClientId())
                    ? OAuth2TokenValidatorResult.success()
                    : OAuth2TokenValidatorResult.failure(
                            new OAuth2Error("invalid_token", "audience mismatch", null));
        };
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer("https://accounts.google.com"),
                audienceCheck));
        this.googleDecoder = decoder;
    }

    public record GoogleUser(String email, String name) {
    }

    public GoogleUser verify(String idToken) {
        Jwt jwt = googleDecoder.decode(idToken);
        return new GoogleUser(jwt.getClaimAsString("email"), jwt.getClaimAsString("name"));
    }
}
```

`AuthCookies.java` (HttpOnly cookie üretimi — bayraklar profile göre):

```java
package com.bumpinto.infra;

import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
public class AuthCookies {

    public static final String ACCESS = "bumpinto_at";

    private final AppProps props;

    public AuthCookies(AppProps props) {
        this.props = props;
    }

    public static String participantCookieName(String slug) {
        return "bumpinto_pt_" + slug;
    }

    public ResponseCookie access(String token, Duration ttl) {
        return base(ACCESS, token, "/api", ttl);
    }

    public ResponseCookie participant(String slug, String token, Duration ttl) {
        return base(participantCookieName(slug), token, "/api/sessions/" + slug, ttl);
    }

    private ResponseCookie base(String name, String value, String path, Duration ttl) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(props.cookies().secure())
                .sameSite("Lax")
                .path(path)
                .maxAge(ttl);
        if (props.cookies().domain() != null && !props.cookies().domain().isBlank()) {
            builder.domain(props.cookies().domain());
        }
        return builder.build();
    }
}
```

`ParticipantPrincipal.java`:

```java
package com.bumpinto.infra;

import java.util.UUID;

public record ParticipantPrincipal(UUID participantId, UUID sessionId, boolean host) {
}
```

`ParticipantTokenFilter.java` (header VEYA slug'a özel cookie):

```java
package com.bumpinto.infra;

import com.bumpinto.domain.port.SessionStorePort;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class ParticipantTokenFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Participant-Token";
    private static final Pattern SLUG = Pattern.compile("^/api/sessions/([^/]+)");

    private final SessionStorePort store;

    public ParticipantTokenFilter(SessionStorePort store) {
        this.store = store;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            String token = resolveToken(request);
            if (token != null) {
                store.participantByToken(token).ifPresent(p -> {
                    var auth = new UsernamePasswordAuthenticationToken(
                            new ParticipantPrincipal(p.id(), p.sessionId(), p.host()), null,
                            List.of(new SimpleGrantedAuthority("ROLE_PARTICIPANT")));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                });
            }
        }
        chain.doFilter(request, response);
    }

    private String resolveToken(HttpServletRequest request) {
        String header = request.getHeader(HEADER);
        if (header != null) {
            return header; // mobil / SecureStore yolu
        }
        Matcher m = SLUG.matcher(request.getRequestURI());
        if (!m.find() || request.getCookies() == null) {
            return null;
        }
        String cookieName = AuthCookies.participantCookieName(m.group(1));
        for (Cookie cookie : request.getCookies()) {
            if (cookieName.equals(cookie.getName())) {
                return cookie.getValue(); // web / HttpOnly cookie yolu
            }
        }
        return null;
    }
}
```

`SecurityConfig.java` (CORS + cookie fallback'li bearer + sıkı varsayılanlar):

```java
package com.bumpinto.infra;

import jakarta.servlet.http.Cookie;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain apiChain(HttpSecurity http, ParticipantTokenFilter participantFilter,
                                 BearerTokenResolver bearerTokenResolver) throws Exception {
        // CSRF token bilinçli olarak yok: cookie'ler SameSite=Lax + origin-kısıtlı
        // credentialed CORS; API'de tarayıcı form-post akışı bulunmuyor.
        http.csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> {})
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.POST, "/api/auth/google").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/sessions/*/participants").permitAll()
                .requestMatchers("/v3/api-docs/**", "/ws/**", "/error").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(o -> o
                .bearerTokenResolver(bearerTokenResolver)
                .jwt(jwt -> {}))
            .addFilterBefore(participantFilter, BearerTokenAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    JwtDecoder apiJwtDecoder(TokenService tokens) {
        return tokens.decoder();
    }

    @Bean
    BearerTokenResolver bearerTokenResolver() {
        DefaultBearerTokenResolver headerResolver = new DefaultBearerTokenResolver();
        return request -> {
            String fromHeader = headerResolver.resolve(request);
            if (fromHeader != null) {
                return fromHeader; // mobil
            }
            if (request.getCookies() != null) {
                for (Cookie cookie : request.getCookies()) {
                    if (AuthCookies.ACCESS.equals(cookie.getName())) {
                        return cookie.getValue(); // web
                    }
                }
            }
            return null;
        };
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(AppProps props) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(props.cors() == null ? List.of() : props.cors().allowedOrigins());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type",
                "X-Participant-Token", "X-Client"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        source.registerCorsConfiguration("/ws/**", config);
        return source;
    }
}
```

`AuthController.java` (adapter.in.web — web'e cookie, mobile'a body):

```java
package com.bumpinto.adapter.in.web;

import com.bumpinto.domain.port.UserStorePort;
import com.bumpinto.infra.AppProps;
import com.bumpinto.infra.AuthCookies;
import com.bumpinto.infra.GoogleIdVerifier;
import com.bumpinto.infra.TokenService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
class AuthController {

    record GoogleLoginRequest(@NotBlank String idToken) {
    }

    record LoginResponse(String accessToken, Instant expiresAt, UUID userId) {
    }

    private final GoogleIdVerifier google;
    private final UserStorePort users;
    private final TokenService tokens;
    private final AuthCookies cookies;
    private final AppProps props;
    private final Clock clock;

    AuthController(GoogleIdVerifier google, UserStorePort users, TokenService tokens,
                   AuthCookies cookies, AppProps props, Clock clock) {
        this.google = google;
        this.users = users;
        this.tokens = tokens;
        this.cookies = cookies;
        this.props = props;
        this.clock = clock;
    }

    @PostMapping("/google")
    ResponseEntity<LoginResponse> google(@Valid @RequestBody GoogleLoginRequest request,
            @RequestHeader(value = "X-Client", defaultValue = "mobile") String client) {
        GoogleIdVerifier.GoogleUser verified = google.verify(request.idToken());
        UUID userId = users.upsertByEmail(verified.email(), verified.name());
        String accessToken = tokens.issueAccessToken(userId, verified.email());
        Instant expiresAt = clock.instant().plus(props.security().tokenTtl());

        if ("web".equalsIgnoreCase(client)) {
            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE,
                            cookies.access(accessToken, props.security().tokenTtl()).toString())
                    .body(new LoginResponse(null, expiresAt, userId));
        }
        return ResponseEntity.ok(new LoginResponse(accessToken, expiresAt, userId));
    }
}
```

- [ ] **Step 6: Filter testini yaz** (header + cookie yolları)

```java
package com.bumpinto.infra;

import com.bumpinto.application.FakeStores;
import com.bumpinto.domain.session.Participant;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ParticipantTokenFilterTest {

    final FakeStores.InMemorySessionStore store = new FakeStores.InMemorySessionStore();
    final UUID sessionId = UUID.randomUUID();

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    void participantWithToken(String token) {
        store.saveParticipant(new Participant(UUID.randomUUID(), sessionId, "Ayşe",
                null, false, token, null));
    }

    @Test
    void headerTokenSetsPrincipal() throws Exception {
        participantWithToken("tok-1");
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.addHeader(ParticipantTokenFilter.HEADER, "tok-1");

        new ParticipantTokenFilter(store)
                .doFilter(req, new MockHttpServletResponse(), new MockFilterChain());

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(((ParticipantPrincipal) auth.getPrincipal()).sessionId()).isEqualTo(sessionId);
    }

    @Test
    void slugScopedCookieSetsPrincipal() throws Exception {
        participantWithToken("tok-2");
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRequestURI("/api/sessions/x7k2m/swipes");
        req.setCookies(new Cookie(AuthCookies.participantCookieName("x7k2m"), "tok-2"));

        new ParticipantTokenFilter(store)
                .doFilter(req, new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
    }

    @Test
    void unknownTokenLeavesContextEmpty() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.addHeader(ParticipantTokenFilter.HEADER, "yok");

        new ParticipantTokenFilter(store)
                .doFilter(req, new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
}
```

- [ ] **Step 7: PASS doğrula** — Run:
`rtk mvn -q test -Dtest='TokenServiceTest,ParticipantTokenFilterTest'` →
`Tests run: 6, Failures: 0`. Sonra `rtk mvn -q test` — tüm suite yeşil.

- [ ] **Step 8: INDEX güncelle + Commit (kullanıcı)** —
`feat(security): kendi access token, cookie/securestore ayrimi, cors, profiller`

---

### Task 6: DeckFlow use-case'i + STOMP olay adaptörü (TDD)

**Files:**
- Modify: `backend/pom.xml` (websocket)
- Create: `backend/src/main/java/com/bumpinto/application/ForbiddenException.java`
- Create: `backend/src/main/java/com/bumpinto/application/NoVenuesFoundException.java`
- Create: `backend/src/main/java/com/bumpinto/application/DeckFlow.java`
- Create: `backend/src/main/java/com/bumpinto/application/SessionQueries.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/in/web/WebSocketConfig.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/in/web/StompSessionEvents.java`
- Test: `backend/src/test/java/com/bumpinto/application/DeckFlowTest.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/in/web/StompSessionEventsTest.java`

- [ ] **Step 1: pom.xml'e ekle**

```xml
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-websocket</artifactId>
    </dependency>
```

- [ ] **Step 2: Failing DeckFlow testini yaz**

```java
package com.bumpinto.application;

import com.bumpinto.domain.deck.DecisionEngine;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.VenueProviderPort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.venue.Venue;
import com.bumpinto.domain.venue.VenueCandidate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DeckFlowTest {

    static final GeoPoint DEN_BOSCH = new GeoPoint(51.6978, 5.3037);
    static final GeoPoint SOMEREN = new GeoPoint(51.3855, 5.7120);

    FakeStores.InMemorySessionStore store;
    FakeStores.InMemoryDeckStore deck;
    FakeStores.RecordingEvents events;
    List<Double> requestedRadii;
    List<VenueCandidate> providerResult;
    DeckFlow flow;
    UUID hostUser;
    Session session;
    Participant host;
    Participant ayse;

    static VenueCandidate cand(int i, double rating) {
        return new VenueCandidate("foursquare", "fsq-" + i, "Mekan " + i,
                new GeoPoint(51.5 + i * 0.001, 5.5), rating, 2, null, "https://maps/" + i);
    }

    @BeforeEach
    void setUp() {
        store = new FakeStores.InMemorySessionStore();
        deck = new FakeStores.InMemoryDeckStore();
        events = new FakeStores.RecordingEvents();
        requestedRadii = new ArrayList<>();
        providerResult = new ArrayList<>();
        VenueProviderPort provider = (center, radiusKm, type, limit) -> {
            requestedRadii.add(radiusKm);
            return List.copyOf(providerResult);
        };
        flow = new DeckFlow(store, deck, provider, events, new DecisionEngine(),
                Clock.fixed(Instant.parse("2026-09-01T10:00:00Z"), ZoneOffset.UTC));

        hostUser = UUID.randomUUID();
        session = store.saveSession(new Session(UUID.randomUUID(), "s1", hostUser, null,
                ActivityType.COFFEE, SessionStatus.COLLECTING,
                Instant.parse("2026-09-02T10:00:00Z"), null, List.of()));
        host = store.saveParticipant(new Participant(UUID.randomUUID(), session.id(),
                "Mehmet", DEN_BOSCH, true, "tok-h", null));
        ayse = store.saveParticipant(new Participant(UUID.randomUUID(), session.id(),
                "Ayşe", SOMEREN, false, "tok-a", null));
    }

    @Test
    void findVenuesBuildsDeckSortedByRatingAndPublishes() {
        providerResult.addAll(IntStream.range(0, 8).mapToObj(i -> cand(i, 3.0 + i * 0.2)).toList());

        List<Venue> venues = flow.findVenues("s1", hostUser);

        assertThat(venues).hasSize(8);
        assertThat(venues.get(0).name()).isEqualTo("Mekan 7"); // en yüksek rating önce
        assertThat(venues.get(0).deckOrder()).isZero();
        assertThat(store.sessionBySlug("s1").orElseThrow().status()).isEqualTo(SessionStatus.SWIPING);
        assertThat(events.published).extracting(p -> p.event().type()).containsExactly("deck_ready");
        assertThat(requestedRadii).hasSize(1);
    }

    @Test
    void findVenuesExpandsRadiusWhenSparseAndAcceptsSmallDeck() {
        providerResult.addAll(List.of(cand(0, 4.0), cand(1, 4.2), cand(2, 4.4))); // hep 3 sonuç

        List<Venue> venues = flow.findVenues("s1", hostUser);

        assertThat(venues).hasSize(3); // az sonuç kabul — istemci liste moduna düşer (spec §4)
        assertThat(requestedRadii).hasSize(4); // taban + 3 genişletme
        assertThat(requestedRadii.get(1)).isCloseTo(requestedRadii.get(0) * 2,
                org.assertj.core.data.Offset.offset(0.001));
    }

    @Test
    void findVenuesByNonHostIsForbidden() {
        assertThatThrownBy(() -> flow.findVenues("s1", UUID.randomUUID()))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void fullSwipeFlowAutoDecidesWhenEveryoneFinishes() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        List<Venue> venues = flow.findVenues("s1", hostUser);
        UUID favori = venues.get(0).id();

        flow.swipe("s1", host.id(), favori, true);
        flow.swipe("s1", host.id(), venues.get(1).id(), false);
        flow.finishDeck("s1", host.id());
        assertThat(store.sessionBySlug("s1").orElseThrow().status()).isEqualTo(SessionStatus.SWIPING);

        flow.swipe("s1", ayse.id(), favori, true);
        flow.finishDeck("s1", ayse.id());

        Session decided = store.sessionBySlug("s1").orElseThrow();
        assertThat(decided.status()).isEqualTo(SessionStatus.DECIDED);
        assertThat(decided.decidedVenueId()).isEqualTo(favori);
        assertThat(events.published).extracting(p -> p.event().type())
                .contains("deck_progress", "session_decided");
    }

    @Test
    void runoffTieStaysOpenUntilHostForces() {
        providerResult.addAll(List.of(cand(0, 4.6), cand(1, 4.1)));
        List<Venue> venues = flow.findVenues("s1", hostUser);
        UUID v0 = venues.get(0).id();
        UUID v1 = venues.get(1).id();

        // ikisi de iki mekanı da beğenir → kesişim 2 → RUNOFF
        for (Participant p : List.of(host, ayse)) {
            flow.swipe("s1", p.id(), v0, true);
            flow.swipe("s1", p.id(), v1, true);
            flow.finishDeck("s1", p.id());
        }
        assertThat(store.sessionBySlug("s1").orElseThrow().status()).isEqualTo(SessionStatus.RUNOFF);

        flow.runoffVote("s1", host.id(), v0);
        flow.runoffVote("s1", ayse.id(), v1); // beraberlik
        assertThat(store.sessionBySlug("s1").orElseThrow().status()).isEqualTo(SessionStatus.RUNOFF);

        flow.forceDecision("s1", hostUser, v0);
        Session decided = store.sessionBySlug("s1").orElseThrow();
        assertThat(decided.status()).isEqualTo(SessionStatus.DECIDED);
        assertThat(decided.decidedVenueId()).isEqualTo(v0);
    }
}
```

- [ ] **Step 3: FAIL doğrula** — Run: `rtk mvn -q test -Dtest=DeckFlowTest` → derleme hatası.

- [ ] **Step 4: Implementasyonu yaz**

`ForbiddenException.java`:

```java
package com.bumpinto.application;

public class ForbiddenException extends RuntimeException {
    public ForbiddenException(String message) {
        super(message);
    }
}
```

`NoVenuesFoundException.java`:

```java
package com.bumpinto.application;

public class NoVenuesFoundException extends RuntimeException {
    public NoVenuesFoundException() {
        super("no venues found around midpoint — try another category");
    }
}
```

`DeckFlow.java`:

```java
package com.bumpinto.application;

import com.bumpinto.domain.deck.DecisionEngine;
import com.bumpinto.domain.deck.DeckOutcome;
import com.bumpinto.domain.deck.ParticipantLikes;
import com.bumpinto.domain.geo.GeoMath;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.SearchRadius;
import com.bumpinto.domain.port.DeckStorePort;
import com.bumpinto.domain.port.SessionEvent;
import com.bumpinto.domain.port.SessionEventsPort;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.port.VenueProviderPort;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.venue.Venue;
import com.bumpinto.domain.venue.VenueCandidate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class DeckFlow {

    static final int DECK_MIN = 6;
    static final int DECK_MAX = 20;

    private final SessionStorePort store;
    private final DeckStorePort deck;
    private final VenueProviderPort provider;
    private final SessionEventsPort events;
    private final DecisionEngine engine;
    private final Clock clock;

    public DeckFlow(SessionStorePort store, DeckStorePort deck, VenueProviderPort provider,
                    SessionEventsPort events, DecisionEngine engine, Clock clock) {
        this.store = store;
        this.deck = deck;
        this.provider = provider;
        this.events = events;
        this.engine = engine;
        this.clock = clock;
    }

    @Transactional
    public List<Venue> findVenues(String slug, UUID hostUserId) {
        Session session = required(slug);
        requireHost(session, hostUserId);
        if (session.status() != SessionStatus.COLLECTING
                && session.status() != SessionStatus.SUGGESTING) {
            throw new ConflictException("deck already built: " + session.status());
        }
        List<GeoPoint> points = store.participantsOf(session.id()).stream()
                .filter(Participant::hasLocation).map(Participant::location).toList();
        if (points.size() < 2) {
            throw new ConflictException("need at least 2 participants with location");
        }
        GeoPoint center = GeoMath.centroid(points);
        double baseKm = SearchRadius.baseKm(points, center);
        store.saveSession(session.withStatus(SessionStatus.SUGGESTING));

        List<VenueCandidate> found = List.of();
        for (int attempt = 0; attempt <= SearchRadius.MAX_EXPANSIONS; attempt++) {
            found = provider.search(center, SearchRadius.expandedKm(baseKm, attempt),
                    session.activityType(), DECK_MAX);
            if (found.size() >= DECK_MIN) {
                break;
            }
        }
        if (found.isEmpty()) {
            store.saveSession(session.withStatus(SessionStatus.COLLECTING));
            throw new NoVenuesFoundException();
        }

        Map<String, VenueCandidate> unique = new LinkedHashMap<>();
        found.forEach(c -> unique.putIfAbsent(c.externalId(), c));
        List<VenueCandidate> ordered = unique.values().stream()
                .sorted(Comparator.comparing(VenueCandidate::rating,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(DECK_MAX)
                .toList();

        List<Venue> venues = new ArrayList<>(ordered.size());
        for (int i = 0; i < ordered.size(); i++) {
            VenueCandidate c = ordered.get(i);
            venues.add(new Venue(UUID.randomUUID(), session.id(), c.provider(), c.externalId(),
                    c.name(), c.location(), c.rating(), c.priceLevel(), c.photoUrl(),
                    c.mapsUrl(), i));
        }
        List<Venue> saved = deck.saveVenues(venues);
        store.saveSession(session.withStatus(SessionStatus.SWIPING));
        events.publish(slug, SessionEvent.deckReady(saved.size()));
        return saved;
    }

    @Transactional
    public void swipe(String slug, UUID participantId, UUID venueId, boolean liked) {
        Session session = requireStatus(slug, SessionStatus.SWIPING);
        requireMember(session, participantId);
        deck.saveSwipe(session.id(), venueId, participantId, liked);
    }

    @Transactional
    public void undoSwipe(String slug, UUID participantId, UUID venueId) {
        Session session = requireStatus(slug, SessionStatus.SWIPING);
        requireMember(session, participantId);
        deck.deleteSwipe(venueId, participantId);
    }

    @Transactional
    public void finishDeck(String slug, UUID participantId) {
        Session session = requireStatus(slug, SessionStatus.SWIPING);
        Participant me = requireMember(session, participantId);
        store.saveParticipant(me.doneAt(clock.instant()));

        List<Participant> all = store.participantsOf(session.id());
        long total = all.stream().filter(Participant::hasLocation).count();
        long done = all.stream().filter(Participant::deckDone).count();
        events.publish(slug, SessionEvent.deckProgress(done, total));
        if (done >= total) {
            evaluate(session, false);
        }
    }

    @Transactional
    public void forceDecision(String slug, UUID hostUserId, UUID chosenVenueId) {
        Session session = required(slug);
        requireHost(session, hostUserId);
        if (chosenVenueId != null) {
            if (session.status() != SessionStatus.RUNOFF) {
                throw new ConflictException("venue can only be chosen during runoff");
            }
            if (!session.runoffVenueIds().contains(chosenVenueId)) {
                throw new ConflictException("venue is not a finalist");
            }
            decide(session, chosenVenueId);
            return;
        }
        if (session.status() != SessionStatus.SWIPING) {
            throw new ConflictException("nothing to force in status " + session.status());
        }
        evaluate(session, true);
    }

    @Transactional
    public void runoffVote(String slug, UUID participantId, UUID venueId) {
        Session session = requireStatus(slug, SessionStatus.RUNOFF);
        requireMember(session, participantId);
        if (!session.runoffVenueIds().contains(venueId)) {
            throw new ConflictException("venue is not a finalist");
        }
        deck.castVote(session.id(), venueId, participantId);

        long finishers = store.participantsOf(session.id()).stream()
                .filter(Participant::deckDone).count();
        if (deck.votersCount(session.id()) >= finishers) {
            Map<UUID, Long> tally = deck.voteTally(session.id());
            long max = tally.values().stream().mapToLong(Long::longValue).max().orElse(0);
            List<UUID> winners = tally.entrySet().stream()
                    .filter(e -> e.getValue() == max).map(Map.Entry::getKey).toList();
            if (winners.size() == 1) {
                decide(session, winners.get(0));
            }
            // beraberlik: RUNOFF açık kalır, host force-decision ile seçer (spec §4)
        }
    }

    private void evaluate(Session session, boolean interactive) {
        Map<UUID, Set<UUID>> likes = deck.likesByParticipant(session.id());
        List<ParticipantLikes> participantLikes = store.participantsOf(session.id()).stream()
                .filter(Participant::hasLocation)
                .map(p -> new ParticipantLikes(p.id(), p.deckDone(),
                        likes.getOrDefault(p.id(), Set.of())))
                .toList();
        if (participantLikes.stream().noneMatch(ParticipantLikes::deckDone)) {
            throw new ConflictException("no one finished the deck yet");
        }
        Map<UUID, Double> ratings = new HashMap<>();
        deck.venuesOf(session.id())
                .forEach(v -> ratings.put(v.id(), v.rating() == null ? 0.0 : v.rating()));

        DeckOutcome outcome = engine.decide(participantLikes, ratings);
        switch (outcome) {
            case DeckOutcome.Decided d -> decide(session, d.venueId());
            case DeckOutcome.Runoff r -> {
                store.saveSession(session.inRunoff(r.venueIds()));
                events.publish(session.slug(), SessionEvent.runoffStarted(r.venueIds().size()));
            }
            case DeckOutcome.NoLikes ignored -> {
                if (interactive) {
                    throw new ConflictException("no likes at all — try another category");
                }
                events.publish(session.slug(), new SessionEvent("no_likes", Map.of()));
            }
        }
    }

    private void decide(Session session, UUID venueId) {
        store.saveSession(session.decided(venueId));
        events.publish(session.slug(), SessionEvent.sessionDecided(venueId));
    }

    private Session required(String slug) {
        return store.sessionBySlug(slug)
                .orElseThrow(() -> new NotFoundException("session not found: " + slug));
    }

    private Session requireStatus(String slug, SessionStatus expected) {
        Session session = required(slug);
        if (session.status() != expected) {
            throw new ConflictException("expected " + expected + " but was " + session.status());
        }
        return session;
    }

    private void requireHost(Session session, UUID userId) {
        if (!session.hostId().equals(userId)) {
            throw new ForbiddenException("only the host can do this");
        }
    }

    private Participant requireMember(Session session, UUID participantId) {
        return store.participantsOf(session.id()).stream()
                .filter(p -> p.id().equals(participantId)).findFirst()
                .orElseThrow(() -> new ForbiddenException("participant not in this session"));
    }
}
```

`SessionQueries.java`:

```java
package com.bumpinto.application;

import com.bumpinto.domain.port.DeckStorePort;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.venue.Venue;
import org.springframework.stereotype.Service;

import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class SessionQueries {

    private static final EnumSet<SessionStatus> VENUES_VISIBLE =
            EnumSet.of(SessionStatus.SWIPING, SessionStatus.RUNOFF, SessionStatus.DECIDED);

    private final SessionStorePort store;
    private final DeckStorePort deck;

    public SessionQueries(SessionStorePort store, DeckStorePort deck) {
        this.store = store;
        this.deck = deck;
    }

    public record SessionSnapshot(Session session, List<Participant> participants,
                                  List<Venue> venues, Map<UUID, Long> voteTally) {
    }

    public SessionSnapshot snapshot(String slug) {
        Session session = store.sessionBySlug(slug)
                .orElseThrow(() -> new NotFoundException("session not found: " + slug));
        List<Venue> venues = VENUES_VISIBLE.contains(session.status())
                ? deck.venuesOf(session.id()) : List.of();
        Map<UUID, Long> tally = session.status() == SessionStatus.DECIDED
                ? deck.voteTally(session.id()) : Map.of();
        return new SessionSnapshot(session, store.participantsOf(session.id()), venues, tally);
    }
}
```

`WebSocketConfig.java`:

```java
package com.bumpinto.adapter.in.web;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOriginPatterns("*");
    }
}
```

`StompSessionEvents.java`:

```java
package com.bumpinto.adapter.in.web;

import com.bumpinto.domain.port.SessionEvent;
import com.bumpinto.domain.port.SessionEventsPort;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class StompSessionEvents implements SessionEventsPort {

    private final SimpMessagingTemplate template;

    public StompSessionEvents(SimpMessagingTemplate template) {
        this.template = template;
    }

    @Override
    public void publish(String slug, SessionEvent event) {
        template.convertAndSend("/topic/session/" + slug, event);
    }
}
```

- [ ] **Step 5: STOMP adaptör testini yaz**

```java
package com.bumpinto.adapter.in.web;

import com.bumpinto.domain.port.SessionEvent;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class StompSessionEventsTest {

    @Test
    void publishesToSessionTopic() {
        SimpMessagingTemplate template = mock(SimpMessagingTemplate.class);
        SessionEvent event = SessionEvent.deckReady(12);

        new StompSessionEvents(template).publish("x7k2m", event);

        verify(template).convertAndSend("/topic/session/x7k2m", event);
    }
}
```

- [ ] **Step 6: PASS doğrula** — Run: `rtk mvn -q test -Dtest='DeckFlowTest,StompSessionEventsTest'` → `Tests run: 6, Failures: 0`

- [ ] **Step 7: INDEX güncelle + Commit (kullanıcı)** — `feat(deck): deste akisi, karar tetikleme, stomp olaylari`

---

### Task 7: REST controller'lar + görünüm + OpenAPI

**Files:**
- Modify: `backend/pom.xml` (springdoc)
- Create: `backend/src/main/java/com/bumpinto/adapter/in/web/ApiDtos.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/in/web/SessionViewAssembler.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/in/web/ApiExceptionHandler.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/in/web/SessionController.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/in/web/ParticipantController.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/in/web/DeckController.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/in/web/WebSecuritySliceTest.java`

- [ ] **Step 1: pom.xml'e ekle**

```xml
    <dependency>
      <groupId>org.springdoc</groupId>
      <artifactId>springdoc-openapi-starter-webmvc-api</artifactId>
      <version>3.0.1</version>
    </dependency>
```

- [ ] **Step 2: DTO'ları yaz** (`ApiDtos.java`)

```java
package com.bumpinto.adapter.in.web;

import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.SessionStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class ApiDtos {

    private ApiDtos() {
    }

    public record CreateSessionRequest(@NotNull ActivityType activityType,
                                       @Size(max = 60) String name,
                                       @NotNull Double lat, @NotNull Double lng,
                                       @NotBlank @Size(max = 40) String displayName) {
    }

    public record CreateSessionResponse(String slug, UUID sessionId, UUID participantId,
                                        String participantToken, Instant expiresAt) {
    }

    public record JoinRequest(@NotBlank @Size(max = 40) String displayName,
                              Double lat, Double lng) {
    }

    public record JoinResponse(UUID participantId, String participantToken) {
    }

    public record LocationRequest(@NotNull Double lat, @NotNull Double lng) {
    }

    public record SwipeRequest(@NotNull UUID venueId, @NotNull Boolean liked) {
    }

    public record RunoffVoteRequest(@NotNull UUID venueId) {
    }

    public record ForceDecisionRequest(UUID venueId) {
    }

    public record ParticipantDto(UUID id, String displayName, boolean host,
                                 boolean hasLocation, boolean deckDone) {
    }

    public record VenueDto(UUID id, String name, double lat, double lng, Double rating,
                           Integer priceLevel, String photoUrl, String mapsUrl, int deckOrder,
                           Map<String, Integer> travelMinutes) {
    }

    public record SessionView(String slug, String name, ActivityType activityType,
                              SessionStatus status, Instant expiresAt,
                              List<ParticipantDto> participants, List<VenueDto> venues,
                              List<UUID> runoffVenueIds, UUID decidedVenueId,
                              Map<UUID, Long> voteTally) {
    }
}
```

- [ ] **Step 3: Assembler + hata eşleyici + controller'ları yaz**

`SessionViewAssembler.java`:

```java
package com.bumpinto.adapter.in.web;

import com.bumpinto.application.SessionQueries;
import com.bumpinto.domain.geo.GeoMath;
import com.bumpinto.domain.geo.TravelEstimate;
import com.bumpinto.domain.session.Participant;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class SessionViewAssembler {

    public ApiDtos.SessionView toView(SessionQueries.SessionSnapshot snap) {
        List<ApiDtos.ParticipantDto> participants = snap.participants().stream()
                .map(p -> new ApiDtos.ParticipantDto(p.id(), p.displayName(), p.host(),
                        p.hasLocation(), p.deckDone()))
                .toList();
        List<Participant> located = snap.participants().stream()
                .filter(Participant::hasLocation).toList();
        List<ApiDtos.VenueDto> venues = snap.venues().stream().map(v -> {
            Map<String, Integer> travel = new LinkedHashMap<>();
            located.forEach(p -> travel.put(p.displayName(), TravelEstimate
                    .fromCrowKm(GeoMath.distanceKm(p.location(), v.location())).minutes()));
            return new ApiDtos.VenueDto(v.id(), v.name(), v.location().lat(), v.location().lng(),
                    v.rating(), v.priceLevel(), v.photoUrl(), v.mapsUrl(), v.deckOrder(), travel);
        }).toList();
        return new ApiDtos.SessionView(snap.session().slug(), snap.session().name(),
                snap.session().activityType(), snap.session().status(), snap.session().expiresAt(),
                participants, venues, snap.session().runoffVenueIds(),
                snap.session().decidedVenueId(), snap.voteTally());
    }
}
```

`ApiExceptionHandler.java`:

```java
package com.bumpinto.adapter.in.web;

import com.bumpinto.application.ConflictException;
import com.bumpinto.application.ForbiddenException;
import com.bumpinto.application.NoVenuesFoundException;
import com.bumpinto.application.NotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
class ApiExceptionHandler {

    record ApiError(String error) {
    }

    @ExceptionHandler(NotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    ApiError notFound(NotFoundException e) {
        return new ApiError(e.getMessage());
    }

    @ExceptionHandler(ConflictException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    ApiError conflict(ConflictException e) {
        return new ApiError(e.getMessage());
    }

    @ExceptionHandler(ForbiddenException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    ApiError forbidden(ForbiddenException e) {
        return new ApiError(e.getMessage());
    }

    @ExceptionHandler(NoVenuesFoundException.class)
    @ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
    ApiError noVenues(NoVenuesFoundException e) {
        return new ApiError(e.getMessage());
    }
}
```

`SessionController.java`:

```java
package com.bumpinto.adapter.in.web;

import com.bumpinto.application.DeckFlow;
import com.bumpinto.application.SessionCommands;
import com.bumpinto.application.SessionQueries;
import com.bumpinto.domain.geo.GeoPoint;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/sessions")
class SessionController {

    private final SessionCommands commands;
    private final DeckFlow deckFlow;
    private final SessionQueries queries;
    private final SessionViewAssembler assembler;

    SessionController(SessionCommands commands, DeckFlow deckFlow, SessionQueries queries,
                      SessionViewAssembler assembler) {
        this.commands = commands;
        this.deckFlow = deckFlow;
        this.queries = queries;
        this.assembler = assembler;
    }

    @PostMapping
    ResponseEntity<ApiDtos.CreateSessionResponse> create(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ApiDtos.CreateSessionRequest request) {
        SessionCommands.CreateSessionResult result = commands.createSession(hostId(jwt),
                request.name(), request.activityType(),
                new GeoPoint(request.lat(), request.lng()), request.displayName());
        return ResponseEntity.status(HttpStatus.CREATED).body(new ApiDtos.CreateSessionResponse(
                result.session().slug(), result.session().id(), result.hostParticipant().id(),
                result.hostParticipant().token(), result.session().expiresAt()));
    }

    @GetMapping("/{slug}")
    ApiDtos.SessionView view(@PathVariable String slug) {
        return assembler.toView(queries.snapshot(slug));
    }

    @PostMapping("/{slug}/find-venues")
    ApiDtos.SessionView findVenues(@AuthenticationPrincipal Jwt jwt, @PathVariable String slug) {
        deckFlow.findVenues(slug, hostId(jwt));
        return assembler.toView(queries.snapshot(slug));
    }

    @PostMapping("/{slug}/force-decision")
    ApiDtos.SessionView forceDecision(@AuthenticationPrincipal Jwt jwt, @PathVariable String slug,
            @RequestBody(required = false) ApiDtos.ForceDecisionRequest request) {
        deckFlow.forceDecision(slug, hostId(jwt), request == null ? null : request.venueId());
        return assembler.toView(queries.snapshot(slug));
    }

    private UUID hostId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject()); // backend token: sub = userId
    }
}
```

`ParticipantController.java`:

```java
package com.bumpinto.adapter.in.web;

import com.bumpinto.application.SessionCommands;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.infra.AuthCookies;
import com.bumpinto.infra.ParticipantPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sessions/{slug}")
class ParticipantController {

    private static final java.time.Duration PT_TTL = java.time.Duration.ofHours(24);

    private final SessionCommands commands;
    private final AuthCookies cookies;

    ParticipantController(SessionCommands commands, AuthCookies cookies) {
        this.commands = commands;
        this.cookies = cookies;
    }

    @PostMapping("/participants")
    ResponseEntity<ApiDtos.JoinResponse> join(@PathVariable String slug,
            @RequestHeader(value = "X-Client", defaultValue = "mobile") String client,
            @Valid @RequestBody ApiDtos.JoinRequest request) {
        GeoPoint location = request.lat() == null || request.lng() == null ? null
                : new GeoPoint(request.lat(), request.lng());
        Participant joined = commands.join(slug, request.displayName(), location);
        if ("web".equalsIgnoreCase(client)) {
            // Web hassas bilgi tutmaz: token yalnız HttpOnly cookie'de, body'de null
            return ResponseEntity.status(HttpStatus.CREATED)
                    .header(HttpHeaders.SET_COOKIE,
                            cookies.participant(slug, joined.token(), PT_TTL).toString())
                    .body(new ApiDtos.JoinResponse(joined.id(), null));
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiDtos.JoinResponse(joined.id(), joined.token()));
    }

    @PutMapping("/location")
    void location(@AuthenticationPrincipal ParticipantPrincipal me, @PathVariable String slug,
            @Valid @RequestBody ApiDtos.LocationRequest request) {
        commands.updateLocation(slug, me.participantId(),
                new GeoPoint(request.lat(), request.lng()));
    }
}
```

`DeckController.java`:

```java
package com.bumpinto.adapter.in.web;

import com.bumpinto.application.DeckFlow;
import com.bumpinto.infra.ParticipantPrincipal;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/sessions/{slug}")
class DeckController {

    private final DeckFlow deckFlow;

    DeckController(DeckFlow deckFlow) {
        this.deckFlow = deckFlow;
    }

    @PostMapping("/swipes")
    void swipe(@AuthenticationPrincipal ParticipantPrincipal me, @PathVariable String slug,
               @Valid @RequestBody ApiDtos.SwipeRequest request) {
        deckFlow.swipe(slug, me.participantId(), request.venueId(), request.liked());
    }

    @DeleteMapping("/swipes/{venueId}")
    void undo(@AuthenticationPrincipal ParticipantPrincipal me, @PathVariable String slug,
              @PathVariable UUID venueId) {
        deckFlow.undoSwipe(slug, me.participantId(), venueId);
    }

    @PostMapping("/deck-done")
    void deckDone(@AuthenticationPrincipal ParticipantPrincipal me, @PathVariable String slug) {
        deckFlow.finishDeck(slug, me.participantId());
    }

    @PostMapping("/runoff-votes")
    void runoffVote(@AuthenticationPrincipal ParticipantPrincipal me, @PathVariable String slug,
                    @Valid @RequestBody ApiDtos.RunoffVoteRequest request) {
        deckFlow.runoffVote(slug, me.participantId(), request.venueId());
    }
}
```

- [ ] **Step 4: Güvenlik slice testini yaz** (cookie/body ayrımı dahil)

```java
package com.bumpinto.adapter.in.web;

import com.bumpinto.application.DeckFlow;
import com.bumpinto.application.SessionCommands;
import com.bumpinto.application.SessionQueries;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.infra.AppProps;
import com.bumpinto.infra.AuthCookies;
import com.bumpinto.infra.ParticipantTokenFilter;
import com.bumpinto.infra.SecurityConfig;
import com.bumpinto.infra.TokenService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {SessionController.class, ParticipantController.class, DeckController.class})
@Import({SecurityConfig.class, ParticipantTokenFilter.class, SessionViewAssembler.class,
        AuthCookies.class, TokenService.class, WebSecuritySliceTest.TestBeans.class})
class WebSecuritySliceTest {

    @TestConfiguration
    static class TestBeans {

        @Bean
        AppProps appProps() {
            return new AppProps(
                    new AppProps.Security("cid", "0123456789abcdef0123456789abcdef",
                            Duration.ofHours(12)),
                    new AppProps.Providers("", ""),
                    new AppProps.Cors(List.of("http://localhost:5173")),
                    new AppProps.Cookies(false, ""));
        }

        @Bean
        Clock clock() {
            return Clock.systemUTC();
        }
    }

    @Autowired MockMvc mvc;
    @Autowired TokenService tokens;
    @MockitoBean SessionCommands commands;
    @MockitoBean DeckFlow deckFlow;
    @MockitoBean SessionQueries queries;
    @MockitoBean SessionStorePort store;

    static Participant ayse() {
        return new Participant(UUID.randomUUID(), UUID.randomUUID(), "Ayşe",
                new GeoPoint(51.3855, 5.7120), false, "tok-a", null);
    }

    @Test
    void viewWithoutCredentialsIs401() throws Exception {
        mvc.perform(get("/api/sessions/abc")).andExpect(status().isUnauthorized());
    }

    @Test
    void webJoinPutsTokenOnlyInHttpOnlyCookie() throws Exception {
        when(commands.join(eq("abc"), eq("Ayşe"), any())).thenReturn(ayse());

        MvcResult result = mvc.perform(post("/api/sessions/abc/participants")
                        .header("X-Client", "web")
                        .contentType("application/json")
                        .content("{\"displayName\":\"Ayşe\",\"lat\":51.38,\"lng\":5.71}"))
                .andExpect(status().isCreated())
                .andReturn();

        Cookie cookie = result.getResponse().getCookie("bumpinto_pt_abc");
        assertThat(cookie).isNotNull();
        assertThat(cookie.getValue()).isEqualTo("tok-a");
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(result.getResponse().getContentAsString())
                .contains("\"participantToken\":null"); // web'e token sızmaz
    }

    @Test
    void mobileJoinReturnsTokenInBodyWithoutCookie() throws Exception {
        when(commands.join(eq("abc"), eq("Ayşe"), any())).thenReturn(ayse());

        MvcResult result = mvc.perform(post("/api/sessions/abc/participants")
                        .contentType("application/json")
                        .content("{\"displayName\":\"Ayşe\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.participantToken").value("tok-a"))
                .andReturn();

        assertThat(result.getResponse().getCookie("bumpinto_pt_abc")).isNull();
    }

    @Test
    void createSessionWithoutAuthIs401() throws Exception {
        mvc.perform(post("/api/sessions").contentType("application/json")
                        .content("{\"activityType\":\"COFFEE\",\"lat\":51.7,\"lng\":5.3,\"displayName\":\"M\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createSessionAcceptsBackendBearerToken() throws Exception {
        UUID hostId = UUID.randomUUID();
        Session session = new Session(UUID.randomUUID(), "slug1234", hostId, null,
                ActivityType.COFFEE, SessionStatus.COLLECTING,
                Instant.now().plusSeconds(600), null, List.of());
        Participant host = new Participant(UUID.randomUUID(), session.id(), "M",
                new GeoPoint(51.7, 5.3), true, "tok-h", null);
        when(commands.createSession(eq(hostId), any(), any(), any(), any()))
                .thenReturn(new SessionCommands.CreateSessionResult(session, host));

        String bearer = tokens.issueAccessToken(hostId, "m@x.dev");
        mvc.perform(post("/api/sessions")
                        .header("Authorization", "Bearer " + bearer)
                        .contentType("application/json")
                        .content("{\"activityType\":\"COFFEE\",\"lat\":51.7,\"lng\":5.3,\"displayName\":\"M\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value("slug1234"));
    }
}
```

- [ ] **Step 5: PASS doğrula** — Run: `rtk mvn -q test -Dtest=WebSecuritySliceTest` → `Tests run: 5, Failures: 0`

- [ ] **Step 6: INDEX güncelle + Commit (kullanıcı)** — `feat(web): rest ucları, view assembler, openapi`

---

### Task 8: Unirest sağlayıcı adaptörleri (Foursquare + Google + dayanıklılık)

**Files:**
- Modify: `backend/pom.xml`
- Modify: `backend/src/main/java/com/bumpinto/infra/AppConfig.java` (Unirest bean)
- Create: `backend/src/main/java/com/bumpinto/adapter/out/provider/ProviderException.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/provider/FoursquareVenueProvider.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/provider/GooglePlacesVenueProvider.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/provider/ResilientVenueProvider.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/out/provider/FoursquareVenueProviderTest.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/out/provider/ResilientVenueProviderTest.java`

Spec notu (belgeli sapma): §3'teki "Google detay zenginleştirme" amacı (foto/puan kalitesi)
burada FSQ `fields` parametresi (rating, photos) + Google'ın tam yedek sağlayıcı olmasıyla
karşılanıyor; mekan başına ayrı Google detay çağrısı YAGNI gereği yapılmıyor. Foto/puan
kalitesi sahada yetersiz çıkarsa ayrı zenginleştirme iterasyonu açılır.

- [ ] **Step 1: pom.xml'e ekle**

```xml
    <dependency>
      <groupId>com.konghq</groupId>
      <artifactId>unirest-java-core</artifactId>
      <version>4.5.0</version>
    </dependency>
    <dependency>
      <groupId>com.konghq</groupId>
      <artifactId>unirest-modules-gson</artifactId>
      <version>4.5.0</version>
    </dependency>
    <dependency>
      <groupId>com.github.ben-manes.caffeine</groupId>
      <artifactId>caffeine</artifactId>
    </dependency>
    <dependency>
      <groupId>com.konghq</groupId>
      <artifactId>unirest-mocks</artifactId>
      <version>4.5.0</version>
      <scope>test</scope>
    </dependency>
```

- [ ] **Step 2: AppConfig'e Unirest bean'i ekle**

```java
    @Bean(destroyMethod = "close")
    kong.unirest.core.UnirestInstance unirest() {
        kong.unirest.core.UnirestInstance instance = kong.unirest.core.Unirest.spawnInstance();
        instance.config().connectTimeout(3000).requestTimeout(5000);
        return instance;
    }
```

- [ ] **Step 3: Failing sağlayıcı testlerini yaz**

`FoursquareVenueProviderTest.java`:

```java
package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.VenueCandidate;
import com.bumpinto.infra.AppProps;
import kong.unirest.core.HttpMethod;
import kong.unirest.core.MockClient;
import kong.unirest.core.Unirest;
import kong.unirest.core.UnirestInstance;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class FoursquareVenueProviderTest {

    @Test
    void parsesSearchResponseAndConvertsRatingToFiveScale() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.GET, "https://api.foursquare.com/v3/places/search")
                .thenReturn("""
                        {"results":[{"fsq_id":"f1","name":"Café Berlage",
                          "geocodes":{"main":{"latitude":51.44,"longitude":5.47}},
                          "rating":9.2,"price":2,
                          "photos":[{"prefix":"https://p/","suffix":"/x.jpg"}]}]}
                        """);
        AppProps props = new AppProps(new AppProps.Security("cid"),
                new AppProps.Providers("fsq-key", "g-key"));

        List<VenueCandidate> out = new FoursquareVenueProvider(http, props)
                .search(new GeoPoint(51.5, 5.5), 5.0, ActivityType.COFFEE, 10);

        assertThat(out).hasSize(1);
        VenueCandidate c = out.get(0);
        assertThat(c.provider()).isEqualTo("foursquare");
        assertThat(c.name()).isEqualTo("Café Berlage");
        assertThat(c.rating()).isEqualTo(4.6);
        assertThat(c.priceLevel()).isEqualTo(2);
        assertThat(c.photoUrl()).isEqualTo("https://p/original/x.jpg");
    }
}
```

`ResilientVenueProviderTest.java`:

```java
package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.VenueCandidate;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ResilientVenueProviderTest {

    static final GeoPoint CENTER = new GeoPoint(51.5, 5.5);
    static final VenueCandidate CAND = new VenueCandidate("google", "g1", "Yedek Mekan",
            CENTER, 4.2, 1, null, "https://maps/g1");

    @Test
    void fallsBackToGoogleWhenFoursquareFails() {
        FoursquareVenueProvider fsq = mock(FoursquareVenueProvider.class);
        GooglePlacesVenueProvider google = mock(GooglePlacesVenueProvider.class);
        when(fsq.search(any(), anyDouble(), any(), anyInt()))
                .thenThrow(new ProviderException("fsq down"));
        when(google.search(any(), anyDouble(), any(), anyInt())).thenReturn(List.of(CAND));

        List<VenueCandidate> out = new ResilientVenueProvider(fsq, google)
                .search(CENTER, 5.0, ActivityType.COFFEE, 10);

        assertThat(out).containsExactly(CAND);
    }

    @Test
    void cachesRepeatedSearches() {
        FoursquareVenueProvider fsq = mock(FoursquareVenueProvider.class);
        GooglePlacesVenueProvider google = mock(GooglePlacesVenueProvider.class);
        when(fsq.search(any(), anyDouble(), any(), anyInt())).thenReturn(List.of(CAND));

        ResilientVenueProvider provider = new ResilientVenueProvider(fsq, google);
        provider.search(CENTER, 5.0, ActivityType.COFFEE, 10);
        provider.search(CENTER, 5.0, ActivityType.COFFEE, 10);

        verify(fsq, times(1)).search(any(), anyDouble(), any(), anyInt());
    }
}
```

- [ ] **Step 4: FAIL doğrula** — Run: `rtk mvn -q test -Dtest='FoursquareVenueProviderTest,ResilientVenueProviderTest'` → derleme hatası.

- [ ] **Step 5: Adaptörleri yaz**

`ProviderException.java`:

```java
package com.bumpinto.adapter.out.provider;

public class ProviderException extends RuntimeException {
    public ProviderException(String message) {
        super(message);
    }
}
```

`FoursquareVenueProvider.java`:

```java
package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.VenueProviderPort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.VenueCandidate;
import com.bumpinto.infra.AppProps;
import kong.unirest.core.HttpResponse;
import kong.unirest.core.JsonNode;
import kong.unirest.core.UnirestInstance;
import kong.unirest.core.json.JSONArray;
import kong.unirest.core.json.JSONObject;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class FoursquareVenueProvider implements VenueProviderPort {

    // Kategori kimlikleri: https://docs.foursquare.com/data-products/docs/categories
    // Yürütme sırasında güncel dokümandan doğrula.
    static final Map<ActivityType, String> CATEGORIES = Map.of(
            ActivityType.COFFEE, "13032",
            ActivityType.FOOD, "13065",
            ActivityType.BAR, "13003",
            ActivityType.WALK, "16032",
            ActivityType.ACTIVITY, "10027");

    private final UnirestInstance http;
    private final AppProps props;

    public FoursquareVenueProvider(UnirestInstance http, AppProps props) {
        this.http = http;
        this.props = props;
    }

    @Override
    public List<VenueCandidate> search(GeoPoint center, double radiusKm, ActivityType type,
                                       int limit) {
        HttpResponse<JsonNode> response = http.get("https://api.foursquare.com/v3/places/search")
                .header("Authorization", props.providers().foursquareKey())
                .queryString("ll", center.lat() + "," + center.lng())
                .queryString("radius", (int) Math.min(radiusKm * 1000, 100000))
                .queryString("categories", CATEGORIES.get(type))
                .queryString("limit", limit)
                .queryString("fields", "fsq_id,name,geocodes,rating,price,photos")
                .asJson();
        if (!response.isSuccess()) {
            throw new ProviderException("foursquare returned " + response.getStatus());
        }
        JSONArray results = response.getBody().getObject().getJSONArray("results");
        List<VenueCandidate> out = new ArrayList<>();
        for (int i = 0; i < results.length(); i++) {
            JSONObject r = results.getJSONObject(i);
            JSONObject main = r.getJSONObject("geocodes").getJSONObject("main");
            double lat = main.getDouble("latitude");
            double lng = main.getDouble("longitude");
            Double rating = r.has("rating")
                    ? Math.round(r.getDouble("rating") / 2.0 * 10) / 10.0 : null; // 0-10 → 0-5
            Integer price = r.has("price") ? r.getInt("price") : null;
            String photo = null;
            if (r.has("photos") && r.getJSONArray("photos").length() > 0) {
                JSONObject p = r.getJSONArray("photos").getJSONObject(0);
                photo = p.getString("prefix") + "original" + p.getString("suffix");
            }
            out.add(new VenueCandidate("foursquare", r.getString("fsq_id"), r.getString("name"),
                    new GeoPoint(lat, lng), rating, price, photo,
                    "https://maps.google.com/?q=" + lat + "," + lng));
        }
        return out;
    }
}
```

`GooglePlacesVenueProvider.java`:

```java
package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.VenueProviderPort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.VenueCandidate;
import com.bumpinto.infra.AppProps;
import kong.unirest.core.HttpResponse;
import kong.unirest.core.JsonNode;
import kong.unirest.core.UnirestInstance;
import kong.unirest.core.json.JSONArray;
import kong.unirest.core.json.JSONObject;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class GooglePlacesVenueProvider implements VenueProviderPort {

    static final Map<ActivityType, String> TYPES = Map.of(
            ActivityType.COFFEE, "cafe",
            ActivityType.FOOD, "restaurant",
            ActivityType.BAR, "bar",
            ActivityType.WALK, "park",
            ActivityType.ACTIVITY, "bowling_alley");

    private final UnirestInstance http;
    private final AppProps props;

    public GooglePlacesVenueProvider(UnirestInstance http, AppProps props) {
        this.http = http;
        this.props = props;
    }

    @Override
    public List<VenueCandidate> search(GeoPoint center, double radiusKm, ActivityType type,
                                       int limit) {
        JSONObject body = new JSONObject()
                .put("includedTypes", new JSONArray().put(TYPES.get(type)))
                .put("maxResultCount", Math.min(limit, 20))
                .put("locationRestriction", new JSONObject().put("circle", new JSONObject()
                        .put("center", new JSONObject()
                                .put("latitude", center.lat()).put("longitude", center.lng()))
                        .put("radius", Math.min(radiusKm * 1000, 50000))));
        HttpResponse<JsonNode> response = http
                .post("https://places.googleapis.com/v1/places:searchNearby")
                .header("Content-Type", "application/json")
                .header("X-Goog-Api-Key", props.providers().googleKey())
                .header("X-Goog-FieldMask",
                        "places.id,places.displayName,places.location,places.rating,"
                                + "places.priceLevel,places.googleMapsUri")
                .body(body.toString())
                .asJson();
        if (!response.isSuccess()) {
            throw new ProviderException("google places returned " + response.getStatus());
        }
        JSONObject root = response.getBody().getObject();
        if (!root.has("places")) {
            return List.of();
        }
        JSONArray places = root.getJSONArray("places");
        List<VenueCandidate> out = new ArrayList<>();
        for (int i = 0; i < places.length(); i++) {
            JSONObject p = places.getJSONObject(i);
            JSONObject loc = p.getJSONObject("location");
            out.add(new VenueCandidate("google", p.getString("id"),
                    p.getJSONObject("displayName").getString("text"),
                    new GeoPoint(loc.getDouble("latitude"), loc.getDouble("longitude")),
                    p.has("rating") ? p.getDouble("rating") : null,
                    p.has("priceLevel") ? priceLevel(p.getString("priceLevel")) : null,
                    null, // foto FSQ'dan gelir; Google yedeğinde foto yok (bilinen taviz)
                    p.has("googleMapsUri") ? p.getString("googleMapsUri") : null));
        }
        return out;
    }

    private static Integer priceLevel(String level) {
        return switch (level) {
            case "PRICE_LEVEL_FREE" -> 0;
            case "PRICE_LEVEL_INEXPENSIVE" -> 1;
            case "PRICE_LEVEL_MODERATE" -> 2;
            case "PRICE_LEVEL_EXPENSIVE" -> 3;
            case "PRICE_LEVEL_VERY_EXPENSIVE" -> 4;
            default -> null;
        };
    }
}
```

`ResilientVenueProvider.java`:

```java
package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.VenueProviderPort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.VenueCandidate;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;
import java.util.Locale;

@Component
@Primary
public class ResilientVenueProvider implements VenueProviderPort {

    private final FoursquareVenueProvider primary;
    private final GooglePlacesVenueProvider secondary;
    private final Cache<String, List<VenueCandidate>> cache = Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(Duration.ofMinutes(30))
            .build();

    public ResilientVenueProvider(FoursquareVenueProvider primary,
                                  GooglePlacesVenueProvider secondary) {
        this.primary = primary;
        this.secondary = secondary;
    }

    @Override
    public List<VenueCandidate> search(GeoPoint center, double radiusKm, ActivityType type,
                                       int limit) {
        String key = String.format(Locale.ROOT, "%.3f:%.3f:%.1f:%s",
                center.lat(), center.lng(), radiusKm, type);
        return cache.get(key, k -> searchWithFallback(center, radiusKm, type, limit));
    }

    private List<VenueCandidate> searchWithFallback(GeoPoint center, double radiusKm,
                                                    ActivityType type, int limit) {
        try {
            List<VenueCandidate> result = primary.search(center, radiusKm, type, limit);
            if (!result.isEmpty()) {
                return result;
            }
        } catch (RuntimeException e) {
            // birincil düştü — yedeğe geç (spec §6)
        }
        return secondary.search(center, radiusKm, type, limit);
    }
}
```

- [ ] **Step 6: PASS doğrula** — Run: `rtk mvn -q test -Dtest='FoursquareVenueProviderTest,ResilientVenueProviderTest'` → `Tests run: 3, Failures: 0`

- [ ] **Step 7: INDEX güncelle + Commit (kullanıcı)** — `feat(provider): unirest ile foursquare/google + fallback + cache`

---

### Task 9: Uçtan uca happy-path entegrasyon testi

**Files:**
- Test: `backend/src/test/java/com/bumpinto/ApiHappyPathIT.java`

- [ ] **Step 1: Testi yaz** (spec §7: create → join → suggest → swipe → decide; auth: mobil Bearer + web cookie)

```java
package com.bumpinto;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.VenueProviderPort;
import com.bumpinto.domain.venue.VenueCandidate;
import com.bumpinto.infra.GoogleIdVerifier;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class ApiHappyPathIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @MockitoBean VenueProviderPort provider;   // @Primary ResilientVenueProvider yerine
    @MockitoBean GoogleIdVerifier google;      // dış Google çağrısı yok

    @Test
    void createJoinSuggestSwipeDecide() throws Exception {
        when(google.verify("gid")).thenReturn(new GoogleIdVerifier.GoogleUser("m@x.dev", "Mehmet"));
        when(provider.search(any(), anyDouble(), any(), anyInt())).thenReturn(
                IntStream.range(0, 6).mapToObj(i -> new VenueCandidate("foursquare", "f" + i,
                        "Mekan " + i, new GeoPoint(51.54 + i * 0.001, 5.5),
                        4.9 - i * 0.1, 2, null, "https://maps/" + i)).toList());

        // 0 — mobil giriş: Google id_token → backend access token (body'de)
        String loginBody = mvc.perform(post("/api/auth/google")
                        .contentType("application/json")
                        .content("{\"idToken\":\"gid\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String accessToken = json.readTree(loginBody).get("accessToken").asText();
        assertThat(accessToken).isNotBlank();

        // 1 — host oturum kurar (Bearer; mobil istemci → participantToken body'de)
        String createBody = mvc.perform(post("/api/sessions")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("{\"activityType\":\"COFFEE\",\"name\":\"Cuma kahvesi\","
                                + "\"lat\":51.6978,\"lng\":5.3037,\"displayName\":\"Mehmet\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        JsonNode created = json.readTree(createBody);
        String slug = created.get("slug").asText();
        String hostToken = created.get("participantToken").asText();

        // 2 — Ayşe WEB istemcisi olarak katılır: token HttpOnly cookie'de, body'de null
        MvcResult joinResult = mvc.perform(post("/api/sessions/" + slug + "/participants")
                        .header("X-Client", "web")
                        .contentType("application/json")
                        .content("{\"displayName\":\"Ayşe\",\"lat\":51.3855,\"lng\":5.7120}"))
                .andExpect(status().isCreated())
                .andReturn();
        assertThat(json.readTree(joinResult.getResponse().getContentAsString())
                .get("participantToken").isNull()).isTrue();
        Cookie ayseCookie = joinResult.getResponse().getCookie("bumpinto_pt_" + slug);
        assertThat(ayseCookie).isNotNull();
        assertThat(ayseCookie.isHttpOnly()).isTrue();

        // 3 — host desteyi kurar
        String viewBody = mvc.perform(post("/api/sessions/" + slug + "/find-venues")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode view = json.readTree(viewBody);
        assertThat(view.get("status").asText()).isEqualTo("SWIPING");
        assertThat(view.get("venues")).hasSize(6);
        String favoriteId = view.get("venues").get(0).get("id").asText();

        // 4 — host header token'ıyla, Ayşe cookie'yle aynı mekanı beğenir + bitirir
        mvc.perform(post("/api/sessions/" + slug + "/swipes")
                        .header("X-Participant-Token", hostToken)
                        .contentType("application/json")
                        .content("{\"venueId\":\"" + favoriteId + "\",\"liked\":true}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/sessions/" + slug + "/deck-done")
                        .header("X-Participant-Token", hostToken))
                .andExpect(status().isOk());
        mvc.perform(post("/api/sessions/" + slug + "/swipes")
                        .cookie(ayseCookie)
                        .contentType("application/json")
                        .content("{\"venueId\":\"" + favoriteId + "\",\"liked\":true}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/sessions/" + slug + "/deck-done")
                        .cookie(ayseCookie))
                .andExpect(status().isOk());

        // 5 — kesişim tek mekan → doğrudan karar (spec §4)
        String finalBody = mvc.perform(get("/api/sessions/" + slug).cookie(ayseCookie))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode finalView = json.readTree(finalBody);
        assertThat(finalView.get("status").asText()).isEqualTo("DECIDED");
        assertThat(finalView.get("decidedVenueId").asText()).isEqualTo(favoriteId);

        // 6 — OpenAPI codegen ucu açık
        mvc.perform(get("/v3/api-docs")).andExpect(status().isOk());
    }
}
```

- [ ] **Step 2: PASS doğrula** — Run: `rtk mvn -q test -Dtest=ApiHappyPathIT` → `Tests run: 1, Failures: 0`

- [ ] **Step 3: Tüm suite** — Run: `rtk mvn -q test` → `BUILD SUCCESS`, ArchUnit dahil hepsi yeşil.

- [ ] **Step 4: INDEX'te Plan 2'yi `done` yap + Commit (kullanıcı)** — `feat(api): plan2 tamam — uctan uca akis`

---

### Task 10: Rate limit altyapısı + parametrik-sorgu zorlaması

**Files:**
- Modify: `backend/pom.xml`
- Create: `backend/src/main/java/com/bumpinto/infra/RateLimitFilter.java`
- Modify: `backend/src/test/java/com/bumpinto/HexagonalArchitectureTest.java` (kural ekle)
- Test: `backend/src/test/java/com/bumpinto/infra/RateLimitFilterTest.java`

- [ ] **Step 1: pom.xml'e Bucket4j ekle** (yazım anında 8.10.1 — güncel 8.x'e yükselt)

```xml
    <dependency>
      <groupId>com.bucket4j</groupId>
      <artifactId>bucket4j-core</artifactId>
      <version>8.10.1</version>
    </dependency>
```

- [ ] **Step 2: Failing testi yaz**

```java
package com.bumpinto.infra;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.List;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitFilterTest {

    static final RateLimitFilter.Policy TINY =
            new RateLimitFilter.Policy("join", "POST", Pattern.compile("^/api/x$"), 2);

    static MockHttpServletRequest post(String ip) {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/x");
        req.setRemoteAddr(ip);
        return req;
    }

    @Test
    void blocksAfterCapacityPerIpAndSetsRetryAfter() throws Exception {
        RateLimitFilter filter = new RateLimitFilter(List.of(TINY));

        for (int i = 0; i < 2; i++) {
            MockHttpServletResponse ok = new MockHttpServletResponse();
            filter.doFilter(post("1.2.3.4"), ok, new MockFilterChain());
            assertThat(ok.getStatus()).isEqualTo(200);
        }
        MockHttpServletResponse blocked = new MockHttpServletResponse();
        filter.doFilter(post("1.2.3.4"), blocked, new MockFilterChain());
        assertThat(blocked.getStatus()).isEqualTo(429);
        assertThat(blocked.getHeader("Retry-After")).isEqualTo("60");

        // farklı IP ayrı kova
        MockHttpServletResponse other = new MockHttpServletResponse();
        filter.doFilter(post("5.6.7.8"), other, new MockFilterChain());
        assertThat(other.getStatus()).isEqualTo(200);
    }

    @Test
    void unmatchedPathIsNotLimited() throws Exception {
        RateLimitFilter filter = new RateLimitFilter(List.of(TINY));
        for (int i = 0; i < 10; i++) {
            MockHttpServletResponse res = new MockHttpServletResponse();
            MockHttpServletRequest req = new MockHttpServletRequest("GET", "/actuator/health");
            filter.doFilter(req, res, new MockFilterChain());
            assertThat(res.getStatus()).isEqualTo(200);
        }
    }
}
```

- [ ] **Step 3: FAIL doğrula** — Run: `rtk mvn -q test -Dtest=RateLimitFilterTest` → derleme hatası.

- [ ] **Step 4: RateLimitFilter'ı yaz**

```java
package com.bumpinto.infra;

import com.github.benmanes.caffeine.cache.Caffeine;
import com.github.benmanes.caffeine.cache.LoadingCache;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.regex.Pattern;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE) // güvenlik zincirinden önce — ucuz reddet
public class RateLimitFilter extends OncePerRequestFilter {

    /** capacity = dakikadaki istek hakkı (greedy refill). */
    public record Policy(String id, String method, Pattern path, int capacity) {
    }

    static List<Policy> defaultPolicies() {
        return List.of(
                new Policy("auth", "POST", Pattern.compile("^/api/auth/google$"), 5),
                new Policy("join", "POST", Pattern.compile("^/api/sessions/[^/]+/participants$"), 10),
                new Policy("find", "POST", Pattern.compile("^/api/sessions/[^/]+/find-venues$"), 3),
                new Policy("create", "POST", Pattern.compile("^/api/sessions$"), 10),
                new Policy("api", null, Pattern.compile("^/api/.*"), 120));
    }

    private final List<Policy> policies;
    // Tek pod için in-memory yeterli; çoklu pod'da bucket4j-redis'e geçilir (spec §3 Redis notu)
    private final LoadingCache<String, Bucket> buckets = Caffeine.newBuilder()
            .maximumSize(100_000)
            .expireAfterAccess(Duration.ofMinutes(10))
            .build(RateLimitFilter::newBucket);

    public RateLimitFilter() {
        this(defaultPolicies());
    }

    RateLimitFilter(List<Policy> policies) {
        this.policies = policies;
    }

    private static Bucket newBucket(String key) {
        int capacity = Integer.parseInt(key.substring(0, key.indexOf(':')));
        return Bucket.builder()
                .addLimit(limit -> limit.capacity(capacity)
                        .refillGreedy(capacity, Duration.ofMinutes(1)))
                .build();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        Policy match = policies.stream()
                .filter(p -> (p.method() == null || p.method().equals(request.getMethod()))
                        && p.path().matcher(request.getRequestURI()).matches())
                .findFirst()
                .orElse(null);
        if (match == null) {
            chain.doFilter(request, response);
            return;
        }
        String key = match.capacity() + ":" + match.id() + ":" + clientIp(request);
        if (buckets.get(key).tryConsume(1)) {
            chain.doFilter(request, response);
            return;
        }
        response.setStatus(429);
        response.setHeader("Retry-After", "60");
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"too many requests\"}");
    }

    // X-Forwarded-For yalnız güvenilir proxy (ingress) arkasında anlamlıdır — Plan 5
    // ingress'i bu header'ı ezerek iletir; doğrudan internete açık deploy YAPILMAZ.
    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return forwarded != null ? forwarded.split(",")[0].strip() : request.getRemoteAddr();
    }
}
```

- [ ] **Step 5: PASS doğrula** — Run: `rtk mvn -q test -Dtest=RateLimitFilterTest` → `Tests run: 2, Failures: 0`

- [ ] **Step 6: ArchUnit'e parametrik-sorgu kuralını ekle** (`HexagonalArchitectureTest`'e yeni kural)

```java
    // SQL injection duruşu: tüm veri erişimi Spring Data'nın parametrik sorgularından.
    // EntityManager/JdbcTemplate production kodda yasak — string birleştirmeli SQL
    // yazma imkânı derlemede kapatılır. (Tırnak "temizleyici" bilinçli olarak yok.)
    @ArchTest
    static final ArchRule sqlOnlyThroughSpringData = noClasses()
            .that().resideInAPackage("com.bumpinto..")
            .should().dependOnClassesThat().haveNameMatching(
                    "jakarta\\.persistence\\.EntityManager"
                            + "|org\\.springframework\\.jdbc\\.core\\.JdbcTemplate");
```

Run: `rtk mvn -q test -Dtest=HexagonalArchitectureTest` → `Tests run: 3, Failures: 0`

- [ ] **Step 7: INDEX güncelle + Commit (kullanıcı)** —
`feat(security): bucket4j rate limit + parametrik sorgu archunit kurali`

---

## Plan sonu doğrulaması

- [ ] Spec eşlemesi: uç sözleşmesi ↔ §2 akışı; §4 karar motoru DeckFlow ile bağlandı;
  §6 hata yönetimi (fallback, radius genişletme, no_likes) kapsandı; realtime olayları
  §3'teki adlarla birebir. Google zenginleştirme sapması Task 8'de belgeli.
- [ ] `rtk mvn -q test` tümü yeşil; ArchUnit domain saflığı korunuyor.
- [ ] Gereken env değişkenleri (kullanıcı sağlar, `.env` ajan tarafından OKUNMAZ):
  `GOOGLE_CLIENT_ID`, `TOKEN_SECRET` (≥32 bayt — preprod/prod zorunlu),
  `SPRING_PROFILES_ACTIVE` (local|preprod|prod), `FOURSQUARE_API_KEY`,
  `GOOGLE_PLACES_API_KEY`, `DB_URL/DB_USER/DB_PASSWORD`.
- [ ] Güvenlik mimarisi bölümündeki kurallar uygulandı: web'e token sızmıyor
  (IT bunu doğruluyor), CORS profil bazlı, CSRF gerekçesi kodda yorum olarak duruyor.
- [ ] Rate limit politikaları aktif (429 + Retry-After testli); `Texts` + `@Size`
  girdi hijyeni devrede; ArchUnit parametrik-sorgu kuralı yeşil.
- [ ] Kullanıcıya bildir: Plan 3 (web) başlayabilir — codegen bu API'nin `/v3/api-docs` çıktısını kullanacak.
