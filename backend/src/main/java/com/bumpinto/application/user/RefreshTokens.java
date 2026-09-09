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

    /** Istemciye giden, TEK SEFER okunabilir deger + son kullanma. */
    public record Issued(String token, Instant expiresAt) {

        @Override
        public String toString() {
            return "Issued[token=***, expiresAt=" + expiresAt + "]";
        }
    }

    /** Rotasyon sonucu: yeni jeton + sahibi (erisim jetonu onun icin basilir). */
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
     * sozluk/kaba kuvvet saldirisi anlamsiz, buna karsilik arama HER yenilemede olur ve
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
