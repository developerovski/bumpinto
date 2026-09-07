package com.bumpinto.infra.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/** Saklama isi KENDI havuzunda: STOMP heartbeat zamanlayicisini paylasmasin. */
@Configuration
@EnableScheduling
public class SchedulingConfig {

    /** autowireCandidate=false: InMemoryVoiceRooms'un TaskScheduler enjeksiyonu belirsizlesmesin. */
    @Bean(autowireCandidate = false)
    ThreadPoolTaskScheduler retentionScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("retention-");
        scheduler.setAwaitTerminationSeconds(5);
        // KOSAN is bitirilir (yarim kalan purge partisi geri alinmasin diye)...
        scheduler.setWaitForTasksToCompleteOnShutdown(true);
        // ...ama SIRADA BEKLEYEN gecikmeli is atilir. Cron gorevi (SessionPurgeJob) kuyruga
        // tek atimlik gecikmeli bir is olarak girer ve varsayilan politika onu kapanista
        // BEKLER: pod sonlandirmasi her seferinde awaitTermination timeout'una duser
        // ("Timed out while waiting for executor 'retentionScheduler' to terminate") ve
        // rolling deploy gereksiz yere yavaslar. Bir sonraki kosu zaten yeni pod'da.
        scheduler.setExecuteExistingDelayedTasksAfterShutdownPolicy(false);
        scheduler.setRemoveOnCancelPolicy(true);
        return scheduler;
    }
}
