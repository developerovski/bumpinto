package com.bumpinto.domain.geo;

import java.util.Map;
import java.util.UUID;

/**
 * Bir mekanin adalet olcusu (spec §4.1): birincil **en uzun yol** (minimax — en magduru en az
 * magdur eden), ikincil **fark** (max − min). Ekranda yazilan sayi farktir; sira ve rozet
 * ikisini birden kullanir. Toplam yol BILEREK yok: yuku tek kisiye yigar.
 *
 * @param longestParticipantId en uzun yolu olan kisi ("{{ad}} icin uzak" rozeti); esitlikte
 *                             haritanin ilk anahtari — cagiran LinkedHashMap verirse sonuc
 *                             deterministiktir.
 */
public record Fairness(int maxMinutes, int spreadMinutes, UUID longestParticipantId) {

    public static Fairness of(Map<UUID, Integer> minutesByParticipant) {
        if (minutesByParticipant == null || minutesByParticipant.isEmpty()) {
            return new Fairness(0, 0, null);
        }
        int max = Integer.MIN_VALUE;
        int min = Integer.MAX_VALUE;
        UUID longest = null;
        for (Map.Entry<UUID, Integer> e : minutesByParticipant.entrySet()) {
            if (e.getValue() > max) {
                max = e.getValue();
                longest = e.getKey();
            }
            if (e.getValue() < min) {
                min = e.getValue();
            }
        }
        return new Fairness(max, max - min, longest);
    }
}
