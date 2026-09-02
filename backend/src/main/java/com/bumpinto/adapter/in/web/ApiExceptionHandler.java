package com.bumpinto.adapter.in.web;

import com.bumpinto.application.error.ConflictException;
import com.bumpinto.application.error.ForbiddenException;
import com.bumpinto.application.error.NoVenuesFoundException;
import com.bumpinto.application.error.NotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
class ApiExceptionHandler {

    record ApiError(String error) {
    }

    @ExceptionHandler(NotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    ApiError notFound(NotFoundException e) {
        return new ApiError(e.getMessage());
    }

    @ExceptionHandler(ConflictException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    ApiError conflict(ConflictException e) {
        return new ApiError(e.getMessage());
    }

    @ExceptionHandler(ForbiddenException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    ApiError forbidden(ForbiddenException e) {
        return new ApiError(e.getMessage());
    }

    @ExceptionHandler(NoVenuesFoundException.class)
    @ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
    ApiError noVenues(NoVenuesFoundException e) {
        return new ApiError(e.getMessage());
    }

    /**
     * Google id_token'in reddi (imza/issuer/exp/audience) KULLANICI tarafinin hatasidir: 401.
     * Eslenmezse GoogleIdVerifier.verify'in JwtException'i 500 olarak sizar ve gecmis bir
     * oturum "sunucu hatasi" gibi loglanir. Govde mesaji tasimaz: dogrulayici metni saldirgana
     * hangi kontrolun kaldigini soyler.
     */
    @ExceptionHandler(JwtException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    ApiError invalidIdToken(JwtException e) {
        return new ApiError("invalid_token");
    }

    /**
     * Değer nesnelerinin (GeoPoint, Texts, UUID) reddettiği girdi bozuk İSTEKTİR, sunucu hatası
     * değil: 400. Aksi halde @Size/@DecimalMin'in yakalayamadığı uç durum 500 olarak sızar.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    ApiError badRequest(IllegalArgumentException e) {
        return new ApiError(e.getMessage());
    }
}
