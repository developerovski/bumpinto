package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.geo.GeoPoint;
import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.VenueCandidate;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ResilientVenueProviderTest {

    static final GeoPoint CENTER = new GeoPoint(51.5, 5.5);
    static final VenueCandidate CAND = new VenueCandidate("google", "g1", "Yedek Mekan",
            CENTER, 4.2, 1, null, "https://maps/g1");

    @Test
    void fallsBackToGoogleWhenFoursquareFails() {
        FoursquareVenueProvider fsq = mock(FoursquareVenueProvider.class);
        GooglePlacesVenueProvider google = mock(GooglePlacesVenueProvider.class);
        when(fsq.search(any(), anyDouble(), any(), anyInt()))
                .thenThrow(new ProviderException("fsq down"));
        when(google.search(any(), anyDouble(), any(), anyInt())).thenReturn(List.of(CAND));

        List<VenueCandidate> out = new ResilientVenueProvider(fsq, google)
                .search(CENTER, 5.0, ActivityType.COFFEE, 10);

        assertThat(out).containsExactly(CAND);
    }

    @Test
    void cachesRepeatedSearches() {
        FoursquareVenueProvider fsq = mock(FoursquareVenueProvider.class);
        GooglePlacesVenueProvider google = mock(GooglePlacesVenueProvider.class);
        when(fsq.search(any(), anyDouble(), any(), anyInt())).thenReturn(List.of(CAND));

        ResilientVenueProvider provider = new ResilientVenueProvider(fsq, google);
        provider.search(CENTER, 5.0, ActivityType.COFFEE, 10);
        provider.search(CENTER, 5.0, ActivityType.COFFEE, 10);

        verify(fsq, times(1)).search(any(), anyDouble(), any(), anyInt());
    }

    /**
     * Negatif cache YOK (bilincli): iki saglayici da bos donerse sonuc cache'lenmez, yoksa
     * seyrek bir bolgedeki gecici bosluk 30 dk boyunca "mekan yok"a donusurdu.
     */
    @Test
    void doesNotCacheEmptyResults() {
        FoursquareVenueProvider fsq = mock(FoursquareVenueProvider.class);
        GooglePlacesVenueProvider google = mock(GooglePlacesVenueProvider.class);
        when(fsq.search(any(), anyDouble(), any(), anyInt())).thenReturn(List.of());
        when(google.search(any(), anyDouble(), any(), anyInt())).thenReturn(List.of());

        ResilientVenueProvider provider = new ResilientVenueProvider(fsq, google);
        assertThat(provider.search(CENTER, 5.0, ActivityType.COFFEE, 10)).isEmpty();
        assertThat(provider.search(CENTER, 5.0, ActivityType.COFFEE, 10)).isEmpty();

        verify(google, times(2)).search(any(), anyDouble(), any(), anyInt());
    }
}
