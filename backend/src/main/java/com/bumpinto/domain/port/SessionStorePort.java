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

    /** Kesfet: `[now, until]` penceresinde bulusan, karari verilmemis ACIK planlar. */
    List<Session> findPublicUpcoming(Instant now, Instant until);
    Participant saveParticipant(Participant participant);
    List<Participant> participantsOf(UUID sessionId);

    /**
     * Hesabin bu oturumdaki koltugu. Kimlik istemcideki token'da degil, iliskinin KENDISINDE
     * durur: token'siz bir tarayicida acilan hesap yeni koltuk acmak yerine kendi koltugunu
     * geri bulur. (session_id, user_id) uzerindeki kismi unique index sayesinde tek seek.
     */
    Optional<Participant> participantOf(UUID sessionId, UUID userId);
    void deleteParticipant(UUID participantId);

    /**
     * Hostun ACIK oturumlari, en yeniden eskiye. LIMIT YOK ve bu bilincli: acik oturum TTL ile
     * 24 saatte kapanir, kume dogal olarak kucuktur. Tavan konsaydi cok sayida YENI oturum acan
     * host'un eski ama hala acik oturumu listeden SESSIZCE duserdi — ulasilacak baska yolu da yok.
     */
    List<SessionSummary> openSummariesOfHost(UUID hostId, Instant now);

    /**
     * Hostun GECMIS oturumlari, en yeniden eskiye, en fazla limit. Tavan BURAYA aittir: gecmis
     * sinirsiz birikir.
     *
     * <p>Bolme SQL'de tembel expiry ile AYNI kurali kullanmak ZORUNDADIR (bkz. SessionExpiry):
     * TTL'i gecmis oturum EXPIRED raporlanir ama DB'ye yazilmaz, yani kayitli statusu hala
     * COLLECTING olan satir gecmise aittir. Kural yalniz {@code status} bakarak kurulsaydi
     * suresi dolmus oturum acik kutuda "devam ediyor" gibi gorunurdu.
     */
    List<SessionSummary> pastSummariesOfHost(UUID hostId, Instant now, int limit);

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

    /** Kullanilmamis bir davet kodu; carpisma nadirdir ama sessiz kalamaz — unique index atar. */
    String freshJoinCode();

    /** Kod kanonik — buyuk harf, 5 hane — gelmelidir; normalizasyon sorgu katmaninda yapilir. */
    Optional<Session> sessionByJoinCode(String joinCode);
}
