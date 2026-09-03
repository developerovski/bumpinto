import { Fragment, Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { byFairness, byRating, type ParticipantDto, type VenueDto as Venue } from "@bumpinto/shared";
import type { TravelInfo } from "../../lib/useTravelLabels";
import { useMediaQuery } from "../../lib/useMediaQuery";
import { unionProvider } from "../../lib/provider";
import { Button, HandNote, Note } from "../atoms";
import Attribution from "../molecules/Attribution";
import LazyBoundary from "../molecules/LazyBoundary";
import SelectionCard from "../molecules/SelectionCard";
import VenuePopCard from "../molecules/VenuePopCard";
import VenueRow from "../molecules/VenueRow";
import VenueSort, { type SortKey } from "../molecules/VenueSort";

/* Harita ayrı chunk: 390'da liste görünümündeyken Maps JS ne indirilir ne yüklenir
   (karar dokümanı §1 bulgusu — her 390 görüntülemesi = 1 Dynamic Maps yüklemesi;
   §4.7 — 390'da hiçbir ekranda varsayılan harita yok). */
const MapView = lazy(() => import("./MapView"));

export type BrowserMode = "host" | "guest" | "solo";

/** Mekan listesi ↔ harita gövdesi (Mekanlar ekranı) — liste-önce, adil sıra varsayılan. */
export default function VenueBrowser(props: {
  venues: Venue[];
  participants: ParticipantDto[];
  midpoint: { lat: number; lng: number } | null;
  radiusKm: number | null;
  mode: BrowserMode;
  travel: TravelInfo;
  onPick: (venueId: string) => void;
  tint?: number;
  pinLabels?: Record<string, string>;
  /** SessionView.midpointLabel — satır meta çizgisinde semt bununla AYNIYSA tekrar edilmez (§4.9). */
  midpointLabel?: string;
  /** Analitik: "Haritada gör" dokunuşu (Task 8). */
  onMapOpen?: () => void;
}) {
  const { t } = useTranslation();
  // `sel` — yalnız ODAK (hover/focus/tık/pin): haritayı ve pop kartı yönlendirir.
  // `picked` — yalnız GERÇEK seçim (tık ya da Enter/Space): SOLO onay kartını bu açar.
  // İkisi ayrı tutulur; aksi halde salt hover bile onay kartını açardı (kod-review bulgusu).
  const [sel, setSel] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("fair");
  /** 390'da harita YALNIZ bu bayrakla mount edilir; gerçek lg tarayıcıda useMediaQuery devralır. */
  const [mapOpen, setMapOpen] = useState(false);
  const tint = props.tint ?? 0;
  /** SOLO onay kartı "Vazgeç" ile kapanınca odağı satıra geri vermek için (kod-review bulgusu). */
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  const venues = useMemo(
    () => [...props.venues].sort(sort === "fair" ? byFairness : byRating),
    [props.venues, sort],
  );
  // Varsayılan seçim YOK: pop kart ve büyük pin yalnız hover/odak (masaüstü) ya da dokunma
  // (mobil) ile; hiçbir şey hover'lanmıyorsa harita nötr kalır (UI review 2026-09-03).
  const selected = sel ?? picked ?? null;
  const selectedVenue = venues.find((v) => v.id === selected);
  // Sağlayıcı atfı (§4.9, §5.B.9) — listede TEK sağlayıcı varsa ona özgü metin, karışık
  // (ya da bilinmeyen) sağlayıcılı listede politika gereği ikisi de basılır (union — Attribution.tsx).
  const listProvider = unionProvider(venues);

  // §5.C "Konumsuz katılımcı notu" — elle nokta ekleyenler (manual) hariç, konumu henüz
  // gelmemiş katılımcılar. TEK, ADLI, POZİTİF not (tekil); sayaç/"geç" etiketi/suçluluk yok.
  const withoutLocation = props.participants.filter((p) => p.hasLocation === false && !p.manual);
  const soleWithoutName = withoutLocation.length === 1 ? withoutLocation[0].displayName : undefined;
  const noLocationNote =
    withoutLocation.length === 0
      ? null
      : soleWithoutName
        ? t("venues.noLocationOne", { name: soleWithoutName })
        : t("venues.noLocationMany");

  // Grup modunda seçim aksiyonu YOK (karar dokümanı §5.B.1): karar deste + runoff'tan çıkar.
  // SOLO'da satırda buton yok — seçili satırın ALTINA `.f-selcard` onay kartı eklenir.
  const solo = props.mode === "solo";
  const confirming = solo && picked != null;

  function openMap() {
    setMapOpen(true);
    props.onMapOpen?.();
  }

  /** Tık/Enter ya da harita pini — hem odağı hem seçimi taşır. */
  function pick(id: string | null) {
    setSel(id);
    setPicked(id);
  }

  function cancelPick(id: string | undefined) {
    setPicked(null);
    if (id) rowRefs.current.get(id)?.focus();
  }

  // Haritadan bir pin seçilince listedeki satır kendiliğinden görünür olur (UI review
  // 2026-09-03): sol sütun `overflow-y-auto` olduğu için kaydırma sayfayı değil listeyi taşır.
  // `block: "nearest"` — satır zaten görünürse (satır hover'ı) hiç kaydırma olmaz.
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  useEffect(() => {
    if (!selected) return;
    rowRefs.current.get(selected)?.scrollIntoView?.({
      block: "nearest",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [selected, reduceMotion]);

  // Gerçek tarayıcıda lg genişlikte ghost'a basılmadan da mount olur (masaüstü sağ kolon
  // her zaman görünür); jsdom `matchMedia` uygulamıyor → test-setup.ts'teki güdük varsayılan
  // `false` döner, testler ghost'a basmadan haritanın mount olmadığını doğrulayabilir.
  const desktop = useMediaQuery("(min-width: 1024px)");

  const map = (
    <LazyBoundary fallback={<Note center>{t("map.notConfigured")}</Note>}>
      <Suspense fallback={<Note center>{t("map.loading")}</Note>}>
        <MapView
          participants={props.participants}
          venues={venues}
          midpoint={props.midpoint}
          radiusKm={props.radiusKm}
          selectedVenueId={selected}
          onSelectVenue={pick}
          pinLabels={props.pinLabels}
          tint={tint}
          heightClass="h-[60dvh] lg:h-full"
        />
        {selectedVenue && (
          <VenuePopCard
            venue={selectedVenue}
            tint={tint}
            travel={props.travel}
            midpointLabel={props.midpointLabel}
            onClose={() => {
              setSel(null);
              setPicked(null);
            }}
            action={
              // `selectedVenue` hover'ı (`sel`) izler, `picked` ise gerçek tıkı — ikisi
              // ayrışabilir (A'yı seç, B'yi hover'la): pop kart yalnız GERÇEKTEN seçili
              // mekan için onay basar, "Kilitle" de her zaman `picked`'ı kilitler.
              confirming && selectedVenue.id === picked ? (
                <SelectionCard
                  venue={selectedVenue}
                  travel={props.travel}
                  compact
                  onConfirm={() => props.onPick(picked!)}
                  onCancel={() => cancelPick(picked)}
                />
              ) : undefined
            }
          />
        )}
      </Suspense>
    </LazyBoundary>
  );

  return (
    // lg: Page'in kalan yüksekliğini doldurur; sayfa kaymaz, yalnız sol liste kayar (UI review).
    <div className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
      <div className="mb-3 flex items-center justify-between gap-3">
        <VenueSort value={sort} onChange={setSort} />
        {/* 390: sekme anahtarı yerine tek ghost — harita ancak basılınca yüklenir. */}
        {!mapOpen && (
          <div className="lg:hidden">
            <Button type="button" kind="white" size="sm" onClick={openMap}>
              {t("venues.showOnMap")}
            </Button>
          </div>
        )}
      </div>
      <div className="lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(26rem,32rem)_1fr] lg:gap-10">
        <div className={`${mapOpen ? "hidden lg:flex" : "flex"} flex-col gap-1.5 lg:min-h-0 lg:overflow-y-auto lg:pr-2`}>
          {venues.map((v, i) => (
            <Fragment key={v.id ?? `row-${i}`}>
              <VenueRow
                ref={(el) => {
                  if (!v.id) return;
                  if (el) rowRefs.current.set(v.id, el);
                  else rowRefs.current.delete(v.id);
                }}
                venue={v}
                selected={v.id === selected}
                tint={tint}
                travel={props.travel}
                midpointLabel={props.midpointLabel}
                onHover={() => setSel(v.id ?? null)}
                onLeave={() => setSel((cur) => (cur === v.id ? null : cur))}
                onSelect={() => pick(v.id ?? null)}
              />
              {/* Artboard `.f-selcard` — SOLO'da seçili satırın ALTINDA satır-içi onay. */}
              {confirming && v.id === picked && v.id && (
                <SelectionCard
                  venue={v}
                  travel={props.travel}
                  onConfirm={() => props.onPick(v.id!)}
                  onCancel={() => cancelPick(v.id)}
                />
              )}
            </Fragment>
          ))}
          {/* TEK el yazısı not — "önce herkese en adil olanlar →" (§4.5). */}
          <HandNote>{t("venues.fairHand")}</HandNote>
          {props.mode !== "solo" && <Note>{t("venues.everyoneSees")}</Note>}
          {noLocationNote && <Note>{noLocationNote}</Note>}
          <Attribution provider={listProvider} />
        </div>
        <div className={`relative ${mapOpen ? "" : "hidden"} lg:block lg:min-h-0`}>
          {/* lg'de sağ kolon CSS ile her zaman görünür; Maps JS yine yalnız gerçekten
              lg genişlikte ya da ghost'a basılınca mount edilir (tembel chunk). */}
          {(mapOpen || desktop) && map}
        </div>
      </div>
    </div>
  );
}
