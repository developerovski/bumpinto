package com.bumpinto.infra.security;

import com.bumpinto.infra.config.AppProps;
import com.bumpinto.support.TestProps;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.time.Duration;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitFilterTest {

    static final RateLimitFilter.Policy TINY =
            new RateLimitFilter.Policy("join", "POST", Pattern.compile("^/api/x$"), 2);

    /** Uretim yolu: filtre AppProps'tan kurulur — varsayilan GUVENLI olmali. */
    static AppProps props(boolean trustForwardedFor) {
        return TestProps.of(new AppProps.RateLimit(trustForwardedFor));
    }

    static MockHttpServletRequest post(String ip) {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/x");
        req.setRemoteAddr(ip);
        return req;
    }

    @Test
    void blocksAfterCapacityPerIpAndSetsRetryAfter() throws Exception {
        RateLimitFilter filter = new RateLimitFilter(List.of(TINY), false);

        for (int i = 0; i < 2; i++) {
            MockHttpServletResponse ok = new MockHttpServletResponse();
            filter.doFilter(post("1.2.3.4"), ok, new MockFilterChain());
            assertThat(ok.getStatus()).isEqualTo(200);
        }
        MockHttpServletResponse blocked = new MockHttpServletResponse();
        filter.doFilter(post("1.2.3.4"), blocked, new MockFilterChain());
        assertThat(blocked.getStatus()).isEqualTo(429);
        assertThat(blocked.getHeader("Retry-After")).isEqualTo("60");

        // farklı IP ayrı kova
        MockHttpServletResponse other = new MockHttpServletResponse();
        filter.doFilter(post("5.6.7.8"), other, new MockFilterChain());
        assertThat(other.getStatus()).isEqualTo(200);
    }

    /**
     * Fail-closed: politikaya uymayan yol da bir kovaya düşer. Eşleme bir gün yine kaçırılırsa
     * (kodlama numarası, unutulan uç) istek limitsiz kalmaz.
     */
    @Test
    void unmatchedPathFallsBackToTheDefaultBucket() throws Exception {
        RateLimitFilter filter = new RateLimitFilter(List.of(TINY), false);
        assertThat(RateLimitFilter.FALLBACK.capacity()).isEqualTo(240);
        assertCapacity(filter, 240, "GET", "/actuator/health");
    }

    /** Opt-in AÇIKKEN X-Forwarded-For istemciyi ayırır — aynı remoteAddr, ayrı kova. */
    @Test
    void forwardedForKeysTheBucketWhenTrustEnabled() throws Exception {
        RateLimitFilter filter = new RateLimitFilter(List.of(TINY), true);

        for (int i = 0; i < 2; i++) {
            MockHttpServletRequest req = post("10.0.0.1");
            req.addHeader("X-Forwarded-For", "9.9.9.9, 10.0.0.1");
            MockHttpServletResponse ok = new MockHttpServletResponse();
            filter.doFilter(req, ok, new MockFilterChain());
            assertThat(ok.getStatus()).isEqualTo(200);
        }
        MockHttpServletRequest third = post("10.0.0.1");
        third.addHeader("X-Forwarded-For", "9.9.9.9, 10.0.0.1");
        MockHttpServletResponse blocked = new MockHttpServletResponse();
        filter.doFilter(third, blocked, new MockFilterChain());
        assertThat(blocked.getStatus()).isEqualTo(429);

        MockHttpServletRequest otherClient = post("10.0.0.1");
        otherClient.addHeader("X-Forwarded-For", "8.8.8.8, 10.0.0.1");
        MockHttpServletResponse ok = new MockHttpServletResponse();
        filter.doFilter(otherClient, ok, new MockFilterChain());
        assertThat(ok.getStatus()).isEqualTo(200);
    }

    /**
     * Varsayılan GÜVENLİ: header'a güvenilmediğinde istemci X-Forwarded-For uydurarak
     * limiti baypas edemez — hepsi aynı remoteAddr kovasına düşer.
     */
    @Test
    void spoofedForwardedForCannotBypassLimitByDefault() throws Exception {
        RateLimitFilter filter = new RateLimitFilter(List.of(TINY), false);

        for (int i = 0; i < 2; i++) {
            MockHttpServletRequest req = post("10.0.0.1");
            req.addHeader("X-Forwarded-For", "1.1.1." + i);
            MockHttpServletResponse ok = new MockHttpServletResponse();
            filter.doFilter(req, ok, new MockFilterChain());
            assertThat(ok.getStatus()).isEqualTo(200);
        }
        MockHttpServletRequest spoofed = post("10.0.0.1");
        spoofed.addHeader("X-Forwarded-For", "9.9.9.9");
        MockHttpServletResponse blocked = new MockHttpServletResponse();
        filter.doFilter(spoofed, blocked, new MockFilterChain());
        assertThat(blocked.getStatus()).isEqualTo(429);
    }

    /** Ayarın filtreye BAĞLANDIĞI yol: AppProps.rateLimit iki modu da gerçekten değiştirir. */
    @Test
    void appPropsDecidesWhetherForwardedForIsTrusted() throws Exception {
        assertThat(spoofStatus(new RateLimitFilter(props(false)))).isEqualTo(429);
        assertThat(spoofStatus(new RateLimitFilter(props(true)))).isEqualTo(200);
    }

    /** Aynı remoteAddr'den "find" limitini (3) doldurup 4. isteği sahte XFF ile dener. */
    private static int spoofStatus(RateLimitFilter filter) throws Exception {
        for (int i = 0; i < 3; i++) {
            filter.doFilter(request("POST", FIND_VENUES), new MockHttpServletResponse(),
                    new MockFilterChain());
        }
        MockHttpServletRequest spoofed = request("POST", FIND_VENUES);
        spoofed.addHeader("X-Forwarded-For", "9.9.9.9");
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(spoofed, res, new MockFilterChain());
        return res.getStatus();
    }

    /**
     * Üretim politikalarının kapasiteleri spec'te sabitlenmiştir; biri 5 yerine 50 yazarsa
     * burası kırmızıya döner. Aynı filtre üstünde sırayla doldurulmaları kovaların
     * politika bazında ayrı olduğunu da gösterir (auth tükenirken join hâlâ 200).
     */
    @Test
    void defaultPoliciesEnforceSpecCapacities() throws Exception {
        RateLimitFilter filter = new RateLimitFilter(RateLimitFilter.defaultPolicies(), false);

        assertCapacity(filter, 5, "POST", "/api/auth/google");
        assertCapacity(filter, 10, "POST", "/api/sessions/x7k2m/participants");
        assertCapacity(filter, 3, "POST", FIND_VENUES);
        assertCapacity(filter, 10, "POST", "/api/sessions");
        assertCapacity(filter, 120, "GET", "/api/sessions/x7k2m"); // catch-all
        assertCapacity(filter, 30, "POST", "/api/geocode");
        // R-B9: kod ucu KENDI kovasinda; catch-all'a duserse kaba kuvvet 10 degil 120/dk olurdu.
        assertCapacity(filter, 10, "GET", "/api/sessions/by-code/X7K2M");
        // R-B10: OG karti /api ALTINDA DEGIL — kendi politikasi olmasa 240'lik FALLBACK'te kalirdi.
        assertCapacity(filter, 60, "GET", "/og/x7k2m.png");
    }

    /**
     * Saatlik bir pencere kova ANAHTARINDA da taşınmalı — yoksa kovayı kuran {@code newBucket}
     * onu göremez ve sessizce 1 dakikaya düşer. Politika sentetiktir: bugün gönderilen hiçbir
     * politika dakikadan uzun değil (bkz. {@code shippedPoliciesDoNotKeepAnHourlyBucketOnIp}),
     * ama dikiş korunmalı.
     */
    @Test
    void anHourlyPolicyRefillsHourlyNotEveryMinute() throws Exception {
        RateLimitFilter.Policy hourly = new RateLimitFilter.Policy("hourly", "GET",
                Pattern.compile("^/api/me/export$"), 1, Duration.ofHours(1));

        RateLimitFilter filter = new RateLimitFilter(List.of(hourly), false);
        assertCapacity(filter, 1, "GET", "/api/me/export");
        // Retry-After penceredendir: saatlik kovaya "60 sn sonra dene" yeniden deneme fırtınasıdır.
        MockHttpServletResponse blocked = new MockHttpServletResponse();
        filter.doFilter(request("GET", "/api/me/export"), blocked, new MockFilterChain());
        assertThat(blocked.getHeader("Retry-After")).isEqualTo("3600");
    }

    /**
     * K-B34 regresyonu: dışa aktarmanın 1/saat kuralı BURADA olamaz. Filtre
     * {@code @Order(HIGHEST_PRECEDENCE)} ile güvenlik zincirinden ÖNCE koşar ve elinde yalnız IP
     * vardır — kimliksiz bir istek o saatin tek jetonunu 401 almadan yakar, ve
     * {@code TRUST_FORWARDED_FOR} kapalıyken ingress arkasında TÜM kurulum tek kovayı paylaşır.
     * Kural {@code UserDataExport}'a (hesap kimliği) taşındı; burada uç yalnız "api" kovasında
     * (120/dk) kalır: kimliksiz seli ucuz reddeder, gerçek limiti kurmaz.
     */
    @Test
    void shippedPoliciesDoNotKeepAnHourlyBucketOnIp() {
        RateLimitFilter.Policy match = RateLimitFilter.defaultPolicies().stream()
                .filter(p -> (p.method() == null || p.method().equals("GET"))
                        && p.path().matcher("/api/me/export").matches())
                .findFirst().orElse(RateLimitFilter.FALLBACK);

        assertThat(match.id()).isEqualTo("api");
        assertThat(RateLimitFilter.defaultPolicies())
                .allSatisfy(p -> assertThat(p.window()).isEqualTo(Duration.ofMinutes(1)));
    }

    /**
     * Kova ÖNBELLEĞİ penceresinden uzun yaşamalı. Caffeine girdiyi erken atarsa bir sonraki
     * istek kovayı DOLU olarak yeniden kurar: tahliye bedava bir sıfırlamadır. Eski sabit
     * 10 dk'lık TTL, 1 saatlik export kovasını 1/saat değil ~6/saat yapıyordu.
     */
    @Test
    void bucketCacheOutlivesTheLongestPolicyWindow() {
        Duration longest = RateLimitFilter.defaultPolicies().stream()
                .map(RateLimitFilter.Policy::window).max(Comparator.naturalOrder()).orElseThrow();
        assertThat(RateLimitFilter.bucketTtl(RateLimitFilter.defaultPolicies()))
                .isGreaterThan(longest)
                .isGreaterThan(Duration.ofMinutes(10)); // eski sabit TTL
    }

    /** TTL TÜRETİLİR: yarın 1 günlük bir politika eklenirse aynı hata sessizce geri gelmemeli. */
    @Test
    void bucketTtlFollowsAPolicyLongerThanAnyShippedToday() {
        RateLimitFilter.Policy daily = new RateLimitFilter.Policy("daily", "GET",
                Pattern.compile("^/api/x$"), 1, Duration.ofDays(1));
        assertThat(RateLimitFilter.bucketTtl(List.of(daily))).isGreaterThan(Duration.ofDays(1));
        // Politika listesi kısa olsa da FALLBACK'in penceresi hep hesaba katılır.
        assertThat(RateLimitFilter.bucketTtl(List.of()))
                .isGreaterThanOrEqualTo(RateLimitFilter.FALLBACK.window());
    }

    /**
     * Dikiş testi: türetme doğru olsa bile Caffeine builder'ına BAĞLANMAMIŞ olabilir.
     * İki farklı politika seti iki farklı TTL vermeli — builder'a sabit bir sayı yazılırsa
     * (eski `Duration.ofMinutes(10)`) ikisi eşitlenir ve bu test kırılır.
     */
    @Test
    void cacheIsBuiltWithTheDerivedTtlNotAHardcodedOne() {
        List<RateLimitFilter.Policy> shipped = RateLimitFilter.defaultPolicies();
        assertThat(new RateLimitFilter(shipped, false).configuredBucketTtl())
                .isEqualTo(RateLimitFilter.bucketTtl(shipped));

        List<RateLimitFilter.Policy> daily = List.of(new RateLimitFilter.Policy("daily", "GET",
                Pattern.compile("^/api/x$"), 1, Duration.ofDays(1)));
        assertThat(new RateLimitFilter(daily, false).configuredBucketTtl())
                .isEqualTo(RateLimitFilter.bucketTtl(daily))
                .isGreaterThan(Duration.ofDays(1));
    }

    /** Pencere alanı EKLENDİ; eski 4'lü ctor'un anlamı (1 dk) değişmemeli. */
    @Test
    void existingPoliciesKeepTheOneMinuteWindow() {
        assertThat(TINY.window()).isEqualTo(Duration.ofMinutes(1));
        assertThat(RateLimitFilter.FALLBACK.window()).isEqualTo(Duration.ofMinutes(1));
        assertThat(RateLimitFilter.defaultPolicies())
                .allSatisfy(p -> assertThat(p.window()).isEqualTo(Duration.ofMinutes(1)));
    }

    /**
     * URL kodlaması eşlemeyi baypas edemez: ham URI üstünde eşlerken "/%61pi/auth/google"
     * HİÇBİR politikaya (catch-all dahil) düşmüyordu ama controller'a ulaşıyordu.
     */
    @Test
    void percentEncodedPathPrefixStillHitsItsPolicy() throws Exception {
        RateLimitFilter filter = new RateLimitFilter(RateLimitFilter.defaultPolicies(), false);
        assertCapacity(filter, 5, "POST", "/%61pi/auth/google");
    }

    /** Kodlanmış segment auth kovasında (5) kalır; catch-all'a (120) kaçamaz. */
    @Test
    void percentEncodedSegmentDoesNotEscapeIntoTheLooserBucket() throws Exception {
        RateLimitFilter filter = new RateLimitFilter(RateLimitFilter.defaultPolicies(), false);
        assertCapacity(filter, 5, "POST", "/api/auth/%67oogle");
    }

    /** capacity kadar istek geçer, bir sonraki 429 olur. */
    private static void assertCapacity(RateLimitFilter filter, int capacity,
                                       String method, String path) throws Exception {
        for (int i = 0; i < capacity; i++) {
            MockHttpServletResponse ok = new MockHttpServletResponse();
            filter.doFilter(request(method, path), ok, new MockFilterChain());
            assertThat(ok.getStatus()).as("%s %s istek #%d", method, path, i + 1).isEqualTo(200);
        }
        MockHttpServletResponse blocked = new MockHttpServletResponse();
        filter.doFilter(request(method, path), blocked, new MockFilterChain());
        assertThat(blocked.getStatus()).as("%s %s kapasite %d asildi", method, path, capacity)
                .isEqualTo(429);
    }

    private static final String FIND_VENUES = "/api/sessions/x7k2m/find-venues";

    private static MockHttpServletRequest request(String method, String path) {
        MockHttpServletRequest req = new MockHttpServletRequest(method, path);
        req.setRemoteAddr("1.2.3.4");
        return req;
    }
}
