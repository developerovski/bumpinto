package com.bumpinto.domain.port;

import java.time.YearMonth;

/** Saglayici basina aylik cagri sayaci; butce replica'lar arasinda paylasildigi icin DB'de. */
public interface ProviderUsagePort {

    /** Bir artirir ve YENI degeri doner (atomik). */
    long increment(String provider, YearMonth month);

    /** Bu aya kadar yapilan cagri; satir yoksa 0. */
    long current(String provider, YearMonth month);
}
