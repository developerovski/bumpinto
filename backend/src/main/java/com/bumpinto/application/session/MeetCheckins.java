package com.bumpinto.application.session;

import com.bumpinto.application.error.ConflictException;
import com.bumpinto.application.error.ForbiddenException;
import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.domain.port.MeetCheckinStorePort;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.session.MeetCheckin;
import com.bumpinto.domain.session.Session;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.UUID;

/**
 * "Bulustunuz mu?" — 1. asama kapisinin TEK olcumu.
 *
 * <p>Yalniz ACIK PLANDA sorulur: gizli oturum bir arkadas grubunun kendi isi, urun basarisinin
 * gostergesi degil. Ve yalniz BULUSMA GECTIKTEN sonra: once sorulursa cevap niyet olur, olcum
 * degil.
 */
@Service
public class MeetCheckins {

    private final SessionStorePort sessions;
    private final MeetCheckinStorePort checkins;
    private final Clock clock;

    public MeetCheckins(SessionStorePort sessions, MeetCheckinStorePort checkins, Clock clock) {
        this.sessions = sessions;
        this.checkins = checkins;
        this.clock = clock;
    }

    @Transactional
    public void record(String slug, UUID participantId, boolean met) {
        Session s = sessions.sessionBySlug(slug)
                .orElseThrow(() -> new NotFoundException("session not found: " + slug));
        // Gizli oturum bu uctan "bulunamadi" doner: varligi 403 ile sizmasin (SeatRequests ile ayni).
        if (!s.isOpenPlan()) {
            throw new NotFoundException("session not found: " + slug);
        }
        if (!s.openPlan().meetPassed(clock.instant())) {
            throw new ConflictException("meet has not passed yet");
        }
        // Uyelik DB'den okunur: imzali token'daki "bu oturumdayim" iddiasi tek basina yetmez
        // (NudgeCommands ile ayni kural).
        boolean member = sessions.participantsOf(s.id()).stream()
                .anyMatch(p -> p.id().equals(participantId));
        if (!member) {
            throw new ForbiddenException("not a participant of this session");
        }
        checkins.upsert(new MeetCheckin(s.id(), participantId, met, clock.instant()));
    }
}
