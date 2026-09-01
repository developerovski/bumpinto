package com.bumpinto.support;

import org.testcontainers.containers.PostgreSQLContainer;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.time.Duration;
import java.time.Instant;

/**
 * Tüm entegrasyon testleri için tek Postgres container.
 * Sınıf yüklenirken başlatılır: Spring context ayağa kalkmadan önce hazır olması gerekir,
 * aksi halde @ServiceConnection henüz eşlenmemiş porta bağlanmaya çalışır.
 */
public final class PostgresContainer {

    private static final int REQUIRED_CONSECUTIVE_CONNECTIONS = 3;
    private static final Duration PROBE_INTERVAL = Duration.ofMillis(250);
    private static final Duration READY_TIMEOUT = Duration.ofSeconds(60);

    private static PostgreSQLContainer<?> instance;

    private PostgresContainer() {
    }

    public static synchronized PostgreSQLContainer<?> shared() {
        if (instance == null) {
            PostgreSQLContainer<?> container = new PostgreSQLContainer<>("postgres:16-alpine");
            container.start();
            awaitStableHostPort(container);
            instance = container;
        }
        return instance;
    }

    /**
     * Rancher Desktop'ın host port yönlendirmesi container başladıktan sonra kısa süre dalgalanır:
     * ilk bağlantı başarılı olsa da hemen ardından "connection refused" dönebilir ve Spring context
     * başlangıcı buna takılır. Arka arkaya birkaç başarılı bağlantı görene kadar bekle.
     */
    private static void awaitStableHostPort(PostgreSQLContainer<?> container) {
        Instant deadline = Instant.now().plus(READY_TIMEOUT);
        int consecutive = 0;
        SQLException lastFailure = null;

        while (Instant.now().isBefore(deadline)) {
            try (Connection ignored = DriverManager.getConnection(
                    container.getJdbcUrl(), container.getUsername(), container.getPassword())) {
                if (++consecutive >= REQUIRED_CONSECUTIVE_CONNECTIONS) {
                    return;
                }
            } catch (SQLException e) {
                consecutive = 0;
                lastFailure = e;
            }
            sleep(PROBE_INTERVAL);
        }
        throw new IllegalStateException(
                "Postgres host portu " + READY_TIMEOUT + " içinde kararlı hale gelmedi: " + container.getJdbcUrl(),
                lastFailure);
    }

    private static void sleep(Duration duration) {
        try {
            Thread.sleep(duration.toMillis());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Postgres hazır olma beklemesi kesildi", e);
        }
    }
}
