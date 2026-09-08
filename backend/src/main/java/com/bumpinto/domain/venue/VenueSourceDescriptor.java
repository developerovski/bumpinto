package com.bumpinto.domain.venue;

import java.time.ZoneId;

/**
 * Kaynagin kendisi hakkinda soyledigi her sey. Orkestrator, atif, saklama ve /api/config
 * BURAYI okur; hicbiri kaynak sinifinin adini bilmez.
 *
 * @param ratingScale       10 (FSQ), 5 (TA/Google), null (puan yok) — donusturulmez (spec §11)
 * @param requiredMapEngine Google icin GOOGLE, digerlerinde ANY
 * @param billingZone       ay siniri: FSQ/TA UTC, Google America/Los_Angeles
 */
public record VenueSourceDescriptor(String id, String attributionKey, String attributionUrl,
                                    Integer ratingScale, RetentionRule retention,
                                    boolean requiresKey, MapEngine requiredMapEngine,
                                    ZoneId billingZone) {
}
