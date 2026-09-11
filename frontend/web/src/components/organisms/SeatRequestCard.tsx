/* Kaynak: Keşfet POC artboard P2/P2a `.cta` — açık plana katılım isteği (K-B37: koltuk yalnız buradan). */
import { HandWaving } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, ErrorText, LinkButton, Note, Sticker } from "../atoms";
import Field from "../molecules/Field";
import SignInBlock from "../molecules/SignInBlock";
import { api } from "../../lib/api";
import { apiErrorCode } from "../../lib/apiError";
import { useAuthStore } from "../../store/authStore";

type Seat = "loading" | "none" | "PENDING" | "APPROVED" | "DECLINED" | "closed";

/** Onay beklerken 10 sn'de bir sorulur: bekleyenin koltuğu yok, WS konusu ona KAPALI — tek yol bu. */
const POLL_MS = 10_000;
const NOTE_MAX = 140;

const statusOf = (e: unknown) => (e as { response?: { status?: number } })?.response?.status;

export default function SeatRequestCard({ slug, hostName, joinPolicy, onSeated }: {
  slug: string;
  hostName: string | null;
  joinPolicy: "OPEN" | "APPROVAL";
  /** Koltuk onaylandı: oturumu tazele — `GET /api/sessions/{slug}` hesap koltuğundan çerezi yazar. */
  onSeated: () => void;
}) {
  const { t } = useTranslation();
  const status = useAuthStore((s) => s.status);
  const me = useAuthStore((s) => s.me);
  const [seat, setSeat] = useState<Seat>("loading");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seatedRef = useRef(onSeated);
  seatedRef.current = onSeated;
  const host = hostName ?? t("plan.host");
  const open = joinPolicy === "OPEN";

  async function check() {
    try {
      const r = await api.mySeat(slug);
      const next = r.status ?? "none";
      setSeat(next);
      if (next === "APPROVED") seatedRef.current();
    } catch (e) {
      // 404 = henüz istek yok; 409 = plan kapandı. Diğer hatalar (ağ, 5xx) DURUMU DEĞİŞTİRMEZ: bekleyen
      // istek "yok" sayılsaydı yoklama durur ve onay hiç fark edilmezdi (WS bekleyene kapalı).
      const code = statusOf(e);
      setSeat((s) => (code === 404 ? "none" : code === 409 ? "closed" : s === "loading" ? "none" : s));
    }
  }

  // Anonimde SORULMAZ: 401 yenileme kesicisini ve çıkış işleyicisini tetiklerdi.
  useEffect(() => {
    if (status === "signed") void check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, slug]);

  useEffect(() => {
    if (seat !== "PENDING") return;
    const id = setInterval(() => void check(), POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seat, slug]);

  async function request() {
    setBusy(true);
    setError(null);
    try {
      // Konum profil varsayılanından (kesin koordinat — üye olunca orta nokta girdisi). ETİKET
      // GÖNDERİLMEZ: host onaydan önce isteğin `locality`'sini görür ve kayıtlı etiket ev adresi olabilir.
      const home = me?.defaultLocation;
      const r = await api.requestSeat(slug, {
        displayName: me?.displayName ?? "",
        note: note.trim() || undefined,
        travelMode: me?.defaultTravelMode,
        ...(home ? { lat: home.lat, lng: home.lng } : {}),
      });
      // OPEN planda sunucu anında onaylar ve ÇEREZ YAZMAZ — oturum tazelemesi yazar.
      if (r.status === "APPROVED") {
        setSeat("APPROVED");
        seatedRef.current();
      } else setSeat(r.status === "DECLINED" ? "DECLINED" : "PENDING");
    } catch (e) {
      // 409 gövdeleri düz metin: yalnız "plan full" dolu demektir; "already requested" durumu tazeler.
      const code = apiErrorCode(e);
      if (code === "already requested") void check();
      else if (code === "plan is closed") setSeat("closed");
      else setError(t(code === "plan full" ? "seat.errFull" : "seat.errRequest"));
    } finally {
      setBusy(false);
    }
  }

  if (status === "unknown") return null;
  if (status === "anon") return <SignInBlock onDone={onSeated} />;

  if (seat === "PENDING") {
    return (
      <div className="flex flex-col items-start gap-2.5" role="status">
        <Sticker white>{t("seat.pending")}</Sticker>
        <Note>{t("seat.pendingLead", { host })}</Note>
      </div>
    );
  }
  if (seat === "DECLINED" || seat === "closed") {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="m-0 text-[0.9375rem] text-ink">{t(seat === "closed" ? "seat.errClosed" : "seat.declined")}</p>
        <LinkButton href="/kesfet" kind="white" size="fit-sm">{t("seat.backToDiscover")}</LinkButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Field
        id="seat-note"
        label={t("seat.note")}
        value={note}
        maxLength={NOTE_MAX}
        onChange={(e) => setNote(e.target.value)}
        disabled={seat !== "none"}
      />
      <Button type="button" onClick={() => void request()} disabled={busy || seat !== "none"}>
        <HandWaving size={18} aria-hidden />
        {t(open ? "seat.join" : "seat.want")}
      </Button>
      {error && <ErrorText>{error}</ErrorText>}
      <Note small center>{open ? t("seat.joinNote") : t("seat.afterApprove", { host })}</Note>
    </div>
  );
}
