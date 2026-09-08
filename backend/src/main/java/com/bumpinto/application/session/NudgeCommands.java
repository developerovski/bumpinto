package com.bumpinto.application.session;

import com.bumpinto.application.error.ForbiddenException;
import com.bumpinto.application.error.TooManyRequestsException;
import com.bumpinto.domain.port.NudgeCooldownPort;
import com.bumpinto.domain.port.SessionEvent;
import com.bumpinto.domain.port.SessionEventsPort;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

/** Durt: yazi DEGIL, tek bir zil. Govde yok, kalici kayit yok (R-B8). */
@Service
public class NudgeCommands {

    /** §2 sozlesmesi: kisi basina 60 sn'de bir. */
    static final Duration WINDOW = Duration.ofSeconds(60);

    private final SessionStorePort store;
    private final SessionEventsPort events;
    private final NudgeCooldownPort cooldown;
    private final Clock clock;

    public NudgeCommands(SessionStorePort store, SessionEventsPort events,
                         NudgeCooldownPort cooldown, Clock clock) {
        this.store = store;
        this.events = events;
        this.cooldown = cooldown;
        this.clock = clock;
    }

    /**
     * Kota EN SONDA tuketilir: yasak bir hedefe (kendine, elle eklenen bir noktaya, oturumda
     * olmayan birine) basmak mesru zili 60 sn susturmamali.
     */
    public void nudge(String slug, UUID fromParticipantId, UUID toParticipantId) {
        Session session = SessionExpiry.required(store, slug, clock.instant());
        List<Participant> seats = store.participantsOf(session.id());
        requireSeat(seats, fromParticipantId);
        Participant target = requireSeat(seats, toParticipantId);
        if (fromParticipantId.equals(toParticipantId)) {
            throw new ForbiddenException("cannot nudge yourself");
        }
        // Elle eklenen nokta token tasimaz, soket acamaz: zil calacak bir cihaz yok.
        if (target.manual()) {
            throw new ForbiddenException("manual points cannot be nudged");
        }
        if (!cooldown.tryNudge(fromParticipantId, toParticipantId, WINDOW)) {
            throw new TooManyRequestsException("nudge_cooldown");
        }
        events.publish(slug, SessionEvent.nudged(fromParticipantId, toParticipantId));
    }

    /** Uyelik DB'den okunur: imzali token'daki "bu oturumdayim" iddiasi tek basina yetmez. */
    private static Participant requireSeat(List<Participant> seats, UUID participantId) {
        return seats.stream().filter(p -> p.id().equals(participantId)).findFirst()
                .orElseThrow(() -> new ForbiddenException("not a participant of this session"));
    }
}
