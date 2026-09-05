package com.bumpinto.domain.session;

import java.util.List;

/**
 * Oy veren kim — TEK kaynak. Once DeckFlow.votingPopulation ve SessionQueries ayni soruyu
 * kendi filtreleriyle cevapliyordu; capayi iki yere birden eklemek ayrisma riskini ikiye
 * cikarirdi (SessionCenter'in merkez icin cozdugu problemin aynisi).
 */
public final class Voters {

    /**
     * Elle eklenen noktalar ASLA oy vermez: token tasimazlar, kaydirmazlar, yalniz geometriye
     * girerler. Konum ise yalniz CAPASIZ oturumda sarttir — capali oturumda merkez
     * katilimcilardan turemedigi icin konumsuz kisi de tam uyedir (spec K1).
     */
    public static boolean votes(Participant p, Session session) {
        return !p.manual() && (session.anchor() != null || p.hasLocation());
    }

    public static List<Participant> of(Session session, List<Participant> participants) {
        return participants.stream().filter(p -> votes(p, session)).toList();
    }

    private Voters() {
    }
}
