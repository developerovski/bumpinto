/* Spec §11 — atıf VERİ-GÜDÜMLÜ: ekrandaki sağlayıcı kimlikleri `/api/config.sources[]` ile eşleşir,
   metin i18n anahtarından gelir. Sağlayıcı başına kod dalı YOK. */
import { useTranslation } from "react-i18next";
import { useConfigStore } from "../../store/configStore";

export default function Attribution(props: { providers: string[]; center?: boolean }) {
  const { t } = useTranslation();
  const config = useConfigStore((s) => s.config);
  if (!config) return null; // config gelmeden yanlış atıf basmaktansa hiç basma

  const ids = new Set(props.providers.map((p) => p.toLowerCase()));
  const lines = config.sources
    .filter((s) => ids.has(s.id.toLowerCase()))
    .map((s) => ({ key: s.id, text: t(s.attributionKey), url: s.attributionUrl }));
  // Döşeme atfı: MapLibre'de haritanın kendi atıf denetimi basar, burada tekrar basmıyoruz.
  if (lines.length === 0) return null;

  const cls = `flex flex-col gap-0.5 text-[0.6875rem] text-ink3 ${props.center ? "text-center" : ""}`;
  return (
    <p className={cls}>
      {lines.map((l) =>
        l.url ? (
          <a key={l.key} href={l.url} target="_blank" rel="noreferrer" className="text-ink3 underline">
            {l.text}
          </a>
        ) : (
          <span key={l.key}>{l.text}</span>
        ),
      )}
    </p>
  );
}
