/* Alt ses çubuğu (spec §7 dock durumları). 390'da sticky, spacer YOK: SessionPage onu
   [data-app-shell]'in direkt flex çocuğu olarak (page ile birlikte) basar, `order-last` atıf
   altbilgisinin ardına koyar ve akıştaki gerçek yüksekliğini kaplar — altbilgi hep erişilebilir
   kalır. lg+'de (1280 dock) durum farklı: kart `fixed` olup akıştan çıkar, bu yüzden `Bar` kendi
   görünmez ikizini (spacer) basar ki sayfanın son içeriği dock'un altında kalıcı kapanmasın. */
import { Microphone, MicrophoneSlash, PhoneDisconnect } from "@phosphor-icons/react";
import type { SessionView } from "@bumpinto/shared";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { isHost, viewerId } from "../../store/sessionStore";
import { useSessionAction } from "../../store/useSessionAction";
import { useVoiceStore } from "../../store/voiceStore";
import { Avatar, Button, ErrorText } from "../atoms";

/** Sunucunun {error} gövdesindeki metne göre başlatma hatasını eşler (bkz. useSessionAction). */
const START_ERROR_BY_SERVER: Record<string, string> = {
  "only for group": "voice.errSolo",
  "about to expire": "voice.errExpiring",
  "session is closed": "voice.errClosed",
};

