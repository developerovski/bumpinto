package com.bumpinto.domain.port;

import com.bumpinto.domain.og.OgCard;

/** 1200x630 PNG uretir. Yazi tipi/cizim adapterde: domain {@code java.awt} gormez. */
public interface OgImagePort {

    byte[] render(OgCard card);
}
