/* Kaynak: ui.css .field(gap:15) / .label / .a-dot / .a-dv-text(→ c-dv-text) / .loc(.on) / .err — JoinFormFields'ten çıkarıldı */
import { MapPin } from "@phosphor-icons/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge, Button, ErrorText, TextInput } from "../atoms";

/** DS `.loc-i` (tasarım CSS 149–151): 26px daire İÇİNDE 9px dolu yeşil nokta — `.loc.on`
    içinde daire beyaza döner. Çizili tik (`c-check`, 30px) artboard 879'da yok; onu burada
    bırakmak konum hapına başka bileşenlerin işaretini taşıyordu. */
function LocDot({ on }: { on?: boolean }) {
  return (
    <span
      className={`flex h-[1.625rem] w-[1.625rem] flex-none items-center justify-center rounded-full ${on ? "bg-white" : "bg-grass-wash"}`}
      aria-hidden
    >
      <i className="block h-[0.5625rem] w-[0.5625rem] rounded-full bg-grass" />
    </span>
  );
}

/** Sessiz satırın metin eylemi — DS'de kendi düğme türü yok; `granted` dalındaki
    "…ya da adres yaz" bağlantısıyla AYNI ölçü ve renk. */
function QuietAction({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[0.8125rem] font-semibold text-flame-deep underline-offset-2 hover:underline focus-visible:underline"
    >
      {children}
    </button>
  );
}

