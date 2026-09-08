package com.bumpinto.adapter.out.persistence;

import com.bumpinto.domain.port.ProviderUsagePort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;

@Component
public class ProviderUsageAdapter implements ProviderUsagePort {

    private final ProviderUsageRepository rows;

    public ProviderUsageAdapter(ProviderUsageRepository rows) {
        this.rows = rows;
    }

    @Override
    // Faturalanan cagri disaridaki islem geri alinsa da sayilmali; readOnly islemde insert reddedilmesin.
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public long increment(String provider, YearMonth month) {
        return rows.increment(provider, month.atDay(1));
    }

    @Override
    @Transactional(readOnly = true)
    public long current(String provider, YearMonth month) {
        return rows.current(provider, month.atDay(1));
    }
}
