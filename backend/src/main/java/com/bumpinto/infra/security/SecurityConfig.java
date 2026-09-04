package com.bumpinto.infra.security;

import com.bumpinto.domain.port.SessionStorePort;
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
import org.springframework.security.oauth2.jwt.JwtDecoder;
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
            PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.POST, "/api/auth/logout"),
            PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.POST, "/api/sessions/*/participants"),
            PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.GET, "/api/sessions/*/preview"));

    @Bean
    SecurityFilterChain apiChain(HttpSecurity http, SessionStorePort sessions,
                                 BearerTokenResolver bearerTokenResolver) throws Exception {
        // CSRF token bilinçli olarak yok: cookie'ler SameSite=Lax + origin-kısıtlı
        // credentialed CORS; API'de tarayıcı form-post akışı bulunmuyor.
        http.csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> {})
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(PUBLIC_ENDPOINTS.toArray(RequestMatcher[]::new)).permitAll()
                .requestMatchers("/v3/api-docs/**", "/ws/**", "/error").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(o -> o
                .bearerTokenResolver(bearerTokenResolver)
                .jwt(jwt -> {}))
            // SONRA: bearer filtresi context'i kosulsuz ezer, once konan katilimci
            // principal'i hayatta kalmazdi (bkz. ParticipantTokenFilter javadoc).
            .addFilterAfter(new ParticipantTokenFilter(sessions),
                    BearerTokenAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    JwtDecoder apiJwtDecoder(TokenService tokens) {
        return tokens.decoder();
    }

    @Bean
    BearerTokenResolver bearerTokenResolver() {
        DefaultBearerTokenResolver headerResolver = new DefaultBearerTokenResolver();
        return request -> {
            String fromHeader = headerResolver.resolve(request);
            if (fromHeader != null) {
                return fromHeader; // mobil
            }
            if (isPublicEndpoint(request)) {
                return null; // eski/bozuk bumpinto_at hicbir public ucu 401'letmesin
            }
            if (request.getCookies() != null) {
                for (Cookie cookie : request.getCookies()) {
                    if (AuthCookies.ACCESS.equals(cookie.getName())) {
                        return cookie.getValue(); // web
                    }
                }
            }
            return null;
        };
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
        source.registerCorsConfiguration("/ws/**", config);
        return source;
    }
}
