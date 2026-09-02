package com.bumpinto.infra.security;

import com.bumpinto.infra.config.AppProps;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.time.Duration;
import java.util.List;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitFilterTest {

    static final RateLimitFilter.Policy TINY =
            new RateLimitFilter.Policy("join", "POST", Pattern.compile("^/api/x$"), 2);

    /** Uretim yolu: filtre AppProps'tan kurulur — varsayilan GUVENLI olmali. */
    static AppProps props(boolean trustForwardedFor) {
        return new AppProps(
                new AppProps.Security("cid", "0123456789abcdef0123456789abcdef",
                        Duration.ofHours(12)),
                new AppProps.Providers("", ""),
                new AppProps.Cors(List.of()),
                new AppProps.Cookies(false, ""),
                new AppProps.RateLimit(trustForwardedFor),
                new AppProps.Quota(Duration.ofMinutes(5), 5000));
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
