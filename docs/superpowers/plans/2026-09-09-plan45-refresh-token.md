# Yenileme Jetonu (B-16 + W-16 + M-10) Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Erişim jetonunu 15 dakikaya indirip yanına iptal edilebilir, tek kullanımlık rotasyonlu bir yenileme jetonu koymak; web ve mobilin 401 aldığında sessizce yenileyip özgün isteği tekrar oynaması ve K-M38'in kökünü (bayat hesap jetonunun misafir isteğini 401 yapması) sunucu tarafında kapatmak.

**Architecture:** Yenileme jetonu **opak 32 baytlık rastgele değer**tir, JWT değil — imzalı-durumsuz bir jeton süresi dolana dek geri alınamaz, oysa hırsızlık sinyalinde aileyi kapatabilmek zorundayız. DB'de yalnız SHA-256 özeti durur (V6'nın katılımcı jetonu dersi). Her yenileme **tek kullanımlıktır**: eski satır iptal edilir, yenisi aynı `family_id` ile basılır; iptalli bir jeton tekrar sunulursa ailenin tamamı kapanır. İstemci tarafında 401 kesicisi **`frontend/shared/src/http.ts` içine** yazılır — web ve mobil aynı gövdeyi kullanır, platformlar yalnız `refresh()` ve `onSignedOut()` sağlar. Mobil ayrıca `exp` yaklaşırken (<60 sn) aynı tek-uçuşlu kapıdan önden yeniler.

**Tech Stack:** Spring Boot 4 / Spring Security (resource server), Flyway (V19), JPA + Spring Data, JUnit 5 + MockMvc + Testcontainers · axios (shared), vitest (web+shared), Zustand · Expo SDK 57 / RN 0.86, jest-expo, `expo-secure-store`.

---

## Kararlar (uygulamadan ÖNCE oku — üçü spec'ten bilinçli sapma)

### K1. Bearer başarısızsa katılımcı jetonuna düşülür — ama YALNIZ istek geçerli bir katılımcı jetonu taşıyorsa

**Karar: EVET, dar kapsamda.** `SecurityConfig.bearerTokenResolver` bugün zaten "public uçta bayat jetonu yok say" diyor. Aynı gerekçe oturum uçları için de geçerli: geçersiz bir bearer **hiçbir şey açmıyordu**, yani onu düşürmek yetki genişlemesi değil; engellenen tek şey, ölü bir hesap jetonunun **yanında duran geçerli kimliği de öldürmesi**. Kök mekanizma doğrulandı: `BearerTokenAuthenticationFilter` zinciri keser ve `ParticipantTokenFilter` (ondan SONRA kurulu) hiç çalışamaz.

**Neden "yalnız geçerli katılımcı jetonu varsa":** koşulsuz düşürmek daha kötü olurdu — `/api/me` gibi hesap uçları o zaman 401 yerine 403/boş dönerdi ve **istemci jetonunun öldüğünü asla öğrenemez, hiç yenilemezdi**. 401 kesicisinin çalışabilmesi için hesap uçlarının 401 dönmeye DEVAM etmesi şart. Bu yüzden düşürme yalnız iki durumda olur: (a) public uç (bugünkü davranış), (b) istekte o slug'a ait **geçerli** katılımcı jetonu var.

**Bedel:** o dar yolda katılımcı jetonu iki kez çözülür (resolver + filtre) = istek başına bir fazla HMAC doğrulaması. Yalnız *geçersiz bearer* yolunda, yani nadir.

### K2. Yenileme çerezinin yolu `/api/auth/refresh` DEĞİL, `/api/auth`

**Sapma, bilinçli.** Görev tanımı `path=/api/auth/refresh` diyor; bu tarayıcıda **çıkışı kırar**: RFC 6265 gereği çerez yalnız Path'inin ALTINDAKİ isteklere gönderilir, yani `POST /api/auth/logout` yenileme çerezini hiç taşımaz — sunucu ne okuyabilir ne silebilir, çıkış yapan kullanıcının yenileme jetonu hem tarayıcıda hem DB'de canlı kalır. `AuthCookies` bu hatayı katılımcı çerezinde bir kez yaşadı (kendi javadoc'unda yazılı: `clearParticipants` gerçek tarayıcıda no-op'tu). `/api/auth` yalnız dört ucu kapsar (google/apple/logout/refresh) — dar kalma amacı korunur, çıkış çalışır.

### K3. Şemaya `family_id` eklenir (görev listesindeki sütunlara ek)

**Sapma, bilinçli.** Yalnız `rotated_from` ile "ailenin tamamını iptal et" özyinelemeli CTE ister; `family_id` ile tek indeksli `UPDATE`. `rotated_from` denetim izi olarak KALIR (hangi jetonun yerine geçti). Ayrıca INDEX'in B-16 satırının istediği "cihaz ipucu" `client` sütunu olarak gelir (`web`|`mobile`).

### K4. Geçiş: mevcut oturumlar iptal EDİLMEZ, ama doğal süreleri dolunca bir kez yeniden giriş ister

`token-ttl` 12h → 15m yalnız **yeni** basılan jetonları etkiler; dolaşımdaki 12 saatlik jetonlar imzalı ve durumsuz olduğu için süreleri dolana dek geçerli kalır — **kimse anında çıkışa atılmaz**. Ama o kullanıcıların yenileme jetonu YOK; jetonları dolduğunda yenileme başarısız olur ve bir kez yeniden giriş yaparlar.

**Bunu kapatmanın yolu bilinçli olarak seçilmedi:** "geçerli erişim jetonu göster, yenileme jetonu al" biçiminde bir önyükleme ucu, çalınan HER erişim jetonunu kalıcı yenileme jetonuna çevirirdi — 15 dakikalık hırsızlık penceresini süresizleştirmek, bir kerelik yeniden girişten çok daha pahalıdır. Kullanıcı aksini isterse süreyle sınırlı (`legacy-bootstrap-until`) bir uç ayrıca açılabilir.

### K5. Yeni i18n anahtarı YOK

Sessiz yenileme kullanıcıya metin göstermez; başarısızlıkta zaten var olan giriş ekranına düşülür. `pnpm i18n:check` sayıları değişmemeli — değişirse bir yerde gereksiz metin eklenmiş demektir.

---

## Dosya yapısı

**Backend — yeni**
- `backend/src/main/resources/db/migration/V19__refresh_tokens.sql` — tablo + indeksler
- `backend/src/main/java/com/bumpinto/domain/user/RefreshTokenRecord.java` — saf kayıt (framework yok)
- `backend/src/main/java/com/bumpinto/domain/port/RefreshTokenStorePort.java` — depo sözleşmesi
- `backend/src/main/java/com/bumpinto/adapter/out/persistence/RefreshTokenEntity.java`
- `backend/src/main/java/com/bumpinto/adapter/out/persistence/RefreshTokenRepository.java`
- `backend/src/main/java/com/bumpinto/adapter/out/persistence/RefreshTokenStoreAdapter.java`
- `backend/src/main/java/com/bumpinto/application/user/RefreshTokens.java` — basma/rotasyon/yeniden kullanım tespiti (TEK karar yeri)
- `backend/src/main/java/com/bumpinto/application/error/UnauthorizedException.java`
- `backend/src/main/java/com/bumpinto/infra/security/ParticipantTokens.java` — katılımcı jetonu çözümü; filtre VE resolver aynı gövdeyi kullanır
- testler: `RefreshTokensTest`, `RefreshTokenStoreAdapterTest`

**Backend — değişen**
- `application.yml` (`token-ttl: 15m`, `refresh-ttl: 30d`) · `AppProps.Security` (+`refreshTtl`)
- `AuthCookies` (+`refresh`/`clearRefresh`) · `AuthController` (+`/refresh`, `LoginResponse.refreshToken`, logout iptali)
- `SecurityConfig` (+public uç, bayat bearer düşürme) · `ParticipantTokenFilter` (gövdesi `ParticipantTokens`e taşınır)
- `AccountDeletion` (+aile iptali) · `ApiExceptionHandler` (+401) · `support/TestProps`

**Frontend — yeni**
- `frontend/shared/src/http.test.ts` — kesicinin beş kuralı

**Frontend — değişen**
- `frontend/shared/src/http.ts` (kesici + `createRefreshGate`) · `frontend/shared/src/index.ts` · `frontend/shared/src/api.ts` (`logout(refreshToken?)`) · `frontend/shared/src/api-types.ts` (**codegen**, elle DEĞİL)
- `frontend/web/src/lib/api.ts` · `frontend/web/src/main.tsx` · `frontend/web/src/store/authStore.ts`
- `frontend/mobile/src/lib/tokenStore.ts` · `frontend/mobile/src/lib/api.ts` · `frontend/mobile/src/store/authStore.ts` · `frontend/mobile/app/_layout.tsx`

---

### Task 1: V19 — `refresh_tokens` tablosu ve depo

**Files:**
- Create: `backend/src/main/resources/db/migration/V19__refresh_tokens.sql`
- Create: `backend/src/main/java/com/bumpinto/domain/user/RefreshTokenRecord.java`
- Create: `backend/src/main/java/com/bumpinto/domain/port/RefreshTokenStorePort.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/persistence/RefreshTokenEntity.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/persistence/RefreshTokenRepository.java`
- Create: `backend/src/main/java/com/bumpinto/adapter/out/persistence/RefreshTokenStoreAdapter.java`
- Test: `backend/src/test/java/com/bumpinto/SchemaMigrationTest.java` (ekleme)

- [ ] **Step 1: Şema testini YAZ (önce düşsün)**

`SchemaMigrationTest.java` içine, sınıfın sonuna ekle:

```java
    /**
     * V19: yenileme jetonu OPAK ve iptal edilebilir. Kolon `token_hash` — jetonun kendisi
     * DEGIL: bir DB dokumu tum canli oturumlar demek olurdu (V6'da ayni ders alinmisti).
     */
    @Test
    void v19CreatesRefreshTokensWithHashedOpaqueTokens() {
        assertThat(columnsOf("refresh_tokens"))
                .contains("id", "user_id", "token_hash", "family_id", "rotated_from", "client",
                        "issued_at", "expires_at", "revoked_at")
                .doesNotContain("token");
    }

    /** Ayni ozet iki kez yazilamaz: rotasyonun TEK KULLANIMLIK olmasi buna dayanir. */
    @Test
    void v19MakesTokenHashUnique() {
        assertThat(jdbc.queryForList(
                "select indexdef from pg_indexes where tablename = 'refresh_tokens'",
                String.class))
                .anyMatch(def -> def.contains("UNIQUE") && def.contains("token_hash"));
    }
```

- [ ] **Step 2: Testi koş, DÜŞTÜĞÜNÜ gör**

Run: `cd backend && mvn -q test -Dtest=SchemaMigrationTest`
Expected: FAIL — `v19CreatesRefreshTokensWithHashedOpaqueTokens` boş kolon listesi döner.

- [ ] **Step 3: Migration'ı yaz**

`backend/src/main/resources/db/migration/V19__refresh_tokens.sql`:

```sql
-- B-16: yenileme jetonu. Deger OPAK ve rastgeledir, JWT DEGIL (bilincli): imzali-durumsuz bir
-- jeton suresi dolana dek geri alinamaz, oysa hirsizlik sinyalinde aileyi KAPATABILMEK zorundayiz.
create table refresh_tokens (
    id           uuid        primary key,
    user_id      uuid        not null references users (id) on delete cascade,
    -- Jetonun KENDISI degil SHA-256 ozeti: DB dokumu ele gecse bile jetonlar kullanilamaz.
    -- V6'da katilimci jetonu icin ayni ders alinmisti (duz metin bearer sirri kolonu dusuruldu).
    token_hash   text        not null,
    -- Aile = TEK bir girisin rotasyon zinciri. Yeniden kullanim tespitinde aile tek indeksli
    -- UPDATE ile kapanir; `rotated_from` uzerinden ozyinelemeli CTE yazmaya gerek kalmaz.
    family_id    uuid        not null,
    -- Denetim izi: bu jeton hangi jetonun yerine gecti. Aile iptali icin KULLANILMAZ.
    rotated_from uuid        references refresh_tokens (id),
    -- Cihaz ipucu: 'web' | 'mobile'. Guvenlik gunlugu ve teshis icin; yetki karari vermez.
    client       text,
    issued_at    timestamptz not null,
    expires_at   timestamptz not null,
    revoked_at   timestamptz
);

-- Rotasyonun TEK KULLANIMLIK olmasi buna dayanir: ayni ozet ikinci kez yazilamaz.
create unique index refresh_tokens_token_hash_key on refresh_tokens (token_hash);
-- Cikis ve hesap silme kullaniciyi toplu iptal eder.
create index idx_refresh_tokens_user on refresh_tokens (user_id) where revoked_at is null;
-- Yeniden kullanim tespitinde ailenin tamami tek sorguda kapanir.
create index idx_refresh_tokens_family on refresh_tokens (family_id) where revoked_at is null;
```

- [ ] **Step 4: Testi koş, GEÇTİĞİNİ gör**

