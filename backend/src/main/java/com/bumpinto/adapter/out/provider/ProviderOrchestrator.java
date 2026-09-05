package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.VenueProviderPort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.VenueCandidate;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Kotaya gore saglayici secimi + sonuc onbellegi.
 *
 * <p>Siralama: kotasi tukenmemis saglayicilar, kalan oran ({@link ProviderQuota#ratio()})
 * buyukten kucuge; oran esit ya da kota bilinmiyorsa {@code @Order} sirasi. Ilk DOLU sonucu
 * donduren kazanir; bos donen ya da gecici hata veren atlanir. 429 gelirse saglayici
 * yenilenme anina kadar EXHAUSTED isaretlenir — sonraki aramalar ona hic gitmez.
 *
 * <p>Herkes hata verirse "mekan yok" DENMEZ: o yanit kullaniciya "cevrende hicbir sey yok"
 * der, oysa sorun bizde. Istisna yukari gider (500), log'da gorunur.
 */
@Component
@Primary
public class ProviderOrchestrator implements VenueProviderPort {

    private static final Logger log = LoggerFactory.getLogger(ProviderOrchestrator.class);

    private final List<QuotaAwareVenueProvider> providers;
    private final ProviderQuotaCache quotas;
    private final Clock clock;
    private final Cache<String, List<VenueCandidate>> results = Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(Duration.ofMinutes(30))
            .build();

    /** Spring, koleksiyona bean'in kendisini koymaz; liste {@code @Order} sirasindadir. */
    public ProviderOrchestrator(List<QuotaAwareVenueProvider> providers,
                                ProviderQuotaCache quotas, Clock clock) {
        if (providers.isEmpty()) {
            throw new IllegalStateException("no venue provider configured");
        }
        this.providers = List.copyOf(providers);
        this.quotas = quotas;
        this.clock = clock;
    }

    @Override
    public List<VenueCandidate> search(GeoPoint center, double radiusKm,
                                       List<ActivityType> types, int limit) {
        // Anahtar SIRADAN bagimsiz: {COFFEE,BAR} ile {BAR,COFFEE} ayni aramadir, ikincisi
        // ayni sonucu ikinci kez satin almamali. Ada gore alfabetik siralama kanonik bicimi verir.
        String canonical = types.stream().map(ActivityType::name).sorted()
                .collect(Collectors.joining("+"));
        String key = String.format(Locale.ROOT, "%.3f:%.3f:%.1f:%s:%d",
                center.lat(), center.lng(), radiusKm, canonical, limit);
        List<VenueCandidate> cached = results.getIfPresent(key);
        if (cached != null) {
            return cached;
        }
        List<VenueCandidate> result = searchRanked(center, radiusKm, types, limit);
        // BOS sonuc CACHE'LENMEZ: seyrek bolgede gecici bir bosluk 30 dk boyunca
        // "mekan yok"a donusurdu. Hata durumu da cache'lenmez (istisna yukari gider).
        if (!result.isEmpty()) {
            results.put(key, result);
        }
        return result;
    }

    /** Secim sirasi — test ve teshis icin acik. */
    List<QuotaAwareVenueProvider> ranked(Instant now) {
        return providers.stream()
                .filter(p -> quotas.get(p.id()).map(q -> q.available(now)).orElse(true))
                // Stabil sort: oran esitse @Order korunur.
                .sorted(Comparator.comparingDouble(
                        (QuotaAwareVenueProvider p) -> ratio(p, now)).reversed())
                .toList();
    }

    private double ratio(QuotaAwareVenueProvider p, Instant now) {
        Optional<ProviderQuota> q = quotas.get(p.id());
        // Kota bilinmiyor: bilinenlerin ARKASINA degil, @Order'a gore aralarina girmesin
        // diye 0 — bilinen kotasi olan her saglayici bilinmeyenden once gelir.
        return q.map(ProviderQuota::ratio).orElse(0.0);
    }

    private List<VenueCandidate> searchRanked(GeoPoint center, double radiusKm,
                                              List<ActivityType> types, int limit) {
        Instant now = clock.instant();
        RuntimeException lastFailure = null;
        for (QuotaAwareVenueProvider provider : ranked(now)) {
            try {
                List<VenueCandidate> result = provider.search(center, radiusKm, types, limit);
                if (!result.isEmpty()) {
                    // Hangi saglayicinin desteyi urettigi loglardan izlenir (kota satirlariyla
                    // birlikte okununca "neden Google'a dustuk" sorusunu cevaplar).
                    log.info("venues from {}: {} results for {} r={}km", provider.id(),
                            result.size(), types, radiusKm);
                    return result;
                }
            } catch (QuotaExceededException e) {
                quotas.exhaust(provider.id(), e.resetAt(), now);
                log.warn("{} quota exhausted until {}: {}", provider.id(), e.resetAt(),
                        e.getMessage());
                lastFailure = e;
            } catch (RuntimeException e) {
                // Gecici aksaklik: yalniz bu cagri dusuyor, kota durumu degismiyor.
                log.warn("{} search failed, trying next provider: {}", provider.id(),
                        e.getMessage());
                lastFailure = e;
            }
        }
        if (lastFailure != null) {
            throw lastFailure;
        }
        return List.of();
    }
}
