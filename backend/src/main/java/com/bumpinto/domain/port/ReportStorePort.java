package com.bumpinto.domain.port;

import com.bumpinto.domain.safety.Report;

public interface ReportStorePort {
    Report save(Report report);
}
