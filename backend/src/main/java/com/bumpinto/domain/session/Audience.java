package com.bumpinto.domain.session;

/**
 * Acik planin KITLESI (B-18): kim kesfeder. PUBLIC = Kesfet listesi; FRIENDS = yalniz karsilikli
 * arkadaslar (B-19 — sunucu o ize kadar reddeder); NONE = hicbir listede yok, yalniz davet linki
 * (pencere, kapasite, yeter sayi, koltuk istegi ve check-in yine calisir).
 */
public enum Audience { PUBLIC, FRIENDS, NONE }
