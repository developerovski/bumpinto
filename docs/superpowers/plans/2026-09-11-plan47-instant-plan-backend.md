# B-18 — "Buradayım" anlık plan + kitle + rozet sayaçları — Backend Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Açık plana pencere (`openUntil`), kitle (`audience`) ve herkese açık kaba yer adı (`locality`) eklenir; `/api/me.stats` "buluştuk" sayısı ve haftalık seri taşır. Keşfet süren "buradayım" planlarını listeler, çapa etiketi kartta sızmaz (K-B38).

**Architecture:** B-17'nin `OpenPlan` değer nesnesi iki alan kazanır (`openUntil`, `audience`); `Session` bir kaba `locality` alanı. Tek migration V23 (üç kolon + backfill + iki kısıt + daraltılmış Keşfet indeksi). Keşfet sorgusu `audience = PUBLIC` ve `coalesce(open_until, meet_at) > now` kapılarına geçer. İstatistik için `MeetCheckinStorePort` tek okuma metodu kazanır; seri hesabı saf `MetStreak`. Yeni uç yok; sözleşme DTO alanlarıyla büyür.

**Tech Stack:** Spring Boot 4.1 / Java 21 hexagonal · Flyway V23 · Testcontainers (`PostgresContainer.shared()`) · MockMvc · AssertJ.

**Spec:** `docs/superpowers/specs/2026-09-11-instant-plan-badges-design.md` §1–§3, §6, §9–§10.

> **2026-09-11 YÜRÜTÜLDÜ (inline, aynı gün).** T1–T6 tamam; tam regresyon **613 test / 0 hata / 6 skip**
> (taban 587). Sapmalar: (1) `DiscoverApiTest`'te `ReverseGeocodePort` değil **`NominatimGeocoder`**
> mock'landı — tek bean iki port'u (`GeocodePort` + `ReverseGeocodePort`) taşıyor, yalnız arayüz
> mock'lanınca `GeocodeController` bağlamı düşürüyordu. (2) `SchemaMigrationTest`'in V20 `insertOpenPlan`
> yardımcısı `audience = 'PUBLIC'` yazar oldu (V23 kısıtı). (3) Bruno `seq: 14`. Codegen 8061'de
> kaldırılan backend'le yapıldı; V23 yerel DB'ye indi. Commit kullanıcıda.

**Bağlayıcı kararlar (yeniden tartışılmaz):** spec §1 madde 1–10, 13. Özellikle: pencere ≤ 3 sa; pencereli plan çapasız olamaz (400 `open_plan_anchor_required`); `FRIENDS` B-19'a kadar 400 `audience_not_available`; Keşfet yalnız `PUBLIC`; `locality` = çapa noktasının (çapasızsa host konumunun) ters geocode'lu semti, `midpointLabel` üyelere özel kalır; git yazımı kullanıcıda — görevler "değişen dosyalar" ile kapanır, commit adımı yoktur.

## Test komutları

```bash
cd backend
BTEST='JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true env -u TOKEN_SECRET -u GOOGLE_CLIENT_ID -u FOURSQUARE_API_KEY mvn -o -q test'
BTEST1="$BTEST -Dtest="
# Örnek: eval "$BTEST1"OpenPlanTest
```
`mvn -o test` clean'siz bayat sınıfla YANLIŞ yeşil verebilir; şüphede `mvn -o clean test`. VSCode Java sunucusu `target/classes`'ı ezerse `mvn -o compile` gerçek hatayı gösterir.

## Dosya haritası

| Dosya | Sorumluluk |
|---|---|
| `domain/session/Audience.java` (yeni) | Kitle enum'u |
| `domain/session/OpenPlan.java` | Pencere + kitle kuralları (`end`, `inProgress`, `listedInDiscover`) |
| `domain/session/Session.java` | `locality` bileşeni (18. alan), 17-arg ctor korunur |
| `db/migration/V23__instant_plans.sql` (yeni) | Kolonlar, backfill, kısıtlar, indeks |
| `adapter/out/persistence/SessionEntity.java`, `SessionStoreAdapter.java`, `SessionRepository.java` | Eşleme + Keşfet sorgusu |
| `application/session/SessionCommands.java` | `locality` yazımı, çapa zorunluluğu |
| `adapter/in/web/ApiDtos.java`, `SessionController.java`, `SessionViewAssembler.java` | DTO alanları, kitle doğrulaması, kart eşlemesi |
| `domain/port/MeetCheckinStorePort.java`, `adapter/out/persistence/MeetCheckinRepository.java`, `MeetCheckinStoreAdapter.java` | "buluştuk" zamanlarını okuma |
| `application/user/MetStreak.java` (yeni), `UserProfileQueries.java`, `adapter/in/web/MeController.java` | Sayaçlar |
| `src/test/java/com/bumpinto/support/FakeStores.java` | Sahte mağazalar yeni sorgu/metotla |

---

### Task 1: Domain — `Audience`, `OpenPlan.openUntil/audience`, `Session.locality`

**Files:**
- Create: `backend/src/main/java/com/bumpinto/domain/session/Audience.java`
- Modify: `backend/src/main/java/com/bumpinto/domain/session/OpenPlan.java`
- Modify: `backend/src/main/java/com/bumpinto/domain/session/Session.java`
- Test: `backend/src/test/java/com/bumpinto/domain/session/OpenPlanTest.java`

- [ ] **Step 1: Başarısız testleri yaz** — `OpenPlanTest`'e ekle (mevcut testler kalır):

```java
    static final Instant UNTIL = MEET.plus(Duration.ofHours(2));

    /** Pencere (meetAt, meetAt+3h] icinde: 0 ya da 3 saat ustu "buradayim" TTL'siz surerdi. */
    @Test
    void windowMustEndAfterMeetAndWithinThreeHours() {
        assertThatThrownBy(() -> new OpenPlan(MEET, 4, JoinPolicy.OPEN, MEET, Audience.PUBLIC))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new OpenPlan(MEET, 4, JoinPolicy.OPEN,
                MEET.plus(Duration.ofHours(3)).plusSeconds(1), Audience.PUBLIC))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatCode(() -> new OpenPlan(MEET, 4, JoinPolicy.OPEN,
                MEET.plus(Duration.ofHours(3)), Audience.PUBLIC)).doesNotThrowAnyException();
        assertThatThrownBy(() -> new OpenPlan(MEET, 4, JoinPolicy.OPEN, null, null))
                .isInstanceOf(NullPointerException.class);
    }

    /** Pencereli planda "bitis" openUntil'dir: meetPassed, TTL ve check-in ona bakar. */
    @Test
    void windowedPlanEndsAtOpenUntil() {
        OpenPlan p = new OpenPlan(MEET, 4, JoinPolicy.OPEN, UNTIL, Audience.PUBLIC);
        assertThat(p.end()).isEqualTo(UNTIL);
        assertThat(p.meetPassed(UNTIL.minusSeconds(1))).isFalse();
        assertThat(p.meetPassed(UNTIL)).isTrue();
        assertThat(p.expiresAt()).isEqualTo(UNTIL.plus(Duration.ofHours(3)));
    }

    @Test
    void inProgressOnlyInsideTheWindow() {
        OpenPlan p = new OpenPlan(MEET, 4, JoinPolicy.OPEN, UNTIL, Audience.PUBLIC);
        assertThat(p.inProgress(MEET.minusSeconds(1))).isFalse();
        assertThat(p.inProgress(MEET)).isTrue();
        assertThat(p.inProgress(UNTIL.minusSeconds(1))).isTrue();
        assertThat(p.inProgress(UNTIL)).isFalse();
        // Noktasal plan hicbir zaman "suruyor" degildir.
        assertThat(new OpenPlan(MEET, 4, JoinPolicy.APPROVAL).inProgress(MEET)).isFalse();
    }

    /** B-17 imzasi noktasal + PUBLIC uretir: eski cagri yerleri anlam degistirmez. */
    @Test
    void threeArgConstructorIsAPublicPointPlan() {
        OpenPlan p = new OpenPlan(MEET, 4, JoinPolicy.APPROVAL);
        assertThat(p.openUntil()).isNull();
        assertThat(p.audience()).isEqualTo(Audience.PUBLIC);
        assertThat(p.end()).isEqualTo(MEET);
        assertThat(p.listedInDiscover()).isTrue();
    }

    @Test
    void onlyPublicPlansAreListedInDiscover() {
        assertThat(new OpenPlan(MEET, 4, JoinPolicy.OPEN, null, Audience.NONE).listedInDiscover()).isFalse();
        assertThat(new OpenPlan(MEET, 4, JoinPolicy.OPEN, null, Audience.FRIENDS).listedInDiscover()).isFalse();
    }

    /** `locality` de wither'lardan gecer; dusmesi Kesfet kartini semtsiz birakirdi. */
    @Test
    void sessionWithersKeepLocality() {
        OpenPlan p = new OpenPlan(MEET, 4, JoinPolicy.APPROVAL);
        Session s = new Session(UUID.randomUUID(), "abc12345", UUID.randomUUID(), "Yürüyüş",
                List.of(ActivityType.HIKE), SessionType.GROUP, SessionStatus.COLLECTING,
                p.expiresAt(), null, List.of(), null, null, null, "Café Zwart", null, "ABCDE", p,
                "Stratum");
        assertThat(s.locality()).isEqualTo("Stratum");
        assertThat(s.withStatus(SessionStatus.BROWSING).locality()).isEqualTo("Stratum");
        assertThat(s.withMidpointLabel("x").locality()).isEqualTo("Stratum");
        assertThat(s.inRunoff(List.of(), RunoffReason.INTERSECTION).locality()).isEqualTo("Stratum");
        assertThat(s.decided(UUID.randomUUID(), DecisionKind.UNANIMOUS, MEET).locality())
                .isEqualTo("Stratum");
        // 17-arg ctor: locality null (B-17 cagri yerleri kirilmaz).
        Session legacy = new Session(UUID.randomUUID(), "abc12345", UUID.randomUUID(), "Yürüyüş",
                List.of(ActivityType.HIKE), SessionType.GROUP, SessionStatus.COLLECTING,
                p.expiresAt(), null, List.of(), null, null, null, null, null, "ABCDE", p);
        assertThat(legacy.locality()).isNull();
    }
```
Import ekle: `java.time.Duration`.

