package com.bumpinto.application.session;

import com.bumpinto.application.error.ConflictException;
import com.bumpinto.application.error.ForbiddenException;
import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.application.text.Texts;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.port.BlockStorePort;
import com.bumpinto.domain.port.SeatRequestStorePort;
import com.bumpinto.domain.port.SessionEvent;
import com.bumpinto.domain.port.SessionEventsPort;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.session.JoinPolicy;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.SeatRequest;
import com.bumpinto.domain.session.SeatStatus;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Acik plana katilim istegi yasam dongusu: iste → (OPEN: aninda) onay/ret → koltuk.
 *
 * <p>Istek KOLTUK DEGILDIR: onaylanana kadar {@code participants}'ta satiri yoktur, yani orta
 * noktayi, deste geometrisini ve adalet siralamasini etkilemez. Bu ayrim Kesfet'in tum guvenlik
 * modelinin dayanagi — yabanci biri host onaylamadan oturumun icini goremez.
 *
 * <p>Kimlik burada HESAP kimligidir, katilimci token'i degil: isteyen henuz katilimci degildir
 * ve host karari Kesfet'ten gelen hesapli kullaniciyla ilgilidir (ARCHITECTURE §8'in bilincli
 * istisnasi).
 */
@Service
public class SeatRequests {

    private final SessionStorePort sessions;
    private final SeatRequestStorePort seats;
    private final BlockStorePort blocks;
    private final SessionEventsPort events;
    private final Clock clock;

    public SeatRequests(SessionStorePort sessions, SeatRequestStorePort seats,
                        BlockStorePort blocks, SessionEventsPort events, Clock clock) {
        this.sessions = sessions;
        this.seats = seats;
        this.blocks = blocks;
        this.events = events;
        this.clock = clock;
    }

    public record Ask(UUID userId, String displayName, GeoPoint location, String locationLabel,
                      TravelMode travelMode, String note) {
    }

    public record Decision(SeatRequest request, Participant participant, int approvedSeats,
                           boolean confirmed) {
    }

    /**
     * Kapi SIRASI onemli: once "kendi planin", sonra engel, sonra mukerrer istek, EN SON dolu
     * plan. Dolu kontrolu one alinsaydi zaten istek atmis biri "plan dolu" cevabi alir ve kendi
     * bekleyen istegini kaybettigini sanirdi.
     */
    @Transactional
    public SeatRequest request(String slug, Ask ask) {
        Session s = openPlanOrThrow(slug);
        if (s.hostId().equals(ask.userId())) {
            throw new ConflictException("host cannot request own plan");
        }
        if (blockedEitherWay(s.hostId(), ask.userId())) {
            // "Engellisin" DEMEZ: 403 govdesi engelin varligini sizdirmamali.
            throw new ForbiddenException("cannot request a seat in this plan");
        }
        if (seats.findBySessionAndUser(s.id(), ask.userId()).isPresent()) {
            throw new ConflictException("already requested");
        }
        if (s.openPlan().full(approvedSeats(s))) {
            throw new ConflictException("plan full");
        }
        SeatRequest r = seats.save(SeatRequest.pending(s.id(), ask.userId(),
                Texts.displayName(ask.displayName()), ask.location(),
                Texts.label(ask.locationLabel()), ask.travelMode(), Texts.note(ask.note()),
                clock.instant()));
        if (s.openPlan().joinPolicy() == JoinPolicy.OPEN) {
            return seat(s, r).request();
        }
        events.publish(slug, SessionEvent.seatRequestsChanged());
        return r;
    }

    @Transactional
    public Decision approve(String slug, UUID hostUserId, UUID requestId) {
        Session s = hostOrThrow(slug, hostUserId);
        SeatRequest r = pendingOrThrow(s, requestId);
        // Dolu kontrolu onayda TEKRAR: istek sirasinda yer vardi, arada baskasi onaylanmis olabilir.
        if (s.openPlan().full(approvedSeats(s))) {
            throw new ConflictException("plan full");
        }
        return seat(s, r);
    }

    @Transactional
    public SeatRequest decline(String slug, UUID hostUserId, UUID requestId) {
        Session s = hostOrThrow(slug, hostUserId);
        SeatRequest r = seats.save(
                pendingOrThrow(s, requestId).decide(SeatStatus.DECLINED, clock.instant()));
        events.publish(slug, SessionEvent.seatRequestsChanged());
        return r;
    }

    /** Host paneli. Yalniz host okur: istek listesi kimlerin bu plana bakindigini soyler. */
    public List<SeatRequest> forSession(String slug, UUID hostUserId) {
        return seats.findBySession(hostOrThrow(slug, hostUserId).id());
    }

    /** Isteyenin KENDI satiri — host olmak gerekmez, baskasininkini de dondurmez. */
    public Optional<SeatRequest> mine(String slug, UUID userId) {
        return seats.findBySessionAndUser(openPlanOrThrow(slug).id(), userId);
    }

    /** Onay: istek APPROVED + koltuk (hesaba bagli Participant) + iki zil. */
    private Decision seat(Session s, SeatRequest r) {
        Instant now = clock.instant();
        SeatRequest approved = seats.save(r.decide(SeatStatus.APPROVED, now));
        Participant p = sessions.saveParticipant(new Participant(UUID.randomUUID(), s.id(),
                r.displayName(), r.location(), false, null, false, r.locationLabel(),
                r.travelMode(), r.userId()));
        int count = approvedSeats(s);
        events.publish(s.slug(), SessionEvent.participantJoined(count));
        events.publish(s.slug(), SessionEvent.seatRequestsChanged());
        return new Decision(approved, p, count, s.openPlan().confirmed(count));
    }

    /** Onayli koltuk = hesapli, elle EKLENMEMIS katilimci (host dahil). */
    int approvedSeats(Session s) {
        return (int) sessions.participantsOf(s.id()).stream()
                .filter(p -> !p.manual() && p.userId() != null).count();
    }

    /**
     * Gizli oturum bu uclardan "bulunamadi" doner, "izin yok" DEGIL: 403 oturumun VAR oldugunu
     * sizdirirdi ve slug tahmini bir varlik oracle'ina donerdi.
     */
    private Session openPlanOrThrow(String slug) {
        Session s = sessions.sessionBySlug(slug)
                .orElseThrow(() -> new NotFoundException("session not found: " + slug));
        if (!s.isOpenPlan()) {
            throw new NotFoundException("session not found: " + slug);
        }
        if (s.isExpired(clock.instant()) || s.status() == SessionStatus.DECIDED) {
            throw new ConflictException("plan is closed");
        }
        return s;
    }

    private Session hostOrThrow(String slug, UUID userId) {
        Session s = openPlanOrThrow(slug);
        if (!s.hostId().equals(userId)) {
            throw new ForbiddenException("host only");
        }
        return s;
    }

    private SeatRequest pendingOrThrow(Session s, UUID id) {
        SeatRequest r = seats.findById(id).filter(x -> x.sessionId().equals(s.id()))
                .orElseThrow(() -> new NotFoundException("seat request not found"));
        if (!r.pending()) {
            throw new ConflictException("already decided");
        }
        return r;
    }

    /** Ses odasi ve durt ile ayni kural: engel CIFT YONLU baglar. */
    private boolean blockedEitherWay(UUID a, UUID b) {
        return blocks.blockedUserIdsOf(a).contains(b) || blocks.blockedUserIdsOf(b).contains(a);
    }
}
