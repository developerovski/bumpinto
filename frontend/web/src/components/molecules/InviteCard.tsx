/* Kaynak: artboard Lobi 1280 .inv — davet linki kartı */
import { Copy } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Note, Overline, Sticker } from "../atoms";

export default function InviteCard({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function copy() {
    navigator.clipboard
      ?.writeText(`${location.origin}/j/${slug}`)
      .then(() => {
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => undefined);
  }

  return (
    <div className="relative rounded-card border border-[#f5c9d5] bg-flame-wash p-[1.125rem_1.25rem] shadow-sh1 flex flex-col gap-3">
      <span className="absolute -top-3.5 right-4 z-10">
        <Sticker white>{t("lobby.sticker")}</Sticker>
      </span>
      <Overline tone="flame">{t("lobby.invite")}</Overline>
      <div className="flex items-center gap-2.5">
        <span className="min-w-0 flex-1 break-all font-mono text-[0.9375rem] font-semibold">{`${location.host}/j/${slug}`}</span>
        <Button type="button" kind="white" size="fit" onClick={copy}>
          <Copy size={16} aria-hidden />
          {copied ? t("lobby.copied") : t("lobby.copy")}
        </Button>
      </div>
      <Note>{t("lobby.hint")}</Note>
    </div>
  );
}