function remainingLabel(endsAt: string, now: number) {
  const total = Math.max(0, Math.floor((new Date(endsAt).getTime() - now) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now()); // aktif olduğu an tazele — bir sonraki 1 sn'lik tik'e kadar bayat kalmasın
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

function Bar(props: { label: string; children: ReactNode }) {
  return (
    <>
      <div
        role="region"
        aria-label={props.label}
        className={
          "order-last sticky bottom-0 z-40 border-t border-line bg-card shadow-sh1 " +
          "pb-[max(0.75rem,env(safe-area-inset-bottom))] " +
          // lg+: akıştan çıkar, sağ altta yüzer kart olur (artboard 1280 dock).
          "lg:fixed lg:right-6 lg:bottom-6 lg:z-50 lg:max-w-[32rem] " +
          "lg:rounded-card lg:border lg:pb-3 lg:shadow-sh2"
        }
      >
        <div className="mx-auto flex max-w-[30rem] flex-wrap items-center gap-3 px-4 pt-3 lg:max-w-none">
          {props.children}
        </div>
      </div>
      {/* lg+'de kart `fixed` olup akıştan çıkıyor; yer açılmazsa sayfanın son içeriği (liste sonu,
          eylem düğmesi) dock'un altında KALICI kapanır — ortaya çıkarmanın yolu olmaz. Bu görünmez
          ikiz `order-last` ile dock'un gerçek konumuna (atıf altbilgisinin ardına) taşınır ve akışta
          onun yerine boşluk bırakır. Yükseklik dock'un en olası iki satırlık içeriğine (metin +
          düğme satırı + dolgu) göre cömert sabit değer — K-W20: 1280 artboard'ında dock ölçüsü yok. */}
      <div aria-hidden="true" className="order-last hidden lg:block lg:h-28" />
    </>
  );
}

export default function VoiceDock(props: { view: SessionView }) {
  const { t } = useTranslation();
  const view = props.view;
  const host = isHost(view);
  const me = viewerId(view);
  const voice = useVoiceStore(
    useShallow((s) => ({
      phase: s.phase, muted: s.muted, peers: s.peers, selfSpeaking: s.selfSpeaking,
      endedReason: s.endedReason, micDenied: s.micDenied, connectFailed: s.connectFailed,
      limitMinutes: s.limitMinutes,
      start: s.start, end: s.end, join: s.join, leave: s.leave, toggleMute: s.toggleMute,
    })),
  );
  const { run, busy, error } = useSessionAction();
  const endsAt = view.voice?.endsAt ?? null;
  const now = useNow(!!endsAt);
  const members = (view.participants ?? []).filter((p) => p.inVoice);
  const joinRef = useRef<HTMLButtonElement>(null);
  const muteRef = useRef<HTMLButtonElement>(null);
  const prevPhase = useRef(voice.phase);

  // Odak yönetimi: yalnız GERÇEK faz geçişinde (mount değil) ve kimse bir şeye odaklanmamışken
  // (body) el uzatır — asla çalmaz. Mount'ta da "idle" görülür (açık oda + dışarıdaki görüntüleyen);
  // `prevPhase` olmadan bu, sayfa yüklenir yüklenmez Katıl'a odağı çalardı.
  useEffect(() => {
    const from = prevPhase.current;
    prevPhase.current = voice.phase;
    if (from === voice.phase) return;
    if (document.activeElement !== document.body) return;
    if (voice.phase === "in") muteRef.current?.focus();
    else if (voice.phase === "idle" || voice.phase === "error") joinRef.current?.focus();
  }, [voice.phase]);

  if (!endsAt && !host && !voice.endedReason) return null;

  const endButton = host && (
    <Button kind="danger" size="sm" disabled={busy} onClick={() => void run(() => voice.end(), "voice.errEnd")}>
      {t("voice.end")}
    </Button>
  );

  // Bitiş sebebi TAZE endsAt'i ezer: host içinde yeniden başlattığında (10 sn penceresi) katılımcının
  // görünümü henüz refresh olmamış olabilir — sebep varken "Katıl" ekranı YANLIŞ olur.
  if (!endsAt || voice.endedReason) {
    return (
      <Bar label={t("voice.region")}>
        {voice.endedReason && (
          // Sebep ve süre ipucu AYNI ANDA mount olur — tek aria-live bölgesi, ekran okuyucunun
          // ikisini de duyurması için. `contents`: sarmalayıcı görsel flex akışına karışmaz.
          <span aria-live="polite" className="contents">
            <span className="text-[0.875rem] text-ink2">{t(`voice.ended.${voice.endedReason}`)}</span>
            {voice.endedReason === "TIME_LIMIT" && voice.limitMinutes != null && (
              <span className="text-[0.8125rem] text-ink2">
                {t("voice.endedTimeLimitHint", { min: voice.limitMinutes })}
              </span>
            )}
          </span>
        )}
        {host && (
          <Button
            kind="white"
            size="sm"
            disabled={busy}
            onClick={() => void run(() => voice.start(), "voice.errStart", START_ERROR_BY_SERVER)}
          >
            <Microphone size={18} aria-hidden />
            {t(voice.endedReason === "TIME_LIMIT" ? "voice.restart" : "voice.start")}
          </Button>
        )}
        {error && <ErrorText>{error}</ErrorText>}
      </Bar>
    );
  }

  const remaining = t("voice.remaining", { time: remainingLabel(endsAt, now) });

  if (voice.phase !== "in") {
    const joinLabel =
      voice.phase === "joining" ? t("voice.joining") : voice.phase === "error" ? t("voice.retry") : t("voice.join");
    return (
      <Bar label={t("voice.region")}>
        <span className="text-[0.875rem] font-bold">{t("voice.open")}</span>
        <span className="text-[0.8125rem] text-ink2 tabular-nums">
          {t("voice.members", { count: members.length })} · {remaining}
        </span>
        {voice.phase === "error" && voice.micDenied && <ErrorText>{t("voice.micDenied")}</ErrorText>}
        {voice.phase === "error" && voice.connectFailed && <ErrorText>{t("voice.connectFailed")}</ErrorText>}
        <div className="ml-auto flex items-center gap-2">
          <Button ref={joinRef} kind="flame" size="sm" disabled={voice.phase === "joining"} onClick={() => void voice.join()}>
            {joinLabel}
          </Button>
          {endButton}
        </div>
        {error && <ErrorText>{error}</ErrorText>}
      </Bar>
    );
  }

  return (
    <Bar label={t("voice.region")}>
      <div className="flex gap-1.5">
        {members.map((p, i) => {
          const self = p.id === me;
          const peer = p.id ? voice.peers[p.id] : undefined;
          const speaking = self ? voice.selfSpeaking : !!peer?.speaking;
          const failed = !self && peer?.state === "failed";
          const status = t(failed ? "voice.peerFailed" : speaking ? "voice.speaking" : "voice.inVoice");
          const label = `${p.displayName ?? "?"} · ${status}`;
          return (
            <span
              key={p.id ?? i}
              className={[
                "inline-flex rounded-full",
                speaking ? "ring-[3px] ring-grass ring-offset-2 ring-offset-card" : "",
                failed ? "opacity-55" : "",
              ].join(" ").trim()}
            >
              <Avatar size="sm" name={p.displayName ?? "?"} index={(view.participants ?? []).indexOf(p)} />
              <span className="sr-only">{label}</span>
            </span>
          );
        })}
      </div>
      <span className="text-[0.8125rem] text-ink2 tabular-nums">{remaining}</span>
      <div className="ml-auto flex items-center gap-2">
        <Button
          ref={muteRef}
          kind="white"
          shape="round-sm"
          onClick={voice.toggleMute}
          aria-label={t(voice.muted ? "voice.unmute" : "voice.mute")}
          aria-pressed={voice.muted}
        >
          {voice.muted ? <MicrophoneSlash size={18} aria-hidden /> : <Microphone size={18} aria-hidden />}
        </Button>
        <Button kind="ghost" size="sm" onClick={voice.leave}>
          <PhoneDisconnect size={18} aria-hidden />
          {t("voice.leave")}
        </Button>
        {endButton}
      </div>
      {error && <ErrorText>{error}</ErrorText>}
    </Bar>
  );
}
