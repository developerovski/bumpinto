/* Kaynak: artboard v3 W3 Lobi 1280 (1083–1091) / 390 (1183–1191) — TEK SATIR davet kartı:
   solda link + kod satırı, sağda ikon-only kopyala (40px) ve "Paylaş".
   Sticker YOK (v3 kartı çıkardı), link mono 13px (.mn) ve tek satır (nowrap + ellipsis). */
import { Check, Copy } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { copyToClipboard } from "../../lib/clipboard";
import { Overline } from "../atoms";
import ShareButton from "./ShareButton";

export default function InviteCard({
  slug,
  joinCode,
  sessionName,
}: {
  slug: string;
  /** `SessionView.joinCode` — YOKSA kod satırı uydurulmaz, yalnız "hesap gerekmez" kalır. */
  joinCode?: string;
  sessionName?: string;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const url = `${location.origin}/j/${slug}`;

  function copy() {
    // Ortak yardımcı: güvensiz bağlamda (LAN üzerinden http) `navigator.clipboard` YOKTUR,
    // `execCommand` yedeğine düşer. Kopyalama başarısızsa "Kopyalandı" DA yazılmaz.
    void copyToClipboard(url).then((ok) => {
      if (!ok) return;
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    // Artboard: padding 12/14, gap 10, kenar #F6C6D2 (flame-wash üstünde duran tek hex —
    // paletin ara tonu, token değil).
    <div className="flex items-center gap-2.5 rounded-card border border-[#f6c6d2] bg-flame-wash p-[0.75rem_0.875rem] shadow-sh1">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Overline tone="flame">{t("lobby.invite")}</Overline>
        <span className="truncate font-mono text-[0.8125rem]">{`${location.host}/j/${slug}`}</span>
        {/* Aynı satır hem bilgi hem geri bildirim taşır: `aria-live` burada, ayrı bir sr-only
            kopya YOK — ikisi birlikte olsaydı ekran okuyucu "Kopyalandı"yı iki kez okurdu. */}
        <span className="text-[0.75rem] text-ink2" aria-live="polite">
          {copied ? (
            <span className="inline-flex items-center gap-1 font-bold text-grass">
              <Check size={13} weight="bold" aria-hidden />
              {t("lobby.copied")}
            </span>
          ) : joinCode ? (
            <Trans
              i18nKey="lobby.code"
              values={{ code: joinCode }}
              components={[<b key="0" className="font-bold text-ink tabular-nums" />]}
            />
          ) : (
            t("lobby.noAccount")
          )}
        </span>
      </div>
      {/* .icb — 40px daire, ikon-only. Kopyalandı geri bildirimi İKİ yerden birden okunur:
          düğmenin kendisi (tik + yeşil yıkama) ve kod satırı — tıklanan öge onay vermezse
          kullanıcı gözünü sayfanın başka yerinde aramak zorunda kalıyor. */}
      <button
        type="button"
        aria-label={t(copied ? "lobby.copied" : "lobby.copy")}
        onClick={copy}
        className={`flex h-10 w-10 flex-none items-center justify-center rounded-full border shadow-sh1 transition-colors ${
          copied ? "border-[#bfe5cf] bg-grass-wash text-grass" : "border-line2 bg-card text-ink"
        }`}
      >
        {copied ? <Check size={18} weight="bold" aria-hidden /> : <Copy size={18} aria-hidden />}
      </button>
      {/* Artboard `min-height:44px` — `.bsm` 42px'te kalıyor, dokunma hedefi 44'e çıkarılır.
          Button atomu className almıyor; ölçü sarmalayıcıdan veriliyor.
          Paylaşım metni `venues.inviteText` ile AYNI (davet metni tek kaynaktan). */}
      <span className="flex-none [&_button]:min-h-[2.75rem]">
        <ShareButton
          text={t("venues.inviteText", { name: sessionName ?? "" })}
          url={url}
          label={t("lobby.share")}
          copiedLabel={t("lobby.copied")}
          kind="flame"
          size="sm"
        />
      </span>
    </div>
  );
}
