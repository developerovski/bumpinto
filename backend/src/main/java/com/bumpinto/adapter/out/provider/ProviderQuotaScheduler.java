package com.bumpinto.adapter.out.provider;

import com.bumpinto.infra.config.AppProps;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * Her {@code bumpinto.quota.refresh} (varsayilan 5 dk) saglayicilarin kotasini olcup
 * {@link ProviderQuotaCache}'e yazar.
 *
 * <p>Iki fren, ikisi de para icin: (1) cache o pencerede zaten tazelendiyse (gercek bir
 * aramanin HEADER'i) prob atilmaz — FSQ probu ucretli bir Pro cagrisidir, 5 dk'da bir
 * bosuna atmak tek basina aylik ucretsiz 500'u yer; (2) 429 ile EXHAUSTED isaretlenmis
 * saglayici, yenilenme ani gelmeden problanmaz — cevabi zaten biliyoruz.
 */
@Component
public class ProviderQuotaScheduler {

    private static final Logger log = LoggerFactory.getLogger(ProviderQuotaScheduler.class);

    private final List<QuotaAwareVenueProvider> providers;
    private final ProviderQuotaCache cache;
    private final Clock clock;
    private final Duration refresh;

    public ProviderQuotaScheduler(List<QuotaAwareVenueProvider> providers,
                                  ProviderQuotaCache cache, Clock clock, AppProps props) {
        this.providers = providers;
        this.cache = cache;
        this.clock = clock;
        this.refresh = props.quota().refresh();
    }

    /** Ilk tur da bir aralik sonra: testler ve kisa omurlu prosesler gercek API'ye vurmasin. */
    @Scheduled(fixedDelayString = "${bumpinto.quota.refresh:PT5M}",
               initialDelayString = "${bumpinto.quota.refresh:PT5M}")
    public void refresh() {
        Instant now = clock.instant();
        for (QuotaAwareVenueProvider provider : providers) {
            if (shouldMeasure(provider.id(), now)) {
                try {
                    cache.record(provider.measureQuota());
                } catch (RuntimeException e) {
                    // Bir saglayicinin olcumu digerlerini durdurmaz; eski deger cache'te kalir.
                    log.warn("quota measurement failed for {}: {}", provider.id(), e.getMessage());
                }
            }
            // Her turda, prob atilsin atilmasin, bilinen son durum INFO'ya yazilir: kalan kota
            // loglardan izlenir (Grafana yok), 5 dk'lik bir satir bunun icin yeterli.
            cache.get(provider.id()).ifPresentOrElse(
                    q -> log.info("quota {}: {}/{} ({}%) resets {} [{}]", q.provider(),
                            q.remaining(), q.limit(), Math.round(q.ratio() * 100), q.resetAt(),
                            q.source()),
                    () -> log.info("quota {}: unknown", provider.id()));
        }
    }

    boolean shouldMeasure(String provider, Instant now) {
        return cache.get(provider)
                .map(q -> switch (q.source()) {
                    case EXHAUSTED -> !now.isBefore(q.resetAt());
                    default -> !q.isFresherThan(now.minus(refresh));
                })
                .orElse(true);
    }
}
