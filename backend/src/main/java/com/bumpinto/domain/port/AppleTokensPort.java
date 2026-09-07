package com.bumpinto.domain.port;

import java.util.Optional;

/**
 * Apple sunucusuna giden tek kapi. Iki cagri da FAIL-OPEN: takas basarisiz olursa giris yine
 * tamamlanir (refresh token yalniz revoke icindir), revoke basarisiz olursa silme yine tamamlanir
 * (Apple 5.1.1(v) silmeyi Apple'in erisilebilirligine baglamaz).
 */
public interface AppleTokensPort {

    Optional<String> exchangeRefreshToken(String authorizationCode);

    void revoke(String refreshToken);
}
