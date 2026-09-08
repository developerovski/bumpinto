import { JoinFormFields } from "@bumpinto/web";

const COL = {
  width: "27.75rem",
  background: "var(--color-paper)",
  padding: "1rem",
} as const;

/* Form denetimli (controlled): her hücre statik bir anlık görüntü, geri çağrılar boş.
   Etkileşim (yazma, konum izni) statik çekimde temsil edilemez — atlanan hâller NOTES'ta. */
const NOOP = {
  onNameChange: () => {},
  onAddressChange: () => {},
  onUseLocation: () => {},
  onOtherAddress: () => {},
  onTravelModeChange: () => {},
  onSubmit: (e: { preventDefault: () => void }) => e.preventDefault(),
};

/** W1 · boş form — ad girilmediği için gönder butonu devre dışı (`disabled:opacity-45`).
    Konum bloğu "idle": otomatik konum butonu + adres alternatifi. */
export function Empty() {
  return (
    <div style={COL}>
      <JoinFormFields
        {...NOOP}
        name=""
        address=""
        locationState="idle"
        locationLabel={null}
        travelMode="CAR"
        error={null}
        busy={false}
      />
    </div>
  );
}

/** Konum izni verilmiş — yeşil onay kartı + "Konum tamam" rozeti, altında
    "başka adres" kısayolu. Ulaşım türü toplu taşımaya çekilmiş. */
export function LocationGranted() {
  return (
    <div style={COL}>
      <JoinFormFields
        {...NOOP}
        name="Mehmet"
        address=""
        locationState="granted"
        locationLabel="Moda"
        travelMode="TRANSIT"
        error={null}
        busy={false}
      />
    </div>
  );
}

/** İzin reddedilmiş/atlanmış — elle adres girişi dalı. */
export function ManualAddress() {
  return (
    <div style={COL}>
      <JoinFormFields
        {...NOOP}
        name="Selin"
        address="Bağdat Cad. 214, Caddebostan"
        locationState="denied"
        locationLabel={null}
        travelMode="WALK"
        error={null}
        busy={false}
      />
    </div>
  );
}

/** `error.kind = "geocode"` — yazılan adres çözülemedi. Hata KİMLİĞİNE göre yerleşiyor:
    geocode hatası ulaşım türü satırının ALTINDA, CTA bloğunun hemen ÜSTÜNDE çıplak
    `ErrorText` olarak basılır. (Bileşenin kendi kaynak yorumu "alanın hemen altında"
    diyor ama kod `TravelModeField`ten SONRA yerleştiriyor — render bunu doğruluyor.) */
export function AddressNotFound() {
  return (
    <div style={COL}>
      <JoinFormFields
        {...NOOP}
        name="Elif"
        address="Moda Sahil, Kadıköy"
        locationState="denied"
        locationLabel={null}
        travelMode="BIKE"
        error={{ kind: "geocode", message: "Bu adresi bulamadık, biraz daha açar mısın?" }}
        busy={false}
      />
    </div>
  );
}

/** `error.kind = "tooFar"` (409) — CTA'nın ÜSTÜNDE, flame-wash zeminli kendi kartında
    (artboard 4164). Üç hâl içinde görsel olarak en ayrık olanı. */
export function TooFar() {
  return (
    <div style={COL}>
      <JoinFormFields
        {...NOOP}
        name="Deniz"
        address=""
        locationState="granted"
        locationLabel="Ataşehir"
        travelMode="TRANSIT"
        error={{ kind: "tooFar", message: "Buluşma noktası sana 42 km uzakta." }}
        busy={false}
      />
    </div>
  );
}

/** `error.kind = "join"` — genel katılım hatası, Katıl düğmesinin ALTINDA ve
    ortalanmış (artboard 1395–1397). */
export function JoinRejected() {
  return (
    <div style={COL}>
      <JoinFormFields
        {...NOOP}
        name="Deniz"
        address=""
        locationState="granted"
        locationLabel="Beşiktaş"
        travelMode="CAR"
        error={{ kind: "join", message: "Bu buluşmaya katılım kapanmış." }}
        busy={false}
      />
    </div>
  );
}

/** Gönderim sürerken — buton devre dışı; `TextInput`'ün disabled stili YOK
    (ürün boşluğu, NOTES'ta kayıtlı), o yüzden alanlar dolu görünmeye devam eder. */
export function Submitting() {
  return (
    <div style={COL}>
      <JoinFormFields
        {...NOOP}
        name="Mehmet"
        address=""
        locationState="granted"
        locationLabel="Moda"
        travelMode="TRANSIT"
        error={null}
        busy
      />
    </div>
  );
}

/** Konum alınıyor — `locationBusy` yalnız konum bloğunu meşgul eder, form açık kalır. */
export function LocatingBusy() {
  return (
    <div style={COL}>
      <JoinFormFields
        {...NOOP}
        name="Selin"
        address=""
        locationState="idle"
        locationLabel={null}
        locationBusy
        travelMode="WALK"
        error={null}
        busy={false}
      />
    </div>
  );
}
