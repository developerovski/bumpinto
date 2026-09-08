package com.bumpinto.adapter.out.persistence;

import com.bumpinto.application.text.Ids;
import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.port.PresenceStampsPort;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionType;
import com.bumpinto.infra.config.AppConfig;
import com.bumpinto.support.PostgresContainer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * NOT_SUPPORTED (StoreAdapterTest'ten TEK sapma): @DataJpaTest'in geri alinan test
 * transaction'i icinde koltuk satiri HENUZ COMMIT EDILMEMIS olurdu; damgalar REQUIRES_NEW ile
 * ayri bir baglantidan yaziliyor ve o baglanti satiri goremezdi (update 0 satir). Testin
 * kendisi transaction'siz kosar, kurulum aninda commit olur; artiklari {@link #cleanUp}
 * toplar.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@Import({SessionStoreAdapter.class, UserStoreAdapter.class, PresenceStampsAdapter.class,
        AppConfig.class})
class PresenceStampsAdapterTest {

    @ServiceConnection
    static PostgreSQLContainer<?> postgres = PostgresContainer.shared();

    @Autowired SessionStoreAdapter sessions;
    @Autowired UserStoreAdapter users;
    @Autowired PresenceStampsAdapter stamps;
    @Autowired ParticipantRepository participantRows;
    @Autowired PlatformTransactionManager txManager;

    private UUID sessionId;

    @Test
    void lastSeenIsOverwrittenButLinkOpenedIsWrittenOnlyOnce() {
        UUID seat = seat();
        Instant t1 = Instant.parse("2026-09-06T10:00:00Z");
        Instant t2 = t1.plusSeconds(600);
        stamps.markLinkOpened(seat, t1);
        stamps.markLinkOpened(seat, t2);
        stamps.touchLastSeen(seat, t1);
        stamps.touchLastSeen(seat, t2);
        PresenceStampsPort.Stamps out = stamps.stampsOf(sessionId).get(seat);
        assertThat(out.linkOpenedAt()).isEqualTo(t1);
        assertThat(out.lastSeenAt()).isEqualTo(t2);
    }

    @Test
    void unknownParticipantIsANoOpNotAnError() {
        stamps.touchLastSeen(UUID.randomUUID(), Instant.now());
        assertThat(stamps.stampsOf(UUID.randomUUID())).isEmpty();
    }

    /**
     * GERCEK istek deseni: OSIV acik oldugu icin bir HTTP istegi bastan sona TEK EntityManager
     * paylasir. Once koltuklar okunur (identity map dolar), sonra damga REQUIRES_NEW'da AYRI bir
     * transaction'da yazilir, sonra ayni istek icinde damgalar okunur.
     *
     * <p>{@code stampsOf} entity sorgusu olsaydi Hibernate satirlari identity map'teki ESKI
     * ornege baglar ve commit edilmis damgalari GORMEZDI. Bu test o hatayi yakalayan tek
     * duzenektir: once yukleme yapmayan bir yaz-oku testi identity map carpismasini hic
     * kurmadigi icin yesil kalirdi.
     */
    @Test
    void stampsAreFreshEvenWhenTheRequestAlreadyLoadedTheParticipantEntities() {
        UUID seat = seat();
        Instant at = Instant.parse("2026-09-06T11:00:00Z");

        Map<UUID, PresenceStampsPort.Stamps> out =
                new TransactionTemplate(txManager).execute(status -> {
                    // Istegin erken okumasi: koltuklar persistence context'e girer.
                    assertThat(participantRows.findBySessionIdOrderByJoinedAtAscIdAsc(sessionId))
                            .isNotEmpty();
                    stamps.markLinkOpened(seat, at);
                    stamps.touchLastSeen(seat, at);
                    return stamps.stampsOf(sessionId);
                });

        assertThat(out.get(seat).linkOpenedAt()).isEqualTo(at);
        assertThat(out.get(seat).lastSeenAt()).isEqualTo(at);
    }

    /** Transaction geri alinmadigi icin satirlar elle silinir; paylasilan container kirlenmesin. */
    @AfterEach
    void cleanUp() {
        if (sessionId != null) {
            sessions.deleteSession(sessionId); // participants FK cascade ile gider
            sessionId = null;
        }
    }

    /** Oturum + tek koltuk; donen deger koltugun kimligi, {@link #sessionId} testin oturumu. */
    private UUID seat() {
        String slug = Ids.slug();
        UUID host = users.upsertByEmail(slug + "@stamps.test", "Stamps " + slug);
        Session session = sessions.saveSession(new Session(UUID.randomUUID(), slug, host, "Cuma",
                List.of(ActivityType.COFFEE), SessionType.GROUP, SessionStatus.COLLECTING,
                Instant.now().plusSeconds(600), null, List.of()));
        sessionId = session.id();
        return sessions.saveParticipant(new Participant(UUID.randomUUID(), sessionId, "Mehmet",
                new GeoPoint(51.6978, 5.3037), true, null, false, null, null)).id();
    }
}
