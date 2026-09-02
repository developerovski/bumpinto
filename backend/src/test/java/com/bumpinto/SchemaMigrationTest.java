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
        List<String> sessionCols = jdbc.queryForList(
                "select column_name from information_schema.columns where table_name = 'sessions'",
                String.class);
        assertThat(sessionCols).contains("session_type");
        List<String> participantCols = jdbc.queryForList(
                "select column_name from information_schema.columns where table_name = 'participants'",
                String.class);
        assertThat(participantCols).contains("is_manual", "location_label");
        String tokenNullable = jdbc.queryForObject(
                "select is_nullable from information_schema.columns "
                        + "where table_name = 'participants' and column_name = 'token'", String.class);
        assertThat(tokenNullable).isEqualTo("YES");
    }
}
