package com.bumpinto.application.safety;

import com.bumpinto.domain.port.SessionStorePort;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.UUID;

/**
 * Ses odasi kabul kapisi. Neden AYRI servis: VoiceRoomListener bir STOMP dinleyicisidir ve
 * elinde yalniz sessionId + participantId vardir; engel kurali koltuk listesini ve iki yonlu
 * iliskiyi ister. Kapi burada durunca dinleyici tek satirla sorar.
 */
@Service
public class VoiceAdmission {

    private final Blocks blocks;
    private final SessionStorePort sessions;

    public VoiceAdmission(Blocks blocks, SessionStorePort sessions) {
        this.blocks = blocks;
        this.sessions = sessions;
    }

    /** Bu katilimciyla ayni odada BULUNAMAYACAK katilimcilar (her iki yonde engel). */
    public Set<UUID> blockedWith(UUID sessionId, UUID participantId) {
        return blocks.blockedPairIds(sessionId, participantId, sessions.participantsOf(sessionId));
    }
}
