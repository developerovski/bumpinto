package com.bumpinto.infra;

import com.bumpinto.domain.port.SessionStorePort;
import jakarta.servlet.http.Cookie;
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
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain apiChain(HttpSecurity http, SessionStorePort sessions,
                                 BearerTokenResolver bearerTokenResolver) throws Exception {
        // CSRF token bilinçli olarak yok: cookie'ler SameSite=Lax + origin-kısıtlı
        // credentialed CORS; API'de tarayıcı form-post akışı bulunmuyor.
        http.csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> {})
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.POST, "/api/auth/google").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/sessions/*/participants").permitAll()
                .requestMatchers("/v3/api-docs/**", "/ws/**", "/error").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(o -> o
                .bearerTokenResolver(bearerTokenResolver)
                .jwt(jwt -> {}))
            .addFilterBefore(new ParticipantTokenFilter(sessions),
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
