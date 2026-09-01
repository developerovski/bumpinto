package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.port.UserStorePort;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class UserStoreAdapter implements UserStorePort {

    private final UserRepository users;

    public UserStoreAdapter(UserRepository users) {
        this.users = users;
    }

    @Override public UUID upsertByEmail(String email, String name) {
        var existing = users.findByEmail(email);
        if (existing.isPresent()) {
            return withName(existing.get(), name);
        }
        try {
            // saveAndFlush: INSERT'ü burada tetikler ki unique(email) ihlali bu blokta yakalansın.
            return users.saveAndFlush(UserEntity.of(UUID.randomUUID(), email, name, "google")).id;
        } catch (DataIntegrityViolationException raceLost) {
            // Aynı e-postayla eşzamanlı ikinci login: findByEmail'i ikimiz de ıskaladık,
            // yarışı kazananın satırını oku.
            return users.findByEmail(email).map(u -> withName(u, name))
                    .orElseThrow(() -> raceLost);
        }
    }

    private UUID withName(UserEntity user, String name) {
        if (name != null && !name.equals(user.name)) {
            user.name = name;
            users.save(user);
        }
        return user.id;
    }
}
