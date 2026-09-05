package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.port.VenueProviderPort;

/**
 * Orkestratorun gordugu saglayici. Yeni saglayici (TripAdvisor vb.) = bu arayuzu uygulayan
 * bir {@code @Order(n)} bean'i; sira o anotasyonda yazilidir.
 *
 * <p>Burada {@code measureQuota()} YOK: kota yalniz GERCEK aramalarin yanitindan ogrenilir
 * (FSQ'da {@code x-ratelimit-*} basliklari, Google'da yerel butce sayaci). Kota okumak icin
 * ayrica istek atmak — eski {@code ProviderQuotaScheduler}'in yaptigi — FSQ'da ucretli bir
 * cagriydi ve bos duran bir surecte bile 5 dakikada bir para harciyordu.
 */
public interface QuotaAwareVenueProvider extends VenueProviderPort {

    /** Cache anahtari ve log adi; {@code VenueCandidate.provider()} ile ayni dize. */
    String id();
}
