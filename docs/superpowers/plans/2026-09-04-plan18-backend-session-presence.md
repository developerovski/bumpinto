# Plan 18: Backend — Oturum presence, kimlikli WebSocket ve giriş kapıları (B-8)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Kimlik:** `B-8` · İz: Backend · Durum INDEX'te tutulur (bu plan INDEX'i **düzenlemez**).

**Goal:** `docs/superpowers/specs/2026-09-04-session-presence-design.md`'nin backend kapsamını uygulamak: WebSocket handshake'i kimlikli hâle getirmek, süreç içi bir presence kaydı tutmak, `SessionView`/`SessionPreview`'a çevrimiçilik alanları eklemek ve iki giriş kapısını (geç katılım, boş oturumda shuffle) kapatmak.

**Architecture:** `/ws` uç noktası `/api/sessions/{slug}/ws` altına taşınır — katılımcı çerezinin path'i **zaten** orası olduğu için `ParticipantTokenFilter` hiç değişmeden handshake'i kimliklendirir. Bir `HandshakeInterceptor` slug/participantId/sessionId'yi WS oturum niteliklerine yazar; `PresenceListener` connect/disconnect olaylarını `PresencePort`'a çevirir. Presence süreç içi (`InMemoryPresence`, Caffeine + 45 sn grace) ve **yalnız** okuma alanlarını (`online`, `hostOnline`) ve `shuffle` kapısını besler; geri alınamaz kararlar (deste bitişi) veriye bakmaya devam eder.

**Tech Stack:** Java 25 · Spring Boot 4.1 (spring-websocket 7.0.8, STOMP + SimpleBroker) · Caffeine · JUnit 5 + AssertJ + Testcontainers · ArchUnit.

**Öncül:** `B-7 done` ✓. **W-7 (plan19) bu planın çıktısına bağlıdır** — `pnpm codegen` ancak T7 bittikten sonra doğru tipleri üretir.

**Testleri çalıştırma (env öneki ZORUNLU — ARCHITECTURE §15):**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto/backend
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test
```

Tek sınıf için `-Dtest=SınıfAdı`, birkaç sınıf için `-Dtest='A,B'` — Surefire'da `+` sınıf değil METOT ayırıcısıdır ve sessizce "No tests matching pattern" verir. `Unresolved compilation problem` görürsen Spring'de sebep arama, `mvn -o clean test` koş (ARCHITECTURE §15).

**Git kuralı:** Bu repoda ajan git yazma işlemi yapmaz (AGENTS.md). Her görevin sonundaki "Commit" adımı **kullanıcıya bırakılır**; ajan yalnız hangi dosyaların bir arada commit edileceğini yazar.

---

## Dosya haritası

| Dosya | Sorumluluk |
|---|---|
| **Create** `domain/port/PresencePort.java` | "Kim şu an bağlı" sorusunun arayüzü; domain saf kalır (yalnız `java..`) |
| **Create** `adapter/out/presence/InMemoryPresence.java` | Süreç içi kayıt: bağlantı sayacı + 45 sn grace, Caffeine ile kendini budar |
| **Create** `adapter/in/web/SessionWsHandshake.java` | Handshake'te slug/participantId/sessionId'yi WS niteliklerine yazar; kimliksizi reddeder |
| **Create** `adapter/in/web/PresenceListener.java` | `SessionConnectedEvent`/`SessionDisconnectEvent` → port + `presence_changed` |
| **Create** `adapter/out/presence/InMemoryPresenceTest.java` | Grace penceresi ve çoklu sekme davranışı (saf birim, sahte `Clock`) |
| **Modify** `adapter/in/web/WebSocketConfig.java` | Uç nokta yolu + handshake interceptor + abonelik yetkilendirmesi |
| **Modify** `infra/security/SecurityConfig.java` | `/ws/**` permitAll ve `/ws/**` CORS kaydı kalkar |
| **Modify** `infra/security/RateLimitFilter.java` | Handshake için ayrı `ws` politikası (30/dk), `api`'den önce |
| **Modify** `domain/port/SessionEvent.java` | `presenceChanged()` fabrikası |
| **Modify** `adapter/in/web/ApiDtos.java` | `ParticipantDto.online`, `SessionPreview.hostOnline` |
| **Modify** `adapter/in/web/SessionViewAssembler.java` | `PresencePort` enjeksiyonu; iki yeni alanı doldurur |
| **Modify** `application/session/SessionCommands.java` | Geç katılım kapısı — **koltuk kurtarmadan sonra** |
| **Modify** `application/deck/DeckFlow.java` | `shuffle` presence kapısı |
| **Modify** `support/FakeStores.java` | `FakePresence` |
| **Modify** `.infra/bumpinto-collection/sessions/{get-session,preview}.yml` | Yeni alanların `docs:` açıklaması |
| **Modify** `backend/ARCHITECTURE.md` | §8 (WS kimliği), §11 (olaylar + presence), §11.1 sınırlar |

---

## Sözleşme (W-7 bunu okur)

| Alan | Tip | Kural |
|---|---|---|
| `ParticipantDto.online` | `boolean` | Bağlı **ya da** son 45 sn içinde kopmuş. `manual=true` satırlarda daima `false`. |
| `SessionPreview.hostOnline` | `boolean` | Host satırı `online` ise `true`; host satırı yoksa `false`. |
| `presence_changed` | STOMP olayı, gövde `{}` | İstemci için "tazele" zili — `location_updated` ile aynı desen. |
| WS uç noktası | `/api/sessions/{slug}/ws` | Kimliksiz handshake **401**. |
| `POST /{slug}/participants` | 409 | Yeni koltuk `SWIPING`/`RUNOFF`/`DECIDED`'da açılmaz. Var olan koltuk her durumda geri döner. |
| `POST /{slug}/shuffle` | 409 | Mevcut oy veren < 2. Gövde mesajı: `need at least 2 participants present to start the deck` |

---

## Task 1: `PresencePort` + `InMemoryPresence`

**Files:**
- Create: `backend/src/main/java/com/bumpinto/domain/port/PresencePort.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/presence/InMemoryPresence.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/out/presence/InMemoryPresenceTest.java`

- [ ] **Step 1: Portu yaz**

`domain/port/PresencePort.java`:

```java
package com.bumpinto.domain.port;

import java.util.Set;
import java.util.UUID;

/**
 * "Kim su an bu oturumda" — uyelik DEGIL, canlilik. Uyelik DB satiridir ve silinmez; presence
 * yalnizca acik bir soketin varligidir ve surec icinde yasar.
 */
