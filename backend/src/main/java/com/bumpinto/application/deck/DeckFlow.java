package com.bumpinto.application.deck;

import com.bumpinto.application.error.ConflictException;
import com.bumpinto.application.error.ForbiddenException;
import com.bumpinto.application.error.NoVenuesFoundException;
import com.bumpinto.application.session.SessionExpiry;
import com.bumpinto.application.text.Ids;
import com.bumpinto.domain.deck.DecisionEngine;
import com.bumpinto.domain.deck.DeckOrdering;
import com.bumpinto.domain.deck.DeckOutcome;
import com.bumpinto.domain.deck.ParticipantLikes;
import com.bumpinto.domain.geo.Fairness;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.SearchRadius;
import com.bumpinto.domain.geo.SessionCenter;
import com.bumpinto.domain.geo.TravelMinutes;
import com.bumpinto.domain.port.DeckStorePort;
import com.bumpinto.domain.port.PresencePort;
import com.bumpinto.domain.port.ReverseGeocodePort;
import com.bumpinto.domain.port.SessionEvent;
import com.bumpinto.domain.port.SessionEventsPort;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.port.VenueProviderPort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.DecisionKind;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.Voters;
import com.bumpinto.domain.venue.Venue;
import com.bumpinto.domain.venue.VenueCandidate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;

@Service
public class DeckFlow {

    static final int DECK_MIN = 6;
    static final int DECK_MAX = 20;

    private final SessionStorePort store;
    private final DeckStorePort deck;
    private final VenueProviderPort provider;
    private final SessionEventsPort events;
    private final DecisionEngine engine;
    private final Clock clock;
    private final ReverseGeocodePort geocoder;
    private final PresencePort presence;

    public DeckFlow(SessionStorePort store, DeckStorePort deck, VenueProviderPort provider,
                    SessionEventsPort events, DecisionEngine engine, Clock clock,
                    ReverseGeocodePort geocoder, PresencePort presence) {
        this.store = store;
        this.deck = deck;
        this.provider = provider;
        this.events = events;
        this.engine = engine;
        this.clock = clock;
        this.geocoder = geocoder;
        this.presence = presence;
    }

    @Transactional
    public List<Venue> findVenues(String slug, UUID hostParticipantId) {
        Session session = required(slug);
        requireHost(session, hostParticipantId);
        if (session.status() != SessionStatus.COLLECTING
                && session.status() != SessionStatus.SUGGESTING) {
            throw new ConflictException("deck already built: " + session.status());
        }
        List<Participant> located = geometryPopulation(session.id());
        SessionCenter center = SessionCenter.of(session.anchor(), located);
        if (center == null) {
            throw new ConflictException("need at least 2 participants with location");
        }
        store.saveSession(session.withStatus(SessionStatus.SUGGESTING));

        List<VenueCandidate> found = List.of();
        for (int attempt = 0; attempt <= SearchRadius.MAX_EXPANSIONS; attempt++) {
            found = provider.search(center.point(),
                    SearchRadius.expandedKm(center.radiusKm(), attempt),
                    session.activityTypes(), DECK_MAX);
            if (found.size() >= DECK_MIN) {
                break;
            }
        }
        if (found.isEmpty()) {
            store.saveSession(session.withStatus(SessionStatus.COLLECTING));
            throw new NoVenuesFoundException();
        }

        Map<String, VenueCandidate> unique = new LinkedHashMap<>();
        found.forEach(c -> unique.putIfAbsent(c.externalId(), c));
        // Puan = kalite kapisi (hangi DECK_MAX mekan destede olacak).
        List<VenueCandidate> shortlist = unique.values().stream()
                .sorted(canonicalOrder(VenueCandidate::rating, VenueCandidate::externalId))
                .limit(DECK_MAX)
                .toList();
        // Sira = adalet (spec §4.5) ya da capalida puan — tek karar noktasi deckOrder.
        List<VenueCandidate> ordered = deckOrder(session, shortlist,
                VenueCandidate::location, located);

        List<Venue> venues = new ArrayList<>(ordered.size());
        for (int i = 0; i < ordered.size(); i++) {
            VenueCandidate c = ordered.get(i);
            venues.add(new Venue(UUID.randomUUID(), session.id(), c.provider(), c.externalId(),
                    c.name(), c.location(), c.rating(), c.priceLevel(), c.photoUrl(),
                    c.mapsUrl(), i, c.category(), c.address(), c.locality(), c.ratingCount(),
                    c.hoursToday(), c.placeLink(), c.activityType()));
        }
        List<Venue> saved = deck.saveVenues(venues);
        // Etiket capasiz oturumda BIR KEZ burada cozulur: orta nokta bundan sonra degismez
        // (konumlar donuyor) ve her SessionView okumasinda ag istegi atmak politikaya da
        // mantiga da aykiri olurdu.
        // Etiket ZATEN varsa (capali oturumda olusturmada yazildi) dokunulmaz: hem ag
        // cagrisi bosa gider hem de host'un yazdigi ad ters-geocode ciktisiyla ezilirdi.
        // Capasiz oturumda alan bu noktada hep null oldugu icin davranis degismez.
        String label = session.midpointLabel() != null ? session.midpointLabel()
                : geocoder.label(center.point()).orElse(null);
        store.saveSession(session.withStatus(SessionStatus.BROWSING).withMidpointLabel(label));
        events.publish(slug, SessionEvent.venuesReady(saved.size()));
        return saved;
    }

