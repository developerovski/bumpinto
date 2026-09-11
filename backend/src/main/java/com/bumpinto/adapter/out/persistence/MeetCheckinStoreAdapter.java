package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.port.MeetCheckinStorePort;
import com.bumpinto.domain.session.MeetCheckin;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Component
class MeetCheckinStoreAdapter implements MeetCheckinStorePort {

    private final MeetCheckinRepository repo;

    MeetCheckinStoreAdapter(MeetCheckinRepository repo) {
        this.repo = repo;
    }

    /**
     * `save` bilesik anahtarla ustune yazar (JPA merge): kisi fikrini degistirebilir ve ikinci
     * cevap birincil anahtar ihlali degil GUNCELLEMEDIR.
     */
    @Override public void upsert(MeetCheckin checkin) {
        MeetCheckinEntity e = new MeetCheckinEntity();
        e.id = new MeetCheckinEntity.Id(checkin.sessionId(), checkin.participantId());
        e.met = checkin.met();
        repo.save(e);
    }

    @Override public List<Instant> metCheckinTimesOf(UUID userId) {
        return repo.findMetByUser(userId).stream().map(e -> e.createdAt).toList();
    }
}
