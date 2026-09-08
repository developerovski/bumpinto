/* Alt ses çubuğu (artboard W12 · 7 durum, 4538-4619 + CSS 446-465/563-566).
   Şekil: `.dock` — YÜZEN bir pill. 390'da sticky, spacer YOK: SessionPage onu
   [data-app-shell]'in direkt flex çocuğu olarak (page ile birlikte) basar, `order-last` atıf
   altbilgisinin ardına koyar ve akıştaki gerçek yüksekliğini kaplar — altbilgi hep erişilebilir
   kalır. `sticky bottom-0` + `mb-[6.5rem]`: pill akışta yer tutar ama ekranın dibinden 104px
   yukarıda durur (artboard .dock bottom:104px). lg+'de (1280 dock) durum farklı: kart `fixed`
   olup akıştan çıkar, bu yüzden `Bar` kendi görünmez ikizini (spacer) basar ki sayfanın son
   içeriği dock'un altında kalıcı kapanmasın.

   Üç görsel varyant: koyu pill (oda açık), warm (oda kapalı/süre doldu), err (bağlanamadı). */
import {
  DotsThreeVertical, Microphone, MicrophoneSlash, PhoneX, WarningCircle,
} from "@phosphor-icons/react";
import type { SessionView } from "@bumpinto/shared";
import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { isHost, viewerId } from "../../store/sessionStore";
import { useSessionAction } from "../../store/useSessionAction";
import { useVoiceStore } from "../../store/voiceStore";
import { Avatar, Button } from "../atoms";

/** Sunucunun {error} gövdesindeki metne göre başlatma hatasını eşler (bkz. useSessionAction). */
const START_ERROR_BY_SERVER: Record<string, string> = {
  "only for group": "voice.errSolo",
  "about to expire": "voice.errExpiring",
  "session is closed": "voice.errClosed",
};

type Variant = "dark" | "warm" | "err";

/* CSS 446/458-461. #F6C6D2 (warm/err kenarı) ve #FFF1F4 (err zemini) artboard'a özel, tema
   sözlüğünde karşılığı olmayan iki renk — yeni token AÇILMADAN birebir yazılıyor. */
const VARIANTS: Record<Variant, string> = {
  dark: "bg-ink text-white shadow-[0_14px_34px_rgba(39,32,59,0.32)]",
  warm: "bg-flame-wash text-ink border-[1.5px] border-[#f6c6d2] shadow-sh1",
  err: "bg-[#fff1f4] text-ink border-[1.5px] border-[#f6c6d2] shadow-sh1",
};

/** Alt satır rengi: koyu pill'de beyazın %72'si (CSS 450), açık varyantlarda ink2 (459/461). */
const SUBTITLE: Record<Variant, string> = {
  dark: "text-white/72",
  warm: "text-ink2",
  err: "text-ink2",
};

