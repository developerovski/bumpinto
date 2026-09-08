import { Plus } from "@phosphor-icons/react";
import { Fragment, useEffect } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Button, ErrorText, LinkButton, Note, Overline, Page } from "../components/atoms";
import EmptySessions from "../components/molecules/EmptySessions";
import MobileCta from "../components/molecules/MobileCta";
import PageHeader from "../components/molecules/PageHeader";
import SessionCard from "../components/molecules/SessionCard";
import TwoZone from "../components/molecules/TwoZone";
import PastSessionList from "../components/organisms/PastSessionList";
import { useOnlineState } from "../lib/onlineContext";
import { useSessionsStore } from "../store/sessionsStore";

/* Paylaşılan `.sk` sözcüğü (artboard CSS 558-560) — VenueRowSkeleton ile AYNI kural: nabız
   `motion-safe:` ile, yarıçap her kullanımda tek yerden verilir (iki `rounded-*` binerse
   kazananı sınıf sırası değil Tailwind'in çıktı sırası belirler). */
const SK = "block bg-sand motion-safe:animate-pulse";

/** Açık buluşma kartı iskeleti — SessionCard'ın kabı birebir (kart geometrisi yüklenince
    atlamasın): başlık, alt satır, `.prog` çubuğu ve alt aksiyon satırı. */
function SessionCardSkeleton() {
  return (
    <div className="rounded-card border border-line bg-card p-[1.25rem_1.375rem] shadow-sh1">
      <span className={`${SK} mb-1 h-[1.3125rem] w-[55%] rounded-[0.625rem]`} />
      <span className={`${SK} mb-3.5 h-[0.8125rem] w-[38%] rounded-[0.625rem]`} />
      {/* Progress atomuyla aynı ölçü: 7px yükseklik, 4px yarıçap. */}
      <span className={`${SK} mb-3.5 h-[0.4375rem] w-full rounded-sm`} />
      <div className="flex items-center justify-between gap-3">
        <span className={`${SK} h-[0.8125rem] w-[30%] rounded-[0.625rem]`} />
        <span className={`${SK} h-9 w-24 flex-none rounded-full`} />
      </div>
    </div>
  );
}

/** Geçmiş satırı iskeleti — PastSessionRow ölçüleri (16/13 dolgu, 48px karo). */
function PastRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-[0.8125rem]">
      <span className={`${SK} h-12 w-12 flex-none rounded-[0.875rem]`} />
      <span className="flex flex-1 flex-col gap-1">
        <span className={`${SK} h-[1.0625rem] w-[60%] rounded-[0.625rem]`} />
        <span className={`${SK} h-[0.75rem] w-[40%] rounded-[0.625rem]`} />
      </span>
    </div>
  );
}

/** Artboard'da W1 için yükleme kartı yok; paylaşılan `.sk` sözcüğü tam da bunun için var.
    Üst başlık ANINDA çizilir (SessionsPage'de), gövde liste gelene dek iskelet kalır — eskiden
    `if (!loaded) return null` ile üst çubuğun altı bomboştu. */
function SessionsSkeleton() {
  return (
    // `role=status` + `aria-busy` durumu duyurur; iskeletin KENDİSİ süs olduğu için
    // `aria-hidden` (okunacak metin yok — yeni bir kopya anahtarı açmadan).
    <div role="status" aria-busy="true">
      <div aria-hidden>
        <TwoZone
          left={<><SessionCardSkeleton /><SessionCardSkeleton /></>}
          right={
            <div className="rounded-card border border-line bg-card py-1 shadow-sh1">
              {[0, 1, 2].map((i) => (
                <Fragment key={i}>
                  {i > 0 && <div className="mx-4 h-px bg-line" />}
                  <PastRowSkeleton />
                </Fragment>
              ))}
            </div>
          }
        />
      </div>
    </div>
  );
}

/** Artboard W1 · Oturumlar — açık + geçmiş; boş durum. `/sessions/new` W-4'e dek 404. */
export default function SessionsPage() {
  const { t } = useTranslation();
  const { open, past, pastTruncated, loaded, error, load } = useSessionsStore();
  const { online } = useOnlineState();
  useEffect(() => { void load(); }, [load]);
  const empty = open.length === 0 && past.length === 0;
  // Artboard W10b: ağ yokken gövde SON GÖRÜLEN halidir — soluklaşır (1280 `.wrap` opacity .6,
  // 390 kart opacity .6) ve "Yeni buluşma kur" kilitlenir. Bir <a> disabled OLAMAZ (href'i
  // silmek odağı da götürür), bu yüzden çevrimdışında aynı ölçüdeki disabled <Button> basılır:
  // hem tıklama hem klavye kapanır, düğme görünür kalır.
  const newSessionCta = (size: "fit" | "md") =>
    online ? (
      <LinkButton href="/sessions/new" size={size}><Plus size={18} aria-hidden />{t("sessions.new")}</LinkButton>
    ) : (
      <Button type="button" size={size} disabled><Plus size={18} aria-hidden />{t("sessions.new")}</Button>
    );
  return (
    <Page>
      <PageHeader
        title={<Trans i18nKey="sessions.title" components={[<br key="0" />]} />}
        action={newSessionCta("fit")}
      />
      <div className={online ? undefined : "opacity-60"}>
      {!loaded ? (
        <SessionsSkeleton />
      ) : error ? (
        <>
          <ErrorText>{t("sessions.errLoad")}</ErrorText>
          <Button type="button" kind="white" size="sm" onClick={() => void load()}>{t("common.retry")}</Button>
        </>
      ) : empty ? (
        <EmptySessions />
      ) : (
        <TwoZone
          left={<><Overline>{t("sessions.open")}</Overline>{open.map((r, i) => <SessionCard key={r.slug ?? String(i)} row={r} />)}</>}
          right={<><Overline>{t("sessions.past")}</Overline><PastSessionList rows={past} /><Note small>
            {/* Liste kesildiyse bunu SÖYLE: sessizce yutulan satır, kullanıcının "eksik" diye
                aradığı satırdır. Kesilmediyse yalnız saklama cümlesi kalır. */}
            {pastTruncated ? t("sessions.retentionTruncated", { count: past.length }) : t("sessions.retention")}
          </Note></>}
        />
      )}
      </div>
      <MobileCta>{newSessionCta("md")}</MobileCta>
    </Page>
  );
}
