package com.bumpinto.application.error;

/**
 * Sunulan kimlik REDDEDILDI (401). {@code ForbiddenException}'dan farki: orada kimlik
 * gecerlidir ama yetki yoktur; burada kimligin KENDISI kabul edilmez ve dogru istemci
 * davranisi "yenile ya da yeniden giris yap"tir.
 */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }
}
