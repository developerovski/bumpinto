package com.bumpinto.adapter.out.provider;

import com.bumpinto.domain.port.ProviderUsagePort;
import com.bumpinto.domain.venue.VenueSourceDescriptor;
import com.bumpinto.infra.config.AppProps;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.YearMonth;

/** Aylik butce kapisi. Butce IS tavani degil GUVENLIK tavanidir: dolunca urun acik tabana duser (spec §6). */
@Component
public class BudgetGate {

    private static final Logger log = LoggerFactory.getLogger(BudgetGate.class);

    private final ProviderUsagePort usage;
    private final AppProps props;
    private final Clock clock;

    public BudgetGate(ProviderUsagePort usage, AppProps props, Clock clock) {
        this.usage = usage;
        this.props = props;
        this.clock = clock;
    }

    public boolean allows(VenueSourceDescriptor descriptor) {
        int budget = budgetOf(descriptor);
        if (budget <= 0) {
            return true;
        }
        long calls = usage.current(descriptor.id(), month(descriptor));
        if (calls < budget) {
            return true;
        }
        log.warn("quota {}: 0/{} (0%) [BUDGET]", descriptor.id(), budget);
        return false;
    }

    /** GERCEKTEN yapilmis (faturalanan) bir cagriyi say. Yetki/sunucu hatasi cagrilmaz. */
    public void record(VenueSourceDescriptor descriptor) {
        if (budgetOf(descriptor) <= 0) {
            return;
        }
        usage.increment(descriptor.id(), month(descriptor));
    }

    private int budgetOf(VenueSourceDescriptor descriptor) {
        AppProps.VenueSourceProps config = props.venues().sources().get(descriptor.id());
        return config == null ? 0 : config.budget();
    }

    private YearMonth month(VenueSourceDescriptor descriptor) {
        return YearMonth.from(clock.instant().atZone(descriptor.billingZone()));
    }
}
