package com.bumpinto.domain.port;

import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionSummary;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SessionStorePort {
    Session saveSession(Session session);
    Optional<Session> sessionBySlug(String slug);
    Participant saveParticipant(Participant participant);
    List<Participant> participantsOf(UUID sessionId);

    /**
     * Hesabin bu oturumdaki koltugu. Kimlik istemcideki token'da degil, iliskinin KENDISINDE
     * durur: token'siz bir tarayicida acilan hesap yeni koltuk acmak yerine kendi koltugunu
     * geri bulur. (session_id, user_id) uzerindeki kismi unique index sayesinde tek seek.
     */
    Optional<Participant> participantOf(UUID sessionId, UUID userId);
    void deleteParticipant(UUID participantId);

    /** Hostu verilen kullanici olan oturumlar, en yeniden eskiye, en fazla limit. */
    List<SessionSummary> summariesOfHost(UUID hostId, int limit);
    long hostedSessionCount(UUID hostId);
    /** Host'un oturumlarina katilmis, host ve elle konum OLMAYAN farkli kisi sayisi (ad bazli). */
    long distinctGuestsOfHost(UUID hostId);

    /** Hostu verilen hesap olan TUM oturum kimlikleri (limitsiz — silme icin). */
    List<UUID> sessionIdsOfHost(UUID hostId);

    /** Oturum ve ona bagli her sey (FK cascade: katilimci/mekan/kaydirma/oy). */
    void deleteSession(UUID sessionId);

    /** Hesabin BASKALARININ oturumlarindaki koltuklari. */
    List<Participant> participantsOfUser(UUID userId);

    /** Koltuk kalir, kimlik gider: ad degisir, user_id ve konum null olur, damga yazilir. */
    void anonymizeParticipant(UUID participantId, String displayName, Instant when);
}
