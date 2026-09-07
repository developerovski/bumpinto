package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.port.PresenceStampsPort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * REQUIRES_NEW: damga WS dinleyicisinden (transaction'siz) ve okuma uclarindan cagrilir;
 * cagiranin islemine iliserek onun rollback'inde kaybolmasi ya da onu kilitlemesi istenmez.
 */
@Component
class PresenceStampsAdapter implements PresenceStampsPort {

    private final ParticipantRepository participants;

    PresenceStampsAdapter(ParticipantRepository participants) {
        this.participants = participants;
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void touchLastSeen(UUID participantId, Instant at) {
        participants.touchLastSeen(participantId, at);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markLinkOpened(UUID participantId, Instant at) {
        participants.markLinkOpened(participantId, at);
    }

    /**
     * Okuma SKALER projeksiyondan gelir ({@code stampRowsOf}); gerekcesi orada. Damgasi hic
     * olmayan koltuk haritaya GIRMEZ: "hic gorulmedi" ile "gorulme ani bilinmiyor" ayni sey
     * degil, cagiran anahtarin yoklugundan birincisini anlar.
     */
    @Override
    public Map<UUID, Stamps> stampsOf(UUID sessionId) {
        return participants.stampRowsOf(sessionId).stream()
                .filter(row -> row[1] != null || row[2] != null)
                .collect(Collectors.toMap(row -> (UUID) row[0],
                        row -> new Stamps((Instant) row[1], (Instant) row[2])));
    }
}
