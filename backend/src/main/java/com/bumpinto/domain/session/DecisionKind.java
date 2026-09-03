package com.bumpinto.domain.session;

/**
 * Kararin NASIL cikttigi (spec §5.A.2) — Karar ekraninin eyebrow'u buradan yazilir.
 *
 * <p>UNANIMOUS: herkesin begeni kesisiminde TEK mekan kaldi ("HEPINIZ AYNI YERI BEGENDI").
 * SINGLE_LIKE: kesisim bostu, toplamda yalniz bir mekan begenilmisti.
 * RUNOFF: finalistler arasinda oylama bir kazanan cikardi.
 * FORCED: host bir mekani dogrudan sectib (BROWSING "Bunu sec" ya da runoff beraberligini bozma).
 * PARTIAL: host "{{adlar}} olmadan devam et" dedi; deste bitmeyenler sayilmadan degerlendirildi.
 */
public enum DecisionKind { UNANIMOUS, SINGLE_LIKE, RUNOFF, FORCED, PARTIAL }
