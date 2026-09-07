package com.bumpinto.application.text;

import java.security.SecureRandom;
import java.util.Locale;

public final class Ids {

    private static final String SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    /**
     * Sesli okunabilen ve yanlis yazilamayan alfabe: I/O/0/1 YOK (§2). 32 karakter (24 harf +
     * 8 rakam) -> 32^5 = 33.554.432 kod; tekillik DB'deki unique index ile garantilenir,
     * burada degil.
     */
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    static final int CODE_LENGTH = 5;

    private Ids() {
    }

    public static String slug() {
        StringBuilder sb = new StringBuilder(8);
        for (int i = 0; i < 8; i++) {
            sb.append(SLUG_ALPHABET.charAt(RANDOM.nextInt(SLUG_ALPHABET.length())));
        }
        return sb.toString();
    }

    public static String joinCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
        }
        return sb.toString();
    }

    /**
     * Buyuk harf, bosluk/tire atilir. Alfabe DISI karakter (I, O, 0, 1 dahil) DUZELTILMEZ ->
     * null: "0" ile "O"nun hangisinin kastedildigi bilinemez, tahmin yanlis oturuma sokardi.
     */
    public static String normalizeJoinCode(String raw) {
        if (raw == null) {
            return null;
        }
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (char c : raw.toUpperCase(Locale.ROOT).toCharArray()) {
            if (c == ' ' || c == '-' || c == '_') {
                continue;
            }
            if (CODE_ALPHABET.indexOf(c) < 0 || sb.length() == CODE_LENGTH) {
                return null;
            }
            sb.append(c);
        }
        return sb.length() == CODE_LENGTH ? sb.toString() : null;
    }

}
