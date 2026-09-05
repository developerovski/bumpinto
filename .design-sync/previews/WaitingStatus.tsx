import { WaitingStatus } from "@bumpinto/web";

const COL = {
  width: "27.75rem",
  background: "var(--color-paper)",
  padding: "1rem",
} as const;

const NOOP = {
  onToggle: () => {},
  onSubmit: () => {},
  onAddressChange: () => {},
  onUseLocation: () => {},
  onOtherAddress: () => {},
  onTravelModeChange: () => {},
};

/** W2 · varsayılan (kapalı) hâl — harita işareti + "Mekanlar geliyor" başlığı +
    34ch'lik açıklama + tek "konumu/ulaşımı değiştir" butonu. Ekranda çoğunlukla bu görünür. */
export function Collapsed() {
  return (
    <div style={COL}>
      <WaitingStatus
        {...NOOP}
        open={false}
        busy={false}
        error={null}
        locationState="granted"
        locationLabel="Moda"
        address=""
        travelMode="TRANSIT"
        canSubmit={false}
      />
    </div>
  );
}

/** Açık hâl — JoinFormFields/NewSessionPage ile AYNI ikili: LocationField + TravelModeField.
    Konum sunucuya YENİDEN lat/lng ile gönderilir, yalnız `travelMode` değişse bile. */
export function Expanded() {
  return (
    <div style={COL}>
      <WaitingStatus
        {...NOOP}
        open
        busy={false}
        error={null}
        locationState="granted"
        locationLabel="Moda"
        address=""
        travelMode="TRANSIT"
        canSubmit
      />
    </div>
  );
}

/** Açık + elle adres — izin reddedilmişse aynı blok adres girişine döner. */
export function ExpandedManual() {
  return (
    <div style={COL}>
      <WaitingStatus
        {...NOOP}
        open
        busy={false}
        error={null}
        locationState="denied"
        locationLabel={null}
        address="Bebek, Beşiktaş"
        travelMode="BIKE"
        canSubmit
      />
    </div>
  );
}

/** Kaydetme hatası — `ErrorText` kartın içinde, gönder butonunun üstünde. */
export function WithError() {
  return (
    <div style={COL}>
      <WaitingStatus
        {...NOOP}
        open
        busy={false}
        error="Konum kaydedilemedi, tekrar dene."
        locationState="granted"
        locationLabel="Kadıköy"
        address=""
        travelMode="CAR"
        canSubmit
      />
    </div>
  );
}

/** Kaydederken — `busy` gönder butonunu kilitler. */
export function Saving() {
  return (
    <div style={COL}>
      <WaitingStatus
        {...NOOP}
        open
        busy
        error={null}
        locationState="granted"
        locationLabel="Moda"
        address=""
        travelMode="EBIKE"
        canSubmit
      />
    </div>
  );
}
