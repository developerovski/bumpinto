package com.bumpinto.adapter.out.open;

/** Native sorgunun dondugu satir; alan adlari sorgudaki takma adlarla eslesir. */
public interface OpenVenueRow {
    String getId();
    String getName();
    double getLat();
    double getLng();
    String getCategory();
    String getActivityTypes();   // virgullu; array_to_string ile
    String getWebsite();
    String getPhotoUrl();
    String getOpeningHours();
    String getLocality();
    String getAddress();
}
