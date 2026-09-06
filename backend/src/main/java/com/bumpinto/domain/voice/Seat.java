package com.bumpinto.domain.voice;

/** Uyeligi tasiyan abonelik: hangi soket, o soketteki hangi abonelik. */
public record Seat(String wsSessionId, String subscriptionId) {
}
