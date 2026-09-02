# Plan 10: Backend — Hesap ve Liste API'leri (oturumlarım · profil/tercihler · dil · çıkış)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web/mobil "Oturumlar" ve "Profil" ekranlarının ihtiyaç duyduğu üç API'yi eklemek: `GET /api/sessions` (hostu ben olan oturumlar: açık + geçmiş), `GET/PUT /api/me` (kimlik, varsayılan konum/etkinlik, **dil tercihi**, istatistikler) ve `POST /api/auth/logout` (web çerezini siler). Mobil planındaki cihaz-yerel oturum listesi tavizi bu planla ortadan kalkar.

**Architecture:** Yeni ilgi alanı `application/user` (`UserPreferences` komut + `UserProfileQueries` sorgu). `domain/user/UserProfile` değer nesnesi; `UserStorePort` iki metotla genişler. `SessionStorePort`'a host bazlı özet sorgusu (`summariesOfHost`) ve konuk sayımı eklenir; tembel expiry okuma tarafında `SessionExpiry.applied` ile uygulanır (yeni özet satırları da EXPIRED raporlanır, yazılmaz). Spec: `docs/superpowers/specs/2026-09-01-web-parity-design.md` §6 (dil), §8 kalem 1–3. **Öncül: B-5 `done`** (V3 migration, `SessionType`, `Session` record alanları).

**Tech Stack:** Java 21, Spring Boot 4.1, Flyway (V4), Spring Data JPA (`@Query` JPQL), JUnit 5 + AssertJ + Testcontainers, Bruno.

---

## Bu plana özel kurallar

- **INDEX güncelle**; **Git yazma YOK**. Komutlar `backend/` dizininden; `MVN` = `JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true rtk mvn -o`.
- Entegrasyon testleri yalnız `PostgresContainer.shared()`.
- `ARCHITECTURE.md` §5 ArchUnit kuralları: `domain` saf; `application/user` yeni alt paket (katman köküne sınıf konmaz).
- **Migration V4** (B-5 V3'ü aldı; B-3 retention V5'e taşındı).
- Her uç Bruno isteğiyle biter; OpenAPI codegen görev sonunda tazelenir.
- Kapanış kapısı: `MVN test` yeşil.

---

### Task 1: V4 migration + `UserProfile` + `UserStorePort` genişletmesi (TDD)

**Files:**
- Create: `backend/src/main/resources/db/migration/V4__user_preferences.sql`
- Create: `backend/src/main/java/com/bumpinto/domain/user/UserProfile.java`
- Modify: `backend/src/main/java/com/bumpinto/domain/port/UserStorePort.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/UserEntity.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/UserStoreAdapter.java`
- Modify: `backend/src/test/java/com/bumpinto/support/FakeStores.java`
- Modify: `backend/src/test/java/com/bumpinto/SchemaMigrationTest.java`
- Modify: `backend/src/test/java/com/bumpinto/adapter/out/persistence/StoreAdapterTest.java`

- [ ] **Step 1: Migration** — `V4__user_preferences.sql`

```sql
alter table users add column default_lat            double precision;
alter table users add column default_lng            double precision;
alter table users add column default_location_label text;
alter table users add column default_activity       text;
-- null = tercih yok → istemci tarayici dilini kullanir (spec §6 algilama sirasi)
alter table users add column language               text;
```

- [ ] **Step 2: Domain** — `domain/user/UserProfile.java`

```java
package com.bumpinto.domain.user;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import java.util.UUID;

/** Kullanicinin hesap profili + tercihleri. Tum tercih alanlari opsiyoneldir (null = ayarlanmamis). */
public record UserProfile(UUID id, String email, String name, GeoPoint defaultLocation,
                          String defaultLocationLabel, ActivityType defaultActivity,
                          String language) {

    public UserProfile withPreferences(String newName, GeoPoint location, String label,
                                       ActivityType activity, String lang) {
        return new UserProfile(id, email, newName == null ? name : newName, location, label,
                activity, lang);
    }
}
```

`UserStorePort.java`:

```java
package com.bumpinto.domain.port;

import com.bumpinto.domain.user.UserProfile;
import java.util.Optional;
import java.util.UUID;

public interface UserStorePort {
    UUID upsertByEmail(String email, String name);
    Optional<UserProfile> profileOf(UUID userId);
    UserProfile saveProfile(UserProfile profile);
}
```

- [ ] **Step 3: Failing adapter test** — `StoreAdapterTest`'e (Postgres) ekle:

