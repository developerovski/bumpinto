package com.bumpinto.application.safety;

import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.application.text.Texts;
import com.bumpinto.domain.port.ReportStorePort;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.safety.Report;
import com.bumpinto.domain.safety.ReportReason;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.UUID;

/** Bildirim kaydi (Apple 1.2). Kayit denetim izidir; moderasyon kuyrugu sonraki iz. */
@Service
public class Reports {

    private final ReportStorePort store;
    private final SessionStorePort sessions;
    private final Clock clock;

    public Reports(ReportStorePort store, SessionStorePort sessions, Clock clock) {
        this.store = store;
        this.sessions = sessions;
        this.clock = clock;
    }

    @Transactional
    public Report file(UUID reporterUserId, String sessionSlug, UUID targetParticipantId,
                       ReportReason reason, String note) {
        Session session = sessions.sessionBySlug(sessionSlug)
                .orElseThrow(() -> new NotFoundException("session not found"));
        boolean member = sessions.participantsOf(session.id()).stream()
                .map(Participant::id).anyMatch(targetParticipantId::equals);
        if (!member) {
            throw new NotFoundException("participant not found");
        }
        return store.save(new Report(UUID.randomUUID(), reporterUserId, session.id(),
                targetParticipantId, reason, Texts.label(note), clock.instant()));
    }
}
