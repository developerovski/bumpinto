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
        scheduler.setWaitForTasksToCompleteOnShutdown(true);
        return scheduler;
    }
}
