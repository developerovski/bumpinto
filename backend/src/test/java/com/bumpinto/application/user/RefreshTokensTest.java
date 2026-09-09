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
import java.util.function.Predicate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Rotasyonun TUM kararlari BURADA sinanir; web katmani yalniz "kim" ve "jeton nereden geldi"
 * (cerez mi govde mi) sorusunu bilir.
 */
class RefreshTokensTest {

    /** Bellek ici depo: gercek adapter ayri, burada sinanan KARAR. */
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

        private int replace(Predicate<RefreshTokenRecord> match, Instant at) {
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

    /** Bilinmeyen ve bos jeton sessizce reddedilir. */
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

    /** Sir govdesi loga SIZMAZ: toString maskeler. */
    @Test
    void toStringNeverLeaksTheToken() {
        RefreshTokens.Issued issued = refreshTokens.issue(user, "web");

        assertThat(issued.toString()).doesNotContain(issued.token());
        assertThat(refreshTokens.rotate(issued.token(), "web").orElseThrow().toString())
                .doesNotContain("=" + issued.token());
    }
}
