package com.bumpinto.domain.port;

import java.time.Instant;

/**
 * Spec §6 (GDPR): suresi dolan oturumlar KALICI silinir — indirgeme degil, silme.
 * {@link VenueRetentionPort} ile karistirilmasin: o, saglayici metadata'sini yerinde bosaltir;
 * bu, oturumu ve cascade ile tum katilimci verisini (ad + koordinat) tablodan kaldirir.
 *
 * <p>Ayri bir port: saklama SessionStorePort'un ilgi alani degil. Sicak porta metot eklemek
 * tum implementasyonlari ve test fake'lerini purge tasimaya zorlardi.
 */
public interface RetentionPort {

    /**
     * expiresAt'i cutoff'tan ONCE olan oturumlardan en fazla batchSize kadarini siler.
     * Sinir katidir: {@code expiresAt == cutoff} olan oturum kalir.
     *
     * @return gercekten silinen oturum sayisi; batchSize'dan kucukse elde is kalmamis demektir
     */
    int deleteSessionsExpiredBefore(Instant cutoff, int batchSize);

    /**
     * purgeAfter'i gecmis, silinmis hesaplari FIZIKSEL siler. Damga zaten +30 gun tasir:
     * burada IKINCI kez gecikme EKLENMEZ. Sinir KATI (<), oturum supurmesiyle ayni.
     *
     * @return gercekten silinen hesap sayisi
     */
    int deleteAccountsPurgeableBefore(Instant now, int batchSize);
}
