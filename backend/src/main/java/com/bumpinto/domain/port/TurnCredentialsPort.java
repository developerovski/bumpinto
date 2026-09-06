package com.bumpinto.domain.port;

import com.bumpinto.domain.voice.IceConfig;

import java.time.Duration;

/** Kisa omurlu TURN kimligi. Uygulanamiyorsa STUN'a duser, hic firlatmaz (K11). */
public interface TurnCredentialsPort {

    /**
     * {@code ttl} 60 saniye kadar kucuk olabilir: cagiran odanin kalan suresi + 60s gonderir,
     * kalan sure ZERO olabilir. Hic firlatmaz — uygulanamiyorsa STUN'a duser.
     */
    IceConfig issue(Duration ttl);
}
