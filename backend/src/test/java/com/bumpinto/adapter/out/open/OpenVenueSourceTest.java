package com.bumpinto.adapter.out.open;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.RetentionRule;
import com.bumpinto.domain.venue.SearchRequest;
import com.bumpinto.domain.venue.TaglineSource;
import com.bumpinto.domain.venue.VenueCandidate;
import com.bumpinto.support.PostgresContainer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.jdbc.Sql;
import org.testcontainers.containers.PostgreSQLContainer;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** PostGIS'e karsi gercek sorgu: mesafe, tur kesisimi ve guven esigi (spec §5.2). */
@SpringBootTest
@TestPropertySource(properties = {
        "bumpinto.security.google-client-id=test-client-id",
        "bumpinto.security.token-secret=test-only-secret-not-a-real-key-0123456789",
        "bumpinto.security.token-ttl=12h",
        "bumpinto.venues.sources.foursquare.key=test-only-fsq-key",
        "bumpinto.cors.allowed-origins=http://localhost:5173",
        "bumpinto.cookies.secure=false",
        "bumpinto.cookies.domain="
})
@Sql(scripts = "/open-fixture.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class OpenVenueSourceTest {

    @ServiceConnection
    static PostgreSQLContainer<?> postgres = PostgresContainer.shared();

    private static final GeoPoint CENTER = new GeoPoint(51.4416, 5.4697);

    @Autowired OpenVenueSource source;

    @Test
    void findsNearbyRowsOfTheRequestedTypesAboveTheConfidenceFloorOrderedByDistance() {
        List<VenueCandidate> walk = source.search(new SearchRequest(CENTER, 5.0, List.of(ActivityType.WALK), 20)).candidates();
        assertThat(walk).extracting(VenueCandidate::externalId).containsExactly("osm:5", "osm:1"); // uzak (osm:3), guvenilmez (ovt:4), baska tur (ovt:2) yok
        assertThat(source.search(new SearchRequest(CENTER, 5.0, List.of(ActivityType.HIKE), 20)).candidates())
                .extracting(VenueCandidate::externalId).containsExactly("osm:5");
        assertThat(source.search(new SearchRequest(CENTER, 40.0, List.of(ActivityType.WALK), 1)).candidates()).hasSize(1);
    }

    @Test
    void mapsOpenDataWithoutInventingARating() {
        VenueCandidate park = source.search(new SearchRequest(CENTER, 5.0, List.of(ActivityType.WALK), 20)).candidates()
                .stream().filter(c -> c.externalId().equals("osm:1")).findFirst().orElseThrow();
        assertThat(park.provider()).isEqualTo("open");
        assertThat(park.photoUrl()).isEqualTo("https://commons.example/park.jpg");
        assertThat(park.rating()).isNull();
        assertThat(park.ratingScale()).isNull();
        assertThat(park.activityType()).isEqualTo(ActivityType.WALK);
        // Tagline HAM etiketten degil gorunen etiketten turer: "Leisure=park" degil "Park".
        assertThat(park.tagline()).isEqualTo("Park");
        assertThat(park.taglineSource()).isEqualTo(TaglineSource.OSM);
        assertThat(source.descriptor().retention()).isEqualTo(RetentionRule.KEEP);
    }

    @Test
    void categoryIsAHumanLabelNotARawSourceTag() {
        assertThat(OpenVenueSource.categoryLabel("amenity=pub")).isEqualTo("Pub");
        assertThat(OpenVenueSource.categoryLabel("leisure=sports_centre")).isEqualTo("Sports centre");
        assertThat(OpenVenueSource.categoryLabel("coffee_shop")).isEqualTo("Coffee shop");
        assertThat(OpenVenueSource.categoryLabel(null)).isNull();
    }
}
