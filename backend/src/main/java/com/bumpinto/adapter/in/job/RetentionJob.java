package com.bumpinto.adapter.in.job;

import com.bumpinto.application.session.SessionRetention;
import com.bumpinto.application.user.AccountRetention;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Iki saklama supurmesinin tetikleyicisi: suresi dolan OTURUMLAR (spec §6 GDPR) ve 30 gunu
 * dolan SILINMIS HESAPLAR (B-14 R-B2 / K-B33). DRIVING (iceri) adaptor: use-case'leri disaridan
 * durtur, tipki adapter.in.web controller'lari gibi — bu yuzden infra'da degil burada durur.
 *
 * <p>K8s CronJob DEGIL (K-B30, 2026-09-07 kullanici karari): kumeyi kullanacagimizin garantisi
 * yok, tetikleyici uygulamanin kendisinde. Cok pod'da zamanlayici HER replikada koser; bunun
 * icin leader election ya da ShedLock gerekmiyor, iki depo da partiyi
 * {@code for update skip locked} ile aliyor ve replikalar AYRIK partiler goruyor.
 *
 * <p>{@code retentionScheduler}: B-13'un havuzu, pool size 1 — mekan indirgemesi ile bu is
 * ayni is parcaciginda SIRAYLA koser, STOMP heartbeat zamanlayicisina dokunmaz.
 */
@Component
@ConditionalOnProperty(prefix = "bumpinto.retention", name = "enabled", matchIfMissing = true)
public class RetentionJob {

    private static final Logger log = LoggerFactory.getLogger(RetentionJob.class);

    private final SessionRetention sessionRetention;
    private final AccountRetention accountRetention;

    RetentionJob(SessionRetention sessionRetention, AccountRetention accountRetention) {
        this.sessionRetention = sessionRetention;
        this.accountRetention = accountRetention;
    }

    /** Gunde bir, gece yarisindan sonra: silme partileri trafigin en dusuk oldugu saate denk gelsin. */
    @Scheduled(cron = "${bumpinto.retention.session-purge-cron}", zone = "UTC",
            scheduler = "retentionScheduler")
    public void run() {
        // Sira ONEMLI: once oturumlar. Host oturumu hesap silmede zaten gitti, ama oturum
        // supurmesi participants satirlarini da alir ve hesap silmesinin onune cikabilecek
        // referanslari azaltir.
        int purgedSessions = sessionRetention.purgeExpired();
        int purgedAccounts = accountRetention.purgeDeleted();
        // Log yalniz SAYI tasir: slug, ad, e-posta, koordinat ya da token loglanmaz.
        log.info("retention purge finished: {} sessions, {} accounts deleted",
                purgedSessions, purgedAccounts);
    }
}
