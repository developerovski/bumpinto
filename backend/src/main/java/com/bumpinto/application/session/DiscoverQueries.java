package com.bumpinto.application.session;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMinutes;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.port.BlockStorePort;
import com.bumpinto.domain.port.SessionStorePort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Kesfet: yaklasan acik planlar.
 *
 * <p>Kart KESIN konum VERMEZ. Iki savunma birlikte calisir: gorunen tek yer bilgisi
 * {@code midpointLabel} (semt adi) ve isteyenin kendi konumundan turetilen ~dakikadir; dakika da
 * IKI yuvarlanmis nokta arasindan hesaplanir ({@code TravelMinutes.approx}, ~1.1 km) ve 5 dk
 * basamagina duser. Kesin koordinat hicbir hesaba girmez.
 *
 * <p>Onaylanmamis kullanici {@code SessionView} goremez (bugunku kural); bu liste o kuralin
 * disindaki TEK penceredir ve o yuzden ne tasidigi ayri ayri secilir.
 */
@Service
public class DiscoverQueries {

    /** Ufuk: iki haftadan uzagi plan degil niyet. Kismi indeks de bu pencereye calisir. */
    static final Duration WINDOW = Duration.ofDays(14);

    private final SessionStorePort sessions;
    private final BlockStorePort blocks;
    private final Clock clock;

    public DiscoverQueries(SessionStorePort sessions, BlockStorePort blocks, Clock clock) {
        this.sessions = sessions;
        this.blocks = blocks;
        this.clock = clock;
    }

    public record Row(Session session, String hostDisplayName, int approvedSeats,
                      boolean confirmed, Integer minutes) {
    }

    public List<Row> list(UUID viewer, Set<ActivityType> activities, GeoPoint viewerLocation,
                          TravelMode mode) {
        Instant now = clock.instant();
        // Engel CIFT YONLU gizler: tek yon olsaydi engellenen kisi engelleyenin planini gorur
        // ve istek atardi — engelin kapatmak icin var oldugu temasin ta kendisi.
        Set<UUID> hidden = new HashSet<>(blocks.blockedUserIdsOf(viewer));
        hidden.addAll(blocks.blockerUserIdsOf(viewer));
        GeoPoint from = viewerLocation == null ? null : TravelMinutes.approx(viewerLocation);

        List<Row> out = new ArrayList<>();
        for (Session s : sessions.findPublicUpcoming(now, now.plus(WINDOW))) {
            if (hidden.contains(s.hostId())) {
                continue;
            }
            if (!activities.isEmpty() && Collections.disjoint(activities, s.activityTypes())) {
                continue;
            }
            List<Participant> seats = sessions.participantsOf(s.id());
            int approved = approvedSeats(seats);
            // Dolu plan listede DURMAZ: acilamayacak bir karta dokunmak cikmaz sokak.
            if (s.openPlan().full(approved)) {
                continue;
            }
            out.add(new Row(s, hostName(seats), approved, s.openPlan().confirmed(approved),
                    minutesTo(s, seats, from, mode)));
        }
        return out;
    }

    /** Onayli koltuk = hesapli, elle EKLENMEMIS katilimci (host dahil) — SeatRequests ile ayni kural. */
    private static int approvedSeats(List<Participant> seats) {
        return (int) seats.stream().filter(p -> !p.manual() && p.userId() != null).count();
    }

    private static String hostName(List<Participant> seats) {
        return seats.stream().filter(Participant::host).map(Participant::displayName)
                .findFirst().orElse("");
    }

    /**
     * Hedef: capa varsa capa, yoksa host'un konumu (tek katilimciyken orta nokta odur).
     * Konum ya da mod yoksa dakika HIC hesaplanmaz — uydurma bir sayi basmaktansa satiri hic
     * cizme (Attribution ile ayni ilke).
     */
    private static Integer minutesTo(Session s, List<Participant> seats, GeoPoint from,
                                     TravelMode mode) {
        if (from == null) {
            return null;
        }
        GeoPoint target = s.anchor() != null ? s.anchor()
                : seats.stream().filter(Participant::host).map(Participant::location)
                        .filter(Objects::nonNull).findFirst().orElse(null);
        if (target == null) {
            return null;
        }
        // IKI nokta da yuvarlanir: `between` kendi `from`unu zaten yuvarliyor, hedef burada.
        return TravelMinutes.between(from, mode == null ? TravelMode.CAR : mode,
                TravelMinutes.approx(target));
    }
}
