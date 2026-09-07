package com.bumpinto;

import com.bumpinto.support.PostgresContainer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jdbc.test.autoconfigure.JdbcTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@JdbcTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ImportAutoConfiguration(FlywayAutoConfiguration.class)
class SchemaMigrationTest {

    @ServiceConnection
    static PostgreSQLContainer<?> postgres = PostgresContainer.shared();

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void flywayCreatesAllSixTables() {
        List<String> tables = jdbc.queryForList(
                "select table_name from information_schema.tables where table_schema = 'public'",
                String.class);
        assertThat(tables).contains("users", "sessions", "participants", "venues", "swipes", "votes");
    }

    @Test
    void v3AddsSessionTypeAndManualParticipantColumns() {
        assertThat(columnsOf("sessions")).contains("session_type");
        assertThat(columnsOf("participants")).contains("is_manual", "location_label");
    }

    /**
     * V6: katilimci token'i imzali JWT oldu, sir artik yalniz istemcide yasar. Kolon duz metin
     * bir bearer sirri tutuyordu — bir DB dokumu tum canli oturum kimlikleri demekti.
     */
    @Test
    void v6DropsThePlaintextParticipantTokenColumn() {
        assertThat(columnsOf("participants")).doesNotContain("token");
    }

    /** Bir hesap bir oturumda TEK koltuk tutar; anonim koltuklar (user_id null) disaridadir. */
    @Test
    void v7AddsSeatOwnershipWithOneSeatPerAccount() {
        assertThat(columnsOf("participants")).contains("user_id");
        assertThat(jdbc.queryForObject(
                "select indexdef from pg_indexes where indexname = 'uq_participants_session_user'",
                String.class))
                .contains("UNIQUE").contains("session_id").contains("user_id")
                .contains("IS NOT NULL");
    }

    /** V8: oturum 1-3 ilgi alani tasir (CSV), mekan hangi alandan geldigini bilir. */
    @Test
    void v8RenamesSessionActivityToCsvAndAttributesVenues() {
        assertThat(columnsOf("sessions")).contains("activity_types").doesNotContain("activity_type");
        assertThat(columnsOf("venues")).contains("activity_type");
    }

    @Test
    void v4AddsUserPreferenceColumns() {
        assertThat(columnsOf("users")).contains("default_lat", "default_lng",
                "default_location_label", "default_activity", "language");
    }

    @Test
    void v5AddsTravelModeFairnessAndProviderColumns() {
        assertThat(columnsOf("participants")).contains("travel_mode");
        assertThat(columnsOf("users")).contains("default_travel_mode");
        assertThat(columnsOf("sessions"))
                .contains("decided_at", "decision_kind", "runoff_reason", "midpoint_label");
        assertThat(columnsOf("venues"))
                .contains("category", "address", "locality", "rating_count", "place_link",
                        "hours_today");
        String def = jdbc.queryForObject(
                "select column_default from information_schema.columns "
                        + "where table_name = 'participants' and column_name = 'travel_mode'",
                String.class);
        assertThat(def).contains("CAR");
        String nullable = jdbc.queryForObject(
                "select is_nullable from information_schema.columns "
                        + "where table_name = 'participants' and column_name = 'travel_mode'",
                String.class);
        assertThat(nullable).isEqualTo("NO");
    }

    /** V12: purge her kosuda expires_at uzerinden tarar; index yoksa her kosu seq-scan olur. */
    @Test
    void v12IndexesSessionExpiryForRetentionScans() {
        assertThat(jdbc.queryForObject(
                "select indexdef from pg_indexes where indexname = 'idx_sessions_expires_at'",
                String.class))
                .contains("sessions").contains("expires_at");
    }

    /** V13: apple_sub birincil eslestirici; tekil auth_provider kolonu CSV'ye tasindi. */
    @Test
    void v13AddsAppleIdentityAndMultiValuedProviders() {
        assertThat(columnsOf("users")).contains("apple_sub", "apple_refresh_token", "auth_providers")
                .doesNotContain("auth_provider");
        assertThat(jdbc.queryForObject("select indexdef from pg_indexes "
                + "where indexname = 'uq_users_apple_sub'", String.class))
                .contains("UNIQUE").contains("apple_sub").contains("IS NOT NULL");
    }

    /** V14: erisim aninda kapanir (deleted_at); fiziksel silme T12'nin isi (purge_after). */
    @Test
    void v14AddsSoftDeleteStampsAndParticipantAnonymization() {
        assertThat(columnsOf("users")).contains("deleted_at", "purge_after");
        assertThat(columnsOf("participants")).contains("anonymized_at");
        assertThat(jdbc.queryForList("select indexname from pg_indexes where tablename = 'users'",
                String.class)).contains("idx_users_purge_after");
    }

