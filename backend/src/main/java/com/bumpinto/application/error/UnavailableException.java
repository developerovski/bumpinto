package com.bumpinto.application.error;

/** Ozellik YAPILANDIRILMAMIS: istemci hatasi degil, sunucu yetenegi eksik (503). */
public class UnavailableException extends RuntimeException {

    public UnavailableException(String message) {
        super(message);
    }
}
