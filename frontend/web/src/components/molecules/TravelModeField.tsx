/* Kaynak: DS v2 §11 Adalet dili `.f-seg` (sand zemin, beyaz aktif hap — VenueSort ile aynı
   aile) + artboard Katıl/Yeni oturum/Bekle/Profil — beş seçenekli ulaşım türü seçici.
   `Segmented size="lg" fill` = artboard `.f-seg.icn`: ray satırın TAMAMINI kaplar, hücreler eşit
   bölünür; ≥lg ikon+etiket, <lg yalnız ikon — kaybolan etiketin yerini alt satırdaki
   "{{mode}} seçili" başlığı tutar. `compact` DS `.f-mp` — Konumlar satırının içine sığan 22px
   ikon şeridi. `MODE_ICON` mod başına 1-2 glif dizisi döner ([rozet, taban] — EBIKE:
   Lightning+Bicycle); artboard `.eb` (CSS 346-347) bu ikiliyi yan yana DEĞİL üst üste basar. */
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
        // Dizinin SONU taban glif, BAŞI rozet (tek glifli modlarda rozet yok) — WinnerCard da
        // ilk glifi küçültüyor. Artboard 1297/1115: e-bisiklet = bisiklet + sağ üstte şimşek.
        const icons = MODE_ICON[m];
        const Base = icons[icons.length - 1];
        const Badge = icons.length > 1 ? icons[0] : null;
        return {
          value: m,
          label: t(MODE_LABEL_KEY[m].name),
          icon: (
            // Glif `1em` — kırılımla değişen tek değer sarmalayıcının font ölçüsü: `.f-seg.icn
            // span i` 18px (<lg, etiketsiz ray), `.f-seg span i` 15px (≥lg, etiketli ray),
            // `.f-mp > *` 13px (satır içi şerit, CSS 353).
            <span
              className={`relative inline-flex items-center ${
                props.compact ? "text-[0.8125rem]" : "text-[1.125rem] lg:text-[0.9375rem]"
              }`}
              aria-hidden
            >
              <Base size="1em" />
              {/* `.eb .bo` 9px / `.f-mp .bo` 8px — flame-deep, tabanın sağ üst köşesinde. */}
              {Badge && (
                <Badge
                  size={props.compact ? 8 : 9}
                  className={`absolute text-flame-deep ${props.compact ? "top-0 right-0" : "-top-px -right-1"}`}
                />
              )}
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
      {/* `.lb` 14px/600 (artboard 1293) — kardeş alanların (Field/LocationField) etiketiyle aynı;
          13px'te ulaşım sorusu diğer iki etiketten küçük görünüyordu. */}
      {!bare && <span className="text-[0.875rem] font-semibold">{label}</span>}
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
