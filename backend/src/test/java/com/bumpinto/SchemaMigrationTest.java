package com.bumpinto;

import com.bumpinto.support.PostgresContainer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jdbc.test.autoconfigure.JdbcTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

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
        String tokenNullable = jdbc.queryForObject(
                "select is_nullable from information_schema.columns "
                        + "where table_name = 'participants' and column_name = 'token'", String.class);
        assertThat(tokenNullable).isEqualTo("YES");
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

    private List<String> columnsOf(String table) {
        return jdbc.queryForList(
                "select column_name from information_schema.columns where table_name = ?",
                String.class, table);
    }
}
