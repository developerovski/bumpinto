/* Kaynak: DS v2 §11 Adalet dili `.f-seg` (sand zemin, beyaz aktif hap — VenueSort ile aynı
   aile) + artboard Katıl/Yeni oturum/Bekle/Profil — beş seçenekli ulaşım türü seçici.
   `Segmented size="lg" fill` = artboard `.f-seg.icn`: ray satırın TAMAMINI kaplar, hücreler eşit
   bölünür; ≥lg ikon+etiket, <lg yalnız ikon — kaybolan etiketin yerini alt satırdaki
   "{{mode}} seçili" başlığı tutar. `compact` DS `.f-mp` — Konumlar satırının içine sığan 22px
   ikon şeridi. `MODE_ICON` mod başına 1-2 glif dizisi döner (EBIKE: Lightning+Bicycle),
   ParticipantRow'daki desenle aynı sırayla basılır. */
import { useTranslation } from "react-i18next";
import { MODE_ICON, MODE_LABEL_KEY, TRAVEL_MODES, type TravelMode } from "../../lib/travelMode";
import Segmented from "./Segmented";

/** Beş modluk seçici — Katıl/Yeni oturum/Konumlar/Bekle/Profil ortak bileşeni. `label` verilmezse
    genel soru ("Nasıl geliyorsun?"), Konumlar satırında elle nokta adına özel soru geçilir. */
export default function TravelModeField(props: {
  value: TravelMode;
  onChange: (mode: TravelMode) => void;
  label?: string;
  /** Konumlar satırlarında yer kazanmak için: etiket yalnız `aria-label` olarak kalır, görünür
      metin basılmaz (radiogroup'un erişilebilir adı yine de doğru kalır). */
  hideLabel?: boolean;
  /** DS `.f-mp` — satır İÇİNDE duran ikon şeridi (Konumlar kartı). Etiketi ve altyazıyı
      bastırır: satır zaten kimin geldiğini söylüyor, ray da satırın yüksekliğini büyütmemeli. */
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const label = props.label ?? t("travelMode.question");
  const bare = props.hideLabel || props.compact;
  const rail = (
    <Segmented
      value={props.value}
      onChange={props.onChange}
      ariaLabel={label}
      size={props.compact ? "xs" : "lg"}
      fill={!props.compact}
      options={TRAVEL_MODES.map((m) => {
        const icons = MODE_ICON[m];
        // `.f-mp` hücresi 22px: çift glifli mod (EBIKE) tek hücreye ancak 11px'te sığar.
        const iconSize = props.compact ? (icons.length > 1 ? 11 : 13) : icons.length > 1 ? 13 : 18;
        return {
          value: m,
          label: t(MODE_LABEL_KEY[m].name),
          icon: (
            <span className="inline-flex items-center" aria-hidden>
              {icons.map((Icon, i) => (
                <Icon key={i} size={iconSize} />
              ))}
            </span>
          ),
        };
      })}
    />
  );
  // Satır içi kullanımda saracak yok: `.f-mp` doğrudan satırın bir öğesidir, fazladan bir
  // flex sütunu satırı ortalamadan kaydırırdı.
  if (props.compact) return rail;
  return (
    <div className="flex flex-col gap-2">
      {!bare && <span className="text-[0.8125rem] font-semibold">{label}</span>}
      {rail}
      {/* `.f-seg.icn` <lg: etiketler ikonla değişir, seçili modu burada adlandırırız — satır
          içi (`hideLabel`) kullanımda satır zaten adı taşıdığından tekrar basılmaz. */}
      {!bare && (
        <p className="text-[0.75rem] text-ink2 lg:hidden">
          {t("travelMode.selected", { mode: t(MODE_LABEL_KEY[props.value].name) })}
        </p>
      )}
    </div>
  );
}
