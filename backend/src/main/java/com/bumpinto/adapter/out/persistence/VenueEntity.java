package com.bumpinto.adapter.out.persistence;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

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
    String mapsUrl;
    int deckOrder;
    String category;
    String address;
    String locality;
    Integer ratingCount;
    String hoursToday;
    String placeLink;
    String activityType;
}