    /**
     * Grup: host "Karistir ve kaydir" der; deste herkes icin AYNI ADALET sirasina girer
     * (spec §4.5, kullanici karari 2026-09-03 — eski "tumden rastgele" kurali dustu).
     * Yeniden uygulanmasinin sebebi BROWSING sirasinda konum/ulasim modu degismis olabilmesi;
     * degismemisse sira aynen kalir (idempotent).
     *
     * <p>UI fiili DEGISMEDI: dugme hala "Karistir ve kaydir" der ve ucun adi hala
     * {@code POST /{slug}/shuffle}'dir — degisen yalnizca siranin nereden geldigidir.
     * Yeniden adlandirma W-6 kapsamina girmez.
     */
    @Transactional
    public void shuffle(String slug, UUID hostParticipantId) {
        Session session = required(slug);
        requireHost(session, hostParticipantId);
        if (session.status() != SessionStatus.BROWSING) {
            throw new ConflictException("expected BROWSING but was " + session.status());
        }
        if (session.isSolo()) {
            throw new ConflictException("solo session has no deck");
        }
        // Presence kapisi: satir duruyor ama sahibi odada degilse deste baslamaz. Deste BITISI
        // (done>=total) bilinçli olarak satira bakmaya devam eder — geri alinamaz karar bir ag
        // dalgalanmasina emanet edilemez.
        Set<UUID> here = presence.presentIn(session.id());
        long ready = votingPopulation(session).stream()
                .filter(p -> here.contains(p.id())).count();
        if (ready < 2) {
            throw new ConflictException("need at least 2 participants present to start the deck");
        }
        List<Participant> located = geometryPopulation(session.id());
        // Tohumlu karisim GIRDI sirasina duyarlidir (Collections.shuffle konum-bagimli): gercek
        // idempotentlik icin baslangic sirasi, findVenues'un ilk kurdugu sirayla AYNI kalmali —
        // deckOrder'dan (onceki karisimin SONUCU) degil, ayni kalite kapisindan (puan, sonra
        // sabit kimlik) yeniden kurulur; yoksa her cagri kendi cikisini girdi alip surukler.
        List<Venue> canonical = deck.venuesOf(session.id()).stream()
                .sorted(canonicalOrder(Venue::rating, Venue::externalId))
                .toList();
        List<UUID> ids = deckOrder(session, canonical, Venue::location, located)
                .stream().map(Venue::id).toList();
        deck.reorderVenues(session.id(), ids);
        store.saveSession(session.withStatus(SessionStatus.SWIPING));
        events.publish(slug, SessionEvent.deckReady(ids.size()));
    }

