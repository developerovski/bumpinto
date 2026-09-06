# Mağaza Uyumluluk Çekirdeği — Backend (B-14) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App Store / Play başvurusunun reddine yol açan beş boşluğu kapatmak: Sign in with Apple (R-B1), hesap silme (R-B2), kurulumsuz web silme kimliği (R-B3), bildir/engelle (R-B4), açık rıza (R-B5). Migration V13–V16, 12 görev.

**Architecture:** Hexagonal devam. Yeni saf domain: `domain/user` (`AuthProvider`, `Consents`), `domain/safety` (`Report`, `ReportReason`, `Block`). Yeni portlar (`ReportStorePort`, `BlockStorePort`, `AppleTokensPort`); `UserStorePort` + `SessionStorePort` genişler. Apple id token doğrulaması `infra/security/AppleIdVerifier` (Google'ın eşi: JWKS + `NimbusJwtDecoder` + audience listesi + nonce). Apple sunucusuna giden tek dış çağrı `adapter/out/apple/AppleTokenClient` (kod→refresh takası, revoke; ikisi de **fail-open**). Uygulama: `AccountIdentity`, `UserConsents`, `AccountDeletion`, `application/safety/{Reports, Blocks, VoiceAdmission}`. Web: `AuthController`/`MeController` genişler, `ReportController` + `BlockController` açılır, ses odası engel filtresi `VoiceRoomListener` + `VoiceSignalController`'a bağlanır.

> **Ses filtresi neden `VoiceInboundGuard`'da DEĞİL:** o interceptor gövdedeki hedefi (`to`) hiç görmez — yalnız hedef adresini ve soket bütçesini denetler, durumsuzdur, depoya erişmez. §2 "engelli çift **aynı odaya alınmaz**" der; oda üyeliği `VoiceRoomListener`'da (SUBSCRIBE) doğar, kapı oradadır. `VoiceSignalController` ikinci savunma katmanıdır. `VoiceInboundGuard` bu planda değişmez.

**Tech Stack:** Spring Boot 4.1 (Spring 7, Jackson 3), Spring Security OAuth2 Resource Server (Nimbus JOSE), Spring Data JPA, Flyway, Unirest 4, Caffeine + bucket4j, JUnit 5, AssertJ, Mockito, MockMvc, ArchUnit, Testcontainers Postgres (`postgis/postgis:16-3.4`). **Yeni bağımlılık YOK.**

**Spec:** `docs/superpowers/specs/2026-09-06-v3-requirements.md` **§2 (sözleşme kararları — uç/alan adları DEĞİŞTİRİLMEZ)**, §3, §4. Gereksinimler: **R-B1** Apple girişi · **R-B2** hesap silme · **R-B3** kurulumsuz silme kimliği · **R-B4** bildir/engelle · **R-B5** rıza. Ham analiz `req/backend.md`. Uyumluluk kaynağı `2026-09-06-mobile-store-compliance.md` §1 L1/L10/L13–L15, §4.1–§4.3.

**UI Kaynağı:** Claude Design projesi `719fcd5f-bb62-4356-9c53-7d4f0a8fbe36`; dosyalar `Mobil Onboarding, İzinler ve Yasal.dc.html` ve `Web Ekranlar v3.dc.html`. Beslediği artboard'lar: **O2** (Giriş — Google + Apple eşit), **O8** (Hesap ve veriler), **O12** (Açık rıza), **O15/O16/O17** (Hesabı sil · onay · silindi), **O18/O19** (Bildir–Engelle · Bildirildi), **W13/W13b** (`/account`, rıza), **W18** (`/account/delete`, kurulum olmadan çalışır), **W20** (Bildir/Engelle paneli). Backend ekran çizmez; liste alanların hangi ekrana hizmet ettiğini sabitler. Ekran işleri W-14 ve M-5'tedir.

**Ön koşul:** **B-3 (plan6) `done` ve V12'yi almış olmalı** — R-B2'nin 30 günlük fiziksel temizliği o plandaki CronJob'a düşer; bu plan yalnız `deleted_at`/`purge_after` damgasını yazar.

```bash
cd /Users/mehmetserefoglu/projects/bumpinto && \
  ls backend/src/main/resources/db/migration/ | grep -E '^V12__' && \
  test -f backend/src/main/java/com/bumpinto/application/session/SessionRetention.java && \
  echo "ON KOSUL OK: B-3 yurutulmus, V12 alinmis"
```

Expected: bir `V12__…sql` satırı + `ON KOSUL OK`. Çıktı boşsa **DUR**, önce plan6 yürütülür. Bu plan V13'ten başlar; V12 asla kullanılmaz (INDEX kural 9).

**Bağlayıcı kurallar (AGENTS.md + ARCHITECTURE.md):**
- **Git yazma işlemi YOK.** Her görev sonunda "Commit" yerine değişen dosya listesi bırakılır; kullanıcı commit'ler.
- Test komutu (backend kökünden, önek ZORUNLU): `JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true mvn -o test -Dtest=<Sınıf>` — aşağıda `MVN_TEST <Sınıf>`. Bağımlılık eklenmez, `-o` kalır.
- **Kod bloğu kuralı:** bloklar `package`/`import` satırı taşımaz (dosya yolu bloğun üstünde ya da adımda yazılıdır; importlar kullanılan tiplerden açıktır). Mevcut bir dosyaya ekleme yapan bloklar yalnız EKLENEN üyeleri gösterir. Bloklarda metotlar arası boş satır yok — dosyaya yazarken repo biçimi (boş satır ayrımı, 4 boşluk, 100 sütun) uygulanır.
- Domain paketinde Spring/Jakarta/Unirest **yok** (`HexagonalArchitectureTest.domainIsPure`); ham SQL yalnız Flyway dosyalarında (`sqlOnlyThroughSpringData`).
- Her yeni/değişen HTTP ucu Bruno'ya girer (`backend/.infra/bumpinto-collection/…`). Java yorumları kısa ve ASCII. §2 adları yeniden adlandırılmaz.

**Sözleşme deviasyonu (tek, bilinçli):** `auth_providers` kolonu **`text` CSV**, `text[]` değil. §2 API alanını (`MeResponse.authProviders[]`, JSON dizi) bağlar, kolon tipini değil; bu depoda dizi deseni CSV'dir (`sessions.activity_types`, `runoff_venue_ids` — bkz. `SessionEntity`) ve Hibernate dizi tipi hiç kullanılmadı. API çıktısı yine dizidir.

**Dosya haritası:**

| Dosya | Görev | Sorumluluk |
|---|---|---|
| `db/migration/V13…V16__*.sql`, `SchemaMigrationTest` | T1 | Şema |
| `domain/user/{AuthProvider,Consents,UserProfile}`, `domain/safety/{Report,ReportReason,Block}` | T2 | Domain |
| `domain/port/{UserStorePort,SessionStorePort,ReportStorePort,BlockStorePort,AppleTokensPort,SessionEvent}` | T2 | Portlar + olay |
| `infra/config/AppProps`, `application.yml`, `support/TestProps` | T2 | `Apple` kaydı |
| `adapter/out/persistence/{UserEntity,UserStoreAdapter,Report*,Block*,SessionStoreAdapter}` | T3 | Kalıcılık |
| `infra/security/AppleIdVerifier` (+Test) | T4 | Apple id token |
| `adapter/out/apple/AppleTokenClient` (+Test) | T5 | Kod→refresh, revoke |
| `application/user/AccountIdentity` (+Test), `AuthController`, `SecurityConfig`, `RateLimitFilter` | T6 | `POST /api/auth/apple` |
| `application/user/UserConsents` (+Test), `ApiDtos`, `MeController` | T7 | Rıza |
| `application/user/AccountDeletion` (+Test) | T8 | Silme çekirdeği |
| `infra/security/TokenService`, `SecurityConfig`, `MeController` (+`AccountApiTest`) | T9 | `DELETE /api/me` |
| `application/safety/{Reports,Blocks}`, `ReportController`, `BlockController` (+Test) | T10 | Bildir/engelle |
| `application/safety/VoiceAdmission`, `SessionViewAssembler`, `VoiceRoomListener`, `VoiceSignalController` | T11 | `blocked` + ses filtresi |
| `ARCHITECTURE.md`, `docs/CONFIGURATION.md`, `INDEX.md`, `openapi.json`, `api-types.ts` | T12 | Belge + sözleşme |

---

### Task 1: Şema — V13 Apple, V14 silme, V15 rapor/engel, V16 rıza

**Files:**
- Create: `backend/src/main/resources/db/migration/{V13__apple_auth,V14__account_deletion,V15__reports_blocks,V16__user_consents}.sql`
- Test: `backend/src/test/java/com/bumpinto/SchemaMigrationTest.java`

- [ ] **Step 1: Başarısız testleri yaz** — `SchemaMigrationTest`'e, `columnsOf` yardımcısının üstüne:

```java
    /** V13: apple_sub birincil eslestirici; tekil auth_provider kolonu CSV'ye tasindi. */
    @Test
    void v13AddsAppleIdentityAndMultiValuedProviders() {
        assertThat(columnsOf("users")).contains("apple_sub", "apple_refresh_token", "auth_providers")
                .doesNotContain("auth_provider");
        assertThat(jdbc.queryForObject("select indexdef from pg_indexes "
                + "where indexname = 'uq_users_apple_sub'", String.class))
                .contains("UNIQUE").contains("apple_sub").contains("IS NOT NULL");
    }
    /** V14: erisim aninda kapanir (deleted_at); fiziksel silme B-3'un isi (purge_after). */
    @Test
    void v14AddsSoftDeleteStampsAndParticipantAnonymization() {
        assertThat(columnsOf("users")).contains("deleted_at", "purge_after");
        assertThat(columnsOf("participants")).contains("anonymized_at");
        assertThat(jdbc.queryForList("select indexname from pg_indexes where tablename = 'users'",
                String.class)).contains("idx_users_purge_after");
    }
    @Test
    void v15AddsReportsAndBlocks() {
        assertThat(columnsOf("reports")).contains("id", "reporter_user_id", "session_id",
                "target_participant_id", "reason", "note", "created_at");
        assertThat(columnsOf("blocks")).contains("id", "blocker_user_id", "blocked_user_id",
                "blocked_participant_id", "session_id", "created_at");
    }
    /** V16: varsayilan HEPSI false (KVKK m.5/1 acik riza). */
    @Test
    void v16AddsConsentColumnsDefaultingToFalse() {
        assertThat(columnsOf("users")).contains("consent_location", "consent_microphone",
                "consent_analytics", "consents_updated_at", "consents_version");
        assertThat(jdbc.queryForObject("select column_default from information_schema.columns "
                + "where table_name = 'users' and column_name = 'consent_analytics'",
                String.class)).contains("false");
    }
```

- [ ] **Step 2: Testi çalıştır, kırmızı gör** — Run: `MVN_TEST SchemaMigrationTest` · Expected: dört test FAILED (kolonlar/tablolar yok).

- [ ] **Step 3: `V13__apple_auth.sql`**

```sql
-- Sign in with Apple (App Store 4.8). Eslestirme SIRASI: once apple_sub, sonra e-posta. Apple
-- private-relay e-postasi UYGULAMAYA OZELDIR ve Google e-postasiyla eslesmez; e-posta birincil
-- olsaydi ayni kisi ikinci hesap acardi.
alter table users add column apple_sub           text;
alter table users add column apple_refresh_token text;
-- Cok degerli saglayici listesi. text[] DEGIL CSV: bu depodaki dizi deseni CSV
-- (sessions.activity_types, runoff_venue_ids). API yine dizi doner.
alter table users add column auth_providers text not null default 'GOOGLE';
update users set auth_providers = upper(auth_provider) where auth_provider is not null;
alter table users drop column auth_provider;
-- Kismi unique: apple_sub'i null olan (yalniz Google) hesaplar disaridadir.
create unique index uq_users_apple_sub on users (apple_sub) where apple_sub is not null;
```

- [ ] **Step 4: `V14__account_deletion.sql`**

```sql
-- Apple 5.1.1(v) + Play hesap silme. Semantik (§2): erisim ANINDA kapanir (deleted_at),
-- fiziksel satir 30 gunde gider (purge_after) — o temizlik B-3'un (plan6) CronJob'idir.
alter table users add column deleted_at  timestamptz;
alter table users add column purge_after timestamptz;
create index idx_users_purge_after on users (purge_after) where purge_after is not null;
-- Baskasinin oturumundaki katilim SILINMEZ, anonimlesir: satir silinseydi o oturumun orta
-- noktasi, deste geometrisi ve oy populasyonu geriye donuk degisir, katilan herkesin
-- ekranindaki sayilar bozulurdu.
alter table participants add column anonymized_at timestamptz;
```

- [ ] **Step 5: `V15__reports_blocks.sql`**

```sql
-- Apple 1.2 (canli sesli sohbet + gorunen ad = UGC): bildir + engelle ZORUNLU.
create table reports (
    id                    uuid primary key,
    reporter_user_id      uuid        not null references users (id),
    session_id            uuid        not null references sessions (id) on delete cascade,
    target_participant_id uuid        not null references participants (id) on delete cascade,
    reason                text        not null,
    note                  text,
    created_at            timestamptz not null default now()
);
create index idx_reports_target on reports (target_participant_id);
-- Engel IKI turlu: hesap duzeyinde (blocked_user_id) kalicidir; anonim katilimci icin
-- (blocked_participant_id + session_id) YALNIZ o oturum boyunca yasar — anonim koltugun kalici
-- kimligi yoktur, kalici engel yanlis kisiyi susturur.
create table blocks (
    id                     uuid primary key,
    blocker_user_id        uuid        not null references users (id),
    blocked_user_id        uuid        references users (id),
    blocked_participant_id uuid        references participants (id) on delete cascade,
    session_id             uuid        references sessions (id) on delete cascade,
    created_at             timestamptz not null default now(),
    constraint blocks_target_is_exclusive check (
        (blocked_user_id is not null and blocked_participant_id is null and session_id is null)
        or (blocked_user_id is null and blocked_participant_id is not null and session_id is not null)),
    constraint blocks_no_self check (blocked_user_id is null or blocked_user_id <> blocker_user_id)
);
create unique index uq_blocks_account on blocks (blocker_user_id, blocked_user_id)
    where blocked_user_id is not null;
create unique index uq_blocks_participant on blocks (blocker_user_id, blocked_participant_id)
    where blocked_participant_id is not null;
create index idx_blocks_blocked_user on blocks (blocked_user_id) where blocked_user_id is not null;
```

- [ ] **Step 6: `V16__user_consents.sql`**

```sql
-- KVKK m.5/1 acik riza + Play Data safety. Ayri tablo DEGIL users kolonlari: kayit hesap basina
-- TEK satirdir, join'in getirisi yok (§2 "ya da users kolonlari").
alter table users add column consent_location    boolean     not null default false;
alter table users add column consent_microphone  boolean     not null default false;
alter table users add column consent_analytics   boolean     not null default false;
alter table users add column consents_updated_at timestamptz;
-- Riza metni degisince surum artar; istemci eski surumu gorunce ekrani yeniden sorar.
alter table users add column consents_version    int         not null default 1;
```

- [ ] **Step 7: Testi çalıştır** — Run: `MVN_TEST SchemaMigrationTest` · Expected: tümü PASSED.

- [ ] **Step 8: Değişen dosyalar** — dört migration + `SchemaMigrationTest.java`. Mesaj: `feat(db): apple auth, account deletion, reports/blocks, consents (V13-V16)`.

---

### Task 2: Domain kayıtları, portlar, olay, `AppProps.Apple`

**Files:** (kökler: `backend/src/main/java/com/bumpinto/`, `backend/src/test/java/com/bumpinto/`)
- Create: `domain/user/{AuthProvider,Consents}.java`, `domain/safety/{ReportReason,Report,Block}.java`, `domain/port/{ReportStorePort,BlockStorePort,AppleTokensPort}.java`
- Modify: `domain/user/UserProfile.java`, `domain/port/{UserStorePort,SessionStorePort,SessionEvent}.java`, `infra/config/AppProps.java`, `backend/src/main/resources/application.yml`, `support/TestProps.java`
- Test: `domain/safety/BlockTest.java`

- [ ] **Step 1: Başarısız testi yaz** (`T0 = Instant.parse("2026-09-06T10:00:00Z")`, `ME = UUID.randomUUID()` sınıf sabitleri)

```java
    @Test
    void accountBlockCarriesNoSessionScopeButParticipantBlockDoes() {
        UUID session = UUID.randomUUID();
        Block account = Block.ofUser(UUID.randomUUID(), ME, UUID.randomUUID(), T0);
        Block scoped = Block.ofParticipant(UUID.randomUUID(), ME, UUID.randomUUID(), session, T0);
        assertThat(account.accountBlock()).isTrue();
        assertThat(account.sessionId()).isNull();
        assertThat(scoped.accountBlock()).isFalse();
        assertThat(scoped.sessionId()).isEqualTo(session);
    }
    @Test
    void halfTargetsSelfBlocksAndUnscopedParticipantBlocksAreRejected() {
        assertThatThrownBy(() -> new Block(UUID.randomUUID(), ME, null, null, null, T0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> Block.ofUser(UUID.randomUUID(), ME, ME, T0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Block(UUID.randomUUID(), ME, null, UUID.randomUUID(), null, T0))
                .isInstanceOf(IllegalArgumentException.class);
    }
```

- [ ] **Step 2: Testi çalıştır, kırmızı gör** — Run: `MVN_TEST BlockTest` · Expected: COMPILATION ERROR (`Block` yok).

- [ ] **Step 3: Domain sınıflarını yaz**

```java
// domain/user/AuthProvider.java — hesabin saglayicisi; bir hesapta birden fazlasi olabilir (§2)
public enum AuthProvider { GOOGLE, APPLE }
// domain/safety/ReportReason.java — §2 sozlesmesi: bu dort deger, bu adlarla
public enum ReportReason { HARASSMENT, SPAM, IMPERSONATION, OTHER }
```

```java
// domain/user/Consents.java — acik riza (KVKK m.5/1); varsayilan HEPSI false
public record Consents(boolean location, boolean microphone, boolean analytics,
                       Instant updatedAt, int version) {
    public static final int CURRENT_VERSION = 1;
    public static Consents none() {
        return new Consents(false, false, false, null, CURRENT_VERSION);
    }
    public Consents updated(boolean newLocation, boolean newMicrophone, boolean newAnalytics,
                            Instant when) {
        return new Consents(newLocation, newMicrophone, newAnalytics, when, CURRENT_VERSION);
    }
}
```

```java
// domain/safety/Report.java — kayit denetim izidir; moderasyon kuyrugu sonraki iz
public record Report(UUID id, UUID reporterUserId, UUID sessionId, UUID targetParticipantId,
                     ReportReason reason, String note, Instant createdAt) {
    public static final int MAX_NOTE = 500;
    public Report {
        if (note != null && note.length() > MAX_NOTE) {
            throw new IllegalArgumentException("note too long");
        }
    }
}
```

```java
// domain/safety/Block.java
/**
 * Engel iki turlu (§2): hesap duzeyinde KALICI, anonim katilimci icin YALNIZ o oturum.
 * Ikisi birden ya da hicbiri gecersizdir — yarim hedef sessizce hicbir seyi engellemez.
 */
public record Block(UUID id, UUID blockerUserId, UUID blockedUserId, UUID blockedParticipantId,
                    UUID sessionId, Instant createdAt) {
    public Block {
        boolean account = blockedUserId != null;
        boolean participant = blockedParticipantId != null;
        if (account == participant) {
            throw new IllegalArgumentException("exactly one of blockedUserId/blockedParticipantId");
        }
        if (participant && sessionId == null) {
            throw new IllegalArgumentException("participant block requires sessionId");
        }
        if (account && (sessionId != null || blockedUserId.equals(blockerUserId))) {
            throw new IllegalArgumentException("invalid account block");
        }
    }
    public static Block ofUser(UUID id, UUID blockerUserId, UUID blockedUserId, Instant createdAt) {
        return new Block(id, blockerUserId, blockedUserId, null, null, createdAt);
    }
    public static Block ofParticipant(UUID id, UUID blockerUserId, UUID blockedParticipantId,
                                      UUID sessionId, Instant createdAt) {
        return new Block(id, blockerUserId, null, blockedParticipantId, sessionId, createdAt);
    }
    public boolean accountBlock() {
        return blockedUserId != null;
    }
}
```

- [ ] **Step 4: `UserProfile`'ı genişlet** — kanonik kurucu iki bileşen kazanır; mevcut **iki kurucu delege ederek KALIR** (çağrı yerleri `FakeStores.InMemoryUserStore`, `UserStoreAdapter.toProfile`):

```java
public record UserProfile(UUID id, String email, String name, GeoPoint defaultLocation,
                          String defaultLocationLabel, ActivityType defaultActivity,
                          String language, TravelMode defaultTravelMode,
                          Set<AuthProvider> authProviders, Consents consents) {
    public UserProfile {
        authProviders = authProviders == null || authProviders.isEmpty()
                ? Set.of(AuthProvider.GOOGLE)
                : Collections.unmodifiableSet(EnumSet.copyOf(authProviders));
        consents = consents == null ? Consents.none() : consents;
    }
    /** Eski 8'li imza: saglayici/riza bilinmiyor -> GOOGLE + riza yok. Mevcut 7'li imza buna delege eder. */
    public UserProfile(UUID id, String email, String name, GeoPoint defaultLocation,
                       String defaultLocationLabel, ActivityType defaultActivity, String language,
                       TravelMode defaultTravelMode) {
        this(id, email, name, defaultLocation, defaultLocationLabel, defaultActivity, language,
                defaultTravelMode, null, null);
    }
    public UserProfile withPreferences(String newName, GeoPoint location, String label,
                                       ActivityType activity, String lang, TravelMode mode) {
        return new UserProfile(id, email, newName == null ? name : newName, location, label,
                activity, lang, mode, authProviders, consents);
    }
    public UserProfile withConsents(Consents newConsents) {
        return new UserProfile(id, email, name, defaultLocation, defaultLocationLabel,
                defaultActivity, language, defaultTravelMode, authProviders, newConsents);
    }
}
```

- [ ] **Step 5: Portları ve olayı yaz** (ilk ikisi mevcut arayüzlere EK)

```java
// domain/port/UserStorePort.java
    /** Apple girisi. Eslestirme SIRASI: (1) apple_sub, (2) e-posta — private-relay e-postasi
     *  eslesmeyecegi icin sub birincildir. Bulunan hesaba APPLE saglayicisi EKLENIR. */
    UUID upsertByAppleSub(String appleSub, String email, String name);
    void saveAppleRefreshToken(UUID userId, String refreshToken);
    Optional<String> appleRefreshToken(UUID userId);
    /** Erisimi ANINDA kapatir: damgalar ve KIMLIK ALANLARINI serbest birakir (e-posta benzersizligi
     *  geri verilir, apple_sub silinir) — yoksa ayni kisi 30 gun yeniden kayit olamazdi.
     *  Satirin kendisini B-3 temizler. */
    void softDelete(UUID userId, Instant deletedAt, Instant purgeAfter);
```

```java
// domain/port/SessionStorePort.java
    /** Hostu verilen hesap olan TUM oturum kimlikleri (limitsiz — silme icin). */
    List<UUID> sessionIdsOfHost(UUID hostId);
    /** Oturum ve ona bagli her sey (FK cascade: katilimci/mekan/kaydirma/oy). */
    void deleteSession(UUID sessionId);
    /** Hesabin BASKALARININ oturumlarindaki koltuklari. */
    List<Participant> participantsOfUser(UUID userId);
    /** Koltuk kalir, kimlik gider: ad degisir, user_id ve konum null olur, damga yazilir. */
    void anonymizeParticipant(UUID participantId, String displayName, Instant when);
```

```java
// domain/port/ReportStorePort.java
public interface ReportStorePort {
    Report save(Report report);
}
// domain/port/BlockStorePort.java
public interface BlockStorePort {
    Block save(Block block);
    List<Block> blocksOf(UUID blockerUserId);
    /** Kendi engelini siler; baskasinin engeli BULUNAMAMIS sayilir (false), varligi sizmaz. */
    boolean delete(UUID blockerUserId, UUID blockId);
    /** Bu hesabin engelledigi HESAPLAR. */
    Set<UUID> blockedUserIdsOf(UUID blockerUserId);
    /** Bu hesabi engelleyen HESAPLAR — ses odasi kurali iki yonludur. */
    Set<UUID> blockerUserIdsOf(UUID blockedUserId);
    /** Bu hesabin o oturumda engelledigi ANONIM katilimcilar. */
    Set<UUID> blockedParticipantIdsOf(UUID blockerUserId, UUID sessionId);
}
```

```java
// domain/port/AppleTokensPort.java
/**
 * Apple sunucusuna giden tek kapi. Iki cagri da FAIL-OPEN: takas basarisiz olursa giris yine
 * tamamlanir (refresh token yalniz revoke icindir), revoke basarisiz olursa silme yine tamamlanir
 * (Apple 5.1.1(v) silmeyi Apple'in erisilebilirligine baglamaz).
 */
public interface AppleTokensPort {
    Optional<String> exchangeRefreshToken(String authorizationCode);
    void revoke(String refreshToken);
}
// domain/port/SessionEvent.java — voiceRosterChanged() altina
    /** Biri birini engelledi/kaldirdi: roster ve ses uyeligi bayat kaldi, tazele. */
    public static SessionEvent blocked() {
        return new SessionEvent("blocked", Map.of());
    }
```

- [ ] **Step 6: `AppProps.Apple` + yml + TestProps** — kanonik listeye `security`'den sonra `Apple apple` eklenir:

```java
    /**
     * Sign in with Apple. Bos birakilabilir: uygulama ayaga kalkar, /api/auth/apple 503 doner
     * (Turn ile ayni fail-open dusuncesi) — Apple girisi yerelde anahtar ister, Google girisi
     * istemez; acilis kapisi tum yerel gelistirmeyi kirardi. Prod'da ZORUNLU (App Store 4.8).
     *
     * @param servicesId web akisinin audience'i (Services ID), token uclarinda client_id
     * @param bundleId   native iOS akisinin audience'i — Apple orada bundle id basar
     * @param privateKey AuthKey_*.p8 icerigi (PEM); ES256 client secret bununla imzalanir
     */
    public record Apple(String servicesId, String bundleId, String teamId, String keyId,
                        String privateKey) {
        public boolean configured() {
            return set(servicesId) && set(teamId) && set(keyId) && set(privateKey);
        }
        /** Kabul edilen audience'lar; ikisi de tanimliysa ikisi de gecerlidir. */
        public List<String> audiences() {
            return Stream.of(servicesId, bundleId).filter(Apple::set).toList();
        }
        private static boolean set(String value) {
            return value != null && !value.isBlank() && !value.startsWith("${");
        }
        @Override
        public String toString() {
            return "Apple[servicesId=" + servicesId + ", bundleId=" + bundleId + ", teamId="
                    + teamId + ", keyId=" + keyId + ", privateKey=" + MASK + "]";
        }
    }
```

`application.yml` — `security:` bloğunun ardına:

```yaml
  apple:
    # Bos birakilabilir: Apple girisi kapali (503), uygulama acilir. Prod'da ZORUNLU.
    services-id: ${APPLE_SERVICES_ID:}
    bundle-id: ${APPLE_BUNDLE_ID:}
    team-id: ${APPLE_TEAM_ID:}
    key-id: ${APPLE_KEY_ID:}
    private-key: ${APPLE_PRIVATE_KEY:}
```

`TestProps` (bu depoda `new AppProps(` çağıran TEK dosya — doğrulandı):

```java
    public static AppProps.Apple apple() {
        return new AppProps.Apple("app.bumpinto.web", "app.bumpinto.ios", "TEAM123456",
                "KEY1234567", "");
    }
    /** Apple alanini degistirir (yapilandirilmis/degil varyasyonlari), gerisi defaults(). */
    public static AppProps withApple(AppProps.Apple apple) {
        AppProps base = defaults();
        return new AppProps(base.security(), apple, base.cors(), base.cookies(), base.rateLimit(),
                base.geocode(), base.voice(), base.turn(), base.venues(), base.map(),
                base.routing(), base.retention());
    }
```

`withGeocode`/`withVoice`/`withRouting` ve iki `of(...)` gövdesindeki `new AppProps(...)` çağrılarına ikinci konuma `base.apple()` (ya da `apple()`) eklenir.

- [ ] **Step 7: Testleri çalıştır** — Run: `MVN_TEST BlockTest` sonra `MVN_TEST HexagonalArchitectureTest` · Expected: ikisi de PASSED (yeni domain paketleri yalnız `java..`'ya bağımlı).

- [ ] **Step 8: Değişen dosyalar** — 8 yeni domain/port dosyası, `UserProfile`, `UserStorePort`, `SessionStorePort`, `SessionEvent`, `AppProps`, `application.yml`, `TestProps`, `BlockTest`. Mesaj: `feat(domain): auth providers, consents, reports/blocks ports, apple config`.

---

### Task 3: Kalıcılık — kullanıcı genişletmesi, rapor/engel adaptörleri, oturum silme

**Files:**
- Modify: `adapter/out/persistence/{UserEntity,UserRepository,UserStoreAdapter,SessionStoreAdapter,ParticipantRepository}.java`, `support/FakeStores.java`
- Create: `adapter/out/persistence/{ReportEntity,ReportRepository,ReportStoreAdapter,BlockEntity,BlockRepository,BlockStoreAdapter}.java`
- Test: `adapter/out/persistence/StoreAdapterTest.java`

- [ ] **Step 1: Başarısız testi yaz** — `StoreAdapterTest`'e (`@Import` listesine `ReportStoreAdapter`, `BlockStoreAdapter`; `@Autowired BlockStorePort blocks`; `T0` sabiti):

```java
    @Test
    void appleSubIsThePrimaryMatcherAndEmailTheSecondary() {
        UUID google = users.upsertByEmail("ayse@bumpinto.test", "Ayse");
        UUID merged = users.upsertByAppleSub("apple-sub-1", "ayse@bumpinto.test", "Ayse");
        assertThat(merged).isEqualTo(google);
        assertThat(users.profileOf(merged).orElseThrow().authProviders())
                .containsExactlyInAnyOrder(AuthProvider.GOOGLE, AuthProvider.APPLE);
        // Private-relay e-postasiyla ikinci giris: e-posta TUTMAZ, sub tutar -> ayni hesap.
        assertThat(users.upsertByAppleSub("apple-sub-1", "xyz@privaterelay.appleid.com", "Ayse"))
                .isEqualTo(google);
    }
    @Test
    void softDeleteReleasesTheIdentityAndHidesTheProfile() {
        UUID id = users.upsertByAppleSub("apple-sub-2", "mehmet@bumpinto.test", "Mehmet");
        users.saveAppleRefreshToken(id, "rt-1");
        assertThat(users.appleRefreshToken(id)).contains("rt-1");
        users.softDelete(id, T0, T0.plus(Duration.ofDays(30)));
        assertThat(users.profileOf(id)).isEmpty();
        // Kimlik serbest: ayni e-posta yeni bir hesap acabilir.
        assertThat(users.upsertByEmail("mehmet@bumpinto.test", "Mehmet")).isNotEqualTo(id);
    }
    @Test
    void blocksAreReadableFromBothEndsAndOnlyTheOwnerCanDeleteThem() {
        UUID me = users.upsertByEmail("me@bumpinto.test", "Ben");
        UUID other = users.upsertByEmail("other@bumpinto.test", "O");
        UUID blockId = blocks.save(Block.ofUser(UUID.randomUUID(), me, other, T0)).id();
        assertThat(blocks.blockedUserIdsOf(me)).containsExactly(other);
        assertThat(blocks.blockerUserIdsOf(other)).containsExactly(me);
        assertThat(blocks.delete(other, blockId)).isFalse();
        assertThat(blocks.delete(me, blockId)).isTrue();
        assertThat(blocks.blocksOf(me)).isEmpty();
    }
```

- [ ] **Step 2: Testi çalıştır, kırmızı gör** — Run: `MVN_TEST StoreAdapterTest` · Expected: COMPILATION ERROR (`upsertByAppleSub`/`BlockStorePort` yok).

- [ ] **Step 3: `UserEntity` + `UserRepository`** — `authProvider` alanı silinir, yerine:

```java
    String appleSub;
    String appleRefreshToken;
    String authProviders = "GOOGLE";   // csv (V13)
    Instant deletedAt;
    Instant purgeAfter;
    boolean consentLocation;
    boolean consentMicrophone;
    boolean consentAnalytics;
    Instant consentsUpdatedAt;
    int consentsVersion = 1;
```

`of(...)` fabrikası `String provider` yerine `AuthProvider provider` alır ve `u.authProviders = provider.name()` yazar. `UserRepository`'ye: `Optional<UserEntity> findByAppleSub(String appleSub);`

- [ ] **Step 4: `UserStoreAdapter`**

```java
    @Override public UUID upsertByAppleSub(String appleSub, String email, String name) {
        // (1) sub: Apple'in bu uygulama icin sabit kimligi — private-relay e-postasi degisse de
        // ayni hesabi bulur.  (2) e-posta: kisi Google ile girmisse HESAP BIRLESIR.
        Optional<UserEntity> bySub = users.findByAppleSub(appleSub);
        if (bySub.isPresent()) {
            return link(bySub.get(), appleSub, name);
        }
        Optional<UserEntity> byEmail = email == null ? Optional.empty() : users.findByEmail(email);
        if (byEmail.isPresent()) {
            return link(byEmail.get(), appleSub, name);
        }
        UserEntity fresh = UserEntity.of(UUID.randomUUID(), email, name, AuthProvider.APPLE);
        fresh.appleSub = appleSub;
        try {
            return users.saveAndFlush(fresh).id;
        } catch (DataIntegrityViolationException raceLost) {
            return users.findByAppleSub(appleSub).map(u -> link(u, appleSub, name))
                    .orElseThrow(() -> raceLost);
        }
    }
    private UUID link(UserEntity user, String appleSub, String name) {
        user.appleSub = appleSub;
        user.authProviders = withProvider(user.authProviders, AuthProvider.APPLE);
        if (name != null && !name.equals(user.name)) {
            user.name = name;
        }
        users.save(user);
        return user.id;
    }
    /** CSV'ye tekrarsiz ekleme; sira enum sirasi ki yanit deterministik olsun. */
    static String withProvider(String csv, AuthProvider added) {
        EnumSet<AuthProvider> set = parseProviders(csv);
        set.add(added);
        return set.stream().map(Enum::name).collect(Collectors.joining(","));
    }
    static EnumSet<AuthProvider> parseProviders(String csv) {
        EnumSet<AuthProvider> set = EnumSet.noneOf(AuthProvider.class);
        if (csv != null && !csv.isBlank()) {
            Arrays.stream(csv.split(",")).map(String::trim).filter(s -> !s.isEmpty())
                    .map(AuthProvider::valueOf).forEach(set::add);
        }
        return set;
    }
    @Override public void saveAppleRefreshToken(UUID userId, String refreshToken) {
        users.findById(userId).ifPresent(u -> {
            u.appleRefreshToken = refreshToken;
            users.save(u);
        });
    }
    @Override public Optional<String> appleRefreshToken(UUID userId) {
        return users.findById(userId).map(u -> u.appleRefreshToken);
    }
    @Override public void softDelete(UUID userId, Instant deletedAt, Instant purgeAfter) {
        users.findById(userId).ifPresent(u -> {
            u.deletedAt = deletedAt;
            u.purgeAfter = purgeAfter;
            // Kimlik ALANLARI serbest birakilir: e-posta benzersizdir, 30 gun tutulsaydi ayni kisi
            // yeniden kayit olamazdi. Satir denetim icin kalir, kimlik icin degil.
            u.email = "deleted+" + userId + "@invalid";
            u.name = "Silindi";
            u.appleSub = null;
            u.appleRefreshToken = null;
            users.save(u);
        });
    }
    @Override public Optional<UserProfile> profileOf(UUID userId) {
        return users.findById(userId).filter(u -> u.deletedAt == null)
                .map(UserStoreAdapter::toProfile);
    }
```

`toProfile` iki argüman daha taşır: `parseProviders(u.authProviders)` ve `new Consents(u.consentLocation, u.consentMicrophone, u.consentAnalytics, u.consentsUpdatedAt, u.consentsVersion)`. `saveProfile` bunların tersini yazar (`u.consentLocation = p.consents().location()` … `u.consentsVersion = p.consents().version()`). `upsertByEmail`'deki `UserEntity.of(..., "google")` → `AuthProvider.GOOGLE`; bulunan hesapta `withProvider(u.authProviders, AuthProvider.GOOGLE)` yazılır.

- [ ] **Step 5: Rapor/engel ve oturum adaptörleri** — `ReportEntity`/`BlockEntity` `UserEntity` desenidir (paket-özel `@Entity`, alanlar V15 kolonlarıyla birebir: `ReportEntity` → `id, reporterUserId, sessionId, targetParticipantId, reason, note, createdAt`; `BlockEntity` → `id, blockerUserId, blockedUserId, blockedParticipantId, sessionId, createdAt`).

```java
public interface ReportRepository extends JpaRepository<ReportEntity, UUID> {
}
public interface BlockRepository extends JpaRepository<BlockEntity, UUID> {
    List<BlockEntity> findByBlockerUserId(UUID blockerUserId);
    List<BlockEntity> findByBlockedUserId(UUID blockedUserId);
    List<BlockEntity> findByBlockerUserIdAndSessionId(UUID blockerUserId, UUID sessionId);
}
```

`ReportStoreAdapter.save` entity'yi yazıp aynı `Report`'u döner. `BlockStoreAdapter` üç sorguyu `Block`'a çevirir; `delete(blockerUserId, blockId)` önce `findById`, sahibi eşleşmiyorsa `false`; `blockedUserIdsOf`/`blockerUserIdsOf` null olmayan `blockedUserId`/`blockerUserId` alanlarını toplar; `blockedParticipantIdsOf` üçüncü sorgudan `blockedParticipantId`'leri döner.

`SessionStoreAdapter` dört yeni metot: `sessionIdsOfHost` (`sessions.findByHostIdOrderByCreatedAtDescIdDesc(hostId, Pageable.unpaged())` → id listesi), `deleteSession` (`sessions.deleteById`), `participantsOfUser` (`participants.findByUserId`), `anonymizeParticipant` (satırı okur; `displayName`, `userId=null`, `lat=lng=null`, `locationLabel=null`, `anonymizedAt` yazar). `ParticipantRepository`'ye: `List<ParticipantEntity> findByUserId(UUID userId);`

- [ ] **Step 6: `FakeStores`'u genişlet** — `InMemoryUserStore`'a `public final Map<UUID,String> appleSubs, refreshTokens` ve `public final Map<UUID,Instant> deletedAt, purgeAfter` alanları + dört yeni metodun tam gövdesi (`profileOf` silinmiş kimlik için `Optional.empty()`; `softDelete` e-postayı `deleted+<id>@invalid` yapar; `upsertByAppleSub` aynı sırayı uygular ve `authProviders`'a APPLE ekler). `InMemorySessionStore`'a dört yeni metodun tam gövdesi. İki yeni sınıf: `InMemoryReportStore` (`public final List<Report> saved`) ve `InMemoryBlockStore` (`public final Map<UUID, Block> blocks`), `BlockStorePort`'un altı metodunu bellek içi uygular.

- [ ] **Step 7: Testi çalıştır** — Run: `MVN_TEST StoreAdapterTest` · Expected: PASSED.

- [ ] **Step 8: Değişen dosyalar** — 6 yeni persistence dosyası, `UserEntity`, `UserRepository`, `UserStoreAdapter`, `SessionStoreAdapter`, `ParticipantRepository`, `FakeStores`, `StoreAdapterTest`. Mesaj: `feat(persistence): apple identity, soft delete, reports and blocks stores`.

---

### Task 4: `AppleIdVerifier` — JWKS, çoklu audience, nonce

**Files:** Create `infra/security/AppleIdVerifier.java` · Test `infra/security/AppleIdVerifierTest.java`

- [ ] **Step 1: Başarısız testi yaz** (`GoogleIdVerifierTest` deseni: ağa çıkmadan gerçek doğrulayıcı zinciri)

```java
    static final AppProps.Apple APPLE = TestProps.apple();
    static Jwt jwt(String audience, Map<String, Object> extra) {
        Jwt.Builder builder = Jwt.withTokenValue("t").header("alg", "RS256")
                .issuer("https://appleid.apple.com").subject("apple-sub-1")
                .audience(List.of(audience))
                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(600));
        extra.forEach(builder::claim);
        return builder.build();
    }
    /** Web Services ID ve native bundle id AYRI audience'lardir; ikisi de gecmeli. */
    @Test
    void bothServicesIdAndBundleIdAreAcceptedAudiences() {
        OAuth2TokenValidator<Jwt> validator = AppleIdVerifier.validator(APPLE.audiences());
        assertThat(validator.validate(jwt("app.bumpinto.web", Map.of())).hasErrors()).isFalse();
        assertThat(validator.validate(jwt("app.bumpinto.ios", Map.of())).hasErrors()).isFalse();
        assertThat(validator.validate(jwt("someone.else", Map.of())).hasErrors()).isTrue();
        assertThatThrownBy(() -> AppleIdVerifier.validator(List.of()))
                .isInstanceOf(IllegalStateException.class);
    }
    /** Native istemci ham nonce'un SHA-256 HEX'ini basar, web ham nonce'u; ikisi de gecer. */
    @Test
    void nonceMatchesRawOrSha256Hex() {
        String raw = "n-0S6_WzA2Mj";
        assertThat(AppleIdVerifier.nonceMatches(jwt("app.bumpinto.web", Map.of("nonce", raw)), raw))
                .isTrue();
        assertThat(AppleIdVerifier.nonceMatches(
                jwt("app.bumpinto.web", Map.of("nonce", AppleIdVerifier.sha256Hex(raw))), raw))
                .isTrue();
        assertThat(AppleIdVerifier.nonceMatches(jwt("app.bumpinto.web", Map.of("nonce", raw)), "x"))
                .isFalse();
        // Istemci nonce kullanmiyorsa kontrol atlanir; kullaniyor ama token tasimiyorsa REDDEDILIR.
        assertThat(AppleIdVerifier.nonceMatches(jwt("app.bumpinto.web", Map.of()), null)).isTrue();
        assertThat(AppleIdVerifier.nonceMatches(jwt("app.bumpinto.web", Map.of()), raw)).isFalse();
    }
```

- [ ] **Step 2: Testi çalıştır, kırmızı gör** — Run: `MVN_TEST AppleIdVerifierTest` · Expected: COMPILATION ERROR (`AppleIdVerifier` yok).

- [ ] **Step 3: Doğrulayıcıyı yaz**

```java
/**
 * Apple identity token dogrulayicisi — GoogleIdVerifier'in esi. Fark: audience TEK degil (web
 * Services ID + native bundle id) ve nonce kontrolu var. Yapilandirilmamis Apple acilista
 * PATLATMAZ (Turn deseni): decoder tembel kurulur, uc configured() kapisinda 503 doner.
 */
@Component
public class AppleIdVerifier {
    static final String JWKS_URI = "https://appleid.apple.com/auth/keys";
    static final String ISSUER = "https://appleid.apple.com";
    private final AppProps props;
    private volatile JwtDecoder decoder;
    @Autowired
    public AppleIdVerifier(AppProps props) {
        this.props = props;
    }
    /** Test kancasi: hazir decoder, aga cikmadan. */
    AppleIdVerifier(AppProps props, NimbusJwtDecoder decoder) {
        this.props = props;
        decoder.setJwtValidator(validator(props.apple().audiences()));
        this.decoder = decoder;
    }
    static OAuth2TokenValidator<Jwt> validator(List<String> audiences) {
        if (audiences.isEmpty()) {
            throw new IllegalStateException("APPLE_SERVICES_ID is not configured");
        }
        OAuth2TokenValidator<Jwt> audienceCheck = jwt -> {
            List<String> aud = jwt.getAudience();
            return aud != null && aud.stream().anyMatch(audiences::contains)
                    ? OAuth2TokenValidatorResult.success()
                    : OAuth2TokenValidatorResult.failure(
                            new OAuth2Error("invalid_token", "audience mismatch", null));
        };
        return new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(ISSUER), audienceCheck);
    }
    /** privateRelay: e-posta Apple'in gizli aktarma adresi mi (e-posta ikincil eslestiricidir). */
    public record AppleUser(String sub, String email, boolean privateRelay) {
    }
    public boolean configured() {
        return props.apple().configured();
    }
    public AppleUser verify(String identityToken, String nonce) {
        Jwt jwt = decoder().decode(identityToken);
        if (!nonceMatches(jwt, nonce)) {
            throw new BadJwtException("nonce mismatch");
        }
        String email = jwt.getClaimAsString("email");
        return new AppleUser(jwt.getSubject(), email,
                email != null && email.endsWith("@privaterelay.appleid.com"));
    }
    static boolean nonceMatches(Jwt jwt, String expected) {
        if (expected == null) {
            return true;
        }
        String claim = jwt.getClaimAsString("nonce");
        return claim != null && (claim.equals(expected) || claim.equals(sha256Hex(expected)));
    }
    static String sha256Hex(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException(impossible);
        }
    }
    private JwtDecoder decoder() {
        JwtDecoder current = decoder;
        if (current == null) {
            synchronized (this) {
                if (decoder == null) {
                    NimbusJwtDecoder built = NimbusJwtDecoder.withJwkSetUri(JWKS_URI).build();
                    built.setJwtValidator(validator(props.apple().audiences()));
                    decoder = built;
                }
                current = decoder;
            }
        }
        return current;
    }
}
```

- [ ] **Step 4: Testi çalıştır** — Run: `MVN_TEST AppleIdVerifierTest` · Expected: PASSED.

- [ ] **Step 5: Değişen dosyalar** — `AppleIdVerifier.java`, `AppleIdVerifierTest.java`. Mesaj: `feat(auth): apple identity token verifier`.

---

### Task 5: `AppleTokenClient` — kod→refresh takası ve revoke

**Files:** Create `adapter/out/apple/AppleTokenClient.java` · Test `adapter/out/apple/{AppleTokenClientTest,AppleTestKeys}.java`

- [ ] **Step 1: Başarısız testi yaz** (`CloudflareTurnCredentialsTest` deseni: Unirest `MockClient`; `@AfterEach` `MockClient.clear()`)

```java
    static final AppProps.Apple CONFIGURED = new AppProps.Apple("app.bumpinto.web",
            "app.bumpinto.ios", "TEAM123456", "KEY1234567", AppleTestKeys.EC_P256_PKCS8_PEM);
    final MockClient mock = MockClient.register();
    @Test
    void exchangesAuthorizationCodeForARefreshToken() {
        mock.expect(HttpMethod.POST, "https://appleid.apple.com/auth/token")
                .thenReturn("{\"refresh_token\":\"rt-42\",\"access_token\":\"at\"}").withStatus(200);
        assertThat(new AppleTokenClient(TestProps.withApple(CONFIGURED))
                .exchangeRefreshToken("code-1")).contains("rt-42");
    }
    /** FAIL-OPEN: Apple 5xx dondurse de giris tamamlanmali; yalniz revoke yetenegi kaybolur. */
    @Test
    void serverErrorYieldsEmptyInsteadOfThrowing() {
        mock.expect(HttpMethod.POST, "https://appleid.apple.com/auth/token")
                .thenReturn("nope").withStatus(503);
        assertThat(new AppleTokenClient(TestProps.withApple(CONFIGURED))
                .exchangeRefreshToken("code-1")).isEmpty();
    }
    @Test
    void unconfiguredAppleNeitherExchangesNorRevokes() {
        AppleTokenClient client = new AppleTokenClient(
                TestProps.withApple(new AppProps.Apple("", "", "", "", "")));
        assertThat(client.exchangeRefreshToken("code-1")).isEmpty();
        client.revoke("rt-42");   // sessiz no-op, istisna yok
        mock.verifyAll();         // Apple'a hicbir cagri yapilmadi
    }
```

`AppleTestKeys.java`: tek `static final String EC_P256_PKCS8_PEM` sabiti; değeri bir kez üretilip teste gömülür (test-only, hiçbir yerde kayıtlı değil): `openssl ecparam -name prime256v1 -genkey -noout -out /tmp/k.pem && openssl pkcs8 -topk8 -nocrypt -in /tmp/k.pem`

- [ ] **Step 2: Testi çalıştır, kırmızı gör** — Run: `MVN_TEST AppleTokenClientTest` · Expected: COMPILATION ERROR (`AppleTokenClient` yok).

- [ ] **Step 3: İstemciyi yaz**

```java
/**
 * Apple token ucu. Client secret bir ES256 JWT'dir: iss=Team ID, sub=Services ID,
 * aud=https://appleid.apple.com, kid=Key ID, imza AuthKey p8 ile. IKI cagri da FAIL-OPEN
 * (AppleTokensPort): Apple'in erisilemez olmasi ne girisi ne de hesap silmeyi bloklar.
 */
@Component
class AppleTokenClient implements AppleTokensPort {
    private static final Logger log = LoggerFactory.getLogger(AppleTokenClient.class);
    private static final String TOKEN_URL = "https://appleid.apple.com/auth/token";
    private static final String REVOKE_URL = "https://appleid.apple.com/auth/revoke";
    private static final Duration SECRET_TTL = Duration.ofMinutes(10);
    private static final int TIMEOUT_MS = 3000;
    private final AppProps props;
    AppleTokenClient(AppProps props) {
        this.props = props;
    }
    @Override
    public Optional<String> exchangeRefreshToken(String authorizationCode) {
        if (!props.apple().configured() || authorizationCode == null) {
            return Optional.empty();
        }
        try {
            HttpResponse<JsonNode> response = Unirest.post(TOKEN_URL).connectTimeout(TIMEOUT_MS)
                    .field("client_id", props.apple().servicesId())
                    .field("client_secret", clientSecret())
                    .field("code", authorizationCode)
                    .field("grant_type", "authorization_code")
                    .asJson();
            if (!response.isSuccess()) {
                log.warn("apple token exchange failed: {}", response.getStatus());
                return Optional.empty();
            }
            return Optional.ofNullable(response.getBody().getObject()
                    .optString("refresh_token", null)).filter(t -> !t.isBlank());
        } catch (RuntimeException unreachable) {
            log.warn("apple token exchange unreachable: {}", unreachable.getMessage());
            return Optional.empty();
        }
    }
    @Override
    public void revoke(String refreshToken) {
        if (!props.apple().configured() || refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        try {
            Unirest.post(REVOKE_URL).connectTimeout(TIMEOUT_MS)
                    .field("client_id", props.apple().servicesId())
                    .field("client_secret", clientSecret())
                    .field("token", refreshToken)
                    .field("token_type_hint", "refresh_token")
                    .asEmpty();
        } catch (RuntimeException unreachable) {
            log.warn("apple revoke unreachable: {}", unreachable.getMessage());
        }
    }
    private String clientSecret() {
        try {
            Instant now = Instant.now();
            SignedJWT jwt = new SignedJWT(
                    new JWSHeader.Builder(JWSAlgorithm.ES256).keyID(props.apple().keyId())
                            .type(JOSEObjectType.JWT).build(),
                    new JWTClaimsSet.Builder().issuer(props.apple().teamId())
                            .subject(props.apple().servicesId())
                            .audience("https://appleid.apple.com")
                            .issueTime(Date.from(now))
                            .expirationTime(Date.from(now.plus(SECRET_TTL))).build());
            jwt.sign(new ECDSASigner(privateKey()));
            return jwt.serialize();
        } catch (Exception badKey) {
            throw new IllegalStateException("APPLE_PRIVATE_KEY is not a valid PKCS#8 EC key", badKey);
        }
    }
    private ECPrivateKey privateKey() throws Exception {
        String pem = props.apple().privateKey()
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "").replaceAll("\\s", "");
        return (ECPrivateKey) KeyFactory.getInstance("EC")
                .generatePrivate(new PKCS8EncodedKeySpec(Base64.getDecoder().decode(pem)));
    }
}
```

- [ ] **Step 4: Testleri çalıştır** — Run: `MVN_TEST AppleTokenClientTest` sonra `MVN_TEST HexagonalArchitectureTest` · Expected: ikisi de PASSED (`adapter.out.apple` yalnız domain + `infra.config` + kütüphanelere bağlı).

- [ ] **Step 5: Değişen dosyalar** — `AppleTokenClient.java`, `AppleTokenClientTest.java`, `AppleTestKeys.java`. Mesaj: `feat(auth): apple token exchange and revoke client`.

---

### Task 6: `POST /api/auth/apple` — hesap birleştirme

**Files:**
- Create: `application/user/AccountIdentity.java`, `application/error/UnavailableException.java`, `backend/.infra/bumpinto-collection/auth/apple-login.yml`
- Modify: `adapter/in/web/{AuthController,ApiExceptionHandler}.java`, `infra/security/{SecurityConfig,RateLimitFilter}.java`
- Test: `application/user/AccountIdentityTest.java`, `adapter/in/web/AuthControllerTest.java` (ek)

- [ ] **Step 1: Başarısız testi yaz** — `AccountIdentityTest` (`FakeAppleTokens` T8 tarafından da kullanılır):

```java
    static class FakeAppleTokens implements AppleTokensPort {
        String exchanged;
        String revoked;
        boolean revokeThrows;
        Optional<String> answer = Optional.of("rt-1");
        @Override public Optional<String> exchangeRefreshToken(String code) {
            exchanged = code;
            return answer;
        }
        @Override public void revoke(String refreshToken) {
            if (revokeThrows) {
                throw new IllegalStateException("apple down");
            }
            revoked = refreshToken;
        }
    }
    final FakeStores.InMemoryUserStore users = new FakeStores.InMemoryUserStore();
    final FakeAppleTokens apple = new FakeAppleTokens();
    final AccountIdentity identity = new AccountIdentity(users, apple);
    @Test
    void appleLoginMergesIntoTheExistingGoogleAccountAndStoresTheRefreshToken() {
        UUID existing = users.upsertByEmail("ayse@bumpinto.test", "Ayse");
        UUID merged = identity.upsertApple("apple-sub-1", "ayse@bumpinto.test", "Ayse", "code-1");
        assertThat(merged).isEqualTo(existing);
        assertThat(apple.exchanged).isEqualTo("code-1");
        assertThat(users.appleRefreshToken(merged)).contains("rt-1");
    }
    /** Takas basarisiz: giris YINE tamamlanir (fail-open). Kod yoksa Apple'a hic cagri yapilmaz. */
    @Test
    void failedOrSkippedExchangeStillCompletesTheLogin() {
        apple.answer = Optional.empty();
        UUID id = identity.upsertApple("apple-sub-2", "yeni@bumpinto.test", "Yeni", "code-2");
        assertThat(users.profileOf(id)).isPresent();
        assertThat(users.appleRefreshToken(id)).isEmpty();
        apple.exchanged = null;
        identity.upsertApple("apple-sub-3", "x@bumpinto.test", "X", null);
        assertThat(apple.exchanged).isNull();
    }
```

`AuthControllerTest`'e (`@MockitoBean AppleIdVerifier apple;` + `@MockitoBean AccountIdentity identity;`):

```java
    /** Apple ayarli degilse uc VAR ama 503 doner: istemci "Apple ile devam et"i gizleyebilsin. */
    @Test
    void unconfiguredAppleIs503() throws Exception {
        when(apple.configured()).thenReturn(false);
        mvc.perform(post("/api/auth/apple").contentType("application/json")
                        .content("{\"identityToken\":\"whatever\"}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error").value("apple_not_configured"));
    }
```

- [ ] **Step 2: Testi çalıştır, kırmızı gör** — Run: `MVN_TEST AccountIdentityTest` · Expected: COMPILATION ERROR (`AccountIdentity` yok).

- [ ] **Step 3: Uygulama servisini yaz**

```java
/**
 * Apple girisinin hesap tarafi. Eslestirme/birlestirme kurali depoda (upsertByAppleSub);
 * burada duran tek karar refresh token'in FAIL-OPEN takasidir.
 */
@Service
public class AccountIdentity {
    private final UserStorePort users;
    private final AppleTokensPort apple;
    public AccountIdentity(UserStorePort users, AppleTokensPort apple) {
        this.users = users;
        this.apple = apple;
    }
    @Transactional
    public UUID upsertApple(String appleSub, String email, String name, String authorizationCode) {
        UUID userId = users.upsertByAppleSub(appleSub, email, name);
        if (authorizationCode != null && !authorizationCode.isBlank()) {
            apple.exchangeRefreshToken(authorizationCode)
                    .ifPresent(token -> users.saveAppleRefreshToken(userId, token));
        }
        return userId;
    }
}
```

- [ ] **Step 4: Ucu ve kapıları yaz**

```java
// application/error/UnavailableException.java — ozellik YAPILANDIRILMAMIS: istemci hatasi degil
public class UnavailableException extends RuntimeException {
    public UnavailableException(String message) {
        super(message);
    }
}
// ApiExceptionHandler — mevcut handler'larin altina
    @ExceptionHandler(UnavailableException.class)
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    ApiError unavailable(UnavailableException e) {
        return new ApiError(e.getMessage());
    }
```

`AuthController` — kurucuya `AppleIdVerifier appleVerifier, AccountIdentity identity`; `google(...)` gövdesindeki token/çerez üretimi `private ResponseEntity<LoginResponse> respond(HttpServletRequest http, UUID userId, String email, String client)` metoduna çıkarılır (davranış birebir: `X-Client: web` → `Set-Cookie` + null accessToken, hesap değiştiyse katılımcı çerezleri temizlenir) ve iki uç da onu çağırır.

```java
    /** §2: {identityToken, nonce?, fullName?}; authorizationCode opsiyonel, yalniz revoke icin. */
    record AppleLoginRequest(@NotBlank String identityToken, String nonce,
                             @Size(max = 80) String fullName, String authorizationCode) {
        @Override
        public String toString() {
            return "AppleLoginRequest[identityToken=" + ApiDtos.masked(identityToken)
                    + ", nonce=" + ApiDtos.masked(nonce) + ", fullName=" + fullName
                    + ", authorizationCode=" + ApiDtos.masked(authorizationCode) + "]";
        }
    }
    @PostMapping("/apple")
    ResponseEntity<LoginResponse> apple(HttpServletRequest http,
            @Valid @RequestBody AppleLoginRequest request,
            @RequestHeader(value = "X-Client", defaultValue = "mobile") String client) {
        if (!appleVerifier.configured()) {
            throw new UnavailableException("apple_not_configured");
        }
        AppleIdVerifier.AppleUser verified =
                appleVerifier.verify(request.identityToken(), request.nonce());
        // Apple adi YALNIZ ilk giriste gonderir; sonraki girislerde null gelir, mevcut ad korunur.
        UUID userId = identity.upsertApple(verified.sub(), verified.email(), request.fullName(),
                request.authorizationCode());
        return respond(http, userId, verified.email(), client);
    }
```

`SecurityConfig.PUBLIC_ENDPOINTS` — Google satırının altına; `RateLimitFilter.defaultPolicies()` — `auth` satırının altına:

```java
            PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.POST, "/api/auth/apple"),
                new Policy("auth-apple", "POST", Pattern.compile("^/api/auth/apple$"), 5),
```

- [ ] **Step 5: Bruno** — `auth/apple-login.yml` (`seq: 3`, `google-login.yml` biçimi): `POST {{baseUrl}}/api/auth/apple`, gövde `{"identityToken":"{{appleIdentityToken}}","nonce":"n-0S6_WzA2Mj"}`, testler `200` + `res.body.userId` string. Docs: eşleştirme sırası (apple_sub → e-posta), 503 = anahtar yok, `X-Client: web` çerez davranışı, hız sınırı 5/dk.

- [ ] **Step 6: Testleri çalıştır** — Run: `MVN_TEST AccountIdentityTest` sonra `MVN_TEST AuthControllerTest` · Expected: ikisi de PASSED.

- [ ] **Step 7: Değişen dosyalar** — `AccountIdentity.java`, `UnavailableException.java`, `AuthController.java`, `ApiExceptionHandler.java`, `SecurityConfig.java`, `RateLimitFilter.java`, `auth/apple-login.yml`, iki test. Mesaj: `feat(auth): POST /api/auth/apple with account merge`.

---

### Task 7: Rıza — `MeResponse.consents` + `PUT /api/me/consents`

**Files:**
- Create: `application/user/UserConsents.java`, `backend/.infra/bumpinto-collection/me/update-consents.yml`
- Modify: `adapter/in/web/{ApiDtos,MeController}.java` · Test: `application/user/UserConsentsTest.java`

- [ ] **Step 1: Başarısız testi yaz** (`NOW = Instant.parse("2026-09-06T12:00:00Z")`, `service = new UserConsents(users, Clock.fixed(NOW, ZoneOffset.UTC))`)

```java
    @Test
    void defaultsAreAllFalseAndWritingStampsTimeAndVersion() {
        UUID id = users.upsertByEmail("a@bumpinto.test", "A");
        assertThat(users.profileOf(id).orElseThrow().consents().analytics()).isFalse();
        assertThat(users.profileOf(id).orElseThrow().consents().updatedAt()).isNull();
        Consents saved = service.update(id, true, false, true);
        assertThat(saved.location()).isTrue();
        assertThat(saved.microphone()).isFalse();
        assertThat(saved.analytics()).isTrue();
        assertThat(saved.updatedAt()).isEqualTo(NOW);
        assertThat(saved.version()).isEqualTo(Consents.CURRENT_VERSION);
        // Cihaz degisse de tercih hesapta durur.
        assertThat(users.profileOf(id).orElseThrow().consents()).isEqualTo(saved);
    }
    @Test
    void unknownAccountIsNotFound() {
        assertThatThrownBy(() -> service.update(UUID.randomUUID(), true, true, true))
                .isInstanceOf(NotFoundException.class);
    }
```

- [ ] **Step 2: Testi çalıştır, kırmızı gör** — Run: `MVN_TEST UserConsentsTest` · Expected: COMPILATION ERROR (`UserConsents` yok).

- [ ] **Step 3: Servisi yaz**

```java
/**
 * Riza yazma AYRI uctur (§2): PUT /api/me tam-yerine-koymadir; riza alani oraya konsaydi yalniz
 * adini guncelleyen bir istemci uc rizayi da sessizce false'a cekerdi.
 */
@Service
public class UserConsents {
    private final UserStorePort users;
    private final Clock clock;
    public UserConsents(UserStorePort users, Clock clock) {
        this.users = users;
        this.clock = clock;
    }
    @Transactional
    public Consents update(UUID userId, boolean location, boolean microphone, boolean analytics) {
        UserProfile current = users.profileOf(userId)
                .orElseThrow(() -> new NotFoundException("user not found"));
        Consents updated = current.consents()
                .updated(location, microphone, analytics, clock.instant());
        return users.saveProfile(current.withConsents(updated)).consents();
    }
}
```

- [ ] **Step 4: DTO'ları ve ucu yaz**

```java
// ApiDtos — §2: consents{location, microphone, analytics, updatedAt, version}
    public record ConsentsDto(boolean location, boolean microphone, boolean analytics,
                              Instant updatedAt, int version) {
    }
    public record MeResponse(UUID id, String email, String displayName,
                             LocationPrefDto defaultLocation, ActivityType defaultActivity,
                             String language, TravelMode defaultTravelMode, StatsDto stats,
                             List<AuthProvider> authProviders, ConsentsDto consents) {
    }
    /** Uc anahtar da ZORUNLU: eksik alan "degistirme" degil, belirsiz rizadir. */
    public record UpdateConsentsRequest(@NotNull Boolean location, @NotNull Boolean microphone,
                                        @NotNull Boolean analytics) {
    }
// MeController — kurucuya UserConsents consents
    @PutMapping("/consents")
    ApiDtos.ConsentsDto consents(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ApiDtos.UpdateConsentsRequest request) {
        return toDto(consents.update(WebPrincipals.accountId(jwt), request.location(),
                request.microphone(), request.analytics()));
    }
    static ApiDtos.ConsentsDto toDto(Consents c) {
        return new ApiDtos.ConsentsDto(c.location(), c.microphone(), c.analytics(),
                c.updatedAt(), c.version());
    }
```

`toResponse(...)`'a son iki argüman eklenir: `profile.authProviders().stream().sorted().toList()` ve `toDto(profile.consents())`.

- [ ] **Step 5: Bruno** — `me/update-consents.yml` (`seq: 3`): `PUT {{baseUrl}}/api/me/consents`, gövde `{"location":true,"microphone":false,"analytics":false}`, testler `200` + `res.body.updatedAt` string. Docs: varsayılan hepsi false; `analytics=false` iken sunucu hiçbir analitik olayı iletmez; `version` rıza metni sürümüdür, artınca istemci ekranı yeniden sorar.

- [ ] **Step 6: Testi çalıştır** — Run: `MVN_TEST UserConsentsTest` · Expected: PASSED.

- [ ] **Step 7: Değişen dosyalar** — `UserConsents.java`, `ApiDtos.java`, `MeController.java`, `me/update-consents.yml`, `UserConsentsTest.java`. Mesaj: `feat(me): explicit consent preferences (KVKK m.5/1)`.

---

### Task 8: `AccountDeletion` — host oturumları silinir, katılımlar anonimleşir

**Files:** Create `application/user/AccountDeletion.java` · Test `application/user/AccountDeletionTest.java`

- [ ] **Step 1: Başarısız testi yaz** (`NOW`; `apple = new AccountIdentityTest.FakeAppleTokens()`; `deletion = new AccountDeletion(users, sessions, apple, Clock.fixed(NOW, ZoneOffset.UTC))`)

```java
    UUID hostedSession(UUID hostId, String slug) {
        return sessions.saveSession(new Session(UUID.randomUUID(), slug, hostId, "Kahve",
                List.of(ActivityType.COFFEE), SessionType.GROUP, SessionStatus.COLLECTING,
                NOW.plus(Duration.ofHours(24)), null, List.of(), null, null, null, null, null)).id();
    }
    @Test
    void hostSessionsAreDeletedGuestSeatsAreAnonymizedAndAppleIsRevoked() {
        UUID me = users.upsertByEmail("me@bumpinto.test", "Ben");
        users.saveAppleRefreshToken(me, "rt-1");
        UUID mine = hostedSession(me, "mine");
        UUID others = hostedSession(users.upsertByEmail("host@bumpinto.test", "Host"), "others");
        UUID seat = UUID.randomUUID();
        sessions.saveParticipant(new Participant(seat, others, "Ben", new GeoPoint(51.69, 5.30),
                false, null, false, "Den Bosch", TravelMode.CAR, me));
        deletion.delete(me);
        assertThat(sessions.sessions).doesNotContainKey(mine);
        Participant left = sessions.participants.get(seat);
        assertThat(left.displayName()).isEqualTo("Ayrıldı");
        assertThat(left.userId()).isNull();
        assertThat(left.location()).isNull();
        assertThat(users.profileOf(me)).isEmpty();
        assertThat(apple.revoked).isEqualTo("rt-1");
        assertThat(users.deletedAt.get(me)).isEqualTo(NOW);
        assertThat(users.purgeAfter.get(me)).isEqualTo(NOW.plus(Duration.ofDays(30)));
    }
    /** Apple revoke patlarsa silme YINE tamamlanir (5.1.1(v) silmeyi sarta baglamaz). */
    @Test
    void failedRevokeDoesNotBlockDeletion() {
        UUID me = users.upsertByEmail("me2@bumpinto.test", "Ben");
        users.saveAppleRefreshToken(me, "rt-2");
        apple.revokeThrows = true;
        deletion.delete(me);
        assertThat(users.profileOf(me)).isEmpty();
    }
```

- [ ] **Step 2: Testi çalıştır, kırmızı gör** — Run: `MVN_TEST AccountDeletionTest` · Expected: COMPILATION ERROR (`AccountDeletion` yok).

- [ ] **Step 3: Servisi yaz**

```java
/**
 * Hesap silme (Apple 5.1.1(v), Play hesap silme). Semantik §2: erisim ANINDA kapanir, fiziksel
 * satirlar 30 gunde gider (B-3/plan6 CronJob'i).
 *
 * <p>Uc farkli muamele: (1) HOST oldugu oturumlar SILINIR — sahipsiz kalamazlar; (2) baskasinin
 * oturumundaki koltuklar SILINMEZ, anonimlesir — silinseydi o oturumun orta noktasi, deste
 * geometrisi ve oy populasyonu geriye donuk degisir, katilan herkesin sayilari bozulurdu;
 * (3) hesap satiri kimligi birakir ve damgalanir.
 */
@Service
public class AccountDeletion {
    private static final Logger log = LoggerFactory.getLogger(AccountDeletion.class);
    /** §2 + O15 metni: "30 gun icinde kalici olarak silinir". */
    static final Duration PURGE_DELAY = Duration.ofDays(30);
    /** Anonimlesen koltugun gorunen adi (O15/W18 kopyasi). */
    static final String ANONYMOUS_NAME = "Ayrıldı";
    private final UserStorePort users;
    private final SessionStorePort sessions;
    private final AppleTokensPort apple;
    private final Clock clock;
    public AccountDeletion(UserStorePort users, SessionStorePort sessions, AppleTokensPort apple,
                           Clock clock) {
        this.users = users;
        this.sessions = sessions;
        this.apple = apple;
        this.clock = clock;
    }
    @Transactional
    public void delete(UUID userId) {
        Instant now = clock.instant();
        // Revoke ONCE: softDelete apple_refresh_token'i temizler, sonra okunamazdi.
        revokeApple(userId);
        for (UUID sessionId : sessions.sessionIdsOfHost(userId)) {
            sessions.deleteSession(sessionId);
        }
        for (Participant seat : sessions.participantsOfUser(userId)) {
            sessions.anonymizeParticipant(seat.id(), ANONYMOUS_NAME, now);
        }
        users.softDelete(userId, now, now.plus(PURGE_DELAY));
    }
    /** FAIL-OPEN: Apple'a ulasilamamasi kullanicinin silme hakkini engellemez. */
    private void revokeApple(UUID userId) {
        try {
            users.appleRefreshToken(userId).ifPresent(apple::revoke);
        } catch (RuntimeException appleDown) {
            log.warn("apple revoke failed for {}: {}", userId, appleDown.getMessage());
        }
    }
}
```

- [ ] **Step 4: Testi çalıştır** — Run: `MVN_TEST AccountDeletionTest` · Expected: PASSED.

- [ ] **Step 5: Değişen dosyalar** — `AccountDeletion.java`, `AccountDeletionTest.java`. Mesaj: `feat(me): account deletion core with anonymized guest seats`.

---

### Task 9: `DELETE /api/me` + `deleteConfirmToken` (kurulumsuz web akışı)

**Files:**
- Modify: `infra/security/{TokenService,SecurityConfig,RateLimitFilter}.java`, `adapter/in/web/{MeController,ApiDtos}.java`
- Create: `backend/.infra/bumpinto-collection/me/{delete-token,delete-me}.yml`
- Test: `infra/security/TokenServiceTest.java` (ek), `AccountApiTest.java` (ek)

- [ ] **Step 1: Başarısız testleri yaz** — `TokenServiceTest`'e:

```java
    /**
     * Silme jetonu HESAP jetonu SAYILMAZ. Ayni TOKEN_SECRET imzaladigi icin kapi olmasa kisa
     * omurlu bir silme jetonu Authorization: Bearer ile tum hesap uclarini acardi (typ=pt
     * kapisinin ayni gerekcesi).
     */
    @Test
    void deleteTokenIsNotAnAccountToken() {
        UUID user = UUID.randomUUID();
        String delete = tokens.issueDeleteToken(user);
        assertThat(tokens.decoder().decode(delete).getClaimAsString(TokenService.TYPE_CLAIM))
                .isEqualTo(TokenService.DELETE_TYPE);
        assertThat(tokens.isDeleteTokenFor(delete, user)).isTrue();
        assertThat(tokens.isDeleteTokenFor(delete, UUID.randomUUID())).isFalse();
        assertThat(tokens.isDeleteTokenFor(tokens.issueAccessToken(user, "a@b.test"), user))
                .isFalse();
    }
```

`AccountApiTest`'e (gerçek MockMvc + Postgres; `delete`/`cookie` matcher importları eklenir):

```java
    @Test
    void deleteMeClosesAccessImmediatelyAndClearsCookies() throws Exception {
        when(google.verify("gid-del"))
                .thenReturn(new GoogleIdVerifier.GoogleUser("del@bumpinto.test", "Silinecek"));
        MvcResult login = mvc.perform(post("/api/auth/google").header("X-Client", "web")
                        .contentType(JSON).content("{\"idToken\":\"gid-del\"}"))
                .andExpect(status().isOk()).andReturn();
        Cookie at = login.getResponse().getCookie("bumpinto_at");
        MvcResult created = mvc.perform(post("/api/sessions").cookie(at).contentType(JSON)
                        .content("{\"activityTypes\":[\"COFFEE\"],\"name\":\"Silinecek kahve\","
                                + "\"lat\":51.69,\"lng\":5.30,\"displayName\":\"Silinecek\"}"))
                .andExpect(status().isCreated()).andReturn();
        String slug = json.readTree(created.getResponse().getContentAsString())
                .get("slug").asString();
        // Onay jetonu OLMADAN silme 400 (R-B3 kabul kriteri b).
        mvc.perform(delete("/api/me").cookie(at).contentType(JSON).content("{}"))
                .andExpect(status().isBadRequest());
        String confirm = json.readTree(mvc.perform(post("/api/me/delete-token").cookie(at))
                        .andExpect(status().isOk()).andReturn().getResponse().getContentAsString())
                .get("deleteConfirmToken").asString();
        mvc.perform(delete("/api/me").cookie(at).header("X-Client", "web").contentType(JSON)
                        .content("{\"deleteConfirmToken\":\"" + confirm + "\"}"))
                .andExpect(status().isNoContent())
                .andExpect(cookie().maxAge("bumpinto_at", 0));
        // (a) erisim aninda kapanir  (b) silinen hesabin slug'inda host satiri gorunmez
        mvc.perform(get("/api/me").cookie(at)).andExpect(status().isNotFound());
        mvc.perform(get("/api/sessions/" + slug)).andExpect(status().isNotFound());
    }
```

- [ ] **Step 2: Testi çalıştır, kırmızı gör** — Run: `MVN_TEST TokenServiceTest` · Expected: COMPILATION ERROR (`issueDeleteToken` yok).

- [ ] **Step 3: Jetonu ve kapıyı yaz** — `TokenService`:

```java
    /** Silme onayi jetonu: kisa omurlu, hesap jetonu YERINE gecmez. */
    public static final String DELETE_TYPE = "del";
    public static final Duration DELETE_TTL = Duration.ofMinutes(10);
    /**
     * Kurulumsuz web akisi (R-B3): anonim tarayicidan Google/Apple ile girilir, bu jeton alinir,
     * silme onayi onunla yapilir. Tek kullanimlik olmasi icin DB kaydi gerekmez — jeton yalniz
     * KENDI hesabini siler ve silmeden sonra hesap zaten yoktur.
     */
    public String issueDeleteToken(UUID userId) {
        Instant now = clock.instant();
        JwtClaimsSet claims = JwtClaimsSet.builder().subject(userId.toString())
                .claim(TYPE_CLAIM, DELETE_TYPE).issuedAt(now).expiresAt(now.plus(DELETE_TTL))
                .build();
        return encoder.encode(JwtEncoderParameters
                .from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }
    public boolean isDeleteTokenFor(String token, UUID userId) {
        if (token == null || token.isBlank()) {
            return false;
        }
        try {
            Jwt jwt = decoder.decode(token);
            return DELETE_TYPE.equals(jwt.getClaimAsString(TYPE_CLAIM))
                    && userId.toString().equals(jwt.getSubject());
        } catch (JwtException invalid) {
            return false;
        }
    }
```

`SecurityConfig.apiJwtDecoder` — `typ=pt` kontrolü kara listeden **beyaz listeye** çevrilir; `RateLimitFilter.defaultPolicies()` — `api` satırının üstüne yeni politika:

```java
            String type = jwt.getClaimAsString(TokenService.TYPE_CLAIM);
            if (type != null) {
                // Hesap jetonunda typ claim'i HIC YOKTUR. Yalniz "pt"yi reddetseydik her yeni
                // jeton turu (bugun del, yarin baskasi) sessizce hesap jetonu sayilirdi.
                throw new BadJwtException("typed token is not an account token: " + type);
            }
                new Policy("delete-account", "DELETE", Pattern.compile("^/api/me$"), 3),
```

- [ ] **Step 4: DTO'ları ve ucu yaz**

```java
// ApiDtos
    public record DeleteAccountRequest(@NotBlank String deleteConfirmToken) {
        @Override
        public String toString() {
            return "DeleteAccountRequest[deleteConfirmToken=" + masked(deleteConfirmToken) + "]";
        }
    }
    public record DeleteTokenResponse(String deleteConfirmToken, Instant expiresAt) {
        @Override
        public String toString() {
            return "DeleteTokenResponse[deleteConfirmToken=" + masked(deleteConfirmToken)
                    + ", expiresAt=" + expiresAt + "]";
        }
    }
// MeController — kurucuya TokenService tokens, AccountDeletion deletion, AuthCookies cookies, Clock clock
    @PostMapping("/delete-token")
    ApiDtos.DeleteTokenResponse deleteToken(@AuthenticationPrincipal Jwt jwt) {
        UUID id = WebPrincipals.accountId(jwt);
        return new ApiDtos.DeleteTokenResponse(tokens.issueDeleteToken(id),
                clock.instant().plus(TokenService.DELETE_TTL));
    }
    /**
     * Silme hesabin KENDI onayini ister: tek tikla (ya da yanlislikla) hesap gitmez. Kurulumsuz
     * web akisi (R-B3) da bu jetonu kullanir — uygulama gerekmez.
     */
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(HttpServletRequest http, HttpServletResponse response,
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ApiDtos.DeleteAccountRequest request) {
        UUID id = WebPrincipals.accountId(jwt);
        if (!tokens.isDeleteTokenFor(request.deleteConfirmToken(), id)) {
            throw new IllegalArgumentException("invalid delete confirmation");
        }
        deletion.delete(id);
        // Tarayicidaki her sey gider: hesap cerezi + bu tarayicidaki tum katilimci cerezleri.
        response.addHeader(HttpHeaders.SET_COOKIE, cookies.clearAccess().toString());
        cookies.clearParticipants(http)
                .forEach(c -> response.addHeader(HttpHeaders.SET_COOKIE, c.toString()));
    }
```

- [ ] **Step 5: Bruno** — `me/delete-token.yml` (`seq: 4`, `POST /api/me/delete-token`, test `200` + `deleteConfirmToken` string) ve `me/delete-me.yml` (`seq: 5`, `DELETE /api/me`, gövde `{"deleteConfirmToken":"{{deleteConfirmToken}}"}`, test `204`). Docs: erişim anında kapanır, fiziksel silme 30 gün (B-3), host oturumları silinir, katılımlar anonimleşir, Apple bağlıysa revoke (hata silmeyi engellemez), onay jetonu 10 dk, hız sınırı 3/dk.

- [ ] **Step 6: Testleri çalıştır** — Run: `MVN_TEST TokenServiceTest`, `MVN_TEST AccountApiTest`, `MVN_TEST WebSecuritySliceTest` · Expected: hepsi PASSED. `WebSecuritySliceTest` kırmızıya dönerse sebebi `typ` beyaz listesidir: testteki hesap jetonu `issueAccessToken` ile üretilmeli, elle claim eklenmiş bir jeton varsa düzelt.

- [ ] **Step 7: Değişen dosyalar** — `TokenService.java`, `SecurityConfig.java`, `RateLimitFilter.java`, `MeController.java`, `ApiDtos.java`, iki Bruno dosyası, iki test. Mesaj: `feat(me): DELETE /api/me with single-use delete confirmation token`.

---

### Task 10: Bildir/engelle uçları

**Files:**
- Create: `application/safety/{Reports,Blocks}.java`, `adapter/in/web/{ReportController,BlockController}.java`, `backend/.infra/bumpinto-collection/safety/{folder,report,list-blocks,add-block,remove-block}.yml`
- Modify: `adapter/in/web/ApiDtos.java`, `infra/security/RateLimitFilter.java` · Test: `application/safety/BlocksTest.java`

- [ ] **Step 1: Başarısız testi yaz** (`me = UUID.randomUUID()`; `session = sessions.saveSession(new Session(UUID.randomUUID(), "slug-1", me, "Kahve", List.of(ActivityType.COFFEE), SessionType.GROUP, SessionStatus.COLLECTING, NOW.plus(Duration.ofHours(24)), null, List.of(), null, null, null, null, null))`; `blocks = new Blocks(store, sessions, events, Clock.fixed(NOW, ZoneOffset.UTC))`)

```java
    Participant seat(UUID owner) {
        return sessions.saveParticipant(new Participant(UUID.randomUUID(), session.id(), "Kisi",
                null, false, null, false, null, TravelMode.CAR, owner));
    }
    List<Participant> roster() {
        return sessions.participantsOf(session.id());
    }
    @Test
    void rosterBlockIsOneWayButTheVoiceRuleIsMutual() {
        UUID other = UUID.randomUUID();
        Participant them = seat(other);
        Participant mySeat = seat(me);
        blocks.add(me, other, null, null);
        assertThat(blocks.hiddenParticipantIds(me, session.id(), roster()))
                .containsExactly(them.id());
        // Karsi taraf hicbir isaret gormez (engel bir mesaj degildir)...
        assertThat(blocks.hiddenParticipantIds(other, session.id(), roster())).isEmpty();
        // ...ama ses odasi kurali iki yonludur.
        assertThat(blocks.blockedPairIds(session.id(), them.id(), roster()))
                .containsExactly(mySeat.id());
    }
    /** Anonim koltuk (user_id null) YALNIZ o oturum boyunca engellenir. */
    @Test
    void anonymousParticipantBlockIsSessionScopedAndRingsTheRosterBell() {
        Participant anon = seat(null);
        blocks.add(me, null, anon.id(), "slug-1");
        assertThat(blocks.hiddenParticipantIds(me, session.id(), roster()))
                .containsExactly(anon.id());
        assertThat(blocks.hiddenParticipantIds(me, UUID.randomUUID(), List.of())).isEmpty();
        assertThat(events.published).extracting(p -> p.event().type()).contains("blocked");
    }
    @Test
    void removingSomeoneElsesBlockIsForbidden() {
        UUID id = blocks.add(me, UUID.randomUUID(), null, null).id();
        assertThatThrownBy(() -> blocks.remove(UUID.randomUUID(), id))
                .isInstanceOf(ForbiddenException.class);
    }
```

- [ ] **Step 2: Testi çalıştır, kırmızı gör** — Run: `MVN_TEST BlocksTest` · Expected: COMPILATION ERROR (`Blocks` yok).

- [ ] **Step 3: `Blocks` servisini yaz**

```java
/**
 * Engelleme (Apple 1.2 UGC). IKI KURAL ayridir: ROSTER'da engel TEK YONLUDUR — engelleyen
 * "engellendi" gorur, engellenen hicbir sey gormez (aksi halde engel bir mesaj olurdu).
 * SES ODASINDA engel CIFT YONLUDUR (§2: engelli cift ayni odaya alinmaz).
 */
@Service
public class Blocks {
    private final BlockStorePort store;
    private final SessionStorePort sessions;
    private final SessionEventsPort events;
    private final Clock clock;
    public Blocks(BlockStorePort store, SessionStorePort sessions, SessionEventsPort events,
                  Clock clock) {
        this.store = store;
        this.sessions = sessions;
        this.events = events;
        this.clock = clock;
    }
    /** blockedUserId varsa hesap engeli; yoksa sessionSlug ZORUNLU (oturum kapsamli engel). */
    @Transactional
    public Block add(UUID blockerUserId, UUID blockedUserId, UUID blockedParticipantId,
                     String sessionSlug) {
        if (blockedUserId != null) {
            return store.save(Block.ofUser(UUID.randomUUID(), blockerUserId, blockedUserId,
                    clock.instant()));
        }
        Session session = sessions.sessionBySlug(sessionSlug)
                .orElseThrow(() -> new NotFoundException("session not found"));
        Block saved = store.save(Block.ofParticipant(UUID.randomUUID(), blockerUserId,
                blockedParticipantId, session.id(), clock.instant()));
        events.publish(session.slug(), SessionEvent.blocked());
        return saved;
    }
    public List<Block> list(UUID blockerUserId) {
        return store.blocksOf(blockerUserId);
    }
    @Transactional
    public void remove(UUID blockerUserId, UUID blockId) {
        if (!store.delete(blockerUserId, blockId)) {
            // "Bulunamadi" degil 403: baskasinin engelinin VARLIGI da sizmamali.
            throw new ForbiddenException("block not found");
        }
    }
    /** Goruntuleyenin ENGELLEDIGI katilimcilar — ParticipantDto.blocked bundan gelir. */
    public Set<UUID> hiddenParticipantIds(UUID viewerUserId, UUID sessionId,
                                          List<Participant> participants) {
        if (viewerUserId == null) {
            return Set.of();
        }
        Set<UUID> blockedAccounts = store.blockedUserIdsOf(viewerUserId);
        Set<UUID> hidden = new HashSet<>(store.blockedParticipantIdsOf(viewerUserId, sessionId));
        participants.stream()
                .filter(p -> p.userId() != null && blockedAccounts.contains(p.userId()))
                .map(Participant::id).forEach(hidden::add);
        return hidden;
    }
    /** Verilen katilimciyla HER IKI YONDE engelli olan katilimcilar — ses odasi kurali. */
    public Set<UUID> blockedPairIds(UUID sessionId, UUID participantId,
                                    List<Participant> participants) {
        Participant subject = participants.stream().filter(p -> p.id().equals(participantId))
                .findFirst().orElse(null);
        if (subject == null) {
            return Set.of();
        }
        Set<UUID> pairs = new HashSet<>();
        if (subject.userId() != null) {
            Set<UUID> outgoing = store.blockedUserIdsOf(subject.userId());   // hesap engeli
            Set<UUID> incoming = store.blockerUserIdsOf(subject.userId());   // ters yon
            participants.stream()
                    .filter(p -> p.userId() != null
                            && (outgoing.contains(p.userId()) || incoming.contains(p.userId())))
                    .map(Participant::id).forEach(pairs::add);
            pairs.addAll(store.blockedParticipantIdsOf(subject.userId(), sessionId));
        }
        // Baskalarinin BU koltuga koydugu anonim engeller.
        participants.stream()
                .filter(p -> p.userId() != null && store
                        .blockedParticipantIdsOf(p.userId(), sessionId).contains(participantId))
                .map(Participant::id).forEach(pairs::add);
        pairs.remove(participantId);
        return pairs;
    }
}
```

- [ ] **Step 4: `Reports` servisini yaz**

```java
/** Bildirim kaydi (Apple 1.2). Kayit denetim izidir; moderasyon kuyrugu sonraki iz. */
@Service
public class Reports {
    private final ReportStorePort store;
    private final SessionStorePort sessions;
    private final Clock clock;
    public Reports(ReportStorePort store, SessionStorePort sessions, Clock clock) {
        this.store = store;
        this.sessions = sessions;
        this.clock = clock;
    }
    @Transactional
    public Report file(UUID reporterUserId, String sessionSlug, UUID targetParticipantId,
                       ReportReason reason, String note) {
        Session session = sessions.sessionBySlug(sessionSlug)
                .orElseThrow(() -> new NotFoundException("session not found"));
        boolean member = sessions.participantsOf(session.id()).stream()
                .map(Participant::id).anyMatch(targetParticipantId::equals);
        if (!member) {
            throw new NotFoundException("participant not found");
        }
        return store.save(new Report(UUID.randomUUID(), reporterUserId, session.id(),
                targetParticipantId, reason, Texts.label(note), clock.instant()));
    }
}
```

- [ ] **Step 5: DTO'ları, controller'ları ve hız sınırını yaz**

```java
// ApiDtos
    public record ReportRequest(@NotBlank String sessionSlug, @NotNull UUID targetParticipantId,
                                @NotNull ReportReason reason, @Size(max = 500) String note) {
    }
    public record ReportResponse(UUID id, Instant createdAt) {
    }
    /** Ikisinden TAM BIRI: hesap engeli (userId) ya da oturum kapsamli anonim engel. */
    public record BlockRequest(UUID userId, UUID participantId, String sessionSlug) {
        @AssertTrue(message = "exactly one of userId/participantId is required")
        public boolean isTargetExclusive() {
            return (userId == null) != (participantId == null)
                    && (participantId == null || (sessionSlug != null && !sessionSlug.isBlank()));
        }
    }
    public record BlockDto(UUID id, UUID userId, UUID participantId, Instant createdAt) {
    }
```

```java
@RestController
@RequestMapping("/api/reports")
class ReportController {
    private final Reports reports;
    ReportController(Reports reports) {
        this.reports = reports;
    }
    @PostMapping
    ApiDtos.ReportResponse report(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ApiDtos.ReportRequest request) {
        Report saved = reports.file(WebPrincipals.accountId(jwt), request.sessionSlug(),
                request.targetParticipantId(), request.reason(), request.note());
        return new ApiDtos.ReportResponse(saved.id(), saved.createdAt());
    }
}
@RestController
@RequestMapping("/api/me/blocks")
class BlockController {
    private final Blocks blocks;
    BlockController(Blocks blocks) {
        this.blocks = blocks;
    }
    @GetMapping
    List<ApiDtos.BlockDto> list(@AuthenticationPrincipal Jwt jwt) {
        return blocks.list(WebPrincipals.accountId(jwt)).stream()
                .map(BlockController::toDto).toList();
    }
    @PostMapping
    ApiDtos.BlockDto add(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ApiDtos.BlockRequest request) {
        return toDto(blocks.add(WebPrincipals.accountId(jwt), request.userId(),
                request.participantId(), request.sessionSlug()));
    }
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void remove(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        blocks.remove(WebPrincipals.accountId(jwt), id);
    }
    private static ApiDtos.BlockDto toDto(Block block) {
        return new ApiDtos.BlockDto(block.id(), block.blockedUserId(),
                block.blockedParticipantId(), block.createdAt());
    }
}
```

`RateLimitFilter.defaultPolicies()` — `api` satırının üstüne: `new Policy("report", "POST", Pattern.compile("^/api/reports$"), 5),`

- [ ] **Step 6: Bruno** — yeni klasör `safety/` (`folder.yml`: `name: Güvenlik (bildir · engelle)`, `type: folder`, `seq: 8`, klasör düzeyinde bearer `{{accessToken}}`) ve dört istek: `report.yml` (200 + `id`), `list-blocks.yml` (200, dizi), `add-block.yml` (200 + `id`), `remove-block.yml` (204). Docs: `note` ≤ 500, rapor hız sınırı 5/dk; engel roster'da tek yönlü, ses odasında çift yönlü; anonim engel yalnız o oturum.

- [ ] **Step 7: Testi çalıştır** — Run: `MVN_TEST BlocksTest` · Expected: PASSED.

- [ ] **Step 8: Değişen dosyalar** — `Reports.java`, `Blocks.java`, `ReportController.java`, `BlockController.java`, `ApiDtos.java`, `RateLimitFilter.java`, 5 Bruno dosyası, `BlocksTest.java`. Mesaj: `feat(safety): report and block endpoints`.

---

### Task 11: `ParticipantDto.blocked` + ses odası engel filtresi

**Files:**
- Create: `application/safety/VoiceAdmission.java`
- Modify: `adapter/in/web/{ApiDtos,SessionViewAssembler,VoiceRoomListener,VoiceSignalController}.java`
- Test: `adapter/in/web/{SessionViewAssemblerTest,VoiceOverWebSocketTest}.java` (ek)

- [ ] **Step 1: Başarısız testleri yaz** — `SessionViewAssemblerTest`'e (mock `Blocks blocks` kurucuya eklenir):

```java
    /** Engel TEK YON: engelleyen "blocked" gorur, engellenen hicbir isaret gormez. */
    @Test
    void blockedFlagIsSetOnlyForTheViewerWhoBlocked() {
        Participant them = participant("Ayse", UUID.randomUUID());
        when(blocks.hiddenParticipantIds(eq(VIEWER_USER), any(), any()))
                .thenReturn(Set.of(them.id()));
        ApiDtos.SessionView view = assembler.toView(snapshotWith(them), accountAuth(VIEWER_USER));
        assertThat(view.participants()).filteredOn(p -> p.id().equals(them.id()))
                .extracting(ApiDtos.ParticipantDto::blocked).containsExactly(true);
        assertThat(view.participants()).filteredOn(p -> !p.id().equals(them.id()))
                .extracting(ApiDtos.ParticipantDto::blocked).containsOnly(false);
    }
```

`VoiceOverWebSocketTest`'e (mevcut `Fixture`/`connect`/`inbox`/`NoopHandler` yardımcıları; `blockAccounts` yeni yardımcıdır ve `BlockStorePort`'a doğrudan `Block.ofUser(...)` yazar):

```java
    /** §2: engelli cift AYNI ODAYA ALINMAZ — ikinci abonelik koltuk yaratmaz. */
    @Test
    void blockedPeerIsNotSeatedInTheSameRoom() throws Exception {
        Fixture fixture = openRoomWithTwoParticipants();
        blockAccounts(fixture.hostUserId(), fixture.guestUserId());
        StompSession host = connect(fixture.slug(), fixture.hostToken());
        host.subscribe(inbox(fixture.slug(), fixture.hostParticipantId()), new NoopHandler());
        StompSession guest = connect(fixture.slug(), fixture.guestToken());
        guest.subscribe(inbox(fixture.slug(), fixture.guestParticipantId()), new NoopHandler());
        await().atMost(Duration.ofSeconds(5)).untilAsserted(() ->
                assertThat(rooms.roomOf(fixture.sessionId()).orElseThrow().memberIds())
                        .containsExactly(fixture.hostParticipantId()));
    }
```

- [ ] **Step 2: Testi çalıştır, kırmızı gör** — Run: `MVN_TEST SessionViewAssemblerTest` · Expected: COMPILATION ERROR (`ParticipantDto.blocked` yok).

- [ ] **Step 3: Kabul kapısını ve alanı yaz**

```java
/**
 * Ses odasi kabul kapisi. Neden AYRI servis: VoiceRoomListener bir STOMP dinleyicisidir ve
 * elinde yalniz sessionId + participantId vardir; engel kurali koltuk listesini ve iki yonlu
 * iliskiyi ister. Kapi burada durunca dinleyici tek satirla sorar.
 */
@Service
public class VoiceAdmission {
    private final Blocks blocks;
    private final SessionStorePort sessions;
    public VoiceAdmission(Blocks blocks, SessionStorePort sessions) {
        this.blocks = blocks;
        this.sessions = sessions;
    }
    /** Bu katilimciyla ayni odada BULUNAMAYACAK katilimcilar (her iki yonde engel). */
    public Set<UUID> blockedWith(UUID sessionId, UUID participantId) {
        return blocks.blockedPairIds(sessionId, participantId, sessions.participantsOf(sessionId));
    }
}
```

`ApiDtos.ParticipantDto` — `inVoice`'tan sonra son bileşen:

```java
                                 /** Goruntuleyen bu kisiyi engelledi mi; engellenen tarafta daima false. */
                                 boolean blocked) {
```

`SessionViewAssembler` — kurucuya `Blocks blocks`; `participants` üretiminden önce `Set<UUID> hidden = blocks.hiddenParticipantIds(WebPrincipals.accountIdOrNull(auth), snap.session().id(), snap.participants());` ve satır kurulumunun sonuna `hidden.contains(p.id())` argümanı eklenir.

`VoiceRoomListener.onSubscribe` — mevcut `before` hesabından sonra, `join` çağrısından ÖNCE (kurucuya `VoiceAdmission admission`); `VoiceSignalController.relay` — oda üyeliği kontrolünden hemen sonra (ikinci savunma katmanı; kurucuya `VoiceAdmission admission`):

```java
        // §2: engelli cift ayni odaya alinmaz. Kapi ABONELIKTE: uyelik burada dogar, sonradan
        // iptal etmek arada bir sinyal penceresi birakirdi.
        Set<UUID> blocked = admission.blockedWith(me.sessionId(), me.participantId());
        if (before.stream().anyMatch(blocked::contains)) {
            // Sessizce dusurmek istemciyi "baglaniyor"da birakirdi; zil roster'i tazeletir.
            events.publish(me.slug(), SessionEvent.blocked());
            return;
        }
        // --- VoiceSignalController.relay ---
        if (admission.blockedWith(sessionId, from).contains(to)) {
            return;   // engelli cift arasinda sinyal tasinmaz
        }
```

- [ ] **Step 4: Testleri çalıştır** — Run: `MVN_TEST SessionViewAssemblerTest` sonra `MVN_TEST VoiceOverWebSocketTest` · Expected: ikisi de PASSED.

- [ ] **Step 5: Tüm paketi çalıştır** — Run: `JAVA_HOME=$(/usr/libexec/java_home -v 21) JENV_VERSION=21 TESTCONTAINERS_RYUK_DISABLED=true mvn -o test` · Expected: BUILD SUCCESS, kırmızı yok (B-12 sonrası taban 365+; bu plan ~20 test ekler).

- [ ] **Step 6: Değişen dosyalar** — `VoiceAdmission.java`, `ApiDtos.java`, `SessionViewAssembler.java`, `VoiceRoomListener.java`, `VoiceSignalController.java`, iki test. Mesaj: `feat(safety): blocked flag in roster, blocked pairs kept out of voice rooms`.

---

### Task 12: Belgeler ve API sözleşmesi

**Files:** Modify `backend/ARCHITECTURE.md`, `docs/CONFIGURATION.md`, `docs/superpowers/plans/INDEX.md` · Regenerate `frontend/shared/openapi.json`, `frontend/shared/src/api-types.ts`

- [ ] **Step 1: `ARCHITECTURE.md`** — §11 olay tablosuna `voice_roster_changed` satırından sonra `| `blocked` | — |`; kurallara 6. madde:

```markdown
6. **Engel iki farklı kural üretir.** Roster'da engel TEK YÖNLÜDÜR: `ParticipantDto.blocked`
   yalnız engelleyene `true` gelir, engellenen hiçbir işaret görmez (engel bir mesaj değildir).
   Ses odasında engel ÇİFT YÖNLÜDÜR: `VoiceRoomListener` SUBSCRIBE anında `VoiceAdmission`'a
   sorar ve engelli çift aynı odaya alınmaz; `VoiceSignalController` ikinci savunma katmanı
   olarak engelli hedefe sinyal taşımaz. `VoiceInboundGuard` bu işe karışmaz — gövdedeki hedefi
   görmez, yalnız adres ve soket bütçesi denetler. Anonim koltuk engeli (`user_id` null) yalnız
   o oturum boyunca yaşar.
```

§2/§3 paket listesine iki satır: "`domain/safety/` rapor + engel domaini", "`adapter/out/apple/` Apple token takası ve revoke". §12'deki `AppProps` bileşen listesine `apple` (Services ID / bundle id / Team ID / Key ID / p8 — `private-key` sır). Hesap silme semantiği notu: erişim anında (`deleted_at`), fiziksel satır 30 günde (`purge_after`, B-3 CronJob'ı).

- [ ] **Step 2: `docs/CONFIGURATION.md` §1 tablosuna beş satır** (`GOOGLE_CLIENT_ID` satırının altına):

```markdown
| `APPLE_SERVICES_ID` | Sign in with Apple **Services ID** — web akışının `aud`'u, Apple token uçlarında `client_id` | Apple Developer → Identifiers → Services IDs | Hayır |
| `APPLE_BUNDLE_ID` | Native iOS akışının `aud`'u — Apple orada Services ID değil **bundle id** basar | Apple Developer → Identifiers → App IDs | Hayır |
| `APPLE_TEAM_ID` | Client secret JWT'sinin `iss`'i | Apple Developer → Membership | Hayır |
| `APPLE_KEY_ID` | `AuthKey_*.p8` anahtarının kimliği (JWT `kid`) | Apple Developer → Keys | Hayır |
| `APPLE_PRIVATE_KEY` | `AuthKey_*.p8` dosyasının PEM içeriği; ES256 client secret bununla imzalanır. **Boşsa Apple girişi kapalıdır** (`POST /api/auth/apple` → 503), uygulama yine açılır | Apple Developer → Keys → indirilen `.p8` | **Evet** |
```

- [ ] **Step 3: `INDEX.md`** — B tablosuna B-13 satırından sonra:

```markdown
| B-14 | **Mağaza uyumluluk çekirdeği** — Sign in with Apple (`POST /api/auth/apple`, JWKS + çoklu audience + nonce, `apple_sub` birincil / e-posta ikincil birleştirme, `authProviders[]`, refresh token + revoke), hesap silme (`DELETE /api/me` + tek kullanımlık `deleteConfirmToken`, host oturumları silinir, katılımlar anonimleşir, erişim anında kapanır / fiziksel 30 gün), bildir/engelle (`POST /api/reports`, `GET/POST/DELETE /api/me/blocks`, `ParticipantDto.blocked`, engelli çift aynı ses odasına alınmaz), açık rıza (`MeResponse.consents`, `PUT /api/me/consents`) | `2026-09-06-plan33-backend-store-compliance.md` | Plan 33 | ready | **B-3 ✓ (V12)** · B-12 ✓ | — | Gereksinim dok. `2026-09-06-v3-requirements.md` §2/§4, R-B1–R-B5. Migration **V13–V16**. `auth_providers` CSV (V8 deseni; API yine dizi). Apple ayarsızsa uç 503, uygulama açılır (Turn deseni). `SecurityConfig` artık `typ` claim'i taşıyan HİÇBİR jetonu hesap jetonu saymaz. W-14 ve M-5 bu planın `openapi.json`'ını bekler |
```

Ayrıca: satır 45'teki "Sıradakiler" notu **B-15, W-13, M-4, I-3** olur; satır 74–75'teki Flyway siciline "**V13–V16 = B-14**" eklenir; K-B27/K-B28/K-B29 satırlarının `Durum` sütunu `aday` → `B-14'e alındı` olur.

- [ ] **Step 4: `openapi.json` ve `api-types.ts`'i yeniden üret** — `:8060`'ta kullanıcının kendi JVM'i çalışıyor olabilir, **hiçbir süreci öldürme**; başka portta kaldır:

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

Doğrulama: `grep -c "AppleLoginRequest\|ConsentsDto\|BlockDto\|ReportRequest\|authProviders" frontend/shared/src/api-types.ts` ≥ 5. `mvn spring-boot:run` `-o` ile açılmazsa (plugin yerelde yok) `-o`'suz tek sefer koş.

- [ ] **Step 5: Web'in hâlâ derlendiğini doğrula**

```bash
cd /Users/mehmetserefoglu/projects/bumpinto && source ./init-nvm.sh && pnpm --filter @bumpinto/web exec tsc -b
```

Expected: hata yok — `ParticipantDto.blocked` ve `MeResponse` ekleri mevcut kodu bozmaz (yeni alanlar okunmuyor). Hata çıkarsa yalnız raporla; düzeltmesi W-14'ün işidir.

- [ ] **Step 6: Değişen dosyaları listele** — `ARCHITECTURE.md`, `docs/CONFIGURATION.md`, `INDEX.md`, `openapi.json`, `api-types.ts`. Mesaj: `docs(store-compliance): events table, apple config keys, regenerated API types`.

---

## Plan öz-incelemesi

**Spec kapsamı (§2 + R-B1–R-B5).** R-B1: `POST /api/auth/apple {identityToken, nonce, fullName?}` T6 · JWKS + çoklu audience + nonce T4 · `apple_sub` birincil / e-posta ikincil T3 · `authProviders[]` T2/T3/T7 · refresh token saklama T5/T6 · V13 T1. R-B2: `DELETE /api/me` T9 · `deleted_at` anında + `purge_after` 30 gün (B-3) T8 · host oturumları silinir + katılımlar anonimleşir T8 · Apple revoke fail-open T5/T8 · çerezler temizlenir T9 · V14 T1. R-B3: `deleteConfirmToken` + `POST /api/me/delete-token` T9 · `X-Client: web` çerez akışı T6/T9 · onaysız `DELETE` 400 T9. R-B4: `POST /api/reports` T10 · `GET/POST /api/me/blocks` + `DELETE /api/me/blocks/{id}` T10 · `ParticipantDto.blocked` T11 · engelli çift aynı ses odasına alınmaz T11 · WS `blocked{}` T2/T10/T11 · V15 T1. R-B5: `MeResponse.consents{location,microphone,analytics,updatedAt,version}` + `PUT /api/me/consents` T7 · varsayılan hepsi false T1/T7 · V16 T1. OpenAPI + `api-types.ts` + INDEX T12. **Boşluk yok.** Kapsam dışı (bilinçli, §4): R-B6 export, R-B7 tagline, R-B8 presence 2.0, R-B9 join code, R-B10 OG, R-B11 push → B-15/B-16.

**Yer tutucu taraması:** "TBD/TODO/uygun hata yönetimi ekle/Task N'e benzer" yok; her adımda gerçek test ya da gerçek kod var. Prozaya bırakılan tek yer T3'ün `ReportEntity`/`BlockEntity` gövdeleridir — alan listeleri V15 kolonlarıyla birebir sayılmıştır ve desen `UserEntity`'dir; tanımsız tip ya da imza kalmadı.

**Tip tutarlılığı:** `UserStorePort.upsertByAppleSub(String,String,String)` T2 = T3 (adapter + FakeStores) = T6 · `softDelete(UUID,Instant,Instant)` T2 = T3 = T8 · `appleRefreshToken(UUID)→Optional<String>` T2 = T3 = T8 · `AppleTokensPort.exchangeRefreshToken(String)→Optional<String>` / `revoke(String)` T2 = T5 = T6 `FakeAppleTokens` = T8 · `AppleIdVerifier.AppleUser(String,String,boolean)` T4 = T6 · `AppleIdVerifier.validator(List<String>)` T4 iç tutarlı · `AppProps.Apple(servicesId,bundleId,teamId,keyId,privateKey)` T2 = T4 = T5 = `TestProps` · `Consents(boolean,boolean,boolean,Instant,int)` T2 = T3 = T7 ≡ `ApiDtos.ConsentsDto` · `UserProfile.withConsents(Consents)` T2 = T7 · `Block.ofUser/ofParticipant` T2 = T3 = T10 = T11 · `BlockStorePort` altı metodu T2 = T3 = T10 · `Blocks.add(UUID,UUID,UUID,String)` T10 = `BlockController` T10 · `Blocks.hiddenParticipantIds(UUID,UUID,List<Participant>)` T10 = `SessionViewAssembler` T11 · `Blocks.blockedPairIds(UUID,UUID,List<Participant>)` T10 = `VoiceAdmission.blockedWith` T11 · `SessionStorePort` dört yeni metodu T2 = T3 = T8 · `TokenService.issueDeleteToken/isDeleteTokenFor` T9 iç tutarlı · `SessionEvent.blocked()` T2 = T10 = T11. `MeResponse` 10 bileşen (T7) ile `MeController.toResponse` argüman sırası aynı.

**Ön koşul kapısı:** B-3 yürütülmeden bu plan başlamaz (V12 çakışması + `purge_after` sahipsiz kalır); doğrulama komutu başlıkta.
