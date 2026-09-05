package com.bumpinto.adapter.out.persistence;

import com.bumpinto.support.PostgresContainer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class PersistenceSliceTest {

    @ServiceConnection
    static PostgreSQLContainer<?> postgres = PostgresContainer.shared();

    @Autowired UserRepository users;
    @Autowired SessionRepository sessions;
    @Autowired ParticipantRepository participants;

    @Test
    void sessionAndParticipantRoundTrip() {
        UserEntity u = UserEntity.of(UUID.randomUUID(), "m@x.dev", "Mehmet", "google");
        users.save(u);

        SessionEntity s = new SessionEntity();
        s.id = UUID.randomUUID();
        s.slug = "x7k2m";
        s.hostId = u.id;
        s.name = "Cuma kahvesi";
        s.activityTypes = "COFFEE";
        s.sessionType = "GROUP";
        s.status = "COLLECTING";
        s.expiresAt = Instant.now().plusSeconds(3600);
        sessions.save(s);

        ParticipantEntity p = new ParticipantEntity();
        p.id = UUID.randomUUID();
        p.sessionId = s.id;
        p.displayName = "Mehmet";
        p.lat = 51.6978;
        p.lng = 5.3037;
        p.isHost = true;
        participants.save(p);

        assertThat(sessions.findBySlug("x7k2m")).isPresent();
        assertThat(participants.findBySessionIdOrderByJoinedAtAscIdAsc(s.id)).hasSize(1);
    }
}