Run: `cd backend && mvn -q test -Dtest=SchemaMigrationTest`
Expected: PASS.

- [ ] **Step 5: Domain kaydını yaz**

`backend/src/main/java/com/bumpinto/domain/user/RefreshTokenRecord.java`:

```java
package com.bumpinto.domain.user;

import java.time.Instant;
import java.util.UUID;

/**
 * Yenileme jetonunun SAKLANAN hali. Jetonun kendisi burada YOKTUR — yalniz SHA-256 ozeti;
 * degeri yalnizca uretildigi an istemciye gider ve bir daha okunamaz.
 */
public record RefreshTokenRecord(UUID id, UUID userId, String tokenHash, UUID familyId,
                                 UUID rotatedFrom, String client, Instant issuedAt,
                                 Instant expiresAt, Instant revokedAt) {

    public boolean revoked() {
        return revokedAt != null;
    }

    /** Sinirda (expiresAt == now) DOLMUS sayilir: kenar durumda cömert davranmayiz. */
    public boolean expired(Instant now) {
        return !expiresAt.isAfter(now);
    }
}
```

- [ ] **Step 6: Portu yaz**

`backend/src/main/java/com/bumpinto/domain/port/RefreshTokenStorePort.java`:

```java
package com.bumpinto.domain.port;

import com.bumpinto.domain.user.RefreshTokenRecord;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenStorePort {

    void save(RefreshTokenRecord token);

    /** Arama HER ZAMAN ozet uzerinden: duz jeton hicbir sorguya girmez. */
    Optional<RefreshTokenRecord> findByHash(String tokenHash);

    void revoke(UUID id, Instant at);

    /** Hirsizlik tepkisi: ailenin IPTAL EDILMEMIS tum jetonlari kapanir. Iptal edilmis satirin
        damgasi KORUNUR — denetimde "ne zaman kapandi" bilgisi kaybolmaz. */
    int revokeFamily(UUID familyId, Instant at);

    /** Cikis ve hesap silme: kullanicinin TUM aileleri (tum cihazlar) kapanir. */
    int revokeAllOfUser(UUID userId, Instant at);
}
```

- [ ] **Step 7: Entity + repository + adapter'ı yaz**

`RefreshTokenEntity.java`:

```java
package com.bumpinto.adapter.out.persistence;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refresh_tokens")
class RefreshTokenEntity {
    @Id UUID id;
    UUID userId;
    String tokenHash;
    UUID familyId;
    UUID rotatedFrom;
    String client;
    Instant issuedAt;
    Instant expiresAt;
    Instant revokedAt;
}
```

`RefreshTokenRepository.java`:

```java
package com.bumpinto.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

interface RefreshTokenRepository extends JpaRepository<RefreshTokenEntity, UUID> {

    Optional<RefreshTokenEntity> findByTokenHash(String tokenHash);

    /** `revokedAt is null` sarti SART: aksi halde ilk iptal damgasi ikinci cagrida ezilirdi. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update RefreshTokenEntity t set t.revokedAt = :at "
            + "where t.familyId = :familyId and t.revokedAt is null")
    int revokeFamily(@Param("familyId") UUID familyId, @Param("at") Instant at);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update RefreshTokenEntity t set t.revokedAt = :at "
            + "where t.userId = :userId and t.revokedAt is null")
    int revokeAllOfUser(@Param("userId") UUID userId, @Param("at") Instant at);
}
```

`RefreshTokenStoreAdapter.java`:

```java
package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.port.RefreshTokenStorePort;
import com.bumpinto.domain.user.RefreshTokenRecord;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Component
public class RefreshTokenStoreAdapter implements RefreshTokenStorePort {

    private final RefreshTokenRepository tokens;

    public RefreshTokenStoreAdapter(RefreshTokenRepository tokens) {
        this.tokens = tokens;
    }

    @Override
    public void save(RefreshTokenRecord token) {
        RefreshTokenEntity e = new RefreshTokenEntity();
        e.id = token.id();
        e.userId = token.userId();
        e.tokenHash = token.tokenHash();
        e.familyId = token.familyId();
        e.rotatedFrom = token.rotatedFrom();
        e.client = token.client();
        e.issuedAt = token.issuedAt();
        e.expiresAt = token.expiresAt();
        e.revokedAt = token.revokedAt();
        tokens.save(e);
    }

    @Override
    public Optional<RefreshTokenRecord> findByHash(String tokenHash) {
        return tokens.findByTokenHash(tokenHash).map(RefreshTokenStoreAdapter::toRecord);
    }

    @Override
    @Transactional
    public void revoke(UUID id, Instant at) {
        tokens.findById(id).ifPresent(e -> {
            if (e.revokedAt == null) {
                e.revokedAt = at;
                tokens.save(e);
            }
        });
    }

    @Override
    @Transactional
    public int revokeFamily(UUID familyId, Instant at) {
        return tokens.revokeFamily(familyId, at);
    }

    @Override
    @Transactional
    public int revokeAllOfUser(UUID userId, Instant at) {
        return tokens.revokeAllOfUser(userId, at);
    }

    private static RefreshTokenRecord toRecord(RefreshTokenEntity e) {
        return new RefreshTokenRecord(e.id, e.userId, e.tokenHash, e.familyId, e.rotatedFrom,
                e.client, e.issuedAt, e.expiresAt, e.revokedAt);
    }
}
```

- [ ] **Step 8: Derleme + mimari kapısı**

Run: `cd backend && mvn -q test -Dtest='SchemaMigrationTest+HexagonalArchitectureTest'`
Expected: PASS — `domainIsPure` yeni kaydı ve portu kabul eder (yalnız `java..` bağımlılığı var).

- [ ] **Step 9: Dosya listesini raporla (commit KULLANICIDA — git yazma YOK)**

Değişen/eklenen: `V19__refresh_tokens.sql`, `RefreshTokenRecord.java`, `RefreshTokenStorePort.java`, `RefreshTokenEntity.java`, `RefreshTokenRepository.java`, `RefreshTokenStoreAdapter.java`, `SchemaMigrationTest.java`.

---

### Task 2: `RefreshTokens` — basma, tek kullanımlık rotasyon, yeniden kullanım tespiti

**Files:**
- Create: `backend/src/main/java/com/bumpinto/application/user/RefreshTokens.java`
- Modify: `backend/src/main/java/com/bumpinto/infra/config/AppProps.java` (Security kaydına `refreshTtl`)
- Modify: `backend/src/main/resources/application.yml`
- Modify: `backend/src/test/java/com/bumpinto/support/TestProps.java`
- Test: `backend/src/test/java/com/bumpinto/application/user/RefreshTokensTest.java`

- [ ] **Step 1: `AppProps.Security`'ye `refreshTtl` ekle**

`AppProps.java` içinde `Security` kaydını değiştir:

```java
    public record Security(String googleClientId, String tokenSecret, Duration tokenTtl,
                           Duration refreshTtl) {

        /** googleClientId sir degil (istemcilerde acikca tasinir), teshis icin okunur kalir. */
        @Override
        public String toString() {
            return "Security[googleClientId=" + googleClientId + ", tokenSecret=" + MASK
                    + ", tokenTtl=" + tokenTtl + ", refreshTtl=" + refreshTtl + "]";
        }
    }
```

`application.yml` içinde `bumpinto.security` bloğunu değiştir:

```yaml
  security:
    # Default YOK (bilincli): preprod/prod'da bu degerler yoksa acilis patlar.
    # Local default'lari application-local.yml'de.
    google-client-id: ${GOOGLE_CLIENT_ID}
    token-secret: ${TOKEN_SECRET}
    # 12h -> 15m (B-16): erisim jetonu artik KISA omurlu, yaninda yenileme jetonu var.
    # Calinan bir erisim jetonunun penceresi 12 saatten 15 dakikaya iner.
    token-ttl: 15m
    # Yenileme jetonu kayan pencere: her rotasyon sureyi bastan baslatir.
    refresh-ttl: 30d
```

`TestProps.java` içinde:

```java
    public static AppProps.Security security() {
        return new AppProps.Security("cid", "0123456789abcdef0123456789abcdef",
                Duration.ofMinutes(15), Duration.ofDays(30));
    }
```

- [ ] **Step 2: Rotasyon testlerini YAZ (önce düşsün)**

`backend/src/test/java/com/bumpinto/application/user/RefreshTokensTest.java`:

```java
package com.bumpinto.application.user;

import com.bumpinto.domain.port.RefreshTokenStorePort;
import com.bumpinto.domain.user.RefreshTokenRecord;
import com.bumpinto.support.TestProps;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Rotasyonun tum kararlari BURADA sinanir: web katmani yalniz "kim" ve "hangi cerez" bilir.
 */
class RefreshTokensTest {

    /** Bellek ici depo: gercek adapter Task 1'de, burada sinanan KARAR. */
    static final class FakeStore implements RefreshTokenStorePort {
        final List<RefreshTokenRecord> rows = new ArrayList<>();

        @Override public void save(RefreshTokenRecord token) {
            rows.add(token);
        }

        @Override public Optional<RefreshTokenRecord> findByHash(String tokenHash) {
            return rows.stream().filter(r -> r.tokenHash().equals(tokenHash)).findFirst();
        }

        @Override public void revoke(UUID id, Instant at) {
            replace(r -> r.id().equals(id), at);
        }

        @Override public int revokeFamily(UUID familyId, Instant at) {
            return replace(r -> r.familyId().equals(familyId), at);
        }

        @Override public int revokeAllOfUser(UUID userId, Instant at) {
            return replace(r -> r.userId().equals(userId), at);
        }

        private int replace(java.util.function.Predicate<RefreshTokenRecord> match, Instant at) {
            int touched = 0;
            for (int i = 0; i < rows.size(); i++) {
                RefreshTokenRecord r = rows.get(i);
                if (match.test(r) && !r.revoked()) {
                    rows.set(i, new RefreshTokenRecord(r.id(), r.userId(), r.tokenHash(),
                            r.familyId(), r.rotatedFrom(), r.client(), r.issuedAt(),
                            r.expiresAt(), at));
                    touched++;
                }
            }
            return touched;
        }

        long liveCount() {
            return rows.stream().filter(r -> !r.revoked()).count();
        }
    }

    static final Instant NOW = Instant.parse("2026-09-09T12:00:00Z");
    final UUID user = UUID.randomUUID();
    FakeStore store;
    RefreshTokens refreshTokens;

    @BeforeEach
    void setUp() {
        store = new FakeStore();
        refreshTokens = new RefreshTokens(store, TestProps.defaults(),
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    /** Uretilen deger DB'de duz metin BULUNMAZ; yalniz ozeti durur. */
    @Test
    void storesOnlyTheHashNotTheToken() {
        String token = refreshTokens.issue(user, "mobile").token();

        assertThat(store.rows).hasSize(1);
        assertThat(store.rows.get(0).tokenHash()).isNotEqualTo(token);
        assertThat(store.findByHash(token)).isEmpty();
    }

    /** Iki basim asla ayni degeri uretmez (32 bayt entropi). */
    @Test
    void issuesDistinctOpaqueTokens() {
        assertThat(refreshTokens.issue(user, "web").token())
                .isNotEqualTo(refreshTokens.issue(user, "web").token());
    }

    /** TEK KULLANIMLIK: rotasyon eskiyi iptal eder, yenisi AYNI aileye yazilir. */
    @Test
    void rotationRevokesTheOldTokenAndKeepsTheFamily() {
        String first = refreshTokens.issue(user, "mobile").token();

        RefreshTokens.Rotation rotated = refreshTokens.rotate(first, "mobile").orElseThrow();

        assertThat(rotated.userId()).isEqualTo(user);
        assertThat(rotated.token()).isNotEqualTo(first);
        assertThat(store.rows.get(0).revoked()).isTrue();
        assertThat(store.rows.get(1).familyId()).isEqualTo(store.rows.get(0).familyId());
        assertThat(store.rows.get(1).rotatedFrom()).isEqualTo(store.rows.get(0).id());
    }

    /** Ayni jetonun IKINCI kullanimi hirsizlik sinyalidir: AILENIN TAMAMI kapanir. */
    @Test
    void reuseOfARotatedTokenRevokesTheWholeFamily() {
        String first = refreshTokens.issue(user, "mobile").token();
        refreshTokens.rotate(first, "mobile").orElseThrow();

        assertThat(refreshTokens.rotate(first, "mobile")).isEmpty();
        assertThat(store.liveCount()).isZero();
    }

    /** Baska bir cihazin ailesi ayakta kalir: hirsizlik tepkisi HEDEFLIDIR. */
    @Test
    void reuseDoesNotTouchAnotherFamilyOfTheSameUser() {
        String phone = refreshTokens.issue(user, "mobile").token();
        String laptop = refreshTokens.issue(user, "web").token();
        refreshTokens.rotate(phone, "mobile").orElseThrow();

        refreshTokens.rotate(phone, "mobile");

        assertThat(refreshTokens.rotate(laptop, "web")).isPresent();
    }

    /** Suresi dolmus jeton reddedilir ama aile KAPATILMAZ: yaslanma hirsizlik degildir. */
    @Test
    void expiredTokenIsRejectedWithoutRevokingTheFamily() {
        RefreshTokens aged = new RefreshTokens(store, TestProps.defaults(),
                Clock.fixed(NOW.minus(Duration.ofDays(31)), ZoneOffset.UTC));
        String old = aged.issue(user, "web").token();

        assertThat(refreshTokens.rotate(old, "web")).isEmpty();
        assertThat(store.rows.get(0).revoked()).isFalse();
    }

    /** Bilinmeyen ve bos jeton sessizce reddedilir (DB'de arama disinda yan etki yok). */
    @Test
    void unknownOrBlankTokenIsRejected() {
        assertThat(refreshTokens.rotate("bilinmeyen", "web")).isEmpty();
        assertThat(refreshTokens.rotate(null, "web")).isEmpty();
        assertThat(refreshTokens.rotate("  ", "web")).isEmpty();
    }

    /** Cikis: sunulan jetonun AILESI kapanir, kullanicinin oteki cihazi etkilenmez. */
    @Test
    void revokeFamilyOfClosesOnlyThatFamily() {
        String phone = refreshTokens.issue(user, "mobile").token();
        String laptop = refreshTokens.issue(user, "web").token();

        refreshTokens.revokeFamilyOf(phone);

        assertThat(refreshTokens.rotate(phone, "mobile")).isEmpty();
        assertThat(refreshTokens.rotate(laptop, "web")).isPresent();
    }

    /** Hesap silme: TUM cihazlar kapanir. */
    @Test
    void revokeAllOfClosesEveryFamily() {
        String phone = refreshTokens.issue(user, "mobile").token();
        String laptop = refreshTokens.issue(user, "web").token();

        refreshTokens.revokeAllOf(user);

        assertThat(refreshTokens.rotate(phone, "mobile")).isEmpty();
        assertThat(refreshTokens.rotate(laptop, "web")).isEmpty();
    }
}
```

