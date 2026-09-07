package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.port.UserDataPort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/** Sayimlar TEK sorguda toplanir: koltuk basina ayri sorgu 20 oturumda 40 gidis donus demekti. */
@Component
public class UserDataAdapter implements UserDataPort {

    private final ParticipantRepository participants;
    private final SwipeRepository swipes;
    private final VoteRepository votes;

    UserDataAdapter(ParticipantRepository participants, SwipeRepository swipes,
                    VoteRepository votes) {
        this.participants = participants;
        this.swipes = swipes;
        this.votes = votes;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Participation> participationsOf(UUID userId) {
        List<Object[]> rows = participants.exportRowsOf(userId);
        Set<UUID> seatIds = rows.stream().map(r -> (UUID) r[0]).collect(Collectors.toSet());
        if (seatIds.isEmpty()) {
            return List.of();
        }
        Map<UUID, List<SwipeEntity>> bySeat = swipes.findByParticipantIdIn(seatIds).stream()
                .collect(Collectors.groupingBy(s -> s.participantId));
        Set<UUID> votedSeats = votes.findByParticipantIdIn(seatIds).stream()
                .map(v -> v.participantId).collect(Collectors.toSet());
        List<Participation> out = new ArrayList<>(rows.size());
        for (Object[] r : rows) {
            UUID seatId = (UUID) r[0];
            List<SwipeEntity> mine = bySeat.getOrDefault(seatId, List.of());
            Double lat = (Double) r[6];
            Double lng = (Double) r[7];
            out.add(new Participation((String) r[1], (String) r[2], (boolean) r[3],
                    (Instant) r[4], (String) r[5],
                    lat == null || lng == null ? null : new GeoPoint(lat, lng),
                    (String) r[8], TravelMode.valueOf((String) r[9]),
                    mine.stream().filter(s -> s.liked).count(),
                    mine.stream().filter(s -> !s.liked).count(),
                    votedSeats.contains(seatId)));
        }
        return out;
    }
}
