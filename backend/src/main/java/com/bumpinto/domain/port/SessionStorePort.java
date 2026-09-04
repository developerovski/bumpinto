package com.bumpinto.domain.port;

import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionSummary;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SessionStorePort {
    Session saveSession(Session session);
    Optional<Session> sessionBySlug(String slug);
    Participant saveParticipant(Participant participant);
    List<Participant> participantsOf(UUID sessionId);
    void deleteParticipant(UUID participantId);

    /** Hostu verilen kullanici olan oturumlar, en yeniden eskiye, en fazla limit. */
    List<SessionSummary> summariesOfHost(UUID hostId, int limit);
    long hostedSessionCount(UUID hostId);
    /** Host'un oturumlarina katilmis, host ve elle konum OLMAYAN farkli kisi sayisi (ad bazli). */
    long distinctGuestsOfHost(UUID hostId);
}
