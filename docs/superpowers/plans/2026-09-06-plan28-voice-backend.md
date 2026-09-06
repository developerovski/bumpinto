# Sesli Sohbet — Backend (B-12) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Host'un başlatıp bitirdiği, süreç içi bir "ses odası" ve WebRTC sinyal relay'i: üç REST ucu, tek STOMP `@MessageMapping`, abonelikle üyelik, 2 saatlik sert sınır, Cloudflare TURN kısa ömürlü kimlik.

**Architecture:** Oda durumu `InMemoryVoiceRooms`'da (presence deseni: Caffeine + Clock, TaskScheduler ile süre dolumu). `VoiceCommands` kapıları koyar ve olay yayınlar. `VoiceRoomListener` STOMP SUBSCRIBE/UNSUBSCRIBE/DISCONNECT olaylarını üyeliğe çevirir. `VoiceSignalController` offer/answer/ice'ı hedefin özel konusuna `from` damgasıyla iletir, saklamaz. `WebSocketConfig` SEND'i yalnız bu tek adrese, SUBSCRIBE'ı kendi konularına açar. Cloudflare erişilemezse STUN ile devam.

**Tech Stack:** Spring Boot 4.1 (Spring 7, Jackson 3), STOMP simple broker, Caffeine, Unirest 4 (+ mocks), JUnit 5, AssertJ, Mockito, Awaitility, Testcontainers Postgres.

**Spec:** `docs/superpowers/specs/2026-09-06-voice-chat-design.md` (K1–K12, §4 akış, §6 backend).

**Bağlayıcı kurallar (AGENTS.md + ARCHITECTURE.md):**
- **Git yazma işlemi YOK.** Her görevin sonunda "Commit" adımı yerine değişen dosya listesi bırakılır; kullanıcı commit'ler.
- Test komutu (backend kökünden, önek ZORUNLU):
  `JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true mvn -o test -Dtest=<Sınıf>`
  Aşağıda kısaca `MVN_TEST <Sınıf>` yazılır; ajan tam komutu kullanır. Bağımlılık eklenmez, `-o` kalır.
- Domain paketinde Spring/Jakarta/Unirest **yok** (ArchUnit `HexagonalArchitectureTest`).
- Her yeni/değişen HTTP ucu Bruno'ya girer (`backend/.infra/bumpinto-collection/sessions/`).
- Yorumlar kısa; uzun açıklama yok. Yeni dosya yalnız spec §6'daki parçalar için.

**Dosya haritası:**

| Dosya | Görev | Sorumluluk |
|---|---|---|
| `domain/voice/VoiceRoom.java`, `Seat.java`, `IceConfig.java` | T1 | Saf domain kayıtları |
| `domain/port/VoiceRoomsPort.java`, `TurnCredentialsPort.java` | T1 | Portlar |
| `domain/port/SessionEvent.java` | T1 | 3 yeni fabrika |
| `infra/config/AppProps.java`, `application.yml` + 11 test kurucu çağrısı | T1 | `Voice`, `Turn` |
| `adapter/out/presence/InMemoryVoiceRooms.java` (+Test) | T2 | Oda durumu + zamanlayıcı |
| `adapter/out/turn/CloudflareTurnCredentials.java` (+Test) | T3 | TURN kimliği |
| `application/session/VoiceCommands.java` (+Test), `SessionCommands.requireHost` | T4 | Kapılar, olaylar |
| `adapter/in/web/ApiDtos.java`, `SessionViewAssembler.java`, `PointsController.java` (+AssemblerTest) | T5 | `voice`, `inVoice` |
| `adapter/in/web/VoiceController.java`, `WebSecuritySliceTest`, 3 Bruno dosyası | T6 | REST |
| `adapter/in/web/VoiceDestinations.java`, `VoiceSignalController.java`, `VoiceRoomListener.java`, `WebSocketConfig.java`, `PresenceListener.java` (+`VoiceOverWebSocketTest`) | T7 | STOMP |
| `ARCHITECTURE.md` §11, `docs/superpowers/plans/INDEX.md`, `openapi.json` | T8 | Belge + sözleşme |

---

### Task 1: Domain kayıtları, portlar, olaylar, yapılandırma

**Files:**
- Create: `backend/src/main/java/com/bumpinto/domain/voice/VoiceRoom.java`
- Create: `backend/src/main/java/com/bumpinto/domain/voice/Seat.java`
- Create: `backend/src/main/java/com/bumpinto/domain/voice/IceConfig.java`
- Create: `backend/src/main/java/com/bumpinto/domain/port/VoiceRoomsPort.java`
- Create: `backend/src/main/java/com/bumpinto/domain/port/TurnCredentialsPort.java`
- Modify: `backend/src/main/java/com/bumpinto/domain/port/SessionEvent.java`
- Modify: `backend/src/main/java/com/bumpinto/infra/config/AppProps.java`
- Modify: `backend/src/main/resources/application.yml`
- Modify (kurucu çağrısı, 10 dosya): `TokenServiceTest`, `GoogleIdVerifierTest`, `ParticipantTokenFilterTest`, `SecurityPolicyTest`, `RateLimitFilterTest` (`infra/security`), `GooglePlacesVenueProviderTest`, `FoursquareVenueProviderTest` (`adapter/out/provider`), `NominatimReverseGeocoderTest` (`adapter/out/geocode`), `WebSecuritySliceTest`, `AuthControllerTest` (`adapter/in/web`) — *2026-09-06 düzeltmesi: `ProviderQuotaSchedulerTest` listeden çıktı, `ProviderQuotaScheduler` ile birlikte silindi. `AppProps.Quota` da artık 2 bileşenli (`refresh` kalktı).*
- Test: `backend/src/test/java/com/bumpinto/domain/voice/VoiceRoomTest.java`

- [ ] **Step 1: Başarısız testi yaz**

```java
package com.bumpinto.domain.voice;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class VoiceRoomTest {

    static final Instant T0 = Instant.parse("2026-09-06T10:00:00Z");

    @Test
    void remainingIsClampedToZeroAfterEndsAt() {
        UUID ayse = UUID.randomUUID();
        VoiceRoom room = new VoiceRoom(UUID.randomUUID(), "s1", T0, T0.plus(Duration.ofHours(2)),
                Map.of(ayse, new Seat("ws-1", "sub-1")));

        assertThat(room.remaining(T0.plus(Duration.ofMinutes(90)))).isEqualTo(Duration.ofMinutes(30));
        assertThat(room.remaining(T0.plus(Duration.ofHours(3)))).isZero();
        assertThat(room.hasMember(ayse)).isTrue();
        assertThat(room.hasMember(UUID.randomUUID())).isFalse();
        assertThat(room.memberIds()).containsExactly(ayse);
    }

    @Test
    void stunOnlyConfigCarriesNoCredentialAndNoRelay() {
        IceConfig stun = IceConfig.stunOnly();

        assertThat(stun.relay()).isFalse();
        assertThat(stun.iceServers()).hasSize(1);
        assertThat(stun.iceServers().get(0).urls())
                .containsExactly("stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302");
        assertThat(stun.iceServers().get(0).credential()).isNull();
    }
}
```

- [ ] **Step 2: Testi çalıştır, derleme hatasıyla düştüğünü gör**

Run: `MVN_TEST VoiceRoomTest`
Expected: COMPILATION ERROR — `VoiceRoom`, `Seat`, `IceConfig` yok.

- [ ] **Step 3: Domain kayıtlarını yaz**

`backend/src/main/java/com/bumpinto/domain/voice/Seat.java`:

```java
package com.bumpinto.domain.voice;

/** Uyeligi tasiyan abonelik: hangi soket, o soketteki hangi abonelik. */
public record Seat(String wsSessionId, String subscriptionId) {
}
```

`backend/src/main/java/com/bumpinto/domain/voice/VoiceRoom.java`:

```java
package com.bumpinto.domain.voice;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Bir oturumun ses odasi. Uyelik = kisinin kendi sinyal konusuna aboneligi (spec K4);
 * satir DEGIL, canli bir koltuk. Surec icinde yasar, DB'ye yazilmaz (K8).
 */
public record VoiceRoom(UUID sessionId, String slug, Instant startedAt, Instant endsAt,
                        Map<UUID, Seat> members) {

    public VoiceRoom {
        members = Map.copyOf(members);
    }

    public Set<UUID> memberIds() {
        return members.keySet();
    }

    public boolean hasMember(UUID participantId) {
        return members.containsKey(participantId);
    }

    /** Bitise kalan sure; gecmisse sifir. TURN kimlik omru bundan turetilir (K7). */
    public Duration remaining(Instant now) {
        Duration left = Duration.between(now, endsAt);
        return left.isNegative() ? Duration.ZERO : left;
    }
}
```

`backend/src/main/java/com/bumpinto/domain/voice/IceConfig.java`:

```java
package com.bumpinto.domain.voice;

import java.util.List;

/**
 * Istemciye verilen ICE listesi. {@code relay=false}: TURN yok, yalniz STUN — Cloudflare
 * ayarsiz ya da erisilemez (K11). Kimlik kisa omurludur, sunucuda saklanmaz.
 */
public record IceConfig(List<IceServer> iceServers, boolean relay) {

    public record IceServer(List<String> urls, String username, String credential) {
    }

    private static final List<String> STUN_URLS =
            List.of("stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302");

    public static IceConfig stunOnly() {
        return new IceConfig(List.of(new IceServer(STUN_URLS, null, null)), false);
    }
}
```

- [ ] **Step 4: Portları yaz**

`backend/src/main/java/com/bumpinto/domain/port/VoiceRoomsPort.java`:

```java
package com.bumpinto.domain.port;

import com.bumpinto.domain.voice.Seat;
import com.bumpinto.domain.voice.VoiceRoom;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Oturum basina ses odasi — surec ici (presence ile ayni borc sinifi).
 * Degisiklik olan cagrilar odayi doner; degisiklik yoksa (oda yok, koltuk eslesmedi) bos.
 */
public interface VoiceRoomsPort {

    /** Idempotent: acik oda varsa oldugu gibi doner, zamanlayici yeniden kurulmaz. */
    VoiceRoom open(UUID sessionId, String slug, Instant endsAt, Runnable onExpire);

    /** Odayi ve zamanlayicisini kaldirir; oda yoksa bos. */
    Optional<VoiceRoom> close(UUID sessionId);

    /** Oda acik degilse bos (uyelik yaratilmaz). Ayni katilimcinin yeni koltugu eskisini ezer. */
    Optional<VoiceRoom> join(UUID sessionId, UUID participantId, Seat seat);

    /** UNSUBSCRIBE: yalniz o soket+abonelik ciftine ait koltuk duser. */
    Optional<VoiceRoom> leaveSeat(UUID sessionId, String wsSessionId, String subscriptionId);

    /** DISCONNECT: o sokete ait tum koltuklar duser. */
    Optional<VoiceRoom> leaveSocket(UUID sessionId, String wsSessionId);

    Optional<VoiceRoom> roomOf(UUID sessionId);
}
```

`backend/src/main/java/com/bumpinto/domain/port/TurnCredentialsPort.java`:

```java
package com.bumpinto.domain.port;

import com.bumpinto.domain.voice.IceConfig;

import java.time.Duration;

/** Kisa omurlu TURN kimligi. Uygulanamiyorsa STUN'a duser, hic firlatmaz (K11). */
public interface TurnCredentialsPort {
    IceConfig issue(Duration ttl);
}
```

- [ ] **Step 5: `SessionEvent` fabrikalarını ekle**

`SessionEvent.java` sonuna, `sessionDecided`'dan sonra:

```java
    public static SessionEvent voiceStarted(Instant endsAt) {
        return new SessionEvent("voice_started", Map.of("endsAt", endsAt.toString()));
    }

    /** Istemci dock metnini sebepten secer (HOST | TIME_LIMIT | EMPTY). */
    public static SessionEvent voiceEnded(EndReason reason) {
        return new SessionEvent("voice_ended", Map.of("reason", reason.name()));
    }

    /** Biri odaya girdi/cikti. Govde bos: presence_changed ile ayni "tazele" zili. */
    public static SessionEvent voiceRosterChanged() {
        return new SessionEvent("voice_roster_changed", Map.of());
    }
```

`import java.time.Instant;` ve `import com.bumpinto.domain.voice.EndReason;` ekle. `domain/voice/EndReason.java`:

```java
package com.bumpinto.domain.voice;

/** Odanin neden kapandigi; olay yukunde `name()` olarak gider. */
public enum EndReason { HOST, TIME_LIMIT, EMPTY }
```

- [ ] **Step 6: `AppProps`'a `Voice` ve `Turn` ekle**

Kayıt başlığı:

```java
public record AppProps(Security security, Providers providers, Cors cors, Cookies cookies,
                       RateLimit rateLimit, Quota quota, Geocode geocode,
                       Voice voice, Turn turn) {
```

`Geocode` kaydından sonra:

