package com.bumpinto.domain.port;

import java.time.Duration;
import java.util.UUID;

/**
 * Durt kotasi. Anahtar CIFTTIR (kim -> kimi): tek bir kisi birini spam'leyemesin ama oturumdaki
 * herkes ayni kisiyi bir kez durtebilsin — kota yalniz hedefe bagli olsaydi ilk durten
 * digerlerini 60 sn susturur, kotayi "ilk basana" cevirirdi.
 */
@FunctionalInterface
public interface NudgeCooldownPort {

    /** Hak varsa true doner VE tuketir; yoksa false. */
    boolean tryNudge(UUID fromParticipantId, UUID toParticipantId, Duration window);
}
