/* Ses denetimi (artboard W12 · 7 durum, 4538-4619 + CSS 446-465).

   Artboard bunu YÜZEN bir pill olarak çiziyor: 390'da ekranın dibinde (`.dock{bottom:104px}`),
   1280'de sağ altta 420px'lik kart (`.dk .dock`). Uygulamada iki sorun çıktı: (1) `fixed` kart
   akışta yedek bant ayırmak zorundaydı ve o bant tek ekranlık sayfalarda kaydırılıp geçilemeyen
   ölü bir şerit bırakıp altbilgiyi dipten koparıyordu; (2) 390'daki pill, sayfanın alt aksiyon
   şeridiyle (`MobileCta`) çakışıyordu.

   Kullanıcı kararı (2026-09-08): denetim yüzmez, O SAYFANIN AKSİYONLARIYLA AYNI YERDE durur —
   masaüstünde başlık aksiyon satırında, mobilde alt aksiyon şeridinde. Kısa bir düğme grubudur;
   artboard'ın başlık/alt satır metinleri ("Herkes gelmeden konuşmaya başla", hata sebepleri,
   kalan süre) YAZILMAZ, ipucu (`title`) ve `sr-only` olarak durur — bilgi kaybolmaz.

   Sayfa iki slotu da doldurur (`placement="header"` ve `"strip"`); kırılım hangisinin DOM'a
   gireceğine karar verir, diğeri `null` döner. */
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
import { personIndexOf } from "../../lib/personColor";
import { useMediaQuery } from "../../lib/useMediaQuery";
import { Avatar, Button } from "../atoms";

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

