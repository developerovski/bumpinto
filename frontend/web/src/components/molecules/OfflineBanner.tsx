/* Artboard W10b (1280 + 390) — amber şerit sayfanın ÜSTÜNDE durur, içerik silinmez.
   Yeniden deneme gerçek bir eylemdir: sayfa yeniden yüklenir, store'lar baştan çeker.
   `role="status"` YOK — canlı bölgeyi AppShell hep-mount kabı taşır (kod incelemesi #2):
   içerik DOM'a rolle birlikte değil, rolün İÇİNE girmeli ki ekran okuyucu anonsu kaçırmasın. */
import { WifiSlash } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { Button } from "../atoms";

export default function OfflineBanner(props: {
  online: boolean;
  lastOnlineAt: number | null;
  onRetry: () => void;
  /** Ağ yoklaması sürüyor — düğme kilitlenir (kod incelemesi #1: erken/yanlış reload'a karşı). */
  retrying?: boolean;
}) {
  const { t, i18n } = useTranslation();
  if (props.online) return null;
  const time = props.lastOnlineAt == null ? null
    : new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
        hour: "2-digit", minute: "2-digit",
      }).format(props.lastOnlineAt);

  return (
    // Page ile AYNI mx-auto/max-w/px zinciri (kod incelemesi #3) — görsel kutu ayrı iç div'de:
    // aynı elemana ikinci bir px-* eklenirse kazananı sınıf sırası değil derleme çıktısı belirler.
    <div className="mx-auto mt-3 w-full max-w-[30rem] px-[1.125rem] lg:max-w-[80rem] lg:px-8 xl:max-w-[96rem] xl:px-12">
      <div className="flex items-center gap-3 rounded-[0.875rem] border border-line2 bg-amber-wash px-4 py-2.5">
        <WifiSlash size={21} aria-hidden className="flex-none text-amber-ink" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[0.875rem] font-bold">{t("offline.title")}</span>
          {time && <span className="text-[0.75rem] text-ink2 tabular-nums">{t("offline.hint", { time })}</span>}
        </div>
        <Button type="button" kind="white" size="sm" onClick={props.onRetry} disabled={props.retrying}>
          {t("common.retry")}
        </Button>
      </div>
    </div>
  );
}
