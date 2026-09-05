package com.bumpinto.application.session;

import com.bumpinto.application.error.ConflictException;
import com.bumpinto.application.error.ForbiddenException;
import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.application.text.Ids;
import com.bumpinto.application.text.Texts;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.port.SessionEvent;
import com.bumpinto.domain.port.SessionEventsPort;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionType;

import java.time.Clock;
import java.time.Duration;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SessionCommands {

    static final Duration SESSION_TTL = Duration.ofHours(24);

    /**
     * Yeni koltuk bu durumlarda ACILMAZ: deste basladiktan sonra oy populasyonu DONAR, yoksa
     * gec katilan biri done/total matematigini bozar ve herkesi bekletir.
     */
    private static final Set<SessionStatus> CLOSED_TO_NEW_SEATS = EnumSet.of(
            SessionStatus.SWIPING, SessionStatus.RUNOFF, SessionStatus.DECIDED);

    private final SessionStorePort store;
    private final SessionEventsPort events;
    private final Clock clock;

    public SessionCommands(SessionStorePort store, SessionEventsPort events, Clock clock) {
        this.store = store;
        this.events = events;
        this.clock = clock;
    }

    public record CreateSessionResult(Session session, Participant hostParticipant) {
    }

    @Transactional
    public CreateSessionResult createSession(UUID hostUserId, String name,
                                             List<ActivityType> types,
                                             SessionType sessionType, GeoPoint hostLocation,
                                             String hostDisplayName, String hostLocationLabel,
                                             TravelMode hostTravelMode) {
        Session session = store.saveSession(new Session(UUID.randomUUID(), Ids.slug(), hostUserId,
                Texts.sessionName(name), types, sessionType, SessionStatus.COLLECTING,
                clock.instant().plus(SESSION_TTL), null, List.of()));
        // null -> CAR: Participant'in compact ctor'u zaten coerce eder, burada tekrar etmiyoruz.
        Participant host = store.saveParticipant(new Participant(UUID.randomUUID(), session.id(),
                Texts.displayName(hostDisplayName), hostLocation, true,
                null, false, Texts.label(hostLocationLabel), hostTravelMode, hostUserId));
        return new CreateSessionResult(session, host);
    }

    /**
     * Ayni cagiran IKINCI koltuk acmaz: kimligi olan biri tekrar katilirsa kendi koltugunu geri
     * alir. Host boylece kendi oturumuna misafir olarak giremez, cerezini kaybeden davetli de
     * hayalet bir katilimci birakmaz — hayalet koltuk orta noktayi ve deste geometrisini bozar.
     * Kimliksiz cagiran icin yeni koltuk acilir: davet linki anonim katilima aciktir.
     *
     * <p>Var olan koltuk OLDUGU GIBI donulur. Yeniden katilim bir kayit degil kimlik kurtarmadir;
     * ad ve konum sahibinindir ve kendi ucundan guncellenir (PUT /location).
     *
     * <p>Durum kapisi YALNIZ yeni koltuga uygulanir: deste basladiktan (SWIPING/RUNOFF) veya
     * bittikten (DECIDED) sonra kimligi olan cagiran yine de kendi koltugunu geri alir, cunku
     * kapi seatOf'tan SONRA calisir — yoksa sekmesini yenileyen bir uye kendi oturumundan 409 ile
     * atilirdi.
     */
    @Transactional
    public Participant join(String slug, Caller caller, String displayName, GeoPoint location,
                            String locationLabel, TravelMode travelMode) {
        Session session = required(slug);
        if (session.isSolo()) {
            throw new ConflictException("solo session has no invite link");
        }
        // Koltuk kurtarma kapidan ONCE: sekmesini yenileyen uye her durumda kendi koltugunu alir.
        Optional<Participant> seat = seatOf(session, caller);
        if (seat.isPresent()) {
            return seat.get();
        }
        if (CLOSED_TO_NEW_SEATS.contains(session.status())) {
            throw new ConflictException("session is closed for new participants: " + session.status());
        }
        // null -> CAR: Participant'in compact ctor'u zaten coerce eder, burada tekrar etmiyoruz.
        Participant joined = store.saveParticipant(new Participant(UUID.randomUUID(), session.id(),
                Texts.displayName(displayName), location, false, null,
                false, Texts.label(locationLabel), travelMode, caller.userId()));
        events.publish(slug, SessionEvent.participantJoined(store.participantsOf(session.id()).size()));
        return joined;
    }

    /**
     * Kimlik var ama koltuk yoksa (ornegin silinmis elle nokta) bos doner: yeni koltuk acilir.
     *
     * <p>HESAP once sorulur: elindeki token tarayicida kalmis yanlis bir koltugu gosteriyor
     * olabilir, hesabin koltugu ise veriden bilinir.
     */
    private Optional<Participant> seatOf(Session session, Caller caller) {
        if (caller.userId() != null) {
            Optional<Participant> owned = store.participantOf(session.id(), caller.userId());
            if (owned.isPresent()) {
                return owned;
            }
        }
        if (caller.participantId() != null) {
            return store.participantsOf(session.id()).stream()
                    .filter(p -> p.id().equals(caller.participantId())).findFirst();
        }
        return Optional.empty();
    }

    /**
     * Anonim alinmis koltugu hesaba baglar (K-B23). Davet linkine giris yapmadan katilan biri
     * sonradan giris yaptiginda koltugu sahipsiz kalirdi: ikinci cihazda kimligini kurtaramaz,
     * yeniden katilir ve MUKERRER satir acardi (orta noktayi ceker).
     *
     * <p>Yikici degil ve idempotent: yalnizca sahipsiz bir koltugu isaretler. Hesabin o oturumda
     * ZATEN koltugu varsa dokunmaz — o durumda elde kalan cerez yanlis koltugu gosteriyordur ve
     * dogru cevap sahiplenmek degil, cerezi onarmaktir (WebPrincipals.seatOf).
     */
    @Transactional
    public Optional<Participant> claimSeat(UUID sessionId, UUID participantId, UUID userId) {
        if (participantId == null || userId == null
                || store.participantOf(sessionId, userId).isPresent()) {
            return Optional.empty();
        }
        return store.participantsOf(sessionId).stream()
                .filter(p -> p.id().equals(participantId))
                .filter(p -> p.userId() == null && !p.manual())
                .findFirst()
                .map(p -> store.saveParticipant(p.ownedBy(userId)));
    }

    @Transactional
    public void updateLocation(String slug, UUID participantId, GeoPoint location, String label,
                               TravelMode travelMode) {
        Session session = required(slug);
        Participant participant = store.participantsOf(session.id()).stream()
                .filter(p -> p.id().equals(participantId)).findFirst()
                .orElseThrow(() -> new NotFoundException("participant not in session"));
        String resolvedLabel = label == null ? participant.locationLabel() : Texts.label(label);
        store.saveParticipant(participant.locatedAt(location, resolvedLabel, travelMode));
        events.publish(slug, SessionEvent.locationUpdated());
    }

    /**
     * SOLO: host elle konum ekler. Token'siz, oy vermeyen katilimci; yalniz COLLECTING'de.
     * travelMode verilmezse (null) varsayilan CAR — Participant'in compact ctor'u zaten coerce
     * eder, burada tekrar etmiyoruz (spec §5.A.7).
     */
    @Transactional
    public Participant addPoint(String slug, UUID hostParticipantId, String displayName,
                                String locationLabel, GeoPoint location, TravelMode travelMode) {
        Session session = required(slug);
        requireHost(session, hostParticipantId);
        if (!session.isSolo()) {
            throw new ConflictException("manual points are only for solo sessions");
        }
        if (session.status() != SessionStatus.COLLECTING) {
            throw new ConflictException("points are frozen after venues are found");
        }
        Participant point = store.saveParticipant(new Participant(UUID.randomUUID(), session.id(),
                Texts.displayName(displayName), location, false, null, true,
                Texts.label(locationLabel), travelMode));
        events.publish(slug, SessionEvent.participantJoined(store.participantsOf(session.id()).size()));
        return point;
    }

    @Transactional
    public void removePoint(String slug, UUID hostParticipantId, UUID participantId) {
        Session session = required(slug);
        requireHost(session, hostParticipantId);
        if (session.status() != SessionStatus.COLLECTING) {
            throw new ConflictException("points are frozen after venues are found");
        }
        Participant point = store.participantsOf(session.id()).stream()
                .filter(p -> p.id().equals(participantId)).findFirst()
                .orElseThrow(() -> new NotFoundException("point not in session"));
        if (!point.manual()) {
            throw new ConflictException("only manual points can be removed");
        }
        store.deleteParticipant(participantId);
        events.publish(slug, SessionEvent.participantLeft(store.participantsOf(session.id()).size()));
    }

    /**
     * Host da bir katilimcidir: oda ici yetki oturuma kapsamli KATILIMCI kimliginden gelir, hesap
     * JWT'sinden degil. Hesap token'i 12 saat, oturum 24 saat yasiyordu; yetki hesaba bagliyken
     * host arada kendi oturumunu yonetemez oluyordu. Imzali claim'e korukorune guvenilmez —
     * koltuk DB'den okunur, boylece silinmis bir host koltugunun token'i de is gormez.
     */
    private void requireHost(Session session, UUID participantId) {
        boolean host = store.participantsOf(session.id()).stream()
                .filter(p -> p.id().equals(participantId))
                .findFirst().map(Participant::host).orElse(false);
        if (!host) {
            throw new ForbiddenException("only the host can do this");
        }
    }

    Session required(String slug) {
        return SessionExpiry.required(store, slug, clock.instant());
    }
}
