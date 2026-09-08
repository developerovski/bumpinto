package com.bumpinto.adapter.out.open;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/** geom ve activity_types BILINCLI olarak eslenmez; native sorgu okur (hibernate-spatial yok). */
@Entity
@Table(name = "venues_open")
class VenueOpenEntity {
    @Id String id;
    String source;
    String name;
    String category;
    float confidence;
    String website;
    String wikidataId;
    String photoUrl;
    String openingHours;
    String locality;
    String address;
    Instant updatedAt;
}