function Bar(props: {
  label: string;
  /** Yazılmayan durum satırları: ipucu (`title`) + `sr-only` olarak buradan verilir. */
  statusTitle?: string;
  statusSub?: ReactNode;
  /** Alt satır bir HATA: `role="alert"` ile duyurulur — sunum kısaldı diye duyuru düşmemeli. */
  statusAlert?: boolean;
  children: ReactNode;
}) {
  const sub = typeof props.statusSub === "string" ? props.statusSub : null;
  return (
    <div
      role="region"
      aria-label={props.label}
      /* İpucu tek cümle: başlık + alt satır. Ekran okuyucuya ise İKİ AYRI düğüm verilir —
         birleştirilmiş tek dize, "Bağlanılamadı" gibi tek başına anlamlı bir olguyu
         aranamaz hâle getiriyordu. */
      title={props.statusTitle && sub ? `${props.statusTitle} · ${sub}` : (props.statusTitle ?? undefined)}
      className="flex flex-none items-center justify-end gap-2"
    >
      {props.children}
      {/* Durum ANLIK değişir (biri konuşmaya başladı, süre doldu) — tek canlı bölge. */}
      <span
        className="sr-only"
        role={props.statusAlert ? "alert" : undefined}
        aria-live={props.statusAlert ? undefined : "polite"}
      >
        {props.statusTitle && <span>{props.statusTitle}</span>}
        {props.statusSub != null && <span>{props.statusSub}</span>}
      </span>
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

/** Dock taşma menüsü — artboard `.pop`/`.pop-r` (CSS 96-99) sözlüğü. Host'un oda eylemleri
    dock'un ritmini bozmadan burada durur. Dışarı tıklama ve Esc ile kapanır; açıkken odak
    menünün ilk ögesine geçer (klavye kullanıcısı düğmeden sonra boşluğa düşmesin). */
function DockMenu(props: {
  busy: boolean;
  tone: "dark" | "light";
  label: string;
  itemLabel: string;
  onEnd: () => void;
  /** Başlık satırındaki kısa denetim: menü YUKARI değil AŞAĞI açılır (üstünde yer yok). */
  below?: boolean;
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
          className={`absolute right-0 z-50 flex w-[11.75rem] flex-col gap-0.5 rounded-2xl border border-line bg-card p-1.5 text-ink shadow-sh2 ${
            props.below ? "top-12" : "bottom-12"
          }`}
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

export default function VoiceDock(props: {
  view: SessionView;
  /** Denetimin nerede yaşadığı. Kural (kullanıcı kararı 2026-09-08): ses denetimi O SAYFANIN
      aksiyonlarıyla AYNI yerde durur — masaüstünde başlık satırında (`header`), mobilde alt
      aksiyon şeridinde (`strip`, `MobileCta` içinde).
      `header-lg`: sayfanın bir alt şeridi VAR, o yüzden başlık kopyası yalnız ≥1024'te basılır.
      `header`: sayfanın alt aksiyon grubu YOK (Lobi/Bekle, davetli Mekanlar) — denetim her
      genişlikte başlıkta kalır, çünkü "aksiyonların yanı" orası.
      Bir sayfa iki slotu da doldurduğunda aynı anda yalnız BİRİ DOM'a girer. */
  placement?: "header" | "header-lg" | "strip";
}) {
  const { t } = useTranslation();
  const view = props.view;
  const desktop = useMediaQuery("(min-width: 1024px)");
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
  const strip = props.placement === "strip";
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

  /* Sunum kapısı (kancalar bu satırın ÜSTÜNDE çağrılır — koşullu hook yok).
     `header` yalnız ≥1024'te, `strip` yalnız altında basılır. Basılmayan `null` döner: DOM'a
     hiç girmediği için ref'leri boştur, odak yönetimi görünmeyen ikizi odaklayamaz. */
  if (strip && desktop) return null;
  if (props.placement === "header-lg" && !desktop) return null;
  // SOLO'da ses yok; süresi dolmuş ya da kararı geçersizleşmiş oturumda da denetim basılmaz.
  // Eskiden bu kapı `SessionPage`'deydi; iki sunum iki farklı yerden basıldığı için kurala
  // bileşenin KENDİSİ sahip olur — çağıran yerlerin hepsinde tekrarlanmaz.
  if (view.sessionType === "SOLO" || view.status === "EXPIRED") return null;
  if (view.status === "DECIDED" && !(view.venues ?? []).some((v) => v.id === view.decidedVenueId)) return null;
  if (!endsAt && !host && !voice.endedReason) return null;
  // Menü düğmesi zemin rengiyle uyumlu olmalı: koyu pill'de beyaz %12, açık zeminde (err varyantı
  // ve başlık satırındaki kısa denetim) ink %6.
  // Denetim her zaman açık zeminde (başlık satırı / alt şerit) — ink %6.
  const tone = "light" as const;

  /* Artboard'ın 7 durumunun HİÇBİRİNDE ikinci bir düğme yok: dock [avatarlar | metin | TEK
     eylem] ritmindedir (4557-4560). "Herkes için bitir" yazılı bir pill olarak durduğunda hem
     bu ritmi bozuyor hem de 420px'lik kabı taşırıyordu. Host'un tek kapatma yolu olduğu için
     silinmiyor; dock'un KENDİ ikon dilinde (`.ic` 40px) bir taşma menüsüne alınıyor. */
  const menu = host && (
    <DockMenu
      busy={busy}
      tone={tone}
      below={!strip}
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
    const title = voice.endedReason ? t(`voice.ended.${voice.endedReason}`) : t("voice.title");
    const sub = error ?? (voice.endedReason ? hint : t("voice.startHint"));
    return (
      <Bar label={t("voice.region")} statusTitle={title} statusSub={sub} statusAlert={!!error}>
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
            <Microphone size={18} aria-hidden />
            {/* Kısa denetim başlık satırında YALNIZ başına durur: "Başlat" neyi başlattığını
                söylemez, o yüzden orada oda adı ("Sesli sohbet") yazılır. Alt çubukta bağlam
                zaten yanındaki başlık bloğundan geliyor. */}
            {timeLimit ? t("voice.restart") : t("voice.title")}
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
    const sub = voice.micDenied ? t("voice.micDenied") : t("voice.connectFailed");
    return (
      <Bar
        label={t("voice.region")}
        statusTitle={t("voice.connectFailedTitle")}
        statusSub={sub}
        statusAlert
      >
        <Button ref={joinRef} kind="white" size="sm" className="min-h-10" onClick={() => void voice.join()}>
          <WarningCircle size={18} className="text-flame-deep" aria-hidden />
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
              // Her avatar dock zemini renginde 2px kenar taşır (CSS 452).
              // Halka dock zemininin rengidir (CSS 452): koyu pill'de ink, başlık satırında paper.
              // Halka denetimin zemini rengindedir (CSS 452) — açık zeminde paper.
              "relative inline-flex rounded-full ring-2 ring-paper",
              i > 0 ? "-ml-2" : "",
              failed ? "opacity-55" : "",
            ].join(" ").trim()}
          >
            <Avatar size="xs" name={p.displayName ?? "?"} index={personIndexOf(view.participants, p.id)} />
            {/* Konuşma göstergesi artboard'da avatarı saran halka DEĞİL, sağ altta duran 12px
                yeşil varlık noktasıdır (4575 `.od.spk`, CSS 438-439): 2px beyaz kenar + hafif
                haleli. Halka avatarı büyütüp yığının -8px binişmesini bozuyordu. */}
            {speaking && (
              <i
                aria-hidden
                className="absolute -right-px -bottom-px h-3 w-3 rounded-full border-2 border-white bg-grass shadow-[0_0_0_3px_rgba(11,122,68,0.25)]"
              />
            )}
            <span className="sr-only">{label}</span>
          </span>
        );
      })}
    </div>
  );

  // Durum 2 · oda açık, dışarıdasın · ve durum 3 · bağlanıyor.
  if (voice.phase !== "in") {
    const joining = voice.phase === "joining";
    const title = joining ? t("voice.title") : t("voice.open");
    // Artboard 4567: "Bağlanıyor…" ALT SATIRDIR, düğmenin metni değil — düğme "Katıl"da kalır,
    // yalnız kilitlenir.
    const sub = error ?? (joining ? t("voice.joining") : `${t("voice.members", { count: members.length })} · ${minutes}`);
    return (
      <Bar label={t("voice.region")} statusTitle={title} statusSub={sub} statusAlert={!!error}>
        {avatars}
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
    <Bar label={t("voice.region")} statusTitle={t("voice.inCall")} statusSub={error ?? subtitle} statusAlert={!!error}>
      {avatars}
      {srRemaining}
      <IconButton
        ref={muteRef}
        tone="light"
        on={!voice.muted}
        onClick={voice.toggleMute}
        aria-label={t(voice.muted ? "voice.unmute" : "voice.mute")}
        aria-pressed={voice.muted}
      >
        {voice.muted ? <MicrophoneSlash size={18} aria-hidden /> : <Microphone size={18} aria-hidden />}
      </IconButton>
      {/* Artboard 4579-4580: ayrılma düğmesi ikon-only (yazılı "Ayrıl" pill'i dock'u 420px'in
          ötesine itiyordu); ad `aria-label`de. */}
      <IconButton tone="light" aria-label={t("voice.leave")} onClick={voice.leave}>
        <PhoneX size={18} aria-hidden />
      </IconButton>
      {menu}
    </Bar>
  );
}