    @Test
    void v15AddsReportsAndBlocks() {
        assertThat(columnsOf("reports")).contains("id", "reporter_user_id", "session_id",
                "target_participant_id", "reason", "note", "created_at");
        assertThat(columnsOf("blocks")).contains("id", "blocker_user_id", "blocked_user_id",
                "blocked_participant_id", "session_id", "created_at");
    }

    /**
     * K-B33: users satiri 30 gun sonra FIZIKSEL silinir (Task 12). users'a bakan her FK bunu
     * kaldirabilmeli, yoksa supurme ihlalle patlar. Rapor izi KALIR (set null), engel GIDER.
     */
    @Test
    void v15UserReferencesSurviveAPhysicalAccountPurge() {
        assertThat(deleteRuleOf("reports", "reporter_user_id")).isEqualTo("SET NULL");
        assertThat(deleteRuleOf("blocks", "blocker_user_id")).isEqualTo("CASCADE");
        assertThat(deleteRuleOf("blocks", "blocked_user_id")).isEqualTo("CASCADE");
    }

    /** V16: varsayilan HEPSI false (KVKK m.5/1 acik riza). */
    @Test
    void v16AddsConsentColumnsDefaultingToFalse() {
        assertThat(columnsOf("users")).contains("consent_location", "consent_microphone",
                "consent_analytics", "consents_updated_at", "consents_version");
        assertThat(jdbc.queryForObject("select column_default from information_schema.columns "
                + "where table_name = 'users' and column_name = 'consent_analytics'",
                String.class)).contains("false");
    }

    /**
     * V18: presence damgalari KALICI kolonlar (surec ici presence onlarin uzerine yazamaz) ve
     * davet kodu TEKIL. Kodsuz (null) oturum serbesttir — Postgres unique indexte NULL'lari
     * ayirt eder, yoksa suresi dolmus tum oturumlar tek bir "kodsuz" satira sikisirdi.
     */
    @Test
    void v18AddsPresenceStampsAndAShapeCheckedUniqueJoinCode() {
        assertThat(columnsOf("participants")).contains("last_seen_at", "link_opened_at");
        assertThat(columnsOf("sessions")).contains("join_code");
        assertThat(jdbc.queryForObject(
                "select indexdef from pg_indexes where indexname = 'sessions_join_code_key'",
                String.class)).contains("UNIQUE").contains("join_code");
        assertThat(jdbc.queryForObject("select pg_get_constraintdef(oid) from pg_constraint "
                + "where conname = 'sessions_join_code_shape_check'", String.class))
                .contains("ABCDEFGHJKLMNPQRSTUVWXYZ23456789");

        UUID host = insertHost("v18-unique@bumpinto.test");
        insertSession(host, "v18null1", null);
        insertSession(host, "v18null2", null); // iki NULL carpismaz
        insertSession(host, "v18code1", "X7K2M");

        assertThatThrownBy(() -> insertSession(host, "v18code2", "X7K2M"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    /** I/O/0/1 alfabede YOK: "0" mi "O" mu belirsizligi yanlis oturuma sokardi. */
    @Test
    void v18RejectsAJoinCodeOutsideTheUnambiguousAlphabet() {
        UUID host = insertHost("v18-shape@bumpinto.test");
        assertThatThrownBy(() -> insertSession(host, "v18bad1", "X7K2I"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    /** Kod TAM 5 hane; kisa kod uzayin bir bolumunu sessizce carpistirirdi. */
    @Test
    void v18RejectsAJoinCodeOfTheWrongLength() {
        UUID host = insertHost("v18-len@bumpinto.test");
        assertThatThrownBy(() -> insertSession(host, "v18bad2", "X7K2"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private UUID insertHost(String email) {
        UUID id = UUID.randomUUID();
        jdbc.update("insert into users (id, email, name) values (?, ?, ?)", id, email, "V18");
        return id;
    }

    private void insertSession(UUID hostId, String slug, String joinCode) {
        jdbc.update("""
                insert into sessions (id, slug, host_id, activity_types, status, expires_at,
                                      join_code)
                values (?, ?, ?, 'COFFEE', 'COLLECTING', now() + interval '1 day', ?)
                """, UUID.randomUUID(), slug, hostId, joinCode);
    }

    /** Kolonun users'a bakan FK'sinin ON DELETE kurali. */
    private String deleteRuleOf(String table, String column) {
        return jdbc.queryForObject("""
                select rc.delete_rule
                  from information_schema.referential_constraints rc
                  join information_schema.key_column_usage k
                    on k.constraint_name = rc.constraint_name
                 where k.table_name = ? and k.column_name = ?
                """, String.class, table, column);
    }

    private List<String> columnsOf(String table) {
        return jdbc.queryForList(
                "select column_name from information_schema.columns where table_name = ?",
                String.class, table);
    }
}
