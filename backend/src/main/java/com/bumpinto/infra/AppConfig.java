package com.bumpinto.infra;

import com.bumpinto.domain.deck.DecisionEngine;
import kong.unirest.core.Unirest;
import kong.unirest.core.UnirestInstance;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

@Configuration
@EnableConfigurationProperties(AppProps.class)
public class AppConfig {

    /**
     * Domain sınıfı olduğu için @Component olamaz (ArchUnit: domain'de Spring yok);
     * bean'lenmezse DeckFlow kurulamaz ve uygulama hiç ayağa kalkmaz.
     */
    @Bean
    DecisionEngine decisionEngine() {
        return new DecisionEngine();
    }

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }

    @Bean(destroyMethod = "close")
    UnirestInstance unirest() {
        UnirestInstance instance = Unirest.spawnInstance();
        instance.config().connectTimeout(3000).requestTimeout(5000);
        return instance;
    }
}
