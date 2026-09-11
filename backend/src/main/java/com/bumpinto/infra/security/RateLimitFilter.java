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
import java.util.Comparator;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Stream;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE) // güvenlik zincirinden önce — ucuz reddet
public class RateLimitFilter extends OncePerRequestFilter {

    /** capacity = {@code window} başına istek hakkı (greedy refill). */
    public record Policy(String id, String method, Pattern path, int capacity, Duration window) {

        /** Varsayılan pencere 1 dakika: mevcut politikaların hepsi böyleydi. */
        public Policy(String id, String method, Pattern path, int capacity) {
            this(id, method, path, capacity, Duration.ofMinutes(1));
        }
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
                new Policy("auth-apple", "POST", Pattern.compile("^/api/auth/apple$"), 5),
                new Policy("join", "POST", Pattern.compile("^/api/sessions/[^/]+/participants$"), 10),
                new Policy("find", "POST", Pattern.compile("^/api/sessions/[^/]+/find-venues$"), 3),
                new Policy("create", "POST", Pattern.compile("^/api/sessions$"), 10),
                new Policy("delete-account", "DELETE", Pattern.compile("^/api/me$"), 3),
                new Policy("report", "POST", Pattern.compile("^/api/reports$"), 5),
                // Handshake kendi kovasinda: yoksa /api altina tasinmasi onu sessizce 240'tan
                // (fallback) 120'ye (api) dusururdu. 240 BILINCLI: TRUST_FORWARDED_FOR
                // varsayilan false oldugu icin ingress arkasinda TUM istemciler tek kovayi
                // paylasir; backend restart'indan sonra 5 sn'de bir yeniden baglanan bir grup
                // daha dar bir kovayi aninda tuketir ve presence hic dolmaz.
                new Policy("ws", "GET", Pattern.compile("^/api/sessions/[^/]+/ws$"), 240),
                // Ingress arkasinda TRUST_FORWARDED_FOR kapaliyken tum istemciler tek kovadadir; 30/dk pay birakir.
                new Policy("geocode", "POST", Pattern.compile("^/api/geocode(/reverse)?$"), 30),
                // R-B6'nin "1/saat" kurali BURADA DEGIL: bu filtre guvenlik zincirinden once
                // kosar ve elinde yalniz IP vardir. IP'ye anahtarlanmis saatlik bir kova,
                // TRUST_FORWARDED_FOR kapaliyken ingress arkasindaki TUM kurulumu saatte tek
                // dosyaya indiriyordu ve kimliksiz bir istek o jetonu 401 almadan yakabiliyordu
                // (K-B34). Kural hesap kimliginin ARKASINA tasindi (AccountQuotaPort);
                // /api/me/export burada "api" kovasinda (120/dk, IP) kalir — kimliksiz seli
                // ucuz reddeder, gercek limiti kurmaz.
                // R-B9: kod uzayi 32^5 ama 10/dk kaba kuvveti anlamsiz kilar.
                new Policy("bycode", "GET", Pattern.compile("^/api/sessions/by-code/[^/]+$"), 10),
                // B-17: Kesfet listesi filtre degistikce yeniden cekilir; 60/dk kaydirmali bir
                // filtre seridine yeter, kazimaya yetmez.
                new Policy("discover", "GET", Pattern.compile("^/api/discover$"), 60),
                // Katilim istegi yazar ve host'un panelinde gorunur: 10/dk zaten comert.
                new Policy("seat", "POST",
                        Pattern.compile("^/api/sessions/[^/]+/seat-requests$"), 10),
                // R-B10: OG karti /api ALTINDA DEGIL, yani catch-all'a hic dusmez; kendi
                // politikasi olmasa 240'lik FALLBACK'te kalirdi. 60/dk onizleme botlarinin
                // ayni linki paralel cekmesine yeter (render zaten surec ici onbellekli).
                new Policy("og", "GET", Pattern.compile("^/og/.*"), 60),
                new Policy("api", null, Pattern.compile("^/api/.*"), 120));
    }

    /** Pencerenin uzerine pay: greedy refill son damlayi pencerenin TAM sonunda koyar. */
    static final Duration EVICTION_MARGIN = Duration.ofMinutes(10);

    /**
     * Kova penceresi DOLANA KADAR yasamali. Erken tahliye edilen kova bir sonraki istekte DOLU
     * dogar — yani tahliye bedava bir sifirlamadir: 10 dk'lik sabit TTL, 1 saatlik export
     * kovasini 1/saat degil ~6/saat yapardi. TTL bu yuzden en uzun pencereden TURETILIR;
     * sabit bir sayi, ileride eklenen daha uzun bir politikada ayni hatayi sessizce geri getirir.
     * FALLBACK de hesaba katilir: eslesmeyen istek onun kovasina duser.
     */
    static Duration bucketTtl(List<Policy> policies) {
        return Stream.concat(policies.stream(), Stream.of(FALLBACK))
                .map(Policy::window)
                .max(Comparator.naturalOrder())
                .orElseThrow()
                .plus(EVICTION_MARGIN);
    }

    private final List<Policy> policies;
    private final boolean trustForwardedFor;
    // Tek pod için in-memory yeterli; çoklu pod'da bucket4j-redis'e geçilir (spec §3 Redis notu)
    private final LoadingCache<String, Bucket> buckets;

    /** Iki ctor var; isaretlenmezse Spring no-arg arar ve acilista patlar (bkz. GoogleIdVerifier). */
    @Autowired
    public RateLimitFilter(AppProps props) {
        this(defaultPolicies(),
                props.rateLimit() != null && props.rateLimit().trustForwardedFor());
    }

    RateLimitFilter(List<Policy> policies, boolean trustForwardedFor) {
        this.policies = policies;
        this.trustForwardedFor = trustForwardedFor;
        // expireAfterWrite DEGIL: o, surekli dovulen bir kovayi da suresi dolunca sifirlar ve
        // saldirgana periyodik bedava reset verir. Erisimden sayilmali. Bellek maximumSize'la sinirli.
        this.buckets = Caffeine.newBuilder()
                .maximumSize(100_000)
                .expireAfterAccess(bucketTtl(policies))
                .build(RateLimitFilter::newBucket);
    }

    /** Anahtar kovanın SEKLINI de tasir: capacity ya da pencere degisirse ayri kova acilir. */
    private static Bucket newBucket(String key) {
        String[] parts = key.split(":", 3);
        int capacity = Integer.parseInt(parts[0]);
        Duration window = Duration.ofSeconds(Long.parseLong(parts[1]));
        return Bucket.builder()
                .addLimit(limit -> limit.capacity(capacity).refillGreedy(capacity, window))
                .build();
    }

    /**
     * Sayaçları sıfırlar. Kova durumu kalıcı değildir (pod restart'ı da sıfırlar);
     * entegrasyon testleri her testi taze kovayla başlatmak için bunu çağırır.
     */
    public void reset() {
        buckets.invalidateAll();
    }

    /**
     * Önbelleğin GERÇEKTEN kurulduğu TTL. {@link #bucketTtl} doğru olup builder'a bağlanmamış
     * olabilir; o dikiş yalnız buradan görülür (kova erken tahliye = bedava sıfırlama).
     */
    Duration configuredBucketTtl() {
        return buckets.policy().expireAfterAccess().orElseThrow().getExpiresAfter();
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
        String key = match.capacity() + ":" + match.window().toSeconds() + ":" + match.id()
                + ":" + clientIp(request);
        if (buckets.get(key).tryConsume(1)) {
            chain.doFilter(request, response);
            return;
        }
        response.setStatus(429);
        // Pencereden turetilir: saatlik kovaya "60 sn sonra dene" demek yeniden deneme firtinasidir.
        response.setHeader("Retry-After", String.valueOf(match.window().toSeconds()));
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