public interface PresencePort {

    void arrived(UUID sessionId, UUID participantId);

    void left(UUID sessionId, UUID participantId);

    /** Bagli olan YA DA grace penceresi icinde kopmus katilimcilar. */
    Set<UUID> presentIn(UUID sessionId);
}
```

- [ ] **Step 2: Başarısız testi yaz**

`adapter/out/presence/InMemoryPresenceTest.java`:

```java
package com.bumpinto.adapter.out.presence;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class InMemoryPresenceTest {

    /** Grace penceresi zaman ISTER; Clock.fixed ile olculemez, Thread.sleep ile olculmemeli. */
    static final class TickingClock extends Clock {
        Instant now = Instant.parse("2026-09-04T10:00:00Z");

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

    TickingClock clock;
    InMemoryPresence presence;
    UUID session;
    UUID ayse;
    UUID mehmet;

    @BeforeEach
    void setUp() {
        clock = new TickingClock();
        presence = new InMemoryPresence(clock);
        session = UUID.randomUUID();
        ayse = UUID.randomUUID();
        mehmet = UUID.randomUUID();
    }

    @Test
    void connectedParticipantIsPresent() {
        presence.arrived(session, ayse);

        assertThat(presence.presentIn(session)).containsExactly(ayse);
    }

    @Test
    void shortDisconnectStaysPresentWithinGrace() {
        presence.arrived(session, ayse);
        presence.left(session, ayse);
        clock.advance(Duration.ofSeconds(30));

        assertThat(presence.presentIn(session)).containsExactly(ayse);
    }

    @Test
    void staleDisconnectDropsOutAfterGrace() {
        presence.arrived(session, ayse);
        presence.left(session, ayse);
        clock.advance(Duration.ofSeconds(46));

        assertThat(presence.presentIn(session)).isEmpty();
    }

    @Test
    void closingOneOfTwoTabsKeepsTheSeatPresent() {
        presence.arrived(session, ayse);
        presence.arrived(session, ayse);
        presence.left(session, ayse);
        clock.advance(Duration.ofHours(2));

        assertThat(presence.presentIn(session)).containsExactly(ayse);
    }

    @Test
    void presenceIsScopedToItsOwnSession() {
        UUID other = UUID.randomUUID();
        presence.arrived(session, ayse);
        presence.arrived(other, mehmet);

        assertThat(presence.presentIn(session)).containsExactly(ayse);
        assertThat(presence.presentIn(other)).containsExactly(mehmet);
    }
}
```

- [ ] **Step 3: Testi çalıştır, DERLENMEDİĞİNİ gör**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto/backend
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test -Dtest=InMemoryPresenceTest
```

Beklenen: `COMPILATION ERROR` — `InMemoryPresence` yok.

- [ ] **Step 4: Uygulamayı yaz**

`adapter/out/presence/InMemoryPresence.java`:

```java
package com.bumpinto.adapter.out.presence;

import com.bumpinto.domain.port.PresencePort;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Surec ici presence. Cok pod'da paylasilmaz, restart'ta bosalir — ProviderQuotaCache ile ayni
 * sinif borc (ARCHITECTURE §11).
 *
 * <p>Sayac tutulur, bayrak degil: ayni kisi iki sekme acabilir ve birinin kapanmasi onu
 * cevrimdisi yapmamalidir.
 *
 * <p>Dis harita Caffeine: oturum basina bos bir harita sonsuza kadar birikmesin diye erisimden
 * 25 saat sonra (oturum TTL'i 24 saat) dusulur. Ic harita okuma sirasinda budanir — ayri bir
 * zamanlanmis is acmaya degmedi.
 */
@Component
public class InMemoryPresence implements PresencePort {

    /** Kopma toleransi: sayfa yenileme (~1 sn) ve kisa ag kesintisi kisiyi cevrimdisi yapmaz. */
    static final Duration GRACE = Duration.ofSeconds(45);

    private record Seat(int openConnections, Instant lastSeenAt) {
    }

    private final Cache<UUID, Map<UUID, Seat>> seats = Caffeine.newBuilder()
            .maximumSize(10_000)
            .expireAfterAccess(Duration.ofHours(25))
            .build();

    private final Clock clock;

    public InMemoryPresence(Clock clock) {
        this.clock = clock;
    }

    @Override
    public void arrived(UUID sessionId, UUID participantId) {
        seats.get(sessionId, key -> new ConcurrentHashMap<>())
                .compute(participantId, (key, seat) -> new Seat(
                        seat == null ? 1 : seat.openConnections() + 1, clock.instant()));
    }

    @Override
    public void left(UUID sessionId, UUID participantId) {
        Map<UUID, Seat> session = seats.getIfPresent(sessionId);
        if (session == null) {
            return;
        }
        session.computeIfPresent(participantId, (key, seat) -> new Seat(
                Math.max(0, seat.openConnections() - 1), clock.instant()));
    }

    @Override
    public Set<UUID> presentIn(UUID sessionId) {
        Map<UUID, Seat> session = seats.getIfPresent(sessionId);
        if (session == null) {
            return Set.of();
        }
        Instant floor = clock.instant().minus(GRACE);
        Set<UUID> present = new HashSet<>();
        session.forEach((participantId, seat) -> {
            if (seat.openConnections() > 0 || seat.lastSeenAt().isAfter(floor)) {
                present.add(participantId);
            } else {
                // Kosullu silme: arada yeniden baglanmis bir koltugu dusurmez.
                session.remove(participantId, seat);
            }
        });
        return Set.copyOf(present);
    }
}
```

- [ ] **Step 5: Testi çalıştır, GEÇTİĞİNİ gör**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto/backend
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test -Dtest=InMemoryPresenceTest
```

Beklenen: `Tests run: 5, Failures: 0, Errors: 0`.

- [ ] **Step 6: ArchUnit'in hâlâ yeşil olduğunu doğrula**

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test -Dtest=HexagonalArchitectureTest
```

Beklenen: PASS. (`PresencePort` yalnız `java..`'ya bağımlı; `InMemoryPresence` katman kökünde değil.)

- [ ] **Step 7: Commit — kullanıcıya bırak**

Bir arada: `domain/port/PresencePort.java`, `adapter/out/presence/InMemoryPresence.java`, `adapter/out/presence/InMemoryPresenceTest.java`. Önerilen mesaj: `feat(presence): add in-memory presence registry with 45s grace`.

---

## Task 2: Kimlikli handshake — uç noktayı oturum yoluna taşı

**Files:**
- Create: `backend/src/main/java/com/bumpinto/adapter/in/web/SessionWsHandshake.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/WebSocketConfig.java`
- Modify: `backend/src/main/java/com/bumpinto/infra/security/SecurityConfig.java` (satır 50, 145)
- Modify: `backend/src/main/java/com/bumpinto/infra/security/RateLimitFilter.java` (`defaultPolicies`)

- [ ] **Step 1: Handshake interceptor'ı yaz**

`adapter/in/web/SessionWsHandshake.java`:

```java
package com.bumpinto.adapter.in.web;

import com.bumpinto.infra.security.ParticipantPrincipal;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Handshake artik KIMLIKLI: istek servlet zincirinden gectigi icin ParticipantTokenFilter
 * principal'i zaten kurmustur. Burada yapilan tek sey kimligi WS oturum niteliklerine yazmaktir —
 * kopma aninda ortada bir HTTP istegi YOKTUR, katilimciyi ve slug'i baska turlu bilemeyiz.
 *
 * <p>false donmek handshake'i reddeder. SecurityConfig kimliksiz istegi zaten 401'ler; bu ikinci
 * kapi, ileride yol yanlislikla permitAll'a alinirsa kanalin acilmamasi icindir (fail-closed).
 */
class SessionWsHandshake implements HandshakeInterceptor {

    static final String SLUG = "slug";
    static final String PARTICIPANT_ID = "participantId";
    static final String SESSION_ID = "sessionId";

    private static final Pattern PATH = Pattern.compile("^/api/sessions/([^/]+)/ws$");

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler handler, Map<String, Object> attributes) {
        Matcher path = PATH.matcher(request.getURI().getPath());
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!path.matches() || auth == null
                || !(auth.getPrincipal() instanceof ParticipantPrincipal me)) {
            return false;
        }
        attributes.put(SLUG, path.group(1));
        attributes.put(PARTICIPANT_ID, me.participantId());
        attributes.put(SESSION_ID, me.sessionId());
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler handler, Exception exception) {
    }
}
```

- [ ] **Step 2: `WebSocketConfig`'i güncelle**

`adapter/in/web/WebSocketConfig.java` — sınıf javadoc'unun "Handshake KİMLİKSİZ'dir…" ile başlayan iki paragrafını **sil** ve yerine şunu koy:

```java
 * <p>Handshake KİMLİKLİDİR: uç nokta {@code /api/sessions/{slug}/ws} altındadır ve katılımcı
 * çerezinin path'i tam olarak {@code /api/sessions/{slug}} olduğu için tarayıcı çerezi handshake'e
 * kendiliğinden gönderir. İstek servlet zincirinden geçer, {@code ParticipantTokenFilter} kimliği
 * kurar, {@code SecurityConfig.anyRequest().authenticated()} kimliksizi 401'ler.
 * {@link SessionWsHandshake} kimliği WS oturum niteliklerine yazar.
 *
 * <p>Abonelik de yetkilendirilir: kişi yalnız KENDİ oturumunun konusuna abone olabilir. Önceden
 * slug'ı bilen herkes (curl/wscat dahil) kanalı dinleyebiliyordu; şimdi geçerli bir katılımcı
 * çerezi gerekiyor.
```

`configureClientInboundChannel` ve `registerStompEndpoints` metotlarını şununla değiştir:

```java
    /** Yalniz kendi oturumunun aboneligi gecer; istemcinin yayin yapmasi sessizce dusurulur. */
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                SimpMessageType type = SimpMessageHeaderAccessor.getMessageType(message.getHeaders());
                if (type == SimpMessageType.MESSAGE) {
                    return null;
                }
                if (type == SimpMessageType.SUBSCRIBE && !ownTopic(message)) {
                    return null;
                }
                return message;
            }
        });
    }

    private static boolean ownTopic(Message<?> message) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.wrap(message);
        Map<String, Object> attributes = accessor.getSessionAttributes();
        Object slug = attributes == null ? null : attributes.get(SessionWsHandshake.SLUG);
        return slug != null && ("/topic/session/" + slug).equals(accessor.getDestination());
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // SecurityConfig.corsConfigurationSource ile AYNI kaynak: iki liste ayri yasarsa biri
        // sikilasirken digeri acik kalir. Liste yoksa hicbir origin kabul edilmez (fail-closed).
        List<String> origins = props.cors() == null ? List.of() : props.cors().allowedOrigins();
        registry.addEndpoint("/api/sessions/*/ws")
                .setAllowedOriginPatterns(origins.toArray(String[]::new))
                .addInterceptors(new SessionWsHandshake());
    }
```

Import ekle: `java.util.Map`.

- [ ] **Step 3: `SecurityConfig`'i güncelle**

`infra/security/SecurityConfig.java` satır 50'de `/ws/**` girdisini kaldır:

```java
                .requestMatchers("/v3/api-docs/**", "/error").permitAll()
```

`corsConfigurationSource` içindeki `/ws/**` kaydını sil — hemen üstündeki `/api/**` kaydı yeni yolu zaten kapsıyor:

```java
        source.registerCorsConfiguration("/api/**", config);
        source.registerCorsConfiguration("/ws/**", config);   // ← YALNIZ BU SATIRI SİL
```

- [ ] **Step 4: `RateLimitFilter`'a `ws` politikası ekle**

`infra/security/RateLimitFilter.defaultPolicies()` — `api` satırından **önce**:

```java
                // Handshake kendi kovasinda: ortak NAT arkasindaki bir grup + reconnect firtinasi
                // 120/dk'lik genis `api` kovasini yiyip normal istekleri de 429'a dusuruyordu.
                new Policy("ws", "GET", Pattern.compile("^/api/sessions/[^/]+/ws$"), 30),
```

- [ ] **Step 5: Handshake güvenlik testini `ApiHappyPathTest`'e ekle**

Spec §8 bu testi `WebSecuritySliceTest`'te öngörmüştü; `@WebMvcTest` slice'ı `WebSocketConfig`'i yüklemediği için oraya konsaydı kimlikli istek de 404 dönerdi ve test hiçbir şey kanıtlamazdı. Tam context'i olan `ApiHappyPathTest` doğru yer.

`ApiHappyPathTest` sonuna yeni bir test metodu (dosyadaki `mvc`, `json`, `JSON`, `google`, `ParticipantTokenFilter.HEADER` yardımcıları zaten alan olarak mevcut):

```java
    /**
     * WS handshake kimlik ISTER. Kimliksiz istek guvenlik zincirinde 401 alir; kimlikli istek
     * zinciri gecer ve Spring'in handshake handler'inda "Upgrade yok" diye 400 olur — yani
     * yetkilendirme degil protokol hatasi. Bu iki kod arasindaki fark kapinin kanitidir.
     */
    @Test
    void webSocketHandshakeRequiresAParticipantIdentity() throws Exception {
        when(google.verify("gid-ws"))
                .thenReturn(new GoogleIdVerifier.GoogleUser("ws@bumpinto.test", "Mehmet"));
        String accessToken = json.readTree(mvc.perform(post("/api/auth/google")
                        .contentType(JSON).content("{\"idToken\":\"gid-ws\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("accessToken").asString();
        JsonNode created = json.readTree(mvc.perform(post("/api/sessions")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(JSON)
                        .content("{\"activityType\":\"COFFEE\",\"lat\":51.6978,\"lng\":5.3037,"
                                + "\"displayName\":\"Mehmet\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString());
        String slug = created.get("slug").asString();
        String hostToken = created.get("participantToken").asString();

        mvc.perform(get("/api/sessions/" + slug + "/ws"))
                .andExpect(status().isUnauthorized());

        mvc.perform(get("/api/sessions/" + slug + "/ws")
                        .header(ParticipantTokenFilter.HEADER, hostToken))
                .andExpect(status().isBadRequest());
    }
```

- [ ] **Step 6: Testleri çalıştır**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto/backend
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test -Dtest='ApiHappyPathTest,WebSecuritySliceTest'
```

Ardından **tam tur**: `mvn -o clean test`. Güvenlik duruşunu değiştiren bir görev seçili sınıflarla doğrulanmaz — bu adım ilk yazımda atlandığı için `SecurityPolicyTest`'in dört testinin kırıldığı iki görev sonra fark edildi (bkz. Task 2b).

Beklenen: PASS. Kimlikli istek 400 yerine 404 dönüyorsa STOMP endpoint deseni eşleşmemiş demektir — spec §3'teki yedek plana (ticket ucu) geçmeden önce `registry.addEndpoint("/api/sessions/*/ws")` yolunu ve `WebSocketHandlerMapping` sırasını doğrula.

- [ ] **Step 7: Commit — kullanıcıya bırak**

Bir arada: `SessionWsHandshake.java`, `WebSocketConfig.java`, `SecurityConfig.java`, `RateLimitFilter.java`, `ApiHappyPathTest.java`. Önerilen mesaj: `feat(ws): move endpoint under session path and authenticate the handshake`.

---

## Task 2b: `SecurityPolicyTest`'i yeni WS duruşuna göre güncelle

**Neden plan sonradan büyüdü:** Task 2'nin test adımı yalnız üç sınıf koşuyordu; `SecurityPolicyTest`
(WS güvenlik duruşunu kilitleyen dosya) o listede yoktu ve dört testi kırıldı. **Ders: güvenlik
duruşunu değiştiren her görev `mvn -o clean test` ile tam tur koşmalı**, seçili sınıflarla değil.

Kırılan dördü de DOĞRU kırıldı — eski duruşu (kimliksiz handshake, `/ws` permitAll) sabitliyorlardı.

**Files:**
- Modify: `backend/src/test/java/com/bumpinto/infra/security/SecurityPolicyTest.java` (yalnız bu)

- [ ] **Step 1: `publicEndpointsNeedNoCredentials`** — `GET /ws` satırı kalkar, yerine kimliksiz
  `GET /api/sessions/x7k2m/ws`'in uygulamaya **ulaşamadığı** (401) sabitlenir.
- [ ] **Step 2: İki origin testi** — `setAllowedOriginPatterns(...)` mock'u artık `registration`
  döndürmeli (zincire `addInterceptors` eklendi, aksi hâlde NPE); `addEndpoint("/ws")` beklentisi
  `/api/sessions/*/ws` olur; **yeni** bir `verify(registration).addInterceptors(any(HandshakeInterceptor.class))`
  eklenir ki kimlik interceptor'ı silinirse test kırılsın.
- [ ] **Step 3: `liveChannelDropsClientPublishedFrames`** — `stompFrame` yardımcısı handshake
  niteliği (`slug`) taşıyabilmeli. Beş kural sabitlenir: MESSAGE düşer · kendi konusuna SUBSCRIBE
  geçer · **yabancı konuya SUBSCRIBE düşer** (yeni güvenlik özelliği) · niteliksiz SUBSCRIBE düşer
  (fail-closed) · CONNECT geçer.
- [ ] **Step 4: Yeni iddianın ısırdığını kanıtla** — `WebSocketConfig.preSend`'deki SUBSCRIBE
  kontrolü geçici olarak yorumlanır, testin FAIL ettiği görülür, dosya birebir geri alınır.
- [ ] **Step 5: `mvn -o clean test`** — tam tur.
- [ ] **Step 6: Commit — kullanıcıya bırak.** Önerilen mesaj: `test(ws): lock the authenticated handshake and subscription scoping`.

---

## Task 3: `PresenceListener` — connect/disconnect → port + olay

**Files:**
- Create: `backend/src/main/java/com/bumpinto/adapter/in/web/PresenceListener.java`
- Modify: `backend/src/main/java/com/bumpinto/domain/port/SessionEvent.java`

- [ ] **Step 1: `SessionEvent.presenceChanged()` ekle**

`domain/port/SessionEvent.java` — `locationUpdated()`'ın hemen altına:

```java
    /**
     * Biri geldi ya da koptu. Govde BOS: kanal artik kimlikli ama yuk tasimanin degeri yok —
     * istemci bunu yalnizca "tazele" zili olarak kullanir (locationUpdated ile ayni desen).
     */
    public static SessionEvent presenceChanged() {
        return new SessionEvent("presence_changed", Map.of());
    }
```

- [ ] **Step 2: Dinleyiciyi yaz**

`adapter/in/web/PresenceListener.java`:

```java
package com.bumpinto.adapter.in.web;

import com.bumpinto.domain.port.PresencePort;
import com.bumpinto.domain.port.SessionEvent;
import com.bumpinto.domain.port.SessionEventsPort;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Map;
import java.util.UUID;
import java.util.function.BiConsumer;

/**
 * WS yasam dongusunu presence'a cevirir. Kimlik handshake'te niteliklere yazilmistir
 * ({@link SessionWsHandshake}); kopma aninda ortada istek olmadigi icin tek kaynak orasidir.
 *
 * <p>Yayin transaction disindadir: StompSessionEvents aktif transaction yoksa dogrudan gonderir.
 */
@Component
class PresenceListener {

    private final PresencePort presence;
    private final SessionEventsPort events;

    PresenceListener(PresencePort presence, SessionEventsPort events) {
        this.presence = presence;
        this.events = events;
    }

    @EventListener
    void onConnected(SessionConnectedEvent event) {
        apply(SimpMessageHeaderAccessor.wrap(event.getMessage()).getSessionAttributes(),
                presence::arrived);
    }

    @EventListener
    void onDisconnect(SessionDisconnectEvent event) {
        apply(SimpMessageHeaderAccessor.wrap(event.getMessage()).getSessionAttributes(),
                presence::left);
    }

    private void apply(Map<String, Object> attributes, BiConsumer<UUID, UUID> change) {
        if (attributes == null) {
            return;
        }
        if (!(attributes.get(SessionWsHandshake.SESSION_ID) instanceof UUID sessionId)
                || !(attributes.get(SessionWsHandshake.PARTICIPANT_ID) instanceof UUID participantId)
                || !(attributes.get(SessionWsHandshake.SLUG) instanceof String slug)) {
            return;
        }
        change.accept(sessionId, participantId);
        events.publish(slug, SessionEvent.presenceChanged());
    }
}
```

- [ ] **Step 3: Derle**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto/backend
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 mvn -o compile
```

Beklenen: `BUILD SUCCESS`.

- [ ] **Step 4: Elle doğrula (bu görev için birim testi yazılmaz)**

`SessionConnectedEvent` üretmek gerçek bir WS istemcisi ister; taklit edilmiş bir `Message` üzerinden yazılacak test yalnızca Spring'in kendi sarmalayıcısını test ederdi (AGENTS.md "test çöpü" kuralı). Bunun yerine T8'deki elle duman testinde doğrulanır.

- [ ] **Step 5: Commit — kullanıcıya bırak**

Bir arada: `PresenceListener.java`, `SessionEvent.java`. Önerilen mesaj: `feat(presence): track websocket connect and disconnect`.

---

## Task 4: `online` ve `hostOnline` alanları

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/ApiDtos.java` (satır 128-132, 167-171)
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/SessionViewAssembler.java`
- Test: `backend/src/test/java/com/bumpinto/adapter/in/web/SessionViewAssemblerTest.java`

- [ ] **Step 1: Başarısız testi yaz**

`SessionViewAssemblerTest` — sınıfın en üstündeki alan satırını değiştir:

```java
    FakeStores.FakePresence presence = new FakeStores.FakePresence();
    SessionViewAssembler assembler = new SessionViewAssembler(presence);
```

(`FakePresence` Task 6 Step 1'de eklenir; bu görevi Task 6'dan sonra yapıyorsan hazırdır, öncesinde yapıyorsan önce o adımı uygula.)

Dosyanın sonuna iki test ekle:

```java
    @Test
    void onlineIsTrueOnlyForParticipantsWithAnOpenSocket() {
        Session s = session(SessionType.GROUP);
        Participant here = person(s.id(), new GeoPoint(51.69, 5.30), "Den Bosch", false);
        Participant gone = person(s.id(), new GeoPoint(51.38, 5.71), "Someren", false);
        presence.arrived(s.id(), here.id());

        ApiDtos.SessionView view = assembler.toView(
                new SessionQueries.SessionSnapshot(s, List.of(here, gone), List.of(), Map.of(),
                        Map.of(), Map.of()), null);

        assertThat(view.participants()).extracting(ApiDtos.ParticipantDto::id,
                        ApiDtos.ParticipantDto::online)
                .containsExactlyInAnyOrder(tuple(here.id(), true), tuple(gone.id(), false));
    }

    @Test
    void previewReportsWhetherTheHostIsOnline() {
        Session s = session(SessionType.GROUP);
        Participant host = new Participant(UUID.randomUUID(), s.id(), "Mehmet",
                new GeoPoint(51.69, 5.30), true, null, false, "Den Bosch", null);
        SessionQueries.SessionSnapshot snap = new SessionQueries.SessionSnapshot(s,
                List.of(host), List.of(), Map.of(), Map.of(), Map.of());

        assertThat(assembler.toPreview(snap).hostOnline()).isFalse();

        presence.arrived(s.id(), host.id());
        assertThat(assembler.toPreview(snap).hostOnline()).isTrue();
    }
```

Import ekle: `com.bumpinto.support.FakeStores`, `static org.assertj.core.api.Assertions.tuple`.

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto/backend
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test -Dtest=SessionViewAssemblerTest
```

Beklenen: `COMPILATION ERROR` — `online()`, `hostOnline()` ve tek argümanlı yapıcı yok.

- [ ] **Step 3: DTO'lara alanları ekle**

`ApiDtos.ParticipantDto`:

```java
    public record ParticipantDto(UUID id, String displayName, boolean host, boolean hasLocation,
                                 boolean deckDone, boolean manual, String locationLabel,
                                 GeoPointDto approxLocation, TravelMode travelMode,
                                 Integer midpointMinutes,
                                 /** Acik soketi var ya da 45 sn icinde koptu; manual satirlarda daima false. */
                                 boolean online) {
    }
```

`ApiDtos.SessionPreview`:

```java
    public record SessionPreview(String slug, String name, ActivityType activityType,
                                 SessionType sessionType, SessionStatus status,
                                 String hostDisplayName, int participantCount,
                                 List<PreviewParticipantDto> participants,
                                 /** Host su an oturumda mi — Katil ekranindaki rozet. Katilimi ENGELLEMEZ. */
                                 boolean hostOnline) {
    }
```

- [ ] **Step 4: Assembler'ı güncelle**

`SessionViewAssembler` — sınıf gövdesinin başına:

```java
    private final PresencePort presence;

    public SessionViewAssembler(PresencePort presence) {
        this.presence = presence;
    }
```

`toView` içinde, katılımcı listesi kurulmadan **önce**:

```java
        Set<UUID> present = presence.presentIn(snap.session().id());
```

`ParticipantDto` yapıcısına son argümanı ekle (`midpointMinutes` hesabından sonra):

```java
                        midpointFor == null || !p.hasLocation() ? null
                                : TravelMinutes.between(p.location(), p.travelMode(), midpointFor),
                        present.contains(p.id())))
