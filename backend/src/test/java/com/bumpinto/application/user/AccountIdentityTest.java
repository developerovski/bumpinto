package com.bumpinto.application.user;

import com.bumpinto.domain.port.AppleTokensPort;
import com.bumpinto.support.FakeStores;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AccountIdentityTest {

    /** T8 (AccountDeletionTest) de bunu kullanir. */
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
}
