package com.bumpinto.infra.security;

import com.bumpinto.infra.config.AppProps;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.github.benmanes.caffeine.cache.LoadingCache;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.UriUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.regex.Pattern;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE) // güvenlik zincirinden önce — ucuz reddet
public class RateLimitFilter extends OncePerRequestFilter {

    /** capacity = dakikadaki istek hakkı (greedy refill). */
    public record Policy(String id, String method, Pattern path, int capacity) {
    }

    /**
     * Son çare kovası: hiçbir politikaya uymayan istek LİMİTSİZ kalmaz (fail-closed).
     * Eşleme bir gün yine kaçırılırsa (yeni bir kodlama numarası, unutulan bir uç) saldırgan
     * 5/dk yerine 240/dk'ya düşer — sınırsıza değil. Tuned bir politika değil, emniyet ağıdır;
     * bu yüzden en geniş gerçek politikadan (api 120) bilinçli olarak gevşek.
     */
    static final Policy FALLBACK = new Policy("fallback", null, Pattern.compile("^.*$"), 240);

    static List<Policy> defaultPolicies() {
        return List.of(
                new Policy("auth", "POST", Pattern.compile("^/api/auth/google$"), 5),
                new Policy("join", "POST", Pattern.compile("^/api/sessions/[^/]+/participants$"), 10),
                new Policy("find", "POST", Pattern.compile("^/api/sessions/[^/]+/find-venues$"), 3),
                new Policy("create", "POST", Pattern.compile("^/api/sessions$"), 10),
                // Handshake kendi kovasinda: yoksa /api altina tasinmasi onu sessizce 240'tan
                // (fallback) 120'ye (api) dusururdu. 240 BILINCLI: TRUST_FORWARDED_FOR
                // varsayilan false oldugu icin ingress arkasinda TUM istemciler tek kovayi
                // paylasir; backend restart'indan sonra 5 sn'de bir yeniden baglanan bir grup
                // daha dar bir kovayi aninda tuketir ve presence hic dolmaz.
                new Policy("ws", "GET", Pattern.compile("^/api/sessions/[^/]+/ws$"), 240),
                new Policy("api", null, Pattern.compile("^/api/.*"), 120));
    }

    private final List<Policy> policies;
    private final boolean trustForwardedFor;
    // Tek pod için in-memory yeterli; çoklu pod'da bucket4j-redis'e geçilir (spec §3 Redis notu)
    private final LoadingCache<String, Bucket> buckets = Caffeine.newBuilder()
            .maximumSize(100_000)
            .expireAfterAccess(Duration.ofMinutes(10))
            .build(RateLimitFilter::newBucket);

    /** Iki ctor var; isaretlenmezse Spring no-arg arar ve acilista patlar (bkz. GoogleIdVerifier). */
    @Autowired
    public RateLimitFilter(AppProps props) {
        this(defaultPolicies(),
                props.rateLimit() != null && props.rateLimit().trustForwardedFor());
    }

    RateLimitFilter(List<Policy> policies, boolean trustForwardedFor) {
        this.policies = policies;
        this.trustForwardedFor = trustForwardedFor;
    }

    private static Bucket newBucket(String key) {
        int capacity = Integer.parseInt(key.substring(0, key.indexOf(':')));
        return Bucket.builder()
                .addLimit(limit -> limit.capacity(capacity)
                        .refillGreedy(capacity, Duration.ofMinutes(1)))
                .build();
    }

    /**
     * Sayaçları sıfırlar. Kova durumu kalıcı değildir (pod restart'ı da sıfırlar);
     * entegrasyon testleri her testi taze kovayla başlatmak için bunu çağırır.
     */
    public void reset() {
        buckets.invalidateAll();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String path = normalizedPath(request);
        Policy match = policies.stream()
                .filter(p -> (p.method() == null || p.method().equals(request.getMethod()))
                        && p.path().matcher(path).matches())
                .findFirst()
                .orElse(FALLBACK);
        String key = match.capacity() + ":" + match.id() + ":" + clientIp(request);
        if (buckets.get(key).tryConsume(1)) {
            chain.doFilter(request, response);
            return;
        }
        response.setStatus(429);
        response.setHeader("Retry-After", "60");
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"too many requests\"}");
    }

    /**
     * Spring MVC DECODE EDİLMİŞ yolla route eder; ham {@code getRequestURI()} üstünde eşlemek
     * "/%61pi/auth/google"in hiçbir politikaya düşmemesine, "/api/auth/%67oogle"un ise auth
     * (5/dk) yerine catch-all (120/dk) kovasına düşmesine izin verirdi. StrictHttpFirewall bu
     * kodlamaları engellemez ve zaten bu filtreden SONRA çalışır.
     * Bozuk yüzde dizisi çözülemezse ham değer kullanılır — eşleşmezse FALLBACK devreye girer.
     */
    private static String normalizedPath(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if (uri == null || uri.isEmpty()) {
            return "/";
        }
        String decoded;
        try {
            decoded = UriUtils.decode(uri, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException malformedEncoding) {
            decoded = uri;
        }
        return StringUtils.cleanPath(decoded);
    }

    /**
     * Varsayılan GÜVENLİ: X-Forwarded-For istemcinin uydurabileceği bir header'dır, ona
     * güvenmek rate limit'i baypas edilebilir kılar. {@code bumpinto.rate-limit
     * .trust-forwarded-for} YALNIZCA header'ı ezerek yeniden yazan bir ingress arkasında açılır.
     */
    private String clientIp(HttpServletRequest request) {
        if (!trustForwardedFor) {
            return request.getRemoteAddr();
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        return forwarded == null || forwarded.isBlank()
                ? request.getRemoteAddr() : forwarded.split(",")[0].strip();
    }
}