```

`toPreview` metodunu şununla değiştir:

```java
    /** Katilmadan once gorulen kamu bilgisi: koordinat, katilimci id'si ve mekan YOK. */
    public ApiDtos.SessionPreview toPreview(SessionQueries.SessionSnapshot snap) {
        List<ApiDtos.PreviewParticipantDto> participants = snap.participants().stream()
                .filter(p -> !p.manual())
                .map(p -> new ApiDtos.PreviewParticipantDto(p.displayName(), p.host(), p.hasLocation()))
                .toList();
        String hostDisplayName = participants.stream()
                .filter(ApiDtos.PreviewParticipantDto::host)
                .findFirst().map(ApiDtos.PreviewParticipantDto::displayName).orElse(null);
        // Host'un koltuk id'si preview DTO'suna GIRMEZ; cevrimicilik domain satirindan okunur.
        Set<UUID> present = presence.presentIn(snap.session().id());
        boolean hostOnline = snap.participants().stream().filter(Participant::host).findFirst()
                .map(host -> present.contains(host.id())).orElse(false);
        return new ApiDtos.SessionPreview(snap.session().slug(), snap.session().name(),
                snap.session().activityType(), snap.session().sessionType(),
                snap.session().status(), hostDisplayName, participants.size(), participants,
                hostOnline);
    }
