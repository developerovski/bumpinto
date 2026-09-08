package com.bumpinto.application.safety;

import com.bumpinto.application.error.ForbiddenException;
import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.domain.port.BlockStorePort;
import com.bumpinto.domain.port.SessionEvent;
import com.bumpinto.domain.port.SessionEventsPort;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.safety.Block;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Engelleme (Apple 1.2 UGC). IKI KURAL ayridir: ROSTER'da engel TEK YONLUDUR — engelleyen
 * "engellendi" gorur, engellenen hicbir sey gormez (aksi halde engel bir mesaj olurdu).
 * SES ODASINDA engel CIFT YONLUDUR (§2: engelli cift ayni odaya alinmaz).
 */
@Service
public class Blocks {

    private final BlockStorePort store;
    private final SessionStorePort sessions;
    private final SessionEventsPort events;
    private final Clock clock;

    public Blocks(BlockStorePort store, SessionStorePort sessions, SessionEventsPort events,
                  Clock clock) {
        this.store = store;
        this.sessions = sessions;
        this.events = events;
        this.clock = clock;
    }

    /** blockedUserId varsa hesap engeli; yoksa sessionSlug ZORUNLU (oturum kapsamli engel). */
    @Transactional
    public Block add(UUID blockerUserId, UUID blockedUserId, UUID blockedParticipantId,
                     String sessionSlug) {
        if (blockedUserId != null) {
            return store.save(Block.ofUser(UUID.randomUUID(), blockerUserId, blockedUserId,
                    clock.instant()));
        }
        Session session = sessions.sessionBySlug(sessionSlug)
                .orElseThrow(() -> new NotFoundException("session not found"));
        Block saved = store.save(Block.ofParticipant(UUID.randomUUID(), blockerUserId,
                blockedParticipantId, session.id(), clock.instant()));
        events.publish(session.slug(), SessionEvent.blocked());
        return saved;
    }

    public List<Block> list(UUID blockerUserId) {
        return store.blocksOf(blockerUserId);
    }

    @Transactional
    public void remove(UUID blockerUserId, UUID blockId) {
        if (!store.delete(blockerUserId, blockId)) {
            // "Bulunamadi" degil 403: baskasinin engelinin VARLIGI da sizmamali.
            throw new ForbiddenException("block not found");
        }
    }

    /** Goruntuleyenin ENGELLEDIGI katilimcilar — ParticipantDto.blocked bundan gelir. */
    public Set<UUID> hiddenParticipantIds(UUID viewerUserId, UUID sessionId,
                                          List<Participant> participants) {
        if (viewerUserId == null) {
            return Set.of();
        }
        Set<UUID> blockedAccounts = store.blockedUserIdsOf(viewerUserId);
        Set<UUID> hidden = new HashSet<>(store.blockedParticipantIdsOf(viewerUserId, sessionId));
        participants.stream()
                .filter(p -> p.userId() != null && blockedAccounts.contains(p.userId()))
                .map(Participant::id).forEach(hidden::add);
        return hidden;
    }

    /** Verilen katilimciyla HER IKI YONDE engelli olan katilimcilar — ses odasi kurali. */
    public Set<UUID> blockedPairIds(UUID sessionId, UUID participantId,
                                    List<Participant> participants) {
        Participant subject = participants.stream().filter(p -> p.id().equals(participantId))
                .findFirst().orElse(null);
        if (subject == null) {
            return Set.of();
        }
        Set<UUID> pairs = new HashSet<>();
        if (subject.userId() != null) {
            Set<UUID> outgoing = store.blockedUserIdsOf(subject.userId());   // hesap engeli
            Set<UUID> incoming = store.blockerUserIdsOf(subject.userId());   // ters yon
            participants.stream()
                    .filter(p -> p.userId() != null
                            && (outgoing.contains(p.userId()) || incoming.contains(p.userId())))
                    .map(Participant::id).forEach(pairs::add);
            pairs.addAll(store.blockedParticipantIdsOf(subject.userId(), sessionId));
        }
        // Baskalarinin BU koltuga koydugu anonim engeller.
        participants.stream()
                .filter(p -> p.userId() != null && store
                        .blockedParticipantIdsOf(p.userId(), sessionId).contains(participantId))
                .map(Participant::id).forEach(pairs::add);
        pairs.remove(participantId);
        return pairs;
    }
}
