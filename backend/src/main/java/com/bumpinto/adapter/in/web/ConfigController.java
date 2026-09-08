package com.bumpinto.adapter.in.web;

import com.bumpinto.domain.venue.VenueSource;
import com.bumpinto.domain.venue.VenueSourceDescriptor;
import com.bumpinto.infra.config.AppProps;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

/** Istemcinin acilista okudugu TEK yapilandirma ucu (spec §7). Sir tasimaz, public. */
@RestController
@RequestMapping("/api/config")
public class ConfigController {

    private final AppProps props;
    private final List<ApiDtos.ConfigSourceDto> sources;

    /** Liste @Order sirasindadir; atif satirlari da bu sirada cizilir. */
    public ConfigController(AppProps props, List<VenueSource> sources) {
        this.props = props;
        this.sources = sources.stream().map(VenueSource::descriptor).map(ConfigController::toDto).toList();
    }

    private static ApiDtos.ConfigSourceDto toDto(VenueSourceDescriptor d) {
        return new ApiDtos.ConfigSourceDto(d.id(), d.attributionKey(), d.attributionUrl(), d.ratingScale());
    }

    @GetMapping
    public ResponseEntity<ApiDtos.ConfigResponse> config() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)).cachePublic())
                .body(new ApiDtos.ConfigResponse(props.map().engine(),
                        new ApiDtos.ConfigTilesDto(props.map().tiles().styleUrl()), sources));
    }
}