```

Import ekle: `com.bumpinto.domain.port.PresencePort`, `java.util.Set`.

- [ ] **Step 5: Testleri çalıştır**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto/backend
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test -Dtest=SessionViewAssemblerTest
```

Beklenen: hepsi PASS (mevcut 12 snapshot kurulumu değişmedi — `SessionSnapshot` imzasına dokunulmadı).

- [ ] **Step 6: Commit — kullanıcıya bırak**

Bir arada: `ApiDtos.java`, `SessionViewAssembler.java`, `SessionViewAssemblerTest.java`. Önerilen mesaj: `feat(api): expose participant online and preview hostOnline`.

---

## Task 5: Geç katılım kapısı

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/application/session/SessionCommands.java` (`join`, satır ~70-90)
- Test: `backend/src/test/java/com/bumpinto/application/session/SessionCommandsTest.java`

- [ ] **Step 1: Başarısız testi yaz**

`SessionCommandsTest` sonuna. (Bu dosyada paylaşılan bir `session` alanı **yoktur** — her test kendi oturumunu `commands.createSession(...)` ile kurar; aşağıdakiler o üsluba uyar.)

```java
    @Test
    void newSeatsAreRefusedOnceTheDeckStarted() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH,
                "Mehmet", null, null);
        store.saveSession(r.session().withStatus(SessionStatus.SWIPING));

        assertThatThrownBy(() -> commands.join(r.session().slug(), Caller.ANONYMOUS, "Geç",
                SOMEREN, null, null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("closed for new participants");
    }

    /**
     * Kapi YALNIZ yeni koltuga: sekmesini yenileyen uye kendi koltugunu her durumda geri alir.
     * Kapi seatOf'tan ONCE olsaydi deste ortasinda sayfayi yenileyen kisi 409 gorurdu.
     */
    @Test
    void existingSeatsAreStillRecoveredAfterTheDeckStarted() {
        SessionCommands.CreateSessionResult r = commands.createSession(
                UUID.randomUUID(), null, ActivityType.COFFEE, SessionType.GROUP, DEN_BOSCH,
                "Mehmet", null, null);
        Participant ayse = commands.join(r.session().slug(), Caller.ANONYMOUS, "Ayşe", SOMEREN,
                null, null);
        store.saveSession(r.session().withStatus(SessionStatus.RUNOFF));

        Participant again = commands.join(r.session().slug(), Caller.participant(ayse.id()),
                "Ayşe", null, null, null);

        assertThat(again.id()).isEqualTo(ayse.id());
    }
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto/backend
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test -Dtest=SessionCommandsTest
```

Beklenen: `newSeatsAreRefusedOnceTheDeckStarted` FAIL — bugün `SWIPING`'de katılım geçiyor.

- [ ] **Step 3: `join`'i düzelt**

`SessionCommands` sınıf alanlarının yanına:

```java
    /**
     * Yeni koltuk bu durumlarda ACILMAZ: deste basladiktan sonra oy populasyonu DONAR, yoksa
     * gec katilan biri done/total matematigini bozar ve herkesi bekletir.
     */
    private static final Set<SessionStatus> CLOSED_TO_NEW_SEATS = EnumSet.of(
            SessionStatus.SWIPING, SessionStatus.RUNOFF, SessionStatus.DECIDED);
```

`join` gövdesinde `DECIDED` kontrolünü **sil** ve kapıyı `seatOf`'tan **sonraya** taşı:

```java
    @Transactional
    public Participant join(String slug, Caller caller, String displayName, GeoPoint location,
                            String locationLabel, TravelMode travelMode) {
        Session session = required(slug);
        if (session.isSolo()) {
            throw new ConflictException("solo session has no invite link");
        }
        // Koltuk kurtarma kapidan ONCE: sekmesini yenileyen uye her durumda kendi koltugunu alir.
        Optional<Participant> seat = seatOf(session, caller);
        if (seat.isPresent()) {
            return seat.get();
        }
        if (CLOSED_TO_NEW_SEATS.contains(session.status())) {
            throw new ConflictException("session is closed for new participants: " + session.status());
        }
        // null -> CAR: Participant'in compact ctor'u zaten coerce eder, burada tekrar etmiyoruz.
        Participant joined = store.saveParticipant(new Participant(UUID.randomUUID(), session.id(),
                Texts.displayName(displayName), location, false, null,
                false, Texts.label(locationLabel), travelMode, caller.userId()));
        events.publish(slug, SessionEvent.participantJoined(store.participantsOf(session.id()).size()));
        return joined;
    }
```

Import ekle: `java.util.EnumSet`, `java.util.Set`.

- [ ] **Step 4: Testleri çalıştır**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto/backend
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test -Dtest='SessionCommandsTest,ApiHappyPathTest'
```

Beklenen: PASS. Bir test `DECIDED`'da mevcut üyeye 409 bekliyorsa, bu davranış bilinçli olarak değişti — testi "koltuk geri döner" olacak şekilde güncelle ve nedenini yorumla yaz.

- [ ] **Step 5: Commit — kullanıcıya bırak**

Bir arada: `SessionCommands.java`, `SessionCommandsTest.java`. Önerilen mesaj: `fix(session): refuse new seats after the deck starts, always recover existing ones`.

---

## Task 6: `shuffle` presence kapısı

**Files:**
- Modify: `backend/src/test/java/com/bumpinto/support/FakeStores.java`
- Modify: `backend/src/main/java/com/bumpinto/application/deck/DeckFlow.java` (`shuffle`, satır 138-162)
- Test: `backend/src/test/java/com/bumpinto/application/deck/DeckFlowTest.java`

- [ ] **Step 1: `FakePresence`'i ekle**

`support/FakeStores.java` — dosyadaki diğer `public static class` fake'lerin yanına:

```java
    public static class FakePresence implements PresencePort {
        public final Map<UUID, Set<UUID>> present = new HashMap<>();

        @Override public void arrived(UUID sessionId, UUID participantId) {
            present.computeIfAbsent(sessionId, key -> new HashSet<>()).add(participantId);
        }

        @Override public void left(UUID sessionId, UUID participantId) {
            Set<UUID> seats = present.get(sessionId);
            if (seats != null) {
                seats.remove(participantId);
            }
        }

        @Override public Set<UUID> presentIn(UUID sessionId) {
            return Set.copyOf(present.getOrDefault(sessionId, Set.of()));
        }
    }
```

Import ekle: `com.bumpinto.domain.port.PresencePort`. (`HashMap`, `HashSet`, `Set`, `UUID`, `Map` zaten var.)

- [ ] **Step 2: Başarısız testi yaz**

`DeckFlowTest` — alanlara ekle:

```java
    FakeStores.FakePresence presence;
```

`setUp()` içinde, `flow = new DeckFlow(...)` satırından **önce**:

```java
        presence = new FakeStores.FakePresence();
```

`flow` kurulumunu güncelle:

```java
        flow = new DeckFlow(store, deck, provider, events, new DecisionEngine(), clock, geocoder,
                presence);
```

`setUp()`'ın **sonuna** (host ve ayse kurulduktan sonra) — mevcut shuffle testleri iki kişiyle çalışmaya devam etsin:

```java
        // Mevcut testler "herkes odada" varsayar; presence kapisi yalnizca kendi testinde bosaltilir.
        presence.arrived(session.id(), host.id());
        presence.arrived(session.id(), ayse.id());
```

Dosyanın sonuna yeni test:

```java
    /**
     * Hayalet koltukla deste baslamaz: satir duruyor ama sahibi sayfayi kapatmis. Kapi PRESENCE'a
     * bakar, satir sayisina degil — spec §5 "presence girisi kapatir, sonucu asla".
     */
    @Test
    void shuffleNeedsTwoParticipantsActuallyPresent() {
        providerResult.addAll(IntStream.range(0, 8).mapToObj(i -> cand(i, 3.0 + i * 0.2)).toList());
        flow.findVenues("s1", host.id());
        presence.left(session.id(), ayse.id());

        assertThatThrownBy(() -> flow.shuffle("s1", host.id()))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("2 participants present");

        presence.arrived(session.id(), ayse.id());
        flow.shuffle("s1", host.id());

        assertThat(store.sessions.get(session.id()).status()).isEqualTo(SessionStatus.SWIPING);
    }
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu gör**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto/backend
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test -Dtest=DeckFlowTest
```

Beklenen: `COMPILATION ERROR` — `DeckFlow`'un sekiz argümanlı yapıcısı yok.

- [ ] **Step 4: `DeckFlow`'a portu ve kapıyı ekle**

Alan ve yapıcı:

```java
    private final PresencePort presence;
```

Yapıcı imzasının sonuna `PresencePort presence` ekle ve `this.presence = presence;` ata.

`shuffle` içinde, `requireHost` ve `isSolo` kontrollerinden **sonra**, `geometryPopulation` çağrısından **önce**:

```java
        // Presence kapisi: satir duruyor ama sahibi odada degilse deste baslamaz. Deste BITISI
        // (done>=total) bilinçli olarak satira bakmaya devam eder — geri alinamaz karar bir ag
        // dalgalanmasina emanet edilemez (spec §5).
        Set<UUID> here = presence.presentIn(session.id());
        long ready = votingPopulation(session.id()).stream()
                .filter(p -> here.contains(p.id())).count();
        if (ready < 2) {
            throw new ConflictException("need at least 2 participants present to start the deck");
        }
```

Import ekle: `com.bumpinto.domain.port.PresencePort` (`Set`, `UUID` zaten var).

- [ ] **Step 5: `ApiHappyPathTest`'i presence kapısına uyarla**

`ApiHappyPathTest` shuffle'ı **iki** yerde başarıyla çağırıyor (`createJoinSuggestSwipeDecide` ve web-çerezi akışı); üçüncü çağrı SOLO oturumda zaten 409 bekliyor ve dokunulmaz. MockMvc'de WS yoktur, dolayısıyla gerçek `InMemoryPresence` boştur ve iki başarılı çağrı 409'a düşer.

Alanlara ekle:

```java
    @Autowired SessionStorePort sessions;
    @Autowired PresencePort presence;
```

Sınıfa yardımcıyı ekle:

```java
    /**
     * Presence surec icidir ve MockMvc'de handshake yoktur: shuffle kapisi (B-8) icin oturumdaki
     * koltuklar elle "odada" isaretlenir. Gercek akista bunu WS handshake yapar.
     */
    private void everyoneIsInTheRoom(String slug) {
        UUID sessionId = sessions.sessionBySlug(slug).orElseThrow().id();
        sessions.participantsOf(sessionId).forEach(p -> presence.arrived(sessionId, p.id()));
    }
```

Her iki `post("/api/sessions/" + slug + "/shuffle")` çağrısından **hemen önce** bir satır:

```java
        everyoneIsInTheRoom(slug);
```

Import ekle: `com.bumpinto.domain.port.PresencePort`, `com.bumpinto.domain.port.SessionStorePort`, `java.util.UUID`.

- [ ] **Step 6: Testleri çalıştır**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto/backend
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test -Dtest='DeckFlowTest,ApiHappyPathTest'
```

Beklenen: PASS.

- [ ] **Step 7: Commit — kullanıcıya bırak**

Bir arada: `FakeStores.java`, `DeckFlow.java`, `DeckFlowTest.java`, `ApiHappyPathTest.java`. Önerilen mesaj: `feat(deck): require two present participants to start the deck`.

---

## Task 7: Bruno ve ARCHITECTURE güncellemesi

**Files:**
- Modify: `backend/.infra/bumpinto-collection/sessions/get-session.yml`
- Modify: `backend/.infra/bumpinto-collection/sessions/preview.yml`
- Modify: `backend/.infra/bumpinto-collection/sessions/shuffle.yml`
- Modify: `backend/.infra/bumpinto-collection/participants/` içindeki katılım isteği (dosya adını `ls` ile bul)
- Modify: `backend/ARCHITECTURE.md`

- [ ] **Step 1: Bruno `docs:` bloklarını güncelle**

Her dosyanın mevcut `docs:` bloğunun biçimini bozmadan şu cümleleri ekle:

- `get-session.yml`: `participants[].online` — açık soketi olan ya da son 45 sn içinde kopmuş katılımcı; `manual=true` satırlarda daima `false`.
- `preview.yml`: `hostOnline` — host şu an oturumda mı. **Katılımı engellemez**, yalnız Katıl ekranındaki rozeti besler.
- `shuffle.yml`: 409 — oturumda mevcut oy veren katılımcı sayısı 2'den azsa deste başlamaz.
- katılım isteği: 409 — `SWIPING`/`RUNOFF`/`DECIDED`'da **yeni** koltuk açılmaz; var olan koltuk her durumda geri döner.

- [ ] **Step 2: ARCHITECTURE §8'e WS kimliğini yaz**

"### Filter bean tuzağı" başlığından **önce** yeni bir alt bölüm:

```markdown
### WebSocket kimliği

Kanal `/api/sessions/{slug}/ws` altındadır. Katılımcı çerezinin path'i tam olarak
`/api/sessions/{slug}` olduğu için tarayıcı çerezi handshake'e kendiliğinden gönderir; istek
servlet zincirinden geçer, `ParticipantTokenFilter` kimliği kurar ve `anyRequest().authenticated()`
kimliksiz handshake'i 401'ler. `SessionWsHandshake` slug/participantId/sessionId'yi WS oturum
niteliklerine yazar — kopma anında ortada HTTP isteği yoktur, tek kaynak orasıdır.

Abonelik de yetkilendirilir: `WebSocketConfig`'in inbound interceptor'ı yalnız kişinin KENDİ
oturumunun konusuna (`/topic/session/{kendi slug'ı}`) izin verir. Eskiden uç nokta `/ws` idi,
handshake kimliksizdi ve slug'ı bilen herhangi bir istemci kanalı dinleyebiliyordu.
```

- [ ] **Step 3: ARCHITECTURE §11 olay tablosuna satır ekle**

```markdown
| `presence_changed` | *(boş)* |
```

Ve tablonun altındaki iki kuralın ardına üçüncü bir madde:

```markdown
3. **Presence süreç içidir.** `InMemoryPresence` tek pod'un hafızasında yaşar: çok pod'da
   paylaşılmaz, restart'ta boşalır (ilk reconnect doldurur) ve 45 sn'lik grace penceresi yüzünden
   gerçekten ayrılan biri bir süre daha "burada" görünür. `ProviderQuotaCache` ile aynı sınıf borç.
   Presence yalnız **geri alınabilir giriş** kararlarını kapatır (`shuffle`); deste bitişi gibi
   geri alınamaz kararlar satıra bakmaya devam eder.
```

- [ ] **Step 4: Rate limit tablosuna `ws` satırını ekle**

ARCHITECTURE §8'deki rate limit tablosuna, `api` satırının **üstüne**:

```markdown
| `ws` | GET | `/api/sessions/*/ws` | 30 |
```

- [ ] **Step 5: Commit — kullanıcıya bırak**

Bir arada: Bruno `.yml` dosyaları + `ARCHITECTURE.md`. Önerilen mesaj: `docs(presence): document websocket identity, presence limits and new fields`.

---

## Task 8: Tam test turu ve duman testi

- [ ] **Step 1: Tüm test paketini koştur**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto/backend
JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true \
  mvn -o test
```

Beklenen: `BUILD SUCCESS`, sıfır failure. (B-7 sonrası taban 230 test; bu plan ~9 test ekler.)

- [ ] **Step 2: Uygulamayı çalıştır**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto
docker compose up -d postgres
set -a && source backend/.env.local && set +a
cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 mvn -o spring-boot:run
```

- [ ] **Step 3: Elle duman testi — presence gerçekten çalışıyor mu**

İki tarayıcı penceresi (biri normal, biri gizli):

1. Normal pencerede oturum kur, davet linkini kopyala.
2. Gizli pencerede linke katıl.
3. Normal pencerede `GET /api/sessions/{slug}` yanıtında ikisinin de `online: true` olduğunu gör.
4. Gizli pencereyi **kapat**, 50 saniye bekle, tekrar `GET` at: davetlinin `online` alanı `false` olmalı.
5. Aynı anda `POST /api/sessions/{slug}/shuffle` → 409 `need at least 2 participants present`.

Beklenen sonuçların hepsi tutmalı. Tutmuyorsa: sunucu loglarında `session event 'presence_changed' could not be published` var mı bak — varsa yayın hatası, presence değil.

- [ ] **Step 4: OpenAPI şemasını yenile (W-7'nin girdisi)**

Uygulama ayaktayken, repo kökünden:

```bash
cd /Users/mehmetserefoglu/projects/bumpinto && pnpm codegen
```

Beklenen: `frontend/shared/src/api-types.ts` içinde `online` ve `hostOnline` alanları görünür:

```bash
grep -n "hostOnline\|online" frontend/shared/src/api-types.ts | head
```

- [ ] **Step 5: Commit — kullanıcıya bırak**

Bir arada: `frontend/shared/src/api-types.ts`, `frontend/shared/openapi.json`. Önerilen mesaj: `chore(shared): regenerate api types for presence fields`.

---

## B-8 tamamlanma kriteri

- [ ] `mvn -o test` yeşil
- [ ] Kimliksiz `/api/sessions/{slug}/ws` handshake'i 401
- [ ] Başka oturumun konusuna abonelik düşürülüyor
- [ ] `SessionView.participants[].online` ve `SessionPreview.hostOnline` doğru
- [ ] `SWIPING`/`RUNOFF`/`DECIDED`'da yeni koltuk 409, var olan koltuk geri dönüyor
- [ ] Tek kişi kaldığında `shuffle` 409
- [ ] Bruno `docs:` blokları ve ARCHITECTURE §8/§11 güncel
- [ ] `pnpm codegen` yeni alanları üretti