/** Konum bloğu — otomatik alınan/adres yazılan konum; W1 katılım formu ve W2 yeni oturum ortak kullanır. */
export default function LocationField(props: {
  title: string;
  state: "idle" | "granted" | "denied";
  label: string | null;
  address: string;
  onAddressChange: (value: string) => void;
  onUseLocation: () => void;
  onOtherAddress: () => void;
  otherLabel?: string;
  inputId?: string;
  busy?: boolean;
  /** Verilirse "haritadan seç" düğmesi çıkar. Harita AÇILINCA mount edilir — faturalanan
      birim `new google.maps.Map()` ve 390'da katılım ekranı bugün hiç harita mount etmiyor. */
  onPickOnMap?: () => void;
  /** Alanın altına düşen açıklama (artboard W2b 3872/3941). Değiştirme bağlantısının YERİNE
      GEÇMEZ: konumu zorunlu olmayan bir alanda bile kullanıcı alınmış konumu düzeltebilmeli
      (2026-09-09 hata: çapalı modda otomatik konum kilitleniyordu). */
  hint?: string;
  /** Konum bu ekranda kararı ETKİLEMİYOR (çapalı oturum: merkez çapadan gelir, DeckFlow adalet
      sıralamasını atlar) — yeşil "Tamam" hapı orada "buradan aranacak" gibi okunuyordu. Sessiz
      varyant tek satıra iner ve değiştir/kaldır eylemlerini yanına alır. */
  quiet?: boolean;
  /** Verilirse sessiz satırda "Kaldır" çıkar: konum hiç gönderilmez. */
  onRemove?: () => void;
}) {
  const { t } = useTranslation();
  const inputId = props.inputId ?? "location-address";
  /** Sessiz varyantta seçiciyi yalnız kullanıcı isteyince açarız; konum gelince kendiliğinden
      kapanır (`granted` dalı `expanded`'ı okumaz) — açık kalsaydı yeşil hap geri gelirdi. */
  const [expanded, setExpanded] = useState(false);
  const collapsed = !!props.quiet && (props.state === "granted" || !expanded);

  if (collapsed) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-[0.875rem] font-semibold">{props.title}</span>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-ink2">
          {props.state === "granted" ? (
            <>
              <span className="flex items-center gap-2 text-ink">
                <LocDot on={false} />
                {props.label ? t("join.locAutoHint", { label: props.label }) : t("join.locAutoHintNoLabel")}
              </span>
              <QuietAction
                onClick={() => {
                  setExpanded(true);
                  props.onOtherAddress();
                }}
              >
                {t("join.locChange")}
              </QuietAction>
              {props.onRemove && <QuietAction onClick={props.onRemove}>{t("join.locRemove")}</QuietAction>}
            </>
          ) : (
            <>
              <span>{t("join.locNone")}</span>
              <QuietAction onClick={() => setExpanded(true)}>{t("join.locAdd")}</QuietAction>
            </>
          )}
        </div>
        {props.hint && <span className="text-[0.75rem] text-ink2">{props.hint}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[0.875rem] font-semibold">{props.title}</span>

      {props.state === "granted" && (
        <>
          {/* DS `.loc.on`: HAP (999px), 1.5px kenar, 52px yükseklik, sh1 gölge; başlık başlık
              fontunda 16px/700 — kart değil, tıklanabilir bir konum hapı. */}
          <div className="flex min-h-[3.25rem] items-center gap-3 rounded-full border-[1.5px] border-[#bfe5cf] bg-grass-wash px-4 shadow-sh1">
            <LocDot on />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-head text-base font-bold">{t("join.locAuto")}</span>
              <span className="text-[0.8125rem] text-ink2">
                {props.label ? t("join.locAutoHint", { label: props.label }) : t("join.locAutoHintNoLabel")}
              </span>
            </div>
            <Badge tone="grass">{t("join.locOk")}</Badge>
          </div>
          <button
            type="button"
            onClick={props.onOtherAddress}
            className="self-start text-[0.75rem] font-normal text-flame-deep underline-offset-2 hover:underline focus-visible:underline"
          >
            {props.otherLabel ?? t("join.locOther")}
          </button>
        </>
      )}

      {props.state === "denied" && (
        <>
          <Button type="button" kind="white" align="start" onClick={props.onUseLocation} disabled={props.busy}>
            <LocDot />
            {t("join.locRetry")}
          </Button>
          <ErrorText>{t("join.errGeolocation")}</ErrorText>
          <TextInput
            id={inputId}
            aria-label={t("join.addressAria")}
            placeholder={t("join.addressPlaceholder")}
            value={props.address}
            onChange={(e) => props.onAddressChange(e.target.value)}
            autoFocus
          />
          {props.onPickOnMap && (
            /* DS `.btn.b-wh.bsm` — beyaz küçük düğme + pin glifi; saracak `self-start`
               (Button `className` almaz, genişliği kapsayıcı flex'ten gelir). */
            <div className="self-start">
              <Button type="button" kind="white" size="sm" onClick={props.onPickOnMap}>
                <MapPin size={18} aria-hidden />
                {t("map.pickOnMap")}
              </Button>
            </div>
          )}
        </>
      )}

      {props.state === "idle" && (
        <>
          <Button type="button" kind="white" align="start" onClick={props.onUseLocation} disabled={props.busy}>
            <LocDot />
            {t("join.useMyLocation")}
          </Button>
          <div className="c-dv-text">{t("join.or")}</div>
          <TextInput
            id={inputId}
            aria-label={t("join.addressAria")}
            placeholder={t("join.addressPlaceholder")}
            value={props.address}
            onChange={(e) => props.onAddressChange(e.target.value)}
          />
          {props.onPickOnMap && (
            /* DS `.btn.b-wh.bsm` — beyaz küçük düğme + pin glifi; saracak `self-start`
               (Button `className` almaz, genişliği kapsayıcı flex'ten gelir). */
            <div className="self-start">
              <Button type="button" kind="white" size="sm" onClick={props.onPickOnMap}>
                <MapPin size={18} aria-hidden />
                {t("map.pickOnMap")}
              </Button>
            </div>
          )}
        </>
      )}
      {/* Alanın SONUNDA, üç durumda da: "zorunlu değil" cümlesi konum kaldırıldıktan sonra da
          geçerli — yalnız `granted` dalında basmak onu tam gerektiği anda siliyordu. */}
      {props.hint && <span className="text-[0.75rem] text-ink2">{props.hint}</span>}
    </div>
  );
}