```java
    @Test
    void userProfileRoundTripsPreferences() {
        UUID id = users.upsertByEmail("pref@bumpinto.test", "Mehmet");
        UserProfile before = users.profileOf(id).orElseThrow();
        assertThat(before.language()).isNull();
        users.saveProfile(before.withPreferences("Mehmet Ş.", new GeoPoint(51.6978, 5.3037),
                "'s-Hertogenbosch", ActivityType.COFFEE, "tr"));
        UserProfile after = users.profileOf(id).orElseThrow();
        assertThat(after.name()).isEqualTo("Mehmet Ş.");
        assertThat(after.defaultLocation()).isEqualTo(new GeoPoint(51.6978, 5.3037));
        assertThat(after.defaultLocationLabel()).isEqualTo("'s-Hertogenbosch");
        assertThat(after.defaultActivity()).isEqualTo(ActivityType.COFFEE);
        assertThat(after.language()).isEqualTo("tr");
    }
```

(`users` = `@Autowired UserStoreAdapter users;` — sınıfta yoksa ekle.)

- [ ] **Step 4: FAIL doğrula** — Run: `MVN test -Dtest=StoreAdapterTest` → derleme hatası.

- [ ] **Step 5: Entity + adapter** — `UserEntity`'ye alanlar: `Double defaultLat; Double defaultLng; String defaultLocationLabel; String defaultActivity; String language;`. `UserStoreAdapter`'a ekle:

```java
    @Override public Optional<UserProfile> profileOf(UUID userId) {
        return users.findById(userId).map(UserStoreAdapter::toProfile);
    }

    @Override public UserProfile saveProfile(UserProfile p) {
        UserEntity u = users.findById(p.id())
                .orElseThrow(() -> new IllegalArgumentException("unknown user " + p.id()));
        u.name = p.name();
        u.defaultLat = p.defaultLocation() == null ? null : p.defaultLocation().lat();
        u.defaultLng = p.defaultLocation() == null ? null : p.defaultLocation().lng();
        u.defaultLocationLabel = p.defaultLocationLabel();
        u.defaultActivity = p.defaultActivity() == null ? null : p.defaultActivity().name();
        u.language = p.language();
        users.save(u);
        return p;
    }

    static UserProfile toProfile(UserEntity u) {
        GeoPoint loc = (u.defaultLat == null || u.defaultLng == null) ? null
                : new GeoPoint(u.defaultLat, u.defaultLng);
        return new UserProfile(u.id, u.email, u.name, loc, u.defaultLocationLabel,
                u.defaultActivity == null ? null : ActivityType.valueOf(u.defaultActivity),
                u.language);
    }
```

`FakeStores`'a ekle:

```java
    public static class InMemoryUserStore implements UserStorePort {
        public final Map<UUID, UserProfile> users = new HashMap<>();
        @Override public UUID upsertByEmail(String email, String name) {
            return users.values().stream().filter(u -> u.email().equals(email)).findFirst()
                    .map(UserProfile::id)
                    .orElseGet(() -> {
                        UUID id = UUID.randomUUID();
                        users.put(id, new UserProfile(id, email, name, null, null, null, null));
                        return id;
                    });
        }
        @Override public Optional<UserProfile> profileOf(UUID userId) {
            return Optional.ofNullable(users.get(userId));
        }
        @Override public UserProfile saveProfile(UserProfile profile) {
            users.put(profile.id(), profile);
            return profile;
        }
    }
```

`SchemaMigrationTest`'e ekle:

```java
    @Test
    void v4AddsUserPreferenceColumns() {
        List<String> cols = jdbc.queryForList(
                "select column_name from information_schema.columns where table_name = 'users'",
                String.class);
        assertThat(cols).contains("default_lat", "default_lng", "default_location_label",
                "default_activity", "language");
    }
```

- [ ] **Step 6: PASS doğrula** — Run: `MVN test -Dtest='StoreAdapterTest,SchemaMigrationTest'` → `Failures: 0, Errors: 0`.

- [ ] **Step 7: INDEX güncelle + Commit (kullanıcı)** — `feat(user): v4 tercih kolonlari, UserProfile, port genislemesi`

---

### Task 2: `application/user` — `UserPreferences` (komut) + `UserProfileQueries` (istatistikli sorgu) (TDD)

**Files:**
- Create: `backend/src/main/java/com/bumpinto/application/user/UserPreferences.java`
- Create: `backend/src/main/java/com/bumpinto/application/user/UserProfileQueries.java`
- Modify: `backend/src/main/java/com/bumpinto/domain/port/SessionStorePort.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/SessionStoreAdapter.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/ParticipantRepository.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/SessionRepository.java`
- Modify: `backend/src/test/java/com/bumpinto/support/FakeStores.java`
- Create: `backend/src/test/java/com/bumpinto/application/user/UserPreferencesTest.java`

