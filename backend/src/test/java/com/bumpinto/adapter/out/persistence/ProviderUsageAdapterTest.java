package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.port.ProviderUsagePort;
import com.bumpinto.support.PostgresContainer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

import java.time.YearMonth;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.IntStream;
import java.util.stream.LongStream;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@TestPropertySource(properties = {
        "bumpinto.security.google-client-id=test-client-id",
        "bumpinto.security.token-secret=test-only-secret-not-a-real-key-0123456789",
        "bumpinto.security.token-ttl=12h",
        "bumpinto.venues.sources.foursquare.key=test-only-fsq-key",
        "bumpinto.cors.allowed-origins=http://localhost:5173",
        "bumpinto.cookies.secure=false",
        "bumpinto.cookies.domain="
})
class ProviderUsageAdapterTest {

    @ServiceConnection
    static PostgreSQLContainer<?> postgres = PostgresContainer.shared();

    @Autowired ProviderUsagePort usage;

    @Test
    void incrementReturnsTheNewValueAndCurrentReadsItBack() {
        YearMonth month = YearMonth.of(2026, 9);
        assertThat(usage.increment("t-basic", month)).isEqualTo(1);
        assertThat(usage.increment("t-basic", month)).isEqualTo(2);
        assertThat(usage.current("t-basic", month)).isEqualTo(2);
        assertThat(usage.current("t-basic", YearMonth.of(2026, 10))).isZero();
    }

    /** ON CONFLICT ... RETURNING ATOMIK olmali: 20 es zamanli artis 20 FARKLI deger dondurmeli. */
    @Test
    void concurrentIncrementsNeverHandOutTheSameNumber() throws Exception {
        YearMonth month = YearMonth.of(2026, 11);
        try (ExecutorService pool = Executors.newFixedThreadPool(8)) {
            List<Callable<Long>> jobs = IntStream.range(0, 20)
                    .<Callable<Long>>mapToObj(i -> () -> usage.increment("t-race", month)).toList();
            List<Long> seen = pool.invokeAll(jobs).stream().map(ProviderUsageAdapterTest::get).toList();
            assertThat(seen).hasSize(20).doesNotHaveDuplicates()
                    .containsExactlyInAnyOrderElementsOf(LongStream.rangeClosed(1, 20).boxed().toList());
        }
        assertThat(usage.current("t-race", month)).isEqualTo(20);
    }

    static long get(Future<Long> f) {
        try { return f.get(); } catch (Exception e) { throw new IllegalStateException(e); }
    }
}
