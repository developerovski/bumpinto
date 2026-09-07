package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.port.ReportStorePort;
import com.bumpinto.domain.safety.Report;
import org.springframework.stereotype.Component;

@Component
public class ReportStoreAdapter implements ReportStorePort {

    private final ReportRepository reports;

    public ReportStoreAdapter(ReportRepository reports) {
        this.reports = reports;
    }

    @Override public Report save(Report report) {
        ReportEntity r = new ReportEntity();
        r.id = report.id();
        r.reporterUserId = report.reporterUserId();
        r.sessionId = report.sessionId();
        r.targetParticipantId = report.targetParticipantId();
        r.reason = report.reason().name();
        r.note = report.note();
        reports.save(r);
        return report;
    }
}
