package com.bumpinto.infra.security;

import com.bumpinto.infra.config.AppProps;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
public class AuthCookies {

    public static final String ACCESS = "bumpinto_at";
    static final String ACCESS_PATH = "/api";

    private final AppProps props;

    public AuthCookies(AppProps props) {
        this.props = props;
    }

    public static String participantCookieName(String slug) {
        return "bumpinto_pt_" + slug;
    }

    public ResponseCookie access(String token, Duration ttl) {
        return base(ACCESS, token, ACCESS_PATH, ttl);
    }

    // Web cikisi: ayni ad/yol ile Max-Age=0
    public ResponseCookie clearAccess() {
        return base(ACCESS, "", ACCESS_PATH, Duration.ZERO);
    }

    public ResponseCookie participant(String slug, String token, Duration ttl) {
        return base(participantCookieName(slug), token, "/api/sessions/" + slug, ttl);
    }

    private ResponseCookie base(String name, String value, String path, Duration ttl) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(props.cookies().secure())
                .sameSite("Lax")
                .path(path)
                .maxAge(ttl);
        if (props.cookies().domain() != null && !props.cookies().domain().isBlank()) {
            builder.domain(props.cookies().domain());
        }
        return builder.build();
    }
}