- [ ] **Step 3: Testi koş, DÜŞTÜĞÜNÜ gör**

Run: `cd backend && mvn -q test -Dtest=RefreshTokensTest`
Expected: FAIL — `RefreshTokens` sınıfı yok (derleme hatası).

- [ ] **Step 4: `RefreshTokens`'ı yaz**

`backend/src/main/java/com/bumpinto/application/user/RefreshTokens.java`:

```java
package com.bumpinto.application.user;

import com.bumpinto.domain.port.RefreshTokenStorePort;
import com.bumpinto.domain.user.RefreshTokenRecord;
import com.bumpinto.infra.config.AppProps;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

/**
 * Yenileme jetonunun TEK karar yeri: basma, tek kullanimlik rotasyon, yeniden kullanim tespiti
 * ve iptal. Web katmani yalniz "jeton nereden geldi" (cerez mi govde mi) sorusunu bilir.
 *
 * <p><b>Neden JWT degil:</b> yenileme jetonu IPTAL EDILEBILIR olmali. Imzali-durumsuz bir jeton
 * suresi dolana dek geri alinamaz; hirsizlik sinyalinde ya da cikista onu kapatmanin yolu yok.
 * Bu yuzden deger opak rastgeledir ve gecerliligi VERITABANINDAN gelir.
 *
 * <p><b>Neden ozet:</b> jetonun kendisi saklansaydi bir DB dokumu tum canli oturumlar demekti
 * (V6'da katilimci jetonu icin ayni ders alinmisti).
 */
@Service
public class RefreshTokens {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokens.class);

    /** 256 bit entropi: tahmin edilemez olmasi jetonun TEK savunmasi (imza yok). */
    private static final int TOKEN_BYTES = 32;

    private final RefreshTokenStorePort store;
    private final AppProps props;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public RefreshTokens(RefreshTokenStorePort store, AppProps props, Clock clock) {
        this.store = store;
        this.props = props;
        this.clock = clock;
    }

    /** Istemciye giden tek sefer okunabilir deger + son kullanma. */
    public record Issued(String token, Instant expiresAt) {

        @Override
        public String toString() {
            return "Issued[token=***, expiresAt=" + expiresAt + "]";
        }
    }

    /** Rotasyon sonucu: yeni jeton + jetonun sahibi (erisim jetonu onun icin basilir). */
    public record Rotation(UUID userId, String token, Instant expiresAt) {

        @Override
        public String toString() {
            return "Rotation[userId=" + userId + ", token=***, expiresAt=" + expiresAt + "]";
        }
    }

    /** Giris ani: YENI aile acilir. Her cihaz kendi ailesini tasir. */
    public Issued issue(UUID userId, String client) {
        return mint(userId, UUID.randomUUID(), null, client);
    }

    /**
     * TEK KULLANIMLIK rotasyon. Sunulan jeton:
     * <ul>
     *   <li>bulunamazsa → reddedilir (yan etki yok),</li>
     *   <li>IPTALLIYSE → yeniden kullanim: bu jeton ya rotasyonla tuketilmis ya cikista
     *       kapatilmisti; tekrar gelmesi kopyalandigi anlamina gelir → AILENIN TAMAMI iptal,</li>
     *   <li>suresi dolmussa → reddedilir, aile KAPATILMAZ (yaslanma hirsizlik degildir).</li>
     * </ul>
     */
    public Optional<Rotation> rotate(String presented, String client) {
        if (presented == null || presented.isBlank()) {
            return Optional.empty();
        }
        Instant now = clock.instant();
        Optional<RefreshTokenRecord> found = store.findByHash(hash(presented));
        if (found.isEmpty()) {
            return Optional.empty();
        }
        RefreshTokenRecord current = found.get();
        if (current.revoked()) {
            // Gercek kullanici yeniden giris yapar; alternatif, hirsizin zinciri sonsuza dek
            // dondurmesine izin vermekti.
            log.warn("refresh token reuse detected: user={} family={}",
                    current.userId(), current.familyId());
            store.revokeFamily(current.familyId(), now);
            return Optional.empty();
        }
        if (current.expired(now)) {
            return Optional.empty();
        }
        store.revoke(current.id(), now);
        Issued next = mint(current.userId(), current.familyId(), current.id(), client);
        return Optional.of(new Rotation(current.userId(), next.token(), next.expiresAt()));
    }

    /** Cikis: sunulan jetonun ailesi kapanir. Jeton taninmazsa sessizce gecilir. */
    public void revokeFamilyOf(String presented) {
        if (presented == null || presented.isBlank()) {
            return;
        }
        store.findByHash(hash(presented))
                .ifPresent(token -> store.revokeFamily(token.familyId(), clock.instant()));
    }

    /** Hesap silme: kullanicinin TUM cihazlari kapanir. */
    public void revokeAllOf(UUID userId) {
        store.revokeAllOfUser(userId, clock.instant());
    }

    private Issued mint(UUID userId, UUID familyId, UUID rotatedFrom, String client) {
        byte[] raw = new byte[TOKEN_BYTES];
        random.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        Instant now = clock.instant();
        Instant expiresAt = now.plus(props.security().refreshTtl());
        store.save(new RefreshTokenRecord(UUID.randomUUID(), userId, hash(token), familyId,
                rotatedFrom, client, now, expiresAt, null));
        return new Issued(token, expiresAt);
    }

    /**
     * SHA-256, tuzsuz ve tek turlu — bilincli. Bu bir PAROLA degil, 256 bit rastgele deger:
     * sozluk/kaba kuvvet saldirisi anlamsiz, buna karsilik arama HER istekte olur ve
     * indekslenebilir sabit uzunluk gerekir (bcrypt/argon2 burada yanlis arac olurdu).
     */
    static String hash(String token) {
        try {
            MessageDigest sha = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(sha.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 missing", impossible);
        }
    }
}
```

- [ ] **Step 5: Testi koş, GEÇTİĞİNİ gör**

Run: `cd backend && mvn -q test -Dtest=RefreshTokensTest`
Expected: PASS — 9 test.

- [ ] **Step 6: TTL değişiminin kırdığı yerleri onar**

Run: `cd backend && mvn -q test`
Expected: `AppProps.Security` imzası değiştiği için derlenmeyen test/kaynak varsa düzelt (yalnız `TestProps.security()` bekleniyor). Bir test 12 saatlik TTL'e bağlıysa (`tokenTtl` sabitini okuyan) beklentiyi `TestProps`ten türet, sayı GÖMME.

- [ ] **Step 7: Dosya listesini raporla**

Değişen/eklenen: `RefreshTokens.java`, `RefreshTokensTest.java`, `AppProps.java`, `application.yml`, `TestProps.java`.
---

### Task 3: `POST /api/auth/refresh` + yenileme çerezi + çıkışta iptal

**Files:**
- Create: `backend/src/main/java/com/bumpinto/application/error/UnauthorizedException.java`
- Modify: `backend/src/main/java/com/bumpinto/infra/security/AuthCookies.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/AuthController.java`
- Modify: `backend/src/main/java/com/bumpinto/adapter/in/web/ApiExceptionHandler.java`
- Modify: `backend/src/main/java/com/bumpinto/infra/security/SecurityConfig.java` (yalnız PUBLIC_ENDPOINTS)
- Test: `backend/src/test/java/com/bumpinto/adapter/in/web/AuthControllerTest.java`

- [ ] **Step 1: Uç testlerini YAZ (önce düşsün)**

`AuthControllerTest.java`: önce `TestBeans`in yanına yeni bağımlılığı ekle — sınıf gövdesindeki alanlara:

```java
    @MockitoBean RefreshTokens refreshTokens;
```

(import: `com.bumpinto.application.user.RefreshTokens`.)

Sonra sınıfın sonuna şu testleri ekle:

```java
    static final Instant EXPIRES = Instant.parse("2026-10-09T17:00:00Z");

    /** Web: yenileme jetonu GOVDEDE gitmez, AYRI HttpOnly cerezde gider. */
    @Test
    void webLoginSetsARefreshCookieAndNoBodyToken() throws Exception {
        UUID userId = UUID.randomUUID();
        when(google.verify(any())).thenReturn(new GoogleIdVerifier.GoogleUser("m@x.dev", "Mehmet"));
        when(users.upsertByEmail(any(), any())).thenReturn(userId);
        when(refreshTokens.issue(eq(userId), eq("web")))
                .thenReturn(new RefreshTokens.Issued("rt-web", EXPIRES));

        mvc.perform(post("/api/auth/google").header("X-Client", "web")
                        .contentType("application/json").content(BODY))
                .andExpect(status().isOk())
                .andExpect(cookie().value(AuthCookies.REFRESH, "rt-web"))
                .andExpect(cookie().httpOnly(AuthCookies.REFRESH, true))
                .andExpect(jsonPath("$.refreshToken").doesNotExist());
    }

    /**
     * Cerezin yolu CIKISI KAPSAMALI: RFC 6265 geregi cerez yalniz Path'inin altindaki
     * isteklerde gonderilir. `/api/auth/refresh` yazilsaydi `/api/auth/logout` onu hic
     * tasimaz, sunucu ne okuyabilir ne silebilirdi (bkz. Karar K2).
     */
    @Test
    void refreshCookiePathCoversLogout() throws Exception {
        UUID userId = UUID.randomUUID();
        when(google.verify(any())).thenReturn(new GoogleIdVerifier.GoogleUser("m@x.dev", "Mehmet"));
        when(users.upsertByEmail(any(), any())).thenReturn(userId);
        when(refreshTokens.issue(any(), any()))
                .thenReturn(new RefreshTokens.Issued("rt-web", EXPIRES));

        mvc.perform(post("/api/auth/google").header("X-Client", "web")
                        .contentType("application/json").content(BODY))
                .andExpect(cookie().path(AuthCookies.REFRESH, "/api/auth"));
    }

    /** Mobil: cerez yok, jetonlar GOVDEDE. */
    @Test
    void mobileLoginReturnsBothTokensInTheBody() throws Exception {
        UUID userId = UUID.randomUUID();
        when(google.verify(any())).thenReturn(new GoogleIdVerifier.GoogleUser("m@x.dev", "Mehmet"));
        when(users.upsertByEmail(any(), any())).thenReturn(userId);
        when(refreshTokens.issue(eq(userId), eq("mobile")))
                .thenReturn(new RefreshTokens.Issued("rt-mobile", EXPIRES));

        mvc.perform(post("/api/auth/google").contentType("application/json").content(BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").value("rt-mobile"));
    }

    /** Mobil yenileme: govdedeki jeton donduruldu, YENISI govdede doner. */
    @Test
    void mobileRefreshRotatesAndReturnsNewTokens() throws Exception {
        UUID userId = UUID.randomUUID();
        when(refreshTokens.rotate(eq("rt-old"), eq("mobile")))
                .thenReturn(Optional.of(new RefreshTokens.Rotation(userId, "rt-new", EXPIRES)));
        when(users.profileOf(userId)).thenReturn(Optional.of(
                new UserProfile(userId, "m@x.dev", "Mehmet", null, null, null, "tr")));

        mvc.perform(post("/api/auth/refresh").contentType("application/json")
                        .content("{\"refreshToken\":\"rt-old\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").value("rt-new"));
    }

    /** Web yenileme: cerezden okunur, IKI cerez birden tazelenir, govde jeton tasimaz. */
    @Test
    void webRefreshReadsTheCookieAndRotatesBothCookies() throws Exception {
        UUID userId = UUID.randomUUID();
        when(refreshTokens.rotate(eq("rt-old"), eq("web")))
                .thenReturn(Optional.of(new RefreshTokens.Rotation(userId, "rt-new", EXPIRES)));
        when(users.profileOf(userId)).thenReturn(Optional.of(
                new UserProfile(userId, "m@x.dev", "Mehmet", null, null, null, "tr")));

        mvc.perform(post("/api/auth/refresh").header("X-Client", "web")
                        .cookie(new Cookie(AuthCookies.REFRESH, "rt-old")))
                .andExpect(status().isOk())
                .andExpect(cookie().exists(AuthCookies.ACCESS))
                .andExpect(cookie().value(AuthCookies.REFRESH, "rt-new"))
                .andExpect(jsonPath("$.accessToken").doesNotExist())
                .andExpect(jsonPath("$.refreshToken").doesNotExist());
    }

    /** Reddedilen yenileme 401: istemci kesicisi tam bu koda bakip cikisa duser. */
    @Test
    void rejectedRefreshIs401() throws Exception {
        when(refreshTokens.rotate(any(), any())).thenReturn(Optional.empty());

        mvc.perform(post("/api/auth/refresh").contentType("application/json")
                        .content("{\"refreshToken\":\"calinmis\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("invalid_refresh_token"));
    }

    /** Hic jeton sunulmadan yenileme: 401. Anonim tarayici sessizce oturum acamaz. */
    @Test
    void refreshWithoutATokenIs401() throws Exception {
        when(refreshTokens.rotate(any(), any())).thenReturn(Optional.empty());

        mvc.perform(post("/api/auth/refresh"))
                .andExpect(status().isUnauthorized());
    }

    /** Cikis: sunulan jetonun AILESI kapanir ve yenileme cerezi silinir. */
    @Test
    void logoutRevokesTheFamilyAndClearsTheRefreshCookie() throws Exception {
        mvc.perform(post("/api/auth/logout").cookie(new Cookie(AuthCookies.REFRESH, "rt-web")))
                .andExpect(status().isNoContent())
                .andExpect(cookie().maxAge(AuthCookies.REFRESH, 0));

        verify(refreshTokens).revokeFamilyOf("rt-web");
    }

    /** Mobil cikisi jetonu GOVDEDE gonderir (cerez yok) — iptal yine de olur. */
    @Test
    void mobileLogoutRevokesTheFamilyFromTheBody() throws Exception {
        mvc.perform(post("/api/auth/logout").contentType("application/json")
                        .content("{\"refreshToken\":\"rt-mobile\"}"))
                .andExpect(status().isNoContent());

        verify(refreshTokens).revokeFamilyOf("rt-mobile");
    }
```

