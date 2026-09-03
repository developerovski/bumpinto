package com.bumpinto.domain.deck;

import com.bumpinto.domain.geo.Fairness;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Random;
import java.util.function.Function;

/**
 * Deste ve liste sirasi (spec §4.5, kullanici karari 2026-09-03): birincil **en uzun yol**
 * artan, ikincil **fark** artan, esitlerde oturum tohumlu karisik — herkes AYNI sirayi gorur.
 *
 * <p>Neden "bant" yerine tam esitlik: dakikalar {@code TravelMinutes.STEP} = 5 dk basamagina
 * zaten yuvarlanmis geliyor, yani bir "5 dk bandi" tek bir yuvarlanmis degerdir. Bandi
 * maxMinutes ile tanimlayip icini tumden karistirsaydik ikincil anahtar (fark) yok olurdu;
 * bu yuzden karistirma yalniz (maxMinutes, spreadMinutes) ciftinde esit — yani gercekten
 * ayirt edilemez — mekanlar arasinda yapilir.
 */
public final class DeckOrdering {

    private DeckOrdering() {
    }

    public static <T> List<T> fairnessFirst(List<T> items, Function<T, Fairness> fairnessOf,
                                            long seed) {
        List<T> sorted = new ArrayList<>(items);
        sorted.sort(Comparator
                .comparingInt((T t) -> fairnessOf.apply(t).maxMinutes())
                .thenComparingInt(t -> fairnessOf.apply(t).spreadMinutes()));
        Random random = new Random(seed);
        List<T> out = new ArrayList<>(sorted.size());
        int i = 0;
        while (i < sorted.size()) {
            Fairness head = fairnessOf.apply(sorted.get(i));
            int j = i + 1;
            while (j < sorted.size() && sameGroup(head, fairnessOf.apply(sorted.get(j)))) {
                j++;
            }
            List<T> group = new ArrayList<>(sorted.subList(i, j));
            Collections.shuffle(group, random);
            out.addAll(group);
            i = j;
        }
        return List.copyOf(out);
    }

    private static boolean sameGroup(Fairness a, Fairness b) {
        return a.maxMinutes() == b.maxMinutes() && a.spreadMinutes() == b.spreadMinutes();
    }
}