```java
    /** maxDuration: ses odasinin sert omru (spec K7). TURN kimligi de bu sureye baglanir. */
    public record Voice(Duration maxDuration) {
    }

    /**
     * Cloudflare Realtime TURN anahtari. Bos birakilabilir: uygulama ayaga kalkar, kimlik
     * yerine yalniz STUN verilir ve acilista bir kez WARN loglanir (K11) — ses yan ozelliktir,
     * giris degil; {@link #required} kurali burada bilincli olarak uygulanmaz.
     */
    public record Turn(String keyId, String apiToken) {

        public boolean configured() {
            return keyId != null && !keyId.isBlank() && !keyId.startsWith("${")
                    && apiToken != null && !apiToken.isBlank() && !apiToken.startsWith("${");
        }

        @Override
        public String toString() {
            return "Turn[keyId=" + keyId + ", apiToken=" + MASK + "]";
        }
    }
```

- [ ] **Step 7: `application.yml`'e ekle** (`geocode:` bloğundan sonra, aynı girinti)

```yaml
  voice:
    # Ses odasinin sert omru (spec K7); TURN kimligi kalan sure kadar uretilir.
    max-duration: ${VOICE_MAX_DURATION:PT2H}
  turn:
    # Bos birakilabilir: TURN yok, yalniz STUN (K11). Cloudflare Realtime > TURN keys.
    key-id: ${CLOUDFLARE_TURN_KEY_ID:}
    api-token: ${CLOUDFLARE_TURN_API_TOKEN:}
```

- [ ] **Step 8: 11 test dosyasındaki `new AppProps(...)` çağrılarını güncelle**

Her dosyada son argüman `new AppProps.Geocode(...)`'dur. Kapanış parantezinden **önce** iki argüman eklenir:

```java
                new AppProps.Geocode("ops@bumpinto.test", Duration.ZERO),
                new AppProps.Voice(Duration.ofHours(2)), new AppProps.Turn("", ""));
```

Dosyalar ve bulma komutu:

```bash
cd backend && grep -rln "new AppProps(" src/test/java
```

Beklenen 11 dosya (üstteki listeyle aynı). Her birinde `java.time.Duration` import'u zaten var (Geocode `Duration` alır); yoksa ekle. Doğrulama:

```bash
grep -rL "AppProps.Turn" $(grep -rln "new AppProps(" src/test/java)
```

Expected: boş çıktı (hepsi güncellendi).

- [ ] **Step 9: Derle ve testi çalıştır**

Run: `MVN_TEST VoiceRoomTest`
Expected: `Tests run: 2, Failures: 0`. Ardından `MVN_TEST HexagonalArchitectureTest` → PASS (domain'de Spring yok).

- [ ] **Step 10: Değişen dosyaları listele (commit kullanıcıda)**

`domain/voice/*` (3), `domain/port/VoiceRoomsPort.java`, `domain/port/TurnCredentialsPort.java`, `SessionEvent.java`, `AppProps.java`, `application.yml`, 11 test dosyası, `VoiceRoomTest.java`. Mesaj önerisi: `feat(voice): domain records, ports, events and config for voice rooms`.

---

### Task 2: `InMemoryVoiceRooms`

**Files:**
- Create: `backend/src/main/java/com/bumpinto/adapter/out/presence/InMemoryVoiceRooms.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/out/presence/InMemoryVoiceRoomsTest.java`

- [ ] **Step 1: Başarısız testi yaz**

```java
package com.bumpinto.adapter.out.presence;

import com.bumpinto.domain.voice.Seat;
import com.bumpinto.domain.voice.VoiceRoom;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.scheduling.TaskScheduler;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class InMemoryVoiceRoomsTest {

    static final Instant T0 = Instant.parse("2026-09-06T10:00:00Z");
    static final Instant ENDS = T0.plus(Duration.ofHours(2));

    TaskScheduler scheduler;
    ScheduledFuture<?> future;
    InMemoryVoiceRooms rooms;
    UUID session;
    UUID ayse;
    UUID mehmet;

    @BeforeEach
    void setUp() {
        scheduler = mock(TaskScheduler.class);
        future = mock(ScheduledFuture.class);
        doReturn(future).when(scheduler).schedule(any(Runnable.class), any(Instant.class));
        rooms = new InMemoryVoiceRooms(Clock.fixed(T0, ZoneOffset.UTC), scheduler);
        session = UUID.randomUUID();
        ayse = UUID.randomUUID();
        mehmet = UUID.randomUUID();
    }

    @Test
    void openSchedulesExpiryAtEndsAtAndIsIdempotent() {
        AtomicInteger expired = new AtomicInteger();
        VoiceRoom first = rooms.open(session, "s1", ENDS, expired::incrementAndGet);
        VoiceRoom again = rooms.open(session, "s1", ENDS.plusSeconds(1), expired::incrementAndGet);

        assertThat(again).isEqualTo(first);
        assertThat(first.startedAt()).isEqualTo(T0);
        ArgumentCaptor<Runnable> task = ArgumentCaptor.forClass(Runnable.class);
        verify(scheduler).schedule(task.capture(), eq(ENDS));
        task.getValue().run();
        assertThat(expired.get()).isEqualTo(1);
    }

    @Test
    void closeCancelsTheTimerAndForgetsTheRoom() {
        rooms.open(session, "s1", ENDS, () -> { });

        assertThat(rooms.close(session)).isPresent();
        verify(future).cancel(false);
        assertThat(rooms.roomOf(session)).isEmpty();
        assertThat(rooms.close(session)).isEmpty();
    }

    @Test
    void joinNeedsAnOpenRoom() {
        assertThat(rooms.join(session, ayse, new Seat("ws-1", "sub-1"))).isEmpty();
        verify(scheduler, never()).schedule(any(Runnable.class), any(Instant.class));
    }

    @Test
    void aNewerSeatReplacesTheOlderOneAndOnlyTheOwnerSeatLeaves() {
        rooms.open(session, "s1", ENDS, () -> { });
        rooms.join(session, ayse, new Seat("ws-1", "sub-1"));
        rooms.join(session, ayse, new Seat("ws-2", "sub-9"));

        // eski soketin kopmasi yeni koltugu dusurmez
        assertThat(rooms.leaveSocket(session, "ws-1")).isEmpty();
        assertThat(rooms.roomOf(session).orElseThrow().hasMember(ayse)).isTrue();
        // ayni sokette baska bir abonelik id'si de dusurmez
        assertThat(rooms.leaveSeat(session, "ws-2", "sub-1")).isEmpty();
        assertThat(rooms.leaveSeat(session, "ws-2", "sub-9")).isPresent();
        assertThat(rooms.roomOf(session).orElseThrow().memberIds()).isEmpty();
    }

    @Test
    void disconnectDropsEverySeatOfThatSocket() {
        rooms.open(session, "s1", ENDS, () -> { });
        rooms.join(session, ayse, new Seat("ws-1", "sub-1"));
        rooms.join(session, mehmet, new Seat("ws-2", "sub-2"));

        assertThat(rooms.leaveSocket(session, "ws-1").orElseThrow().memberIds()).containsExactly(mehmet);
    }
}
```

- [ ] **Step 2: Testi çalıştır, düştüğünü gör**

Run: `MVN_TEST InMemoryVoiceRoomsTest`
Expected: COMPILATION ERROR — `InMemoryVoiceRooms` yok.

- [ ] **Step 3: Adaptörü yaz**

```java
package com.bumpinto.adapter.out.presence;

import com.bumpinto.domain.port.VoiceRoomsPort;
import com.bumpinto.domain.voice.Seat;
import com.bumpinto.domain.voice.VoiceRoom;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ScheduledFuture;
import java.util.function.UnaryOperator;

/**
 * Surec ici ses odalari (InMemoryPresence deseni). Restart'ta bosalir: sohbet biter, host
 * yeniden acar (spec K8). Sure dolumu TaskScheduler'da: close() zamanlayiciyi iptal eder.
 */
@Component
public class InMemoryVoiceRooms implements VoiceRoomsPort {

    private record Entry(VoiceRoom room, ScheduledFuture<?> expiry) {
    }

    private final Cache<UUID, Entry> rooms = Caffeine.newBuilder()
            .maximumSize(10_000)
            .expireAfterAccess(Duration.ofHours(25))
            .build();

    private final Clock clock;
    private final TaskScheduler scheduler;

    public InMemoryVoiceRooms(Clock clock, TaskScheduler scheduler) {
        this.clock = clock;
        this.scheduler = scheduler;
    }

    @Override
    public VoiceRoom open(UUID sessionId, String slug, Instant endsAt, Runnable onExpire) {
        return rooms.asMap().computeIfAbsent(sessionId, key -> {
            VoiceRoom room = new VoiceRoom(sessionId, slug, clock.instant(), endsAt, Map.of());
            return new Entry(room, scheduler.schedule(onExpire, endsAt));
        }).room();
    }

    @Override
    public Optional<VoiceRoom> close(UUID sessionId) {
        Entry removed = rooms.asMap().remove(sessionId);
        if (removed == null) {
            return Optional.empty();
        }
        removed.expiry().cancel(false);
        return Optional.of(removed.room());
    }

    @Override
    public Optional<VoiceRoom> join(UUID sessionId, UUID participantId, Seat seat) {
        return update(sessionId, members -> {
            members.put(participantId, seat);
            return members;
        });
    }

    @Override
    public Optional<VoiceRoom> leaveSeat(UUID sessionId, String wsSessionId, String subscriptionId) {
        return update(sessionId, members -> {
            boolean changed = members.entrySet().removeIf(e ->
                    e.getValue().wsSessionId().equals(wsSessionId)
                            && e.getValue().subscriptionId().equals(subscriptionId));
            return changed ? members : null;
        });
    }

    @Override
    public Optional<VoiceRoom> leaveSocket(UUID sessionId, String wsSessionId) {
        return update(sessionId, members -> {
            boolean changed = members.entrySet().removeIf(e ->
                    e.getValue().wsSessionId().equals(wsSessionId));
            return changed ? members : null;
        });
    }

    @Override
    public Optional<VoiceRoom> roomOf(UUID sessionId) {
        Entry entry = rooms.getIfPresent(sessionId);
        return entry == null ? Optional.empty() : Optional.of(entry.room());
    }

    /** Uye haritasini atomik gunceller; mutator null donerse degisiklik yoktur → bos. */
    private Optional<VoiceRoom> update(UUID sessionId, UnaryOperator<Map<UUID, Seat>> mutator) {
        Entry[] changed = new Entry[1];
        rooms.asMap().computeIfPresent(sessionId, (key, entry) -> {
            Map<UUID, Seat> members = mutator.apply(new HashMap<>(entry.room().members()));
            if (members == null) {
                return entry;
            }
            VoiceRoom room = entry.room();
            changed[0] = new Entry(new VoiceRoom(room.sessionId(), room.slug(), room.startedAt(),
                    room.endsAt(), members), entry.expiry());
            return changed[0];
        });
        return changed[0] == null ? Optional.empty() : Optional.of(changed[0].room());
    }
}
```

- [ ] **Step 4: Testi çalıştır**

Run: `MVN_TEST InMemoryVoiceRoomsTest`
Expected: `Tests run: 5, Failures: 0`.

- [ ] **Step 5: Değişen dosyaları listele**

`InMemoryVoiceRooms.java`, `InMemoryVoiceRoomsTest.java`. Mesaj: `feat(voice): in-memory voice rooms with scheduled expiry`.

---

### Task 3: `CloudflareTurnCredentials`

**Files:**
- Create: `backend/src/main/java/com/bumpinto/adapter/out/turn/CloudflareTurnCredentials.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/out/turn/CloudflareTurnCredentialsTest.java`

- [ ] **Step 1: Başarısız testi yaz**

```java
package com.bumpinto.adapter.out.turn;

import com.bumpinto.domain.voice.IceConfig;
import com.bumpinto.infra.config.AppProps;
import kong.unirest.core.HttpMethod;
import kong.unirest.core.Unirest;
import kong.unirest.core.UnirestInstance;
import kong.unirest.core.json.JSONObject;
import kong.unirest.core.MockClient;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CloudflareTurnCredentialsTest {

    static final String URL =
            "https://rtc.live.cloudflare.com/v1/turn/keys/key-1/credentials/generate-ice-servers";

    static AppProps props(String keyId, String token) {
        return new AppProps(new AppProps.Security("cid", "secret", Duration.ofHours(12)),
                new AppProps.Providers("fsq-key", "g-key"),
                new AppProps.Cors(List.of()), new AppProps.Cookies(false, ""),
                new AppProps.RateLimit(false),
                new AppProps.Quota(1000, 1000),
                new AppProps.Geocode("ops@bumpinto.test", Duration.ZERO),
                new AppProps.Voice(Duration.ofHours(2)), new AppProps.Turn(keyId, token));
    }

    @Test
    void issuesShortLivedCredentialsWithBearerAndTtl() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, URL)
                .header("Authorization", "Bearer tok-1")
                .body("{\"ttl\":7260}")
                .thenReturn("""
                        {"iceServers":[{"urls":["stun:stun.cloudflare.com:3478",
                          "turn:turn.cloudflare.com:3478?transport=udp"],
                          "username":"u1","credential":"c1"}]}
                        """).withStatus(201);

        IceConfig ice = new CloudflareTurnCredentials(http, props("key-1", "tok-1"))
                .issue(Duration.ofSeconds(7260));

        assertThat(ice.relay()).isTrue();
        assertThat(ice.iceServers()).hasSize(1);
        assertThat(ice.iceServers().get(0).urls()).contains("turn:turn.cloudflare.com:3478?transport=udp");
        assertThat(ice.iceServers().get(0).username()).isEqualTo("u1");
        assertThat(ice.iceServers().get(0).credential()).isEqualTo("c1");
        mock.verifyAll();
    }

    @Test
    void fallsBackToStunWhenCloudflareFails() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);
        mock.expect(HttpMethod.POST, URL).thenReturn("{\"error\":\"nope\"}").withStatus(500);

        IceConfig ice = new CloudflareTurnCredentials(http, props("key-1", "tok-1"))
                .issue(Duration.ofMinutes(10));

        assertThat(ice.relay()).isFalse();
        assertThat(ice.iceServers().get(0).urls()).allMatch(u -> u.startsWith("stun:"));
    }

    @Test
    void fallsBackToStunWithoutAnyRequestWhenNotConfigured() {
        UnirestInstance http = Unirest.spawnInstance();
        MockClient mock = MockClient.register(http);

        IceConfig ice = new CloudflareTurnCredentials(http, props("", ""))
                .issue(Duration.ofMinutes(10));

        assertThat(ice.relay()).isFalse();
        mock.assertThat(HttpMethod.POST, URL).wasInvokedTimes(0);
    }

    /** toString sirri sizdirmaz (WebSecuritySliceTest.tokenCarryingDtosMaskSecretsInToString deseni). */
    @Test
    void turnPropsMaskTheApiToken() {
        assertThat(props("key-1", "tok-secret").turn().toString())
                .doesNotContain("tok-secret").contains("key-1");
    }
}
```

- [ ] **Step 2: Testi çalıştır, düştüğünü gör**

Run: `MVN_TEST CloudflareTurnCredentialsTest`
Expected: COMPILATION ERROR — `CloudflareTurnCredentials` yok.

- [ ] **Step 3: Adaptörü yaz**

```java
package com.bumpinto.adapter.out.turn;

import com.bumpinto.domain.port.TurnCredentialsPort;
import com.bumpinto.domain.voice.IceConfig;
import com.bumpinto.infra.config.AppProps;
import kong.unirest.core.HttpResponse;
import kong.unirest.core.JsonNode;
import kong.unirest.core.UnirestInstance;
import kong.unirest.core.json.JSONArray;
import kong.unirest.core.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * Cloudflare Realtime TURN: uzun omurlu anahtar YALNIZ burada, istemciye kisa omurlu kimlik
 * gider. Her hata yolu STUN'a duser ve WARN loglar — TURN azinliga lazim, cogunlugu ucuncu
 * tarafin kesintisine kurban etmeyiz (spec K11).
 */
@Component
public class CloudflareTurnCredentials implements TurnCredentialsPort {

    private static final Logger log = LoggerFactory.getLogger(CloudflareTurnCredentials.class);
    private static final String URL =
            "https://rtc.live.cloudflare.com/v1/turn/keys/{keyId}/credentials/generate-ice-servers";
    private static final int REQUEST_TIMEOUT_MS = 2000;

    private final UnirestInstance http;
    private final AppProps.Turn turn;

    public CloudflareTurnCredentials(UnirestInstance http, AppProps props) {
        this.http = http;
        this.turn = props.turn();
        if (!turn.configured()) {
            log.warn("TURN is not configured (bumpinto.turn.*): voice chat will offer STUN only");
        }
    }

    @Override
    public IceConfig issue(Duration ttl) {
        if (!turn.configured()) {
            return IceConfig.stunOnly();
        }
        try {
            // "Katil" yolundadir: paylasilan 5 sn'lik istek butcesi burada fazla, STUN'a dusmek ucuz.
            HttpResponse<JsonNode> response = http.post(URL)
                    .routeParam("keyId", turn.keyId())
                    .requestTimeout(REQUEST_TIMEOUT_MS)
                    .header("Authorization", "Bearer " + turn.apiToken())
                    .header("Content-Type", "application/json")
                    .body("{\"ttl\":" + ttl.toSeconds() + "}")
                    .asJson();
            if (!response.isSuccess() || response.getBody() == null) {
                log.warn("TURN credentials refused: HTTP {}", response.getStatus());
                return IceConfig.stunOnly();
            }
            List<IceConfig.IceServer> servers = parse(response.getBody().getObject());
            if (servers.isEmpty()) {
                log.warn("TURN credentials response carried no usable iceServers");
                return IceConfig.stunOnly();
            }
            return new IceConfig(servers, true);
        } catch (RuntimeException e) {
            // UnirestException (ag) ve JSONException (beklenmeyen govde) ayni kapiya: hic firlatmaz.
            log.warn("TURN credentials unreachable: {}", e.getMessage());
            return IceConfig.stunOnly();
        }
    }

    /** Cevap: {"iceServers":[{urls, username, credential}]} — eski uc tek nesne dondurur, ikisi de okunur. */
    private static List<IceConfig.IceServer> parse(JSONObject body) {
        List<IceConfig.IceServer> out = new ArrayList<>();
        JSONArray array = body.optJSONArray("iceServers");
        if (array != null) {
            for (int i = 0; i < array.length(); i++) {
                add(out, server(array.getJSONObject(i)));
            }
            return out;
        }
        JSONObject single = body.optJSONObject("iceServers");
        if (single != null) {
            add(out, server(single));
        }
        return out;
    }

    /** urls'siz sunucu RTCPeerConnection kurucusunu patlatir; listeye girmez. */
    private static void add(List<IceConfig.IceServer> out, IceConfig.IceServer server) {
        if (!server.urls().isEmpty()) {
            out.add(server);
        }
    }

    private static IceConfig.IceServer server(JSONObject node) {
        List<String> urls = new ArrayList<>();
        JSONArray array = node.optJSONArray("urls");
        if (array != null) {
            for (int i = 0; i < array.length(); i++) {
                urls.add(array.getString(i));
            }
        } else if (node.optString("urls", null) != null) {
            urls.add(node.getString("urls"));
        }
        return new IceConfig.IceServer(urls, node.optString("username", null),
                node.optString("credential", null));
    }
}
```

- [ ] **Step 4: Testi çalıştır**

Run: `MVN_TEST CloudflareTurnCredentialsTest`
Expected: `Tests run: 4, Failures: 0`. Unirest mock'unda `.body(...)` eşleşmesi gövde metniyle birebirdir; eşleşmezse `verifyAll` düşer — o zaman adaptörün gövdesini `{"ttl":7260}` biçiminde tut (boşluksuz). `fallsBackToStunWithoutAnyRequestWhenNotConfigured`'da `mock.assertThat(POST, URL)` hiç kayıt olmadığı için fırlatırsa testin başına `mock.expect(HttpMethod.POST, URL).thenReturn("{}");` ekle; iddia yine `wasInvokedTimes(0)` kalır.

- [ ] **Step 5: Değişen dosyaları listele**

`CloudflareTurnCredentials.java`, `CloudflareTurnCredentialsTest.java`. Mesaj: `feat(voice): Cloudflare TURN short-lived credentials with STUN fallback`.

---

### Task 4: `VoiceCommands` + paylaşılan `requireHost` + `FakeVoiceRooms`

**Files:**
- Create: `backend/src/main/java/com/bumpinto/application/session/VoiceCommands.java`
- Modify: `backend/src/main/java/com/bumpinto/application/session/SessionCommands.java` (`requireHost`)
- Modify: `backend/src/test/java/com/bumpinto/support/FakeStores.java` (`FakeVoiceRooms`)
- Test: `backend/src/test/java/com/bumpinto/application/session/VoiceCommandsTest.java`

- [ ] **Step 1: `FakeStores`'a `FakeVoiceRooms` ekle** (sınıfın sonuna; import'lar: `com.bumpinto.domain.port.VoiceRoomsPort`, `com.bumpinto.domain.voice.Seat`, `com.bumpinto.domain.voice.VoiceRoom`, `java.time.Instant`, `java.util.Optional`, `java.util.function.Predicate`)

