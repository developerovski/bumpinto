package com.bumpinto.domain.port;

import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SessionStorePort {
    Session saveSession(Session session);
    Optional<Session> sessionBySlug(String slug);
    Participant saveParticipant(Participant participant);
    List<Participant> participantsOf(UUID sessionId);
    Optional<Participant> participantByToken(String token);
    void deleteParticipant(UUID participantId);
}
