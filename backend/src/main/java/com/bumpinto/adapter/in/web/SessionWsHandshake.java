package com.bumpinto.adapter.in.web;

import com.bumpinto.infra.security.ParticipantPrincipal;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Handshake artik KIMLIKLI: istek servlet zincirinden gectigi icin ParticipantTokenFilter
 * principal'i zaten kurmustur. Burada yapilan tek sey kimligi WS oturum niteliklerine yazmaktir —
 * kopma aninda ortada bir HTTP istegi YOKTUR, katilimciyi ve slug'i baska turlu bilemeyiz.
 *
 * <p>false donmek handshake'i reddeder. SecurityConfig kimliksiz istegi zaten 401'ler; bu ikinci
 * kapi, ileride yol yanlislikla permitAll'a alinirsa kanalin acilmamasi icindir (fail-closed).
 */
class SessionWsHandshake implements HandshakeInterceptor {

    static final String SLUG = "slug";
    static final String PARTICIPANT_ID = "participantId";
    static final String SESSION_ID = "sessionId";

    private static final Pattern PATH = Pattern.compile("^/api/sessions/([^/]+)/ws$");

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler handler, Map<String, Object> attributes) {
        Matcher path = PATH.matcher(request.getURI().getPath());
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!path.matches() || auth == null
                || !(auth.getPrincipal() instanceof ParticipantPrincipal me)) {
            return false;
        }
        attributes.put(SLUG, path.group(1));
        attributes.put(PARTICIPANT_ID, me.participantId());
        attributes.put(SESSION_ID, me.sessionId());
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler handler, Exception exception) {
    }
}
