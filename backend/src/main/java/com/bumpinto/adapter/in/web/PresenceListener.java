package com.bumpinto.adapter.in.web;

import com.bumpinto.application.session.VoiceCommands;
import com.bumpinto.domain.port.PresencePort;
import com.bumpinto.domain.port.SessionEvent;
import com.bumpinto.domain.port.SessionEventsPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.AbstractSubProtocolEvent;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import org.springframework.scheduling.TaskScheduler;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
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

    private static final Logger log = LoggerFactory.getLogger(PresenceListener.class);

    /** Grace tam sinirinda okumamak icin kucuk pay — saat cozunurlugu ve is sirasi icin. */
    private static final long GRACE_MARGIN_MS = 250;

    private final PresencePort presence;
    private final SessionEventsPort events;
    private final TaskScheduler scheduler;
    private final VoiceCommands voice;

    PresenceListener(PresencePort presence, SessionEventsPort events, TaskScheduler scheduler,
                     VoiceCommands voice) {
        this.presence = presence;
        this.events = events;
        this.scheduler = scheduler;
        this.voice = voice;
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
        // Kopma anindaki yayin "hala online" der — kisi grace penceresi icindedir. Durum ancak
        // pencere GECINCE degisir ve o an hicbir sey olmaz: istemci degisikligi 30 sn'lik emniyet
        // poll'une kadar goremezdi. Kullanici gozlemi (2026-09-04) tam olarak buydu: "biri
        // girdiginde aninda online oluyor ama cikinca sayfayi yenilemeden offline'a gecmiyor."
        // Ikinci zil, durumun gercekten degistigi anda calar.
        roomOf(event).ifPresent(this::ringWhenGraceExpires);
    }

    private record Room(UUID sessionId, String slug) {
    }

    private void ringWhenGraceExpires(Room room) {
        Duration grace = presence.graceWindow();
        if (grace.isZero() || grace.isNegative()) {
            return; // pencere yoksa ilk yayin zaten dogruyu soyluyordu
        }
        scheduler.schedule(() -> {
            try {
                events.publish(room.slug(), SessionEvent.presenceChanged());
                // Katman 2 (voice spec §5): bos kontrolu artik VoiceCommands.endIfEmpty'nin kendi isi.
                voice.endIfEmpty(room.sessionId());
            } catch (RuntimeException e) {
                // Zamanlayici thread'inde yutulmayan bir istisna sessizce ses odasini sonsuza
                // kadar acik birakirdi (bu zil olmadan endIfEmpty hic cagrilmaz).
                log.warn("grace bell failed for {}: {}", room.slug(), e.getMessage());
            }
        }, Instant.now().plus(grace).plusMillis(GRACE_MARGIN_MS));
    }

    private static Optional<Room> roomOf(AbstractSubProtocolEvent event) {
        Map<String, Object> attributes =
                SimpMessageHeaderAccessor.wrap(event.getMessage()).getSessionAttributes();
        if (attributes == null
                || !(attributes.get(SessionWsHandshake.SESSION_ID) instanceof UUID sessionId)
                || !(attributes.get(SessionWsHandshake.SLUG) instanceof String slug)) {
            return Optional.empty();
        }
        return Optional.of(new Room(sessionId, slug));
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
