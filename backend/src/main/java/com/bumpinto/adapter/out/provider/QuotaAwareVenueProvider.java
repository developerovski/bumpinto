package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.port.VenueProviderPort;

/**
 * Kotasi olculebilen saglayici. Orkestrator ve scheduler yalniz bu arayuzu gorur;
 * yeni saglayici (TripAdvisor vb.) = bu arayuzu uygulayan bir {@code @Order(n)} bean'i.
 */
public interface QuotaAwareVenueProvider extends VenueProviderPort {

    /** Cache anahtari ve log adi; {@code VenueCandidate.provider()} ile ayni dize. */
    String id();

    /**
     * Kotayi simdi olc. Saglayiciya gore ucretli bir prob (FSQ) ya da yerel hesap (Google)
     * olabilir; scheduler bunu yalniz cache bayatladiginda cagirir.
     *
     * @throws RuntimeException olcum basarisizsa — scheduler yutar, eski deger kalir
     */
    ProviderQuota measureQuota();
}