```java
    /** Zamanlayicisiz oda: sure dolumu {@link #expire} ile elle tetiklenir. */
    public static class FakeVoiceRooms implements VoiceRoomsPort {
        public final Map<UUID, VoiceRoom> rooms = new HashMap<>();
        public final Map<UUID, Runnable> expiries = new HashMap<>();

        @Override public VoiceRoom open(UUID sessionId, String slug, Instant endsAt, Runnable onExpire) {
            return rooms.computeIfAbsent(sessionId, key -> {
                expiries.put(sessionId, onExpire);
                return new VoiceRoom(sessionId, slug, Instant.EPOCH, endsAt, Map.of());
            });
        }

        @Override public Optional<VoiceRoom> close(UUID sessionId) {
            expiries.remove(sessionId);
            return Optional.ofNullable(rooms.remove(sessionId));
        }

        @Override public Optional<VoiceRoom> join(UUID sessionId, UUID participantId, Seat seat) {
            return update(sessionId, members -> {
                members.put(participantId, seat);
                return true;
            });
        }

        @Override public Optional<VoiceRoom> leaveSeat(UUID sessionId, String wsSessionId, String subscriptionId) {
            return update(sessionId, members -> members.entrySet().removeIf(e ->
                    e.getValue().wsSessionId().equals(wsSessionId)
                            && e.getValue().subscriptionId().equals(subscriptionId)));
        }

        @Override public Optional<VoiceRoom> leaveSocket(UUID sessionId, String wsSessionId) {
            return update(sessionId, members -> members.entrySet().removeIf(e ->
                    e.getValue().wsSessionId().equals(wsSessionId)));
        }

        @Override public Optional<VoiceRoom> roomOf(UUID sessionId) {
            return Optional.ofNullable(rooms.get(sessionId));
        }

        public void expire(UUID sessionId) {
            Runnable onExpire = expiries.get(sessionId);
            if (onExpire != null) {
                onExpire.run();
            }
        }

        private Optional<VoiceRoom> update(UUID sessionId, Predicate<Map<UUID, Seat>> mutate) {
            VoiceRoom room = rooms.get(sessionId);
            if (room == null) {
                return Optional.empty();
            }
            Map<UUID, Seat> members = new HashMap<>(room.members());
            if (!mutate.test(members)) {
                return Optional.empty();
            }
            VoiceRoom next = new VoiceRoom(room.sessionId(), room.slug(), room.startedAt(),
                    room.endsAt(), members);
            rooms.put(sessionId, next);
            return Optional.of(next);
        }
    }
```

- [ ] **Step 2: Başarısız testi yaz**

