package com.bumpinto.domain.session;

/**
 * Runoff'a NEDEN dusuldugu (spec §5.A.2). INTERSECTION: herkesin begendigi birden cok mekan var
 * (guzel sorun). FALLBACK: ortak nokta YOK, en cok begenilenler finale kaldi — Runoff kopyasi
 * bu iki durumda farkli yazilir ("Henuz ortak nokta yok — …").
 */
public enum RunoffReason { INTERSECTION, FALLBACK }
