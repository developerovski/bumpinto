package com.bumpinto.infra.security;

import com.bumpinto.infra.config.AppProps;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    // Kimlik gerektirmeyen TEK liste: hem yetki kuralinda hem bearer resolver'da (bayat cerez 401'letmesin) kullanilir.
    static final List<RequestMatcher> PUBLIC_ENDPOINTS = List.of(
            PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.POST, "/api/auth/google"),
            PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.POST, "/api/auth/apple"),
            PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.POST, "/api/auth/logout"),
            // Yenileme: cagiranin erisim jetonu TANIM GEREGI olu. Kimlik dogrulamasi yenileme
            // jetonunun kendisidir, bearer'a bakilmaz.
            PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.POST, "/api/auth/refresh"),
            PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.POST, "/api/sessions/*/participants"),
            PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.GET, "/api/sessions/*/preview"),
            PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.GET, "/api/sessions/by-code/*"),
            PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.GET, "/api/config"),
            // Onizleme karti: linki eline gecen HERKESE (ve onizleme botlarina) acilir; kimlik
            // isteseydi WhatsApp/Slack/X gorseli hic cekemezdi. Govdesinde kamu alanlari var.
            PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.GET, "/og/*"),
            // Ayni kartin metin hali; /og/* AYRI bir yoldur ve bunu KAPSAMAZ. Davet sayfasinin
            // etiketlerini yazan web izi (W-15) henuz kimseyi tanimaz — kimlik isteseydi
            // paylasilan link'in basligi ve gorseli hic olusmazdi.
            PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.GET, "/api/sessions/*/og"));

    @Bean
    SecurityFilterChain apiChain(HttpSecurity http, TokenService tokens,
                                 BearerTokenResolver bearerTokenResolver) throws Exception {
        // CSRF token bilinçli olarak yok: cookie'ler SameSite=Lax + origin-kısıtlı
        // credentialed CORS; API'de tarayıcı form-post akışı bulunmuyor.
        http.csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> {})
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(PUBLIC_ENDPOINTS.toArray(RequestMatcher[]::new)).permitAll()
                .requestMatchers("/v3/api-docs/**", "/error").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(o -> o
                .bearerTokenResolver(bearerTokenResolver)
                .jwt(jwt -> {}))
            // SONRA: bearer filtresi context'i kosulsuz ezer, once konan katilimci
            // principal'i hayatta kalmazdi (bkz. ParticipantTokenFilter javadoc).
            .addFilterAfter(new ParticipantTokenFilter(tokens.decoder()),
                    BearerTokenAuthenticationFilter.class);
        return http.build();
    }

    /**
     * HESAP kimligi dogrulayicisi. Tek {@code TOKEN_SECRET} hem hesap hem katilimci token'ini
     * imzaladigi icin tur kapisi burada: katilimci token'i {@code Authorization: Bearer} ya da
     * {@code bumpinto_at} olarak sunulursa hesap kimligi SAYILMAZ. Kapi olmasa bir davetlinin
     * oturum token'i "oturum kur", "profilimi guncelle" gibi hesap uclarini acardi.
     *
     * <p>Sarmalayici kullanilir, {@code NimbusJwtDecoder.setJwtValidator} DEGIL: dogrulayici
     * paylasilan ornekte mutasyon yapar ve katilimci dogrulamasini da kirardi.
     */
    @Bean
    JwtDecoder apiJwtDecoder(TokenService tokens) {
        JwtDecoder decoder = tokens.decoder();
        return token -> {
            Jwt jwt = decoder.decode(token);
            String type = jwt.getClaimAsString(TokenService.TYPE_CLAIM);
            if (type != null) {
                // Hesap jetonunda typ claim'i HIC YOKTUR. Yalniz "pt"yi reddetseydik her yeni
                // jeton turu (bugun del, yarin baskasi) sessizce hesap jetonu sayilirdi.
                throw new BadJwtException("typed token is not an account token: " + type);
            }
            return jwt;
        };
    }

    /**
     * Hesap token'i nereden okunur: {@code Authorization: Bearer} (mobil) ya da {@code bumpinto_at}
     * cerezi (web).
     *
     * <p>Public uclarda kimlik ZORUNLU degil ama FAYDALIDIR: katilim ucu cagirani taniyabilirse
     * ayni hesaba ikinci koltuk acmaz (bkz. {@code SessionCommands#join}). Bu yuzden token orada
     * yok sayilmaz, once DOGRULANIR: bayat ya da bozuk bir token public bir ucu 401'letmemeli,
     * yalnizca yok sayilmalidir. Bedeli istek basina bir HMAC dogrulamasi, kazanci hayalet
     * katilimci satirlarinin bitmesi.
     *
     * <p><b>K-M38 (2026-09-09, cihazda bulundu):</b> ayni dusunce OTURUM uclari icin de gecerli.
     * Gecersiz bir bearer ZATEN HICBIR SEY acmiyordu; sorun onu 401 ile cezalandirmakti —
     * Spring'in bearer filtresi {@link ParticipantTokenFilter}'dan ONCE kosup zinciri kesiyor,
     * misafirin GECERLI oturum kimligi hic degerlendirilemiyordu (curl A/B: yalniz katilimci
     * jetonu 200 · + gecersiz bearer 401). Hesap jetonu 12 saatte doluyor, oturum 24 saat
     * yasiyordu; arada uygulamayi acan herkes oturumunu kaybediyordu.
     *
     * <p>Kapsam BILEREK dar: bayat jeton yalniz istek KENDI BASINA bir kimlik tasiyorsa
     * dusurulur (public uc, ya da o slug'a ait GECERLI katilimci jetonu). Hesap uclarinda 401
     * donmeye DEVAM EDER — kosulsuz dusurulseydi istemci jetonunun oldugunu hic ogrenmez, 401
     * kesicisi (W-16/M-10) hic tetiklenmez ve kullanici sessizce yetkisiz kalirdi.
     *
     * <p>Bedel: bu dar yolda katilimci jetonu iki kez cozulur (burada ve filtrede) — istek
     * basina bir fazla HMAC dogrulamasi, yalnizca zaten hatali olan yolda.
     */
    @Bean
    BearerTokenResolver bearerTokenResolver(JwtDecoder accountDecoder, TokenService tokens) {
        DefaultBearerTokenResolver headerResolver = new DefaultBearerTokenResolver();
        // Katilimci jetonu TUR kapisindan gecmez (typ=pt), bu yuzden ham cozucu kullanilir.
        JwtDecoder rawDecoder = tokens.decoder();
        return request -> {
            String presented = headerResolver.resolve(request);
            if (presented == null) {
                presented = accessCookie(request);
            }
            if (presented == null || valid(accountDecoder, presented)) {
                return presented;
            }
            boolean requestCarriesItsOwnIdentity = isPublicEndpoint(request)
                    || ParticipantTokens.carriedBy(request, rawDecoder);
            return requestCarriesItsOwnIdentity ? null : presented;
        };
    }

    private static String accessCookie(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return null;
        }
        for (Cookie cookie : request.getCookies()) {
            if (AuthCookies.ACCESS.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private static boolean valid(JwtDecoder decoder, String token) {
        try {
            decoder.decode(token);
            return true;
        } catch (JwtException invalid) {
            return false;
        }
    }

    private static boolean isPublicEndpoint(HttpServletRequest request) {
        return PUBLIC_ENDPOINTS.stream().anyMatch(m -> m.matches(request));
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(AppProps props) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(props.cors() == null ? List.of() : props.cors().allowedOrigins());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type",
                "X-Participant-Token", "X-Client"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
