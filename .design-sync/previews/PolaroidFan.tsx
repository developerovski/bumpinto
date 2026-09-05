import { PolaroidFan, StepList } from "@bumpinto/web";

/* CONFIG NOTU (learnings'e de yazıldı): PolaroidFan'ın KÖK sarmalayıcısı
   `relative hidden h-[18.75rem] lg:block` — yalnız ≥1024px viewport'ta görünür (Landing'in
   sağ kolonu masaüstüne özel dekor, gerçek üründe de mobilde hiç mount edilmiyor değil ama
   `TwoZone` görsel sırayla gizli kalıyor). Varsayılan çekim görüntü alanı 900px genişlik;
   Tailwind `lg:` eşiği 1024px. Bu bileşenin hücreleri `cfg.overrides.PolaroidFan.viewport`
   (≥1024 genişlik, örn. "1120x520") AYARLANMADAN boş/beyaz render olur — bu preview'ın
   doğru içeriği zaten var, yalnız görünür olması için orkestratörün config'e bu satırı
   eklemesi gerekiyor. */

/** W0 · Landing sağ kolonunun süs kartı: iki hayalet polaroid (Koffie Top, Stadswandelpark)
    + önde "Café Berlage" — tamamen hardcoded, `PolaroidFanProps` boş (prop almıyor). Tek
    başına, ürünün gerçek yerinden izole gösteriliyor. */
export function Standalone() {
  return <PolaroidFan />;
}

/** W0 · Landing.tsx'in GERÇEK sağ kolon bileşimi: fan'ın altında 3 adımlı "nasıl çalışır"
    listesi (`StepList`) — `right={<><PolaroidFan /><StepList /></>}`. */
export function InLanding() {
  return (
    <div className="flex flex-col gap-6">
      <PolaroidFan />
      <StepList />
    </div>
  );
}
