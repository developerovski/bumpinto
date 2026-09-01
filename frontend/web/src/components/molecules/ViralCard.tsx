import { Sticker } from "../atoms";

/** Artboard W4 — viral döngü bloğu: "sıra sende" çıkartması + yeni buluşma daveti.
    Buton artboard'da <button>; webde kök sayfaya giden bağlantı olduğu için <a>. */
export default function ViralCard() {
  return (
    <div className="a-card a-card--flame">
      <Sticker white style={{ position: "absolute", right: 12, top: -12 }}>
        sıra sende
      </Sticker>
      <div className="col" style={{ gap: 4 }}>
        <h3>Sıradaki buluşma senden mi?</h3>
        <span className="muted">30 saniyede kur — arkadaşların linkle katılır.</span>
      </div>
      {/* Artboard: .btn.b-wh style="min-height:46px;margin-top:12px" */}
      <a className="a-btn a-btn--white" href="/" style={{ minHeight: 46, marginTop: 12 }}>
        Buluşma kur
      </a>
    </div>
  );
}