/** Hata metni koyu zeminde flame-deep okunmaz (3:1 altı) — orada beyaz kalın satır kullanılır. */
const ALERT: Record<Variant, string> = {
  dark: "text-white",
  warm: "text-flame-deep",
  err: "text-flame-deep",
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

/** Artboard 4559: "24 dk kaldı" — dock TAM dakika yazar, saniye sayacı değil. */
function remainingMinutes(endsAt: string, now: number) {
  return Math.max(0, Math.floor((new Date(endsAt).getTime() - now) / 60_000));
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

function Bar(props: { label: string; variant?: Variant; children: ReactNode }) {
  return (
    <>
      <div
        role="region"
        aria-label={props.label}
        className={
          "relative order-last sticky bottom-0 z-40 mx-3.5 mb-[6.5rem] flex items-center gap-2.5 " +
          "rounded-full py-2 pr-2 pl-3.5 " +
          // lg+: akıştan çıkar, sağ altta 420px genişliğinde yüzer kart olur (CSS 565).
          "lg:fixed lg:right-12 lg:bottom-7 lg:z-50 lg:mx-0 lg:mb-0 lg:w-[26.25rem] " +
          VARIANTS[props.variant ?? "dark"]
        }
      >
        {props.children}
      </div>
      {/* lg+'de kart `fixed` olup akıştan çıkıyor; yer açılmazsa sayfanın son içeriği (liste sonu,
          eylem düğmesi) dock'un altında KALICI kapanır — ortaya çıkarmanın yolu olmaz. Bu görünmez
          ikiz `order-last` ile dock'un gerçek konumuna (atıf altbilgisinin ardına) taşınır ve akışta
          onun yerine boşluk bırakır. Yükseklik dock'un iki satırlık içeriğine (pill + alt boşluk)
          göre cömert sabit değer. */}
      <div aria-hidden="true" className="order-last hidden lg:block lg:h-28" />
    </>
  );
}

/** `.dock .t` (CSS 448-450) — her durumda başlık + alt satır. */
function Titles(props: {
  variant?: Variant;
  title: string;
  subtitle?: ReactNode;
  /** Alt satır bir HATA metni: role="alert" ile duyurulur ve sarmalanabilir (kırpılmaz). */
  alert?: boolean;
  /** Bitiş sebebi gibi ANLIK değişen içerik: blok tek canlı bölge olur. */
  live?: boolean;
}) {
  const variant = props.variant ?? "dark";
  return (
    <div
      className="flex min-w-0 flex-1 flex-col gap-px"
      aria-live={props.live ? "polite" : undefined}
    >
      <b className="truncate font-head text-[0.875rem] leading-[1.2] font-bold">{props.title}</b>
      {props.subtitle != null &&
        (props.alert ? (
          <span role="alert" className={`text-[0.75rem] leading-[1.2] font-bold ${ALERT[variant]}`}>
            {props.subtitle}
          </span>
        ) : (
          <span className={`truncate text-[0.75rem] leading-[1.2] font-medium ${SUBTITLE[variant]}`}>
            {props.subtitle}
          </span>
        ))}
    </div>
  );
}

/** `.dock .ic` (CSS 456-457) — 40px yuvarlak ikon düğmesi; `on` beyaz zeminli açık hâl. */
const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { on?: boolean; tone?: "dark" | "light" }
>(
  function IconButton({ on, tone = "dark", className, children, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        {...rest}
        className={
          "flex h-10 w-10 flex-none items-center justify-center rounded-full text-lg " +
          "focus-visible:outline-[2.5px] focus-visible:outline-flame-deep focus-visible:outline-offset-[3px] " +
          (on
            ? "bg-white text-ink "
            : tone === "light"
              ? "bg-ink/[0.06] text-ink "
              : "bg-white/12 ") +
          (className ?? "")
        }
      >
        {children}
      </button>
    );
  },
);

/** Artboard 4550/4606 — warm durumlarda beyaz daire içinde flame-deep mikrofon. */
function MicMark() {
  return (
    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-card text-flame-deep" aria-hidden>
      <Microphone size={18} />
    </span>
  );
}

/** Dock taşma menüsü — artboard `.pop`/`.pop-r` (CSS 96-99) sözlüğü. Host'un oda eylemleri
    dock'un ritmini bozmadan burada durur. Dışarı tıklama ve Esc ile kapanır; açıkken odak
    menünün ilk ögesine geçer (klavye kullanıcısı düğmeden sonra boşluğa düşmesin). */
function DockMenu(props: {
  busy: boolean;
  tone: "dark" | "light";
  label: string;
  itemLabel: string;
  onEnd: () => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const item = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    item.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    // `pointerdown`: menü düğmesine tekrar basıldığında `click` ile çakışıp anında yeniden
    // açılmasın diye kabın dışındaki basış kapatır.
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <div ref={box} className="relative flex-none">
      <IconButton
        tone={props.tone}
        aria-label={props.label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <DotsThreeVertical size={18} weight="bold" aria-hidden />
      </IconButton>
      {open && (
        <div
          role="menu"
          aria-label={props.label}
          className="absolute right-0 bottom-12 z-50 flex w-[11.75rem] flex-col gap-0.5 rounded-2xl border border-line bg-card p-1.5 text-ink shadow-sh2"
        >
          <button
            ref={item}
            role="menuitem"
            type="button"
            disabled={props.busy}
            onClick={() => {
              setOpen(false);
              props.onEnd();
            }}
            className="flex items-center gap-2 rounded-[0.625rem] px-3 py-2.5 text-left text-[0.875rem] font-semibold text-flame-deep disabled:opacity-45"
          >
            <PhoneX size={16} aria-hidden />
            {props.itemLabel}
          </button>
        </div>
      )}
    </div>
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
  // Menü düğmesi zemin rengiyle uyumlu olmalı: koyu pill'de beyaz %12, açık (err) varyantta ink %6.
  const tone: "dark" | "light" = voice.phase === "error" ? "light" : "dark";

  /* Artboard'ın 7 durumunun HİÇBİRİNDE ikinci bir düğme yok: dock [avatarlar | metin | TEK
     eylem] ritmindedir (4557-4560). "Herkes için bitir" yazılı bir pill olarak durduğunda hem
     bu ritmi bozuyor hem de 420px'lik kabı taşırıyordu. Host'un tek kapatma yolu olduğu için
     silinmiyor; dock'un KENDİ ikon dilinde (`.ic` 40px) bir taşma menüsüne alınıyor. */
  const menu = host && (
    <DockMenu
      busy={busy}
      tone={tone}
      label={t("voice.more")}
      itemLabel={t("voice.end")}
      onEnd={() => void run(() => voice.end(), "voice.errEnd")}
    />
  );

  // Bitiş sebebi TAZE endsAt'i ezer: host içinde yeniden başlattığında (10 sn penceresi) katılımcının
  // görünümü henüz refresh olmamış olabilir — sebep varken "Katıl" ekranı YANLIŞ olur.
  if (!endsAt || voice.endedReason) {
    // Durum 1 (kapalı · host) ve durum 7 (süre doldu): warm varyant + mikrofon dairesi.
    const timeLimit = voice.endedReason === "TIME_LIMIT";
    const hint = timeLimit && voice.limitMinutes != null
      ? t("voice.endedTimeLimitHint", { min: voice.limitMinutes })
      : null;
    return (
      <Bar label={t("voice.region")} variant="warm">
        <MicMark />
        <Titles
          variant="warm"
          live={!!voice.endedReason}
          title={voice.endedReason ? t(`voice.ended.${voice.endedReason}`) : t("voice.title")}
          subtitle={error ?? (voice.endedReason ? hint : t("voice.startHint"))}
          alert={!!error}
        />
        {host && (
          <Button
            ref={joinRef}
            kind="flame"
            size="sm"
            className="min-h-10"
            disabled={busy}
            /* Artboard düğmesi kısa: "Başlat" (4552). Uzun hâli erişilebilir ad olarak kalır —
               bağlamsız okunan bir "Başlat" neyi başlattığını söylemez. */
            aria-label={timeLimit ? undefined : t("voice.startAria")}
            onClick={() => void run(() => voice.start(), "voice.errStart", START_ERROR_BY_SERVER)}
          >
            {t(timeLimit ? "voice.restart" : "voice.start")}
          </Button>
        )}
      </Bar>
    );
  }

  const exactRemaining = t("voice.remaining", { time: remainingLabel(endsAt, now) });
  /* Görünen metin dakika bazlı; ekran okuyucu için saniyeli tam süre `sr-only` kalır (son
     dakikada "0 dk kaldı" tek başına yanıltıcı olurdu). */
  const srRemaining = <span className="sr-only">{exactRemaining}</span>;
  const minutes = t("voice.remainingMin", { min: remainingMinutes(endsAt, now) });

  // Durum 6 · bağlanılamadı / mikrofon reddi — açık pembe err varyantı.
  if (voice.phase === "error") {
    return (
      <Bar label={t("voice.region")} variant="err">
        <WarningCircle size={20} className="flex-none text-flame-deep" aria-hidden />
        <Titles
          variant="err"
          alert
          title={t("voice.connectFailedTitle")}
          subtitle={voice.micDenied ? t("voice.micDenied") : t("voice.connectFailed")}
        />
        <Button ref={joinRef} kind="white" size="sm" className="min-h-10" onClick={() => void voice.join()}>
          {t("voice.retry")}
        </Button>
        {menu}
      </Bar>
    );
  }

  /* Avatar yığını (CSS 451-453): 28px avatarlar, -8px binişme, dock zemini renginde 2px kenar.
     Durum 2/3'te de basılır (artboard 4558/4566) — kimin içeride olduğu katılmadan önce görünür. */
  const speaker = members.find((p) => (p.id === me ? voice.selfSpeaking : !!(p.id && voice.peers[p.id]?.speaking)));
  const avatars = members.length > 0 && (
    <div className="flex flex-none">
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
              i > 0 ? "-ml-2" : "",
              // Tek ring: konuşan yeşil halkayı, diğerleri dock zemini kenarını taşır.
              speaking ? "ring-[3px] ring-grass" : "ring-2 ring-ink",
              failed ? "opacity-55" : "",
            ].join(" ").trim()}
          >
            <Avatar size="xs" name={p.displayName ?? "?"} index={(view.participants ?? []).indexOf(p)} />
            <span className="sr-only">{label}</span>
          </span>
        );
      })}
    </div>
  );

  // Durum 2 · oda açık, dışarıdasın · ve durum 3 · bağlanıyor.
  if (voice.phase !== "in") {
    const joining = voice.phase === "joining";
    return (
      <Bar label={t("voice.region")}>
        {avatars}
        <Titles
          title={joining ? t("voice.title") : t("voice.open")}
          // Artboard 4567: "Bağlanıyor…" ALT SATIRDIR, düğmenin metni değil — düğme "Katıl"da
          // kalır, yalnız kilitlenir.
          subtitle={error ?? (joining ? t("voice.joining") : `${t("voice.members", { count: members.length })} · ${minutes}`)}
          alert={!!error}
        />
        {srRemaining}
        <Button ref={joinRef} kind="flame" size="sm" className="min-h-10" disabled={joining} onClick={() => void voice.join()}>
          <Microphone size={18} aria-hidden />
          {t("voice.join")}
        </Button>
        {menu}
      </Bar>
    );
  }

  // Durum 4 · içeridesin, biri konuşuyor · ve durum 5 · mikrofonun kapalı.
  const subtitle = voice.muted
    ? t("voice.mutedHint")
    : speaker
      ? t("voice.speakingBy", { name: speaker.displayName ?? "?" })
      : minutes;
  return (
    <Bar label={t("voice.region")}>
      {avatars}
      <Titles title={t("voice.inCall")} subtitle={error ?? subtitle} alert={!!error} />
      {srRemaining}
      <IconButton
        ref={muteRef}
        on={!voice.muted}
        onClick={voice.toggleMute}
        aria-label={t(voice.muted ? "voice.unmute" : "voice.mute")}
        aria-pressed={voice.muted}
      >
        {voice.muted ? <MicrophoneSlash size={18} aria-hidden /> : <Microphone size={18} aria-hidden />}
      </IconButton>
      {/* Artboard 4579-4580: ayrılma düğmesi ikon-only (yazılı "Ayrıl" pill'i dock'u 420px'in
          ötesine itiyordu); ad `aria-label`de. */}
      <IconButton aria-label={t("voice.leave")} onClick={voice.leave}>
        <PhoneX size={18} aria-hidden />
      </IconButton>
      {menu}
    </Bar>
  );
}