- [ ] **Step 1: Failing test** — `UserPreferencesTest.java`

```java
package com.bumpinto.application.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.user.UserProfile;
import com.bumpinto.support.FakeStores;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class UserPreferencesTest {

    FakeStores.InMemoryUserStore users;
    UserPreferences prefs;

    @BeforeEach
    void setUp() {
        users = new FakeStores.InMemoryUserStore();
        prefs = new UserPreferences(users);
    }

    @Test
    void updateStoresNormalizedNameAndPreferences() {
        UUID id = users.upsertByEmail("m@x.test", "Mehmet");
        UserProfile p = prefs.update(id, "  Mehmet   Ş. ", new GeoPoint(51.7, 5.3),
                " 's-Hertogenbosch ", ActivityType.COFFEE, "nl");
        assertThat(p.name()).isEqualTo("Mehmet Ş.");
        assertThat(p.defaultLocationLabel()).isEqualTo("'s-Hertogenbosch");
        assertThat(p.language()).isEqualTo("nl");
        assertThat(users.profileOf(id).orElseThrow().defaultActivity()).isEqualTo(ActivityType.COFFEE);
    }

    @Test
    void updateKeepsNameWhenNull_andRejectsUnknownLanguageAndUser() {
        UUID id = users.upsertByEmail("m@x.test", "Mehmet");
        UserProfile p = prefs.update(id, null, null, null, null, null);
        assertThat(p.name()).isEqualTo("Mehmet");
        assertThat(p.language()).isNull();
        assertThatThrownBy(() -> prefs.update(id, null, null, null, null, "de"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> prefs.update(UUID.randomUUID(), null, null, null, null, null))
                .isInstanceOf(NotFoundException.class);
    }
}
```

- [ ] **Step 2: FAIL doğrula** — Run: `MVN test -Dtest=UserPreferencesTest` → derleme hatası.

- [ ] **Step 3: Komut** — `UserPreferences.java`

```java
package com.bumpinto.application.user;

import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.application.text.Texts;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.UserStorePort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.user.UserProfile;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserPreferences {

    /** Spec §6: TR / EN / NL. Null = tercih yok. */
    static final Set<String> LANGUAGES = Set.of("tr", "en", "nl");

    private final UserStorePort users;

    public UserPreferences(UserStorePort users) {
        this.users = users;
    }

    @Transactional
    public UserProfile update(UUID userId, String name, GeoPoint defaultLocation, String label,
                              ActivityType defaultActivity, String language) {
        UserProfile current = users.profileOf(userId)
                .orElseThrow(() -> new NotFoundException("user not found"));
        if (language != null && !LANGUAGES.contains(language)) {
            throw new IllegalArgumentException("unsupported language: " + language);
        }
        String newName = name == null ? null : Texts.displayName(name);
        return users.saveProfile(current.withPreferences(newName, defaultLocation,
                Texts.label(label), defaultActivity, language));
    }
}
```

- [ ] **Step 4: Özet sorgusu portu** — `SessionStorePort`'a ekle:

```java
    /** Hostu verilen kullanici olan oturumlar, en yeniden eskiye, en fazla limit. */
    List<SessionSummary> summariesOfHost(UUID hostId, int limit);
    /** Host'un oturumlarina katilmis, host ve elle konum OLMAYAN farkli kisi sayisi (ad bazli). */
    long distinctGuestsOfHost(UUID hostId);
```

`domain/session/SessionSummary.java` (yeni değer nesnesi):

```java
package com.bumpinto.domain.session;

import java.time.Instant;

/** Liste satiri: oturum + kayit zamani + katilimci sayisi + karar verilen mekan adi (varsa). */
public record SessionSummary(Session session, Instant createdAt, int participantCount,
                             String decidedVenueName) {
    public SessionSummary withSession(Session s) {
        return new SessionSummary(s, createdAt, participantCount, decidedVenueName);
    }
}
```

`SessionRepository`:

```java
    List<SessionEntity> findByHostIdOrderByCreatedAtDesc(UUID hostId, Pageable page);
```

`ParticipantRepository`:

```java
    long countBySessionId(UUID sessionId);

    @Query("select count(distinct p.displayName) from ParticipantEntity p, SessionEntity s "
            + "where s.id = p.sessionId and s.hostId = :hostId "
            + "and p.isHost = false and p.isManual = false")
    long countDistinctGuestsOfHost(UUID hostId);
```

