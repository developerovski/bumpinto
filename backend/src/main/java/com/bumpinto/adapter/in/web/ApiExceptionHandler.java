package com.bumpinto.adapter.in.web;

import com.bumpinto.application.error.UnavailableException;
import com.bumpinto.application.error.ConflictException;
import com.bumpinto.application.error.ForbiddenException;
import com.bumpinto.application.error.NoVenuesFoundException;
import com.bumpinto.application.error.NotFoundException;
import com.bumpinto.application.error.TooManyRequestsException;
import com.bumpinto.application.error.UnauthorizedException;
import com.bumpinto.domain.geo.GeocodeBusyException;
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

    /** Kota asimi sunucu hatasi degil, "az sonra tekrar dene"dir. */
    @ExceptionHandler(TooManyRequestsException.class)
    @ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
    ApiError tooMany(TooManyRequestsException e) {
        return new ApiError(e.getMessage());
    }

    /** Throttle atlamasi "sonuc yok" degil "tekrar dene"dir: 429. */
    @ExceptionHandler(GeocodeBusyException.class)
    @ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
    ApiError geocodeBusy(GeocodeBusyException e) {
        return new ApiError("geocode_busy");
    }

    /**
     * Reddedilen yenileme jetonu (B-16). Govde SEBEP tasimaz: "suresi doldu" ile "iptal edildi"
     * ayrimi saldirgana ailenin durumunu soylerdi.
     */
    @ExceptionHandler(UnauthorizedException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    ApiError unauthorized(UnauthorizedException e) {
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

    /** Ozellik yapilandirilmamis (ornegin Apple anahtari yok): istemci hatasi degil, 503. */
    @ExceptionHandler(UnavailableException.class)
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    ApiError unavailable(UnavailableException e) {
        return new ApiError(e.getMessage());
    }
}