    @Transactional
    public void swipe(String slug, UUID participantId, UUID venueId, boolean liked) {
        Session session = requireStatus(slug, SessionStatus.SWIPING);
        requireDeckParticipant(session, participantId);
        deck.saveSwipe(session.id(), venueId, participantId, liked);
    }

    @Transactional
    public void undoSwipe(String slug, UUID participantId, UUID venueId) {
        Session session = requireStatus(slug, SessionStatus.SWIPING);
        requireDeckParticipant(session, participantId);
        deck.deleteSwipe(venueId, participantId);
    }

    @Transactional
    public void finishDeck(String slug, UUID participantId) {
        Session session = requireStatus(slug, SessionStatus.SWIPING);
        Participant me = requireDeckParticipant(session, participantId);
        store.saveParticipant(me.doneAt(clock.instant()));

        List<Participant> population = votingPopulation(session);
        long total = population.size();
        long done = population.stream().filter(Participant::deckDone).count();
        events.publish(slug, SessionEvent.deckProgress(done, total));
        if (done >= total) {
            evaluate(session, false);
        }
    }

    /**
     * Uc kullanim: (a) BROWSING'de "Bunu sec" — SOLO'nun tek karar yolu, GROUP'ta host kisayolu;
     * (b) RUNOFF beraberligini bozma; (c) SWIPING'de kismi katilimla degerlendirme (venueId null).
     */
    @Transactional
    public void forceDecision(String slug, UUID hostParticipantId, UUID chosenVenueId) {
        Session session = required(slug);
        requireHost(session, hostParticipantId);
        if (chosenVenueId != null) {
            switch (session.status()) {
                case BROWSING -> {
                    boolean inSession = deck.venuesOf(session.id()).stream()
                            .anyMatch(v -> v.id().equals(chosenVenueId));
                    if (!inSession) {
                        throw new ConflictException("venue is not in this session");
                    }
                }
                case RUNOFF -> {
                    if (!session.runoffVenueIds().contains(chosenVenueId)) {
                        throw new ConflictException("venue is not a finalist");
                    }
                }
                default -> throw new ConflictException(
                        "venue can only be chosen while browsing or during runoff");
            }
            decide(session, chosenVenueId, DecisionKind.FORCED);
            return;
        }
        if (session.status() != SessionStatus.SWIPING) {
            throw new ConflictException("nothing to force in status " + session.status());
        }
        evaluate(session, true);
    }

    @Transactional
    public void runoffVote(String slug, UUID participantId, UUID venueId) {
        Session session = requireStatus(slug, SessionStatus.RUNOFF);
        requireDeckParticipant(session, participantId);
        if (!session.runoffVenueIds().contains(venueId)) {
            throw new ConflictException("venue is not a finalist");
        }
        deck.castVote(session.id(), venueId, participantId);

        long finishers = votingPopulation(session).stream()
                .filter(Participant::deckDone).count();
        // Oy tablosu TEK sorgu: oy SAYISI da buradan turetilir. Ayri bir votersCount cagrisi
        // ayni satirlari ikinci kez okuyordu (DeckStoreAdapter'da ikisi de findBySessionId).
        Map<UUID, Long> tally = deck.voteTally(session.id());
        long voted = tally.values().stream().mapToLong(Long::longValue).sum();
        // Her oyda yayinla: ekrandaki "kim kilitledi" listesi (SessionView.runoffVoters) bununla
        // degisir. Yalniz beraberlikte yayinlamak, oy verildigi anda digerlerinin ekranini
        // 3 sn'lik poll'e mahkum ediyordu.
        events.publish(session.slug(), SessionEvent.runoffVoted(voted, finishers));
        if (voted >= finishers) {
            long max = tally.values().stream().mapToLong(Long::longValue).max().orElse(0);
            List<UUID> winners = tally.entrySet().stream()
                    .filter(e -> e.getValue() == max).map(Map.Entry::getKey).toList();
            if (winners.size() == 1) {
                decide(session, winners.get(0), DecisionKind.RUNOFF);
            } else {
                // beraberlik: RUNOFF açık kalır, host force-decision ile seçer (spec §4).
                // Yeni oy geldikçe yeniden yayınlanır: tekrar oy beraberliği bozabilir ve
                // olay yalnızca istemciyi tazelemeye çağırır — tekrarı zararsızdır.
                events.publish(session.slug(), SessionEvent.runoffTie(winners.size()));
            }
        }
    }

