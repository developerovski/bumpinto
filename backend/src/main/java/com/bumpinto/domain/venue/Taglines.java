package com.bumpinto.domain.venue;

import java.util.List;
import java.util.Locale;

/**
 * "Neyle bilinir" tek satiri. Saf ve TURETICIDIR: sunucu metin uretmez, saglayicinin verdigini
 * kirpip temizler. Veri yoksa null doner ve istemci satiri hic cizmez (§4.9: bos etiket yasak).
 */
public final class Taglines {

    static final int MAX = 80;
    /** Bundan kisa bir ipucu ("nice", "ok") bilgi tasimaz, gurultudur. */
    private static final int MIN = 12;

    private Taglines() {
    }

    /** FSQ {@code tips[].text}: ilk KULLANILABILIR ipucunun ilk cumlesi. */
    public static String fromTips(List<String> tips) {
        if (tips == null) {
            return null;
        }
        for (String tip : tips) {
            String candidate = firstSentence(tip);
            if (candidate != null) {
                return candidate;
            }
        }
        return null;
    }

    /** Acik veri (OSM/Overture) turevi: "Espresso bar · Eindhoven". Kategori yoksa null. */
    public static String fromCategory(String category, String locality) {
        if (category == null || category.isBlank()) {
            return null;
        }
        String head = capitalize(collapse(category));
        String tail = locality == null || locality.isBlank() ? null : collapse(locality);
        return clamp(tail == null ? head : head + " · " + tail);
    }

    private static String firstSentence(String raw) {
        if (raw == null) {
            return null;
        }
        String text = collapse(raw);
        // Baglanti/etiket tasiyan ipucu reklamdir; kart metnine girmez.
        if (text.contains("http") || text.contains("@") || text.contains("www.")) {
            return null;
        }
        int end = text.length();
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '.' || c == '!' || c == '?') {
                end = i;
                break;
            }
        }
        String sentence = text.substring(0, end).strip();
        return sentence.length() < MIN ? null : clamp(sentence);
    }

    /** Kontrol karakteri ve tekrarli bosluk temizligi (Texts ile ayni ruh, saf hali). */
    private static String collapse(String raw) {
        return raw.replaceAll("[\\p{Cntrl}\\s]+", " ").strip();
    }

    private static String capitalize(String s) {
        return s.isEmpty() ? s : s.substring(0, 1).toUpperCase(Locale.ROOT) + s.substring(1);
    }

    /** 80 KARAKTER SERT SINIR (R-B7 kabul a): kelime sinirinda kesilir, "…" eklenir. */
    static String clamp(String s) {
        if (s.length() <= MAX) {
            return s;
        }
        String cut = s.substring(0, MAX - 1);
        int space = cut.lastIndexOf(' ');
        return (space > MAX / 2 ? cut.substring(0, space) : cut).stripTrailing() + "…";
    }
}
