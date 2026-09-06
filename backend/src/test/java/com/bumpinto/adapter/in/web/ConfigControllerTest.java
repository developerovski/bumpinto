package com.bumpinto.adapter.in.web;

import com.bumpinto.domain.venue.CategoryMapping;
import com.bumpinto.domain.venue.MapEngine;
import com.bumpinto.domain.venue.SearchRequest;
import com.bumpinto.domain.venue.SearchResult;
import com.bumpinto.domain.venue.VenueSource;
import com.bumpinto.domain.venue.VenueSourceDescriptor;
import com.bumpinto.infra.config.AppProps;
import com.bumpinto.infra.security.SecurityConfig;
import com.bumpinto.infra.security.TokenService;
import com.bumpinto.support.TestProps;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Clock;
import java.time.ZoneId;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ConfigController.class)
@Import({SecurityConfig.class, TokenService.class, ConfigControllerTest.TestBeans.class})
class ConfigControllerTest {

    @TestConfiguration
    static class TestBeans {

        @Bean
        AppProps appProps() {
            return TestProps.defaults();
        }

        @Bean
        Clock clock() {
            return Clock.systemUTC();
        }

        @Bean
        VenueSource foursquare() {
            return stub(new VenueSourceDescriptor("foursquare", "attribution.foursquare",
                    "https://foursquare.com", 10, null, true, MapEngine.ANY, ZoneId.of("UTC")));
        }

        @Bean
        VenueSource open() {
            return stub(new VenueSourceDescriptor("open", "attribution.open",
                    "https://www.openstreetmap.org/copyright", null, null, false, MapEngine.ANY,
                    ZoneId.of("UTC")));
        }

        private static VenueSource stub(VenueSourceDescriptor descriptor) {
            return new VenueSource() {
                @Override
                public VenueSourceDescriptor descriptor() {
                    return descriptor;
                }

                @Override
                public CategoryMapping categories() {
                    throw new UnsupportedOperationException();
                }

                @Override
                public SearchResult search(SearchRequest request) {
                    throw new UnsupportedOperationException();
                }
            };
        }
    }

    @Autowired MockMvc mvc;

    @Test
    void returnsCachedPublicConfigWithSourcesInDeclaredOrder() throws Exception {
        mvc.perform(get("/api/config"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", containsString("max-age=300")))
                .andExpect(content().json("""
                        {"mapEngine":"maplibre","tiles":{"styleUrl":"https://tiles.example/style.json"},
                         "sources":[{"id":"foursquare","attributionKey":"attribution.foursquare",
                                     "attributionUrl":"https://foursquare.com","ratingScale":10},
                                    {"id":"open","attributionKey":"attribution.open",
                                     "attributionUrl":"https://www.openstreetmap.org/copyright","ratingScale":null}]}
                        """));
    }
}
