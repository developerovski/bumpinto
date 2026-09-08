package com.bumpinto.adapter.in.web;

import com.bumpinto.application.safety.Reports;
import com.bumpinto.domain.safety.Report;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
class ReportController {

    private final Reports reports;

    ReportController(Reports reports) {
        this.reports = reports;
    }

    @PostMapping
    ApiDtos.ReportResponse report(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ApiDtos.ReportRequest request) {
        Report saved = reports.file(WebPrincipals.accountId(jwt), request.sessionSlug(),
                request.targetParticipantId(), request.reason(), request.note());
        return new ApiDtos.ReportResponse(saved.id(), saved.createdAt());
    }
}
