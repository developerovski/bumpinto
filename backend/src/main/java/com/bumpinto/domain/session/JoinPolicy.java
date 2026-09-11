package com.bumpinto.domain.session;

/**
 * Acik plana kimin nasil girdigi. OPEN: istek aninda koltuk verilir. APPROVAL: host onaylar
 * (VARSAYILAN) — Kesfet yabancilara aciktir ve host'un kimi aldigina karar hakki, engel
 * listesinden once gelen ilk savunma katmanidir.
 */
public enum JoinPolicy { OPEN, APPROVAL }