```java
package com.bumpinto.application.session;

import com.bumpinto.application.error.ConflictException;
import com.bumpinto.application.error.ForbiddenException;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.TurnCredentialsPort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.SessionType;
import com.bumpinto.domain.voice.IceConfig;
import com.bumpinto.domain.voice.VoiceRoom;
import com.bumpinto.infra.config.AppProps;
import com.bumpinto.support.FakeStores;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VoiceCommandsTest {

    static final GeoPoint DEN_BOSCH = new GeoPoint(51.6978, 5.3037);
    static final GeoPoint SOMEREN = new GeoPoint(51.3855, 5.7120);
    static final Instant T0 = Instant.parse("2026-09-06T10:00:00Z");

    /** Clock.fixed ilerlemez; kalan sure ve expiry icin ilerleyen saat gerekir. */
    static final class MutableClock extends Clock {
        Instant now = T0;

        void advance(Duration by) {
            now = now.plus(by);
        }

        @Override public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override public Instant instant() {
            return now;
        }
    }

    static AppProps props() {
        return new AppProps(new AppProps.Security("cid", "secret", Duration.ofHours(12)),
                new AppProps.Providers("fsq-key", "g-key"),
                new AppProps.Cors(List.of()), new AppProps.Cookies(false, ""),
                new AppProps.RateLimit(false),
                new AppProps.Quota(1000, 1000),
                new AppProps.Geocode("ops@bumpinto.test", Duration.ZERO),
                new AppProps.Voice(Duration.ofHours(2)), new AppProps.Turn("", ""));
    }

    MutableClock clock;
    FakeStores.InMemorySessionStore store;
    FakeStores.RecordingEvents events;
    FakeStores.FakeVoiceRooms rooms;
    List<Duration> issuedTtls;
    SessionCommands sessions;
    VoiceCommands voice;
    String slug;
    UUID sessionId;
    UUID host;
    UUID guest;

    @BeforeEach
    void setUp() {
        clock = new MutableClock();
        store = new FakeStores.InMemorySessionStore();
        events = new FakeStores.RecordingEvents();
        rooms = new FakeStores.FakeVoiceRooms();
        issuedTtls = new ArrayList<>();
        TurnCredentialsPort turn = ttl -> {
            issuedTtls.add(ttl);
            return IceConfig.stunOnly();
        };
        sessions = new SessionCommands(store, events, clock);
        voice = new VoiceCommands(store, rooms, turn, events, clock, props());
        SessionCommands.CreateSessionResult created = sessions.createSession(UUID.randomUUID(),
                "Cuma", List.of(ActivityType.COFFEE), SessionType.GROUP, DEN_BOSCH, "Mehmet",
                null, null, null);
        slug = created.session().slug();
        sessionId = created.session().id();
        host = created.hostParticipant().id();
        Participant ayse = sessions.join(slug, Caller.ANONYMOUS, "Ayşe", SOMEREN, null, null);
        guest = ayse.id();
        events.published.clear();
    }

    private String lastEventType() {
        return events.published.get(events.published.size() - 1).event().type();
    }

    @Test
    void hostOpensTheRoomForTwoHoursAndASecondStartIsIdempotent() {
        VoiceRoom room = voice.start(slug, host);

        assertThat(room.endsAt()).isEqualTo(T0.plus(Duration.ofHours(2)));
        assertThat(lastEventType()).isEqualTo("voice_started");
        assertThat(events.published.get(0).event().payload())
                .containsEntry("endsAt", "2026-09-06T12:00:00Z");

        assertThat(voice.start(slug, host)).isEqualTo(room);
        assertThat(events.published).hasSize(1);
    }

    @Test
    void onlyTheHostStartsOrEnds() {
        assertThatThrownBy(() -> voice.start(slug, guest)).isInstanceOf(ForbiddenException.class);
        voice.start(slug, host);
        assertThatThrownBy(() -> voice.end(slug, guest)).isInstanceOf(ForbiddenException.class);
        assertThat(rooms.roomOf(sessionId)).isPresent();
    }

    @Test
    void soloSessionsHaveNoVoice() {
        SessionCommands.CreateSessionResult solo = sessions.createSession(UUID.randomUUID(),
                "Tek", List.of(ActivityType.COFFEE), SessionType.SOLO, DEN_BOSCH, "Mehmet",
                null, null, null);

        assertThatThrownBy(() -> voice.start(solo.session().slug(), solo.hostParticipant().id()))
                .isInstanceOf(ConflictException.class).hasMessageContaining("group");
    }

    @Test
    void expiredSessionsCannotStartButTheHostCanStillEnd() {
        voice.start(slug, host);
        clock.advance(Duration.ofHours(25));

        assertThatThrownBy(() -> voice.start(slug, host)).isInstanceOf(ConflictException.class);
        voice.end(slug, host);
        assertThat(rooms.roomOf(sessionId)).isEmpty();
    }

    /** Zamanlayici ile start arasindaki dar pencere: suresi gecmis oda taze acilir, once TIME_LIMIT gider. */
    @Test
    void startAfterEndsAtReplacesTheStaleRoom() {
        VoiceRoom first = voice.start(slug, host);
        clock.advance(Duration.ofHours(2).plusSeconds(1));

        VoiceRoom second = voice.start(slug, host);

        assertThat(second.endsAt()).isAfter(first.endsAt());
        assertThat(events.published.get(1).event().payload()).containsEntry("reason", "TIME_LIMIT");
        assertThat(lastEventType()).isEqualTo("voice_started");
    }

    @Test
    void endPublishesTheHostReasonOnceAndIsIdempotent() {
        voice.start(slug, host);
        voice.end(slug, host);
        voice.end(slug, host);

        assertThat(events.published).hasSize(2);
        assertThat(lastEventType()).isEqualTo("voice_ended");
        assertThat(events.published.get(1).event().payload()).containsEntry("reason", "HOST");
    }

    @Test
    void theExpiryCallbackEndsWithTimeLimit() {
        voice.start(slug, host);
        rooms.expire(sessionId);

        assertThat(rooms.roomOf(sessionId)).isEmpty();
        assertThat(events.published.get(1).event().payload()).containsEntry("reason", "TIME_LIMIT");
    }

    @Test
    void endIfEmptyClosesAnOpenRoomAndIsSilentOtherwise() {
        voice.endIfEmpty(sessionId);
        assertThat(events.published).isEmpty();

        voice.start(slug, host);
        voice.endIfEmpty(sessionId);
        assertThat(events.published.get(1).event().payload()).containsEntry("reason", "EMPTY");
    }

    @Test
    void credentialsNeedAnOpenRoomAndAParticipantOfThisSession() {
        assertThatThrownBy(() -> voice.credentials(slug, guest))
                .isInstanceOf(ConflictException.class).hasMessageContaining("voice not active");
        voice.start(slug, host);
        assertThatThrownBy(() -> voice.credentials(slug, UUID.randomUUID()))
                .isInstanceOf(ForbiddenException.class);

        VoiceCommands.Credentials c = voice.credentials(slug, guest);

        assertThat(c.endsAt()).isEqualTo(T0.plus(Duration.ofHours(2)));
        assertThat(c.ice().relay()).isFalse();
        assertThat(issuedTtls).containsExactly(Duration.ofHours(2).plusSeconds(60));
    }

    @Test
    void credentialTtlShrinksWithTheRoom() {
        voice.start(slug, host);
        clock.advance(Duration.ofMinutes(90));

        voice.credentials(slug, host);

        assertThat(issuedTtls).containsExactly(Duration.ofMinutes(30).plusSeconds(60));
    }
}
```

- [ ] **Step 3: Testi çalıştır, düştüğünü gör**

Run: `MVN_TEST VoiceCommandsTest`
Expected: COMPILATION ERROR — `VoiceCommands` yok, `SessionCommands.requireHost` private.

- [ ] **Step 4: `SessionCommands.requireHost`'u paylaşılır yap**

Mevcut:

```java
    private void requireHost(Session session, UUID participantId) {
        boolean host = store.participantsOf(session.id()).stream()
```

Yeni (javadoc aynen kalır, imza değişir):

```java
    static void requireHost(SessionStorePort store, Session session, UUID participantId) {
        boolean host = store.participantsOf(session.id()).stream()
                .filter(p -> p.id().equals(participantId))
                .findFirst().map(Participant::host).orElse(false);
        if (!host) {
            throw new ForbiddenException("only the host can do this");
        }
    }
```

Sınıf içindeki iki çağrı (`addPoint`, `removePoint`): `requireHost(session, hostParticipantId)` → `requireHost(store, session, hostParticipantId)`. Başka çağrı yeri var mı: `grep -n "requireHost(" SessionCommands.java` — hepsini güncelle.

- [ ] **Step 5: `VoiceCommands`'ı yaz**

```java
package com.bumpinto.application.session;

import com.bumpinto.application.error.ConflictException;
import com.bumpinto.application.error.ForbiddenException;
import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.domain.port.SessionEvent;
import com.bumpinto.domain.port.SessionEventsPort;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.port.TurnCredentialsPort;
import com.bumpinto.domain.port.VoiceRoomsPort;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.voice.EndReason;
import com.bumpinto.domain.voice.IceConfig;
import com.bumpinto.domain.voice.VoiceRoom;
import com.bumpinto.infra.config.AppProps;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Ses odasi komutlari. Oda DB'de degil (spec K8): @Transactional YOK, olaylar dogrudan gider.
 * Giris kapilari (start, credentials) expiry'ye bakar; end bakmaz — host suresi dolmus
 * oturumun odasini da kapatabilmeli.
 */
@Service
public class VoiceCommands {

    /** Kimlik odanin kalan omrunden bu kadar uzun yasar: son saniyede katilan relay'siz kalmasin. */
    static final Duration CREDENTIAL_MARGIN = Duration.ofSeconds(60);

    public record Credentials(IceConfig ice, Instant endsAt) {
    }

    private final SessionStorePort store;
    private final VoiceRoomsPort rooms;
    private final TurnCredentialsPort turn;
    private final SessionEventsPort events;
    private final Clock clock;
    private final Duration maxDuration;

    public VoiceCommands(SessionStorePort store, VoiceRoomsPort rooms, TurnCredentialsPort turn,
                         SessionEventsPort events, Clock clock, AppProps props) {
        this.store = store;
        this.rooms = rooms;
        this.turn = turn;
        this.events = events;
        this.clock = clock;
        this.maxDuration = props.voice().maxDuration();
        if (maxDuration.isZero() || maxDuration.isNegative()) {
            throw new IllegalStateException("bumpinto.voice.max-duration must be positive");
        }
    }

    /** Idempotent: acik oda oldugu gibi doner, ikinci voice_started gitmez. */
    public VoiceRoom start(String slug, UUID hostParticipantId) {
        Session session = SessionExpiry.required(store, slug, clock.instant());
        SessionCommands.requireHost(store, session, hostParticipantId);
        if (session.isSolo()) {
            throw new ConflictException("voice chat is only for group sessions");
        }
        Instant now = clock.instant();
        Optional<VoiceRoom> current = rooms.roomOf(session.id());
        if (current.isPresent() && current.get().endsAt().isAfter(now)) {
            return current.get();
        }
        // Suresi gecmis ama zamanlayicisi henuz kapatmamis oda: once kapat, sonra taze ac.
        current.ifPresent(stale -> end(session.id(), slug, EndReason.TIME_LIMIT));
        VoiceRoom room = rooms.open(session.id(), slug, now.plus(maxDuration),
                () -> end(session.id(), slug, EndReason.TIME_LIMIT));
        events.publish(slug, SessionEvent.voiceStarted(room.endsAt()));
        return room;
    }

    public void end(String slug, UUID hostParticipantId) {
        Session session = store.sessionBySlug(slug)
                .orElseThrow(() -> new NotFoundException("session not found: " + slug));
        SessionCommands.requireHost(store, session, hostParticipantId);
        end(session.id(), slug, EndReason.HOST);
    }

    /** Katman 2 (spec §5): oturumda kimse kalmadiysa oda kapanir. Oda yoksa sessiz. */
    public void endIfEmpty(UUID sessionId) {
        rooms.roomOf(sessionId).ifPresent(room -> end(sessionId, room.slug(), EndReason.EMPTY));
    }

    public Credentials credentials(String slug, UUID participantId) {
        Session session = SessionExpiry.required(store, slug, clock.instant());
        boolean member = store.participantsOf(session.id()).stream()
                .anyMatch(p -> p.id().equals(participantId));
        if (!member) {
            throw new ForbiddenException("not a participant of this session");
        }
        VoiceRoom room = rooms.roomOf(session.id())
                .orElseThrow(() -> new ConflictException("voice not active"));
        Duration ttl = room.remaining(clock.instant()).plus(CREDENTIAL_MARGIN);
        return new Credentials(turn.issue(ttl), room.endsAt());
    }

    private void end(UUID sessionId, String slug, EndReason reason) {
        rooms.close(sessionId)
                .ifPresent(room -> events.publish(slug, SessionEvent.voiceEnded(reason)));
    }
}
```

- [ ] **Step 6: Testleri çalıştır**

Run: `MVN_TEST VoiceCommandsTest` → `Tests run: 10, Failures: 0`.
Run: `MVN_TEST SessionCommandsTest` → hâlâ yeşil (imza değişikliği).

- [ ] **Step 7: Değişen dosyaları listele**

`VoiceCommands.java`, `SessionCommands.java`, `FakeStores.java`, `VoiceCommandsTest.java`. Mesaj: `feat(voice): VoiceCommands with host gates, time-limit expiry and credential ttl`.

---

### Task 5: `SessionView.voice`, `ParticipantDto.inVoice`

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/ApiDtos.java` (`ParticipantDto`, `SessionView`, yeni `VoiceDto`)
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/SessionViewAssembler.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/PointsController.java:36-40`
- Test: `backend/src/test/java/com/bumpinto/adapter/in/web/SessionViewAssemblerTest.java`

- [ ] **Step 1: Başarısız testi yaz** (mevcut sınıfa ekle; import: `com.bumpinto.domain.voice.Seat`, `com.bumpinto.support.FakeStores`, `java.time.Instant`, `java.util.Map`)

Kurulum satırı değişir:

```java
    FakeStores.FakePresence presence = new FakeStores.FakePresence();
    FakeStores.FakeVoiceRooms rooms = new FakeStores.FakeVoiceRooms();
    SessionViewAssembler assembler = new SessionViewAssembler(presence, rooms);
```

Yeni test:

