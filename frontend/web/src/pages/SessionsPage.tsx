import { Plus } from "@phosphor-icons/react";
import { useEffect } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Button, ErrorText, LinkButton, Note, Overline, Page } from "../components/atoms";
import EmptySessions from "../components/molecules/EmptySessions";
import MobileCta from "../components/molecules/MobileCta";
import PageHeader from "../components/molecules/PageHeader";
import SessionCard from "../components/molecules/SessionCard";
import TwoZone from "../components/molecules/TwoZone";
import PastSessionList from "../components/organisms/PastSessionList";
import { useSessionsStore } from "../store/sessionsStore";

/** Artboard W1 · Oturumlar — açık + geçmiş; boş durum. `/sessions/new` W-4'e dek 404. */
export default function SessionsPage() {
  const { t } = useTranslation();
  const { open, past, loaded, error, load } = useSessionsStore();
  useEffect(() => { void load(); }, [load]);
  if (!loaded) return null;
  const empty = open.length === 0 && past.length === 0;
  return (
    <Page>
      <PageHeader
        title={<Trans i18nKey="sessions.title" components={[<br key="0" />]} />}
        action={<LinkButton href="/sessions/new" size="fit"><Plus size={18} aria-hidden />{t("sessions.new")}</LinkButton>}
      />
      {error ? (
        <>
          <ErrorText>{t("sessions.errLoad")}</ErrorText>
          <Button type="button" kind="white" size="sm" onClick={() => void load()}>{t("common.retry")}</Button>
        </>
      ) : empty ? (
        <EmptySessions />
      ) : (
        <TwoZone
          left={<><Overline>{t("sessions.open")}</Overline>{open.map((r, i) => <SessionCard key={r.slug ?? String(i)} row={r} />)}</>}
          right={<><Overline>{t("sessions.past")}</Overline><PastSessionList rows={past} /><Note>{t("sessions.retention")}</Note></>}
        />
      )}
      <MobileCta>
        <LinkButton href="/sessions/new"><Plus size={18} aria-hidden />{t("sessions.new")}</LinkButton>
      </MobileCta>
    </Page>
  );
}
