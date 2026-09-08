package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.session.ActivityType;
import com.bumpinto.domain.venue.CategoryMapping;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.yaml.snakeyaml.Yaml;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/** venue-sources/<id>.yml -> CategoryMapping. Bicim hatasi ACILISTA patlar, calisma aninda degil. */
@Component
public class CategoryMappingLoader {

    public CategoryMapping load(String sourceId) {
        String path = "venue-sources/" + sourceId + ".yml";
        ClassPathResource resource = new ClassPathResource(path);
        if (!resource.exists()) {
            throw new IllegalStateException("missing category mapping: " + path);
        }
        Map<String, Object> root;
        try (InputStream in = resource.getInputStream()) {
            root = new Yaml().load(in);
        } catch (IOException e) {
            throw new IllegalStateException("cannot read " + path, e);
        }
        if (root == null || !sourceId.equals(root.get("id"))) {
            throw new IllegalStateException(path + ": 'id' must be " + sourceId);
        }
        Pattern idPattern = Pattern.compile(String.valueOf(root.getOrDefault("idPattern", ".+")));
        Object rawCategories = root.get("categories");
        if (!(rawCategories instanceof Map<?, ?> categories)) {
            throw new IllegalStateException(path + ": 'categories' must be a map");
        }
        Map<ActivityType, List<String>> byType = new LinkedHashMap<>();
        categories.forEach((key, value) -> {
            ActivityType type;
            try {
                type = ActivityType.valueOf(String.valueOf(key));
            } catch (IllegalArgumentException e) {
                throw new IllegalStateException(path + ": unknown activity type '" + key + "'");
            }
            if (!(value instanceof List<?> valueList)) {
                throw new IllegalStateException(path + ": categories." + key + " must be a list");
            }
            List<String> ids = new ArrayList<>();
            for (Object id : valueList) {
                String text = String.valueOf(id);
                if (!idPattern.matcher(text).matches()) {
                    throw new IllegalStateException(path + ": id '" + text + "' breaks "
                            + idPattern.pattern());
                }
                ids.add(text);
            }
            byType.put(type, ids);
        });
        return new CategoryMapping(byType);
    }
}
