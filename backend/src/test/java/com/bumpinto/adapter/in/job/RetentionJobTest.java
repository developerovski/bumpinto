package com.bumpinto.adapter.in.job;

import com.bumpinto.support.PostgresContainer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.scheduling.config.CronTask;
import org.springframework.scheduling.config.ScheduledTask;
import org.springframework.scheduling.config.ScheduledTaskHolder;
import org.springframework.scheduling.config.Task;
import org.testcontainers.containers.PostgreSQLContainer;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Zamanlayici dikisi: anotasyonun DERLENMESI degil, gercekten KAYIT OLMASI kanitlanir.
 * Yanlis cron ifadesi, cozulmemis property ve — asil risk — {@code retentionScheduler}
 * havuzunun {@code autowireCandidate = false} olmasi yuzunden bulunamamasi ancak boyle yakalanir.
 * Suitedeki diger her @SpringBootTest {@code bumpinto.retention.enabled=false} ile kostugu icin
 * bu yol bu testten once HIC calistirilmadi.
 */
@SpringBootTest(properties = {
        "bumpinto.venues.sources.foursquare.key=test-only-fsq-key",
        "bumpinto.retention.enabled=true"
})
class RetentionJobTest {

    @ServiceConnection
    static PostgreSQLContainer<?> postgres = PostgresContainer.shared();

    @Autowired ScheduledTaskHolder scheduledTasks;
    @Autowired RetentionJob job;

    @Test
    void thePurgeIsRegisteredAsADailyCronTaskOnTheRetentionScheduler() {
        List<String> crons = scheduledTasks.getScheduledTasks().stream()
                .map(ScheduledTask::getTask)
                .filter(CronTask.class::isInstance)
                .map(CronTask.class::cast)
                .filter(this::isPurgeTask)
                .map(CronTask::getExpression)
                .toList();

        assertThat(crons).containsExactly("0 30 3 * * *");
    }

    /** Zamanlayici havuzu cozulemezse context zaten ayaga kalkmaz; kosu da gercekten calisir
     *  — iki supurme birden (oturum + hesap). */
    @Test
    void theJobRunsWithoutBlowingUp() {
        assertThat(scheduledTasks.getScheduledTasks()).map(ScheduledTask::getTask)
                .anyMatch(this::isPurgeTask);

        job.run();
    }

    private boolean isPurgeTask(Task task) {
        return task.toString().contains("RetentionJob");
    }
}