Gereken ek import'lar: `com.bumpinto.domain.user.UserProfile`, `jakarta.servlet.http.Cookie`, `java.util.Optional`, `static org.mockito.Mockito.verify`.

- [ ] **Step 2: Testi koş, DÜŞTÜĞÜNÜ gör**

Run: `cd backend && mvn -q test -Dtest=AuthControllerTest`
Expected: FAIL — `RefreshTokens` bean'i, `AuthCookies.REFRESH` ve `/api/auth/refresh` yok (derleme + 404).

- [ ] **Step 3: `UnauthorizedException` + handler**

`backend/src/main/java/com/bumpinto/application/error/UnauthorizedException.java`:

```java
package com.bumpinto.application.error;

/**
 * Sunulan kimlik REDDEDILDI (401). {@code ForbiddenException}'dan farki: orada kimlik
 * gecerlidir ama yetki yoktur; burada kimligin kendisi kabul edilmez ve dogru istemci
 * davranisi "yenile ya da yeniden giris yap"tir.
 */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }
}
```

`ApiExceptionHandler.java` — `invalidIdToken`'ın hemen üstüne ekle (import: `com.bumpinto.application.error.UnauthorizedException`):

```java
    /** Reddedilen yenileme jetonu. Govde SEBEP tasimaz: "suresi doldu" ile "iptal edildi"
        ayrimi saldirgana ailenin durumunu soylerdi. */
    @ExceptionHandler(UnauthorizedException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    ApiError unauthorized(UnauthorizedException e) {
        return new ApiError(e.getMessage());
    }
```

- [ ] **Step 4: `AuthCookies`'e yenileme çerezini ekle**

`AuthCookies.java` — `ACCESS_PATH` satırının altına:

```java
    public static final String REFRESH = "bumpinto_rt";

    /**
     * DAR ama CIKISI KAPSAYAN yol. `/api/auth/refresh` ilk bakista daha dogru gorunur; ama
     * tarayici cerezi yalniz Path'inin ALTINDAKI isteklere gonderir (RFC 6265), yani
     * `/api/auth/logout` istegi yenileme cerezini HIC tasimaz — sunucu ne okuyabilir ne
     * silebilirdi ve cikan kullanicinin yenileme jetonu hem tarayicida hem DB'de canli kalirdi.
     * Bu dosya ayni hatayi katilimci cerezinde bir kez yasadi (bkz. {@link #participant}).
     */
    static final String REFRESH_PATH = "/api/auth";
```

