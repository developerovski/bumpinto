package com.bumpinto.domain.geo;

/**
 * Katilimcinin geldigi ulasim turu ve kaba ortalama hizi (km/sa) — spec §4.5b.
 *
 * <p>Sayilar OSRM gelene kadarki koprudur: yurume 5, bisiklet 16, e-bisiklet 24, toplu tasima
 * ~20 (bekleme dahil, en zayif tahmin), araba 72. Hepsi ayni ×1,3 yol katsayisini kullanir;
 * OSRM gelince araba/bisiklet/yaya gercek olur, toplu tasima tahmin kalir.
 *
 * <p>{@link #weight()} agirlikli orta nokta icindir: agirlik = 1/hiz, yani YAVAS olan orta
 * noktayi kendine ceker. Iki kiside bu tam olarak "esit sure" noktasini verir.
 */
public enum TravelMode {

    WALK(5.0), BIKE(16.0), EBIKE(24.0), TRANSIT(20.0), CAR(72.0);

    private final double kmh;

    TravelMode(double kmh) {
        this.kmh = kmh;
    }

    public double kmh() {
        return kmh;
    }

    public double weight() {
        return 1.0 / kmh;
    }
}