`SessionStoreAdapter` (ctor'a `VenueRepository venues` ekle):

```java
    @Override public List<SessionSummary> summariesOfHost(UUID hostId, int limit) {
        return sessions.findByHostIdOrderByCreatedAtDesc(hostId, PageRequest.of(0, limit)).stream()
                .map(e -> new SessionSummary(toSession(e), e.createdAt,
                        (int) participants.countBySessionId(e.id),
                        e.decidedVenueId == null ? null
                                : venues.findById(e.decidedVenueId).map(v -> v.name).orElse(null)))
                .toList();
    }

    @Override public long distinctGuestsOfHost(UUID hostId) {
        return participants.countDistinctGuestsOfHost(hostId);
    }
```

(`VenueEntity.name` paket-görünür; aynı pakette.) `FakeStores.InMemorySessionStore`:

```java
        public final Map<UUID, Instant> createdAt = new HashMap<>();
        @Override public List<SessionSummary> summariesOfHost(UUID hostId, int limit) {
            return sessions.values().stream().filter(s -> s.hostId().equals(hostId))
                    .sorted(Comparator.comparing((Session s) ->
                            createdAt.getOrDefault(s.id(), Instant.EPOCH)).reversed())
                    .limit(limit)
                    .map(s -> new SessionSummary(s, createdAt.getOrDefault(s.id(), Instant.EPOCH),
                            participantsOf(s.id()).size(), null))
                    .toList();
        }
        @Override public long distinctGuestsOfHost(UUID hostId) {
            return participants.values().stream()
                    .filter(p -> !p.host() && !p.manual())
                    .filter(p -> sessions.get(p.sessionId()) != null
                            && sessions.get(p.sessionId()).hostId().equals(hostId))
                    .map(Participant::displayName).distinct().count();
        }
```

- [ ] **Step 5: Sorgu servisi** — `UserProfileQueries.java`

```java
package com.bumpinto.application.user;

import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.application.session.SessionExpiry;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.port.UserStorePort;
import com.bumpinto.domain.session.SessionSummary;
import com.bumpinto.domain.user.UserProfile;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class UserProfileQueries {

    static final int LIST_LIMIT = 20;

    public record Stats(long sessionsHosted, long friendsMet) {
    }

    public record Me(UserProfile profile, Stats stats) {
    }

    private final UserStorePort users;
    private final SessionStorePort sessions;
    private final Clock clock;

    public UserProfileQueries(UserStorePort users, SessionStorePort sessions, Clock clock) {
        this.users = users;
        this.sessions = sessions;
        this.clock = clock;
    }

    public Me me(UUID userId) {
        UserProfile profile = users.profileOf(userId)
                .orElseThrow(() -> new NotFoundException("user not found"));
        long hosted = sessions.summariesOfHost(userId, Integer.MAX_VALUE).size();
        return new Me(profile, new Stats(hosted, sessions.distinctGuestsOfHost(userId)));
    }

    /** Tembel expiry okuma tarafinda: TTL'i gecmis oturum EXPIRED raporlanir, yazilmaz. */
    public List<SessionSummary> mySessions(UUID userId) {
        return sessions.summariesOfHost(userId, LIST_LIMIT).stream()
                .map(s -> s.withSession(SessionExpiry.applied(s.session(), clock.instant())))
                .toList();
    }
}
```

`SessionExpiry.applied` paket-görünür (`static`); `application/user` farklı paket → `public static` yap (tek kelime değişikliği, `SessionExpiry.java`).

- [ ] **Step 6: PASS doğrula** — Run: `MVN test -Dtest='UserPreferencesTest,StoreAdapterTest,HexagonalArchitectureTest'` → yeşil.

- [ ] **Step 7: INDEX güncelle + Commit (kullanıcı)** — `feat(user): tercih komutu, profil/istatistik sorgusu, host ozet listesi`

---

### Task 3: API — `GET /api/sessions`, `GET/PUT /api/me`, `POST /api/auth/logout`

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/ApiDtos.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/SessionController.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/in/web/MeController.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/AuthController.java`
- Modify: `backend/src/main/java/com/bumpinto/infra/security/AuthCookies.java`
- Modify: `backend/src/main/java/com/bumpinto/infra/security/SecurityConfig.java`
- Create: `backend/src/test/java/com/bumpinto/AccountApiTest.java`

- [ ] **Step 1: Failing integration test** — `AccountApiTest.java` (`ApiHappyPathTest` ile aynı `@SpringBootTest` + `@TestPropertySource` bloğu ve mock'lar; `PostgresContainer.shared()`):

```java
    @Test
    void listMeUpdateAndLogout() throws Exception {
        when(google.verify("gid3"))
                .thenReturn(new GoogleIdVerifier.GoogleUser("acct@bumpinto.test", "Mehmet"));
        MvcResult login = mvc.perform(post("/api/auth/google").header("X-Client", "web")
                        .contentType(JSON).content("{\"idToken\":\"gid3\"}"))
                .andExpect(status().isOk()).andReturn();
        Cookie at = login.getResponse().getCookie("bumpinto_at");

        // iki oturum: biri SOLO, biri GROUP
        for (String type : List.of("GROUP", "SOLO")) {
            mvc.perform(post("/api/sessions").cookie(at).contentType(JSON)
                            .content("{\"activityType\":\"COFFEE\",\"sessionType\":\"" + type + "\","
                                    + "\"name\":\"" + type + " kahve\",\"lat\":51.69,\"lng\":5.30,"
                                    + "\"displayName\":\"Mehmet\"}"))
                    .andExpect(status().isCreated());
        }

        JsonNode list = json.readTree(mvc.perform(get("/api/sessions").cookie(at))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(list.get("open").size()).isEqualTo(2);
        assertThat(list.get("past").size()).isZero();
        assertThat(list.get("open").get(0).get("name").asString()).isEqualTo("SOLO kahve"); // en yeni once
        assertThat(list.get("open").get(0).get("participantCount").asInt()).isEqualTo(1);

        JsonNode me = json.readTree(mvc.perform(get("/api/me").cookie(at))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(me.get("email").asString()).isEqualTo("acct@bumpinto.test");
        assertThat(me.get("language").isNull()).isTrue();
        assertThat(me.get("stats").get("sessionsHosted").asLong()).isEqualTo(2);

        JsonNode updated = json.readTree(mvc.perform(put("/api/me").cookie(at).contentType(JSON)
                        .content("{\"displayName\":\"Mehmet Ş.\",\"language\":\"nl\","
                                + "\"defaultActivity\":\"BAR\","
                                + "\"defaultLocation\":{\"lat\":51.69,\"lng\":5.30,\"label\":\"Den Bosch\"}}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(updated.get("language").asString()).isEqualTo("nl");
        assertThat(updated.get("defaultLocation").get("label").asString()).isEqualTo("Den Bosch");

        mvc.perform(put("/api/me").cookie(at).contentType(JSON).content("{\"language\":\"de\"}"))
                .andExpect(status().isBadRequest());

        MvcResult logout = mvc.perform(post("/api/auth/logout").cookie(at))
                .andExpect(status().isNoContent()).andReturn();
        Cookie cleared = logout.getResponse().getCookie("bumpinto_at");
        assertThat(cleared).isNotNull();
        assertThat(cleared.getMaxAge()).isZero();

        mvc.perform(get("/api/me")).andExpect(status().isUnauthorized());
    }
```

- [ ] **Step 2: FAIL doğrula** — Run: `MVN test -Dtest=AccountApiTest` → 404/derleme hatası.

- [ ] **Step 3: DTO'lar** — `ApiDtos`'a ekle:

```java
    public record SessionSummaryDto(String slug, String name, ActivityType activityType,
                                    SessionType sessionType, SessionStatus status,
                                    Instant createdAt, Instant expiresAt, int participantCount,
                                    String decidedVenueName) {
    }

    /** open: DECIDED/EXPIRED disi; past: karar verilmis ya da suresi dolmus. */
    public record SessionListResponse(List<SessionSummaryDto> open, List<SessionSummaryDto> past) {
    }

    public record LocationPrefDto(@NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
                                  @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng,
                                  @Size(max = 80) String label) {
    }

    public record StatsDto(long sessionsHosted, long friendsMet) {
    }

    public record MeResponse(UUID id, String email, String displayName,
                             LocationPrefDto defaultLocation, ActivityType defaultActivity,
                             String language, StatsDto stats) {
    }

    /** Tum alanlar opsiyonel; null = o tercihi temizle (displayName haric: null = degistirme). */
    public record UpdateMeRequest(@Size(max = 40) String displayName,
                                  @Valid LocationPrefDto defaultLocation,
                                  ActivityType defaultActivity,
                                  @Pattern(regexp = "tr|en|nl") String language) {
    }
```

(`import jakarta.validation.Valid; import jakarta.validation.constraints.Pattern;` ekle.)

- [ ] **Step 4: Controller'lar**

`SessionController`'a (ctor'a `UserProfileQueries profiles` ekle):

```java
    @GetMapping
    ApiDtos.SessionListResponse mine(@AuthenticationPrincipal Jwt jwt) {
        List<ApiDtos.SessionSummaryDto> rows = profiles.mySessions(WebPrincipals.hostUserId(jwt))
                .stream().map(s -> new ApiDtos.SessionSummaryDto(s.session().slug(),
                        s.session().name(), s.session().activityType(), s.session().sessionType(),
                        s.session().status(), s.createdAt(), s.session().expiresAt(),
                        s.participantCount(), s.decidedVenueName()))
                .toList();
        Map<Boolean, List<ApiDtos.SessionSummaryDto>> split = rows.stream()
                .collect(Collectors.partitioningBy(r -> r.status() == SessionStatus.DECIDED
                        || r.status() == SessionStatus.EXPIRED));
        return new ApiDtos.SessionListResponse(split.get(false), split.get(true));
    }
```

`MeController.java` (yeni):

```java
package com.bumpinto.adapter.in.web;

import com.bumpinto.application.user.UserPreferences;
import com.bumpinto.application.user.UserProfileQueries;
import com.bumpinto.domain.geo.GeoPoint;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Host JWT gerekir (cookie ya da Bearer). */
@RestController
@RequestMapping("/api/me")
class MeController {

    private final UserProfileQueries queries;
    private final UserPreferences prefs;

    MeController(UserProfileQueries queries, UserPreferences prefs) {
        this.queries = queries;
        this.prefs = prefs;
    }

    @GetMapping
    ApiDtos.MeResponse me(@AuthenticationPrincipal Jwt jwt) {
        return toResponse(queries.me(WebPrincipals.hostUserId(jwt)));
    }

    @PutMapping
    ApiDtos.MeResponse update(@AuthenticationPrincipal Jwt jwt,
                              @Valid @RequestBody ApiDtos.UpdateMeRequest request) {
        var id = WebPrincipals.hostUserId(jwt);
        GeoPoint location = request.defaultLocation() == null ? null
                : new GeoPoint(request.defaultLocation().lat(), request.defaultLocation().lng());
        String label = request.defaultLocation() == null ? null : request.defaultLocation().label();
        prefs.update(id, request.displayName(), location, label, request.defaultActivity(),
                request.language());
        return toResponse(queries.me(id));
    }

    static ApiDtos.MeResponse toResponse(UserProfileQueries.Me me) {
        var p = me.profile();
        ApiDtos.LocationPrefDto loc = p.defaultLocation() == null ? null
                : new ApiDtos.LocationPrefDto(p.defaultLocation().lat(), p.defaultLocation().lng(),
                        p.defaultLocationLabel());
        return new ApiDtos.MeResponse(p.id(), p.email(), p.name(), loc, p.defaultActivity(),
                p.language(), new ApiDtos.StatsDto(me.stats().sessionsHosted(), me.stats().friendsMet()));
    }
}
```

`AuthCookies`'e ekle:

```java
    /** Web cikisi: ayni ad/yol ile Max-Age=0 → tarayici cerezi siler. */
    public ResponseCookie clearAccess() {
        return base(ACCESS, "", "/api", Duration.ZERO);
    }
```

`AuthController`'a ekle:

```java
    /** Kimlik gerekmez: suresi dolmus cerezle de cikis yapilabilmeli. Mobil icin no-op (204). */
    @PostMapping("/logout")
    ResponseEntity<Void> logout() {
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookies.clearAccess().toString())
                .build();
    }
```

`SecurityConfig` permitAll listesine: `.requestMatchers(HttpMethod.POST, "/api/auth/logout").permitAll()`.

- [ ] **Step 4b: Herkese açık davet önizlemesi** — Katıl ekranı (W4) katılmadan ÖNCE host adını, oturum adını, türü ve kişi sayısını gösterir; bugün `GET /api/sessions/{slug}` katılımcı token'ı ister (401). Ekle: `GET /api/sessions/{slug}/preview` — **permitAll**, konum/koordinat taşımaz.

`ApiDtos`:

```java
    /** Katilmadan once gorulen kamu bilgisi: koordinat, katilimci listesi, mekan YOK. */
    public record SessionPreview(String slug, String name, ActivityType activityType,
                                 SessionType sessionType, SessionStatus status,
                                 String hostDisplayName, int participantCount) {
    }
```

`SessionController`:

```java
    @GetMapping("/{slug}/preview")
    ApiDtos.SessionPreview preview(@PathVariable String slug) {
        SessionQueries.SessionSnapshot snap = queries.snapshot(slug);
        String host = snap.participants().stream().filter(Participant::host)
                .map(Participant::displayName).findFirst().orElse(null);
        long people = snap.participants().stream().filter(p -> !p.manual()).count();
        return new ApiDtos.SessionPreview(snap.session().slug(), snap.session().name(),
                snap.session().activityType(), snap.session().sessionType(),
                snap.session().status(), host, (int) people);
    }
```

`SecurityConfig` permitAll: `.requestMatchers(HttpMethod.GET, "/api/sessions/*/preview").permitAll()`.

- [ ] **Step 4c: "Ben kimim" — `SessionView.viewer`** — Web sayfa yenilenince "ben host muyum, hangi katılımcıyım" bilgisi bellekte kaybolur; `SessionView` bunu sunucudan söyler. `ApiDtos`:

```java
    /** Istegi yapan kisinin oturumdaki yeri. Katilimci token'i → o satir; host JWT → host satiri. */
    public record ViewerDto(UUID participantId, boolean host) {
    }
```

`SessionView`'a son alan `ViewerDto viewer` (kimliksiz istekte null). `SessionController.view`:

```java
    @GetMapping("/{slug}")
    ApiDtos.SessionView view(@PathVariable String slug, Authentication auth) {
        SessionQueries.SessionSnapshot snap = queries.snapshot(slug);
        return assembler.toView(snap, viewerOf(snap, auth));
    }

    private static ApiDtos.ViewerDto viewerOf(SessionQueries.SessionSnapshot snap, Authentication auth) {
        if (auth == null) {
            return null;
        }
        if (auth.getPrincipal() instanceof ParticipantPrincipal me) {
            return new ApiDtos.ViewerDto(me.participantId(), me.host());
        }
        if (auth.getPrincipal() instanceof Jwt jwt) {
            UUID userId = UUID.fromString(jwt.getSubject());
            if (!snap.session().hostId().equals(userId)) {
                return null;
            }
            return snap.participants().stream().filter(Participant::host).findFirst()
                    .map(p -> new ApiDtos.ViewerDto(p.id(), true)).orElse(null);
        }
        return null;
    }
```

`SessionViewAssembler.toView(snap)` → `toView(snap, viewer)` (mevcut çağrılar `toView(snap, null)` ya da uygun viewer ile; `find-venues`/`shuffle`/`force-decision` host çağrılarında `viewerOf(snap, auth)` kullan — controller metotlarına `Authentication auth` parametresi ekle). `AccountApiTest`'e: host JWT ile `GET /api/sessions/{slug}` → `viewer.host == true` ve `viewer.participantId` = create yanıtındaki `participantId`; kimliksiz → `viewer` null. Bruno `get-session.yml` docs'a `viewer` alanı. `AccountApiTest`'e: kimliksiz `GET /api/sessions/{slug}/preview` → 200, `hostDisplayName` = "Mehmet", gövdede `participants`/`lat` anahtarı YOK (`assertThat(body).doesNotContain("\"lat\"")`). Bruno: `sessions/preview.yml` (seq 7, auth yok, docs: "Kimlik gerekmez; rate limit get-session kovası; SOLO oturumda da döner ama davet linki yok").

- [ ] **Step 5: Rate limit** — B-5 Task 5 Step 6'daki kontrolü tekrarla: `RateLimitFilter` yolları tam listeliyorsa `/api/sessions` (GET), `/api/sessions/*/preview`, `/api/me`, `/api/auth/logout` uygun kovaya eklenir (okumalar: genel okuma kovası; logout: auth kovası).

- [ ] **Step 6: PASS doğrula** — Run: `MVN test` → tüm suite yeşil (`SecurityPolicyTest` permitAll değişikliğini görüyorsa güncelle).

- [ ] **Step 7: INDEX güncelle + Commit (kullanıcı)** — `feat(api): GET /sessions, GET/PUT /me, POST /auth/logout`

---

### Task 4: Bruno + codegen + belgeler

**Files:**
- Create: `backend/.infra/bumpinto-collection/sessions/list-sessions.yml` (seq 6)
- Create: `backend/.infra/bumpinto-collection/me/folder.yml`, `me/get-me.yml` (seq 1), `me/update-me.yml` (seq 2)
- Create: `backend/.infra/bumpinto-collection/auth/logout.yml` (seq 2)
- Modify: `frontend/shared/openapi.json`, `frontend/shared/src/api-types.ts`, `frontend/shared/src/api.ts`
- Modify: `backend/ARCHITECTURE.md` §3 paket haritası (`application/user`, `domain/user`)

- [ ] **Step 1: `sessions/list-sessions.yml`**

```yaml
info:
  name: List My Sessions
  type: http
  seq: 6

http:
  method: GET
  url: "{{baseUrl}}/api/sessions"
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
        test("open/past listeleri var", function() {
          expect(res.body.open).to.be.an("array");
          expect(res.body.past).to.be.an("array");
        });

docs:
  type: text/markdown
  content: |-
    Host JWT gerekir. Hostu ben olan son 20 oturum, en yeniden eskiye.
    `open` = DECIDED/EXPIRED disi; `past` = karar verilmis ya da suresi dolmus (tembel expiry).
    Satir: slug, name, activityType, sessionType, status, createdAt, expiresAt,
    participantCount, decidedVenueName. B-3 silme ile silinen oturum listeden duser.
```

- [ ] **Step 2: `me/`** — `folder.yml` (`name: Me (profil · tercihler)`, `seq: 5`). `get-me.yml`: GET `{{baseUrl}}/api/me`, bearer; test 200 + `email` string; docs: "Host JWT. `language` null = tercih yok (istemci tarayici dili). `stats.friendsMet` = host olmayan, elle olmayan farkli katilimci adi sayisi." `update-me.yml`: PUT, body:

```json
{
  "displayName": "Mehmet",
  "defaultLocation": { "lat": 51.6978, "lng": 5.3037, "label": "'s-Hertogenbosch" },
  "defaultActivity": "COFFEE",
  "language": "tr"
}
```

docs: "Tum alanlar opsiyonel. `language`: tr|en|nl (aksi 400). `displayName` null = degistirme; diger null'lar tercihi temizler."

- [ ] **Step 3: `auth/logout.yml`** — POST `{{baseUrl}}/api/auth/logout`, auth yok; test 204; docs: "Kimlik gerekmez. Web: `bumpinto_at` cerezini Max-Age=0 ile siler. Mobil: no-op, istemci SecureStore'u kendisi temizler."

- [ ] **Step 4: codegen + shared client** — Backend'i yerel çalıştır, kökten `rtk pnpm codegen`; `frontend/shared/src/api.ts`'e ekle:

```typescript
    listSessions: () =>
      http.get<Schemas["SessionListResponse"]>("/api/sessions").then((r) => r.data),
    me: () => http.get<Schemas["MeResponse"]>("/api/me").then((r) => r.data),
    updateMe: (body: Schemas["UpdateMeRequest"]) =>
      http.put<Schemas["MeResponse"]>("/api/me", body).then((r) => r.data),
    logout: () => http.post("/api/auth/logout").then(() => undefined),
    preview: (slug: string) =>
      http.get<Schemas["SessionPreview"]>(`/api/sessions/${slug}/preview`).then((r) => r.data),
```

`frontend/shared/src/index.ts` export listesine `MeResponse`, `SessionSummaryDto` tiplerini ekle (`api.ts`'te `export type MeResponse = Schemas["MeResponse"]; export type SessionSummaryDto = Schemas["SessionSummaryDto"];`).

- [ ] **Step 5: ARCHITECTURE.md §3** — paket haritasına `domain/user/ UserProfile`, `domain/session/ SessionSummary`, `application/user/ UserPreferences · UserProfileQueries`, `adapter/in/web/ MeController · PointsController` satırlarını ekle; sınıf sayılarını güncelle.

- [ ] **Step 6: Kapanış** — `MVN test` yeşil; web `tsc --noEmit` yeşil; Bruno `me/` ve `list-sessions` local'de koşar.

- [ ] **Step 7: INDEX'te B-6 `done` + Commit (kullanıcı)** — `docs(api): me/list/logout bruno + codegen`

---

## Plan sonu doğrulaması

- [x] `GET /api/sessions` open/past ayrımı tembel expiry ile doğru; sıralama en yeni önce; limit 20.
- [x] `PUT /api/me` `language` yalnız tr/en/nl; `displayName` null → değişmez; diğer null'lar temizler.
- [x] `POST /api/auth/logout` çerezi siler, kimliksiz de 204 döner.
- [x] `frontend/shared` client'ta `listSessions`, `me`, `updateMe`, `logout` var; web `tsc` yeşil.
- [x] Spec §8 kalem 1–3 kapandı; M-1 `localSessions.ts` tavizi gereksiz (M-1 Ek A).
- [x] Ek: `GET /sessions/{slug}/preview` + `SessionView.viewer`; kamu uçlarında bayat çerez 401'i kapatıldı (`PUBLIC_ENDPOINTS`). Yürütme notu: Task 3 iki parça (3a liste/me/logout, 3b preview/viewer) olarak koşuldu; Bruno istekleri Task 4'te değil ilgili uç görevinde yazıldı.