ve sınıfa iki metot ekle (`clearAccess`'in altına):

```java
    /** Yenileme jetonu erisim cerezinden AYRI yasar: /api altindaki her istege takilmaz. */
    public ResponseCookie refresh(String token, Duration ttl) {
        return base(REFRESH, token, REFRESH_PATH, ttl);
    }

    public ResponseCookie clearRefresh() {
        return base(REFRESH, "", REFRESH_PATH, Duration.ZERO);
    }
```

- [ ] **Step 5: `AuthController`'ı yaz**

`AuthController.java`:

(a) `LoginResponse` kaydını değiştir ve `RefreshRequest`i ekle:

```java
    record LoginResponse(String accessToken, String refreshToken, Instant expiresAt, UUID userId) {

        @Override
        public String toString() {
            return "LoginResponse[accessToken=" + ApiDtos.masked(accessToken)
                    + ", refreshToken=" + ApiDtos.masked(refreshToken)
                    + ", expiresAt=" + expiresAt + ", userId=" + userId + "]";
        }
    }

    /** Mobil govdesi. Web'de bos gelir: jeton cerezden okunur. */
    record RefreshRequest(String refreshToken) {

        @Override
        public String toString() {
            return "RefreshRequest[refreshToken=" + ApiDtos.masked(refreshToken) + "]";
        }
    }
```

(b) Yapıcıya `RefreshTokens refreshTokens` ekle (alan + parametre + atama; import `com.bumpinto.application.user.RefreshTokens`, `com.bumpinto.domain.user.UserProfile`, `com.bumpinto.application.error.UnauthorizedException`, `java.util.Optional`).

(c) `respond`'u değiştir:

```java
    /** Iki giris ucunun ORTAK kuyrugu: token uretimi + web cerez davranisi birebir ayni. */
    private ResponseEntity<LoginResponse> respond(HttpServletRequest http, UUID userId,
                                                  String email, String client) {
        boolean web = "web".equalsIgnoreCase(client);
        String accessToken = tokens.issueAccessToken(userId, email);
        RefreshTokens.Issued refresh = refreshTokens.issue(userId, web ? "web" : "mobile");
        Instant expiresAt = clock.instant().plus(props.security().tokenTtl());

        if (web) {
            ResponseEntity.BodyBuilder response = ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE,
                            cookies.access(accessToken, props.security().tokenTtl()).toString())
                    .header(HttpHeaders.SET_COOKIE, cookies
                            .refresh(refresh.token(), props.security().refreshTtl()).toString());
            // Tarayicidaki hesap DEGISTIYSE onceki kimlige yazilmis katilimci cerezleri de gider.
            if (signedInAsSomeoneElse(http, userId)) {
                setCookies(response, cookies.clearParticipants(http));
            }
            return response.body(new LoginResponse(null, null, expiresAt, userId));
        }
        return ResponseEntity.ok(
                new LoginResponse(accessToken, refresh.token(), expiresAt, userId));
    }
```

(d) Yenileme ucunu ekle:

```java
    /**
     * PUBLIC uc: cagiranin erisim jetonu TANIM GEREGI olu, kimlik dogrulamasi yenileme
     * jetonunun KENDISIDIR (sunucu onu DB'deki ozetle eslestirir).
     *
     * <p>Rotasyon TEK KULLANIMLIK: donen jeton yeni, eski aninda iptal. Istemcinin iki
     * yenilemeyi paralel atmamasi bu yuzden onemli — ikincisi "yeniden kullanim" sayilip
     * AILEYI kapatir; tek-ucuslu kesici (W-16/M-10) tam olarak bunu garanti eder.
     */
    @PostMapping("/refresh")
    ResponseEntity<LoginResponse> refresh(HttpServletRequest http,
            @RequestBody(required = false) RefreshRequest body,
            @RequestHeader(value = "X-Client", defaultValue = "mobile") String client) {
        boolean web = "web".equalsIgnoreCase(client);
        String presented = web ? refreshCookie(http) : bodyToken(body);
        RefreshTokens.Rotation rotated = refreshTokens.rotate(presented, web ? "web" : "mobile")
                .orElseThrow(() -> new UnauthorizedException("invalid_refresh_token"));

        // Silinmis hesap yeniden jeton alamaz: profil kaybolduysa (soft delete kimlik alanlarini
        // birakir) rotasyon kabul EDILMEZ. AccountDeletion aileyi zaten iptal eder; bu ikinci kapi.
        UserProfile profile = users.profileOf(rotated.userId())
                .orElseThrow(() -> new UnauthorizedException("invalid_refresh_token"));

        String accessToken = tokens.issueAccessToken(profile.id(), profile.email());
        Instant expiresAt = clock.instant().plus(props.security().tokenTtl());

        if (web) {
            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE,
                            cookies.access(accessToken, props.security().tokenTtl()).toString())
                    .header(HttpHeaders.SET_COOKIE, cookies
                            .refresh(rotated.token(), props.security().refreshTtl()).toString())
                    .body(new LoginResponse(null, null, expiresAt, profile.id()));
        }
        return ResponseEntity.ok(
                new LoginResponse(accessToken, rotated.token(), expiresAt, profile.id()));
    }

    private static String bodyToken(RefreshRequest body) {
        return body == null ? null : body.refreshToken();
    }

    private static String refreshCookie(HttpServletRequest http) {
        return cookieValue(http, AuthCookies.REFRESH);
    }
```

(e) `logout`'u değiştir:

```java
    /** Kimlik gerekmez: suresi dolmus cerezle de cikis yapilabilmeli. */
    @PostMapping("/logout")
    ResponseEntity<Void> logout(HttpServletRequest http,
            @RequestBody(required = false) RefreshRequest body) {
        // Yenileme jetonu tarayicida CEREZDE, mobilde GOVDEDE gelir; hangisi geldiyse ailesi
        // kapanir. Iptal edilmezse "cikis yaptim" diyen kullanicinin jetonu 30 gun daha
        // erisim jetonu bastirabilirdi.
        String presented = bodyToken(body) != null ? bodyToken(body) : refreshCookie(http);
        refreshTokens.revokeFamilyOf(presented);

        ResponseEntity.HeadersBuilder<?> response = ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookies.clearAccess().toString())
                .header(HttpHeaders.SET_COOKIE, cookies.clearRefresh().toString());
        // Cikis "bu tarayici artik ben degilim" demek: oturum kapsamli katilimci token'lari da
        // biter, yoksa tarayiciyi devralan kisi onlarla yazmaya devam eder.
        setCookies(response, cookies.clearParticipants(http));
        return response.build();
    }
```

(f) `accessCookie`'yi genel bir yardımcıya indirge (iki çerez adı okunuyor):

```java
    private static String accessCookie(HttpServletRequest http) {
        return cookieValue(http, AuthCookies.ACCESS);
    }

    private static String cookieValue(HttpServletRequest http, String name) {
        if (http.getCookies() == null) {
            return null;
        }
        return Arrays.stream(http.getCookies())
                .filter(cookie -> name.equals(cookie.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
```

- [ ] **Step 6: Ucu public listeye ekle**

`SecurityConfig.java` — `PUBLIC_ENDPOINTS` içine, `/api/auth/logout` satırının altına:

```java
            // Yenileme: cagiranin erisim jetonu tanim geregi olu. Kimlik dogrulamasi
            // yenileme jetonunun kendisidir, bearer'a bakilmaz.
            PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.POST, "/api/auth/refresh"),
```

- [ ] **Step 7: Testi koş, GEÇTİĞİNİ gör**

Run: `cd backend && mvn -q test -Dtest=AuthControllerTest`
Expected: PASS.

- [ ] **Step 8: Tüm backend takımını koş**

Run: `cd backend && mvn -q test`
Expected: PASS. `ApiHappyPathTest` gibi tam yığın testleri gerçek `RefreshTokens` bean'ini kullanır; giriş yolları artık DB'ye satır yazar — düşen olursa Testcontainers şeması V19'u içeriyor mu diye bak.

- [ ] **Step 9: Dosya listesini raporla**

Değişen/eklenen: `UnauthorizedException.java`, `ApiExceptionHandler.java`, `AuthCookies.java`, `AuthController.java`, `SecurityConfig.java`, `AuthControllerTest.java`.

---

### Task 4: K-M38'in KÖKÜ — bayat bearer geçerli katılımcı jetonunu öldürmesin

**Files:**
- Create: `backend/src/main/java/com/bumpinto/infra/security/ParticipantTokens.java`
- Modify: `backend/src/main/java/com/bumpinto/infra/security/ParticipantTokenFilter.java`
- Modify: `backend/src/main/java/com/bumpinto/infra/security/SecurityConfig.java`
- Test: `backend/src/test/java/com/bumpinto/infra/security/SecurityPolicyTest.java`

- [ ] **Step 1: Regresyon testini YAZ (K-M38'in birebir kopyası)**

`SecurityPolicyTest.java` sınıfının sonuna ekle. **Not:** dosyadaki mevcut yardımcıları (jeton üretimi, `mvc`/filtre kurulumu) kullan; aşağıdaki gövde o yardımcıların adlarına göre uyarlanır — `own`/`foreign` isteklerini kuran mevcut testin desenini birebir izle.

```java
    /**
     * K-M38'in KOKU (2026-09-09 cihazda bulundu, curl A/B ile kanitlandi):
     * gecerli katilimci jetonu + BAYAT hesap jetonu = 401. Sebep sira: Spring'in
     * BearerTokenAuthenticationFilter'i ParticipantTokenFilter'dan ONCE kosar ve gecersiz
     * bearer'da ZINCIRI KESER — misafirin gecerli oturum kimligi hic degerlendirilemez.
     * Etki: hesap jetonu 12 saatte doluyordu, oturum 24 saat yasiyor; arada uygulamayi acan
     * HERKES oturumunu kaybediyordu.
     */
    @Test
    void staleBearerDoesNotKillAValidParticipantToken() throws Exception {
        String participant = tokens.issueParticipantToken(UUID.randomUUID(), UUID.randomUUID(),
                "abc-def", false);

        mvc.perform(get("/api/sessions/abc-def")
                        .header(ParticipantTokenFilter.HEADER, participant)
                        .header("Authorization", "Bearer bu-jeton-bozuk"))
                .andExpect(status().isNotUnauthorized());
    }

    /**
     * Karsi kapi: HESAP ucunda bayat jeton 401 DONMEYE DEVAM EDER. Duserse istemci
     * jetonunun oldugunu hic ogrenmez ve 401 kesicisi (W-16/M-10) hic tetiklenmez —
     * kullanici sessizce "girisli ama yetkisiz" bir arafta kalirdi.
     */
    @Test
    void staleBearerStillFailsOnAccountEndpoints() throws Exception {
        mvc.perform(get("/api/me").header("Authorization", "Bearer bu-jeton-bozuk"))
                .andExpect(status().isUnauthorized());
    }

    /** Katilimci jetonu da bozuksa istek gercekten anonimdir: 401 kalir. */
    @Test
    void staleBearerWithAStaleParticipantTokenStays401() throws Exception {
        mvc.perform(get("/api/sessions/abc-def")
                        .header(ParticipantTokenFilter.HEADER, "bu-da-bozuk")
                        .header("Authorization", "Bearer bu-jeton-bozuk"))
                .andExpect(status().isUnauthorized());
    }
```

`status().isNotUnauthorized()` yok — `andExpect(result -> assertThat(result.getResponse().getStatus()).isNotEqualTo(401))` yaz. Amaç 200 iddia etmek DEĞİL (oturum sahte, depo 404 verebilir): iddia **401 olmadığıdır**, çünkü kırılan tam olarak kimlik katmanıydı.

- [ ] **Step 2: Testi koş, DÜŞTÜĞÜNÜ gör**

Run: `cd backend && mvn -q test -Dtest=SecurityPolicyTest`
Expected: FAIL — `staleBearerDoesNotKillAValidParticipantToken` 401 alır (bugünkü hata).

- [ ] **Step 3: Katılımcı jetonu çözümünü ortak gövdeye taşı**

`backend/src/main/java/com/bumpinto/infra/security/ParticipantTokens.java`:

```java
package com.bumpinto.infra.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * "Bu istek gecerli bir KATILIMCI kimligi tasiyor mu" sorusunun TEK cevap yeri.
 *
 * <p>Iki cagirani var ve ikisinin ayni cevabi vermesi sart: {@link ParticipantTokenFilter}
 * kimligi KURAR, {@link SecurityConfig}'in bearer resolver'i bayat bir hesap jetonunu
 * DUSURUP dusurmeyecegine karar verirken bakar. Iki ayri kopya yazilsaydi biri duzeltilip
 * digeri unutulur, K-M38 yarim kapanirdi.
 */
public final class ParticipantTokens {

    public static final String HEADER = "X-Participant-Token";
    private static final Pattern SLUG = Pattern.compile("^/api/sessions/([^/]+)");

    private ParticipantTokens() {
    }

    /** Istegin hedefledigi oturum. Yoksa katilimci jetonu HICBIR SEY acmaz (fail-closed). */
    public static String slugOf(HttpServletRequest request) {
        Matcher m = SLUG.matcher(request.getRequestURI());
        return m.find() ? m.group(1) : null;
    }

    /**
     * Istekteki ADAYLARIN HEPSI denenir, ilki degil: tarayicida ayni isimli BIRDEN COK cerez
     * olabilir (cerez (ad, domain, path) ile saklanir; path bir kez genisletildi ve eski yola
     * yazilmis olan silinemedigi icin orada kaldi). RFC 6265 daha spesifik path'i ONE koyar,
     * yani "ilk eslesen" tam olarak BAYAT olanidir ve uye kendi oturumunda 403 alirdi.
     */
    public static Optional<ParticipantPrincipal> resolve(HttpServletRequest request,
                                                         JwtDecoder decoder) {
        String slug = slugOf(request);
        if (slug == null) {
            return Optional.empty();
        }
        return candidates(request, slug).stream()
                .map(token -> participantOf(decoder, token, slug))
                .flatMap(Optional::stream)
                .findFirst();
    }

    /** Bayat bearer'in dusurulup dusurulmeyecegi kararinda kullanilir (bkz. SecurityConfig). */
    public static boolean carriedBy(HttpServletRequest request, JwtDecoder decoder) {
        return resolve(request, decoder).isPresent();
    }

    /** Gecersiz/baska oturuma ait/yanlis turde token: kimlik YOK (401 degil — anonim sayilir). */
    private static Optional<ParticipantPrincipal> participantOf(JwtDecoder decoder, String token,
                                                                String slug) {
        try {
            Jwt jwt = decoder.decode(token);
            if (!TokenService.PARTICIPANT_TYPE.equals(jwt.getClaimAsString(TokenService.TYPE_CLAIM))
                    || !slug.equals(jwt.getClaimAsString(TokenService.SLUG_CLAIM))) {
                return Optional.empty();
            }
            return Optional.of(new ParticipantPrincipal(
                    UUID.fromString(jwt.getSubject()),
                    UUID.fromString(jwt.getClaimAsString(TokenService.SESSION_CLAIM)),
                    Boolean.TRUE.equals(jwt.getClaim(TokenService.HOST_CLAIM))));
        } catch (JwtException | IllegalArgumentException | NullPointerException invalid) {
            return Optional.empty();
        }
    }

    /** Basliktaki token (mobil) once, sonra ayni adi tasiyan TUM cerezler (web). */
    private static List<String> candidates(HttpServletRequest request, String slug) {
        List<String> candidates = new ArrayList<>();
        String header = request.getHeader(HEADER);
        if (header != null) {
            candidates.add(header); // mobil / SecureStore yolu
        }
        if (request.getCookies() != null) {
            String cookieName = AuthCookies.participantCookieName(slug);
            for (Cookie cookie : request.getCookies()) {
                if (cookieName.equals(cookie.getName())) {
                    candidates.add(cookie.getValue()); // web / HttpOnly cookie yolu
                }
            }
        }
        return candidates;
    }
}
```

- [ ] **Step 4: `ParticipantTokenFilter`'ı bu gövdeye bağla**

`ParticipantTokenFilter.java`: mevcut javadoc bloklarını KORU, gövdeyi sadeleştir. `slugOf`, `candidateTokens`, `participantOf` ve `SLUG` desenini SİL; `HEADER` sabiti **kalır** (testler ve `ApiHappyPathTest` onu kullanıyor):

```java
public class ParticipantTokenFilter extends OncePerRequestFilter {

    /** Cozum gövdesi {@link ParticipantTokens}'te; bu sabit cagiranlarin adresidir. */
    public static final String HEADER = ParticipantTokens.HEADER;

    private final JwtDecoder decoder;

    public ParticipantTokenFilter(JwtDecoder decoder) {
        this.decoder = decoder;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        ParticipantTokens.resolve(request, decoder)
                .ifPresent(ParticipantTokenFilter::authenticate);
        chain.doFilter(request, response);
    }

    private static void authenticate(ParticipantPrincipal participant) {
        Authentication previous = SecurityContextHolder.getContext().getAuthentication();
        var auth = new UsernamePasswordAuthenticationToken(participant, null,
                List.of(new SimpleGrantedAuthority("ROLE_PARTICIPANT")));
        if (previous != null && previous.getPrincipal() instanceof Jwt account) {
            auth.setDetails(account); // uzerine yazilan hesap kimligi: kaybolmaz, yanda durur
        }
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
```

Kullanılmayan import'ları temizle (`Cookie`, `Optional`, `UUID`, `Matcher`, `Pattern`, `ArrayList`).

- [ ] **Step 5: Resolver'da bayat bearer'ı düşür**

`SecurityConfig.java` — `bearerTokenResolver` bean'ini değiştir:

```java
    /**
     * Hesap token'i nereden okunur: {@code Authorization: Bearer} (mobil) ya da
     * {@code bumpinto_at} cerezi (web).
     *
     * <p>Public uclarda kimlik ZORUNLU degil ama FAYDALIDIR: katilim ucu cagirani taniyabilirse
     * ayni hesaba ikinci koltuk acmaz. Bu yuzden token orada yok sayilmaz, once DOGRULANIR.
     *
     * <p><b>K-M38 (2026-09-09):</b> ayni dusunce oturum uclari icin de gecerli. Gecersiz bir
     * bearer ZATEN HICBIR SEY acmiyordu; sorun onu 401 ile cezalandirmakti — Spring'in bearer
     * filtresi ParticipantTokenFilter'dan ONCE kosup zinciri kesiyor, misafirin GECERLI oturum
     * kimligi hic degerlendirilemiyordu (curl A/B: yalniz katilimci jetonu 200 · + gecersiz
     * bearer 401). Bu yuzden bayat jeton, istek kendi basina bir kimlik tasiyorsa dusurulur.
     *
     * <p>Kapsam BILEREK dar: hesap uclarinda bayat jeton 401 DONMEYE DEVAM EDER. Kosulsuz
     * dusurulseydi istemci jetonunun oldugunu hic ogrenmez, 401 kesicisi (W-16/M-10) hic
     * tetiklenmez ve kullanici sessizce yetkisiz kalirdi.
     *
     * <p>Bedel: bu dar yolda katilimci jetonu iki kez cozulur (burada ve filtrede) — istek
     * basina bir fazla HMAC dogrulamasi, yalnizca zaten hatali olan yolda.
     */
    @Bean
    BearerTokenResolver bearerTokenResolver(JwtDecoder accountDecoder, TokenService tokens) {
        DefaultBearerTokenResolver headerResolver = new DefaultBearerTokenResolver();
        JwtDecoder rawDecoder = tokens.decoder();
        return request -> {
            String presented = headerResolver.resolve(request);
            if (presented == null) {
                presented = accessCookie(request);
            }
            if (presented == null || valid(accountDecoder, presented)) {
                return presented;
            }
            boolean requestCarriesItsOwnIdentity = isPublicEndpoint(request)
                    || ParticipantTokens.carriedBy(request, rawDecoder);
            return requestCarriesItsOwnIdentity ? null : presented;
        };
    }
```

- [ ] **Step 6: Testi koş, GEÇTİĞİNİ gör**

Run: `cd backend && mvn -q test -Dtest='SecurityPolicyTest+ParticipantTokenFilterTest'`
Expected: PASS.

- [ ] **Step 7: Tüm backend takımı**

Run: `cd backend && mvn -q test`
Expected: PASS.

- [ ] **Step 8: Dosya listesini raporla**

Değişen/eklenen: `ParticipantTokens.java`, `ParticipantTokenFilter.java`, `SecurityConfig.java`, `SecurityPolicyTest.java`.

---

### Task 5: Hesap silme aileyi iptal eder

**Files:**
- Modify: `backend/src/main/java/com/bumpinto/application/user/AccountDeletion.java`
- Test: `backend/src/test/java/com/bumpinto/application/user/AccountDeletionTest.java` (varsa ekleme, yoksa oluştur)

- [ ] **Step 1: Testi YAZ**

Mevcut `AccountDeletionTest` varsa ona ekle; yoksa dosyayı aç ve mevcut testlerin sahte deposu desenini izle. Test:

```java
    /**
     * Silme "erisim ANINDA kapanir" demek. Yenileme jetonu kalsaydi silinmis hesap 30 gun
     * boyunca kendine yeni erisim jetonu bastirabilirdi — soft delete'in tum anlami giderdi.
     */
    @Test
    void deletionRevokesEveryRefreshToken() {
        UUID user = UUID.randomUUID();

        deletion.delete(user);

        verify(refreshTokens).revokeAllOf(user);
    }
```

`refreshTokens` bir `@Mock RefreshTokens` (Mockito) olarak eklenir ve `AccountDeletion` yapıcısına verilir.

- [ ] **Step 2: Testi koş, DÜŞTÜĞÜNÜ gör**

Run: `cd backend && mvn -q test -Dtest=AccountDeletionTest`
Expected: FAIL — yapıcı `RefreshTokens` almıyor.

- [ ] **Step 3: `AccountDeletion`'ı değiştir**

Alan + yapıcı parametresi ekle, `delete` gövdesine tek satır:

```java
    private final RefreshTokens refreshTokens;

    public AccountDeletion(UserStorePort users, SessionStorePort sessions, AppleTokensPort apple,
                           RefreshTokens refreshTokens, Clock clock) {
        this.users = users;
        this.sessions = sessions;
        this.apple = apple;
        this.refreshTokens = refreshTokens;
        this.clock = clock;
    }

    @Transactional
    public void delete(UUID userId) {
        Instant now = clock.instant();
        // Revoke ONCE: softDelete apple_refresh_token'i temizler, sonra okunamazdi.
        revokeApple(userId);
        // Erisim ANINDA kapanir: yenileme jetonu kalsaydi silinmis hesap 30 gun boyunca
        // kendine yeni erisim jetonu bastirabilirdi.
        refreshTokens.revokeAllOf(userId);
        for (UUID sessionId : sessions.sessionIdsOfHost(userId)) {
            sessions.deleteSession(sessionId);
        }
        for (Participant seat : sessions.participantsOfUser(userId)) {
            sessions.anonymizeParticipant(seat.id(), ANONYMOUS_NAME, now);
        }
        users.softDelete(userId, now, now.plus(PURGE_DELAY));
    }
```

- [ ] **Step 4: Testi koş, GEÇTİĞİNİ gör**

Run: `cd backend && mvn -q test -Dtest=AccountDeletionTest`
Expected: PASS.

- [ ] **Step 5: BACKEND KAPISI — tam takım**

Run: `cd backend && mvn -q test`
Expected: PASS. **Çıktıyı rapora yaz** (test sayısı dahil). Düşen varsa burada durulur.

- [ ] **Step 6: Dosya listesini raporla**

Değişen: `AccountDeletion.java`, `AccountDeletionTest.java`.
---

### Task 6: Sözleşmeyi yenile (`pnpm codegen`) + shared `api.ts`

**Files:**
- Modify: `frontend/shared/src/api-types.ts` (**ÜRETİLİR — elle düzenlenmez**)
- Modify: `frontend/shared/openapi.json` (üretilir)
- Modify: `frontend/shared/src/api.ts`

- [ ] **Step 1: Backend'i ayağa kaldır**

Run: `cd backend && mvn spring-boot:run` (ayrı bir kabukta; `local` profili)
Expected: `http://localhost:8060/v3/api-docs` JSON döner.

- [ ] **Step 2: Codegen'i koş**

Run: `pnpm codegen`
Expected: `frontend/shared/src/api-types.ts` yeniden yazılır.

- [ ] **Step 3: Sözleşmenin gerçekten değiştiğini doğrula**

Run: `rtk proxy grep -n "refreshToken\|/api/auth/refresh" frontend/shared/src/api-types.ts | head`
Expected: `LoginResponse.refreshToken`, `RefreshRequest.refreshToken` ve `"/api/auth/refresh"` yolu görünür.
Görünmüyorsa **DUR**: backend eski derlemeyle koşuyor demektir; yeniden başlat ve tekrarla. `api-types.ts` ELLE düzeltilmez.

- [ ] **Step 4: `api.ts`'te çıkışa jetonu ekle**

`frontend/shared/src/api.ts` — `logout` satırını değiştir:

```ts
    /* Yenileme jetonu SUNUCUDA iptal edilsin diye gonderilir: mobilde govdeyle (cerez yok),
       webde cerez zaten gider ve arguman verilmez. */
    logout: (refreshToken?: string) =>
      http.post("/api/auth/logout", refreshToken ? { refreshToken } : {}).then(() => undefined),
```

**`refresh` BILEREK bu arayuze eklenmez:** yenileme, kesicinin takili oldugu ornekten
cagrilirsa kendi 401'i kesiciye geri duser ve dongu olur. Platformlar onu KESICISIZ ham
axios ile atar (Task 8/9).

- [ ] **Step 5: Sözleşme testini koş**

Run: `source ./init-nvm.sh && pnpm test:web`
Expected: PASS (henüz kesici yok; yalnız tip/derleme regresyonu aranıyor).

- [ ] **Step 6: Dosya listesini raporla**

Değişen: `frontend/shared/openapi.json`, `frontend/shared/src/api-types.ts` (üretildi), `frontend/shared/src/api.ts`.

---

### Task 7 (W-16 + M-10 ortak gövdesi): shared'da tek-uçuşlu 401 kesicisi

**Files:**
- Modify: `frontend/shared/src/http.ts`
- Modify: `frontend/shared/src/index.ts`
- Test: `frontend/shared/src/http.test.ts`

- [ ] **Step 1: Kesicinin beş kuralını test olarak YAZ (önce düşsün)**

`frontend/shared/src/http.test.ts`:

```ts
import type { InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createHttp } from "./http";

/**
 * 401 kesicisi WEB ve MOBILIN AYNI govdesidir (W-16 + M-10): platformlar yalnizca
 * `refresh()` ve `onSignedOut()` saglar. Bu yuzden kurallar burada, tek yerde sinanir.
 *
 * Yeni bagimlilik (axios-mock-adapter) yerine axios'un kendi `adapter` kancasi kullanilir:
 * istek gercek boru hattindan (istek kesicisi + serilestirme) gecer, yalniz ag katmani kesilir.
 */
type Call = { url: string; auth: string | null };

function harness(options: { refreshWorks: boolean; alwaysFails?: boolean }) {
  const calls: Call[] = [];
  let token = "eski";
  let unauthorized = true;

  const refresh = vi.fn(async () => {
    if (!options.refreshWorks) return false;
    token = "yeni";
    unauthorized = false;
    return true;
  });
  const onSignedOut = vi.fn();

  const http = createHttp("http://x", { getIdToken: () => token, refresh, onSignedOut });
  http.defaults.adapter = async (config) => {
    const headers = config.headers as unknown as { get: (k: string) => unknown };
    calls.push({
      url: String(config.url),
      auth: (headers.get("Authorization") as string | undefined) ?? null,
    });
    const status = options.alwaysFails || unauthorized ? 401 : 200;
    return {
      data: {}, status, statusText: "", headers: {},
      config: config as InternalAxiosRequestConfig,
    };
  };
  return { http, calls, refresh, onSignedOut };
}

beforeEach(() => vi.clearAllMocks());

describe("401 kesicisi", () => {
  /** Rotasyon TEK KULLANIMLIK: paralel iki yenileme ikincisini "yeniden kullanim"
      saydirip AILEYI iptal ettirirdi. */
  it("N paralel 401 icin TEK yenileme atar", async () => {
    const { http, refresh } = harness({ refreshWorks: true });

    await Promise.all([http.get("/api/me"), http.get("/api/sessions"), http.get("/api/config")]);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("ozgun istegi YENI jetonla tekrar oynatir", async () => {
    const { http, calls } = harness({ refreshWorks: true });

    await http.get("/api/me");

    expect(calls.map((c) => c.auth)).toEqual(["Bearer eski", "Bearer yeni"]);
    expect(calls.every((c) => c.url === "/api/me")).toBe(true);
  });

  /** Yenileme ucunun KENDISI 401 verirse tekrar denenmez — sonsuz dongu. */
  it("yenileme ucunda tekrar YOK", async () => {
    const { http, refresh } = harness({ refreshWorks: true });

    await expect(http.post("/api/auth/refresh")).rejects.toBeDefined();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("yenileme basarisizsa onSignedOut cagrilir ve hata yukselir", async () => {
    const { http, onSignedOut } = harness({ refreshWorks: false });

    await expect(http.get("/api/me")).rejects.toBeDefined();
    expect(onSignedOut).toHaveBeenCalledTimes(1);
  });

  /** Tekrar oynatilan istek YINE 401 alirsa ikinci yenileme atilmaz. */
  it("bir kez yenilenmis istek ikinci yenilemeyi tetiklemez", async () => {
    const { http, refresh, calls } = harness({ refreshWorks: true, alwaysFails: true });

    await expect(http.get("/api/me")).rejects.toBeDefined();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Testi koş, DÜŞTÜĞÜNÜ gör**

Run: `source ./init-nvm.sh && pnpm test:web -- http.test`
Expected: FAIL — `refresh`/`onSignedOut` `AuthProviders`te yok (tip hatası) ve kesici hiç çalışmıyor.

- [ ] **Step 3: `http.ts`'i yaz**

`frontend/shared/src/http.ts` (tam içerik):

```ts
import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

export type AuthProviders = {
  /** Host JWT (mobil). Web'de tanımsız bırakılır. */
  getIdToken?: () => Promise<string | null> | string | null;
  /** Oturuma özel katılımcı token'ı. */
  getParticipantToken?: (slug: string) => string | null | undefined;
  /**
   * Yeni erişim jetonu al. `true` = alındı, özgün istek TEKRAR OYNATILIR.
   * Platform sağlar: web çerezle, mobil gövdeyle çağırır — kesicinin ikisinden de haberi yok.
   */
  refresh?: () => Promise<boolean>;
  /** Yenileme başarısız: oturum gerçekten bitti. Platform yerel durumu temizler. */
  onSignedOut?: () => void | Promise<void>;
};

const SLUG_RE = /\/api\/sessions\/([^/]+)/;
/**
 * Kimlik uçlarında 401 "jetonum bayat" demek DEĞİLDİR (giriş reddi, yenileme reddi...).
 * Yenileme ucunun kendi 401'i tekrar yenileme tetikleseydi sonsuz döngü olurdu.
 */
const AUTH_RE = /\/api\/auth\//;

type Retriable = InternalAxiosRequestConfig & { _refreshed?: boolean };

/**
 * TEK UÇUŞLU yenileme kapısı: aynı anda 5 istek 401 alırsa 5 yenileme atılmaz — ilki sözü
 * kurar, kalanlar ona kuyruklanır.
 *
 * Bu bir optimizasyon DEĞİL, doğruluk şartı: sunucuda rotasyon tek kullanımlıktır, paralel
 * ikinci yenileme "yeniden kullanım" sayılır ve AİLENİN TAMAMI iptal edilir (B-16).
 *
 * Dışa açıktır çünkü mobil, `exp` yaklaşırken önden yenilerken AYNI uçuşa katılmak zorundadır
 * (M-10): iki ayrı kapı olsaydı önden yenileme ile 401 yenilemesi çakışırdı.
 */
export type RefreshGate = { run: () => Promise<boolean> };

export function createRefreshGate(refresh: () => Promise<boolean>): RefreshGate {
  let inFlight: Promise<boolean> | null = null;
  return {
    run: () => {
      inFlight ??= refresh()
        .catch(() => false) // ağ hatası da "yenilenemedi"dir; kapı asla asılı kalmaz
        .finally(() => {
          inFlight = null;
        });
      return inFlight;
    },
  };
}

export type HttpOptions = {
  /** Web: true — HttpOnly cookie'ler otomatik taşınır. Mobil: false. */
  withCredentials?: boolean;
  /** Backend'in cookie mi body mi döneceğini seçer. */
  client?: "web" | "mobile";
  /** Mobilin önden yenilemesiyle PAYLAŞILAN kapı. Verilmezse `providers.refresh`ten kurulur. */
  gate?: RefreshGate;
};

export function createHttp(baseUrl: string, providers: AuthProviders,
    options: HttpOptions = {}): AxiosInstance {
  const http = axios.create({
    baseURL: baseUrl,
    timeout: 10000,
    withCredentials: options.withCredentials ?? false,
    headers: options.client ? { "X-Client": options.client } : undefined,
  });

  http.interceptors.request.use(async (config) => {
    const idToken = await providers.getIdToken?.();
    if (idToken) config.headers.set("Authorization", `Bearer ${idToken}`);
    // `delete` ŞART: tekrar oynatmada config ESKİ başlığı taşır. Jeton artık yoksa ölü
    // bearer yeniden gönderilir, aynı 401 döner ve kullanıcı boşuna çıkışa düşerdi.
    else config.headers.delete("Authorization");
    const match = (config.url ?? "").match(SLUG_RE);
    const participantToken = match ? providers.getParticipantToken?.(match[1]) : undefined;
    if (participantToken) config.headers.set("X-Participant-Token", participantToken);
    return config;
  });

  const gate = options.gate
    ?? (providers.refresh ? createRefreshGate(providers.refresh) : null);
  if (!gate) return http;

  http.interceptors.response.use(undefined, async (error: unknown) => {
    const failure = error as { response?: { status?: number }; config?: Retriable };
    const config = failure.config;
    if (failure.response?.status !== 401 || !config) throw error;
    if (config._refreshed || AUTH_RE.test(config.url ?? "")) throw error;
    // İşaret ÖNCE konur: tekrar oynatılan istek yine 401 alırsa ikinci yenileme atılmaz.
    config._refreshed = true;
    if (await gate.run()) return http.request(config);
    await providers.onSignedOut?.();
    throw error;
  });

  return http;
}
```

- [ ] **Step 4: `index.ts`'ten dışa aç**

`frontend/shared/src/index.ts` ilk satırını değiştir:

```ts
export { createHttp, createRefreshGate, type AuthProviders, type HttpOptions,
  type RefreshGate } from "./http";
```

- [ ] **Step 5: Testi koş, GEÇTİĞİNİ gör**

Run: `source ./init-nvm.sh && pnpm test:web -- http.test`
Expected: PASS — 5 test.

- [ ] **Step 6: Web takımının tamamı**

Run: `source ./init-nvm.sh && pnpm test:web`
Expected: PASS.

- [ ] **Step 7: Dosya listesini raporla**

Değişen/eklenen: `frontend/shared/src/http.ts`, `frontend/shared/src/index.ts`, `frontend/shared/src/http.test.ts`.

---

### Task 8 (W-16): web adaptörü

**Files:**
- Modify: `frontend/web/src/lib/api.ts`
- Modify: `frontend/web/src/main.tsx`
- Modify: `frontend/web/src/store/authStore.ts`
- Test: `frontend/web/src/store/authStore.test.ts`

- [ ] **Step 1: `signedOut` testini YAZ**

`frontend/web/src/store/authStore.test.ts` sonuna:

```ts
  it("signedOut → anon (AĞA GİTMEDEN)", () => {
    useAuthStore.setState({ me: { id: "u1" } as never, status: "signed" });

    useAuthStore.getState().signedOut();

    expect(useAuthStore.getState().status).toBe("anon");
    expect(useAuthStore.getState().me).toBeNull();
    expect(api.logout).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: Testi koş, DÜŞTÜĞÜNÜ gör**

Run: `source ./init-nvm.sh && pnpm test:web -- authStore`
Expected: FAIL — `signedOut` yok.

- [ ] **Step 3: `authStore`'a `signedOut` ekle**

Tip bloğuna (`logout` satırının altına):

```ts
  /** Sunucu oturumu bitirdi (yenileme reddedildi) — ağa GİTMEDEN yerel durumu temizler. */
  signedOut: () => void;
```

Uygulamaya (`logout`'un altına):

```ts
  /**
   * `logout()` DEĞİL: o `POST /api/auth/logout` atar. Buraya, sunucu yenilemeyi ZATEN
   * reddettiği için gelinir — ikinci bir ağ turu beklemenin anlamı yok ve çevrimdışıyken
   * kullanıcıyı asılı bırakırdı. Yan etkiler `logout` ile aynı: rıza kapısı ve oturum listesi.
   */
  signedOut: () => {
    set({ me: null, status: "anon" });
    setAnalyticsConsent(false);
    useSessionsStore.getState().reset();
  },
```

- [ ] **Step 4: `lib/api.ts`'i yaz**

`frontend/web/src/lib/api.ts` (tam içerik):

```ts
import { createBumpintoApi, createHttp } from "@bumpinto/shared";
import axios from "axios";

const baseUrl = import.meta.env.VITE_API_URL ?? "";

/**
 * Yenileme KESİCİSİZ ham axios ile atılır. Aynı örnekten çağrılsaydı yenilemenin kendi
 * 401'i kesiciye geri düşerdi; URL kapısı bunu zaten engelliyor ama ayrı örnek kullanmak
 * döngüyü YAPISAL olarak imkânsız kılar.
 *
 * Gövde yok: yenileme jetonu HttpOnly çerezde (`path=/api/auth`), JS onu hiç görmez.
 */
const refresh = () =>
  axios
    .post(`${baseUrl}/api/auth/refresh`, {}, {
      withCredentials: true,
      headers: { "X-Client": "web" },
    })
    .then(() => true)
    .catch(() => false);

let signedOutHandler: () => void = () => {};

/**
 * Kök (`main.tsx`) kaydeder. `authStore` buradan İTHAL EDİLMEZ: authStore zaten `api`yi
 * ithal ediyor, ters yön döngü olurdu — ve bu modülü ithal eden her testin
 * `vi.mock("../lib/api")` ikizini bozardı.
 */
export const setSignedOutHandler = (fn: () => void) => {
  signedOutHandler = fn;
};

export const api = createBumpintoApi(
  createHttp(baseUrl, { refresh, onSignedOut: () => signedOutHandler() }, {
    withCredentials: true, // HttpOnly cookie'ler her istekte taşınır
    client: "web",         // backend token'ı cookie'ye yazar, body'ye koymaz
  }),
);
```

- [ ] **Step 5: Kökte kancayı bağla**

`frontend/web/src/main.tsx` — import'lara `setSignedOutHandler` ekle ve `load()` çağrılarının ÜSTÜNE:

```ts
// Kesici oturumu bitirdiğinde mağaza anon'a düşer; yönlendirme rota koruyucularından gelir.
setSignedOutHandler(() => useAuthStore.getState().signedOut());
```

- [ ] **Step 6: Testleri koş**

Run: `source ./init-nvm.sh && pnpm test:web`
Expected: PASS.

- [ ] **Step 7: Web derlemesi (tip kapısı)**

Run: `source ./init-nvm.sh && pnpm build:web`
Expected: `tsc -b` + vite build temiz.

- [ ] **Step 8: Dosya listesini raporla**

Değişen: `frontend/web/src/lib/api.ts`, `frontend/web/src/main.tsx`, `frontend/web/src/store/authStore.ts`, `frontend/web/src/store/authStore.test.ts`.

---

### Task 9 (M-10): mobil adaptörü + önden yenileme

**Files:**
- Modify: `frontend/mobile/src/lib/tokenStore.ts`
- Modify: `frontend/mobile/src/lib/api.ts`
- Modify: `frontend/mobile/src/store/authStore.ts`
- Modify: `frontend/mobile/app/_layout.tsx`
- Test: `frontend/mobile/src/lib/tokenStore.test.ts`, `frontend/mobile/src/lib/__tests__/refresh.test.ts`

- [ ] **Step 1: Testleri YAZ**

`frontend/mobile/src/lib/tokenStore.test.ts` sonuna (dosyanın `jwt`/`future`/`past` yardımcıları kullanılır):

```ts
test("exp'e 60 sn'den az kalan jeton 'bitmek üzere' sayılır", () => {
  const soon = Math.floor(Date.now() / 1000) + 30;

  expect(expiringSoon(jwt({ exp: soon }), 60_000)).toBe(true);
  expect(expiringSoon(jwt({ exp: future() }), 60_000)).toBe(false);
});

/** `exp` taşımayan jeton kabul edilir — istemci kendi kafasından süre uydurmaz (K-M38). */
test("exp taşımayan jeton bitmek üzere SAYILMAZ", () => {
  expect(expiringSoon(jwt({ sub: "u1" }), 60_000)).toBe(false);
});

test("yenileme jetonu ayrı anahtarda yaşar ve silinebilir", async () => {
  await setRefreshToken("rt-1");
  await expect(getRefreshToken()).resolves.toBe("rt-1");

  await clearRefreshToken();
  await expect(getRefreshToken()).resolves.toBeNull();
});
```

import satırını genişlet: `expiringSoon, getRefreshToken, setRefreshToken, clearRefreshToken`.

`frontend/mobile/src/lib/__tests__/refresh.test.ts` (yeni):

```ts
/**
 * Önden yenileme (M-10). `exp` yaklaşırken istek ATILMADAN ÖNCE yenilenir; 401'i bekleyip
 * tekrar oynamak da çalışırdı ama her 15 dakikada bir gereksiz tur atardı.
 *
 * `atob` YASAK (Hermes'te garanti değil, `tsc` onu yalnız DOM lib'inden tanır: derleme geçer,
 * cihaz patlar) — çözücü `tokenStore.ts` içindeki saf base64url kodudur.
 */
import { createRefreshGate } from "@bumpinto/shared";

import { expiringSoon } from "../tokenStore";

const jwt = (payload: object) => {
  const b64 = (o: object) =>
    Buffer.from(JSON.stringify(o)).toString("base64")
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${b64({ alg: "HS256" })}.${b64(payload)}.imza`;
};

test("kapı paralel çağrıları TEK yenilemeye indirger", async () => {
  const refresh = jest.fn(async () => true);
  const gate = createRefreshGate(refresh);

  await Promise.all([gate.run(), gate.run(), gate.run()]);

  expect(refresh).toHaveBeenCalledTimes(1);
});

test("uçuş bittikten SONRA yeni bir yenileme atılabilir", async () => {
  const refresh = jest.fn(async () => true);
  const gate = createRefreshGate(refresh);

  await gate.run();
  await gate.run();

  expect(refresh).toHaveBeenCalledTimes(2);
});

test("bitmek üzere olan jeton önden yenilemeyi tetikler", () => {
  const soon = jwt({ exp: Math.floor(Date.now() / 1000) + 30 });

  expect(expiringSoon(soon, 60_000)).toBe(true);
});
```

- [ ] **Step 2: Testleri koş, DÜŞTÜĞÜNÜ gör**

Run: `source ./init-nvm.sh && pnpm --filter @bumpinto/mobile test`
Expected: FAIL — `expiringSoon` / `getRefreshToken` yok.

- [ ] **Step 3: `tokenStore.ts`'i genişlet**

Dosyanın `const KEY` satırını değiştir ve sona ekle:

```ts
const KEY = "bumpinto.accessToken";
/** Yenileme jetonu AYRI anahtarda: erişim jetonu her 15 dakikada değişir, bu 30 gün yaşar. */
const REFRESH_KEY = "bumpinto.refreshToken";
```

```ts
/** `exp`e kalan süre (ms). `null` = çözülemedi ya da jeton `exp` taşımıyor. */
function msUntilExpiry(token: string): number | null {
  const payload = payloadOf(token);
  const exp = payload?.exp;
  return typeof exp === "number" ? exp * 1000 - Date.now() : null;
}

/**
 * Süre dolmasına `withinMs`ten az mı kaldı? `exp` yoksa HAYIR: istemci kendi kafasından
 * süre uydurmaz (K-M38'de alınan duruş) — o jeton 401 alana kadar kullanılır.
 */
export const expiringSoon = (token: string, withinMs: number): boolean => {
  const left = msUntilExpiry(token);
  return left !== null && left <= withinMs;
};

export const getRefreshToken = () => SecureStore.getItemAsync(REFRESH_KEY);
export const setRefreshToken = (token: string) => SecureStore.setItemAsync(REFRESH_KEY, token);
export const clearRefreshToken = () => SecureStore.deleteItemAsync(REFRESH_KEY);
```

Ayrıca dosya başlığındaki "Sessiz yenileme hâlâ v1.1'de (belgeli taviz)" paragrafını değiştir:

```
 * **Sessiz yenileme ARTIK VAR (M-10).** Ölü jetonu düşürmek burada KALIR — emniyet ağı olarak,
 * yenilemenin yerine değil: `api.ts` `exp` yaklaşırken önden yeniler, 401 gelirse shared'daki
 * kesici bir kez yeniler ve isteği tekrar oynar. Bu kapı, yenilemenin de başarısız olduğu
 * durumda ölü jetonun sunucuya gitmesini engeller.
```

- [ ] **Step 4: `lib/api.ts`'i yaz**

`frontend/mobile/src/lib/api.ts` (mevcut dosyanın altını değiştir; başlıktaki açıklamalar ve `participantTokens` haritası KORUNUR):

```ts
import { createBumpintoApi, createHttp, createRefreshGate, type Schemas }
  from "@bumpinto/shared";
import axios from "axios";
import Constants from "expo-constants";

import { useNetStore } from "../store/netStore";
import {
  clearAccessToken, clearRefreshToken, expiringSoon, getAccessToken, getRefreshToken,
  setAccessToken, setRefreshToken,
} from "./tokenStore";
```

`api` tanımının ÜSTÜNE:

```ts
/** `exp`e bu kadar kala önden yenilenir: 15 dakikalık jetonda 60 sn, ağ turuna rahat yeter. */
const REFRESH_MARGIN_MS = 60_000;

/** KESİCİSİZ örnek: yenilemenin kendi 401'i kesiciye geri düşemez (yapısal güvence). */
const bare = axios.create({
  baseURL: extra.apiUrl,
  timeout: 10000,
  headers: { "X-Client": "mobile" },
});

/**
 * TEK kapı: hem 401 kesicisi hem önden yenileme buradan geçer. İki ayrı kapı olsaydı
 * ikisi çakışır, sunucu ikincisini "yeniden kullanım" sayıp AİLEYİ iptal ederdi (B-16).
 */
const gate = createRefreshGate(async () => {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;
  try {
    const { data } = await bare.post<Schemas["LoginResponse"]>(
      "/api/auth/refresh", { refreshToken });
    if (!data.accessToken || !data.refreshToken) return false;
    await setAccessToken(data.accessToken);
    // Rotasyon TEK KULLANIMLIK: eskisi bu yanıtla birlikte ÖLDÜ, üzerine yazmak şart.
    await setRefreshToken(data.refreshToken);
    return true;
  } catch (error) {
    // YALNIZ 401'de silinir: ağ hatasında jetonu atmak, uçak modundan dönen kullanıcıyı
    // sebepsiz çıkışa düşürürdü.
    if ((error as { response?: { status?: number } }).response?.status === 401) {
      await clearAccessToken();
      await clearRefreshToken();
    }
    return false;
  }
});

export const api = createBumpintoApi(
  createHttp(
    extra.apiUrl,
    {
      getIdToken: async () => {
        const token = await getAccessToken();
        // Çevrimdışıyken yenileme DENENMEZ: kesin başarısız olur ve elde jeton varken
        // kullanıcıyı boşuna çıkışa düşürürdü. Ne varsa o gönderilir.
        if (!useNetStore.getState().online) return token;
        if (token && !expiringSoon(token, REFRESH_MARGIN_MS)) return token;
        // Jeton yok ya da bitmek üzere: AYNI uçuşa katıl, sonra tazesini oku.
        await gate.run();
        return getAccessToken();
      },
      getParticipantToken: (slug) => participantTokens.get(slug),
    },
    { client: "mobile", gate },
  ),
);
```

**Not (bilinçli bedel):** hesapsız misafirde her istek iki SecureStore okuması yapar
(`getAccessToken` + kapının içindeki `getRefreshToken`, ikisi de `null`). Ölçülebilir bir
maliyet değil; kaçınmak için üçüncü bir "hesap var mı" bayrağı tutmak, senkronize kalması
gereken dördüncü bir durum yaratırdı.

- [ ] **Step 5: `authStore`'u güncelle**

`frontend/mobile/src/store/authStore.ts`:

(a) import'a `clearRefreshToken, getRefreshToken, setRefreshToken` ekle.

(b) `finishLogin`'i değiştir:

```ts
async function finishLogin(
  login: { accessToken?: string; refreshToken?: string; userId?: string },
  set: (partial: Partial<AuthState>) => void,
  errorKey: string,
): Promise<void> {
  // İkisi de ŞART: yenileme jetonu olmadan kullanıcı 15 dakika sonra sessizce düşerdi.
  if (!login.accessToken || !login.refreshToken) return set({ status: "out", error: errorKey });
  await setAccessToken(login.accessToken);
  await setRefreshToken(login.refreshToken);
  const me = await api.me().catch(() => null);
  if (me?.language) await i18n.changeLanguage(me.language);
  set({ status: "in", userId: login.userId ?? null, displayName: me?.displayName ?? null });
}
```

(c) Tip bloğuna `signedOut: () => Promise<void>;` ekle ve `signOut`'u değiştirip `signedOut`'u ekle:

```ts
  async signOut() {
    // Jeton SUNUCUDA iptal edilsin: yalnız cihazdan silmek, çalınmış bir kopyayı 30 gün
    // daha canlı bırakırdı.
    await api.logout((await getRefreshToken()) ?? undefined).catch(() => undefined);
    await GoogleSignin.signOut().catch(() => undefined);
    await clearAccessToken();
    await clearRefreshToken();
    set({ status: "out", userId: null, displayName: null });
  },

  /**
   * Sunucu yenilemeyi REDDETTİ (jeton iptal edilmiş ya da aile kapanmış). `signOut()` DEĞİL:
   * o ayrıca çıkış ucunu ve Google oturumunu kapatır — burada zaten reddedildik, ikinci bir
   * ağ turu beklemenin anlamı yok. `AuthGuard` `status: "out"` görünce köke atar.
   */
  async signedOut() {
    await clearAccessToken();
    await clearRefreshToken();
    set({ status: "out", userId: null, displayName: null });
  },
```

- [ ] **Step 6: Kökte kancayı bağla**

`frontend/mobile/app/_layout.tsx`:

```ts
import { setSignedOutHandler } from "../src/lib/api";
```

`RootLayout` içinde, mevcut `useEffect`lerin yanına:

```ts
  // Kesici oturumu bitirdiğinde mağaza "out"a düşer; yönlendirmeyi AuthGuard yapar.
  useEffect(() => setSignedOutHandler(() => void useAuthStore.getState().signedOut()), []);
```

ve `frontend/mobile/src/lib/api.ts`'e web ile AYNI kancayı ekle (aynı gerekçe: authStore → api
yönü tektir, ters ithal döngü olurdu):

```ts
let signedOutHandler: () => void = () => {};
export const setSignedOutHandler = (fn: () => void) => {
  signedOutHandler = fn;
};
```

ve `createHttp` sağlayıcılarına `onSignedOut: () => signedOutHandler()` ekle.

**Not:** `setSignedOutHandler` bir temizleyici döndürmez; `useEffect`in dönüş değeri
`void` olmalı — yukarıdaki satırı `useEffect(() => { setSignedOutHandler(...); }, [])`
biçiminde yaz.

- [ ] **Step 7: Mobil kapılarını koş**

Run: `source ./init-nvm.sh && pnpm --filter @bumpinto/mobile test && pnpm --filter @bumpinto/mobile typecheck && pnpm --filter @bumpinto/mobile lint`
Expected: hepsi PASS.

- [ ] **Step 8: `atob` yasağını doğrula**

Run: `rtk proxy grep -rn "atob" frontend/mobile/src frontend/shared/src`
Expected: **hiç eşleşme yok**.

- [ ] **Step 9: Dosya listesini raporla**

Değişen/eklenen: `frontend/mobile/src/lib/tokenStore.ts`, `frontend/mobile/src/lib/tokenStore.test.ts`, `frontend/mobile/src/lib/api.ts`, `frontend/mobile/src/lib/__tests__/refresh.test.ts`, `frontend/mobile/src/store/authStore.ts`, `frontend/mobile/app/_layout.tsx`.

---

### Task 10: SIFIR BORÇ kapıları — dördünü de KOŞ ve çıktıyı raporla

- [ ] **Step 1: Backend**

Run: `cd backend && mvn -q test`
Rapora: geçen test sayısı + sonuç.

- [ ] **Step 2: Web + i18n**

Run: `source ./init-nvm.sh && pnpm test:web && pnpm i18n:check`
Rapora: test sayısı + `tr N · en N · nl N` satırı. **Sayılar Task 0 öncesiyle AYNI olmalı** (K5: yeni anahtar yok).

- [ ] **Step 3: Mobil**

Run: `source ./init-nvm.sh && pnpm --filter @bumpinto/mobile test && pnpm --filter @bumpinto/mobile typecheck && pnpm --filter @bumpinto/mobile lint`
Rapora: test sayısı + tsc/lint sonucu.

- [ ] **Step 4: Herhangi biri düşerse**

DURULUR. "Yazıldı ama koşulmadı" kabul edilmez; düşen kapı düzeltilir ya da açıkça raporlanıp INDEX'e K-görevi olarak yazılır.

---

### Task 11: GERÇEK İSTEMCİ doğrulaması (K-M38 senaryosunun birebir tekrarı) + INDEX

- [ ] **Step 1: Ortamı kur**

```bash
adb devices                      # bumpinto-api35 çalışıyor olmalı
adb reverse tcp:8060 tcp:8060
```
Backend ayrı kabukta, **kısa TTL ile** (senaryoyu 15 dakika beklemeden üretmek için):

```bash
cd backend && mvn spring-boot:run -Dspring-boot.run.arguments=--bumpinto.security.token-ttl=PT60S
```

- [ ] **Step 2: Uygulamayı kur ve giriş yap**

Run: `source ./init-nvm.sh && pnpm --filter @bumpinto/mobile android`
Beklenen: uygulama açılır, Google ile giriş yapılır (SecureStore'da hem erişim hem yenileme jetonu).

- [ ] **Step 3: K-M38 senaryosu — jeton ölmüşken derin linkle oturuma gir**

1. Web'de (ya da başka bir hesapla) bir oturum kur, davet linkini al.
2. Uygulamayı arka plana al, **>60 sn bekle** (erişim jetonu öldü, yenileme jetonu canlı).
3. `adb shell am start -a android.intent.action.VIEW -d "bumpinto://j/<slug>"`

Beklenen: **görünüm YÜKLENİR** ("Bu oturum bulunamadı" YOK), yenileme sessizce olur.

- [ ] **Step 4: Kanıtı topla**

```bash
adb exec-out screencap -p > /tmp/m10-deeplink.png
adb logcat -d | grep -i "auth/refresh\|401" | tail -40
```
Beklenen: ekran görüntüsünde oturum görünümü; logcat'te `/api/auth/refresh` çağrısı ve ardından 401 YOK.
Sunucu tarafında da bak: `refresh token reuse detected` **görünmemeli** (görünürse tek-uçuşluluk kırık).

- [ ] **Step 5: İkinci kontrol — paralel istek fırtınasında tek yenileme**

Oturum ekranında birkaç sekme/eylem aynı anda tetiklenirken (deste + katılımcılar + mekanlar)
backend loglarında `/api/auth/refresh` **bir kez** görünmeli.

- [ ] **Step 6: Koşulamayan bir şey varsa AÇIKÇA söyle**

Emülatör/cihaz elde yoksa ya da adım tamamlanamazsa: bitmiş SAYILMAZ. INDEX'e
`K-M39 | Yenileme jetonu cihaz doğrulaması koşulmadı | açık` satırı yazılır.

- [ ] **Step 7: INDEX'i güncelle**

`docs/superpowers/plans/INDEX.md`:
- B-16, W-16, M-10 satırlarında plan sütununa `2026-09-09-plan45-refresh-token.md` / `Plan 45`, durum `done` (kapılar + cihaz kanıtıyla).
- Sıradaki NUMARALAR satırından B-16/W-16/M-10 notunu düş, `B-17, W-17, M-11` bırak.
- Flyway satırına: `V19 = B-16 ✓ UYGULANDI (refresh_tokens)` — eski "V19 = push/device_tokens (rezerv)" notu düzeltilir, push bir sonraki numaraya (V20) kayar.
- K-M38 notuna ekle: **kök çözüm geldi (Plan 45)** — sunucu artık geçerli katılımcı jetonu taşıyan istekte bayat bearer'ı düşürüyor; `tokenStore` kapısı emniyet ağı olarak KALDI.
- Kararlar K1–K5 tek satır özetle INDEX'e taşınır (özellikle K2 çerez yolu ve K4 geçiş bedeli).

- [ ] **Step 8: Kapanış raporu**

Rapora: dört kapının çıktısı, cihaz kanıtı (ekran görüntüsü yolu + logcat özeti), değişen dosyaların tam listesi, ve **commit KULLANICIDA** notu.

---

## Öz denetim

**Kapsam:** B-16'nın yedi maddesi Task 1–5'te (tablo, opak jeton, public uç, rotasyon+yeniden kullanım, TTL, logout/silme iptali, web çerezi/mobil SecureStore, bearer kararı). W-16 Task 7+8'de, M-10 Task 7+9'da. Geçiş (K4) ve i18n (K5) kararlarda.

**Yer tutucu yok:** her adımda çalışacak kod var; "uygun hata yönetimi ekle" türü satır yok.

**Tip tutarlılığı:** `RefreshTokens.Issued(token, expiresAt)` ve `Rotation(userId, token, expiresAt)` Task 2'de tanımlandı, Task 3'te aynı adlarla kullanıldı. `RefreshGate.run()` Task 7'de tanımlandı, Task 9'da aynı adla çağrıldı. `AuthCookies.REFRESH` Task 3'te tanımlandı, testlerde aynı ad. `expiringSoon(token, withinMs)` Task 9'da tek imza.

**Bilinen kırılganlık:** Task 4'ün testi `SecurityPolicyTest`in mevcut yardımcılarına yaslanıyor — o dosyanın kurulum deseni okunmadan yazılmasın.