```java
    @Test
    void voiceIsNullWhenClosedAndCarriesEndsAtAndMembersWhenOpen() {
        Session s = session(SessionType.GROUP);
        Participant ayse = person(s.id(), new GeoPoint(51.3855, 5.7120), "Someren", false);
        Participant mehmet = person(s.id(), new GeoPoint(51.6978, 5.3037), "Den Bosch", false);
        SessionQueries.SessionSnapshot snap = new SessionQueries.SessionSnapshot(s,
                List.of(ayse, mehmet), List.of(), Map.of(), Map.of(), Map.of());

        ApiDtos.SessionView closed = assembler.toView(snap, null);
        assertThat(closed.voice()).isNull();
        assertThat(closed.participants()).noneMatch(ApiDtos.ParticipantDto::inVoice);

        Instant endsAt = Instant.parse("2026-09-06T12:00:00Z");
        rooms.open(s.id(), "s1", endsAt, () -> { });
        rooms.join(s.id(), ayse.id(), new Seat("ws-1", "sub-1"));
        ApiDtos.SessionView open = assembler.toView(snap, null);
        assertThat(open.voice().endsAt()).isEqualTo(endsAt);
        assertThat(open.participants().stream().filter(ApiDtos.ParticipantDto::inVoice)
                .map(ApiDtos.ParticipantDto::id)).containsExactly(ayse.id());
    }
```

- [ ] **Step 2: Testi çalıştır, düştüğünü gör**

Run: `MVN_TEST SessionViewAssemblerTest`
Expected: COMPILATION ERROR — kurucu tek argüman, `voice()`/`inVoice()` yok.

- [ ] **Step 3: DTO'ları güncelle**

`ParticipantDto` son bileşen:

```java
                                 /** Acik soketi var ya da 45 sn icinde koptu; manual satirlarda daima false. */
                                 boolean online,
                                 /** Kendi ses konusuna abone (spec K4); SOLO'da daima false. */
                                 boolean inVoice) {
```