- [ ] **Step 2: Kırmızı gör** — `eval "$BTEST1"OpenPlanTest` → derleme hatası (`Audience`, 5-arg ctor, `locality` yok).

- [ ] **Step 3: `Audience.java`**

```java
package com.bumpinto.domain.session;

/**
 * Acik planin KITLESI (B-18): kim kesfeder. PUBLIC = Kesfet listesi; FRIENDS = yalniz karsilikli
 * arkadaslar (B-19 — sunucu o ize kadar reddeder); NONE = hicbir listede yok, yalniz davet linki
 * (pencere, kapasite, yeter sayi, koltuk istegi ve check-in yine calisir).
 */
public enum Audience { PUBLIC, FRIENDS, NONE }
```

- [ ] **Step 4: `OpenPlan.java`** — kaydı şu hâle getir (Javadoc'lar korunur):

```java
public record OpenPlan(Instant meetAt, int capacity, JoinPolicy joinPolicy,
                       /** "Buradayim" penceresinin sonu; null = noktasal plan (B-17 davranisi). */
                       Instant openUntil,
                       Audience audience) {

    public static final int MIN_CAPACITY = 3;
    public static final int MAX_CAPACITY = 8;
    public static final int DEFAULT_CAPACITY = 4;
    public static final int QUORUM = 3;
    static final Duration GRACE_AFTER_MEET = Duration.ofHours(3);
    /** Pencere en cok 3 saat (V23 kisiti ayni sayiyi soyler): "buradayim" TTL'siz suremez. */
    public static final Duration MAX_WINDOW = Duration.ofHours(3);

    public OpenPlan {
        Objects.requireNonNull(meetAt, "meetAt");
        Objects.requireNonNull(joinPolicy, "joinPolicy");
        Objects.requireNonNull(audience, "audience");
        if (capacity < MIN_CAPACITY || capacity > MAX_CAPACITY) {
            throw new IllegalArgumentException(
                    "capacity must be in [" + MIN_CAPACITY + "," + MAX_CAPACITY + "]");
        }
        if (openUntil != null
                && (!openUntil.isAfter(meetAt) || openUntil.isAfter(meetAt.plus(MAX_WINDOW)))) {
            throw new IllegalArgumentException("openUntil must be in (meetAt, meetAt + 3h]");
        }
    }

    /** B-17 imzasi: noktasal ve PUBLIC. Eski cagri yerleri kirilmaz. */
    public OpenPlan(Instant meetAt, int capacity, JoinPolicy joinPolicy) {
        this(meetAt, capacity, joinPolicy, null, Audience.PUBLIC);
    }

    /** Planin BITISI: pencereli planda openUntil, noktasalda meetAt. TTL, meetPassed ve check-in buna bakar. */
    public Instant end() {
        return openUntil == null ? meetAt : openUntil;
    }

    public boolean confirmed(int approvedSeats) { return approvedSeats >= QUORUM; }

    public boolean full(int approvedSeats) { return approvedSeats >= capacity; }

    public Instant expiresAt() { return end().plus(GRACE_AFTER_MEET); }

    /** Sinir DAHIL: bitis aninda "gecti" sayilir. Noktasal planda bitis = bulusma ani (B-17 kurali). */
    public boolean meetPassed(Instant now) { return !now.isBefore(end()); }

    /** "Suruyor": yalniz pencereli planda ve [meetAt, openUntil) icinde. */
    public boolean inProgress(Instant now) {
        return openUntil != null && !now.isBefore(meetAt) && now.isBefore(openUntil);
    }

    public boolean listedInDiscover() { return audience == Audience.PUBLIC; }
}
```

- [ ] **Step 5: `Session.java`** — 18. bileşen `locality`; 17-arg ctor ekle; wither'lar taşısın:

```java
public record Session(UUID id, String slug, UUID hostId, String name,
                      List<ActivityType> activityTypes,
                      SessionType sessionType, SessionStatus status, Instant expiresAt,
                      UUID decidedVenueId, List<UUID> runoffVenueIds,
                      Instant decidedAt, DecisionKind decisionKind, RunoffReason runoffReason,
                      String midpointLabel, GeoPoint anchor, String joinCode, OpenPlan openPlan,
                      /**
                       * Kesfet'in HERKESE ACIK, KABA yer adi (B-18, K-B38): capa noktasinin ya da
                       * host konumunun semti. `midpointLabel`in aksine host'un yazdigi etiket
                       * DEGILDIR — o etiket uyelere ozeldir. Gizli oturumda null.
                       */
                      String locality) {
```
Mevcut 17-arg (openPlan'lı) imzayı koru — gövdesi `this(..., openPlan, null)`; diğer eski ctor'lar ona zincirlenir. `withStatus`, `withMidpointLabel`, `decided`, `inRunoff` son argüman olarak `locality` geçer.

- [ ] **Step 6: Derle + yeşil gör** — `cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 mvn -o -q compile` temiz; `eval "$BTEST1"OpenPlanTest` → PASS. Sonra tüm `new Session(` 17-arg çağrı yerleri (adaptör, komutlar, testler) derlemeye devam eder — dokunma.

- [ ] **Step 7:** Değişen dosyalar: `Audience.java`, `OpenPlan.java`, `Session.java`, `OpenPlanTest.java`. Commit kullanıcıda.

---

### Task 2: V23 + entity/adaptör eşlemesi + Keşfet sorgusu + sahte mağaza

**Files:**
- Create: `backend/src/main/resources/db/migration/V23__instant_plans.sql`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/SessionEntity.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/SessionStoreAdapter.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/SessionRepository.java`
- Modify: `backend/src/test/java/com/bumpinto/support/FakeStores.java` (`InMemorySessionStore.findPublicUpcoming`)
- Test: `backend/src/test/java/com/bumpinto/adapter/out/persistence/OpenPlanStoreAdapterTest.java`, `backend/src/test/java/com/bumpinto/SchemaMigrationTest.java`

- [ ] **Step 1: Başarısız testler**

`OpenPlanStoreAdapterTest`'e (yardımcı `session(slug, plan)` 17-arg ctor'u kullanmaya devam eder; `locality` için yeni yardımcı):

```java
    private Session session(String slug, OpenPlan plan, String locality) {
        UUID host = users.upsertByEmail(slug + "-host@bumpinto.test", "Mehmet");
        Instant expires = plan == null ? NOW.plus(Duration.ofDays(1)) : plan.expiresAt();
        return new Session(UUID.randomUUID(), slug, host, "Yürüyüş",
                List.of(ActivityType.HIKE), SessionType.GROUP, SessionStatus.COLLECTING, expires,
                null, List.of(), null, null, null, "Café Zwart", new GeoPoint(51.44, 5.47), null,
                plan, locality);
    }

    @Test
    void roundTripsAWindowedPlanWithAudienceAndLocality() {
        OpenPlan plan = new OpenPlan(NOW, 4, JoinPolicy.OPEN, NOW.plus(Duration.ofHours(2)),
                Audience.NONE);

        sessions.saveSession(session("rt-window", plan, "Stratum"));

        Session back = sessions.sessionBySlug("rt-window").orElseThrow();
        assertThat(back.openPlan()).isEqualTo(plan);
        assertThat(back.locality()).isEqualTo("Stratum");
        assertThat(back.midpointLabel()).isEqualTo("Café Zwart"); // ikisi AYRI alan
    }

    /**
     * Kesfet: SUREN pencereli plan listede (meetAt gecmis ama openUntil gelecek), penceresi
     * biten dusmus, NONE/FRIENDS kitleli plan hic yok.
     */
    @Test
    void findPublicUpcomingListsInProgressWindowsAndOnlyPublicAudience() {
        sessions.saveSession(session("win-live", new OpenPlan(NOW.minus(Duration.ofMinutes(30)),
                4, JoinPolicy.OPEN, NOW.plus(Duration.ofHours(1)), Audience.PUBLIC), "Stratum"));
        sessions.saveSession(session("win-over", new OpenPlan(NOW.minus(Duration.ofHours(3)),
                4, JoinPolicy.OPEN, NOW.minus(Duration.ofMinutes(1)), Audience.PUBLIC), "Stratum"));
        sessions.saveSession(session("win-none", new OpenPlan(NOW.minus(Duration.ofMinutes(30)),
                4, JoinPolicy.OPEN, NOW.plus(Duration.ofHours(1)), Audience.NONE), "Stratum"));
        sessions.saveSession(session("pt-friends", new OpenPlan(NOW.plus(Duration.ofDays(1)),
                4, JoinPolicy.OPEN, null, Audience.FRIENDS), "Stratum"));

        assertThat(sessions.findPublicUpcoming(NOW, NOW.plus(Duration.ofDays(14))))
                .extracting(Session::slug).containsExactly("win-live");
    }
```
Import: `com.bumpinto.domain.session.Audience`.

`SchemaMigrationTest`'e (K-B36: her test TEK kısıt ihlali):

```java
    /** V23: pencere/kitle/semt. Kitle acik planin parcasi — kolon yalniz meet_at doluyken dolu. */
    @Test
    void v23AddsWindowAudienceAndLocalityColumns() {
        assertThat(columnsOf("sessions")).contains("open_until", "audience", "locality");
        assertThat(jdbc.queryForObject("select indexdef from pg_indexes "
                + "where indexname = 'sessions_discover_idx'", String.class))
                .contains("audience");
    }

    @Test
    void v23RejectsAWindowLongerThanThreeHours() {
        UUID host = insertHost("v23-win@bumpinto.test");
        assertThatThrownBy(() -> insertOpenPlan(host, "v23win1",
                "2026-09-13T08:00:00Z", "2026-09-13T11:00:01Z", "PUBLIC"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void v23RejectsAudienceOnAHiddenSession() {
        UUID host = insertHost("v23-aud@bumpinto.test");
        assertThatThrownBy(() -> jdbc.update("insert into sessions (id, slug, host_id, name, "
                + "activity_types, session_type, status, expires_at, audience) values (?, ?, ?, "
                + "'x', 'HIKE', 'GROUP', 'COLLECTING', now() + interval '1 day', 'PUBLIC')",
                UUID.randomUUID(), "v23hid1", host))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void v23RejectsAnUnknownAudience() {
        UUID host = insertHost("v23-unk@bumpinto.test");
        assertThatThrownBy(() -> insertOpenPlan(host, "v23unk1",
                "2026-09-13T08:00:00Z", null, "EVERYONE"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    /** V20 satirlari (audience'siz) kisittan ONCE PUBLIC'e cekilir; kisit sonrasi audience'siz acik plan giremez. */
    @Test
    void v23RequiresAudienceOnAnOpenPlan() {
        UUID host = insertHost("v23-req@bumpinto.test");
        assertThatThrownBy(() -> insertOpenPlan(host, "v23req1",
                "2026-09-13T08:00:00Z", null, null))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private void insertOpenPlan(UUID host, String slug, String meetAt, String openUntil,
                                String audience) {
        jdbc.update("insert into sessions (id, slug, host_id, name, activity_types, session_type, "
                + "status, expires_at, meet_at, capacity, join_policy, open_until, audience) "
                + "values (?, ?, ?, 'x', 'HIKE', 'GROUP', 'COLLECTING', ?::timestamptz + interval '3 hours', "
                + "?::timestamptz, 4, 'OPEN', ?::timestamptz, ?)",
                UUID.randomUUID(), slug, host, meetAt, meetAt, openUntil, audience);
    }
```
`insertHost` dosyada zaten var; `sessions` tablosunun mevcut NOT NULL kolonları için eldeki `insertSession` yardımcısına bak ve aynı zorunlu kolon setini kullan (yukarıdaki liste onun eşidir; farklıysa oradakini esas al).

- [ ] **Step 2: Kırmızı gör** — `eval "$BTEST1"'OpenPlanStoreAdapterTest,SchemaMigrationTest'` → FAIL (kolon yok / ctor yok).

- [ ] **Step 3: V23**

```sql
-- V23__instant_plans.sql — B-18: "Buradayım" penceresi, kitle, Keşfet'in kaba yer adı.
--
-- open_until: pencereli ("buradayım") plan; null = noktasal plan (B-17 davranışı).
-- audience : PUBLIC (Keşfet) | FRIENDS (B-19, sunucu o ize kadar reddeder) | NONE (yalnız link).
-- locality : herkese açık KABA yer adı (semt). midpoint_label host'un etiketi ve üyelere özeldir;
--            Keşfet kartı artık onu değil bunu basar (K-B38 sızıntısı).
alter table sessions add column open_until timestamptz;
alter table sessions add column audience   text;
alter table sessions add column locality   text;

-- Pencere yalnız açık planda ve en çok 3 saat: "buradayım" TTL'siz süremez (OpenPlan.MAX_WINDOW).
alter table sessions add constraint sessions_open_until_check
    check (open_until is null
           or (meet_at is not null and open_until > meet_at
               and open_until <= meet_at + interval '3 hours'));

-- Kitle açık planın parçası: V20 satırları Keşfet'teydi, PUBLIC kalır. Backfill kısıttan ÖNCE.
update sessions set audience = 'PUBLIC' where meet_at is not null;
alter table sessions add constraint sessions_audience_check
    check ((meet_at is null) = (audience is null)
           and (audience is null or audience in ('PUBLIC', 'FRIENDS', 'NONE')));

-- Keşfet yalnız PUBLIC okur; kısmi indeks daralır (FRIENDS/NONE hiç girmez).
drop index sessions_discover_idx;
create index sessions_discover_idx on sessions (meet_at) where audience = 'PUBLIC';
```

- [ ] **Step 4: `SessionEntity`** — `String joinPolicy;` altına:

```java
    /** B-18: pencere sonu (null = noktasal), kitle, kaba yer adi. Kisitlar semada (V23). */
    Instant openUntil;
    String audience;
    String locality;
```

- [ ] **Step 5: `SessionStoreAdapter`** — `saveSession`'da `e.joinPolicy = ...` satırından sonra:

```java
        e.openUntil = s.openPlan() == null ? null : s.openPlan().openUntil();
        e.audience = s.openPlan() == null ? null : s.openPlan().audience().name();
        e.locality = s.locality();
```
`toSession`: son argümanlar `..., e.joinCode, openPlanOf(e), e.locality);`. `openPlanOf`:

```java
    /** Kolonlar birlikte gider birlikte gelir; sekil kisiti semada, burada tek bir null kapisi. */
    private static OpenPlan openPlanOf(SessionEntity e) {
        return e.meetAt == null ? null
                : new OpenPlan(e.meetAt, e.capacity, JoinPolicy.valueOf(e.joinPolicy),
                        e.openUntil, Audience.valueOf(e.audience));
    }
```
Import `com.bumpinto.domain.session.Audience`.

- [ ] **Step 6: `SessionRepository.findPublicUpcoming`** — sorgu ve Javadoc:

```java
    /**
     * Kesfet listesi. Dort kapi: (1) kitle PUBLIC (kismi indeks tam bunu tasiyor; audience dolu
     * <=> meet_at dolu, V23), (2) bitis GELECEKTE — noktasal planda meet_at, pencereli planda
     * open_until, yani SUREN "buradayim" listede kalir — ve baslangic ufuk icinde, (3) TTL
     * gecmemis, (4) karar verilmis ya da suresi dolmus degil.
     */
    @Query("""
            select s from SessionEntity s
            where s.audience = 'PUBLIC'
              and coalesce(s.openUntil, s.meetAt) > :now and s.meetAt < :until
              and s.expiresAt >= :now and s.status not in ('DECIDED', 'EXPIRED')
            order by s.meetAt asc
            """)
    List<SessionEntity> findPublicUpcoming(Instant now, Instant until);
```

- [ ] **Step 7: `FakeStores.InMemorySessionStore.findPublicUpcoming`** — gerçek sorgunun aynası:

```java
        /** Gercek sorgunun (SessionRepository.findPublicUpcoming) dort kapisinin aynisi (V23 sonrasi). */
        @Override public List<Session> findPublicUpcoming(Instant now, Instant until) {
            return sessions.values().stream()
                    .filter(Session::isOpenPlan)
                    .filter(s -> s.openPlan().listedInDiscover())
                    .filter(s -> s.openPlan().end().isAfter(now)
                            && s.openPlan().meetAt().isBefore(until))
                    .filter(s -> !s.expiresAt().isBefore(now))
                    .filter(s -> s.status() != SessionStatus.DECIDED
                            && s.status() != SessionStatus.EXPIRED)
                    .sorted(Comparator.comparing(s -> s.openPlan().meetAt()))
                    .toList();
        }
```

- [ ] **Step 8: Yeşil gör** — `eval "$BTEST1"'OpenPlanStoreAdapterTest,SchemaMigrationTest,DiscoverQueriesTest'` → PASS. `SchemaMigrationTest` mevcut "tablo/kolon sayısı" testleri V23 kolonlarıyla bozulduysa (ör. kolon listesi `containsExactly`), o beklentiyi güncelle.

- [ ] **Step 9:** Değişen dosyalar: `V23__instant_plans.sql`, `SessionEntity.java`, `SessionStoreAdapter.java`, `SessionRepository.java`, `FakeStores.java`, `OpenPlanStoreAdapterTest.java`, `SchemaMigrationTest.java`. Commit kullanıcıda.

---

### Task 3: `SessionCommands` — `locality` kuruluşta, pencereli plana çapa zorunlu; check-in bitişe bakar

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/application/session/SessionCommands.java`
- Test: `backend/src/test/java/com/bumpinto/application/session/SessionCommandsTest.java`, `backend/src/test/java/com/bumpinto/application/session/MeetCheckinsTest.java`

- [ ] **Step 1: Testler** — `SessionCommandsTest`'te mevcut `anAnchoredOpenPlanKeepsTheHostsOwnLabel` testini şu hâle getir (davranış değişti: çapa artık semt için BİR kez geocode edilir):

```java
    /**
     * Capali acik planda host'un YAZDIGI ad uyelere kalir (`midpointLabel`), Kesfet'e giden
     * `locality` ise capanin ters geocode'lu SEMTIDIR (K-B38): "Café X, Kleine Berg 12" onaysiz
     * herkese gitmez. Tek geocode cagrisi: ikisi ayni noktadan turemez, yalniz biri ag ister.
     */
    @Test
    void anAnchoredOpenPlanKeepsTheHostsLabelButPublishesOnlyTheDistrict() {
        geocoder.label = "Stratum";

        SessionCommands.CreateSessionResult r = commands.createSession(UUID.randomUUID(),
                "Yürüyüş", List.of(ActivityType.HIKE), SessionType.GROUP, DEN_BOSCH, "Ayşe",
                null, TravelMode.BIKE,
                new SessionCommands.Anchor(SOMEREN, "Café Zwart, Kleine Berg 12"),
                new OpenPlan(Instant.parse("2026-09-13T08:00:00Z"), 4, JoinPolicy.APPROVAL));

        assertThat(r.session().midpointLabel()).isEqualTo("Café Zwart, Kleine Berg 12");
        assertThat(r.session().locality()).isEqualTo("Stratum");
        assertThat(geocoder.calls).isEqualTo(1);
    }

    /** Capasiz acik planda semt host konumundan: `locality` ve `midpointLabel` ayni ada duser, tek cagri. */
    @Test
    void anAnchorlessOpenPlanUsesTheHostDistrictForBothLabels() {
        geocoder.label = "Woensel";

        SessionCommands.CreateSessionResult r = commands.createSession(UUID.randomUUID(),
                "Yürüyüş", List.of(ActivityType.HIKE), SessionType.GROUP, DEN_BOSCH, "Ayşe",
                null, TravelMode.BIKE, null,
                new OpenPlan(Instant.parse("2026-09-13T08:00:00Z"), 4, JoinPolicy.APPROVAL));

        assertThat(r.session().locality()).isEqualTo("Woensel");
        assertThat(r.session().midpointLabel()).isEqualTo("Woensel");
        assertThat(geocoder.calls).isEqualTo(1);
    }

    /** "Buradayim" noktasiz olamaz: pencereli plan capa ister, 400'e esleneni IllegalArgumentException. */
    @Test
    void aWindowedPlanRequiresAnAnchor() {
        Instant now = Instant.parse("2026-09-13T08:00:00Z");
        OpenPlan windowed = new OpenPlan(now, 4, JoinPolicy.OPEN, now.plus(Duration.ofHours(2)),
                Audience.PUBLIC);

        assertThatThrownBy(() -> commands.createSession(UUID.randomUUID(), "Kahve",
                List.of(ActivityType.COFFEE), SessionType.GROUP, DEN_BOSCH, "Ayşe", null,
                TravelMode.WALK, null, windowed))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("open_plan_anchor_required");
        assertThat(store.sessions).isEmpty();
    }

    /** Pencereli planin TTL'i pencere sonu + 3 saat (OpenPlan.end). */
    @Test
    void aWindowedPlanExpiresThreeHoursAfterItsWindowEnds() {
        Instant now = Instant.parse("2026-09-13T08:00:00Z");
        SessionCommands.CreateSessionResult r = commands.createSession(UUID.randomUUID(), "Kahve",
                List.of(ActivityType.COFFEE), SessionType.GROUP, DEN_BOSCH, "Ayşe", null,
                TravelMode.WALK, new SessionCommands.Anchor(SOMEREN, "Café Zwart"),
                new OpenPlan(now, 4, JoinPolicy.OPEN, now.plus(Duration.ofHours(2)), Audience.PUBLIC));

        assertThat(r.session().expiresAt()).isEqualTo(Instant.parse("2026-09-13T13:00:00Z"));
    }
```
Importlar: `Audience`, `java.time.Duration`. `store.sessions` `InMemorySessionStore`'un public haritası.

`MeetCheckinsTest`'e:

```java
    /** Pencereli planda soru pencere KAPANINCA sorulur; surerken "bulustunuz mu" niyet olur. */
    @Test
    void aWindowedPlanAsksAfterItsWindowNotAtItsStart() {
        Instant until = MEET.plus(java.time.Duration.ofHours(2));
        SessionCommands.CreateSessionResult r = commands.createSession(host, "Kahve",
                List.of(ActivityType.COFFEE), SessionType.GROUP, new GeoPoint(51.44, 5.47), "Ayşe",
                null, TravelMode.WALK,
                new SessionCommands.Anchor(new GeoPoint(51.44, 5.47), "Café Zwart"),
                new OpenPlan(MEET, 4, JoinPolicy.OPEN, until, Audience.PUBLIC));

        assertThatThrownBy(() -> at(MEET.plusSeconds(60)).record(r.session().slug(),
                r.hostParticipant().id(), true)).isInstanceOf(ConflictException.class);
        at(until).record(r.session().slug(), r.hostParticipant().id(), true);
        assertThat(checkins.saved).hasSize(1);
    }
```

- [ ] **Step 2: Kırmızı gör** — `eval "$BTEST1"'SessionCommandsTest,MeetCheckinsTest'` → FAIL.

- [ ] **Step 3: `SessionCommands.createSession`** — gövdeyi şu hâle getir:

```java
        // Acik planda tek ters geocode: `locality` (herkese acik semt) buradan; capasiz planda
        // `midpointLabel` de ayni addir. Capali planda midpointLabel host'un etiketi kalir (uyelere ozel).
        if (openPlan != null && openPlan.openUntil() != null && anchor == null) {
            // "Buradayim" noktasiz olamaz; IllegalArgumentException -> 400 (ApiExceptionHandler).
            throw new IllegalArgumentException("open_plan_anchor_required");
        }
        String locality = localityAt(anchor, hostLocation, openPlan);
        Instant expiresAt = openPlan == null ? clock.instant().plus(SESSION_TTL)
                : openPlan.expiresAt();
        Session session = store.saveSession(new Session(UUID.randomUUID(), Ids.slug(), hostUserId,
                Texts.sessionName(name), types, sessionType, SessionStatus.COLLECTING,
                expiresAt, null, List.of(),
                null, null, null,
                midpointLabelAt(anchor, openPlan, locality),
                anchor == null ? null : anchor.point(),
                store.freshJoinCode(), openPlan, locality));
```
Yardımcılar (`midpointLabelAt`'in eski gövdesi silinir, Javadoc güncellenir):

```java
    /**
     * Kesfet'in HERKESE ACIK, KABA yer adi (B-18, K-B38). Capali planda capa ETIKETI degil capanin
     * SEMTI: host "Café X, Kleine Berg 12" yazarsa kesin nokta onaysiz herkese gitmesin. Capasiz
     * planda host'un konumu (tek katilimcinin konumu o anki orta noktadir, K-B15). Gizli oturum bu
     * cagriyi YAPMAZ. Basarisizlik NORMALDIR — null kalir, kart o satiri hic cizmez.
     */
    private String localityAt(Anchor anchor, GeoPoint hostLocation, OpenPlan openPlan) {
        if (openPlan == null) {
            return null;
        }
        GeoPoint target = anchor != null ? anchor.point() : hostLocation;
        return target == null ? null : geocoder.label(target).orElse(null);
    }

    /** Merkezin adi. Capali oturumda host'un yazdigi ad (uyelere ozel); capasiz acik planda semt; gizlide null. */
    private static String midpointLabelAt(Anchor anchor, OpenPlan openPlan, String locality) {
        if (anchor != null) {
            return Texts.label(anchor.label());
        }
        return openPlan == null ? null : locality;
    }
```

- [ ] **Step 4: Yeşil gör** — `eval "$BTEST1"'SessionCommandsTest,MeetCheckinsTest,DiscoverQueriesTest'` → PASS (`MeetCheckins.record` zaten `meetPassed` çağırıyor; `end()` üzerinden geçer, kod değişmez).

- [ ] **Step 5:** Değişen dosyalar: `SessionCommands.java`, `SessionCommandsTest.java`, `MeetCheckinsTest.java`. Commit kullanıcıda.

---

### Task 4: Web katmanı — DTO alanları, kitle doğrulaması, Keşfet kartı `locality`/`openUntil`

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/ApiDtos.java` (`OpenPlanInput`, `OpenPlanDto`, `PlanCardDto`)
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/SessionController.java` (`openPlanOf`)
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/SessionViewAssembler.java` (`openPlanDto`, `toDiscover`)
- Test: `backend/src/test/java/com/bumpinto/DiscoverApiTest.java`

- [ ] **Step 1: Başarısız test** — `DiscoverApiTest`'e `@MockitoBean ReverseGeocodePort geocoder;` ekle (import `com.bumpinto.domain.port.ReverseGeocodePort`, `java.util.Optional`, `org.mockito.ArgumentMatchers.any`) ve:

```java
    /**
     * B-18: suren "buradayim" plani Kesfet'te (meetAt gecmis, openUntil gelecek), kart capa
     * ETIKETINI degil semti basar (K-B38), NONE kitleli plan listede yok ama linkle onizlenir,
     * FRIENDS kitlesi B-19'a kadar 400.
     */
    @Test
    void instantPlansAreListedWhileOpenAndNeverLeakTheAnchorLabel() throws Exception {
        when(geocoder.label(any())).thenReturn(Optional.of("Stratum"));
        Cookie host = login("gid-ip-host", "host-ip@bumpinto.test", "Ayşe");
        Cookie guest = login("gid-ip-guest", "guest-ip@bumpinto.test", "Priya");
        java.time.Instant now = java.time.Instant.now();
        String meetAt = now.minus(java.time.Duration.ofMinutes(5)).toString();
        String openUntil = now.plus(java.time.Duration.ofHours(2)).toString();

        String live = json.writeValueAsString(Map.of(
                "activityTypes", List.of("COFFEE"), "displayName", "Ayşe", "name", "Kahve",
                "travelMode", "WALK",
                "anchor", Map.of("lat", 51.44, "lng", 5.47, "label", "Café Zwart, Kleine Berg 12"),
                "openPlan", Map.of("meetAt", meetAt, "openUntil", openUntil, "capacity", 4,
                        "joinPolicy", "OPEN", "audience", "PUBLIC")));
        String liveSlug = json.readTree(mvc.perform(post("/api/sessions").header("X-Client", "web")
                        .cookie(host).contentType(JSON).content(live))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString())
                .get("slug").asString();

        String hidden = json.writeValueAsString(Map.of(
                "activityTypes", List.of("COFFEE"), "displayName", "Ayşe", "name", "Gizli kahve",
                "travelMode", "WALK",
                "anchor", Map.of("lat", 51.44, "lng", 5.47, "label", "Café Zwart"),
                "openPlan", Map.of("meetAt", meetAt, "openUntil", openUntil, "capacity", 4,
                        "joinPolicy", "OPEN", "audience", "NONE")));
        String hiddenSlug = json.readTree(mvc.perform(post("/api/sessions").header("X-Client", "web")
                        .cookie(host).contentType(JSON).content(hidden))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString())
                .get("slug").asString();

        MvcResult list = mvc.perform(get("/api/discover").param("activity", "COFFEE").cookie(guest))
                .andExpect(status().isOk()).andReturn();
        String body = list.getResponse().getContentAsString();
        assertThat(body).contains("\"slug\":\"" + liveSlug + "\"")
                .contains("\"locality\":\"Stratum\"")
                .contains("\"openUntil\":\"" + openUntil.substring(0, 19))
                .doesNotContain("Kleine Berg")
                .doesNotContain(hiddenSlug);

        // NONE: listede yok ama davet linki onizler; kitle DTO'da gorunur.
        mvc.perform(get("/api/sessions/" + hiddenSlug + "/preview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.openPlan.audience").value("NONE"))
                .andExpect(jsonPath("$.openPlan.inProgress").value(true));

        // FRIENDS: B-19'a kadar 400 (sozlesmede enum tam, davranis kapili).
        String friends = live.replace("\"audience\":\"PUBLIC\"", "\"audience\":\"FRIENDS\"");
        mvc.perform(post("/api/sessions").header("X-Client", "web").cookie(host)
                        .contentType(JSON).content(friends))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("audience_not_available"));

        // Pencereli plan capasiz olamaz.
        String noAnchor = json.writeValueAsString(Map.of(
                "activityTypes", List.of("COFFEE"), "displayName", "Ayşe", "lat", 51.44, "lng", 5.47,
                "travelMode", "WALK",
                "openPlan", Map.of("meetAt", meetAt, "openUntil", openUntil, "joinPolicy", "OPEN")));
        mvc.perform(post("/api/sessions").header("X-Client", "web").cookie(host)
                        .contentType(JSON).content(noAnchor))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("open_plan_anchor_required"));
    }
```
`Map.of` 10 çifti aşarsa `Map.ofEntries` kullan. `.asString()` Jackson 3 (`asText` değil).

- [ ] **Step 2: Kırmızı gör** — `eval "$BTEST1"DiscoverApiTest` → FAIL (`openUntil`/`audience` bilinmeyen alan → 400 ya da JSON'da alan yok).

- [ ] **Step 3: `ApiDtos`**

```java
    /**
     * Acik plan GIRDISI. Kapasite/politika/kitle opsiyonel: null -> 4 / APPROVAL / PUBLIC.
     * `openUntil` (B-18) verilirse plan "buradayim" penceresidir: (meetAt, meetAt+3h] — sinir
     * OpenPlan'da ve V23'te. FRIENDS kitlesi B-19'a kadar 400 (SessionController.openPlanOf).
     */
    public record OpenPlanInput(@NotNull Instant meetAt,
                                @Min(3) @Max(8) Integer capacity,
                                JoinPolicy joinPolicy,
                                Instant openUntil,
                                Audience audience) {
    }

    /** Acik planin OKUMA yuzu. `approvedSeats`/`confirmed`/`meetPassed`/`inProgress` turetilir, saklanmaz. */
    public record OpenPlanDto(Instant meetAt, int capacity, JoinPolicy joinPolicy,
                              int approvedSeats, boolean confirmed, boolean meetPassed,
                              Instant openUntil, boolean inProgress, Audience audience) {
    }

    /**
     * Kesfet karti. Kesin konum TASIMAZ: {@code locality} SEMT adi (B-18'den beri `Session.locality`,
     * host'un capa etiketi DEGIL — K-B38), {@code minutes} isteyenin kendi yuvarlanmis konumundan.
     * {@code openUntil} dolu ise plan pencereli ("buradayim"); istemci "suruyor" satirini ondan cizer.
     */
    public record PlanCardDto(String slug, String name, List<ActivityType> activityTypes,
                              Instant meetAt, int capacity, int approvedSeats, boolean confirmed,
                              JoinPolicy joinPolicy, String hostDisplayName, String locality,
                              Integer minutes, TravelMode travelMode, Instant openUntil) {
    }
```
Import `com.bumpinto.domain.session.Audience`.

- [ ] **Step 4: `SessionController.openPlanOf`**

```java
    /**
     * Girdi -> domain. Kapasite/politika/kitle opsiyonel: null -> 4 / APPROVAL / PUBLIC.
     * Varsayilan APPROVAL, cunku Kesfet YABANCILARA aciktir. Anlik planin OPEN varsayilanini
     * FORM secer (spec karar 4), sunucu politika dayatmaz. FRIENDS kitlesi B-19 inene kadar 400:
     * sozlesmede enum tam, davranis kapili — istemci enum'u simdiden uretir.
     */
    private static OpenPlan openPlanOf(ApiDtos.CreateSessionRequest request) {
        ApiDtos.OpenPlanInput in = request.openPlan();
        if (in == null) {
            return null;
        }
        Audience audience = in.audience() == null ? Audience.PUBLIC : in.audience();
        if (audience == Audience.FRIENDS) {
            throw new IllegalArgumentException("audience_not_available");
        }
        return new OpenPlan(in.meetAt(),
                in.capacity() == null ? OpenPlan.DEFAULT_CAPACITY : in.capacity(),
                in.joinPolicy() == null ? JoinPolicy.APPROVAL : in.joinPolicy(),
                in.openUntil(), audience);
    }
```

- [ ] **Step 5: `SessionViewAssembler`**

```java
    ApiDtos.OpenPlanDto openPlanDto(Session session, List<Participant> participants) {
        OpenPlan plan = session.openPlan();
        if (plan == null) {
            return null;
        }
        int approved = (int) participants.stream()
                .filter(p -> !p.manual() && p.userId() != null).count();
        Instant now = clock.instant();
        return new ApiDtos.OpenPlanDto(plan.meetAt(), plan.capacity(), plan.joinPolicy(),
                approved, plan.confirmed(approved), plan.meetPassed(now),
                plan.openUntil(), plan.inProgress(now), plan.audience());
    }
```
`toDiscover` kart eşlemesinde `r.session().midpointLabel()` → `r.session().locality()`, sona `r.session().openPlan().openUntil()`; Javadoc'taki "midpointLabel" anlatımı "Session.locality (B-18, K-B38)" olur.

- [ ] **Step 6: Yeşil gör** — `eval "$BTEST1"'DiscoverApiTest,SessionViewAssemblerTest'` → PASS. `SessionViewAssemblerTest` `OpenPlanDto` ctor'unu doğrudan kuruyorsa 9-arg'a taşı.

- [ ] **Step 7:** Değişen dosyalar: `ApiDtos.java`, `SessionController.java`, `SessionViewAssembler.java`, `DiscoverApiTest.java` (+ gerekirse `SessionViewAssemblerTest.java`). Commit kullanıcıda.

---

### Task 5: Sayaçlar — `plansMet` + `metStreakWeeks`

**Files:**
- Create: `backend/src/main/java/com/bumpinto/application/user/MetStreak.java`
- Modify: `backend/src/main/java/com/bumpinto/domain/port/MeetCheckinStorePort.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/out/persistence/MeetCheckinRepository.java`, `MeetCheckinStoreAdapter.java`
- Modify: `backend/src/main/java/com/bumpinto/application/user/UserProfileQueries.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/ApiDtos.java` (`StatsDto`), `MeController.java`
- Modify: `backend/src/test/java/com/bumpinto/support/FakeStores.java` (`InMemoryMeetCheckinStore`)
- Test: `backend/src/test/java/com/bumpinto/application/user/MetStreakTest.java` (yeni), `UserProfileQueriesTest.java`, `backend/src/test/java/com/bumpinto/adapter/out/persistence/OpenPlanStoreAdapterTest.java`

- [ ] **Step 1: Başarısız testler**

`MetStreakTest` (yeni):

```java
package com.bumpinto.application.user;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Haftalik seri: ISO haftasi (Pazartesi baslangic, UTC). Bu hafta YA DA gecen hafta bulusma
 * varsa seri sayilir — Cumartesi bulusan biri Pazartesi "seri bitti" gormesin.
 */
class MetStreakTest {

    // 2026-09-09 Carsamba (ISO haftasi Pzt 2026-09-07 ile baslar).
    static final Instant NOW = Instant.parse("2026-09-09T10:00:00Z");
    static final Duration WEEK = Duration.ofDays(7);

    @Test
    void noCheckinsIsZero() {
        assertThat(MetStreak.weeks(List.of(), NOW)).isZero();
    }

    @Test
    void thisWeekAloneIsOne() {
        assertThat(MetStreak.weeks(List.of(NOW.minus(Duration.ofDays(1))), NOW)).isEqualTo(1);
    }

    /** Gecen hafta bulustu, bu hafta henuz degil: seri hala 1 (hafta ortasi kirilmaz). */
    @Test
    void lastWeekStillCountsWhenThisWeekIsEmpty() {
        assertThat(MetStreak.weeks(List.of(NOW.minus(WEEK)), NOW)).isEqualTo(1);
    }

    @Test
    void consecutiveWeeksAddUpAndAGapBreaksTheStreak() {
        List<Instant> met = List.of(NOW, NOW.minus(WEEK), NOW.minus(WEEK.multipliedBy(2)),
                NOW.minus(WEEK.multipliedBy(4))); // 3. hafta bos -> 4. sayilmaz
        assertThat(MetStreak.weeks(met, NOW)).isEqualTo(3);
    }

    /** Iki hafta once son bulusma: seri bitti. */
    @Test
    void twoWeeksAgoIsBroken() {
        assertThat(MetStreak.weeks(List.of(NOW.minus(WEEK.multipliedBy(2))), NOW)).isZero();
    }

    /** Hafta siniri Pazartesi 00:00 UTC: Pazar gecesi ile Pazartesi sabahi farkli haftadir. */
    @Test
    void weekBoundaryIsMondayUtc() {
        Instant sundayNight = Instant.parse("2026-09-06T23:59:59Z");
        Instant mondayMorning = Instant.parse("2026-09-07T00:00:00Z");
        assertThat(MetStreak.weekIndex(sundayNight) + 1).isEqualTo(MetStreak.weekIndex(mondayMorning));
    }
}
```

`UserProfileQueriesTest`: `setUp`'ta `checkins = new FakeStores.InMemoryMeetCheckinStore();` ve `queries = new UserProfileQueries(users, sessions, checkins, Clock.fixed(NOW, ZoneOffset.UTC));`; `join` katılımcıyı döndürsün (`return sessions.saveParticipant(...)`) ve `userId` alsın — mevcut `join(s1, "Host", true, false)` çağrıları `join(s1, "Host", true, false, host)` olur, misafirler `UUID.randomUUID()` ile. Yeni test:

```java
    /** plansMet = kendi koltuklarimin met=true cevaplari; seri bu/gecen haftadan geriye ardisik. */
    @Test
    void meReportsPlansMetAndWeeklyStreak() {
        Participant mineInS1 = join(s1, "Host", true, false, host);
        Participant mineInS2 = join(s2, "Host", true, false, host);
        Participant someoneElse = join(s2, "Kerem", false, false, UUID.randomUUID());
        checkins.userOfParticipant.put(mineInS1.id(), host);
        checkins.userOfParticipant.put(mineInS2.id(), host);
        checkins.userOfParticipant.put(someoneElse.id(), someoneElse.userId());
        checkins.upsert(new MeetCheckin(s1.id(), mineInS1.id(), true, NOW.minusSeconds(60)));
        checkins.upsert(new MeetCheckin(s2.id(), mineInS2.id(), true, NOW.minus(Duration.ofDays(7))));
        checkins.upsert(new MeetCheckin(s2.id(), someoneElse.id(), true, NOW)); // baskasinin
        checkins.upsert(new MeetCheckin(s3.id(), mineInS1.id(), false, NOW)); // "olmadi" sayilmaz

        UserProfileQueries.Stats stats = queries.me(host).stats();

        assertThat(stats.plansMet()).isEqualTo(2);
        assertThat(stats.metStreakWeeks()).isEqualTo(2);
    }
```
(`s3.id()` ile `mineInS1.id()` çifti sahte mağazada geçerli anahtardır; gerçek PK'yi taklit etmek bu testin konusu değil.) Importlar: `MeetCheckin`, `Participant`, `Duration`. Mevcut `meReportsHostedSessionsAndDistinctFriendsMet` beklentileri değişmez.

`OpenPlanStoreAdapterTest`:

```java
    /** Sayac sorgusu: yalniz o hesabin, yalniz met=true satirlari; baskasinin ve "olmadi" disarida. */
    @Test
    void metCheckinTimesOfReturnsOnlyThatUsersMetRows() {
        Session s = sessions.saveSession(session("rt-met",
                new OpenPlan(NOW.plus(Duration.ofDays(1)), 4, JoinPolicy.OPEN)));
        UUID me = users.upsertByEmail("me-met@bumpinto.test", "Ben");
        UUID other = users.upsertByEmail("other-met@bumpinto.test", "O");
        Participant mine = sessions.saveParticipant(new Participant(UUID.randomUUID(), s.id(),
                "Ben", null, true, null, false, null, TravelMode.CAR, me));
        Participant theirs = sessions.saveParticipant(new Participant(UUID.randomUUID(), s.id(),
                "O", null, false, null, false, null, TravelMode.CAR, other));
        checkins.upsert(new MeetCheckin(s.id(), mine.id(), true, NOW));
        checkins.upsert(new MeetCheckin(s.id(), theirs.id(), true, NOW));

        assertThat(checkins.metCheckinTimesOf(me)).hasSize(1);
        assertThat(checkins.metCheckinTimesOf(other)).hasSize(1);

        checkins.upsert(new MeetCheckin(s.id(), mine.id(), false, NOW));
        assertThat(checkins.metCheckinTimesOf(me)).isEmpty();
    }
```

- [ ] **Step 2: Kırmızı gör** — `eval "$BTEST1"'MetStreakTest,UserProfileQueriesTest,OpenPlanStoreAdapterTest'` → FAIL.

- [ ] **Step 3: Port + repo + adaptör**

`MeetCheckinStorePort`:
```java
    /** Hesabin met=true check-in zamanlari (koltuklari uzerinden), en yeniden eskiye. Sayac ve seri icin. */
    List<Instant> metCheckinTimesOf(UUID userId);
```
`MeetCheckinRepository` (JPQL çapraz birleşim, `countDistinctGuestsOfHost` kalıbı):
```java
    @Query("select c from MeetCheckinEntity c, ParticipantEntity p "
            + "where p.id = c.id.participantId and p.userId = :userId and c.met = true "
            + "order by c.createdAt desc")
    List<MeetCheckinEntity> findMetByUser(UUID userId);
```
`MeetCheckinStoreAdapter`:
```java
    @Override public List<Instant> metCheckinTimesOf(UUID userId) {
        return repo.findMetByUser(userId).stream().map(e -> e.createdAt).toList();
    }
```
`FakeStores.InMemoryMeetCheckinStore`:
```java
    public static class InMemoryMeetCheckinStore implements MeetCheckinStorePort {
        public final Map<String, MeetCheckin> saved = new LinkedHashMap<>();
        /** Gercek sorgu participants.user_id uzerinden gider; sahte magaza eslemeyi testten alir. */
        public final Map<UUID, UUID> userOfParticipant = new HashMap<>();

        @Override public void upsert(MeetCheckin c) {
            saved.put(c.sessionId() + ":" + c.participantId(), c);
        }

        @Override public List<Instant> metCheckinTimesOf(UUID userId) {
            return saved.values().stream()
                    .filter(MeetCheckin::met)
                    .filter(c -> userId.equals(userOfParticipant.get(c.participantId())))
                    .map(MeetCheckin::createdAt)
                    .sorted(Comparator.reverseOrder())
                    .toList();
        }
    }
```

- [ ] **Step 4: `MetStreak.java`**

```java
package com.bumpinto.application.user;

import java.time.Instant;
import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Haftalik "bulustuk" serisi (B-18 rozetleri). ISO haftasi: Pazartesi baslangic, UTC. Bu hafta YA
 * DA gecen hafta bulusma varsa seri yasar (hafta ortasinda "seri bitti" gorulmez), oradan geriye
 * kesintisiz haftalar sayilir. Saf fonksiyon; saat dilimi bilerek UTC — profil dili/dilimi seriyi
 * bir gun kaydirsa bile rozet esikleri (3 hafta) bundan etkilenmez.
 */
final class MetStreak {

    private MetStreak() {
    }

    static int weeks(Collection<Instant> metAt, Instant now) {
        Set<Long> weeks = metAt.stream().map(MetStreak::weekIndex).collect(Collectors.toSet());
        long cursor = weekIndex(now);
        if (!weeks.contains(cursor)) {
            cursor--;
            if (!weeks.contains(cursor)) {
                return 0;
            }
        }
        int n = 0;
        while (weeks.contains(cursor)) {
            n++;
            cursor--;
        }
        return n;
    }

    /** Epoch'tan beri hafta indeksi; 1970-01-01 Persembe oldugu icin +3 gun kaydirilir, boylece sinir Pazartesi 00:00 UTC. */
    static long weekIndex(Instant t) {
        return Math.floorDiv(Math.floorDiv(t.getEpochSecond(), 86_400L) + 3, 7L);
    }
}
```

- [ ] **Step 5: `UserProfileQueries`**

```java
    public record Stats(long sessionsHosted, long friendsMet, long plansMet, int metStreakWeeks) {
    }
    // ...
    private final MeetCheckinStorePort checkins;

    public UserProfileQueries(UserStorePort users, SessionStorePort sessions,
                              MeetCheckinStorePort checkins, Clock clock) { ... }

    public Me me(UUID userId) {
        UserProfile profile = users.profileOf(userId)
                .orElseThrow(() -> new NotFoundException("user not found"));
        // "Bulustuk" cevaplari koltuk uzerinden hesaba baglanir; rozetler istemcide bu sayidan turer.
        List<Instant> met = checkins.metCheckinTimesOf(userId);
        return new Me(profile, new Stats(sessions.hostedSessionCount(userId),
                sessions.distinctGuestsOfHost(userId), met.size(),
                MetStreak.weeks(met, clock.instant())));
    }
```
`ApiDtos.StatsDto(long sessionsHosted, long friendsMet, long plansMet, int metStreakWeeks)`; `MeController`: `new ApiDtos.StatsDto(me.stats().sessionsHosted(), me.stats().friendsMet(), me.stats().plansMet(), me.stats().metStreakWeeks())`.

- [ ] **Step 6: Yeşil gör** — `eval "$BTEST1"'MetStreakTest,UserProfileQueriesTest,OpenPlanStoreAdapterTest,MeControllerTest'` → PASS (MeController testi `StatsDto` alanlarına bakıyorsa güncelle). Sonra **tam regresyon**: `eval "$BTEST"` → BUILD SUCCESS; sayıyı not al (B-17 sonrası taban 587).

- [ ] **Step 7:** Değişen dosyalar listesi. Commit kullanıcıda.

---

### Task 6: OpenAPI + codegen, Bruno, ARCHITECTURE, INDEX kapanışı

**Files:**
- Modify: `frontend/shared/openapi.json`, `frontend/shared/src/api-types.ts` (üretilir; elle DÜZENLENMEZ)
- Create: `backend/.infra/bumpinto-collection/sessions/create-instant-plan.yml`
- Modify: `backend/.infra/bumpinto-collection/discover/list.yml` (docs bölümü)
- Modify: `backend/ARCHITECTURE.md` (açık plan paragrafı, satır ~139 civarı; §8 K-B37 paragrafının altına K-B38)
- Modify: `docs/superpowers/plans/INDEX.md` (B-18 → done, K-B38 → done)

- [ ] **Step 1: Codegen** — backend'i 8060 DIŞINDA bir portta kaldır (8060'ta bayat IDE debug süreci yarı-güncel spec verir):
```bash
cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 SERVER_PORT=8061 \
  DB_URL=jdbc:postgresql://localhost:5434/bumpinto SPRING_PROFILES_ACTIVE=local mvn -o spring-boot:run
# ayrı kabuk, repo kökü:
source ./init-nvm.sh && curl -sf http://localhost:8061/v3/api-docs -o frontend/shared/openapi.json && pnpm --filter @bumpinto/shared generate
```
Doğrula: `grep -n "openUntil\|audience\|plansMet\|metStreakWeeks" frontend/shared/src/api-types.ts` → `OpenPlanInput.openUntil?/audience?`, `OpenPlanDto.openUntil?/inProgress?/audience?`, `PlanCardDto.openUntil?`, `StatsDto.plansMet?/metStreakWeeks?`. `pnpm --filter @bumpinto/web exec tsc -b` temiz (web henüz yeni alanları kullanmıyor; kırılırsa W-17 el yaması yoktur, hata gerçek).

- [ ] **Step 2: Bruno** — `sessions/create-instant-plan.yml`:

```yaml
info:
  name: Create Instant Plan (Buradayım)
  type: http
  seq: 12

http:
  method: POST
  url: "{{baseUrl}}/api/sessions"
  headers:
    - name: content-type
      value: application/json
    - name: X-Client
      value: web
  body:
    type: json
    data: |-
      {
        "activityTypes": ["COFFEE"],
        "name": "Öğleden sonra kahve",
        "displayName": "Mehmet",
        "travelMode": "WALK",
        "anchor": { "lat": 51.4382, "lng": 5.4765, "label": "Café Zwart, Kleine Berg" },
        "openPlan": {
          "meetAt": "{{nowIso}}",
          "openUntil": "{{nowPlus2hIso}}",
          "capacity": 4,
          "joinPolicy": "OPEN",
          "audience": "PUBLIC"
        }
      }
  auth:
    type: bearer
    token: "{{accessToken}}"

runtime:
  scripts:
    - type: pre-request
      code: |-
        const now = new Date();
        bru.setVar("nowIso", now.toISOString());
        bru.setVar("nowPlus2hIso", new Date(now.getTime() + 2 * 3600 * 1000).toISOString());
    - type: after-response
      code: |-
        if (res.status === 201) { bru.setVar("slug", res.body.slug); }
    - type: tests
      code: |-
        test("201 doner", function() { expect(res.status).to.equal(201); });

docs:
  type: text/markdown
  content: |-
    B-18 "Buradayım": `openPlan.openUntil` verilirse plan PENCERELİDİR — (meetAt, meetAt+3h]
    dışı 400. Pencereli plan `anchor` ister (400 `open_plan_anchor_required`). `audience`
    `PUBLIC` (varsayılan) | `NONE` (listelenmez, yalnız link) | `FRIENDS` (B-19'a kadar 400
    `audience_not_available`). Keşfet süren planı `openUntil` geçene kadar listeler; kart
    `locality` olarak çapa ETİKETİNİ değil semti basar.
```
`seq` klasördeki en büyük + 1 olsun. `discover/list.yml` docs'a bir satır: "Süren pencereli planlar (`openUntil` gelecekte) listede kalır; `locality` semttir, çapa etiketi değil (B-18)."

- [ ] **Step 3: ARCHITECTURE.md** — açık plan paragrafına (satır ~139) ek cümle: "B-18: `OpenPlan.openUntil` pencereyi, `audience` kitleyi taşır; Keşfet yalnız `PUBLIC` ve `coalesce(open_until, meet_at) > now` okur; `Session.locality` herkese açık semt, `midpointLabel` üyelere özel etiket." §8'de K-B37 paragrafının altına: "**Çapa etiketi Keşfet kartına sızmaz (K-B38, B-18).** `PlanCardDto.locality` `Session.locality`'den gelir; host'un yazdığı çapa etiketi yalnız `SessionView.midpointLabel`'da (üye)."

- [ ] **Step 4: INDEX** — B-18 satırı `done`, K-B38 `done (B-18)`, kural 9'da "V23 = B-18 ✓ UYGULANDI". Değişen dosyalar listesi. Commit kullanıcıda.

---

## Öz-inceleme (plan yazımı sonrası)

- **Spec kapsamı:** §2 model → T1/T2; §3 Keşfet sorgusu + kitle doğrulaması + locality → T2/T3/T4; §3 stats → T5; §3 Bruno/ARCHITECTURE/codegen → T6; §6 "NONE planda link keşif yetkisi, koltuk SeatRequests'ten" → kod değişikliği gerektirmez (join kapısı K-B37 aynen, seat-request uçları slug ile çalışır) — T4 testi NONE önizlemesini kanıtlar. §1.4 OPEN varsayılanı sunucuda değil formda (W-18/M-12).
- **Tip tutarlılığı:** `OpenPlan(meetAt, capacity, joinPolicy, openUntil, audience)` T1'de tanımlanıp T2–T5'te aynı sırayla kullanıldı; `Session` 18-arg sırası `(..., joinCode, openPlan, locality)`; `Stats(sessionsHosted, friendsMet, plansMet, metStreakWeeks)` T5 ve `StatsDto` aynı sıra; `MeetCheckinStorePort.metCheckinTimesOf(UUID)` port/adaptör/sahte aynı ad.
- **Bilinen sapma riski:** `SchemaMigrationTest.insertSession` yardımcısının zorunlu kolon seti V23 testindeki `insertOpenPlan` ile aynı olmalı — uygulayan ajan oradaki listeyi esas alır. `SessionViewAssemblerTest`/`MeControllerTest` DTO ctor'larını doğrudan kuruyorsa derleme onları gösterir; davranış değişmez, yalnız arg eklenir.
