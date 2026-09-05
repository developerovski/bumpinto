import { Button, ShareButton } from "@bumpinto/web";

/** Sonuç ekranı sol kolonu (`ResultScreen`) — kazanan mekan kartının hemen altında,
    varsayılan haliyle: `kind` verilmez (beyaz'a düşer), etiket "Gruba paylaş".
    `navigator.share` yoksa (bu ortamda öyle) metin + link panoya birlikte kopyalanır. */
export function Invite() {
  return (
    <ShareButton
      text="Kahve turu: Karaköy Lokantası — BumpInto ile ortada buluştuk."
      url="https://bumpinto.app/j/kahve-turu"
    />
  );
}

/** Mekanlar sayfası · host aksiyon satırı (`VenuesPage`) — "Karıştır ve kaydır" ile yan
    yana. `copyOnly` paylaşım sayfasını hiç açmaz, yalnız linki (metinsiz) panoya yazar;
    masaüstünde davet linkinin tek işi olması gerekirken paylaşım sayfası araya girmesin diye. */
export function InviteRow() {
  return (
    <div className="flex items-center gap-2.5">
      <ShareButton
        text="Kahve turu — ortada buluşuyoruz, sen de gel:"
        url="https://bumpinto.app/j/kahve-turu"
        label="Davet linki"
        copiedLabel="Kopyalandı"
        kind="white"
        size="fit"
        copyOnly
      />
      <Button type="button" size="fit">Karıştır ve kaydır</Button>
    </div>
  );
}

/** "Deste bitti" kartı (`FinishedCard`) — host, kaydırmayı bitirmemiş arkadaşlarını
    dürtüyor. Aynı bileşen, yalnız `label` değişiyor ("Bekleyenleri dürt"). */
export function Nudge() {
  return (
    <ShareButton
      text="Kahve turu için 12 mekan hazır, seni bekliyoruz:"
      url="https://bumpinto.app/j/kahve-turu"
      label="Bekleyenleri dürt"
      copiedLabel="Kopyalandı"
      kind="white"
    />
  );
}

/** İkinci tur (`RunoffStatus`) — kendi oyun kilitlendikten SONRA bile hatırlatma
    butonu kalır (diğerleri hâlâ oy vermemiş olabilir). Kilit onay satırı `RunoffStatus`
    kaynağından birebir taşındı (`border-[#bfe5cf] bg-grass-wash` + `c-check` glifi). */
export function Remind() {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="mt-0.5 flex items-center justify-center gap-2 text-[0.75rem] text-ink2">
        <span className="font-bold tabular-nums">2/3 seçti</span>
        <span>· kim neyi seçti, sonuçta belli olur</span>
      </div>
      <div className="flex items-center gap-[0.6875rem] rounded-card border border-[#bfe5cf] bg-grass-wash p-[0.875rem_1rem]">
        <span className="c-check" aria-hidden>
          <i />
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-[0.875rem] font-bold text-grass">Seçimin kilitli</span>
          <span className="text-[0.75rem] text-ink2">diğerlerini bekliyoruz — sonuç herkes seçince açıklanır</span>
        </div>
      </div>
      <ShareButton
        text="Seçim seni bekliyor, tek tıkla kilitle:"
        url="https://bumpinto.app/j/kahve-turu"
        label="Hatırlatma gönder"
        kind="white"
      />
    </div>
  );
}
