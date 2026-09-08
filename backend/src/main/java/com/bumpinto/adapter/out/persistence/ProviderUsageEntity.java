package com.bumpinto.adapter.out.persistence;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

import java.io.Serializable;
import java.time.LocalDate;

/** Yalniz native sorgular icin gerekli JPA capasi; okuma/yazma @Query ile yapilir. */
@Entity
@Table(name = "provider_usage")
@IdClass(ProviderUsageEntity.Key.class)
class ProviderUsageEntity {
    @Id String provider;
    @Id LocalDate month;
    int calls;

    static class Key implements Serializable {
        String provider;
        LocalDate month;

        Key() {
        }

        Key(String provider, LocalDate month) {
            this.provider = provider;
            this.month = month;
        }

        @Override public boolean equals(Object o) {
            return o instanceof Key k && provider.equals(k.provider) && month.equals(k.month);
        }

        @Override public int hashCode() {
            return provider.hashCode() * 31 + month.hashCode();
        }
    }
}
