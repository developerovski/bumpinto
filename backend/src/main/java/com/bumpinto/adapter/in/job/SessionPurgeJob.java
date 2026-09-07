package com.bumpinto.adapter.in.job;

import com.bumpinto.application.session.SessionRetention;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Spec §6 purge'unun tetikleyicisi. DRIVING (iceri) adaptor: use-case'i disaridan durtur,
 * tipki adapter.in.web controller'lari gibi — bu yuzden infra'da degil burada durur.
 *
 * <p>K8s CronJob DEGIL (K-B30, 2026-09-07 kullanici karari): kumeyi kullanacagimizin garantisi
 * yok, tetikleyici uygulamanin kendisinde. Cok pod'da zamanlayici HER replikada koser; bunun
 * icin leader election ya da ShedLock gerekmiyor, {@code SessionRetentionRepository} partiyi
 * {@code for update skip locked} ile aliyor ve replikalar AYRIK partiler goruyor.
 *
 * <p>{@code retentionScheduler}: B-13'un havuzu, pool size 1 — mekan indirgemesi ile oturum
 * purge'u ayni is parcaciginda SIRAYLA koser, STOMP heartbeat zamanlayicisina dokunmaz.
 */
@Component
@ConditionalOnProperty(prefix = "bumpinto.retention", name = "enabled", matchIfMissing = true)
public class SessionPurgeJob {

    private static final Logger log = LoggerFactory.getLogger(SessionPurgeJob.class);

    private final SessionRetention retention;

    SessionPurgeJob(SessionRetention retention) {
        this.retention = retention;
    }

    /** Gunde bir, gece yarisindan sonra: silme partileri trafigin en dusuk oldugu saate denk gelsin. */
    @Scheduled(cron = "${bumpinto.retention.session-purge-cron}", zone = "UTC",
            scheduler = "retentionScheduler")
    public void run() {
        int purged = retention.purgeExpired();
        // Log yalniz SAYI tasir: slug, ad, koordinat ya da token loglanmaz.
        log.info("retention purge finished: {} sessions deleted", purged);
    }
}
