package com.bumpinto.adapter.in.web;

import com.bumpinto.domain.port.VoiceRoomsPort;
import com.bumpinto.domain.voice.VoiceRoom;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.converter.MessageConversionException;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * WebRTC sinyal relay'i: offer/answer/ice hedefin ozel konusuna gider, HICBIR SEY saklanmaz.
 * {@code from} istemciden okunmaz, sunucu damgalar. Gonderen ve hedef ayni odanin uyesi olmali.
 * Gecersiz her sey sessizce duser: sinyal en-iyi-caba, istemci ICE zaman asimiyla anlar.
 */
@Controller
class VoiceSignalController {

    private static final Logger log = LoggerFactory.getLogger(VoiceSignalController.class);

    /** sdp UZUNLUGU + candidate alan DEGERLERININ toplam uzunlugu bu tavana tabidir (16 KB). */
    static final int MAX_PAYLOAD_CHARS = 16 * 1024;
    /**
     * RTCIceCandidateInit duz bir nesnedir (candidate, sdpMid, sdpMLineIndex, usernameFragment...).
     * Istemci {@code RTCIceCandidate.toJSON()} gondermeli (4 alan) — nesnenin kendisinin spread'i
     * DEGIL, o metod tanimlari/getter'lari da tasiyip alan sayisini ongorulemez sekilde sisirir.
     */
    private static final int MAX_CANDIDATE_FIELDS = 16;
    private static final Set<String> TYPES = Set.of("offer", "answer", "ice");

    /** Istemci govdesi. candidate: RTCIceCandidateInit ({candidate, sdpMid, sdpMLineIndex, ...}). */
    record Signal(String to, String type, String sdp, Map<String, Object> candidate) {
    }

    private final VoiceRoomsPort rooms;
    private final SimpMessagingTemplate template;

    VoiceSignalController(VoiceRoomsPort rooms, SimpMessagingTemplate template) {
        this.rooms = rooms;
        this.template = template;
    }

    @MessageMapping("/sessions/{slug}/voice/signal")
    void relay(@DestinationVariable String slug, @Payload Signal signal,
               SimpMessageHeaderAccessor accessor) {
        Map<String, Object> attributes = accessor.getSessionAttributes();
        if (attributes == null || signal == null || signal.to() == null
                || signal.type() == null || !TYPES.contains(signal.type()) || tooLarge(signal)) {
            return;
        }
        if (!(attributes.get(SessionWsHandshake.SESSION_ID) instanceof UUID sessionId)
                || !(attributes.get(SessionWsHandshake.PARTICIPANT_ID) instanceof UUID from)
                || !slug.equals(attributes.get(SessionWsHandshake.SLUG))) {
            return;
        }
        UUID to;
        try {
            to = UUID.fromString(signal.to());
        } catch (IllegalArgumentException e) {
            return;
        }
        VoiceRoom room = rooms.roomOf(sessionId).orElse(null);
        if (room == null || !room.hasMember(from) || !room.hasMember(to)) {
            return;
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("from", from.toString());
        out.put("type", signal.type());
        if (signal.sdp() != null) {
            out.put("sdp", signal.sdp());
        }
        if (signal.candidate() != null) {
            out.put("candidate", signal.candidate());
        }
        // out'un statik tipi Map oldugundan convertAndSend(D, Object) ile convertAndSend(Object,
        // Map<String,Object> headers) asiri yuklemeleri belirsizlesir; (Object) cast'i cozer.
        template.convertAndSend(VoiceDestinations.inbox(slug, to), (Object) out);
    }

    private static boolean tooLarge(Signal signal) {
        if (signal.candidate() != null && signal.candidate().size() > MAX_CANDIDATE_FIELDS) {
            return true;
        }
        long total = signal.sdp() != null ? signal.sdp().length() : 0;
        if (signal.candidate() != null) {
            for (Object value : signal.candidate().values()) {
                total += String.valueOf(value).length();
            }
        }
        return total > MAX_PAYLOAD_CHARS;
    }

    /**
     * Gecersiz govde (JSON olmayan, {@code candidate} nesne degil...) @Payload donusumunde
     * MessageConversionException firlatir; buradaki tutulmazsa her frame icin bir ERROR yigin izi
     * loglanir. Sinyal en-iyi-caba oldugu icin sessizce dusurmek yeterli.
     */
    @MessageExceptionHandler(MessageConversionException.class)
    void ignoreBadBody(MessageConversionException e) {
        log.debug("gecersiz sinyal govdesi: {}", e.getMessage());
    }

    /** Baska her istisna gercek bir hata olabilir: DEBUG'a gomup gorunmez kilmak yerine WARN. */
    @MessageExceptionHandler(Exception.class)
    void ignoreOther(Exception e) {
        log.warn("voice signal handler failed: {}", e.getMessage());
    }
}
