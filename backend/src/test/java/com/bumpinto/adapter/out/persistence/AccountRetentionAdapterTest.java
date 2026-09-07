package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.geo.TravelMode;
import com.bumpinto.domain.port.BlockStorePort;
import com.bumpinto.domain.port.ReportStorePort;
import com.bumpinto.domain.safety.Block;
import com.bumpinto.domain.safety.Report;
import com.bumpinto.domain.safety.ReportReason;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.session.Participant;
import com.bumpinto.domain.session.Session;
import com.bumpinto.domain.session.SessionStatus;
import com.bumpinto.domain.session.SessionType;
import com.bumpinto.support.PostgresContainer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * K-B33: hesap 30 gun sonra FIZIKSEL silinir. Bu test ayni zamanda V15'in FK kararini kanitlar —
 * rapor izi KALIR (`on delete set null`), engel GIDER (`on delete cascade`). O karar olmasaydi
 * supurme FK ihlaliyle patlardi ve "30 gunde kalici silinir" sozu tutmazdi.
 */
@SpringBootTest(properties = {
        "bumpinto.venues.sources.foursquare.key=test-only-fsq-key",
        "bumpinto.retention.enabled=false"
})
class AccountRetentionAdapterTest {

    @ServiceConnection
    static PostgreSQLContainer<?> postgres = PostgresContainer.shared();

    @Autowired SessionStoreAdapter sessions;
    @Autowired UserStoreAdapter users;
    @Autowired RetentionAdapter retention;
    @Autowired ReportStorePort reports;
    @Autowired BlockStorePort blocks;
    @Autowired JdbcTemplate jdbc;

    private static final Instant NOW = Instant.parse("2026-09-07T03:30:00Z");

    @BeforeEach
    void clean() {
        jdbc.update("delete from sessions");
        jdbc.update("delete from users where purge_after is not null");
    }

    @Test
    void purgesStampedAccountsInBatchesAndLeavesLiveOnesAlone() {
        UUID due1 = stamped("purge-due-1@bumpinto.test", NOW.minus(Duration.ofDays(2)));
        UUID due2 = stamped("purge-due-2@bumpinto.test", NOW.minus(Duration.ofDays(1)));
        UUID onTheLine = stamped("purge-line@bumpinto.test", NOW);          // sinir KATI: kalir
        UUID notYet = stamped("purge-later@bumpinto.test", NOW.plus(Duration.ofDays(5)));
        UUID live = users.upsertByEmail("purge-live@bumpinto.test", "Yasayan");

        assertThat(retention.deleteAccountsPurgeableBefore(NOW, 1)).isEqualTo(1);
        assertThat(retention.deleteAccountsPurgeableBefore(NOW, 10)).isEqualTo(1);
        assertThat(retention.deleteAccountsPurgeableBefore(NOW, 10)).isZero();

        assertThat(exists(due1)).isFalse();
        assertThat(exists(due2)).isFalse();
        assertThat(exists(onTheLine)).isTrue();
        assertThat(exists(notYet)).isTrue();
        assertThat(exists(live)).isTrue();
    }

    /** V15 kararinin kaniti: rapor kaydi denetim izi olarak KALIR, kisisel bag kopar. */
    @Test
    void reportsOutliveTheirReporterButBlocksGoWithTheAccount() {
        UUID reporter = stamped("purge-reporter@bumpinto.test", NOW.minus(Duration.ofDays(1)));
        UUID other = users.upsertByEmail("purge-other@bumpinto.test", "Oteki");
        Session session = sessions.saveSession(new Session(UUID.randomUUID(), "purge-acc", other,
                "Kahve", List.of(ActivityType.COFFEE), SessionType.GROUP, SessionStatus.COLLECTING,
                NOW.plus(Duration.ofHours(24)), null, List.of()));
        Participant target = sessions.saveParticipant(new Participant(UUID.randomUUID(),
                session.id(), "Hedef", new GeoPoint(51.44, 5.47), false, null, false, null,
                TravelMode.CAR, other));
        UUID reportId = reports.save(new Report(UUID.randomUUID(), reporter, session.id(),
                target.id(), ReportReason.HARASSMENT, "not", NOW)).id();
        UUID blockId = blocks.save(Block.ofUser(UUID.randomUUID(), reporter, other, NOW)).id();
        UUID incoming = blocks.save(Block.ofUser(UUID.randomUUID(), other, reporter, NOW)).id();

        assertThat(retention.deleteAccountsPurgeableBefore(NOW, 10)).isEqualTo(1);

        assertThat(exists(reporter)).isFalse();
        // Rapor DURUYOR ama kimi yazdigi artik bilinmiyor: bildirilen kisi hakkindaki kayit,
        // bildireni susturarak temizlenemez.
        assertThat(count("select count(*) from reports where id = ?", reportId)).isEqualTo(1);
        assertThat(jdbc.queryForObject(
                "select count(*) from reports where id = ? and reporter_user_id is null",
                Integer.class, reportId)).isEqualTo(1);
        // Engeller iki yonde de GITTI: sahibi olmayan engel listesi anlamsizdir.
        assertThat(count("select count(*) from blocks where id = ?", blockId)).isZero();
        assertThat(count("select count(*) from blocks where id = ?", incoming)).isZero();
    }

    private UUID stamped(String email, Instant purgeAfter) {
        UUID id = users.upsertByEmail(email, "Silinen");
        users.softDelete(id, purgeAfter.minus(Duration.ofDays(30)), purgeAfter);
        return id;
    }

    private boolean exists(UUID userId) {
        return count("select count(*) from users where id = ?", userId) == 1;
    }

    private int count(String sql, UUID id) {
        return jdbc.queryForObject(sql, Integer.class, id);
    }
}