    private void evaluate(Session session, boolean interactive) {
        Map<UUID, Set<UUID>> likes = deck.likesByParticipant(session.id());
        List<ParticipantLikes> participantLikes = votingPopulation(session).stream()
                .map(p -> new ParticipantLikes(p.id(), p.deckDone(),
                        likes.getOrDefault(p.id(), Set.of())))
                .toList();
        if (participantLikes.stream().noneMatch(ParticipantLikes::deckDone)) {
            throw new ConflictException("no one finished the deck yet");
        }
        Map<UUID, Double> ratings = new HashMap<>();
        deck.venuesOf(session.id())
                .forEach(v -> ratings.put(v.id(), v.rating() == null ? 0.0 : v.rating()));

        DeckOutcome outcome = engine.decide(participantLikes, ratings);
        switch (outcome) {
            // Host "onlarsiz devam et" dediyse karar turu PARTIAL'dir: motor ne derse desin
            // ekranda "{{adlar}} olmadan" yazar (spec §5.B.5).
            case DeckOutcome.Decided d ->
                    decide(session, d.venueId(), interactive ? DecisionKind.PARTIAL : d.kind());
            case DeckOutcome.Runoff r -> {
                store.saveSession(session.inRunoff(r.venueIds(), r.reason()));
                events.publish(session.slug(), SessionEvent.runoffStarted(r.venueIds().size()));
            }
            case DeckOutcome.NoLikes ignored -> {
                if (interactive) {
                    throw new ConflictException("no likes at all — try another category");
                }
                events.publish(session.slug(), SessionEvent.noLikes());
            }
        }
    }

    private void decide(Session session, UUID venueId, DecisionKind kind) {
        store.saveSession(session.decided(venueId, kind, clock.instant()));
        events.publish(session.slug(), SessionEvent.sessionDecided(venueId));
    }

    private Session required(String slug) {
        return SessionExpiry.required(store, slug, clock.instant());
    }

    private Session requireStatus(String slug, SessionStatus expected) {
        Session session = required(slug);
        if (session.status() != expected) {
            throw new ConflictException("expected " + expected + " but was " + session.status());
        }
        return session;
    }

    /**
     * Oda ici yetki oturuma kapsamli KATILIMCI kimliginden gelir, hesap JWT'sinden degil (bkz.
     * SessionCommands#requireHost). Koltuk DB'den okunur: imzali claim tek basina yetmez.
     */
    private void requireHost(Session session, UUID participantId) {
        if (!requireMember(session, participantId).host()) {
            throw new ForbiddenException("only the host can do this");
        }
    }

    private Participant requireMember(Session session, UUID participantId) {
        return store.participantsOf(session.id()).stream()
                .filter(p -> p.id().equals(participantId)).findFirst()
                .orElseThrow(() -> new ForbiddenException("participant not in this session"));
    }

    /** Geometri popülasyonu: konumu olan HERKES (elle konumlar dahil) — orta nokta, yaricap, deste. */
    private List<Participant> geometryPopulation(UUID sessionId) {
        return store.participantsOf(sessionId).stream().filter(Participant::hasLocation).toList();
    }

