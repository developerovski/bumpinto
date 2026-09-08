package com.bumpinto.support;

import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

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
            PostgreSQLContainer<?> container = new PostgreSQLContainer<>(
                    DockerImageName.parse("postgis/postgis:16-3.4").asCompatibleSubstituteFor("postgres"));
            // Tek container'i ONLARCA Spring context paylasir ve her birinin Hikari havuzu
            // varsayilan 10 baglanti tutar. Postgres'in varsayilan 100'luk tavani ~10. context'te
            // dolar; suite'in EN SON ayaga kalkan baglami "sorry, too many clients already" ile
            // patlar — testin kendisiyle ilgisi olmayan, yeni bir test sinifi eklenince sira
            // degistigi icin yer degistiren bir hata. fsync=off Testcontainers'in VARSAYILAN
            // komutundan gelir; komutu ezdigimiz icin burada TEKRAR edilmeli, yoksa her test
            // diske senkron yazar.
            container.withCommand("postgres", "-c", "fsync=off", "-c", "max_connections=300");
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
