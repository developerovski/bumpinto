package com.bumpinto.application.session;

import com.bumpinto.application.error.ConflictException;
import com.bumpinto.application.error.ForbiddenException;
import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.domain.port.PresencePort;
import com.bumpinto.domain.port.SessionEvent;
import com.bumpinto.domain.port.SessionEventsPort;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.port.TurnCredentialsPort;
import com.bumpinto.domain.port.VoiceRoomsPort;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.voice.EndReason;
import com.bumpinto.domain.voice.IceConfig;
import com.bumpinto.domain.voice.VoiceRoom;
import com.bumpinto.infra.config.AppProps;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Ses odasi komutlari. Oda DB'de degil (spec K8): @Transactional YOK, olaylar dogrudan gider.
 * Giris kapilari (start, credentials) expiry'ye bakar; end bakmaz — host suresi dolmus
 * oturumun odasini da kapatabilmeli.
 */
@Service
public class VoiceCommands {

    /** Kimlik odanin kalan omrunden bu kadar uzun yasar: son saniyede katilan relay'siz kalmasin. */
    static final Duration CREDENTIAL_MARGIN = Duration.ofSeconds(60);

    public record Credentials(IceConfig ice, Instant endsAt) {
    }

    private final SessionStorePort store;
    private final VoiceRoomsPort rooms;
    private final TurnCredentialsPort turn;
    private final SessionEventsPort events;
    private final PresencePort presence;
    private final Clock clock;
    private final Duration maxDuration;

    public VoiceCommands(SessionStorePort store, VoiceRoomsPort rooms, TurnCredentialsPort turn,
                         SessionEventsPort events, Clock clock, AppProps props, PresencePort presence) {
        this.store = store;
        this.rooms = rooms;
        this.turn = turn;
        this.events = events;
        this.presence = presence;
        this.clock = clock;
        this.maxDuration = props.voice().maxDuration();
        if (maxDuration.isZero() || maxDuration.isNegative()) {
            throw new IllegalStateException("bumpinto.voice.max-duration must be positive");
        }
    }

    /**
     * Idempotent: acik oda oldugu gibi doner. Bu yalniz TEK IS PARCACIGINDA kesindir; es zamanli
     * iki start yarisirsa ikisi de acik oda gormeyip voice_started'i ayni govdeyle iki kez
     * yayinlayabilir — zararsiz, istemci yeniden ceker.
     */
    public VoiceRoom start(String slug, UUID hostParticipantId) {
        Instant now = clock.instant();
        Session session = SessionExpiry.required(store, slug, now);
        SessionGates.requireHost(store, session, hostParticipantId);
        if (session.isSolo()) {
            throw new ConflictException("voice chat is only for group sessions");
        }
        UUID sessionId = session.id();
        Optional<VoiceRoom> current = rooms.roomOf(sessionId);
        if (current.isPresent() && current.get().endsAt().isAfter(now)) {
            return current.get();
        }
        // Suresi gecmis ama zamanlayicisi henuz kapatmamis oda: once kapat, sonra taze ac.
        current.ifPresent(stale -> end(sessionId, slug, EndReason.TIME_LIMIT));
        // Oda oturumu asmaz; TURN kimligi de bu sinira bagli kalir (spec §6).
        Instant endsAt = now.plus(maxDuration).isAfter(session.expiresAt())
                ? session.expiresAt() : now.plus(maxDuration);
        // Zamanlayici compute icinde kurulur; sifira yakin omur odayi zamanlayicisiz birakabilir.
        if (!endsAt.isAfter(now.plusSeconds(5))) {
            throw new ConflictException("session is about to expire");
        }
        VoiceRoom room = rooms.open(sessionId, slug, endsAt,
                () -> endIfStillScheduled(sessionId, slug, endsAt));
        events.publish(slug, SessionEvent.voiceStarted(room.endsAt()));
        return room;
    }

    public void end(String slug, UUID hostParticipantId) {
        Session session = store.sessionBySlug(slug)
                .orElseThrow(() -> new NotFoundException("session not found: " + slug));
        SessionGates.requireHost(store, session, hostParticipantId);
        end(session.id(), slug, EndReason.HOST);
    }

    /** cancel(false) baslamis bir isi durdurmaz: eski zamanlayici yeni acilan odayi kapatmasin. */
    private void endIfStillScheduled(UUID sessionId, String slug, Instant scheduledEndsAt) {
        if (rooms.roomOf(sessionId).filter(r -> r.endsAt().equals(scheduledEndsAt)).isPresent()) {
            end(sessionId, slug, EndReason.TIME_LIMIT);
        }
    }

    /** Katman 2 (spec §5): oturumda kimse yoksa oda kapanir; biri varsa dokunmaz. */
    public void endIfEmpty(UUID sessionId) {
        if (!presence.presentIn(sessionId).isEmpty()) {
            return;
        }
        rooms.roomOf(sessionId).ifPresent(room -> end(sessionId, room.slug(), EndReason.EMPTY));
    }

    public Credentials credentials(String slug, UUID participantId) {
        Session session = SessionExpiry.required(store, slug, clock.instant());
        boolean member = store.participantsOf(session.id()).stream()
                .anyMatch(p -> p.id().equals(participantId));
        if (!member) {
            throw new ForbiddenException("not a participant of this session");
        }
        VoiceRoom room = rooms.roomOf(session.id())
                .orElseThrow(() -> new ConflictException("voice not active"));
        Duration ttl = room.remaining(clock.instant()).plus(CREDENTIAL_MARGIN);
        return new Credentials(turn.issue(ttl), room.endsAt());
    }

    private void end(UUID sessionId, String slug, EndReason reason) {
        rooms.close(sessionId)
                .ifPresent(room -> events.publish(slug, SessionEvent.voiceEnded(reason)));
    }
}
