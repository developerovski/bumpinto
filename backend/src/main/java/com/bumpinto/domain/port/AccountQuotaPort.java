package com.bumpinto.domain.port;

import java.time.Duration;
import java.util.UUID;

/**
 * HESAP basina kota. Neden {@code RateLimitFilter} degil: o filtre
 * {@code @Order(HIGHEST_PRECEDENCE)} ile guvenlik zincirinden ONCE kosar ve elinde yalniz IP
 * vardir. "Kullanici basina 1/saat" kurali orada YAZILAMAZ — kimliksiz bir istek o saatin tek
 * jetonunu 401 almadan once yakabilir, ve {@code TRUST_FORWARDED_FOR} kapaliyken ingress
 * arkasindaki TUM kurulum tek kovayi paylasir (K-B34). Bu kapi kimligin ARKASINDA durur.
 *
 * <p>Ikinci bir hiz-siniri mekanizmasi degil, ayni kuralin dogru KATMANI: IP kovasi anonim
 * uclari korur, bu kova hesap kimligi gerektiren uclari.
 */
@FunctionalInterface
public interface AccountQuotaPort {

    /** Hak varsa true doner VE tuketir; yoksa false. */
    boolean tryConsume(String quotaId, UUID accountId, Duration window);
}