`SessionView` son bileşen (`anchored`'dan sonra):

```java
                              boolean anchored,
                              /** Ses odasi: null = kapali. SOLO'da hep null (start SOLO'yu reddeder). */
                              VoiceDto voice) {
```

`ViewerDto`'dan önce yeni kayıt:

```java
    public record VoiceDto(Instant endsAt) {
    }
```

- [ ] **Step 4: Assembler'ı güncelle**

Kurucu ve alanlar:

```java
    private final PresencePort presence;
    private final VoiceRoomsPort rooms;

    public SessionViewAssembler(PresencePort presence, VoiceRoomsPort rooms) {
        this.presence = presence;
        this.rooms = rooms;
    }
```

`toView` içinde `Set<UUID> present = ...` satırından sonra:

```java
        Optional<VoiceRoom> room = rooms.roomOf(snap.session().id());
```

`ParticipantDto` yapımında `present.contains(p.id())` → `present.contains(p.id()),
                        room.map(r -> r.hasMember(p.id())).orElse(false)`.

`new ApiDtos.SessionView(...)` son argüman `center != null && center.anchored()` → `center != null && center.anchored(),
                room.map(r -> new ApiDtos.VoiceDto(r.endsAt())).orElse(null)`.

Import'lar: `com.bumpinto.domain.port.VoiceRoomsPort`, `com.bumpinto.domain.voice.VoiceRoom`, `java.util.Optional`.

- [ ] **Step 5: `PointsController`'ı güncelle** — `ParticipantDto` yapımının sonu:

```java
                // Elle eklenen nokta token tasimaz, soket asamaz → daima cevrimdisi ve ses disi.
                false, false));
```

- [ ] **Step 6: Derle, testleri çalıştır**

`grep -rn "new ApiDtos.ParticipantDto(\|new ApiDtos.SessionView(" src` → yalnız assembler ve PointsController; başka yer varsa aynı ek argümanla güncelle.
Run: `MVN_TEST SessionViewAssemblerTest` → PASS. `MVN_TEST WebSecuritySliceTest` bu noktada **derlenmez** (assembler kurucusu) — Task 6'da düzelir; onu şimdi koşma.

- [ ] **Step 7: Değişen dosyaları listele**

`ApiDtos.java`, `SessionViewAssembler.java`, `PointsController.java`, `SessionViewAssemblerTest.java`. Mesaj: `feat(voice): expose voice room and inVoice in SessionView`.

---

### Task 6: `VoiceController` + güvenlik dilimi + Bruno

**Files:**
- Create: `backend/src/main/java/com/bumpinto/adapter/in/web/VoiceController.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/ApiDtos.java` (3 cevap kaydı)
- Modify: `backend/src/test/java/com/bumpinto/adapter/in/web/WebSecuritySliceTest.java`
- Create: `backend/.infra/bumpinto-collection/sessions/voice-start.yml`, `voice-credentials.yml`, `voice-end.yml`
- Modify: `backend/.infra/bumpinto-collection/sessions/folder.yml` (klasör düzeyinde `X-Participant-Token: {{participantToken}}` başlığı — oturum uçları katılımcı token'ı ister; `deck/folder.yml` deseni)

- [ ] **Step 1: Dilim testini güncelle ve başarısız iki test ekle**

Sınıf başlığı:

```java
@WebMvcTest(controllers = {SessionController.class, ParticipantController.class, DeckController.class,
        VoiceController.class})
```

Mock'lara ekle (mevcut `@MockitoBean PresencePort presence;` altına):

```java
    @MockitoBean VoiceCommands voice;
    // SessionViewAssembler artik VoiceRoomsPort da ister; Optional donen metodlar bos doner.
    @MockitoBean VoiceRoomsPort rooms;
```

Import'lar: `com.bumpinto.application.session.VoiceCommands`, `com.bumpinto.domain.port.VoiceRoomsPort`, `com.bumpinto.domain.voice.IceConfig`, `com.bumpinto.domain.voice.VoiceRoom`, `java.time.Instant`, `java.util.Map`, `static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete`.

`tokenCarryingDtosMaskSecretsInToString` sonuna:

```java
        assertThat(new ApiDtos.IceServerDto(List.of("turn:x"), "u", "turn-secret").toString())
                .doesNotContain("turn-secret").contains("turn:x");
```

Yeni testler:

```java
    @Test
    void voiceEndpointsNeedAParticipantToken() throws Exception {
        mvc.perform(post("/api/sessions/abc/voice")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/sessions/abc/voice")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/sessions/abc/voice/credentials")).andExpect(status().isUnauthorized());
    }

    @Test
    void participantTokenOpensVoiceStartCredentialsAndEnd() throws Exception {
        Instant endsAt = Instant.parse("2026-09-06T12:00:00Z");
        when(voice.start("abc", AYSE_ID))
                .thenReturn(new VoiceRoom(SESSION_ID, "abc", Instant.EPOCH, endsAt, Map.of()));
        when(voice.credentials("abc", AYSE_ID))
                .thenReturn(new VoiceCommands.Credentials(IceConfig.stunOnly(), endsAt));

        mvc.perform(post("/api/sessions/abc/voice")
                        .header(ParticipantTokenFilter.HEADER, participantTokenForAbc()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.endsAt").exists());
        mvc.perform(post("/api/sessions/abc/voice/credentials")
                        .header(ParticipantTokenFilter.HEADER, participantTokenForAbc()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.relay").value(false))
                .andExpect(jsonPath("$.iceServers[0].urls[0]").value("stun:stun.cloudflare.com:3478"))
                .andExpect(jsonPath("$.endsAt").exists());
        mvc.perform(delete("/api/sessions/abc/voice")
                        .header(ParticipantTokenFilter.HEADER, participantTokenForAbc()))
                .andExpect(status().isNoContent());
    }
```

- [ ] **Step 2: Testi çalıştır, düştüğünü gör**

Run: `MVN_TEST WebSecuritySliceTest`
Expected: COMPILATION ERROR — `VoiceController`, `IceServerDto` yok.

- [ ] **Step 3: `ApiDtos`'a cevap kayıtlarını ekle** (`VoiceDto`'nun altına)

```java
    public record VoiceStartResponse(Instant endsAt) {
    }

    /** credential kisa omurlu bir sirdir: toString maskeler (tokenCarryingDtosMaskSecretsInToString). */
    public record IceServerDto(List<String> urls, String username, String credential) {

        @Override
        public String toString() {
            return "IceServerDto[urls=" + urls + ", username=" + username + ", credential=***]";
        }
    }

    /** relay=false: TURN yok, yalniz STUN (Cloudflare ayarsiz/erisilemez). Istemci UI'da gostermez. */
    public record VoiceCredentialsResponse(List<IceServerDto> iceServers, boolean relay,
                                           Instant endsAt) {
    }
```

- [ ] **Step 4: `VoiceController`'ı yaz**

```java
package com.bumpinto.adapter.in.web;

import com.bumpinto.application.session.VoiceCommands;
import com.bumpinto.infra.security.ParticipantPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Ses odasi durumu REST'ten (spec K3); sinyal STOMP'tan (VoiceSignalController). Uyelik burada
 * DEGIL: kisi kendi sinyal konusuna abone olunca uye olur (VoiceRoomListener, K4).
 */
@RestController
@RequestMapping("/api/sessions/{slug}/voice")
class VoiceController {

    private final VoiceCommands voice;

    VoiceController(VoiceCommands voice) {
        this.voice = voice;
    }

    @PostMapping
    ApiDtos.VoiceStartResponse start(@AuthenticationPrincipal ParticipantPrincipal me,
                                     @PathVariable String slug) {
        return new ApiDtos.VoiceStartResponse(
                voice.start(slug, WebPrincipals.participantId(me)).endsAt());
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void end(@AuthenticationPrincipal ParticipantPrincipal me, @PathVariable String slug) {
        voice.end(slug, WebPrincipals.participantId(me));
    }

    @PostMapping("/credentials")
    ApiDtos.VoiceCredentialsResponse credentials(@AuthenticationPrincipal ParticipantPrincipal me,
                                                 @PathVariable String slug) {
        VoiceCommands.Credentials c = voice.credentials(slug, WebPrincipals.participantId(me));
        return new ApiDtos.VoiceCredentialsResponse(c.ice().iceServers().stream()
                .map(s -> new ApiDtos.IceServerDto(s.urls(), s.username(), s.credential())).toList(),
                c.ice().relay(), c.endsAt());
    }
}
```

- [ ] **Step 5: Testi çalıştır**

Run: `MVN_TEST WebSecuritySliceTest`
Expected: PASS (mevcut testler + 2 yeni). 401 yerine 403 gelirse `SecurityConfig`'in bu yol için ayrı bir kuralı yoktur; `anyRequest().authenticated()` 401 verir — kontrol et, kural ekleme.

- [ ] **Step 6: Bruno isteklerini yaz** (`backend/.infra/bumpinto-collection/sessions/`)

`voice-start.yml`:

```yaml
info:
  name: Voice — Başlat
  type: http
  seq: 8

http:
  method: POST
  url: "{{baseUrl}}/api/sessions/{{slug}}/voice"
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
        test("endsAt tasir", function() {
          expect(res.body.endsAt).to.be.a("string");
        });

docs:
  type: text/markdown
  content: |-
    Host'un katilimci token'i gerekir (`X-Participant-Token`, klasor duzeyinde). Host degilse 403,
    bilinmeyen slug 404, SOLO → 409, suresi dolmus oturum → 409. Idempotent: acik oda varsa ayni
    `endsAt` doner.

    `endsAt` = simdi + `bumpinto.voice.max-duration` (varsayilan 2 saat). Sure dolunca oda
    kendiliginden kapanir (`voice_ended{reason: TIME_LIMIT}`). Rate limit: `api` kovasi (120/dk).
```

`voice-credentials.yml`:

```yaml
info:
  name: Voice — TURN kimliği
  type: http
  seq: 9

http:
  method: POST
  url: "{{baseUrl}}/api/sessions/{{slug}}/voice/credentials"
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
        test("ICE listesi tasir", function() {
          expect(res.body.iceServers).to.be.an("array");
          expect(res.body.relay).to.be.a("boolean");
        });

docs:
  type: text/markdown
  content: |-
    Oturum uyesi (katilimci token'i) gerekir; uye degilse 403, oda kapaliysa 409 `voice not active`,
    suresi dolmus oturum 409.
    Cevap: `iceServers[{urls, username?, credential?}]`, `relay` (TURN var mi), `endsAt`.
    Kimlik omru = odanin kalan suresi + 60 sn; Cloudflare ayarsiz/erisilemezse yalniz STUN ve
    `relay=false`. Kimlik sunucuda saklanmaz. Rate limit: `api` kovasi.
```

`voice-end.yml`:

```yaml
info:
  name: Voice — Bitir
  type: http
  seq: 10

http:
  method: DELETE
  url: "{{baseUrl}}/api/sessions/{{slug}}/voice"
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
    Host'un katilimci token'i gerekir (host degilse 403, bilinmeyen slug 404). Herkes icin kapatir: uyeler silinir,
    `voice_ended{reason: HOST}` yayinlanir. Idempotent (oda kapaliysa da 204).
    Suresi dolmus oturumda da calisir. Rate limit: `api` kovasi.
```

- [ ] **Step 7: Değişen dosyaları listele**

`VoiceController.java`, `ApiDtos.java`, `WebSecuritySliceTest.java`, 3 Bruno dosyası. Mesaj: `feat(voice): REST endpoints for start, end and TURN credentials`.

---

### Task 7: STOMP — sinyal relay, abonelikle üyelik, boş oturum kapanışı

**Files:**
- Create: `backend/src/main/java/com/bumpinto/adapter/in/web/VoiceDestinations.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/in/web/VoiceSignalController.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/in/web/VoiceRoomListener.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/WebSocketConfig.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/PresenceListener.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/in/web/VoiceOverWebSocketTest.java`

Bu görev **framework yapıştırıcısıdır** (interceptor + listener + `@MessageMapping`): gerçek STOMP istemcisiyle test zorunlu (kural: "untested seam" yok). Kurulum `PresenceOverWebSocketTest` ile aynı; `ShortGrace` oradan import edilir.

- [ ] **Step 1: Başarısız entegrasyon testini yaz**

```java
package com.bumpinto.adapter.in.web;

import com.bumpinto.domain.port.ReverseGeocodePort;
import com.bumpinto.domain.port.VenueProviderPort;
import com.bumpinto.infra.security.GoogleIdVerifier;
import com.bumpinto.infra.security.ParticipantTokenFilter;
import com.bumpinto.infra.security.RateLimitFilter;
import com.bumpinto.support.PostgresContainer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.util.MimeTypeUtils;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;
import org.testcontainers.containers.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.lang.reflect.Type;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.mockito.Mockito.when;

/**
 * Sinyal relay'i, abonelikle uyelik ve bos oturum kapanisi gercek bir STOMP istemcisiyle
 * sinanir: interceptor + listener + @MessageMapping framework yapisticisidir, mock'lu Message
 * yalniz Spring'in sarmalayicisini dogrular (PresenceOverWebSocketTest'teki dersin aynisi).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
        "bumpinto.security.google-client-id=test-client-id",
        "bumpinto.security.token-secret=test-only-secret-not-a-real-key-0123456789",
        "bumpinto.security.token-ttl=12h",
        "bumpinto.providers.foursquare-key=test-only-fsq-key",
        "bumpinto.providers.google-key=test-only-google-key",
        "bumpinto.cors.allowed-origins=http://localhost:5173",
        "bumpinto.cookies.secure=false",
        "bumpinto.cookies.domain="
})
@Import(PresenceOverWebSocketTest.ShortGrace.class)
class VoiceOverWebSocketTest {

    @ServiceConnection
    static PostgreSQLContainer<?> postgres = PostgresContainer.shared();

    @Autowired ObjectMapper json;
    @Autowired RateLimitFilter rateLimit;
    @LocalServerPort int port;

    @MockitoBean VenueProviderPort provider;
    @MockitoBean GoogleIdVerifier google;
    @MockitoBean ReverseGeocodePort geocoder;

    private final HttpClient http = HttpClient.newHttpClient();
    private WebSocketStompClient stompClient;
    private final List<StompSession> open = new ArrayList<>();

    record Room(String slug, String hostToken, UUID hostId, String guestToken, UUID guestId) {
    }

    record Inbox(BlockingQueue<String> frames, StompSession.Subscription subscription) {
    }

    @BeforeEach
    void freshBucketsAndClient() {
        rateLimit.reset();
        stompClient = new WebSocketStompClient(new StandardWebSocketClient());
    }

    @AfterEach
    void closeSockets() {
        open.stream().filter(StompSession::isConnected).forEach(StompSession::disconnect);
    }

    @Test
    void subscribingToTheOwnInboxJoinsTheRoomAndRingsTheRoster() throws Exception {
        Room room = openRoom("gid-voice-join");
        StompSession host = connect(room.slug(), room.hostToken());
        Inbox hostTopic = listen(host, "/topic/session/" + room.slug());
        StompSession guest = connect(room.slug(), room.guestToken());

        assertThat(inVoice(room.slug(), room.hostToken(), room.guestId())).isFalse();
        listen(guest, inbox(room.slug(), room.guestId()));

        await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(200))
                .untilAsserted(() -> assertThat(inVoice(room.slug(), room.hostToken(), room.guestId())).isTrue());
        await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(100))
                .until(() -> hostTopic.frames().stream().anyMatch(f -> f.contains("voice_roster_changed")));

        HttpResponse<String> creds = send(HttpRequest.newBuilder(uri("/api/sessions/" + room.slug() + "/voice/credentials"))
                .header(ParticipantTokenFilter.HEADER, room.guestToken())
                .POST(HttpRequest.BodyPublishers.noBody()));
        assertThat(creds.statusCode()).isEqualTo(200);
        assertThat(json.readTree(creds.body()).get("relay").asBoolean()).isFalse(); // TURN ayarsiz
    }

    @Test
    void anOfferIsRelayedToItsTargetStampedWithTheSenderId() throws Exception {
        Room room = openRoom("gid-voice-relay");
        StompSession host = connect(room.slug(), room.hostToken());
        StompSession guest = connect(room.slug(), room.guestToken());
        Inbox hostInbox = listen(host, inbox(room.slug(), room.hostId()));
        listen(guest, inbox(room.slug(), room.guestId()));
        awaitBothInVoice(room);

        signal(guest, room.slug(), room.hostId(), "offer");

        await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(100))
                .until(() -> !hostInbox.frames().isEmpty());
        String frame = hostInbox.frames().poll();
        assertThat(frame).contains("\"from\":\"" + room.guestId() + "\"")
                .contains("\"type\":\"offer\"").contains("\"sdp\":\"v=0 test\"");
    }

    @Test
    void signalsFromSomeoneOutsideTheRoomAreDropped() throws Exception {
        Room room = openRoom("gid-voice-outsider");
        StompSession host = connect(room.slug(), room.hostToken());
        Inbox hostInbox = listen(host, inbox(room.slug(), room.hostId()));
        await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(200))
                .untilAsserted(() -> assertThat(inVoice(room.slug(), room.hostToken(), room.hostId())).isTrue());
        StompSession guest = connect(room.slug(), room.guestToken()); // abone DEGIL → uye degil

        signal(guest, room.slug(), room.hostId(), "offer");

        await().during(Duration.ofSeconds(1)).atMost(Duration.ofSeconds(3)).until(() -> hostInbox.frames().isEmpty());
    }

    @Test
    void someoneElsesInboxCannotBeSubscribed() throws Exception {
        Room room = openRoom("gid-voice-eavesdrop");
        StompSession host = connect(room.slug(), room.hostToken());
        StompSession guest = connect(room.slug(), room.guestToken());
        Inbox hostInbox = listen(host, inbox(room.slug(), room.hostId()));
        listen(guest, inbox(room.slug(), room.guestId()));
        Inbox eavesdrop = listen(guest, inbox(room.slug(), room.hostId())); // dusurulur
        awaitBothInVoice(room);

        signal(guest, room.slug(), room.hostId(), "answer");

        await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(100))
                .until(() -> !hostInbox.frames().isEmpty());
        await().during(Duration.ofSeconds(1)).atMost(Duration.ofSeconds(3)).until(() -> eavesdrop.frames().isEmpty());
    }

    @Test
    void clientsStillCannotPublishToTheSessionTopic() throws Exception {
        Room room = openRoom("gid-voice-topic");
        StompSession host = connect(room.slug(), room.hostToken());
        Inbox hostTopic = listen(host, "/topic/session/" + room.slug());
        StompSession guest = connect(room.slug(), room.guestToken());
        listen(guest, inbox(room.slug(), room.guestId()));

        StompHeaders headers = new StompHeaders();
        headers.setDestination("/topic/session/" + room.slug());
        headers.setContentType(MimeTypeUtils.APPLICATION_JSON);
        guest.send(headers, "{\"type\":\"session_decided\"}".getBytes(StandardCharsets.UTF_8));

        await().during(Duration.ofSeconds(1)).atMost(Duration.ofSeconds(3))
                .until(() -> hostTopic.frames().stream().noneMatch(f -> f.contains("session_decided")));
    }

    @Test
    void unsubscribingAndDisconnectingLeaveTheRoom() throws Exception {
        Room room = openRoom("gid-voice-leave");
        StompSession guest = connect(room.slug(), room.guestToken());
        Inbox mine = listen(guest, inbox(room.slug(), room.guestId()));
        await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(200))
                .untilAsserted(() -> assertThat(inVoice(room.slug(), room.hostToken(), room.guestId())).isTrue());

        mine.subscription().unsubscribe();
        await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(200))
                .untilAsserted(() -> assertThat(inVoice(room.slug(), room.hostToken(), room.guestId())).isFalse());

        listen(guest, inbox(room.slug(), room.guestId()));
        await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(200))
                .untilAsserted(() -> assertThat(inVoice(room.slug(), room.hostToken(), room.guestId())).isTrue());

        guest.disconnect();
        await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(200))
                .untilAsserted(() -> assertThat(inVoice(room.slug(), room.hostToken(), room.guestId())).isFalse());
    }

    /** Katman 2: son kisi de kopunca (grace 1 sn) oda kendiliginden kapanir. */
    @Test
    void theRoomClosesWhenEveryoneIsGone() throws Exception {
        Room room = openRoom("gid-voice-empty");
        assertThat(view(room.slug(), room.hostToken()).get("voice").isNull()).isFalse();
        StompSession host = connect(room.slug(), room.hostToken());
        await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(200))
                .untilAsserted(() -> assertThat(hostOnline(room.slug(), room.hostToken())).isTrue());

        host.disconnect();

        await().atMost(Duration.ofSeconds(8)).pollInterval(Duration.ofMillis(200))
                .untilAsserted(() -> assertThat(view(room.slug(), room.hostToken()).get("voice").isNull()).isTrue());
    }

    // ---- yardimcilar ----

    private Room openRoom(String googleId) throws Exception {
        when(google.verify(googleId))
                .thenReturn(new GoogleIdVerifier.GoogleUser(googleId + "@bumpinto.test", "Mehmet"));
        String accessToken = json.readTree(postJson("/api/auth/google",
                "{\"idToken\":\"" + googleId + "\"}", null).body()).get("accessToken").asString();
        JsonNode created = json.readTree(postJson("/api/sessions",
                "{\"activityTypes\":[\"COFFEE\"],\"lat\":51.6978,\"lng\":5.3037,\"displayName\":\"Mehmet\"}",
                "Bearer " + accessToken).body());
        String slug = created.get("slug").asString();
        String hostToken = created.get("participantToken").asString();
        JsonNode joined = json.readTree(postJson("/api/sessions/" + slug + "/participants",
                "{\"displayName\":\"Ayşe\",\"lat\":51.3855,\"lng\":5.7120}", null).body());
        HttpResponse<String> started = send(HttpRequest.newBuilder(uri("/api/sessions/" + slug + "/voice"))
                .header(ParticipantTokenFilter.HEADER, hostToken)
                .POST(HttpRequest.BodyPublishers.noBody()));
        assertThat(started.statusCode()).isEqualTo(200);
        return new Room(slug, hostToken, UUID.fromString(created.get("participantId").asString()),
                joined.get("participantToken").asString(),
                UUID.fromString(joined.get("participantId").asString()));
    }

    private HttpResponse<String> postJson(String path, String body, String authorization) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(uri(path))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body));
        if (authorization != null) {
            request.header("Authorization", authorization);
        }
        return send(request);
    }

    private StompSession connect(String slug, String participantToken) throws Exception {
        WebSocketHttpHeaders headers = new WebSocketHttpHeaders();
        headers.add(ParticipantTokenFilter.HEADER, participantToken);
        StompSession session = stompClient.connectAsync("ws://localhost:" + port + "/api/sessions/" + slug + "/ws",
                headers, new StompSessionHandlerAdapter() {
                }).get(5, TimeUnit.SECONDS);
        open.add(session);
        return session;
    }

    private static String inbox(String slug, UUID participantId) {
        return "/topic/session/" + slug + "/voice/" + participantId;
    }

    private Inbox listen(StompSession session, String destination) {
        BlockingQueue<String> frames = new LinkedBlockingQueue<>();
        StompSession.Subscription subscription = session.subscribe(destination, new StompFrameHandler() {
            @Override public Type getPayloadType(StompHeaders headers) {
                return byte[].class;
            }

            @Override public void handleFrame(StompHeaders headers, Object payload) {
                frames.add(new String((byte[]) payload, StandardCharsets.UTF_8));
            }
        });
        return new Inbox(frames, subscription);
    }

    private static void signal(StompSession from, String slug, UUID to, String type) {
        StompHeaders headers = new StompHeaders();
        headers.setDestination("/app/sessions/" + slug + "/voice/signal");
        headers.setContentType(MimeTypeUtils.APPLICATION_JSON);
        from.send(headers, ("{\"to\":\"" + to + "\",\"type\":\"" + type + "\",\"sdp\":\"v=0 test\"}")
                .getBytes(StandardCharsets.UTF_8));
    }

    private void awaitBothInVoice(Room room) {
        await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(200)).untilAsserted(() -> {
            assertThat(inVoice(room.slug(), room.hostToken(), room.hostId())).isTrue();
            assertThat(inVoice(room.slug(), room.hostToken(), room.guestId())).isTrue();
        });
    }

    private JsonNode view(String slug, String token) throws Exception {
        HttpResponse<String> response = send(HttpRequest.newBuilder(uri("/api/sessions/" + slug))
                .header(ParticipantTokenFilter.HEADER, token).GET());
        assertThat(response.statusCode()).isEqualTo(200);
        return json.readTree(response.body());
    }

    private boolean inVoice(String slug, String token, UUID participantId) throws Exception {
        for (JsonNode p : view(slug, token).get("participants")) {
            if (participantId.toString().equals(p.get("id").asString())) {
                return p.get("inVoice").asBoolean();
            }
        }
        throw new AssertionError("katilimci bulunamadi: " + participantId);
    }

    private boolean hostOnline(String slug, String token) throws Exception {
        for (JsonNode p : view(slug, token).get("participants")) {
            if (p.get("host").asBoolean()) {
                return p.get("online").asBoolean();
            }
        }
        throw new AssertionError("host bulunamadi");
    }

    private HttpResponse<String> send(HttpRequest.Builder request) throws Exception {
        return http.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    private URI uri(String path) {
        return URI.create("http://localhost:" + port + path);
    }
}
```

- [ ] **Step 2: Testi çalıştır, düştüğünü gör**

Run: `MVN_TEST VoiceOverWebSocketTest`
Expected: derlenir (yalnız HTTP/STOMP API kullanır) ama `subscribingToTheOwnInbox...` 5 sn sonra `inVoice` false ile düşer; `anOffer...` inbox boş kalır (SEND düşürülüyor, abonelik düşürülüyor).

- [ ] **Step 3: `VoiceDestinations`'ı yaz**

```java
package com.bumpinto.adapter.in.web;

import java.util.UUID;

/** STOMP adresleri tek yerde: interceptor, listener, relay ve test ayni dizeleri kullanir. */
final class VoiceDestinations {

    static final String APP_PREFIX = "/app";

    private VoiceDestinations() {
    }

    static String sessionTopic(String slug) {
        return "/topic/session/" + slug;
    }

    /** Kisinin ozel sinyal konusu; abone olmak ses uyeligidir (spec K4). */
    static String inbox(String slug, UUID participantId) {
        return sessionTopic(slug) + "/voice/" + participantId;
    }

    /** Istemcinin SEND yapabildigi TEK adres. */
    static String signal(String slug) {
        return APP_PREFIX + "/sessions/" + slug + "/voice/signal";
    }
}
```

- [ ] **Step 4: `WebSocketConfig`'i güncelle**

Sınıf javadoc'undaki "Kanal SALT OKUNUR" paragrafı şu paragrafla değişir:

```java
 * <p>Kanal bir istisna disinda SALT OKUNURDUR: istemciden gelen SEND frame'leri dusurulur
 * ({@link #configureClientInboundChannel}); tek gecis {@code /app/sessions/{slug}/voice/signal}
 * (kendi slug'i) — WebRTC sinyali, {@link VoiceSignalController}. Spring'in simple broker'i, hedefi
 * broker onekiyle baslayan ISTEMCI SEND frame'lerini de abonelere roleler; handshake kimliksizken
 * slug'i bilen biri sahte olay basip oturumdaki HERKESIN sekmesine tam bir GET yaptirabiliyordu.
 * Kural KALDI: {@code /topic} altina istemci yayini yok.
```

Sabit ve `configureMessageBroker`:

```java
    /** Cift yonlu STOMP heartbeat araligi. */
    private static final long HEARTBEAT_MS = 10_000;
    /** SDP birkac KB'dir; 32 KB tavan bir frame'le hafizayi doldurmayi keser (handler 16 KB'de ayrica keser). */
    private static final int MESSAGE_SIZE_LIMIT = 32 * 1024;
```

```java
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic")
                .setTaskScheduler(heartbeatScheduler())
                .setHeartbeatValue(new long[] {HEARTBEAT_MS, HEARTBEAT_MS});
        registry.setApplicationDestinationPrefixes(VoiceDestinations.APP_PREFIX);
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        registration.setMessageSizeLimit(MESSAGE_SIZE_LIMIT);
    }
```

Interceptor (`configureClientInboundChannel` javadoc: "Yalniz kendi oturumunun aboneligi ve kendi sinyal adresi gecer; baska her SEND sessizce dusurulur."):

```java
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                SimpMessageType type = SimpMessageHeaderAccessor.getMessageType(message.getHeaders());
                if (type == SimpMessageType.MESSAGE && !ownSignal(message)) {
                    return null;
                }
                if (type == SimpMessageType.SUBSCRIBE && !ownTopic(message)) {
                    return null;
                }
                return message;
            }
```

`ownTopic` yerine iki yardımcı:

```java
    private static boolean ownSignal(Message<?> message) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.wrap(message);
        String slug = slugOf(accessor);
        return slug != null && VoiceDestinations.signal(slug).equals(accessor.getDestination());
    }

    /** Oturum konusu ya da KENDI ses konusu; baskasinin ozel konusu dusurulur. */
    private static boolean ownTopic(Message<?> message) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.wrap(message);
        String slug = slugOf(accessor);
        if (slug == null) {
            return false;
        }
        String destination = accessor.getDestination();
        if (VoiceDestinations.sessionTopic(slug).equals(destination)) {
            return true;
        }
        Map<String, Object> attributes = accessor.getSessionAttributes();
        return attributes != null
                && attributes.get(SessionWsHandshake.PARTICIPANT_ID) instanceof UUID me
                && VoiceDestinations.inbox(slug, me).equals(destination);
    }

    private static String slugOf(SimpMessageHeaderAccessor accessor) {
        Map<String, Object> attributes = accessor.getSessionAttributes();
        Object slug = attributes == null ? null : attributes.get(SessionWsHandshake.SLUG);
        return slug instanceof String value ? value : null;
    }
```

Import'lar: `org.springframework.web.socket.config.annotation.WebSocketTransportRegistration`, `java.util.UUID`.

- [ ] **Step 5: `VoiceSignalController`'ı yaz**

```java
package com.bumpinto.adapter.in.web;

import com.bumpinto.domain.port.VoiceRoomsPort;
import com.bumpinto.domain.voice.VoiceRoom;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * WebRTC sinyal relay'i: offer/answer/ice hedefin ozel konusuna gider, HICBIR SEY saklanmaz.
 * {@code from} istemciden okunmaz, sunucu damgalar. Gonderen ve hedef ayni odanin uyesi olmali.
 * Gecersiz her sey sessizce duser: sinyal en-iyi-caba, istemci ICE zaman asimiyla anlar.
 */
@Controller
class VoiceSignalController {

    static final int MAX_PAYLOAD_CHARS = 16 * 1024;
    private static final Set<String> TYPES = Set.of("offer", "answer", "ice");

    /** Istemci govdesi. candidate: RTCIceCandidateInit ({candidate, sdpMid, sdpMLineIndex, ...}). */
    record Signal(String to, String type, String sdp, Map<String, Object> candidate) {
    }

    private final VoiceRoomsPort rooms;
    private final SimpMessagingTemplate template;

    VoiceSignalController(VoiceRoomsPort rooms, SimpMessagingTemplate template) {
        this.rooms = rooms;
        this.template = template;
    }

    @MessageMapping("/sessions/{slug}/voice/signal")
    void relay(@DestinationVariable String slug, @Payload Signal signal,
               SimpMessageHeaderAccessor accessor) {
        Map<String, Object> attributes = accessor.getSessionAttributes();
        if (attributes == null || signal == null || signal.to() == null
                || signal.type() == null || !TYPES.contains(signal.type()) || tooLarge(signal)) {
            return;
        }
        if (!(attributes.get(SessionWsHandshake.SESSION_ID) instanceof UUID sessionId)
                || !(attributes.get(SessionWsHandshake.PARTICIPANT_ID) instanceof UUID from)
                || !slug.equals(attributes.get(SessionWsHandshake.SLUG))) {
            return;
        }
        UUID to;
        try {
            to = UUID.fromString(signal.to());
        } catch (IllegalArgumentException e) {
            return;
        }
        VoiceRoom room = rooms.roomOf(sessionId).orElse(null);
        if (room == null || !room.hasMember(from) || !room.hasMember(to)) {
            return;
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("from", from.toString());
        out.put("type", signal.type());
        if (signal.sdp() != null) {
            out.put("sdp", signal.sdp());
        }
        if (signal.candidate() != null) {
            out.put("candidate", signal.candidate());
        }
        template.convertAndSend(VoiceDestinations.inbox(slug, to), out);
    }

    private static boolean tooLarge(Signal signal) {
        int size = signal.sdp() == null ? 0 : signal.sdp().length();
        if (signal.candidate() != null) {
            size += signal.candidate().toString().length();
        }
        return size > MAX_PAYLOAD_CHARS;
    }
}
```

- [ ] **Step 6: `VoiceRoomListener`'ı yaz**

```java
package com.bumpinto.adapter.in.web;

import com.bumpinto.domain.port.SessionEvent;
import com.bumpinto.domain.port.SessionEventsPort;
import com.bumpinto.domain.port.VoiceRoomsPort;
import com.bumpinto.domain.voice.Seat;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.AbstractSubProtocolEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;
import org.springframework.web.socket.messaging.SessionUnsubscribeEvent;

import java.util.Map;
import java.util.UUID;

/**
 * Ses uyeligi = kendi sinyal konusuna abonelik (spec K4). SUBSCRIBE uye yapar, UNSUBSCRIBE o
 * koltugu, DISCONNECT o soketin tum koltuklarini duser. Oda kapaliysa abonelik uyelik yaratmaz.
 * Kimlik handshake niteliklerinden okunur (PresenceListener ile ayni kaynak). Yayin transaction
 * disindadir.
 */
@Component
class VoiceRoomListener {

    private final VoiceRoomsPort rooms;
    private final SessionEventsPort events;

    VoiceRoomListener(VoiceRoomsPort rooms, SessionEventsPort events) {
        this.rooms = rooms;
        this.events = events;
    }

    @EventListener
    void onSubscribe(SessionSubscribeEvent event) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.wrap(event.getMessage());
        Identity me = Identity.of(accessor);
        if (me == null || !VoiceDestinations.inbox(me.slug(), me.participantId())
                .equals(accessor.getDestination())) {
            return;
        }
        rooms.join(me.sessionId(), me.participantId(),
                        new Seat(accessor.getSessionId(), accessor.getSubscriptionId()))
                .ifPresent(room -> events.publish(me.slug(), SessionEvent.voiceRosterChanged()));
    }

    @EventListener
    void onUnsubscribe(SessionUnsubscribeEvent event) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.wrap(event.getMessage());
        Identity me = Identity.of(accessor);
        if (me == null) {
            return;
        }
        rooms.leaveSeat(me.sessionId(), accessor.getSessionId(), accessor.getSubscriptionId())
                .ifPresent(room -> events.publish(me.slug(), SessionEvent.voiceRosterChanged()));
    }

    @EventListener
    void onDisconnect(SessionDisconnectEvent event) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.wrap(event.getMessage());
        Identity me = Identity.of(accessor);
        if (me == null) {
            return;
        }
        rooms.leaveSocket(me.sessionId(), accessor.getSessionId())
                .ifPresent(room -> events.publish(me.slug(), SessionEvent.voiceRosterChanged()));
    }

    private record Identity(UUID sessionId, UUID participantId, String slug) {

        static Identity of(SimpMessageHeaderAccessor accessor) {
            Map<String, Object> attributes = accessor.getSessionAttributes();
            if (attributes == null
                    || !(attributes.get(SessionWsHandshake.SESSION_ID) instanceof UUID sessionId)
                    || !(attributes.get(SessionWsHandshake.PARTICIPANT_ID) instanceof UUID participantId)
                    || !(attributes.get(SessionWsHandshake.SLUG) instanceof String slug)) {
                return null;
            }
            return new Identity(sessionId, participantId, slug);
        }
    }
}
```

`AbstractSubProtocolEvent` import'u kullanılmıyorsa sil.

- [ ] **Step 7: `PresenceListener`'a boş oturum kapanışını ekle**

Alan ve kurucu:

```java
    private final PresencePort presence;
    private final SessionEventsPort events;
    private final TaskScheduler scheduler;
    private final VoiceCommands voice;

    PresenceListener(PresencePort presence, SessionEventsPort events, TaskScheduler scheduler,
                     VoiceCommands voice) {
        this.presence = presence;
        this.events = events;
        this.scheduler = scheduler;
        this.voice = voice;
    }
```

`onDisconnect` son satırı `slugOf(event).ifPresent(this::ringWhenGraceExpires);` → `roomOf(event).ifPresent(this::ringWhenGraceExpires);`

`ringWhenGraceExpires` ve `slugOf` yerine:

```java
    private record Room(UUID sessionId, String slug) {
    }

    private void ringWhenGraceExpires(Room room) {
        Duration grace = presence.graceWindow();
        if (grace.isZero() || grace.isNegative()) {
            return; // pencere yoksa ilk yayin zaten dogruyu soyluyordu
        }
        scheduler.schedule(() -> {
            events.publish(room.slug(), SessionEvent.presenceChanged());
            // Katman 2 (voice spec §5): pencere gectiginde oturumda kimse kalmadiysa ses odasi kapanir.
            if (presence.presentIn(room.sessionId()).isEmpty()) {
                voice.endIfEmpty(room.sessionId());
            }
        }, Instant.now().plus(grace).plusMillis(GRACE_MARGIN_MS));
    }

    private static Optional<Room> roomOf(AbstractSubProtocolEvent event) {
        Map<String, Object> attributes =
                SimpMessageHeaderAccessor.wrap(event.getMessage()).getSessionAttributes();
        if (attributes == null
                || !(attributes.get(SessionWsHandshake.SESSION_ID) instanceof UUID sessionId)
                || !(attributes.get(SessionWsHandshake.SLUG) instanceof String slug)) {
            return Optional.empty();
        }
        return Optional.of(new Room(sessionId, slug));
    }
```

Import: `com.bumpinto.application.session.VoiceCommands`.

- [ ] **Step 8: Testleri çalıştır**

Run: `MVN_TEST VoiceOverWebSocketTest` → `Tests run: 7, Failures: 0`.
Run: `MVN_TEST PresenceOverWebSocketTest` → hâlâ yeşil.
Olası düşme sebepleri ve çözümleri:
- `@Payload Signal` null geliyor → istemci content-type göndermiyor olabilir; test `setContentType(APPLICATION_JSON)` veriyor, sunucu Jackson dönüştürücüsü `StompSessionEvents` için zaten kayıtlı. Yine null ise `Signal`'ı `Map<String,Object>` olarak alıp elle oku.
- `SessionSubscribeEvent` gelmiyor → interceptor SUBSCRIBE'ı düşürüyor: `inbox()` dizesi ile istemcinin abone olduğu dize birebir aynı mı (`/topic/session/{slug}/voice/{uuid}`).
- `theRoomClosesWhenEveryoneIsGone` düşüyor → `ShortGrace` import'u eksik ya da `PresenceListener.roomOf` `SESSION_ID`'yi okuyamıyor.

- [ ] **Step 9: Tüm backend testlerini koş**

Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true mvn -o test`
Expected: BUILD SUCCESS, önceki sayı + 28 yeni test (T1 2, T2 5, T3 4, T4 9, T5 1, T6 2, T7 7 = 30; iki tanesi mevcut testlerin zenginleştirmesi).

- [ ] **Step 10: Değişen dosyaları listele**

`VoiceDestinations.java`, `VoiceSignalController.java`, `VoiceRoomListener.java`, `WebSocketConfig.java`, `PresenceListener.java`, `VoiceOverWebSocketTest.java`. Mesaj: `feat(voice): STOMP signal relay, subscription-based membership, empty-session close`.

---

### Task 8: Belgeler ve API sözleşmesi

**Files:**
- Modify: `backend/ARCHITECTURE.md` §11 (olay tablosu + kural 5) ve §12 (`AppProps` bileşen listesine `voice`, `turn`)
- Modify: `docs/CONFIGURATION.md` §1 anahtar envanteri (3 satır)
- Modify: `docs/superpowers/plans/INDEX.md` (B-12 satırı)
- Regenerate: `frontend/shared/openapi.json`, `frontend/shared/src/api-types.ts`

- [ ] **Step 1: ARCHITECTURE.md §11 olay tablosuna üç satır ekle** (`session_decided` satırından sonra)

```markdown
| `voice_started` | `endsAt` |
| `voice_ended` | `reason` (`HOST` \| `TIME_LIMIT` \| `EMPTY`) |
| `voice_roster_changed` | — |
```

Kuralların sonuna (4'ten sonra) 5. madde:

```markdown
5. **Ses kanalı tek istisnadır.** İstemci SEND'i yalnız `/app/sessions/{slug}/voice/signal`
   adresine (kendi slug'ı) geçer; `VoiceSignalController` gövdeyi hedefin özel konusuna
   `/topic/session/{slug}/voice/{participantId}` `from` damgasıyla iletir, saklamaz. Özel konuya
   yalnız sahibi abone olabilir ve **abone olmak ses üyeliğidir** (`VoiceRoomListener`):
   UNSUBSCRIBE koltuğu, DISCONNECT soketin tüm koltuklarını düşürür. Oda `InMemoryVoiceRooms`'da
   yaşar (presence ile aynı süreç içi borç): 2 saatlik sert sınır `TaskScheduler`'da, TURN kimliği
   kalan süre kadar üretilir (`CloudflareTurnCredentials`; ayarsızsa yalnız STUN, `relay=false`).
   Grace bitiş zilinde oturumda kimse kalmadıysa `PresenceListener` odayı kapatır.
   Karar dokümanı: `docs/superpowers/specs/2026-09-06-voice-chat-design.md`.
```

§2/§3'teki paket listesine (`adapter/out/presence`, `adapter/out/turn`) bir satır düşür: "`turn/` Cloudflare TURN kimliği". §12'deki `AppProps` bileşen sayımına `voice` (süre) ve `turn` (Cloudflare anahtarı, `api-token` sır) eklenir.

`docs/CONFIGURATION.md` §1 "Anahtar envanteri" tablosuna üç satır (mevcut satır biçimiyle): `VOICE_MAX_DURATION` (sır değil, varsayılan `PT2H`, ses odası sert sınırı) · `CLOUDFLARE_TURN_KEY_ID` (sır değil; Cloudflare Dashboard → Realtime → TURN keys) · `CLOUDFLARE_TURN_API_TOKEN` (**sır**, K8s Secret; boşsa yalnız STUN, `relay=false`).

- [ ] **Step 2: INDEX.md B tablosundaki B-12 satırını güncelle** — `Durum` `ready` → `done`, `Son adım` → "Task 8/8", `Not`'a test sayısını ekle. Satır yoksa (INDEX'e plan yazılırken eklendi, olmalı) şu satırı B-11'den sonra ekle:

```markdown
| B-12 | **Sesli sohbet backend** — ses odası (süreç içi, 2h sert sınır), 3 REST ucu (`/voice`, `/voice/credentials`), STOMP sinyal relay (`/app/.../voice/signal` → özel konu), abonelikle üyelik, boş oturumda kapanış, Cloudflare TURN kısa ömürlü kimlik (STUN'a düşer), `SessionView.voice` + `inVoice` | `2026-09-06-plan28-voice-backend.md` | Plan 28 | ready | B-8 ✓ | — | Spec `2026-09-06-voice-chat-design.md` K1–K12. `AppProps` +2 kayıt (11 test kurucusu), `requireHost` paylaşıldı. Cloudflare TURN anahtarı env'de yoksa `relay=false` (yan özellik, fail-open bilinçli). W-11 bu planın `openapi.json`'ını bekler |
```

- [ ] **Step 3: `openapi.json` ve `api-types.ts`'i yeniden üret** — `:8060`'ta kullanıcının kendi JVM'i çalışıyor olabilir, **hiçbir süreci öldürme**; başka portta kaldır:

```bash
cd /Users/mehmetserefoglu/projects/bumpinto && docker compose up -d postgres
cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 \
  mvn -o spring-boot:run -Dspring-boot.run.arguments=--server.port=8061 > /tmp/bumpinto-8061.log 2>&1 &
echo $! > /tmp/bumpinto-8061.pid
until curl -sf http://localhost:8061/v3/api-docs > /dev/null; do sleep 2; done
curl -sf http://localhost:8061/v3/api-docs -o ../frontend/shared/openapi.json
cd .. && source ./init-nvm.sh && pnpm --filter @bumpinto/shared generate
kill $(cat /tmp/bumpinto-8061.pid)
```

Doğrulama: `grep -c "VoiceCredentialsResponse\|inVoice\|VoiceDto" frontend/shared/src/api-types.ts` ≥ 3.
`mvn spring-boot:run` `-o` ile açılmazsa (plugin yerelde yok) `-o`'suz tek sefer koş.

- [ ] **Step 4: Web'in hâlâ derlendiğini doğrula**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto && source ./init-nvm.sh && pnpm --filter @bumpinto/web exec tsc -b
```

Expected: hata yok (yeni alanlar opsiyonel/ek; mevcut kod etkilenmez). Hata varsa nedeni `ParticipantDto`/`SessionView` üreteci değil, W-11'de ele alınır; burada sadece raporla.

- [ ] **Step 5: Değişen dosyaları listele**

`ARCHITECTURE.md`, `INDEX.md`, `openapi.json`, `api-types.ts`. Mesaj: `docs(voice): events table, architecture note, regenerated API types`.

---

## Plan öz-incelemesi

**Spec kapsamı (§6 backend):** `VoiceRoomsPort`/`InMemoryVoiceRooms` T1–T2 · `TurnCredentialsPort`/`CloudflareTurnCredentials` T3 · `VoiceCommands` kapıları, idempotentlik, `requireHost` paylaşımı, zamanlayıcı adapterde/olay uygulamada T4 · `SessionView.voice`, `inVoice` T5 · 3 REST + Bruno + DTO maskesi T6 · `WebSocketConfig` (`/app`, SEND tek adres, SUBSCRIBE özel konu, 32 KB), relay (`from` damgası, 16 KB, aynı oda), `VoiceRoomListener`, `PresenceListener` katman 2 T7 · olay tablosu, ARCHITECTURE, `openapi.json` T8 · `AppProps.Voice/Turn` + yml T1 · K11 STUN'a düşme T3/T4 · K8 süreç içi T2. Boşluk yok.

**Yer tutucu taraması:** "TBD/TODO/uygun hata işleme" yok; her adımda kod var.

**Tip tutarlılığı:** `VoiceRoomsPort.open(UUID, String, Instant, Runnable)` T1 = T2 = T4 (FakeVoiceRooms) = T5 test · `join(UUID, UUID, Seat)` · `leaveSeat(UUID, String, String)` / `leaveSocket(UUID, String)` T1 = T2 = T7 listener · `VoiceCommands.Credentials(IceConfig, Instant)` T4 = T6 · `IceConfig.IceServer(urls, username, credential)` T1 = T3 = T6 · `SessionViewAssembler(PresencePort, VoiceRoomsPort)` T5 = T6 mock · `SessionEvent.voiceEnded(EndReason)` T1 = T4 (`domain/voice/EndReason`, inceleme sonrası) · `VoiceDestinations.inbox/signal/sessionTopic` T7 iç tutarlı, test aynı dizeleri elle kurar (bilinçli: test sözleşmeyi bağımsız doğrular).

---

## İnceleme ekleri (2026-09-06, kod bloklarından sapmalar; ağaç doğrudur)

- T1: `domain/voice/EndReason` enum'u; `SessionEvent.voiceEnded(EndReason)`; `IceConfig` defansif kopyalar ve maskeli `IceServer.toString`; `VoiceRoomsPort` metot başına sözleşme metni.
- T2: `InMemoryVoiceRooms` `Predicate`+`AtomicReference` ile `update`; tahliye dinleyicisi zamanlayıcıyı iptal eder; test kurucusu `(Clock, TaskScheduler, maximumSize)`; Caffeine `executor(Runnable::run)`.
- T3: `CloudflareTurnCredentials` `RuntimeException` yakalar, url'siz sunucuyu eler, boş listede WARN, 2 sn istek zaman aşımı.
- T4: `SessionGates.requireHost` (SessionCommands/DeckFlow/VoiceCommands); `endsAt = min(now+max, session.expiresAt)`; 5 sn'den az ömürlü oda reddi; `endIfStillScheduled` bayat zamanlayıcı koruması; `endIfEmpty` `PresencePort` ile boşluğu kendi kontrol eder.
- T6: Bruno `sessions/folder.yml` klasör düzeyinde `X-Participant-Token`; docs metinleri.
- T7: `VoiceInboundGuard` ayrı sınıf, soket başına bucket4j bütçeleri (ses kutusu SUBSCRIBE/UNSUBSCRIBE 20/dk, SEND 240/dk); `ServletServerContainerFactoryBean` 32 KB (MOCK ortamda no-op); `@MessageExceptionHandler`; `candidate` ≤ 16 alan + değer uzunluğu; roster olayı yalnız üye kümesi değişince; `VoiceOverWebSocketTest` 10 senaryo.
