package com.bumpinto.domain.venue;

/**
 * Bir mekan kaynagi: "HTTP istegini kur, yaniti adaya cevir". Kesisen isler (zaman asimi,
 * 429, butce, onbellek, log, atif, saklama) burada DEGIL, orkestratordedir (spec §3).
 */
public interface VenueSource {

    VenueSourceDescriptor descriptor();

    CategoryMapping categories();

    SearchResult search(SearchRequest request);
}
