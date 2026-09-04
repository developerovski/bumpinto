package com.bumpinto.application.session;

import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.domain.port.DeckStorePort;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.venue.Venue;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class SessionQueries {

    private static final EnumSet<SessionStatus> VENUES_VISIBLE = EnumSet.of(
            SessionStatus.BROWSING, SessionStatus.SWIPING, SessionStatus.RUNOFF, SessionStatus.DECIDED);

    private final SessionStorePort store;
    private final DeckStorePort deck;
    private final Clock clock;

    public SessionQueries(SessionStorePort store, DeckStorePort deck, Clock clock) {
        this.store = store;
        this.deck = deck;
        this.clock = clock;
    }

    /**
     * {@code runoffVotes}: katilimci -> sectigi mekan; yalniz RUNOFF'ta dolu. ANAHTARLARI
     * herkese acilir ("kim kilitledi"), DEGERLERI yalniz kisinin KENDI secimini geri vermek
     * icin kullanilir — API govdesine baskasinin secimi girmez (assembler'da kapali).
     */
    public record SessionSnapshot(Session session, List<Participant> participants,
                                  List<Venue> venues, Map<UUID, Long> voteTally,
                                  Map<UUID, UUID> runoffVotes, Map<UUID, Long> likeCounts) {
    }

    /**
     * Hesabın bu oturumdaki koltuğu; koltuğu yoksa boş.
     *
     * <p>Katılımcı token'ı yalnızca oturum kurulurken ya da katılırken BİR KEZ dağıtılır. Üye
     * oturumu başka bir tarayıcıda ya da cihazda açtığında elinde sadece hesap JWT'si olur;
     * kimlik buradan çözülmezse okuma tarafı çalışmaya devam eder, yazma tarafı 403 döner —
     * kullanıcı kaydırır, hiçbir swipe sunucuya ulaşmaz, ekran her şey yolundaymış gibi görünür.
     *
     * <p>Host'a özel bir dal DEĞİLDİR: koltuk sahipliği ({@code participants.user_id}) davetli
     * üyeler için de aynı şekilde çalışır.
     */
    public Optional<UUID> participantIdOf(String slug, UUID userId) {
        return store.sessionBySlug(slug)
                .flatMap(session -> store.participantOf(session.id(), userId))
                .map(Participant::id);
    }

    /** Okuma tarafı da tembel expiry uygular: süresi dolmuş oturum EXPIRED raporlanır, DB'ye yazılmaz. */
    public SessionSnapshot snapshot(String slug) {
        Session stored = store.sessionBySlug(slug)
                .orElseThrow(() -> new NotFoundException("session not found: " + slug));
        Session session = SessionExpiry.applied(stored, clock.instant());
        List<Participant> participants = store.participantsOf(session.id());
        List<Venue> venues = VENUES_VISIBLE.contains(session.status())
                ? deck.venuesOf(session.id()) : List.of();

        // RUNOFF'ta oy tablosuna TEK sorgu: voteTally/votesByParticipant ayni
        // satirlari iki kez cekmek yerine, katilimci->mekan haritasindan bellek icinde turetilir.
        Map<UUID, UUID> runoffVotes = session.status() == SessionStatus.RUNOFF
                ? deck.votesByParticipant(session.id()) : Map.of();

        // Sayim aciklama kapisi (spec §3: acik sayim bandwagon yaratir, gizli-sonra-acilis
        // dogru): karar verildiyse ya da oy verecek herkes verdiyse acilir.
        long finishers = participants.stream().filter(p -> p.votes() && p.deckDone()).count();
        boolean everyoneVoted = session.status() == SessionStatus.RUNOFF && finishers > 0
                && runoffVotes.size() >= finishers;
        Map<UUID, Long> tally;
        if (session.status() == SessionStatus.DECIDED) {
            tally = deck.voteTally(session.id());
        } else if (everyoneVoted) {
            tally = runoffVotes.values().stream()
                    .collect(Collectors.groupingBy(v -> v, Collectors.counting()));
        } else {
            tally = Map.of();
        }

        // likeCounts YALNIZ DECIDED sonrasi (K-B11): oylama surerken kimin neyi begendigi
        // sayilarindan geri okunabilirdi.
        Map<UUID, Long> likeCounts = session.status() == SessionStatus.DECIDED
                ? tallyLikes(participants, deck.likesByParticipant(session.id())) : Map.of();

        return new SessionSnapshot(session, participants, venues, tally, runoffVotes, likeCounts);
    }

    /** Mekan -> desteyi bitirmis kac oy popülasyonu uyesi begendi. */
    private static Map<UUID, Long> tallyLikes(List<Participant> participants,
                                              Map<UUID, Set<UUID>> likesByParticipant) {
        Set<UUID> counted = participants.stream()
                .filter(p -> p.votes() && p.deckDone())
                .map(Participant::id)
                .collect(Collectors.toSet());
        return likesByParticipant.entrySet().stream()
                .filter(e -> counted.contains(e.getKey()))
                .flatMap(e -> e.getValue().stream())
                .collect(Collectors.groupingBy(v -> v, Collectors.counting()));
    }
}
