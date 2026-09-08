package com.bumpinto.domain.venue;

import com.bumpinto.domain.session.ActivityType;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * ActivityType -> saglayicinin kategori kimlikleri. VERI'dir, kod degil: venue-sources/<id>.yml
 * yuklenir, degisiklik kod degisikligi sayilmaz (spec §3).
 */
public record CategoryMapping(Map<ActivityType, List<String>> byType) {

    public CategoryMapping {
        Map<ActivityType, List<String>> copy = new LinkedHashMap<>();
        byType.forEach((k, v) -> copy.put(k, List.copyOf(v)));
        byType = Map.copyOf(copy);
    }

    public static CategoryMapping empty() {
        return new CategoryMapping(Map.of());
    }

    /** Secimin TAMAMI eslenmis mi. Kismi kapsama yonlendirmede kabul edilmez (spec §3). */
    public boolean covers(List<ActivityType> types) {
        return !types.isEmpty() && types.stream().allMatch(byType::containsKey);
    }

    /** Tek istekte gonderilecek kimlikler; tekrar yok, girdi sirasinda. */
    public List<String> idsFor(List<ActivityType> types) {
        List<String> out = new ArrayList<>();
        types.forEach(t -> byType.getOrDefault(t, List.of())
                .forEach(id -> {
                    if (!out.contains(id)) {
                        out.add(id);
                    }
                }));
        return List.copyOf(out);
    }

    /** Atif: yanittaki kategori KIMLIGI hangi ture ait. Bilinmiyorsa null (uydurulmaz). */
    public ActivityType activityFor(String categoryId) {
        for (Map.Entry<ActivityType, List<String>> e : byType.entrySet()) {
            if (e.getValue().contains(categoryId)) {
                return e.getKey();
            }
        }
        return null;
    }

    public List<String> allIds() {
        return byType.values().stream().flatMap(List::stream).distinct().toList();
    }
}
