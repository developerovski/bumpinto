package com.bumpinto.adapter.in.web;

import com.bumpinto.application.safety.VoiceAdmission;
import com.bumpinto.domain.port.SessionEvent;
import com.bumpinto.domain.port.SessionEventsPort;
import com.bumpinto.domain.port.VoiceRoomsPort;
import com.bumpinto.domain.voice.Seat;
import com.bumpinto.domain.voice.VoiceRoom;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;
import org.springframework.web.socket.messaging.SessionUnsubscribeEvent;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Ses uyeligi = kendi sinyal konusuna abonelik (spec K4). SUBSCRIBE uye yapar, UNSUBSCRIBE o
 * koltugu, DISCONNECT o soketin tum koltuklarini duser. Oda kapaliysa abonelik uyelik yaratmaz.
 * Kimlik handshake niteliklerinden okunur (PresenceListener ile ayni kaynak). Yayin transaction
 * disindadir.
 */
@Component
class VoiceRoomListener {

    private final VoiceRoomsPort rooms;
    private final SessionEventsPort events;
    private final VoiceAdmission admission;

    VoiceRoomListener(VoiceRoomsPort rooms, SessionEventsPort events, VoiceAdmission admission) {
        this.admission = admission;
        this.rooms = rooms;
        this.events = events;
    }

    @EventListener
    void onSubscribe(SessionSubscribeEvent event) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.wrap(event.getMessage());
        Identity me = Identity.of(accessor);
        if (me == null || !VoiceDestinations.inbox(me.slug(), me.participantId())
                .equals(accessor.getDestination())) {
            return;
        }
        // join() her zaman koltugu yazar (yeniden abonelik de dahil); zil yalniz UYE KUMESI
        // gercekten degistiyse calmali — aksi halde ayni katilimcinin ikinci aboneligi (ayni sekme
        // yeniden baglanir, ya da SUBSCRIBE/UNSUBSCRIBE tekrar eder ama kume sabit kalir) her
        // istemciye gereksiz bir GET /api/sessions/{slug} yaptirir.
        Set<UUID> before = rooms.roomOf(me.sessionId()).map(VoiceRoom::memberIds).orElse(Set.of());
        // §2: engelli cift ayni odaya alinmaz. Kapi ABONELIKTE: uyelik burada dogar, sonradan
        // iptal etmek arada bir sinyal penceresi birakirdi.
        Set<UUID> blocked = admission.blockedWith(me.sessionId(), me.participantId());
        if (before.stream().anyMatch(blocked::contains)) {
            // Sessizce dusurmek istemciyi "baglaniyor"da birakirdi; zil roster'i tazeletir.
            events.publish(me.slug(), SessionEvent.blocked());
            return;
        }
        rooms.join(me.sessionId(), me.participantId(),
                        new Seat(accessor.getSessionId(), accessor.getSubscriptionId()))
                .filter(room -> !room.memberIds().equals(before))
                .ifPresent(room -> events.publish(me.slug(), SessionEvent.voiceRosterChanged()));
    }

    @EventListener
    void onUnsubscribe(SessionUnsubscribeEvent event) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.wrap(event.getMessage());
        Identity me = Identity.of(accessor);
        if (me == null) {
            return;
        }
        rooms.leaveSeat(me.sessionId(), accessor.getSessionId(), accessor.getSubscriptionId())
                .ifPresent(room -> events.publish(me.slug(), SessionEvent.voiceRosterChanged()));
    }

    @EventListener
    void onDisconnect(SessionDisconnectEvent event) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.wrap(event.getMessage());
        Identity me = Identity.of(accessor);
        if (me == null) {
            return;
        }
        rooms.leaveSocket(me.sessionId(), accessor.getSessionId())
                .ifPresent(room -> events.publish(me.slug(), SessionEvent.voiceRosterChanged()));
    }

    private record Identity(UUID sessionId, UUID participantId, String slug) {

        static Identity of(SimpMessageHeaderAccessor accessor) {
            Map<String, Object> attributes = accessor.getSessionAttributes();
            if (attributes == null
                    || !(attributes.get(SessionWsHandshake.SESSION_ID) instanceof UUID sessionId)
                    || !(attributes.get(SessionWsHandshake.PARTICIPANT_ID) instanceof UUID participantId)
                    || !(attributes.get(SessionWsHandshake.SLUG) instanceof String slug)) {
                return null;
            }
            return new Identity(sessionId, participantId, slug);
        }
    }
}
