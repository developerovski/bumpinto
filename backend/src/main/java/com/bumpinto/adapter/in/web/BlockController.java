package com.bumpinto.adapter.in.web;

import com.bumpinto.application.safety.Blocks;
import com.bumpinto.domain.safety.Block;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/me/blocks")
class BlockController {

    private final Blocks blocks;

    BlockController(Blocks blocks) {
        this.blocks = blocks;
    }

    @GetMapping
    List<ApiDtos.BlockDto> list(@AuthenticationPrincipal Jwt jwt) {
        return blocks.list(WebPrincipals.accountId(jwt)).stream()
                .map(l -> toDto(l.block(), l.displayName())).toList();
    }

    /** Yanitta {@code displayName} null: ad yalniz listede, okuma aninda cozulur. */
    @PostMapping
    ApiDtos.BlockDto add(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ApiDtos.BlockRequest request) {
        return toDto(blocks.add(WebPrincipals.accountId(jwt), request.userId(),
                request.participantId(), request.sessionSlug()), null);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void remove(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        blocks.remove(WebPrincipals.accountId(jwt), id);
    }

    private static ApiDtos.BlockDto toDto(Block block, String displayName) {
        return new ApiDtos.BlockDto(block.id(), block.blockedUserId(),
                block.blockedParticipantId(), block.createdAt(), displayName);
    }
}
