/* Spec §11 — atıf VERİ-GÜDÜMLÜ: ekrandaki sağlayıcı kimlikleri `/api/config.sources[]` ile eşleşir,
   metin i18n anahtarından gelir. Sağlayıcı başına kod dalı YOK. */
import { useTranslation } from "react-i18next";
import { useConfigStore } from "../../store/configStore";

export default function Attribution(props: {
  providers: string[];
  center?: boolean;
  /** Artboard `.f-attrs` — kart ALTINDA tek yatay şerit (gap 16px). Liste/ızgara altında bir kez
      basılan atıf bu dizilimi kullanır; kart gövdesindeki atıf dikey kalır (varsayılan). */
  row?: boolean;
  /** Artboard 2024 — kart içinde uzun yasal cümle yerine KISA sağlayıcı adı (`source.<id>`).
      Yasal cümlenin tamamı listenin altındaki birleşik atıfta basılmaya devam eder (spec §11). */
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const config = useConfigStore((s) => s.config);
  if (!config) return null; // config gelmeden yanlış atıf basmaktansa hiç basma

  const ids = new Set(props.providers.map((p) => p.toLowerCase()));
  const lines = config.sources
    .filter((s) => ids.has(s.id.toLowerCase()))
    .map((s) => ({
      key: s.id,
      // Kısa ad yoksa yasal cümleye düşer — sağlayıcı başına kod dalı YOK, yalnız anahtar seçimi.
      text: props.compact ? t(`source.${s.id}`, { defaultValue: t(s.attributionKey) }) : t(s.attributionKey),
      url: s.attributionUrl,
    }));
  // Döşeme atfı: MapLibre'de haritanın kendi atıf denetimi basar, burada tekrar basmıyoruz.
  if (lines.length === 0) return null;

  const cls = [
    props.row ? "flex flex-row flex-wrap items-center gap-4 pt-1.5" : "flex flex-col gap-0.5",
    "text-[0.6875rem] tracking-[0.02em] text-ink2",
    props.center ? "justify-center text-center" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <p className={cls}>
      {lines.map((l) =>
        l.url ? (
          <a key={l.key} href={l.url} target="_blank" rel="noreferrer" className="text-ink2 underline">
            {l.text}
          </a>
        ) : (
          <span key={l.key}>{l.text}</span>
        ),
      )}
    </p>
  );
}
