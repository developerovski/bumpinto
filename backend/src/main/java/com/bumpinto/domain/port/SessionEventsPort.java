package com.bumpinto.domain.port;

public interface SessionEventsPort {
    void publish(String slug, SessionEvent event);
}
