package com.bumpinto.adapter.in.web;

import com.bumpinto.domain.port.PresencePort;
import com.bumpinto.domain.port.SessionEvent;
import com.bumpinto.domain.port.SessionEventsPort;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.AbstractSubProtocolEvent;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Map;
import java.util.UUID;

/**
 * WS yasam dongusunu presence'a cevirir. Kimlik handshake'te niteliklere yazilmistir
 * ({@link SessionWsHandshake}); kopma aninda ortada istek olmadigi icin tek kaynak orasidir.
 *
 * <p>Yayin transaction disindadir: StompSessionEvents aktif transaction yoksa dogrudan gonderir.
 */
@Component
class PresenceListener {

    private final PresencePort presence;
    private final SessionEventsPort events;

    PresenceListener(PresencePort presence, SessionEventsPort events) {
        this.presence = presence;
        this.events = events;
    }

    /**
     * SessionConnectEvent dinlenir, adi daha "dogru" gorunen SessionConnectedEvent DEGIL —
     * SessionConnectedEvent brokerin CONNECT_ACK'ini tasir ve o mesajda simpSessionAttributes
     * HICBIR ZAMAN yazilmaz (dogrulandi: spring-messaging 7.0.8 bytecode — SimpleBrokerMessageHandler
     * CONNECT_ACK'e yalniz sessionId/user/heartbeat basar). Buradan okunan nitelikler daima null
     * olur ve arrived() hic cagrilmazdi — presence hep bos kalirdi, her shuffle 409 donerdi.
     * SessionConnectEvent ISTEMCIDEN gelen CONNECT frame'ini tasir; StompSubProtocolHandler bu
     * mesaja handshake niteliklerini (SessionWsHandshake'in yazdigi slug/participantId/sessionId)
     * setSessionAttributes ile gercekten basar — tek fark isimdeki "ed" ama davranis taban tabana zit.
     */
    @EventListener
    void onConnect(SessionConnectEvent event) {
        apply(event, presence::arrived);
    }

    @EventListener
    void onDisconnect(SessionDisconnectEvent event) {
        apply(event, presence::left);
    }

    private void apply(AbstractSubProtocolEvent event, PresenceChange change) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.wrap(event.getMessage());
        Map<String, Object> attributes = accessor.getSessionAttributes();
        if (attributes == null) {
            return;
        }
        if (!(attributes.get(SessionWsHandshake.SESSION_ID) instanceof UUID sessionId)
                || !(attributes.get(SessionWsHandshake.PARTICIPANT_ID) instanceof UUID participantId)
                || !(attributes.get(SessionWsHandshake.SLUG) instanceof String slug)) {
            return;
        }
        // accessor.getSessionId(): WS/STOMP baglantisinin kendi kimligi — ayni katilimcinin iki
        // sekmesini ayirir, presence.arrived/left'in eslesmeyen kopmayi ayiklamasi bunun uzerine kurulu.
        change.accept(sessionId, participantId, accessor.getSessionId());
        events.publish(slug, SessionEvent.presenceChanged());
    }

    /** java.util.function'da 3 parametreli bir BiConsumer yok. */
    @FunctionalInterface
    private interface PresenceChange {
        void accept(UUID sessionId, UUID participantId, String wsSessionId);
    }
}
