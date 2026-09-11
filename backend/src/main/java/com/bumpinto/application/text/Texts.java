package com.bumpinto.application.text;

public final class Texts {

    private Texts() {
    }

    public static String displayName(String raw) {
        return normalize(raw, 40);
    }

    public static String sessionName(String raw) {
        return raw == null ? null : normalize(raw, 60);
    }

    public static String label(String raw) {
        return raw == null || raw.isBlank() ? null : normalize(raw, 80);
    }

    /**
     * Katilim istegindeki tek cumlelik tanitim (B-17). 140 sinir SEMADA da var
     * ({@code seat_requests_note_len}) — burada kirpiliyor ki uzun metin 500 degil sessiz
     * kisaltma olsun; kisit yine de son savunma hatti olarak duruyor.
     */
    public static String note(String raw) {
        return raw == null || raw.isBlank() ? null : normalize(raw, 140);
    }

    // Kontrol karakterlerini söker, boşlukları toplar, uzunluğu sınırlar.
    // Tırnak/SQL keyword TEMİZLEMEZ — 's-Hertogenbosch geçerli veridir.
    private static String normalize(String raw, int maxLength) {
        if (raw == null) {
            throw new IllegalArgumentException("name is required");
        }
        String cleaned = raw.strip()
                .replaceAll("\\p{Cntrl}", "")
                .replaceAll("\\s{2,}", " ");
        if (cleaned.isEmpty()) {
            throw new IllegalArgumentException("name must not be blank");
        }
        return cleaned.length() <= maxLength ? cleaned : cleaned.substring(0, maxLength);
    }
}
