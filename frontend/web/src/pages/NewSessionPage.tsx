import {
  DURATIONS,
  MAX_CAPACITY,
  MIN_CAPACITY,
  WHERE_LABEL_MAX,
  effectiveJoinPolicy,
  openPlanError,
  type DurationHours,
  type Schemas,
} from "@bumpinto/shared";
import { ArrowLeft, MapPin } from "@phosphor-icons/react";
import { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, ErrorText, HandNote, Heading, Note, Page } from "../components/atoms";
import ActivityPicker from "../components/molecules/ActivityPicker";
import Field from "../components/molecules/Field";
import InvitePreview from "../components/molecules/InvitePreview";
import LazyBoundary from "../components/molecules/LazyBoundary";
import LocationField from "../components/molecules/LocationField";
import MobileCta, { DesktopOnly } from "../components/molecules/MobileCta";
import Segmented from "../components/molecules/Segmented";
import Sheet from "../components/molecules/Sheet";
import Stepper from "../components/molecules/Stepper";
import TravelModeField from "../components/molecules/TravelModeField";
import TwoZone from "../components/molecules/TwoZone";
import TypeSelector from "../components/molecules/TypeSelector";
import PointsEditor from "../components/organisms/PointsEditor";
import { ACTIVITY_GROUPS, MAX_ACTIVITIES } from "../lib/activity";
import { DEFAULT_MAP_CENTER, centroid } from "../lib/geo";
import { geocode } from "../lib/geocode";
import { useMediaQuery } from "../lib/useMediaQuery";
import { useAuthStore } from "../store/authStore";
import { pointCount, previewParticipants, useNewSessionStore, type Loc } from "../store/newSessionStore";
import { useOwnLocation } from "../store/useOwnLocation";

/* Harita ayrı chunk (harita politikası §4.7) — tembel yüklenir. */
const MapView = lazy(() => import("../components/organisms/MapView"));
/* Seçici de ayrı chunk VE yalnız düğmeye basılınca render edilir: faturalanan birim
   `new google.maps.Map()` örneğidir, sayfa yüklemesi değil. */
const MapPicker = lazy(() => import("../components/organisms/MapPicker"));

type Activity = Schemas["CreateSessionRequest"]["activityTypes"][number];

/** `?activity=` güvenilmez girdidir: bilinmeyen değer `reset`e girerse sunucu 400 döner. */
const KNOWN_ACTIVITIES = new Set<string>(Object.values(ACTIVITY_GROUPS).flat());

/** DS `.lb` — form bölüm başlığı (Field/LocationField ile AYNI ölçü: 14px/600, cümle düzeni).
    `.ov` (11.5px, büyük harf) YALNIZ etkinlik grup başlıkları ve "Konumlar" için ayrıldı —
    artboard 817/831/895 vs 836/900; tek formda iki başlık sistemi karışmaz. */
function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={`text-[0.875rem] font-semibold${className ? ` ${className}` : ""}`}>{children}</span>;
}