    /**
     * Oy popülasyonu: konumu olan ve elle eklenmemis katilimcilar. done/total, runoff finishers ve
     * karar motoru girdisi HEP burayi kullanir — elle konum kaydiramaz, yoksa oturum asla bitmez.
     */
    private List<Participant> votingPopulation(Session session) {
        return Voters.of(session, store.participantsOf(session.id()));
    }

    /** Mekan basina adalet: assembler ile AYNI dakika kodunu kullanir (tek kaynak). */
    private static Fairness fairnessOf(List<Participant> located, GeoPoint venue) {
        return Fairness.of(TravelMinutes.byParticipant(located, venue));
    }

    /**
     * UUID.hashCode() belgelenmis bir sozlesme degil (JDK surumu arasi degisebilir); tohum
     * bunun yerine 128 bitin ikisini XOR'layip acikca sabitler — oturum id'si degismedikce
     * tohum da hic degismez.
     */
    private static long seedOf(Session session) {
        UUID id = session.id();
        return id.getMostSignificantBits() ^ id.getLeastSignificantBits();
    }

    /**
     * Deste sirasi. Capali oturumda ADALET AYIRT ETMEZ: konum onkosulu dustugu icin
     * katilimcilarin HICBIRI konum vermemis olabilir, o zaman Fairness her mekan icin (0,0)
     * doner, fairnessFirst desteyi tek esitlik grubu gorur ve sira tohumlu karisima duser.
     * Konum veren olsa bile merkez artik onlardan turemiyor, yani adalet sirasi capayi temsil
     * etmez. O yuzden capalida kanonik (puan) sirasi korunur. (Araba icin 2 km'lik daire
     * zaten TravelMinutes.STEP'in altinda kalir; yaya/bisiklette kalmaz — gerekce bu degil.)
     *
     * <p>findVenues ve shuffle IKISI de buradan gecer: dallanmayi iki yere ayri yazmak,
     * birini unutup destenin iki cagri arasinda farkli siralanmasina yol acardi.
     */
    private <T> List<T> deckOrder(Session session, List<T> canonical,
                                  Function<T, GeoPoint> location, List<Participant> located) {
        if (session.anchor() != null) {
            return canonical;
        }
        return DeckOrdering.fairnessFirst(canonical,
                t -> fairnessOf(located, location.apply(t)), seedOf(session));
    }

    /**
     * TEK kanonik siralama: puan azalan (yoksa sona), sonra sabit kimlik (externalId) — hem
     * findVenues'un kalite kapisi hem shuffle'in yeniden-kurdugu baslangic sirasi bunu kullanir.
     * Ayni baslangic = ayni tohumlu karisim SONUCU: ilk shuffle, browsing destesiyle ozdes cikar
     * (idempotentlik esit puanli mekanlarda da bozulmaz).
     */
    private static <T> Comparator<T> canonicalOrder(Function<T, Double> rating,
                                                     Function<T, String> externalId) {
        return Comparator.comparing(rating, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(externalId);
    }

    /**
     * Katılım konumsuz da mümkündür (lat/lng opsiyonel), bu yüzden konum zorunlu kılınmaz;
     * kişi konumunu paylaşana dek deste işlemlerinin dışında tutulur. Üyeliği var ama önkoşulu
     * yok → 409 (403 değil): çözümü PUT /location.
     */
    private Participant requireDeckParticipant(Session session, UUID participantId) {
        Participant participant = requireMember(session, participantId);
        // Capali oturumda konum uyeligin sarti degil (spec K1): merkez katilimcilardan
        // turemedigi icin konumsuz kisi de kaydirir. Konum yalniz yol suresi/adalet gosterimi.
        if (session.anchor() == null && !participant.hasLocation()) {
            throw new ConflictException("share your location before joining the deck");
        }
        if (participant.manual()) {
            throw new ConflictException("manual points do not swipe");
        }
        return participant;
    }
}
