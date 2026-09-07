package com.bumpinto.domain.og;

/**
 * Davet karti UZERINDEKI HER SEY. Koordinat, katilimci adlari ve mekan YOKTUR (R-B10 kabul b):
 * bu goruntu link'i eline gecen HERKESE acilir ve onizleme sunucularinda onbelleklenir.
 *
 * @param title            oturum adi; yoksa jenerik bir cagri
 * @param activityLabel    etkinlik turleri; ust satirda kucuk yazi
 * @param hostDisplayName  daveti kuran; null ise "Bir arkadasin"
 * @param participantCount koltuk sayisi (elle eklenen noktalar sayilmaz)
 * @param expired          suresi dolmus / bilinmeyen oturum
 */
public record OgCard(String title, String activityLabel, String hostDisplayName,
                     int participantCount, boolean expired) {

    /** Suresi dolmus / bilinmeyen oturum: jenerik kart (kabul c). */
    public static OgCard generic() {
        return new OgCard("BumpInto", "Birlikte karar verin", null, 0, true);
    }
}