/** Artboard W2 "Yeni oturum" — Grup: link kur; Bireysel: konumları elle ekle, harita önizlemesinde gör. */
export default function NewSessionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.me);
  const type = useNewSessionStore((s) => s.type);
  const activities = useNewSessionStore((s) => s.activities);
  const name = useNewSessionStore((s) => s.name);
  const points = useNewSessionStore((s) => s.points);
  const travelMode = useNewSessionStore((s) => s.travelMode);
  const busy = useNewSessionStore((s) => s.busy);
  const error = useNewSessionStore((s) => s.error);
  const setType = useNewSessionStore((s) => s.setType);
  const toggleActivity = useNewSessionStore((s) => s.toggleActivity);
  const setName = useNewSessionStore((s) => s.setName);
  const setTravelMode = useNewSessionStore((s) => s.setTravelMode);
  const anchorMode = useNewSessionStore((s) => s.anchorMode);
  const anchor = useNewSessionStore((s) => s.anchor);
  const setAnchorMode = useNewSessionStore((s) => s.setAnchorMode);
  const setAnchor = useNewSessionStore((s) => s.setAnchor);
  const addLocalPoint = useNewSessionStore((s) => s.addLocalPoint);
  const removeLocalPoint = useNewSessionStore((s) => s.removeLocalPoint);
  const setLocalPointTravelMode = useNewSessionStore((s) => s.setLocalPointTravelMode);
  const submit = useNewSessionStore((s) => s.submit);
  const reset = useNewSessionStore((s) => s.reset);
  const plan = useNewSessionStore((s) => s.plan);
  const setPlan = useNewSessionStore((s) => s.setPlan);
  const [params] = useSearchParams();

  const loc = useOwnLocation({
    initial: me?.defaultLocation
      ? { lat: me.defaultLocation.lat, lng: me.defaultLocation.lng, label: me.defaultLocation.label ?? null }
      : null,
    autoDetect: true,
  });
  const own = loc.coords;
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [anchorQuery, setAnchorQuery] = useState("");
  const [picker, setPicker] = useState<"own" | "anchor" | null>(null);
  /** Plan hataları ilk gönderim denemesinden (ya da alandan çıkıştan) SONRA görünür: Şimdi'yi
      seçer seçmez kırmızı bir "Nerede?" alanı karşılamasın. */
  const [showPlanErrors, setShowPlanErrors] = useState(false);
  /** İstek kuşağı: haritadan seçim ya da yeni bir sorgu araya girerse geç dönen Nominatim
      cevabı çapayı ele geçiremesin (`useOwnLocation`'ın `addressRef` koruması ile aynı sınıf). */
  const anchorReq = useRef(0);

  /** Adres yazıp alandan çıkınca çözülür — her tuşta değil: Nominatim politikası. */
  /** En son BASARIYLA çözülmüş sorgu. `create()` bunu `anchorQuery` ile karşılaştırır: alan
      değişmişse (ya da hiç çözülmemişse) göndermeden ÖNCE çözer. Aynı sorgu için ikinci bir
      Nominatim çağrısı yapılmaz — politika "onayda bir kez". */
  const resolvedQuery = useRef("");

  async function resolveAnchor(): Promise<Loc | null> {
    const q = anchorQuery.trim();
    const gen = ++anchorReq.current;
    // Alan boşaltıldıysa çapa DA düşer: görünmeyen bir çapayla oturum kurulmaz.
    if (!q) {
      setAnchor(null);
      resolvedQuery.current = "";
      return null;
    }
    const found = await geocode(q);
    if (anchorReq.current !== gen) return null; // bayat cevap
    if (found) {
      setAnchor(found);
      resolvedQuery.current = q;
      setLocalError(null);
      return found;
    }
    setLocalError(t("join.errGeocode"));
    return null;
  }

  useEffect(() => {
    // TEK efekt ve sıra önemli: sorgu parametreleri reset'ten SONRA uygulanır, yoksa reset onları siler.
    // Keşfet girişleri: `?now=1` (Buradayım) → Şimdi, `?open=1&activity=X` (Plan aç) → Tarih seç.
    const queried = params.get("activity");
    const activity = queried && KNOWN_ACTIVITIES.has(queried) ? (queried as Activity) : undefined;
    reset(activity ?? (me?.defaultActivity as Activity) ?? undefined);
    if (me?.defaultTravelMode) setTravelMode(me.defaultTravelMode);
    if (params.get("now") === "1") setPlan({ when: "NOW" });
    else if (params.get("open") === "1") setPlan({ when: "DATE" });
    // yalnız ilk mount'ta — reset, varsayılan etkinlik/ulaşım ve Keşfet'ten gelen mod
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const instant = plan.when === "NOW";
  const isPlan = plan.when !== "UNSET";
  const planErr = openPlanError(plan, new Date());
  /* Şimdi planının çapası "o anki konum" (spec §1.3). Profildeki kayıtlı konum ev olabilir ve OPEN
     varsayılanında koltuk alan herkes kesin noktayı görür — Şimdi'ye girince taze konum istenir,
     kayıtlı nokta ekrandan da düşer. */
  useEffect(() => {
    if (instant && loc.source === "initial") loc.redetect();
    // yalnız moda girişte — `loc` her render yeni nesne
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instant]);

  async function create() {
    if (isPlan && openPlanError(plan, new Date())) {
      setShowPlanErrors(true);
      return;
    }
    setSubmitting(true);
    try {
      setLocalError(null);
      // Kayıtlı varsayılan Şimdi'de konum SAYILMAZ (düğme zaten kapalı; burası ikinci kilit).
      const resolvedOwn = instant && loc.source === "initial" ? null : await loc.resolve();
      // Çapalı oturumda host'un konumu ZORUNLU DEĞİL: modun var oluş sebebi sürtünmeyi
      // kaldırmak. Veren host için yol süresi yine hesaplanır. Şimdi'de ise ZORUNLU: çapanın
      // noktası kuranın konumudur (sunucu çapasız pencereyi 400'ler).
      if (!resolvedOwn && (instant || anchorMode !== "ANCHOR")) {
        setLocalError(t(loc.address.trim() ? "join.errGeocode" : "join.errGeolocation"));
        return;
      }
      // Alan çözülmemiş ya da DEĞİŞMİŞ olabilir: blur ile submit aynı tıkta yarışıyor.
      // Beklemezsek kullanıcının yazdığından BAŞKA bir yerde buluşma kurulur.
      // Şimdi'de çapa modu yok sayılır (store da öyle): gizli bir çapa çözülmez, istenmez.
      const anchored = !instant && anchorMode === "ANCHOR";
      let effectiveAnchor = anchor;
      if (anchored && anchorQuery.trim() !== resolvedQuery.current) {
        effectiveAnchor = await resolveAnchor();
      }
      if (anchored && !effectiveAnchor) {
        setLocalError(t("newSession.errNoAnchor"));
        return;
      }
      try {
        const slug = await submit(me?.displayName ?? "", resolvedOwn);
        navigate(`/j/${slug}`);
      } catch {
        // store zaten error anahtarını ayarladı
      }
    } finally {
      setSubmitting(false);
    }
  }

  const previewList = previewParticipants(own, points, me?.displayName ?? t("deck.travelSelf"));
  const midPoints = previewList
    .map((p) => p.approxLocation)
    .filter((p): p is { lat: number; lng: number } => p?.lat != null && p?.lng != null);
  const mid = centroid(midPoints);
  const labels = Object.fromEntries(
    previewList.map((p) => [
      p.id,
      p.id === "own" ? t("deck.travelSelf") : `${p.displayName} · ${t("newSession.manual")}`,
    ]),
  );
  const count = pointCount(own, points);
  const errorMessage = localError ?? (error ? t(error) : null);
  // 390'da harita hiç mount edilmez (§4.7) — sağ bölge ve harita yalnız gerçek lg genişlikte
  // (JoinForm deseni: `lgOnly` + `TwoZone.rightLgOnly`); jsdom `matchMedia` uygulamıyor →
  // test-setup.ts'teki güdük varsayılan `false` döner, testler ghost'suz haritanın mount
  // olmadığını doğrulayabilir. Artboard 962–1044/3905–3947: 390'da GRUP'un davet önizlemesi de
  // yok — sağ bölge her iki tipte de masaüstüne özgüdür.
  const desktop = useMediaQuery("(min-width: 1024px)");
  // Artboard 893–898: SOLO 1280'de "Nerede buluşulsun?" SAĞ bölgenin tepesinde durur; GRUP'ta
  // (artboard 3852) solda kalır. Blok TEK örnektir — iki bölgeye birden basılsaydı
  // `session-anchor` id'si ve radiogroup ikizlenirdi. 390'da sağ bölge gizli olduğu için
  // koşul `desktop`a bağlı: alan hiçbir genişlikte kaybolmaz.
  const meetWhereInRight = desktop && type === "SOLO";

  const meetWhere = (
    <div className="flex flex-col gap-2">
      <Label>{t("newSession.meetWhere")}</Label>
      <Segmented
        value={anchorMode}
        onChange={(m) => {
          setAnchorMode(m);
          // Moddan çıkarken alan da temizlenir: dolu görünen ama store'da karşılığı
          // olmayan bir adres kullanıcıyı çıkmaza sokuyordu.
          if (m === "MIDPOINT") setAnchorQuery("");
        }}
        ariaLabel={t("newSession.meetWhere")}
        options={[
          { value: "MIDPOINT", label: t("newSession.modeMidpoint") },
          { value: "ANCHOR", label: t("newSession.modeAnchor") },
        ]}
      />
      {anchorMode === "ANCHOR" ? (
        <>
          <Field
            id="session-anchor"
            /* Artboard 3856/3924: iç içe alt alanın `.lb`'si 13px'e iniyor — üstteki
               "Nerede buluşulsun?" başlığıyla aynı ölçüde durmaz. */
            labelSize="sm"
            label={t("newSession.anchorLabel")}
            placeholder={t("newSession.anchorPlaceholder")}
            value={anchorQuery}
            onChange={(e) => setAnchorQuery(e.target.value)}
            onBlur={() => void resolveAnchor()}
          />
          {/* Artboard 3856–3860: sıra etiket → alan → "Haritadan seç" (`.btn.b-wh.bsm`) → ipucu.
              `align-self:flex-start` YALNIZ 1280'de (3858); 390'da düğme tam genişlik (3927). */}
          <div className="lg:self-start">
            <Button type="button" kind="white" size="sm" onClick={() => setPicker("anchor")}>
              <MapPin size={18} aria-hidden />
              {t("map.pickOnMap")}
            </Button>
          </div>
          {/* Artboard 3860: ipucu çapa çözüldükten SONRA da "2 km" sözünü veriyor. Onayı
              ipucunun YERİNE basmak, yarıçapı tam gerektiği anda ekrandan siliyordu. */}
          {anchor && <Note>{t("newSession.anchorSet", { label: anchor.label ?? "" })}</Note>}
          <Note>{t("newSession.anchorHint")}</Note>
        </>
      ) : (
        <Note>{t("newSession.midpointHint")}</Note>
      )}
    </div>
  );

  const pickerNode = picker && (
    <LazyBoundary fallback={<Note center>{t("map.notConfigured")}</Note>}>
      <Suspense fallback={<Note center>{t("map.loading")}</Note>}>
        <MapPicker
          center={anchor ?? own ?? DEFAULT_MAP_CENTER}
          /* Artboard 3880 / 3960: 1280 sağ bölgede 520px, 390 alt sayfasında 300px. */
          heightClass="h-[18.75rem] lg:h-[32.5rem]"
          onPick={(picked) => {
            if (picker === "anchor") {
              anchorReq.current += 1; // uçuştaki geocode cevabını geçersiz kıl
              setAnchor(picked);
              resolvedQuery.current = picked.label ?? "";
              setAnchorQuery(picked.label ?? "");
            } else {
              loc.setPicked(picked);
            }
            setPicker(null);
          }}
          onCancel={() => setPicker(null)}
        />
      </Suspense>
    </LazyBoundary>
  );

  // Artboard 888–890 (1280) `.row` + `.btn.fit` + ipucu YAN YANA; 1044–1047 (390) `.cta`
  // kaydırma alanının DIŞINDA, tam genişlik. Aynı düğme iki yerleşimde de basılır — biri
  // `lg:hidden`, diğeri `hidden lg:flex`.
  // Şimdi'de konum şart: yoksa ve adres de yazılmadıysa düğme kapanır (adres yazan kullanıcıyı
  // kilitlemez — `setAddress` koordinatı `resolve()`a dek siler).
  const ownMissing = instant && (!own || loc.source === "initial") && !loc.address.trim();
  const ctaButton = (size: "md" | "fit") =>
    type === "GROUP" ? (
      <Button size={size} onClick={create} disabled={busy || submitting || ownMissing}>
        {instant && <MapPin size={18} aria-hidden />}
        {t(instant ? "plan.ctaNow" : isPlan ? "plan.ctaDate" : "newSession.createGroup")}
      </Button>
    ) : (
      <Button size={size} onClick={create} disabled={busy || submitting || (anchorMode !== "ANCHOR" && count < 2)}>
        {t("newSession.findVenues")}
      </Button>
    );
  /* Not, düğmeyle AYNI kapıya bağlı: çapalı modda iki nokta şartı düştüğü için
     "En az 2 konum gerekir." açık bir düğmenin altında yalan olurdu. */
  const ctaNote =
    type === "SOLO" && anchorMode !== "ANCHOR" ? (
      <Note>{count < 2 ? t("newSession.needTwo") : t("newSession.findHint", { count })}</Note>
    ) : ownMissing ? (
      <Note>{t("newSession.ownMissing")}</Note>
    ) : isPlan ? (
      // Artboard P3/P3a `.f-note` — CTA'nın altında ortalı güven cümlesi.
      <Note small center>{t("plan.publicPlaceNote")}</Note>
    ) : null;

  const whereError = showPlanErrors && planErr === "plan.errWhereRequired" ? t(planErr) : undefined;
  const dateError =
    showPlanErrors && (planErr === "plan.errMeetAtRequired" || planErr === "plan.errMeetAtPast") ? t(planErr) : undefined;

  /* Artboard P3 (Tarih seç) / P3a (Şimdi): "Ne zaman" 3'lüsü → moda özgü alanlar → kaç kişi →
     katılım. "Kim görsün?" buluşma yeri seçiminden SONRA gelir (`audienceBlock`). Yalnız GRUP:
     Bireysel'in davet linki yok, açık plan olamaz (store değişmezi). */
  const whenBlock = (
    <>
      <div className="flex flex-col gap-2">
        <Label>{t("plan.when")}</Label>
        <Segmented
          fill
          ariaLabel={t("plan.when")}
          value={plan.when}
          onChange={(w) => {
            setPlan({ when: w });
            setShowPlanErrors(false);
          }}
          options={[
            { value: "UNSET", label: t("plan.whenUnset") },
            { value: "NOW", label: t("plan.now") },
            { value: "DATE", label: t("plan.pickDate") },
          ]}
        />
        {/* Artboard P3 açıklamayı Belirsiz/Tarih seç'te basar; P3a'da yerini "Kaç saat" satırı alır. */}
        {!instant && <Note small>{t("plan.whenHint")}</Note>}
        {instant && (
          /* Artboard P3a: "Kaç saat" etiketi rayla AYNI satırda, 76px sabit sütun. */
          <div className="flex items-center gap-2.5">
            <span className="w-[4.75rem] flex-none text-[0.875rem] font-semibold">{t("plan.duration")}</span>
            <div className="min-w-0 flex-1">
              <Segmented
                fill
                ariaLabel={t("plan.duration")}
                value={String(plan.durationHours)}
                onChange={(v) => setPlan({ durationHours: Number(v) as DurationHours })}
                options={DURATIONS.map((h) => ({ value: String(h), label: t("plan.durationHours", { count: h }) }))}
              />
            </div>
          </div>
        )}
      </div>
      {instant && (
        <div className="flex flex-col gap-2">
          <Field
            id="plan-where"
            label={t("plan.where")}
            value={plan.whereLabel}
            maxLength={WHERE_LABEL_MAX}
            placeholder={t("plan.wherePlaceholder")}
            onChange={(e) => setPlan({ whereLabel: e.target.value })}
            onBlur={() => setShowPlanErrors(true)}
            error={whereError}
          />
          <Note small>{t("plan.whereHint")}</Note>
        </div>
      )}
      {plan.when === "DATE" && (
        <div className="flex flex-col gap-2">
          {/* Artboard P3: "Tarih" esnek, "Saat" 120px — hata satırı ikisinin altında TEK. */}
          <div className="flex gap-2.5">
            <div className="min-w-0 flex-1">
              <Field id="plan-date" type="date" label={t("plan.date")} value={plan.meetDate}
                aria-invalid={!!dateError}
                onChange={(e) => setPlan({ meetDate: e.target.value })} />
            </div>
            <div className="w-[7.5rem] flex-none">
              <Field id="plan-time" type="time" label={t("plan.time")} value={plan.meetTime}
                aria-invalid={!!dateError}
                onChange={(e) => setPlan({ meetTime: e.target.value })}
                onBlur={() => { if (plan.meetDate && plan.meetTime) setShowPlanErrors(true); }} />
            </div>
          </div>
          {dateError && <ErrorText>{dateError}</ErrorText>}
        </div>
      )}
      {isPlan && (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <Label>{t("plan.capacity")}</Label>
              <Note small>{t("plan.capacityHint")}</Note>
            </div>
            <Stepper
              value={plan.capacity}
              min={MIN_CAPACITY}
              max={MAX_CAPACITY}
              onChange={(n) => setPlan({ capacity: n })}
              label={t("plan.capacity")}
              decLabel={t("plan.capacityDec")}
              incLabel={t("plan.capacityInc")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t("plan.joinPolicy")}</Label>
            <Segmented
              fill
              ariaLabel={t("plan.joinPolicy")}
              value={effectiveJoinPolicy(plan)}
              onChange={(p) => setPlan({ joinPolicy: p })}
              options={[
                { value: "APPROVAL", label: t("plan.approval") },
                { value: "OPEN", label: t("plan.openJoin") },
              ]}
            />
            {instant && <Note small>{t("plan.joinDefaultNow")}</Note>}
          </div>
        </>
      )}
    </>
  );

  const audienceBlock = isPlan && (
    <div className="flex flex-col gap-2">
      <Label>{t("plan.audience")}</Label>
      {/* Arkadaşlar B-19 ile gelir — olmayan seçenek soluk bile çizilmez (spec §11.5). */}
      <Segmented
        fill
        ariaLabel={t("plan.audience")}
        value={plan.audience}
        onChange={(a) => setPlan({ audience: a })}
        options={[
          { value: "PUBLIC", label: t("plan.audiencePublic") },
          { value: "NONE", label: t("plan.audienceNone") },
        ]}
      />
      <Note small>{t("plan.audienceHint")}</Note>
    </div>
  );

  return (
    <Page>
      {/* Artboard 811: `.row` 6px boşluk, 13px/600, ink2 — genel `a` rengini (flame-deep)
          taşımaz, bir gezinme bağlantısıdır. 390'da (962/3912) kaydırma alanı
          doğrudan h1 ile başlıyor — bağlantı SİLİNMEZ, yalnız lg'ye saklanır (mobilde
          tarayıcı/uygulama geri hareketi zaten var). */}
      <Link
        to="/sessions"
        className="hidden w-fit items-center gap-1.5 text-[0.8125rem] font-semibold text-ink2 no-underline lg:flex"
      >
        <ArrowLeft size={16} aria-hidden />
        {t("newSession.back")}
      </Link>
      {/* Artboard 963/3916: Yeni oturum 390 başlığı 30px. P3/P3a: plan modunda başlık "Plan aç" / "Buradayım". */}
      <Heading size="compact">
        {t(instant ? "plan.titleNow" : isPlan ? "plan.titleDate" : "newSession.title")}
      </Heading>
      <TwoZone
        left={
          <>
            <div className="flex flex-col gap-2">
              {/* Artboard 963/3916: 390'da h1'i DOĞRUDAN segment izliyor, etiket yok — etiket
                  silinmez, `lg`'ye saklanır; 390'da zaten radiogroup'un `aria-label`'ı. */}
              <Label className="hidden lg:block">{t("newSession.how")}</Label>
              <TypeSelector value={type} onChange={setType} />
            </div>
            <div className="flex flex-col gap-2">
              {/* Artboard 830–832: başlık ve sayaç TEK satırda, aynı taban çizgisinde. */}
              <div className="flex items-baseline justify-between gap-4">
                <Label>{t("newSession.what")}</Label>
                <Note>{t("newSession.whatHint", { max: MAX_ACTIVITIES })}</Note>
              </div>
              <ActivityPicker value={activities} onToggle={toggleActivity} />
            </div>
            <Field
              id="session-name"
              label={t("newSession.name")}
              /* Artboard 3049/3218: "· istersen" eki etiketin içinde ama 400 ağırlık + ink2 —
                 düz birleştirilmiş dizede zorunlu alan başlığı kadar baskın duruyordu. */
              labelSuffix={t("newSession.nameOptional")}
              placeholder={t("newSession.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {type === "GROUP" && whenBlock}
            {!meetWhereInRight && !instant && meetWhere}
            {type === "GROUP" && audienceBlock}
            <LocationField
              title={t("newSession.where")}
              state={loc.state}
              label={own?.label ?? null}
              address={loc.address}
              onAddressChange={loc.setAddress}
              onUseLocation={loc.detect}
              onOtherAddress={loc.otherAddress}
              otherLabel={t("newSession.orAddress")}
              inputId="session-address"
              busy={loc.busy}
              onPickOnMap={() => setPicker("own")}
              /* Çapalı modda konum ne merkezi ne deste sırasını etkiler (DeckFlow.deckOrder çapa
                 varsa adaleti atlar) — yalnız yol süresini gösterir. Bu yüzden sessiz satır +
                 "kaldır": yeşil "Tamam" hapı "Ankara'da buluşuyoruz ama sen Den Bosch'tasın"
                 çelişkisini kilitli biçimde ekranda tutuyordu. */
              quiet={!instant && anchorMode === "ANCHOR"}
              onRemove={!instant && anchorMode === "ANCHOR" ? loc.clear : undefined}
              hint={!instant && anchorMode === "ANCHOR" ? t("newSession.ownOptional") : undefined}
            />
            {/* SOLO 1280'de host'un ulaşım türü Konumlar kartının "Sen" satırındadır
                (artboard 910); 390'da sağ bölge yok, bu yüzden ray burada kalır. */}
            <div className={type === "SOLO" ? "lg:hidden" : undefined}>
              <TravelModeField value={travelMode} onChange={setTravelMode} />
            </div>
            {errorMessage && <ErrorText>{errorMessage}</ErrorText>}
            {/* Artboard 951: SOLO 1280'de sağ bölge HARİTAYLA biter — el yazısı not orada yok.
                Not silinmedi, 390'a alındı: sağ bölge zaten `lg`'ye özgü, dolayısıyla `lg:hidden`
                onu yalnız dar ekranda, formun sonunda bırakır. */}
            {type === "SOLO" && (
              <div className="lg:hidden">
                <HandNote>{t("newSession.soloHand")}</HandNote>
              </div>
            )}
            <DesktopOnly>
              <div className="flex flex-wrap items-center gap-3.5">
                {ctaButton("fit")}
                {ctaNote}
              </div>
            </DesktopOnly>
          </>
        }
        right={
          <>
            {meetWhereInRight && meetWhere}
            {desktop && pickerNode ? (
              /* Artboard 3878–3897: çapa seçilirken sağ bölge SEÇİCİ olur; form solda kalır. */
              pickerNode
            ) : type === "SOLO" ? (
              <>
                <PointsEditor
                  own={own}
                  points={points}
                  onAdd={addLocalPoint}
                  onRemove={removeLocalPoint}
                  onModeChange={setLocalPointTravelMode}
                  travelMode={travelMode}
                  onTravelModeChange={setTravelMode}
                />
                {desktop && (
                  <LazyBoundary fallback={<Note center>{t("map.notConfigured")}</Note>}>
                    <Suspense fallback={<Note center>{t("map.loading")}</Note>}>
                      <MapView
                        participants={previewList}
                        venues={[]}
                        midpoint={mid}
                        radiusKm={null}
                        pinLabels={labels}
                        caption={mid ? t("map.midpointOnly") : undefined}
                        /* Artboard 930: `.gmap` 330px — MapFrame'in 320px varsayılanı değil. */
                        heightClass="h-[20.625rem]"
                        lgOnly
                      />
                    </Suspense>
                  </LazyBoundary>
                )}
              </>
            ) : (
              <InvitePreview hostName={me?.displayName ?? ""} sessionName={name} activities={activities} />
            )}
          </>
        }
        /* GRUP'ta uzun olan SOL bölge (etkinlikler → ad → buluşma yeri → konum → ulaşım → CTA);
           sağdaki davet önizlemesi kısa, bu yüzden kaydırma boyunca ekranda kalabilir. SOLO'da
           oran TERS (sağda nokta düzenleyici + harita) — orada uzun bölgeyi yapıştırmak alt
           kısmını erişilemez kılardı. */
        stickyRight={type === "GROUP"}
        rightLgOnly
      />
      <MobileCta>
        {ctaButton("md")}
        {ctaNote}
      </MobileCta>
      {/* Artboard 3949–3972: 390'da seçici bir ALT SAYFA — scrim arkadaki formu kilitler.
          ≥lg'de sağ bölgeye açıldığı için burada basılmaz. */}
      {!desktop && pickerNode && (
        <Sheet title={t("map.pickOnMap")} onClose={() => setPicker(null)}>
          {pickerNode}
        </Sheet>
      )}
    </Page>
  );
}
