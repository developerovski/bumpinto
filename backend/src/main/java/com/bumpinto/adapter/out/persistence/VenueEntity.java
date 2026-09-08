package com.bumpinto.adapter.out.persistence;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "venues")
class VenueEntity {
    @Id UUID id;
    UUID sessionId;
    String provider;
    String externalId;
    String name;
    double lat;
    double lng;
    Double rating;
    Integer priceLevel;
    String photoUrl;
    String mapsUrl; // kolon duruyor ama artik yazilmiyor: mapsUrl viewer'in araciyla turetilir
    int deckOrder;
    String category;
    String address;
    String locality;
    Integer ratingCount;
    String hoursToday;
    String placeLink;
    String activityType;
    Double popularity;
    Integer ratingScale;
    String photoRef;
    String tagline;
    String taglineSource;
    Instant fetchedAt;
}
